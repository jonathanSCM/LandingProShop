// Proshop - servidor web (Express)
// Sirve la landing, la API de contacto (leads) y el panel de administracion.
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const leads = require('./lib/leads');
const proyectos = require('./lib/proyectos');
const contenido = require('./lib/contenido');
const { prisma } = require('./lib/db');
const {
  obtenerEstadoConsumo,
  obtenerResumenEmpresa,
  registrarCompraPaquete,
} = require('./lib/services/suscripciones');
const { registrarCliente, autenticar } = require('./lib/services/auth');
const { procesarMensajeEntrante, atenderMensaje } = require('./lib/services/conversaciones');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Configuracion del negocio (editable por variables de entorno) ----
const site = {
  name: 'ProShop',
  tagline: 'Software a medida que impulsa tu negocio',
  // Numero de WhatsApp en formato internacional SIN el signo + (591 = Bolivia).
  whatsapp: process.env.WHATSAPP_NUMBER || '59162095357',
  email: process.env.CONTACT_EMAIL || 'contacto@proshop.lat',
  phone: process.env.CONTACT_PHONE || '+591 62095357',
  location: process.env.CONTACT_LOCATION || 'Santa Cruz · Bolivia',
  // Donde vive la plataforma de agentes publicada. Si algun dia esta landing se
  // sirve desde ese mismo dominio, pon PLATFORM_URL vacia y el boton desaparece.
  // Ojo: hay que distinguir "vacia a proposito" de "no definida", por eso no se
  // usa "||" (la cadena vacia es falsy y caeria al valor por defecto).
  plataforma:
    process.env.PLATFORM_URL === undefined
      ? 'https://agentes.proshop.lat'
      : process.env.PLATFORM_URL.trim(),
  year: new Date().getFullYear(),
};

// ---- Credenciales del panel admin (cambiar en .env) ----
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'proshop123';

// ---- Middlewares ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
// Guarda el body crudo para verificar la firma de los webhooks de Meta.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(24).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }, // 8 h
  })
);

// Hace disponible "site" en todas las vistas
app.use((req, res, next) => {
  res.locals.site = site;
  next();
});

// Comparacion de credenciales resistente a timing
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Protege las rutas del panel
function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.redirect('/admin/login');
}

// ============================ SITIO PUBLICO ============================
// Landing de Proshop (estilo claro/minimal). Con ?editar=1 se abre el modo
// edicion, pero solo para el admin con sesion.
app.get('/', async (req, res, next) => {
  try {
    const quiereEditar = req.query.editar === '1';
    const esAdmin = !!(req.session && req.session.authed);

    // Si pide editar sin sesion, lo mandamos a loguearse y volvemos aca.
    if (quiereEditar && !esAdmin) {
      return res.redirect('/admin/login?volver=' + encodeURIComponent('/?editar=1'));
    }

    const editando = quiereEditar && esAdmin;
    const cont = contenido.leer();

    const [planes, paquetes] = await Promise.all([
      prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }),
      prisma.paquete.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' } }),
    ]);

    res.render('landing', {
      title: `${site.name} — Software a medida en Bolivia`,
      planes,
      paquetes,
      // En modo edicion se ven tambien los ocultos, para poder recuperarlos.
      proyectos: contenido.aplicarAProyectos(proyectos, cont, editando),
      editando,
      // t('clave', 'texto por defecto') -> devuelve el texto editado si existe.
      t: (clave, porDefecto) => {
        const v = cont.textos[clave];
        return typeof v === 'string' && v.trim() !== '' ? v : porDefecto;
      },
    });
  } catch (err) { next(err); }
});

// Guarda los cambios del modo edicion. Solo admin.
app.post('/api/landing', requireAuth, (req, res) => {
  try {
    const guardado = contenido.guardar(req.body || {});
    return res.json({
      ok: true,
      textos: Object.keys(guardado.textos).length,
      ocultos: guardado.ocultos.length,
      proyectos: Object.keys(guardado.proyectos).length,
    });
  } catch (err) {
    console.error('No se pudo guardar la landing:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo guardar. Revisa la consola del servidor.' });
  }
});

// Restablece TODO a los textos originales de la vista.
app.post('/api/landing/restablecer', requireAuth, (req, res) => {
  try {
    contenido.guardar({});
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'No se pudo restablecer.' });
  }
});

// Recepcion de leads del formulario de contacto
app.post('/api/contacto', (req, res) => {
  const { nombre, email, telefono, servicio, mensaje } = req.body || {};

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      ok: false,
      error: 'Faltan campos obligatorios: nombre, email y mensaje.',
    });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return res.status(400).json({ ok: false, error: 'El email no es valido.' });
  }

  let lead;
  try {
    lead = leads.addLead({
      nombre: String(nombre).trim().slice(0, 120),
      email: String(email).trim().slice(0, 160),
      telefono: telefono ? String(telefono).trim().slice(0, 40) : '',
      servicio: servicio ? String(servicio).trim().slice(0, 80) : '',
      mensaje: String(mensaje).trim().slice(0, 2000),
      ip: req.ip,
    });
  } catch (err) {
    console.error('Error guardando lead:', err);
    return res.status(500).json({ ok: false, error: 'No se pudo registrar tu mensaje. Intenta de nuevo.' });
  }

  // Arma un enlace de WhatsApp listo para continuar la conversacion
  const texto = encodeURIComponent(
    `Hola ${site.name}, soy ${lead.nombre}.` +
      (lead.servicio ? ` Me interesa: ${lead.servicio}.` : '') +
      ` ${lead.mensaje}`
  );
  const whatsappUrl = `https://wa.me/${site.whatsapp}?text=${texto}`;

  return res.json({ ok: true, mensaje: 'Gracias, te contactaremos pronto.', whatsappUrl });
});

// ==================== WEBHOOK DE WHATSAPP (Meta Cloud API) ====================
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'proshop-verify-token';

// 1) Verificación: Meta llama con GET al configurar el webhook.
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge); // devuelve el reto -> Meta confirma
  }
  return res.sendStatus(403);
});

// Verifica la firma X-Hub-Signature-256 (si hay APP_SECRET configurado).
function firmaValida(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // sin secret configurado, no se valida (dev)
  const firma = req.get('x-hub-signature-256');
  if (!firma || !req.rawBody) return false;
  const esperado = 'sha256=' + require('crypto').createHmac('sha256', secret).update(req.rawBody).digest('hex');
  try {
    return require('crypto').timingSafeEqual(Buffer.from(firma), Buffer.from(esperado));
  } catch (_) { return false; }
}

