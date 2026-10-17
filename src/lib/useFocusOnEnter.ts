import { useEffect } from 'react'

/** Enfoca un campo cuando termina la transición de entrada de la pantalla. */
export function useFocusOnEnter(id: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => document.getElementById(id)?.focus({ preventScroll: true }), 450)
    return () => window.clearTimeout(timer)
    // Solo al entrar a la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
