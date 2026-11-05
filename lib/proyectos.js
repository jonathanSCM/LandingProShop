/**
 * Portafolio de Proshop.
 *
 * Es el único archivo que hay que tocar para agregar, quitar o editar un
 * proyecto de la landing. El orden del array es el orden en que aparecen.
 *
 * Campos:
 *   id       - identificador corto, sin espacios (se usa en el HTML)
 *   nombre   - como se muestra
 *   tipo     - una línea: qué es
 *   lugar    - donde/para quien (opcional)
 *   estado   - 'producción' | 'desarrollo'
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
    origen: 'cliente',
    problema:
      'Una aseguradora con varias líneas de negocio necesitaba que cada visitante encontrara rápido el seguro que le corresponde y supiera qué hacer ante un siniestro.',
    solucion:
      'ProShop construyó el sitio institucional: cuatro puertas de entrada (personales, empresas, brokers y fianzas), guía de siniestros, directorio de oficinas y contacto directo por teléfono y WhatsApp.',
    uso:
      'El visitante navega por su línea de seguros, consulta qué hacer ante un siniestro y contacta a la aseguradora desde cualquier página.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'Aseguradora Fortaleza',
    tipo: 'Sitio corporativo para aseguradora',
    lugar: 'Bolivia',
    estado: 'desarrollo',
    imagen: '/img/proyectos/fortaleza-1.jpg',
    ancho: 800,
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica qué se está mirando.
    puntos: [
      { x: 25, y: 53, texto: 'Cuatro puertas de entrada: personales, empresas, brokers y fianzas. Cada visitante se reconoce en una y sigue por ahí.' },
      { x: 82, y: 7, texto: 'La línea gratuita, siempre arriba. En seguros la llamada suele entrar cuando algo ya pasó, y nadie quiere buscar el número.' },
      { x: 92, y: 92, texto: 'El botón de WhatsApp queda fijo en pantalla, en cualquier página del sitio.' },
    ],
    boceto:
      'La portada agrupa los seguros en cuatro puertas de entrada, para que cada visitante se reconozca de inmediato y no tenga que leer un catálogo.',
    resumen:
      'Sitio institucional de una aseguradora. Ordena la oferta en cuatro líneas ' +
      '(personales, empresas, brokers y fianzas) y resuelve la pregunta que trae ' +
      'alguien que acaba de tener un accidente: qué hacer ante un siniestro.',
    features: [
      'Cuatro líneas de seguros, cada una con su recorrido propio',
      'Guía de qué hacer ante un siniestro, accesible desde el menú',
      'Directorio de oficinas para atención presencial',
      'Listado de bienes adjudicados y siniestrados',
      'Contacto directo por teléfono y WhatsApp desde cualquier página',
    ],
    // Sin enlace público a pedido del cliente.
    enlaces: [],
  },

  {
    id: 'crm',
    origen: 'propio',
    problema:
      'Los equipos comerciales pierden oportunidades por falta de seguimiento y por el trabajo repetitivo de llenar formularios.',
    solucion:
      'Producto propio de ProShop que reúne conversaciones, campañas y reuniones, automatiza tareas comerciales y recomienda la siguiente acción con inteligencia artificial.',
    uso:
      'El equipo ve su resumen comercial y las prioridades del día, y recibe sugerencias sobre qué oportunidad atender.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'CRM ProShop',
    tipo: 'CRM comercial con inteligencia artificial',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/crm-1.jpg',
    ancho: 800,
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica qué se está mirando.
    puntos: [
      { x: 33, y: 58, texto: 'El resumen comercial: oportunidades abiertas, acciones pendientes y reuniones de la semana, sin abrir un submenú.' },
      { x: 33, y: 71, texto: 'Prioridades del equipo: quién atiende qué, sin tener que preguntárselo a nadie.' },
      { x: 82, y: 89, texto: 'No entrega un puntaje y se lava las manos: dice qué hacer ahora con esta oportunidad.' },
    ],
    boceto:
      'El centro de ventas: prioridades del equipo a la izquierda y un asistente que propone la siguiente acción concreta sobre cada oportunidad.',
    resumen:
      'Un CRM para equipos comerciales que no quieren vivir llenando formularios. ' +
      'Conecta las conversaciones, campañas y reuniones en un solo lugar, automatiza ' +
      'el trabajo repetitivo y usa IA para avisar qué oportunidad conviene atender hoy.',
    features: [
      'Conversaciones, campañas y reuniones reunidas en un mismo panel',
      'Automatiza las tareas comerciales que hoy se hacen a mano',
      'Analiza oportunidades y anticipa cuáles están en riesgo',
      'Recomienda la siguiente acción sobre cada negocio abierto',
      'Resumen comercial con las prioridades del equipo del día',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://crm.proshop.lat/', externo: true }],
  },

  {
    id: 'agendabot',
    origen: 'propio',
    problema:
      'Los negocios que trabajan con citas pierden tiempo y clientes agendando a mano por WhatsApp.',
    solucion:
      'Producto propio de ProShop: un agente conectado a la API oficial de WhatsApp que ofrece horarios libres, confirma la cita y la deja en la agenda del negocio.',
    uso:
      'El cliente agenda desde su chat sin instalar nada; el negocio ve la cita en su agenda y envía recordatorios automáticos.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'AgendaBot',
    tipo: 'Agendamiento de citas por WhatsApp',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/agendabot-1.jpg',
    ancho: 800,
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica qué se está mirando.
    puntos: [
      { x: 46, y: 76, texto: 'Una cita de barbería dentro de WhatsApp: el cliente pide hora, el bot le ofrece los horarios libres y cierra con el que eligió.' },
      { x: 14, y: 48, texto: 'La cita queda escrita en la agenda del negocio sin que nadie la anote a mano.' },
      { x: 38, y: 17, texto: 'Responde las 24 horas por la API oficial de WhatsApp, y el cliente no instala nada.' },
    ],
    boceto:
      'Una cita real de barbería: el cliente escribe, el bot ofrece los horarios libres, confirma y agenda. Todo dentro de WhatsApp, sin instalar nada.',
    resumen:
      'Atiende a tus clientes por WhatsApp las 24 horas: les muestra los servicios, ' +
      'busca los horarios libres y deja la cita confirmada en tu agenda. Pensado para ' +
      'negocios de turnos como barberías, salones y consultorios.',
    features: [
      'Conversa por la API oficial de WhatsApp, sin apps de por medio',
      'Muestra servicios y horarios libres dentro del chat',
      'Confirma la cita y la deja escrita en la agenda del negocio',
      'Envía recordatorios automáticos antes de cada cita',
      'CRM incluido para seguir el historial de cada cliente',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://agendabot.proshop.lat/', externo: true }],
  },

  {
    id: 'santa-isabel',
    origen: 'cliente',
    problema:
      'Un taller de confección necesitaba controlar pedidos, cotizaciones, responsables y fechas de entrega.',
    solucion:
      'ProShop construyó un sistema interno que lleva el pedido desde la cotización hasta la entrega.',
    uso:
      'El taller ve cada día cuántos pedidos hay en producción, terminados y atrasados, y planifica la semana por estado o por responsable.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'Santa Isabel',
    tipo: 'Sistema interno para taller de confección',
    lugar: 'Bolivia',
    estado: 'piloto',
    imagen: '/img/proyectos/santa-isabel-tablero.jpg',
    ancho: 800,
    alto: 738,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica qué se está mirando.
    puntos: [
      { x: 17, y: 31, texto: 'Veinte pedidos comprometidos. Es el primer número que mira el taller al abrir el día.' },
      { x: 49, y: 31, texto: 'Cuatro pasando por las máquinas en este momento.' },
      { x: 49, y: 68, texto: 'La alarma. Mientras marque cero todo va al día; si sube, alguien tiene que mover algo hoy.' },
      { x: 50, y: 94, texto: 'Cinco vistas pensadas para usarse de pie en el taller, desde el teléfono.' },
    ],
    boceto:
      'El tablero con que arranca el día el taller: cuánto hay en producción, cuánto está listo y qué se entrega esta semana. Se muestran los totales, no los clientes.',
    resumen:
      'Sistema de gestión para un taller de confección. Lleva el pedido desde la ' +
      'cotización hasta la entrega: qué está en producción, qué está listo, qué sale ' +
      'esta semana y qué se atrasó. Es una herramienta interna, no una web de vitrina.',
    features: [
      'Tablero diario: pedidos activos, en producción, terminados y atrasados',
      'Planificación de la semana por estado o por responsable',
      'Pedidos filtrables por estado, cliente y fecha de entrega',
      'Cotizaciones con control de vigencia: vencidas, por vencer y pendientes',
      'Calendario de entregas y exportación a Excel desde cada vista',
      'Acceso restringido al personal autorizado del taller',
    ],
    enlaces: [{ texto: 'Ver el acceso', href: 'https://santa-isabel.proshop.lat/', externo: true }],
  },

  {
    id: 'inmol',
    origen: 'cliente',
    problema:
      'Una desarrolladora inmobiliaria quería presentar sus proyectos en la sala de ventas sin depender de planos en papel.',
    solucion:
      'ProShop construyó un panel táctil con recorrido del terreno a 360 grados y los datos del proyecto siempre a la vista.',
    uso:
      'El visitante recorre el proyecto en pantalla completa y consulta terrenos y superficie de cada lote.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'INMOL · Panel Interactivo',
    tipo: 'Panel táctil para sala de ventas inmobiliaria',
    lugar: 'Santa Cruz · Bolivia',
    estado: 'produccion',
    imagen: '/img/proyectos/inmol-1.jpg',
    ancho: 800,
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura donde se
    // posa la lupa; el texto explica qué se está mirando.
    puntos: [
      { x: 30, y: 46, texto: 'El proyecto a pantalla completa, sobre una foto real del terreno a 360 grados.' },
      { x: 28, y: 80, texto: 'Los datos duros quedan a la vista mientras se recorre: terrenos, superficie de cada lote y del total.' },
      { x: 26, y: 97, texto: 'Se opera a dedo. Está hecho para una pantalla en la sala de ventas, no para un escritorio.' },
    ],
    boceto:
      'El panel abre con el proyecto a pantalla completa y sus datos duros al frente. Se toca la pantalla y se recorre el terreno desde adentro.',
    resumen:
      'Panel táctil para la sala de ventas de una desarrolladora inmobiliaria. ' +
      'En vez de repartir planos en papel, el visitante recorre el proyecto en ' +
      'pantalla completa y ve el terreno como si estuviera parado ahí.',
    // Estos números salen del propio panel, no son estimaciones.
    metricas: [
      { valor: '1,101', etiqueta: 'terrenos del proyecto' },
      { valor: '64.58 ha', etiqueta: 'superficie total' },
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

  {
    id: 'gobot',
    origen: 'propio',
    problema:
      'Un conductor da vueltas sin saber donde hay trabajo, y depende de un solo tipo de viaje para llenar el turno.',
    solucion:
      'Producto propio de ProShop: una app que analiza zonas y horarios para indicar donde hay mas demanda, y reparte viajes, deliveries y mandados en una sola bandeja.',
    uso:
      'El conductor se pone en linea, le entran las solicitudes cercanas con la zona ya analizada, y acepta o deja pasar.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'GoBot',
    tipo: 'App de conductores con inteligencia artificial',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/gobot-1.jpg',
    ancho: 800,
    alto: 620,
    // Paradas del recorrido guiado. x e y son el % sobre la captura dónde se
    // posa la lupa; el texto explica que se esta mirando.
    puntos: [
      { x: 47, y: 82, texto: 'La oportunidad llega con la zona ya analizada: de dónde sale el servicio y a dónde va. El conductor acepta o deja pasar.' },
      { x: 14, y: 27, texto: 'No solo taxi. Por la misma app le entran deliveries y mandados, así que el turno no depende de un solo tipo de viaje.' },
      { x: 49, y: 47, texto: 'La IA le dice en qué zonas y a qué horas hay más movimiento, en vez de dar vueltas a ciegas quemando combustible.' },
    ],
    boceto:
      'Lo que ve el conductor con la app abierta: el mapa de la zona, su estado en línea y la oportunidad lista para aceptar.',
    resumen:
      'App para conductores de movilidad y logística urbana. Usa inteligencia artificial ' +
      'para mostrarle a cada conductor dónde y cuándo hay más trabajo, y le reparte tres ' +
      'tipos de servicio en vez de uno. Opera bajo la plataforma Grafi.',
    features: [
      'Analiza zonas y horarios para indicar dónde hay más demanda',
      'Tres tipos de servicio en una sola app: viajes, delivery y mandados',
      'Recibe solicitudes cercanas mientras el conductor está en línea',
      'Inscripción sin costo y saldo de bienvenida para arrancar',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://gobotapp.net/', externo: true }],
  },

  {
    id: 'ipass',
    origen: 'propio',
    problema:
      'Sin una plataforma, el organizador pierde el control de cupos y precios, y el comprador no sabe si quedan lugares ni hasta cuando le dura el descuento.',
    solucion:
      'Producto propio de ProShop: una ticketera con preventas, descuentos con fecha de corte, aviso de ultimos lugares y la agenda de lo que viene.',
    uso:
      'El publico busca por categoria o fecha, ve desde cuanto cuesta cada evento y compra; el organizador maneja sus funciones, cupos y precios.',
    resultado: '', // solo con evidencia verificable: si no la hay, se deja vacio y no se muestra
    nombre: 'iPass',
    tipo: 'Ticketera de eventos',
    lugar: 'Producto propio de ProShop',
    estado: 'produccion',
    imagen: '/img/proyectos/ipass-1.jpg',
    ancho: 800,
    alto: 620,
    puntos: [
      { x: 38, y: 55, texto: 'El descuento de preventa va sobre la portada del evento, no escondido en la letra chica.' },
      { x: 21, y: 79, texto: 'La cuenta regresiva apura sin mentir: dice hasta cuándo dura la preventa y cuántos días quedan.' },
      { x: 23, y: 90, texto: 'Fecha, hora, funciones y precio desde, en la misma tarjeta. El comprador sabe si le sirve sin entrar.' },
    ],
    boceto:
      'Un concierto en preventa: la portada, el descuento vigente, cuánto falta para que suba el precio y desde cuánto cuesta entrar.',
    resumen:
      'Plataforma de venta de entradas para eventos en Bolivia: conciertos, teatro, ' +
      'festivales y boliches. Maneja preventas con descuento y vigencia, avisa cuando ' +
      'quedan pocos lugares y arma la agenda de lo que viene en los próximos días.',
    features: [
      'Preventas con descuento, fecha de corte y cuenta regresiva',
      'Aviso de últimos lugares cuando el evento se está agotando',
      'Agenda de la semana y listado completo ordenado por cercanía',
      'Eventos por categoria: concierto, teatro, festival, deportes, fiesta y boliche',
      'Varias ciudades y recintos: La Paz, Santa Cruz y Cochabamba',
    ],
    enlaces: [{ texto: 'Ver el sitio', href: 'https://ticketera.proshop.lat/', externo: true }],
  },
];
