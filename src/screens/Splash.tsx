import { motion } from 'motion/react'
import { GradientText } from '../components/AiText'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { cn } from '../lib/cn'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import styles from './Splash.module.css'

const FLOATING = [
  { className: styles.f1, icon: 'trending_up', text: '+12% ingresos', color: 'var(--z-positive)', delay: 0.9 },
  { className: styles.f2, icon: 'account_balance_wallet', text: 'S/ 3,890.20', color: 'var(--z-primary)', delay: 1.05 },
  { className: styles.f3, icon: 'auto_awesome', text: '8 por revisar', color: 'var(--z-purple)', delay: 1.2 },
]

/** Splash / bienvenida (Figma: Splash). */
export function Splash() {
  return (
    <div className={styles.splash}>
      <Aurora placement="bottom" fixed />

      <div className={styles.hero}>
        <motion.span
          className={styles.halo}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: [1, 1.12, 1] }}
          transition={{ opacity: { duration: 1 }, scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        />
        <div className={styles.brand}>
          <Spark size={76} animateIn />
          <motion.span
            className={styles.wordmark}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.35, duration: 0.7, ease: ease.decelerate }}
          >
            Zenity
          </motion.span>
        </div>

        {FLOATING.map((f, i) => (
          <motion.span
            key={f.text}
            className={cn(styles.floating, f.className)}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
            transition={{
              opacity: { delay: f.delay, duration: 0.5 },
              scale: { delay: f.delay, duration: 0.5, ease: ease.decelerate },
              y: { delay: f.delay, duration: 4 + i, repeat: Infinity, ease: 'easeInOut' },
            }}
            aria-hidden
          >
            <span className={styles.dot} style={{ color: f.color }}>
              <Icon name={f.icon} size={16} />
            </span>
            {f.text}
          </motion.span>
        ))}
      </div>

      <motion.div className={styles.bottom} variants={staggerContainer(0.08, 0.5)} initial="hidden" animate="show">
        <motion.h1 className={styles.title} variants={fadeUp}>
          Conecta tus finanzas <GradientText>en un solo lugar</GradientText>
        </motion.h1>
        <motion.p className={styles.subtitle} variants={fadeUp}>
          Tu asistente con IA para entender ingresos, egresos y balances de todas tus cuentas.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Button size="lg" fullWidth to="/login?modo=registro">
            Regístrate ahora
          </Button>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Button size="lg" fullWidth variant="outlined" to="/login">
            Conectarse
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
