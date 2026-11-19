/**
 * Una pregunta de práctica por microlección del camino (al estilo Duolingo): se responde al final
 * de la lección; si fallas, ves por qué y vuelves a intentar. Acertar da el XP de la lección.
 */
import type { LessonId } from '../domain/types.ts'
import type { LessonContext } from './lessons.ts'

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

/**
 * La misma práctica, pero con los números del negocio y planteada como una decisión: el dueño
 * practica con su propia plata (fórmula de Zenity: datos reales + interés + juego + aprendizaje).
 * Si falta el dato, queda la pregunta general de arriba.
 */
const CON_TUS_NUMEROS: Partial<Record<LessonId, (c: LessonContext) => Pregunta | null>> = {
  L10: (c) => ({
    pregunta: `${c.negocio} va ${c.conciliado} conciliado este mes. ¿Qué quiere decir?`,
    opciones: [
      `Que ${c.conciliado} de tus movimientos y comprobantes ya cuadran entre banco, SUNAT y Yape`,
      `Que ya pagaste el ${c.conciliado} de tus impuestos`,
      `Que te queda ${c.conciliado} de tu saldo del mes`,
    ],
    correcta: 0,
    explicacion: 'Conciliar es cruzar tus ventas, tus comprobantes y tu banco. Lo que no cuadra es justo lo que tienes que revisar.',
  }),
  L05: (c) =>
    c.personalMes.count > 0
      ? {
          pregunta: `Este mes salieron ${c.personalMes.monto} del negocio para gastos de tu casa. ¿Cómo los cuentas?`,
          opciones: ['Como gastos del negocio', 'Como parte de tu sueldo de dueño', 'Como una inversión del negocio'],
          correcta: 1,
          explicacion: `Son tuyos, no del negocio. Si los mezclas, tu utilidad parece ${c.personalMes.monto} más baja de lo que es.`,
        }
      : null,
  L06: (c) =>
    c.sueldoDueno
      ? {
          pregunta: `Tu sueldo de dueño es ${c.sueldoDueno}. Este mes vendiste menos. ¿Qué haces?`,
          opciones: [
            'Saco lo que necesite de la cuenta del negocio',
            `Me pago los ${c.sueldoDueno} y el resto se queda en el negocio`,
            'No me pago nada este mes',
          ],
          correcta: 1,
          explicacion: 'Un sueldo fijo y pagable pone orden: tu casa sabe cuánto tiene y el negocio guarda lo que sobra para los meses flojos.',
        }
      : null,
  L07: (c) =>
    c.vencida
      ? {
          pregunta: `${c.vencida.cliente} te debe ${c.vencida.monto} hace ${c.vencida.dias} días. ¿Qué pasa mientras no te paga?`,
          opciones: ['Nada, igual te va a pagar', 'Lo financias con tu propia plata', 'SUNAT te devuelve el IGV de esa factura'],
          correcta: 1,
          explicacion: `Mientras no te paga, tú igual cubres proveedores y sueldos: esperar te cuesta unos ${c.vencida.costo}. Recordarle hoy es la decisión más barata.`,
        }
      : null,
  L08: (c) =>
    c.caja
      ? {
          pregunta: `En diciembre pagas ${c.caja.grati} de gratificación. ¿Cómo te preparas?`,
          opciones: [
            'Lo pago con las ventas de diciembre',
            `Separo ${c.caja.porSemana} cada semana desde hoy`,
            'Pido un préstamo ese día',
          ],
          correcta: 1,
          explicacion: `Separando ${c.caja.porSemana} por semana llegas al ${c.caja.fecha} con la plata lista y sin apretar tu caja.`,
        }
      : null,
  L01: (c) =>
    c.yapesSinBoleta.count > 0
      ? {
          pregunta: `Recibiste ${c.yapesSinBoleta.count} cobros por Yape sin boleta (${c.yapesSinBoleta.monto}). ¿Qué te conviene?`,
          opciones: ['Dejarlos así: son ventas pequeñas', 'Emitir sus boletas', 'Esperar a que SUNAT pregunte'],
          correcta: 1,
          explicacion: 'Con boleta, esas ventas cuentan: tus ingresos se ven completos ante SUNAT y ante el banco cuando pidas un préstamo.',
        }
      : null,
  L02: (c) =>
    c.pagosSinFactura.count > 0
      ? {
          pregunta: `Pagaste ${c.pagosSinFactura.monto} a proveedores sin factura. ¿Qué estás dejando de recuperar?`,
          opciones: [
            `Unos ${c.pagosSinFactura.igv} de IGV que podrías restar del IGV de tus ventas`,
            'Nada, la factura solo sirve para el proveedor',
            'El precio completo de la compra',
          ],
          correcta: 0,
          explicacion: `Con factura, ese IGV es crédito fiscal. Pídela a tus proveedores y recuperas unos ${c.pagosSinFactura.igv}.`,
        }
      : null,
}

/** La pregunta de una lección: con los números del negocio si los hay; si no, la general. */
export function preguntaDe(id: LessonId, c: LessonContext | null): Pregunta | undefined {
  const conNumeros = c ? CON_TUS_NUMEROS[id]?.(c) : null
  return conNumeros ?? QUIZ[id]
}
