import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import { Icon } from './Icon'
import styles from './Overlay.module.css'

/** Snackbars de Material 3 (superficie inversa) apilados en la parte inferior. */
export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return createPortal(
    <div className={styles.toaster} role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={styles.toast}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: ease.decelerate } }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.2, ease: ease.accelerate } }}
            onClick={() => dismissToast(t.id)}
          >
            {t.icon && <Icon name={t.icon} size={20} fill />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