// 2) Recepción de mensajes: Meta llama con POST.
app.post('/webhooks/whatsapp', async (req, res) => {
  // Responder 200 de inmediato (Meta reintenta si tarda) y procesar aparte.
  res.sendStatus(200);
  if (!firmaValida(req)) { console.warn('Webhook WhatsApp: firma inválida'); return; }

  try {
    const entradas = (req.body && req.body.entry) || [];
    for (const entrada of entradas) {
      for (const cambio of entrada.changes || []) {
        const value = cambio.value || {};
        const phoneNumberId = value.metadata && value.metadata.phone_number_id;
        const mensajes = value.messages || [];
        if (!phoneNumberId || mensajes.length === 0) continue; // ignora estados (entregado/leído)

        // ¿De qué cliente es este número?
        const conexion = await prisma.conexionWhatsApp.findUnique({ where: { phoneNumberId } });
        if (!conexion || conexion.estado !== 'CONECTADO') {
          console.warn('Webhook: sin conexión CONECTADA para phone_number_id', phoneNumberId);
          continue;
        }

        const contacto = (value.contacts && value.contacts[0]) || {};
        const nombreCliente = contacto.profile && contacto.profile.name;
        const empresaId = await agenteEmpresaId(conexion.agenteId);
        const wa = require('./lib/services/whatsapp');

        for (const m of mensajes) {
          if (m.type !== 'text') continue; // por ahora solo texto
          const de = m.from; // teléfono del cliente
          const texto = m.text && m.text.body;
          if (!texto) continue;

          // Guarda/actualiza el cliente final (llena la sección Clientes)
          if (empresaId) {
            await prisma.clienteFinal.upsert({
              where: { empresaId_telefono: { empresaId, telefono: de } },
              update: nombreCliente ? { nombre: nombreCliente } : {},
              create: { empresaId, telefono: de, nombre: nombreCliente || null },
            }).catch(() => {});
          }

          // El agente procesa y responde
          const r = await atenderMensaje({ agenteId: conexion.agenteId, telefonoCliente: de, contenido: texto });
          if (r.ok && r.respuesta) {
            await wa.enviarTexto(conexion, de, r.respuesta);
          } else if (!r.ok) {
            await wa.enviarTexto(conexion, de, 'Gracias por tu mensaje. En un momento te atiende una persona de nuestro equipo.');
          }

          // Marca último mensaje recibido + avisos de saldo
          await prisma.conexionWhatsApp.update({ where: { id: conexion.id }, data: { ultimoMensajeAt: new Date() } });
          if (empresaId) notif.verificarAvisos(empresaId).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Error procesando webhook WhatsApp:', err.message);
  }
});

// Helper: empresaId a partir del agente
async function agenteEmpresaId(agenteId) {
  const a = await prisma.agente.findUnique({ where: { id: agenteId }, select: { empresaId: true } });
  return a ? a.empresaId : null;
}

// Requerida por la revision de la app de Meta (permisos de WhatsApp Business):
// una URL publica con instrucciones de como pedir el borrado de datos.
app.get('/data-deletion', (req, res) => {
  res.render('data-deletion', { title: 'Data Deletion Instructions - CRM PROSHOP' });
});

// ==================== REGISTRO E INGRESO DE CLIENTES ====================
app.get('/registro', async (req, res, next) => {
  try {
    if (req.session && req.session.clienteId) return res.redirect('/panel');
    const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    res.render('registro', {
      title: 'Crear cuenta - Proshop', planes, error: null,
      datos: { planId: req.query.plan || '' }, // plan preseleccionado desde la web
    });
  } catch (err) { next(err); }
});

app.post('/registro', async (req, res, next) => {
  const { empresa, nombre, email, password, planId } = req.body || {};
  try {
    const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    const volverConError = (msg) =>
      res.status(400).render('registro', {
        title: 'Crear cuenta - Proshop', planes, error: msg,
        datos: { empresa, nombre, email, planId },
      });

    if (!empresa || !nombre || !email || !password || !planId) {
      return volverConError('Completa todos los campos obligatorios.');
    }
    if (String(password).length < 8) {
      return volverConError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return volverConError('El correo no es válido.');
    }

    const { usuario } = await registrarCliente({ empresa, nombre, email, password, planId });

    // Inicia sesion automaticamente
    req.session.clienteId = usuario.id;
    req.session.empresaId = usuario.empresaId;
    req.session.clienteNombre = usuario.nombre;
    res.redirect('/panel?ok=' + encodeURIComponent('¡Bienvenido! Tu cuenta fue creada.'));
  } catch (err) {
    if (err.codigo === 'EMAIL_DUPLICADO' || err.codigo === 'PLAN_INVALIDO') {
      const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
      return res.status(400).render('registro', {
        title: 'Crear cuenta - Proshop', planes, error: err.message,
        datos: { empresa, nombre, email, planId },
      });
    }
    next(err);
  }
});

app.get('/ingresar', (req, res) => {
  if (req.session && req.session.clienteId) return res.redirect('/panel');
  res.render('ingresar', { title: 'Ingresar - Proshop', error: null, aviso: req.query.ok || null });
});

app.post('/ingresar', async (req, res, next) => {
  const { email, password } = req.body || {};
  try {
    const usuario = await autenticar(email || '', password || '');
    if (!usuario) {
      return res.status(401).render('ingresar', {
        title: 'Ingresar - Proshop', error: 'Correo o contraseña incorrectos.', aviso: null,
      });
    }
    req.session.clienteId = usuario.id;
    req.session.empresaId = usuario.empresaId;
    req.session.clienteNombre = usuario.nombre;
    res.redirect('/panel');
  } catch (err) { next(err); }
});

app.post('/panel/salir', (req, res) => {
  req.session.destroy(() => res.redirect('/ingresar?ok=' + encodeURIComponent('Sesión cerrada.')));
});

// ==================== PANEL DEL CLIENTE ====================
function requireCliente(req, res, next) {
  if (req.session && req.session.clienteId) return next();
  return res.redirect('/ingresar');
}

// Datos comunes de las vistas del panel del cliente
const notif = require('./lib/services/notificaciones');

app.use('/panel', async (req, res, next) => {
  if (!req.session || !req.session.clienteId) return next();
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: req.session.empresaId } });
    res.locals.usuarioNombre = req.session.clienteNombre;
    res.locals.empresaNombre = empresa ? empresa.nombre : '';
    // Notificaciones para la campanita
    const [notificaciones, notifCount] = await Promise.all([
      notif.listar(req.session.empresaId),
      notif.contarNoLeidas(req.session.empresaId),
    ]);
    res.locals.notificaciones = notificaciones;
    res.locals.notifCount = notifCount;
    next();
  } catch (err) { next(err); }
});

// Marcar una / todas como leidas
app.post('/panel/notificaciones/:id/leida', requireCliente, async (req, res, next) => {
  try {
    await notif.marcarLeida(req.session.empresaId, Number(req.params.id));
    res.redirect(req.get('referer') || '/panel');
  } catch (err) { next(err); }
});

app.post('/panel/notificaciones/leer-todas', requireCliente, async (req, res, next) => {
  try {
    await notif.marcarTodasLeidas(req.session.empresaId);
    res.redirect(req.get('referer') || '/panel');
  } catch (err) { next(err); }
});

// Helpers para el panel del cliente
function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
async function agenteIdsDe(empresaId) {
  const ags = await prisma.agente.findMany({ where: { empresaId }, select: { id: true } });
  return ags.map((a) => a.id);
}

// ===== INICIO (dashboard operativo) =====
app.get('/panel', requireCliente, async (req, res, next) => {
  try {
    const empresaId = req.session.empresaId;
    const resumen = await obtenerResumenEmpresa(empresaId);
    if (!resumen) return res.redirect('/ingresar');

    const agenteIds = await agenteIdsDe(empresaId);
    const hoy = inicioDeHoy();

    const [clientesHoy, pedidosHoy, ventasAgg, convTotal, convConIA, atencion, stockBajo] = await Promise.all([
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds }, createdAt: { gte: hoy } } }),
      prisma.pedido.count({ where: { empresaId, createdAt: { gte: hoy } } }),
      prisma.pedido.aggregate({ where: { empresaId, estado: { not: 'CANCELADO' }, createdAt: { gte: hoy } }, _sum: { total: true } }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds } } }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds }, mensajes: { some: { rol: 'AGENTE' } } } }),
      // Conversaciones SIN respuesta del agente = necesitan atencion humana
      prisma.conversacion.findMany({
        where: { agenteId: { in: agenteIds }, mensajes: { none: { rol: 'AGENTE' } } },
        orderBy: { ultimoMensajeAt: 'desc' }, take: 5,
      }),
      prisma.producto.findMany({ where: { empresaId, activo: true, stock: { lte: 5 } }, orderBy: { stock: 'asc' }, take: 5 }),
    ]);

    const resueltasIA = convTotal > 0 ? Math.round((convConIA / convTotal) * 100) : 0;
    const avisoSaldo = resumen.consumo.totalDisponible === 0
      ? 'Te quedaste sin conversaciones: tu agente dejó de atender.'
      : (resumen.consumo.porcentajeUsado >= 80 && resumen.consumo.extraDisponible === 0
        ? 'Ya usaste el ' + resumen.consumo.porcentajeUsado + '% de tu plan.' : null);

    res.render('cliente/inicio', {
      title: 'Inicio - Proshop', tituloPagina: 'Inicio', activo: 'inicio',
      consumo: resumen.consumo,
      avisoSaldo,
      kpi: {
        clientesHoy, pedidosHoy,
        ventasHoy: Number(ventasAgg._sum.total || 0),
        resueltasIA,
      },
      atencion, stockBajo,
    });
  } catch (err) { next(err); }
});

