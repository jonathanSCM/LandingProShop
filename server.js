// Proshop - servidor web (Express)
// Sirve la landing, el formulario de contacto y un admin minimo (editor de la landing).
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const contenido = require('./lib/contenido');
const Bloques = require('./public/js/bloques.js');
const LandingCfg = require('./public/js/landing-cfg.js');
const LandingRender = require('./lib/landing-render');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Configuracion del negocio (editable por variables de entorno) ----
const site = {
  name: 'ProShop',
  tagline: 'Software a medida que impulsa tu negocio',
  // Numero de WhatsApp en formato internacional SIN el signo + (591 = Bolivia).
  whatsapp: process.env.WHATSAPP_NUMBER || '59162095357',
  email: process.env.CONTACT_EMAIL || 'soporte@proshop.lat',
  phone: process.env.CONTACT_PHONE || '+591 62095357',
  location: process.env.CONTACT_LOCATION || 'Lima Metropolitana, Perú',
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
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
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


// Aviso si se sale a produccion con la clave de ejemplo.
if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'proshop123') {
  console.warn('\n  ATENCION: ADMIN_PASSWORD usa el valor por defecto. Defínela en las variables de entorno.\n');
}

const editorBloques = require('./lib/editor-bloques');

// Igual que requireAuth pero para la API: responde 401 en JSON en vez de redirigir.
function requireAuthApi(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ ok: false, error: 'Tu sesión expiró. Vuelve a ingresar al panel.' });
}

// ============================ SITIO PUBLICO ============================
// Landing. Con ?editar=1 (solo admin) se abre el modo edicion: textos, enlaces,
// orden y estilo de las secciones, secciones nuevas y diseno general.
app.get('/', async (req, res, next) => {
  try {
    const quiereEditar = req.query.editar === '1';
    const esAdmin = !!(req.session && req.session.authed);

    if (quiereEditar && !esAdmin) {
      return res.redirect('/admin/login?volver=' + encodeURIComponent('/?editar=1'));
    }

    const editando = quiereEditar && esAdmin;
    const cont = await contenido.leer();
    const cfg = cont.config;
    const { t, enlace } = LandingRender.helpers(cont.textos, cfg.enlaces);

    // Secciones en el orden elegido. Las ocultas solo se ven al editar, para poder recuperarlas.
    const secciones = [];
    cfg.orden.forEach((id) => {
      const sec = cfg.secciones[id];
      if (sec.oculto && !editando) return;
      const est = LandingCfg.estiloSeccion(sec);
      const custom = !!cfg.custom[id];
      secciones.push({
        id, custom, anim: editando ? '' : est.anim, style: est.style,
        clase: [est.clase, sec.oculto ? 'esta-oculta' : '', custom ? 'es-custom' : ''].filter(Boolean).join(' '),
        ancla: sec.ancla,
        html: custom ? Bloques.render(cfg.custom[id], { vars: LandingCfg.VARS_BLOQUES }) : '',
      });
    });

    const lista = LandingRender.listaProyectos(cont);
    const fuente = LandingCfg.FUENTES[cfg.diseno.fuente];
    const d = cfg.diseno;
    const cab = LandingCfg.estiloCabecera(cfg.cabecera);
    const pie = LandingCfg.estiloPie(cfg.pie);
    res.render('landing', {
      title: `${site.name} | Software a medida`,
      proyectos: editando ? lista : lista.filter((p) => !p.oculto),
      editando, esAdmin, secciones, enlace, t,
      menu: LandingCfg.itemsMenu(cfg),
      hayCustom: secciones.some((s) => s.custom),
      disenoCss: LandingCfg.cssDiseno(d),
      fuenteUrl: fuente ? fuente.url : '',
      sinAnim: d.animaciones === 'ninguna',
      htmlAttrs: [
        d.modo !== 'auto' ? `data-tema="${d.modo}" data-tema-fijo` : '',
        d.bordes !== 'original' ? `data-bordes="${d.bordes}"` : '',
      ].filter(Boolean).join(' '),
      sinBotonTema: d.modo !== 'auto' || !d.botonTema,
      cab: cfg.cabecera, cabEstilo: cab, pie: cfg.pie, pieEstilo: pie,
      pieSoluciones: cfg.pie.solEnlaces
        .map((e) => ({ texto: e.texto, href: Bloques.url(e.url) }))
        .filter((e) => e.href && e.texto),
      // Datos que necesita el editor del navegador (el JSON no puede cerrar el <script>).
      edDatos: editando ? JSON.stringify({ config: cfg, textos: cont.textos, lista }).replace(/</g, '\\u003c') : '',
    });
  } catch (err) { next(err); }
});

