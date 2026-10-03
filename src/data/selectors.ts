import { MONTHS, MONTHS_SHORT, percent } from '../lib/format'
import {
  type AvatarKind,
  BASE_TRANSACTIONS,
  CATEGORIES,
  type CategoryId,
  type Connection,
  PERIODS,
  type Period,
  type Transaction,
  type TxType,
} from './mock'

const BASE = PERIODS[PERIODS.length - 1]

export function getPeriod(key: string): Period {
  return PERIODS.find((p) => p.key === key) ?? BASE
}

export function periodLabel(p: Period): string {
  return MONTHS[p.month]
}

export function periodShort(p: Period): string {
  return MONTHS_SHORT[p.month]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Transacciones del periodo. Marzo usa los datos base; los demás meses escalan los
 * montos para que la suma coincida exactamente con la serie mensual.
 */
export function getTransactions(periodKey: string): Transaction[] {
  const period = getPeriod(periodKey)
  if (period.key === BASE.key) return BASE_TRANSACTIONS

  const scale = (type: TxType, target: number, base: number) => {
    const items = BASE_TRANSACTIONS.filter((t) => (type === 'income' ? t.amount > 0 : t.amount < 0))
    const factor = target / base
    let acc = 0
    return items.map((t, i) => {
      const sign = Math.sign(t.amount)
      const abs =
        i === items.length - 1 ? round2(target - acc) : round2(Math.abs(t.amount) * factor)
      acc = round2(acc + abs)
      const day = new Date(t.date)
      const shifted = new Date(period.year, period.month, Math.min(day.getDate(), 28), day.getHours(), day.getMinutes())
      return { ...t, id: `${t.id}-${period.key}`, amount: sign * abs, date: toIsoLocal(shifted) }
    })
  }

  return [...scale('income', period.ingresos, BASE.ingresos), ...scale('expense', period.egresos, BASE.egresos)].sort(
    (a, b) => b.date.localeCompare(a.date),
  )
}

function toIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface Totals {
  ingresos: number
  egresos: number
  neto: number
}

export function totals(txs: Transaction[]): Totals {
  let ingresos = 0
  let egresos = 0
  for (const t of txs) {
    if (t.amount > 0) ingresos += t.amount
    else egresos += Math.abs(t.amount)
  }
  ingresos = round2(ingresos)
  egresos = round2(egresos)
  return { ingresos, egresos, neto: round2(ingresos - egresos) }
}

export function filterByAccount(txs: Transaction[], accountId: string | 'all'): Transaction[] {
  return accountId === 'all' ? txs : txs.filter((t) => t.accountId === accountId)
}

export interface CategoryTotal {
  id: CategoryId
  label: string
  icon: string
  total: number
  share: number
  transactions: Transaction[]
}

export function categoryTotals(txs: Transaction[], type: TxType): CategoryTotal[] {
  const relevant = txs.filter((t) => (type === 'income' ? t.amount > 0 : t.amount < 0))
  const sum = relevant.reduce((acc, t) => acc + Math.abs(t.amount), 0)
  const map = new Map<CategoryId, Transaction[]>()
  for (const t of relevant) map.set(t.category, [...(map.get(t.category) ?? []), t])
  return [...map.entries()]
    .map(([id, list]) => {
      const total = round2(list.reduce((acc, t) => acc + Math.abs(t.amount), 0))
      return {
        id,
        label: CATEGORIES[id].label,
        icon: CATEGORIES[id].icon,
        total,
        share: percent(total, sum),
        transactions: [...list].sort((a, b) => b.date.localeCompare(a.date)),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function accountTotals(txs: Transaction[], connections: Connection[], type: TxType) {
  return connections
    .map((c) => {
      const list = txs.filter((t) => t.accountId === c.id && (type === 'income' ? t.amount > 0 : t.amount < 0))
      return { connection: c, total: round2(list.reduce((acc, t) => acc + Math.abs(t.amount), 0)) }
    })
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total)
}

/** Variación porcentual frente al periodo anterior */
export function variation(periodKey: string, field: 'ingresos' | 'egresos' | 'balance'): number | null {
  const index = PERIODS.findIndex((p) => p.key === periodKey)
  if (index <= 0) return null
  const prev = PERIODS[index - 1][field]
  const curr = PERIODS[index][field]
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

export function avatarFor(accountId: string, connections: Connection[]): AvatarKind {
  return connections.find((c) => c.id === accountId)?.avatar ?? 'bank'
}

export function connectionName(accountId: string, connections: Connection[]): string {
  return connections.find((c) => c.id === accountId)?.shortName ?? 'Cuenta'
}
