// Servicio de conversaciones.
//
// Regla comercial: "Una conversacion puede contener varios mensajes intercambiados
// entre el cliente y el agente". Por eso NO se cobra por mensaje: los mensajes de un
// mismo telefono dentro de una ventana de tiempo pertenecen a la misma conversacion
// y se cobran una sola vez.
//
// Al recibir un mensaje:
//   - Si hay una conversacion abierta (dentro de la ventana) -> se agrega, no cobra.
//   - Si no hay -> se intenta consumir 1 conversacion y se abre una nueva.
//   - Si no hay saldo -> no se atiende y se avisa para que compren un paquete.

const { prisma } = require('../db');
const { consumirConversacion } = require('./suscripciones');

// Ventana de agrupacion. 24 h coincide con la ventana de sesion de WhatsApp.
const VENTANA_HORAS = Number(process.env.CONVERSATION_WINDOW_HOURS || 24);
const VENTANA_MS = VENTANA_HORAS * 60 * 60 * 1000;

/**
 * Devuelve la conversacion abierta del cliente, o null si la ventana expiro.
 */
async function buscarConversacionAbierta(agenteId, telefonoCliente) {
  const ultima = await prisma.conversacion.findFirst({
    where: { agenteId, telefonoCliente },
    orderBy: { ultimoMensajeAt: 'desc' },
  });

  if (!ultima) return null;
  const dentroDeVentana = Date.now() - ultima.ultimoMensajeAt.getTime() < VENTANA_MS;
  return dentroDeVentana ? ultima : null;
}

/**
 * Procesa un mensaje entrante del cliente final.
 *
 * @returns {{
 *   ok:boolean, motivo?:string, cobrada:boolean,
 *   conversacionId?:number, origen?:string
 * }}
 */
async function procesarMensajeEntrante({ agenteId, telefonoCliente, contenido }) {
  const agente = await prisma.agente.findUnique({
    where: { id: agenteId },
    include: { empresa: { include: { suscripcion: true } } },
  });

  if (!agente) return { ok: false, motivo: 'AGENTE_NO_EXISTE', cobrada: false };
  if (agente.estado !== 'ACTIVO') return { ok: false, motivo: 'AGENTE_INACTIVO', cobrada: false };

  const suscripcion = agente.empresa.suscripcion;
  if (!suscripcion) return { ok: false, motivo: 'SIN_SUSCRIPCION', cobrada: false };

  // 1) Continuar una conversacion ya abierta: no se cobra
  const abierta = await buscarConversacionAbierta(agenteId, telefonoCliente);
  if (abierta) {
    await prisma.$transaction([
      prisma.mensaje.create({
        data: { conversacionId: abierta.id, rol: 'CLIENTE', contenido },
      }),
      prisma.conversacion.update({
        where: { id: abierta.id },
        data: { ultimoMensajeAt: new Date() },
      }),
    ]);
    return { ok: true, cobrada: false, conversacionId: abierta.id, origen: abierta.origen };
  }

  // 2) Conversacion nueva: hay que cobrarla
  const cobro = await consumirConversacion(
    suscripcion.id,
    `Conversacion con ${telefonoCliente}`
  );
  if (!cobro.ok) {
    return { ok: false, motivo: cobro.motivo, cobrada: false };
  }

  const conversacion = await prisma.conversacion.create({
    data: {
      agenteId,
      telefonoCliente,
      origen: cobro.origen,
      ultimoMensajeAt: new Date(),
      mensajes: { create: { rol: 'CLIENTE', contenido } },
    },
  });

  return { ok: true, cobrada: true, conversacionId: conversacion.id, origen: cobro.origen };
}

/**
 * Guarda la respuesta del agente dentro de la conversacion (no cobra).
 */
async function registrarRespuestaAgente(conversacionId, contenido) {
  await prisma.$transaction([
    prisma.mensaje.create({ data: { conversacionId, rol: 'AGENTE', contenido } }),
    prisma.conversacion.update({
      where: { id: conversacionId },
      data: { ultimoMensajeAt: new Date() },
    }),
  ]);
}

/**
 * Historial de una conversacion, para dar contexto a la IA.
 */
async function obtenerHistorial(conversacionId, limite = 20) {
  const mensajes = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { createdAt: 'desc' },
    take: limite,
  });
  return mensajes.reverse().map((m) => ({ rol: m.rol, contenido: m.contenido }));
}

/**
 * Flujo completo: recibe un mensaje del cliente, lo cobra si corresponde,
 * genera la respuesta del agente con IA y la registra. Devuelve la respuesta.
 */
async function atenderMensaje({ agenteId, telefonoCliente, contenido }) {
  const entrada = await procesarMensajeEntrante({ agenteId, telefonoCliente, contenido });
  if (!entrada.ok) return { ...entrada, respuesta: null };

  const { generarRespuesta } = require('./agente');
  const historial = await obtenerHistorial(entrada.conversacionId);
  const salida = await generarRespuesta(agenteId, historial, contenido);

  if (salida.ok && salida.respuesta) {
    await registrarRespuestaAgente(entrada.conversacionId, salida.respuesta);
  }

  return {
    ...entrada,
    respuesta: salida.respuesta,
    demo: salida.demo,
    modelo: salida.modelo,
  };
}

module.exports = {
  VENTANA_HORAS,
  buscarConversacionAbierta,
  procesarMensajeEntrante,
  registrarRespuestaAgente,
  obtenerHistorial,
  atenderMensaje,
};
