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
  cfg.proyectos = { lista: clonarInicial(datos.lista) };
  function clonarInicial(o) { return JSON.parse(JSON.stringify(o || [])); }
  var main = document.getElementById('landingMain');
  var estado = document.getElementById('edEstado');
  var btnGuardar = document.getElementById('edGuardar');
  var btnRestablecer = document.getElementById('edRestablecer');

  var sucio = false;
  var sucios = {};              // campos de proyecto escritos encima y aun no pasados al modelo
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
      var pDueno = el.closest('[data-proyecto]');
      if (pDueno && el.dataset.campo) sucios[pDueno.dataset.proyecto + '|' + el.dataset.campo] = true;
      if (el.dataset.campo === 'nombre' || el.dataset.campo === 'tipo') {
        var pn = el.closest('[data-proyecto]');
        var tab = pn && document.getElementById('tab-' + pn.dataset.proyecto);
        var dest = tab && tab.querySelector(el.dataset.campo === 'nombre' ? '.proj-tab-name' : '.proj-tab-type');
        if (dest) dest.textContent = el.innerText;
      }
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
    var items = C.itemsMenu({ orden: ordenActual(), secciones: cfg.secciones, cabecera: cfg.cabecera });
    $$('[data-menu-box]').forEach(function (box) {
      box.innerHTML = '';
      items.forEach(function (m) { box.appendChild(h('a', { href: m.href || '#' + m.ancla, text: m.texto })); });
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
    datalistAnclas();
    if (panelModo === 'secciones') panelSecciones();
    else if (panelModo === 'cabecera') panelMarco('Cabecera', C.CAMPOS_CABECERA, cfg.cabecera, aplicarCabecera);
    else if (panelModo === 'pie') panelMarco('Pie de página', C.CAMPOS_PIE, cfg.pie, aplicarPie);
    else if (panelModo === 'proyectos') panelProyectos();
    else if (panelModo.indexOf('proyecto:') === 0) panelProyecto(panelModo.slice(9));
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
    lista.appendChild(filaMarco('cabecera', 'Cabecera (menú de arriba)'));
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
    lista.appendChild(filaMarco('pie', 'Pie de página'));
    panel.appendChild(lista);
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-1 ed-ancho', text: '＋ Añadir sección', onclick: function () { abrirGaleria(seleccionado ? ordenActual().indexOf(seleccionado) + 1 : wraps().length); } }));
  }

  function filaMarco(id, nombre) {
    return h('div', { class: 'ed-fila ed-fila-marco' },
      h('span', { class: 'ed-asa', text: '▭' }),
      h('button', { type: 'button', class: 'ed-fila-n', text: nombre, onclick: function () { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); abrirPanel(id); } }),
      btn('⚙', 'Ajustes', function () { abrirPanel(id); }));
  }

  // ---------- Widgets de formulario ----------
  var RAPIDOS = ['#ffffff', '#14140f', '#6d28d9', '#2563eb', '#12a97a', '#f59e0b', '#dc2626'];

  function campo(c, obj, alCambiar) {
    var id = 'edf-' + c.k;
    function set(v, reconstruir) { obj[c.k] = v; alCambiar(c.k, reconstruir); }
    var caja = h('div', { class: 'ed-f' });
    var lab = h('label', { class: 'ed-f-lab', for: id, text: c.label });
    if (c.t === 'texto' || c.t === 'url') {
      var inp = h('input', { id: id, type: 'text', maxlength: String(c.max || 60), value: obj[c.k] || '', autocomplete: 'off', list: c.t === 'url' ? 'edAnclas' : null });
      inp.addEventListener('input', function () { set(inp.value, false); });
      caja.append(lab, inp);
    } else if (c.t === 'area') {
      var ta = h('textarea', { id: id, rows: '5', maxlength: String(c.max || 1200) }); ta.value = obj[c.k] || '';
      ta.addEventListener('input', function () { set(ta.value, false); });
      caja.append(lab, ta);
    } else if (c.t === 'num') {
      var rango = h('input', { id: id, type: 'range', min: c.min, max: c.max, step: c.step || 1, value: obj[c.k] });
      var num = h('output', { class: 'ed-num', text: String(obj[c.k]) });
      rango.addEventListener('input', function () { num.textContent = rango.value; set(Number(rango.value), false); });
      caja.append(lab, h('div', { class: 'ed-rango' }, rango, num));
    } else if (c.t === 'imagen') {
      var vista = h('div', { class: 'ed-img' });
      if (obj[c.k]) vista.appendChild(h('img', { src: obj[c.k], alt: '' })); else vista.appendChild(h('span', { text: 'Sin imagen' }));
      caja.append(lab, vista, h('div', { class: 'ed-img-b' },
        h('button', { type: 'button', class: 'ed-btn ed-btn-1', text: obj[c.k] ? 'Cambiar imagen' : 'Elegir o subir imagen', onclick: function () { window.Biblioteca.abrir(function (url) { set(url, true); }); } }),
        obj[c.k] ? h('button', { type: 'button', class: 'ed-btn ed-btn-2', text: 'Quitar', onclick: function () { set('', true); } }) : null));
    } else if (c.t === 'lista') {
      caja.append(lab, listaUI(c, obj, set));
    } else if (c.t === 'items') {
      caja.append(lab, itemsUI(c, obj, set));
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

  function visible(c, obj) { return !c.si || c.si[1].indexOf(obj[c.si[0]]) >= 0; }

  function filaAcciones(arr, i, set, reconstruir) {
    return h('div', { class: 'ed-fila-a' },
      h('button', { type: 'button', class: 'ed-mini', text: '↑', title: 'Subir', disabled: i === 0 ? true : null, onclick: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); reconstruir(); } }),
      h('button', { type: 'button', class: 'ed-mini', text: '↓', title: 'Bajar', disabled: i === arr.length - 1 ? true : null, onclick: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); reconstruir(); } }),
      h('button', { type: 'button', class: 'ed-mini ed-mini-x', text: '✕', title: 'Quitar', onclick: function () { arr.splice(i, 1); reconstruir(); } }));
  }

  // Lista de textos simples (ej. "Que hace" de un proyecto)
  function listaUI(c, obj, set) {
    var arr = obj[c.k], caja = h('div', { class: 'ed-items' });
    function cambio() { set(arr, true); }
    arr.forEach(function (txt, i) {
      var inp = h('input', { type: 'text', value: txt, maxlength: '200', 'aria-label': c.label + ' ' + (i + 1) });
      inp.addEventListener('input', function () { arr[i] = inp.value; set(arr, false); });
      caja.appendChild(h('div', { class: 'ed-item' }, h('div', { class: 'ed-item-c' }, inp), filaAcciones(arr, i, set, cambio)));
    });
    if (arr.length < (c.max || 12)) caja.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: '+ Añadir', onclick: function () { arr.push('Nueva característica'); cambio(); } }));
    return caja;
  }

  // Lista de objetos con varios campos (enlaces, botones)
  function itemsUI(c, obj, set) {
    var arr = obj[c.k], caja = h('div', { class: 'ed-items' });
    function cambio() { set(arr, true); }
    arr.forEach(function (it, i) {
      var campos = h('div', { class: 'ed-item-c' });
      c.sub.forEach(function (sc) {
        if (sc.t === 'bool') {
          var cb = h('input', { type: 'checkbox', checked: !!it[sc.k] });
          cb.addEventListener('change', function () { it[sc.k] = cb.checked; set(arr, false); });
          campos.appendChild(h('label', { class: 'ed-f-bool ed-chico' }, cb, h('span', { text: ' ' + sc.label })));
        } else {
          var inp = h('input', { type: 'text', value: it[sc.k] || '', maxlength: String(sc.max || 200), placeholder: sc.label, 'aria-label': sc.label, list: sc.t === 'url' ? 'edAnclas' : null });
          inp.addEventListener('input', function () { it[sc.k] = inp.value; set(arr, false); });
          campos.appendChild(inp);
        }
      });
      caja.appendChild(h('div', { class: 'ed-item' }, campos, filaAcciones(arr, i, set, cambio)));
    });
    if (arr.length < (c.max || 6)) caja.appendChild(h('button', {
      type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: '+ Añadir',
      onclick: function () {
        var nuevo = {};
        c.sub.forEach(function (sc) { nuevo[sc.k] = sc.def; });
        arr.push(nuevo); cambio();
      },
    }));
    return caja;
  }

  // Sugerencias de enlace (secciones de la pagina) para los campos de URL
  function datalistAnclas() {
    var dl = document.getElementById('edAnclas');
    if (!dl) { dl = h('datalist', { id: 'edAnclas' }); document.body.appendChild(dl); }
    dl.innerHTML = '';
    C.itemsMenu({ orden: ordenActual(), secciones: cfg.secciones }).forEach(function (m) { if (m.ancla) dl.appendChild(h('option', { value: '#' + m.ancla })); });
    ['#inicio', '#contacto', '#proyectos'].forEach(function (v) { dl.appendChild(h('option', { value: v })); });
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
      if (!visible(c, sec)) return;
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
    var raiz = document.documentElement;
    if (d.modo === 'auto') { raiz.removeAttribute('data-tema-fijo'); if (raiz.dataset.tema && !localStorage.getItem('tema')) raiz.removeAttribute('data-tema'); }
    else { raiz.setAttribute('data-tema', d.modo); raiz.setAttribute('data-tema-fijo', ''); }
    if (d.bordes === 'original') raiz.removeAttribute('data-bordes'); else raiz.setAttribute('data-bordes', d.bordes);
    document.body.classList.toggle('sin-boton-tema', d.modo !== 'auto' || !d.botonTema);
  }

  function panelDiseno() {
    panel.appendChild(cabeceraPanel('Diseño de la página'));
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Cambia los colores y la tipografía de toda la página. «Original» vuelve a lo de fábrica.' }));
    C.CAMPOS_DISENO.forEach(function (c) {
      if (!visible(c, cfg.diseno)) return;
      panel.appendChild(campo(c, cfg.diseno, function (k, reconstruir) {
        aplicarDiseno(); marcarSucio();
        if (reconstruir) pintarPanel();
      }));
    });
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Si cambias el fondo o el texto, esos colores se usan también en el modo oscuro.' }));
  }

  // ------------------------------------------------------------------
  // Cabecera y pie de pagina
  // ------------------------------------------------------------------
  function aplicarCabecera() {
    var nav = document.getElementById('cabecera');
    if (!nav) return;
    var c = cfg.cabecera, est = C.estiloCabecera(c);
    nav.style.cssText = est.style;
    nav.className = 'nav ' + est.clase + (c.visible ? '' : ' nav-oculta');
    var marca = nav.querySelector('.brand');
    if (marca) {
      marca.innerHTML = '';
      if (c.logoTipo === 'texto') marca.appendChild(h('span', { class: 'brand-txt', text: c.logoTexto || 'ProShop' }));
      else marca.appendChild(h('img', { class: 'brand-logo', src: c.logoSrc || '/img/logo-proshop.png', alt: 'Logo' }));
    }
    reconstruirMenu();
  }
  function aplicarPie() {
    var f = document.getElementById('pie');
    if (!f) return;
    f.style.cssText = C.estiloPie(cfg.pie).style;
    f.classList.toggle('nav-oculta', !cfg.pie.visible);
  }

  function panelMarco(titulo, campos, obj, aplicar) {
    panel.appendChild(cabeceraPanel(titulo, true));
    campos.forEach(function (c) {
      if (!visible(c, obj)) return;
      panel.appendChild(campo(c, obj, function (k, reconstruir) {
        aplicar(); marcarSucio();
        if (reconstruir) pintarPanel();
      }));
    });
  }

  // ------------------------------------------------------------------
  // Proyectos: añadir, editar, ordenar, duplicar y eliminar
  // ------------------------------------------------------------------
  var lista = function () { return cfg.proyectos.lista; };
  function proyectoPorId(id) { for (var i = 0; i < lista().length; i++) if (lista()[i].id === id) return lista()[i]; return null; }
  function idNuevoProyecto() {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', r = 'p_';
    for (var i = 0; i < 8; i++) r += a[Math.floor(Math.random() * a.length)];
    return r;
  }

  // Lo escrito encima de los paneles pasa al modelo antes de repintar.
  function sincronizarTextos() {
    $$('[data-proyecto]').forEach(function (pn) {
      var p = proyectoPorId(pn.dataset.proyecto);
      if (!p) return;
      $$('[data-campo]', pn).forEach(function (el) {
        var k = p.id + '|' + el.dataset.campo;
        if (!sucios[k]) return; // solo lo que se escribio encima: lo demas lo manda el panel
        p[el.dataset.campo] = el.innerText.replace(/\u00a0/g, ' ').trim();
        delete sucios[k];
      });
    });
  }

  var refrescando = false, refrescoPendiente = null, tRefresco = null;
  function programarRefresco(idActivo) {
    clearTimeout(tRefresco);
    tRefresco = setTimeout(function () { refrescarProyectos(idActivo); }, 400);
  }
  async function refrescarProyectos(idActivo) {
    if (refrescando) { refrescoPendiente = idActivo; return; }
    refrescando = true;
    try {
      sincronizarTextos();
      var cont = document.getElementById('projLista');
      if (!cont) return;
      var activoAntes = (cont.querySelector('.proj-tab.is-active') || {}).dataset;
      // Textos editados en esa zona y aun sin guardar (ej. el boton "Crear proyecto")
      var guardados = {};
      $$('[data-edit]', cont).forEach(function (el) { guardados[el.dataset.edit] = { ahora: el.innerHTML, original: originales.get(el) }; });
      var res = await fetch('/api/landing/proyectos-html', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lista: lista(), enlaces: cfg.enlaces }) });
      var data = await res.json();
      if (res.status === 401) throw new Error('Tu sesión expiró. Vuelve a entrar en /admin.');
      if (!data.ok) throw new Error(data.error || 'No se pudo actualizar.');
      cont.innerHTML = data.html;
      window.__montarProyectos(cont);
      $$('[data-edit]', cont).forEach(function (el) {
        preparar(el);
        var g = guardados[el.dataset.edit];
        if (g) { el.innerHTML = g.ahora; originales.set(el, g.original); }
      });
      $$('[data-proyecto] [data-campo]', cont).forEach(preparar);
      var objetivo = idActivo || (activoAntes && activoAntes.target);
      var tab = objetivo && document.getElementById('tab-' + objetivo);
      if (tab) tab.click();
      marcarSucio();
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      refrescando = false;
      if (refrescoPendiente !== null) { var sig = refrescoPendiente; refrescoPendiente = null; refrescarProyectos(sig); }
    }
  }

  function irAProyecto(id) {
    var tab = document.getElementById('tab-' + id);
    if (tab) tab.click();
    var sec = wrapDe('proyectos');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function panelProyectos() {
    panel.appendChild(cabeceraPanel('Proyectos'));
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'Añade, ordena, edita o quita los proyectos que muestra la sección «Proyectos».' }));
    var caja = h('div', { class: 'ed-lista' });
    lista().forEach(function (p, i) {
      caja.appendChild(h('div', { class: 'ed-fila' + (p.oculto ? ' oculta' : '') },
        h('span', { class: 'ed-num-p', text: String(i + 1).padStart(2, '0') }),
        h('button', { type: 'button', class: 'ed-fila-n', text: p.nombre || 'Sin nombre', title: 'Editar este proyecto', onclick: function () { abrirPanel('proyecto:' + p.id); irAProyecto(p.id); } }),
        btn('↑', 'Subir', function () { moverProyecto(p.id, -1); }),
        btn('↓', 'Bajar', function () { moverProyecto(p.id, 1); }),
        btn(p.oculto ? '🚫' : '👁', p.oculto ? 'Mostrar en la web' : 'Ocultar de la web', function () { p.oculto = !p.oculto; refrescarProyectos(p.id); pintarPanel(); }),
        btn('✎', 'Editar', function () { abrirPanel('proyecto:' + p.id); irAProyecto(p.id); })));
    });
    panel.appendChild(caja);
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-1 ed-ancho', text: '＋ Añadir proyecto', onclick: anadirProyecto }));
  }

  function moverProyecto(id, d) {
    sincronizarTextos();
    var l = lista(), i = l.findIndex(function (p) { return p.id === id; }), j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return;
    l.splice(j, 0, l.splice(i, 1)[0]);
    pintarPanel();
    refrescarProyectos(id);
  }

  function anadirProyecto() {
    sincronizarTextos();
    var p = C.limpiarProyecto({ id: idNuevoProyecto() });
    lista().push(p);
    abrirPanel('proyecto:' + p.id);
    refrescarProyectos(p.id).then(function () { irAProyecto(p.id); });
  }

  function duplicarProyecto(id) {
    sincronizarTextos();
    var orig = proyectoPorId(id); if (!orig) return;
    var copia = clonar(orig);
    copia.id = idNuevoProyecto(); copia.nombre = (orig.nombre + ' (copia)').slice(0, 120); copia.oculto = false;
    lista().splice(lista().indexOf(orig) + 1, 0, copia);
    abrirPanel('proyecto:' + copia.id);
    refrescarProyectos(copia.id).then(function () { irAProyecto(copia.id); });
  }

  function eliminarProyecto(id) {
    var p = proyectoPorId(id); if (!p) return;
    if (!confirm('¿Eliminar el proyecto «' + p.nombre + '»? Se pierde al guardar. (Si solo quieres esconderlo, usa el ojo.)')) return;
    sincronizarTextos();
    lista().splice(lista().indexOf(p), 1);
    abrirPanel('proyectos');
    refrescarProyectos();
  }

  function panelProyecto(id) {
    var p = proyectoPorId(id);
    if (!p) { abrirPanel('proyectos'); return; }
    sincronizarTextos();
    panel.appendChild(h('div', { class: 'ed-panel-cab' },
      h('button', { type: 'button', class: 'ed-fb', text: '←', title: 'Volver a la lista', onclick: function () { abrirPanel('proyectos'); } }),
      h('strong', { text: p.nombre || 'Proyecto' }),
      h('button', { type: 'button', class: 'ed-fb', text: '✕', title: 'Cerrar', onclick: cerrarPanel })));
    panel.appendChild(h('p', { class: 'ed-ayuda', text: 'También puedes escribir el nombre, el tipo y el resumen directamente sobre el proyecto en la página.' }));
    C.CAMPOS_PROYECTO.forEach(function (c) {
      if (!visible(c, p)) return;
      panel.appendChild(campo(c, p, function (k, reconstruir) {
        delete sucios[p.id + '|' + k];
        if (k === 'imagen') {
          p.puntos = []; // las paradas del recorrido apuntaban a la imagen anterior
          if (p.imagen) {
            var im = new Image();
            im.onload = function () { p.ancho = im.naturalWidth; p.alto = im.naturalHeight; programarRefresco(p.id); };
            im.src = p.imagen;
          } else { p.ancho = 0; p.alto = 0; }
        }
        marcarSucio();
        programarRefresco(p.id);
        if (reconstruir) pintarPanel();
      }));
    });
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: p.oculto ? '🚫 Mostrar en la web' : '👁 Ocultar de la web', onclick: function () { p.oculto = !p.oculto; refrescarProyectos(p.id); pintarPanel(); } }));
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-2 ed-ancho', text: '⧉ Duplicar', onclick: function () { duplicarProyecto(p.id); } }));
    panel.appendChild(h('button', { type: 'button', class: 'ed-btn ed-btn-peligro ed-ancho', text: '🗑 Eliminar proyecto', onclick: function () { eliminarProyecto(p.id); } }));
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-editar-proyecto]');
    if (b) { abrirPanel('proyecto:' + b.dataset.editarProyecto); }
  });

  // Tocar la cabecera o el pie (fuera de textos y enlaces) abre sus ajustes
  ['cabecera', 'pie'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('mousedown', function (e) {
      if (e.target.closest('a, button, [contenteditable], input')) return;
      abrirPanel(id);
    });
  });

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

    sincronizarTextos();
    var config = clonar(cfg);
    config.orden = ordenActual();
    // Los proyectos ahora viven completos en config.proyectos.lista; lo antiguo se limpia.
    return { textos: textos, proyectos: {}, ocultos: [], config: config };
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
  document.getElementById('edProyectos').addEventListener('click', function () { alternarPanel('proyectos'); });
  document.getElementById('edCabecera').addEventListener('click', function () { alternarPanel('cabecera'); });
  document.getElementById('edDiseno').addEventListener('click', function () { alternarPanel('diseno'); });

  // ---------- Arranque ----------
  aplicarDiseno();
  datalistAnclas();
  wraps().forEach(function (w) { aplicarEstilo(w.dataset.seccion); });
  reconstruirBarras();
  avisar('Listo para editar');
})();
