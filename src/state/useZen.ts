/** Datos derivados de la primera ola para el negocio activo (memorizados por estado de la demo). */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { proyectarCaja } from '../domain/cashflow'
import { estadoCierres, eventoEfectivo } from '../domain/cierres'
import { porCobrar, totalCobranzas } from '../domain/collections'
import { type Analysis, resumenMes } from '../domain/engine'
import { indicadores } from '../domain/indicadores'
import { evaluarLecciones } from '../domain/lessons'
import { logros, puntosDisponibles, xpDeRecompensas } from '../domain/loyalty'
import { personalesDelMes } from '../domain/personal'
import { camino, progreso, siguientePaso } from '../domain/progreso'
import { resumenSunat } from '../domain/sunat'
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
  const { a } = useZen()
  const cobranzas = useCobranzas()
  const caja = useCaja(60)
  return useMemo(() => {
    if (!a) return null
    const mes = HOY.slice(0, 7)
    const sunat = resumenSunat(a, HOY)
    return indicadores({
      conciliado: resumenMes(a, mes).conciliado,
      gastoPersonalMes: personalesDelMes(a, mes).reduce((s, m) => s + Math.abs(m.monto), 0),
      sueldoDueno: a.business.sueldoDueno ?? null,
      porCobrar: totalCobranzas(cobranzas),
      vencido: totalCobranzas(cobranzas.filter((c) => c.diasVencidos > 0)),
      caja: caja ? { minimo: caja.minimo.base, colchon: caja.colchon } : null,
      sunat: sunat.total > 0 ? { total: sunat.total, vence: sunat.vence, dias: sunat.dias } : null,
    })
  }, [a, cobranzas, caja])
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
