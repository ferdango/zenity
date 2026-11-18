import { seed } from '../seed/index.ts'
import type { SunatSireSource } from './types.ts'

export const sunatSireSourceMock: SunatSireSource = {
  comprobantes: (businessId) => seed()[businessId]?.comprobantes ?? [],
  historialMensual: (businessId) => seed()[businessId]?.historialMensual ?? [],
}
