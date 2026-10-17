import { useEffect, useEffectEvent, useState } from 'react'
import type { LookupState } from '../components/Registry'
import { consultarRuc, type SunatCompany } from '../data/registry'
import { validateRuc } from './validation'

interface Options {
  /** Ficha ya consultada antes (al volver a la pantalla) */
  initial?: SunatCompany | null
  /** Error propio que impide consultar (p. ej. el RUC ya está registrado) */
  blocked?: string | null
  onFound?: (company: SunatCompany) => void
}

/**
 * Consulta a SUNAT en cuanto el RUC tiene formato y dígito verificador válidos.
 * Guarda la última ficha encontrada para poder recuperarla si el RUC vuelve a coincidir.
 */
export function useRucLookup(ruc: string, { initial = null, blocked = null, onFound }: Options = {}) {
  const [company, setCompany] = useState<SunatCompany | null>(initial)
  const [failure, setFailure] = useState<{ ruc: string; message: string } | null>(null)
  const formatError = validateRuc(ruc)
  const verified = company !== null && company.ruc === ruc && !blocked
  const notFound = failure?.ruc === ruc
  const searching = !formatError && !blocked && !verified && !notFound
  const found = useEffectEvent((result: SunatCompany) => onFound?.(result))

  useEffect(() => {
    if (!searching) return
    let active = true
    consultarRuc(ruc).then((result) => {
      if (!active) return
      if (!result.ok) {
        setFailure({ ruc, message: result.error })
        return
      }
      setCompany(result.data)
      found(result.data)
    })
    return () => {
      active = false
    }
  }, [searching, ruc])

  const state: LookupState = verified ? 'verified' : searching ? 'searching' : 'idle'
  const error = formatError ?? blocked ?? (notFound ? failure.message : null)
  return { company, verified, searching, notFound, error, state }
}
