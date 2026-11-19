import { AnimatePresence, motion, type PanInfo, useMotionValue, useTransform } from 'motion/react'
import { type Ref, useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { TopBar } from '../components/TopBar'
import { ConfidenceBadge, DoneCheck, LessonCard, Money, NoDemoData, Pill, ProgressBar, SectionHead, Why } from '../components/zen'
import { REGLA_LABEL } from '../components/zen/reglas'
import styles from '../components/zen/zen.module.css'
import { CATEGORIA_IDS, CATEGORIAS } from '../config/categories'
import { businessName } from '../data/businesses'
import { tituloMovimiento } from '../data/demoLedger'
import { alternativas, partyKey } from '../domain/categorization'
import { resumenMes } from '../domain/engine'
import { XP } from '../domain/progreso'
import type { BankMovement, CategoriaId } from '../domain/types'
import { fmtFecha, monthOf } from '../domain/util'
import { HOY } from '../config/demo'
import { FEATURES } from '../lib/features'
import { formatMoney } from '../lib/format'
import { celebrate } from '../lib/celebrate'
import { haptic } from '../lib/haptics'
import { ease, spring } from '../lib/motion'
import { useApp } from '../state/context'
import {
  analysisFor,
  corregir,
  crearRegla,
  deshacer,
  marcarCreoRegla,
  responderConciliacion,
  type UndoToken,
} from '../state/demoStore'
import { useZen } from '../state/useZen'

interface ReglaPendiente {
  movement: BankMovement
  categoria: CategoriaId
  token: UndoToken
  parecidos: BankMovement[]
}

/** Condición de la regla: el RUC o el nombre de la contraparte; si no hay, la glosa sin números. */
function condicionDe(m: BankMovement) {
  if (m.contraparteRuc) return { rucContraparte: m.contraparteRuc, contraparteNombre: m.contraparteNombre }
  if (m.contraparteNombre) return { contraparteNombre: m.contraparteNombre }
  return { glosaContiene: m.glosa.replace(/\d+/g, '').trim() }
}

function nombreParte(m: BankMovement) {
  return m.contraparteNombre ?? m.glosa.replace(/\d+/g, '').trim()
}

/** F-03 · Corrección en un toque: pila de tarjetas, una a la vez. */
export function PorRevisar() {
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const [otra, setOtra] = useState<BankMovement | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [regla, setRegla] = useState<ReglaPendiente | null>(null)
  const [whatsapp, setWhatsapp] = useState(false)
  /** Hacia dónde sale la tarjeta actual: derecha (correcto), arriba (otra categoría) */
  const [salida, setSalida] = useState<'right' | 'up'>('right')

  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Por revisar" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="Por revisar" />
        </div>
      </div>
    )
  }

  const cola = a.porRevisar
  const pendientes = cola.length
  // Revisados: los que corrigió el dueño y los que resolvió una de sus reglas
  const corregidos = new Set(demo.corrections.filter((c) => c.businessId === a.business.id && c.origen === 'APP').map((c) => c.movementId))
  const porRegla = [...a.classifications.values()].filter((c) => c.fuente === 'REGLA_NEGOCIO' && !corregidos.has(c.movementId)).length
  const revisados = corregidos.size + porRegla
  const total = pendientes + revisados
  const actual = cola[0]
  const siguiente = cola[1]

  const conDeshacer = (mensaje: string, token: UndoToken, icon = 'check_circle') =>
    toast(mensaje, icon, { label: 'Deshacer', onClick: () => deshacer(token) })

  const elegir = (m: BankMovement, categoria: CategoriaId, opts: { personal?: boolean } = {}) => {
    const sugerida = a.classifications.get(m.id)?.categoriaId
    setSalida(categoria === sugerida ? 'right' : 'up')
    const token = corregir({ movementIds: [m.id], businessId: a.business.id, rubro: a.business.rubro, elegida: categoria })
    setOtra(null)
    if (opts.personal) return conDeshacer('Marcado como gasto personal', token, 'person')
    if (categoria === sugerida) return conDeshacer(`Listo: ${CATEGORIAS[categoria].label}`, token)
    // Después de cambiar una categoría: ¿aplicar siempre a esta contraparte?
    const key = partyKey(m)
    const parecidos = cola.filter((x) => x.id !== m.id && partyKey(x) === key)
    setRegla({ movement: m, categoria, token, parecidos })
  }

  const soloEstaVez = () => {
    if (!regla) return
    conDeshacer(`Listo: ${CATEGORIAS[regla.categoria].label}`, regla.token)
    setRegla(null)
  }

  const siempre = () => {
    if (!regla) return
    const ruleId = crearRegla({
      businessId: a.business.id,
      scope: 'NEGOCIO',
      condicion: condicionDe(regla.movement),
      categoriaId: regla.categoria,
      creadaPor: 'DUENO',
    })
    marcarCreoRegla(regla.token.correctionIds)
    const n = regla.parecidos.length
    conDeshacer(
      n === 1
        ? 'Regla creada: también se reclasificó 1 movimiento parecido'
        : n > 1
          ? `Regla creada: también se reclasificaron ${n} movimientos parecidos`
          : 'Regla creada: los próximos pagos se clasifican solos',
      { correctionIds: regla.token.correctionIds, ruleIds: [ruleId] },
      'rule',
    )
    setRegla(null)
  }

  const minutos = Math.max(1, Math.ceil((pendientes * 10) / 60))

  return (
    <PorRevisarView
      {...{ business, a, cola, pendientes, revisados, total, actual, siguiente, minutos, whatsapp, setWhatsapp, salida, otra, setOtra, busqueda, setBusqueda, regla, elegir, soloEstaVez, siempre }}
    />
  )
}

