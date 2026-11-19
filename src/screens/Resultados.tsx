import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Money, NoDemoData, SectionHead } from '../components/zen'
import { businessName } from '../data/businesses'
import { csvResultados, type EstadoResultados } from '../domain/resultados'
import { fmtSolesCorto } from '../domain/util'
import { haptic } from '../lib/haptics'
import { MONTHS, MONTHS_SHORT } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { marcarHito } from '../state/demoStore'
import { useResultados, useZen } from '../state/useZen'
import styles from './Resultados.module.css'

const nombreMes = (mes: string) => MONTHS[Number(mes.slice(5, 7)) - 1].toLowerCase()
const mesCorto = (mes: string) => MONTHS_SHORT[Number(mes.slice(5, 7)) - 1]
const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)
const redondo = (n: number) => fmtSolesCorto(Math.round(n))

/**
 * «Estado de resultados»: cuánto gana de verdad el negocio cada mes (ventas sin IGV − costos − gastos
 * − impuestos) y su histórico. Primero la respuesta en una frase; luego la cascada y el mes a mes.
 */
export function Resultados() {
  const { business } = useApp()
  const { a, businessId } = useZen()
  const historico = useResultados()
  // Por defecto, el último mes completo: el mes en curso todavía no tiene todos sus pagos
  const porDefecto = [...historico].reverse().find((e) => !e.enCurso)?.mes ?? historico.at(-1)?.mes
  const [mes, setMes] = useState<string | undefined>(undefined)
  const arriba = useRef<HTMLDivElement>(null)

  const chips = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (businessId && historico.length) marcarHito(businessId, 'resultados')
  }, [businessId, historico.length])

  // El chip del mes elegido siempre a la vista (solo se desplaza la fila, no la página)
  useEffect(() => {
    const fila = chips.current
    const activo = fila?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (fila && activo) fila.scrollTo({ left: activo.offsetLeft - (fila.clientWidth - activo.offsetWidth) / 2, behavior: 'smooth' })
  }, [mes])

  if (!a || !historico.length) {
    return (
      <div className="z-page">
        <TopBar title="Estado de resultados" subtitle={businessName(business)} />
        <div className="z-container" style={{ padding: '0 var(--z-gutter)' }}>
          <NoDemoData feature="El estado de resultados" />
        </div>
      </div>
    )
  }

  const elegido = mes ?? porDefecto
  const i = historico.findIndex((e) => e.mes === elegido)
  const e = historico[i]
  const anterior = i > 0 ? historico[i - 1] : null
  const nrus = a.business.regimenTributario === 'NRUS'
  const elegir = (m: string) => {
    haptic('select')
    setMes(m)
  }

  return (
    <div className="z-page" ref={arriba}>
      <TopBar title="Estado de resultados" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.div ref={chips} className={styles.meses} variants={fadeUp} role="tablist" aria-label="Mes">
          {[...historico].reverse().map((h) => (
            <Chip key={h.mes} selected={h.mes === elegido} role="tab" aria-selected={h.mes === elegido} onClick={() => elegir(h.mes)}>
              {MONTHS[Number(h.mes.slice(5, 7)) - 1]}
              {h.enCurso ? ' · en curso' : ''}
            </Chip>
          ))}
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={e.mes}
            className={styles.mes}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: ease.decelerate } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <Resumen e={e} anterior={anterior} />
            <Cascada e={e} nrus={nrus} />
            <FueraDelResultado e={e} />
          </motion.div>
        </AnimatePresence>

        <ComoSeCalcula />

        <Historico
          historico={historico}
          elegido={e.mes}
          onElegir={(m) => {
            elegir(m)
            // Sube a ver el mes elegido (después del cambio, para que la animación no corte el desplazamiento)
            requestAnimationFrame(() => {
              const top = (arriba.current?.getBoundingClientRect().top ?? 0) + window.scrollY
              window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
            })
          }}
          negocio={businessName(business)}
        />
      </motion.div>
    </div>
  )
}

