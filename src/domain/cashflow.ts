/**
 * F-06 · Proyección de caja 30/60/90 días, con los picos peruanos (gratificación, CTS, impuestos).
 * Escenario base: certeza ALTA y MEDIA (las cobranzas vencidas, BAJA, no cuentan salvo promesa).
 * Escenario pesimista: ventas promedio − 1 desviación estándar y sin promesas.
 */
import { TAX_2026 } from '../config/taxParams2026.ts'
import { ctsSemestral, gratificacion, planillaMensual, vencimientoSunat } from './calendar.ts'
import { partyKey } from './categorization.ts'
import { comprobantesEn, totalNeto, type Analysis } from './engine.ts'
import { vencimientoDe } from './reconciliation.ts'
import type { BankMovement, CashEvent, Comprobante, DemoBusiness, PromesaPago } from './types.ts'
import { addDays, addMonths, dayOf, diffDays, fmtDiaMes, lastDayOfMonth, monthOf, round2, weekday } from './util.ts'

export interface CashPoint {
  fecha: string
  base: number
  pesimista: number
}

export interface CashAlert {
  fecha: string
  saldo: number
  cruza: 'CERO' | 'COLCHON'
  /** «la gratificación y el IGV» */
  motivos: string[]
}

export interface CashAction {
  id: 'cobrar' | 'mover' | 'capital'
  texto: string
  to?: string
  disabled?: boolean
}

export interface CashflowResult {
  saldoInicial: number
  colchon: number
  /** Eventos con fecha, ordenados (las ventas estimadas, agrupadas por semana) */
  eventos: CashEvent[]
  serie: CashPoint[]
  minimo: CashPoint
  alerta: CashAlert | null
  acciones: CashAction[]
}

const SEMANAS_HISTORIA = 8

