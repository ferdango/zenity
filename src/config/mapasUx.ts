/**
 * Mapas de UX de Zenity: contenido de los 9 mapas (entender, visualizar la experiencia y estructurar
 * la solución). Es investigación de escritorio armada con el brief de la primera ola, el análisis de
 * competencia, el análisis de riesgos, el roadmap y los datos de la demo (hoy = 18/11/2026). Las
 * entrevistas con dueños reales están PENDIENTES: todo lo que no sale de una fuente es hipótesis.
 *
 * Solo datos (sin React) para poder probarlo con `node --test`.
 */

export type SeccionUx = 'entender' | 'visualizar' | 'estructurar'

export type MapaId =
  | 'empatia'
  | 'afinidad'
  | 'supuestos'
  | 'customer-journey'
  | 'service-blueprint'
  | 'ecosistema'
  | 'user-flow'
  | 'site-map'
  | 'roadmap'

export interface MapaMeta {
  id: MapaId
  seccion: SeccionUx
  titulo: string
  /** La pregunta que responde el mapa (subtítulo de la tarjeta) */
  pregunta: string
  /** La respuesta en una frase: lo primero que se lee en el detalle */
  respuesta: string
  /** Cómo leer el mapa, en una línea */
  comoLeer: string
}

export const SECCIONES: Record<SeccionUx, { titulo: string; descripcion: string }> = {
  entender: { titulo: 'Entender', descripcion: 'Quién es la dueña, qué le pasa y qué creemos sin haberlo probado.' },
  visualizar: { titulo: 'Visualizar la experiencia', descripcion: 'Cómo vive Zenity paso a paso, qué pasa detrás y con quién se relaciona.' },
  estructurar: { titulo: 'Estructurar la solución', descripcion: 'Por dónde camina en la app, cómo se organiza y qué resolvemos primero.' },
}

export const ORDEN_SECCIONES: SeccionUx[] = ['entender', 'visualizar', 'estructurar']

export const MAPAS: MapaMeta[] = [
  {
    id: 'empatia',
    seccion: 'entender',
    titulo: 'Mapa de empatía',
    pregunta: '¿Qué piensa y siente la persona?',
    respuesta: 'Rosa vende bien, pero no sabe cuánto gana y diciembre la asusta: quiere respuestas y qué hacer, no reportes.',
    comoLeer: 'Lo que dice, piensa, hace y siente la dueña; abajo, sus dolores y lo que ganaría con Zenity.',
  },
  {
    id: 'afinidad',
    seccion: 'entender',
    titulo: 'Mapa de afinidad',
    pregunta: '¿Qué patrones salen del research?',
    respuesta: 'Seis patrones: no sabe si gana, su plata está en muchos lados, lo personal se mezcla, cobrar incomoda, diciembre asusta y desconfía.',
    comoLeer: 'Cada nota es un hallazgo con su fuente; las notas se agrupan por patrón y cada grupo termina en una pregunta de diseño.',
  },
  {
    id: 'supuestos',
    seccion: 'entender',
    titulo: 'Mapa de supuestos',
    pregunta: '¿Qué creemos sin haberlo probado?',
    respuesta: 'Lo más riesgoso no es la tecnología: es que la dueña vuelva cada semana, que comparta sus datos y que el banco pague por ellos.',
    comoLeer: 'Arriba lo importante, a la derecha lo que no sabemos. Lo que cae arriba a la derecha se prueba primero.',
  },
  {
    id: 'customer-journey',
    seccion: 'visualizar',
    titulo: 'Customer journey',
    pregunta: '¿Dónde se frustra en el camino?',
    respuesta: 'Se frustra dos veces: al entregar sus datos y al ver la alerta de caja. Ahí Zenity debe convertir el miedo en una acción concreta.',
    comoLeer: 'Cinco etapas de izquierda a derecha; la curva muestra cómo se siente y el punto naranja es el momento crítico.',
  },
  {
    id: 'service-blueprint',
    seccion: 'visualizar',
    titulo: 'Service blueprint',
    pregunta: '¿Qué pasa detrás de cada paso?',
    respuesta: 'Cada toque de la dueña se apoya en un motor que cruza banco, SUNAT y Yape; los puntos de falla están en las fuentes, no en la pantalla.',
    comoLeer: 'Columnas = pasos de la dueña. Arriba de la línea punteada, lo que ella ve; abajo, lo que hace Zenity y en qué se apoya.',
  },
  {
    id: 'ecosistema',
    seccion: 'visualizar',
    titulo: 'Mapa de ecosistema',
    pregunta: '¿Con quién y con qué interactúa?',
    respuesta: 'Rosa mueve dinero y datos con 15 actores; Zenity es el único que los ve juntos y trabaja para ella, no para un banco.',
    comoLeer: 'Del centro hacia afuera: su negocio, su dinero y sus datos, y el entorno. Toca un actor para ver qué intercambian.',
  },
  {
    id: 'user-flow',
    seccion: 'estructurar',
    titulo: 'User flow',
    pregunta: '¿Qué camino sigue para lograr su meta?',
    respuesta: 'De la alerta a una caja con colchón en 6 pasos: ver el aviso, decidir, recordar el cobro, anotar la promesa y confirmar en Caja.',
    comoLeer: 'Rectángulos = pantallas, rombos = decisiones, círculos = inicio y fin. Cada pantalla abre en la app.',
  },
  {
    id: 'site-map',
    seccion: 'estructurar',
    titulo: 'Site map',
    pregunta: '¿Cómo organizamos el contenido?',
    respuesta: 'Cinco pestañas: Inicio responde, Tareas hace, Caja anticipa, Zenity explica y Más guarda el resto. Lo secundario queda oculto.',
    comoLeer: 'Pantallas en recuadro sólido, secciones dentro de una pantalla en recuadro claro y lo oculto con interruptores en punteado.',
  },
  {
    id: 'roadmap',
    seccion: 'estructurar',
    titulo: 'Roadmap',
    pregunta: '¿Qué resolvemos primero?',
    respuesta: 'Primero el núcleo que aprende, que ya casi está en el prototipo; lo que falta para abrir la Puerta 1 es probarlo con 100 mypes reales.',
    comoLeer: 'Tres fases en 18 meses separadas por puertas. El relleno dice qué tanto está en el prototipo hoy.',
  },
]

