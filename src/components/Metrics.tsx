import { Link } from 'react-router'
import { cn } from '../lib/cn'
import { Amount } from './Amount'
import { Icon } from './Icon'
import styles from './Metrics.module.css'

interface SummaryTileProps {
  kind: 'income' | 'expense' | 'total' | 'receivable' | 'payable' | 'tax'
  label: string
  value: number
  /** Respuesta en palabras simples: "Entró en marzo", "Te deben 4 clientes" */
  caption: string
  to: string
  delta?: number | null
  /** Píldora junto al monto: "Margen 53%", "2 vencidas", "Al día" */
  status?: { label: string; icon?: string; negative?: boolean }
}

const ICONS = {
  income: 'trending_up',
  expense: 'trending_down',
  total: 'savings',
  receivable: 'call_received',
  payable: 'call_made',
  tax: 'account_balance',
} as const

/**
 * Tiles del Inicio: ingresos, egresos, utilidad, por cobrar y por pagar (e impuestos SUNAT).
 * Dos líneas por tile para que las cinco respuestas entren juntas en la pantalla del celular.
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