function media(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

function desviacion(xs: number[]): number {
  const m = media(xs)
  return Math.sqrt(media(xs.map((x) => (x - m) ** 2)))
}

export interface EstimacionVentas {
  /** Promedio de abonos de ventas por día de la semana (0 = domingo) */
  porDia: number[]
  /** Promedio semanal y su desviación estándar (8 semanas) */
  semanal: number
  desviacionSemanal: number
  /** Ventas pesimistas = promedio − 1 desviación (como fracción del promedio) */
  factorPesimista: number
}

/** Abonos de ventas de las últimas 8 semanas por día de la semana, sin contar cobros de facturas a crédito. */
export function estimarVentas(a: Analysis, hoy: string): EstimacionVentas {
  const desde = addDays(hoy, -SEMANAS_HISTORIA * 7)
  const porFecha = new Map<string, number>()
  for (const m of a.movements) {
    const dia = dayOf(m.fecha)
    if (m.monto <= 0 || dia < desde || dia >= hoy) continue
    if (a.classifications.get(m.id)?.categoriaId !== 'ventas') continue
    const match = a.matchByMovement.get(m.id)
    const credito = match?.comprobanteIds.some((id) => a.comprobantesById.get(id)?.formaPago === 'CREDITO')
    if (credito) continue
    porFecha.set(dia, (porFecha.get(dia) ?? 0) + m.monto)
  }
  const porDia = Array.from({ length: 7 }, (_, w) => {
    const valores: number[] = []
    for (let i = 0; i < SEMANAS_HISTORIA * 7; i++) {
      const dia = addDays(desde, i)
      if (weekday(dia) === w) valores.push(porFecha.get(dia) ?? 0)
    }
    return round2(media(valores))
  })
  const semanas = Array.from({ length: SEMANAS_HISTORIA }, (_, k) => {
    let total = 0
    for (let i = 0; i < 7; i++) total += porFecha.get(addDays(desde, k * 7 + i)) ?? 0
    return total
  })
  const semanal = media(semanas)
  const desviacionSemanal = desviacion(semanas)
  return {
    porDia,
    semanal: round2(semanal),
    desviacionSemanal: round2(desviacionSemanal),
    factorPesimista: semanal ? Math.max(0, (semanal - desviacionSemanal) / semanal) : 0,
  }
}

/** Pagos recurrentes: misma contraparte, monto ±10%, en ≥ 2 de los últimos 3 meses, mismo día ±3. */
export function recurrentes(a: Analysis, hoy: string): Array<{ concepto: string; monto: number; dia: number; ultimo: BankMovement }> {
  const mesActual = monthOf(hoy)
  const meses = [addMonths(mesActual, -3), addMonths(mesActual, -2), addMonths(mesActual, -1)]
  const grupos = new Map<string, BankMovement[]>()
  for (const m of a.movements) {
    if (m.monto >= 0) continue
    const cat = a.classifications.get(m.id)?.categoriaId
    if (cat === 'planilla' || cat === 'impuestos') continue
    const k = `${partyKey(m)}|${cat}`
    grupos.set(k, [...(grupos.get(k) ?? []), m])
  }
  const out: Array<{ concepto: string; monto: number; dia: number; ultimo: BankMovement }> = []
  for (const lista of grupos.values()) {
    const enMeses = lista.filter((m) => meses.includes(monthOf(m.fecha)))
    if (enMeses.length < 2) continue
    const montos = enMeses.map((m) => Math.abs(m.monto)).sort((x, y) => x - y)
    const mediana = montos[Math.floor(montos.length / 2)]
    const dias = enMeses.map((m) => Number(m.fecha.slice(8, 10))).sort((x, y) => x - y)
    const diaTipico = dias[Math.floor(dias.length / 2)]
    const parecidos = enMeses.filter(
      (m) => Math.abs(Math.abs(m.monto) - mediana) <= mediana * 0.1 && Math.abs(Number(m.fecha.slice(8, 10)) - diaTipico) <= 3,
    )
    const mesesConPago = new Set(parecidos.map((m) => monthOf(m.fecha)))
    if (mesesConPago.size < 2) continue
    const ultimo = [...lista].sort((x, y) => y.fecha.localeCompare(x.fecha))[0]
    out.push({ concepto: ultimo.contraparteNombre ?? ultimo.glosa, monto: round2(mediana), dia: diaTipico, ultimo })
  }
  return out
}

/** IGV del periodo (ventas − compras, mínimo 0) a partir de los comprobantes. */
function igvDelPeriodo(comps: Comprobante[], mes: string): { igv: number; ventas: number } {
  let igvVentas = 0
  let igvCompras = 0
  let ventas = 0
  for (const c of comps) {
    if (monthOf(c.fechaEmision) !== mes || c.tipo === 'RETENCION') continue
    const tc = c.moneda === 'USD' ? 3.78 : 1
    const signo = c.tipo === 'NOTA_CREDITO' ? -1 : 1
    if (c.direccion === 'VENTA') {
      igvVentas += signo * c.igv * tc
      ventas += signo * c.base * tc
    } else igvCompras += c.igv
  }
  return { igv: Math.max(0, igvVentas - igvCompras), ventas }
}

/** Impuestos de un periodo según el régimen: IGV + pago a cuenta de renta + EsSalud. */
export function impuestosEstimados(b: DemoBusiness, comps: Comprobante[], periodo: string, mesActual: string): { igv: number; renta: number; essalud: number } {
  const essalud = round2(planillaMensual(b) * TAX_2026.essalud)
  if (b.regimenTributario === 'NRUS') {
    const ventas = comps.filter((c) => monthOf(c.fechaEmision) === periodo && c.direccion === 'VENTA').reduce((s, c) => s + c.total, 0)
    return { igv: 0, renta: ventas > TAX_2026.nrus.categorias[0].topeMensual ? 50 : 20, essalud: b.trabajadores ? essalud : 0 }
  }
  const tasa = b.regimenTributario === 'RMT' ? TAX_2026.rmt.pagoACuenta : b.regimenTributario === 'RER' ? TAX_2026.rer.tasa : TAX_2026.general.pagoACuenta
  // Un periodo completo usa sus comprobantes; uno en curso o futuro, el promedio de los 3 últimos completos
  const periodos = periodo < mesActual ? [periodo] : [addMonths(mesActual, -1), addMonths(mesActual, -2), addMonths(mesActual, -3)]
  const calc = periodos.map((p) => igvDelPeriodo(comps, p))
  return {
    igv: round2(media(calc.map((c) => c.igv))),
    renta: round2(media(calc.map((c) => c.ventas)) * tasa),
    essalud: b.trabajadores ? essalud : 0,
  }
}

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function proyectarCaja(a: Analysis, promesas: PromesaPago[], hoy: string, dias: number): CashflowResult {
  const b = a.business
  const fin = addDays(hoy, dias)
  const mesActual = monthOf(hoy)
  const eventos: CashEvent[] = []
  const enRango = (f: string) => f > hoy && f <= fin

  /* Entradas: por cobrar y promesas */
  for (const c of comprobantesEn(a, 'COMPROBANTE_SIN_COBRO')) {
    const monto = totalNeto(a, c)
    const promesa = [...promesas].reverse().find((p) => p.comprobanteId === c.id)
    const vence = vencimientoDe(c)
    const quien = c.nombreContraparte
    if (promesa && enRango(promesa.fecha)) {
      eventos.push({ fecha: promesa.fecha, concepto: `Promesa de pago · ${quien}`, monto: promesa.monto, certeza: 'MEDIA', fuente: 'PROMESA' })
    } else if (vence > hoy) {
      if (enRango(vence)) eventos.push({ fecha: vence, concepto: `Cobro de ${c.serie}-${c.numero} · ${quien}`, monto, certeza: 'ALTA', fuente: 'POR_COBRAR' })
    } else {
      const f = addDays(hoy, 15)
      if (enRango(f)) eventos.push({ fecha: f, concepto: `Cobro vencido de ${c.serie}-${c.numero} · ${quien}`, monto, certeza: 'BAJA', fuente: 'POR_COBRAR' })
    }
  }

  /* Salidas: por pagar */
  for (const c of comprobantesEn(a, 'FACTURA_SIN_PAGO')) {
    const vence = vencimientoDe(c)
    const f = vence > hoy ? vence : addDays(hoy, 1)
    if (enRango(f)) eventos.push({ fecha: f, concepto: `Pago a ${c.nombreContraparte}`, monto: -totalNeto(a, c), certeza: 'ALTA', fuente: 'POR_PAGAR' })
  }

  /* Recurrentes detectados (alquiler, servicios, proveedores, cuota del préstamo…) */
  for (const r of recurrentes(a, hoy)) {
    for (let k = 0; k <= Math.ceil(dias / 28) + 1; k++) {
      const mes = addMonths(mesActual, k)
      const ultimoDia = Number(lastDayOfMonth(mes).slice(8, 10))
      const f = `${mes}-${String(Math.min(r.dia, ultimoDia)).padStart(2, '0')}`
      // Si ya se pagó este mes, no se vuelve a contar
      if (k === 0 && monthOf(r.ultimo.fecha) === mesActual) continue
      if (enRango(f)) eventos.push({ fecha: f, concepto: r.concepto, monto: -r.monto, certeza: 'ALTA', fuente: 'RECURRENTE' })
    }
  }

  /* Planilla a fin de mes, gratificación (jul/dic) y CTS (may/nov) */
  for (let k = 0; k <= Math.ceil(dias / 28) + 1; k++) {
    const mes = addMonths(mesActual, k)
    const mesNum = Number(mes.slice(5, 7))
    if (b.trabajadores > 0) {
      const f = lastDayOfMonth(mes)
      if (enRango(f)) eventos.push({ fecha: f, concepto: `Planilla de ${MESES_LARGOS[mesNum - 1]} (${b.trabajadores} trabajadores)`, monto: -planillaMensual(b), certeza: 'ALTA', fuente: 'PLANILLA' })
    }
    const diaG = `${mes}-${String(TAX_2026.gratificacion.diaPago).padStart(2, '0')}`
    const grati = gratificacion(b.regimenLaboral, b.trabajadores, b.sueldoPromedio)
    if ((TAX_2026.gratificacion.meses as readonly number[]).includes(mesNum) && grati > 0 && enRango(diaG)) {
      eventos.push({ fecha: diaG, concepto: `Gratificación de ${MESES_LARGOS[mesNum - 1]}`, monto: -grati, certeza: 'ALTA', fuente: 'GRATIFICACION' })
    }
    const cts = ctsSemestral(b.regimenLaboral, b.trabajadores, b.sueldoPromedio)
    if ((TAX_2026.cts.meses as readonly number[]).includes(mesNum) && cts > 0 && enRango(diaG)) {
      eventos.push({ fecha: diaG, concepto: `Depósito de CTS de ${MESES_LARGOS[mesNum - 1]}`, monto: -cts, certeza: 'ALTA', fuente: 'CTS' })
    }
    // Impuestos del mes anterior, en la fecha que toca según el último dígito del RUC
    const periodo = addMonths(mes, -1)
    const vence = vencimientoSunat(periodo, b.ruc)
    if (enRango(vence)) {
      const imp = impuestosEstimados(b, a.data.comprobantes, periodo, mesActual)
      const total = round2(imp.igv + imp.renta + imp.essalud)
      if (total > 0) {
        const partes = [imp.igv > 0 ? 'IGV' : null, 'renta', imp.essalud > 0 ? 'EsSalud' : null].filter(Boolean).join(', ')
        eventos.push({ fecha: vence, concepto: `Impuestos de ${MESES_LARGOS[Number(periodo.slice(5, 7)) - 1]} (${partes})`, monto: -total, certeza: 'ALTA', fuente: 'IMPUESTOS' })
      }
    }
  }

  /* Ventas estimadas por día de la semana */
  const ventas = estimarVentas(a, hoy)
  const ventasDia = (f: string) => {
    const media = ventas.porDia[weekday(f)]
    return { media, pesimista: media * ventas.factorPesimista }
  }

  /* Serie diaria */
  const saldoInicial = a.saldoActual
  let base = saldoInicial
  let pes = saldoInicial
  const serie: CashPoint[] = [{ fecha: hoy, base: round2(base), pesimista: round2(pes) }]
  const porFecha = new Map<string, CashEvent[]>()
  for (const e of eventos) porFecha.set(e.fecha, [...(porFecha.get(e.fecha) ?? []), e])
  for (let i = 1; i <= dias; i++) {
    const f = addDays(hoy, i)
    const v = ventasDia(f)
    base += v.media
    pes += v.pesimista
    for (const e of porFecha.get(f) ?? []) {
      if (e.monto < 0 || e.certeza === 'ALTA') {
        base += e.monto
        pes += e.monto
      } else if (e.certeza === 'MEDIA') base += e.monto
    }
    serie.push({ fecha: f, base: round2(base), pesimista: round2(pes) })
  }

  /* Ventas estimadas agrupadas por semana, para la tabla */
  for (let i = 1; i <= dias; i += 7) {
    let total = 0
    let totalPes = 0
    for (let j = i; j < i + 7 && j <= dias; j++) {
      const v = ventasDia(addDays(hoy, j))
      total += v.media
      totalPes += v.pesimista
    }
    eventos.push({ fecha: addDays(hoy, i), concepto: `Ventas estimadas (semana del ${fmtDiaMes(addDays(hoy, i))})`, monto: round2(total), certeza: 'MEDIA', fuente: 'VENTAS_ESTIMADAS', montoPesimista: round2(totalPes) })
  }
  eventos.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.monto - y.monto)

  /* Colchón: una semana de egresos promedio (o el que definió el dueño) */
  const desde = addDays(hoy, -SEMANAS_HISTORIA * 7)
  const egresos = a.movements.filter((m) => m.monto < 0 && dayOf(m.fecha) >= desde && dayOf(m.fecha) < hoy).reduce((s, m) => s - m.monto, 0)
  const colchon = round2(b.colchonCaja ?? egresos / SEMANAS_HISTORIA)

  /* Alerta: la primera vez que el escenario base cruza el colchón (o cero), con su punto más bajo de esa semana */
  const minimo = serie.reduce((min, p) => (p.base < min.base ? p : min), serie[0])
  let alerta: CashAlert | null = null
  const primero = serie.findIndex((p) => p.base < colchon || p.base < 0)
  if (primero >= 0) {
    const bajo = serie.slice(primero, primero + 8).reduce((min, p) => (p.base < min.base ? p : min))
    // Los picos peruanos (gratificación, impuestos, CTS, planilla) se nombran primero
    const pico = (e: CashEvent) => (['GRATIFICACION', 'IMPUESTOS', 'CTS', 'PLANILLA'].includes(e.fuente) ? 0 : 1)
    const cercanos = eventos
      .filter((e) => e.monto < 0 && e.fuente !== 'VENTAS_ESTIMADAS' && diffDays(e.fecha, bajo.fecha) >= 0 && diffDays(e.fecha, bajo.fecha) <= 7)
      .sort((x, y) => pico(x) - pico(y) || x.monto - y.monto)
      .slice(0, 2)
    const nombre = (e: CashEvent) =>
      e.fuente === 'GRATIFICACION' ? 'la gratificación' : e.fuente === 'IMPUESTOS' ? (e.concepto.includes('IGV') ? 'el IGV' : 'los impuestos') : e.fuente === 'PLANILLA' ? 'la planilla' : e.fuente === 'CTS' ? 'la CTS' : `el pago a ${e.concepto.replace(/^Pago a /, '')}`
    alerta = { fecha: bajo.fecha, saldo: bajo.base, cruza: bajo.base < 0 ? 'CERO' : 'COLCHON', motivos: cercanos.map(nombre) }
  }

  /* Acciones sugeridas */
  const acciones: CashAction[] = []
  const vencidas = comprobantesEn(a, 'COMPROBANTE_SIN_COBRO').filter((c) => vencimientoDe(c) < hoy && !promesas.some((p) => p.comprobanteId === c.id))
  if (vencidas.length) {
    const total = round2(vencidas.reduce((s, c) => s + totalNeto(a, c), 0))
    acciones.push({ id: 'cobrar', texto: `Cobra ${vencidas.length === 1 ? 'tu factura vencida' : `tus ${vencidas.length} facturas vencidas`} (S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`, to: '/cobrar' })
  }
  if (alerta) {
    const mover = eventos
      .filter((e) => (e.fuente === 'POR_PAGAR' || (e.fuente === 'RECURRENTE' && /S\.A\.C|S\.A\.|E\.I\.R\.L/.test(e.concepto))) && e.fecha <= alerta.fecha && diffDays(e.fecha, alerta.fecha) <= 15)
      .sort((x, y) => x.monto - y.monto)[0]
    if (mover) {
      acciones.push({ id: 'mover', texto: `Mueve el pago a ${mover.concepto.replace(/^Pago a /, '')} para después del ${fmtDiaMes(addDays(alerta.fecha, 1))}` })
    }
  }
  acciones.push({ id: 'capital', texto: 'Ver opciones de capital de trabajo BCP', disabled: true })

  return { saldoInicial, colchon, eventos, serie, minimo, alerta, acciones }
}
