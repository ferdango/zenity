import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { TopBar } from '../components/TopBar'
import { ConfidenceBadge, LessonCard, Money, NoDemoData, Pill, ProgressBar, SectionHead, Why } from '../components/zen'
import { REGLA_LABEL } from '../components/zen/reglas'
import styles from '../components/zen/zen.module.css'
import { CATEGORIA_IDS, CATEGORIAS } from '../config/categories'
import { businessName } from '../data/businesses'
import { tituloMovimiento } from '../data/demoLedger'
import { alternativas, partyKey } from '../domain/categorization'
import { resumenMes } from '../domain/engine'
import type { BankMovement, CategoriaId, Comment } from '../domain/types'
import { fmtFecha, monthOf } from '../domain/util'
import { HOY } from '../config/demo'
import { formatMoney } from '../lib/format'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import {
  analysisFor,
  corregir,
  crearRegla,
  deshacer,
  marcarCreoRegla,
  responderConciliacion,
  responderPregunta,
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
  const preguntas = demo.comments.filter((c) => c.businessId === a.business.id && c.pregunta && !c.respondida)
  const pendientes = cola.length + preguntas.length
  // Revisados: los que corrigió el dueño y los que resolvió una de sus reglas
  const corregidos = new Set(demo.corrections.filter((c) => c.businessId === a.business.id && c.origen === 'APP').map((c) => c.movementId))
  const porRegla = [...a.classifications.values()].filter((c) => c.fuente === 'REGLA_NEGOCIO' && !corregidos.has(c.movementId)).length
  const revisados = corregidos.size + porRegla
  const total = pendientes + revisados
  const actual = cola[0]

  const conDeshacer = (mensaje: string, token: UndoToken, icon = 'check_circle') =>
    toast(mensaje, icon, { label: 'Deshacer', onClick: () => deshacer(token) })

  const elegir = (m: BankMovement, categoria: CategoriaId, opts: { personal?: boolean } = {}) => {
    const sugerida = a.classifications.get(m.id)?.categoriaId
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
    <div className="z-page">
      <TopBar
        title="Por revisar"
        subtitle={businessName(business)}
        hideBack
        end={
          <IconButton icon={whatsapp ? 'view_agenda' : 'chat'} label={whatsapp ? 'Ver como tarjeta' : 'Ver en WhatsApp'} variant="tonal" onClick={() => setWhatsapp(!whatsapp)} />
        }
      />
      <div className={`z-container ${styles.page}`}>
        {pendientes > 0 && (
          <section className={styles.section} aria-live="polite">
            <div className={styles.sectionHead}>
              <span className="t-title-m">
                Te quedan {pendientes} · ~{minutos} minuto{minutos === 1 ? '' : 's'}
              </span>
              <span className={styles.sectionHint}>
                {revisados} de {total} revisados
              </span>
            </div>
            <ProgressBar value={total ? revisados / total : 0} label="Avance de la revisión" />
          </section>
        )}

        {preguntas.map((p) => (
          <Pregunta key={p.id} pregunta={p} />
        ))}

        <AnimatePresence mode="popLayout" initial={false}>
          {actual && !whatsapp && (
            <ReviewCard
              key={actual.id}
              movement={actual}
              onElegir={(cat, opts) => elegir(actual, cat, opts)}
              onOtra={() => {
                setBusqueda('')
                setOtra(actual)
              }}
            />
          )}
        </AnimatePresence>

        {actual && whatsapp && <VistaWhatsApp movement={actual} />}

        {pendientes === 0 && (
          <motion.div className={styles.empty} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: ease.decelerate }}>
            <span className={styles.celebrate} aria-hidden>
              🎉
            </span>
            <p className="t-headline-s">¡Todo al día!</p>
            <p className={styles.muted}>
              {revisados > 0
                ? `Revisaste ${revisados} movimiento${revisados === 1 ? '' : 's'}. ${businessName(business)} va ${Math.round(resumenMes(a, HOY.slice(0, 7)).conciliado * 100)}% conciliado este mes.`
                : 'Zenity clasificó todo con confianza alta. No hay nada que revisar.'}
            </p>
            <div className={styles.actions} style={{ justifyContent: 'center' }}>
              <Button variant="tonal" icon="fact_check" to="/conciliacion">
                Ver conciliación
              </Button>
              <Button variant="text" icon="database" to="/datos">
                Datos de entrenamiento
              </Button>
            </div>
          </motion.div>
        )}
        <LessonCard id="L10" />

        <ConfianzaMedia />

        {actual && (
          <p className={styles.muted} style={{ textAlign: 'center' }}>
            Desliza la tarjeta a la derecha para confirmar. Cada respuesta enseña a Zenity y queda en{' '}
            <a href="#/datos" style={{ color: 'var(--z-primary)' }}>
              Datos de entrenamiento
            </a>
            .
          </p>
        )}
      </div>

      <BottomSheet open={!!otra} onClose={() => setOtra(null)} title="Elige la categoría">
        <div style={{ display: 'grid', gap: 10, padding: '0 0 16px' }}>
          <input
            className={styles.input}
            placeholder="Buscar categoría"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar categoría"
          />
          <div className={styles.list}>
            {CATEGORIA_IDS.filter((id) => CATEGORIAS[id].label.toLowerCase().includes(busqueda.toLowerCase())).map((id) => (
              <button key={id} type="button" className={styles.row} onClick={() => otra && elegir(otra, id, { personal: id === 'retiro_dueno' })}>
                <span className={styles.rowIcon}>
                  <Icon name={CATEGORIAS[id].icon} size={20} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{CATEGORIAS[id].label}</span>
                </span>
                <span />
              </button>
            ))}
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
  movement: m,
  onElegir,
  onOtra,
}: {
  movement: BankMovement
  onElegir: (c: CategoriaId, opts?: { personal?: boolean }) => void
  onOtra: () => void
}) {
  const { business } = useApp()
  const cl = analysisFor(business.id)?.classifications.get(m.id)
  if (!cl) return null
  const sugerida = cl.categoriaId
  const alts = alternativas(m, sugerida)
  return (
    <motion.article
      className={styles.reviewCard}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onElegir(sugerida)
      }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: ease.decelerate } }}
      exit={{ opacity: 0, x: 220, rotate: 6, transition: { duration: 0.25, ease: ease.accelerate } }}
      aria-label={`Movimiento por revisar: ${tituloMovimiento(m)}`}
    >
      <div className={styles.sectionHead} style={{ padding: 0 }}>
        <span className={styles.muted}>
          {fmtFecha(m.fecha)} · {m.fecha.slice(11, 16)}
        </span>
        <ConfidenceBadge confianza={cl.confianza} />
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
          <span className={styles.rowSub}>{cl.confianza < 0.6 ? 'No estamos seguros. ¿Es…?' : 'Sugerimos'}</span>
          <span className={styles.rowTitle}>{CATEGORIAS[sugerida].label}</span>
        </span>
      </div>
      <Why motivo={cl.motivo} />
      <Button size="lg" icon="check" onClick={() => onElegir(sugerida)}>
        Correcto
      </Button>
      <div className={styles.chipsWrap} role="group" aria-label="Otras categorías">
        {alts.map((c) => (
          <Chip key={c} icon={CATEGORIAS[c].icon} onClick={() => onElegir(c)}>
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

/** Pregunta del contador (F-08) que llega como tarjeta especial. */
function Pregunta({ pregunta }: { pregunta: Comment }) {
  const { business, toast } = useApp()
  const [texto, setTexto] = useState('')
  const m = analysisFor(business.id)?.movementsById.get(pregunta.movementId)
  const responder = (t: string) => {
    if (!t.trim()) return
    responderPregunta(pregunta, t.trim())
    toast('Respuesta enviada a tu contador', 'send')
  }
  return (
    <motion.article className={styles.reviewCard} style={{ background: 'var(--z-primary-container)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <span className={styles.lessonKicker} style={{ color: 'var(--z-on-primary-container)' }}>
        <Icon name="support_agent" size={18} />
        Tu contador pregunta
      </span>
      <p className="t-title-m">{pregunta.texto}</p>
      {m && (
        <p className={styles.small} style={{ color: 'var(--z-on-primary-container)' }}>
          {fmtFecha(m.fecha)} · {tituloMovimiento(m)} · {formatMoney(m.monto, 'always')}
        </p>
      )}
      <div className={styles.chipsWrap}>
        {['Es un gasto del negocio', 'Es personal', 'Te mando el comprobante'].map((r) => (
          <Chip key={r} onClick={() => responder(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
        <input className={styles.input} placeholder="Escribe tu respuesta" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Respuesta al contador" />
        <IconButton icon="send" label="Enviar respuesta" variant="filled" onClick={() => responder(texto)} />
      </div>
    </motion.article>
  )
}

/**
 * Conciliaciones del mes con confianza media (0.60–0.89): Zenity ya las aplicó, pero el dueño puede
 * confirmarlas o consultarlas con su contador. No cuentan en «Por revisar» (decisión del prototipo).
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
          const responder = (respuesta: 'OK' | 'CONSULTA') => {
            responderConciliacion({ businessId: a.business.id, matchId: m.id, movementId: mov.id, regla: m.regla, motivo: m.motivo, respuesta })
            toast(respuesta === 'OK' ? 'Conciliación confirmada' : 'Le preguntaste a tu contador', respuesta === 'OK' ? 'task_alt' : 'support_agent')
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
                <Button size="sm" variant="tonal" icon="check" onClick={() => responder('OK')}>
                  Está bien
                </Button>
                <Button size="sm" variant="text" icon="support_agent" onClick={() => responder('CONSULTA')}>
                  Preguntar a mi contador
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
