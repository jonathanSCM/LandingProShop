// Cliente de la WhatsApp Business Cloud API (Meta).
// Se usa para enviar mensajes desde el número conectado de cada cliente.
const { prisma } = require('../db');
const { descifrar } = require('../crypto');

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

/**
 * Envía un mensaje de texto por WhatsApp usando las credenciales de una conexión.
 * @param {object} conexion  fila de ConexionWhatsApp (con phoneNumberId y tokenCifrado)
 * @param {string} para      número destino en formato internacional (solo dígitos)
 * @param {string} texto
 * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
 */
async function enviarTexto(conexion, para, texto) {
  if (!conexion || !conexion.phoneNumberId || !conexion.tokenCifrado) {
    return { ok: false, error: 'La conexión no tiene credenciales configuradas.' };
  }
  const token = descifrar(conexion.tokenCifrado);
  if (!token) return { ok: false, error: 'No se pudo leer el token de acceso.' };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${conexion.phoneNumberId}/messages`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(para).replace(/\D/g, ''),
        type: 'text',
        text: { body: texto },
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || `Error HTTP ${resp.status}`;
      return { ok: false, error: msg };
    }
    const id = data.messages && data.messages[0] && data.messages[0].id;
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Verifica la conexión consultando los datos del número en la Graph API.
 * @returns {Promise<{ok:boolean, numero?:string, error?:string}>}
 */
async function verificarConexion(conexion) {
  if (!conexion || !conexion.phoneNumberId || !conexion.tokenCifrado) {
    return { ok: false, error: 'La conexión no tiene credenciales configuradas.' };
  }
  const token = descifrar(conexion.tokenCifrado);
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${conexion.phoneNumberId}?fields=display_phone_number,verified_name`;
  try {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = (data && data.error && data.error.message) || `Error HTTP ${resp.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, numero: data.display_phone_number, nombre: data.verified_name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { enviarTexto, verificarConexion };