/** La respuesta en una frase: cuánto ganó y cuánto le queda de cada S/ 100 vendidos. */
function Resumen({ e, anterior }: { e: EstadoResultados; anterior: EstadoResultados | null }) {
  const gano = e.utilidadNeta >= 0
  const diferencia = anterior && !e.enCurso ? e.utilidadNeta - anterior.utilidadNeta : null
  return (
    <section className={styles.hero} aria-live="polite">
      <span className={styles.heroLabel}>
        Utilidad de {nombreMes(e.mes)}
        {e.enCurso ? ' (en curso)' : ''}
      </span>
      <Money animated value={e.utilidadNeta} className={styles.heroAmount} />
      <p className={styles.heroFrase}>
        {e.ventas.total <= 0
          ? 'Este mes no hay ventas registradas.'
          : gano
            ? `De cada S/ 100 que vendiste, te quedaron S/ ${Math.round((e.margenNeto ?? 0) * 100)}.`
            : `Gastaste ${redondo(-e.utilidadNeta)} más de lo que te dejaron tus ventas.`}
        {e.enCurso ? ' El mes aún no termina: faltan pagos como la planilla.' : ''}
      </p>
      {diferencia !== null && anterior && (
        <span className={styles.heroPill} data-sube={diferencia >= 0 || undefined}>
          <Icon name={diferencia >= 0 ? 'trending_up' : 'trending_down'} size={16} />
          {redondo(Math.abs(diferencia))} {diferencia >= 0 ? 'más' : 'menos'} que en {nombreMes(anterior.mes)}
        </span>
      )}
    </section>
  )
}

type Fila = { signo: '' | '−' | '+' | '='; label: string; monto: number; nota?: string; tipo: 'base' | 'resta' | 'suma' | 'subtotal' | 'total' }

