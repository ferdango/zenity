import { formatAxis, formatDayMonth, formatMoney } from '../lib/format'
import { rucCheckDigit } from '../lib/validation'
import type { Business } from './businesses'
import type { Ledger } from './ledger'
import { type Insight, PERIODS, type RichText } from './mock'
import { type Rand, seeded } from './registry'

/**
 * SIRE simulado (Sistema Integrado de Registros Electrónicos de SUNAT): el Registro de
 * Ventas e Ingresos (RVIE) y el Registro de Compras (RCE) de cada RUC, con los
 * comprobantes electrónicos que SUNAT propone mes a mes. Sobre ellos se calculan el
 * IGV (débito, crédito fiscal y saldo a favor) y el pago a cuenta de la Renta.
 *
 * Solo depende del RUC: no cambia al conectar o quitar cuentas bancarias, porque el
 * SIRE no ve esos movimientos, solo los comprobantes.
 */

export const IGV_RATE = 0.18

export type SireBook = 'ventas' | 'compras'
export type TipoCpe = '01' | '03' | '07' | '14'

/** Tipos de comprobante (tabla 10 de SUNAT). */
export const TIPOS_CPE: Record<TipoCpe, { label: string; icon: string }> = {
  '01': { label: 'Factura', icon: 'receipt_long' },
  '03': { label: 'Boleta de venta', icon: 'confirmation_number' },
  '07': { label: 'Nota de crédito', icon: 'assignment_return' },
  '14': { label: 'Recibo de servicios públicos', icon: 'bolt' },
}

/** Por qué el IGV de una compra no es crédito fiscal. */
export type SinCredito = 'boleta' | 'exonerado' | 'no-habido'

export const SIN_CREDITO: Record<SinCredito, { label: string; detail: string }> = {
  boleta: {
    label: 'Boleta',
    detail: 'Las boletas no otorgan crédito fiscal: el IGV va incluido en el precio y no se discrimina. Pide factura con tu RUC.',
  },
  exonerado: {
    label: 'Exonerado',
    detail: 'Compra exonerada de IGV: no hay impuesto que descontar.',
  },
  'no-habido': {
    label: 'No habido',
    detail: 'El proveedor figura como NO HABIDO en SUNAT: su IGV no se puede usar como crédito fiscal hasta que regularice su condición.',
  },
}

export interface SireRecord {
  id: string
  libro: SireBook
  tipo: TipoCpe
  serie: string
  numero: number
  /** AAAA-MM-DD */
  fecha: string
  /** ruc = null para boletas a "Clientes varios" */
  contraparte: { ruc: string | null; nombre: string }
  glosa: string
  baseImponible: number
  igv: number
  /** Exonerado o inafecto */
  noGravado: number
  total: number
  /** Solo compras: por qué su IGV no es crédito fiscal */
  sinCredito?: SinCredito
}

export interface BookTotals {
  total: number
  baseImponible: number
  igv: number
  noGravado: number
  count: number
}

export interface IgvCalc {
  /** IGV de las ventas (neto de notas de crédito) */
  debito: number
  /** IGV de todas las compras del RCE */
  igvCompras: number
  /** IGV de compras sin derecho a crédito fiscal */
  noDeducible: number
  credito: number
  /** Saldo a favor que viene del mes anterior */
  saldoAnterior: number
  /** Débito − crédito − saldo anterior (negativo = saldo a favor) */
  resultado: number
  /** Lo que se paga, en soles enteros como en el Formulario 621 */
  aPagar: number
  /** Saldo a favor que pasa al mes siguiente */
  saldoFavor: number
}

export interface SirePeriod {
  key: string
  ventas: SireRecord[]
  compras: SireRecord[]
  totalVentas: BookTotals
  totalCompras: BookTotals
  /** Ventas − compras (importes totales) */
  balance: number
  igv: IgvCalc
  /** El último mes aún es la propuesta de SUNAT, pendiente de aceptar */
  propuesta: boolean
}

export type Regimen = 'general' | 'rmt' | 'rer'

/** Orden en que se ofrecen al registrar un RUC. */
export const REGIMEN_ORDER: Regimen[] = ['general', 'rmt', 'rer']

/** Tope anual de ingresos (y de compras) del RER. */
export const RER_LIMIT = 525000

export const REGIMENES: Record<
  Regimen,
  { label: string; short: string; tasa: number; requisito: string; nota: string }