// Guarda los cambios del modo edicion de la landing clasica. Solo admin.
app.post('/api/landing', requireAuthApi, async (req, res) => {
  try {
    const guardado = await contenido.guardar(req.body || {});
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

app.post('/api/landing/restablecer', requireAuthApi, async (req, res) => {
  try {
    await contenido.guardar({});
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'No se pudo restablecer.' });
  }
});

// Repinta la lista de proyectos con los datos que lleva el editor (sin guardar todavia).
app.post('/api/landing/proyectos-html', requireAuthApi, async (req, res) => {
  try {
    const cont = await contenido.leer();
    const body = req.body || {};
    const lista = (Array.isArray(body.lista) ? body.lista : []).slice(0, 40).map((p) => LandingCfg.limpiarProyecto(p));
    const enlaces = LandingCfg.limpiarConfig({ enlaces: body.enlaces }).enlaces;
    const textos = Object.assign({}, cont.textos);
    const h = LandingRender.helpers(textos, Object.assign({}, cont.config.enlaces, enlaces));
    app.render('landing/proyectos-lista', { proyectos: lista, editando: true, site, t: h.t, enlace: h.enlace }, (err, html) => {
      if (err) { console.error(err); return res.status(500).json({ ok: false, error: 'No se pudo dibujar la lista.' }); }
      res.json({ ok: true, html });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'No se pudo dibujar la lista.' });
  }
});

// Formulario de contacto: valida y devuelve un enlace de WhatsApp con el mensaje
// ya escrito, para que la conversacion siga ahi.
app.post('/api/contacto', (req, res) => {
  const { nombre, email, telefono, servicio, mensaje } = req.body || {};

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios: nombre, email y mensaje.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ ok: false, error: 'El email no es valido.' });
  }

  const lead = {
    nombre: String(nombre).trim().slice(0, 120),
    email: String(email).trim().slice(0, 160),
    telefono: telefono ? String(telefono).trim().slice(0, 40) : '',
    servicio: servicio ? String(servicio).trim().slice(0, 80) : '',
    mensaje: String(mensaje).trim().slice(0, 2000),
  };
  console.log('Contacto recibido:', JSON.stringify(lead));

  const texto = encodeURIComponent(
    `Hola ${site.name}, soy ${lead.nombre} (${lead.email}${lead.telefono ? ', ' + lead.telefono : ''}).` +
      (lead.servicio ? ` Me interesa: ${lead.servicio}.` : '') +
      ` ${lead.mensaje}`
  );
  return res.json({
    ok: true,
    mensaje: 'Gracias, te contactaremos pronto.',
    whatsappUrl: `https://wa.me/${site.whatsapp}?text=${texto}`,
  });
});

// ============================ ADMIN ============================
function destinoSeguro(valor) {
  if (typeof valor !== 'string') return null;
  if (!valor.startsWith('/') || valor.startsWith('//')) return null;
  return valor;
}

app.get('/admin/login', (req, res) => {
  const volver = destinoSeguro(req.query.volver);
  if (req.session && req.session.authed) return res.redirect(volver || '/admin');
  if (volver) req.session.volver = volver;
  res.render('admin/login', { title: 'Ingreso - ' + site.name, error: null });
});

app.post('/admin/login', (req, res) => {
  const { usuario, password } = req.body || {};
  const ok = safeEqual(usuario || '', ADMIN_USER) && safeEqual(password || '', ADMIN_PASSWORD);
  if (!ok) {
    return res.status(401).render('admin/login', { title: 'Ingreso - ' + site.name, error: 'Usuario o contraseña incorrectos.' });
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

// Datos comunes a las vistas del admin
app.use('/admin', (req, res, next) => {
  if (req.session && req.session.authed) res.locals.usuario = req.session.usuario;
  next();
});

// El admin ES la landing en modo edicion: no hay otro panel.
app.get('/admin', requireAuth, (req, res) => res.redirect('/?editar=1'));

editorBloques.montar(app, { requireAuth, requireAuthApi });

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Pagina no encontrada' });
});

// Errores no controlados: nunca se muestra el detalle al visitante.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ ok: false, error: 'Error interno.' });
  res.status(500).send('Algo salió mal. Intenta de nuevo en un momento.');
});

app.listen(PORT, () => {
  console.log(`\n  ${site.name} corriendo en http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin\n`);
});
