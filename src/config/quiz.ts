/**
 * Una pregunta de práctica por microlección del camino (al estilo Duolingo): se responde al final
 * de la lección; si fallas, ves por qué y vuelves a intentar. Acertar da el XP de la lección.
 */
import type { LessonId } from '../domain/types.ts'

export interface Pregunta {
  pregunta: string
  opciones: string[]
  /** Índice de la opción correcta */
  correcta: number
  /** Se muestra al responder, bien o mal */
  explicacion: string
}

export const QUIZ: Partial<Record<LessonId, Pregunta>> = {
  L10: {
    pregunta: '¿Qué es conciliar?',
    opciones: [
      'Comprobar que lo que vendiste, facturaste y entró al banco cuadra',
      'Pagar tus impuestos antes de que venzan',
      'Pedirle un préstamo al banco',
    ],
    correcta: 0,
    explicacion: 'Conciliar es cruzar tus ventas, tus comprobantes y tu banco para que tus números sean confiables.',
  },
  L05: {
    pregunta: 'Pagas el almuerzo de tu familia con la cuenta del negocio. ¿Qué es?',
    opciones: ['Un gasto del negocio', 'Un gasto personal que sale de tu sueldo de dueño', 'Una inversión'],
    correcta: 1,
    explicacion: 'Es un gasto personal. Si lo mezclas con el negocio, ya no sabes cuánto gana tu negocio de verdad.',
  },
  L06: {
    pregunta: '¿Qué monto conviene ponerte como sueldo de dueño?',
    opciones: [
      'Lo que haya en la cuenta ese día',
      'Lo más alto posible',
      'Uno fijo que el negocio pueda pagar incluso en los meses flojos',
    ],
    correcta: 2,
    explicacion: 'Un sueldo fijo y pagable pone orden: lo que pasa de ese monto se queda en el negocio para crecer.',
  },
  L07: {
    pregunta: 'Vendiste al crédito y tu cliente te paga 45 días tarde. ¿Qué pasa mientras tanto?',
    opciones: [
      'Nada, igual te va a pagar',
      'Financias a tu cliente con tu propia plata',
      'SUNAT te devuelve el IGV',
    ],
    correcta: 1,
    explicacion: 'Mientras no te paga, tú igual cubres proveedores, sueldos e impuestos: le estás prestando tu plata.',
  },
  L08: {
    pregunta: '¿En qué meses se paga la gratificación?',
    opciones: ['En julio y diciembre', 'Todos los meses', 'En mayo y noviembre'],
    correcta: 0,
    explicacion: 'La gratificación se paga en julio y diciembre. En mayo y noviembre se deposita la CTS.',
  },
  L01: {
    pregunta: 'Te pagaron por Yape una venta pequeña. ¿Necesita boleta?',
    opciones: ['No, por Yape no hace falta', 'Solo si el cliente la pide', 'Sí, toda venta debe tener su boleta'],
    correcta: 2,
    explicacion: 'Toda venta, aunque sea por Yape, debe tener su boleta. Sin ella, para SUNAT es un ingreso sin sustento.',
  },
  L02: {
    pregunta: 'Compras mercadería y pides factura. ¿Qué ganas?',
    opciones: [
      'El IGV que pagaste se resta del IGV que cobras',
      'La compra sale más barata',
      'No tienes que declarar ese mes',
    ],
    correcta: 0,
    explicacion: 'Con factura, el IGV de tus compras es crédito fiscal: se resta del IGV de tus ventas.',
  },
}
