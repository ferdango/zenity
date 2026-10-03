import { useNavigate } from 'react-router'

/** Vuelve atrás si hay historial dentro de la app; si no, navega a la ruta de respaldo. */
export function useBack(fallback = '/inicio') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
