import { useMemo } from 'react'
import { buildSire, type Sire } from '../data/sire'
import { useApp } from '../state/context'

/** SIRE del negocio activo (comprobantes, IGV y Renta de cada mes). */
export function useSire(): Sire {
  const { business } = useApp()
  return useMemo(() => buildSire(business), [business])
}
