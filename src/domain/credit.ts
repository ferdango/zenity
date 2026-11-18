/**
 * F3 · Perfil crediticio con flujo real: el expediente que Zenity arma con ventas SUNAT, flujo
 * bancario y cobros digitales para que el BCP pre-evalúe un crédito. Todo es determinístico y cada
 * componente del puntaje se explica con el número real del negocio (nada sale de un modelo opaco).
 */
import { CREDITO, type Segmento, SEGMENTO_LABEL } from '../config/credit.ts'
import { vencimientoSunat } from './calendar.ts'
import { porCobrar } from './collections.ts'
import type { Analysis } from './engine.ts'
import { ventasPorMes } from './taxSimulator.ts'
import type { CashEvent, PromesaPago } from './types.ts'
import { addDays, addMonths, dayOf, fmtPct, fmtSolesCorto, monthOf, round2 } from './util.ts'

export interface Componente {
  id: keyof typeof CREDITO.pesos
  nombre: string
  peso: number
  /** 0..100 */
  puntaje: number
  detalle: string
}

export interface Factor {
  tipo: 'positivo' | 'negativo' | 'neutro'
  texto: string
}

export interface PerfilCrediticio {
  /** Ventas promedio de los últimos 12 meses completos, con IGV (SIRE o boletas) */
  ventasMes: number
  /** Promedio de los últimos 3 meses completos, con IGV */
  ventasRecientes: number
  /** ventasRecientes / ventasMes − 1 */
  tendencia: number
  /** Coeficiente de variación de las ventas mensuales (12 meses) */
  variacion: number
  /** 1 − compras de insumos / ventas cobradas (banco, 3 meses) */
  margenBruto: number
  gastosFijos: number
  impuestos: number
  deudaActual: number
  gastoFamiliar: number
  /** Lo que le sobra al negocio cada mes */
  excedente: number
  cuotaMaxima: number
  diasCaja: number
  carteraVencida: number
  /** Parte de los cobros de ventas que tiene comprobante */
  conComprobante: number
  impuestosATiempo: { pagados: number; total: number }
  componentes: Componente[]
  score: number
  segmento: Segmento
  segmentoLabel: string
  montoSugerido: number
  plazoSugerido: number
  tea: number
  factores: Factor[]
  /** Meses que se usaron para el promedio de ventas */
  meses: string[]
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

/** Porcentaje que no redondea a 100% lo que no es 100% (99.7%). */
function pct(n: number): string {
  return n >= 0.995 && n < 1 ? `${(Math.floor(n * 1000) / 10).toFixed(1)}%` : fmtPct(n)
}

/** Tasa mensual equivalente a una tasa efectiva anual. */
export function tasaMensual(tea: number): number {
  return (1 + tea) ** (1 / 12) - 1
}

/** Cuota fija mensual (sistema francés). */
export function cuotaMensual(monto: number, tea: number, meses: number): number {
  const r = tasaMensual(tea)
  if (r === 0) return round2(monto / meses)
  return round2((monto * r) / (1 - (1 + r) ** -meses))
}

/** Monto que se puede pedir con una cuota dada. */
export function montoMaximo(cuota: number, tea: number, meses: number): number {
  const r = tasaMensual(tea)
  if (cuota <= 0) return 0
  return round2(r === 0 ? cuota * meses : (cuota * (1 - (1 + r) ** -meses)) / r)
}

function redondearAbajo(n: number): number {
  return Math.max(0, Math.floor(n / CREDITO.redondeo) * CREDITO.redondeo)
}

/** Monto ofrecido para un plazo: la capacidad de pago ajustada por el segmento. */
export function montoOfrecido(p: Pick<PerfilCrediticio, 'cuotaMaxima' | 'segmento'>, plazo: number, tea = CREDITO.teaReferencial): number {
  const monto = redondearAbajo(montoMaximo(p.cuotaMaxima, tea, plazo) * CREDITO.factorSegmento[p.segmento])
  return monto >= CREDITO.montoMinimo ? monto : 0
}

function segmentoDe(score: number): Segmento {
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

/**
 * `cuotaNueva`: cuota mensual de un crédito ya aceptado que todavía no aparece en el banco: se suma a la
 * deuda actual, para que pedir prestado nunca mejore el perfil.
 */
export function perfilCrediticio(a: Analysis, hoy: string, promesas: PromesaPago[] = [], cuotaNueva = 0): PerfilCrediticio {
  const b = a.business
  const conIgv = b.regimenTributario === 'NRUS' ? 1 : 1.18
  const mesActual = monthOf(hoy)
  const ultimos12 = Array.from({ length: 12 }, (_, i) => addMonths(mesActual, i - 12))
  const ultimos3 = ultimos12.slice(-3)
  const porMes = ventasPorMes(a)
  const serie = ultimos12.map((m) => (porMes.get(m)?.ventas ?? 0) * conIgv)
  const ventasMes = round2(serie.reduce((s, v) => s + v, 0) / serie.length)
  const ventasRecientes = round2(serie.slice(-3).reduce((s, v) => s + v, 0) / 3)
  const tendencia = ventasMes ? ventasRecientes / ventasMes - 1 : 0
  const media = ventasMes
  const variacion = media ? Math.sqrt(serie.reduce((s, v) => s + (v - media) ** 2, 0) / serie.length) / media : 0

  // Flujo del banco de los últimos 3 meses completos, por categoría
  const enMeses = a.movements.filter((m) => ultimos3.includes(monthOf(m.fecha)))
  const suma = (cats: string[]) =>
    enMeses.filter((m) => cats.includes(a.classifications.get(m.id)?.categoriaId ?? '')).reduce((s, m) => s + Math.abs(m.monto), 0) / 3
  const ventasBanco = suma(['ventas'])
  const insumos = suma(['insumos'])
  const margenBruto = ventasBanco ? clamp(1 - insumos / ventasBanco, 0, 1) : 0
  const gastosFijos = round2(suma(['planilla', 'alquiler', 'servicios', 'asesoria', 'comisiones', 'transporte', 'publicidad', 'mantenimiento']))
  const impuestos = round2(suma(['impuestos']))
  const deudaActual = round2(enMeses.filter((m) => m.monto < 0 && a.classifications.get(m.id)?.categoriaId === 'prestamos').reduce((s, m) => s - m.monto, 0) / 3 + cuotaNueva)
  const gastoFamiliar = round2(b.sueldoDueno ?? suma(['retiro_dueno']))
  const excedente = round2(ventasMes * margenBruto - gastosFijos - impuestos - deudaActual - gastoFamiliar)
  const cuotaMaxima = round2(Math.max(0, excedente) * CREDITO.ratioCuota)

  // Liquidez: días de gastos que cubre el saldo de hoy, sin contar préstamos recibidos en los últimos 90 días
  const desde = addDays(hoy, -90)
  const prestado = a.movements
    .filter((m) => m.monto > 0 && dayOf(m.fecha) >= desde && a.classifications.get(m.id)?.categoriaId === 'prestamos')
    .reduce((s, m) => s + m.monto, 0)
  const egresosDia = enMeses.filter((m) => m.monto < 0).reduce((s, m) => s - m.monto, 0) / 90
  const diasCaja = egresosDia ? Math.max(0, Math.round((a.saldoActual - prestado) / egresosDia)) : 90

  // Cobranza: facturas vencidas frente a un mes de ventas
  const vencidas = porCobrar(a, promesas, hoy).filter((c) => c.diasVencidos > 0)
  const carteraVencida = round2(vencidas.reduce((s, c) => s + c.monto, 0))

  // Formalidad: cuánto de lo cobrado por ventas tiene boleta o factura
  const cobros = enMeses.filter((m) => m.monto > 0 && a.classifications.get(m.id)?.categoriaId === 'ventas')
  const totalCobros = cobros.reduce((s, m) => s + m.monto, 0)
  const sinComprobante = a.movements
    .filter((m) => monthOf(m.fecha) >= ultimos3[0] && a.classifications.get(m.id)?.estado === 'COBRADO_SIN_COMPROBANTE')
    .reduce((s, m) => s + m.monto, 0)
  const conComprobante = totalCobros ? clamp(1 - sinComprobante / (totalCobros + sinComprobante), 0, 1) : 1

  // Cumplimiento: impuestos de los 3 últimos periodos pagados hasta su vencimiento
  const periodos = [addMonths(mesActual, -3), addMonths(mesActual, -2), addMonths(mesActual, -1)].filter((p) => addMonths(p, 1) <= mesActual)
  let pagados = 0
  for (const p of periodos) {
    const vence = vencimientoSunat(p, b.ruc)
    if (vence >= hoy) continue
    const pago = a.movements.find((m) => m.monto < 0 && a.classifications.get(m.id)?.categoriaId === 'impuestos' && monthOf(m.fecha) === addMonths(p, 1) && dayOf(m.fecha) <= vence)
    if (pago) pagados++
  }
  const totalPeriodos = periodos.filter((p) => vencimientoSunat(p, b.ruc) < hoy).length

  /* Puntaje por componente (0–100) */
  const ratioExcedente = ventasMes ? excedente / ventasMes : 0
  const pesos = CREDITO.pesos
  const componentes: Componente[] = [
    {
      id: 'capacidad',
      nombre: 'Capacidad de pago',
      peso: pesos.capacidad,
      puntaje: Math.round(clamp(20 + 600 * ratioExcedente)),
      detalle: `Le sobran ${fmtSolesCorto(Math.round(excedente))} al mes (${fmtPct(Math.max(0, ratioExcedente))} de sus ventas)`,
    },
    {
      id: 'ventas',
      nombre: 'Estabilidad de ventas',
      peso: pesos.ventas,
      puntaje: Math.round(clamp(100 - variacion * 150 - Math.max(0, -tendencia) * 150)),
      detalle:
        tendencia < -0.05
          ? `Los últimos 3 meses vendió ${fmtPct(-tendencia)} menos que su promedio`
          : tendencia > 0.05
            ? `Los últimos 3 meses vendió ${fmtPct(tendencia)} más que su promedio`
            : 'Ventas parejas en los últimos 12 meses',
    },
    {
      id: 'formalidad',
      nombre: 'Ventas con comprobante',
      peso: pesos.formalidad,
      puntaje: Math.round(clamp(conComprobante * 100 - (1 - conComprobante) * 200)),
      detalle: `${pct(conComprobante)} de lo que cobra tiene boleta o factura`,
    },
    {
      id: 'liquidez',
      nombre: 'Liquidez',
      peso: pesos.liquidez,
      puntaje: Math.round(clamp((diasCaja / 30) * 100)),
      detalle: `Su saldo cubre ${diasCaja} días de gastos`,
    },
    {
      id: 'cobranza',
      nombre: 'Cobranza',
      peso: pesos.cobranza,
      puntaje: Math.round(clamp(100 - (ventasMes ? carteraVencida / ventasMes : 0) * 300)),
      detalle: carteraVencida > 0 ? `${fmtSolesCorto(carteraVencida)} en facturas vencidas` : 'Sin facturas vencidas',
    },
    {
      id: 'tributario',
      nombre: 'Cumplimiento tributario',
      peso: pesos.tributario,
      puntaje: totalPeriodos ? Math.round((pagados / totalPeriodos) * 100) : 100,
      detalle: `Pagó a tiempo ${pagados} de sus últimas ${totalPeriodos} declaraciones`,
    },
  ]
  const score = Math.round(componentes.reduce((s, c) => s + c.puntaje * c.peso, 0))
  const segmento = segmentoDe(score)

  /* Factores en palabras, con el número real */
  const factores: Factor[] = []
  factores.push({ tipo: 'neutro', texto: `Vende ${fmtSolesCorto(Math.round(ventasMes))} al mes en promedio (12 meses, con IGV).` })
  if (tendencia < -0.1) factores.push({ tipo: 'negativo', texto: `Sus ventas de los últimos 3 meses están ${fmtPct(-tendencia)} por debajo de su promedio.` })
  else if (tendencia > 0.1) factores.push({ tipo: 'positivo', texto: `Sus ventas de los últimos 3 meses están ${fmtPct(tendencia)} por encima de su promedio.` })
  factores.push(
    conComprobante >= 0.97
      ? { tipo: 'positivo', texto: `${pct(conComprobante)} de lo que cobra tiene boleta o factura.` }
      : { tipo: 'negativo', texto: `Solo ${pct(conComprobante)} de lo que cobra tiene boleta o factura.` },
  )
  factores.push(
    excedente > 0
      ? { tipo: 'positivo', texto: `Después de compras, gastos, impuestos, deudas y retiros le quedan ${fmtSolesCorto(Math.round(excedente))} al mes.` }
      : { tipo: 'negativo', texto: 'Hoy sus gastos, deudas y retiros se llevan todo lo que gana.' },
  )
  factores.push(
    diasCaja >= 30
      ? { tipo: 'positivo', texto: `Su saldo cubre ${diasCaja} días de gastos.` }
      : { tipo: 'negativo', texto: `Su saldo solo cubre ${diasCaja} días de gastos.` },
  )
  if (carteraVencida > 0) factores.push({ tipo: 'negativo', texto: `Tiene ${fmtSolesCorto(carteraVencida)} en facturas vencidas por cobrar.` })
  if (totalPeriodos)
    factores.push(
      pagados === totalPeriodos
        ? { tipo: 'positivo', texto: `Pagó sus impuestos a tiempo las últimas ${totalPeriodos} veces.` }
        : { tipo: 'negativo', texto: `Pagó tarde ${totalPeriodos - pagados} de sus últimas ${totalPeriodos} declaraciones.` },
    )
  if (deudaActual > 0) factores.push({ tipo: 'neutro', texto: `Ya paga ${fmtSolesCorto(Math.round(deudaActual))} al mes de otro préstamo.` })

  const perfil = {
    ventasMes,
    ventasRecientes,
    tendencia,
    variacion,
    margenBruto,
    gastosFijos,
    impuestos,
    deudaActual,
    gastoFamiliar,
    excedente,
    cuotaMaxima,
    diasCaja,
    carteraVencida,
    conComprobante,
    impuestosATiempo: { pagados, total: totalPeriodos },
    componentes,
    score,
    segmento,
    segmentoLabel: SEGMENTO_LABEL[segmento],
    plazoSugerido: CREDITO.plazoSugerido,
    tea: CREDITO.teaReferencial,
    factores,
    meses: ultimos12,
    montoSugerido: 0,
  }
  perfil.montoSugerido = montoOfrecido(perfil, CREDITO.plazoSugerido)
  return perfil
}

/** Desembolso y cuotas de un crédito como eventos de caja (para ver su efecto en la proyección). */
export function eventosCredito(monto: number, plazo: number, tea: number, desembolso: string): CashEvent[] {
  const cuota = cuotaMensual(monto, tea, plazo)
  const eventos: CashEvent[] = [{ fecha: desembolso, concepto: 'Desembolso del crédito BCP', monto, certeza: 'ALTA', fuente: 'CREDITO' }]
  for (let k = 1; k <= plazo; k++) {
    const mes = addMonths(monthOf(desembolso), k)
    const dia = Math.min(Number(desembolso.slice(8, 10)), 28)
    eventos.push({ fecha: `${mes}-${String(dia).padStart(2, '0')}`, concepto: `Cuota ${k} de ${plazo} del crédito BCP`, monto: -cuota, certeza: 'ALTA', fuente: 'CREDITO' })
  }
  return eventos
}

/** Intereses totales de un crédito. */
export function interesesTotales(monto: number, tea: number, plazo: number): number {
  return round2(cuotaMensual(monto, tea, plazo) * plazo - monto)
}

/** Fecha hasta la que vale un consentimiento dado hoy. */
export function venceConsentimiento(hoy: string): string {
  return addDays(hoy, CREDITO.vigenciaConsentimientoDias)
}

/**
 * Señales tempranas para el banco (adelanto de F4): lo que conviene mirar antes de que haya mora.
 * `alertaCaja`: fecha en que la caja proyectada baja del colchón, si la hay.
 */
export function senalesTempranas(p: PerfilCrediticio, alertaCaja: string | null): string[] {
  const out: string[] = []
  if (p.tendencia < -0.1) out.push(`Ventas −${Math.round(-p.tendencia * 100)}%`)
  if (p.diasCaja < 15) out.push(`Caja para ${p.diasCaja} días`)
  if (alertaCaja) out.push(`Caja bajo el colchón el ${alertaCaja.slice(8, 10)}/${alertaCaja.slice(5, 7)}`)
  if (p.carteraVencida > 0) out.push('Facturas vencidas')
  if (p.conComprobante < 0.97) out.push('Cobros sin comprobante')
  return out
}

/** Cuota mensual de una solicitud ya aceptada (0 si no hay). */
export function cuotaAceptada(sol: { estado: string; monto: number; plazo: number; tea: number } | undefined): number {
  return sol?.estado === 'ACEPTADA' ? cuotaMensual(sol.monto, sol.tea, sol.plazo) : 0
}
