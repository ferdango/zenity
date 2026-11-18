/**
 * Motor de Zenity: concilia, categoriza y asigna un estado a cada movimiento y comprobante.
 * Cada estado alimenta un feature (Por revisar, Personal, Cobrar, Caja, Contador).
 */
import { CATEGORIAS } from '../config/categories.ts'
import { TIPO_CAMBIO_MOCK } from '../config/taxParams2026.ts'
import { categorize, type CategorizeContext } from './categorization.ts'
import { personalScore, type PersonalScore, UMBRAL_PERSONAL } from './personal.ts'
import { reconcile } from './reconciliation.ts'
import type { BankMovement, BusinessData, Classification, Comprobante, Correction, DemoBusiness, Estado, Match, Rule } from './types.ts'
import { monthOf, round2 } from './util.ts'

export interface UserInputs {
  corrections: Correction[]
  rules: Rule[]
  /** Movimientos insertados por la demo («Simular que pagó») */
  extraMovements: BankMovement[]
  /** Ajustes del dueño sobre su negocio (sueldo, colchón, régimen laboral) */
  overrides?: Partial<Pick<DemoBusiness, 'sueldoDueno' | 'colchonCaja' | 'regimenLaboral'>>
}

export interface Analysis {
  business: DemoBusiness
  data: BusinessData
  /** Del más reciente al más antiguo */
  movements: BankMovement[]
  matches: Match[]
  matchByMovement: Map<string, Match>
  matchByComprobante: Map<string, Match>
  classifications: Map<string, Classification>
  personal: Map<string, PersonalScore>
  /** Estado de cada factura o boleta: CONCILIADO, COMPROBANTE_SIN_COBRO o FACTURA_SIN_PAGO */
  comprobanteEstado: Map<string, Estado>
  comprobantesById: Map<string, Comprobante>
  movementsById: Map<string, BankMovement>
  /** Cola de F-03: lo que Zenity no pudo resolver con confianza alta */
  porRevisar: BankMovement[]
  saldoActual: number
}

/** Tipo de cambio de la tabla mock: el último valor publicado hasta esa fecha. */
export function tipoCambio(fecha: string): number {
  const keys = Object.keys(TIPO_CAMBIO_MOCK).sort()
  let value = TIPO_CAMBIO_MOCK[keys[0]]
  for (const k of keys) if (k <= fecha) value = TIPO_CAMBIO_MOCK[k]
  return value
}

/** Abono de una persona (Yape, transferencia sin RUC de empresa o efectivo depositado). */
export function esAbonoDePersona(m: BankMovement): boolean {
  if (m.monto <= 0) return false
  if (m.canal === 'YAPE' || m.canal === 'DEPOSITO_EFECTIVO') return true
  return m.canal === 'TRANSFERENCIA' && !(m.contraparteRuc ?? '').startsWith('20')
}

export function analyze(data: BusinessData, user: UserInputs): Analysis {
  // Solo los ajustes con valor: «volver a los valores de ejemplo» los deja en undefined
  const overrides = Object.fromEntries(Object.entries(user.overrides ?? {}).filter(([, v]) => v !== undefined))
  const business: DemoBusiness = { ...data.business, ...overrides }
  const id = business.id
  const corrections = user.corrections.filter((c) => c.businessId === id)
  const rules = user.rules.filter((r) => r.businessId === id)
  const all = [...data.movements, ...user.extraMovements.filter((m) => m.businessId === id)]
  const movements = [...all].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
  const movementsById = new Map(movements.map((m) => [m.id, m]))
  const comprobantesById = new Map(data.comprobantes.map((c) => [c.id, c]))

  const matches = reconcile({
    movements,
    comprobantes: data.comprobantes,
    posSales: data.posSales,
    posBatches: data.posBatches,
    tipoCambio,
  })
  const matchByMovement = new Map<string, Match>()
  const matchByComprobante = new Map<string, Match>()
  for (const match of matches) {
    for (const mid of match.movementIds) matchByMovement.set(mid, match)
    for (const cid of match.comprobanteIds) matchByComprobante.set(cid, match)
  }

  const ctx: CategorizeContext = { rubro: business.rubro, rules, corrections, matchByMovement, comprobantesById, movementsById }
  const personalCtx = { apellidos: business.dueno.apellidos.split(' '), corrections, movementsById, rules }
  const classifications = new Map<string, Classification>()
  const personal = new Map<string, PersonalScore>()
  const porRevisar: BankMovement[] = []

  for (const m of movements) {
    const guess = categorize(m, ctx)
    const match = matchByMovement.get(m.id)
    const own = [...corrections].reverse().find((c) => c.movementId === m.id)
    const score = personalScore(m, personalCtx)
    personal.set(m.id, score)

    let estado: Estado
    if (match) estado = 'CONCILIADO'
    else if (own ? own.elegida === 'retiro_dueno' : score.score >= UMBRAL_PERSONAL) estado = 'POSIBLE_PERSONAL'
    else if (guess.confianza < 0.6) estado = 'SIN_CATEGORIA_SEGURA'
    else if (esAbonoDePersona(m) && guess.categoriaId !== 'prestamos') estado = 'COBRADO_SIN_COMPROBANTE'
    // En dos vías (NRUS) no hay registro de compras: no se piden facturas de compra
    else if (m.monto < 0 && CATEGORIAS[guess.categoriaId].necesitaFactura && !business.dosVias) estado = 'PAGADO_SIN_FACTURA'
    else estado = 'CONCILIADO'

    // Un gasto personal detectado se muestra como «retiro del dueño» hasta que el usuario diga lo contrario
    const categoriaId = estado === 'POSIBLE_PERSONAL' ? 'retiro_dueno' : guess.categoriaId
    const motivo =
      estado === 'POSIBLE_PERSONAL' && guess.fuente !== 'MANUAL' ? `Parece un gasto personal: ${score.senales.join(', ').toLowerCase()}.` : guess.motivo
    classifications.set(m.id, { movementId: m.id, estado, categoriaId, confianza: guess.confianza, motivo, fuente: guess.fuente })

    if (!match && estado !== 'POSIBLE_PERSONAL' && guess.fuente !== 'MANUAL' && guess.confianza < 0.9) porRevisar.push(m)
  }

  const comprobanteEstado = new Map<string, Estado>()
  for (const c of data.comprobantes) {
    if (c.tipo !== 'FACTURA' && c.tipo !== 'BOLETA') continue
    comprobanteEstado.set(c.id, matchByComprobante.has(c.id) ? 'CONCILIADO' : c.direccion === 'VENTA' ? 'COMPROBANTE_SIN_COBRO' : 'FACTURA_SIN_PAGO')
  }

  const ultimo = [...all].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)).at(-1)

  return {
    business,
    data,
    movements,
    matches,
    matchByMovement,
    matchByComprobante,
    classifications,
    personal,
    comprobanteEstado,
    comprobantesById,
    movementsById,
    porRevisar: porRevisar.reverse(),
    saldoActual: ultimo?.saldoDespues ?? 0,
  }
}

