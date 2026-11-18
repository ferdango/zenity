/**
 * Cierre de caja de las ventas en efectivo: el dueño cuenta el efectivo al cerrar el día y Zenity
 * lo cruza con las boletas al contado de ese día y con el depósito en el banco (regla CIERRE).
 */
import type { Analysis } from './engine.ts'
import type { BankMovement, CashEvent, CierreCaja, Comprobante } from './types.ts'
import { addDays, diffDays, round2 } from './util.ts'

export interface EstadoCierre {
  cierre: CierreCaja
  /** Boletas al contado (sin RUC) de ese día que no se cobraron por Yape ni POS */
  boletas: Comprobante[]
  conBoleta: number
  /** Efectivo contado que no tiene boleta */
  sinBoleta: number
  /** Boletas que suman más que el efectivo contado (faltante en caja) */
  faltante: number
  /** Depósito que lleva este efectivo al banco */
  deposito?: BankMovement
  /** Efectivo de este cierre que todavía no está en el banco */
  porDepositar: number
}

/** Boletas al contado de un día que se pagaron en efectivo (no las cobradas por Yape o POS). */
export function boletasEnEfectivo(a: Analysis, fecha: string): Comprobante[] {
  return a.data.comprobantes.filter((c) => {
    if (c.tipo !== 'BOLETA' || c.formaPago !== 'CONTADO' || c.moneda !== 'PEN' || c.rucContraparte || c.fechaEmision !== fecha) return false
    const match = a.matchByComprobante.get(c.id)
    if (!match) return true
    if (match.regla === 'CIERRE') return true
    return match.movementIds.some((id) => a.movementsById.get(id)?.canal === 'DEPOSITO_EFECTIVO')
  })
}

/** Cada cierre con sus boletas, lo que se vendió sin boleta y si ya se depositó. Del más reciente al más antiguo. */
export function estadoCierres(a: Analysis, cierres: CierreCaja[]): EstadoCierre[] {
  const propios = cierres.filter((c) => c.businessId === a.business.id)
  const depositos = a.matches.filter((m) => m.regla === 'CIERRE')
  return [...propios]
    .sort((x, y) => y.fecha.localeCompare(x.fecha) || y.registrado.localeCompare(x.registrado))
    .map((cierre) => {
      const boletas = boletasEnEfectivo(a, cierre.fecha)
      const conBoleta = round2(boletas.reduce((s, b) => s + b.total, 0))
      const diferencia = round2(cierre.efectivo - conBoleta)
      const match = depositos.find((m) => m.cierreFechas?.includes(cierre.fecha))
      const deposito = match ? a.movementsById.get(match.movementIds[0]) : undefined
      // Si un depósito junta varios cierres, lo que quedó en caja se cuenta en el último
      const ultimo = match?.cierreFechas?.[match.cierreFechas.length - 1] === cierre.fecha
      return {
        cierre,
        boletas,
        conBoleta,
        sinBoleta: diferencia > 1 ? diferencia : 0,
        faltante: diferencia < -1 ? -diferencia : 0,
        deposito,
        porDepositar: match ? (ultimo ? (match.enCaja ?? 0) : 0) : cierre.efectivo,
      }
    })
}

/** Efectivo de los cierres de la última semana que todavía no llega al banco. */
export function efectivoPorDepositar(estados: EstadoCierre[], hoy: string): number {
  return round2(estados.filter((e) => diffDays(e.cierre.fecha, hoy) <= 7).reduce((s, e) => s + e.porDepositar, 0))
}

/** El efectivo por depositar entra a la proyección de caja al día siguiente, con certeza media. */
export function eventoEfectivo(estados: EstadoCierre[], hoy: string): CashEvent[] {
  const monto = efectivoPorDepositar(estados, hoy)
  if (monto <= 0) return []
  return [{ fecha: addDays(hoy, 1), concepto: 'Depósito del efectivo de tus cierres de caja', monto, certeza: 'MEDIA', fuente: 'EFECTIVO' }]
}