export function mapaPorId(id: string | undefined): MapaMeta | undefined {
  return MAPAS.find((m) => m.id === id)
}

/* ───────────────────────── Fuentes ───────────────────────── */

export type FuenteUx = 'demo' | 'brief' | 'competencia' | 'mercado' | 'riesgos' | 'tecnica' | 'roadmap' | 'hipotesis'

export const FUENTES_UX: Record<FuenteUx, string> = {
  demo: 'Datos de la demo',
  brief: 'Brief de la primera ola',
  competencia: 'Análisis de competencia',
  mercado: 'Contexto de mercado',
  riesgos: 'Análisis de riesgos',
  tecnica: 'Notas técnicas',
  roadmap: 'Roadmap de features',
  hipotesis: 'Hipótesis del equipo',
}

/** Fuentes de cada mapa (se muestran al pie del detalle). */
export const FUENTES_MAPA: Record<MapaId, FuenteUx[]> = {
  empatia: ['demo', 'brief', 'riesgos', 'hipotesis'],
  afinidad: ['demo', 'brief', 'competencia', 'mercado', 'riesgos', 'tecnica', 'hipotesis'],
  supuestos: ['roadmap', 'riesgos', 'tecnica', 'hipotesis'],
  'customer-journey': ['demo', 'riesgos', 'hipotesis'],
  'service-blueprint': ['demo', 'brief', 'tecnica'],
  ecosistema: ['demo', 'competencia', 'tecnica'],
  'user-flow': ['demo'],
  'site-map': ['demo'],
  roadmap: ['roadmap', 'demo'],
}

/* ───────────────────────── 1. Mapa de empatía ───────────────────────── */

export const PERSONA = {
  nombre: 'Rosa Huamán Quispe',
  iniciales: 'RH',
  rol: 'Dueña de Ferretería San Martín y Bodega Doña Rosa',
  nota: 'Persona de la demo (datos ficticios del 18/11/2026)',
  datos: ['Régimen MYPE Tributario · 4 trabajadores', 'La bodega está en el Nuevo RUS', 'Cobra por Yape, POS y transferencia', 'Cuenta BCP y un contador externo'],
}

export type CuadranteEmpatia = 'dice' | 'piensa' | 'hace' | 'siente'

export const EMPATIA: Record<CuadranteEmpatia, { titulo: string; items: string[] }> = {
  dice: {
    titulo: 'Dice',
    items: [
      '«Vendo bien, pero a fin de mes no sé a dónde se fue la plata.»',
      '«Eso lo ve mi contador.»',
      '«Por Yape me pagan rápido; la boleta la doy después.»',
      '«En diciembre siempre me falta para la gratificación.»',
    ],
  },
  piensa: {
    titulo: 'Piensa',
    items: [
      '¿Me alcanza para pagar a mis 4 trabajadores y a SUNAT?',
      'Si le cobro fuerte a un cliente, lo pierdo.',
      'La plata del negocio y la mía son la misma.',
      'Sin papeles ordenados, el banco no me presta.',
    ],
  },
  hace: {
    titulo: 'Hace',
    items: [
      'Mira el saldo en la app del banco varias veces al día.',
      'Paga el súper, el colegio y Netflix con la cuenta del negocio: S/ 820 este mes.',
      'Recuerda los cobros por WhatsApp, uno por uno.',
      'Manda fotos y extractos al contador a fin de mes.',
    ],
  },
  siente: {
    titulo: 'Siente',
    items: ['Ansiedad cuando se acerca diciembre.', 'Miedo a SUNAT y a las multas.', 'Vergüenza de «no ser de números».', 'Orgullo por el negocio que levantó.'],
  },
}

export const DOLORES = [
  'No sabe si gana o pierde hasta que el contador le dice.',
  'La caja baja sin aviso: el 20/12 llega a S/ 6,437.',
  'Le deben S/ 9,300 y le incomoda cobrar.',
  'Mezcla los gastos de la casa con los del negocio.',
]

export const GANANCIAS = [
  'Saber en 5 segundos cuánto entró, cuánto salió y cuánto quedó.',
  'Un aviso con semanas de anticipación y qué hacer.',
  'El mensaje de cobro listo, con el tono justo.',
  'Pagarse un sueldo fijo y tener un historial que el banco le crea.',
]

/* ───────────────────────── 2. Mapa de afinidad ───────────────────────── */

export interface NotaAfinidad {
  texto: string
  fuente: FuenteUx
}

export interface GrupoAfinidad {
  id: string
  titulo: string
  notas: NotaAfinidad[]
  /** Pregunta de diseño «¿Cómo podríamos…?» */
  pregunta: string
  /** Dónde responde Zenity hoy */
  enZenity: string
}

