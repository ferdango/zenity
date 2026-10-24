import { Link } from 'react-router'
import { cn } from '../lib/cn'
import { Amount } from './Amount'
import { Icon } from './Icon'
import styles from './Metrics.module.css'

interface SummaryTileProps {
  kind: 'income' | 'expense' | 'total' | 'tax'
  label: string
  value: number
  /** Respuesta en palabras simples: "Entró en marzo", "Te queda en marzo" */
  caption: string
  to: string
  delta?: number | null
  /** Píldora junto al monto: "Margen 53%" */
  status?: { label: string; icon?: string; negative?: boolean }
}

const ICONS = { income: 'trending_up', expense: 'trending_down', total: 'savings', tax: 'account_balance' } as const

/**
 * Tiles principales del Inicio: ingresos, egresos y utilidad (e impuestos SUNAT).
 * Dos líneas por tile para que se lean de un vistazo.
 */
export function SummaryTile({ kind, label, value, caption, to, delta, status }: SummaryTileProps) {
  return (
    <Link to={to} className={cn(styles.summary, styles[kind])} data-ripple="">
      <span className={styles.summaryIcon} aria-hidden>
        <Icon name={ICONS[kind]} size={22} weight={500} />
      </span>
      <span className={styles.summaryText}>
        <span className={styles.summaryHead}>
          <span className={styles.summaryLabel}>{label}</span>
          <span className={styles.summaryCaption}>{caption}</span>
        </span>
        <span className={styles.summaryLine}>
          <Amount value={value} className={styles.summaryValue} sign={kind === 'total' ? 'always' : 'never'} />
          {delta !== undefined && delta !== null && (
            <span className={styles.delta} data-negative={kind === 'expense' ? delta > 0 : delta < 0}>
              <Icon name={delta >= 0 ? 'arrow_upward' : 'arrow_downward'} size={13} weight={600} />
              {Math.abs(delta)}%<span className="visually-hidden"> vs. mes anterior</span>
            </span>
          )}
          {status && (
            <span className={cn(styles.delta, !status.icon && styles.deltaPlain)} data-negative={Boolean(status.negative)}>
              {status.icon && <Icon name={status.icon} size={13} weight={600} />}
              {status.label}
            </span>
          )}
        </span>
      </span>
      <Icon name="chevron_right" size={20} className={styles.summaryArrow} />
    </Link>
  )
}

interface SecondaryTileProps {
  kind: 'receivable' | 'payable'
  label: string
  value: number
  to: string
  /** Una línea de estado: "2 vencidas", "Al día" */
  status: { label: string; negative?: boolean }
}

/** Tiles secundarios del Inicio (por cobrar y por pagar): más discretos que los principales. */
export function SecondaryTile({ kind, label, value, to, status }: SecondaryTileProps) {
  return (
    <Link to={to} className={styles.secondary} data-ripple="">
      <span className={styles.secondaryHead}>
        <Icon name={kind === 'receivable' ? 'call_received' : 'call_made'} size={18} className={styles.secondaryIcon} />
        {label}
        <Icon name="chevron_right" size={18} className={styles.secondaryArrow} />
      </span>
      <Amount value={value} className={styles.secondaryValue} />
      <span className={styles.secondaryStatus} data-negative={Boolean(status.negative)}>
        {status.label}
      </span>
    </Link>
  )
}

interface MetricCardProps {
  label: string
  value: number
  caption?: string
  icon?: 'up' | 'down'
  tone?: 'neutral' | 'auto'
  size?: 'md' | 'lg'
  outlined?: boolean
  sign?: 'auto' | 'always' | 'never'
}

/** Tarjetas de métricas (Balance, Ingresos, Egresos) de Movimientos y Conexión. */
export function MetricCard({ label, value, caption, icon, tone = 'neutral', size = 'md', outlined, sign = 'never' }: MetricCardProps) {
  const iconNode = icon && (
    <Icon
      name={icon === 'up' ? 'trending_up' : 'trending_down'}
      size={size === 'lg' ? 36 : 26}
      weight={300}
      className={styles.metricIcon}
      style={{ color: icon === 'up' ? 'var(--z-positive)' : 'var(--z-negative)' }}
    />
  )
  return (
    <div className={cn(styles.metric, size === 'lg' && styles.metricLarge, outlined && styles.metricOutlined)}>
      {size !== 'lg' && iconNode}
      <div style={{ display: 'grid', minWidth: 0 }}>
        <span className={styles.metricLabel}>{label}</span>
        <Amount value={value} tone={tone} sign={sign} className={styles.metricValue} />
        {caption && <span className={styles.metricCaption}>{caption}</span>}
      </div>
      {size === 'lg' && iconNode}
    </div>
  )
}
