import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ease, spring } from '../lib/motion'
import { Button } from './Button'
import { Spark } from './Spark'
import styles from './Tour.module.css'

export interface TourStep {
  /** Valor del atributo data-tour del elemento a resaltar */
  target: string
  title: string
  body: string
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
  radius: number
}

const PAD = 8
const GAP = 14

/** Primer elemento visible con ese data-tour (la barra inferior o la lateral según el ancho). */
function findTarget(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

/** true si el elemento (o un ancestro) es fixed/sticky: no hace falta hacer scroll para verlo. */
function isPinned(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const position = getComputedStyle(node).position
    if (position === 'fixed' || position === 'sticky') return true
  }
  return false
}

function readRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    radius: Math.min(radius, Math.min(r.width, r.height) / 2) + PAD,
  }
}

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

interface TourProps {
  steps: TourStep[]
  firstName: string
  onFinish: (completed: boolean) => void
}

/**
 * Recorrido de bienvenida: un foco animado recorre cada sección del Inicio y
 * las opciones de navegación, con una tarjeta que explica cada una.
 */
export function Tour({ steps: allSteps, firstName, onFinish }: TourProps) {
  // Solo los pasos cuyo elemento existe y es visible (p. ej. el botón de menú no existe en escritorio)
  const [steps] = useState(() => allSteps.filter((s) => findTarget(s.target)))
  const [index, setIndex] = useState(-1)
  const [rect, setRect] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const [cardHeight, setCardHeight] = useState(180)
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const step = index >= 0 ? steps[index] : null
  const last = index === steps.length - 1

  const measure = useCallback(() => {
    setViewport((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }))
    if (!step) {
      setRect(null)
      return
    }
    const el = findTarget(step.target)
    const next = el ? readRect(el) : null
    setRect((prev) => (sameRect(prev, next) ? prev : next))
  }, [step])

  // Al cambiar de paso: llevar el elemento a la vista y medirlo
  useEffect(() => {
    if (step) {
      const el = findTarget(step.target)
      // Elementos fijos o pegajosos (barra inferior, cabecera) ya están siempre a la vista
      if (el && !isPinned(el)) {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const headerSpace = 76
        const cardSpace = PAD + GAP + cardHeight + 12
        // En móvil la barra inferior tapa el final de la pantalla
        const navTop = findTarget('nav-wallet')?.getBoundingClientRect().top ?? vh
        const bottomLimit = navTop > vh / 2 ? Math.min(navTop - 20, vh - 12) : vh - 12
        const targetVisible = r.top >= headerSpace - 4 && r.bottom + PAD <= bottomLimit
        const cardFits = r.bottom + cardSpace <= vh || r.top - cardSpace >= headerSpace
        const fitsNow = targetVisible && cardFits
        // Se alinea el elemento bajo la cabecera: así la tarjeta cabe debajo o, si el elemento es
        // muy alto, solo tapa su parte final
        if (!fitsNow) window.scrollTo({ top: window.scrollY + r.top - headerSpace, behavior: 'smooth' })
      }
    }
    const frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
    // La altura de la tarjeta solo se usa para calcular el scroll al cambiar de paso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, measure])

  // Seguir al elemento mientras hay scroll, cambios de tamaño o animaciones de entrada
  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const interval = window.setInterval(measure, 300)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.clearInterval(interval)
    }
  }, [measure])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight))
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true })
  }, [index])

  const next = useCallback(() => {
    if (index >= steps.length - 1) onFinish(true)
    else setIndex((i) => i + 1)
  }, [index, steps.length, onFinish])

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish(false)
      else if (event.key === 'ArrowRight') next()
      else if (event.key === 'ArrowLeft' && index > 0) back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, back, index, onFinish])

  // Posición de la tarjeta: debajo del foco si cabe, si no encima
  const cardWidth = Math.min(360, viewport.w - 32)
  let cardX = (viewport.w - cardWidth) / 2
  let cardY = (viewport.h - cardHeight) / 2
  if (rect) {
    const below = rect.top + rect.height + PAD + GAP
    const above = rect.top - PAD - GAP - cardHeight
    if (below + cardHeight <= viewport.h - 12) cardY = below
    else if (above >= 12) cardY = above
    else cardY = Math.max(12, viewport.h - cardHeight - 12)
    cardX = Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, 16), viewport.w - cardWidth - 16)
  }

  const spot = rect
    ? {
        x: rect.left - PAD,
        y: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: rect.radius,
        opacity: 1,
      }
    : { x: viewport.w / 2, y: viewport.h / 2, width: 0, height: 0, borderRadius: 24, opacity: 1 }

  return createPortal(
    <>
      <motion.div
        className={styles.blocker}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={(event) => event.stopPropagation()}
      />
      <motion.div
        className={styles.spot}
        initial={{ ...spot, opacity: 0 }}
        animate={spot}
        transition={{ ...spring.soft, opacity: { duration: 0.3 } }}
        aria-hidden
      >
        {rect && (
          <>
            <span className={styles.ring} />
            <span className={styles.pulse} />
          </>
        )}
      </motion.div>
      <motion.div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        style={{ width: cardWidth }}
        initial={{ x: cardX, y: cardY + 16, opacity: 0, scale: 0.96 }}
        animate={{ x: cardX, y: cardY, opacity: 1, scale: 1 }}
        transition={spring.soft}
      >
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: ease.decelerate }}
          aria-live="polite"
        >
          {step ? (
            <>
              <div className={styles.counter}>
                <span>
                  {index + 1} de {steps.length}
                </span>
                <span className={styles.bar}>
                  <motion.span
                    className={styles.barFill}
                    initial={false}
                    animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: ease.emphasized }}
                  />
                </span>
              </div>
              <h2 id="tour-title" className={styles.title}>
                {step.title}
              </h2>
              <p id="tour-body" className={styles.body}>
                {step.body}
              </p>
              <div className={styles.actions}>
                <Button variant="text" size="sm" onClick={() => onFinish(false)}>
                  Omitir
                </Button>
                <div className={styles.actionsEnd}>
                  {index > 0 && (
                    <Button variant="text" size="sm" onClick={back}>
                      Atrás
                    </Button>
                  )}
                  <Button ref={primaryRef} size="sm" onClick={next} trailingIcon={last ? 'check' : 'arrow_forward'}>
                    {last ? '¡Listo!' : 'Siguiente'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.intro}>
              <Spark size={40} animateIn />
              <h2 id="tour-title" className={styles.title}>
                Te damos la bienvenida, {firstName}
              </h2>
              <p id="tour-body" className={styles.body}>
                Te mostramos en menos de un minuto qué hay en tu inicio y cómo moverte por Zenity.
              </p>
              <div className={styles.actions} style={{ width: '100%' }}>
                <Button variant="text" size="sm" onClick={() => onFinish(false)}>
                  Ahora no
                </Button>
                <Button ref={primaryRef} size="sm" onClick={() => setIndex(0)} trailingIcon="arrow_forward">
                  Empezar recorrido
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>,
    document.body,
  )
}