> = {
  general: {
    label: 'Régimen General',
    short: 'General',
    tasa: 0.015,
    requisito: 'Sin tope de ingresos · 29.5% anual sobre la utilidad',
    nota: 'Pago a cuenta del 1.5% de tus ingresos netos (o el coeficiente del año anterior, si es mayor). Se regulariza en la declaración anual.',
  },
  rmt: {
    label: 'Régimen MYPE Tributario',
    short: 'RMT',
    tasa: 0.01,
    requisito: 'Ingresos de hasta 1,700 UIT al año · se regulariza en la anual',
    nota: 'Pago a cuenta del 1% de tus ingresos netos mientras al año no superes 300 UIT. Se regulariza en la declaración anual.',
  },
  rer: {
    label: 'Régimen Especial (RER)',
    short: 'RER',
    tasa: 0.015,
    requisito: 'Ingresos de hasta S/ 525,000 al año · cuota definitiva',
    nota: 'Cuota mensual del 1.5% de tus ingresos netos. Es definitiva: no hay declaración anual de Renta.',
  },
}

/** Motivo por el que el RER no aplica a un ingreso mensual dado (null si aplica). */
export function rerUnavailable(ingresoMensual: number): string | null {
  const anual = ingresoMensual * 12
  if (anual <= RER_LIMIT) return null
  return `Con S/ ${formatAxis(anual)} al año superas el tope del RER (S/ ${formatAxis(RER_LIMIT)})`
}

/** "1%", "1.5%" */
export function rateLabel(rate: number): string {
  return `${(rate * 100).toLocaleString('es-PE')}%`
}

export interface Sire {
  regimen: Regimen
  periods: SirePeriod[]
}

export interface RentaCalc {
  regimen: Regimen
  /** Base imponible de las ventas más las ventas no gravadas */
  ingresosNetos: number
  tasa: number
  monto: number
  /** En soles enteros */
  aPagar: number
}

// ── Generación ────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100
const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]
const between = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pad = (n: number) => String(n).padStart(2, '0')

function shuffle<T>(rand: Rand, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface Party {
  nombre: string
  glosa: string
  tipo?: TipoCpe
  sinCredito?: SinCredito
}

const CLIENTES = [
  'Andina S.A.C.',
  'Corporación Kallpa S.A.',
  'Distribuidora Norte E.I.R.L.',
  'Inversiones Miraflores S.R.L.',
  'Servicios Integrales Lima S.A.C.',
  'Hotelera Paracas S.A.',
  'Minimarket San Felipe E.I.R.L.',
  'Eventos y Banquetes Inti S.A.C.',
  'Clínica Santa Rosa S.A.C.',
  'Constructora Chavín S.A.C.',
]

const GLOSAS_VENTA = ['Venta de mercadería', 'Venta al por mayor', 'Pedido corporativo', 'Venta según orden de compra']

const ALQUILER: Party = { nombre: 'Inmobiliaria Costa Verde S.A.C.', glosa: 'Alquiler del local comercial' }
const MERCADERIA: Party[] = [
  { nombre: 'Distribuidora Altamar S.A.C.', glosa: 'Mercadería y abarrotes' },
  { nombre: 'Importaciones Misti S.A.', glosa: 'Insumos importados' },
  { nombre: 'Envases y Empaques del Sur S.R.L.', glosa: 'Empaques y bolsas' },
  { nombre: 'Comercial Nazca E.I.R.L.', glosa: 'Productos de limpieza' },
]
const SERVICIOS: Party[] = [
  { nombre: 'Telecomunicaciones Andinas S.A.', glosa: 'Internet y telefonía' },
  { nombre: 'Transportes Huaylas S.A.C.', glosa: 'Flete y reparto' },
  { nombre: 'Estudio Contable Ayni S.A.C.', glosa: 'Honorarios contables' },
  { nombre: 'Agencia Digital Paracas S.A.C.', glosa: 'Publicidad digital' },
]
const RECIBO_LUZ: Party = { nombre: 'Electro Lima S.A.A.', glosa: 'Recibo de luz del local', tipo: '14' }
const AGRO: Party = { nombre: 'Frutícola Santa Anita E.I.R.L.', glosa: 'Frutas y verduras frescas', sinCredito: 'exonerado' }
const FERRETERIA: Party = { nombre: 'Ferretería San Martín E.I.R.L.', glosa: 'Útiles y ferretería', tipo: '03', sinCredito: 'boleta' }
const NO_HABIDO: Party = { nombre: 'Servicios Generales Amazonía E.I.R.L.', glosa: 'Mantenimiento de equipos', sinCredito: 'no-habido' }
const ACTIVO: Party = { nombre: 'Equipos Comerciales Huascarán S.A.C.', glosa: 'Equipamiento del local (activo fijo)' }

/** RUC válido (con dígito verificador) y estable para cada razón social. */
function rucOf(nombre: string): string {
  const rand = seeded(`ruc:${nombre}`)
  const first10 = `20${Array.from({ length: 8 }, () => Math.floor(rand() * 10)).join('')}`
  return `${first10}${rucCheckDigit(first10)}`
}

/** Serie y correlativo base del proveedor (cada emisor numera sus comprobantes). */
function seriesOf(party: Party): { serie: string; base: number } {
  const rand = seeded(`serie:${party.nombre}`)
  const prefix = party.tipo === '03' ? 'B' : party.tipo === '14' ? 'S' : rand() < 0.25 ? 'E' : 'F'
  return { serie: `${prefix}${String(between(rand, 1, 12)).padStart(3, '0')}`, base: between(rand, 1200, 48000) }
}

/** Reparte `total` según los pesos; el último monto absorbe el redondeo. */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0)
  let acc = 0
  return weights.map((w, i) => {
    const value = i === weights.length - 1 ? round2(total - acc) : round2((total * w) / sum)
    acc = round2(acc + value)
    return value
  })
}

