/**
 * Bloques — el "motor" del constructor de paginas.
 *
 * Este archivo lo usan DOS lados con el mismo codigo, para que lo que se ve en
 * el editor sea exactamente lo que se publica:
 *   - el navegador (constructor.js dibuja el lienzo con render(doc, {editor:true}))
 *   - el servidor  (server.js lo carga con require() para la pagina publica y
 *                   para limpiar lo que llega al guardar)
 *
 * Documento:
 * {
 *   v: 1,
 *   tema: { acento, fondo, texto, fuente, bordes },
 *   secciones: [
 *     { id, ...campos de SECCION, cols: [ [elemento, ...], [elemento, ...] ] }
 *   ]
 * }
 * elemento = { id, tipo, ...campos de ELEMENTOS[tipo] }
 *
 * Seguridad: NUNCA se guarda ni se dibuja HTML escrito por el usuario. Todo
 * texto se escapa, las URLs se validan y los colores solo pueden ser #hex. Asi
 * una pagina no puede ejecutar codigo aunque alguien manipule el JSON.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Bloques = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------
  // Catalogo de campos (lo usan el limpiador, el renderer y el inspector)
  // ------------------------------------------------------------------
  var ALINEAR = [['', 'Auto'], ['izq', 'Izq.'], ['centro', 'Centro'], ['der', 'Der.']];
  var TAM = [['s', 'Chico'], ['m', 'Normal'], ['l', 'Grande']];

  var MARCOS = [
    ['ninguno', 'Sin marco'], ['redondeado', 'Redondeado'], ['circulo', 'Círculo'],
    ['sombra', 'Sombra'], ['borde', 'Borde'], ['polaroid', 'Polaroid'],
    ['navegador', 'Navegador'], ['telefono', 'Teléfono'],
  ];

  var ELEMENTOS = {
    titulo: {
      nombre: 'Título', icono: 'H',
      campos: [
        { k: 'texto', t: 'area', def: 'Un título que llame la atención', max: 300, label: 'Texto' },
        { k: 'nivel', t: 'enum', def: '2', label: 'Tamaño', op: [['1', 'Grande'], ['2', 'Medio'], ['3', 'Chico']] },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    texto: {
      nombre: 'Texto', icono: '¶',
      campos: [
        { k: 'texto', t: 'area', def: 'Escribe aquí tu texto. Cuenta lo que haces, para quién y por qué importa.', max: 3000, label: 'Texto' },
        { k: 'tam', t: 'enum', def: 'm', label: 'Tamaño', op: TAM },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    imagen: {
      nombre: 'Imagen', icono: '▣',
      campos: [
        { k: 'src', t: 'imagen', def: '', label: 'Imagen' },
        { k: 'alt', t: 'texto', def: '', max: 200, label: 'Descripción (accesibilidad)' },
        { k: 'marco', t: 'enum', def: 'ninguno', label: 'Marco', op: MARCOS },
        { k: 'ancho', t: 'num', def: 100, min: 10, max: 100, step: 5, label: 'Ancho (%)' },
        { k: 'ratio', t: 'enum', def: 'auto', label: 'Proporción', op: [['auto', 'Original'], ['1:1', '1:1'], ['4:3', '4:3'], ['16:9', '16:9'], ['3:4', '3:4']] },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
        { k: 'url', t: 'url', def: '', label: 'Enlace al hacer clic (opcional)' },
        { k: 'nueva', t: 'bool', def: false, label: 'Abrir enlace en pestaña nueva' },
      ],
    },
    boton: {
      nombre: 'Botón', icono: '▭',
      campos: [
        { k: 'texto', t: 'texto', def: 'Haz clic aquí', max: 80, label: 'Texto' },
        { k: 'url', t: 'url', def: '#contacto', max: 500, label: 'Enlace' },
        { k: 'estilo', t: 'enum', def: 'solido', label: 'Estilo', op: [['solido', 'Sólido'], ['linea', 'Borde'], ['suave', 'Suave']] },
        { k: 'tam', t: 'enum', def: 'm', label: 'Tamaño', op: TAM },
        { k: 'color', t: 'color', def: '', label: 'Color del botón' },
        { k: 'forma', t: 'enum', def: '', label: 'Forma', op: [['', 'Auto'], ['pildora', 'Píldora'], ['suave', 'Suave'], ['recto', 'Recto']] },
        { k: 'enLinea', t: 'bool', def: false, label: 'En la misma línea que el anterior' },
        { k: 'completo', t: 'bool', def: false, label: 'Ancho completo' },
        { k: 'nueva', t: 'bool', def: false, label: 'Abrir en pestaña nueva' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    enlace: {
      nombre: 'Enlace', icono: '↗',
      campos: [
        { k: 'texto', t: 'texto', def: 'Saber más →', max: 120, label: 'Texto' },
        { k: 'url', t: 'url', def: '#', max: 500, label: 'Enlace' },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'nueva', t: 'bool', def: false, label: 'Abrir en pestaña nueva' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    tarjeta: {
      nombre: 'Tarjeta', icono: '▤',
      campos: [
        { k: 'icono', t: 'texto', def: '★', max: 8, label: 'Icono (emoji o símbolo)' },
        { k: 'titulo', t: 'texto', def: 'Una ventaja clave', max: 120, label: 'Título' },
        { k: 'texto', t: 'area', def: 'Explica en una o dos frases por qué esto le sirve a tu cliente.', max: 600, label: 'Texto' },
        { k: 'estilo', t: 'enum', def: 'borde', label: 'Estilo', op: [['borde', 'Borde'], ['sombra', 'Sombra'], ['plana', 'Plana']] },
        { k: 'forma', t: 'enum', def: '', label: 'Forma', op: [['', 'Auto'], ['pildora', 'Píldora'], ['suave', 'Suave'], ['recto', 'Recto']] },
        { k: 'url', t: 'url', def: '', max: 500, label: 'Enlace (opcional)' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    lista: {
      nombre: 'Lista', icono: '≡',
      campos: [
        { k: 'items', t: 'items', def: [{ texto: 'Primer punto' }, { texto: 'Segundo punto' }, { texto: 'Tercer punto' }], max: 20, sub: [{ k: 'texto', t: 'texto', def: '', max: 200, label: 'Texto' }], label: 'Puntos' },
        { k: 'icono', t: 'enum', def: '✓', label: 'Viñeta', op: [['✓', '✓'], ['•', '•'], ['→', '→'], ['★', '★'], ['+', '+'], ['✕', '✕'], ['–', '–']] },
        { k: 'color', t: 'color', def: '', label: 'Color del texto' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
      ],
    },
    menu: {
      nombre: 'Menú', icono: '☰',
      campos: [
        { k: 'items', t: 'items', def: [{ texto: 'Inicio', url: '#inicio' }, { texto: 'Servicios', url: '#servicios' }, { texto: 'Contacto', url: '#contacto' }], max: 12, sub: [{ k: 'texto', t: 'texto', def: 'Enlace', max: 60, label: 'Texto' }, { k: 'url', t: 'url', def: '#', max: 500, label: 'Enlace' }], label: 'Enlaces' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
      ],
    },
    estadistica: {
      nombre: 'Número', icono: '#',
      campos: [
        { k: 'valor', t: 'texto', def: '+120', max: 20, label: 'Número' },
        { k: 'etiqueta', t: 'texto', def: 'Clientes felices', max: 80, label: 'Etiqueta' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    video: {
      nombre: 'Video', icono: '▶',
      campos: [
        { k: 'url', t: 'url', def: '', max: 300, label: 'Enlace de YouTube o Vimeo' },
        { k: 'ratio', t: 'enum', def: '16:9', label: 'Proporción', op: [['16:9', '16:9'], ['4:3', '4:3'], ['1:1', '1:1']] },
      ],
    },
    formulario: {
      nombre: 'Formulario', icono: '✉',
      campos: [
        { k: 'titulo', t: 'texto', def: 'Escríbenos', max: 120, label: 'Título' },
        { k: 'boton', t: 'texto', def: 'Enviar mensaje', max: 60, label: 'Texto del botón' },
        { k: 'exito', t: 'texto', def: '¡Gracias! Te responderemos muy pronto.', max: 200, label: 'Mensaje al enviar' },
        { k: 'telefono', t: 'bool', def: false, label: 'Pedir teléfono' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
      ],
    },
    insignia: {
      nombre: 'Etiqueta', icono: '◉',
      campos: [
        { k: 'texto', t: 'texto', def: '✨ Novedad', max: 60, label: 'Texto' },
        { k: 'estilo', t: 'enum', def: 'suave', label: 'Estilo', op: [['suave', 'Suave'], ['solido', 'Sólido'], ['linea', 'Borde']] },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    cita: {
      nombre: 'Cita', icono: '❝',
      campos: [
        { k: 'texto', t: 'area', def: 'Una frase que resuma lo mejor que dicen de ti.', max: 500, label: 'Cita' },
        { k: 'autor', t: 'texto', def: 'Nombre Apellido', max: 80, label: 'Autor' },
        { k: 'cargo', t: 'texto', def: 'Cargo, Empresa', max: 100, label: 'Cargo o empresa' },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'escala', t: 'num', def: 100, min: 50, max: 220, step: 5, label: 'Tamaño (%)' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
    espacio: {
      nombre: 'Espacio', icono: '↕',
      campos: [{ k: 'alto', t: 'num', def: 32, min: 4, max: 240, step: 4, label: 'Alto (px)' }],
    },
    linea: {
      nombre: 'Línea', icono: '—',
      campos: [
        { k: 'ancho', t: 'num', def: 100, min: 10, max: 100, step: 5, label: 'Ancho (%)' },
        { k: 'color', t: 'color', def: '', label: 'Color' },
        { k: 'alinear', t: 'enum', def: '', label: 'Alineación', op: ALINEAR },
      ],
    },
  };

  var SECCION = [
    { k: 'fondoTipo', t: 'enum', def: 'color', label: 'Fondo', op: [['color', 'Color'], ['acento', 'Acento'], ['degradado', 'Degradado'], ['aurora', 'Aurora'], ['puntos', 'Puntos'], ['malla', 'Malla'], ['imagen', 'Imagen']] },
    { k: 'fondo', t: 'color', def: '', label: 'Color de fondo', si: ['fondoTipo', ['color', 'degradado', 'aurora', 'puntos', 'malla']] },
    { k: 'fondo2', t: 'color', def: '#2563eb', label: 'Segundo color', si: ['fondoTipo', ['degradado', 'aurora']] },
    { k: 'fondoImagen', t: 'imagen', def: '', label: 'Imagen de fondo', si: ['fondoTipo', ['imagen']] },
    { k: 'oscurecer', t: 'num', def: 40, min: 0, max: 80, step: 5, label: 'Oscurecer imagen (%)', si: ['fondoTipo', ['imagen']] },
    { k: 'texto', t: 'color', def: '', label: 'Color del texto (auto si está vacío)' },
    { k: 'padding', t: 'enum', def: 'l', label: 'Espacio vertical', op: [['s', 'Poco'], ['m', 'Medio'], ['l', 'Mucho'], ['xl', 'Enorme']] },
    { k: 'ancho', t: 'enum', def: 'normal', label: 'Ancho del contenido', op: [['angosto', 'Angosto'], ['normal', 'Normal'], ['completo', 'Completo']] },
    { k: 'alinear', t: 'enum', def: 'izq', label: 'Alineación', op: [['izq', 'Izq.'], ['centro', 'Centro'], ['der', 'Der.']] },
    { k: 'vertical', t: 'enum', def: 'arriba', label: 'Alineación vertical', op: [['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']] },
    { k: 'proporcion', t: 'enum', def: '1-1', label: 'Proporción de columnas', op: [['1-1', '1 : 1'], ['2-1', '2 : 1'], ['1-2', '1 : 2']], si: ['#cols', [2]] },
    { k: 'separacion', t: 'enum', def: 'm', label: 'Separación entre columnas', op: [['s', 'Poca'], ['m', 'Media'], ['l', 'Mucha']], si: ['#cols', [2, 3, 4]] },
    { k: 'cajas', t: 'bool', def: false, label: 'Columnas como tarjetas', si: ['#cols', [2, 3, 4]] },
    { k: 'alto', t: 'enum', def: 'auto', label: 'Altura mínima', op: [['auto', 'Auto'], ['mitad', 'Media pantalla'], ['pantalla', 'Pantalla']] },
    { k: 'altoPx', t: 'num', def: 0, min: 0, max: 1000, step: 20, label: 'Altura mínima exacta (px, 0 = auto)' },
    { k: 'ancla', t: 'texto', def: '', max: 40, label: 'Ancla (para enlazar con #nombre)' },
  ];

  var TEMA = [
    { k: 'acento', t: 'color', def: '#6d28d9', label: 'Color principal' },
    { k: 'fondo', t: 'color', def: '#ffffff', label: 'Fondo de la página' },
    { k: 'texto', t: 'color', def: '#1a1a24', label: 'Color del texto' },
    { k: 'fuente', t: 'enum', def: 'inter', label: 'Tipografía', op: [['inter', 'Inter'], ['poppins', 'Poppins'], ['playfair', 'Playfair'], ['sistema', 'Sistema'], ['mono', 'Mono']] },
    { k: 'bordes', t: 'enum', def: 'redondo', label: 'Bordes', op: [['redondo', 'Redondos'], ['suave', 'Suaves'], ['recto', 'Rectos']] },
  ];

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  function nuevoId(pref) {
    var s = '';
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 7; i++) s += a[Math.floor(Math.random() * a.length)];
    return (pref || 'x') + '_' + s;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clip(v, max) {
    return String(v == null ? '' : v).replace(/\u0000/g, '').slice(0, max);
  }

  /** Solo #rgb o #rrggbb. Cualquier otra cosa -> '' (sin color). */
  function color(v) {
    v = String(v || '').trim().toLowerCase();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v) ? v : '';
  }

  /** Enlaces seguros. Devuelve '' si no es valido. Acepta correos y telefonos "a pelo". */
  function url(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || /[\u0000-\u001f"'<>\\]/.test(u)) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (u[0] === '#') return /^#[\w-]*$/.test(u) ? u : '';
    if (u[0] === '/') return u[1] === '/' ? '' : u;
    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(u)) return 'mailto:' + u;
    if (/^\+?[\d\s()-]{6,}$/.test(u)) return 'tel:' + u.replace(/[\s()-]/g, '');
    if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(u)) return 'https://' + u;
    return '';
  }

  /** Origen de imagen: ruta propia (/media/3, /img/..) o http(s). Nada de data: ni javascript:. */
  function src(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || u.length > 600) return '';
    if (/[\s"'()<>\\]/.test(u)) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u[0] === '/' && u[1] !== '/') return u;
    return '';
  }

  function luminancia(hex) {
    hex = color(hex);
    if (!hex) return 1;
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function textoSobre(hex) { return luminancia(hex) > 0.4 ? '#111111' : '#ffffff'; }

  function videoEmbed(u) {
    u = url(u);
    var m;
    if ((m = u.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([\w-]{11})/i)) ||
        (m = u.match(/^https?:\/\/youtu\.be\/([\w-]{11})/i))) {
      return 'https://www.youtube-nocookie.com/embed/' + m[1];
    }
    if ((m = u.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d{6,12})/i))) {
      return 'https://player.vimeo.com/video/' + m[1];
    }
    return '';
  }

  // ------------------------------------------------------------------
  // Limpieza: deja un documento valido venga lo que venga
  // ------------------------------------------------------------------
  function enSet(v, op, def) {
    for (var i = 0; i < op.length; i++) if (op[i][0] === v) return v;
    return def;
  }

  function limpiarCampo(c, v) {
    switch (c.t) {
      case 'texto': return clip(v == null ? c.def : v, c.max || 200);
      case 'area': return clip(v == null ? c.def : v, c.max || 3000);
      case 'url': return clip(v == null ? c.def : v, c.max || 500).trim();
      case 'imagen': return src(v);
      case 'color': return v == null ? c.def : color(v);
      case 'bool': return v == null ? !!c.def : v === true || v === 'true';
      case 'enum': return enSet(String(v), c.op, c.def);
      case 'num': {
        var n = Number(v);
        if (!isFinite(n)) n = c.def;
        return Math.min(c.max, Math.max(c.min, Math.round(n)));
      }
      case 'items': {
        var arr = Array.isArray(v) ? v : c.def;
        return arr.slice(0, c.max || 20).map(function (it) {
          var o = {};
          c.sub.forEach(function (s) { o[s.k] = limpiarCampo(s, it && typeof it === 'object' ? it[s.k] : undefined); });
          return o;
        });
      }
    }
    return v;
  }

  function limpiarLista(campos, obj) {
    var o = {};
    obj = obj && typeof obj === 'object' ? obj : {};
    campos.forEach(function (c) { o[c.k] = limpiarCampo(c, obj[c.k]); });
    return o;
  }

  function idValido(v, pref) {
    return typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : nuevoId(pref);
  }

  function limpiarElemento(el) {
    if (!el || typeof el !== 'object' || !ELEMENTOS[el.tipo]) return null;
    var o = limpiarLista(ELEMENTOS[el.tipo].campos, el);
    o.id = idValido(el.id, 'e');
    o.tipo = el.tipo;
    return o;
  }

  function limpiarSeccion(s) {
    if (!s || typeof s !== 'object') return null;
    var o = limpiarLista(SECCION, s);
    o.ancla = o.ancla.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    o.id = idValido(s.id, 's');
    var cols = Array.isArray(s.cols) ? s.cols.slice(0, 4) : [[]];
    if (!cols.length) cols = [[]];
    o.cols = cols.map(function (col) {
      return (Array.isArray(col) ? col : []).slice(0, 60).map(limpiarElemento).filter(Boolean);
    });
    return o;
  }

  function limpiarDoc(doc) {
    doc = doc && typeof doc === 'object' ? doc : {};
    var secs = Array.isArray(doc.secciones) ? doc.secciones.slice(0, 80) : [];
    return {
      v: 1,
      tema: limpiarLista(TEMA, doc.tema),
      secciones: secs.map(limpiarSeccion).filter(Boolean),
    };
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  function estilo(obj) {
    var s = '';
    for (var k in obj) if (obj[k] !== '' && obj[k] != null) s += k + ':' + obj[k] + ';';
    return s ? ' style="' + esc(s) + '"' : '';
  }

  function enlaceAttrs(u, nueva) {
    var h = url(u);
    if (!h) return ' href="#"' ;
    var a = ' href="' + esc(h) + '"';
    var externo = /^https?:/i.test(h);
    if (nueva) a += ' target="_blank"';
    if (nueva || externo) a += ' rel="noopener' + (externo ? ' noreferrer' : '') + '"';
    return a;
  }

  var FUENTES = {
    inter: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    poppins: "'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif",
    playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
    sistema: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  };
  var RADIOS = {
    redondo: { b: '999px', c: '20px', i: '18px' },
    suave: { b: '10px', c: '12px', i: '10px' },
    recto: { b: '0', c: '0', i: '0' },
  };

  /** Hoja de Google Fonts con las tipografias que ofrece el constructor. */
  var FUENTES_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@500;700&family=IBM+Plex+Mono:wght@400;500&display=swap';

  function renderElemento(el, sec, ed) {
    var ph = function (campo, texto) { return ed ? ' data-campo="' + campo + '" data-ph="' + esc(texto) + '"' : ''; };
    var inner = '';
    var extra = '';
    switch (el.tipo) {
      case 'titulo':
        inner = '<h' + el.nivel + ' class="pg-h n' + el.nivel + '"' +
          estilo({ color: el.color }) + ph('texto', 'Escribe un título') + '>' + esc(el.texto) + '</h' + el.nivel + '>';
        break;
      case 'texto':
        if (!el.texto && !ed) break;
        inner = '<p class="pg-p t-' + el.tam + '"' + estilo({ color: el.color }) + ph('texto', 'Escribe un texto') + '>' + esc(el.texto) + '</p>';
        break;
      case 'boton': {
        var bc = el.color || '';
        var st = { '--bc': bc };
        if (bc) st['--bt'] = textoSobre(bc);
        inner = '<a class="pg-btn b-' + el.estilo + ' t-' + el.tam + (el.completo ? ' completo' : '') + (el.forma ? ' f-' + el.forma : '') + '"' +
          enlaceAttrs(el.url, el.nueva) + estilo(st) + '><span' + ph('texto', 'Botón') + '>' + esc(el.texto) + '</span></a>';
        if (el.enLinea && !el.completo) extra = ' en-linea';
        break;
      }
      case 'enlace':
        inner = '<a class="pg-link"' + enlaceAttrs(el.url, el.nueva) + estilo({ color: el.color }) +
          '><span' + ph('texto', 'Enlace') + '>' + esc(el.texto) + '</span></a>';
        break;
      case 'imagen': {
        var s = src(el.src);
        var marco = el.marco;
        var ratio = marco === 'circulo' ? '1:1' : el.ratio;
        var img;
        if (s) {
          img = '<img src="' + esc(s) + '" alt="' + esc(el.alt) + '" loading="lazy" decoding="async"' + (ed ? ' draggable="false"' : '') + '>';
        } else if (ed) {
          img = '<div class="pg-img-vacia"><span>▣</span><small>Elige una imagen en el panel derecho</small></div>';
        } else {
          img = '';
        }
        if (!img) break;
        var fig = '<figure class="pg-img m-' + marco + (ratio !== 'auto' ? ' fijo r-' + ratio.replace(':', '-') : '') + '"' +
          estilo({ width: el.ancho < 100 ? el.ancho + '%' : '' }) + '>' + img + '</figure>';
        var h = url(el.url);
        inner = h && !ed ? '<a class="pg-img-link"' + enlaceAttrs(el.url, el.nueva) + '>' + fig + '</a>' : fig;
        break;
      }
      case 'tarjeta': {
        var cuerpo = (el.icono ? '<span class="pg-card-i"' + ph('icono', '★') + '>' + esc(el.icono) + '</span>' : '') +
          (el.titulo || ed ? '<h3 class="pg-card-t"' + ph('titulo', 'Título') + '>' + esc(el.titulo) + '</h3>' : '') +
          (el.texto || ed ? '<p class="pg-card-p"' + ph('texto', 'Texto') + '>' + esc(el.texto) + '</p>' : '');
        var caja = '<div class="pg-card c-' + el.estilo + (el.forma ? ' f-' + el.forma : '') + '">' + cuerpo + '</div>';
        inner = url(el.url) ? '<a class="pg-card-link"' + enlaceAttrs(el.url, false) + '>' + caja + '</a>' : caja;
        break;
      }
      case 'lista':
        inner = '<ul class="pg-list"' + estilo({ color: el.color, '--lc': el.color }) + '>' + el.items.map(function (it) {
          return '<li><span class="pg-li-i" aria-hidden="true">' + esc(el.icono) + '</span><span>' + esc(it.texto) + '</span></li>';
        }).join('') + '</ul>';
        break;
      case 'menu':
        inner = '<nav class="pg-menu">' + el.items.map(function (it) {
          return '<a' + enlaceAttrs(it.url, false) + '>' + esc(it.texto) + '</a>';
        }).join('') + '</nav>';
        break;
      case 'estadistica':
        inner = '<div class="pg-stat"><strong' + ph('valor', '0') + '>' + esc(el.valor) + '</strong><span' + ph('etiqueta', 'Etiqueta') + '>' + esc(el.etiqueta) + '</span></div>';
        break;
      case 'video': {
        var emb = videoEmbed(el.url);
        var rr = 'r-' + el.ratio.replace(':', '-');
        if (emb) {
          inner = '<div class="pg-video ' + rr + '"><iframe src="' + esc(emb) + '" title="Video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
        } else if (ed) {
          inner = '<div class="pg-video vacio ' + rr + '"><span>▶</span><small>Pega un enlace de YouTube o Vimeo en el panel derecho</small></div>';
        }
        break;
      }
      case 'formulario':
        inner = '<form class="pg-form" data-pg-form novalidate>' +
          (el.titulo || ed ? '<h3 class="pg-form-t"' + ph('titulo', 'Título') + '>' + esc(el.titulo) + '</h3>' : '') +
          '<label>Nombre<input name="nombre" type="text" maxlength="120" required autocomplete="name"' + (ed ? ' tabindex="-1"' : '') + '></label>' +
          '<label>Correo<input name="email" type="email" maxlength="160" required autocomplete="email"' + (ed ? ' tabindex="-1"' : '') + '></label>' +
          (el.telefono ? '<label>Teléfono<input name="telefono" type="tel" maxlength="40" autocomplete="tel"' + (ed ? ' tabindex="-1"' : '') + '></label>' : '') +
          '<label>Mensaje<textarea name="mensaje" rows="4" maxlength="2000" required' + (ed ? ' tabindex="-1"' : '') + '></textarea></label>' +
          '<button type="submit" class="pg-btn b-solido t-m completo"><span>' + esc(el.boton) + '</span></button>' +
          '<p class="pg-form-msg" role="status" data-exito="' + esc(el.exito) + '"></p></form>';
        break;
      case 'insignia':
        inner = '<span class="pg-badge i-' + el.estilo + '"' + estilo({ '--bc': el.color, '--bt': el.color ? textoSobre(el.color) : '' }) + ph('texto', 'Etiqueta') + '>' + esc(el.texto) + '</span>';
        break;
      case 'cita':
        inner = '<blockquote class="pg-quote"' + estilo({ color: el.color }) + '><p class="pg-quote-t"' + ph('texto', 'Escribe la cita') + '>' + esc(el.texto) + '</p>' +
          (el.autor || el.cargo || ed ? '<footer><strong' + ph('autor', 'Autor') + '>' + esc(el.autor) + '</strong>' +
            (el.cargo || ed ? '<span' + ph('cargo', 'Cargo') + '>' + esc(el.cargo) + '</span>' : '') + '</footer>' : '') + '</blockquote>';
        break;
      case 'espacio':
        inner = '<div class="pg-space"' + estilo({ height: el.alto + 'px' }) + '></div>';
        break;
      case 'linea':
        inner = '<hr class="pg-hr"' + estilo({ width: el.ancho < 100 ? el.ancho + '%' : '', 'border-color': el.color }) + '>';
        break;
    }
    if (!inner) return '';
    var al = el.alinear || (sec ? sec.alinear : 'izq');
    var kst = el.escala && el.escala !== 100 ? ' style="--k:' + (el.escala / 100) + '"' : '';
    return '<div class="pg-el e-' + el.tipo + ' al-' + al + extra + '"' + kst +
      (ed ? ' data-el="' + esc(el.id) + '" data-tipo="' + el.tipo + '"' : '') + '>' + inner + '</div>';
  }

  var COLS = { 1: '1fr', 3: 'repeat(3,minmax(0,1fr))', 4: 'repeat(4,minmax(0,1fr))' };
  function plantillaCols(s) {
    var n = s.cols.length;
    if (n === 2) return s.proporcion === '2-1' ? 'minmax(0,2fr) minmax(0,1fr)' : s.proporcion === '1-2' ? 'minmax(0,1fr) minmax(0,2fr)' : 'repeat(2,minmax(0,1fr))';
    return COLS[n] || '1fr';
  }

  function renderSeccion(s, ed) {
    var st = {};
    var capa = '';
    if (s.fondoTipo === 'acento') {
      st.background = 'var(--pg-acento)';
      st.color = 'var(--pg-acento-t)';
    } else if (s.fondoTipo === 'degradado') {
      var c1 = s.fondo || '#6d28d9';
      st.background = 'linear-gradient(135deg,' + c1 + ',' + (s.fondo2 || '#2563eb') + ')';
      st.color = textoSobre(c1);
    } else if (s.fondoTipo === 'aurora') {
      var base = s.fondo || '#0b1020';
      st['background-color'] = base;
      st['background-image'] = 'radial-gradient(60% 80% at 12% 15%,color-mix(in srgb,var(--pg-acento) 62%,transparent),transparent 70%),' +
        'radial-gradient(55% 75% at 88% 25%,color-mix(in srgb,' + (s.fondo2 || '#06b6d4') + ' 50%,transparent),transparent 70%),' +
        'radial-gradient(60% 60% at 55% 105%,color-mix(in srgb,#f472b6 38%,transparent),transparent 70%)';
      st.color = textoSobre(base);
    } else if (s.fondoTipo === 'puntos' || s.fondoTipo === 'malla') {
      if (s.fondo) { st['background-color'] = s.fondo; st.color = textoSobre(s.fondo); }
    } else if (s.fondoTipo === 'imagen') {
      var im = src(s.fondoImagen);
      if (im) {
        st['background-image'] = 'url(' + im + ')';
        capa = '<div class="pg-sec-ov" style="opacity:' + (s.oscurecer / 100) + '"></div>';
        st.color = s.oscurecer >= 30 ? '#ffffff' : '';
      } else {
        st.background = 'rgba(128,128,128,.12)';
      }
    } else if (s.fondo) {
      st.background = s.fondo;
      st.color = textoSobre(s.fondo);
    }
    if (s.texto) st.color = s.texto;

    var cols = s.cols.map(function (col) {
      var inner = col.map(function (el) { return renderElemento(el, s, ed); }).join('');
      if (ed && !inner) inner = '<div class="pg-col-vacia">Suelta aquí un elemento o pulsa uno del panel izquierdo</div>';
      return '<div class="pg-col' + (s.cajas && s.cols.length > 1 ? ' caja' : '') + '">' + inner + '</div>';
    }).join('');

    if (s.altoPx > 0) st['min-height'] = s.altoPx + 'px';
    return '<section class="pg-sec p-' + s.padding + ' w-' + s.ancho + ' al-' + s.alinear + ' v-' + s.vertical + ' h-' + (s.altoPx > 0 ? 'px' : s.alto) +
      ' n' + s.cols.length + ' bg-' + s.fondoTipo + '"' + (s.ancla ? ' id="' + esc(s.ancla) + '"' : '') +
      (ed ? ' data-sec="' + esc(s.id) + '"' : '') + estilo(st) + '>' + capa +
      '<div class="pg-wrap"><div class="pg-cols g-' + s.separacion + '" style="grid-template-columns:' + plantillaCols(s) + '">' +
      cols + '</div></div></section>';
  }

  /** Devuelve el HTML de la pagina (solo el contenido: <div class="pg">...</div>). */
  function render(doc, opt) {
    var ed = !!(opt && opt.editor);
    var d = limpiarDoc(doc);
    var t = d.tema;
    var r = RADIOS[t.bordes] || RADIOS.redondo;
    var vars = {
      '--pg-acento': t.acento, '--pg-acento-t': textoSobre(t.acento),
      '--pg-fondo': t.fondo, '--pg-texto': t.texto,
      '--pg-ff': FUENTES[t.fuente] || FUENTES.inter,
      '--pg-rb': r.b, '--pg-rc': r.c, '--pg-ri': r.i,
    };
    if (opt && opt.vars) for (var vk in opt.vars) vars[vk] = opt.vars[vk];
    var cuerpo = d.secciones.map(function (s) { return renderSeccion(s, ed); }).join('');
    if (ed && !cuerpo) cuerpo = '<div class="pg-vacio">Tu página está vacía. Elige una sección en el panel izquierdo.</div>';
    return '<div class="pg' + (ed ? ' pg-editor' : '') + '"' + estilo(vars) + '>' + cuerpo + '</div>';
  }

  // ------------------------------------------------------------------
  // Prefabs: secciones listas para usar
  // ------------------------------------------------------------------
  function E(tipo, props) {
    var o = limpiarLista(ELEMENTOS[tipo].campos, props || {});
    o.id = nuevoId('e');
    o.tipo = tipo;
    return o;
  }
  function S(props, cols) {
    var o = limpiarLista(SECCION, props || {});
    o.id = nuevoId('s');
    o.cols = cols.length ? cols : [[]];
    return o;
  }
  function encabezado(titulo, texto, ancla) {
    return S({ padding: 's', alinear: 'centro', ancho: 'angosto', ancla: ancla || '' }, [[
      E('titulo', { texto: titulo, nivel: '2' }),
      E('texto', { texto: texto, tam: 'l' }),
    ]]);
  }
  var IMG = '/img/plantillas/';
  var ANIO = new Date().getFullYear();

  var PREFABS = [
    {
      id: 'cabecera', nombre: 'Cabecera con menú', grupo: 'Estructura',
      crear: function () {
        return [S({ padding: 's', vertical: 'centro', separacion: 's' }, [
          [E('titulo', { texto: 'Mi Marca', nivel: '3' })],
          [E('menu', { alinear: 'der' })],
        ])];
      },
    },
    {
      id: 'anuncio', nombre: 'Barra de anuncio', grupo: 'Estructura',
      crear: function () {
        return [S({ fondoTipo: 'acento', padding: 's', alinear: 'centro', ancho: 'completo' }, [[
          E('texto', { texto: '🎉 Lanzamiento: 20% de descuento esta semana.', tam: 's' }),
        ]])];
      },
    },
    {
      id: 'hero-centro', nombre: 'Portada centrada', grupo: 'Portadas',
      crear: function () {
        return [S({ padding: 'xl', alinear: 'centro', ancho: 'angosto', ancla: 'inicio' }, [[
          E('texto', { texto: 'NUEVO', tam: 's', color: '#6d28d9' }),
          E('titulo', { texto: 'Una promesa clara que haga querer quedarse', nivel: '1' }),
          E('texto', { texto: 'Explica en dos líneas qué ofreces y qué problema resuelves. Sin vueltas.', tam: 'l' }),
          E('boton', { texto: 'Empezar ahora', url: '#contacto' }),
          E('boton', { texto: 'Ver más', url: '#servicios', estilo: 'linea', enLinea: true }),
        ]])];
      },
    },
    {
      id: 'hero-imagen', nombre: 'Portada con imagen', grupo: 'Portadas',
      crear: function () {
        return [S({ padding: 'xl', vertical: 'centro', separacion: 'l', ancla: 'inicio' }, [
          [
            E('titulo', { texto: 'Tu mejor versión empieza aquí', nivel: '1' }),
            E('texto', { texto: 'Una descripción corta y directa de lo que haces y cómo ayudas a tus clientes a lograr resultados.', tam: 'l' }),
            E('boton', { texto: 'Quiero saber más', url: '#contacto' }),
            E('boton', { texto: 'Ver servicios', url: '#servicios', estilo: 'linea', enLinea: true }),
          ],
          [E('imagen', { src: IMG + 'ph-hero.svg', alt: 'Ilustración', marco: 'redondeado' })],
        ])];
      },
    },
    {
      id: 'hero-fondo', nombre: 'Portada con imagen de fondo', grupo: 'Portadas',
      crear: function () {
        return [S({ fondoTipo: 'imagen', fondoImagen: IMG + 'ph-hero.svg', oscurecer: 35, padding: 'xl', alinear: 'centro', ancho: 'angosto', vertical: 'centro', alto: 'mitad', ancla: 'inicio' }, [[
          E('titulo', { texto: 'Dale vida a tu proyecto', nivel: '1' }),
          E('texto', { texto: 'Texto de apoyo sobre una imagen de fondo. Cambia la imagen en el panel derecho.', tam: 'l' }),
          E('boton', { texto: 'Contáctanos', url: '#contacto', color: '#ffffff' }),
        ]])];
      },
    },
    {
      id: 'caracteristicas', nombre: 'Tres ventajas', grupo: 'Contenido',
      crear: function () {
        return [
          encabezado('Por qué elegirnos', 'Tres razones que nos diferencian del resto.', 'servicios'),
          S({ padding: 'm' }, [
            [E('tarjeta', { icono: '⚡', titulo: 'Rápido', texto: 'Resultados en días, no en meses.' })],
            [E('tarjeta', { icono: '🎯', titulo: 'A tu medida', texto: 'Cada solución se adapta a tu negocio.' })],
            [E('tarjeta', { icono: '🤝', titulo: 'Con acompañamiento', texto: 'Estamos contigo antes y después.' })],
          ]),
        ];
      },
    },
    {
      id: 'texto-imagen', nombre: 'Texto + imagen', grupo: 'Contenido',
      crear: function () {
        return [S({ vertical: 'centro', separacion: 'l' }, [
          [E('imagen', { src: IMG + 'ph-foto-2.svg', alt: 'Imagen', marco: 'redondeado' })],
          [
            E('titulo', { texto: 'Cuenta tu historia', nivel: '2' }),
            E('texto', { texto: 'Un párrafo que explique quién eres, qué te mueve y por qué tus clientes pueden confiar en ti.' }),
            E('lista', { items: [{ texto: 'Experiencia comprobada' }, { texto: 'Atención personalizada' }, { texto: 'Resultados medibles' }] }),
            E('boton', { texto: 'Conocer más', url: '#contacto' }),
          ],
        ])];
      },
    },
    {
      id: 'imagen-texto', nombre: 'Imagen + texto (invertido)', grupo: 'Contenido',
      crear: function () {
        return [S({ vertical: 'centro', separacion: 'l' }, [
          [
            E('titulo', { texto: 'Lo que nos hace distintos', nivel: '2' }),
            E('texto', { texto: 'Describe aquí tu propuesta de valor con palabras simples y concretas.' }),
            E('enlace', { texto: 'Descubre cómo →', url: '#contacto' }),
          ],
          [E('imagen', { src: IMG + 'ph-foto-1.svg', alt: 'Imagen', marco: 'sombra' })],
        ])];
      },
    },
    {
      id: 'galeria', nombre: 'Galería con marcos', grupo: 'Contenido',
      crear: function () {
        return [
          encabezado('Galería', 'Muestra tu trabajo con marcos que lo hagan lucir.', 'galeria'),
          S({ padding: 'm' }, [
            [E('imagen', { src: IMG + 'ph-foto-1.svg', alt: 'Foto 1', marco: 'polaroid', ratio: '4:3' })],
            [E('imagen', { src: IMG + 'ph-foto-2.svg', alt: 'Foto 2', marco: 'polaroid', ratio: '4:3' })],
            [E('imagen', { src: IMG + 'ph-foto-3.svg', alt: 'Foto 3', marco: 'polaroid', ratio: '4:3' })],
          ]),
        ];
      },
    },
    {
      id: 'estadisticas', nombre: 'Números', grupo: 'Contenido',
      crear: function () {
        return [S({ alinear: 'centro', padding: 'm' }, [
          [E('estadistica', { valor: '+250', etiqueta: 'Clientes' })],
          [E('estadistica', { valor: '98%', etiqueta: 'Satisfacción' })],
          [E('estadistica', { valor: '10 años', etiqueta: 'De experiencia' })],
        ])];
      },
    },
    {
      id: 'video', nombre: 'Video', grupo: 'Contenido',
      crear: function () {
        return [S({ ancho: 'angosto', alinear: 'centro' }, [[
          E('titulo', { texto: 'Míralo en acción', nivel: '2' }),
          E('video', { url: '' }),
        ]])];
      },
    },
    {
      id: 'testimonio', nombre: 'Testimonio', grupo: 'Confianza',
      crear: function () {
        return [S({ ancho: 'angosto', alinear: 'centro', fondoTipo: 'color', fondo: '#f4f4f8' }, [[
          E('imagen', { src: IMG + 'ph-avatar.svg', alt: 'Cliente', marco: 'circulo', ancho: 15, alinear: 'centro' }),
          E('texto', { texto: '“Desde que trabajamos juntos, nuestras ventas se duplicaron. Totalmente recomendado.”', tam: 'l' }),
          E('titulo', { texto: 'María Gómez', nivel: '3' }),
          E('texto', { texto: 'Directora, Empresa Ejemplo', tam: 's' }),
        ]])];
      },
    },
    {
      id: 'precios', nombre: 'Planes y precios', grupo: 'Confianza',
      crear: function () {
        function plan(nombre, precio, items, estilo) {
          return [
            E('titulo', { texto: nombre, nivel: '3' }),
            E('titulo', { texto: precio, nivel: '1' }),
            E('texto', { texto: 'por mes', tam: 's' }),
            E('lista', { items: items.map(function (t) { return { texto: t }; }) }),
            E('boton', { texto: 'Elegir plan', url: '#contacto', estilo: estilo, completo: true }),
          ];
        }
        return [
          encabezado('Planes simples', 'Elige el que mejor se adapte a ti. Cambia de plan cuando quieras.', 'precios'),
          S({ padding: 'm', cajas: true, alinear: 'centro' }, [
            plan('Básico', '$19', ['1 proyecto', 'Soporte por correo', 'Actualizaciones'], 'linea'),
            plan('Pro', '$49', ['5 proyectos', 'Soporte prioritario', 'Reportes mensuales'], 'solido'),
            plan('Empresa', '$99', ['Proyectos ilimitados', 'Atención dedicada', 'A tu medida'], 'linea'),
          ]),
        ];
      },
    },
    {
      id: 'faq', nombre: 'Preguntas frecuentes', grupo: 'Confianza',
      crear: function () {
        return [
          encabezado('Preguntas frecuentes', 'Lo que más nos preguntan.', 'faq'),
          S({ ancho: 'angosto', padding: 'm' }, [[
            E('tarjeta', { icono: '', titulo: '¿Cuánto tarda el proyecto?', texto: 'Depende del alcance; normalmente entre 2 y 6 semanas.', estilo: 'borde' }),
            E('tarjeta', { icono: '', titulo: '¿Puedo hacer cambios después?', texto: 'Sí, incluimos ajustes y acompañamiento posterior.', estilo: 'borde' }),
            E('tarjeta', { icono: '', titulo: '¿Cómo es el pago?', texto: 'Un anticipo al comenzar y el resto contra entrega.', estilo: 'borde' }),
          ]]),
        ];
      },
    },
    {
      id: 'cta', nombre: 'Llamada a la acción', grupo: 'Conversión',
      crear: function () {
        return [S({ fondoTipo: 'degradado', fondo: '#6d28d9', fondo2: '#2563eb', alinear: 'centro', ancho: 'angosto', padding: 'xl' }, [[
          E('titulo', { texto: '¿Listo para dar el siguiente paso?', nivel: '2' }),
          E('texto', { texto: 'Cuéntanos tu idea y te respondemos en menos de 24 horas.', tam: 'l' }),
          E('boton', { texto: 'Hablemos', url: '#contacto', color: '#ffffff' }),
        ]])];
      },
    },
    {
      id: 'contacto', nombre: 'Contacto con formulario', grupo: 'Conversión',
      crear: function () {
        return [S({ ancla: 'contacto', separacion: 'l', vertical: 'centro' }, [
          [
            E('titulo', { texto: 'Hablemos', nivel: '2' }),
            E('texto', { texto: 'Escríbenos y te respondemos lo antes posible.' }),
            E('lista', { icono: '→', items: [{ texto: 'hola@tuempresa.com' }, { texto: '+591 70000000' }, { texto: 'Santa Cruz, Bolivia' }] }),
          ],
          [E('formulario')],
        ])];
      },
    },
    {
      id: 'pie', nombre: 'Pie de página', grupo: 'Estructura',
      crear: function () {
        return [S({ fondoTipo: 'color', fondo: '#111827', padding: 's', vertical: 'centro', separacion: 's' }, [
          [E('texto', { texto: '© ' + ANIO + ' Mi Marca. Todos los derechos reservados.', tam: 's' })],
          [E('menu', { alinear: 'der', items: [{ texto: 'Inicio', url: '#inicio' }, { texto: 'Contacto', url: '#contacto' }] })],
        ])];
      },
    },
    // ---------------- Portadas originales ----------------
    {
      id: 'hero-aurora', nombre: 'Portada aurora', grupo: 'Portadas',
      crear: function () {
        return [S({ fondoTipo: 'aurora', padding: 'xl', alinear: 'centro', ancho: 'angosto', ancla: 'inicio' }, [[
          E('insignia', { texto: '✨ Algo nuevo está llegando' }),
          E('titulo', { texto: 'Ideas que se ven, se sienten y se venden', nivel: '1' }),
          E('texto', { texto: 'Una frase corta que explique el valor de lo que haces, con la energía de un fondo que se mueve en colores.', tam: 'l' }),
          E('boton', { texto: 'Quiero empezar', url: '#contacto', tam: 'l' }),
          E('boton', { texto: 'Ver cómo funciona', url: '#pasos', estilo: 'linea', tam: 'l', enLinea: true }),
          E('espacio', { alto: 24 }),
          E('imagen', { src: IMG + 'ph-hero.svg', alt: 'Vista previa', marco: 'navegador', ancho: 90, alinear: 'centro' }),
        ]])];
      },
    },
    {
      id: 'hero-oscuro', nombre: 'Portada oscura con teléfono', grupo: 'Portadas',
      crear: function () {
        return [S({ fondoTipo: 'color', fondo: '#0b1020', padding: 'xl', vertical: 'centro', separacion: 'l', ancla: 'inicio' }, [
          [
            E('insignia', { texto: 'APP MÓVIL', estilo: 'linea' }),
            E('titulo', { texto: 'Tu negocio en el bolsillo de tus clientes', nivel: '1' }),
            E('texto', { texto: 'Cuenta en dos líneas qué problema resuelve tu producto y para quién está hecho.', tam: 'l' }),
            E('boton', { texto: 'Probar gratis', url: '#contacto', color: '#a78bfa' }),
            E('boton', { texto: 'Ver demo', url: '#video', estilo: 'linea', enLinea: true }),
            E('espacio', { alto: 8 }),
            E('lista', { items: [{ texto: 'Sin tarjeta de crédito' }, { texto: 'Listo en minutos' }] }),
          ],
          [E('imagen', { src: IMG + 'ph-hero.svg', alt: 'App', marco: 'telefono', ratio: '3:4', ancho: 80, alinear: 'centro' })],
        ])];
      },
    },
    {
      id: 'hero-puntos', nombre: 'Portada con puntos', grupo: 'Portadas',
      crear: function () {
        return [S({ fondoTipo: 'puntos', padding: 'xl', alinear: 'centro', ancho: 'angosto', ancla: 'inicio' }, [[
          E('insignia', { texto: '★ 4.9 · +500 clientes' }),
          E('titulo', { texto: 'Simple por fuera, potente por dentro', nivel: '1' }),
          E('texto', { texto: 'Un fondo de puntos sutil que da textura sin robar protagonismo al mensaje.', tam: 'l' }),
          E('boton', { texto: 'Comenzar ahora', url: '#contacto', tam: 'l' }),
          E('enlace', { texto: 'o conoce más →', url: '#servicios', alinear: 'centro' }),
        ]])];
      },
    },
    // ---------------- Contenido ----------------
    {
      id: 'cuatro', nombre: 'Cuatro características', grupo: 'Contenido',
      crear: function () {
        return [
          encabezado('Todo lo que necesitas', 'Cuatro piezas que trabajan juntas.', 'servicios'),
          S({ padding: 'm', cajas: true, separacion: 's' }, [
            [E('tarjeta', { icono: '🚀', titulo: 'Arranque rápido', texto: 'Empiezas en minutos.', estilo: 'plana', forma: 'recto' })],
            [E('tarjeta', { icono: '🔒', titulo: 'Seguro', texto: 'Tus datos protegidos.', estilo: 'plana', forma: 'recto' })],
            [E('tarjeta', { icono: '📈', titulo: 'Crece contigo', texto: 'Sin límites ocultos.', estilo: 'plana', forma: 'recto' })],
            [E('tarjeta', { icono: '💬', titulo: 'Soporte humano', texto: 'Personas, no bots.', estilo: 'plana', forma: 'recto' })],
          ]),
        ];
      },
    },
    {
      id: 'pasos', nombre: 'Cómo funciona (pasos)', grupo: 'Contenido',
      crear: function () {
        function paso(n, t, d) {
          return [E('estadistica', { valor: n, etiqueta: '' }), E('titulo', { texto: t, nivel: '3' }), E('texto', { texto: d, tam: 's' })];
        }
        return [
          encabezado('Cómo funciona', 'Tan fácil como contar hasta tres.', 'pasos'),
          S({ padding: 'm', separacion: 'l' }, [
            paso('01', 'Nos cuentas', 'Cuéntanos tu idea en una conversación sin compromiso.'),
            paso('02', 'Diseñamos', 'Te mostramos una propuesta clara con plazos y precio.'),
            paso('03', 'Construimos', 'Desarrollamos y lanzamos, tú ves el avance en cada paso.'),
          ]),
        ];
      },
    },
    {
      id: 'antes-despues', nombre: 'Antes y después', grupo: 'Contenido',
      crear: function () {
        return [
          encabezado('El cambio que vas a notar', '', 'cambio'),
          S({ padding: 'm', cajas: true, ancho: 'angosto' }, [
            [E('titulo', { texto: 'Antes', nivel: '3' }),
             E('lista', { icono: '✕', color: '#dc2626', items: [{ texto: 'Hojas de cálculo por todos lados' }, { texto: 'Clientes que se pierden' }, { texto: 'Horas en tareas repetidas' }] })],
            [E('titulo', { texto: 'Después', nivel: '3' }),
             E('lista', { icono: '✓', items: [{ texto: 'Todo en un solo lugar' }, { texto: 'Seguimiento automático' }, { texto: 'Tiempo para lo importante' }] })],
          ]),
        ];
      },
    },
    {
      id: 'cita-grande', nombre: 'Cita destacada', grupo: 'Contenido',
      crear: function () {
        return [S({ ancho: 'angosto', alinear: 'centro', padding: 'xl' }, [[
          E('cita', { texto: 'Lo mejor que hicimos fue confiar el proyecto a un equipo que entendió nuestro negocio.', autor: 'Carlos Rojas', cargo: 'Gerente, Empresa Ejemplo', escala: 120 }),
        ]])];
      },
    },
    {
      id: 'logos', nombre: 'Marcas que confían', grupo: 'Contenido',
      crear: function () {
        function marca(t) { return [E('titulo', { texto: t, nivel: '3', alinear: 'centro', color: '#8b8a99' })]; }
        return [
          S({ padding: 's', alinear: 'centro' }, [[E('texto', { texto: 'Confían en nosotros', tam: 's' })]]),
          S({ padding: 'm', vertical: 'centro' }, [marca('ACME'), marca('Globex'), marca('Initech'), marca('Umbrella')]),
        ];
      },
    },
    {
      id: 'equipo', nombre: 'Equipo', grupo: 'Contenido',
      crear: function () {
        function persona(n, c) {
          return [E('imagen', { src: IMG + 'ph-avatar.svg', alt: n, marco: 'circulo', ancho: 55, alinear: 'centro' }),
            E('titulo', { texto: n, nivel: '3', alinear: 'centro' }), E('texto', { texto: c, tam: 's', alinear: 'centro' })];
        }
        return [
          encabezado('El equipo', 'Personas reales detrás de cada proyecto.', 'equipo'),
          S({ padding: 'm' }, [persona('Ana Pérez', 'Dirección'), persona('Luis Mora', 'Desarrollo'), persona('Sofía Vega', 'Diseño'), persona('Marco Ruiz', 'Soporte')]),
        ];
      },
    },
    {
      id: 'mosaico', nombre: 'Mosaico de imágenes', grupo: 'Contenido',
      crear: function () {
        return [S({ padding: 'm', separacion: 's', ancho: 'completo' }, [
          [E('imagen', { src: IMG + 'ph-foto-1.svg', marco: 'redondeado', ratio: '3:4' }), E('imagen', { src: IMG + 'ph-foto-3.svg', marco: 'redondeado', ratio: '4:3' })],
          [E('imagen', { src: IMG + 'ph-foto-2.svg', marco: 'redondeado', ratio: '4:3' }), E('imagen', { src: IMG + 'ph-hero.svg', marco: 'redondeado', ratio: '3:4' })],
          [E('imagen', { src: IMG + 'ph-foto-3.svg', marco: 'redondeado', ratio: '3:4' }), E('imagen', { src: IMG + 'ph-foto-1.svg', marco: 'redondeado', ratio: '4:3' })],
        ])];
      },
    },
    {
      id: 'video-texto', nombre: 'Video + texto', grupo: 'Contenido',
      crear: function () {
        return [S({ vertical: 'centro', separacion: 'l', ancla: 'video' }, [
          [E('video', { url: '' })],
          [E('insignia', { texto: 'EN ACCIÓN' }), E('titulo', { texto: 'Mira cómo lo hacemos', nivel: '2' }),
           E('texto', { texto: 'Un video corto vale más que mil palabras. Pega el enlace de YouTube o Vimeo en el panel.' }),
           E('boton', { texto: 'Hablemos', url: '#contacto' })],
        ])];
      },
    },
    {
      id: 'app-features', nombre: 'Teléfono + beneficios', grupo: 'Contenido',
      crear: function () {
        return [S({ vertical: 'centro', separacion: 'l', fondoTipo: 'color', fondo: '#f4f4f8' }, [
          [E('imagen', { src: IMG + 'ph-hero.svg', alt: 'App', marco: 'telefono', ratio: '3:4', ancho: 75, alinear: 'centro' })],
          [E('titulo', { texto: 'Pensado para el día a día', nivel: '2' }),
           E('tarjeta', { icono: '⚡', titulo: 'Respuesta inmediata', texto: 'Todo carga al instante, incluso con mala señal.', estilo: 'plana' }),
           E('tarjeta', { icono: '🔔', titulo: 'Avisos útiles', texto: 'Solo las notificaciones que importan.', estilo: 'plana' }),
           E('tarjeta', { icono: '🔁', titulo: 'Siempre sincronizado', texto: 'Celular, tableta y computadora al día.', estilo: 'plana' })],
        ])];
      },
    },
    // ---------------- Confianza ----------------
    {
      id: 'testimonios-3', nombre: 'Tres testimonios', grupo: 'Confianza',
      crear: function () {
        function t(txt, a, c) { return [E('cita', { texto: txt, autor: a, cargo: c, escala: 80 })]; }
        return [
          encabezado('Lo que dicen de nosotros', '', 'testimonios'),
          S({ padding: 'm', cajas: true }, [
            t('Nos ahorró horas todos los días.', 'María Gómez', 'Directora, Empresa A'),
            t('Entendieron el negocio desde la primera reunión.', 'Pedro Salas', 'CEO, Empresa B'),
            t('Cumplieron plazos y superaron lo esperado.', 'Lucía Ortiz', 'Gerente, Empresa C'),
          ]),
        ];
      },
    },
    {
      id: 'faq-2col', nombre: 'Preguntas en dos columnas', grupo: 'Confianza',
      crear: function () {
        function q(t, d) { return E('tarjeta', { icono: '', titulo: t, texto: d, estilo: 'plana' }); }
        return [
          encabezado('Preguntas frecuentes', 'Si no ves la tuya, escríbenos.', 'faq'),
          S({ padding: 'm' }, [
            [q('¿Cuánto cuesta?', 'Depende del alcance. Te damos un precio cerrado.'), q('¿Cuánto demora?', 'Entre 2 y 6 semanas según el proyecto.')],
            [q('¿Incluye soporte?', 'Sí, acompañamiento durante el primer mes.'), q('¿Puedo cambiar cosas después?', 'Claro, ajustamos contigo cuando haga falta.')],
          ]),
        ];
      },
    },
    // ---------------- Conversión ----------------
    {
      id: 'cta-tira', nombre: 'Banda de llamada a la acción', grupo: 'Conversión',
      crear: function () {
        return [S({ fondoTipo: 'acento', padding: 'm', vertical: 'centro', ancho: 'normal' }, [
          [E('titulo', { texto: '¿Hablamos de tu proyecto?', nivel: '2' }), E('texto', { texto: 'Cuéntanos tu idea, sin compromiso.', tam: 'm' })],
          [E('boton', { texto: 'Escríbenos por WhatsApp', url: 'wa.me/59162095357', tam: 'l', alinear: 'der', nueva: true })],
        ])];
      },
    },
    {
      id: 'cta-aurora', nombre: 'Llamada a la acción aurora', grupo: 'Conversión',
      crear: function () {
        return [S({ fondoTipo: 'aurora', padding: 'xl', alinear: 'centro', ancho: 'angosto', ancla: 'contacto' }, [[
          E('titulo', { texto: 'Empieza hoy, mejora mañana', nivel: '1' }),
          E('texto', { texto: 'Sin letra chica. Sin compromisos. Con resultados.', tam: 'l' }),
          E('boton', { texto: 'Quiero mi propuesta', url: '#contacto', tam: 'l', color: '#ffffff' }),
        ]])];
      },
    },
    {
      id: 'contacto-tarjetas', nombre: 'Contacto en tarjetas', grupo: 'Conversión',
      crear: function () {
        return [
          encabezado('Contáctanos', 'Elige la forma que prefieras.', 'contacto'),
          S({ padding: 'm' }, [
            [E('tarjeta', { icono: '✉️', titulo: 'Correo', texto: 'hola@tuempresa.com', estilo: 'plana', alinear: 'centro', url: 'hola@tuempresa.com' })],
            [E('tarjeta', { icono: '💬', titulo: 'WhatsApp', texto: '+591 70000000', estilo: 'plana', alinear: 'centro', url: 'wa.me/59170000000' })],
            [E('tarjeta', { icono: '📍', titulo: 'Oficina', texto: 'Santa Cruz, Bolivia', estilo: 'plana', alinear: 'centro' })],
          ]),
        ];
      },
    },
    // ---------------- Estructura ----------------
    {
      id: 'cabecera-centrada', nombre: 'Cabecera centrada', grupo: 'Estructura',
      crear: function () {
        return [S({ padding: 's', alinear: 'centro' }, [[
          E('titulo', { texto: 'Mi Marca', nivel: '2' }),
          E('menu', { alinear: 'centro' }),
        ]])];
      },
    },
    {
      id: 'pie-columnas', nombre: 'Pie con columnas', grupo: 'Estructura',
      crear: function () {
        return [S({ fondoTipo: 'color', fondo: '#0b1020', padding: 'l', separacion: 'l' }, [
          [E('titulo', { texto: 'Mi Marca', nivel: '3' }), E('texto', { texto: 'Hacemos que las ideas funcionen. Santa Cruz, Bolivia.', tam: 's' })],
          [E('titulo', { texto: 'Explorar', nivel: '3' }), E('menu', { items: [{ texto: 'Inicio', url: '#inicio' }, { texto: 'Servicios', url: '#servicios' }, { texto: 'Contacto', url: '#contacto' }] })],
          [E('titulo', { texto: 'Contacto', nivel: '3' }), E('lista', { icono: '→', items: [{ texto: 'hola@tuempresa.com' }, { texto: '+591 70000000' }] }),
           E('texto', { texto: '© ' + ANIO + ' Mi Marca', tam: 's' })],
        ])];
      },
    },
    {
      id: 'vacia-1', nombre: 'Vacía · 1 columna', grupo: 'En blanco',
      crear: function () { return [S({}, [[]])]; },
    },
    {
      id: 'vacia-2', nombre: 'Vacía · 2 columnas', grupo: 'En blanco',
      crear: function () { return [S({}, [[], []])]; },
    },
    {
      id: 'vacia-3', nombre: 'Vacía · 3 columnas', grupo: 'En blanco',
      crear: function () { return [S({}, [[], [], []])]; },
    },
  ];

  function prefab(id) {
    for (var i = 0; i < PREFABS.length; i++) if (PREFABS[i].id === id) return PREFABS[i];
    return null;
  }

  return {
    ELEMENTOS: ELEMENTOS, SECCION: SECCION, TEMA: TEMA, PREFABS: PREFABS,
    FUENTES_URL: FUENTES_URL,
    render: render, limpiarDoc: limpiarDoc, limpiarElemento: limpiarElemento,
    nuevoId: nuevoId, prefab: prefab, crearElemento: E, textoSobre: textoSobre,
    url: url, src: src, color: color, esc: esc, videoEmbed: videoEmbed,
  };
});
