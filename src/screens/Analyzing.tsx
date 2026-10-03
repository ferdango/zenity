import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { SkeletonLines } from '../components/AiText'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Analyzing.module.css'

const STEPS = ['Analizando tu información', 'Leyendo movimientos', 'Clasificando transacciones', 'Generando balances']
const STEP_MS = 1500

/** Análisis con IA en 4 pasos (Figma: Loading ×4) y paso a "Por revisar". */
export function Analyzing() {
  const navigate = useNavigate()
  const { finishSync } = useApp()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = STEPS.map((_, i) => window.setTimeout(() => setStep(i), i * STEP_MS))
    timers.push(
      window.setTimeout(() => {
        finishSync()
        navigate('/revisar', { replace: true })
      }, STEPS.length * STEP_MS + 400),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [navigate, finishSync])

  const skip = () => {
    finishSync()
    navigate('/revisar', { replace: true })
  }

  return (
    <div className={styles.screen}>
      <Aurora placement="full" intense fixed />

      <div className={styles.top}>
        <Button variant="text" size="sm" onClick={skip} trailingIcon="skip_next">
          Omitir
        </Button>
      </div>

      <div className={styles.stage} aria-hidden>
        <div className={styles.sparkWrap}>
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className={styles.ring}
              animate={{ scale: [0.6, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
            />
          ))}
          <Spark size={96} state="thinking" animateIn />
        </div>
      </div>

      <div className={styles.bottom}>
        <ul className={styles.checklist} aria-label="Pasos completados">
          <AnimatePresence initial={false}>
            {STEPS.slice(0, step).map((label) => (
              <motion.li
                key={label}
                className={styles.check}
                initial={{ opacity: 0, height: 0, y: 8 }}
                animate={{ opacity: 1, height: 'auto', y: 0, transition: { duration: 0.4, ease: ease.decelerate } }}
              >
                <Icon name="check_circle" size={20} fill style={{ color: 'var(--z-positive)' }} />
                {label}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <h1 className={styles.stepTitle} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.span
              key={STEPS[step]}
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: ease.decelerate } }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.25, ease: ease.accelerate } }}
              className={`fx-shimmer-text ${styles.shimmer}`}
            >
              {STEPS[step]}
            </motion.span>
          </AnimatePresence>
        </h1>

        <SkeletonLines lines={3} className={styles.lines} />

        <div
          className={styles.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Progreso del análisis"
        >
          <motion.span
            className={styles.bar}
            initial={{ width: '6%' }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: STEP_MS / 1000, ease: ease.emphasized }}
          />
        </div>
      </div>
    </div>
  )
}
