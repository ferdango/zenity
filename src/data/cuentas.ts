import { formatDayMonth, formatDayMonthShort, formatMoney } from '../lib/format'
import type { Insight, RichText } from './mock'
import { type Rand, seeded } from './registry'
import { type Sire, type SireRecord, TIPOS_CPE } from './sire'

/**
 * Cuentas por cobrar y por pagar: las facturas emitidas a clientes y las recibidas de
 * proveedores (las del SIRE) que, a la fecha de corte, todavía no se cobran o se pagan.
 * Cada comprobante tiene un plazo de crédito y una fecha de cobro o pago simulados y
 * estables, así una misma factura sigue pendiente de un mes a otro hasta que se liquida.
 * Las boletas se cobran y se pagan al contado: no dejan cuentas pendientes.
 */

export type CuentaTipo = 'cobrar' | 'pagar'

export interface Documento {
  id: string
  tipo: CuentaTipo
  contraparte: { ruc: string; nombre: string }
  /** "F001-238" */
  numero: string
  comprobante: string
  icon: string
  glosa: string
  /** AAAA-MM-DD */
  emision: string
  vence: string
  /** Día en que se cobra o se paga */
  liquidacion: string
  /** Lo que falta cobrar o pagar (neto de notas de crédito) */
  monto: number
}

export interface Cuentas {
  cobrar: Documento[]
  pagar: Documento[]
}

export const SIN_CUENTAS: Cuentas = { cobrar: [], pagar: [] }

const round2 = (n: number) => Math.round(n * 100) / 100
const between = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Plazos de crédito (días): los que el negocio da a sus clientes y los que le dan sus proveedores. */
const PLAZOS: Record<CuentaTipo, number[]> = { cobrar: [15, 30, 30, 45, 60], pagar: [7, 15, 30, 30, 45] }

/** Días de atraso con que se liquida: cada cliente tiene su costumbre; el negocio suele pagar a tiempo. */
function atrasoAlLiquidar(tipo: CuentaTipo, record: SireRecord, ruc: string): number {
  const rand = seeded(`liquidacion:${ruc}:${record.id}`)
  if (tipo === 'cobrar') {
    const perfil = seeded(`cliente:${ruc}:${record.contraparte.ruc}`)()
    if (perfil < 0.5) return between(rand, -6, 3)
    if (perfil < 0.85) return between(rand, 4, 30)
    return between(rand, 35, 80)
  }
  const r = rand()
  if (r < 0.72) return between(rand, -6, 0)
  if (r < 0.95) return between(rand, 2, 18)
  return between(rand, 25, 45)
}

function documento(tipo: CuentaTipo, record: SireRecord, monto: number, ruc: string): Documento {
  const contraparte = { ruc: record.contraparte.ruc ?? '', nombre: record.contraparte.nombre }
  const plazos = PLAZOS[tipo]
  const plazo =
    record.tipo === '14' ? 15 : plazos[Math.floor(seeded(`plazo:${ruc}:${tipo}:${contraparte.ruc}`)() * plazos.length)]
  const vence = addDays(record.fecha, plazo)
  const atraso = atrasoAlLiquidar(tipo, record, ruc)
  return {
    id: `${tipo}-${record.id}`,
    tipo,
    contraparte,
    numero: `${record.serie}-${record.numero}`,
    comprobante: TIPOS_CPE[record.tipo].label,
    icon: TIPOS_CPE[record.tipo].icon,
    glosa: record.glosa,
    emision: record.fecha,
    vence,
    liquidacion: addDays(vence, Math.max(atraso, 1 - plazo)),
    monto,
  }
}

export function buildCuentas(sire: Sire, ruc: string): Cuentas {
  const cobrar: Documento[] = []
  const pagar: Documento[] = []
  for (const period of sire.periods) {
    const notas = period.ventas.filter((r) => r.tipo === '07')
    for (const record of period.ventas) {
      if (record.tipo !== '01' || !record.contraparte.ruc) continue
      // La nota de crédito del mes descuenta lo que el cliente debe por su factura
      const nota = notas.find((n) => n.contraparte.ruc === record.contraparte.ruc)
      const monto = round2(record.total + (nota?.total ?? 0))
      if (monto > 0) cobrar.push(documento('cobrar', record, monto, ruc))
    }
    for (const record of period.compras) {
      if (record.tipo === '03' || !record.contraparte.ruc) continue
      pagar.push(documento('pagar', record, record.total, ruc))
    }
  }
  return { cobrar, pagar }
}

// ── Corte ─────────────────────────────────────────────────────

export type Tramo = 'por-vencer' | '1-30' | '31-60' | 'mas-60'

