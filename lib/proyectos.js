/**
 * Portafolio de Proshop.
 *
 * Es el unico archivo que hay que tocar para agregar, quitar o editar un
 * proyecto de la landing. El orden del array es el orden en que aparecen.
 *
 * Campos:
 *   id       - identificador corto, sin espacios (se usa en el HTML)
 *   nombre   - como se muestra
 *   tipo     - una linea: que es
 *   lugar    - donde/para quien (opcional)
 *   estado   - 'produccion' | 'desarrollo'
 *   imagen   - captura del proyecto, dentro de public/img/proyectos/.
 *              Si no hay imagen se intenta dibujar el boceto SVG del mismo id
 *              (views/partials/boceto.ejs), y si tampoco existe no se muestra
 *              nada: el panel no se rompe.
 *   ancho    - ancho y alto reales de la captura en pixeles. Sirven para
 *   alto       reservarle el hueco y que la pagina no de un salto al cargarla.
 *   boceto   - pie de la captura: una frase de que se esta viendo.
 *   resumen  - 2-3 frases, lenguaje de cliente, no de programador
 *   metricas - OPCIONAL: 3 datos duros { valor, etiqueta }. Si se omite, el
 *              bloque no se dibuja. Solo poner numeros verificables.
 *   features - que hace, en lenguaje de negocio
 *   enlaces  - botones al pie del panel (opcional):
 *              { texto, href, externo }. externo:true abre en otra pestana.
 */
module.exports = [
  {
    id: 'fortaleza',
    nombre: 'Aseguradora Fortaleza',
    tipo: 'Sitio corporativo para aseguradora',
    lugar: 'Bolivia',
    estado: 'desarrollo',
    imagen: '/img/proyectos/fortaleza-1.jpg',
    ancho: 800,
    alto: 500,
    boceto:
      'La portada agrupa los seguros en cuatro puertas de entrada, para que cada visitante se reconozca de inmediato y no tenga que leer un catalogo.',
    resumen:
      'Sitio institucional de una aseguradora. Ordena la oferta en cuatro lineas ' +
      '(personales, empresas, brokers y fianzas) y resuelve la pregunta que trae ' +
      'alguien que acaba de tener un accidente: que hacer ante un siniestro.',
    features: [
      'Cuatro lineas de seguros, cada una con su recorrido propio',
      'Guia de que hacer ante un siniestro, accesible desde el menu',
      'Directorio de oficinas para atencion presencial',
      'Listado de bienes adjudicados y siniestrados',
      'Contacto directo por telefono y WhatsApp desde cualquier pagina',
    ],
    // Sin enlace publico a pedido del cliente.
    enlaces: [],
  },

  {
    id: 'crm',
    nombre: 'CRM ProShop',
    tipo: 'CRM comercial con inteligencia artificial',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/crm-1.jpg',
    ancho: 800,
    alto: 505,
    boceto:
      'El centro de ventas: prioridades del equipo a la izquierda y un asistente que propone la siguiente accion concreta sobre cada oportunidad.',
    resumen:
      'Un CRM para equipos comerciales que no quieren vivir llenando formularios. ' +
      'Conecta las conversaciones, campanas y reuniones en un solo lugar, automatiza ' +
      'el trabajo repetitivo y usa IA para avisar que oportunidad conviene atender hoy.',
    features: [
      'Conversaciones, campanas y reuniones reunidas en un mismo panel',
      'Automatiza las tareas comerciales que hoy se hacen a mano',
      'Analiza oportunidades y anticipa cuales estan en riesgo',
      'Recomienda la siguiente accion sobre cada negocio abierto',
      'Resumen comercial con las prioridades del equipo del dia',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://crm.proshop.lat/', externo: true }],
  },

  {
    id: 'agendabot',
    nombre: 'AgendaBot',
    tipo: 'Agendamiento de citas por WhatsApp',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/agendabot-1.jpg',
    ancho: 800,
    alto: 505,
    boceto:
      'Una cita real de barberia: el cliente escribe, el bot ofrece los horarios libres, confirma y agenda. Todo dentro de WhatsApp, sin instalar nada.',
    resumen:
      'Atiende a tus clientes por WhatsApp las 24 horas: les muestra los servicios, ' +
      'busca los horarios libres y deja la cita confirmada en tu agenda. Pensado para ' +
      'negocios de turnos como barberias, salones y consultorios.',
    features: [
      'Conversa por la API oficial de WhatsApp, sin apps de por medio',
      'Muestra servicios y horarios libres dentro del chat',
      'Confirma la cita y la deja escrita en la agenda del negocio',
      'Envia recordatorios automaticos antes de cada cita',
      'CRM incluido para seguir el historial de cada cliente',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://agendabot.proshop.lat/', externo: true }],
  },

  {
    id: 'santa-isabel',
    nombre: 'Santa Isabel',
    tipo: 'Sistema interno para taller de confeccion',
    lugar: 'Bolivia',
    estado: 'produccion',
    imagen: '/img/proyectos/santa-isabel-1.jpg',
    ancho: 800,
    alto: 738,
    boceto:
      'Es un sistema interno: lo unico publico es la puerta. De ahi para adentro el taller trabaja con sus propios datos, que no se muestran.',
    resumen:
      'Sistema de gestion para un taller de confeccion. Es una herramienta de trabajo ' +
      'interna, no una web de cara al publico: el acceso esta restringido al personal ' +
      'autorizado y la informacion del taller queda puertas adentro.',
    features: [
      'Acceso restringido al personal del taller',
      'Sesion recordada por dispositivo, para el uso diario en planta',
      'Pensado para operar desde el piso de produccion',
    ],
    enlaces: [{ texto: 'Ver el acceso', href: 'https://santa-isabel.proshop.lat/', externo: true }],
  },

  {
    id: 'inmol',
    nombre: 'INMOL · Panel Interactivo',
    tipo: 'Panel tactil para sala de ventas inmobiliaria',
    lugar: 'Santa Cruz · Bolivia',
    estado: 'produccion',
    imagen: '/img/proyectos/inmol-1.jpg',
    ancho: 800,
    alto: 500,
    boceto:
      'El panel abre con el proyecto a pantalla completa y sus datos duros al frente. Se toca la pantalla y se recorre el terreno desde adentro.',
    resumen:
      'Panel tactil para la sala de ventas de una desarrolladora inmobiliaria. ' +
      'En vez de repartir planos en papel, el visitante recorre el proyecto en ' +
      'pantalla completa y ve el terreno como si estuviera parado ahi.',
    // Estos numeros salen del propio panel, no son estimaciones.
    metricas: [
      { valor: '326', etiqueta: 'locales comerciales' },
      { valor: '9.584 m²', etiqueta: 'superficie del terreno' },
      { valor: 'Zona Sur', etiqueta: 'Santa Cruz' },
    ],
    features: [
      'Recorrido del terreno en pantalla completa, a 360 grados',
      'Datos del proyecto siempre a la vista: locales, superficie y zona',
      'Operado a dedo, pensado para una pantalla en la sala de ventas',
      'Varios proyectos en un mismo panel, uno por vista',
    ],
    enlaces: [{ texto: 'Ver el panel', href: 'https://inmol.proshop.lat/', externo: true }],
  },
];
