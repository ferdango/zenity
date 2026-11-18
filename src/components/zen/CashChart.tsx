import { motion } from 'motion/react'
import { type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import type { CashPoint } from '../../domain/cashflow'
import { fmtDiaMes } from '../../domain/util'
import { formatAxis, formatMoney } from '../../lib/format'
import { ease } from '../../lib/motion'
import styles from './zen.module.css'

const H = 240
const PAD = { top: 16, right: 12, bottom: 28, left: 52 }

function niceStep(range: number) {
  const raw = range / 4
  const pow = 10 ** Math.floor(Math.log10(Math.max(1, raw)))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/** Saldo proyectado: escenario base, banda hasta el pesimista y línea del colchón mínimo. */
export function CashChart({ serie, colchon, alerta }: { serie: CashPoint[]; colchon: number; alerta?: string | null }) {
  const gradId = useId()
  const [hover, setHover] = useState<number | null>(null)
  // El ancho real del contenedor: así los textos del gráfico siempre miden lo mismo en pantalla
  const ref = useRef<HTMLElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(280, Math.round(el.clientWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const values = serie.flatMap((p) => [p.base, p.pesimista]).concat(colchon, 0)
  const step = niceStep(Math.max(...values) - Math.min(...values))
  const min = Math.floor(Math.min(...values) / step) * step
  const max = Math.ceil((Math.max(...values) * 1.04) / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + 1; v += step) ticks.push(v)
  const x = (i: number) => PAD.left + (i / Math.max(1, serie.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * (H - PAD.top - PAD.bottom)
  const line = (key: 'base' | 'pesimista') => serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const band = `${line('base')} ${[...serie].reverse().map((p, i) => `L${x(serie.length - 1 - i).toFixed(1)},${y(p.pesimista).toFixed(1)}`).join(' ')} Z`
  const every = Math.max(1, Math.round(serie.length / Math.max(3, Math.floor(W / 90))))
  const alertIndex = alerta ? serie.findIndex((p) => p.fecha === alerta) : -1

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (serie.length - 1))
    setHover(Math.max(0, Math.min(serie.length - 1, i)))
  }
  const h = hover !== null ? serie[hover] : null

  return (
    <figure ref={ref} className={styles.chart} aria-label="Proyección del saldo de caja">
       <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4285f4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9b72cb" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--z-divider)" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--z-on-surface-low)">
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {min < 0 && <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--z-outline)" strokeWidth="1" />}
        <motion.path d={band} fill={`url(#${gradId})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <line x1={PAD.left} x2={W - PAD.right} y1={y(colchon)} y2={y(colchon)} stroke="var(--z-negative)" strokeDasharray="6 5" strokeWidth="1.5" />
        <text x={W - PAD.right} y={y(colchon) - 6} textAnchor="end" fontSize="11" fill="var(--z-negative)">
          Colchón {formatAxis(colchon)}
        </text>
        <motion.path
          d={line('pesimista')}
          fill="none"
          stroke="var(--z-warning)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: ease.emphasized }}
        />
        <motion.path
          d={line('base')}
          fill="none"
          stroke="var(--z-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: ease.emphasized }}
        />
        {alertIndex >= 0 && (
          <g>
            <circle cx={x(alertIndex)} cy={y(serie[alertIndex].base)} r="6" fill="var(--z-negative)" />
            <circle cx={x(alertIndex)} cy={y(serie[alertIndex].base)} r="11" fill="none" stroke="var(--z-negative)" strokeOpacity="0.5" />
          </g>
        )}
        {serie.map((p, i) =>
          i % every === 0 ? (
            <text key={p.fecha} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--z-on-surface-low)">
              {fmtDiaMes(p.fecha)}
            </text>
          ) : null,
        )}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--z-outline)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.base)} r="4.5" fill="var(--z-primary)" />
            <g transform={`translate(${Math.min(x(hover) + 10, W - 170)}, ${PAD.top + 4})`}>
              <rect width="160" height="54" rx="8" fill="var(--z-surface-highest)" />
              <text x="10" y="18" fontSize="12" fill="var(--z-on-surface)">
                {fmtDiaMes(h.fecha)}
              </text>
              <text x="10" y="34" fontSize="12" fill="var(--z-primary)">
                Base {formatMoney(h.base)}
              </text>
              <text x="10" y="48" fontSize="12" fill="var(--z-warning)">
                Pesimista {formatMoney(h.pesimista)}
              </text>
            </g>
          </g>
        )}
      </svg>
      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--z-primary)' }} /> Escenario base
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--z-warning)' }} /> Pesimista
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--z-negative)' }} /> Colchón mínimo
        </span>
      </figcaption>
    </figure>
  )
}
