/**
 * Constructor de paginas — editor visual (/admin/paginas/:id/editor).
 *
 * Piezas:
 *  - doc            El documento (secciones > columnas > elementos). Ver bloques.js.
 *  - lienzo         Se dibuja con Bloques.render(doc, {editor:true}); el mismo motor
 *                   que publica la pagina, asi lo que ves es lo que sale.
 *  - panel izquierdo Secciones prediseñadas, elementos sueltos, capas y ajustes de pagina.
 *  - inspector      Panel derecho: campos del elemento o seccion seleccionada,
 *                   generados a partir del catalogo de bloques.js.
 *  - historial      Deshacer / rehacer con instantaneas del documento.
 *  - guardado       Manual (Ctrl+S) y automatico a los pocos segundos de parar de editar.
 */
(function () {
  'use strict';

  var B = window.Bloques;
  // Este editor siempre se abre dentro del modo edicion de la landing (en un iframe):
  // pide el bloque a la ventana de arriba y le devuelve los cambios al instante.
  var emb = null;
  try { emb = window.parent !== window && window.parent.LandingEditor ? window.parent.LandingEditor : null; } catch (e) { emb = null; }
  if (!emb) {
    document.body.innerHTML = '<p style="padding:40px;font:16px system-ui">Este editor se abre desde la landing: entra en <a href="/admin">/admin</a>.</p>';
    return;
  }
  var pag = { id: 0, slug: '', titulo: '', descripcion: '', publicada: false, inicio: false, actualizada: '' };
  var doc = B.limpiarDoc(emb.obtenerBloque());
  // El lienzo muestra los colores reales de la landing para que se parezca a lo publicado.
  var tema = emb.tema();
  Object.keys(tema).forEach(function (k) { if (tema[k]) doc.tema[k] = tema[k]; });

  // ------------------------------------------------------------------
  // Utilidades de DOM
  // ------------------------------------------------------------------
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) añadir(el, arguments[i]);
    return el;
  }
  function añadir(el, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(function (x) { añadir(el, x); });
    else el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  }

  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  function slugificar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  var el = {
    lienzo: $('#cLienzo'), marco: $('#cMarco'), pagina: $('#cPagina'),
    flot: $('#cFlot'), indic: $('#cIndic'), inspector: $('#cInspector'),
    panel: $('#cPanel'), estado: $('#cEstado'), titulo: $('#cTitulo'),
    guardar: $('#cGuardar'), publicar: $('#cPublicar'), ver: $('#cVer'),
    deshacer: $('#cDeshacer'), rehacer: $('#cRehacer'),
  };

  var sel = null;              // { id } de la seccion o elemento seleccionado
  var vista = false;           // modo vista previa
  var tab = 'secciones';
  var drag = null;             // arrastre en curso
  var sucio = false, rev = 0, guardando = false, pendienteGuardar = false, bloqueado = false;
  var tAuto = null, tCommit = null;
  var hist = [JSON.stringify(doc)], histIdx = 0;

  // ------------------------------------------------------------------
  // Busqueda en el documento
  // ------------------------------------------------------------------
  function buscar(id) {
    for (var i = 0; i < doc.secciones.length; i++) {
      var s = doc.secciones[i];
      if (s.id === id) return { s: s, si: i };
      for (var c = 0; c < s.cols.length; c++) {
        for (var e = 0; e < s.cols[c].length; e++) {
          if (s.cols[c][e].id === id) return { s: s, si: i, ci: c, col: s.cols[c], e: s.cols[c][e], ei: e };
        }
      }
    }
    return null;
  }
  function actual() { return sel ? buscar(sel.id) : null; }

  function resumen(e) {
    var t = e.texto || e.titulo || e.valor || e.etiqueta || '';
    if (!t && e.items && e.items[0]) t = e.items[0].texto || '';
    if (!t && e.tipo === 'imagen') t = e.alt || (e.src ? e.src.split('/').pop() : 'sin imagen');
    return String(t).replace(/\s+/g, ' ').slice(0, 34);
  }

  // ------------------------------------------------------------------
  // Estado visible / historial / guardado
  // ------------------------------------------------------------------
  function avisar(texto, tipo) {
    el.estado.textContent = texto;
    el.estado.className = 'c-estado' + (tipo ? ' es-' + tipo : '');
  }

  function marcar() {
    if (emb) { // se aplica a la landing casi al instante, sin pasar por el servidor
      sucio = true; rev++; avisar('Aplicando…');
      clearTimeout(tAuto);
      tAuto = setTimeout(function () { guardar(); }, 250);
      return;
    }
    sucio = true; rev++;
    if (!bloqueado) avisar('Cambios sin guardar', 'aviso');
    clearTimeout(tAuto);
    if (!bloqueado) tAuto = setTimeout(function () { guardar(); }, 2500);
  }

  function actualizarBotonesHist() {
    el.deshacer.disabled = histIdx <= 0;
    el.rehacer.disabled = histIdx >= hist.length - 1;
  }

  function commit() {
    clearTimeout(tCommit); tCommit = null;
    var s = JSON.stringify(doc);
    if (s === hist[histIdx]) return;
    hist = hist.slice(0, histIdx + 1);
    hist.push(s);
    if (hist.length > 120) hist.shift();
    histIdx = hist.length - 1;
    actualizarBotonesHist();
  }
  function programarCommit() {
    clearTimeout(tCommit);
    tCommit = setTimeout(function () { commit(); pintarPanel(); }, 450);
  }

  function ir(i) {
    commit();
    if (i < 0 || i >= hist.length) return;
    histIdx = i;
    doc = JSON.parse(hist[histIdx]);
    if (sel && !buscar(sel.id)) sel = null;
    marcar();
    actualizarBotonesHist();
    pintarTodo();
  }

  /** Cambio estructural: guarda lo pendiente, aplica, registra en el historial y repinta todo. */
  function mutar(fn) {
    commit();
    fn();
    commit();
    marcar();
    pintarTodo();
  }

  function guardar(forzar) {
    clearTimeout(tAuto);
    if (emb) {
      commit();
      emb.actualizarBloque(doc);
      sucio = false;
      avisar('Aplicado ✓', 'ok');
      return Promise.resolve();
    }
    if (guardando) { pendienteGuardar = true; return Promise.resolve(); }
    commit();
    guardando = true;
    var miRev = rev;
    avisar('Guardando…');
    el.guardar.disabled = true;
    var cuerpo = {
      titulo: pag.titulo, slug: pag.slug, descripcion: pag.descripcion,
      publicada: pag.publicada, inicio: !!pag.inicio, doc: doc,
    };
    if (!forzar) cuerpo.base = pag.actualizada;
    return fetch('/api/paginas/' + pag.id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    })
      .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.status === 401) throw new Error(x.j.error || 'Sesión expirada.');
        if (x.r.status === 409 && /otra pestaña/.test(x.j.error || '')) {
          bloqueado = true;
          avisar('Modificada en otra pestaña', 'error');
          if (confirm(x.j.error + '\n\n¿Guardar de todos modos y sobrescribir la otra versión?')) {
            bloqueado = false; guardando = false;
            return guardar(true);
          }
          return;
        }
        if (!x.r.ok || !x.j.ok) throw new Error(x.j.error || 'No se pudo guardar.');
        pag.actualizada = x.j.actualizada;
        pag.slug = x.j.slug; pag.titulo = x.j.titulo; pag.publicada = x.j.publicada; pag.inicio = x.j.inicio;
        if (rev === miRev) { sucio = false; avisar('Guardado ✓', 'ok'); }
        else { avisar('Cambios sin guardar', 'aviso'); }
        bloqueado = false;
        actualizarCabecera();
      })
      .catch(function (err) {
        avisar(err.message || 'No se pudo guardar', 'error');
        sucio = true;
      })
      .then(function () {
        guardando = false;
        el.guardar.disabled = false;
        if (pendienteGuardar) { pendienteGuardar = false; if (sucio && !bloqueado) return guardar(); }
      });
  }

  function actualizarCabecera() {
    el.ver.href = '/p/' + pag.slug;
    el.publicar.textContent = pag.publicada ? 'Despublicar' : 'Publicar';
    el.publicar.classList.toggle('es-publicada', !!pag.publicada);
    $('#cBadge').textContent = pag.publicada ? 'Publicada' : 'Borrador';
    $('#cBadge').classList.toggle('es-on', !!pag.publicada);
    var u = $('#cUrl'); if (u) u.textContent = location.origin + '/p/' + pag.slug;
  }

  window.addEventListener('beforeunload', function (e) {
    if (emb || !sucio) return;
    e.preventDefault(); e.returnValue = '';
  });

  // ------------------------------------------------------------------
  // Pintado
  // ------------------------------------------------------------------
  function pintarLienzo() {
    el.pagina.innerHTML = B.render(doc, { editor: !vista });
    document.body.classList.toggle('c-vista', vista);
    aplicarSel();
  }

  function pintarTodo() {
    pintarLienzo();
    pintarPanel();
    pintarInspector();
  }

  function aplicarSel() {
    $$('.sel', el.pagina).forEach(function (n) { n.classList.remove('sel'); });
    $$('[contenteditable]', el.pagina).forEach(function (n) { n.removeAttribute('contenteditable'); });
    var ref = actual();
    if (!ref) sel = null;
    var nodo = null;
    if (ref && !vista) {
      nodo = ref.e ? el.pagina.querySelector('[data-el="' + ref.e.id + '"]') : el.pagina.querySelector('[data-sec="' + ref.s.id + '"]');
    }
    if (nodo) {
      nodo.classList.add('sel');
      if (ref.e) {
        $$('[data-campo]', nodo).forEach(function (c) {
          c.setAttribute('contenteditable', 'plaintext-only');
          if (c.contentEditable !== 'plaintext-only') c.setAttribute('contenteditable', 'true');
        });
      }
    }
    pintarFlotante();
  }

  // ---------- Barra flotante sobre el elemento seleccionado ----------
  function btnFlot(icono, titulo, fn, cls) {
    return h('button', { type: 'button', class: 'c-fb ' + (cls || ''), title: titulo, 'aria-label': titulo, onclick: fn, text: icono });
  }

  function pintarFlotante() {
    var ref = actual();
    el.flot.innerHTML = '';
    if (!ref || vista) { el.flot.hidden = true; return; }
    el.flot.hidden = false;
    var esEl = !!ref.e;
    var asa = h('span', { class: 'c-asa', draggable: 'true', title: 'Arrastra para mover', text: '⠿' });
    asa.addEventListener('dragstart', function (ev) {
      iniciarArrastre(ev, { t: esEl ? 'el' : 'sec', id: sel.id }, esEl ? el.pagina.querySelector('[data-el="' + sel.id + '"]') : el.pagina.querySelector('[data-sec="' + sel.id + '"]'));
    });
    asa.addEventListener('dragend', terminarArrastre);
    el.flot.appendChild(asa);
    el.flot.appendChild(h('span', { class: 'c-fl', text: esEl ? B.ELEMENTOS[ref.e.tipo].nombre : 'Sección' }));
    if (esEl) el.flot.appendChild(btnFlot('⇱', 'Seleccionar la sección', function () { seleccionar(ref.s.id); }));
    el.flot.appendChild(btnFlot('↑', 'Subir', function () { mover(-1); }));
    el.flot.appendChild(btnFlot('↓', 'Bajar', function () { mover(1); }));
    el.flot.appendChild(btnFlot('⧉', 'Duplicar', duplicar));
    el.flot.appendChild(btnFlot('🗑', 'Eliminar', eliminar, 'peligro'));
    posicionarFlotante();
  }

  function posicionarFlotante() {
    var ref = actual();
    if (!ref || vista || el.flot.hidden) return;
    var nodo = ref.e ? el.pagina.querySelector('[data-el="' + ref.e.id + '"]') : el.pagina.querySelector('[data-sec="' + ref.s.id + '"]');
    if (!nodo) { el.flot.hidden = true; return; }
    var m = el.marco.getBoundingClientRect();
    var l = el.lienzo.getBoundingClientRect();
    var r = nodo.getBoundingClientRect();
    var fw = el.flot.offsetWidth, fh = el.flot.offsetHeight;
    var top, left;
    if (ref.e) {
      top = r.top - fh - 6;
      if (top < l.top + 4) top = r.top + 4;
      left = r.left;
    } else {
      top = r.top + 8;
      left = r.right - fw - 8;
    }
    // Mientras haya parte del bloque a la vista, la barra no se sale de pantalla.
    top = Math.min(Math.max(top, l.top + 6), Math.max(l.top + 6, r.bottom - fh - 4));
    left = Math.min(Math.max(left, m.left + 4), m.right - fw - 4);
    el.flot.style.top = (top - m.top) + 'px';
    el.flot.style.left = (left - m.left) + 'px';
  }

  var rafPos = 0;
  function pedirPosicion() {
    if (rafPos) return;
    rafPos = requestAnimationFrame(function () { rafPos = 0; posicionarFlotante(); });
  }
  el.lienzo.addEventListener('scroll', pedirPosicion);
  window.addEventListener('resize', pedirPosicion);

  // ------------------------------------------------------------------
  // Seleccion
  // ------------------------------------------------------------------
  function seleccionar(id, opciones) {
    sel = id ? { id: id } : null;
    aplicarSel();
    pintarInspector();
    pintarCapasSel();
    if (opciones && opciones.mostrar && sel) {
      var n = el.pagina.querySelector('[data-el="' + id + '"], [data-sec="' + id + '"]');
      if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(pedirPosicion, 350);
    }
  }

  el.pagina.addEventListener('mousedown', function (e) {
    if (vista) return;
    var nEl = e.target.closest('[data-el]');
    var nSec = e.target.closest('[data-sec]');
    var id = nEl ? nEl.dataset.el : nSec ? nSec.dataset.sec : null;
    if (id && sel && sel.id === id) return;
    seleccionar(id);
  });

  // Dentro del lienzo nada navega ni envia: es un editor, no la pagina publicada.
  el.pagina.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (vista && a) {
      var href = a.getAttribute('href') || '';
      e.preventDefault();
      if (href.charAt(0) === '#' && href.length > 1) {
        var d = el.pagina.querySelector('[id="' + href.slice(1).replace(/"/g, '') + '"]');
        if (d) d.scrollIntoView({ behavior: 'smooth' });
      } else if (/^(https?:|mailto:|tel:)/i.test(href)) {
        window.open(href, '_blank', 'noopener');
      }
      return;
    }
    if (a) e.preventDefault();
    if (e.target.closest('button')) e.preventDefault();
  });
  el.pagina.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = e.target.querySelector('.pg-form-msg');
    if (msg) { msg.textContent = 'En la página publicada este formulario envía el mensaje a tu panel.'; }
  });
  el.pagina.addEventListener('dblclick', function (e) {
    if (vista) return;
    var n = e.target.closest('[data-tipo="imagen"]');
    if (!n) return;
    var ref = buscar(n.dataset.el);
    if (ref) abrirBiblioteca(function (url) { mutar(function () { ref.e.src = url; }); });
  });

  // ---------- Edicion de texto directamente sobre el lienzo ----------
  function especCampo(tipo, k) {
    var cs = B.ELEMENTOS[tipo].campos;
    for (var i = 0; i < cs.length; i++) if (cs[i].k === k) return cs[i];
    return null;
  }

  el.pagina.addEventListener('input', function (e) {
    var nodo = e.target.closest('[data-campo]');
    if (!nodo) return;
    var nEl = nodo.closest('[data-el]');
    var ref = nEl && buscar(nEl.dataset.el);
    if (!ref) return;
    var k = nodo.dataset.campo;
    var v = nodo.innerText.replace(/ /g, ' ');
    if (v === '\n') v = '';
    var spec = especCampo(ref.e.tipo, k);
    ref.e[k] = v.slice(0, spec && spec.max ? spec.max : 3000);
    // Refleja el cambio en el inspector sin reconstruirlo (perderia el foco).
    var campo = document.getElementById('f-' + k);
    if (campo && document.activeElement !== campo) campo.value = ref.e[k];
    marcar(); programarCommit();
  });

  el.pagina.addEventListener('keydown', function (e) {
    var nodo = e.target.closest && e.target.closest('[data-campo]');
    if (!nodo) return;
    if (e.key === 'Escape') { nodo.blur(); return; }
    if (e.key !== 'Enter') return;
    var nEl = nodo.closest('[data-el]');
    var ref = nEl && buscar(nEl.dataset.el);
    var spec = ref && especCampo(ref.e.tipo, nodo.dataset.campo);
    if (spec && spec.t === 'texto') e.preventDefault(); // campos de una sola linea
  });

  el.pagina.addEventListener('paste', function (e) {
    var nodo = e.target.closest && e.target.closest('[data-campo]');
    if (!nodo) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    var nEl = nodo.closest('[data-el]');
    var ref = nEl && buscar(nEl.dataset.el);
    var spec = ref && especCampo(ref.e.tipo, nodo.dataset.campo);
    if (spec && spec.t === 'texto') t = t.replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, t);
  });

  // ------------------------------------------------------------------
  // Operaciones sobre el documento
  // ------------------------------------------------------------------
  function mover(delta) {
    var ref = actual(); if (!ref) return;
    mutar(function () {
      if (!ref.e) {
        var j = ref.si + delta;
        if (j < 0 || j >= doc.secciones.length) return;
        doc.secciones.splice(j, 0, doc.secciones.splice(ref.si, 1)[0]);
        return;
      }
      var j2 = ref.ei + delta;
      if (j2 >= 0 && j2 < ref.col.length) {
        ref.col.splice(j2, 0, ref.col.splice(ref.ei, 1)[0]);
      } else {
        // En el borde de la columna salta a la columna vecina.
        var dest = ref.s.cols[ref.ci + delta];
        if (!dest) return;
        ref.col.splice(ref.ei, 1);
        if (delta < 0) dest.push(ref.e); else dest.unshift(ref.e);
      }
    });
    seleccionar(sel.id, { mostrar: true });
  }

  function reId(n) {
    if (n.cols) { n.id = B.nuevoId('s'); n.cols.forEach(function (c) { c.forEach(reId); }); }
    else n.id = B.nuevoId('e');
    return n;
  }

  function duplicar() {
    var ref = actual(); if (!ref) return;
    var copia;
    mutar(function () {
      if (ref.e) { copia = reId(clonar(ref.e)); ref.col.splice(ref.ei + 1, 0, copia); }
      else { copia = reId(clonar(ref.s)); doc.secciones.splice(ref.si + 1, 0, copia); }
    });
    seleccionar(copia.id, { mostrar: true });
  }

  function eliminar() {
    var ref = actual(); if (!ref) return;
    var vecino = null;
    mutar(function () {
      if (ref.e) {
        ref.col.splice(ref.ei, 1);
        vecino = (ref.col[ref.ei] || ref.col[ref.ei - 1] || ref.s).id;
      } else {
        doc.secciones.splice(ref.si, 1);
        var v = doc.secciones[ref.si] || doc.secciones[ref.si - 1];
        vecino = v ? v.id : null;
      }
    });
    seleccionar(vecino);
  }

  function insertarSecciones(prefabId, idx) {
    var pf = B.prefab(prefabId); if (!pf) return;
    var nuevas = pf.crear();
    mutar(function () {
      if (idx == null) {
        var ref = actual();
        idx = ref ? ref.si + 1 : doc.secciones.length;
      }
      doc.secciones.splice.apply(doc.secciones, [idx, 0].concat(nuevas));
    });
    seleccionar(nuevas[0].id, { mostrar: true });
  }

  function insertarElemento(tipo, destino) {
    var nuevo = B.crearElemento(tipo);
    mutar(function () {
      if (!destino) {
        var ref = actual();
        if (ref && ref.e) destino = { col: ref.col, idx: ref.ei + 1 };
        else if (ref) destino = { col: ref.s.cols[0], idx: ref.s.cols[0].length };
        else {
          if (!doc.secciones.length) doc.secciones.push(B.prefab('vacia-1').crear()[0]);
          var ult = doc.secciones[doc.secciones.length - 1];
          destino = { col: ult.cols[0], idx: ult.cols[0].length };
        }
      }
      destino.col.splice(destino.idx, 0, nuevo);
    });
    seleccionar(nuevo.id, { mostrar: true });
  }

  // ------------------------------------------------------------------
  // Arrastrar y soltar
  // ------------------------------------------------------------------
  function iniciarArrastre(ev, d, ghost) {
    drag = d;
    ev.dataTransfer.effectAllowed = 'copyMove';
    ev.dataTransfer.setData('text/plain', 'constructor');
    if (ghost && ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(ghost, 12, 12);
    document.body.classList.add('c-arrastrando');
    el.pagina.firstElementChild && el.pagina.firstElementChild.classList.add('arrastrando');
  }
  function terminarArrastre() {
    drag = null;
    document.body.classList.remove('c-arrastrando');
    el.indic.hidden = true;
    var pg = el.pagina.firstElementChild; if (pg) pg.classList.remove('arrastrando');
  }

  function destinoSeccion(e) {
    var secs = $$('[data-sec]', el.pagina);
    var idx = secs.length;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { idx = i; break; }
    }
    var y = null;
    if (secs.length) {
      y = idx < secs.length ? secs[idx].getBoundingClientRect().top : secs[secs.length - 1].getBoundingClientRect().bottom;
    }
    return { t: 'sec', idx: idx, y: y };
  }

  function columnaBajo(e) {
    var n = document.elementFromPoint(e.clientX, e.clientY);
    var col = n && n.closest && n.closest('.pg-col');
    if (col) return col;
    var sec = n && n.closest && n.closest('[data-sec]');
    if (!sec) return null;
    var cols = $$('.pg-col', sec), mejor = null, dist = Infinity;
    cols.forEach(function (c) {
      var r = c.getBoundingClientRect();
      var d = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
      if (d < dist) { dist = d; mejor = c; }
    });
    return mejor;
  }

  function destinoElemento(e) {
    var colN = columnaBajo(e);
    if (!colN) return null;
    var secN = colN.closest('[data-sec]');
    var sec = buscar(secN.dataset.sec);
    if (!sec) return null;
    var ci = $$('.pg-col', secN).indexOf(colN);
    var hijos = $$(':scope > [data-el]', colN);
    var idx = hijos.length, y, x = null, w = null;
    for (var i = 0; i < hijos.length; i++) {
      var r = hijos[i].getBoundingClientRect();
      var enLinea = hijos[i].classList.contains('en-linea');
      var antes = enLinea
        ? (e.clientY < r.top || (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2))
        : e.clientY < r.top + r.height / 2;
      if (antes) { idx = i; break; }
    }
    var cr = colN.getBoundingClientRect();
    if (hijos.length === 0) y = cr.top + 8;
    else if (idx < hijos.length) y = hijos[idx].getBoundingClientRect().top - 8;
    else y = hijos[hijos.length - 1].getBoundingClientRect().bottom + 8;
    x = cr.left; w = cr.width;
    return { t: 'el', col: sec.s.cols[ci], idx: idx, y: y, x: x, w: w };
  }

  el.lienzo.addEventListener('dragover', function (e) {
    if (!drag || vista) return;
    var esSec = drag.t === 'sec' || drag.t === 'nuevaSec';
    var d = esSec ? destinoSeccion(e) : destinoElemento(e);
    // Auto-scroll cerca de los bordes del lienzo
    var l = el.lienzo.getBoundingClientRect();
    if (e.clientY < l.top + 60) el.lienzo.scrollTop -= 14;
    else if (e.clientY > l.bottom - 60) el.lienzo.scrollTop += 14;
    if (!d) { el.indic.hidden = true; return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.t === 'sec' || drag.t === 'el' ? 'move' : 'copy';
    var m = el.marco.getBoundingClientRect();
    el.indic.hidden = false;
    el.indic.className = 'c-indic ' + (esSec ? 'es-sec' : 'es-el');
    if (d.y == null) { // lienzo vacio
      el.indic.style.top = '40px'; el.indic.style.left = '0'; el.indic.style.width = '100%';
    } else {
      el.indic.style.top = (d.y - m.top) + 'px';
      el.indic.style.left = esSec ? '0' : (d.x - m.left) + 'px';
      el.indic.style.width = esSec ? '100%' : d.w + 'px';
    }
    drag.destino = d;
  });

  el.lienzo.addEventListener('drop', function (e) {
    if (!drag || vista) return;
    e.preventDefault();
    var d = drag.destino, a = drag;
    terminarArrastre();
    if (!d) return;
    soltar(a, d);
  });

  function soltar(a, d) {
    var nuevoSel = null;
    if (a.t === 'nuevaSec') {
      var pf = B.prefab(a.id), nuevas = pf.crear();
      mutar(function () { doc.secciones.splice.apply(doc.secciones, [d.idx, 0].concat(nuevas)); });
      nuevoSel = nuevas[0].id;
    } else if (a.t === 'nuevoEl') {
      var ne = B.crearElemento(a.tipo);
      mutar(function () { d.col.splice(d.idx, 0, ne); });
      nuevoSel = ne.id;
    } else if (a.t === 'sec') {
      var ref = buscar(a.id); if (!ref) return;
      mutar(function () {
        var s = doc.secciones.splice(ref.si, 1)[0];
        var idx = d.idx > ref.si ? d.idx - 1 : d.idx;
        doc.secciones.splice(idx, 0, s);
      });
      nuevoSel = a.id;
    } else if (a.t === 'el') {
      var r2 = buscar(a.id); if (!r2) return;
      mutar(function () {
        var pos = r2.col.indexOf(r2.e);
        r2.col.splice(pos, 1);
        var idx = d.idx;
        if (d.col === r2.col && idx > pos) idx--;
        d.col.splice(idx, 0, r2.e);
      });
      nuevoSel = a.id;
    }
    if (nuevoSel) seleccionar(nuevoSel, { mostrar: true });
  }

  document.addEventListener('dragend', terminarArrastre);

  // ------------------------------------------------------------------
  // Panel izquierdo
  // ------------------------------------------------------------------
  var TABS = [['secciones', 'Secciones'], ['elementos', 'Elementos'], ['capas', 'Capas']];

  function pintarPanel() {
    el.panel.innerHTML = '';
    var tabs = h('div', { class: 'c-tabs', role: 'tablist' });
    TABS.forEach(function (t) {
      tabs.appendChild(h('button', {
        type: 'button', role: 'tab', class: 'c-tab' + (tab === t[0] ? ' on' : ''), text: t[1],
        'aria-selected': tab === t[0] ? 'true' : 'false',
        onclick: function () { tab = t[0]; pintarPanel(); },
      }));
    });
    el.panel.appendChild(tabs);
    var cuerpo = h('div', { class: 'c-panel-cuerpo' });
    el.panel.appendChild(cuerpo);
    if (tab === 'secciones') panelSecciones(cuerpo);
    else if (tab === 'elementos') panelElementos(cuerpo);
    else panelCapas(cuerpo);
  }

  function panelSecciones(c) {
    c.appendChild(h('p', { class: 'c-ayuda', text: 'Haz clic para añadir después de la sección elegida, o arrástrala al lienzo.' }));
    var grupos = [], ordenados = [], grupo = null;
    B.PREFABS.forEach(function (pf) { if (grupos.indexOf(pf.grupo) < 0) grupos.push(pf.grupo); });
    grupos.forEach(function (g) { B.PREFABS.forEach(function (pf) { if (pf.grupo === g) ordenados.push(pf); }); });
    ordenados.forEach(function (pf) {
      if (pf.grupo !== grupo) { grupo = pf.grupo; c.appendChild(h('h4', { class: 'c-grupo', text: grupo })); }
      var mini = h('div', { class: 'pf-mini' }, h('div', { class: 'pf-esc' }));
      var esc = mini.firstChild;
      esc.innerHTML = B.render({ tema: doc.tema, secciones: pf.crear() });
      var card = h('button', {
        type: 'button', class: 'pf', draggable: 'true', title: 'Añadir «' + pf.nombre + '»',
        onclick: function () { insertarSecciones(pf.id); },
      }, mini, h('span', { class: 'pf-n', text: pf.nombre }));
      card.addEventListener('dragstart', function (ev) { iniciarArrastre(ev, { t: 'nuevaSec', id: pf.id }, mini); });
      card.addEventListener('dragend', terminarArrastre);
      c.appendChild(card);
    });
  }

  var ORDEN_ELEMENTOS = ['titulo', 'texto', 'imagen', 'boton', 'enlace', 'tarjeta', 'lista', 'menu', 'estadistica', 'video', 'formulario', 'espacio', 'linea'];
  function panelElementos(c) {
    c.appendChild(h('p', { class: 'c-ayuda', text: 'Haz clic para añadir junto a lo seleccionado, o arrastra hasta una columna.' }));
    var rejilla = h('div', { class: 'c-elementos' });
    ORDEN_ELEMENTOS.forEach(function (tipo) {
      var b = h('button', {
        type: 'button', class: 'c-elem', draggable: 'true', 'data-nuevo': tipo,
        onclick: function () { insertarElemento(tipo); },
      }, h('span', { class: 'c-elem-i', text: B.ELEMENTOS[tipo].icono }), h('span', { text: B.ELEMENTOS[tipo].nombre }));
      b.addEventListener('dragstart', function (ev) { iniciarArrastre(ev, { t: 'nuevoEl', tipo: tipo }, b); });
      b.addEventListener('dragend', terminarArrastre);
      rejilla.appendChild(b);
    });
    c.appendChild(rejilla);
  }

  function panelCapas(c) {
    if (!doc.secciones.length) { c.appendChild(h('p', { class: 'c-ayuda', text: 'Aún no hay secciones.' })); return; }
    var lista = h('div', { class: 'c-capas' });
    doc.secciones.forEach(function (s, i) {
      lista.appendChild(h('button', {
        type: 'button', class: 'c-capa sec', 'data-capa': s.id, onclick: function () { seleccionar(s.id, { mostrar: true }); },
      }, h('b', { text: 'Sección ' + (i + 1) }), h('small', { text: s.ancla ? '#' + s.ancla : s.cols.length + (s.cols.length === 1 ? ' columna' : ' columnas') })));
      s.cols.forEach(function (col, ci) {
        col.forEach(function (e) {
          lista.appendChild(h('button', {
            type: 'button', class: 'c-capa el', 'data-capa': e.id, onclick: function () { seleccionar(e.id, { mostrar: true }); },
          }, h('span', { class: 'c-elem-i', text: B.ELEMENTOS[e.tipo].icono }),
          h('span', { class: 'c-capa-t', text: B.ELEMENTOS[e.tipo].nombre + (resumen(e) ? ' · ' + resumen(e) : '') }),
          s.cols.length > 1 ? h('small', { text: 'col ' + (ci + 1) }) : null));
        });
      });
    });
    c.appendChild(lista);
    pintarCapasSel();
  }
  function pintarCapasSel() {
    $$('.c-capa', el.panel).forEach(function (b) { b.classList.toggle('on', !!sel && b.dataset.capa === sel.id); });
  }

  function pintarPanelSoft() { var t = el.panel.scrollTop; pintarPanel(); el.panel.scrollTop = t; }

  function campoSimple(etiqueta, tipo, valor, max, fn) {
    var entrada = tipo === 'textarea'
      ? h('textarea', { rows: '3', maxlength: String(max), value: valor || '' })
      : h('input', { type: 'text', maxlength: String(max), value: valor || '' });
    entrada.addEventListener('input', function () { fn(entrada.value); });
    return h('div', { class: 'f' }, h('label', { class: 'f-lab', text: etiqueta }), entrada);
  }

  // ------------------------------------------------------------------
  // Inspector (panel derecho)
  // ------------------------------------------------------------------
  function pintarInspector() {
    var tope = el.inspector.scrollTop;
    el.inspector.innerHTML = '';
    var ref = actual();
    var dl = h('datalist', { id: 'cAnclas' });
    doc.secciones.forEach(function (s) { if (s.ancla) dl.appendChild(h('option', { value: '#' + s.ancla })); });
    el.inspector.appendChild(dl);

    if (!ref) {
      el.inspector.appendChild(h('div', { class: 'c-insp-vacio' },
        h('div', { class: 'c-insp-vacio-i', text: '☝' }),
        h('p', { text: 'Selecciona una sección o un elemento en el lienzo para editarlo.' }),
        h('p', { class: 'c-ayuda', text: 'Los textos se editan escribiendo directamente encima.' })));
      return;
    }

    var ctx = {
      alCambiar: function (rebuild, inmediato) {
        marcar(); pintarLienzo();
        if (inmediato) { commit(); pintarPanelSoft(); } else programarCommit();
        if (rebuild) pintarInspector();
      },
    };

    if (ref.e) {
      var esp = B.ELEMENTOS[ref.e.tipo];
      el.inspector.appendChild(cabeceraInsp(esp.icono, esp.nombre));
      esp.campos.forEach(function (c) { el.inspector.appendChild(campoUI(c, ref.e, ctx)); });
      el.inspector.appendChild(h('button', { type: 'button', class: 'c-link', text: '⇱ Ir a la sección', onclick: function () { seleccionar(ref.s.id, { mostrar: true }); } }));
    } else {
      var s = ref.s;
      el.inspector.appendChild(cabeceraInsp('▥', 'Sección ' + (ref.si + 1)));
      // Numero de columnas (estructural)
      var seg = h('div', { class: 'seg' });
      [1, 2, 3, 4].forEach(function (n) {
        seg.appendChild(h('button', {
          type: 'button', class: s.cols.length === n ? 'on' : '', text: String(n), 'data-cols': n,
          onclick: function () { cambiarColumnas(s, n); },
        }));
      });
      el.inspector.appendChild(h('div', { class: 'f' }, h('span', { class: 'f-lab', text: 'Columnas' }), seg));
      B.SECCION.forEach(function (c) {
        if (c.si && !cumple(c.si, s)) return;
        el.inspector.appendChild(campoUI(c, s, ctx));
      });
    }
    el.inspector.scrollTop = tope;
  }

  function cumple(si, s) {
    var v = si[0] === '#cols' ? s.cols.length : s[si[0]];
    return si[1].indexOf(v) >= 0;
  }

  function cabeceraInsp(icono, nombre) {
    return h('div', { class: 'c-insp-cab' },
      h('span', { class: 'c-elem-i', text: icono }), h('strong', { text: nombre }),
      h('span', { class: 'c-insp-acc' },
        btnFlot('↑', 'Subir', function () { mover(-1); }),
        btnFlot('↓', 'Bajar', function () { mover(1); }),
        btnFlot('⧉', 'Duplicar', duplicar),
        btnFlot('🗑', 'Eliminar', eliminar, 'peligro')));
  }

  function cambiarColumnas(s, n) {
    if (s.cols.length === n) return;
    mutar(function () {
      while (s.cols.length < n) s.cols.push([]);
      while (s.cols.length > n) {
        var resto = s.cols.pop();
        // Lo que habia en columnas que desaparecen pasa a la ultima: no se pierde nada.
        resto.forEach(function (e) { s.cols[s.cols.length - 1].push(e); });
      }
    });
  }

  // ---------- Controles de formulario generados desde el catalogo ----------
  var COLORES_RAPIDOS = ['#ffffff', '#111827', '#6d28d9', '#2563eb', '#16a34a', '#f59e0b', '#dc2626'];

  function campoUI(c, obj, ctx) {
    var id = 'f-' + c.k;
    function set(v, rebuild, inmediato) { obj[c.k] = v; ctx.alCambiar(!!rebuild, !!inmediato); }
    var caja = h('div', { class: 'f f-' + c.t });
    var lab = h('label', { class: 'f-lab', for: id, text: c.label });

    switch (c.t) {
      case 'texto':
      case 'url': {
        var inp = h('input', {
          id: id, type: 'text', maxlength: String(c.max || 200), value: obj[c.k] || '',
          list: c.t === 'url' ? 'cAnclas' : null, autocomplete: 'off',
          placeholder: c.t === 'url' ? 'https://… , #seccion, correo o teléfono' : null,
        });
        inp.addEventListener('input', function () { set(inp.value, false, false); });
        caja.append(lab, inp);
        break;
      }
      case 'area': {
        var ta = h('textarea', { id: id, rows: '4', maxlength: String(c.max || 3000), value: obj[c.k] || '' });
        ta.addEventListener('input', function () { set(ta.value, false, false); });
        caja.append(lab, ta);
        break;
      }
      case 'bool': {
        var cb = h('input', { id: id, type: 'checkbox', checked: !!obj[c.k] });
        cb.addEventListener('change', function () { set(cb.checked, true, true); });
        caja.className = 'f f-bool';
        caja.append(cb, h('label', { for: id, text: c.label }));
        break;
      }
      case 'num': {
        var rango = h('input', { id: id, type: 'range', min: c.min, max: c.max, step: c.step || 1, value: obj[c.k] });
        var num = h('output', { class: 'f-num', text: String(obj[c.k]) });
        rango.addEventListener('input', function () { num.textContent = rango.value; set(Number(rango.value), false, false); });
        caja.append(lab, h('div', { class: 'f-rango' }, rango, num));
        break;
      }
      case 'enum': {
        if (c.op.length <= 4) {
          var seg = h('div', { class: 'seg', role: 'group', 'aria-label': c.label, id: id });
          c.op.forEach(function (o) {
            seg.appendChild(h('button', {
              type: 'button', class: obj[c.k] === o[0] ? 'on' : '', text: o[1], 'data-v': o[0],
              onclick: function () { set(o[0], true, true); },
            }));
          });
          caja.append(lab, seg);
        } else {
          var sl = h('select', { id: id });
          c.op.forEach(function (o) { sl.appendChild(h('option', { value: o[0], text: o[1], selected: obj[c.k] === o[0] })); });
          sl.addEventListener('change', function () { set(sl.value, true, true); });
          caja.append(lab, sl);
        }
        break;
      }
      case 'color': {
        var actualC = obj[c.k] || '';
        var picker = h('input', { id: id, type: 'color', value: actualC || (c.def || '#888888') });
        picker.addEventListener('input', function () { set(picker.value, false, false); });
        picker.addEventListener('change', function () { commit(); });
        var fila = h('div', { class: 'f-color' }, picker);
        COLORES_RAPIDOS.forEach(function (col) {
          fila.appendChild(h('button', {
            type: 'button', class: 'sw' + (actualC === col ? ' on' : ''), style: 'background:' + col,
            title: col, 'aria-label': col, onclick: function () { set(col, true, true); },
          }));
        });
        if (c.def === '' || c.def == null) {
          fila.appendChild(h('button', { type: 'button', class: 'c-mini' + (actualC ? '' : ' on'), text: 'Auto', title: 'Usar el color automático', onclick: function () { set('', true, true); } }));
        }
        caja.append(lab, fila);
        break;
      }
      case 'imagen': {
        var vista_ = h('div', { class: 'f-img' });
        if (obj[c.k]) vista_.appendChild(h('img', { src: obj[c.k], alt: '' }));
        else vista_.appendChild(h('span', { text: 'Sin imagen' }));
        var botones = h('div', { class: 'f-img-b' },
          h('button', { type: 'button', class: 'c-btn c-btn-1', text: obj[c.k] ? 'Cambiar' : 'Elegir o subir', onclick: function () { abrirBiblioteca(function (url) { set(url, true, true); }); } }),
          obj[c.k] ? h('button', { type: 'button', class: 'c-btn', text: 'Quitar', onclick: function () { set('', true, true); } }) : null);
        var url = h('input', { id: id, type: 'text', value: obj[c.k] || '', placeholder: 'o pega un enlace de imagen', maxlength: '600' });
        url.addEventListener('input', function () { set(url.value.trim(), false, false); });
        url.addEventListener('change', function () { commit(); pintarInspector(); });
        caja.append(lab, vista_, botones, url);
        break;
      }
      case 'items': {
        caja.append(lab, itemsUI(c, obj, ctx));
        break;
      }
    }
    return caja;
  }

  function itemsUI(c, obj, ctx) {
    var lista = h('div', { class: 'f-items' });
    obj[c.k].forEach(function (it, i) {
      var fila = h('div', { class: 'f-item' });
      var campos = h('div', { class: 'f-item-c' });
      c.sub.forEach(function (sc) {
        var inp = h('input', { type: 'text', value: it[sc.k] || '', placeholder: sc.label, maxlength: String(sc.max || 200), list: sc.t === 'url' ? 'cAnclas' : null, 'aria-label': sc.label });
        inp.addEventListener('input', function () { it[sc.k] = inp.value; ctx.alCambiar(false, false); });
        campos.appendChild(inp);
      });
      fila.appendChild(campos);
      var acc = h('div', { class: 'f-item-a' },
        h('button', { type: 'button', class: 'c-mini', text: '↑', title: 'Subir', disabled: i === 0 ? true : null, onclick: function () { obj[c.k].splice(i - 1, 0, obj[c.k].splice(i, 1)[0]); ctx.alCambiar(true, true); } }),
        h('button', { type: 'button', class: 'c-mini', text: '↓', title: 'Bajar', disabled: i === obj[c.k].length - 1 ? true : null, onclick: function () { obj[c.k].splice(i + 1, 0, obj[c.k].splice(i, 1)[0]); ctx.alCambiar(true, true); } }),
        h('button', { type: 'button', class: 'c-mini peligro', text: '✕', title: 'Quitar', onclick: function () { obj[c.k].splice(i, 1); ctx.alCambiar(true, true); } }));
      fila.appendChild(acc);
      lista.appendChild(fila);
    });
    if (obj[c.k].length < (c.max || 20)) {
      lista.appendChild(h('button', {
        type: 'button', class: 'c-btn c-btn-add', text: '+ Añadir',
        onclick: function () {
          var nuevo = {};
          c.sub.forEach(function (sc) { nuevo[sc.k] = sc.k === 'texto' ? 'Nuevo' : (sc.def || ''); });
          obj[c.k].push(nuevo); ctx.alCambiar(true, true);
        },
      }));
    }
    return lista;
  }

  // ------------------------------------------------------------------
  // Biblioteca de imagenes (selector compartido: biblioteca.js)
  // ------------------------------------------------------------------
  function abrirBiblioteca(cb) { window.Biblioteca.abrir(cb); }

  // ------------------------------------------------------------------
  // Cabecera: dispositivos, historial, vista previa, guardar, publicar
  // ------------------------------------------------------------------
  $$('[data-disp]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-disp]').forEach(function (x) { x.classList.toggle('on', x === b); });
      el.marco.dataset.disp = b.dataset.disp;
      setTimeout(pedirPosicion, 60);
    });
  });

  el.deshacer.addEventListener('click', function () { ir(histIdx - 1); });
  el.rehacer.addEventListener('click', function () { ir(histIdx + 1); });

  function alternarVista(on) {
    vista = on == null ? !vista : on;
    $('#cVista').classList.toggle('on', vista);
    $('#cVista').textContent = vista ? '✕ Salir de la vista previa' : '👁 Vista previa';
    pintarLienzo();
  }
  $('#cVista').addEventListener('click', function () { alternarVista(); });

  el.guardar.addEventListener('click', function () { guardar(); });
  $('#cListo').addEventListener('click', function () { guardar().then(function () { emb.cerrarEditor(); }); });
  el.publicar.addEventListener('click', function () {
    var quiere = !pag.publicada;
    if (!quiere && !confirm('La página dejará de ser pública (quedará como borrador). ¿Continuar?')) return;
    pag.publicada = quiere;
    marcar();
    guardar().then(function () {
      if (quiere && pag.publicada) avisar('Publicada ✓  ' + location.origin + '/p/' + pag.slug, 'ok');
    });
    actualizarCabecera();
  });
  el.ver.addEventListener('click', function (e) {
    // Guarda antes de abrir para ver lo ultimo que hiciste.
    if (sucio) { e.preventDefault(); var url = el.ver.href; guardar().then(function () { window.open(url, '_blank'); }); }
  });

  el.titulo.addEventListener('input', function () { pag.titulo = el.titulo.value; marcar(); });

  $('#cMenuIzq').addEventListener('click', function () { document.body.classList.toggle('abre-izq'); document.body.classList.remove('abre-der'); });
  $('#cMenuDer').addEventListener('click', function () { document.body.classList.toggle('abre-der'); document.body.classList.remove('abre-izq'); });

  // ---------- Atajos de teclado ----------
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var enCampo = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    var enTexto = t && t.isContentEditable;
    var mod = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      if (vista) { alternarVista(false); return; }
      if (!enCampo && !enTexto && sel) seleccionar(null);
      return;
    }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); guardar(); return; }
    if (enCampo) return; // deshacer nativo dentro de los campos del inspector
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); ir(e.shiftKey ? histIdx + 1 : histIdx - 1); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); ir(histIdx + 1); return; }
    if (enTexto) return;
    if (mod && e.key.toLowerCase() === 'd' && sel) { e.preventDefault(); duplicar(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !vista) { e.preventDefault(); eliminar(); return; }
    if (e.altKey && e.key === 'ArrowUp' && sel) { e.preventDefault(); mover(-1); return; }
    if (e.altKey && e.key === 'ArrowDown' && sel) { e.preventDefault(); mover(1); }
  });

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------
  el.titulo.value = pag.titulo;
  actualizarCabecera();
  actualizarBotonesHist();
  pintarTodo();
  avisar('Listo');
})();
