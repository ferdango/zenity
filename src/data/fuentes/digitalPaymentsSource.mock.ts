import { seed } from '../seed/index.ts'
import type { DigitalPaymentsSource } from './types.ts'

export const digitalPaymentsSourceMock: DigitalPaymentsSource = {
  ventasPos: (businessId) => seed()[businessId]?.posSales ?? [],
  lotesPos: (businessId) => seed()[businessId]?.posBatches ?? [],
  yapes: (businessId) => seed()[businessId]?.yapePayments ?? [],
}
