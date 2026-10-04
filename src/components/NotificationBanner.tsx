import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ease, spring } from '../lib/motion'
import { Icon } from './Icon'
import styles from './NotificationBanner.module.css'

interface NotificationBannerProps {
  open: boolean
  /** App que "recibe" la notificación (Mensajes, Correo…) */
  app: string
  icon: string
  tone: 'sms' | 'mail'
  title: string
  children: ReactNode
  /** Texto completo para lectores de pantalla */
  label: string
  onPress: () => void
  onDismiss: () => void
}

/** Notificación simulada del sistema que entra desde arriba; se descarta deslizándola hacia arriba. */
export function NotificationBanner({ open, app, icon, tone, title, children, label, onPress, onDismiss }: NotificationBannerProps) {
  // Un arrastre no debe contar como toque
  const dragged = useRef(false)

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.button
          type="button"
          className={styles.banner}
          aria-label={label}
          initial={{ y: -120, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, transition: { duration: 0.25, ease: ease.accelerate } }}
          transition={spring.soft}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.7, bottom: 0.08 }}
          onDragStart={() => {
            dragged.current = true
          }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -24 || info.velocity.y < -250) onDismiss()
            window.setTimeout(() => {
              dragged.current = false
            }, 0)
          }}
          onClick={() => {
            if (!dragged.current) onPress()
          }}
        >
          <span className={styles.appIcon} data-tone={tone}>
            <Icon name={icon} size={20} fill />
          </span>
          <span className={styles.content}>
            <span className={styles.meta}>
              <span>{app}</span>
              <span>ahora</span>
            </span>
            <span className={styles.title}>{title}</span>
            <span className={styles.body}>{children}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  )
}
