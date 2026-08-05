/**
 * Modo edicion de la landing (/?editar=1).
 * Solo se carga cuando el admin tiene sesion abierta.
 *
 * Como funciona:
 *  - Cada elemento con data-edit="clave" se vuelve editable a mano.
 *  - Dentro de cada panel de proyecto, los data-campo="nombre|tipo|..." tambien.
 *  - Al guardar solo se manda lo que CAMBIO respecto del texto original, para
 *    que el archivo no se llene de valores repetidos y los textos que no tocaste
 *    sigan viniendo de la vista.
 */
(function () {
  'use strict';

  var barra = document.getElementById('edBarra');
  if (!barra) return;

  var estado = document.getElementById('edEstado');
  var btnGuardar = document.getElementById('edGuardar');
  var btnRestablecer = document.getElementById('edRestablecer');

  var sucio = false;
  var originales = new Map();   // elemento -> HTML con el que cargo la pagina

  function avisar(texto, tipo) {
    estado.textContent = texto || '';
    estado.className = 'ed-estado' + (tipo ? ' es-' + tipo : '');
  }

  function marcarSucio() {
    if (sucio) return;
    sucio = true;
    avisar('Cambios sin guardar', 'aviso');
  }

  // ---------- Preparar los elementos editables ----------
  function preparar(el) {
    originales.set(el, el.innerHTML.trim());
    el.setAttribute('contenteditable', 'plaintext-only');
    el.classList.add('ed-campo');

    // Si el navegador no soporta plaintext-only, cae a true.
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');

    el.addEventListener('input', function () {
      marcarSucio();
      // Un mismo texto puede estar repetido en la pagina (ej. el CTA de cada
      // proyecto). Se sincronizan todos para que no queden distintos.
      var clave = el.dataset.edit;
      if (!clave) return;
      document.querySelectorAll('[data-edit="' + clave + '"]').forEach(function (otro) {
        if (otro !== el) otro.innerHTML = el.innerHTML;
      });
    });

    // Enter no debe partir el texto en varios parrafos.
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
      if (e.key === 'Escape') el.blur();
    });
  }

  document.querySelectorAll('[data-edit]').forEach(preparar);
  document.querySelectorAll('[data-proyecto] [data-campo]').forEach(preparar);

  // Mientras se edita, los enlaces no navegan (si no, se escapa de la pagina).
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || barra.contains(a)) return;
    if (a.closest('[contenteditable]') || a.hasAttribute('contenteditable')) e.preventDefault();
  });

  // ---------- Quitar / restaurar proyectos ----------
  document.querySelectorAll('.ed-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.proyecto;
      var panel = document.querySelector('[data-proyecto="' + id + '"]');
      var tab = document.getElementById('tab-' + id);
      var oculto = panel.classList.toggle('esta-oculto');
      if (tab) tab.classList.toggle('esta-oculto', oculto);
      btn.textContent = oculto ? 'Restaurar' : 'Quitar de la web';
      marcarSucio();
    });
  });

  // ---------- Recolectar y guardar ----------
  function recolectar() {
    var textos = {};
    var vistas = new Set();

    document.querySelectorAll('[data-edit]').forEach(function (el) {
      var clave = el.dataset.edit;
      if (vistas.has(clave)) return;        // repetido: alcanza con el primero
      vistas.add(clave);
      var ahora = el.innerHTML.trim();
      if (ahora !== originales.get(el)) textos[clave] = ahora;
    });

    var proyectos = {};
    document.querySelectorAll('[data-proyecto]').forEach(function (panel) {
      var campos = {};
      panel.querySelectorAll('[data-campo]').forEach(function (el) {
        var ahora = el.innerHTML.trim();
        if (ahora !== originales.get(el)) campos[el.dataset.campo] = ahora;
      });
      if (Object.keys(campos).length) proyectos[panel.dataset.proyecto] = campos;
    });

    var ocultos = [];
    document.querySelectorAll('[data-proyecto].esta-oculto').forEach(function (panel) {
      ocultos.push(panel.dataset.proyecto);
    });

    return { textos: textos, proyectos: proyectos, ocultos: ocultos };
  }

  btnGuardar.addEventListener('click', async function () {
    btnGuardar.disabled = true;
    avisar('Guardando...');
    try {
      var res = await fetch('/api/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recolectar()),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.');

      sucio = false;
      avisar('Guardado ✓  (' + data.textos + ' textos, ' + data.ocultos + ' ocultos)', 'ok');
      // Se recarga para ver la pagina tal como la vera un visitante.
      setTimeout(function () { location.reload(); }, 900);
    } catch (err) {
      avisar(err.message, 'error');
      btnGuardar.disabled = false;
    }
  });

  btnRestablecer.addEventListener('click', async function () {
    if (!confirm('Esto borra TODOS tus cambios y vuelve a los textos originales. Seguro?')) return;
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

  // Aviso si se va con cambios sin guardar.
  window.addEventListener('beforeunload', function (e) {
    if (!sucio) return;
    e.preventDefault();
    e.returnValue = '';
  });

  avisar('Listo para editar');
})();
