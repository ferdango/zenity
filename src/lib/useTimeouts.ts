import { useCallback, useEffect, useRef } from 'react'

/**
 * setTimeout ligado a la pantalla: lo pendiente se cancela al desmontarla
 * (p. ej. si el usuario vuelve atrás mientras se simula una espera).
 */
export function useTimeouts() {
  const timers = useRef(new Set<number>())

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((id) => window.clearTimeout(id))
      pending.clear()
    }
  }, [])

  return useCallback((callback: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      callback()
    }, ms)
    timers.current.add(id)
  }, [])
}
