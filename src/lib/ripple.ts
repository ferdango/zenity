/**
 * Ripple de Material 3 delegado a nivel de documento: cualquier elemento con
 * `data-ripple` recibe la onda al presionarlo. Un solo listener para toda la app.
 */
export function installRipple(): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-ripple]')
    if (!target || target.matches(':disabled, [aria-disabled="true"]')) return

    const rect = target.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))

    const ripple = document.createElement('span')
    ripple.className = 'z-ripple'
    ripple.style.width = ripple.style.height = `${radius * 2}px`
    ripple.style.left = `${x - radius}px`
    ripple.style.top = `${y - radius}px`
    target.appendChild(ripple)

    const release = () => {
      ripple.dataset.leaving = ''
      window.setTimeout(() => ripple.remove(), 420)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onPointerDown)
}
