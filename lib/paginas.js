/**
 * Constructor de paginas: rutas del panel, API del editor, imagenes y pagina publica.
 *
 * El documento de cada pagina (secciones y elementos) se guarda como JSON en la
 * tabla "paginas". El motor que lo valida y lo dibuja es public/js/bloques.js,
 * el mismo archivo que usa el editor en el navegador.
 */
const path = require('path');
const express = require('express');
const { prisma } = require('./db');
const Bloques = require(path.join(__dirname, '..', 'public', 'js', 'bloques.js'));

const LIMITE_IMAGEN = 8 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function slugificar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
const SLUG_OK = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function slugLibre(base) {
  base = slugificar(base) || 'pagina';
  let slug = base;
  for (let n = 2; await prisma.pagina.findUnique({ where: { slug } }); n++) {
    slug = `${base.slice(0, 55)}-${n}`;
  }
  return slug;
}

/** Los bytes del archivo tienen que coincidir con lo que dice el Content-Type. */
function bytesCoinciden(buf, mime) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (mime === 'image/png') return buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === 'image/gif') return buf.slice(0, 4).toString('latin1') === 'GIF8';
  if (mime === 'image/webp') return buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP';
  return false;
}

async function portada() {
  try {
    return await prisma.pagina.findFirst({ where: { inicio: true, publicada: true } });
  } catch (err) {
    console.error('No se pudo leer la portada:', err.message);
    return null; // que el sitio se vea siempre: cae a la landing clasica
  }
}

/** Dibuja una pagina del constructor (la usan /p/:slug y la portada). */
function mostrar(req, res, p) {
  const esAdmin = !!(req.session && req.session.authed);
  const doc = Bloques.limpiarDoc(p.doc);
  res.render('pagina', {
    title: p.titulo,
    descripcion: p.descripcion,
    borrador: !p.publicada,
    fondo: doc.tema.fondo,
    fuentesUrl: Bloques.FUENTES_URL,
    html: Bloques.render(doc),
    origen: p.titulo,
    editarUrl: esAdmin ? `/admin/paginas/${p.id}/editor` : '',
  });
}