/** Días del mes ordenados (los correlativos crecen con la fecha). */
function days(rand: Rand, count: number): number[] {
  return Array.from({ length: count }, () => between(rand, 1, 28)).sort((a, b) => a - b)
}

function record(
  libro: SireBook,
  tipo: TipoCpe,
  serie: string,
  numero: number,
  fecha: string,
  contraparte: SireRecord['contraparte'],
  glosa: string,
  total: number,
  sinCredito?: SinCredito,
): SireRecord {
  const gravado = sinCredito !== 'exonerado'
  const baseImponible = gravado ? round2(total / (1 + IGV_RATE)) : 0
  return {
    id: `${libro}-${contraparte.ruc ?? 'varios'}-${serie}-${numero}`,
    libro,
    tipo,
    serie,
    numero,
    fecha,
    contraparte,
    glosa,
    baseImponible,
    igv: gravado ? round2(total - baseImponible) : 0,
    noGravado: gravado ? 0 : total,
    total,
    sinCredito,
  }
}

const byDateDesc = (a: SireRecord, b: SireRecord) => b.fecha.localeCompare(a.fecha) || b.numero - a.numero

/** Comprobantes de un mes. Los montos siguen la estacionalidad de la serie del demo. */
function buildRecords(business: Business, index: number, numbering: { factura: number; boleta: number; nota: number }) {
  const ref = PERIODS[index]
  const rand = seeded(`sire:${business.ruc}:${ref.key}`)
  const k = business.scale
  const date = (day: number) => `${ref.year}-${pad(ref.month + 1)}-${pad(day)}`
  const last = index === PERIODS.length - 1

  // ── Ventas (RVIE): boletas a consumidores finales, facturas a empresas y alguna nota de crédito
  const ventasTotal = round2(ref.ingresos * k * (1.04 + rand() * 0.18))
  const nBoletas = between(rand, 3, 5)
  const nFacturas = between(rand, 3, 5)
  const weights = [
    ...Array.from({ length: nBoletas }, () => 0.4 + rand() * 0.6),
    ...Array.from({ length: nFacturas }, () => 0.8 + rand() * 1),
  ]
  const amounts = split(ventasTotal, weights)
  const clientes = shuffle(rand, CLIENTES)

  const boletaDays = days(rand, nBoletas)
  const facturaDays = days(rand, nFacturas)
  const ventas: SireRecord[] = [
    ...boletaDays.map((day, i) =>
      record(
        'ventas',
        '03',
        'B001',
        numbering.boleta + index * 40 + i * 7 + between(rand, 0, 5),
        date(day),
        { ruc: null, nombre: 'Clientes varios' },
        'Ventas al público',
        amounts[i],
      ),
    ),
    ...facturaDays.map((day, i) => {
      const nombre = clientes[i]
      return record(
        'ventas',
        '01',
        'F001',
        numbering.factura + index * 6 + i,
        date(day),
        { ruc: rucOf(nombre), nombre },
        pick(rand, GLOSAS_VENTA),
        amounts[nBoletas + i],
      )
    }),
  ]
  if (rand() < 0.55) {
    const nombre = clientes[0]
    ventas.push(
      record(
        'ventas',
        '07',
        'FC01',
        numbering.nota + index,
        date(Math.min(28, facturaDays[0] + between(rand, 1, 6))),
        { ruc: rucOf(nombre), nombre },
        'Devolución de mercadería',
        -round2(amounts[nBoletas] * (0.08 + rand() * 0.12)),
      ),
    )
  }

  // ── Compras (RCE): alquiler fijo y el resto repartido entre proveedores del mes
  const comprasTotal = round2(ref.egresos * k * (0.72 + rand() * 0.2))
  const alquiler = round2(315 * k)
  const parties: Array<{ party: Party; weight: number }> = [
    ...shuffle(rand, MERCADERIA)
      .slice(0, 2)
      .map((party) => ({ party, weight: 1 + rand() * 0.6 })),
    { party: pick(rand, SERVICIOS), weight: 0.4 + rand() * 0.3 },
    { party: RECIBO_LUZ, weight: 0.25 + rand() * 0.1 },
  ]
  if (rand() < 0.6) parties.push({ party: AGRO, weight: 0.3 + rand() * 0.2 })
  if (rand() < 0.55) parties.push({ party: FERRETERIA, weight: 0.12 + rand() * 0.13 })
  // El mes en curso siempre trae una factura observada, para mostrar el caso en el demo
  if (last || rand() < 0.15) parties.push({ party: NO_HABIDO, weight: 0.25 + rand() * 0.15 })

  const shares = split(Math.max(comprasTotal - alquiler, comprasTotal * 0.4), parties.map((p) => p.weight))
  const purchase = (party: Party, total: number, day: number) => {
    const { serie, base } = seriesOf(party)
    return record(
      'compras',
      party.tipo ?? '01',
      serie,
      base + index * 37 + between(rand, 0, 30),
      date(day),
      { ruc: rucOf(party.nombre), nombre: party.nombre },
      party.glosa,
      total,
      party.sinCredito,
    )
  }
  const compras = [
    purchase(ALQUILER, alquiler, 1),
    ...parties.map(({ party }, i) => purchase(party, shares[i], between(rand, 2, 28))),
  ]
  // Enero: compra de un activo fijo; su IGV deja saldo a favor para febrero
  if (index === 3) compras.push(purchase(ACTIVO, round2(ref.ingresos * k * 0.95), between(rand, 8, 20)))

  return { ventas: ventas.sort(byDateDesc), compras: compras.sort(byDateDesc) }
}

