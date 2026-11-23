import { useState } from 'react'
import {
  AFINIDAD,
  CUADRANTES_SUPUESTOS,
  type CuadranteEmpatia,
  type CuadranteSupuesto,
  cuadranteDe,
  DOLORES,
  EMPATIA,
  FUENTES_UX,
  GANANCIAS,
  PERSONA,
  SUPUESTOS,
  TIPO_SUPUESTO,
} from '../../config/mapasUx'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon'
import styles from './ux.module.css'

/* ───────────────────────── Mapa de empatía ───────────────────────── */

const ICONO_CUADRANTE: Record<CuadranteEmpatia, string> = {
  dice: 'forum',
  piensa: 'lightbulb',
  hace: 'build',
  siente: 'favorite',
}

function Cuadrante({ id }: { id: CuadranteEmpatia }) {
  const c = EMPATIA[id]
  return (
    <section className={cn(styles.quad, styles[`quad_${id}`])} aria-labelledby={`quad-${id}`}>
      <h3 id={`quad-${id}`} className={styles.quadTitle}>
        <Icon name={ICONO_CUADRANTE[id]} size={18} />
        {c.titulo}
      </h3>
      <ul className={styles.quadList}>
        {c.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function MapaEmpatia() {
  return (
    <div className={styles.stack}>
      <div className={styles.empathy}>
        <Cuadrante id="dice" />
        <Cuadrante id="piensa" />
        <div className={styles.persona}>
          <span className={styles.avatar} aria-hidden="true">
            {PERSONA.iniciales}
          </span>
          <strong className={styles.personaName}>{PERSONA.nombre}</strong>
          <span className={styles.personaRole}>{PERSONA.rol}</span>
        </div>
        <Cuadrante id="hace" />
        <Cuadrante id="siente" />
      </div>

      <div className={styles.personaFacts}>
        {PERSONA.datos.map((d) => (
          <span key={d} className={styles.tag}>
            {d}
          </span>
        ))}
        <span className={cn(styles.tag, styles.tagQuiet)}>{PERSONA.nota}</span>
      </div>

      <div className={styles.twoCols}>
        <section className={cn(styles.panel, styles.panelPain)}>
          <h3 className={styles.panelTitle}>
            <Icon name="thumb_down" size={18} />
            Dolores
          </h3>
          <ul className={styles.bullets}>
            {DOLORES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
        <section className={cn(styles.panel, styles.panelGain)}>
          <h3 className={styles.panelTitle}>
            <Icon name="thumb_up" size={18} />
            Lo que ganaría con Zenity
          </h3>
          <ul className={styles.bullets}>
            {GANANCIAS.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* ───────────────────────── Mapa de afinidad ───────────────────────── */

export function MapaAfinidad() {
  const usadas = [...new Set(AFINIDAD.flatMap((g) => g.notas.map((n) => n.fuente)))]
  return (
    <div className={styles.stack}>
      <div className={styles.legend} aria-label="Fuentes de las notas">
        {usadas.map((f) => (
          <span key={f} className={styles.legendItem}>
            <span className={cn(styles.swatch, styles[`src_${f}`])} aria-hidden="true" />
            {FUENTES_UX[f]}
          </span>
        ))}
      </div>

      <div className={styles.affinity}>
        {AFINIDAD.map((g) => (
          <section key={g.id} className={styles.cluster} aria-labelledby={`cl-${g.id}`}>
            <header className={styles.clusterHead}>
              <h3 id={`cl-${g.id}`}>{g.titulo}</h3>
              <span className={styles.count}>{g.notas.length}</span>
            </header>
            <div className={styles.notes}>
              {g.notas.map((n) => (
                <p key={n.texto} className={cn(styles.note, styles[`src_${n.fuente}`])}>
                  {n.texto}
                  <span className={styles.noteSrc}>{FUENTES_UX[n.fuente]}</span>
                </p>
              ))}
            </div>
            <div className={styles.hmw}>
              <span className={styles.hmwLabel}>¿Cómo podríamos…?</span>
              <p>{g.pregunta}</p>
              <span className={styles.hmwAnswer}>
                <Icon name="arrow_forward" size={16} />
                {g.enZenity}
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Mapa de supuestos ───────────────────────── */

const ORDEN_CUADRANTES: CuadranteSupuesto[] = ['probar', 'planear', 'investigar', 'vigilar']

/* Lienzo del gráfico: margen para los rótulos de los ejes */
const W = 640
const H = 440
const PAD = { l: 44, r: 20, t: 20, b: 44 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b
const px = (incertidumbre: number) => PAD.l + incertidumbre * PW
const py = (importancia: number) => PAD.t + (1 - importancia) * PH

export function MapaSupuestos() {
  const [activo, setActivo] = useState('S1')
  const sel = SUPUESTOS.find((s) => s.id === activo) ?? SUPUESTOS[0]
  const cx = PAD.l + PW / 2
  const cy = PAD.t + PH / 2

  return (
    <div className={styles.stack}>
      <div className={styles.assumptions}>
        <figure className={styles.chartCard}>
          <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Supuestos según importancia e incertidumbre">
            <rect x={cx} y={PAD.t} width={PW / 2} height={PH / 2} rx="14" className={styles.hotZone} />
            <line x1={cx} y1={PAD.t} x2={cx} y2={PAD.t + PH} className={styles.axis} />
            <line x1={PAD.l} y1={cy} x2={PAD.l + PW} y2={cy} className={styles.axis} />
            <text x={cx + 12} y={PAD.t + 22} className={styles.zoneLabel}>
              Probar primero
            </text>
            <text x={PAD.l + 8} y={PAD.t + 20} className={styles.zoneLabelQuiet}>
              Planear
            </text>
            <text x={PAD.l + PW - 8} y={PAD.t + PH - 10} textAnchor="end" className={styles.zoneLabelQuiet}>
              Investigar después
            </text>
            <text x={PAD.l + 8} y={PAD.t + PH - 10} className={styles.zoneLabelQuiet}>
              Vigilar
            </text>
            <text x={PAD.l} y={H - 14} className={styles.axisLabel}>
              Lo sabemos
            </text>
            <text x={PAD.l + PW} y={H - 14} textAnchor="end" className={styles.axisLabel}>
              No lo sabemos →
            </text>
            <text transform={`translate(18 ${PAD.t + PH}) rotate(-90)`} className={styles.axisLabel}>
              Menos importante
            </text>
            <text transform={`translate(18 ${PAD.t}) rotate(-90)`} textAnchor="end" className={styles.axisLabel}>
              Importante →
            </text>
            {SUPUESTOS.map((s) => {
              const q = cuadranteDe(s)
              const on = s.id === sel.id
              return (
                <g
                  key={s.id}
                  className={cn(styles.dot, on && styles.dotOn)}
                  transform={`translate(${px(s.incertidumbre)} ${py(s.importancia)})`}
                  onClick={() => setActivo(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActivo(s.id)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={on}
                  aria-label={`${s.id}: ${s.texto}`}
                >
                  <circle r={on ? 17 : 14} className={q === 'probar' ? styles.dotHot : styles.dotCalm} />
                  <text dy="4" textAnchor="middle" className={styles.dotText}>
                    {s.id.slice(1)}
                  </text>
                </g>
              )
            })}
          </svg>
        </figure>

        <aside className={styles.assumptionDetail} aria-live="polite">
          <span className={styles.eyebrowSmall}>
            {sel.id} · {TIPO_SUPUESTO[sel.tipo]} · {CUADRANTES_SUPUESTOS[cuadranteDe(sel)].titulo}
          </span>
          <h3 className={styles.detailTitle}>{sel.texto}</h3>
          <dl className={styles.detailList}>
            <dt>
              <Icon name="fact_check" size={16} />
              Evidencia hoy
            </dt>
            <dd>{sel.evidencia}</dd>
            <dt>
              <Icon name="science" size={16} />
              Cómo lo probamos
            </dt>
            <dd>{sel.prueba}</dd>
          </dl>
        </aside>
      </div>

      <div className={styles.quadGrid}>
        {ORDEN_CUADRANTES.map((q) => {
          const lista = SUPUESTOS.filter((s) => cuadranteDe(s) === q).sort((a, b) => b.importancia - a.importancia)
          return (
            <section key={q} className={cn(styles.panel, q === 'probar' && styles.panelHot)}>
              <h3 className={styles.panelTitle}>
                {CUADRANTES_SUPUESTOS[q].titulo}
                <span className={styles.panelSub}>{CUADRANTES_SUPUESTOS[q].detalle}</span>
              </h3>
              {lista.length === 0 ? (
                <p className={styles.muted}>Ninguno por ahora.</p>
              ) : (
                <ul className={styles.assumptionList}>
                  {lista.map((s) => (
                    <li key={s.id}>
                      <button type="button" className={cn(styles.linkish, s.id === sel.id && styles.linkishOn)} onClick={() => setActivo(s.id)}>
                        <span className={styles.idChip}>{s.id}</span>
                        {s.texto}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