/* ── Resúmenes para las pantallas ─────────────────────────────── */

export const ESTADOS: Estado[] = [
  'CONCILIADO',
  'COBRADO_SIN_COMPROBANTE',
  'COMPROBANTE_SIN_COBRO',
  'PAGADO_SIN_FACTURA',
  'FACTURA_SIN_PAGO',
  'POSIBLE_PERSONAL',
  'SIN_CATEGORIA_SEGURA',
]

/** Nombres amigables para el dueño. */
export const ESTADO_LABEL: Record<Estado, string> = {
  CONCILIADO: 'Todo cuadra',
  COBRADO_SIN_COMPROBANTE: 'Cobraste sin boleta/factura',
  COMPROBANTE_SIN_COBRO: 'Te deben',
  PAGADO_SIN_FACTURA: 'Pagaste sin factura',
  FACTURA_SIN_PAGO: 'Debes pagar',
  POSIBLE_PERSONAL: '¿Gasto personal?',
  SIN_CATEGORIA_SEGURA: 'Por revisar',
}

export interface EstadoItem {
  kind: 'movimiento' | 'comprobante'
  id: string
  fecha: string
  monto: number
}

export interface ResumenMes {
  mes: string
  /** 0..1 */
  conciliado: number
  porEstado: Record<Estado, { count: number; monto: number; items: EstadoItem[] }>
}

/** Movimientos del mes + comprobantes del mes que no tienen movimiento. */
export function resumenMes(a: Analysis, mes: string): ResumenMes {
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, { count: 0, monto: 0, items: [] as EstadoItem[] }])) as ResumenMes['porEstado']
  let total = 0
  let ok = 0
  for (const m of a.movements) {
    if (monthOf(m.fecha) !== mes) continue
    const cl = a.classifications.get(m.id)
    if (!cl) continue
    const bucket = porEstado[cl.estado]
    bucket.count++
    bucket.monto = round2(bucket.monto + Math.abs(m.monto))
    bucket.items.push({ kind: 'movimiento', id: m.id, fecha: m.fecha, monto: m.monto })
    total++
    if (cl.estado === 'CONCILIADO') ok++
  }
  for (const c of a.data.comprobantes) {
    const estado = a.comprobanteEstado.get(c.id)
    if (!estado || estado === 'CONCILIADO' || monthOf(c.fechaEmision) !== mes) continue
    const bucket = porEstado[estado]
    bucket.count++
    bucket.monto = round2(bucket.monto + c.total)
    bucket.items.push({ kind: 'comprobante', id: c.id, fecha: c.fechaEmision, monto: c.direccion === 'VENTA' ? c.total : -c.total })
    total++
  }
  for (const e of ESTADOS) porEstado[e].items.sort((x, y) => y.fecha.localeCompare(x.fecha))
  return { mes, conciliado: total ? ok / total : 1, porEstado }
}

/** Comprobantes abiertos (todos los meses) en un estado. */
export function comprobantesEn(a: Analysis, estado: 'COMPROBANTE_SIN_COBRO' | 'FACTURA_SIN_PAGO'): Comprobante[] {
  return a.data.comprobantes.filter((c) => a.comprobanteEstado.get(c.id) === estado)
}

/** Monto neto de un comprobante (descontando notas de crédito). */
export function totalNeto(a: Analysis, c: Comprobante): number {
  const notas = a.data.comprobantes.filter((n) => n.tipo === 'NOTA_CREDITO' && n.referenciaId === c.id)
  return round2(c.total - notas.reduce((acc, n) => acc + n.total, 0))
}