export const AFINIDAD: GrupoAfinidad[] = [
  {
    id: 'gana',
    titulo: 'No sabe si gana o pierde',
    notas: [
      { texto: 'El software contable lo usa el contador; el dueño no lo entiende.', fuente: 'competencia' },
      { texto: 'Facturación y POS solo ven lo que se factura, no el banco ni Yape.', fuente: 'competencia' },
      { texto: '3 Yapes sin boleta este mes: ventas que SUNAT no ve.', fuente: 'demo' },
      { texto: 'Quiere 5 respuestas: cuánto entró, salió y queda, qué gana más y qué pierde más.', fuente: 'hipotesis' },
    ],
    pregunta: '¿Cómo podríamos decirle en 5 segundos cuánto ganó de verdad?',
    enZenity: 'Inicio («Cómo te va en el mes») y Estado de resultados',
  },
  {
    id: 'plata',
    titulo: 'Su plata está en muchos lados',
    notas: [
      { texto: 'En un mismo día: BCP, Yape, POS Niubiz y efectivo.', fuente: 'demo' },
      { texto: 'Cada banco ve solo su dato; ninguno junta los de la competencia.', fuente: 'competencia' },
      { texto: 'Yape y Plin no tienen una API pública de movimientos.', fuente: 'tecnica' },
      { texto: 'El POS abona neto: 23 ventas menos S/ 73.03 de comisión.', fuente: 'demo' },
    ],
    pregunta: '¿Cómo podríamos juntar banco, SUNAT y Yape sin que ella haga nada?',
    enZenity: 'Conexiones y la conciliación de tres vías',
  },
  {
    id: 'personal',
    titulo: 'Lo personal se mezcla',
    notas: [
      { texto: 'S/ 820 de gasto personal este mes, en 6 movimientos.', fuente: 'demo' },
      { texto: 'Súper, pensión del colegio, Netflix y delivery salen de la cuenta del negocio.', fuente: 'demo' },
      { texto: 'No tiene un sueldo de dueño definido.', fuente: 'demo' },
    ],
    pregunta: '¿Cómo podríamos ayudarla a pagarse un sueldo sin culpa?',
    enZenity: 'Gasto personal con sueldo de dueño y reto de 30 días',
  },
  {
    id: 'cobrar',
    titulo: 'Cobrar incomoda',
    notas: [
      { texto: 'Le deben S/ 9,300 entre varios clientes.', fuente: 'demo' },
      { texto: 'Multiservicios Rímac lleva 45 días de atraso con S/ 2,950.', fuente: 'demo' },
      { texto: 'Recordar es manual: WhatsApp, uno por uno, sin anotar promesas.', fuente: 'hipotesis' },
      { texto: 'Una promesa de pago cambia la caja: la alerta de diciembre desaparece.', fuente: 'demo' },
    ],
    pregunta: '¿Cómo podríamos darle el mensaje justo para cobrar sin perder al cliente?',
    enZenity: 'Cobrar: tono según el atraso, WhatsApp y promesa de pago',
  },
  {
    id: 'diciembre',
    titulo: 'Diciembre asusta',
    notas: [
      { texto: 'El 20/12 la caja baja a S/ 6,437, bajo su colchón de S/ 7,659.', fuente: 'demo' },
      { texto: 'Gratificación de diciembre: S/ 3,052 con 4 trabajadores.', fuente: 'demo' },
      { texto: 'Los picos peruanos: gratificación, IGV, CTS y planilla.', fuente: 'brief' },
    ],
    pregunta: '¿Cómo podríamos avisarle con semanas de anticipación y decirle qué hacer?',
    enZenity: 'Caja 30/60/90 y la decisión de la semana',
  },
  {
    id: 'confianza',
    titulo: 'Desconfía y le cuesta el crédito',
    notas: [
      { texto: 'Solo 1 de cada 4 mypes accede a crédito.', fuente: 'mercado' },
      { texto: 'Más de 2 millones de pymes siguen con papel y lápiz.', fuente: 'mercado' },
      { texto: 'Entregar la Clave SOL es el riesgo más grave para el usuario.', fuente: 'riesgos' },
      { texto: 'Teme que la IA decida sola sin avisarle.', fuente: 'riesgos' },
    ],
    pregunta: '¿Cómo podríamos ganar su confianza explicando cada decisión?',
    enZenity: 'Permisos por fuente, confianza y motivo, «Deshacer»',
  },
]

/* ───────────────────────── 3. Mapa de supuestos ───────────────────────── */

export type TipoSupuesto = 'deseable' | 'viable' | 'factible'

export const TIPO_SUPUESTO: Record<TipoSupuesto, string> = {
  deseable: 'Deseabilidad',
  viable: 'Viabilidad',
  factible: 'Factibilidad',
}

export interface Supuesto {
  id: string
  texto: string
  tipo: TipoSupuesto
  /** 0 = lo sabemos (hay evidencia), 1 = no lo sabemos */
  incertidumbre: number
  /** 0 = poco importante, 1 = el negocio depende de esto */
  importancia: number
  /** Qué evidencia hay hoy */
  evidencia: string
  /** Cómo lo probamos */
  prueba: string
}

