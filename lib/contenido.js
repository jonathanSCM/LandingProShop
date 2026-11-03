/**
 * Contenido editable de la landing.
 *
 * La landing trae sus textos por defecto escritos en la vista. Aca solo se
 * guardan los CAMBIOS que el usuario hace desde el modo edicion
 * (/?editar=1). Si un texto nunca se toco, no ocupa lugar aca.
 *
 * Donde vive:
 *   Tabla contenido_landing, una sola fila (id = 1). Antes esto era el archivo
 *   data/landing.json, pero ese archivo estaba DENTRO del contenedor: cada
 *   despliegue levantaba uno nuevo y se perdia todo lo editado. En la base de
 *   datos sobrevive a los despliegues y entra en los respaldos.
 *
 * Forma de los datos:
 * {
 *   "textos":  { "hero.titulo": "...", "sec1.titulo": "..." },
 *   "ocultos": ["grafi"],                       // ids de proyectos escondidos
 *   "proyectos": { "protaxi": { "nombre": "...", "resumen": "..." } }
 * }
 */
const { prisma } = require('./db');

// Es un singleton: siempre la misma fila.
const FILA = 1;

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

/** Deja la fila cruda con la forma que espera la vista, venga como venga. */
function normalizar(fila) {
  const esObjeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
  return {
    textos: fila && esObjeto(fila.textos) ? fila.textos : {},
    ocultos: fila && Array.isArray(fila.ocultos) ? fila.ocultos : [],
    proyectos: fila && esObjeto(fila.proyectos) ? fila.proyectos : {},
  };
}

async function leer() {
  try {
    const fila = await prisma.contenidoLanding.findUnique({ where: { id: FILA } });
    return normalizar(fila);
  } catch (err) {
    // Que la landing se vea SIEMPRE: si la base no responde, se cae a los
    // textos por defecto de la vista en lugar de romper la pagina.
    console.error('No se pudo leer el contenido de la landing:', err.message);
    return normalizar(null);
  }
}

async function guardar(entrada) {
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

  // A diferencia de leer(), aca NO se silencia el error: si no se pudo guardar,
  // quien edita tiene que enterarse en vez de creer que su trabajo esta a salvo.
  await prisma.contenidoLanding.upsert({
    where: { id: FILA },
    create: { id: FILA, ...limpio },
    update: limpio,
  });

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

module.exports = { leer, guardar, aplicarAProyectos, CAMPOS_PROYECTO };