type ViewProps = {
  business: ReturnType<typeof useApp>['business']
  a: NonNullable<ReturnType<typeof useZen>['a']>
  cola: BankMovement[]
  pendientes: number
  revisados: number
  total: number
  actual?: BankMovement
  siguiente?: BankMovement
  minutos: number
  whatsapp: boolean
  setWhatsapp: (v: boolean) => void
  salida: 'right' | 'up'
  otra: BankMovement | null
  setOtra: (m: BankMovement | null) => void
  busqueda: string
  setBusqueda: (v: string) => void
  regla: ReglaPendiente | null
  elegir: (m: BankMovement, categoria: CategoriaId, opts?: { personal?: boolean }) => void
  soloEstaVez: () => void
  siempre: () => void
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function PorRevisarView({
  business,
  a,
  cola,
  pendientes,
  revisados,
  total,
  actual,
  siguiente,
  minutos,
  whatsapp,
  setWhatsapp,
  salida,
  otra,
  setOtra,
  busqueda,
  setBusqueda,
  regla,
  elegir,
  soloEstaVez,
  siempre,
}: ViewProps) {
  const abrirOtra = (m: BankMovement) => {
    setBusqueda('')
    setOtra(m)
  }

  // Celebración cuando el dueño termina la cola en esta visita
  const habiaPendientes = useRef(pendientes > 0)
  useEffect(() => {
    if (pendientes > 0) habiaPendientes.current = true
    else if (habiaPendientes.current) {
      habiaPendientes.current = false
      window.setTimeout(() => celebrate({ count: 48 }), 250)
    }
  }, [pendientes])

  // Atajos de teclado: Enter/→ correcto, ← u O otra, 1–3 alternativas, P personal
  const sheetAbierto = !!otra || !!regla
  useEffect(() => {
    if (!actual || whatsapp || sheetAbierto) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const cl = a.classifications.get(actual.id)
      if (!cl) return
      const alts = alternativas(actual, cl.categoriaId)
      const k = e.key.toLowerCase()
      if (k === 'enter' || k === 'arrowright') {
        if (el?.closest('button, a') && k === 'enter') return
        e.preventDefault()
        elegir(actual, cl.categoriaId)
      } else if (k === 'arrowleft' || k === 'o') {
        e.preventDefault()
        abrirOtra(actual)
      } else if (/^[1-9]$/.test(k) && alts[Number(k) - 1]) {
        e.preventDefault()
        elegir(actual, alts[Number(k) - 1])
      } else if (k === 'p' && actual.monto < 0) {
        e.preventDefault()
        elegir(actual, 'retiro_dueno', { personal: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sugeridaOtra = otra ? a.classifications.get(otra.id)?.categoriaId : undefined
  // La sugerencia de Zenity va primero; el resto, en el orden de siempre
  const categorias = CATEGORIA_IDS.filter((id) => sinTildes(CATEGORIAS[id].label).includes(sinTildes(busqueda))).sort(
    (x, y) => Number(y === sugeridaOtra) - Number(x === sugeridaOtra),
  )

  return (
    <div className="z-page">
      <TopBar
        title="Por revisar"
        subtitle={businessName(business)}
        hideBack
        end={
          FEATURES.revisarExtras ? (
            <IconButton icon={whatsapp ? 'view_agenda' : 'chat'} label={whatsapp ? 'Ver como tarjeta' : 'Ver en WhatsApp'} variant="tonal" onClick={() => setWhatsapp(!whatsapp)} />
          ) : undefined
        }
      />
      <div className={`z-container ${styles.page}`}>
        {pendientes > 0 && (
          <section className={styles.section} aria-live="polite">
            <div className={styles.sectionHead}>
              <span className="t-title-m">
                Te quedan{' '}
                <motion.span key={pendientes} style={{ display: 'inline-block' }} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.snappy}>
                  {pendientes}
                </motion.span>{' '}
                · ~{minutos} minuto{minutos === 1 ? '' : 's'}
              </span>
              <span className={styles.sectionHint}>
                {revisados} de {total} · +{XP.revisar} XP c/u
              </span>
            </div>
            <ProgressBar value={total ? revisados / total : 0} label="Avance de la revisión" />
          </section>
        )}

        {actual && !whatsapp && (
          <div className={styles.reviewStack}>
            {siguiente && (
              <motion.div
                key={`peek-${siguiente.id}`}
                className={styles.reviewPeek}
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {cola.length > 2 && <span>+{cola.length - 1} más</span>}
              </motion.div>
            )}
            <AnimatePresence initial={false} custom={salida}>
              <ReviewCard key={actual.id} movement={actual} onElegir={(cat, opts) => elegir(actual, cat, opts)} onOtra={() => abrirOtra(actual)} />
            </AnimatePresence>
          </div>
        )}

        {actual && whatsapp && <VistaWhatsApp movement={actual} />}

        {pendientes === 0 && (
          <motion.div className={styles.empty} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: ease.decelerate }}>
            <DoneCheck />
            <p className="t-headline-s">¡Todo al día!</p>
            {revisados > 0 && (
              <motion.span className={styles.xpChip} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.3 }}>
                +{revisados * XP.revisar} XP ganados
              </motion.span>
            )}
            <p className={styles.muted}>
              {revisados > 0
                ? `Revisaste ${revisados} movimiento${revisados === 1 ? '' : 's'}. ${businessName(business)} va ${Math.round(resumenMes(a, HOY.slice(0, 7)).conciliado * 100)}% conciliado este mes.`
                : 'Zenity clasificó todo con confianza alta. No hay nada que revisar.'}
            </p>
            <div className={styles.actions} style={{ justifyContent: 'center' }}>
              <Button icon="school" to="/progreso">
                Sigue tu camino
              </Button>
              <Button variant="tonal" icon="home" to="/inicio">
                Volver al inicio
              </Button>
            </div>
          </motion.div>
        )}
        <LessonCard id="L10" />

        {FEATURES.revisarExtras && <ConfianzaMedia />}

        {actual && (
          <p className={styles.muted} style={{ textAlign: 'center' }}>
            <span className={styles.touchOnly}>Desliza a la derecha para confirmar o a la izquierda para elegir otra. </span>
            <span className={styles.keysOnly}>
              Atajos: <kbd className={styles.kbd}>Enter</kbd> correcto · <kbd className={styles.kbd}>1</kbd>–<kbd className={styles.kbd}>3</kbd> otra opción ·{' '}
              <kbd className={styles.kbd}>O</kbd> buscar.{' '}
            </span>
            Cada respuesta enseña a Zenity y puedes deshacerla.
          </p>
        )}
      </div>

      <BottomSheet open={!!otra} onClose={() => setOtra(null)} title="Elige la categoría">
        <div style={{ display: 'grid', gap: 10, padding: '0 0 16px' }}>
          <input
            className={styles.input}
            placeholder="Buscar categoría"
            value={busqueda}
            autoFocus={window.matchMedia?.('(hover: hover)').matches}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otra && categorias[0]) elegir(otra, categorias[0], { personal: categorias[0] === 'retiro_dueno' })
            }}
            aria-label="Buscar categoría"
          />
          <div className={styles.list}>
            {categorias.map((id, i) => (
              <motion.button
                key={id}
                type="button"
                className={styles.row}
                data-ripple=""
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.018 } }}
                onClick={() => otra && elegir(otra, id, { personal: id === 'retiro_dueno' })}
              >
                <span className={`${styles.rowIcon} ${id === sugeridaOtra ? styles.toneInfo : ''}`}>
                  <Icon name={CATEGORIAS[id].icon} size={20} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{CATEGORIAS[id].label}</span>
                  {id === sugeridaOtra && <span className={styles.rowSub}>Sugerencia de Zenity</span>}
                </span>
                <span className={styles.rowEnd}>{busqueda && i === 0 && <kbd className={styles.kbd}>Enter</kbd>}</span>
              </motion.button>
            ))}
            {categorias.length === 0 && (
              <div className={styles.empty} style={{ boxShadow: 'none' }}>
                <Icon name="search_off" size={32} />
                <p className={styles.muted}>No hay una categoría «{busqueda}». Prueba con otra palabra.</p>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={!!regla} onClose={soloEstaVez} title={regla ? `¿Aplicar siempre a pagos a ${nombreParte(regla.movement)}?` : ''}>
        {regla && (
          <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
            <p className={styles.small}>
              Zenity clasificará como <strong>{CATEGORIAS[regla.categoria].label}</strong> los próximos movimientos de {nombreParte(regla.movement)}.
              {regla.parecidos.length === 1 && ' También se aplica a 1 movimiento parecido que está por revisar.'}
              {regla.parecidos.length > 1 && ` También se aplica a ${regla.parecidos.length} movimientos parecidos que están por revisar.`}
            </p>
            <Button size="lg" icon="rule" onClick={siempre}>
              Sí, siempre
            </Button>
            <Button size="lg" variant="text" onClick={soloEstaVez}>
              Solo esta vez
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function ReviewCard({
  ref,
  movement: m,
  onElegir,
  onOtra,
}: {
  ref?: Ref<HTMLElement>
  movement: BankMovement
  onElegir: (c: CategoriaId, opts?: { personal?: boolean }) => void
  onOtra: () => void
}) {
  const { business } = useApp()
  const cl = analysisFor(business.id)?.classifications.get(m.id)
  if (!cl) return null
  const sugerida = cl.categoriaId
  const alts = alternativas(m, sugerida)
  return <SwipeCard ref={ref} movement={m} sugerida={sugerida} alts={alts} confianza={cl.confianza} motivo={cl.motivo} onElegir={onElegir} onOtra={onOtra} />
}

const UMBRAL = 110

/** Salida según la decisión: a la derecha si confirmó, hacia arriba si eligió otra categoría. */
const salidaVariants = {
  exit: (dir: 'right' | 'up') =>
    dir === 'up'
      ? { opacity: 0, y: -40, scale: 0.94, transition: { duration: 0.25, ease: ease.accelerate } }
      : { opacity: 0, x: 260, rotate: 8, transition: { duration: 0.25, ease: ease.accelerate } },
}

function SwipeCard({
  ref,
  movement: m,
  sugerida,
  alts,
  confianza,
  motivo,
  onElegir,
  onOtra,
}: {
  ref?: Ref<HTMLElement>
  movement: BankMovement
  sugerida: CategoriaId
  alts: CategoriaId[]
  confianza: number
  motivo: string
  onElegir: (c: CategoriaId, opts?: { personal?: boolean }) => void
  onOtra: () => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 0, 220], [-7, 0, 7])
  const okOpacity = useTransform(x, [20, UMBRAL], [0, 1])
  const otraOpacity = useTransform(x, [-UMBRAL, -20], [1, 0])
  const pasado = useRef<'ok' | 'otra' | null>(null)

  // Vibración corta al cruzar el umbral (se siente el «clic» de la decisión)
  useEffect(
    () =>
      x.on('change', (v) => {
        const zona = v > UMBRAL ? 'ok' : v < -UMBRAL ? 'otra' : null
        if (zona && zona !== pasado.current) haptic('select')
        pasado.current = zona
      }),
    [x],
  )

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > UMBRAL || info.velocity.x > 700) onElegir(sugerida)
    else if (info.offset.x < -UMBRAL || info.velocity.x < -700) onOtra()
  }

  return (
    <motion.article
      ref={ref}
      className={styles.reviewCard}
      drag="x"
      style={{ x, rotate }}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      whileDrag={{ cursor: 'grabbing', scale: 1.01 }}
      onDragEnd={onDragEnd}
      variants={salidaVariants}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: ease.decelerate } }}
      exit="exit"
      aria-label={`Movimiento por revisar: ${tituloMovimiento(m)}`}
    >
      <motion.span className={`${styles.swipeTag} ${styles.swipeOk}`} style={{ opacity: okOpacity }} aria-hidden>
        <Icon name="check" size={18} /> Correcto
      </motion.span>
      <motion.span className={`${styles.swipeTag} ${styles.swipeOtra}`} style={{ opacity: otraOpacity }} aria-hidden>
        <Icon name="more_horiz" size={18} /> Otra
      </motion.span>
      <div className={styles.sectionHead} style={{ padding: 0 }}>
        <span className={styles.muted}>
          {fmtFecha(m.fecha)} · {m.fecha.slice(11, 16)}
        </span>
        <ConfidenceBadge confianza={confianza} />
      </div>
      <div>
        <Money value={m.monto} sign="always" className={`${styles.reviewAmount} ${m.monto > 0 ? styles.amountPos : ''}`} />
        <p className="t-title-m" style={{ marginTop: 6 }}>
          {m.contraparteNombre ?? 'Sin contraparte'}
        </p>
        <p className={styles.muted} style={{ fontFamily: 'ui-monospace, monospace' }}>
          {m.glosa}
        </p>
      </div>
      <div className={styles.suggest}>
        <span className={`${styles.rowIcon} ${styles.toneInfo}`}>
          <Icon name={CATEGORIAS[sugerida].icon} size={20} />
        </span>
        <span className={styles.rowText}>
          <span className={styles.rowSub}>{confianza < 0.6 ? 'No estamos seguros. ¿Es…?' : 'Sugerimos'}</span>
          <span className={styles.rowTitle}>{CATEGORIAS[sugerida].label}</span>
        </span>
      </div>
      <Why motivo={motivo} />
      {/* Con confianza baja el botón dice qué confirmas, para no aceptar a ciegas */}
      <Button size="lg" icon="check" onClick={() => onElegir(sugerida)}>
        {confianza < 0.6 ? `Sí, es ${CATEGORIAS[sugerida].label}` : 'Correcto'}
      </Button>
      <div className={styles.chipsWrap} role="group" aria-label="Otras categorías">
        {alts.map((c, i) => (
          <Chip key={c} icon={CATEGORIAS[c].icon} onClick={() => onElegir(c)} title={`Atajo: ${i + 1}`}>
            {CATEGORIAS[c].label}
          </Chip>
        ))}
        <Chip icon="more_horiz" onClick={onOtra}>
          Otra…
        </Chip>
        {m.monto < 0 && (
          <Chip icon="person" onClick={() => onElegir('retiro_dueno', { personal: true })}>
            Es personal
          </Chip>
        )}
      </div>
    </motion.article>
  )
}