export const SUPUESTOS: Supuesto[] = [
  {
    id: 'S1',
    texto: 'La dueña vuelve a Zenity cada semana',
    tipo: 'deseable',
    incertidumbre: 0.82,
    importancia: 0.95,
    evidencia: 'Ninguna: la demo tiene la fecha fija y no hay usuarios reales.',
    prueba: 'Piloto con negocios reales y la métrica «dueños que vuelven cada semana» en PostHog.',
  },
  {
    id: 'S2',
    texto: 'Da permiso de lectura a su banco, SUNAT y Yape',
    tipo: 'deseable',
    incertidumbre: 0.7,
    importancia: 0.9,
    evidencia: 'El texto de permisos existe como borrador para revisión legal.',
    prueba: 'Medir cuántos aceptan en la configuración inicial del piloto y por qué fuente se detienen.',
  },
  {
    id: 'S3',
    texto: 'Comparte su Clave SOL o un usuario secundario',
    tipo: 'factible',
    incertidumbre: 0.88,
    importancia: 0.74,
    evidencia: 'Es el riesgo más grave del análisis de riesgos; no se sabe si el SIRE acepta usuario secundario SOL.',
    prueba: 'Confirmar el usuario secundario con SUNAT y preguntarlo en entrevistas.',
  },
  {
    id: 'S4',
    texto: 'La conciliación de tres vías acierta sola la mayoría de movimientos',
    tipo: 'factible',
    incertidumbre: 0.66,
    importancia: 0.86,
    evidencia: '14 casos y sus reglas probados con datos de ejemplo (npm test).',
    prueba: 'Correr el motor con los Excel reales de las empresas propias y medir cuánto se corrige.',
  },
  {
    id: 'S5',
    texto: 'Se pueden leer BCP y Yape sin una API pública',
    tipo: 'factible',
    incertidumbre: 0.4,
    importancia: 0.88,
    evidencia: 'El prototipo ya lee extractos .xlsx y .csv con el formato BCP; Yape se ve por la cuenta de abono.',
    prueba: 'Probar con un extracto real del BCP (PENDIENTE).',
  },
  {
    id: 'S6',
    texto: 'El banco paga por un ingreso verificado y menor mora',
    tipo: 'viable',
    incertidumbre: 0.9,
    importancia: 0.82,
    evidencia: 'Ninguna todavía; es la Puerta 2 del roadmap.',
    prueba: 'Acuerdo de piloto con el BCP (Puerta 1) y medir la mora de los créditos originados.',
  },
  {
    id: 'S7',
    texto: 'Gratis para la dueña, pagado por el banco y el contador',
    tipo: 'viable',
    incertidumbre: 0.84,
    importancia: 0.68,
    evidencia: 'Hipótesis del análisis de competencia; los precios por plan siguen como propuesta.',
    prueba: 'Conversaciones de precio con el BCP y con contadores.',
  },
  {
    id: 'S8',
    texto: 'XP, racha y lecciones crean hábito en dueños de mypes',
    tipo: 'deseable',
    incertidumbre: 0.78,
    importancia: 0.44,
    evidencia: 'Funciona en Duolingo; no se ha probado con dueños.',
    prueba: 'Validar XP, meta diaria y preguntas con dueños reales.',
  },
  {
    id: 'S9',
    texto: 'Los contadores recomiendan Zenity a sus clientes',
    tipo: 'viable',
    incertidumbre: 0.72,
    importancia: 0.34,
    evidencia: 'Es el canal que hizo crecer a Xero; el portal del contador salió del prototipo.',
    prueba: 'Puerta 2: 50 contadores activos.',
  },
  {
    id: 'S10',
    texto: 'Diciembre es el mes más duro de caja',
    tipo: 'deseable',
    incertidumbre: 0.14,
    importancia: 0.72,
    evidencia: 'La gratificación de diciembre y el IGV se pagan por ley el mismo mes.',
    prueba: 'Ya se sabe: basta con confirmar el tamaño del bache en el piloto.',
  },
  {
    id: 'S11',
    texto: 'Prefiere recordar los cobros por WhatsApp desde su celular',
    tipo: 'deseable',
    incertidumbre: 0.3,
    importancia: 0.4,
    evidencia: 'WhatsApp es su canal con clientes; la app abre el mensaje con wa.me.',
    prueba: 'Contar recordatorios enviados y cobros después del recordatorio.',
  },
  {
    id: 'S12',
    texto: 'Entiende «colchón» y la proyección a 30, 60 y 90 días',
    tipo: 'deseable',
    incertidumbre: 0.6,
    importancia: 0.24,
    evidencia: 'El gráfico de barras se rediseñó para leerse en 5 segundos.',
    prueba: 'Prueba de 5 segundos con el gráfico de Caja.',
  },
]

export type CuadranteSupuesto = 'probar' | 'planear' | 'investigar' | 'vigilar'

export const CUADRANTES_SUPUESTOS: Record<CuadranteSupuesto, { titulo: string; detalle: string }> = {
  probar: { titulo: 'Probar primero', detalle: 'Importante y no lo sabemos' },
  planear: { titulo: 'Planear', detalle: 'Importante y ya lo sabemos' },
  investigar: { titulo: 'Investigar después', detalle: 'Menos importante y no lo sabemos' },
  vigilar: { titulo: 'Vigilar', detalle: 'Menos importante y ya lo sabemos' },
}

export function cuadranteDe(s: Pick<Supuesto, 'incertidumbre' | 'importancia'>): CuadranteSupuesto {
  const importante = s.importancia >= 0.5
  const desconocido = s.incertidumbre >= 0.5
  if (importante) return desconocido ? 'probar' : 'planear'
  return desconocido ? 'investigar' : 'vigilar'
}

/* ───────────────────────── 4. Customer journey ───────────────────────── */

export interface EtapaJourney {
  id: string
  titulo: string
  hace: string
  piensa: string
  /** −2 (muy mal) a +2 (muy bien) */
  emocion: number
  emocionTexto: string
  contacto: string[]
  dolor: string
  oportunidad: string
  /** Momento crítico (punto naranja) */
  critico?: boolean
}

export const JOURNEY: EtapaJourney[] = [
  {
    id: 'descubre',
    titulo: 'Descubre',
    hace: 'Su banco o su contador le habla de Zenity y entra a la demo desde el celular.',
    piensa: '«¿Otra app de finanzas? Eso es para contadores.»',
    emocion: 0.2,
    emocionTexto: 'Curiosa, con dudas',
    contacto: ['BCP', 'Contador', 'WhatsApp', '«Ver la demo»'],
    dolor: 'No ve por qué la necesitaría.',
    oportunidad: 'Mostrar un negocio de verdad en 5 segundos, sin registrarse.',
  },
  {
    id: 'configura',
    titulo: 'Configura',
    hace: 'Autoriza sus datos por fuente y llena su planilla: pequeña empresa, 4 trabajadores.',
    piensa: '«¿Y si le doy mis datos a cualquiera?»',
    emocion: -0.9,
    emocionTexto: 'Desconfiada',
    contacto: ['Tus datos', 'Tu planilla', 'Conexiones'],
    dolor: 'Miedo a entregar la Clave SOL y los datos del banco.',
    oportunidad: 'Solo lectura, por fuente y revocable; «¿De dónde sale este saldo?».',
  },
  {
    id: 'ordena',
    titulo: 'Ordena',
    hace: 'Ve su saldo BCP de S/ 10,655.66 y resuelve 6 movimientos dudosos con un toque cada uno.',
    piensa: '«Por fin veo todo junto.»',
    emocion: 1.5,
    emocionTexto: 'Aliviada',
    contacto: ['Inicio', 'Por revisar', 'Conciliación'],
    dolor: 'Pagos sin boleta que no sabe cómo clasificar.',
    oportunidad: 'Reglas que aprenden: «¿Aplicar siempre a pagos a J. Cárdenas?».',
  },
  {
    id: 'decide',
    titulo: 'Decide en la semana',
    hace: 'Ve «El 20/12 tu caja baja a S/ 6,437» y elige cobrar lo vencido.',
    piensa: '«¿Me va a alcanzar para la gratificación?»',
    emocion: -1.6,
    emocionTexto: 'Asustada, luego en control',
    contacto: ['Alerta de caja', 'Decisión de la semana', 'Cobrar', 'WhatsApp'],
    dolor: 'Le incomoda cobrar: Rímac le debe S/ 2,950 hace 45 días.',
    oportunidad: 'El mensaje con el tono justo y la promesa que entra a la caja.',
    critico: true,
  },
  {
    id: 'cierra',
    titulo: 'Cierra el mes',
    hace: 'Mira su utilidad real, su pago a SUNAT y su avance; manda el CSV al contador.',
    piensa: '«Este mes sí sé cuánto gané.»',
    emocion: 1.8,
    emocionTexto: 'Orgullosa',
    contacto: ['Estado de resultados', 'SUNAT del mes', 'Tu camino'],
    dolor: 'Puede leer como exacta una cifra de impuestos estimada.',
    oportunidad: '«¡Lo lograste!» y recompensas por resultados reales, no por usar la app.',
  },
]