function sumBook(records: SireRecord[]): BookTotals {
  const sum = (field: 'total' | 'baseImponible' | 'igv' | 'noGravado') =>
    round2(records.reduce((acc, r) => acc + r[field], 0))
  return {
    total: sum('total'),
    baseImponible: sum('baseImponible'),
    igv: sum('igv'),
    noGravado: sum('noGravado'),
    count: records.length,
  }
}

export function buildSire(business: Business): Sire {
  const rand = seeded(`sire:${business.ruc}`)
  const numbering = { factura: between(rand, 120, 900), boleta: between(rand, 1500, 8000), nota: between(rand, 4, 40) }
  let saldoAnterior = 0

  const periods = PERIODS.map((ref, index): SirePeriod => {
    const { ventas, compras } = buildRecords(business, index, numbering)
    const totalVentas = sumBook(ventas)
    const totalCompras = sumBook(compras)
    const noDeducible = round2(
      compras.reduce((acc, r) => (r.sinCredito === 'boleta' || r.sinCredito === 'no-habido' ? acc + r.igv : acc), 0),
    )
    const credito = round2(totalCompras.igv - noDeducible)
    const resultado = round2(totalVentas.igv - credito - saldoAnterior)
    const igv: IgvCalc = {
      debito: totalVentas.igv,
      igvCompras: totalCompras.igv,
      noDeducible,
      credito,
      saldoAnterior,
      resultado,
      aPagar: resultado > 0 ? Math.round(resultado) : 0,
      saldoFavor: resultado < 0 ? -resultado : 0,
    }
    saldoAnterior = igv.saldoFavor
    return {
      key: ref.key,
      ventas,
      compras,
      totalVentas,
      totalCompras,
      balance: round2(totalVentas.total - totalCompras.total),
      igv,
      propuesta: index === PERIODS.length - 1,
    }
  })

  return { regimen: business.regimen, periods }
}

// ── Consultas ─────────────────────────────────────────────────

export function sirePeriod(sire: Sire, key: string): SirePeriod {
  return sire.periods.find((p) => p.key === key) ?? sire.periods[sire.periods.length - 1]
}

export function previousSirePeriod(sire: Sire, key: string): SirePeriod | null {
  const index = sire.periods.findIndex((p) => p.key === key)
  return index > 0 ? sire.periods[index - 1] : null
}

export function renta(period: SirePeriod, regimen: Regimen): RentaCalc {
  const ingresosNetos = round2(period.totalVentas.baseImponible + period.totalVentas.noGravado)
  const { tasa } = REGIMENES[regimen]
  const monto = round2(Math.max(0, ingresosNetos * tasa))
  return { regimen, ingresosNetos, tasa, monto, aPagar: Math.round(monto) }
}

