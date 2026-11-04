/**
 * Piezas de la landing que comparten la pagina completa y el repintado en vivo de los
 * proyectos dentro del editor.
 */
const Bloques = require('../public/js/bloques.js');
const LandingCfg = require('../public/js/landing-cfg.js');
const proyectosBase = require('./proyectos');
const contenido = require('./contenido');

/** Lista efectiva de proyectos: la guardada en config o, si nunca se edito, la de fabrica con sus retoques. */
function listaProyectos(cont) {
  const guardada = cont.config.proyectos && cont.config.proyectos.lista;
  if (guardada) {
    // Proyectos guardados antes de existir el contexto comercial: se completan con el texto de fabrica
    return guardada.map((p) => {
      const base = proyectosBase.find((b) => b.id === p.id);
      if (!base || p.problema || p.solucion || p.uso || p.resultado) return p;
      return { ...p, origen: base.origen || p.origen, problema: base.problema || '', solucion: base.solucion || '', uso: base.uso || '' };
    });
  }
  return contenido.aplicarAProyectos(proyectosBase, cont, true).map((p) => LandingCfg.limpiarProyecto(p));
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
