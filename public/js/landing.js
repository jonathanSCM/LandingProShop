/* Landing "suiza" — solo dos cosas: menu movil y envio del formulario.
   Las animaciones de entrada son CSS puro (animation-timeline: view()). */
(function () {
  'use strict';

  // ---------- Menu movil ----------
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menu' : 'Abrir menu');
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Pestanas accesibles (patron tablist del WAI-ARIA) ----------
     Sirve para cualquier grupo: el tablist lleva data-tabs="<prefijo>", cada
     boton data-target="<id>" y su panel el id "<prefijo>-<id>". */
  function montarTabs(lista) {
    var prefijo = lista.dataset.tabs;
    var tabs = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    var mostrar = function (tab, enfocar) {
      tabs.forEach(function (t) {
        var activo = t === tab;
        t.classList.toggle('is-active', activo);
        t.setAttribute('aria-selected', String(activo));
        t.tabIndex = activo ? 0 : -1;

        var panel = document.getElementById(prefijo + '-' + t.dataset.target);
        if (!panel) return;
        panel.hidden = !activo;
        panel.classList.toggle('is-active', activo);
      });
      if (enfocar) tab.focus();
    };

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { mostrar(tab, false); });

      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab);
        var destino = null;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') destino = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') destino = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') destino = tabs[0];
        else if (e.key === 'End') destino = tabs[tabs.length - 1];

        if (destino) {
          e.preventDefault();
          mostrar(destino, true);
        }
      });
    });
  }

  document.querySelectorAll('[data-tabs]').forEach(montarTabs);

  // ---------- Formulario de contacto ----------
  var form = document.getElementById('contactForm');
  if (!form) return;

  var note = document.getElementById('formNote');
  var btn = document.getElementById('submitBtn');

  function setNote(text, kind) {
    note.className = 'form-note' + (kind ? ' ' + kind : '');
    note.textContent = text;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      setNote('Revisa los campos marcados con *.', 'err');
      form.reportValidity();
      return;
    }

    var datos = Object.fromEntries(new FormData(form).entries());

    btn.disabled = true;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Enviando...';
    setNote('');

    try {
      var res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      var data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo enviar tu mensaje.');
      }

      form.reset();
      setNote('Listo, recibimos tu mensaje. Te escribimos pronto.', 'ok');

      // Si el servidor devuelve un enlace de WhatsApp, lo ofrecemos.
      if (data.whatsappUrl) {
        var a = document.createElement('a');
        a.href = data.whatsappUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Continuar por WhatsApp';
        note.appendChild(document.createTextNode(' '));
        note.appendChild(a);
      }
    } catch (err) {
      setNote(err.message || 'Hubo un problema. Intenta de nuevo.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });
})();
