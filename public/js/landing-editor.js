/**
 * Editor de la landing (/?editar=1). Solo se carga con la sesion de admin abierta.
 *
 * Todo se hace SOBRE la landing real:
 *  - Textos: se escribe encima (data-edit="clave"; en proyectos data-campo).
 *  - Enlaces: al tocar un boton o enlace con data-link aparece su ventanita de URL.
 *  - Secciones: barra flotante (subir, bajar, ocultar, ajustes, arrastrar), lista
 *    "Secciones", y barras "+" entre secciones para añadir las prediseñadas.
 *  - Ajustes de cada seccion: fondo, color del texto, espacio, animacion, menu.
 *  - Diseno general: colores, tipografia y animaciones.
 *  - Secciones añadidas: se editan en una ventana con el editor completo de bloques
 *    (constructor.js dentro de un iframe) y se ven actualizadas al instante.
 *
 * Al guardar se manda lo que cambio; nada se publica hasta pulsar "Guardar".
 */
(function () {
  'use strict';

  var barra = document.getElementById('edBarra');
  if (!barra) return;

  var B = window.Bloques, C = window.LandingCfg;
  var datos = JSON.parse(document.getElementById('edDatos').textContent);
  var cfg = datos.config;
  var main = document.getElementById('landingMain');
  var estado = document.getElementById('edEstado');
  var btnGuardar = document.getElementById('edGuardar');
  var btnRestablecer = document.getElementById('edRestablecer');

  var sucio = false;
  var originales = new Map(); // elemento de texto -> HTML con el que cargo la pagina

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  function h(tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) pegar(e, arguments[i]);
    return e;
  }
  function pegar(e, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(function (x) { pegar(e, x); });
    else e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }

  function avisar(texto, tipo) {
    estado.textContent = texto || '';
    estado.className = 'ed-estado' + (tipo ? ' es-' + tipo : '');
  }
  function marcarSucio() {
    if (sucio) return;
    sucio = true;
    avisar('Cambios sin guardar', 'aviso');
  }

  // ------------------------------------------------------------------
  // Textos editables (igual que antes)
  // ------------------------------------------------------------------
  function preparar(el) {
    originales.set(el, el.innerHTML.trim());
    el.setAttribute('contenteditable', 'plaintext-only');
    el.classList.add('ed-campo');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');

    el.addEventListener('input', function () {
      marcarSucio();
      // Un mismo texto puede repetirse (ej. el CTA de cada proyecto): se sincronizan.
      var clave = el.dataset.edit;
      if (!clave) return;
      $$('[data-edit="' + clave + '"]').forEach(function (otro) { if (otro !== el) otro.innerHTML = el.innerHTML; });
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
      if (e.key === 'Escape') el.blur();
    });
  }
  $$('[data-edit]').forEach(preparar);
  $$('[data-proyecto] [data-campo]').forEach(preparar);

  // En el editor nada navega: ni enlaces ni el formulario.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && !barra.contains(a) && !e.target.closest('.ed-panel, .ed-modal')) e.preventDefault();
  });
  document.addEventListener('submit', function (e) { if (!e.target.closest('.ed-panel, .ed-modal')) e.preventDefault(); });

  // ---------- Quitar / restaurar proyectos ----------
  $$('.ed-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.proyecto;
      var panel = $('[data-proyecto="' + id + '"]');
      var tab = document.getElementById('tab-' + id);
      var oculto = panel.classList.toggle('esta-oculto');
      if (tab) tab.classList.toggle('esta-oculto', oculto);
      btn.textContent = oculto ? 'Restaurar' : 'Quitar de la web';
      marcarSucio();
    });
  });

  // ------------------------------------------------------------------
  // Ayudas de secciones
  // ------------------------------------------------------------------
  function wraps() { return $$('#landingMain > [data-seccion]'); }
  function wrapDe(id) { return $('#landingMain > [data-seccion="' + id + '"]'); }
  function esCustom(id) { return !!cfg.custom[id]; }

  function nombreSeccion(id) {
    var n = C.nativa(id);
    if (n) return n.nombre;
    var doc = cfg.custom[id];
    if (doc) {
      for (var i = 0; i < doc.secciones.length; i++) for (var c = 0; c < doc.secciones[i].cols.length; c++) {
        var col = doc.secciones[i].cols[c];
        for (var e = 0; e < col.length; e++) {
          var t = col[e].texto || col[e].titulo || col[e].valor;
          if (t && (col[e].tipo === 'titulo' || col[e].tipo === 'texto')) return String(t).replace(/\s+/g, ' ').slice(0, 28);
        }
      }
    }
    return 'Sección nueva';
  }

  function ordenActual() { return wraps().map(function (w) { return w.dataset.seccion; }); }

  function aplicarEstilo(id) {
    var w = wrapDe(id), sec = cfg.secciones[id];
    if (!w || !sec) return;
    var est = C.estiloSeccion(sec);
    w.style.cssText = est.style;
    w.classList.toggle('con-fondo', /con-fondo/.test(est.clase));
    w.classList.toggle('esta-oculta', !!sec.oculto);
    if (esCustom(id)) w.id = sec.ancla || '';
  }

  function reconstruirMenu() {
    var items = C.itemsMenu({ orden: ordenActual(), secciones: cfg.secciones });
    $$('[data-menu-box]').forEach(function (box) {
      box.innerHTML = '';
      items.forEach(function (m) { box.appendChild(h('a', { href: '#' + m.ancla, text: m.texto })); });
    });
  }

  function pintarCustom(id) {
    var w = wrapDe(id);
    if (w && cfg.custom[id]) w.innerHTML = B.render(cfg.custom[id], { vars: C.VARS_BLOQUES });
  }

  // Cualquier cambio de estructura pasa por aqui
  function cambioEstructura() {
    marcarSucio();
    reconstruirMenu();
    reconstruirBarras();
    pintarPanelSecciones();
    posicionarBarra();
  }

  // ------------------------------------------------------------------
  // Mover / ocultar / duplicar / eliminar secciones
  // ------------------------------------------------------------------
  function moverA(id, indice) {
    var lista = wraps(), nodo = wrapDe(id);
    var ref = lista[indice];
    if (!nodo || ref === nodo || (lista[indice - 1] === nodo)) return;
    if (ref) main.insertBefore(nodo, ref);
    else main.appendChild(nodo);
    cambioEstructura();
    nodo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function moverDelta(id, d) {
    var i = ordenActual().indexOf(id);
    var j = i + d;
    if (j < 0 || j >= wraps().length) return;
    moverA(id, d < 0 ? j : j + 1);
  }

  function alternarOculta(id) {
    var s = cfg.secciones[id];
    s.oculto = !s.oculto;
    aplicarEstilo(id);
    cambioEstructura();
    pintarBarra();
  }

  function nuevoId() {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = 'c_';
    for (var i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  function crearWrap(id) {
    var w = h('div', { class: 'seccion es-custom', 'data-seccion': id, 'data-tipo': 'custom' });
    return w;
  }

  function insertarCustom(doc, indice) {
    var id = nuevoId();
    cfg.custom[id] = B.limpiarDoc(doc);
    cfg.secciones[id] = C.limpiarSeccion(id, {});
    var w = crearWrap(id);
    var lista = wraps();
    if (lista[indice]) main.insertBefore(w, lista[indice]); else main.appendChild(w);
    pintarCustom(id);
    cambioEstructura();
    seleccionar(id);
    w.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return id;
  }

  function duplicar(id) {
    if (!esCustom(id)) return;
    var i = ordenActual().indexOf(id);
    var nuevo = insertarCustom(clonar(cfg.custom[id]), i + 1);
    cfg.secciones[nuevo] = C.limpiarSeccion(nuevo, clonar(cfg.secciones[id]));
    aplicarEstilo(nuevo);
    reconstruirMenu();
  }

  function eliminar(id) {
    if (!esCustom(id)) return;
    if (!confirm('¿Eliminar esta sección? Se pierde su contenido al guardar.')) return;
    wrapDe(id).remove();
    delete cfg.custom[id]; delete cfg.secciones[id];
    seleccionado = null;
    cambioEstructura();
    pintarBarra();
    if (panelModo.indexOf('ajustes') === 0) abrirPanel('secciones');
  }

  // ------------------------------------------------------------------
  // Barra flotante sobre la seccion
  // ------------------------------------------------------------------
  var flot = h('div', { class: 'ed-flot', hidden: true });
  document.body.appendChild(flot);
  var hover = null, seleccionado = null, arrastre = null;

  function btn(icono, titulo, fn, cls) {
    return h('button', { type: 'button', class: 'ed-fb ' + (cls || ''), title: titulo, 'aria-label': titulo, text: icono, onclick: fn });
  }

  function pintarBarra() {
    var id = hover || seleccionado;
    flot.innerHTML = '';
    if (!id || !wrapDe(id) || arrastre) { flot.hidden = true; return; }
    flot.hidden = false;
    flot.dataset.id = id;
    var sec = cfg.secciones[id];
    var asa = h('span', { class: 'ed-asa', draggable: 'true', title: 'Arrastra a otra posición', text: '⠿' });
    asa.addEventListener('dragstart', function (ev) { iniciarArrastre(ev, id, wrapDe(id)); });
    asa.addEventListener('dragend', terminarArrastre);
    flot.appendChild(asa);
    flot.appendChild(h('span', { class: 'ed-fl', text: nombreSeccion(id) }));
    flot.appendChild(btn('↑', 'Subir sección', function () { moverDelta(id, -1); }));
    flot.appendChild(btn('↓', 'Bajar sección', function () { moverDelta(id, 1); }));
    flot.appendChild(btn(sec.oculto ? '🚫' : '👁', sec.oculto ? 'Mostrar sección' : 'Ocultar sección', function () { alternarOculta(id); }));
    flot.appendChild(btn('⚙', 'Ajustes: fondo, colores, animación', function () { seleccionar(id); abrirPanel('ajustes:' + id); }));
    if (esCustom(id)) {
      flot.appendChild(btn('✎', 'Editar el contenido', function () { abrirEditorBloque(id); }, 'ed-fb-txt'));
      flot.appendChild(btn('⧉', 'Duplicar', function () { duplicar(id); }));
      flot.appendChild(btn('🗑', 'Eliminar', function () { eliminar(id); }, 'peligro'));
    }
    posicionarBarra();
  }

  function posicionarBarra() {
    var id = flot.dataset.id;
    if (flot.hidden || !id) return;
    var w = wrapDe(id);
    if (!w) { flot.hidden = true; return; }
    var r = w.getBoundingClientRect();
    var nav = $('.nav');
    var tope = barra.offsetHeight + (nav ? nav.offsetHeight : 0) + 8;
    var top = Math.min(Math.max(r.top + 10, tope), Math.max(tope, r.bottom - flot.offsetHeight - 6));
    var panel = document.body.classList.contains('ed-con-panel') ? 340 : 0;
    var left = Math.max(8, Math.min(r.right - flot.offsetWidth - 12, window.innerWidth - panel - flot.offsetWidth - 12));
    flot.style.top = top + 'px';
    flot.style.left = left + 'px';
    flot.style.display = r.bottom < barra.offsetHeight || r.top > window.innerHeight ? 'none' : '';
  }

  main.addEventListener('mouseover', function (e) {
    var w = e.target.closest('#landingMain > [data-seccion]');
    var id = w ? w.dataset.seccion : null;
    if (id === hover) return;
    hover = id;
    $$('#landingMain > .ed-hov').forEach(function (n) { n.classList.remove('ed-hov'); });
    if (w) w.classList.add('ed-hov');
    if (!flot.matches(':hover')) pintarBarra();
  });
  main.addEventListener('mouseleave', function () {
    setTimeout(function () { if (!flot.matches(':hover') && !main.matches(':hover')) { hover = null; $$('.ed-hov').forEach(function (n) { n.classList.remove('ed-hov'); }); pintarBarra(); } }, 120);
  });
  window.addEventListener('scroll', posicionarBarra, { passive: true });
  window.addEventListener('resize', posicionarBarra);

  function seleccionar(id) {
    seleccionado = id;
    $$('#landingMain > .ed-sel').forEach(function (n) { n.classList.remove('ed-sel'); });
    var w = id && wrapDe(id);
    if (w) w.classList.add('ed-sel');
    pintarBarra();
    pintarPanelSecciones();
  }
  main.addEventListener('mousedown', function (e) {
    var w = e.target.closest('#landingMain > [data-seccion]');
    if (w && w.dataset.seccion !== seleccionado) seleccionar(w.dataset.seccion);
  });

  // ------------------------------------------------------------------
  // Barras "+" entre secciones y arrastrar y soltar
  // ------------------------------------------------------------------
  function reconstruirBarras() {
    $$('#landingMain > .ed-ins').forEach(function (n) { n.remove(); });
    var lista = wraps();
    lista.forEach(function (w, i) { main.insertBefore(crearBarraIns(i), w); });
    main.appendChild(crearBarraIns(lista.length));
  }
  function crearBarraIns(indice) {
    var b = h('div', { class: 'ed-ins', 'data-indice': indice },
      h('button', { type: 'button', class: 'ed-ins-b', text: '＋ Añadir sección aquí', onclick: function () { abrirGaleria(indice); } }));
    b.addEventListener('dragover', function (e) { if (arrastre) { e.preventDefault(); b.classList.add('on'); } });
    b.addEventListener('dragleave', function () { b.classList.remove('on'); });
    b.addEventListener('drop', function (e) {
      if (!arrastre) return;
      e.preventDefault();
      var id = arrastre; terminarArrastre();
      moverA(id, Number(b.dataset.indice));
    });
    return b;
  }

  function iniciarArrastre(ev, id, ghost) {
    arrastre = id;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', id);
    if (ghost && ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(ghost, 20, 20);
    // Se difiere para no cancelar el arrastre al cambiar el diseno en pleno dragstart.
    setTimeout(function () { document.body.classList.add('ed-arrastrando'); flot.hidden = true; }, 0);
  }
  function terminarArrastre() {
    arrastre = null;
    document.body.classList.remove('ed-arrastrando');
    $$('.ed-ins.on, .ed-fila.on').forEach(function (n) { n.classList.remove('on'); });
    pintarBarra();
  }
  document.addEventListener('dragend', terminarArrastre);

  // ------------------------------------------------------------------
  // Panel lateral: lista de secciones / ajustes de seccion / diseno
  // ------------------------------------------------------------------
  var panel = h('aside', { class: 'ed-panel', hidden: true, 'aria-label': 'Panel del editor' });
  document.body.appendChild(panel);
  var panelModo = '';

  function abrirPanel(modo) {
    panelModo = modo;
    panel.hidden = false;
    document.body.classList.add('ed-con-panel');
    pintarPanel();
    setTimeout(posicionarBarra, 50);
  }
  function cerrarPanel() {
    panelModo = '';
    panel.hidden = true;
    document.body.classList.remove('ed-con-panel');
    setTimeout(posicionarBarra, 50);
  }
  function alternarPanel(modo) { if (panelModo === modo) cerrarPanel(); else abrirPanel(modo); }

  function pintarPanel() {
    if (panel.hidden) return;
    var tope = panel.scrollTop;
    panel.innerHTML = '';
    if (panelModo === 'secciones') panelSecciones();
    else if (panelModo === 'diseno') panelDiseno();
    else if (panelModo.indexOf('ajustes:') === 0) panelAjustes(panelModo.slice(8));
    panel.scrollTop = tope;
  }
  function pintarPanelSecciones() { if (panelModo === 'secciones') pintarPanel(); }

  function cabeceraPanel(titulo, atras) {
    return h('div', { class: 'ed-panel-cab' },
      atras ? h('button', { type: 'button', class: 'ed-fb', text: '←', title: 'Volver', onclick: function () { abrirPanel('secciones'); } }) : null,
      h('strong', { text: titulo }),
      h('button', { type: 'button', class: 'ed-fb', text: '✕', title: 'Cerrar', onclick: cerrarPanel }));
  }

  // ---------- Lista de secciones ----------
  function panelSecciones() {
    panel.appendChild(cabeceraPanel('Secciones'));
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Arrastra para reordenar, o usa las flechas. El ojo oculta o muestra la sección en la web.' }));
    var lista = h('div', { class: 'ed-lista' });
    var orden = ordenActual();
    orden.forEach(function (id, i) {
      var s = cfg.secciones[id];
      var fila = h('div', { class: 'ed-fila' + (id === seleccionado ? ' sel' : '') + (s.oculto ? ' oculta' : ''), draggable: 'true', 'data-id': id },
        h('span', { class: 'ed-asa', text: '⠿' }),
        h('button', { type: 'button', class: 'ed-fila-n', text: nombreSeccion(id), title: 'Ir a esta sección', onclick: function () { seleccionar(id); var w = wrapDe(id); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }),
        esCustom(id) ? h('span', { class: 'ed-etq', text: 'nueva' }) : null,
        btn('↑', 'Subir', function () { moverDelta(id, -1); }),
        btn('↓', 'Bajar', function () { moverDelta(id, 1); }),
        btn(s.oculto ? '🚫' : '👁', s.oculto ? 'Mostrar' : 'Ocultar', function () { alternarOculta(id); }),
        btn('⚙', 'Ajustes', function () { seleccionar(id); abrirPanel('ajustes:' + id); }));
      fila.addEventListener('dragstart', function (ev) { iniciarArrastre(ev, id, fila); });
      fila.addEventListener('dragover', function (ev) { if (arrastre && arrastre !== id) { ev.preventDefault(); fila.classList.add('on'); } });
      fila.addEventListener('dragleave', function () { fila.classList.remove('on'); });
      fila.addEventListener('drop', function (ev) {
        if (!arrastre) return;
        ev.preventDefault();
        var mov = arrastre; terminarArrastre();
        moverA(mov, i);
      });
      lista.appendChild(fila);
    });
    var fin = h('div', { class: 'ed-fila ed-fila-fin', text: 'Soltar aquí para llevarla al final' });
    fin.addEventListener('dragover', function (ev) { if (arrastre) { ev.preventDefault(); fin.classList.add('on'); } });
    fin.addEventListener('dragleave', function () { fin.classList.remove('on'); });
    fin.addEventListener('drop', function (ev) { if (!arrastre) return; ev.preventDefault(); var mov = arrastre; terminarArrastre(); moverA(mov, orden.length); });
    lista.appendChild(fin);
    panel.appendChild(lista);
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-1 ed-ancho', text: '＋ Añadir sección', onclick: function () { abrirGaleria(seleccionado ? ordenActual().indexOf(seleccionado) + 1 : wraps().length); } }));
  }

  // ---------- Widgets de formulario ----------
  var RAPIDOS = ['#ffffff', '#14140f', '#6d28d9', '#2563eb', '#12a97a', '#f59e0b', '#dc2626'];

  function campo(c, obj, alCambiar) {
    var id = 'edf-' + c.k;
    function set(v, reconstruir) { obj[c.k] = v; alCambiar(c.k, reconstruir); }
    var caja = h('div', { class: 'ed-f' });
    var lab = h('label', { class: 'ed-f-lab', for: id, text: c.label });
    if (c.t === 'texto') {
      var inp = h('input', { id: id, type: 'text', maxlength: String(c.max || 60), value: obj[c.k] || '' });
      inp.addEventListener('input', function () { set(inp.value, false); });
      caja.append(lab, inp);
    } else if (c.t === 'bool') {
      var cb = h('input', { id: id, type: 'checkbox', checked: !!obj[c.k] });
      cb.addEventListener('change', function () { set(cb.checked, true); });
      caja.className = 'ed-f ed-f-bool';
      caja.append(cb, h('label', { for: id, text: c.label }));
    } else if (c.t === 'enum') {
      if (c.op.length <= 4) {
        var seg = h('div', { class: 'ed-seg', id: id });
        c.op.forEach(function (o) {
          seg.appendChild(h('button', { type: 'button', class: obj[c.k] === o[0] ? 'on' : '', 'data-v': o[0], text: o[1], onclick: function () { set(o[0], true); } }));
        });
        caja.append(lab, seg);
      } else {
        var sl = h('select', { id: id });
        c.op.forEach(function (o) { sl.appendChild(h('option', { value: o[0], text: o[1], selected: obj[c.k] === o[0] })); });
        sl.addEventListener('change', function () { set(sl.value, true); });
        caja.append(lab, sl);
      }
    } else if (c.t === 'color') {
      var actual = obj[c.k] || '';
      var pick = h('input', { id: id, type: 'color', value: actual || '#888888' });
      pick.addEventListener('input', function () { set(pick.value, false); });
      pick.addEventListener('change', function () { pintarPanel(); });
      var fila = h('div', { class: 'ed-colores' }, pick);
      RAPIDOS.forEach(function (col) {
        fila.appendChild(h('button', { type: 'button', class: 'ed-sw' + (actual === col ? ' on' : ''), style: 'background:' + col, title: col, 'aria-label': col, onclick: function () { set(col, true); } }));
      });
      fila.appendChild(h('button', { type: 'button', class: 'ed-mini' + (actual ? '' : ' on'), text: 'Original', title: 'Volver al color de la landing', onclick: function () { set('', true); } }));
      caja.append(lab, fila);
    }
    return caja;
  }

  // ---------- Ajustes de una seccion ----------
  function panelAjustes(id) {
    var sec = cfg.secciones[id];
    if (!sec || !wrapDe(id)) { abrirPanel('secciones'); return; }
    panel.appendChild(cabeceraPanel('Ajustes · ' + nombreSeccion(id), true));
    if (esCustom(id)) {
      panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-1 ed-ancho', text: '✎ Editar el contenido de la sección', onclick: function () { abrirEditorBloque(id); } }));
    }
    C.CAMPOS_SECCION.forEach(function (c) {
      if (c.soloCustom && !esCustom(id)) return;
      if (c.si && c.si[1].indexOf(sec[c.si[0]]) < 0) return;
      panel.appendChild(campo(c, sec, function (k, reconstruir) {
        aplicarEstilo(id);
        marcarSucio();
        if (k === 'enMenu' || k === 'menu' || k === 'ancla') reconstruirMenu();
        if (k === 'anim') probarAnimacion(id);
        if (reconstruir) pintarPanel();
      }));
    });
    if (sec.anim) panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: '▶ Probar la animación', onclick: function () { probarAnimacion(id); } }));
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: sec.oculto ? '🚫 Mostrar esta sección' : '👁 Ocultar esta sección', onclick: function () { alternarOculta(id); pintarPanel(); } }));
    if (esCustom(id)) {
      panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: '⧉ Duplicar', onclick: function () { duplicar(id); } }));
      panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-peligro ed-ancho', text: '🗑 Eliminar esta sección', onclick: function () { eliminar(id); } }));
    }
  }

  var KEYFRAMES = {
    aparecer: [{ opacity: 0 }, { opacity: 1 }],
    subir: [{ opacity: 0, transform: 'translateY(44px)' }, { opacity: 1, transform: 'none' }],
    zoom: [{ opacity: 0, transform: 'scale(.93)' }, { opacity: 1, transform: 'none' }],
    izq: [{ opacity: 0, transform: 'translateX(-56px)' }, { opacity: 1, transform: 'none' }],
    der: [{ opacity: 0, transform: 'translateX(56px)' }, { opacity: 1, transform: 'none' }],
  };
  function probarAnimacion(id) {
    var w = wrapDe(id), tipo = cfg.secciones[id] && cfg.secciones[id].anim;
    if (!w || !KEYFRAMES[tipo] || !w.animate) return;
    w.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    w.animate(KEYFRAMES[tipo], { duration: 800, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }

  // ---------- Diseno general ----------
  function aplicarDiseno() {
    var d = cfg.diseno;
    var st = document.getElementById('disenoCss');
    if (!st) { st = h('style', { id: 'disenoCss' }); document.head.appendChild(st); }
    st.textContent = C.cssDiseno(d);
    var f = C.FUENTES[d.fuente];
    var link = document.getElementById('fuenteLink');
    if (f && f.url) {
      if (!link) { link = h('link', { id: 'fuenteLink', rel: 'stylesheet' }); document.head.appendChild(link); }
      if (link.getAttribute('href') !== f.url) link.setAttribute('href', f.url);
    } else if (link) link.remove();
    document.body.classList.toggle('sin-anim', d.animaciones === 'ninguna');
  }

  function panelDiseno() {
    panel.appendChild(cabeceraPanel('Diseño de la página'));
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Cambia los colores y la tipografía de toda la página. «Original» vuelve a lo de fábrica.' }));
    C.CAMPOS_DISENO.forEach(function (c) {
      panel.appendChild(campo(c, cfg.diseno, function (k, reconstruir) {
        aplicarDiseno(); marcarSucio();
        if (reconstruir) pintarPanel();
      }));
    });
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Si cambias el fondo o el texto, esos colores se usan también en el modo oscuro.' }));
  }

  // ------------------------------------------------------------------
  // Galeria de secciones prediseñadas
  // ------------------------------------------------------------------
  var galeria = null;
  function abrirGaleria(indice) {
    cerrarGaleria();
    var cuerpo = h('div', { class: 'ed-modal-cuerpo' });
    var grupos = [];
    B.PREFABS.forEach(function (pf) { if (grupos.indexOf(pf.grupo) < 0) grupos.push(pf.grupo); });
    var ordenados = [];
    grupos.forEach(function (g) { B.PREFABS.forEach(function (pf) { if (pf.grupo === g) ordenados.push(pf); }); });
    var grupo = null;
    ordenados.forEach(function (pf) {
      if (pf.grupo !== grupo) { grupo = pf.grupo; cuerpo.appendChild(h('h4', { class: 'ed-grupo', text: grupo })); }
      var mini = h('div', { class: 'ed-pf-mini' }, h('div', { class: 'ed-pf-esc' }));
      mini.firstChild.innerHTML = B.render({ tema: {}, secciones: pf.crear() }, { vars: C.VARS_BLOQUES });
      cuerpo.appendChild(h('button', {
        type: 'button', class: 'ed-pf', title: 'Añadir «' + pf.nombre + '»',
        onclick: function () { cerrarGaleria(); insertarCustom({ tema: {}, secciones: pf.crear() }, indice); },
      }, mini, h('span', { class: 'ed-pf-n', text: pf.nombre })));
    });
    galeria = h('div', { class: 'ed-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Añadir sección' },
      h('div', { class: 'ed-modal-caja' },
        h('div', { class: 'ed-modal-cab' }, h('strong', { text: 'Elige una sección' }), h('button', { type: 'button', class: 'ed-fb', text: '✕', onclick: cerrarGaleria, 'aria-label': 'Cerrar' })),
        cuerpo));
    galeria.addEventListener('mousedown', function (e) { if (e.target === galeria) cerrarGaleria(); });
    document.body.appendChild(galeria);
  }
  function cerrarGaleria() { if (galeria) { galeria.remove(); galeria = null; } }

  // ------------------------------------------------------------------
  // Editor completo de una seccion añadida (iframe con constructor.js)
  // ------------------------------------------------------------------
  var editorBloque = null, editandoId = null;

  function aHex(variable) {
    var sonda = h('span', { style: 'position:absolute;visibility:hidden;color:' + variable });
    document.body.appendChild(sonda);
    var rgb = getComputedStyle(sonda).color;
    sonda.remove();
    var m = rgb.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return '';
    return '#' + m.slice(0, 3).map(function (n) { return ('0' + Math.round(Number(n)).toString(16)).slice(-2); }).join('');
  }

  window.LandingEditor = {
    obtenerBloque: function () { return clonar(cfg.custom[editandoId] || { tema: {}, secciones: [] }); },
    actualizarBloque: function (doc) {
      if (!editandoId || !cfg.custom[editandoId]) return;
      cfg.custom[editandoId] = B.limpiarDoc(doc);
      pintarCustom(editandoId);
      marcarSucio();
      pintarBarra();
    },
    cerrarEditor: function () { cerrarEditorBloque(); },
    tema: function () {
      return { acento: aHex('var(--accent)'), fondo: aHex('var(--paper)'), texto: aHex('var(--ink)'), fuente: 'sistema' };
    },
  };

  function abrirEditorBloque(id) {
    if (editorBloque) return;
    editandoId = id;
    var marco = h('iframe', { class: 'ed-bloque-marco', src: '/admin/bloque', title: 'Editor de la sección' });
    editorBloque = h('div', { class: 'ed-bloque' }, marco);
    document.body.appendChild(editorBloque);
    document.body.classList.add('ed-bloqueando');
  }
  function cerrarEditorBloque() {
    if (!editorBloque) return;
    editorBloque.remove(); editorBloque = null; editandoId = null;
    document.body.classList.remove('ed-bloqueando');
    pintarPanel(); pintarBarra();
  }

  // ------------------------------------------------------------------
  // Enlaces: ventanita para cambiar la URL de botones y links
  // ------------------------------------------------------------------
  var pop = h('div', { class: 'ed-pop', hidden: true });
  document.body.appendChild(pop);
  var popEnlace = null;

  function actualUrl(a) {
    var clave = a.dataset.link, e = cfg.enlaces[clave];
    return e ? e.url : (a.getAttribute('href') || '');
  }
  function abrirEnlace(a) {
    popEnlace = a;
    var clave = a.dataset.link;
    var e = cfg.enlaces[clave] || { url: actualUrl(a), nueva: a.getAttribute('target') === '_blank' };
    pop.innerHTML = '';
    var dl = h('datalist', { id: 'edAnclas' });
    C.itemsMenu({ orden: ordenActual(), secciones: cfg.secciones }).forEach(function (m) { dl.appendChild(h('option', { value: '#' + m.ancla })); });
    ['#inicio', '#contacto', '#proyectos'].forEach(function (v) { dl.appendChild(h('option', { value: v })); });
    var url = h('input', { type: 'text', value: e.url, list: 'edAnclas', placeholder: 'https://…  #seccion  correo  teléfono', 'aria-label': 'Enlace', autocomplete: 'off' });
    var aviso = h('p', { class: 'ed-pop-aviso' });
    var nueva = h('input', { type: 'checkbox', id: 'edNueva', checked: !!e.nueva });
    function aplicar() {
      var norm = B.url(url.value);
      aviso.textContent = norm ? '' : 'Ese enlace no es válido (usa https://…, #sección, un correo o un teléfono).';
      if (!norm) return;
      a.setAttribute('href', norm);
      if (nueva.checked) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
      else { a.removeAttribute('target'); a.removeAttribute('rel'); }
      cfg.enlaces[clave] = { url: url.value.trim(), nueva: nueva.checked };
      marcarSucio();
    }
    url.addEventListener('input', aplicar);
    nueva.addEventListener('change', aplicar);
    url.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); cerrarEnlace(); } });
    pop.append(h('label', { class: 'ed-f-lab', text: '🔗 Enlace de este botón' }), url, dl,
      h('label', { class: 'ed-f-bool', for: 'edNueva' }, nueva, h('span', { text: ' Abrir en pestaña nueva' })), aviso,
      h('button', { type: 'button', class: 'ed-btn ed-btn-1', text: 'Listo', onclick: cerrarEnlace }));
    pop.hidden = false;
    var r = a.getBoundingClientRect();
    var w = 320;
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    var abajo = r.bottom + 10;
    pop.style.top = (abajo + pop.offsetHeight > window.innerHeight ? Math.max(barra.offsetHeight + 8, r.top - pop.offsetHeight - 10) : abajo) + 'px';
  }
  function cerrarEnlace() { pop.hidden = true; popEnlace = null; }

  document.addEventListener('mousedown', function (e) {
    var a = e.target.closest('[data-link]');
    if (a && !barra.contains(a)) { if (popEnlace !== a) abrirEnlace(a); return; }
    if (!pop.hidden && !pop.contains(e.target)) cerrarEnlace();
  });
  window.addEventListener('scroll', function () { if (!pop.hidden) cerrarEnlace(); }, { passive: true });

  // ------------------------------------------------------------------
  // Guardar
  // ------------------------------------------------------------------
  function recolectar() {
    var textos = {}, vistas = new Set();
    $$('[data-edit]').forEach(function (el) {
      var clave = el.dataset.edit;
      if (vistas.has(clave)) return;
      vistas.add(clave);
      var ahora = el.innerHTML.trim();
      if (ahora !== originales.get(el)) textos[clave] = ahora;
    });
    // Los textos ya guardados antes y que no se tocaron ahora tienen que conservarse.
    Object.keys(datos.textos || {}).forEach(function (k) { if (!(k in textos)) textos[k] = datos.textos[k]; });

    var proyectos = clonar(datos.proyectos || {});
    $$('[data-proyecto]').forEach(function (panelP) {
      var campos = proyectos[panelP.dataset.proyecto] || {};
      $$('[data-campo]', panelP).forEach(function (el) {
        var ahora = el.innerHTML.trim();
        if (ahora !== originales.get(el)) campos[el.dataset.campo] = ahora;
      });
      if (Object.keys(campos).length) proyectos[panelP.dataset.proyecto] = campos;
    });
    var ocultos = $$('[data-proyecto].esta-oculto').map(function (p) { return p.dataset.proyecto; });

    var config = clonar(cfg);
    config.orden = ordenActual();
    return { textos: textos, proyectos: proyectos, ocultos: ocultos, config: config };
  }

  btnGuardar.addEventListener('click', async function () {
    btnGuardar.disabled = true;
    avisar('Guardando...');
    try {
      var res = await fetch('/api/landing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recolectar()) });
      var data = await res.json();
      if (res.status === 401) throw new Error('Tu sesión expiró. Vuelve a entrar en /admin.');
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.');
      sucio = false;
      avisar('Guardado ✓', 'ok');
      setTimeout(function () { location.reload(); }, 700);
    } catch (err) {
      avisar(err.message, 'error');
      btnGuardar.disabled = false;
    }
  });

  btnRestablecer.addEventListener('click', async function () {
    if (!confirm('Esto borra TODOS tus cambios (textos, orden, colores, secciones añadidas) y vuelve a la landing original. ¿Seguro?')) return;
    btnRestablecer.disabled = true;
    avisar('Restableciendo...');
    try {
      var res = await fetch('/api/landing/restablecer', { method: 'POST' });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo restablecer.');
      sucio = false;
      location.reload();
    } catch (err) {
      avisar(err.message, 'error');
      btnRestablecer.disabled = false;
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (!sucio) return;
    e.preventDefault(); e.returnValue = '';
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); btnGuardar.click(); return; }
    if (e.key === 'Escape') { if (galeria) cerrarGaleria(); else if (!pop.hidden) cerrarEnlace(); }
  });

  // ---------- Botones de la barra ----------
  document.getElementById('edAnadir').addEventListener('click', function () {
    abrirGaleria(seleccionado ? ordenActual().indexOf(seleccionado) + 1 : wraps().length);
  });
  document.getElementById('edSecciones').addEventListener('click', function () { alternarPanel('secciones'); });
  document.getElementById('edDiseno').addEventListener('click', function () { alternarPanel('diseno'); });

  // ---------- Arranque ----------
  aplicarDiseno();
  wraps().forEach(function (w) { aplicarEstilo(w.dataset.seccion); });
  reconstruirBarras();
  avisar('Listo para editar');
})();
