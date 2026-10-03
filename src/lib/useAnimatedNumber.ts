import { animate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { ease } from './motion'

/**
 * Anima un número (conteo) escribiendo directamente en el nodo para no re-renderizar
 * en cada frame. El elemento que recibe el ref no debe tener hijos gestionados por React.
 */
export function useAnimatedNumber<T extends HTMLElement>(
  value: number,
  format: (n: number) => string,
  { duration = 0.9, enabled = true }: { duration?: number; enabled?: boolean } = {},
) {
  const ref = useRef<T>(null)
  const displayed = useRef<number | null>(null)
  const formatRef = useRef(format)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    formatRef.current = format
    if (ref.current && displayed.current !== null) ref.current.textContent = format(displayed.current)
  }, [format])

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const start = displayed.current ?? value * 0.4

    if (!enabled || reduceMotion || start === value) {
      displayed.current = value
      node.textContent = formatRef.current(value)
      return
    }

    node.textContent = formatRef.current(start)
    const controls = animate(start, value, {
      duration,
      ease: ease.decelerate,
      onUpdate: (latest) => {
        displayed.current = latest
        node.textContent = formatRef.current(latest)
      },
      onComplete: () => {
        displayed.current = value
      },
    })
    return () => controls.stop()
  }, [value, duration, enabled, reduceMotion])

  return ref
}
