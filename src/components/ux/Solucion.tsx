import { Fragment } from 'react'
import { Link } from 'react-router'
import {
  ESTADO_ROADMAP,
  type EstadoRoadmap,
  FLUJO_FLECHAS,
  FLUJO_META,
  FLUJO_NODOS,
  type FlechaFlujo,
  type ItemRoadmap,
  type NodoFlujo,
  type NodoSitio,
  ROADMAP_EXTRA,
  ROADMAP_FASES,
  ROADMAP_PUERTAS,
  SITIO_OCULTOS,
  SITIO_RAMAS,
} from '../../config/mapasUx'
import { cn } from '../../lib/cn'
import { Icon } from '../Icon'
import styles from './ux.module.css'

/* ───────────────────────── User flow ───────────────────────── */

const FW = 1160
const FH = 500
const PANT = { w: 164, h: 62 }
const ROMBO = 46
const CIRC = 22

type Lado = NonNullable<FlechaFlujo['sale']>

function ancla(n: NodoFlujo, lado: Lado): [number, number] {
  const dx = n.tipo === 'pantalla' ? PANT.w / 2 : n.tipo === 'decision' ? ROMBO : CIRC
  const dy = n.tipo === 'pantalla' ? PANT.h / 2 : n.tipo === 'decision' ? ROMBO : CIRC
  if (lado === 'derecha') return [n.x + dx, n.y]
  if (lado === 'izquierda') return [n.x - dx, n.y]
  if (lado === 'arriba') return [n.x, n.y - dy]
  return [n.x, n.y + dy]
}

/** Parte un texto en líneas de hasta `max` caracteres (para los rombos). */
function lineas(texto: string, max: number): string[] {
  const out: string[] = []
  for (const palabra of texto.split(' ')) {
    const ultima = out[out.length - 1]
    if (ultima && `${ultima} ${palabra}`.length <= max) out[out.length - 1] = `${ultima} ${palabra}`
    else out.push(palabra)
  }
  return out
}

const NODOS = new Map(FLUJO_NODOS.map((n) => [n.id, n]))

