import { Link } from 'react-router'
import { cn } from '../lib/cn'
import { Amount } from './Amount'
import { Icon } from './Icon'
import styles from './Metrics.module.css'

interface SummaryTileProps {
  kind: 'income' | 'expense' | 'total'
  label: string
  value: number
  caption: string
  to: string
  delta?: number | null
}

const ICONS = { income: 'trending_up', expense: 'trending_down', total: 'savings' } as const

/** Tiles "Ingresos / Egresos / Total" del Inicio. */
export function SummaryTile({ kind, label, value, caption, to, delta }: SummaryTileProps) {
  return (
    <Link to={to} className={cn(styles.summary, styles[kind])} data-ripple="">
      <span className={styles.summaryIcon} aria-hidden>
        <Icon name={ICONS[kind]} size={26} weight={500} />
      </span>
      <span className={styles.summaryText}>
        <span className={styles.summaryLabel}>{label}</span>
        <Amount value={value} className={styles.summaryValue} sign={kind === 'total' ? 'always' : 'never'} />
        <span className={styles.summaryCaption}>
          {caption}
          {delta !== undefined && delta !== null && (
            <span className={styles.delta} data-negative={kind === 'expense' ? delta > 0 : delta < 0}>
              <Icon name={delta >= 0 ? 'arrow_upward' : 'arrow_downward'} size={13} weight={600} />
              {Math.abs(delta)}% vs. mes anterior
            </span>
          )}
        </span>
      </span>
      <span className={styles.summaryArrow} aria-hidden>
        <Icon name="arrow_forward" size={22} />
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
