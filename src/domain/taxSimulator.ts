/**
 * F-07 · Simulador de régimen tributario. Estimación referencial con los parámetros 2026
 * (config/taxParams2026): nada de esto está escrito en la UI.
 */
import { TAX_2026 } from '../config/taxParams2026.ts'
import type { Analysis } from './engine.ts'
import type { RegimenTributario } from './types.ts'
import { addMonths, monthOf, round2 } from './util.ts'

export interface SimulacionInput {
  /** Ingresos netos anuales (sin IGV) */
  ingresosAnuales: number
  /** Compras anuales con comprobante (sin IGV) */
  comprasAnuales: number
  /** Gastos deducibles estimados (incluye compras) */
  gastosDeducibles: number
  /** El mes de mayores ingresos (para los topes mensuales del NRUS) */
  ingresoMensualMax?: number
  /** ¿Sus clientes le piden factura? */
  necesitaFactura: boolean
}

export interface ResultadoRegimen {
  regimen: RegimenTributario
  nombre: string
  disponible: boolean
  motivoNoDisponible?: string
  renta: number
  igv: number
  total: number
  implica: string[]
}

export const REGIMEN_NOMBRE: Record<RegimenTributario, string> = {
  NRUS: 'Nuevo RUS',
  RER: 'Régimen Especial (RER)',
  RMT: 'Régimen MYPE Tributario',
  GENERAL: 'Régimen General',
}

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`

/** Renta anual del RMT: 10% hasta 15 UIT de renta neta y 29.5% el exceso. */
export function rentaRmt(rentaNeta: number): number {
  const p = TAX_2026.rmt
  const tramo = p.tramoUit * TAX_2026.uit
  const neta = Math.max(0, rentaNeta)
  return round2(Math.min(neta, tramo) * p.tasaTramo1 + Math.max(0, neta - tramo) * p.tasaTramo2)
}

export function cuotaNrus(ingresoMensual: number): number | null {
  const cat = TAX_2026.nrus.categorias.find((c) => ingresoMensual <= c.topeMensual)
  return cat ? cat.cuota : null
}

export function simularRegimenes(input: SimulacionInput): ResultadoRegimen[] {
  const { ingresosAnuales: ing, comprasAnuales: compras, gastosDeducibles: gastos, necesitaFactura } = input
  const mensual = input.ingresoMensualMax ?? ing / 12
  const rentaNeta = Math.max(0, ing - gastos)
  const igvNeto = round2(Math.max(0, (ing - compras) * TAX_2026.igv))
  const out: ResultadoRegimen[] = []

  // NRUS
  const nrusTope = TAX_2026.nrus.topeAnual
  const cuota = cuotaNrus(mensual)
  let motivo: string | undefined
  if (necesitaFactura) motivo = 'Solo puede emitir boletas y tus clientes te piden factura'
  else if (ing > nrusTope) motivo = `Tus ingresos pasan el tope de ${fmt(nrusTope)} al año`
  else if (compras > nrusTope) motivo = `Tus compras pasan el tope de ${fmt(nrusTope)} al año`
  else if (cuota === null) motivo = `Algún mes pasas el tope de ${fmt(TAX_2026.nrus.categorias.at(-1)!.topeMensual)}`
  const nrusRenta = cuota ? cuota * 12 : 0
  out.push({
    regimen: 'NRUS',
    nombre: REGIMEN_NOMBRE.NRUS,
    disponible: !motivo,
    motivoNoDisponible: motivo,
    renta: nrusRenta,
    igv: 0,
    total: nrusRenta,
    implica: ['Cuota fija mensual que incluye el IGV', 'Solo boletas, no facturas', 'No lleva libros contables'],
  })

  // RER
  const rerTope = TAX_2026.rer.topeAnual
  const rerMotivo = ing > rerTope ? `Tus ingresos pasan el tope de ${fmt(rerTope)}` : compras > rerTope ? `Tus compras pasan el tope de ${fmt(rerTope)}` : undefined
  const rerRenta = round2(ing * TAX_2026.rer.tasa)
  out.push({
    regimen: 'RER',
    nombre: REGIMEN_NOMBRE.RER,
    disponible: !rerMotivo,
    motivoNoDisponible: rerMotivo,
    renta: rerRenta,
    igv: igvNeto,
    total: round2(rerRenta + igvNeto),
    implica: ['1.5% de tus ingresos netos cada mes', 'Puede emitir facturas', 'Registro de compras y ventas', 'No descuenta gastos'],
  })

  // RMT
  const rmtTope = TAX_2026.rmt.topeUit * TAX_2026.uit
  const rmtMotivo = ing > rmtTope ? `Tus ingresos pasan el tope de ${TAX_2026.rmt.topeUit} UIT` : undefined
  const rmtRenta = rentaRmt(rentaNeta)
  out.push({
    regimen: 'RMT',
    nombre: REGIMEN_NOMBRE.RMT,
    disponible: !rmtMotivo,
    motivoNoDisponible: rmtMotivo,
    renta: rmtRenta,
    igv: igvNeto,
    total: round2(rmtRenta + igvNeto),
    implica: ['10% de tu utilidad hasta 15 UIT y 29.5% el exceso', 'Puede emitir facturas', 'Descuenta gastos con comprobante', 'Libros según tus ingresos'],
  })

  // General
  const genRenta = round2(rentaNeta * TAX_2026.general.tasa)
  out.push({
    regimen: 'GENERAL',
    nombre: REGIMEN_NOMBRE.GENERAL,
    disponible: true,
    renta: genRenta,
    igv: igvNeto,
    total: round2(genRenta + igvNeto),
    implica: ['29.5% de tu utilidad', 'Puede emitir facturas', 'Descuenta gastos con comprobante', 'Contabilidad completa'],
  })

  return out
}

/** El régimen disponible más barato (por total de renta + IGV). */
export function masBarato(resultados: ResultadoRegimen[]): ResultadoRegimen {
  return resultados.filter((r) => r.disponible).sort((a, b) => a.total - b.total)[0]
}

/** Tope de ingresos del régimen (null si no tiene). */
export function topeRegimen(regimen: RegimenTributario): number | null {
  if (regimen === 'NRUS') return TAX_2026.nrus.topeAnual
  if (regimen === 'RER') return TAX_2026.rer.topeAnual
  if (regimen === 'RMT') return TAX_2026.rmt.topeUit * TAX_2026.uit
  return null
}

/** Aviso si el negocio está al 80% o más del tope de su régimen. */
export function avisoLimite(regimen: RegimenTributario, ingresosAnuales: number): { pct: number; tope: number } | null {
  const tope = topeRegimen(regimen)
  if (!tope) return null
  const pct = ingresosAnuales / tope
  return pct >= 0.8 ? { pct, tope } : null
}

export interface DatosSimulador {
  ingresosAnuales: number
  comprasAnuales: number
  gastosDeducibles: number
  ingresoMensualMax: number
  /** Meses que se usaron (los últimos 12) */
  meses: string[]
}

/**
 * Datos precargados desde el SIRE (o las boletas, en el NRUS): ventas y compras de los últimos
 * 12 meses sin IGV. Los gastos deducibles suman las compras y los gastos del negocio que pagó el banco.
 */
export function datosSimulador(a: Analysis, hoy: string): DatosSimulador {
  const meses = Array.from({ length: 12 }, (_, i) => addMonths(monthOf(hoy), i - 11))
  const porMes = new Map<string, { ventas: number; compras: number }>()
  for (const h of a.data.historialMensual) porMes.set(h.mes, { ventas: h.ventas, compras: h.compras })
  const seedMeses = new Set(a.data.comprobantes.map((c) => monthOf(c.fechaEmision)))
  for (const mes of seedMeses) porMes.set(mes, { ventas: 0, compras: 0 })
  for (const c of a.data.comprobantes) {
    if (c.tipo === 'RETENCION') continue
    const row = porMes.get(monthOf(c.fechaEmision))!
    const base = (c.moneda === 'USD' ? 3.78 : 1) * c.base * (c.tipo === 'NOTA_CREDITO' ? -1 : 1)
    if (c.direccion === 'VENTA') row.ventas += base
    else row.compras += base
  }
  // NRUS sin SIRE: las boletas ya son todo lo que vende; las compras salen del banco
  if (a.business.dosVias) {
    for (const m of a.movements) {
      const row = porMes.get(monthOf(m.fecha))
      if (row && m.monto < 0 && a.classifications.get(m.id)?.categoriaId === 'insumos') row.compras += Math.abs(m.monto)
    }
  }
  const filas = meses.map((m) => porMes.get(m) ?? { ventas: 0, compras: 0 })
  const ingresos = filas.reduce((s, r) => s + r.ventas, 0)
  const compras = filas.reduce((s, r) => s + r.compras, 0)
  // Gastos del negocio pagados por banco (sin compras, impuestos, préstamos ni retiros), anualizados
  const deducibles = new Set(['alquiler', 'servicios', 'transporte', 'publicidad', 'mantenimiento', 'asesoria', 'planilla', 'comisiones'])
  const mesesBanco = [...new Set(a.movements.map((m) => monthOf(m.fecha)))].filter((m) => m < monthOf(hoy))
  const gastosBanco = a.movements
    .filter((m) => m.monto < 0 && mesesBanco.includes(monthOf(m.fecha)) && deducibles.has(a.classifications.get(m.id)?.categoriaId ?? ''))
    .reduce((s, m) => s + Math.abs(m.monto), 0)
  const gastosAnuales = mesesBanco.length ? (gastosBanco / mesesBanco.length) * 12 : 0
  return {
    ingresosAnuales: Math.round(ingresos),
    comprasAnuales: Math.round(compras),
    gastosDeducibles: Math.round(compras + gastosAnuales),
    ingresoMensualMax: Math.round(Math.max(...filas.map((r) => r.ventas))),
    meses,
  }
}
