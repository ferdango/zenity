import { useMemo } from 'react'
import { buildCuentas, type Cuentas, SIN_CUENTAS } from '../data/cuentas'
import { useApp } from '../state/context'
import { useSire } from './useSire'

/** Cuentas por cobrar y por pagar del negocio activo (vacías mientras no conecte cuentas). */
export function useCuentas(): Cuentas {
  const { business, ledger } = useApp()
  const sire = useSire()
  return useMemo(() => (ledger.empty ? SIN_CUENTAS : buildCuentas(sire, business.ruc)), [ledger.empty, sire, business.ruc])
}
