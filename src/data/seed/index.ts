/** Seed determinístico de la demo: se genera una sola vez y siempre da los mismos datos. */
import type { BusinessData } from '../../domain/types.ts'
import { BODEGA_ID, seedBodega } from './bodega.ts'
import { FERRETERIA_ID, seedFerreteria } from './ferreteria.ts'

export { BODEGA_ID, FERRETERIA_ID }
export { CARTERA_RESUMIDA, type ClienteResumen } from './cartera.ts'
export { EXPEDIENTES_EJEMPLO, type ExpedienteResumen } from './expedientes.ts'

let cache: Record<string, BusinessData> | null = null

export function seed(): Record<string, BusinessData> {
  cache ??= { [FERRETERIA_ID]: seedFerreteria(), [BODEGA_ID]: seedBodega() }
  return cache
}

/** Negocios con datos completos en la demo, en el orden en que se muestran. */
export const SEED_IDS = [FERRETERIA_ID, BODEGA_ID]
