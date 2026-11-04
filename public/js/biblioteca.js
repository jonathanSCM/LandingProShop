/**
 * Selector de imagenes: sube archivos, muestra la biblioteca guardada en la base de
 * datos y las imagenes de ejemplo. Lo usan el editor de la landing y el de bloques.
 *
 *   Biblioteca.abrir(function (url) { ... })   // url de la imagen elegida
 */
(function () {
  'use strict';

  var EJEMPLOS = [['ph-hero.svg', 'Portada'], ['ph-foto-1.svg', 'Foto 1'], ['ph-foto-2.svg', 'Foto 2'], ['ph-foto-3.svg', 'Foto 3'], ['ph-avatar.svg', 'Persona']];
  var modal = null, cb = null;

  function h(tag, props) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    }
    return e;
  }
  function $(s) { return modal && modal.querySelector(s); }

  function abrir(fn) {
    cerrar();
    cb = fn;
    modal = h('div', { class: 'bib', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Imágenes' },
      h('div', { class: 'bib-caja' },
        h('div', { class: 'bib-cab' }, h('strong', { text: 'Imágenes' }), h('button', { type: 'button', class: 'bib-x', 'aria-label': 'Cerrar', text: '✕', onclick: cerrar })),
        h('div', { class: 'bib-cuerpo' })));
    modal.addEventListener('mousedown', function (e) { if (e.target === modal) cerrar(); });
    document.body.appendChild(modal);
    document.addEventListener('keydown', tecla, true);
    pintar(null);
    cargar();
  }
  function cerrar() {
    if (modal) { modal.remove(); modal = null; }
    cb = null;
    document.removeEventListener('keydown', tecla, true);
  }
  function tecla(e) { if (e.key === 'Escape' && modal) { e.stopPropagation(); cerrar(); } }
  function elegir(url) { var f = cb; cerrar(); if (f) f(url); }

  function pintar(imagenes, error) {
    var cuerpo = $('.bib-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';
    var fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true, id: 'bibArchivo' });
    fi.addEventListener('change', function () { subirVarios(fi.files); });
    var zona = h('label', { class: 'bib-zona', for: 'bibArchivo' }, h('strong', { text: 'Sube imágenes' }), h('span', { text: 'Haz clic o suelta aquí tus archivos (PNG, JPG, WEBP o GIF)' }));
    ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function () { zona.classList.remove('on'); }); });
    zona.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files.length) subirVarios(e.dataTransfer.files); });
    cuerpo.appendChild(h('div', {}, fi, zona));
    cuerpo.appendChild(h('div', { class: 'bib-info', id: 'bibInfo', role: 'status' }));
    if (error) cuerpo.appendChild(h('p', { class: 'bib-err', text: error }));

    var urlIn = h('input', { type: 'text', class: 'bib-url', placeholder: 'o pega un enlace de imagen (https://…)' });
    urlIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (/^https?:\/\//i.test(urlIn.value.trim())) elegir(urlIn.value.trim()); } });
    cuerpo.appendChild(urlIn);

    cuerpo.appendChild(h('h4', { class: 'bib-grupo', text: 'Tus imágenes' }));
    var rej = h('div', { class: 'bib-galeria' });
    if (imagenes == null) rej.appendChild(h('p', { class: 'bib-info', text: 'Cargando…' }));
    else if (!imagenes.length) rej.appendChild(h('p', { class: 'bib-info', text: 'Todavía no subiste imágenes.' }));
    else imagenes.forEach(function (im) {
      rej.appendChild(h('div', { class: 'bib-gi' },
        h('button', { type: 'button', class: 'bib-gb', title: im.nombre, onclick: function () { elegir(im.url); } }, h('img', { src: im.url, alt: im.nombre, loading: 'lazy' })),
        h('button', {
          type: 'button', class: 'bib-gx', title: 'Borrar imagen', 'aria-label': 'Borrar ' + im.nombre, text: '✕',
          onclick: function () {
            if (!confirm('¿Borrar esta imagen? Si la usas en alguna parte, dejará de verse.')) return;
            fetch('/api/imagenes/' + im.id, { method: 'DELETE' }).then(cargar);
          },
        })));
    });
    cuerpo.appendChild(rej);

    cuerpo.appendChild(h('h4', { class: 'bib-grupo', text: 'Imágenes de ejemplo' }));
    var ej = h('div', { class: 'bib-galeria' });
    EJEMPLOS.forEach(function (e) {
      ej.appendChild(h('div', { class: 'bib-gi' }, h('button', { type: 'button', class: 'bib-gb', title: e[1], onclick: function () { elegir('/img/plantillas/' + e[0]); } }, h('img', { src: '/img/plantillas/' + e[0], alt: e[1] }))));
    });
    cuerpo.appendChild(ej);
  }

  function cargar() {
    fetch('/api/imagenes').then(function (r) { return r.json(); }).then(function (j) {
      if (!modal) return;
      if (!j.ok) throw new Error(j.error);
      pintar(j.imagenes);
    }).catch(function (err) { if (modal) pintar([], err.message || 'No se pudo cargar la biblioteca.'); });
  }

  /** Reduce fotos pesadas del celular antes de subirlas (max 2000px). */
  function preparar(file) {
    if (file.type === 'image/gif' || file.size <= 1200 * 1024 || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      var cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      return new Promise(function (ok) { cv.toBlob(function (blob) { ok(blob && blob.size < file.size ? blob : file); }, 'image/webp', 0.86); });
    }).catch(function () { return file; });
  }

  function subir(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return Promise.reject(new Error('«' + file.name + '»: solo PNG, JPG, WEBP o GIF.'));
    return preparar(file).then(function (blob) {
      return fetch('/api/imagenes?nombre=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'Content-Type': blob.type || file.type }, body: blob });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'No se pudo subir.');
      return j.imagen;
    });
  }

  function subirVarios(archivos) {
    archivos = Array.prototype.slice.call(archivos);
    if (!archivos.length) return;
    var info = $('#bibInfo');
    if (info) info.textContent = 'Subiendo ' + archivos.length + (archivos.length === 1 ? ' imagen…' : ' imágenes…');
    var ultima = null, errores = [];
    archivos.reduce(function (p, f) {
      return p.then(function () { return subir(f).then(function (im) { ultima = im; }, function (e) { errores.push(e.message); }); });
    }, Promise.resolve()).then(function () {
      if (ultima && archivos.length === 1 && !errores.length) return elegir(ultima.url);
      cargar();
      if (errores.length) setTimeout(function () { var i2 = $('#bibInfo'); if (i2) { i2.textContent = errores.join(' '); i2.classList.add('bib-err'); } }, 200);
    });
  }

  window.Biblioteca = { abrir: abrir, cerrar: cerrar };
})();
