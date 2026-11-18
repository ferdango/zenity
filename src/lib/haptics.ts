/**
 * Vibración corta como respuesta táctil (solo en dispositivos que la soportan y si el
 * usuario no pidió menos movimiento). En escritorio no hace nada.
 */
export type HapticKind = 'tap' | 'select' | 'success' | 'warning' | 'error'

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 6,
  select: 10,
  success: [12, 60, 18],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
}

export function haptic(kind: HapticKind = 'tap') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Algunos navegadores bloquean la vibración sin gesto del usuario
  }
}
