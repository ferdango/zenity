import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ease } from '../lib/motion'
import { useOverlay } from '../lib/useOverlay'
import styles from './Overlay.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  icon?: ReactNode
  title: string
  children?: ReactNode
  actions: ReactNode
}

/** Diálogo básico de Material 3 con entrada en escala + desvanecido. */
export function Dialog({ open, onClose, icon, title, children, actions }: DialogProps) {
  const panelRef = useOverlay(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <div className={styles.dialogWrap} key="dialog">
            <motion.div
              ref={panelRef}
              role="alertdialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              className={styles.dialog}
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: ease.decelerate } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: ease.accelerate } }}
            >
              {icon && <div className={styles.dialogIcon}>{icon}</div>}
              <h2 className={styles.dialogTitle}>{title}</h2>
              {children && <div className={styles.dialogText}>{children}</div>}
              <div className={styles.dialogActions}>{actions}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
