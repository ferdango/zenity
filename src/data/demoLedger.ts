/**
 * Puente entre el motor de la primera ola y las pantallas existentes (Inicio, Ingresos, Egresos,
 * Balance, Chat): convierte el análisis de un negocio de la demo en el `Ledger` del prototipo.
 */
import { CATEGORIAS } from '../config/categories'
import { MESES_DEMO } from '../config/demo'
import type { Analysis } from '../domain/engine'
import type { BankMovement } from '../domain/types'
import { monthOf } from '../domain/util'
import type { Ledger } from './ledger'
import type { CategoryId, Connection, Period, Transaction } from './mock'

export const cuentaBcp = (businessId: string) => `${businessId}-bcp`
export const cuentaYape = (businessId: string) => `${businessId}-yape`

const round2 = (n: number) => Math.round(n * 100) / 100

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|\.)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/** Título legible de un movimiento del banco: «Yape · María Torres», «Pago · Luz del Sur S.A.A.». */
export function tituloMovimiento(m: BankMovement): string {
  if (m.canal === 'YAPE') return `Yape · ${m.contraparteNombre ?? 'cliente'}`
  if (m.canal === 'POS_LIQUIDACION') return 'Liquidación POS · Niubiz'
  if (m.canal === 'DEPOSITO_EFECTIVO') return 'Depósito de efectivo'
  if (m.canal === 'CAJERO') return 'Retiro en cajero'
  if (m.contraparteNombre) return `${m.monto > 0 ? 'Cobro' : 'Pago'} · ${m.contraparteNombre}`
  return titleCase(m.glosa)
}

/** Categoría equivalente en Ingresos/Egresos del prototipo. */
function legacyCategory(a: Analysis, m: BankMovement): CategoryId {
  const cl = a.classifications.get(m.id)
  if (!cl) return m.monto > 0 ? 'ventas' : 'gastos'
  if (cl.categoriaId === 'ventas') {
    const match = a.matchByMovement.get(m.id)
    const credito = match?.comprobanteIds.some((id) => a.comprobantesById.get(id)?.formaPago === 'CREDITO')
    return credito ? 'cobros' : 'ventas'
  }
  if (m.monto > 0) return cl.categoriaId === 'prestamos' ? 'financieros' : 'extraordinarios'
  return CATEGORIAS[cl.categoriaId].legacy as CategoryId
}

export function demoTransaction(a: Analysis, m: BankMovement): Transaction {
  const bcp = cuentaBcp(a.business.id)
  return {
    id: m.id,
    accountId: m.canal === 'YAPE' ? cuentaYape(a.business.id) : bcp,
    title: tituloMovimiento(m),
    amount: m.monto,
    date: m.fecha,
    category: legacyCategory(a, m),
    operation: m.numeroOperacion,
    origin: m.monto > 0 ? (m.contraparteRuc ?? m.contraparteNombre ?? m.glosa) : a.business.cuentaBcp,
    destination: m.monto > 0 ? a.business.cuentaBcp : (m.contraparteRuc ?? m.contraparteNombre ?? m.glosa),
  }
}

/** Libro mes a mes (agosto–noviembre 2026) con los movimientos reales del seed. */
export function ledgerFromAnalysis(a: Analysis): Ledger {
  const byPeriod: Record<string, Transaction[]> = {}
  const periods: Period[] = MESES_DEMO.map((key) => {
    const movs = a.movements.filter((m) => monthOf(m.fecha) === key)
    byPeriod[key] = movs.map((m) => demoTransaction(a, m))
    const ingresos = round2(movs.filter((m) => m.monto > 0).reduce((s, m) => s + m.monto, 0))
    const egresos = round2(movs.filter((m) => m.monto < 0).reduce((s, m) => s - m.monto, 0))
    const ultimo = [...movs].sort((x, y) => y.fecha.localeCompare(x.fecha))[0]
    const [year, month] = key.split('-').map(Number)
    return { key, month: month - 1, year, ingresos, egresos, balance: ultimo?.saldoDespues ?? 0 }
  })
  const last = MESES_DEMO[MESES_DEMO.length - 1]
  return { periods, base: byPeriod[last], byPeriod, pending: [], insights: null, matches: [], empty: false }
}

/**
 * Saldos de las tarjetas: la cuenta BCP con el saldo real. Yape no guarda saldo: cada cobro se abona
 * en la cuenta BCP, así que su tarjeta queda en cero y el consolidado no se cuenta dos veces.
 */
export function demoConnections(a: Analysis, connections: Connection[]): Connection[] {
  return connections.map((c) => (c.id === cuentaBcp(a.business.id) ? { ...c, balance: a.saldoActual } : c))
}