function montar(app, { requireAuth, requireAuthApi, site }) {
  // ======================== Panel: listado ========================
  app.get('/admin/paginas', requireAuth, async (req, res, next) => {
    try {
      const paginas = await prisma.pagina.findMany({
        orderBy: { actualizada: 'desc' },
        select: { id: true, slug: true, titulo: true, publicada: true, inicio: true, actualizada: true },
      });
      res.render('admin/paginas', {
        title: 'Páginas', tituloPagina: 'Páginas', activo: 'paginas',
        paginas, plantillas: Bloques.PLANTILLAS, error: req.query.error || '',
      });
    } catch (err) { next(err); }
  });

  app.post('/admin/paginas', requireAuth, async (req, res, next) => {
    try {
      const titulo = String(req.body.titulo || '').trim().slice(0, 120);
      if (!titulo) return res.redirect('/admin/paginas?error=' + encodeURIComponent('Ponle un nombre a la página.'));
      const slug = await slugLibre(titulo);
      const pagina = await prisma.pagina.create({
        data: { slug, titulo, doc: Bloques.docDePlantilla(String(req.body.plantilla || 'blanca')) },
      });
      res.redirect(`/admin/paginas/${pagina.id}/editor`);
    } catch (err) { next(err); }
  });

  app.post('/admin/paginas/:id/duplicar', requireAuth, async (req, res, next) => {
    try {
      const origen = await prisma.pagina.findUnique({ where: { id: Number(req.params.id) || 0 } });
      if (!origen) return res.redirect('/admin/paginas');
      const titulo = (origen.titulo + ' (copia)').slice(0, 120);
      // Se limpia el doc para que los ids de la copia sean nuevos pero validos.
      const doc = JSON.parse(JSON.stringify(origen.doc));
      (doc.secciones || []).forEach((s) => {
        if (!s || typeof s !== 'object') return;
        s.id = Bloques.nuevoId('s');
        (s.cols || []).forEach((c) => (c || []).forEach((e) => { if (e) e.id = Bloques.nuevoId('e'); }));
      });
      const copia = await prisma.pagina.create({
        data: { slug: await slugLibre(titulo), titulo, descripcion: origen.descripcion, doc: Bloques.limpiarDoc(doc) },
      });
      res.redirect(`/admin/paginas/${copia.id}/editor`);
    } catch (err) { next(err); }
  });

  app.post('/admin/paginas/:id/eliminar', requireAuth, async (req, res, next) => {
    try {
      await prisma.pagina.deleteMany({ where: { id: Number(req.params.id) || 0 } });
      res.redirect('/admin/paginas');
    } catch (err) { next(err); }
  });

  // ======================== Editor ========================
  app.get('/admin/paginas/:id/editor', requireAuth, async (req, res, next) => {
    try {
      const p = await prisma.pagina.findUnique({ where: { id: Number(req.params.id) || 0 } });
      if (!p) return res.status(404).render('404', { title: 'Página no encontrada' });
      const datos = {
        pagina: {
          id: p.id, slug: p.slug, titulo: p.titulo, descripcion: p.descripcion,
          publicada: p.publicada, inicio: p.inicio, actualizada: p.actualizada.toISOString(),
        },
        doc: Bloques.limpiarDoc(p.doc),
      };
      res.render('admin/editor-paginas', {
        title: `Editando: ${p.titulo}`,
        fuentesUrl: Bloques.FUENTES_URL,
        // "<" escapado para que el JSON jamas pueda cerrar la etiqueta <script>
        datos: JSON.stringify(datos).replace(/</g, '\\u003c'),
      });
    } catch (err) { next(err); }
  });

  // ======================== API del editor ========================
  app.put('/api/paginas/:id', requireAuthApi, async (req, res) => {
    try {
      const id = Number(req.params.id) || 0;
      const actual = await prisma.pagina.findUnique({ where: { id } });
      if (!actual) return res.status(404).json({ ok: false, error: 'La página ya no existe.' });

      const b = req.body || {};
      // Si otra pestana guardo despues de que esta cargara, no se pisa en silencio.
      if (b.base && b.base !== actual.actualizada.toISOString()) {
        return res.status(409).json({ ok: false, error: 'Esta página se modificó en otra pestaña. Recarga para no perder cambios de allá.' });
      }

      const data = {};
      if (typeof b.titulo === 'string') {
        data.titulo = b.titulo.trim().slice(0, 120) || actual.titulo;
      }
      if (typeof b.descripcion === 'string') data.descripcion = b.descripcion.trim().slice(0, 300);
      if (typeof b.publicada === 'boolean') data.publicada = b.publicada;
      if (typeof b.slug === 'string') {
        const slug = slugificar(b.slug);
        if (!slug || !SLUG_OK.test(slug)) return res.status(400).json({ ok: false, error: 'La dirección solo admite letras, números y guiones.' });
        data.slug = slug;
      }
      if (b.doc !== undefined) {
        if (!b.doc || typeof b.doc !== 'object') return res.status(400).json({ ok: false, error: 'Documento inválido.' });
        data.doc = Bloques.limpiarDoc(b.doc);
      }

      let p;
      if (typeof b.inicio === 'boolean') {
        // Solo una pagina puede ser la portada: al marcar una se desmarcan las demas.
        data.inicio = b.inicio;
        const ops = [];
        if (b.inicio) ops.push(prisma.pagina.updateMany({ where: { id: { not: id } }, data: { inicio: false } }));
        ops.push(prisma.pagina.update({ where: { id }, data }));
        p = (await prisma.$transaction(ops)).pop();
      } else {
        p = await prisma.pagina.update({ where: { id }, data });
      }
      res.json({ ok: true, slug: p.slug, titulo: p.titulo, publicada: p.publicada, inicio: p.inicio, actualizada: p.actualizada.toISOString() });
    } catch (err) {
      if (err && err.code === 'P2002') return res.status(409).json({ ok: false, error: 'Esa dirección ya la usa otra página.' });
      console.error('No se pudo guardar la página:', err);
      res.status(500).json({ ok: false, error: 'No se pudo guardar. Revisa la consola del servidor.' });
    }
  });

  // ---------- Imagenes ----------
  const subida = (req, res, next) =>
    express.raw({ type: TIPOS_IMAGEN, limit: LIMITE_IMAGEN })(req, res, (err) => {
      if (!err) return next();
      const grande = err.type === 'entity.too.large';
      res.status(grande ? 413 : 400).json({ ok: false, error: grande ? 'La imagen pesa más de 8 MB.' : 'No se pudo leer la imagen.' });
    });

  app.post('/api/imagenes', requireAuthApi, subida, async (req, res) => {
    try {
      const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!TIPOS_IMAGEN.includes(mime) || !bytesCoinciden(req.body, mime)) {
        return res.status(400).json({ ok: false, error: 'Sube una imagen PNG, JPG, WEBP o GIF.' });
      }
      let nombre = 'imagen';
      try { nombre = decodeURIComponent(String(req.query.nombre || 'imagen')); } catch (e) { /* nombre raro: se queda el generico */ }
      const img = await prisma.imagenSubida.create({
        data: { nombre: nombre.replace(/[^\w .-]/g, '').slice(0, 80) || 'imagen', mime, tamano: req.body.length, datos: req.body },
        select: { id: true, nombre: true, tamano: true },
      });
      res.json({ ok: true, imagen: { ...img, url: `/media/${img.id}` } });
    } catch (err) {
      console.error('No se pudo guardar la imagen:', err);
      res.status(500).json({ ok: false, error: 'No se pudo guardar la imagen.' });
    }
  });

  app.get('/api/imagenes', requireAuthApi, async (req, res) => {
    try {
      const filas = await prisma.imagenSubida.findMany({
        orderBy: { id: 'desc' }, take: 200, select: { id: true, nombre: true, tamano: true },
      });
      res.json({ ok: true, imagenes: filas.map((f) => ({ ...f, url: `/media/${f.id}` })) });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'No se pudo leer la biblioteca.' });
    }
  });

  app.delete('/api/imagenes/:id', requireAuthApi, async (req, res) => {
    try {
      await prisma.imagenSubida.deleteMany({ where: { id: Number(req.params.id) || 0 } });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'No se pudo borrar la imagen.' });
    }
  });

  // Publico: sirve la imagen. El id nunca cambia de contenido, asi que se cachea fuerte.
  app.get('/media/:id', async (req, res, next) => {
    try {
      const img = await prisma.imagenSubida.findUnique({ where: { id: Number(req.params.id) || 0 } });
      if (!img) return next();
      res.set({
        'Content-Type': img.mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      });
      res.send(Buffer.from(img.datos));
    } catch (err) { next(err); }
  });

  // ======================== Pagina publica ========================
  app.get('/p/:slug', async (req, res, next) => {
    try {
      const p = await prisma.pagina.findUnique({ where: { slug: String(req.params.slug).toLowerCase() } });
      const esAdmin = !!(req.session && req.session.authed);
      if (!p || (!p.publicada && !esAdmin)) return next();
      mostrar(req, res, p);
    } catch (err) { next(err); }
  });
}

module.exports = { montar, portada, mostrar };
