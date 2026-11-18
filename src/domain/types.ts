/**
 * Modelo de datos de la primera ola (sección 3 del brief).
 * Todo el dominio es puro: sin React, sin DOM y con imports `.ts` para que corra en `node --test`.
 */

export type RegimenTributario = 'NRUS' | 'RER' | 'RMT' | 'GENERAL'
export type RegimenLaboral = 'MICRO_REMYPE' | 'PEQUENA_REMYPE' | 'GENERAL'

export interface DemoBusiness {
  id: string
  ruc: string
  razonSocial: string
  nombreComercial: string
  rubro: string
  regimenTributario: RegimenTributario
  regimenLaboral: RegimenLaboral
  trabajadores: number
  /** S/ */
  sueldoPromedio: number
  /** F-04, definido por el usuario */
  sueldoDueno?: number
  contadorId?: string
  /** F-06, por defecto = 1 semana de egresos promedio */
  colchonCaja?: number
  /** Celular del negocio (Yape y links de cobro), 9 dígitos */
  telefonoWhatsApp?: string
  /** Nombre del dueño o dueña */
  dueno: { nombres: string; apellidos: string }
  /** NRUS: no lleva registros en SIRE; se concilia en dos vías (banco + boletas emitidas) */
  dosVias?: boolean
  /** Para mostrar cómo pagarle: cuenta BCP y CCI de ejemplo */
  cuentaBcp: string
  cci: string
}

export type Canal = 'TRANSFERENCIA' | 'YAPE' | 'POS_LIQUIDACION' | 'DEPOSITO_EFECTIVO' | 'CARGO' | 'CAJERO'

export interface BankMovement {
  id: string
  businessId: string
  /** ISO local "2026-11-03T10:15" */
  fecha: string
  /** + abono, − cargo */
  monto: number
  /** Texto del banco */
  glosa: string
  numeroOperacion: string
  contraparteNombre?: string
  contraparteRuc?: string
  canal: Canal
  saldoDespues: number
  /** Movimiento insertado por la demo («Simular que pagó») */
  simulado?: boolean
}

export type TipoComprobante = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'RETENCION'

export interface Comprobante {
  id: string
  businessId: string
  tipo: TipoComprobante
  direccion: 'VENTA' | 'COMPRA'
  serie: string
  numero: string
  rucContraparte?: string
  nombreContraparte: string
  /** "2026-11-03" */
  fechaEmision: string
  moneda: 'PEN' | 'USD'
  base: number
  igv: number
  total: number
  formaPago: 'CONTADO' | 'CREDITO'
  cuotas?: { fecha: string; monto: number }[]
  /** p. ej. 0.12 si aplica */
  detraccionPorcentaje?: number
  clienteEsAgenteRetencion?: boolean
  /** Nota de crédito o retención → comprobante original */
  referenciaId?: string
}

export interface PosSale {
  id: string
  businessId: string
  /** ISO local */
  fecha: string
  monto: number
  loteId: string
}

export interface PosBatch {
  loteId: string
  fechaAbono: string
  bruto: number
  comision: number
  neto: number
}

/** Cobro por Yape tal como lo reporta la billetera (columna «Cobro digital»). */
export interface YapePayment {
  id: string
  businessId: string
  fecha: string
  monto: number
  nombre: string
  numeroOperacion: string
}

export type Regla = 'EXACTO' | 'DETRACCION' | 'RETENCION' | 'AGRUPADO' | 'MONEDA' | 'SUGERIDO' | 'MANUAL'

export type Estado =
  | 'CONCILIADO'
  | 'COBRADO_SIN_COMPROBANTE'
  | 'COMPROBANTE_SIN_COBRO'
  | 'PAGADO_SIN_FACTURA'
  | 'FACTURA_SIN_PAGO'
  | 'POSIBLE_PERSONAL'
  | 'SIN_CATEGORIA_SEGURA'

