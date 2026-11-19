/** Datos derivados de la primera ola para el negocio activo (memorizados por estado de la demo). */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { proyectarCaja } from '../domain/cashflow'
import { estadoCierres, eventoEfectivo } from '../domain/cierres'
import { porCobrar, totalCobranzas } from '../domain/collections'
import { decisionDeLaSemana, lunesDe, type TipoDecision } from '../domain/decision'
import { type Analysis, resumenMes } from '../domain/engine'
import { cambiosDelNegocio, type EntradaIndicadores, indicadores } from '../domain/indicadores'
import { evaluarLecciones } from '../domain/lessons'
import { logros, puntosDisponibles, xpDeRecompensas } from '../domain/loyalty'
import { personalesDelMes } from '../domain/personal'
import { camino, progreso, siguientePaso } from '../domain/progreso'
import { historicoResultados } from '../domain/resultados'
import { resumenSunat } from '../domain/sunat'
import { avisoLimite, datosSimulador } from '../domain/taxSimulator'
import type { CashEvent, PromesaPago } from '../domain/types'
import { useApp } from './context'
import { analysisFor, type DemoState, ESTADO_INICIAL, useDemoState } from './demoStore'

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

/** Avance en educación financiera (XP, racha, nivel) y el camino del negocio activo. */
export function useProgreso() {
  const { a, demo } = useZen()
  const { connections } = useApp()
  const caja = useCaja(60)
  return useMemo(() => {
    const entrada = {
      corrections: demo.corrections,
      recordatorios: demo.recordatorios,
      promesas: demo.promesas,
      lessonEvents: demo.lessonEvents,
      datos: demo.datos,
      inicio: demo.inicio,
      overrides: demo.overrides,
      importaciones: demo.importaciones,
      confirmados: demo.confirmados,
      regimenRevisado: demo.regimenRevisado,
      hitos: demo.hitos,
      bonus: xpDeRecompensas(demo.recompensas),
      decisiones: demo.decisiones,
    }
    const unidades = a ? camino(a, entrada, connections.length) : []
    const p = progreso(entrada)
    const leccionesAprobadas = new Set(demo.lessonEvents.filter((l) => l.tipo === 'LEIDA').map((l) => `${l.businessId}:${l.lessonId}`)).size
    const listaLogros = logros(
      {
        xpHoy: p.xpHoy,
        metaCumplida: p.metaCumplida,
        racha: p.racha,
        nivel: p.nivel.numero,
        revisados: demo.corrections.filter((c) => c.origen !== 'CONTADOR').length,
        recordatorios: Object.keys(demo.recordatorios).length,
        lecciones: leccionesAprobadas,
        unidadesCompletas: unidades.filter((u) => u.estado === 'completa').map((u) => u.id),
        // Resultados reales del negocio activo
        cobrosRecibidos: a ? demo.extraMovements.filter((m) => m.simulado && m.monto > 0 && m.businessId === a.business.id).length : 0,
        conciliadoPct: a ? Math.round(resumenMes(a, HOY.slice(0, 7)).conciliado * 100) : 0,
        sueldoDefinido: !!a?.business.sueldoDueno,
        cajaConColchon: !!caja && !caja.alerta,
        decisiones: Object.keys(demo.decisiones).length,
      },
      demo.recompensas,
    )
    return {
      ...p,
      unidades,
      siguiente: siguientePaso(unidades),
      /** Loyalty */
      puntos: puntosDisponibles(p.xp, demo.canjes),
      canjes: demo.canjes,
      logros: listaLogros,
      porReclamar: listaLogros.filter((l) => l.logrado && !l.reclamado).length,
    }
  }, [a, demo, connections.length, caja])
}

/**
 * El número real del negocio que mueve cada unidad del camino («62% conciliado», «S/ 4,130 vencido»…):
 * así el dueño ve qué gana en su negocio con lo que aprende.
 */
export function useIndicadores() {
  const { a, demo } = useZen()
  const cierres = useCierres()
  return useMemo(() => (a ? indicadores(entradaIndicadores(a, demo.promesas, eventoEfectivo(cierres, HOY))) : null), [a, demo.promesas, cierres])
}

