/** Pago mensual a SUNAT, resumido para el dueño: el próximo (IGV + renta + EsSalud) y el último que salió del banco. */
import { proximoVencimiento } from './calendar.ts'
import { impuestosEstimados } from './cashflow.ts'
import type { Analysis } from './engine.ts'
import { monthOf, round2 } from './util.ts'

export interface ResumenSunat {
  /** Periodo que se declara y paga ("2026-11") */
  periodo: string
  /** Fecha de vencimiento según el último dígito del RUC */
  vence: string
  /** Días que faltan para el vencimiento */
  dias: number
  igv: number
  renta: number
  essalud: number
  total: number
  /** `true` si el mes todavía no cierra: el monto sale del promedio de los 3 últimos meses */
  estimado: boolean
  /** Último pago a SUNAT visto en el banco */
  ultimoPago: { fecha: string; monto: number } | null
}

const esPagoSunat = (m: Analysis['movements'][number]) => m.monto < 0 && (m.contraparteNombre === 'SUNAT' || /\bSUNAT\b/i.test(m.glosa))

export function resumenSunat(a: Analysis, hoy: string): ResumenSunat {
  const { periodo, fecha, dias } = proximoVencimiento(a.business.ruc, hoy)
  const mesActual = monthOf(hoy)
  const imp = impuestosEstimados(a.business, a.data.comprobantes, periodo, mesActual)
  // Los movimientos vienen del más reciente al más antiguo
  const pago = a.movements.find((m) => esPagoSunat(m) && m.fecha.slice(0, 10) <= hoy)
  return {
    periodo,
    vence: fecha,
    dias,
    igv: imp.igv,
    renta: imp.renta,
    essalud: imp.essalud,
    total: round2(imp.igv + imp.renta + imp.essalud),
    estimado: periodo >= mesActual,
    ultimoPago: pago ? { fecha: pago.fecha.slice(0, 10), monto: round2(-pago.monto) } : null,
  }
}
