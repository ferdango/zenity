import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { ease, fadeUp, spring, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './NotificationsPrompt.module.css'

/** Permiso de notificaciones (Figma: Notifications) como hoja inferior. */
export function NotificationsPrompt() {
  const navigate = useNavigate()
  const { toast } = useApp()
  const [busy, setBusy] = useState(false)

  const enable = async () => {
    setBusy(true)
    let granted = false
    try {
      if ('Notification' in window) granted = (await Notification.requestPermission()) === 'granted'
    } catch {
      granted = false
    }
    toast(granted ? 'Notificaciones activadas' : 'Te avisaremos dentro de la app', granted ? 'notifications_active' : 'notifications')
    navigate('/inicio', { replace: true })
  }

  return (
    <div className={styles.screen}>
      <Aurora placement="full" fixed />

      <div className={styles.illustration} aria-hidden>
        <div className={styles.bellWrap}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={styles.ring}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 2.1], opacity: [0.7, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
            />
          ))}
          <motion.span
            className={styles.bell}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: [0, -14, 12, -8, 6, 0] }}
            transition={{ scale: spring.bouncy, rotate: { delay: 0.5, duration: 1, ease: 'easeInOut' } }}
          >
            <Icon name="notifications_active" size={44} fill />
          </motion.span>
        </div>
      </div>

      <motion.section
        className={styles.sheet}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ ...spring.soft, delay: 0.15 }}
        aria-labelledby="notif-title"
      >
        <motion.div variants={staggerContainer(0.07, 0.35)} initial="hidden" animate="show" style={{ display: 'grid', gap: 12 }}>
          <motion.div className={styles.preview} variants={fadeUp} aria-hidden>
            <Spark size={28} />
            <span className={styles.previewText}>
              <strong className="t-strong">Zenity · ahora</strong>
              <span className="t-variant">Tus cobros de marzo crecieron 18%</span>
            </span>
          </motion.div>
          <motion.h1 id="notif-title" className={styles.title} variants={fadeUp}>
            ¡No te pierdas nada!
          </motion.h1>
          <motion.p className={styles.text} variants={fadeUp}>
            Activa las notificaciones push para que estés al tanto de las actualizaciones de tus cuentas.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button size="lg" fullWidth loading={busy} onClick={enable} icon="notifications">
              Activar notificaciones
            </Button>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ ease: ease.decelerate }}>
            <Button variant="text" size="lg" fullWidth onClick={() => navigate('/inicio', { replace: true })}>
              Recordármelo más tarde
            </Button>
          </motion.div>
        </motion.div>
      </motion.section>
    </div>
  )
}