// ===== Mi consumo (movido a Plan y facturación) =====
app.get('/panel/consumo', requireCliente, async (req, res, next) => {
  try {
    const resumen = await obtenerResumenEmpresa(req.session.empresaId);
    if (!resumen) return res.redirect('/ingresar');
    res.render('cliente/consumo', {
      title: 'Mi consumo - Proshop', tituloPagina: 'Mi consumo', activo: 'consumo',
      plan: resumen.plan, suscripcion: resumen.suscripcion, consumo: resumen.consumo,
      mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

// ===== Conversaciones =====
app.get('/panel/conversaciones', requireCliente, async (req, res, next) => {
  try {
    const agenteIds = await agenteIdsDe(req.session.empresaId);
    const hoy = inicioDeHoy();
    const [conversaciones, total, hoyCount, mensajes] = await Promise.all([
      prisma.conversacion.findMany({
        where: { agenteId: { in: agenteIds } },
        include: { _count: { select: { mensajes: true } } },
        orderBy: { ultimoMensajeAt: 'desc' }, take: 100,
      }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds } } }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds }, createdAt: { gte: hoy } } }),
      prisma.mensaje.count({ where: { conversacion: { agenteId: { in: agenteIds } } } }),
    ]);
    res.render('cliente/conversaciones', {
      title: 'Conversaciones - Proshop', tituloPagina: 'Conversaciones', activo: 'conversaciones',
      conversaciones, stats: { total, hoy: hoyCount, mensajes },
    });
  } catch (err) { next(err); }
});

