import type { Business } from './businesses'
import {
  BASE_TRANSACTIONS,
  HOME_INSIGHTS,
  type Insight,
  PENDING_TRANSACTIONS,
  PERIODS,
  type PendingTransaction,
  type Period,
  type Transaction,
} from './mock'
import { seeded } from './registry'

/**
 * Datos financieros de un negocio: la serie mensual, los movimientos del último mes
 * (los meses anteriores se derivan de ellos) y los movimientos por revisar.
 */
export interface Ledger {
  periods: Period[]
  base: Transaction[]
  pending: PendingTransaction[]
  /** Insights fijos del inicio; null = se generan a partir de los datos */
  insights: Insight[] | null
  /** El negocio todavía no tiene conexiones */
  empty: boolean
}

/** Cuentas de los datos base, en el orden en que se reparten entre las cuentas de otro negocio. */
const BASE_ACCOUNTS = ['negocio-retail', 'tarjeta-1789', 'tinbet', 'locales-nacional']

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildLedger(business: Business): Ledger {
  const { connections } = business
  if (connections.length === 0) {
    return {
      periods: PERIODS.map((p) => ({ ...p, ingresos: 0, egresos: 0, balance: 0 })),
      base: [],
      pending: [],
      insights: [],
      empty: true,
    }
  }

  // El negocio del Figma conserva exactamente los datos base
  const ids = new Set(connections.map((c) => c.id))
  if (business.scale === 1 && BASE_ACCOUNTS.every((id) => ids.has(id))) {
    return { periods: PERIODS, base: BASE_TRANSACTIONS, pending: PENDING_TRANSACTIONS, insights: HOME_INSIGHTS, empty: false }
  }

  // Otros negocios: los datos base escalados y repartidos entre sus propias cuentas
  const rand = seeded(`ledger:${business.id}`)
  const k = business.scale
  const accountFor = (baseId: string) => connections[Math.max(0, BASE_ACCOUNTS.indexOf(baseId)) % connections.length].id
  const base = BASE_TRANSACTIONS.map((t) => ({ ...t, accountId: accountFor(t.accountId), amount: round2(t.amount * k) }))
  const ingresos = round2(base.reduce((acc, t) => (t.amount > 0 ? acc + t.amount : acc), 0))
  const egresos = round2(base.reduce((acc, t) => (t.amount < 0 ? acc - t.amount : acc), 0))
  const last = PERIODS[PERIODS.length - 1]
  const synced = round2(connections.reduce((acc, c) => acc + c.balance, 0))
  const balance = synced > 0 ? synced : round2(last.balance * k)
  const wobble = () => 0.82 + rand() * 0.36

  const periods = PERIODS.map((p, i) =>
    i === PERIODS.length - 1
      ? { ...p, ingresos, egresos, balance }
      : {
          ...p,
          ingresos: round2(p.ingresos * k * wobble()),
          egresos: round2(p.egresos * k * wobble()),
          balance: round2((p.balance / last.balance) * balance * (0.9 + rand() * 0.2)),
        },
  )

  const pending = PENDING_TRANSACTIONS.slice(0, 3 + Math.floor(rand() * 5)).map((p) => ({
    ...p,
    accountId: accountFor(p.accountId),
    amount: round2(p.amount * k),
  }))

  return { periods, base, pending, insights: null, empty: false }
}
