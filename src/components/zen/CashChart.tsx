import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { type CashPoint, semanasDeCaja, tramoBajoColchon } from '../../domain/cashflow'
import { fmtDiaMes, fmtSolesCorto } from '../../domain/util'
import { ease } from '../../lib/motion'
import styles from './zen.module.css'

const H = 200
const PAD = { top: 30, right: 6, bottom: 26, left: 6 }

/**
 * Caja de las próximas semanas, para leerla en 5 segundos: una barra por semana con lo más bajo que
 * llega la caja (blanca sobre el colchón, coral debajo), la línea del colchón y una sola cifra: el
 * punto más bajo. Sin ejes de montos ni leyenda.
 */
export function CashChart({ serie, colchon }: { serie: CashPoint[]; colchon: number }) {
  const [activa, setActiva] = useState<number | null>(null)
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

  const semanas = semanasDeCaja(serie)
  const valores = semanas.map((s) => s.minimo.base)
  // Las barras nacen en 0 (o en el mínimo, si la caja se vuelve negativa)
  const piso = Math.min(0, ...valores)
  const techo = Math.max(...valores, colchon) * 1.08
  const y = (v: number) => PAD.top + ((techo - v) / (techo - piso || 1)) * (H - PAD.top - PAD.bottom)
  const ancho = W - PAD.left - PAD.right
  const hueco = ancho / semanas.length
  const barW = Math.min(36, hueco * 0.62)
  const cx = (i: number) => PAD.left + hueco * (i + 0.5)
  const yColchon = y(colchon)
  const yCero = y(0)

  const iMin = valores.indexOf(Math.min(...valores))
  const etiquetaCada = hueco >= 38 ? 1 : 2
  const anclar = (i: number) => (cx(i) > W - 60 ? 'end' : cx(i) < 60 ? 'start' : 'middle')
  const sel = activa !== null ? semanas[activa] : null

  const tramo = tramoBajoColchon(serie, colchon)
  const resumen = tramo
    ? `Tu caja queda bajo tu colchón de ${fmtSolesCorto(Math.round(colchon))} del ${fmtDiaMes(tramo.desde)} al ${fmtDiaMes(tramo.hasta)}. Lo más bajo: ${fmtSolesCorto(Math.round(valores[iMin]))} la semana del ${fmtDiaMes(semanas[iMin].desde)}.`
    : `Tu caja no baja de tu colchón de ${fmtSolesCorto(Math.round(colchon))}.`

  return (
    <figure ref={ref} className={styles.chart} aria-label={`Caja de las próximas semanas. ${resumen}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-hidden onPointerLeave={() => setActiva(null)}>
        {/* Base y colchón */}
        <line x1={PAD.left} x2={W - PAD.right} y1={yCero} y2={yCero} stroke="var(--z-outline)" />
        {semanas.map((s, i) => {
          const v = s.minimo.base
          const bajo = v < colchon
          const top = Math.min(y(v), yCero)
          const alto = Math.max(2, Math.abs(yCero - y(v)))
          return (
            <g key={s.desde} onPointerEnter={() => setActiva(i)} onClick={() => setActiva(i)} style={{ cursor: 'pointer' }}>
              {/* Zona de toque de toda la columna */}
              <rect x={cx(i) - hueco / 2} y={PAD.top - 20} width={hueco} height={H - PAD.top} fill="transparent" />
              <motion.rect
                x={cx(i) - barW / 2}
                width={barW}
                rx={Math.min(8, barW / 3)}
                fill={bajo ? 'var(--z-negative)' : 'var(--z-primary)'}
                fillOpacity={activa === null || activa === i ? 1 : 0.55}
                initial={{ y: yCero, height: 0 }}
                animate={{ y: top, height: alto }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: ease.emphasized }}
              />
              {(i % etiquetaCada === 0 || i === iMin) && (
                <text x={cx(i)} y={H - 7} textAnchor="middle" fontSize="11" fill="var(--z-on-surface-low)" fontWeight={i === iMin ? 700 : 400}>
                  {i === 0 ? 'Hoy' : fmtDiaMes(s.desde)}
                </text>
              )}
            </g>
          )
        })}

        <line x1={PAD.left} x2={W - PAD.right} y1={yColchon} y2={yColchon} stroke="var(--z-negative)" strokeDasharray="5 5" strokeWidth="1.5" pointerEvents="none" />
        {/* Etiqueta del colchón sobre una píldora, para leerse aunque pase sobre una barra */}
        {/* …y del lado contrario a la semana más baja, para no chocar con su cifra */}
        <g transform={`translate(${cx(iMin) > W / 2 ? PAD.left + 118 : W - PAD.right}, ${yColchon})`} pointerEvents="none">
          <rect x={-118} y={-11} width={118} height={22} rx={11} fill="var(--z-surface-highest)" />
          <text x={-59} y={4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--z-negative)">
            Tu colchón {fmtSolesCorto(Math.round(colchon))}
          </text>
        </g>

        {/* Una sola cifra: la semana más baja (o la que toca el dueño) */}
        {(() => {
          const i = activa ?? iMin
          const v = semanas[i].minimo.base
          return (
            <text
              x={cx(i)}
              y={Math.min(y(v), yCero) - 8}
              textAnchor={anclar(i)}
              fontSize="12"
              fontWeight="700"
              fill={v < colchon ? 'var(--z-negative)' : 'var(--z-on-surface)'}
              pointerEvents="none"
            >
              {fmtSolesCorto(Math.round(v))}
            </text>
          )
        })()}
      </svg>
      <figcaption className={styles.chartPie}>
        {sel
          ? `Semana del ${fmtDiaMes(sel.desde)}: lo más bajo es ${fmtSolesCorto(Math.round(sel.minimo.base))} el ${fmtDiaMes(sel.minimo.fecha)}.`
          : 'Cada barra es lo más bajo que llega tu caja esa semana.'}
      </figcaption>
    </figure>
  )
}
