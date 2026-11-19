import { motion } from 'motion/react'
import { type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { type CashPoint, tramoBajoColchon } from '../../domain/cashflow'
import { fmtDiaMes, fmtSolesCorto } from '../../domain/util'
import { ease } from '../../lib/motion'
import styles from './zen.module.css'

const H = 200
const PAD = { top: 34, right: 14, bottom: 26, left: 14 }
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Saldo proyectado, para leerlo en 5 segundos: una sola línea (blanca sobre el colchón, coral debajo),
 * la zona de riesgo sombreada y solo dos etiquetas (hoy y el punto más bajo). Sin ejes ni leyenda.
 */
export function CashChart({ serie, colchon }: { serie: CashPoint[]; colchon: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [hover, setHover] = useState<number | null>(null)
  // El ancho real del contenedor: así los textos del gráfico siempre miden lo mismo en pantalla
  const ref = useRef<HTMLElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(260, Math.round(el.clientWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const bases = serie.map((p) => p.base)
  const lo = Math.min(...bases, colchon)
  const hi = Math.max(...bases, colchon)
  const margen = (hi - lo) * 0.12 || 1
  // Abajo hay más aire: ahí va la etiqueta del punto más bajo, sin chocar con los meses
  const min = lo - margen * 2.6
  const max = hi + margen
  const x = (i: number) => PAD.left + (i / Math.max(1, serie.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((max - v) / (max - min)) * (H - PAD.top - PAD.bottom)
  const linea = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.base).toFixed(1)}`).join(' ')
  const area = `${linea} L${x(serie.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`
  const yColchon = y(colchon)

  const iMin = bases.indexOf(Math.min(...bases))
  const bajo = serie[iMin].base < colchon
  const cerca = (i: number) => (x(i) > W - 110 ? 'end' : x(i) < 110 ? 'start' : 'middle')
  // Marcas de mes («dic», «ene») en el primer día de cada mes, lejos de «Hoy»
  const meses = serie.flatMap((p, i) => (i > 0 && p.fecha.endsWith('-01') && x(i) - x(0) > 44 ? [{ i, texto: MESES[Number(p.fecha.slice(5, 7)) - 1] }] : []))

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (serie.length - 1))
    setHover(Math.max(0, Math.min(serie.length - 1, i)))
  }
  const h = hover !== null ? serie[hover] : null
  const tramo = tramoBajoColchon(serie, colchon)
  const resumen = tramo
    ? `Tu caja queda bajo tu colchón de ${fmtSolesCorto(Math.round(colchon))} del ${fmtDiaMes(tramo.desde)} al ${fmtDiaMes(tramo.hasta)}. El punto más bajo es ${fmtSolesCorto(Math.round(serie[iMin].base))} el ${fmtDiaMes(serie[iMin].fecha)}.`
    : `Tu caja no baja de tu colchón de ${fmtSolesCorto(Math.round(colchon))}.`

  return (
    <figure ref={ref} className={styles.chart} aria-label={`Proyección del saldo de caja. ${resumen}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-hidden onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--z-chart-band, #7c4dff)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--z-chart-band, #7c4dff)" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`${id}-arriba`}>
            <rect x="0" y="0" width={W} height={yColchon} />
          </clipPath>
          <clipPath id={`${id}-abajo`}>
            <rect x="0" y={yColchon} width={W} height={H - yColchon} />
          </clipPath>
        </defs>

        {/* Zona de riesgo: debajo del colchón */}
        <rect x={PAD.left} y={yColchon} width={W - PAD.left - PAD.right} height={H - PAD.bottom - yColchon} rx="6" fill="var(--z-negative)" opacity="0.14" />
        <line x1={PAD.left} x2={W - PAD.right} y1={yColchon} y2={yColchon} stroke="var(--z-negative)" strokeDasharray="5 5" strokeWidth="1.5" />
        <text x={PAD.left + 6} y={yColchon + 15} textAnchor="start" fontSize="11" fontWeight="600" fill="var(--z-negative)">
          Tu colchón {fmtSolesCorto(Math.round(colchon))}
        </text>

        <motion.path d={area} fill={`url(#${id}-area)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        {/* La misma línea dos veces: blanca sobre el colchón y coral debajo */}
        {(['arriba', 'abajo'] as const).map((zona) => (
          <motion.path
            key={zona}
            d={linea}
            fill="none"
            stroke={zona === 'arriba' ? 'var(--z-primary)' : 'var(--z-negative)'}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#${id}-${zona})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: ease.emphasized }}
          />
        ))}

        {/* Hoy */}
        <circle cx={x(0)} cy={y(serie[0].base)} r="5" fill="var(--z-primary)" />
        <text x={x(0)} y={PAD.top - 14} textAnchor="start" fontSize="12" fontWeight="600" fill="var(--z-on-surface)">
          Hoy {fmtSolesCorto(Math.round(serie[0].base))}
        </text>

        {/* Punto más bajo */}
        <circle cx={x(iMin)} cy={y(serie[iMin].base)} r="6" fill={bajo ? 'var(--z-negative)' : 'var(--z-primary)'} />
        <circle cx={x(iMin)} cy={y(serie[iMin].base)} r="11" fill="none" stroke={bajo ? 'var(--z-negative)' : 'var(--z-primary)'} strokeOpacity="0.45" />
        <text x={x(iMin)} y={y(serie[iMin].base) + 24} textAnchor={cerca(iMin)} fontSize="12" fontWeight="700" fill={bajo ? 'var(--z-negative)' : 'var(--z-on-surface)'}>
          {fmtDiaMes(serie[iMin].fecha)} · {fmtSolesCorto(Math.round(serie[iMin].base))}
        </text>

        {/* Eje de tiempo mínimo: hoy y el inicio de cada mes */}
        <text x={x(0)} y={H - 6} textAnchor="start" fontSize="11" fill="var(--z-on-surface-low)">
          Hoy
        </text>
        {meses.map((m) => (
          <g key={m.i}>
            <line x1={x(m.i)} x2={x(m.i)} y1={H - PAD.bottom} y2={H - PAD.bottom + 4} stroke="var(--z-outline)" />
            <text x={x(m.i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--z-on-surface-low)">
              {m.texto}
            </text>
          </g>
        ))}

        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top - 10} y2={H - PAD.bottom} stroke="var(--z-outline)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.base)} r="4.5" fill={h.base < colchon ? 'var(--z-negative)' : 'var(--z-primary)'} />
            <g transform={`translate(${Math.min(Math.max(x(hover) - 60, 4), W - 124)}, 2)`}>
              <rect width="120" height="26" rx="8" fill="var(--z-surface-highest)" />
              <text x="60" y="17" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--z-on-surface)">
                {fmtDiaMes(h.fecha)} · {fmtSolesCorto(Math.round(h.base))}
              </text>
            </g>
          </g>
        )}
      </svg>
    </figure>
  )
}
