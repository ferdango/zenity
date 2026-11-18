/** Piezas de UI de la primera ola: confianza, motivo, microlecciones, barras y estados vacíos. */
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { HOY } from '../../config/demo'
import { contenido } from '../../domain/lessons'
import { nivel } from '../../domain/categorization'
import type { LessonId } from '../../domain/types'
import { fmtFecha } from '../../domain/util'
import { formatMoney } from '../../lib/format'
import { ease } from '../../lib/motion'
import { useApp } from '../../state/context'
import { cerrarLeccion, registrarLeccion, useDemoState } from '../../state/demoStore'
import { useLecciones } from '../../state/useZen'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Spark } from '../Spark'
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

export function Money({ value, sign = 'auto', className }: { value: number; sign?: 'auto' | 'always' | 'never'; className?: string }) {
  const { hideBalances } = useApp()
  return <span className={className}>{hideBalances ? 'S/ ••••' : formatMoney(value, sign)}</span>
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
  const visible = !!lecciones && (force || (activa && !cerrada))

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

export function LinkRow({ to, icon, title, sub, end }: { to: string; icon: string; title: ReactNode; sub?: ReactNode; end?: ReactNode }) {
  return (
    <Link to={to} className={styles.row} data-ripple="">
      <span className={styles.rowIcon}>
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