/** Mock estático: la misma tarjeta como mensaje de WhatsApp. */
function VistaWhatsApp({ movement: m }: { movement: BankMovement }) {
  const { business } = useApp()
  const cl = analysisFor(business.id)?.classifications.get(m.id)
  if (!cl) return null
  const alt = alternativas(m, cl.categoriaId, 1)[0]
  const texto = `${formatMoney(Math.abs(m.monto))} ${m.monto < 0 ? 'a' : 'de'} ${m.contraparteNombre ?? m.glosa}. ¿Es ${CATEGORIAS[cl.categoriaId].label}?\nResponde 1 Sí · 2 ${CATEGORIAS[alt].label} · 3 Personal · 4 Otro`
  return (
    <section className={styles.section} aria-label="Vista previa en WhatsApp">
      <div className={styles.whatsapp}>
        <span className={styles.muted} style={{ color: 'var(--z-wa-meta)', textAlign: 'center' }}>
          Zenity · WhatsApp (vista previa)
        </span>
        <p className={styles.waBubble}>
          {texto}
          <span className={styles.waTime}>10:31</span>
        </p>
        <p className={styles.waBubbleOut}>
          1<span className={styles.waTime}>10:32 ✓✓</span>
        </p>
        <p className={styles.waBubble}>
          ¡Gracias! Lo guardé como {CATEGORIAS[cl.categoriaId].label}. Te quedan pocos 💪
          <span className={styles.waTime}>10:32</span>
        </p>
      </div>
      <p className={styles.muted}>Así se vería la pregunta por WhatsApp. En esta etapa es solo una vista previa: no se envía nada.</p>
    </section>
  )
}

