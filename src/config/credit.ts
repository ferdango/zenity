/**
 * F3 · Perfil crediticio con flujo real. Reglas DE EJEMPLO para el prototipo:
 * la evaluación, la tasa y los montos reales los define el BCP.
 */
export const CREDITO = {
  /** Tasa efectiva anual referencial (ejemplo). TODO: reemplazar por la tarifa real del BCP */
  teaReferencial: 0.3,
  plazos: [6, 9, 12, 18] as const,
  plazoSugerido: 12,
  /** La cuota no debe pasar de esta parte de lo que le sobra al negocio cada mes */
  ratioCuota: 0.5,
  /** Parte de la capacidad que se ofrece según el segmento */
  factorSegmento: { A: 1, B: 0.8, C: 0.5, D: 0 },
  montoMinimo: 1000,
  redondeo: 500,
  /** El consentimiento para compartir el expediente vence a los 90 días */
  vigenciaConsentimientoDias: 90,
  /** Peso de cada componente del puntaje (suman 1) */
  pesos: {
    capacidad: 0.3,
    ventas: 0.2,
    formalidad: 0.15,
    liquidez: 0.15,
    cobranza: 0.1,
    tributario: 0.1,
  },
} as const

export type Segmento = 'A' | 'B' | 'C' | 'D'

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  A: 'Riesgo bajo',
  B: 'Riesgo moderado',
  C: 'Ajustado',
  D: 'No califica hoy',
}

/** Fuentes que el dueño puede autorizar a compartir con el BCP. */
export const FUENTES_EXPEDIENTE = [
  { id: 'SIRE', nombre: 'Ventas y compras de SUNAT (SIRE)', obligatoria: true },
  { id: 'BCP', nombre: 'Movimientos de tu cuenta BCP', obligatoria: true },
  { id: 'DIGITAL', nombre: 'Cobros por Yape y POS', obligatoria: false },
] as const

export type FuenteExpediente = (typeof FUENTES_EXPEDIENTE)[number]['id']