/** Los números que mueven las unidades del camino, calculados para un análisis. */
function entradaIndicadores(a: Analysis, promesas: PromesaPago[], extras: CashEvent[]): EntradaIndicadores {
  const mes = HOY.slice(0, 7)
  const cobranzas = porCobrar(a, promesas, HOY)
  const caja = proyectarCaja(a, promesas, HOY, 60, extras)
  const sunat = resumenSunat(a, HOY)
  return {
    conciliado: resumenMes(a, mes).conciliado,
    gastoPersonalMes: personalesDelMes(a, mes).reduce((s, m) => s + Math.abs(m.monto), 0),
    sueldoDueno: a.business.sueldoDueno ?? null,
    porCobrar: totalCobranzas(cobranzas),
    vencido: totalCobranzas(cobranzas.filter((c) => c.diasVencidos > 0)),
    caja: { minimo: caja.minimo.base, colchon: caja.colchon },
    sunat: sunat.total > 0 ? { total: sunat.total, vence: sunat.vence, dias: sunat.dias } : null,
  }
}

/**
 * «Tu semana»: lo aprendido (lecciones, decisiones, XP) y lo que mejoró en los números del negocio
 * desde el punto de partida de la demo.
 */
export function useTuSemana() {
  const { a, demo, businessId } = useZen()
  const cierres = useCierres()
  return useMemo(() => {
    const inicial = analysisFor(businessId, ESTADO_INICIAL)
    if (!a || !inicial) return null
    const lecciones = new Set(demo.lessonEvents.filter((l) => l.businessId === businessId && l.tipo === 'LEIDA').map((l) => l.lessonId)).size
    const decisiones = Object.keys(demo.decisiones).filter((k) => k.startsWith(`${businessId}:`)).length
    return {
      lecciones,
      decisiones,
      cambios: cambiosDelNegocio(entradaIndicadores(inicial, [], []), entradaIndicadores(a, demo.promesas, eventoEfectivo(cierres, HOY))),
    }
  }, [a, demo, businessId, cierres])
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

/**
 * «Decisión de la semana» del negocio activo: la más urgente, con el efecto real de cada opción. Una
 * vez elegida queda fija toda la semana; `resuelta` dice si el problema ya se arregló (p. ej. cobró y la
 * caja ya no baja del colchón, así que la decisión de hoy sería otra).
 */
export function useDecision() {
  const { a, demo, businessId } = useZen()
  const cobranzas = useCobranzas()
  const cierres = useCierres()
  const caja = useCaja(60)
  return useMemo(() => {
    if (!a) return null
    const actual = decisionDeLaSemana({
      a,
      promesas: demo.promesas,
      hoy: HOY,
      extras: eventoEfectivo(cierres, HOY),
      cobranzas,
      gastoPersonalMes: personalesDelMes(a, HOY.slice(0, 7)).reduce((s, m) => s + Math.abs(m.monto), 0),
    })
    const semana = `@${lunesDe(HOY)}`
    const clave = Object.keys(demo.decisiones).find((k) => k.startsWith(`${businessId}:`) && k.endsWith(semana))
    const tomada = clave ? demo.decisiones[clave] : null
    if (tomada?.decision) {
      // ¿El problema de la decisión ya no está en los números?
      const resuelto: Record<TipoDecision, boolean> = {
        caja: !!caja && !caja.alerta,
        cobrar: !cobranzas.some((c) => c.diasVencidos > 0 && !c.promesa),
        sueldo: !!a.business.sueldoDueno,
        sunat: false,
      }
      return { decision: tomada.decision, tomada, resuelta: resuelto[tomada.decision.tipo] }
    }
    if (!actual) return null
    return { decision: actual, tomada: null, resuelta: false }
  }, [a, demo.promesas, demo.decisiones, businessId, cobranzas, cierres, caja])
}

/** Estado de resultados del negocio activo, un mes por elemento (del más antiguo al actual). */
export function useResultados() {
  const { a } = useZen()
  return useMemo(() => (a ? historicoResultados(a, HOY) : []), [a])
}

