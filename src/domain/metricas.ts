/**
 * Métricas de la primera ola calculadas con lo que pasó en la demo. En producción las mismas
 * se arman en PostHog con los eventos de `lib/analytics.ts` (que nunca llevan montos).
 */
import type { Analysis } from './engine.ts'
import type { BankMovement, Correction } from './types.ts'
import { addDays, dayOf, diffDays, lastDayOfMonth, monthOf, round2 } from './util.ts'

export interface SinIntervencion {
  total: number
  auto: number
  pct: number
}

/** Movimientos del mes que Zenity resolvió sin que el dueño los corrija ni queden por revisar. */
export function sinIntervencion(a: Analysis, corrections: Correction[], mes: string): SinIntervencion {
  const movs = a.movements.filter((m) => monthOf(m.fecha) === mes)
  const corregidos = new Set(corrections.filter((c) => c.businessId === a.business.id).map((c) => c.movementId))
  const pendientes = new Set(a.porRevisar.map((m) => m.id))
  const auto = movs.filter((m) => !corregidos.has(m.id) && !pendientes.has(m.id)).length
  return { total: movs.length, auto, pct: movs.length ? auto / movs.length : 1 }
}

export interface CobrosRecordados {
  recordados: number
  cobrados: number
  pct: number | null
  /** Días promedio entre el recordatorio y el cobro */
  dias: number | null
}

/** Comprobantes con recordatorio por WhatsApp que se cobraron completos después del recordatorio. */
export function cobrosTrasRecordatorio(a: Analysis, recordatorios: Record<string, string>): CobrosRecordados {
  const propios = Object.entries(recordatorios).filter(([id]) => a.comprobantesById.get(id)?.businessId === a.business.id)
  const dias: number[] = []
  for (const [id, cuando] of propios) {
    if (a.comprobanteEstado.get(id) !== 'CONCILIADO') continue
    const movs = (a.matchByComprobante.get(id)?.movementIds ?? []).map((m) => a.movementsById.get(m)).filter((m): m is BankMovement => !!m)
    const ultimo = movs.map((m) => dayOf(m.fecha)).sort().at(-1)
    if (ultimo && ultimo >= dayOf(cuando)) dias.push(diffDays(dayOf(cuando), ultimo))
  }
  return {
    recordados: propios.length,
    cobrados: dias.length,
    pct: propios.length ? dias.length / propios.length : null,
    dias: dias.length ? Math.round(dias.reduce((s, d) => s + d, 0) / dias.length) : null,
  }
}

/** Días entre el fin de cada mes y el día en que el contador lo cerró. */
export function diasDeCierre(businessId: string, mesesCerrados: Record<string, string>): { mes: string; dias: number }[] {
  return Object.entries(mesesCerrados)
    .filter(([k]) => k.startsWith(`${businessId}:`))
    .map(([k, cuando]) => {
      const mes = k.slice(businessId.length + 1)
      return { mes, dias: diffDays(lastDayOfMonth(mes), dayOf(cuando)) }
    })
    .sort((x, y) => x.mes.localeCompare(y.mes))
}

/** Saldo del banco al final de un día (el del último movimiento hasta ese día). */
export function saldoAl(a: Analysis, dia: string): number | null {
  const previos = a.movements.filter((m) => dayOf(m.fecha) <= dia)
  if (previos.length === 0) return null
  return [...previos].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.id.localeCompare(y.id)).at(-1)!.saldoDespues
}

export interface ErrorProyeccion {
  fecha: string
  proyectado: number
  real: number
  /** |proyectado − real| / |real| */
  error: number
}

/** Error de cada proyección a 7 días guardada, cuando ya pasó la fecha. */
export function errorProyecciones(a: Analysis, proyecciones: { businessId: string; fecha: string; saldo7: number }[], hoy: string): ErrorProyeccion[] {
  return proyecciones
    .filter((p) => p.businessId === a.business.id && addDays(p.fecha, 7) <= hoy)
    .flatMap((p) => {
      const real = saldoAl(a, addDays(p.fecha, 7))
      if (real === null || real === 0) return []
      return [{ fecha: p.fecha, proyectado: p.saldo7, real, error: round2(Math.abs(p.saldo7 - real) / Math.abs(real)) }]
    })
}