/**
 * Conciliaciones del mes con confianza media (0.60–0.89): Zenity ya las aplicó, pero el dueño puede
 * confirmarlas. No cuentan en «Por revisar» (decisión del prototipo).
 */
function ConfianzaMedia() {
  const { a, demo } = useZen()
  const { toast } = useApp()
  if (!a) return null
  const media = a.matches.filter((m) => {
    const mov = a.movementsById.get(m.movementIds[0])
    return m.confianza >= 0.6 && m.confianza < 0.9 && !demo.confirmados[m.id] && !!mov && monthOf(mov.fecha) === HOY.slice(0, 7)
  })
  if (media.length === 0) return null
  return (
    <section className={styles.section}>
      <SectionHead title="Conciliados con confianza media" hint={`${media.length} · ya aplicados`} />
      <div className={styles.list}>
        {media.map((m) => {
          const mov = a.movementsById.get(m.movementIds[0])!
          const responder = () => {
            responderConciliacion({ businessId: a.business.id, matchId: m.id, movementId: mov.id, regla: m.regla, motivo: m.motivo, respuesta: 'OK' })
            toast('Conciliación confirmada', 'task_alt')
          }
          return (
            <article key={m.id} className={styles.card}>
              <div className={styles.row} style={{ padding: 0, background: 'none', minHeight: 0 }}>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{tituloMovimiento(mov)}</span>
                  <span className={styles.rowSub}>
                    {fmtFecha(mov.fecha)} · {m.motivo}
                  </span>
                </span>
                <span className={styles.rowEnd}>
                  <Money value={mov.monto} sign="always" className={mov.monto > 0 ? styles.amountPos : undefined} />
                  <ConfidenceBadge confianza={m.confianza} showPct={false} />
                </span>
              </div>
              <div className={styles.actions}>
                <Pill tone="info">{REGLA_LABEL[m.regla]}</Pill>
                <Button size="sm" variant="tonal" icon="check" onClick={responder}>
                  Está bien
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
