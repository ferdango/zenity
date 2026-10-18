import { motion } from 'motion/react'
import { AccountSheet } from '../components/AccountSheet'
import { BottomSheet } from '../components/BottomSheet'
import { BusinessPicker } from '../components/Business'
import { Icon } from '../components/Icon'
import { NOTIFICATIONS } from '../data/mock'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './GlobalSheets.module.css'

/** Hojas globales abiertas desde el menú o la campana: negocios, notificaciones y ajustes de la cuenta. */
export function GlobalSheets() {
  const { sheet, openSheet } = useApp()
  const close = () => openSheet(null)

  return (
    <>
      <BottomSheet open={sheet === 'notifications'} onClose={close} title="Notificaciones">
        <motion.ul className={styles.list} variants={staggerContainer(0.05, 0.1)} initial="hidden" animate="show">
          {NOTIFICATIONS.map((n) => (
            <motion.li key={n.id} className={styles.notification} variants={fadeUp}>
              <span className={cn(styles.notifIcon, styles[n.tone])}>
                <Icon name={n.icon} size={20} fill gradient={n.tone === 'ai'} />
              </span>
              <span>
                <span className="t-body-l" style={{ display: 'block' }}>
                  {n.title}
                </span>
                <span className="t-body-s t-low">{n.time}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </BottomSheet>

      <BottomSheet open={sheet === 'businesses'} onClose={close} title="Tus negocios">
        <BusinessPicker onDone={close} />
      </BottomSheet>

      <AccountSheet />
    </>
  )
}