// ===== Pedidos =====
app.get('/panel/pedidos', requireCliente, async (req, res, next) => {
  try {
    const empresaId = req.session.empresaId;
    const [pedidos, total, nuevos, agg] = await Promise.all([
      prisma.pedido.findMany({ where: { empresaId }, include: { cliente: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.pedido.count({ where: { empresaId } }),
      prisma.pedido.count({ where: { empresaId, estado: 'NUEVO' } }),
      prisma.pedido.aggregate({ where: { empresaId, estado: { not: 'CANCELADO' } }, _sum: { total: true } }),
    ]);
    res.render('cliente/pedidos', {
      title: 'Pedidos - Proshop', tituloPagina: 'Pedidos', activo: 'pedidos',
      pedidos, stats: { total, nuevos, total_bs: Number(agg._sum.total || 0) },
    });
  } catch (err) { next(err); }
});

// ===== Clientes =====
app.get('/panel/clientes', requireCliente, async (req, res, next) => {
  try {
    const empresaId = req.session.empresaId;
    const hoy = inicioDeHoy();
    const [clientes, total, nuevosHoy] = await Promise.all([
      prisma.clienteFinal.findMany({ where: { empresaId }, include: { _count: { select: { pedidos: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.clienteFinal.count({ where: { empresaId } }),
      prisma.clienteFinal.count({ where: { empresaId, createdAt: { gte: hoy } } }),
    ]);
    res.render('cliente/clientes', {
      title: 'Clientes - Proshop', tituloPagina: 'Clientes', activo: 'clientes',
      clientes, stats: { total, nuevosHoy },
    });
  } catch (err) { next(err); }
});

// ===== Inventario =====
app.get('/panel/inventario', requireCliente, async (req, res, next) => {
  try {
    const empresaId = req.session.empresaId;
    const productos = await prisma.producto.findMany({ where: { empresaId }, orderBy: { stock: 'asc' } });
    res.render('cliente/inventario', {
      title: 'Inventario - Proshop', tituloPagina: 'Inventario', activo: 'inventario',
      productos,
      stats: {
        total: productos.length,
        bajo: productos.filter((p) => p.stock > 0 && p.stock <= 5).length,
        agotados: productos.filter((p) => p.stock === 0).length,
      },
      mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

app.post('/panel/inventario/:id', requireCliente, async (req, res, next) => {
  try {
    const stock = Math.max(0, parseInt(req.body.stock, 10) || 0);
    await prisma.producto.updateMany({
      where: { id: Number(req.params.id), empresaId: req.session.empresaId },
      data: { stock },
    });
    res.redirect('/panel/inventario?ok=' + encodeURIComponent('Stock actualizado.'));
  } catch (err) { next(err); }
});

// ===== Reportes =====
app.get('/panel/reportes', requireCliente, async (req, res, next) => {
  try {
    const empresaId = req.session.empresaId;
    const agenteIds = await agenteIdsDe(empresaId);
    const hace7 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    hace7.setHours(0, 0, 0, 0);

    const [conversaciones, conv7, convConIA, clientes, pedidos, convRecientes] = await Promise.all([
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds } } }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds }, createdAt: { gte: hace7 } } }),
      prisma.conversacion.count({ where: { agenteId: { in: agenteIds }, mensajes: { some: { rol: 'AGENTE' } } } }),
      prisma.clienteFinal.count({ where: { empresaId } }),
      prisma.pedido.count({ where: { empresaId } }),
      prisma.conversacion.findMany({ where: { agenteId: { in: agenteIds }, createdAt: { gte: hace7 } }, select: { createdAt: true } }),
    ]);

    // Serie de los últimos 7 días
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const serie = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const fin = new Date(d); fin.setDate(fin.getDate() + 1);
      const total = convRecientes.filter((c) => c.createdAt >= d && c.createdAt < fin).length;
      serie.push({ etiqueta: dias[d.getDay()], total });
    }

    res.render('cliente/reportes', {
      title: 'Reportes - Proshop', tituloPagina: 'Reportes', activo: 'reportes',
      r: {
        conversaciones, conversaciones7: conv7, clientes, pedidos, serie,
        resueltasIA: conversaciones > 0 ? Math.round((convConIA / conversaciones) * 100) : 0,
      },
    });
  } catch (err) { next(err); }
});

app.get('/panel/paquetes', requireCliente, async (req, res, next) => {
  try {
    const [resumen, paquetes] = await Promise.all([
      obtenerResumenEmpresa(req.session.empresaId),
      prisma.paquete.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' } }),
    ]);
    res.render('cliente/paquetes', {
      title: 'Comprar paquete - Proshop', tituloPagina: 'Comprar paquete', activo: 'paquetes',
      paquetes, consumo: resumen.consumo,
    });
  } catch (err) { next(err); }
});

// Compra de un paquete: registra la compra + el pago, y acredita el saldo.
app.post('/panel/paquetes/:id/comprar', requireCliente, async (req, res, next) => {
  try {
    const paquete = await prisma.paquete.findUnique({ where: { id: Number(req.params.id) } });
    if (!paquete || !paquete.activo) {
      return res.redirect('/panel/paquetes');
    }

    const empresaId = req.session.empresaId;
    await registrarCompraPaquete({
      empresaId,
      paqueteId: paquete.id,
      cantidad: paquete.cantidad,
      precioUsd: Number(paquete.precioUsd),
      nota: 'Comprado desde el panel del cliente',
    });

    // Queda registrado el pago (pendiente de confirmar por Proshop)
    await prisma.pago.create({
      data: {
        empresaId,
        tipo: 'PAQUETE',
        monto: paquete.precioUsd,
        moneda: 'USD',
        estado: 'PENDIENTE',
        referencia: `Paquete de ${paquete.cantidad} conversaciones`,
        paqueteId: paquete.id,
      },
    });

    res.redirect('/panel/compras?ok=' + encodeURIComponent(
      `Compra registrada: ${paquete.cantidad.toLocaleString('es-BO')} conversaciones añadidas.`
    ));
  } catch (err) { next(err); }
});

app.get('/panel/compras', requireCliente, async (req, res, next) => {
  try {
    const compras = await prisma.compraPaquete.findMany({
      where: { empresaId: req.session.empresaId },
      orderBy: { fechaCompra: 'desc' },
    });
    res.render('cliente/compras', {
      title: 'Mis compras - Proshop', tituloPagina: 'Mis compras', activo: 'compras',
      compras, mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

// -------- Catalogo de productos del cliente (CRUD) --------
async function planDeEmpresa(empresaId) {
  const sub = await prisma.suscripcion.findUnique({
    where: { empresaId }, include: { plan: true },
  });
  return sub ? sub.plan : null;
}

app.get('/panel/productos', requireCliente, async (req, res, next) => {
  try {
    const [productos, plan] = await Promise.all([
      prisma.producto.findMany({ where: { empresaId: req.session.empresaId }, orderBy: { createdAt: 'desc' } }),
      planDeEmpresa(req.session.empresaId),
    ]);
    res.render('cliente/productos', {
      title: 'Mis productos - Proshop', tituloPagina: 'Mis productos', activo: 'productos',
      productos, maxProductos: plan ? plan.maxProductos : 10, mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

app.get('/panel/productos/nuevo', requireCliente, (req, res) => {
  res.render('cliente/producto-form', {
    title: 'Agregar producto - Proshop', tituloPagina: 'Agregar producto', activo: 'productos',
    producto: null, error: null,
  });
});

app.post('/panel/productos', requireCliente, async (req, res, next) => {
  const { nombre, descripcion, precio, stock, activo } = req.body || {};
  try {
    const plan = await planDeEmpresa(req.session.empresaId);
    const total = await prisma.producto.count({ where: { empresaId: req.session.empresaId } });
    if (plan && total >= plan.maxProductos) {
      return res.redirect('/panel/productos?ok=' + encodeURIComponent('Alcanzaste el límite de productos de tu plan.'));
    }
    if (!nombre || precio === undefined || precio === '') {
      return res.status(400).render('cliente/producto-form', {
        title: 'Agregar producto - Proshop', tituloPagina: 'Agregar producto', activo: 'productos',
        producto: null, error: 'El nombre y el precio son obligatorios.',
      });
    }
    await prisma.producto.create({
      data: {
        empresaId: req.session.empresaId,
        nombre: String(nombre).trim().slice(0, 120),
        descripcion: descripcion ? String(descripcion).trim().slice(0, 200) : null,
        precio: Number(precio) || 0,
        stock: parseInt(stock, 10) || 0,
        activo: activo === '1',
      },
    });
    res.redirect('/panel/productos?ok=' + encodeURIComponent('Producto agregado.'));
  } catch (err) { next(err); }
});

app.get('/panel/productos/:id/editar', requireCliente, async (req, res, next) => {
  try {
    const producto = await prisma.producto.findFirst({
      where: { id: Number(req.params.id), empresaId: req.session.empresaId },
    });
    if (!producto) return res.redirect('/panel/productos');
    res.render('cliente/producto-form', {
      title: 'Editar producto - Proshop', tituloPagina: 'Editar producto', activo: 'productos',
      producto, error: null,
    });
  } catch (err) { next(err); }
});

app.post('/panel/productos/:id', requireCliente, async (req, res, next) => {
  const { nombre, descripcion, precio, stock, activo } = req.body || {};
  try {
    // updateMany con empresaId evita editar productos de otra empresa
    await prisma.producto.updateMany({
      where: { id: Number(req.params.id), empresaId: req.session.empresaId },
      data: {
        nombre: String(nombre).trim().slice(0, 120),
        descripcion: descripcion ? String(descripcion).trim().slice(0, 200) : null,
        precio: Number(precio) || 0,
        stock: parseInt(stock, 10) || 0,
        activo: activo === '1',
      },
    });
    res.redirect('/panel/productos?ok=' + encodeURIComponent('Producto actualizado.'));
  } catch (err) { next(err); }
});

app.post('/panel/productos/:id/eliminar', requireCliente, async (req, res, next) => {
  try {
    await prisma.producto.deleteMany({
      where: { id: Number(req.params.id), empresaId: req.session.empresaId },
    });
    res.redirect('/panel/productos?ok=' + encodeURIComponent('Producto eliminado.'));
  } catch (err) { next(err); }
});

// -------- Configuracion del agente (nombre, numero de WhatsApp, tono...) --------
// Devuelve el agente de la empresa, creandolo si no existe.
async function obtenerAgente(empresaId) {
  let agente = await prisma.agente.findFirst({
    where: { empresaId },
    include: { config: true },
  });
  if (!agente) {
    agente = await prisma.agente.create({
      data: {
        empresaId,
        nombre: 'Mi agente',
        config: { create: {} },
      },
      include: { config: true },
    });
  } else if (!agente.config) {
    await prisma.agenteConfig.create({ data: { agenteId: agente.id } });
    agente = await prisma.agente.findUnique({ where: { id: agente.id }, include: { config: true } });
  }
  return agente;
}

app.get('/panel/configuracion', requireCliente, async (req, res, next) => {
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    res.render('cliente/configuracion', {
      title: 'Configuración del agente - Proshop', tituloPagina: 'Configuración', activo: 'configuracion',
      agente, config: agente.config || {}, mensaje: req.query.ok || null, error: null,
    });
  } catch (err) { next(err); }
});

app.post('/panel/configuracion', requireCliente, async (req, res, next) => {
  const { nombre, numeroWhatsapp, mensajeBienvenida, tono, estado, instrucciones, derivarAHumano } = req.body || {};
  try {
    const agente = await obtenerAgente(req.session.empresaId);

    // El numero: solo digitos (quita +, espacios, guiones)
    const numero = numeroWhatsapp ? String(numeroWhatsapp).replace(/\D/g, '').slice(0, 20) : null;
    if (numero && numero.length < 8) {
      return res.status(400).render('cliente/configuracion', {
        title: 'Configuración del agente - Proshop', tituloPagina: 'Configuración', activo: 'configuracion',
        agente, config: agente.config || {},
        error: 'El número de WhatsApp parece incompleto. Usa el formato internacional (ej: 59171234567).',
        mensaje: null,
      });
    }

    await prisma.agente.update({
      where: { id: agente.id },
      data: {
        nombre: nombre ? String(nombre).trim().slice(0, 60) : agente.nombre,
        numeroWhatsapp: numero,
        estado: ['ACTIVO', 'PAUSADO', 'BORRADOR'].includes(estado) ? estado : agente.estado,
      },
    });

    await prisma.agenteConfig.update({
      where: { agenteId: agente.id },
      data: {
        mensajeBienvenida: mensajeBienvenida ? String(mensajeBienvenida).trim().slice(0, 200) : undefined,
        tono: tono ? String(tono).slice(0, 60) : undefined,
        instrucciones: instrucciones ? String(instrucciones).trim().slice(0, 200) : null,
        derivarAHumano: derivarAHumano === '1',
      },
    });

    res.redirect('/panel/configuracion?ok=' + encodeURIComponent('Configuración guardada.'));
  } catch (err) { next(err); }
});

// -------- Conectar WhatsApp (datos de Meta que registra el cliente) --------
const cripto = require('./lib/crypto');

function datosWebhook(req) {
  const host = req.get('host');
  const proto = req.protocol; // en produccion (detras de proxy) sera https
  return {
    callbackUrl: `${proto}://${host}/webhooks/whatsapp`,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'proshop-verify-token',
  };
}

app.get('/panel/whatsapp', requireCliente, async (req, res, next) => {
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    const conexion = await prisma.conexionWhatsApp.findUnique({ where: { agenteId: agente.id } });
    const wh = datosWebhook(req);
    res.render('cliente/whatsapp', {
      title: 'Conectar WhatsApp - Proshop', tituloPagina: 'Conectar WhatsApp', activo: 'whatsapp',
      conexion,
      tokenEnmascarado: conexion ? cripto.enmascarar(cripto.descifrar(conexion.tokenCifrado)) : '',
      callbackUrl: wh.callbackUrl, verifyToken: wh.verifyToken,
      mensaje: req.query.ok || null, error: req.query.err || null,
    });
  } catch (err) { next(err); }
});

// Solicitar conexion (modelo manual: Proshop la completa despues)
app.post('/panel/whatsapp/solicitar', requireCliente, async (req, res, next) => {
  const { numeroVisible } = req.body || {};
  try {
    if (!numeroVisible || !String(numeroVisible).trim()) {
      return res.redirect('/panel/whatsapp?err=' + encodeURIComponent('Ingresa tu número de WhatsApp.'));
    }
    const agente = await obtenerAgente(req.session.empresaId);
    const numero = String(numeroVisible).trim().slice(0, 20);
    const existente = await prisma.conexionWhatsApp.findUnique({ where: { agenteId: agente.id } });
    if (existente) {
      await prisma.conexionWhatsApp.update({
        where: { agenteId: agente.id },
        data: { numeroVisible: numero, estado: 'EN_PROCESO' },
      });
    } else {
      await prisma.conexionWhatsApp.create({
        data: { agenteId: agente.id, numeroVisible: numero, estado: 'EN_PROCESO' },
      });
    }
    res.redirect('/panel/whatsapp?ok=' + encodeURIComponent('¡Solicitud recibida! Estamos conectando tu número. Puede tardar unas horas.'));
  } catch (err) { next(err); }
});

// Guardar credenciales manualmente (config avanzada / self-service)
app.post('/panel/whatsapp', requireCliente, async (req, res, next) => {
  const { phoneNumberId, wabaId, token } = req.body || {};
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    const existente = await prisma.conexionWhatsApp.findUnique({ where: { agenteId: agente.id } });

    const phone = phoneNumberId ? String(phoneNumberId).trim().slice(0, 60) : null;
    if (phone) {
      const chocA = await prisma.conexionWhatsApp.findUnique({ where: { phoneNumberId: phone } });
      if (chocA && chocA.agenteId !== agente.id) {
        return res.redirect('/panel/whatsapp?err=' + encodeURIComponent('Ese Phone Number ID ya está registrado por otra cuenta.'));
      }
    }

    const datos = {
      phoneNumberId: phone,
      wabaId: wabaId ? String(wabaId).trim().slice(0, 60) : null,
    };
    if (token && String(token).trim()) {
      datos.tokenCifrado = cripto.cifrar(String(token).trim());
    }
    // Si tiene credenciales completas, se considera conectado
    const tieneToken = (token && String(token).trim()) || (existente && existente.tokenCifrado);
    datos.estado = phone && tieneToken ? 'CONECTADO' : (existente ? existente.estado : 'EN_PROCESO');

    if (existente) {
      await prisma.conexionWhatsApp.update({ where: { agenteId: agente.id }, data: datos });
    } else {
      await prisma.conexionWhatsApp.create({ data: { agenteId: agente.id, ...datos } });
    }
    res.redirect('/panel/whatsapp?ok=' + encodeURIComponent('Credenciales guardadas.'));
  } catch (err) { next(err); }
});

// Enviar mensaje de prueba (usa la API real de WhatsApp)
app.post('/panel/whatsapp/prueba', requireCliente, async (req, res, next) => {
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    const conexion = await prisma.conexionWhatsApp.findUnique({ where: { agenteId: agente.id } });
    if (!conexion || conexion.estado !== 'CONECTADO') {
      return res.redirect('/panel/whatsapp?err=' + encodeURIComponent('Tu WhatsApp aún no está conectado.'));
    }
    const wa = require('./lib/services/whatsapp');
    const destino = (conexion.numeroVisible || '').replace(/\D/g, '');
    const r = await wa.enviarTexto(conexion, destino, 'Mensaje de prueba de tu agente Proshop. ¡La conexión funciona! ✅');
    if (r.ok) {
      res.redirect('/panel/whatsapp?ok=' + encodeURIComponent('Mensaje de prueba enviado a ' + conexion.numeroVisible + '.'));
    } else {
      res.redirect('/panel/whatsapp?err=' + encodeURIComponent('No se pudo enviar: ' + r.error));
    }
  } catch (err) { next(err); }
});

// Probar conexion (consulta la Graph API)
app.post('/panel/whatsapp/probar', requireCliente, async (req, res, next) => {
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    const conexion = await prisma.conexionWhatsApp.findUnique({ where: { agenteId: agente.id } });
    const wa = require('./lib/services/whatsapp');
    const r = await wa.verificarConexion(conexion);
    if (r.ok) {
      res.redirect('/panel/whatsapp?ok=' + encodeURIComponent('Conexión OK. Número verificado: ' + (r.numero || '')));
    } else {
      res.redirect('/panel/whatsapp?err=' + encodeURIComponent('La prueba falló: ' + r.error));
    }
  } catch (err) { next(err); }
});

app.post('/panel/whatsapp/eliminar', requireCliente, async (req, res, next) => {
  try {
    const agente = await obtenerAgente(req.session.empresaId);
    await prisma.conexionWhatsApp.deleteMany({ where: { agenteId: agente.id } });
    res.redirect('/panel/whatsapp?ok=' + encodeURIComponent('Número desconectado.'));
  } catch (err) { next(err); }
});

// -------- Probar el agente (chat de prueba) --------
app.get('/panel/agente', requireCliente, async (req, res, next) => {
  try {
    const productos = await prisma.producto.count({
      where: { empresaId: req.session.empresaId, activo: true },
    });
    const { proveedorActivo } = require('./lib/services/agente');
    res.render('cliente/agente', {
      title: 'Probar mi agente - Proshop', tituloPagina: 'Probar mi agente', activo: 'agente',
      productos, iaActiva: proveedorActivo() !== 'demo',
    });
  } catch (err) { next(err); }
});

app.post('/panel/agente/mensaje', requireCliente, async (req, res, next) => {
  const { telefono, mensaje } = req.body || {};
  try {
    if (!mensaje || !String(mensaje).trim()) {
      return res.status(400).json({ ok: false, error: 'Mensaje vacío.' });
    }
    // Toma (o crea/activa) un agente de la empresa
    let agente = await prisma.agente.findFirst({ where: { empresaId: req.session.empresaId } });
    if (!agente) {
      agente = await prisma.agente.create({
        data: { empresaId: req.session.empresaId, nombre: 'Mi agente', estado: 'ACTIVO' },
      });
    } else if (agente.estado !== 'ACTIVO') {
      agente = await prisma.agente.update({ where: { id: agente.id }, data: { estado: 'ACTIVO' } });
    }

    const r = await atenderMensaje({
      agenteId: agente.id,
      telefonoCliente: String(telefono || 'demo').slice(0, 40),
      contenido: String(mensaje).slice(0, 1000),
    });

    // Revisa si hay que avisar (plan por acabar / sin saldo). No bloquea la respuesta.
    notif.verificarAvisos(req.session.empresaId).catch((e) => console.error('verificarAvisos:', e.message));

    if (!r.ok) {
      const motivos = {
        SIN_SALDO: 'Te quedaste sin conversaciones. Compra un paquete para seguir probando.',
        PERIODO_VENCIDO: 'Tu suscripción venció.',
        SUSCRIPCION_INACTIVA: 'Tu suscripción no está activa.',
      };
      return res.json({ ok: false, error: motivos[r.motivo] || 'No se pudo atender el mensaje.' });
    }
    res.json({ ok: true, respuesta: r.respuesta, cobrada: r.cobrada, demo: r.demo });
  } catch (err) { next(err); }
});

// ============================ PANEL ADMIN ============================
// Solo se acepta volver a una ruta interna: nada de "//otro.com" ni "http://...".
function destinoSeguro(valor) {
  if (typeof valor !== 'string') return null;
  if (!valor.startsWith('/') || valor.startsWith('//')) return null;
  return valor;
}

app.get('/admin/login', (req, res) => {
  const volver = destinoSeguro(req.query.volver);
  if (req.session && req.session.authed) return res.redirect(volver || '/admin');
  if (volver) req.session.volver = volver;
  res.render('admin/login', { title: 'Ingreso - Panel Proshop', error: null });
});

app.post('/admin/login', (req, res) => {
  const { usuario, password } = req.body || {};
  const ok = safeEqual(usuario || '', ADMIN_USER) && safeEqual(password || '', ADMIN_PASSWORD);
  if (!ok) {
    return res
      .status(401)
      .render('admin/login', { title: 'Ingreso - Panel Proshop', error: 'Usuario o contraseña incorrectos.' });
  }
  req.session.authed = true;
  req.session.usuario = ADMIN_USER;
  const volver = destinoSeguro(req.session.volver);
  delete req.session.volver;
  res.redirect(volver || '/admin');
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Datos comunes a todas las vistas del panel (usuario y contador del menu)
app.use('/admin', (req, res, next) => {
  if (req.session && req.session.authed) {
    res.locals.usuario = req.session.usuario;
    res.locals.badgeMensajes = leads.stats().nuevos;
  }
  next();
});

// --- Resumen ---
app.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const [empresas, agentes, conversaciones, planes, paquetes, suscripciones, pagos] =
      await Promise.all([
        prisma.empresa.count(),
        prisma.agente.count(),
        prisma.conversacion.count(),
        prisma.plan.count({ where: { activo: true } }),
        prisma.paquete.count(),
        prisma.suscripcion.count(),
        prisma.pago.count(),
      ]);

    res.render('admin/resumen', {
      title: 'Panel Proshop - Resumen',
      tituloPagina: 'Resumen',
      activo: 'resumen',
      stats: {
        empresas, agentes, conversaciones, planes, paquetes, suscripciones, pagos,
        mensajesNuevos: leads.stats().nuevos,
      },
    });
  } catch (err) { next(err); }
});

// --- Mensajes de contacto (leads del sitio) ---
app.get('/admin/mensajes', requireAuth, (req, res) => {
  const lista = leads.readLeads().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  res.render('admin/mensajes', {
    title: 'Panel Proshop - Mensajes',
    tituloPagina: 'Mensajes',
    activo: 'mensajes',
    leads: lista,
    stats: leads.stats(),
  });
});

// ---------- Utilidades ----------
function slugify(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'empresa';
}
function fechaInput(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}
// Agrega el consumo calculado a una lista de empresas
async function conConsumo(lista) {
  return Promise.all(
    lista.map(async (e) => ({
      ...e,
      consumo: e.suscripcion ? await obtenerEstadoConsumo(e.suscripcion.id) : null,
    }))
  );
}

// ============ REGISTRADOS (empresas cliente) - CRUD ============
app.get('/admin/registrados', requireAuth, async (req, res, next) => {
  try {
    const lista = await prisma.empresa.findMany({
      include: { suscripcion: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const empresas = await conConsumo(lista);
    const activos = empresas.filter(
      (e) => e.suscripcion && ['ACTIVA', 'PRUEBA'].includes(e.suscripcion.estado)
    ).length;

    res.render('admin/registrados', {
      title: 'Panel Proshop - Registrados',
      tituloPagina: 'Registrados',
      activo: 'registrados',
      empresas,
      stats: { total: empresas.length, activos, inactivos: empresas.length - activos },
      mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

app.get('/admin/registrados/nuevo', requireAuth, async (req, res, next) => {
  try {
    const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    res.render('admin/registrado-form', {
      title: 'Agregar empresa', tituloPagina: 'Agregar empresa', activo: 'registrados',
      empresa: null, planes, error: null,
      periodoFinValor: fechaInput(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (err) { next(err); }
});

app.post('/admin/registrados', requireAuth, async (req, res, next) => {
  const { nombre, planId, estado, marca, periodoFin } = req.body || {};
  try {
    const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    if (!nombre || !planId) {
      return res.status(400).render('admin/registrado-form', {
        title: 'Agregar empresa', tituloPagina: 'Agregar empresa', activo: 'registrados',
        empresa: null, planes, error: 'El nombre y el plan son obligatorios.',
        periodoFinValor: periodoFin || '',
      });
    }

    // Slug unico
    let slug = slugify(nombre);
    if (await prisma.empresa.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

    const fin = periodoFin ? new Date(periodoFin) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.empresa.create({
      data: {
        nombre: String(nombre).trim().slice(0, 120),
        slug,
        marca: marca ? String(marca).trim().slice(0, 120) : null,
        suscripcion: {
          create: {
            planId: Number(planId),
            estado: ['PRUEBA', 'ACTIVA', 'MOROSA', 'CANCELADA'].includes(estado) ? estado : 'PRUEBA',
            periodoFin: fin,
          },
        },
      },
    });
    res.redirect('/admin/registrados?ok=' + encodeURIComponent('Empresa creada correctamente.'));
  } catch (err) { next(err); }
});

app.get('/admin/registrados/:id/editar', requireAuth, async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(req.params.id) },
      include: { suscripcion: true },
    });
    if (!empresa) return res.redirect('/admin/registrados');
    const planes = await prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    res.render('admin/registrado-form', {
      title: 'Editar empresa', tituloPagina: 'Editar empresa', activo: 'registrados',
      empresa, planes, error: null,
      periodoFinValor: fechaInput(empresa.suscripcion && empresa.suscripcion.periodoFin),
    });
  } catch (err) { next(err); }
});

app.post('/admin/registrados/:id', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  const { nombre, planId, estado, marca, periodoFin } = req.body || {};
  try {
    await prisma.empresa.update({
      where: { id },
      data: {
        nombre: String(nombre).trim().slice(0, 120),
        marca: marca ? String(marca).trim().slice(0, 120) : null,
      },
    });
    const sub = await prisma.suscripcion.findUnique({ where: { empresaId: id } });
    const datosSub = {
      planId: Number(planId),
      estado: ['PRUEBA', 'ACTIVA', 'MOROSA', 'CANCELADA'].includes(estado) ? estado : 'PRUEBA',
      periodoFin: periodoFin ? new Date(periodoFin) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    if (sub) await prisma.suscripcion.update({ where: { empresaId: id }, data: datosSub });
    else await prisma.suscripcion.create({ data: { empresaId: id, ...datosSub } });

    res.redirect('/admin/registrados?ok=' + encodeURIComponent('Cambios guardados.'));
  } catch (err) { next(err); }
});

// Simula conversaciones entrantes para verificar el consumo desde el panel.
app.post('/admin/registrados/:id/simular', requireAuth, async (req, res, next) => {
  try {
    const empresaId = Number(req.params.id);
    const cantidad = Math.min(Math.max(parseInt(req.body.cantidad, 10) || 1, 1), 500);

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { agentes: true, suscripcion: true },
    });
    if (!empresa || !empresa.suscripcion) {
      return res.redirect('/admin/registrados?ok=' +
        encodeURIComponent('Esa empresa no tiene suscripción.'));
    }

    // Asegura que exista un agente ACTIVO que pueda atender
    let agente = empresa.agentes[0];
    if (!agente) {
      agente = await prisma.agente.create({
        data: { empresaId, nombre: `Agente de ${empresa.nombre}`, estado: 'ACTIVO' },
      });
    } else if (agente.estado !== 'ACTIVO') {
      agente = await prisma.agente.update({ where: { id: agente.id }, data: { estado: 'ACTIVO' } });
    }

    const marca = Date.now().toString().slice(-6);
    let plan = 0, extra = 0, bloqueadas = 0;

    for (let i = 1; i <= cantidad; i++) {
      const r = await procesarMensajeEntrante({
        agenteId: agente.id,
        telefonoCliente: `5917${marca}${String(i).padStart(3, '0')}`,
        contenido: 'Mensaje de prueba (simulación)',
      });
      if (!r.ok) bloqueadas++;
      else if (r.origen === 'EXTRA') extra++;
      else plan++;
    }

    const detalle = [];
    if (plan) detalle.push(`${plan} del plan`);
    if (extra) detalle.push(`${extra} de paquetes`);
    if (bloqueadas) detalle.push(`${bloqueadas} bloqueadas por falta de saldo`);
    const msg = `Simuladas ${cantidad} conversaciones: ${detalle.join(' · ')}`;

    res.redirect('/admin/registrados?ok=' + encodeURIComponent(msg));
  } catch (err) { next(err); }
});

app.post('/admin/registrados/:id/eliminar', requireAuth, async (req, res, next) => {
  try {
    await prisma.empresa.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/registrados?ok=' + encodeURIComponent('Empresa eliminada.'));
  } catch (err) { next(err); }
});

// ============ ACTIVOS ============
app.get('/admin/activos', requireAuth, async (req, res, next) => {
  try {
    const lista = await prisma.empresa.findMany({
      where: { suscripcion: { estado: { in: ['ACTIVA', 'PRUEBA'] } } },
      include: { suscripcion: { include: { plan: true } } },
      orderBy: { nombre: 'asc' },
    });
    const empresas = await conConsumo(lista);
    res.render('admin/activos', {
      title: 'Panel Proshop - Activos', tituloPagina: 'Activos', activo: 'activos',
      empresas,
      stats: {
        activos: empresas.length,
        convDisponibles: empresas.reduce((s, e) => s + (e.consumo ? e.consumo.totalDisponible : 0), 0),
        alLimite: empresas.filter((e) => e.consumo && e.consumo.porcentajeUsado >= 80).length,
      },
    });
  } catch (err) { next(err); }
});

// ============ REGISTRO DE PAQUETES (compras) - CRUD ============
app.get('/admin/compras', requireAuth, async (req, res, next) => {
  try {
    const [compras, empresas] = await Promise.all([
      prisma.compraPaquete.findMany({
        include: { empresa: true, paquete: true },
        orderBy: { fechaCompra: 'desc' },
      }),
      prisma.empresa.findMany({ orderBy: { nombre: 'asc' } }),
    ]);
    const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    res.render('admin/compras', {
      title: 'Panel Proshop - Registro de paquetes',
      tituloPagina: 'Registro de paquetes', activo: 'compras',
      compras, empresas,
      stats: {
        total: compras.length,
        saldoTotal: compras
          .filter((c) => c.estado === 'ACTIVA')
          .reduce((s, c) => s + (c.cantidad - c.consumidas), 0),
        porVencer: compras.filter(
          (c) => c.estado === 'ACTIVA' && c.fechaRenovacion <= en7dias
        ).length,
      },
      mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

// Enviar un aviso manual (notificacion con campanita) a un cliente
app.post('/admin/notificaciones', requireAuth, async (req, res, next) => {
  const { empresaId, titulo, mensaje, conBotones } = req.body || {};
  try {
    if (!empresaId || !mensaje) {
      return res.redirect('/admin/compras?ok=' + encodeURIComponent('Falta el cliente o el mensaje.'));
    }
    await notif.crear(Number(empresaId), {
      titulo: titulo ? String(titulo).slice(0, 120) : 'Aviso de Proshop',
      mensaje: String(mensaje).slice(0, 500),
      tipo: 'MANUAL',
      conBotones: conBotones === '1',
    });
    res.redirect('/admin/compras?ok=' + encodeURIComponent('Aviso enviado al cliente. Le aparecerá en su campanita.'));
  } catch (err) { next(err); }
});

app.get('/admin/compras/nueva', requireAuth, async (req, res, next) => {
  try {
    const [empresas, paquetes] = await Promise.all([
      prisma.empresa.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.paquete.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' } }),
    ]);
    res.render('admin/compra-form', {
      title: 'Registrar compra', tituloPagina: 'Registrar compra', activo: 'compras',
      compra: null, empresas, paquetes, error: null,
      fechaRenovacionValor: fechaInput(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (err) { next(err); }
});

app.post('/admin/compras', requireAuth, async (req, res, next) => {
  const { empresaId, paqueteId, cantidad, precioUsd, fechaRenovacion, nota } = req.body || {};
  try {
    const cant = parseInt(cantidad, 10);
    if (!empresaId || !Number.isInteger(cant) || cant <= 0) {
      const [empresas, paquetes] = await Promise.all([
        prisma.empresa.findMany({ orderBy: { nombre: 'asc' } }),
        prisma.paquete.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' } }),
      ]);
      return res.status(400).render('admin/compra-form', {
        title: 'Registrar compra', tituloPagina: 'Registrar compra', activo: 'compras',
        compra: null, empresas, paquetes,
        error: 'Selecciona un cliente e indica una cantidad válida de conversaciones.',
        fechaRenovacionValor: fechaRenovacion || '',
      });
    }

    await registrarCompraPaquete({
      empresaId: Number(empresaId),
      paqueteId: paqueteId ? Number(paqueteId) : undefined,
      cantidad: cant,
      precioUsd: precioUsd ? Number(precioUsd) : 0,
      fechaRenovacion: fechaRenovacion ? new Date(fechaRenovacion) : undefined,
      nota: nota ? String(nota).slice(0, 200) : undefined,
    });
    res.redirect('/admin/compras?ok=' + encodeURIComponent('Compra registrada correctamente.'));
  } catch (err) { next(err); }
});

app.get('/admin/compras/:id/editar', requireAuth, async (req, res, next) => {
  try {
    const compra = await prisma.compraPaquete.findUnique({ where: { id: Number(req.params.id) } });
    if (!compra) return res.redirect('/admin/compras');
    const [empresas, paquetes] = await Promise.all([
      prisma.empresa.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.paquete.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' } }),
    ]);
    res.render('admin/compra-form', {
      title: 'Editar compra', tituloPagina: 'Editar compra', activo: 'compras',
      compra, empresas, paquetes, error: null,
      fechaRenovacionValor: fechaInput(compra.fechaRenovacion),
    });
  } catch (err) { next(err); }
});

app.post('/admin/compras/:id', requireAuth, async (req, res, next) => {
  const { empresaId, paqueteId, cantidad, precioUsd, fechaRenovacion, nota, consumidas } = req.body || {};
  try {
    const cant = parseInt(cantidad, 10);
    const usadas = Math.max(0, Math.min(parseInt(consumidas, 10) || 0, cant));
    await prisma.compraPaquete.update({
      where: { id: Number(req.params.id) },
      data: {
        empresaId: Number(empresaId),
        paqueteId: paqueteId ? Number(paqueteId) : null,
        cantidad: cant,
        consumidas: usadas,
        precioUsd: precioUsd ? Number(precioUsd) : 0,
        fechaRenovacion: new Date(fechaRenovacion),
        nota: nota ? String(nota).slice(0, 200) : null,
        estado: usadas >= cant ? 'AGOTADA' : 'ACTIVA',
      },
    });
    res.redirect('/admin/compras?ok=' + encodeURIComponent('Compra actualizada.'));
  } catch (err) { next(err); }
});

app.post('/admin/compras/:id/eliminar', requireAuth, async (req, res, next) => {
  try {
    await prisma.compraPaquete.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/compras?ok=' + encodeURIComponent('Registro eliminado.'));
  } catch (err) { next(err); }
});

// --- Conexiones de WhatsApp (Proshop las conecta manualmente) ---
app.get('/admin/conexiones', requireAuth, async (req, res, next) => {
  try {
    const conexiones = await prisma.conexionWhatsApp.findMany({
      include: { agente: { include: { empresa: true } } },
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });
    res.render('admin/conexiones', {
      title: 'Panel Proshop - Conexiones', tituloPagina: 'Conexiones WhatsApp', activo: 'conexiones',
      conexiones,
      stats: {
        total: conexiones.length,
        enProceso: conexiones.filter((c) => c.estado !== 'CONECTADO').length,
        conectadas: conexiones.filter((c) => c.estado === 'CONECTADO').length,
      },
      mensaje: req.query.ok || null,
    });
  } catch (err) { next(err); }
});

app.post('/admin/conexiones/:id', requireAuth, async (req, res, next) => {
  const { numeroVisible, phoneNumberId, wabaId, token, conectado } = req.body || {};
  try {
    const id = Number(req.params.id);
    const actual = await prisma.conexionWhatsApp.findUnique({ where: { id } });
    if (!actual) return res.redirect('/admin/conexiones');

    const datos = {
      numeroVisible: numeroVisible ? String(numeroVisible).trim().slice(0, 20) : null,
      phoneNumberId: phoneNumberId ? String(phoneNumberId).trim().slice(0, 60) : null,
      wabaId: wabaId ? String(wabaId).trim().slice(0, 60) : null,
      estado: conectado === '1' ? 'CONECTADO' : 'EN_PROCESO',
      verificado: conectado === '1',
    };
    if (token && String(token).trim()) {
      datos.tokenCifrado = cripto.cifrar(String(token).trim());
    }
    await prisma.conexionWhatsApp.update({ where: { id }, data: datos });
    res.redirect('/admin/conexiones?ok=' + encodeURIComponent('Conexión actualizada.'));
  } catch (err) { next(err); }
});

app.post('/admin/conexiones/:id/eliminar', requireAuth, async (req, res, next) => {
  try {
    await prisma.conexionWhatsApp.delete({ where: { id: Number(req.params.id) } });
    res.redirect('/admin/conexiones?ok=' + encodeURIComponent('Conexión eliminada.'));
  } catch (err) { next(err); }
});

// --- Usuarios y planes ---
app.get('/admin/usuarios', requireAuth, async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: { not: 'PROSHOP_ADMIN' } },
      include: { empresa: { include: { suscripcion: { include: { plan: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const conPlan = usuarios.filter((u) => u.empresa && u.empresa.suscripcion).length;
    const dePago = usuarios.filter(
      (u) => u.empresa && u.empresa.suscripcion && Number(u.empresa.suscripcion.plan.mensualidadBs) > 0
    ).length;
    res.render('admin/usuarios', {
      title: 'Panel Proshop - Usuarios', tituloPagina: 'Usuarios', activo: 'usuarios',
      usuarios, stats: { total: usuarios.length, conPlan, dePago },
    });
  } catch (err) { next(err); }
});

// --- Seguimiento de mensajes (conversaciones restantes por cliente) ---
app.get('/admin/seguimiento', requireAuth, async (req, res, next) => {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { suscripcion: { isNot: null } },
      include: {
        suscripcion: { include: { plan: true } },
        comprasPaquete: { orderBy: { fechaCompra: 'desc' } },
      },
      orderBy: { nombre: 'asc' },
    });

    const filas = await Promise.all(
      empresas.map(async (e) => ({
        empresa: e,
        plan: e.suscripcion.plan,
        suscripcion: e.suscripcion,
        consumo: await obtenerEstadoConsumo(e.suscripcion.id),
        paquetes: e.comprasPaquete.filter((c) => c.estado !== 'VENCIDA'),
      }))
    );

    res.render('admin/seguimiento', {
      title: 'Panel Proshop - Seguimiento', tituloPagina: 'Seguimiento de mensajes', activo: 'seguimiento',
      filas,
      stats: {
        clientes: filas.length,
        totalDisponible: filas.reduce((s, f) => s + f.consumo.totalDisponible, 0),
        sinSaldo: filas.filter((f) => f.consumo.totalDisponible === 0).length,
      },
    });
  } catch (err) { next(err); }
});

// --- Empresas cliente ---
app.get('/admin/empresas', requireAuth, async (req, res, next) => {
  try {
    const lista = await prisma.empresa.findMany({
      include: { suscripcion: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // Calcula el consumo de cada empresa que tenga suscripcion
    const empresas = await Promise.all(
      lista.map(async (e) => ({
        ...e,
        consumo: e.suscripcion ? await obtenerEstadoConsumo(e.suscripcion.id) : null,
      }))
    );
    res.render('admin/empresas', {
      title: 'Panel Proshop - Empresas',
      tituloPagina: 'Empresas',
      activo: 'empresas',
      empresas,
    });
  } catch (err) { next(err); }
});

// --- Agentes ---
app.get('/admin/agentes', requireAuth, async (req, res, next) => {
  try {
    const agentes = await prisma.agente.findMany({
      include: { empresa: true, conexion: true, _count: { select: { conversaciones: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.render('admin/agentes', {
      title: 'Panel Proshop - Agentes',
      tituloPagina: 'Agentes',
      activo: 'agentes',
      agentes,
    });
  } catch (err) { next(err); }
});

// --- Planes ---
app.get('/admin/planes', requireAuth, async (req, res, next) => {
  try {
    const planes = await prisma.plan.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
    res.render('admin/planes', {
      title: 'Panel Proshop - Planes',
      tituloPagina: 'Planes',
      activo: 'planes',
      planes,
    });
  } catch (err) { next(err); }
});

// --- Paquetes ---
app.get('/admin/paquetes', requireAuth, async (req, res, next) => {
  try {
    const paquetes = await prisma.paquete.findMany({ orderBy: { cantidad: 'asc' } });
    res.render('admin/paquetes', {
      title: 'Panel Proshop - Paquetes',
      tituloPagina: 'Paquetes',
      activo: 'paquetes',
      paquetes,
    });
  } catch (err) { next(err); }
});

// --- Pagos ---
app.get('/admin/pagos', requireAuth, async (req, res, next) => {
  try {
    const pagos = await prisma.pago.findMany({
      include: { empresa: true },
      orderBy: { fecha: 'desc' },
      take: 100,
    });
    res.render('admin/pagos', {
      title: 'Panel Proshop - Pagos',
      tituloPagina: 'Pagos',
      activo: 'pagos',
      pagos,
    });
  } catch (err) { next(err); }
});

app.post('/admin/leads/:id/estado', requireAuth, (req, res) => {
  const nuevoEstado = req.body.estado === 'atendido' ? 'atendido' : 'nuevo';
  leads.updateLead(req.params.id, { estado: nuevoEstado });
  res.redirect('/admin/mensajes');
});

app.post('/admin/leads/:id/eliminar', requireAuth, (req, res) => {
  leads.deleteLead(req.params.id);
  res.redirect('/admin/mensajes');
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Pagina no encontrada' });
});

app.listen(PORT, () => {
  console.log(`\n  ${site.name} corriendo en http://localhost:${PORT}`);
  console.log(`  Panel admin: http://localhost:${PORT}/admin\n`);
});
