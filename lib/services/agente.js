// Cerebro del agente de ventas.
//
// Soporta dos proveedores de IA y elige automaticamente segun las claves del .env:
//   1. OpenAI     -> si existe OPENAI_API_KEY      (modelo por defecto: gpt-4o-mini)
//   2. Anthropic  -> si existe ANTHROPIC_API_KEY   (modelo segun el plan)
//   3. Modo demo  -> si no hay ninguna clave (responde con reglas simples)
//
// Asi la plataforma funciona con la clave que tenga el usuario, sin cambiar codigo.
require('dotenv').config();

const { prisma } = require('../db');

// Modelos por defecto de cada proveedor (se pueden cambiar por variables de entorno)
const OPENAI_MODEL_DEFAULT = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL_DEFAULT = 'claude-haiku-4-5';

// Mapa de modelos por plan: mejor plan -> mejor modelo.
// Se usa cuando el plan no trae un modelo compatible con el proveedor activo.
const MODELOS_POR_PLAN = {
  openai: {
    GRATIS: 'gpt-4o-mini',
    STANDARD: 'gpt-4.1-mini',
    PRO: 'gpt-4o',
    PREMIUM: 'gpt-5.2-chat-latest',
  },
  anthropic: {
    GRATIS: 'claude-haiku-4-5',
    STANDARD: 'claude-haiku-4-5',
    PRO: 'claude-sonnet-5',
    PREMIUM: 'claude-opus-4-8',
  },
};

// Elige el modelo segun el proveedor y el plan del cliente.
function modeloParaPlan(proveedor, plan) {
  const configurado = plan && plan.modeloIa;
  const codigo = plan && plan.codigo;
  if (proveedor === 'openai') {
    if (configurado && /^gpt/i.test(configurado)) return configurado; // el plan ya trae modelo OpenAI
    return (MODELOS_POR_PLAN.openai[codigo]) || OPENAI_MODEL_DEFAULT;
  }
  // anthropic
  if (configurado && /^claude/i.test(configurado)) return configurado;
  return (MODELOS_POR_PLAN.anthropic[codigo]) || ANTHROPIC_MODEL_DEFAULT;
}

// Detecta que proveedor usar.
function proveedorActivo() {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'demo';
}

let openaiClient = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const OpenAI = require('openai');
  openaiClient = new OpenAI(); // toma OPENAI_API_KEY del entorno
  return openaiClient;
}

let anthropicClient = null;
function getAnthropic() {
  if (anthropicClient) return anthropicClient;
  const Anthropic = require('@anthropic-ai/sdk');
  anthropicClient = new Anthropic(); // toma ANTHROPIC_API_KEY del entorno
  return anthropicClient;
}

// Construye el prompt de sistema con la identidad del negocio y su catalogo.
function construirSystem(empresa, productos, config) {
  const marca = empresa.marca || empresa.nombre;
  const tono = (config && config.tono) || 'cordial y profesional';
  const extra = (config && config.instrucciones) || '';

  const listado = productos.length
    ? productos
        .map(
          (p) =>
            `- ${p.nombre} | Bs ${Number(p.precio).toFixed(2)} | stock: ${p.stock}` +
            (p.descripcion ? ` | ${p.descripcion}` : '')
        )
        .join('\n')
    : '(el negocio todavia no cargo productos)';

  return `Eres el asistente de ventas por WhatsApp de "${marca}".
Tu trabajo es atender a los clientes, responder sobre los productos, recomendar
opciones y ayudar a cerrar pedidos. Habla en espanol, con un tono ${tono}.

Reglas:
- Responde SOLO sobre este negocio y su catalogo. Si preguntan algo ajeno, redirige amablemente.
- Usa los precios y el stock reales del catalogo. Si algo no esta, dilo con sinceridad.
- Se breve y claro (es un chat de WhatsApp). Usa como maximo 4 lineas.
- Cuando el cliente quiera comprar, confirma los productos y pide sus datos (nombre y direccion).
- No inventes productos ni precios que no esten en la lista.
${extra ? '- ' + extra : ''}

Catalogo actual de ${marca}:
${listado}`;
}

/**
 * Genera la respuesta del agente para un mensaje del cliente.
 * @param {number} agenteId
 * @param {Array<{rol:string, contenido:string}>} historial  mensajes previos
 * @param {string} mensajeCliente  el ultimo mensaje del cliente
 * @returns {Promise<{ok:boolean, respuesta:string, demo:boolean, proveedor:string, modelo?:string}>}
 */
