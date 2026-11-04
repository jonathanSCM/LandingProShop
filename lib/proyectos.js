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
 *   puntos   - paradas del recorrido guiado sobre la captura:
 *              { x, y, texto }. x e y son porcentajes de la imagen. Si no hay
 *              puntos, la captura se muestra sin recorrido y no pasa nada.
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
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 25, y: 53, texto: 'Cuatro puertas de entrada: personales, empresas, brokers y fianzas. Cada visitante se reconoce en una y sigue por ahi.' },
      { x: 82, y: 7, texto: 'La linea gratuita, siempre arriba. En seguros la llamada suele entrar cuando algo ya paso, y nadie quiere buscar el numero.' },
      { x: 92, y: 92, texto: 'El boton de WhatsApp queda fijo en pantalla, en cualquier pagina del sitio.' },
    ],
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
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 33, y: 58, texto: 'El resumen comercial: oportunidades abiertas, acciones pendientes y reuniones de la semana, sin abrir un submenu.' },
      { x: 33, y: 71, texto: 'Prioridades del equipo: quien atiende que, sin tener que preguntarselo a nadie.' },
      { x: 82, y: 89, texto: 'No entrega un puntaje y se lava las manos: dice que hacer ahora con esta oportunidad.' },
    ],
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
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 46, y: 76, texto: 'Una cita de barberia dentro de WhatsApp: el cliente pide hora, el bot le ofrece los horarios libres y cierra con el que eligio.' },
      { x: 14, y: 48, texto: 'La cita queda escrita en la agenda del negocio sin que nadie la anote a mano.' },
      { x: 38, y: 17, texto: 'Responde las 24 horas por la API oficial de WhatsApp, y el cliente no instala nada.' },
    ],
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
    imagen: '/img/proyectos/santa-isabel-tablero.jpg',
    ancho: 800,
    alto: 738,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 17, y: 31, texto: 'Veinte pedidos comprometidos. Es el primer numero que mira el taller al abrir el dia.' },
      { x: 49, y: 31, texto: 'Cuatro pasando por las maquinas en este momento.' },
      { x: 49, y: 68, texto: 'La alarma. Mientras marque cero todo va al dia; si sube, alguien tiene que mover algo hoy.' },
      { x: 50, y: 94, texto: 'Cinco vistas pensadas para usarse de pie en el taller, desde el telefono.' },
    ],
    boceto:
      'El tablero con que arranca el dia el taller: cuanto hay en produccion, cuanto esta listo y que se entrega esta semana. Se muestran los totales, no los clientes.',
    resumen:
      'Sistema de gestion para un taller de confeccion. Lleva el pedido desde la ' +
      'cotizacion hasta la entrega: que esta en produccion, que esta listo, que sale ' +
      'esta semana y que se atraso. Es una herramienta interna, no una web de vitrina.',
    features: [
      'Tablero diario: pedidos activos, en produccion, terminados y atrasados',
      'Planificacion de la semana por estado o por responsable',
      'Pedidos filtrables por estado, cliente y fecha de entrega',
      'Cotizaciones con control de vigencia: vencidas, por vencer y pendientes',
      'Calendario de entregas y exportacion a Excel desde cada vista',
      'Acceso restringido al personal autorizado del taller',
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
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 30, y: 46, texto: 'El proyecto a pantalla completa, sobre una foto real del terreno a 360 grados.' },
      { x: 28, y: 80, texto: 'Los datos duros quedan a la vista mientras se recorre: terrenos, superficie de cada lote y del total.' },
      { x: 26, y: 97, texto: 'Se opera a dedo. Esta hecho para una pantalla en la sala de ventas, no para un escritorio.' },
    ],
    boceto:
      'El panel abre con el proyecto a pantalla completa y sus datos duros al frente. Se toca la pantalla y se recorre el terreno desde adentro.',
    resumen:
      'Panel tactil para la sala de ventas de una desarrolladora inmobiliaria. ' +
      'En vez de repartir planos en papel, el visitante recorre el proyecto en ' +
      'pantalla completa y ve el terreno como si estuviera parado ahi.',
    // Estos numeros salen del propio panel, no son estimaciones.
    metricas: [
      { valor: '1.101', etiqueta: 'terrenos del proyecto' },
      { valor: '64,58 ha', etiqueta: 'superficie total' },
      { valor: '4', etiqueta: 'proyectos en el panel' },
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