export interface Match {
  id: string
  movementIds: string[]
  comprobanteIds: string[]
  posSaleIds?: string[]
  regla: Regla
  /** 0..1 */
  confianza: number
  /** Una línea, generada por plantilla (F-02) */
  motivo: string
  /** Detracción que quedó en el Banco de la Nación (regla DETRACCION) */
  detraccion?: number
  /** Retención de IGV (regla RETENCION) */
  retencion?: number
  /** Tipo de cambio usado (regla MONEDA) */
  tipoCambio?: number
}

export type CategoriaId =
  | 'ventas'
  | 'insumos'
  | 'alquiler'
  | 'servicios'
  | 'transporte'
  | 'publicidad'
  | 'mantenimiento'
  | 'asesoria'
  | 'planilla'
  | 'impuestos'
  | 'prestamos'
  | 'comisiones'
  | 'retiro_dueno'
  | 'otros'

export type FuenteClasificacion =
  | 'REGLA_NEGOCIO'
  | 'REGLA_CONTADOR'
  | 'HISTORIAL'
  | 'GLOSA'
  | 'RUBRO'
  | 'MATCH'
  | 'MANUAL'

export interface Classification {
  movementId: string
  estado: Estado
  categoriaId: CategoriaId
  confianza: number
  motivo: string
  fuente: FuenteClasificacion
}

export interface RuleCondition {
  rucContraparte?: string
  contraparteNombre?: string
  glosaContiene?: string
  montoMin?: number
  montoMax?: number
}

export interface Rule {
  id: string
  businessId: string
  scope: 'NEGOCIO' | 'CONTADOR'
  condicion: RuleCondition
  categoriaId: CategoriaId
  /** Solo reglas de contador */
  cuentaPCGE?: string
  creadaPor: 'DUENO' | 'CONTADOR'
  creadaEn: string
}

/** Datos de entrenamiento: el «foso» de Zenity. */
export interface Correction {
  id: string
  movementId: string
  businessId: string
  rubro: string
  sugerida: CategoriaId
  elegida: CategoriaId
  confianzaSugerida: number
  origen: 'APP' | 'WHATSAPP' | 'CONTADOR'
  creoRegla: boolean
  /** «No, es del negocio» en Personal vs negocio */
  esNegocio?: boolean
  ts: string
}

export interface Comment {
  id: string
  businessId: string
  /** Movimiento del hilo, o un tema general («simulador») */
  movementId: string
  autor: 'DUENO' | 'CONTADOR'
  texto: string
  ts: string
  /** Pregunta del contador que espera respuesta del dueño */
  pregunta?: boolean
  /** La pregunta ya fue respondida */
  respondida?: boolean
}

export interface PromesaPago {
  comprobanteId: string
  fecha: string
  monto: number
  registradaEn: string
}

export type Certeza = 'ALTA' | 'MEDIA' | 'BAJA'
export type FuenteCaja =
  | 'POR_COBRAR'
  | 'PROMESA'
  | 'VENTAS_ESTIMADAS'
  | 'POR_PAGAR'
  | 'RECURRENTE'
  | 'PLANILLA'
  | 'IMPUESTOS'
  | 'GRATIFICACION'
  | 'CTS'

export interface CashEvent {
  fecha: string
  concepto: string
  /** + entra, − sale */
  monto: number
  certeza: Certeza
  fuente: FuenteCaja
  /** Monto del escenario pesimista (solo ventas estimadas) */
  montoPesimista?: number
}

export type LessonId = 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06' | 'L07' | 'L08' | 'L09' | 'L10'

export interface LessonEvent {
  lessonId: LessonId
  businessId: string
  tipo: 'MOSTRADA' | 'LEIDA' | 'ACCION'
  ts: string
}

/** Todo lo que traen las fuentes para un negocio. */
export interface BusinessData {
  business: DemoBusiness
  movements: BankMovement[]
  comprobantes: Comprobante[]
  posSales: PosSale[]
  posBatches: PosBatch[]
  yapePayments: YapePayment[]
  /** Teléfonos de clientes (por RUC o nombre normalizado) para recordar cobros */
  contactos: Record<string, string>
  /** Totales mensuales de los 12 meses anteriores al seed (SIRE): ventas y compras sin IGV */
  historialMensual: { mes: string; ventas: number; compras: number }[]
}
