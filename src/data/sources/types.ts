/**
 * Adaptadores de las fuentes de datos. En esta etapa todos son mock (leen el seed);
 * después se enchufan las APIs reales (BCP, SUNAT SIRE, POS / Yape) sin tocar el dominio.
 */
import type { BankMovement, Comprobante, PosBatch, PosSale, YapePayment } from '../../domain/types.ts'

/** Movimientos de la cuenta BCP del negocio. */
export interface BankSource {
  movimientos(businessId: string): BankMovement[]
}

/** Comprobantes de venta y compra del SIRE (o solo boletas emitidas, en el NRUS). */
export interface SunatSireSource {
  comprobantes(businessId: string): Comprobante[]
  /** Ventas y compras (sin IGV) de meses anteriores, para el simulador de régimen */
  historialMensual(businessId: string): { mes: string; ventas: number; compras: number }[]
}

/** Ventas con tarjeta (POS), sus liquidaciones y los cobros por Yape. */
export interface DigitalPaymentsSource {
  ventasPos(businessId: string): PosSale[]
  lotesPos(businessId: string): PosBatch[]
  yapes(businessId: string): YapePayment[]
}
