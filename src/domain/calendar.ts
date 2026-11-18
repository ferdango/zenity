/** Obligaciones peruanas: vencimientos SUNAT, gratificación y CTS según régimen laboral. */
import { CRONOGRAMA_MOCK, TAX_2026 } from '../config/taxParams2026.ts'
import type { DemoBusiness, RegimenLaboral } from './types.ts'
import { addMonths, diffDays, round2 } from './util.ts'

/** Vencimiento de la declaración de un periodo ("2026-10") según el último dígito del RUC. */
export function vencimientoSunat(periodo: string, ruc: string): string {
  const dia = CRONOGRAMA_MOCK[Number(ruc.at(-1))] ?? 20
  return `${addMonths(periodo, 1)}-${String(dia).padStart(2, '0')}`
}

/** Próximo vencimiento desde hoy (el del mes en curso si todavía no pasó). */
export function proximoVencimiento(ruc: string, hoy: string): { periodo: string; fecha: string; dias: number } {
  const mesPasado = addMonths(hoy.slice(0, 7), -1)
  let fecha = vencimientoSunat(mesPasado, ruc)
  let periodo = mesPasado
  if (fecha < hoy) {
    periodo = hoy.slice(0, 7)
    fecha = vencimientoSunat(periodo, ruc)
  }
  return { periodo, fecha, dias: diffDays(hoy, fecha) }
}

/** Gratificación de un mes (julio o diciembre) para todo el equipo: sueldo × fracción + 9%. */
export function gratificacion(regimen: RegimenLaboral, trabajadores: number, sueldo: number): number {
  const g = TAX_2026.gratificacion
  return round2(trabajadores * sueldo * g.fraccion[regimen] * (1 + g.bonificacion))
}

/** Depósito de CTS de un semestre (mayo o noviembre) para todo el equipo. */
export function ctsSemestral(regimen: RegimenLaboral, trabajadores: number, sueldo: number): number {
  return round2(trabajadores * sueldo * TAX_2026.cts.fraccionSemestre[regimen])
}

export function planillaMensual(b: Pick<DemoBusiness, 'trabajadores' | 'sueldoPromedio'>): number {
  return round2(b.trabajadores * b.sueldoPromedio)
}

export const REGIMEN_LABORAL_LABEL: Record<RegimenLaboral, string> = {
  GENERAL: 'Régimen general',
  PEQUENA_REMYPE: 'Pequeña empresa (REMYPE)',
  MICRO_REMYPE: 'Microempresa (REMYPE)',
}