/** La cascada: de las ventas a la utilidad neta, con una barra del tamaño de cada línea. */
function Cascada({ e, nrus }: { e: EstadoResultados; nrus: boolean }) {
  const [verGastos, setVerGastos] = useState(false)
  const ventas = Math.max(1, e.ventas.total)
  const filas: (Fila | 'gastos')[] = [
    {
      signo: '',
      label: 'Ventas (sin IGV)',
      monto: e.ventas.total,
      tipo: 'base',
      nota: e.ventas.sinComprobante > 0 ? `${redondo(e.ventas.conComprobante)} con comprobante · ${redondo(e.ventas.sinComprobante)} sin comprobante` : 'Todas con comprobante',
    },
    { signo: '−', label: 'Costo de lo que vendiste', monto: e.costoVentas, tipo: 'resta', nota: 'Mercadería e insumos' },
    { signo: '=', label: 'Utilidad bruta', monto: e.utilidadBruta, tipo: 'subtotal', nota: `Margen ${pct(e.margenBruto)}` },
    'gastos',
    { signo: '=', label: 'Utilidad operativa', monto: e.utilidadOperativa, tipo: 'subtotal' },
    ...(e.otrosIngresos > 0 ? [{ signo: '+', label: 'Otros ingresos', monto: e.otrosIngresos, tipo: 'suma' } as Fila] : []),
    ...(e.gastosFinancieros > 0 ? [{ signo: '−', label: 'Comisiones bancarias', monto: e.gastosFinancieros, tipo: 'resta' } as Fila] : []),
    { signo: '−', label: nrus ? 'Cuota del Nuevo RUS' : 'Impuesto a la renta (pago a cuenta)', monto: e.impuestoRenta, tipo: 'resta' },
    { signo: '=', label: 'Utilidad neta', monto: e.utilidadNeta, tipo: 'total', nota: `Margen ${pct(e.margenNeto)}` },
  ]

  const fila = (f: Fila) => (
    <div key={f.label} className={styles.fila} data-tipo={f.tipo} data-negativo={f.monto < 0 || undefined}>
      <span className={styles.signo} aria-hidden>
        {f.signo}
      </span>
      <span className={styles.filaTexto}>
        <span className={styles.filaLabel}>{f.label}</span>
        {f.nota && <span className={styles.filaNota}>{f.nota}</span>}
      </span>
      <span className={styles.filaMonto}>{f.tipo === 'resta' ? `−${redondo(f.monto)}` : redondo(f.monto)}</span>
      <span className={styles.barra} aria-hidden>
        <span style={{ width: `${Math.min(100, (Math.abs(f.monto) / ventas) * 100)}%` }} />
      </span>
    </div>
  )

  return (
    <section className={styles.card} aria-label={`Estado de resultados de ${nombreMes(e.mes)}`}>
      {filas.map((f) =>
        f === 'gastos' ? (
          <div key="gastos" className={styles.gastos}>
            <button type="button" className={styles.fila} data-tipo="resta" onClick={() => setVerGastos(!verGastos)} aria-expanded={verGastos}>
              <span className={styles.signo} aria-hidden>
                −
              </span>
              <span className={styles.filaTexto}>
                <span className={styles.filaLabel}>
                  Gastos del negocio
                  <Icon name={verGastos ? 'expand_less' : 'expand_more'} size={18} />
                </span>
                <span className={styles.filaNota}>
                  {e.gastosOperativos.lineas.length ? `${e.gastosOperativos.lineas.length} rubros · toca para ver el detalle` : 'Sin gastos registrados'}
                </span>
              </span>
              <span className={styles.filaMonto}>−{redondo(e.gastosOperativos.total)}</span>
              <span className={styles.barra} aria-hidden>
                <span style={{ width: `${Math.min(100, (e.gastosOperativos.total / ventas) * 100)}%` }} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {verGastos && (
                <motion.ul
                  className={styles.detalle}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3, ease: ease.emphasized } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
                >
                  {e.gastosOperativos.lineas.map((l) => (
                    <li key={l.id}>
                      <span>{l.label}</span>
                      <span>{redondo(l.monto)}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        ) : (
          fila(f)
        ),
      )}
    </section>
  )
}

/** Lo que salió de la caja pero no es gasto: así el dueño separa lo suyo del negocio. */
function FueraDelResultado({ e }: { e: EstadoResultados }) {
  const { retiros, prestamos } = e.fueraDelResultado
  if (retiros <= 0 && prestamos <= 0) return null
  return (
    <section className={styles.fuera}>
      <strong>No son gastos del negocio</strong>
      {retiros > 0 && (
        <span className={styles.fueraFila}>
          <span>Lo que sacaste para ti</span>
          <span>{redondo(retiros)}</span>
        </span>
      )}
      {prestamos > 0 && (
        <span className={styles.fueraFila}>
          <span>Cuotas de préstamo</span>
          <span>{redondo(prestamos)}</span>
        </span>
      )}
      <p>Salen de tu caja, pero no restan de tu utilidad: se pagan con ella. Por eso conviene un sueldo fijo de dueño.</p>
    </section>
  )
}

/** Cómo leerlo y cómo se calcula: el estado de resultados también enseña. */
function ComoSeCalcula() {
  return (
    <motion.details className={styles.como} variants={fadeUp}>
      <summary>
        <Icon name="calculate" size={20} />
        ¿Cómo se calcula?
        <Icon name="expand_more" size={20} />
      </summary>
      <ul>
        <li>
          <strong>Ventas y compras con comprobante:</strong> en el mes en que se emitieron y sin IGV. El IGV no es tuyo: lo cobras para SUNAT.
        </li>
        <li>
          <strong>Lo que no tiene comprobante:</strong> en el mes en que se movió la plata. Una compra sin factura cuenta completa porque su IGV no lo recuperas.
        </li>
        <li>
          <strong>Que entre plata no es ganar:</strong> tu flujo del mes (entró menos salió) puede ser positivo y tu utilidad negativa, o al revés.
        </li>
        <li>
          <strong>El costo de lo vendido</strong> es la mercadería que compraste en el mes; no descuenta lo que quedó en tu almacén.
        </li>
        <li>Es una guía para decidir. El estado oficial lo prepara tu contador.</li>
      </ul>
    </motion.details>
  )
}

/** Mes a mes: la frase, las barras de la utilidad neta y la tabla. Un toque elige el mes. */
function Historico({ historico, elegido, onElegir, negocio }: { historico: EstadoResultados[]; elegido: string; onElegir: (mes: string) => void; negocio: string }) {
  const completos = historico.filter((e) => !e.enCurso)
  const mejor = completos.reduce<EstadoResultados | null>((m, e) => (!m || e.utilidadNeta > m.utilidadNeta ? e : m), null)
  const perdidas = completos.filter((e) => e.utilidadNeta < 0)

  const descargar = () => {
    const csv = '\uFEFF' + csvResultados(historico)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `estado-de-resultados-${negocio.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.section className={styles.historico} variants={fadeUp}>
      <SectionHead title="Mes a mes" hint={`${historico.length} meses`} />
      {mejor && (
        <p className={styles.historicoFrase}>
          Tu mejor mes fue <strong>{nombreMes(mejor.mes)}</strong>: ganaste <strong>{redondo(mejor.utilidadNeta)}</strong>.
          {perdidas.length > 0 && (
            <>
              {' '}
              En {perdidas.map((p) => nombreMes(p.mes)).join(' y ')} perdiste plata.
            </>
          )}
        </p>
      )}
      <BarrasUtilidad historico={historico} elegido={elegido} onElegir={onElegir} />
      <div className={styles.tabla} role="table" aria-label="Histórico del estado de resultados">
        <div className={styles.tablaFila} role="row" data-cabecera="">
          <span role="columnheader">Mes</span>
          <span role="columnheader">Ventas</span>
          <span role="columnheader">Utilidad</span>
          <span role="columnheader">Margen</span>
        </div>
        {[...historico].reverse().map((e) => (
          <button key={e.mes} type="button" role="row" className={styles.tablaFila} data-elegido={e.mes === elegido || undefined} onClick={() => onElegir(e.mes)}>
            <span role="cell">
              {mesCorto(e.mes)} {e.mes.slice(2, 4)}
              {e.enCurso && <small> en curso</small>}
            </span>
            <span role="cell">{redondo(e.ventas.total)}</span>
            <span role="cell" data-negativo={e.utilidadNeta < 0 || undefined}>
              {redondo(e.utilidadNeta)}
            </span>
            <span role="cell">{pct(e.margenNeto)}</span>
          </button>
        ))}
      </div>
      <Button variant="tonal" icon="download" onClick={descargar}>
        Descargar para tu contador (CSV)
      </Button>
    </motion.section>
  )
}

/** Barras de la utilidad neta por mes: verdes si ganó, coral si perdió; el mes en curso, tenue. */
function BarrasUtilidad({ historico, elegido, onElegir }: { historico: EstadoResultados[]; elegido: string; onElegir: (mes: string) => void }) {
  // El ancho real: las barras y sus esquinas no se deforman
  const ref = useRef<HTMLElement>(null)
  const [W, setW] = useState(320)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(240, Math.round(el.clientWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 150
  const PAD = { top: 10, bottom: 10 }
  const valores = historico.map((e) => e.utilidadNeta)
  const max = Math.max(0, ...valores)
  const min = Math.min(0, ...valores)
  const y = (v: number) => PAD.top + ((max - v) / (max - min || 1)) * (H - PAD.top - PAD.bottom)
  const hueco = W / historico.length
  const barW = Math.min(46, hueco * 0.56)
  const cx = (i: number) => hueco * (i + 0.5)
  return (
    <figure ref={ref} className={styles.barras} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--z-outline-variant)" />
        {historico.map((e, i) => {
          const v = e.utilidadNeta
          const top = Math.min(y(v), y(0))
          const alto = Math.max(2, Math.abs(y(v) - y(0)))
          const sel = e.mes === elegido
          return (
            <g key={e.mes} onClick={() => onElegir(e.mes)} style={{ cursor: 'pointer' }}>
              <rect x={cx(i) - hueco / 2} y="0" width={hueco} height={H} fill="transparent" />
              <motion.rect
                x={cx(i) - barW / 2}
                width={barW}
                rx="6"
                fill={v >= 0 ? 'var(--z-positive)' : 'var(--z-negative)'}
                fillOpacity={e.enCurso ? 0.45 : 1}
                stroke={sel ? 'var(--z-on-surface)' : 'none'}
                strokeWidth={sel ? 2 : 0}
                initial={{ y: y(0), height: 0 }}
                animate={{ y: top, height: alto }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: ease.emphasized }}
              />
            </g>
          )
        })}
      </svg>
      {/* Etiquetas en HTML: no se deforman con el ancho del gráfico */}
      <div className={styles.barrasEtiquetas} style={{ gridTemplateColumns: `repeat(${historico.length}, minmax(0, 1fr))` }}>
        {historico.map((e) => (
          <span key={e.mes} data-elegido={e.mes === elegido || undefined}>
            <strong data-negativo={e.utilidadNeta < 0 || undefined}>{redondo(e.utilidadNeta)}</strong>
            {mesCorto(e.mes)}
            {e.enCurso ? '*' : ''}
          </span>
        ))}
      </div>
      {historico.some((e) => e.enCurso) && <figcaption className={styles.barrasNota}>* Mes en curso: todavía faltan pagos.</figcaption>}
    </figure>
  )
}
