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
 *   boceto   - pie del wireframe: una frase de que se esta viendo en el dibujo.
 *              El dibujo en si vive en views/partials/boceto.ejs, buscado por id.
 *   resumen  - 2-3 frases, lenguaje de cliente, no de programador
 *   metricas - 3 datos duros: { valor, etiqueta }
 *   features - que hace, en lenguaje de negocio
 *   stack    - tecnologias del proyecto. OJO: hoy NO se muestra en la web (el
 *              usuario pidio sacar el bloque "Construido con" y poner en su
 *              lugar el boton de WhatsApp). Se conserva el dato por si se
 *              quiere volver a mostrar; borralo si te estorba.
 *   enlaces  - botones al pie del panel (opcional):
 *              { texto, href, externo }. externo:true abre en otra pestana.
 */
module.exports = [
  {
    id: 'protaxi',
    boceto:
      "Lo que ve el conductor cuando le entra un viaje: cuanto paga, de donde a donde, y aceptar o pasar. El aviso le llega aunque tenga el telefono guardado.",
    nombre: 'ProTaxi',
    tipo: 'App de conductores + backoffice',
    lugar: 'Bolivia',
    estado: 'produccion',
    resumen:
      'La app que llevan los conductores en el bolsillo. Reciben las ofertas de viaje ' +
      'en el momento, con sonido y vibracion, aunque tengan el telefono guardado. ' +
      'Del otro lado, un panel web para administrar la flota, los viajes y los pagos.',
    metricas: [
      { valor: '21', etiqueta: 'pantallas en la app' },
      { valor: '6', etiqueta: 'tipos de vehiculo' },
      { valor: 'Al instante', etiqueta: 'ofertas de viaje' },
    ],
    features: [
      'App para Android y iOS hecha en Flutter',
      'Registro en 3 pasos: datos, vehiculo y documentos',
      'Ingreso con codigo por SMS, sin contrasenas',
      'Ofertas de viaje al instante, con sonido y vibracion',
      'Ventana flotante que avisa con la app cerrada',
      'Prueba de entrega con foto y firma del cliente',
      'Billetera con recargas y comision del 13%',
      'Ganancias con graficos por dia y por semana',
      'Moto, auto, minivan, camion, torito y bicicleta',
      'Backoffice web para la flota, los viajes y los usuarios',
    ],
    stack: ['Flutter', 'Riverpod', 'Dio', 'Laravel', 'MySQL', 'Laravel Reverb', 'Firebase FCM', 'Google Maps', 'Docker', 'Coolify'],
  },
  {
    id: 'avaroa',
    boceto:
      "El tablero del despachador: la flota moviendose en el mapa, los viajes del momento y los numeros del dia, todo en una pantalla.",
    nombre: 'AVAROA',
    tipo: 'Centro de operaciones y despacho',
    lugar: 'La Paz, Bolivia',
    estado: 'produccion',
    resumen:
      'La sala de control del negocio. Desde una sola pantalla el despachador ve toda ' +
      'la flota moviendose en el mapa, reparte los viajes y sigue la plata. Maneja seis ' +
      'servicios distintos: taxi, mototaxi, carga, carga pequena, delivery y compras.',
    metricas: [
      { valor: '6', etiqueta: 'servicios en una plataforma' },
      { valor: 'En vivo', etiqueta: 'mapa de la flota' },
      { valor: '5', etiqueta: 'roles con permisos propios' },
    ],
    features: [
      'Mapa de la flota en tiempo real para el despachador',
      'Reparte los viajes solo, o a mano cuando hace falta',
      'Verificacion de conductores y de sus documentos',
      'Billetera del negocio: recargas, retiros y comisiones',
      'Tarifas que se configuran por servicio y por vehiculo',
      'Bot de WhatsApp que pasa el caso a una persona',
      'Tickets de soporte y blog, dentro del mismo panel',
      'Auditoria: queda registrado quien hizo cada cosa',
    ],
    stack: ['Laravel 10', 'Vue 3', 'Inertia', 'Tailwind', 'MySQL', 'Laravel Reverb', 'Firebase FCM', 'WhatsApp Cloud API'],
  },
  {
    id: 'alotaxi',
    boceto:
      "El pasajero pide su taxi escribiendo por WhatsApp, y el sistema lo resuelve con las tarifas de la ciudad que le toque.",
    nombre: 'AloTaxi',
    tipo: 'Taxi y delivery multi-ciudad',
    lugar: 'Santa Cruz · Cochabamba · Tarija · Sucre',
    estado: 'desarrollo',
    resumen:
      'El pasajero pide su taxi escribiendo por WhatsApp, sin instalar nada. ' +
      'Los conductores trabajan con una app propia hecha en Flutter, y cada ciudad ' +
      'maneja sus propias tarifas.',
    metricas: [
      { valor: '4', etiqueta: 'ciudades' },
      { valor: 'Sin app', etiqueta: 'para el pasajero' },
      { valor: 'Flutter', etiqueta: 'app de conductores' },
    ],
    features: [
      'Chatbot de WhatsApp con IA para pedir el viaje',
      'App Flutter para conductores, con notificaciones',
      'Tarifas independientes por ciudad y tipo de vehiculo',
      'Despacho por radio de cercania y prioridad',
      'Agencias asociadas que traen sus propios conductores',
      'Billetera con comision y vencimiento por inactividad',
      'Niveles por calificacion: Oro, Plata, Bronce y Observado',
      'Seguimiento del viaje en tiempo real',
    ],
    stack: ['Laravel 12', 'Flutter', 'MariaDB', 'Laravel Reverb', 'WhatsApp Business API', 'Docker', 'Coolify'],
  },
  {
    id: 'agentes',
    boceto:
      "El cliente escribe, el agente le responde con tu catalogo, y del otro lado el pedido queda anotado en tu panel.",
    nombre: 'Agentes de venta IA',
    tipo: 'Producto propio de Proshop',
    lugar: 'agentes.proshop.lat',
    estado: 'produccion',
    resumen:
      'Nuestro producto listo para usar: un agente de inteligencia artificial que ' +
      'atiende el WhatsApp de un negocio, muestra su catalogo y anota los pedidos. ' +
      'Tres paneles: el del cliente, el nuestro y la web publica.',
    metricas: [
      { valor: '24/7', etiqueta: 'atendiendo solo' },
      { valor: '3', etiqueta: 'paneles distintos' },
      { valor: 'IA', etiqueta: 'OpenAI y Claude' },
    ],
    features: [
      'Responde por WhatsApp con el catalogo real del negocio',
      'Anota el pedido y descuenta el stock solo',
      'Panel del cliente: pedidos, productos, clientes y reportes',
      'Cobro medido por conversacion, no por mensaje',
      'Paquetes adicionales que no caducan',
      'Avisos automaticos cuando se acaba el saldo',
      'Se conecta al WhatsApp que el negocio ya usa',
    ],
    stack: ['Node.js', 'Express', 'PostgreSQL', 'Prisma 7', 'OpenAI', 'Claude', 'Meta WhatsApp Cloud API'],
    enlaces: [
      // Rutas relativas: es esta misma plataforma, sirve igual en local y en produccion.
      { texto: 'Ver los planes', href: '#agente' },
      { texto: 'Crear una cuenta', href: '/registro' },
      { texto: 'Entrar al panel', href: '/ingresar' },
    ],
  },
];
