/**
 * Parámetros tributarios y laborales 2026 (sección 7 del brief).
 * Valores referenciales: validar con un contador antes de mostrarlos a clientes reales.
 * Fuentes: modelo.pe (regímenes 2026), SUNAT (detracciones y retenciones), MTPE (REMYPE).
 */
export const TAX_2026 = {
  uit: 5500,
  igv: 0.18,
  nrus: {
    categorias: [
      { id: 1, topeMensual: 5000, cuota: 20 },
      { id: 2, topeMensual: 8000, cuota: 50 },
    ],
    topeAnual: 96000,
    /** Solo emite boletas */
    soloBoletas: true,
  },
  rer: { tasa: 0.015, topeAnual: 525000 },
  rmt: {
    topeUit: 1700,
    /** 10% hasta 15 UIT de renta neta, 29.5% el exceso */
    tramoUit: 15,
    tasaTramo1: 0.1,
    tasaTramo2: 0.295,
    /** Pago a cuenta mensual: 1% de ingresos netos hasta 300 UIT */
    pagoACuenta: 0.01,
    pagoACuentaTopeUit: 300,
  },
  general: { tasa: 0.295, pagoACuenta: 0.015 },
  detraccion: { tasaServicios: 0.12, montoMinimo: 700, banco: 'Banco de la Nación' },
  retencionIgv: 0.03,
  essalud: 0.09,
  gratificacion: {
    meses: [7, 12],
    diaPago: 15,
    /** Fracción de un sueldo por trabajador (más 9% de bonificación extraordinaria) */
    fraccion: { GENERAL: 1, PEQUENA_REMYPE: 0.5, MICRO_REMYPE: 0 },
    bonificacion: 0.09,
  },
  cts: {
    meses: [5, 11],
    diaPago: 15,
    /** Fracción de un sueldo por semestre */
    fraccionSemestre: { GENERAL: 0.5, PEQUENA_REMYPE: 0.25, MICRO_REMYPE: 0 },
  },
} as const

/**
 * Cronograma de vencimientos por último dígito del RUC: día del mes siguiente al periodo.
 * TODO: tabla mock — reemplazar por el cronograma oficial de SUNAT 2026.
 */
export const CRONOGRAMA_MOCK: Record<number, number> = {
  0: 16,
  1: 17,
  2: 18,
  3: 18,
  4: 19,
  5: 19,
  6: 20,
  7: 20,
  8: 21,
  9: 21,
}

/**
 * Tipo de cambio venta (S/ por US$) por fecha. Tabla mock y configurable:
 * si no hay valor para el día se usa el último anterior.
 */
export const TIPO_CAMBIO_MOCK: Record<string, number> = {
  '2026-08-01': 3.74,
  '2026-09-01': 3.72,
  '2026-10-01': 3.76,
  '2026-10-20': 3.78,
  '2026-11-01': 3.75,
}