/** Antigüedad de la deuda, de la más sana a la más riesgosa. */
export const TRAMOS: Array<{ id: Tramo; label: string }> = [
  { id: 'por-vencer', label: 'Por vencer' },
  { id: '1-30', label: '1 a 30 días' },
  { id: '31-60', label: '31 a 60 días' },
  { id: 'mas-60', label: 'Más de 60 días' },
]

export function tramo(atraso: number): Tramo {
  if (atraso <= 0) return 'por-vencer'
  if (atraso <= 30) return '1-30'
  if (atraso <= 60) return '31-60'
  return 'mas-60'
}

export interface Pendiente extends Documento {
  /** Días vencidos a la fecha de corte; negativo = días que faltan para el vencimiento */
  atraso: number
}

export interface Saldo {
  contraparte: Documento['contraparte']
  total: number
  vencido: number
  /** Atraso de su factura más antigua */
  atraso: number
  documentos: number
}

export interface Corte {
  tipo: CuentaTipo
  /** AAAA-MM-DD */
  fecha: string
  total: number
  vencido: number
  porVencer: number
  /** Las más atrasadas primero; luego las que vencen antes */
  items: Pendiente[]
  /** Facturas vencidas */
  vencidas: number
  /** Clientes o proveedores, con lo vencido primero */
  saldos: Saldo[]
  tramos: Record<Tramo, number>
}

