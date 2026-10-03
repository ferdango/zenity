import { motion } from 'motion/react'
import { useId } from 'react'
import { formatAxis } from '../lib/format'
import { spring } from '../lib/motion'
import styles from './BarChart.module.css'

interface BarChartProps {
  data: Array<{ label: string; value: number }>
  selected: number
  onSelect: (index: number) => void
  formatValue: (value: number) => string
  /** Nombre accesible del gráfico */
  label: string
}

function niceMax(value: number) {
  const step = value > 4000 ? 1000 : value > 1500 ? 500 : 250
  return Math.ceil((value * 1.02) / step) * step
}

/** Gráfico de barras animado: las barras crecen con resorte y el tooltip sigue a la selección. */
export function BarChart({ data, selected, onSelect, formatValue, label }: BarChartProps) {
  const tooltipId = useId()
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i))

  return (
    <figure className={styles.chart} aria-label={label}>
      <div className={styles.axis} aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{formatAxis(t)}</span>
        ))}
      </div>
      <div className={styles.plot}>
        <div className={styles.grid} aria-hidden>
          {ticks.map((t) => (
            <span key={t} />
          ))}
        </div>
        {data.map((d, i) => {
          const isSelected = i === selected
          const pct = Math.max(4, (d.value / max) * 100)
          return (
            <button
              key={d.label}
              type="button"
              className={styles.col}
              aria-pressed={isSelected}
              aria-label={`${d.label}: ${formatValue(d.value)}`}
              onClick={() => onSelect(i)}
            >
              <span className={styles.track}>
                {isSelected && (
                  <motion.span
                    layoutId={tooltipId}
                    className={styles.tooltip}
                    style={{ bottom: `calc(${pct}% + 8px)` }}
                    transition={spring.snappy}
                  >
                    {formatValue(d.value)}
                  </motion.span>
                )}
                <motion.span
                  className={styles.bar}
                  initial={{ height: '0%' }}
                  animate={{ height: `${pct}%` }}
                  transition={{ ...spring.soft, delay: i * 0.05 }}
                />
              </span>
              <span className={styles.label}>{d.label}</span>
            </button>
          )
        })}
      </div>
    </figure>
  )
}
