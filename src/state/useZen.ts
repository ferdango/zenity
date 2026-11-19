/** Datos derivados de la primera ola para el negocio activo (memorizados por estado de la demo). */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { proyectarCaja } from '../domain/cashflow'
import { estadoCierres, eventoEfectivo } from '../domain/cierres'
import { porCobrar } from '../domain/collections'
import type { Analysis } from '../domain/engine'
import { evaluarLecciones } from '../domain/lessons'
import { avisoLimite, datosSimulador } from '../domain/taxSimulator'
import { useApp } from './context'
import { analysisFor, type DemoState, useDemoState } from './demoStore'

export interface Zen {
  demo: DemoState
  /** null si el negocio activo no es de la demo */
  a: Analysis | null
  businessId: string
}

export function useZen(): Zen {
  const { business } = useApp()
  const demo = useDemoState()
  return { demo, a: analysisFor(business.id, demo), businessId: business.id }
}

export function useCobranzas() {
  const { a, demo } = useZen()
  return useMemo(() => (a ? porCobrar(a, demo.promesas, HOY) : []), [a, demo.promesas])
}

/** Cierres de caja del negocio activo con su estado (boletas, depósito, efectivo por depositar). */
export function useCierres() {
  const { a, demo } = useZen()
  return useMemo(() => (a ? estadoCierres(a, demo.cierresCaja) : []), [a, demo.cierresCaja])
}

export function useCaja(dias: number) {
  const { a, demo } = useZen()
  const cierres = useCierres()
  return useMemo(
    () => (a ? proyectarCaja(a, demo.promesas, HOY, dias, eventoEfectivo(cierres, HOY)) : null),
    [a, demo.promesas, dias, cierres],
  )
}

export function useSimulador() {
  const { a } = useZen()
  return useMemo(() => {
    if (!a) return null
    const datos = datosSimulador(a, HOY)
    return { datos, aviso: avisoLimite(a.business.regimenTributario, datos.ingresosAnuales) }
  }, [a])
}

export function useLecciones() {
  const { a, demo } = useZen()
  const cobranzas = useCobranzas()
  const caja = useCaja(60)
  const sim = useSimulador()
  return useMemo(
    () =>
      a && caja
        ? evaluarLecciones({
            analysis: a,
            hoy: HOY,
            cobranzas,
            caja,
            limite: sim?.aviso ?? null,
            corrections: demo.corrections,
          })
        : null,
    [a, caja, cobranzas, sim, demo.corrections],
  )
}