/* ───────────────────────── 5. Service blueprint ───────────────────────── */

export type CarrilBlueprint = 'evidencia' | 'cliente' | 'frontstage' | 'backstage' | 'soporte'

export const CARRILES: { id: CarrilBlueprint; titulo: string; detalle: string }[] = [
  { id: 'evidencia', titulo: 'Evidencia', detalle: 'Lo que ve y le queda' },
  { id: 'cliente', titulo: 'La dueña', detalle: 'Lo que hace' },
  { id: 'frontstage', titulo: 'Zenity en pantalla', detalle: 'Frontstage' },
  { id: 'backstage', titulo: 'Motor de Zenity', detalle: 'Backstage' },
  { id: 'soporte', titulo: 'Sistemas y aliados', detalle: 'Procesos de soporte' },
]

export interface PasoBlueprint {
  id: string
  titulo: string
  celdas: Record<CarrilBlueprint, string>
  /** Punto de falla del paso */
  falla: string
}

export const BLUEPRINT: PasoBlueprint[] = [
  {
    id: 'conecta',
    titulo: 'Conecta sus cuentas',
    celdas: {
      evidencia: 'Pantalla «Tus datos» con un permiso por fuente',
      cliente: 'Acepta los permisos y sube el extracto del BCP',
      frontstage: 'Configuración inicial, Conexiones y Subir extracto',
      backstage: 'Lee el .xlsx o .csv, deduce canal y contraparte y no duplica lo que ya está',
      soporte: 'BCP (extracto), Yape y POS por la cuenta de abono, SUNAT SIRE',
    },
    falla: 'Yape y Plin no tienen API pública',
  },
  {
    id: 'revisa',
    titulo: 'Revisa lo dudoso',
    celdas: {
      evidencia: 'Tarjeta con la confianza y el motivo (Baja 35%)',
      cliente: 'Toca la categoría o «Correcto»; responde «Sí, siempre»',
      frontstage: 'Por revisar, una tarjeta a la vez, con «Deshacer» de 5 s',
      backstage: 'Concilia con reglas (exacto, en partes, detracción, POS agrupado) y guarda la regla',
      soporte: 'Reglas guardadas y datos de entrenamiento por rubro',
    },
    falla: 'Confianza menor a 70%',
  },
  {
    id: 'cobra',
    titulo: 'Recuerda un cobro',
    celdas: {
      evidencia: 'Mensaje con monto, F001-454 y formas de pago',
      cliente: 'Toca Recordar, abre WhatsApp y anota la promesa',
      frontstage: 'Cobrar: lista por días de atraso y monto',
      backstage: 'Calcula el tramo de atraso, elige el tono y suma la promesa a la proyección',
      soporte: 'WhatsApp por wa.me, sin Business API',
    },
    falla: 'Zenity no envía el mensaje por ella',
  },
  {
    id: 'anticipa',
    titulo: 'Mira su caja',
    celdas: {
      evidencia: 'Barras por semana y la frase «El 20/12 tu caja baja a…»',
      cliente: 'Revisa el bache y elige una opción de la decisión de la semana',
      frontstage: 'Caja 30/60/90 y Decisión de la semana',
      backstage: 'Proyecta ventas, pagos recurrentes, gratificación, CTS e impuestos y simula cada opción',
      soporte: 'Parámetros 2026: UIT, IGV y regímenes laborales',
    },
    falla: 'Error de la proyección a 7 días',
  },
  {
    id: 'sunat',
    titulo: 'Paga a SUNAT',
    celdas: {
      evidencia: 'Total, vencimiento y días que faltan',
      cliente: 'Abre el desglose y paga desde su banco',
      frontstage: 'SUNAT del mes en el Inicio',
      backstage: 'Estima IGV, renta y EsSalud del periodo y el vencimiento por el último dígito del RUC',
      soporte: 'Cronograma de vencimientos SUNAT',
    },
    falla: 'El cronograma es de ejemplo',
  },
]

/* ───────────────────────── 6. Mapa de ecosistema ───────────────────────── */

export type FlujoEcosistema = 'dinero' | 'datos' | 'info'

export const FLUJOS: Record<FlujoEcosistema, string> = {
  dinero: 'Dinero',
  datos: 'Datos',
  info: 'Información',
}

export const ANILLOS = ['Su negocio', 'Su dinero y sus datos', 'El entorno'] as const

export interface ActorEcosistema {
  id: string
  nombre: string
  /** Etiqueta corta para el anillo */
  corto: string
  /** 1 = su negocio, 2 = dinero y datos, 3 = entorno */
  anillo: 1 | 2 | 3
  flujo: FlujoEcosistema
  relacion: string
  zenity: string
}

