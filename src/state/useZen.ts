/** Datos derivados de la primera ola para el negocio activo (memorizados por estado de la demo). */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { proyectarCaja } from '../domain/cashflow'
import { cuotaAceptada, eventosCredito, perfilCrediticio } from '../domain/credit'
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

/** Cuotas de un crédito ya aceptado (el desembolso ya entró como movimiento del banco). */
export function useCuotasCredito() {
  const { demo, businessId } = useZen()
  const sol = demo.credito[businessId]?.solicitud
  return useMemo(
    () => (sol?.estado === 'ACEPTADA' && sol.desembolso ? eventosCredito(sol.monto, sol.plazo, sol.tea, sol.desembolso).slice(1) : []),
    [sol],
  )
}

export function useCaja(dias: number) {
  const { a, demo } = useZen()
  const cuotas = useCuotasCredito()
  return useMemo(() => (a ? proyectarCaja(a, demo.promesas, HOY, dias, cuotas) : null), [a, demo.promesas, dias, cuotas])
}

/** F3 · Perfil crediticio del negocio activo. */
export function usePerfilCrediticio() {
  const { a, demo, businessId } = useZen()
  const cuota = cuotaAceptada(demo.credito[businessId]?.solicitud)
  return useMemo(() => (a ? perfilCrediticio(a, HOY, demo.promesas, cuota) : null), [a, demo.promesas, cuota])
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
            creditoVisto: !!demo.credito[a.business.id]?.visto,
          })
        : null,
    [a, caja, cobranzas, sim, demo.corrections, demo.credito],
  )
}
