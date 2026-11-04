/* Formularios de las paginas del constructor: envian a /api/contacto, que valida y ofrece seguir por WhatsApp. El resto de la pagina no necesita JavaScript. */
(function () {
  'use strict';
  var script = document.currentScript;
  var origen = (script && script.dataset.origen) || '';

  document.querySelectorAll('form[data-pg-form]').forEach(function (form) {
    var msg = form.querySelector('.pg-form-msg');
    var boton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var datos = {
        nombre: String(f.get('nombre') || '').trim(),
        email: String(f.get('email') || '').trim(),
        telefono: String(f.get('telefono') || '').trim(),
        mensaje: String(f.get('mensaje') || '').trim(),
        servicio: 'Página: ' + origen,
      };
      msg.className = 'pg-form-msg';
      if (!datos.nombre || !datos.email || !datos.mensaje) {
        msg.textContent = 'Completa nombre, correo y mensaje.';
        msg.classList.add('error');
        return;
      }
      boton.disabled = true;
      msg.textContent = 'Enviando…';
      fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.error || 'No se pudo enviar.');
          form.reset();
          msg.textContent = (msg.dataset.exito || '¡Gracias!') + ' ';
          msg.classList.add('ok');
          if (r.j.whatsappUrl) {
            var a = document.createElement('a');
            a.href = r.j.whatsappUrl; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = 'Continuar por WhatsApp →';
            msg.appendChild(a);
          }
        })
        .catch(function (err) {
          msg.textContent = err.message || 'No se pudo enviar. Intenta de nuevo.';
          msg.classList.add('error');
        })
        .then(function () { boton.disabled = false; });
    });
  });
})();