/** IGV + Renta del mes, en soles enteros. */
export function totalAPagar(period: SirePeriod, regimen: Regimen): number {
  return period.igv.aPagar + renta(period, regimen).aPagar
}

/** Compras cuyo IGV no se pudo usar como crédito fiscal. */
export function noDeducibles(period: SirePeriod): SireRecord[] {
  return period.compras.filter((r) => r.sinCredito === 'boleta' || r.sinCredito === 'no-habido')
}

/**
 * Vencimiento referencial (AAAA-MM-DD) según el último dígito del RUC: el mes siguiente
 * al periodo, pasando al lunes si cae en fin de semana.
 */
export function vencimiento(periodKey: string, ruc: string): string {
  const [year, month] = periodKey.split('-').map(Number)
  const day = 15 + [0, 1, 2, 2, 3, 3, 4, 4, 5, 5][Number(ruc.at(-1))]
  const date = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, day))
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** "2026-04-16" → "16 de abril" */
export const formatDue = formatDayMonth

// ── Insights ──────────────────────────────────────────────────

const money = (n: number) => formatMoney(n)

/** "Explícame mi SIRE": IGV del mes, crédito fiscal perdido y cruce con las cuentas. */
export function sireInsights(period: SirePeriod, ledger: Ledger, ruc: string, month: string): Insight[] {
  const { igv } = period
  const due = formatDue(vencimiento(period.key, ruc))
  const insights: Insight[] = [
    {
      id: `sire-igv-${period.key}`,
      avatar: 'bank',
      title:
        igv.resultado > 0
          ? `IGV de ${month.toLowerCase()}: pagarías ${money(igv.aPagar)}`
          : `IGV de ${month.toLowerCase()}: no pagas, tienes saldo a favor`,
      body: [
        'Tus ventas generaron ',
        { b: money(igv.debito) },
        ' de débito fiscal y tus compras te dan ',
        { pos: money(igv.credito) },
        ' de crédito fiscal',
        ...(igv.saldoAnterior > 0 ? [', más ', { pos: money(igv.saldoAnterior) }, ' de saldo a favor del mes anterior'] : []),
        '. ',
        ...((igv.resultado > 0
          ? ['El IGV resultante es ', { neg: money(igv.resultado) }, '.']
          : ['Te quedan ', { pos: money(igv.saldoFavor) }, ' de saldo a favor para el próximo mes.']) as RichText),
      ],
      note: `Vence el ${due}, según el cronograma para RUC terminados en ${ruc.at(-1)}.`,
    },
  ]

  const excluded = noDeducibles(period)
  if (excluded.length > 0) {
    const habido = excluded.filter((r) => r.sinCredito === 'no-habido').length
    const boletas = excluded.length - habido
    const parts = [
      habido > 0 ? `${habido} ${habido === 1 ? 'factura' : 'facturas'} de proveedor no habido` : '',
      boletas > 0 ? `${boletas} ${boletas === 1 ? 'compra' : 'compras'} con boleta` : '',
    ].filter(Boolean)
    insights.push({
      id: `sire-credito-${period.key}`,
      avatar: 'sheet',
      title: `Perdiste ${money(igv.noDeducible)} de crédito fiscal`,
      body: ['No pudiste descontar el IGV de ', { b: parts.join(' y ') }, '. Ese monto se paga completo a SUNAT.'],
      note: 'Pide siempre factura con tu RUC y verifica que tus proveedores estén activos y habidos.',
    })
  }

  const bank = ledger.periods.find((p) => p.key === period.key)
  if (!ledger.empty && bank) {
    const diff = round2(period.totalVentas.total - bank.ingresos)
    insights.push({
      id: `sire-cuentas-${period.key}`,
      avatar: 'api',
      title: 'Tus ventas en el SIRE frente a tus cuentas',
      body: [
        'Tus comprobantes de venta suman ',
        { b: money(period.totalVentas.total) },
        ' y tus cuentas recibieron ',
        { b: money(bank.ingresos) },
        '. ',
        ...((diff >= 0
          ? ['Hay ', { b: money(diff) }, ' facturados que todavía no ves cobrados.']
          : ['Hay ', { neg: money(-diff) }, ' cobrados que no tienen comprobante en el SIRE.']) as RichText),
      ],
      note:
        diff >= 0
          ? 'Pueden ser ventas al crédito o cobros en cuentas que aún no conectas.'
          : 'SUNAT cruza tus depósitos con tus ventas: emite un comprobante por cada cobro.',
    })
  }

  return insights
}
