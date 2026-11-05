/**
 * Piezas de la landing que comparten la pagina completa y el repintado en vivo de los
 * proyectos dentro del editor.
 */
const Bloques = require('../public/js/bloques.js');
const LandingCfg = require('../public/js/landing-cfg.js');
const proyectosBase = require('./proyectos');
const contenido = require('./contenido');

/* limpiarProyecto conserva solo los campos que el editor sabe manejar, y
   "vistas" no es uno de ellos: existe unicamente en lib/proyectos.js. Si no se
   vuelve a colgar despues de sanear, el carrusel desaparece. */
function sanear(p) {
  const limpio = LandingCfg.limpiarProyecto(p);
  if (p.vistas) limpio.vistas = p.vistas;
  return limpio;
}

/** Lista efectiva de proyectos: la guardada en config o, si nunca se edito, la de fabrica con sus retoques. */
function listaProyectos(cont) {
  const guardada = cont.config.proyectos && cont.config.proyectos.lista;
  if (guardada) {
    // Proyectos guardados antes de existir el contexto comercial: se completan con el texto de fabrica
    const completados = guardada.map((p) => {
      const base = proyectosBase.find((b) => b.id === p.id);
      if (!base) return p;

      // El contexto comercial solo se completa si el guardado no lo trae.
      const conContexto = (p.problema || p.solucion || p.uso || p.resultado)
        ? p
        : { ...p, origen: base.origen || p.origen, problema: base.problema || '', solucion: base.solucion || '', uso: base.uso || '' };

      const delCodigo = {};
      // Las vistas en carrusel solo existen en lib/proyectos.js: el editor no
      // sabe crearlas, asi que siempre mandan las del archivo.
      if (base.vistas) delCodigo.vistas = base.vistas;
      // Si el guardado apunta a la misma captura que el codigo, las medidas
      // tambien salen del codigo: el archivo se pudo reemplazar por otro de
      // distinto tamano y las de la copia guardada quedarian viejas.
      if (p.imagen && p.imagen === base.imagen) { delCodigo.ancho = base.ancho; delCodigo.alto = base.alto; }

      return Object.keys(delCodigo).length ? { ...conContexto, ...delCodigo } : conContexto;
    });
    // Un proyecto nuevo en lib/proyectos.js no esta en la lista guardada, y
    // hasta aca desaparecia: la primera vez que alguien guardaba desde el
    // editor, el portafolio quedaba congelado y agregarlo por codigo no servia
    // de nada. Se suman al final, conservando lo que ya estaba editado.
    const yaEstan = new Set(completados.map((p) => p.id));
    const faltantes = proyectosBase.filter((b) => !yaEstan.has(b.id));
    if (!faltantes.length) return completados;
    return completados.concat(
      contenido.aplicarAProyectos(faltantes, cont, true).map(sanear)
    );
  }
  return contenido.aplicarAProyectos(proyectosBase, cont, true).map(sanear);
}

/** t() y enlace() que usan las vistas. `textos` y `enlaces` pueden venir del editor (cambios sin guardar). */
function helpers(textos, enlaces) {
  return {
    t: (clave, porDefecto) => {
      const v = textos[clave];
      return typeof v === 'string' && v.trim() !== '' ? v : porDefecto;
    },
    // enlace('hero.cta1', '#contacto', abrirEnPestanaNueva): atributos del <a> segun lo editado.
    enlace: (clave, porDefecto, nuevaPorDefecto) => {
      const e = enlaces[clave];
      const url = Bloques.url(e ? e.url : porDefecto) || '#';
      const nueva = e ? e.nueva : !!nuevaPorDefecto;
      return ` href="${Bloques.esc(url)}"${nueva ? ' target="_blank" rel="noopener"' : ''} data-link="${Bloques.esc(clave)}"`;
    },
  };
}

module.exports = { listaProyectos, helpers };
