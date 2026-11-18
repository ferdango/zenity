import { seed } from '../seed/index.ts'
import type { BankSource } from './types.ts'

export const bankSourceMock: BankSource = {
  movimientos: (businessId) => seed()[businessId]?.movements ?? [],
}
