const money = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 0,
})

export type SignDisplay = 'auto' | 'always' | 'never'

/** Formatea un monto en soles: 1890.2 → "S/ 1,890.20" (con signo opcional). */
export function formatMoney(value: number, sign: SignDisplay = 'auto'): string {
  const abs = money.format(Math.abs(value))
  if (sign === 'never') return `S/ ${abs}`
  if (value < 0) return `-S/ ${abs}`
  if (sign === 'always' && value > 0) return `+S/ ${abs}`
  return `S/ ${abs}`
}

/** Eje de gráficos: 5000 → "5,000" */
export function formatAxis(value: number): string {
  return compact.format(value)
}

export function formatCompactMoney(value: number): string {
  return `S/ ${compact.format(value)}`
}

export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

/** "2026-03-20T22:15" → "20 mar, 22:15" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const month = MONTHS_SHORT[d.getMonth()].toLowerCase()
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} ${month}, ${time}`
}

/** "2026-03-20T22:15" → "20/03/26" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

/** Enmascara un número de cuenta: "1910898773626893" → "•••• 6893" */
export function maskNumber(value: string): string {
  return `•••• ${value.slice(-4)}`
}

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
