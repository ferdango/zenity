import { useEffect, useRef } from 'react'

let locks = 0

/** Bloquea el scroll del body, cierra con Escape y gestiona el foco mientras `open`. */
export function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null

    locks += 1
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)

    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current
      target?.focus({ preventScroll: true })
    })

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      locks -= 1
      if (locks === 0) {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
      previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  return panelRef
}
