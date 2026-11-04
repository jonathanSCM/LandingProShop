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
    { k: 'fondoTipo', t: 'enum', def: 'auto', label: 'Fondo', op: [['auto', 'Original'], ['color', 'Color'], ['degradado', 'Degradado'], ['aurora', 'Aurora'], ['puntos', 'Puntos'], ['imagen', 'Imagen']] },
    { k: 'fondo', t: 'color', def: '', label: 'Color de fondo', si: ['fondoTipo', ['color', 'degradado', 'aurora', 'puntos']] },
    { k: 'fondo2', t: 'color', def: '', label: 'Segundo color', si: ['fondoTipo', ['degradado', 'aurora']] },
    { k: 'fondoImagen', t: 'imagen', def: '', label: 'Imagen de fondo', si: ['fondoTipo', ['imagen']] },
    { k: 'oscurecer', t: 'num', def: 40, min: 0, max: 80, step: 5, label: 'Oscurecer la imagen (%)', si: ['fondoTipo', ['imagen']] },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto (auto si está vacío)' },
    { k: 'espacio', t: 'enum', def: 'auto', label: 'Espacio arriba y abajo', op: [['auto', 'Original'], ['s', 'Poco'], ['m', 'Medio'], ['l', 'Mucho'], ['xl', 'Enorme']] },
    { k: 'escala', t: 'num', def: 100, min: 60, max: 130, step: 5, label: 'Tamaño del contenido (%)' },
    { k: 'ancho', t: 'enum', def: 'auto', label: 'Ancho del contenido', op: [['angosto', 'Angosto'], ['auto', 'Original'], ['ancho', 'Ancho'], ['completo', 'Completo']] },
    { k: 'alto', t: 'enum', def: 'auto', label: 'Altura mínima', op: [['auto', 'Auto'], ['60', 'Media'], ['80', 'Alta'], ['100', 'Pantalla']] },
    { k: 'anim', t: 'enum', def: '', label: 'Animación al aparecer', op: ANIMACIONES },
    { k: 'enMenu', t: 'bool', def: false, label: 'Mostrar en el menú' },
    { k: 'menu', t: 'texto', def: '', max: 30, label: 'Nombre en el menú', si: ['enMenu', [true]] },
    { k: 'ancla', t: 'texto', def: '', max: 40, label: 'Ancla (para enlazar con #nombre)', soloCustom: true },
  ];


  var FUENTES = {
    manrope: { nombre: 'Manrope (original)', css: "'Manrope',system-ui,sans-serif", url: '' },
    sora: { nombre: 'Sora', css: "'Sora','Manrope',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap' },
    'inter-tight': { nombre: 'Inter Tight', css: "'Inter Tight','Inter',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&display=swap' },
    poppins: { nombre: 'Poppins', css: "'Poppins','Manrope',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap' },
    playfair: { nombre: 'Playfair Display', css: "'Playfair Display',Georgia,serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;800&display=swap' },
    grotesk: { nombre: 'Space Grotesk', css: "'Space Grotesk','Manrope',system-ui,sans-serif", url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap' },
    mono: { nombre: 'IBM Plex Mono', css: "'IBM Plex Mono',ui-monospace,monospace", url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap' },
  };


  var CAMPOS_DISENO = [
    { k: 'acento', t: 'color', def: '', label: 'Color principal (botones y detalles)' },
    { k: 'fondo', t: 'color', def: '', label: 'Fondo de la página' },
    { k: 'franja', t: 'color', def: '', label: 'Fondo de las franjas alternas' },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto' },
    { k: 'fuente', t: 'enum', def: 'manrope', label: 'Tipografía de los títulos', op: Object.keys(FUENTES).map(function (k) { return [k, FUENTES[k].nombre]; }) },
    { k: 'bordes', t: 'enum', def: 'original', label: 'Forma de botones y tarjetas', op: [['original', 'Original'], ['rectos', 'Rectos'], ['suaves', 'Suaves'], ['redondos', 'Redondos']] },
    { k: 'modo', t: 'enum', def: 'auto', label: 'Modo claro / oscuro', op: [['auto', 'Automático'], ['claro', 'Siempre claro'], ['oscuro', 'Siempre oscuro']] },
    { k: 'botonTema', t: 'bool', def: true, label: 'Mostrar el botón para cambiar de modo', si: ['modo', ['auto']] },
    { k: 'animaciones', t: 'enum', def: 'normal', label: 'Animaciones de la página', op: [['normal', 'Activadas'], ['ninguna', 'Sin animaciones']] },
  ];

  var CAMPOS_CABECERA = [
    { k: 'visible', t: 'bool', def: true, label: 'Mostrar la cabecera' },
    { k: 'logoTipo', t: 'enum', def: 'imagen', label: 'Logo', op: [['imagen', 'Imagen'], ['texto', 'Texto']] },
    { k: 'logoSrc', t: 'imagen', def: '', label: 'Imagen del logo (vacío = el original)', si: ['logoTipo', ['imagen']] },
    { k: 'logoTexto', t: 'texto', def: 'ProShop', max: 40, label: 'Texto del logo', si: ['logoTipo', ['texto']] },
    { k: 'logoAlto', t: 'num', def: 24, min: 14, max: 90, step: 2, label: 'Tamaño del logo (px)' },
    { k: 'alto', t: 'num', def: 68, min: 48, max: 130, step: 2, label: 'Alto de la barra (px)' },
    { k: 'fondo', t: 'color', def: '', label: 'Color de fondo' },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto' },
    { k: 'pegajosa', t: 'bool', def: true, label: 'Se queda fija al bajar' },
    { k: 'boton', t: 'bool', def: true, label: 'Mostrar el botón de la derecha' },
    { k: 'enlaces', t: 'items', def: [], max: 6, sub: [{ k: 'texto', t: 'texto', def: 'Enlace', max: 40, label: 'Texto' }, { k: 'url', t: 'url', def: '#', max: 500, label: 'Enlace' }], label: 'Enlaces extra del menú' },
  ];

  var CAMPOS_PIE = [
    { k: 'visible', t: 'bool', def: true, label: 'Mostrar el pie de página' },
    { k: 'fondo', t: 'color', def: '', label: 'Color de fondo' },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto' },
    { k: 'solTitulo', t: 'texto', def: 'Soluciones', max: 30, label: 'Título de la columna de enlaces' },
    { k: 'solEnlaces', t: 'items', def: [
      { texto: 'Agentes de IA', url: 'https://agentes.proshop.lat' },
      { texto: 'CRM ProShop', url: 'https://crm.proshop.lat' },
      { texto: 'AgendaBot', url: 'https://agendabot.proshop.lat' },
    ], max: 8, sub: [{ k: 'texto', t: 'texto', def: 'Enlace', max: 40, label: 'Texto' }, { k: 'url', t: 'url', def: 'https://', max: 500, label: 'Enlace' }], label: 'Enlaces de esa columna' },
  ];

  var CAMPOS_PROYECTO = [
    { k: 'nombre', t: 'texto', def: 'Nuevo proyecto', max: 120, label: 'Nombre' },
    { k: 'tipo', t: 'texto', def: 'Qué es, en una línea', max: 160, label: 'Qué es (una línea)' },
    { k: 'lugar', t: 'texto', def: '', max: 120, label: 'Lugar o cliente (opcional)' },
    { k: 'estado', t: 'enum', def: 'produccion', label: 'Estado', op: [['produccion', 'En producción'], ['desarrollo', 'En desarrollo']] },
    { k: 'resumen', t: 'area', def: 'Cuenta en dos o tres frases qué hace este proyecto y qué problema resuelve, con palabras de cliente.', max: 1200, label: 'Resumen' },
    { k: 'imagen', t: 'imagen', def: '', label: 'Captura o foto del proyecto' },
    { k: 'boceto', t: 'texto', def: '', max: 300, label: 'Pie de la imagen (opcional)' },
    { k: 'features', t: 'lista', def: ['Primera característica', 'Segunda característica'], max: 12, label: 'Qué hace' },
    { k: 'enlaces', t: 'items', def: [], max: 6, sub: [{ k: 'texto', t: 'texto', def: 'Ver sitio', max: 60, label: 'Texto' }, { k: 'href', t: 'url', def: 'https://', max: 500, label: 'Enlace' }, { k: 'externo', t: 'bool', def: true, label: 'Abrir en pestaña nueva' }], label: 'Botones del proyecto' },
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
      else if (c.t === 'imagen') r[c.k] = B.src(v);
      else if (c.t === 'num') {
        var n = Number(v);
        r[c.k] = Math.min(c.max, Math.max(c.min, Math.round(isFinite(n) ? n : c.def)));
      } else if (c.t === 'lista') {
        r[c.k] = (Array.isArray(v) ? v : c.def).slice(0, c.max || 12).map(function (x) { return String(x == null ? '' : x).slice(0, 200); });
      } else if (c.t === 'items') {
        r[c.k] = (Array.isArray(v) ? v : c.def).slice(0, c.max || 6).map(function (it) { return limpiarCampos(c.sub, esObj(it) ? it : {}); });
      } else r[c.k] = String(v == null ? c.def : v).slice(0, c.max || (c.t === 'area' ? 1200 : 60));
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

  function idProyecto(v) {
    if (typeof v === 'string' && /^[\w-]{1,40}$/.test(v)) return v;
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = 'p_';
    for (var i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  function limpiarProyecto(p) {
    p = esObj(p) ? p : {};
    var r = limpiarCampos(CAMPOS_PROYECTO, p);
    r.id = idProyecto(p.id);
    r.oculto = p.oculto === true;
    r.ancho = Math.min(6000, Math.max(0, Math.round(Number(p.ancho) || 0)));
    r.alto = Math.min(6000, Math.max(0, Math.round(Number(p.alto) || 0)));
    // enlaces: solo con direccion valida
    r.enlaces = r.enlaces.map(function (e) { return { texto: e.texto, href: B.url(e.href), externo: e.externo }; }).filter(function (e) { return e.href && e.texto; });
    r.features = r.features.filter(function (f) { return f.trim(); });
    r.puntos = (Array.isArray(p.puntos) ? p.puntos : []).slice(0, 8).map(function (x) {
      x = esObj(x) ? x : {};
      return { x: Math.min(100, Math.max(0, Number(x.x) || 0)), y: Math.min(100, Math.max(0, Number(x.y) || 0)), texto: String(x.texto || '').slice(0, 300) };
    }).filter(function (x) { return x.texto; });
    r.metricas = (Array.isArray(p.metricas) ? p.metricas : []).slice(0, 3).map(function (m) {
      m = esObj(m) ? m : {};
      return { valor: String(m.valor || '').slice(0, 20), etiqueta: String(m.etiqueta || '').slice(0, 60) };
    }).filter(function (m) { return m.valor; });
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
    var lista = null;
    if (esObj(c.proyectos) && Array.isArray(c.proyectos.lista)) {
      var vistos = {};
      lista = c.proyectos.lista.slice(0, 40).map(limpiarProyecto).filter(function (p) {
        if (vistos[p.id]) return false;
        vistos[p.id] = true;
        return true;
      });
    }
    return {
      orden: orden, secciones: secciones, enlaces: enlaces, custom: mapaCustom,
      diseno: limpiarCampos(CAMPOS_DISENO, esObj(c.diseno) ? c.diseno : {}),
      cabecera: limpiarCampos(CAMPOS_CABECERA, esObj(c.cabecera) ? c.cabecera : {}),
      pie: limpiarCampos(CAMPOS_PIE, esObj(c.pie) ? c.pie : {}),
      proyectos: { lista: lista },
    };
  }

  var ANCHOS = { angosto: '940px', ancho: '1480px', completo: '2600px' };

  /** Clases, estilos inline y animacion que lleva el contenedor de cada seccion. */
  function estiloSeccion(sec) {
    var st = [], clases = [], auto = '';
    var tipo = sec.fondoTipo;
    if (tipo === 'color' && sec.fondo) { st.push('background:' + sec.fondo); auto = B.textoSobre(sec.fondo); }
    else if (tipo === 'degradado' && sec.fondo) {
      st.push('background:linear-gradient(135deg,' + sec.fondo + ',' + (sec.fondo2 || sec.fondo) + ')'); auto = B.textoSobre(sec.fondo);
    } else if (tipo === 'aurora') {
      var base = sec.fondo || '#0b1020';
      st.push('background-color:' + base,
        'background-image:radial-gradient(60% 80% at 12% 15%,color-mix(in srgb,var(--accent) 62%,transparent),transparent 70%),' +
        'radial-gradient(55% 75% at 88% 25%,color-mix(in srgb,' + (sec.fondo2 || '#06b6d4') + ' 50%,transparent),transparent 70%),' +
        'radial-gradient(60% 60% at 55% 105%,color-mix(in srgb,#f472b6 38%,transparent),transparent 70%)');
      auto = B.textoSobre(base);
    } else if (tipo === 'puntos') {
      if (sec.fondo) { st.push('background-color:' + sec.fondo); auto = B.textoSobre(sec.fondo); }
      st.push('background-image:radial-gradient(color-mix(in srgb,currentColor 22%,transparent) 1.3px,transparent 1.4px)', 'background-size:22px 22px');
    } else if (tipo === 'imagen' && sec.fondoImagen) {
      var o = (sec.oscurecer || 0) / 100;
      st.push('background:linear-gradient(rgba(0,0,0,' + o + '),rgba(0,0,0,' + o + ')),url(' + sec.fondoImagen + ') center/cover');
      if (sec.oscurecer >= 30) auto = '#ffffff';
    }
    if (st.length) clases.push('con-fondo');
    var texto = sec.texto || auto;
    if (texto) {
      st.push('color:' + texto, '--ink:' + texto, '--ov-ink:' + texto,
        '--ink-2:color-mix(in srgb,' + texto + ' 72%,transparent)', '--ink-3:color-mix(in srgb,' + texto + ' 52%,transparent)',
        '--ov-ink-2:color-mix(in srgb,' + texto + ' 72%,transparent)', '--ov-ink-3:color-mix(in srgb,' + texto + ' 52%,transparent)');
    }
    if (ESPACIOS[sec.espacio]) st.push('--sec-y:' + ESPACIOS[sec.espacio]);
    if (sec.escala && sec.escala !== 100) st.push('zoom:' + (sec.escala / 100));
    if (ANCHOS[sec.ancho]) st.push('--shell:' + ANCHOS[sec.ancho]);
    if (sec.alto && sec.alto !== 'auto') { st.push('min-height:' + sec.alto + 'vh'); clases.push('con-alto'); }
    return { clase: clases.join(' '), style: st.join(';'), anim: sec.anim || '' };
  }

  /** Estilo y clases de la cabecera segun su configuracion. */
  function estiloCabecera(c) {
    var st = ['--nav-h:' + c.alto + 'px', '--logo-h:' + c.logoAlto + 'px'], clases = [];
    if (c.fondo) st.push('background:' + c.fondo, 'backdrop-filter:none');
    var t = c.texto || (c.fondo ? B.textoSobre(c.fondo) : '');
    if (t) st.push('color:' + t, '--ink:' + t, '--ink-2:color-mix(in srgb,' + t + ' 75%,transparent)', '--rule:color-mix(in srgb,' + t + ' 18%,transparent)');
    if (!c.pegajosa) clases.push('nav-libre');
    if (!c.boton) clases.push('nav-sin-boton');
    return { clase: clases.join(' '), style: st.join(';') };
  }

  function estiloPie(c) {
    var st = [], t = c.texto || (c.fondo ? B.textoSobre(c.fondo) : '');
    if (c.fondo) st.push('background:' + c.fondo);
    if (t) st.push('color:' + t, '--ink:' + t, '--ink-2:color-mix(in srgb,' + t + ' 72%,transparent)', '--ink-3:color-mix(in srgb,' + t + ' 52%,transparent)', '--rule:color-mix(in srgb,' + t + ' 18%,transparent)');
    return { style: st.join(';') };
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
    if (f && d.fuente !== 'manrope') v.push('--disp:' + f.css);
    return v.length ? ':root{' + v.join(';') + '}' : '';
  }

  function itemsMenu(cfg) {
    var items = [];
    var extras = (cfg.cabecera && cfg.cabecera.enlaces) || [];
    cfg.orden.forEach(function (id) {
      var s = cfg.secciones[id];
      if (!s || s.oculto || !s.enMenu) return;
      var n = nativa(id);
      items.push({ id: id, ancla: n ? n.ancla : (s.ancla || id), texto: s.menu || (n ? n.nombre : 'Sección') });
    });
    extras.forEach(function (e) {
      var href = B.url(e.url);
      if (href && e.texto) items.push({ id: '', href: href, ancla: '', texto: e.texto });
    });
    return items;
  }

  return {
    NATIVAS: NATIVAS, CAMPOS_SECCION: CAMPOS_SECCION, CAMPOS_DISENO: CAMPOS_DISENO, FUENTES: FUENTES, VARS_BLOQUES: VARS_BLOQUES,
    limpiarConfig: limpiarConfig, limpiarSeccion: limpiarSeccion, limpiarProyecto: limpiarProyecto, estiloSeccion: estiloSeccion, estiloCabecera: estiloCabecera, estiloPie: estiloPie,
    CAMPOS_CABECERA: CAMPOS_CABECERA, CAMPOS_PIE: CAMPOS_PIE, CAMPOS_PROYECTO: CAMPOS_PROYECTO, cssDiseno: cssDiseno, itemsMenu: itemsMenu,
    nativa: nativa, esCustom: esCustom,
  };
});
