import type { Business } from './businesses'
import { BASE_MATCHES, type MatchCandidate, type MatchChoice, matchTransactions, walletMatches } from './matches'
import {
  BASE_TRANSACTIONS,
  type CategoryId,
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
  /** Movimientos reales por mes (negocios de la demo); si falta, los meses se derivan de `base` */
  byPeriod?: Record<string, Transaction[]>
  pending: PendingTransaction[]
  /** Insights fijos del inicio; null = se generan a partir de los datos */
  insights: Insight[] | null
  /** Movimientos de distintas conexiones que podrían ser el mismo */
  matches: MatchCandidate[]
  /** El negocio todavía no tiene conexiones */
  empty: boolean
}

/** Cuentas de los datos base, en el orden en que se reparten entre las cuentas de otro negocio. */
const BASE_ACCOUNTS = ['negocio-retail', 'tarjeta-1789', 'tinbet', 'locales-nacional']

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Movimientos que llegaron sin categoría, ya clasificados: con la categoría de Zenity o la que
 * eligió el usuario. Son dinero que entró o salió, así que suman en los totales del mes.
 */
function classifiedTransactions(pending: PendingTransaction[], categories: Record<string, CategoryId>): Transaction[] {
  return pending.map(({ recommended, confidence: _confidence, reason: _reason, ...tx }) => ({
    ...tx,
    category: categories[tx.id] ?? recommended,
  }))
}

/**
 * Libro del negocio con lo que Zenity resolvió sola: los movimientos sin categoría ya
 * clasificados y los pares conciliados (cada par suma su lado de dinero una vez, o los dos
 * lados si son movimientos distintos). El usuario puede corregir ambas decisiones.
 */
export function buildLedger(
  business: Business,
  decisions: Record<string, MatchChoice> = {},
  categories: Record<string, CategoryId> = {},
): Ledger {
  const ledger = baseLedger(business)
  const extra = [...classifiedTransactions(ledger.pending, categories), ...matchTransactions(ledger.matches, decisions)]
  if (extra.length === 0) return ledger

  const ingresos = extra.reduce((acc, t) => (t.amount > 0 ? acc + t.amount : acc), 0)
  const egresos = extra.reduce((acc, t) => (t.amount < 0 ? acc - t.amount : acc), 0)
  const last = ledger.periods.length - 1
  return {
    ...ledger,
    base: [...ledger.base, ...extra],
    periods: ledger.periods.map((p, i) =>
      i === last ? { ...p, ingresos: round2(p.ingresos + ingresos), egresos: round2(p.egresos + egresos) } : p,
    ),
  }
}

function baseLedger(business: Business): Ledger {
  const { connections } = business
  if (connections.length === 0) {
    return {
      periods: PERIODS.map((p) => ({ ...p, ingresos: 0, egresos: 0, balance: 0 })),
      base: [],
      pending: [],
      insights: [],
      matches: [],
      empty: true,
    }
  }

  // El negocio del Figma conserva exactamente los datos base
  const ids = new Set(connections.map((c) => c.id))
  if (business.scale === 1 && BASE_ACCOUNTS.every((id) => ids.has(id))) {
    return {
      periods: PERIODS,
      base: BASE_TRANSACTIONS,
      pending: PENDING_TRANSACTIONS,
      insights: HOME_INSIGHTS,
      matches: [...BASE_MATCHES, ...walletMatches(connections, 1)],
      empty: false,
    }
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

  // Los pares van a las cuentas equivalentes: la fila de Excel a la hoja del negocio y el resto
  // como sus movimientos. Si no hay hoja, o un lado cae en la misma cuenta o en una billetera, no aplica.
  const sheet = connections.find((c) => c.avatar === 'sheet')
  const wallets = new Set(connections.filter((c) => c.avatar === 'yape' || c.avatar === 'plin').map((c) => c.id))
  const baseMatches = sheet
    ? BASE_MATCHES.map((m) => ({
        ...m,
        legs: m.legs.map((leg) => ({
          ...leg,
          accountId: leg.accountId === 'locales-nacional' ? sheet.id : accountFor(leg.accountId),
          amount: round2(leg.amount * k),
        })) as MatchCandidate['legs'],
      })).filter((m) => m.legs[0].accountId !== m.legs[1].accountId && !m.legs.some((leg) => wallets.has(leg.accountId)))
    : []
  const matches = [...baseMatches, ...walletMatches(connections, k)]

  return { periods, base, pending, insights: null, matches, empty: false }
}
