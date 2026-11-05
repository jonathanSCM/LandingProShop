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

  /* ---------- Selector de tema ----------
     Mientras el visitante no toque el boton manda la preferencia del sistema
     operativo (no se escribe nada en <html>). En cuanto elige, su eleccion
     pisa al sistema y queda recordada para las proximas visitas. */
  // Hay dos controles iguales: el circulo de la barra (escritorio) y la fila
  // dentro del menu desplegable (movil). Solo uno se ve a la vez, pero los dos
  // comparten esta logica.
  var botonesTema = document.querySelectorAll('[data-boton-tema]');

  if (botonesTema.length) {
    var raiz = document.documentElement;
    var consultaOscuro = window.matchMedia('(prefers-color-scheme: dark)');

    var estaOscuro = function () {
      var elegido = raiz.dataset.tema;
      if (elegido === 'oscuro') return true;
      if (elegido === 'claro') return false;
      return consultaOscuro.matches;
    };

    // El rotulo dice A DONDE se va, no donde se esta. En el que lleva texto
    // visible se cambia el texto; en el de solo icono, la etiqueta accesible
    // (poner aria-label sobre un texto visible lo taparia para quien navega
    // por voz, porque el nombre accesible dejaria de coincidir).
    var rotular = function () {
      var oscuro = estaOscuro();
      Array.prototype.forEach.call(botonesTema, function (boton) {
        var texto = boton.querySelector('[data-tema-texto]');
        if (texto) {
          texto.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
        } else {
          boton.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
        }
      });
    };

    rotular();

    Array.prototype.forEach.call(botonesTema, function (boton) {
      boton.addEventListener('click', function () {
        var siguiente = estaOscuro() ? 'claro' : 'oscuro';
        raiz.dataset.tema = siguiente;
        try { localStorage.setItem('tema', siguiente); } catch (e) { /* sin guardar */ }
        rotular();
      });
    });

    // Si cambia el tema del sistema y el visitante nunca eligio, lo seguimos.
    if (consultaOscuro.addEventListener) {
      consultaOscuro.addEventListener('change', function () {
        if (!raiz.dataset.tema) rotular();
      });
    }
  }

  /* ---------- Volver arriba ----------
     El desplazamiento suave lo pone el CSS (html { scroll-behavior: smooth }),
     que ya se apaga solo con prefers-reduced-motion. Por eso aqui NO se pasa
     "behavior": asi la preferencia de quien visita se respeta sin codigo. */
  var btnSubir = document.getElementById('btnSubir');

  if (btnSubir) {
    var UMBRAL = 600;
    var pedido = false;

    var revisarScroll = function () {
      pedido = false;
      btnSubir.classList.toggle('se-ve', window.scrollY > UMBRAL);
    };

    // El evento scroll se dispara muchisimas veces por segundo: se agrupa en
    // un frame para no hacer trabajo de mas.
    window.addEventListener('scroll', function () {
      if (pedido) return;
      pedido = true;
      window.requestAnimationFrame(revisarScroll);
    }, { passive: true });

    revisarScroll();

    btnSubir.addEventListener('click', function () {
      window.scrollTo({ top: 0 });
      // Quien navega con teclado tiene que quedar arriba tambien, no solo la
      // pagina: sin esto el foco se queda perdido al final del documento.
      var marca = document.querySelector('.brand');
      if (marca) marca.focus({ preventScroll: true });
    });
  }

  /* ---------- Recorrido guiado sobre la captura de cada proyecto ----------
     Cada parada acerca la imagen a una zona concreta y explica que se esta
     mirando. La captura es real, asi que el recorrido muestra el sistema de
     verdad en vez de describirlo.

     Si este JS no corre, los numeros quedan como botones inertes, la barra
     sigue oculta y la captura se ve entera: la pagina no depende de esto
     para entenderse. */
  function montarRecorrido(figura) {
    var visor = figura.querySelector('.visor[data-recorrido]');
    if (!visor) return;

    var shot = visor.querySelector('.pp-shot');
    var paradas = Array.prototype.slice.call(visor.querySelectorAll('.visor-punto'));
    var barra = figura.querySelector('.visor-barra');
    var nota = figura.querySelector('.visor-nota');
    var pos = figura.querySelector('.visor-pos');
    var salir = figura.querySelector('.visor-salir');
    var pie = figura.querySelector('figcaption');
    if (!shot || !paradas.length || !barra || !nota || !pos) return;

    var actual = -1;   // -1 es la vista completa
    var ACERCAR = 1.8; // cuanto se amplia la captura en cada parada.
                       // Mas que esto empasta: las capturas miden 800px de
                       // ancho y el visor ya las muestra a casi ese tamano.

    /* Deja la parada en el centro del visor sin que la imagen descubra un
       hueco. Con transform-origin en la esquina, un punto que esta en la
       fraccion f de la imagen cae en f*z una vez ampliada; para llevarlo al
       centro hay que correr la imagen 0.5 - f*z. Ese corrimiento se limita
       al rango [1-z, 0], que es donde la imagen sigue tapando el visor: por
       eso las paradas muy al borde quedan cerca del borde y no al medio. */
    function corrimiento(fraccion) {
      var ideal = 0.5 - fraccion * ACERCAR;
      return Math.min(0, Math.max(1 - ACERCAR, ideal)) * 100;
    }

    function mostrar(i) {
      actual = i < 0 || i >= paradas.length ? -1 : i;

      if (actual === -1) {
        visor.removeAttribute('data-activo');
        shot.style.removeProperty('--tx');
        shot.style.removeProperty('--ty');
        shot.style.removeProperty('--z');
        nota.hidden = true;
        if (pie) pie.hidden = false;
        if (salir) salir.hidden = true;
        pos.textContent = paradas.length + ' paradas';
        return;
      }

      var punto = paradas[actual];
      var fx = parseFloat(punto.style.getPropertyValue('--px')) / 100;
      var fy = parseFloat(punto.style.getPropertyValue('--py')) / 100;
      shot.style.setProperty('--z', ACERCAR);
      shot.style.setProperty('--tx', corrimiento(fx) + '%');
      shot.style.setProperty('--ty', corrimiento(fy) + '%');
      visor.setAttribute('data-activo', String(actual));
      nota.textContent = punto.dataset.texto || '';
      nota.hidden = false;
      if (pie) pie.hidden = true;
      if (salir) salir.hidden = false;
      pos.textContent = actual + 1 + ' / ' + paradas.length;
    }

    paradas.forEach(function (punto, i) {
      punto.addEventListener('click', function () { mostrar(i); });
    });

    Array.prototype.forEach.call(barra.querySelectorAll('.visor-nav'), function (boton) {
      boton.addEventListener('click', function () {
        var paso = Number(boton.dataset.paso);
        // Desde la vista completa, "siguiente" entra por la primera parada y
        // "anterior" por la ultima. Despues el recorrido da la vuelta.
        var destino = actual < 0
          ? (paso > 0 ? 0 : paradas.length - 1)
          : (actual + paso + paradas.length) % paradas.length;
        mostrar(destino);
      });
    });

    if (salir) salir.addEventListener('click', function () { mostrar(-1); });

    figura.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && actual !== -1) { mostrar(-1); }
    });

    barra.hidden = false;
    mostrar(-1);
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

  // Se llama al cargar y, en el editor, cada vez que se repinta la lista de proyectos.
  window.__montarProyectos = function (raiz) {
    raiz = raiz || document;
    Array.prototype.forEach.call(raiz.querySelectorAll('.pp-boceto'), montarRecorrido);
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-tabs]'), montarTabs);
  };
  window.__montarProyectos(document);

  // ---------- Formulario de contacto ----------
  var form = document.getElementById('contactForm');
  if (!form) return;

  var note = document.getElementById('formNote');
  var btn = document.getElementById('submitBtn');

  function setNote(text, kind) {
    note.className = 'form-note' + (kind ? ' ' + kind : '');
    note.textContent = text;
  }

  // Si el envío falla, la pestaña con el aviso no puede quedarse ahí colgada.
  var pestana = null;
  function cerrarPestana() {
    try {
      if (pestana && !pestana.closed) pestana.close();
    } catch (err) { /* ya no se puede tocar */ }
    pestana = null;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      setNote('Revisa los campos marcados con *.', 'err');
      form.reportValidity();
      return;
    }

    var datos = Object.fromEntries(new FormData(form).entries());

    /* La pestaña se abre AQUI, no al recibir la respuesta. Abrirla después del
       await la convierte en una emergente sin gesto detras, y el navegador la
       bloquea. Abierta en el mismo clic, luego solo se le cambia el destino.
       Mientras tanto no queda en blanco: se le escribe un aviso. */
    try {
      pestana = window.open('', '_blank');
      if (pestana) {
        pestana.document.write(
          '<!doctype html><meta charset="utf-8"><title>Abriendo WhatsApp…</title>' +
            '<body style="margin:0;display:grid;place-items:center;height:100vh;' +
            'font:16px/1.5 system-ui,sans-serif;color:#56554e">Abriendo WhatsApp…</body>'
        );
        pestana.document.close();
      }
    } catch (err) {
      pestana = null;
    }

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

      if (!data.whatsappUrl) {
        cerrarPestana();
        setNote('Listo, recibimos tu mensaje. Te escribimos pronto.', 'ok');
      } else if (pestana && !pestana.closed) {
        // replace() y no href: así el aviso no queda en el historial y el botón
        // "atrás" de WhatsApp devuelve al visitante a la landing.
        pestana.location.replace(data.whatsappUrl);
        try { pestana.opener = null; } catch (err) { /* ya es de otro dominio */ }
        setNote('Abrimos WhatsApp con tu mensaje listo. Revísalo y presiona enviar.', 'ok');
      } else {
        // El navegador bloqueó la pestaña: se ofrece el enlace, como antes.
        setNote('Listo, recibimos tu mensaje.', 'ok');
        var a = document.createElement('a');
        a.href = data.whatsappUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Continuar por WhatsApp';
        note.appendChild(document.createTextNode(' '));
        note.appendChild(a);
      }
    } catch (err) {
      cerrarPestana();
      setNote(err.message || 'Hubo un problema. Intenta de nuevo.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  });

  // ---------- Animacion de entrada de las secciones (elegida en el editor) ----------
  (function () {
    var els = document.querySelectorAll('[data-anim]');
    if (!els.length) return;
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || !('IntersectionObserver' in window) || document.body.classList.contains('sin-anim')) {
      Array.prototype.forEach.call(els, function (e) { e.classList.add('visto'); });
      return;
    }
    document.documentElement.classList.add('js-anim');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('visto');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1 });
    Array.prototype.forEach.call(els, function (e) { io.observe(e); });
  })();

  // ---------- Movimiento: revelado al hacer scroll, luz del mouse, menu ----------
  (function () {
    var body = document.body;
    var editando = body.classList.contains('modo-edicion');
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Menu: se oscurece y gana sombra al bajar
    var nav = document.querySelector('.nav');
    if (nav) {
      var marcarNav = function () { nav.classList.toggle('is-scrolled', window.scrollY > 12); };
      marcarNav();
      window.addEventListener('scroll', marcarNav, { passive: true });
    }

    // Revelado escalonado de tarjetas, titulos y bloques
    var objetivos = document.querySelectorAll('.head, .specs, .feat, .step, .proj-tabs, .proj-panels, .proj-foot, .contact-list li, .contact-note, .form, .foot-inner > *:not(.foot-end)');
    if (objetivos.length && !editando && !quieto && !body.classList.contains('sin-anim') && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('js-rev');
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      Array.prototype.forEach.call(objetivos, function (el) {
        var hermanos = el.parentElement ? Array.prototype.slice.call(el.parentElement.children) : [el];
        el.style.setProperty('--rd', Math.min(hermanos.indexOf(el), 6) * 90 + 'ms');
        el.setAttribute('data-rev', '');
        io.observe(el);
      });
    }
  })();

  // ---------- Escena animada, contadores, palabras que rotan y pausas ----------
  (function () {
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var sinAnim = document.body.classList.contains('sin-anim');
    var hover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    // La escena se dibuja en una caja de 560px y se escala al ancho disponible
    var escena = document.querySelector('.scene');
    if (escena) {
      var ajustar = function () { escena.style.setProperty('--k', String(escena.clientWidth / 560)); };
      ajustar();
      if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(escena);
      else window.addEventListener('resize', ajustar);
    }

    // Contadores: cuentan hasta su valor al entrar en pantalla y algunos siguen "en vivo"
    var formato = function (el, n) {
      el.textContent = (el.dataset.prefix || '') + Math.round(n).toLocaleString('en-US') + (el.dataset.suffix || '');
    };
    var contar = function (el, hasta, ms) {
      var desde = Number(el.dataset.actual || 0), t0 = null;
      if (quieto || sinAnim) { el.dataset.actual = hasta; formato(el, hasta); return; }
      var paso = function (t) {
        if (t0 === null) t0 = t;
        var f = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - f, 3);
        formato(el, desde + (hasta - desde) * e);
        if (f < 1) requestAnimationFrame(paso); else el.dataset.actual = hasta;
      };
      requestAnimationFrame(paso);
    };
    var contadores = document.querySelectorAll('[data-count]');
    var vivos = [];
    var ioCont = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        var el = x.target;
        ioCont.unobserve(el);
        el.dataset.valor = el.dataset.count;
        contar(el, Number(el.dataset.count), 1700);
        if (el.dataset.live) vivos.push(el);
      });
    }, { threshold: 0.4 }) : null;
    Array.prototype.forEach.call(contadores, function (el) {
      if (ioCont) ioCont.observe(el); else { el.dataset.actual = el.dataset.count; formato(el, Number(el.dataset.count)); }
    });
    if (!quieto && !sinAnim) {
      setInterval(function () {
        if (document.hidden) return;
        vivos.forEach(function (el) {
          if (el.closest('.fuera')) return;
          var v = Number(el.dataset.valor || el.dataset.count) + Math.round(Math.random() * Number(el.dataset.live));
          el.dataset.valor = v;
          contar(el, v, 900);
        });
      }, 2600);
    }

    // Palabras que rotan bajo el titular
    var rot = document.querySelector('.rot-words[data-words]');
    if (rot) {
      var palabras = rot.dataset.words.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
      if (palabras.length > 1 && !quieto && !sinAnim) {
        var idx = 0;
        setInterval(function () {
          if (document.hidden) return;
          idx = (idx + 1) % palabras.length;
          var nuevo = document.createElement('span');
          nuevo.className = 'rot-w';
          nuevo.textContent = palabras[idx];
          rot.replaceChildren(nuevo);
        }, 2600);
      }
    }

    // Parallax suave de la escena con el mouse
    var hero = document.querySelector('.hero');
    if (hero && escena && hover && !quieto && !sinAnim) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        escena.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * -2);
        escena.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * -2);
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { escena.style.setProperty('--px', 0); escena.style.setProperty('--py', 0); });
    }

    // Los pasos arrancan sus iconos y su linea al entrar en pantalla
    var pasos = document.querySelector('.steps');
    if (pasos) {
      if ('IntersectionObserver' in window) {
        var ioPasos = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { pasos.classList.add('go'); ioPasos.disconnect(); }
        }, { threshold: 0.25 });
        ioPasos.observe(pasos);
      } else pasos.classList.add('go');
    }

    // Todo lo animado se pausa cuando no se ve (ahorra bateria y CPU)
    var animados = document.querySelectorAll('.scene, .feat-art, .chat-card, .marquee, .steps');
    if ('IntersectionObserver' in window) {
      var ioPausa = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          var dentro = x.isIntersecting;
          x.target.classList.toggle('fuera', !dentro);
          Array.prototype.forEach.call(x.target.querySelectorAll('svg'), function (svg) {
            try { if (dentro) svg.unpauseAnimations(); else svg.pauseAnimations(); } catch (e) { /* sin SMIL */ }
          });
        });
      }, { rootMargin: '120px 0px' });
      Array.prototype.forEach.call(animados, function (el) { el.classList.add('fuera'); ioPausa.observe(el); });
    }
  })();

  // ---------- Carrusel automatico de proyectos (se detiene al interactuar) ----------
  (function () {
    var proj = document.querySelector('.proj');
    if (!proj || document.body.classList.contains('modo-edicion')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.body.classList.contains('sin-anim')) return;
    var tabs = Array.prototype.slice.call(proj.querySelectorAll('.proj-tab'));
    if (tabs.length < 2) return;
    // Solo avanza mientras la seccion esta a la vista; un clic del visitante lo detiene
    var detenido = false, aLaVista = false;
    var aplicar = function () { proj.classList.toggle('auto', aLaVista && !detenido); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { aLaVista = en[0].isIntersecting; aplicar(); }, { threshold: 0.35 }).observe(proj);
    } else { aLaVista = true; aplicar(); }
    var parar = function () { detenido = true; aplicar(); };
    // Un clic o una tecla del visitante apaga el avance automatico para siempre
    proj.addEventListener('click', function (e) { if (e.isTrusted) parar(); });
    proj.addEventListener('keydown', parar);
    proj.addEventListener('animationend', function (e) {
      if (e.animationName !== 'progreso' || !proj.classList.contains('auto')) return;
      var i = tabs.findIndex(function (t) { return t.classList.contains('is-active'); });
      var sig = tabs[(i + 1) % tabs.length];
      // El clic programatico no cuenta como interaccion del visitante (isTrusted = false)
      sig.click();
    });
  })();

  // ---------- "Ver el ejemplo": abre el proyecto indicado en la seccion de proyectos ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-ver-proyecto]');
    if (!a || document.body.classList.contains('modo-edicion')) return;
    var tab = document.getElementById('tab-' + a.dataset.verProyecto);
    if (tab) tab.click(); // el enlace #proyectos hace el desplazamiento
  });
})();
