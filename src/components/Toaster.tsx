import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { celebrate } from '../lib/celebrate'
import { haptic } from '../lib/haptics'
import { ease, spring } from '../lib/motion'
import { type Toast, useApp } from '../state/context'
import { Icon } from './Icon'
import styles from './Overlay.module.css'

const ERROR_ICONS = new Set(['error', 'mic_off', 'warning'])

/** Snackbars de Material 3 (superficie inversa) apilados en la parte inferior. */
export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return createPortal(
    <div className={styles.toaster} role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

/**
 * Un aviso: se cierra solo tras `duration` (la barra inferior muestra el tiempo que queda
 * cuando hay «Deshacer»), se pausa al tocarlo o pasar el cursor y se descarta deslizándolo.
 */
function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(t.duration)
  const startedAt = useRef(0)
  const dismissRef = useRef(onDismiss)
  useLayoutEffect(() => {
    dismissRef.current = onDismiss
  })

  // Respuesta táctil y confeti según el tipo de aviso (una sola vez)
  useEffect(() => {
    if (t.icon === 'celebration') celebrate()
    else if (t.icon && ERROR_ICONS.has(t.icon)) haptic('error')
    else haptic('select')
  }, [t.icon])

  useEffect(() => {
    if (paused) return
    startedAt.current = performance.now()
    const timer = window.setTimeout(() => dismissRef.current(), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= performance.now() - startedAt.current
    }
  }, [paused])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500 || info.offset.y > 40) onDismiss()
  }

  return (
    <motion.div
      layout
      className={styles.toast}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={{ left: 0.6, right: 0.6, top: 0.05, bottom: 0.4 }}
      onDragStart={() => setPaused(true)}
      onDragEnd={(e, info) => {
        setPaused(false)
        onDragEnd(e, info)
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: ease.decelerate } }}
      exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2, ease: ease.accelerate } }}
      onClick={onDismiss}
    >
      {t.icon && (
        <motion.span
          className={styles.toastIcon}
          initial={{ scale: 0.3, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring.bouncy, delay: 0.08 }}
        >
          <Icon name={t.icon} size={20} fill />
        </motion.span>
      )}
      <span>{t.message}</span>
      {t.action && (
        <button
          type="button"
          className={styles.toastAction}
          onClick={(e) => {
            e.stopPropagation()
            haptic('tap')
            t.action!.onClick()
            onDismiss()
          }}
        >
          {t.action.label === 'Deshacer' && <Icon name="undo" size={18} />}
          {t.action.label}
        </button>
      )}
      {t.action && (
        <span
          className={styles.toastTimer}
          style={{ animationDuration: `${t.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
          aria-hidden
        />
      )}
    </motion.div>
  )
}