/** Último día del mes del periodo "AAAA-MM". */
export function fechaCorte(periodKey: string): string {
  const [year, month] = periodKey.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

/** Facturas pendientes de cobro o de pago al cierre del periodo. */
export function corte(cuentas: Cuentas, tipo: CuentaTipo, periodKey: string): Corte {
  const fecha = fechaCorte(periodKey)
  const items = cuentas[tipo]
    .filter((d) => d.emision <= fecha && d.liquidacion > fecha)
    .map((d): Pendiente => ({ ...d, atraso: daysBetween(d.vence, fecha) }))
    .sort((a, b) => b.atraso - a.atraso || b.monto - a.monto)

  const tramos: Record<Tramo, number> = { 'por-vencer': 0, '1-30': 0, '31-60': 0, 'mas-60': 0 }
  const saldos = new Map<string, Saldo>()
  for (const item of items) {
    const id = tramo(item.atraso)
    tramos[id] = round2(tramos[id] + item.monto)
    const saldo = saldos.get(item.contraparte.ruc) ?? {
      contraparte: item.contraparte,
      total: 0,
      vencido: 0,
      atraso: item.atraso,
      documentos: 0,
    }
    saldo.total = round2(saldo.total + item.monto)
    if (item.atraso > 0) saldo.vencido = round2(saldo.vencido + item.monto)
    saldo.atraso = Math.max(saldo.atraso, item.atraso)
    saldo.documentos += 1
    saldos.set(item.contraparte.ruc, saldo)
  }

  const total = round2(items.reduce((acc, d) => acc + d.monto, 0))
  const porVencer = tramos['por-vencer']
  return {
    tipo,
    fecha,
    total,
    vencido: round2(total - porVencer),
    porVencer,
    items,
    vencidas: items.filter((d) => d.atraso > 0).length,
    saldos: [...saldos.values()].sort((a, b) => b.vencido - a.vencido || b.total - a.total),
    tramos,
  }
}

// ── Textos ────────────────────────────────────────────────────

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

/** Quienes deben o a quienes se debe: "4 clientes", "1 proveedor". */
export function contrapartesLabel(c: Corte): string {
  return c.tipo === 'cobrar' ? plural(c.saldos.length, 'cliente') : plural(c.saldos.length, 'proveedor', 'proveedores')
}

export type EstadoTone = 'negative' | 'warning' | 'neutral'

/** Estado de una factura a la fecha de corte. */
export function estado(atraso: number, vence: string): { label: string; tone: EstadoTone } {
  if (atraso > 0) return { label: `Vencida hace ${plural(atraso, 'día')}`, tone: 'negative' }
  if (atraso === 0) return { label: 'Vence hoy', tone: 'warning' }
  if (atraso >= -7) return { label: `Vence en ${plural(-atraso, 'día')}`, tone: 'warning' }
  return { label: `Vence el ${formatDayMonthShort(vence)}`, tone: 'neutral' }
}

/** Lo que vence en los próximos 7 días (sin contar lo ya vencido). */
export function proximos7(c: Corte): Pendiente[] {
  return c.items.filter((d) => d.atraso <= 0 && d.atraso >= -7)
}

/** Nombres en una frase: "A, B y C" (y "2 más" si son muchos). */
export function nombres(list: string[], max = 2): string {
  const shown = list.slice(0, max)
  const rest = list.length - shown.length
  if (rest > 0) return `${shown.join(', ')} y ${plural(rest, 'más', 'más')}`
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} y ${shown.at(-1)}` : (shown[0] ?? '')
}

const money = (n: number) => formatMoney(n)
const sum = (list: Pendiente[]) => round2(list.reduce((acc, d) => acc + d.monto, 0))

/** Qué hacer con lo que te deben o con lo que debes, para decidir en segundos. */
export function cuentasInsights(tipo: CuentaTipo, cobrar: Corte, pagar: Corte): Insight[] {
  const c = tipo === 'cobrar' ? cobrar : pagar
  const key = `${tipo}-${c.fecha}`
  const insights: Insight[] = []
  const [top] = c.saldos
  const [next] = [...c.items].filter((d) => d.atraso <= 0).sort((a, b) => a.vence.localeCompare(b.vence))
  const semana = proximos7(c)

  if (top && c.vencido > 0) {
    insights.push(
      tipo === 'cobrar'
        ? {
            id: `${key}-vencido`,
            avatar: 'bank',
            title: `Cobra primero a ${top.contraparte.nombre}`,
            body: [
              'Te debe ',
              { neg: money(top.vencido) },
              ` vencidos y su factura más antigua venció hace ${plural(top.atraso, 'día')}. `,
              ...((top.vencido < c.vencido
                ? ['Es el ', { b: `${Math.round((top.vencido / c.vencido) * 100)}%` }, ' de todo lo vencido.']
                : ['Es el único cliente con facturas vencidas.']) as RichText),
            ],
            note: `Recuperar lo vencido sumaría ${money(c.vencido)} a tu caja.`,
          }
        : {
            id: `${key}-vencido`,
            avatar: 'bank',
            title: `Tienes ${money(c.vencido)} vencidos con proveedores`,
            body: [
              'Lo más urgente es ',
              { b: top.contraparte.nombre },
              ': ',
              { neg: money(top.vencido) },
              ` con ${plural(top.atraso, 'día')} de atraso.`,
            ],
            note: 'Ponerte al día evita intereses y que te corten el crédito.',
          },
    )
  } else if (next) {
    insights.push({
      id: `${key}-al-dia`,
      avatar: 'bank',
      title: tipo === 'cobrar' ? 'Tus clientes están al día' : 'Estás al día con tus proveedores',
      // Si vence esta semana, lo detalla el insight siguiente
      body:
        semana.length > 0
          ? ['Ninguna factura está vencida.']
          : [
              'Ninguna factura está vencida. ',
              tipo === 'cobrar' ? 'El próximo cobro es de ' : 'El próximo pago es de ',
              tipo === 'cobrar' ? { pos: money(next.monto) } : { neg: money(next.monto) },
              tipo === 'cobrar' ? ' de ' : ' a ',
              { b: next.contraparte.nombre },
              `, el ${formatDayMonth(next.vence)}.`,
            ],
    })
  }

  if (semana.length > 0) {
    // Las razones sociales terminan en punto ("S.A.C."): van al inicio de la frase
    const lista = [...new Set(semana.map((d) => d.contraparte.nombre))]
    const varios = lista.length > 1
    insights.push(
      tipo === 'cobrar'
        ? {
            id: `${key}-semana`,
            avatar: 'api',
            title: `En 7 días deberían entrarte ${money(sum(semana))}`,
            body: [
              { b: nombres(lista) },
              varios ? ' tienen ' : ' tiene ',
              { b: plural(semana.length, 'factura') },
              ` por vencer. ${varios ? 'Recuérdales' : 'Recuérdale'} el pago antes de la fecha.`,
            ],
          }
        : {
            id: `${key}-semana`,
            avatar: 'api',
            title: `En 7 días vencen ${money(sum(semana))}`,
            body: [{ b: nombres(lista) }, varios ? ' esperan ese pago.' : ' espera ese pago.', ' Sepáralo para no atrasarte.'],
          },
    )
  }

  if (cobrar.total > 0 || pagar.total > 0) {
    const diff = round2(cobrar.total - pagar.total)
    const cierre: RichText =
      diff >= 0
        ? ['Si cobras todo, te quedan ', { b: money(diff) }, ' después de pagar a tus proveedores.']
        : ['Aunque cobres todo, te faltarían ', { neg: money(-diff) }, ' para pagar a tus proveedores.']
    insights.push({
      id: `${key}-cruce`,
      avatar: 'sheet',
      title: diff >= 0 ? 'Te deben más de lo que debes' : 'Debes más de lo que te deben',
      body: ['Te deben ', { pos: money(cobrar.total) }, ' y debes ', { neg: money(pagar.total) }, '. ', ...cierre],
    })
  }

  return insights
}