export const ECOSISTEMA: ActorEcosistema[] = [
  { id: 'trabajadores', nombre: 'Trabajadores (4)', corto: 'Equipo', anillo: 1, flujo: 'dinero', relacion: 'Les paga sueldo, gratificación y CTS de pequeña empresa.', zenity: 'Proyecta la planilla y la gratificación de S/ 3,052 en la caja.' },
  { id: 'clientes', nombre: 'Clientes que le deben', corto: 'Clientes', anillo: 1, flujo: 'dinero', relacion: 'Le compran al contado y al crédito; hoy le deben S/ 9,300.', zenity: 'Ordena la deuda por atraso y arma el recordatorio por WhatsApp.' },
  { id: 'proveedores', nombre: 'Proveedores', corto: 'Proveedores', anillo: 1, flujo: 'dinero', relacion: 'Le venden mercadería; algunos le cobran todos los meses.', zenity: 'Detecta los pagos recurrentes y los suma a la proyección.' },
  { id: 'contador', nombre: 'Contador', corto: 'Contador', anillo: 1, flujo: 'info', relacion: 'Lleva sus libros y declara; recibe fotos y extractos a fin de mes.', zenity: 'Le pasa el estado de resultados en CSV y los movimientos ordenados.' },
  { id: 'bcp', nombre: 'BCP', corto: 'BCP', anillo: 2, flujo: 'datos', relacion: 'Su cuenta principal: ahí se abonan Yape y el POS.', zenity: 'Lee el extracto en Excel o CSV, solo lectura.' },
  { id: 'yape', nombre: 'Yape', corto: 'Yape', anillo: 2, flujo: 'dinero', relacion: 'Le pagan con QR y se abona en la cuenta BCP.', zenity: 'Lo concilia por la cuenta de abono, sin contar dos veces.' },
  { id: 'plin', nombre: 'Plin', corto: 'Plin', anillo: 2, flujo: 'dinero', relacion: 'Otra billetera con la que le pagan.', zenity: 'Igual que Yape: por la cuenta donde se abona.' },
  { id: 'pos', nombre: 'POS (Niubiz e Izipay)', corto: 'POS', anillo: 2, flujo: 'dinero', relacion: 'Cobra con tarjeta y le liquidan neto de comisión.', zenity: 'Explica la liquidación: 23 ventas menos S/ 73.03.' },
  { id: 'sunat', nombre: 'SUNAT · SIRE', corto: 'SUNAT', anillo: 2, flujo: 'datos', relacion: 'Recibe sus comprobantes y le cobra IGV y renta cada mes.', zenity: 'Cruza boletas y facturas con el banco y estima el pago del mes.' },
  { id: 'bn', nombre: 'Banco de la Nación', corto: 'B. Nación', anillo: 2, flujo: 'dinero', relacion: 'Guarda sus detracciones.', zenity: 'Avisa lo que quedó en la cuenta de detracciones: S/ 240.' },
  { id: 'sbs', nombre: 'SBS · Finanzas abiertas', corto: 'SBS', anillo: 3, flujo: 'datos', relacion: 'Regula a los bancos; las finanzas abiertas pueden abrir los datos de todos.', zenity: 'Conexión futura (fase 3 del roadmap).' },
  { id: 'bancos', nombre: 'Otros bancos (BBVA, Scotiabank, Pichincha)', corto: 'Otros bancos', anillo: 3, flujo: 'info', relacion: 'Le ofrecen crédito con lo poco que cada uno ve.', zenity: 'Neutral entre bancos: el perfil es de ella y lo comparte con quien elija.' },
  { id: 'apps', nombre: 'Alegra, Treinta y apps de banco', corto: 'Otras apps', anillo: 3, flujo: 'info', relacion: 'Facturan, anotan a mano o muestran un solo banco.', zenity: 'No compite en facturación: se integra.' },
  { id: 'whatsapp', nombre: 'WhatsApp', corto: 'WhatsApp', anillo: 3, flujo: 'info', relacion: 'Donde habla con clientes, proveedores y su contador.', zenity: 'Abre el recordatorio listo con wa.me; no envía por ella.' },
  { id: 'ley', nombre: 'Ley 29733 de datos personales', corto: 'Ley 29733', anillo: 3, flujo: 'info', relacion: 'Protege sus datos y los de sus clientes.', zenity: 'Permisos por fuente, solo lectura y revocables.' },
]

/* ───────────────────────── 7. User flow ───────────────────────── */

export type TipoNodoFlujo = 'inicio' | 'pantalla' | 'decision' | 'fin'

export interface NodoFlujo {
  id: string
  tipo: TipoNodoFlujo
  titulo: string
  detalle?: string
  /** Centro en el lienzo (viewBox 1160 × 500) */
  x: number
  y: number
  /** Pantalla de la app que abre */
  ruta?: string
}

export interface FlechaFlujo {
  desde: string
  hasta: string
  etiqueta?: string
  /** Puntos intermedios del trazo (codos) */
  via?: Array<[number, number]>
  /** Lado de salida y de llegada */
  sale?: 'arriba' | 'abajo' | 'derecha' | 'izquierda'
  llega?: 'arriba' | 'abajo' | 'derecha' | 'izquierda'
}

export const FLUJO_META = 'Que la caja no baje del colchón en diciembre'

export const FLUJO_NODOS: NodoFlujo[] = [
  { id: 'abre', tipo: 'inicio', titulo: 'Abre Zenity', x: 44, y: 130 },
  { id: 'inicio', tipo: 'pantalla', titulo: 'Inicio', detalle: 'Saldo y alerta de caja', x: 180, y: 130, ruta: '/inicio' },
  { id: 'baja', tipo: 'decision', titulo: '¿Baja del colchón?', x: 350, y: 130 },
  { id: 'avance', tipo: 'pantalla', titulo: 'Tareas', detalle: 'Sigue su camino', x: 350, y: 300, ruta: '/tareas' },
  { id: 'fin-ok', tipo: 'fin', titulo: 'Semana tranquila', x: 350, y: 430 },
  { id: 'decision', tipo: 'pantalla', titulo: 'Decisión de la semana', detalle: 'Cada opción simulada', x: 520, y: 130, ruta: '/tareas' },
  { id: 'elige', tipo: 'decision', titulo: '¿Qué elige?', x: 690, y: 130 },
  { id: 'cobrar', tipo: 'pantalla', titulo: 'Cobrar', detalle: 'Recordar con tono firme', x: 880, y: 130, ruta: '/cobrar' },
  { id: 'mover', tipo: 'pantalla', titulo: 'Caja', detalle: 'Mueve el pago del bache', x: 690, y: 300, ruta: '/caja' },
  { id: 'promete', tipo: 'decision', titulo: '¿Promete pagar?', x: 1060, y: 130 },
  { id: 'promesa', tipo: 'pantalla', titulo: 'Registrar promesa', detalle: 'S/ 2,950 el 25/11', x: 1060, y: 300, ruta: '/cobrar' },
  { id: 'caja', tipo: 'pantalla', titulo: 'Caja', detalle: 'La alerta desaparece', x: 880, y: 430, ruta: '/caja' },
  { id: 'fin', tipo: 'fin', titulo: '¡Lo lograste! +XP', x: 1060, y: 430 },
]

