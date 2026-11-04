# Proshop — Landing

Landing de Proshop con un **editor visual integrado**: se edita la propia página, sin panel aparte.
Node.js + Express + EJS + PostgreSQL (Prisma).

## Puesta en marcha
```bash
npm install
cp .env.example .env      # DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET
npx prisma migrate deploy
npm start                 # http://localhost:3000
```
El Dockerfile ejecuta `prisma migrate deploy` al arrancar.

## Editar la landing
Entra en **`/admin`** (usuario y clave del `.env`): te lleva a la landing en modo edición.
Cuando tienes sesión abierta, en la página pública aparece un botón «✏️ Editar la página».

- **Textos**: escribe directamente encima.
- **Enlaces de botones**: toca un botón o enlace y cambia su URL (también `#sección`, correo o teléfono).
- **Secciones**: súbelas/bájalas con la barra flotante o con la lista **☰ Secciones** (arrastrando),
  ocúltalas con el ojo, y cambia en ⚙ su fondo, color de texto, espacio, animación al aparecer
  y si salen en el menú.
- **＋ Añadir sección**: galería de secciones prediseñadas (portadas, ventajas, galería con marcos,
  precios, testimonios, preguntas, contacto, pie…). Se editan con el editor completo de bloques
  (imágenes con marcos, botones, columnas, vista móvil…).
- **🎨 Diseño**: color principal, fondo, texto, tipografía de los títulos y animaciones on/off.
- **Guardar** publica todo. **Restablecer todo** vuelve a la landing original.

## Estructura
- `server.js` rutas · `lib/contenido.js` guarda lo editado en PostgreSQL
- `views/landing.ejs` + `views/landing/*.ejs` (una vista por sección fija)
- `public/js/landing-editor.js` editor de la landing · `public/js/landing-cfg.js` orden/estilos/diseño (compartido servidor-navegador)
- `public/js/bloques.js` motor de bloques (secciones añadidas) · `public/js/constructor.js` editor de bloques
- `lib/editor-bloques.js` biblioteca de imágenes (se guardan en la base de datos)

## Contacto
El formulario valida los datos y abre WhatsApp con el mensaje escrito. No se guarda bandeja de mensajes.