async function generarRespuesta(agenteId, historial, mensajeCliente) {
  const agente = await prisma.agente.findUnique({
    where: { id: agenteId },
    include: {
      config: true,
      empresa: {
        include: {
          suscripcion: { include: { plan: true } },
          productos: { where: { activo: true }, orderBy: { nombre: 'asc' }, take: 200 },
        },
      },
    },
  });
  if (!agente) return { ok: false, respuesta: 'Agente no encontrado.', demo: true, proveedor: 'demo' };

  const { empresa } = agente;
  const system = construirSystem(empresa, empresa.productos, agente.config);

  // Historial en formato { role, content } (comun a ambos proveedores)
  const previos = historial
    .filter((m) => m.rol === 'CLIENTE' || m.rol === 'AGENTE')
    .map((m) => ({ role: m.rol === 'CLIENTE' ? 'user' : 'assistant', content: m.contenido }));

  const proveedor = proveedorActivo();
  const plan = empresa.suscripcion && empresa.suscripcion.plan;
  const modelo = modeloParaPlan(proveedor, plan);

  try {
    if (proveedor === 'openai') {
      const openai = getOpenAI();
      // Los modelos GPT-5 y la serie "o" usan max_completion_tokens; el resto max_tokens.
      const params = {
        model: modelo,
        messages: [{ role: 'system', content: system }, ...previos, { role: 'user', content: mensajeCliente }],
      };
      const campoTokens = /^(gpt-5|o[0-9])/i.test(modelo) ? 'max_completion_tokens' : 'max_tokens';
      params[campoTokens] = 500;
      const resp = await openai.chat.completions.create(params);
      const texto = (resp.choices[0].message.content || '').trim();
      return { ok: true, demo: false, proveedor, modelo, respuesta: texto || '...' };
    }

    if (proveedor === 'anthropic') {
      const anthropic = getAnthropic();
      const resp = await anthropic.messages.create({
        model: modelo,
        max_tokens: 400,
        system,
        messages: [...previos, { role: 'user', content: mensajeCliente }],
      });
      const texto = resp.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { ok: true, demo: false, proveedor, modelo, respuesta: texto || '...' };
    }
  } catch (err) {
    console.error(`Error del agente (${proveedor}):`, err.message);
    // Ante un fallo de la API, cae al modo demo para no romper la conversacion
  }

  // ---- Modo demo (sin clave, o si la API fallo) ----
  return { ok: true, demo: true, proveedor: 'demo', respuesta: respuestaDemo(empresa, mensajeCliente) };
}

// Respuesta basica sin IA: busca coincidencias simples en el catalogo.
function respuestaDemo(empresa, mensaje) {
  const marca = empresa.marca || empresa.nombre;
  const texto = String(mensaje).toLowerCase();
  const productos = empresa.productos || [];

  const encontrados = productos.filter((p) =>
    texto.split(/\s+/).some((w) => w.length > 3 && p.nombre.toLowerCase().includes(w.replace(/[^a-z0-9]/gi, '')))
  );

  if (encontrados.length) {
    const lista = encontrados
      .slice(0, 3)
      .map((p) => `• ${p.nombre}: Bs ${Number(p.precio).toFixed(2)}`)
      .join('\n');
    return `¡Hola! En ${marca} tenemos:\n${lista}\n¿Te gustaría hacer un pedido?`;
  }
  if (/hola|buenas|buenos/.test(texto)) {
    return `¡Hola! Bienvenido a ${marca}. ¿Qué producto estás buscando hoy?`;
  }
  if (/precio|costo|cuanto|cuánto/.test(texto) && productos.length) {
    const lista = productos
      .slice(0, 3)
      .map((p) => `• ${p.nombre}: Bs ${Number(p.precio).toFixed(2)}`)
      .join('\n');
    return `Estos son algunos de nuestros precios:\n${lista}`;
  }
  return `¡Gracias por escribir a ${marca}! Cuéntame qué producto te interesa y te ayudo. (Respuesta de demostración — configura OPENAI_API_KEY o ANTHROPIC_API_KEY para activar la IA real.)`;
}

module.exports = { generarRespuesta, construirSystem, proveedorActivo };
