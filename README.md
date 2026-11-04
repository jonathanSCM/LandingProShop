# Proshop — Sitio web

Landing de Proshop + **constructor de páginas** para crear nuevas páginas sin programar.
Node.js + Express + EJS + PostgreSQL (Prisma).

## Puesta en marcha
```bash
npm install
cp .env.example .env      # define DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET
npx prisma migrate deploy
npm start                 # http://localhost:3000
```
El Dockerfile ya ejecuta `prisma migrate deploy` al arrancar.

## Admin (`/admin`)
- **Páginas**: crea páginas con secciones prediseñadas, arrastra y suelta, edita textos sobre
  el lienzo, imágenes con marcos, botones y enlaces, vista móvil/tableta, deshacer/rehacer.
  Se publican en `/p/nombre`; una de ellas puede ser la **portada** (`/`).
- **Editar la landing actual**: modo edición de textos de la landing clásica (`/?editar=1`).

Si ninguna página está marcada como portada y publicada, `/` muestra la landing clásica.

## Contacto
El formulario (landing y constructor) valida los datos y abre WhatsApp con el mensaje escrito.
No se guarda bandeja de mensajes.

## Estructura
- `server.js` rutas · `lib/paginas.js` constructor (rutas, API, imágenes) · `lib/contenido.js` textos de la landing
- `public/js/bloques.js` motor compartido editor/servidor · `public/js/constructor.js` editor visual
