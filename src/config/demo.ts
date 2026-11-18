/**
 * Reloj de la demo: el seed va de agosto a noviembre de 2026 y «hoy» es el 18/11/2026.
 * Todo cálculo con fechas (vencimientos, días de atraso, proyección de caja) parte de aquí.
 */
export const HOY = '2026-11-18'
export const AHORA = `${HOY}T10:30`

/** Meses con datos en el seed, del más antiguo al más reciente. */
export const MESES_DEMO = ['2026-08', '2026-09', '2026-10', '2026-11'] as const

/** Contador de la demo (F-08). Datos ficticios. */
export const CONTADOR_DEMO = {
  id: 'contador-luis',
  nombre: 'Luis Paredes',
  estudio: 'Paredes & Asociados',
  iniciales: 'LP',
}

/** Analista del BCP en la vista del banco (F3). Datos ficticios. */
export const BANCO_DEMO = {
  nombre: 'Carla Rojas',
  detalle: 'BCP · Banca Pequeña Empresa',
  iniciales: 'CR',
}