export const FLUJO_FLECHAS: FlechaFlujo[] = [
  { desde: 'abre', hasta: 'inicio' },
  { desde: 'inicio', hasta: 'baja' },
  { desde: 'baja', hasta: 'decision', etiqueta: 'Sí' },
  { desde: 'baja', hasta: 'avance', etiqueta: 'No', sale: 'abajo', llega: 'arriba' },
  { desde: 'avance', hasta: 'fin-ok', sale: 'abajo', llega: 'arriba' },
  { desde: 'decision', hasta: 'elige' },
  { desde: 'elige', hasta: 'cobrar', etiqueta: 'Cobrar lo vencido' },
  { desde: 'elige', hasta: 'mover', etiqueta: 'Mover un pago', sale: 'abajo', llega: 'arriba' },
  { desde: 'cobrar', hasta: 'promete' },
  { desde: 'promete', hasta: 'cobrar', etiqueta: 'No: recordar después', sale: 'arriba', llega: 'arriba', via: [[1060, 46], [880, 46]] },
  { desde: 'promete', hasta: 'promesa', etiqueta: 'Sí', sale: 'abajo', llega: 'arriba' },
  { desde: 'promesa', hasta: 'caja', sale: 'abajo', llega: 'arriba', via: [[1060, 366], [880, 366]] },
  { desde: 'mover', hasta: 'caja', sale: 'abajo', llega: 'izquierda', via: [[690, 430]] },
  { desde: 'caja', hasta: 'fin' },
]

/* ───────────────────────── 8. Site map ───────────────────────── */

export type TipoNodoSitio = 'pantalla' | 'seccion' | 'oculto'

export interface NodoSitio {
  titulo: string
  ruta?: string
  tipo: TipoNodoSitio
  hijos?: NodoSitio[]
}

export interface RamaSitio {
  id: string
  titulo: string
  icono: string
  ruta: string
  nota: string
  hijos: NodoSitio[]
}

export const SITIO_RAMAS: RamaSitio[] = [
  {
    id: 'entrada',
    titulo: 'Entrada',
    icono: 'login',
    ruta: '/',
    nota: 'Antes de la app',
    hijos: [
      { titulo: 'Bienvenida', ruta: '/', tipo: 'pantalla' },
      { titulo: 'Ingresar y verificar', ruta: '/login', tipo: 'pantalla' },
      { titulo: 'Registro en 2 pasos', ruta: '/registro/datos', tipo: 'pantalla' },
      {
        titulo: 'Configuración inicial',
        ruta: '/bienvenida',
        tipo: 'pantalla',
        hijos: [
          { titulo: 'Tus datos', tipo: 'seccion' },
          { titulo: 'Tu planilla', tipo: 'seccion' },
        ],
      },
    ],
  },
  {
    id: 'inicio',
    titulo: 'Inicio',
    icono: 'home',
    ruta: '/inicio',
    nota: 'Responde',
    hijos: [
      { titulo: 'Saldo y su origen', tipo: 'seccion' },
      { titulo: 'Alerta de caja', tipo: 'seccion' },
      { titulo: 'Cómo te va en el mes', tipo: 'seccion' },
      { titulo: 'Tu avance', tipo: 'seccion' },
      { titulo: 'Decisión de la semana', tipo: 'seccion' },
      { titulo: 'SUNAT del mes', tipo: 'seccion' },
      { titulo: 'Tus cuentas', tipo: 'seccion' },
    ],
  },
  {
    id: 'tareas',
    titulo: 'Tareas',
    icono: 'task_alt',
    ruta: '/tareas',
    nota: 'Hace',
    hijos: [
      { titulo: 'Por revisar', ruta: '/revisar', tipo: 'pantalla' },
      { titulo: 'Cobrar', ruta: '/cobrar', tipo: 'pantalla' },
      { titulo: 'Tu camino', ruta: '/progreso', tipo: 'pantalla' },
      { titulo: 'Recompensas', ruta: '/recompensas', tipo: 'pantalla' },
      { titulo: 'Tienda de puntos', ruta: '/tienda', tipo: 'pantalla' },
    ],
  },
  {
    id: 'caja',
    titulo: 'Caja',
    icono: 'monitoring',
    ruta: '/caja',
    nota: 'Anticipa',
    hijos: [
      { titulo: 'Barras por semana', tipo: 'seccion' },
      { titulo: 'Lo que viene por mes', tipo: 'seccion' },
      { titulo: 'Régimen laboral y colchón', tipo: 'seccion' },
    ],
  },
  {
    id: 'zenity',
    titulo: 'Zenity',
    icono: 'auto_awesome',
    ruta: '/chat',
    nota: 'Explica',
    hijos: [{ titulo: 'Pregúntale a Zenity', ruta: '/chat', tipo: 'pantalla' }],
  },
  {
    id: 'mas',
    titulo: 'Más',
    icono: 'apps',
    ruta: '/mas',
    nota: 'Guarda el resto',
    hijos: [
      { titulo: 'Estado de resultados', ruta: '/resultados', tipo: 'pantalla' },
      {
        titulo: 'Conexiones',
        ruta: '/conexiones',
        tipo: 'pantalla',
        hijos: [{ titulo: 'Nueva conexión', ruta: '/conexiones/nueva', tipo: 'pantalla' }],
      },
      { titulo: 'Gasto personal', ruta: '/personal', tipo: 'pantalla' },
      { titulo: 'Subir extracto', ruta: '/conciliacion?subir=1', tipo: 'pantalla' },
      { titulo: 'Permisos de datos', ruta: '/permisos', tipo: 'pantalla' },
      { titulo: 'Tu planilla', ruta: '/bienvenida?paso=planilla', tipo: 'pantalla' },
      { titulo: 'Mapas de UX', ruta: '/ux', tipo: 'pantalla' },
    ],
  },
]

