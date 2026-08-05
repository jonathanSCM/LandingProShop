/**
 * Contenido editable de la landing.
 *
 * La landing trae sus textos por defecto escritos en la vista. Aca solo se
 * guardan los CAMBIOS que el usuario hace desde el modo edicion
 * (/?editar=1). Si un texto nunca se toco, no ocupa lugar aca.
 *
 * Formato de data/landing.json:
 * {
 *   "textos":  { "hero.titulo": "...", "sec1.titulo": "..." },
 *   "ocultos": ["grafi"],                       // ids de proyectos escondidos
 *   "proyectos": { "protaxi": { "nombre": "...", "resumen": "..." } }
 * }
 */
const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'data', 'landing.json');

const VACIO = { textos: {}, ocultos: [], proyectos: {} };

// Campos de un proyecto que se pueden editar desde la web.
const CAMPOS_PROYECTO = ['nombre', 'tipo', 'lugar', 'resumen', 'boceto'];

const LIMITE_TEXTO = 4000;

/**
 * Limpia el HTML que llega del navegador. El modo edicion esta detras del login
 * de admin, pero igual no guardamos nada que pueda ejecutar codigo: si manana
 * se filtra el acceso, el dano queda acotado.
 */
function limpiar(valor) {
  if (typeof valor !== 'string') return '';
  return valor
    .slice(0, LIMITE_TEXTO)
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|style)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim();
}

function leer() {
  try {
    const crudo = fs.readFileSync(ARCHIVO, 'utf8');
    const datos = JSON.parse(crudo);
    return {
      textos: datos && typeof datos.textos === 'object' && datos.textos ? datos.textos : {},
      ocultos: Array.isArray(datos && datos.ocultos) ? datos.ocultos : [],
      proyectos: datos && typeof datos.proyectos === 'object' && datos.proyectos ? datos.proyectos : {},
    };
  } catch (err) {
    // No existe todavia (primer arranque) o quedo corrupto: se usan los defaults.
    if (err.code !== 'ENOENT') {
      console.error('landing.json ilegible, se usan los textos por defecto:', err.message);
    }
    return { ...VACIO, textos: {}, ocultos: [], proyectos: {} };
  }
}

function guardar(entrada) {
  const limpio = { textos: {}, ocultos: [], proyectos: {} };

  if (entrada && typeof entrada.textos === 'object' && entrada.textos) {
    for (const [clave, valor] of Object.entries(entrada.textos)) {
      if (!/^[\w.-]{1,60}$/.test(clave)) continue; // clave con formato raro: se ignora
      const v = limpiar(valor);
      if (v) limpio.textos[clave] = v;
    }
  }

  if (Array.isArray(entrada && entrada.ocultos)) {
    limpio.ocultos = entrada.ocultos
      .filter((id) => typeof id === 'string' && /^[\w-]{1,40}$/.test(id))
      .slice(0, 50);
  }

  if (entrada && typeof entrada.proyectos === 'object' && entrada.proyectos) {
    for (const [id, campos] of Object.entries(entrada.proyectos)) {
      if (!/^[\w-]{1,40}$/.test(id) || !campos || typeof campos !== 'object') continue;
      const destino = {};
      for (const campo of CAMPOS_PROYECTO) {
        const v = limpiar(campos[campo]);
        if (v) destino[campo] = v;
      }
      if (Object.keys(destino).length) limpio.proyectos[id] = destino;
    }
  }

  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(limpio, null, 2), 'utf8');
  return limpio;
}

/** Devuelve la lista de proyectos con los cambios aplicados. */
function aplicarAProyectos(proyectos, contenido, incluirOcultos) {
  return proyectos
    .filter((p) => incluirOcultos || !contenido.ocultos.includes(p.id))
    .map((p) => ({
      ...p,
      ...(contenido.proyectos[p.id] || {}),
      oculto: contenido.ocultos.includes(p.id),
    }));
}

module.exports = { leer, guardar, aplicarAProyectos, ARCHIVO, CAMPOS_PROYECTO };
