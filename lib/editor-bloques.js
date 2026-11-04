/**
 * Editor de bloques (el que se abre en una ventana dentro del modo edicion de la
 * landing) y biblioteca de imagenes subidas.
 *
 * El contenido de cada bloque lo guarda la propia landing (contenido.config.custom);
 * aqui solo se sirve la vista del editor y la API de imagenes.
 */
const path = require('path');
const express = require('express');
const { prisma } = require('./db');
const Bloques = require(path.join(__dirname, '..', 'public', 'js', 'bloques.js'));

const LIMITE_IMAGEN = 8 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function bytesCoinciden(buf, mime) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (mime === 'image/png') return buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === 'image/gif') return buf.slice(0, 4).toString('latin1') === 'GIF8';
  if (mime === 'image/webp') return buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP';
  return false;
}

function montar(app, { requireAuth, requireAuthApi }) {
  // Pagina que carga el editor dentro del iframe. Los datos los pide al editor de la landing.
  app.get('/admin/bloque', requireAuth, (req, res) => {
    res.render('admin/bloque', { title: 'Editar sección', fuentesUrl: Bloques.FUENTES_URL });
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
}

module.exports = { montar };
