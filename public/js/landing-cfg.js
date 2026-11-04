/**
 * Configuracion editable de la landing (orden de secciones, estilos, enlaces, diseno).
 *
 * Igual que bloques.js, lo usan el servidor (para limpiar lo que se guarda y para
 * pintar la pagina) y el navegador (modo edicion), asi ambos calculan lo mismo.
 *
 * Forma:
 * {
 *   orden:     ['hero','servicios','c_ab12cd', ...],     // ids de seccion, en orden
 *   secciones: { id: { oculto, enMenu, menu, ancla, fondoTipo, fondo, fondo2, texto, espacio, anim } },
 *   enlaces:   { 'hero.cta1': { url, nueva } },
 *   diseno:    { acento, fondo, franja, texto, fuente, animaciones },
 *   custom:    { c_ab12cd: <documento de Bloques> }        // secciones agregadas por el usuario
 * }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bloques.js'));
  else root.LandingCfg = factory(root.Bloques);
})(typeof self !== 'undefined' ? self : this, function (B) {
  'use strict';

  // Secciones que trae la landing de fabrica. "ancla" es el id HTML al que enlaza el menu.
  var NATIVAS = [
    { id: 'hero', nombre: 'Portada', ancla: 'inicio', menu: '' },
    { id: 'servicios', nombre: 'Qué hacemos', ancla: 'servicios', menu: 'Qué hacemos' },
    { id: 'proyectos', nombre: 'Proyectos', ancla: 'proyectos', menu: 'Proyectos' },
    { id: 'proceso', nombre: 'Cómo trabajamos', ancla: 'proceso', menu: 'Cómo trabajamos' },
    { id: 'contacto', nombre: 'Contacto', ancla: 'contacto', menu: 'Contacto' },
  ];

  var ANIMACIONES = [['', 'Original'], ['aparecer', 'Aparecer'], ['subir', 'Subir'], ['zoom', 'Zoom'], ['izq', 'Desde la izquierda'], ['der', 'Desde la derecha']];

  var CAMPOS_SECCION = [
    { k: 'fondoTipo', t: 'enum', def: 'auto', label: 'Fondo', op: [['auto', 'Original'], ['color', 'Color'], ['degradado', 'Degradado']] },
    { k: 'fondo', t: 'color', def: '', label: 'Color de fondo', si: ['fondoTipo', ['color', 'degradado']] },
    { k: 'fondo2', t: 'color', def: '', label: 'Segundo color', si: ['fondoTipo', ['degradado']] },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto' },
    { k: 'espacio', t: 'enum', def: 'auto', label: 'Espacio arriba y abajo', op: [['auto', 'Original'], ['s', 'Poco'], ['m', 'Medio'], ['l', 'Mucho'], ['xl', 'Enorme']] },
    { k: 'anim', t: 'enum', def: '', label: 'Animación al aparecer', op: ANIMACIONES },
    { k: 'enMenu', t: 'bool', def: false, label: 'Mostrar en el menú' },
    { k: 'menu', t: 'texto', def: '', max: 30, label: 'Nombre en el menú', si: ['enMenu', [true]] },
    { k: 'ancla', t: 'texto', def: '', max: 40, label: 'Ancla (para enlazar con #nombre)', soloCustom: true },
  ];

  var FUENTES = {
    'inter-tight': { nombre: 'Inter Tight (original)', css: "'Inter Tight','Inter',system-ui,sans-serif", url: '' },
    poppins: { nombre: 'Poppins', css: "'Poppins','Inter',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap' },
    playfair: { nombre: 'Playfair Display', css: "'Playfair Display',Georgia,serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap' },
    grotesk: { nombre: 'Space Grotesk', css: "'Space Grotesk','Inter',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap' },
    mono: { nombre: 'IBM Plex Mono', css: "'IBM Plex Mono',ui-monospace,monospace", url: '' },
  };

  var CAMPOS_DISENO = [
    { k: 'acento', t: 'color', def: '', label: 'Color principal (botones y detalles)' },
    { k: 'fondo', t: 'color', def: '', label: 'Fondo de la página' },
    { k: 'franja', t: 'color', def: '', label: 'Fondo de las franjas alternas' },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto' },
    { k: 'fuente', t: 'enum', def: 'inter-tight', label: 'Tipografía de los títulos', op: Object.keys(FUENTES).map(function (k) { return [k, FUENTES[k].nombre]; }) },
    { k: 'animaciones', t: 'enum', def: 'normal', label: 'Animaciones de la página', op: [['normal', 'Activadas'], ['ninguna', 'Sin animaciones']] },
  ];

  // Variables con las que las secciones agregadas (bloques) toman los colores de la landing.
  var VARS_BLOQUES = {
    '--pg-acento': 'var(--accent)', '--pg-acento-t': 'var(--on-accent)', '--pg-fondo': 'transparent',
    '--pg-texto': 'var(--ink)', '--pg-ff': 'var(--sans)',
  };

  var ESPACIOS = {
    s: 'clamp(32px, 4vw, 56px)', m: 'clamp(48px, 6vw, 88px)', l: 'clamp(72px, 9vw, 140px)', xl: 'clamp(110px, 14vw, 200px)',
  };

  function esObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function enOp(v, op, def) { for (var i = 0; i < op.length; i++) if (op[i][0] === v) return v; return def; }
  function nativa(id) { for (var i = 0; i < NATIVAS.length; i++) if (NATIVAS[i].id === id) return NATIVAS[i]; return null; }
  function esCustom(id) { return /^c_[a-z0-9]{3,14}$/.test(id); }

  function limpiarCampos(campos, o) {
    var r = {};
    campos.forEach(function (c) {
      var v = o ? o[c.k] : undefined;
      if (c.t === 'bool') r[c.k] = v == null ? !!c.def : v === true || v === 'true';
      else if (c.t === 'color') r[c.k] = v == null ? c.def : B.color(v);
      else if (c.t === 'enum') r[c.k] = enOp(String(v), c.op, c.def);
      else r[c.k] = String(v == null ? c.def : v).slice(0, c.max || 60);
    });
    return r;
  }

  function limpiarSeccion(id, o) {
    o = esObj(o) ? o : {};
    var r = limpiarCampos(CAMPOS_SECCION, o);
    var n = nativa(id);
    r.oculto = o.oculto === true;
    if (n) {
      if (o.enMenu == null) r.enMenu = !!n.menu;
      if (o.menu == null) r.menu = n.menu;
      r.ancla = n.ancla;
    } else {
      r.ancla = String(r.ancla).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    }
    return r;
  }

  function limpiarConfig(c) {
    c = esObj(c) ? c : {};
    var custom = {};
    if (esObj(c.custom)) {
      Object.keys(c.custom).filter(esCustom).slice(0, 40).forEach(function (id) { custom[id] = B.limpiarDoc(c.custom[id]); });
    }
    var orden = [];
    (Array.isArray(c.orden) ? c.orden : []).forEach(function (id) {
      if (typeof id !== 'string' || orden.indexOf(id) >= 0) return;
      if (nativa(id) || custom[id]) orden.push(id);
    });
    NATIVAS.forEach(function (n) { if (orden.indexOf(n.id) < 0) orden.push(n.id); });

    var secciones = {}, mapaCustom = {};
    orden.forEach(function (id) {
      secciones[id] = limpiarSeccion(id, esObj(c.secciones) ? c.secciones[id] : null);
      if (custom[id]) mapaCustom[id] = custom[id];
    });

    var enlaces = {};
    if (esObj(c.enlaces)) {
      Object.keys(c.enlaces).slice(0, 200).forEach(function (k) {
        if (!/^[\w.-]{1,80}$/.test(k) || !esObj(c.enlaces[k])) return;
        var u = B.url(c.enlaces[k].url);
        if (u) enlaces[k] = { url: String(c.enlaces[k].url).trim().slice(0, 500), nueva: c.enlaces[k].nueva === true };
      });
    }
    return { orden: orden, secciones: secciones, enlaces: enlaces, diseno: limpiarCampos(CAMPOS_DISENO, esObj(c.diseno) ? c.diseno : {}), custom: mapaCustom };
  }

  /** Clases, estilos inline y animacion que lleva el contenedor de cada seccion. */
  function estiloSeccion(sec) {
    var st = [], clases = [];
    if (sec.fondoTipo === 'color' && sec.fondo) { st.push('background:' + sec.fondo); clases.push('con-fondo'); }
    if (sec.fondoTipo === 'degradado' && sec.fondo) {
      st.push('background:linear-gradient(135deg,' + sec.fondo + ',' + (sec.fondo2 || sec.fondo) + ')'); clases.push('con-fondo');
    }
    if (sec.texto) {
      st.push('color:' + sec.texto, '--ink:' + sec.texto,
        '--ink-2:color-mix(in srgb,' + sec.texto + ' 72%,transparent)', '--ink-3:color-mix(in srgb,' + sec.texto + ' 52%,transparent)');
    }
    if (ESPACIOS[sec.espacio]) st.push('--sec-y:' + ESPACIOS[sec.espacio]);
    return { clase: clases.join(' '), style: st.join(';'), anim: sec.anim || '' };
  }

  /** Bloque <style> con los colores y la tipografia elegidos para toda la pagina. */
  function cssDiseno(d) {
    var v = [];
    if (d.acento) v.push('--accent:' + d.acento, '--accent-ink:color-mix(in srgb,' + d.acento + ' 72%,#000)', '--on-accent:' + B.textoSobre(d.acento));
    if (d.fondo) {
      v.push('--paper:' + d.fondo);
      if (!d.franja) v.push('--paper-2:color-mix(in srgb,' + d.fondo + ' 93%,#808080)');
    }
    if (d.franja) v.push('--paper-2:' + d.franja);
    if (d.texto) v.push('--ink:' + d.texto, '--ink-2:color-mix(in srgb,' + d.texto + ' 72%,transparent)', '--ink-3:color-mix(in srgb,' + d.texto + ' 52%,transparent)');
    var f = FUENTES[d.fuente];
    if (f && d.fuente !== 'inter-tight') v.push('--disp:' + f.css);
    return v.length ? ':root{' + v.join(';') + '}' : '';
  }

  function itemsMenu(cfg) {
    var items = [];
    cfg.orden.forEach(function (id) {
      var s = cfg.secciones[id];
      if (!s || s.oculto || !s.enMenu) return;
      var n = nativa(id);
      items.push({ id: id, ancla: n ? n.ancla : (s.ancla || id), texto: s.menu || (n ? n.nombre : 'Sección') });
    });
    return items;
  }

  return {
    NATIVAS: NATIVAS, CAMPOS_SECCION: CAMPOS_SECCION, CAMPOS_DISENO: CAMPOS_DISENO, FUENTES: FUENTES, VARS_BLOQUES: VARS_BLOQUES,
    limpiarConfig: limpiarConfig, limpiarSeccion: limpiarSeccion, estiloSeccion: estiloSeccion, cssDiseno: cssDiseno, itemsMenu: itemsMenu,
    nativa: nativa, esCustom: esCustom,
  };
});
