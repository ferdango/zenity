/** Piezas de UI de la primera ola: confianza, motivo, microlecciones, barras y estados vacíos. */
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { HOY } from '../../config/demo'
import { contenido } from '../../domain/lessons'
import { nivel } from '../../domain/categorization'
import type { LessonId } from '../../domain/types'
import { fmtFecha } from '../../domain/util'
import { FEATURES } from '../../lib/features'
import { formatMoney } from '../../lib/format'
import { ease, spring } from '../../lib/motion'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'
import { useApp } from '../../state/context'
import { cerrarLeccion, registrarLeccion, useDemoState } from '../../state/demoStore'
import { useLecciones } from '../../state/useZen'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Spark } from '../Spark'
import { TONE_CLASS, type Tone } from './tone'
import styles from './zen.module.css'


/** Insignia Alta / Media / Baja (F-02). */
export function ConfidenceBadge({ confianza, showPct = true }: { confianza: number; showPct?: boolean }) {
  const n = nivel(confianza)
  const cls = n === 'Alta' ? styles.alta : n === 'Media' ? styles.media : styles.baja
  return (
    <span className={`${styles.badge} ${cls}`} title={`Confianza ${Math.round(confianza * 100)}%`}>
      {n}
      {showPct && ` · ${Math.round(confianza * 100)}%`}
    </span>
  )
}

export function Pill({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'alta' | 'media' | 'baja' | 'info'; icon?: string }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

/** Botón «¿Por qué?» que muestra el motivo en una línea. */
export function Why({ motivo, defaultOpen = false }: { motivo: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button type="button" className={styles.why} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="help" size={16} />
        ¿Por qué?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            className={styles.whyText}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: ease.emphasized }}
          >
            <Spark size={16} />
            <span>{motivo}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className={styles.progress} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.span className={styles.progressFill} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: ease.decelerate }} />
    </div>
  )
}

export function Money({
  value,
  sign = 'auto',
  className,
  animated = false,
}: {
  value: number
  sign?: 'auto' | 'always' | 'never'
  className?: string
  /** Cuenta hasta el valor nuevo y da un pulso cuando cambia (montos grandes / hero) */
  animated?: boolean
}) {
  const { hideBalances } = useApp()
  if (animated && !hideBalances) return <AnimatedMoney value={value} sign={sign} className={className} />
  return <span className={className}>{hideBalances ? 'S/ ••••' : formatMoney(value, sign)}</span>
}

function AnimatedMoney({ value, sign, className }: { value: number; sign: 'auto' | 'always' | 'never'; className?: string }) {
  const format = useCallback((n: number) => formatMoney(Math.round(n * 100) / 100, sign), [sign])
  const ref = useAnimatedNumber<HTMLSpanElement>(value, format, { duration: 0.8 })
  const first = useRef(value)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    if (value !== first.current) setPulse((p) => p + 1)
    first.current = value
  }, [value])
  return (
    <motion.span
      key={pulse}
      className={className}
      style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}
      initial={pulse ? { scale: 1.06 } : false}
      animate={{ scale: 1 }}
      transition={spring.bouncy}
    >
      <span ref={ref} />
    </motion.span>
  )
}

export function SectionHead({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {action ?? (hint && <span className={styles.sectionHint}>{hint}</span>)}
    </div>
  )
}

/**
 * Microlección en contexto: aparece cuando su disparador ya ocurrió, se muestra una sola vez
 * (al cerrarla o leerla queda solo en Aprende) y registra los LessonEvent.
 */
export function LessonCard({ id, force = false }: { id: LessonId; force?: boolean }) {
  const { business } = useApp()
  const demo = useDemoState()
  const lecciones = useLecciones()
  const [abierta, setAbierta] = useState(false)
  const activa = lecciones?.activas.includes(id)
  const cerrada = demo.leccionesCerradas.includes(`${business.id}:${id}`)
  const visible = !!lecciones && (force || (FEATURES.lecciones && activa && !cerrada))

  useEffect(() => {
    if (visible) registrarLeccion(business.id, id, 'MOSTRADA')
  }, [visible, business.id, id])

  if (!visible || !lecciones) return null
  const c = contenido(id, lecciones.context)
  const leer = () => {
    setAbierta(true)
    registrarLeccion(business.id, id, 'LEIDA')
  }
  return (
    <motion.aside className={styles.lesson} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} aria-label={`Microlección: ${c.titulo}`}>
      <div className={styles.lessonHead}>
        <span className={styles.lessonKicker}>
          <Icon name="school" size={16} gradient />
          Aprende · 1 minuto
        </span>
        {!force && (
          <button type="button" aria-label="Cerrar lección" onClick={() => cerrarLeccion(business.id, id)} style={{ color: 'var(--z-on-surface-low)' }}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
      <p className={styles.lessonTitle}>{c.titulo}</p>
      {abierta || force ? (
        <>
          <p className={styles.lessonBody}>{c.cuerpo}</p>
          <div className={styles.lessonImpact}>
            <strong>¿Cómo te afecta?</strong>
            <span>{c.comoTeAfecta}</span>
          </div>
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="tonal"
              to={c.accion.to}
              onClick={() => {
                registrarLeccion(business.id, id, 'ACCION')
                if (!force) cerrarLeccion(business.id, id)
              }}
            >
              {c.accion.label}
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <Button size="sm" variant="tonal" icon="menu_book" onClick={leer}>
            Leer la lección
          </Button>
        </div>
      )}
    </motion.aside>
  )
}

/** Cuando el negocio activo no es de la demo (un RUC registrado), las funciones nuevas lo explican. */
export function NoDemoData({ feature }: { feature: string }) {
  const { businesses, switchBusiness } = useApp()
  const demo = businesses.find((b) => b.id === '20605125990')
  return (
    <div className={styles.empty}>
      <Icon name="dataset" size={40} />
      <p className="t-title-m">{feature} usa los datos de ejemplo de la demo</p>
      <p className={styles.muted}>Este RUC todavía no tiene movimientos de BCP, SIRE ni cobros digitales conectados.</p>
      {demo ? (
        <Button variant="tonal" onClick={() => switchBusiness(demo.id)}>
          Ver Ferretería San Martín
        </Button>
      ) : (
        <Button variant="tonal" to="/mas">
          Reiniciar demo desde «Más»
        </Button>
      )}
    </div>
  )
}

export function Hoy() {
  return <>{fmtFecha(HOY)}</>
}

export function LinkRow({ to, icon, title, sub, end, tone }: { to: string; icon: string; title: ReactNode; sub?: ReactNode; end?: ReactNode; tone?: Tone }) {
  return (
    <Link to={to} className={styles.row} data-ripple="">
      <span className={`${styles.rowIcon} ${tone ? TONE_CLASS[tone] : ''}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </span>
      <span className={styles.rowEnd}>{end ?? <Icon name="chevron_right" size={20} />}</span>
    </Link>
  )
}

/** Check que se dibuja dentro de un círculo (estado «listo» / completado). */
export function DoneCheck({ size = 72 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.bouncy}
    >
      <motion.circle
        cx="36"
        cy="36"
        r="32"
        fill="var(--z-positive-container, color-mix(in srgb, var(--z-positive) 16%, transparent))"
        stroke="var(--z-positive)"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: ease.emphasized }}
      />
      <motion.path
        d="M22 37 l10 10 l19 -21"
        fill="none"
        stroke="var(--z-positive)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.4, ease: ease.decelerate }}
      />
    </motion.svg>
  )
}