function Flecha({ f }: { f: FlechaFlujo }) {
  const a = NODOS.get(f.desde)
  const b = NODOS.get(f.hasta)
  if (!a || !b) return null
  const ini = ancla(a, f.sale ?? 'derecha')
  const fin = ancla(b, f.llega ?? 'izquierda')
  const pts = [ini, ...(f.via ?? []), fin]
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  // La etiqueta va en el tramo más largo
  let mejor = 0
  let largo = -1
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    if (l > largo) {
      largo = l
      mejor = i
    }
  }
  const [p, q] = [pts[mejor], pts[mejor + 1]]
  const vertical = p[0] === q[0]
  const mx = (p[0] + q[0]) / 2
  const my = (p[1] + q[1]) / 2
  // En un tramo horizontal caben unos 7 px por letra; en uno vertical la etiqueta va al costado
  const etiqueta = f.etiqueta ? lineas(f.etiqueta, vertical ? 24 : Math.max(8, Math.floor(largo / 7))) : []
  return (
    <g>
      <path d={d} className={styles.flowEdge} markerEnd="url(#ux-flecha)" />
      {etiqueta.length > 0 && (
        <text
          x={vertical ? mx + 10 : mx}
          y={vertical ? my + 4 : my - 10 - (etiqueta.length - 1) * 14}
          textAnchor={vertical ? 'start' : 'middle'}
          className={styles.flowEdgeLabel}
        >
          {etiqueta.map((l, i) => (
            <tspan key={l} x={vertical ? mx + 10 : mx} dy={i ? 14 : 0}>
              {l}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}

function Nodo({ n }: { n: NodoFlujo }) {
  let forma
  if (n.tipo === 'pantalla') {
    forma = (
      <>
        <rect x={n.x - PANT.w / 2} y={n.y - PANT.h / 2} width={PANT.w} height={PANT.h} rx="14" className={styles.flowScreen} />
        <text x={n.x} y={n.detalle ? n.y - 4 : n.y + 5} textAnchor="middle" className={styles.flowTitle}>
          {n.titulo}
        </text>
        {n.detalle && (
          <text x={n.x} y={n.y + 15} textAnchor="middle" className={styles.flowDetail}>
            {n.detalle}
          </text>
        )}
      </>
    )
  } else if (n.tipo === 'decision') {
    const ls = lineas(n.titulo, 11)
    forma = (
      <>
        <path d={`M${n.x} ${n.y - ROMBO} L${n.x + ROMBO} ${n.y} L${n.x} ${n.y + ROMBO} L${n.x - ROMBO} ${n.y} Z`} className={styles.flowDecision} />
        <text x={n.x} y={n.y + 4 - ((ls.length - 1) * 14) / 2} textAnchor="middle" className={styles.flowDecisionText}>
          {ls.map((l, i) => (
            <tspan key={l} x={n.x} dy={i ? 14 : 0}>
              {l}
            </tspan>
          ))}
        </text>
      </>
    )
  } else {
    forma = (
      <>
        <circle cx={n.x} cy={n.y} r={CIRC} className={n.tipo === 'fin' ? styles.flowEnd : styles.flowStart} />
        {n.tipo === 'fin' && <path d={`M${n.x - 8} ${n.y} l5 5 l10 -11`} className={styles.flowCheck} />}
        <text x={n.x} y={n.y + CIRC + 20} textAnchor="middle" className={styles.flowTitle}>
          {n.titulo}
        </text>
      </>
    )
  }
  if (!n.ruta) return <g>{forma}</g>
  return (
    <a href={`#${n.ruta}`} className={styles.flowLink} aria-label={`${n.titulo}: abrir en la app`}>
      {forma}
    </a>
  )
}

export function MapaUserFlow() {
  const pantallas = FLUJO_NODOS.filter((n, i, todos) => n.tipo === 'pantalla' && n.ruta && todos.findIndex((x) => x.titulo === n.titulo) === i)
  return (
    <div className={styles.stack}>
      <p className={styles.goal}>
        <Icon name="flag" size={18} />
        <span>
          <strong>Meta de Rosa:</strong> {FLUJO_META.toLowerCase()}.
        </span>
      </p>
      <div className={styles.scroller} tabIndex={0} aria-label="User flow (desliza para ver todo el camino)">
        <svg className={styles.flow} viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label="Flujo desde la alerta de caja hasta la caja con colchón">
          <defs>
            <marker id="ux-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={styles.flowArrow} />
            </marker>
          </defs>
          {FLUJO_FLECHAS.map((f) => (
            <Flecha key={`${f.desde}-${f.hasta}`} f={f} />
          ))}
          {FLUJO_NODOS.map((n) => (
            <Nodo key={n.id} n={n} />
          ))}
        </svg>
      </div>
      <div className={styles.flowFoot}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={cn(styles.shape, styles.shapeScreen)} aria-hidden="true" />
            Pantalla
          </span>
          <span className={styles.legendItem}>
            <span className={cn(styles.shape, styles.shapeDecision)} aria-hidden="true" />
            Decisión
          </span>
          <span className={styles.legendItem}>
            <span className={cn(styles.shape, styles.shapeCircle)} aria-hidden="true" />
            Inicio y fin
          </span>
        </div>
        <div className={styles.chips}>
          {pantallas.map((n) => (
            <Link key={n.id} to={n.ruta ?? '/'} className={styles.chipBtn}>
              {n.titulo}
              <Icon name="open_in_new" size={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Site map ───────────────────────── */

function NodoSitioView({ n }: { n: NodoSitio }) {
  const clase = cn(styles.siteNode, n.tipo === 'seccion' && styles.siteSection, n.tipo === 'oculto' && styles.siteHidden)
  return (
    <li>
      {n.ruta ? (
        <Link to={n.ruta} className={clase}>
          {n.titulo}
        </Link>
      ) : (
        <span className={clase}>{n.titulo}</span>
      )}
      {n.hijos && (
        <ul className={styles.siteSub}>
          {n.hijos.map((h) => (
            <NodoSitioView key={h.titulo} n={h} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function MapaSiteMap() {
  return (
    <div className={styles.stack}>
      <div className={styles.scroller} tabIndex={0} aria-label="Site map (desliza para ver todas las ramas)">
        <div className={styles.siteTree}>
          <div className={styles.siteRoot}>
            <Icon name="auto_awesome" size={18} />
            Zenity
          </div>
          <div className={styles.siteBranches}>
            {SITIO_RAMAS.map((r) => (
              <section key={r.id} className={styles.siteBranch} aria-label={r.titulo}>
                <Link to={r.ruta} className={cn(styles.siteHead, r.id === 'entrada' && styles.siteHeadQuiet)}>
                  <Icon name={r.icono} size={18} />
                  <span>
                    {r.titulo}
                    <small>{r.nota}</small>
                  </span>
                </Link>
                <ul className={styles.siteList}>
                  {r.hijos.map((h) => (
                    <NodoSitioView key={h.titulo} n={h} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>
          <Icon name="visibility_off" size={18} />
          Ocultas con interruptores
          <span className={styles.panelSub}>Las pantallas existen; se encienden en src/lib/features.ts</span>
        </h3>
        <ul className={styles.hiddenGrid}>
          {SITIO_OCULTOS.map((n) => (
            <NodoSitioView key={n.titulo} n={n} />
          ))}
        </ul>
      </section>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={cn(styles.shape, styles.shapeScreen)} aria-hidden="true" />
          Pantalla (abre en la app)
        </span>
        <span className={styles.legendItem}>
          <span className={cn(styles.shape, styles.shapeSection)} aria-hidden="true" />
          Sección dentro de una pantalla
        </span>
        <span className={styles.legendItem}>
          <span className={cn(styles.shape, styles.shapeHidden)} aria-hidden="true" />
          Oculta
        </span>
      </div>
    </div>
  )
}

/* ───────────────────────── Roadmap ───────────────────────── */

const ICONO_ESTADO: Record<EstadoRoadmap, string> = {
  hecho: 'check_circle',
  parcial: 'pending',
  falta: 'radio_button_unchecked',
  retirado: 'block',
}

/** Columnas del grid del roadmap: prototipo, fase 1, puerta 1, fase 2, puerta 2, fase 3, puerta 3. */
const COLS = [1, 2, 4, 6]
const COLS_PUERTA = [3, 5, 7]

function Barra({ item }: { item: ItemRoadmap }) {
  return (
    <li className={cn(styles.bar, styles[`bar_${item.estado}`])}>
      <span className={styles.barTitle}>
        <Icon name={ICONO_ESTADO[item.estado]} size={16} fill={item.estado === 'hecho'} />
        {item.titulo}
      </span>
      {item.nota && <span className={styles.barNote}>{item.nota}</span>}
    </li>
  )
}

export function MapaRoadmap() {
  const todos = [...ROADMAP_EXTRA, ...ROADMAP_FASES.flatMap((f) => f.items)]
  const cuenta = (e: EstadoRoadmap) => todos.filter((i) => i.estado === e).length
  const columnas = [
    { id: 'proto', titulo: 'Prototipo', meses: 'Oct. y nov. 2026', items: ROADMAP_EXTRA },
    ...ROADMAP_FASES.map((f) => ({ id: f.id, titulo: f.titulo, meses: f.meses, items: f.items })),
  ]

  return (
    <div className={styles.stack}>
      <div className={styles.legend}>
        {(Object.keys(ESTADO_ROADMAP) as EstadoRoadmap[]).map((e) => (
          <span key={e} className={styles.legendItem}>
            <span className={cn(styles.barSwatch, styles[`bar_${e}`])} aria-hidden="true" />
            {ESTADO_ROADMAP[e]} · {cuenta(e)}
          </span>
        ))}
      </div>

      <div className={styles.scroller} tabIndex={0} aria-label="Roadmap (desliza para ver las tres fases)">
        <div className={styles.roadmap}>
          {columnas.map((c, i) => (
            <Fragment key={c.id}>
              <div className={cn(styles.trackSeg, i === 0 && styles.trackSegProto)} style={{ gridColumn: COLS[i], gridRow: 1 }}>
                <strong>{c.titulo}</strong>
                <span>{c.meses}</span>
              </div>
              <ul className={styles.roadCol} style={{ gridColumn: COLS[i], gridRow: 2, paddingTop: i * 22 }}>
                {c.items.map((item) => (
                  <Barra key={item.titulo} item={item} />
                ))}
              </ul>
            </Fragment>
          ))}
          {ROADMAP_PUERTAS.map((p, i) => (
            <div key={p.titulo} className={cn(styles.gate, i === 0 && styles.gateNext)} style={{ gridColumn: COLS_PUERTA[i], gridRow: '1 / span 2' }} title={p.criterio}>
              <span className={styles.gateGem}>
                <span>{i + 1}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.gates}>
        {ROADMAP_PUERTAS.map((p, i) => (
          <section key={p.titulo} className={cn(styles.panel, i === 0 && styles.panelHot)}>
            <h3 className={styles.panelTitle}>
              <span className={styles.gateGemSmall} aria-hidden="true" />
              {p.titulo}
              <span className={styles.panelSub}>Mes {p.mes}</span>
            </h3>
            <p className={styles.muted}>{p.criterio}</p>
          </section>
        ))}
      </div>

      <p className={styles.note2}>
        <Icon name="info" size={16} />
        <span>
          El mes 0 todavía no tiene fecha (PENDIENTE). En tus notas conviven dos caminos: el MVP en Brasil (29/10) y el canal BCP en Perú (18/11). Este
          roadmap sigue al de tu doc de features: Brasil solo después de la Puerta 3. Falta decidir cuál manda (PENDIENTE).
        </span>
      </p>
    </div>
  )
}
