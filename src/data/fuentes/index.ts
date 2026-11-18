import type { BusinessData } from '../../domain/types.ts'
import { seed } from '../seed/index.ts'
import { bankSourceMock } from './bankSource.mock.ts'
import { digitalPaymentsSourceMock } from './digitalPaymentsSource.mock.ts'
import { sunatSireSourceMock } from './sunatSireSource.mock.ts'
import type { BankSource, DigitalPaymentsSource, SunatSireSource } from './types.ts'

export type { BankSource, DigitalPaymentsSource, SunatSireSource }

/** Fuentes activas: hoy, mock. Para usar las APIs reales basta con cambiar estas tres. */
export const sources: { bank: BankSource; sire: SunatSireSource; digital: DigitalPaymentsSource } = {
  bank: bankSourceMock,
  sire: sunatSireSourceMock,
  digital: digitalPaymentsSourceMock,
}

/** Junta lo que traen las tres fuentes para un negocio de la demo (null si no tiene datos). */
export function loadBusinessData(businessId: string): BusinessData | null {
  const base = seed()[businessId]
  if (!base) return null
  return {
    business: base.business,
    movements: sources.bank.movimientos(businessId),
    comprobantes: sources.sire.comprobantes(businessId),
    historialMensual: sources.sire.historialMensual(businessId),
    posSales: sources.digital.ventasPos(businessId),
    posBatches: sources.digital.lotesPos(businessId),
    yapePayments: sources.digital.yapes(businessId),
    contactos: base.contactos,
  }
}
