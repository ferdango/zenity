/**
 * Microlecciones de educación financiera (sección 6 del brief).
 * Cada una: ≤ 120 palabras, español simple, «¿Cómo te afecta?» con el número real del negocio y una acción.
 */
import type { LessonId } from '../domain/types.ts'

export interface LessonContext {
  negocio: string
  yapesSinBoleta: { count: number; monto: string }
  pagosSinFactura: { count: number; monto: string; igv: string }
  detraccion: { monto: string; doc: string } | null
  retencion: { monto: string; cliente: string } | null
  personalMes: { monto: string; count: number }
  sueldoDueno: string | null
  vencida: { cliente: string; monto: string; dias: number; costo: string } | null
  caja: { grati: string; porSemana: string; fecha: string } | null
  limite: { pct: string; tope: string; regimen: string } | null
  revisados: number
  conciliado: string
}

export interface LessonContent {
  titulo: string
  /** Cuándo aparece (para la lista de /aprende) */
  disparador: string
  cuerpo: string
  comoTeAfecta: string
  accion: { label: string; to: string }
}

type Builder = (c: LessonContext) => LessonContent

export const LESSONS: Record<LessonId, Builder> = {
  L01: (c) => ({
    titulo: 'Este Yape no tiene boleta: por qué importa',
    disparador: 'Cuando cobras sin emitir boleta o factura',
    cuerpo:
      'Cada venta, aunque sea por Yape, debe tener su boleta. Si no la emites, para SUNAT ese dinero es un ingreso sin sustento: puede pedirte explicaciones y multarte. Además, tus ventas reales se ven más bajas y eso te resta cuando pides un préstamo.',
    comoTeAfecta: `Recibiste ${c.yapesSinBoleta.count} cobros sin boleta por ${c.yapesSinBoleta.monto}. Si emites sus boletas, tus ventas declaradas suben y tu historial se ve más sólido.`,
    accion: { label: 'Ver los cobros sin boleta', to: '/conciliacion?estado=COBRADO_SIN_COMPROBANTE' },
  }),
  L02: (c) => ({
    titulo: 'Sin factura no hay crédito fiscal',
    disparador: 'Cuando pagas a un proveedor y no llega su factura',
    cuerpo:
      'Cuando compras con factura, el IGV que pagas se resta del IGV que cobras a tus clientes: eso es el crédito fiscal. Si pagas sin factura, ese IGV se pierde y el gasto tampoco se descuenta de tu renta.',
    comoTeAfecta: `Pagaste ${c.pagosSinFactura.monto} sin factura (${c.pagosSinFactura.count} pagos). Ahí hay unos ${c.pagosSinFactura.igv} de IGV que recuperas si pides las facturas.`,
    accion: { label: 'Ver pagos sin factura', to: '/conciliacion?estado=PAGADO_SIN_FACTURA' },
  }),
  L03: (c) => ({
    titulo: '¿Qué es la detracción y dónde está esa plata?',
    disparador: 'Cuando un cobro llega con detracción',
    cuerpo:
      'En algunos servicios tu cliente no te paga todo: deposita un porcentaje en tu cuenta de detracciones del Banco de la Nación. No lo perdiste. Esa plata sirve para pagar tus impuestos y, si sobra, puedes pedir que la liberen.',
    comoTeAfecta: c.detraccion
      ? `En la factura ${c.detraccion.doc} te detrajeron ${c.detraccion.monto}. Están en tu cuenta de detracciones del Banco de la Nación.`
      : 'Cuando un cliente te pague con detracción, aquí verás cuánto quedó en el Banco de la Nación.',
    accion: { label: 'Ver la conciliación', to: '/conciliacion' },
  }),
  L04: (c) => ({
    titulo: 'Te retuvieron 3%: no lo perdiste',
    disparador: 'Cuando un cliente te paga con retención de IGV',
    cuerpo:
      'Algunas empresas grandes son agentes de retención: al pagarte se quedan con el 3% y lo entregan a SUNAT a tu nombre. Ese monto se descuenta del IGV que debes pagar en tu próxima declaración.',
    comoTeAfecta: c.retencion
      ? `${c.retencion.cliente} te retuvo ${c.retencion.monto}. Pídele a tu contador que lo aplique este mes.`
      : 'Cuando te retengan, aquí verás cuánto puedes descontar de tu IGV.',
    accion: { label: 'Ver la conciliación', to: '/conciliacion' },
  }),
  L05: (c) => ({
    titulo: 'Separa tu bolsillo del de tu negocio',
    disparador: 'Cuando marcas un gasto como personal',
    cuerpo:
      'Si pagas gastos de tu casa con la cuenta del negocio, ya no sabes cuánto gana tu negocio de verdad. Separarlos te deja ver tu utilidad real, pedir crédito con números claros y no gastar la plata de tus proveedores.',
    comoTeAfecta: `Este mes salieron ${c.personalMes.monto} del negocio para gastos personales (${c.personalMes.count} movimientos).`,
    accion: { label: 'Definir mi sueldo de dueño', to: '/personal' },
  }),
  L06: (c) => ({
    titulo: 'Págate un sueldo fijo',
    disparador: 'Cuando defines tu sueldo de dueño',
    cuerpo:
      'Un sueldo fijo pone orden: lo que pasa de ese monto se queda en el negocio para crecer, pagar deudas o armar un colchón. Elige un monto que el negocio pueda pagar todos los meses, incluso los flojos.',
    comoTeAfecta: c.sueldoDueno
      ? `Definiste ${c.sueldoDueno} al mes. Zenity te avisa cuando te pases y lleva tu reto de 30 días.`
      : 'Todavía no defines tu sueldo de dueño.',
    accion: { label: 'Ver mi reto de 30 días', to: '/personal' },
  }),
  L07: (c) => ({
    titulo: 'Vender al crédito también cuesta',
    disparador: 'Cuando una factura pasa 30 días vencida',
    cuerpo:
      'Cuando vendes al crédito, financias a tu cliente con tu propia plata. Mientras no te paga, tú igual pagas proveedores, sueldos e impuestos. Cobrar a tiempo es tan importante como vender.',
    comoTeAfecta: c.vencida
      ? `${c.vencida.cliente} te debe ${c.vencida.monto} hace ${c.vencida.dias} días. Si pidieras esa plata prestada al 2.5% mensual, te costaría unos ${c.vencida.costo}.`
      : 'No tienes facturas con más de 30 días de atraso.',
    accion: { label: 'Recordarle el pago', to: '/cobrar' },
  }),
  L08: (c) => ({
    titulo: 'Provisiona la gratificación desde hoy',
    disparador: 'Cuando tu caja proyectada baja del colchón',
    cuerpo:
      'En julio y diciembre pagas gratificación, y en mayo y noviembre depositas la CTS. Son pagos grandes y seguros: si separas un poco cada semana, no te agarran desprevenido.',
    comoTeAfecta: c.caja
      ? `La gratificación de diciembre es ${c.caja.grati}. Si separas ${c.caja.porSemana} cada semana desde hoy, la tendrás lista para el ${c.caja.fecha}.`
      : 'Tu caja no baja del colchón en los próximos meses.',
    accion: { label: 'Ver mi caja', to: '/caja' },
  }),
  L09: (c) => ({
    titulo: 'Tu régimen tiene techo',
    disparador: 'Cuando llegas al 80% del límite de tu régimen',
    cuerpo:
      'Cada régimen tributario tiene un límite de ingresos. Si lo pasas, SUNAT te cambia de régimen y puedes terminar pagando más o con multas. Conviene anticiparse y decidir con tu contador.',
    comoTeAfecta: c.limite
      ? `Vas al ${c.limite.pct} del límite del ${c.limite.regimen} (${c.limite.tope} al año).`
      : 'Estás lejos del límite de tu régimen.',
    accion: { label: 'Comparar regímenes', to: '/regimen' },
  }),
  L10: (c) => ({
    titulo: 'Lo que acabas de hacer es conciliar',
    disparador: 'Cuando dejas «Por revisar» en cero',
    cuerpo:
      'Conciliar es comprobar que lo que vendiste, lo que facturaste y lo que entró al banco cuadran. Es lo que hace un contador cada mes, y tú lo acabas de hacer en minutos. Con todo conciliado, tus números son confiables.',
    comoTeAfecta: `Revisaste ${c.revisados} movimientos. ${c.negocio} va ${c.conciliado} conciliado este mes.`,
    accion: { label: 'Ver mi conciliación', to: '/conciliacion' },
  }),
}

export const LESSON_IDS = Object.keys(LESSONS) as LessonId[]
