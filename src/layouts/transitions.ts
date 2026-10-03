import type { Variants } from 'motion/react'
import { useState } from 'react'
import { type Location, useNavigationType } from 'react-router'
import { ease } from '../lib/motion'
import { isTabRoute } from './nav'

export interface RouteTransition {
  /** 1 = avanzar, -1 = volver */
  dir: 1 | -1
  /** slide: eje compartido X · fade: fade-through entre pestañas */
  kind: 'slide' | 'fade'
  pop: boolean
}

function historyIndex(): number {
  return (window.history.state as { idx?: number } | null)?.idx ?? 0
}

/**
 * Calcula la dirección de la navegación comparando el índice del historial,
 * de modo que "atrás" (botón o gesto del navegador) anima en sentido inverso.
 */
export function useRouteTransition(location: Location): RouteTransition {
  const navigationType = useNavigationType()
  const [state, setState] = useState(() => ({
    key: location.key,
    idx: historyIndex(),
    path: location.pathname,
    value: { dir: 1, kind: 'slide', pop: false } as RouteTransition,
  }))

  if (state.key !== location.key) {
    // Patrón "estado derivado de la render anterior": React vuelve a renderizar de inmediato.
    const idx = historyIndex()
    const pop = navigationType === 'POP'
    const next = {
      key: location.key,
      idx,
      path: location.pathname,
      value: {
        dir: pop && idx < state.idx ? -1 : 1,
        kind: isTabRoute(state.path) && isTabRoute(location.pathname) ? 'fade' : 'slide',
        pop,
      } as RouteTransition,
    }
    setState(next)
    return next.value
  }

  return state.value
}

export const pageVariants: Variants = {
  initial: (t: RouteTransition) => (t.kind === 'fade' ? { opacity: 0, scale: 0.985 } : { opacity: 0, x: 28 * t.dir }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.4, ease: ease.decelerate },
  },
  exit: (t: RouteTransition) =>
    t.kind === 'fade'
      ? { opacity: 0, transition: { duration: 0.12, ease: ease.accelerate } }
      : { opacity: 0, x: -20 * t.dir, transition: { duration: 0.16, ease: ease.accelerate } },
}

const scrollPositions = new Map<string, number>()

export function saveScroll(key: string) {
  scrollPositions.set(key, window.scrollY)
}

export function restoreScroll(key: string, pop: boolean) {
  const top = pop ? (scrollPositions.get(key) ?? 0) : 0
  window.scrollTo({ top, left: 0, behavior: 'instant' })
}
