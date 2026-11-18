import type { Regla } from '../../domain/types'

/** Nombre de cada regla de conciliación para el dueño. */
export const REGLA_LABEL: Record<Regla, string> = {
  EXACTO: 'Monto exacto',
  DETRACCION: 'Detracción',
  RETENCION: 'Retención de IGV',
  AGRUPADO: 'Agrupado',
  PARCIAL: 'Pago en partes',
  MONEDA: 'Moneda extranjera',
  CIERRE: 'Cierre de caja',
  SUGERIDO: 'Sugerido',
  MANUAL: 'Manual',
}
