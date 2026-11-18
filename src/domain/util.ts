/** Utilidades puras del dominio: céntimos, fechas sin zona horaria y nombres normalizados. */

export const cents = (n: number): number => Math.round(n * 100)
export const round2 = (n: number): number => Math.round(n * 100) / 100

/* ── Fechas (siempre "AAAA-MM-DD" o "AAAA-MM-DDTHH:mm", sin zona horaria) ── */

export function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

function toUtc(day: string): number {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * 86_400_000)
}

/** Días de `a` a `b` (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

/** 0 = domingo … 6 = sábado */
export function weekday(iso: string): number {
  return new Date(toUtc(iso)).getUTCDay()
}

export function isWeekend(iso: string): boolean {
  const d = weekday(iso)
  return d === 0 || d === 6
}

/** Hora (0–23) si la fecha la trae. */
export function hourOf(iso: string): number | null {
  return iso.length >= 13 ? Number(iso.slice(11, 13)) : null
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return fromUtc(Date.UTC(y, m, 0))
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** "2026-11-03" → "03/11/2026" */
export function fmtFecha(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** "2026-11-03" → "03/11" */
export function fmtDiaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

/* ── Montos ── */

const soles = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const solesEnteros = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** 1760 → "S/ 1,760.00"; negativos con signo: "S/ −1,850.00" */
export function fmtSoles(n: number): string {
  const abs = soles.format(Math.abs(n))
  return n < 0 ? `S/ −${abs}` : `S/ ${abs}`
}

/** 9300 → "S/ 9,300" (sin decimales si son cero) */
export function fmtSolesCorto(n: number): string {
  const r = round2(n)
  const abs = Number.isInteger(r) ? solesEnteros.format(Math.abs(r)) : soles.format(Math.abs(r))
  return r < 0 ? `S/ −${abs}` : `S/ ${abs}`
}

export function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/* ── Nombres ── */

const SUFIJOS = new Set(['SAC', 'SA', 'EIRL', 'SRL', 'SAA', 'SCRL'])

/** Mayúsculas, sin tildes ni signos y sin «S.A.C.», «E.I.R.L.», «S.R.L.», «S.A.». */
export function normalizeName(name: string | undefined): string {
  if (!name) return ''
  const plain = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/S\.\s?A\.\s?C\.?/g, ' SAC ')
    .replace(/E\.\s?I\.\s?R\.\s?L\.?/g, ' EIRL ')
    .replace(/S\.\s?R\.\s?L\.?/g, ' SRL ')
    .replace(/S\.\s?A\.?(?=\s|$)/g, ' SA ')
    .replace(/[^A-Z0-9 ]/g, ' ')
  return plain
    .split(/\s+/)
    .filter((w) => w && !SUFIJOS.has(w))
    .join(' ')
}

/** Similitud de nombres entre 0 y 1 (palabras en común sobre el nombre más corto). */
export function nameSimilarity(a: string | undefined, b: string | undefined): number {
  const ta = new Set(normalizeName(a).split(' ').filter((w) => w.length > 1))
  const tb = new Set(normalizeName(b).split(' ').filter((w) => w.length > 1))
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  for (const w of ta) if (tb.has(w)) common++
  return common / Math.min(ta.size, tb.size)
}

/** Generador pseudoaleatorio determinístico (mulberry32): misma semilla = mismos datos. */
export function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
