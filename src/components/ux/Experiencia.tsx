import { useState } from 'react'
import { ANILLOS, BLUEPRINT, CARRILES, ECOSISTEMA, FLUJOS, type FlujoEcosistema, JOURNEY } from '../../config/mapasUx'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon'
import styles from './ux.module.css'

/* ───────────────────────── Customer journey ───────────────────────── */

/** Curva suave (Catmull-Rom → Bézier) que pasa por los puntos. */
function curva(puntos: Array<[number, number]>): string {
  if (puntos.length < 2) return ''
  let d = `M${puntos[0][0]} ${puntos[0][1]}`
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i]
    const p1 = puntos[i]
    const p2 = puntos[i + 1]
    const p3 = puntos[i + 2] ?? p2
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`
  }
  return d
}

const CW = 1000
const CH = 196
const MID = CH / 2
const emoY = (e: number) => MID - e * 34

function CurvaEmocion() {
  const puntos = JOURNEY.map((e, i): [number, number] => [((i + 0.5) / JOURNEY.length) * CW, emoY(e.emocion)])
  return (
    <svg className={styles.emotion} viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Curva de emociones por etapa">
      <line x1="0" y1={MID} x2={CW} y2={MID} className={styles.midline} />
      <text x="6" y="16" className={styles.emoAxis}>
        Bien
      </text>
      <text x="6" y={CH - 6} className={styles.emoAxis}>
        Mal
      </text>
      <path d={curva(puntos)} className={styles.emoPath} />
      {JOURNEY.map((e, i) => {
        const [x, y] = puntos[i]
        const abajo = e.emocion < 0
        return (
          <g key={e.id}>
            {e.critico && <circle cx={x} cy={y} r="17" className={styles.emoHalo} />}
            <circle cx={x} cy={y} r={e.critico ? 9 : 7} className={e.critico ? styles.emoHot : styles.emoDot} />
            <text x={x} y={abajo ? y + (e.critico ? 34 : 28) : y - 16} textAnchor="middle" className={styles.emoLabel}>
              {e.emocionTexto}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function MapaJourney() {
  return (
    <div className={styles.scroller} tabIndex={0} aria-label="Customer journey (desliza para ver todas las etapas)">
      <div className={styles.journey}>
        <span className={styles.rowLabel} />
        {JOURNEY.map((e, i) => (
          <header key={e.id} className={cn(styles.stageHead, e.critico && styles.stageHot)}>
            <span className={styles.stageNum}>{i + 1}</span>
            {e.titulo}
          </header>
        ))}

        <span className={styles.rowLabel}>Lo que hace</span>
        {JOURNEY.map((e) => (
          <p key={e.id} className={styles.cell}>
            {e.hace}
          </p>
        ))}

        <span className={styles.rowLabel}>Lo que piensa</span>
        {JOURNEY.map((e) => (
          <p key={e.id} className={cn(styles.cell, styles.quote)}>
            {e.piensa}
          </p>
        ))}

        <span className={styles.rowLabel}>Cómo se siente</span>
        <div className={styles.emotionCell}>
          <CurvaEmocion />
        </div>

        <span className={styles.rowLabel}>Puntos de contacto</span>
        {JOURNEY.map((e) => (
          <div key={e.id} className={styles.chips}>
            {e.contacto.map((c) => (
              <span key={c} className={styles.tag}>
                {c}
              </span>
            ))}
          </div>
        ))}

        <span className={styles.rowLabel}>Dolor</span>
        {JOURNEY.map((e) => (
          <p key={e.id} className={cn(styles.cell, styles.cellPain)}>
            {e.dolor}
          </p>
        ))}

        <span className={styles.rowLabel}>Oportunidad</span>
        {JOURNEY.map((e) => (
          <p key={e.id} className={cn(styles.cell, styles.cellGain)}>
            {e.oportunidad}
          </p>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Service blueprint ───────────────────────── */

const LINEAS: Record<string, string> = {
  frontstage: 'Línea de interacción',
  backstage: 'Línea de visibilidad: lo de abajo, la dueña no lo ve',
  soporte: 'Línea de interacción interna',
}

export function MapaBlueprint() {
  return (
    <div className={styles.scroller} tabIndex={0} aria-label="Service blueprint (desliza para ver todos los pasos)">
      <div className={styles.blueprint}>
        <span className={cn(styles.laneLabel, styles.laneCorner)}>Paso</span>
        {BLUEPRINT.map((p, i) => (
          <header key={p.id} className={styles.stepHead}>
            <span className={styles.stageNum}>{i + 1}</span>
            {p.titulo}
          </header>
        ))}

        {CARRILES.map((c) => (
          <div key={c.id} className={styles.laneRow}>
            {LINEAS[c.id] && (
              <div className={cn(styles.divider, c.id === 'backstage' && styles.dividerStrong)}>
                <span>{LINEAS[c.id]}</span>
              </div>
            )}
            <span className={styles.laneLabel}>
              <strong>{c.titulo}</strong>
              <small>{c.detalle}</small>
            </span>
            {BLUEPRINT.map((p) => (
              <p key={p.id} className={cn(styles.bpCell, styles[`lane_${c.id}`])}>
                {p.celdas[c.id]}
              </p>
            ))}
          </div>
        ))}

        <div className={styles.laneRow}>
          <span className={styles.laneLabel}>
            <strong>Puntos de falla</strong>
            <small>Dónde se puede romper</small>
          </span>
          {BLUEPRINT.map((p) => (
            <p key={p.id} className={styles.failCell}>
              <Icon name="warning" size={16} />
              {p.falla}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Mapa de ecosistema ───────────────────────── */

/** Radio de cada anillo, en % del ancho del lienzo cuadrado. */
const RADIO = { 1: 21, 2: 32, 3: 44 } as const
/**
 * Ángulo de cada actor por anillo, en el orden de ECOSISTEMA (grados; -90 = arriba). Los del anillo
 * exterior evitan los extremos izquierdo y derecho para que las etiquetas no se salgan del lienzo.
 */
const ANGULOS = { 1: [0, 90, 270, 180], 2: [-90, -30, 30, 90, 150, 210], 3: [-55, 55, 90, 125, -125] } as const

function posiciones() {
  const out: Record<string, { left: number; top: number }> = {}
  for (const anillo of [1, 2, 3] as const) {
    ECOSISTEMA.filter((a) => a.anillo === anillo).forEach((a, i) => {
      const ang = ((ANGULOS[anillo][i] ?? 0) * Math.PI) / 180
      out[a.id] = { left: 50 + RADIO[anillo] * Math.cos(ang), top: 50 + RADIO[anillo] * Math.sin(ang) }
    })
  }
  return out
}

const POS = posiciones()
const FLUJO_ORDEN: FlujoEcosistema[] = ['dinero', 'datos', 'info']

export function MapaEcosistema() {
  const [activo, setActivo] = useState('clientes')
  const sel = ECOSISTEMA.find((a) => a.id === activo) ?? ECOSISTEMA[0]

  return (
    <div className={styles.ecoLayout}>
      <div className={styles.ecoStage}>
        <svg className={styles.ecoRings} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={RADIO[3]} className={styles.ring3} />
          <circle cx="50" cy="50" r={RADIO[2]} className={styles.ring2} />
          <circle cx="50" cy="50" r={RADIO[1]} className={styles.ring1} />
          {ECOSISTEMA.filter((a) => a.id === sel.id).map((a) => (
            <line key={a.id} x1="50" y1="50" x2={POS[a.id].left} y2={POS[a.id].top} className={styles.ecoLink} />
          ))}
        </svg>
        <div className={styles.ecoCenter}>
          <strong>Rosa</strong>
          <span>+ Zenity</span>
        </div>
        {ECOSISTEMA.map((a) => (
          <button
            key={a.id}
            type="button"
            className={cn(styles.ecoNode, styles[`flow_${a.flujo}`], a.id === sel.id && styles.ecoNodeOn)}
            style={{ left: `${POS[a.id].left}%`, top: `${POS[a.id].top}%` }}
            onClick={() => setActivo(a.id)}
            aria-pressed={a.id === sel.id}
            title={a.nombre}
          >
            {a.corto}
          </button>
        ))}
      </div>

      <aside className={styles.ecoSide}>
        <div className={styles.legend}>
          {FLUJO_ORDEN.map((f) => (
            <span key={f} className={styles.legendItem}>
              <span className={cn(styles.swatch, styles[`flow_${f}`])} aria-hidden="true" />
              {FLUJOS[f]}
            </span>
          ))}
        </div>

        <div className={styles.ecoDetail} aria-live="polite">
          <span className={styles.eyebrowSmall}>
            {ANILLOS[sel.anillo - 1]} · {FLUJOS[sel.flujo]}
          </span>
          <h3 className={styles.detailTitle}>{sel.nombre}</h3>
          <dl className={styles.detailList}>
            <dt>
              <Icon name="swap_horiz" size={16} />
              Con Rosa
            </dt>
            <dd>{sel.relacion}</dd>
            <dt>
              <Icon name="auto_awesome" size={16} />
              Qué hace Zenity
            </dt>
            <dd>{sel.zenity}</dd>
          </dl>
        </div>

        {ANILLOS.map((titulo, i) => (
          <div key={titulo} className={styles.ecoGroup}>
            <span className={styles.eyebrowSmall}>{titulo}</span>
            <div className={styles.chips}>
              {ECOSISTEMA.filter((a) => a.anillo === i + 1).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={cn(styles.chipBtn, a.id === sel.id && styles.chipBtnOn)}
                  onClick={() => setActivo(a.id)}
                  aria-pressed={a.id === sel.id}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  )
}