/** Pantallas que existen pero están ocultas con interruptores (`src/lib/features.ts`). */
export const SITIO_OCULTOS: NodoSitio[] = [
  { titulo: 'Conciliación', ruta: '/conciliacion', tipo: 'oculto' },
  { titulo: 'Simulador de régimen', ruta: '/regimen', tipo: 'oculto' },
  { titulo: 'Aprende', ruta: '/aprende', tipo: 'oculto' },
  { titulo: 'Datos de entrenamiento', ruta: '/datos', tipo: 'oculto' },
  { titulo: 'Métricas del piloto', ruta: '/metricas', tipo: 'oculto' },
  { titulo: 'Ingresos y egresos', ruta: '/movimientos/ingresos', tipo: 'oculto' },
  { titulo: 'Balance', ruta: '/resumen', tipo: 'oculto' },
  { titulo: 'Revisado por Zenity', ruta: '/revisado', tipo: 'oculto' },
  { titulo: 'Cierre de caja', ruta: '/cierre-caja', tipo: 'oculto' },
  { titulo: 'SUNAT · SIRE', ruta: '/sunat/balance', tipo: 'oculto' },
]

/* ───────────────────────── 9. Roadmap ───────────────────────── */

export type EstadoRoadmap = 'hecho' | 'parcial' | 'falta' | 'retirado'

export const ESTADO_ROADMAP: Record<EstadoRoadmap, string> = {
  hecho: 'Hecho en el prototipo',
  parcial: 'A medias',
  falta: 'Falta',
  retirado: 'Retirado del prototipo',
}

export interface ItemRoadmap {
  titulo: string
  estado: EstadoRoadmap
  nota?: string
}

export interface FaseRoadmap {
  id: string
  titulo: string
  meses: string
  /** Inicio y fin en meses (0 = arranque, fecha PENDIENTE) */
  desde: number
  hasta: number
  items: ItemRoadmap[]
}

export interface PuertaRoadmap {
  titulo: string
  criterio: string
  /** Mes en que se evalúa */
  mes: number
}

export const ROADMAP_FASES: FaseRoadmap[] = [
  {
    id: 'f1',
    titulo: 'Núcleo que aprende',
    meses: 'Meses 0 a 3',
    desde: 0,
    hasta: 3,
    items: [
      { titulo: 'Conciliación de tres vías', estado: 'hecho' },
      { titulo: 'Corrección en un toque', estado: 'hecho' },
      { titulo: 'Mapeo al Plan Contable', estado: 'hecho', nota: 'Falta validarlo con un contador piloto' },
      { titulo: 'Alertas de descuadre tributario', estado: 'hecho' },
      { titulo: 'Separación personal / negocio', estado: 'hecho' },
    ],
  },
  {
    id: 'f2',
    titulo: 'Banco y cumplimiento',
    meses: 'Meses 3 a 9',
    desde: 3,
    hasta: 9,
    items: [
      { titulo: 'F3 Perfil crediticio para el BCP', estado: 'retirado', nota: 'Se quitó el 19/11; recuperable en git' },
      { titulo: 'F6 Piloto automático SIRE', estado: 'parcial', nota: 'Vencimientos de ejemplo; sin borrador de declaración' },
      { titulo: 'F11 Proyección de caja', estado: 'hecho' },
      { titulo: 'F9 Portal del contador', estado: 'retirado', nota: 'Se quitó el 19/11; recuperable en git' },
      { titulo: 'F10 Referidos para contadores', estado: 'falta' },
    ],
  },
  {
    id: 'f3',
    titulo: 'Escala y red',
    meses: 'Meses 9 a 18',
    desde: 9,
    hasta: 18,
    items: [
      { titulo: 'F1 Benchmark por rubro', estado: 'falta', nota: 'Necesita miles de negocios' },
      { titulo: 'F2 Índice de salud financiera', estado: 'falta' },
      { titulo: 'F4 Señales tempranas de riesgo', estado: 'retirado', nota: 'Vivía en la vista del banco' },
      { titulo: 'F12 Asistente por WhatsApp', estado: 'parcial', nota: 'El chat está en la app; WhatsApp no' },
      { titulo: 'Conexión a Finanzas Abiertas', estado: 'falta' },
    ],
  },
]

export const ROADMAP_PUERTAS: PuertaRoadmap[] = [
  { titulo: 'Puerta 1: piloto BCP', criterio: 'Acuerdo firmado y 100 mypes usando la conciliación', mes: 3 },
  { titulo: 'Puerta 2: crédito validado', criterio: 'Primeros créditos BCP vía Zenity y 50 contadores activos', mes: 9 },
  { titulo: 'Puerta 3: decidir Brasil', criterio: 'Solo con Perú creciendo y sin depender del BCP', mes: 18 },
]

/** Lo que el prototipo ya tiene fuera de las tres fases (octubre y noviembre de 2026). */
export const ROADMAP_EXTRA: ItemRoadmap[] = [
  { titulo: 'F13 Cobranza asistida', estado: 'hecho', nota: 'Recordatorio por wa.me' },
  { titulo: 'Tu camino, XP y recompensas', estado: 'hecho' },
  { titulo: 'Decisión de la semana', estado: 'hecho' },
  { titulo: 'Estado de resultados', estado: 'hecho' },
  { titulo: 'F7 Simulador de régimen', estado: 'hecho', nota: 'Oculto con un interruptor' },
]
