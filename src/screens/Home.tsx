import { motion } from 'motion/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BusinessSwitcher } from '../components/Business'
import { Button } from '../components/Button'
import { AccountCard } from '../components/Cards'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { InsightList, SectionHeader } from '../components/Insights'
import { SummaryTile } from '../components/Metrics'
import { PeriodPicker } from '../components/PeriodPicker'
import { Spark } from '../components/Spark'
import { Tour } from '../components/Tour'
import { Money } from '../components/zen'
import { Avance } from '../components/zen/Avance'
import { DecisionSemana } from '../components/zen/DecisionSemana'
import { AlertaCaja, ConfigurarZenity, LeccionInicio } from '../components/zen/Inicio'
import { SunatMes } from '../components/zen/SunatMes'
import { OrigenSaldo } from '../components/zen/OrigenSaldo'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { movementInsights } from '../data/insights'
import { formatDue, sirePeriod, totalAPagar, vencimiento } from '../data/sire'
import { getPeriod, getTransactions, periodLabel, variation } from '../data/selectors'
import { TOUR_STEPS } from '../data/tour'
import { FEATURES } from '../lib/features'
import { MONTHS } from '../lib/format'
import { GREETING, getDayPart } from '../lib/greeting'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useSire } from '../lib/useSire'
import { track } from '../lib/analytics'
import { useApp } from '../state/context'
import { useAvisos } from '../state/useAvisos'
import { useResultados, useZen } from '../state/useZen'
import { fmtFecha } from '../domain/util'
import { ChatPanel } from './Chat'
import styles from './Home.module.css'

/** Desde este ancho el Inicio muestra el chat a la derecha (en móvil no cambia nada). */
const CHAT_PANEL_QUERY = '(min-width: 1180px)'

/** Acciones rápidas del dueño (lo que no está en la barra inferior). */
const ACCIONES = [
  { to: '/conexiones/nueva', icon: 'add_link', label: 'Conectar', tone: 'qViolet' },
  { to: '/conciliacion?subir=1', icon: 'upload_file', label: 'Extracto', tone: 'qBlue' },
  { to: '/chat', icon: 'spark', label: 'Pregúntale', tone: 'qMagenta' },
  { to: '/mas', icon: 'more_horiz', label: 'Más', tone: 'qGray' },
] as const

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

/**
 * En el celular, mientras la banda violeta sigue detrás del encabezado, este va transparente
 * y en blanco; al salir de la banda pasa al vidrio normal.
 */
function useOnBand(band: RefObject<HTMLElement | null>, enabled: boolean) {
  const [onBand, setOnBand] = useState(true)
  useEffect(() => {
    if (!enabled) return
    const update = () => {
      const rect = band.current?.getBoundingClientRect()
      setOnBand(Boolean(rect && rect.bottom > 72))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [band, enabled])
  return enabled && onBand
}

function Carousel() {
  const { connections } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    const step = (card?.offsetWidth ?? 214) + 10
    setActive(Math.min(connections.length - 1, Math.round(el.scrollLeft / step)))
  }

  const goTo = (index: number) => {
    const el = ref.current
    const card = el?.children[index] as HTMLElement | undefined
    if (el && card) el.scrollTo({ left: card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: 'smooth' })
  }

  return (
    <div className={styles.carouselWrap}>
      <motion.div
        ref={ref}
        className={`${styles.carousel} no-scrollbar`}
        onScroll={onScroll}
        variants={staggerContainer(0.07, 0.15)}
        initial="hidden"
        animate="show"
        aria-label="Tus cuentas"
      >
        {connections.map((c) => (
          <motion.div
            key={c.id}
            variants={{
              hidden: { opacity: 0, x: 40, scale: 0.95 },
              show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.6, ease: ease.decelerate } },
            }}
            style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
          >
            <AccountCard connection={c} />
          </motion.div>
        ))}
      </motion.div>
      <div className={styles.dots} role="tablist" aria-label="Cuentas">
        {connections.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={styles.dotButton}
            aria-current={i === active}
            aria-label={`Ir a ${c.name}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}

/** Inicio / billetera (Figma: Home). */
export function Home() {
  const navigate = useNavigate()
  const {
    hideBalances,
    toggleHideBalances,
    periodKey,
    setDrawerOpen,
    openSheet,
    toast,
    profile,
    tourDone,
    tourActive,
    startTour,
    endTour,
    business,
    connections,
    ledger,
  } = useApp()
  const scrolled = useScrolled()
  // Saldo de la banda violeta: el de la cuenta BCP (demo) o, si no hay, el de las conexiones
  const { a } = useZen()
  const saldoInicio = a ? { saldo: a.saldoActual, fecha: fmtFecha(HOY) } : null
  // Último mes cerrado del estado de resultados (el mes en curso aún no tiene todos sus pagos)
  const resultados = useResultados()
  const cerrado = [...resultados].reverse().find((e) => !e.enCurso) ?? null
  // En escritorio, el chat «Pregúntale a Zenity» vive a la derecha del Inicio
  const chatPanel = useMediaQuery(CHAT_PANEL_QUERY)
  const bandRef = useRef<HTMLElement>(null)
  const onBand = useOnBand(bandRef, useMediaQuery('(max-width: 1023.98px)'))
  const avisos = useAvisos()
  const sire = useSire()
  const taxPeriod = sirePeriod(sire, periodKey)
  const period = getPeriod(ledger, periodKey)
  const month = periodLabel(period)
  const greeting = GREETING[getDayPart()]
  const neto = Math.round((period.ingresos - period.egresos) * 100) / 100
  const name = businessName(business)
  const saldoConexiones = connections.reduce((sum, c) => sum + c.balance, 0)
  // Insights del negocio: los del Figma para el negocio base; para el resto, generados de sus datos
  const insights =
    ledger.insights ??
    movementInsights(getTransactions(ledger, periodKey), connections, 'all', month, 'all').map((insight, i) =>
      i === 0 ? { ...insight, title: `${name}: así cerró ${month.toLowerCase()}` } : insight,
    )

  // Primer ingreso: recorrido de bienvenida cuando el inicio ya terminó de animarse
  useEffect(() => {
    if (tourDone || tourActive) return
    const timer = window.setTimeout(startTour, 1200)
    return () => window.clearTimeout(timer)
  }, [tourDone, tourActive, startTour])

  const finishTour = (completed: boolean) => {
    endTour()
    track('tutorial_finalizado', { completado: completed })
    toast(
      completed ? '¡Listo! Ya conoces Zenity' : 'Puedes ver el tutorial cuando quieras desde el menú',
      completed ? 'celebration' : 'tour',
    )
  }

  // El reporte de cada mes ya está hecho: Zenity lo genera al cierre y lo mantiene al día
  const openReport = () => {
    track('reporte_abierto')
    navigate('/resumen')
  }

  // Las preguntas del dueño, de un vistazo: cuánto entró, cuánto salió y cuánto queda
  const tiles = (
    <motion.div
      className={styles.tiles}
      variants={staggerContainer(0.07)}
      data-tour="summary"
      role="group"
      aria-label={`${name} de un vistazo`}
    >
      <motion.div variants={fadeUp}>
        <SummaryTile
          kind="income"
          label="Ingresos"
          value={period.ingresos}
          caption={`Entró en ${month.toLowerCase()}`}
          to="/movimientos/ingresos"
          delta={variation(ledger, periodKey, 'ingresos')}
        />
      </motion.div>
      <motion.div variants={fadeUp}>
        <SummaryTile
          kind="expense"
          label="Egresos"
          value={period.egresos}
          caption={`Salió en ${month.toLowerCase()}`}
          to="/movimientos/egresos"
          delta={variation(ledger, periodKey, 'egresos')}
        />
      </motion.div>
      <motion.div variants={fadeUp} className={styles.tileWide}>
        {/* La utilidad real sale del estado de resultados (sin IGV ni retiros); entró menos salió es solo el flujo */}
        {cerrado ? (
          <SummaryTile
            kind="total"
            label={`Utilidad de ${MONTHS[Number(cerrado.mes.slice(5, 7)) - 1].toLowerCase()}`}
            value={cerrado.utilidadNeta}
            caption="Lo que ganaste de verdad · estado de resultados"
            to="/resultados"
            status={cerrado.margenNeto === null ? undefined : { label: `Margen ${Math.round(cerrado.margenNeto * 100)}%`, negative: cerrado.utilidadNeta < 0 }}
          />
        ) : (
          <SummaryTile
            kind="total"
            label="Flujo del mes"
            value={neto}
            caption={`Entró menos salió en ${month.toLowerCase()}`}
            to="/movimientos/todo"
          />
        )}
      </motion.div>
      {FEATURES.sunatSire && (
        <motion.div variants={fadeUp}>
          <SummaryTile
            kind="tax"
            label="Impuestos SUNAT"
            value={totalAPagar(taxPeriod, sire.regimen)}
            caption={`IGV + Renta · vence el ${formatDue(vencimiento(taxPeriod.key, business.ruc))}`}
            to="/sunat/impuestos"
          />
        </motion.div>
      )}
    </motion.div>
  )

  return (
    <div className={`z-page ${styles.home}`} data-chat={chatPanel || undefined}>
      <div className={styles.column}>
        <header className={styles.header} data-scrolled={scrolled} data-on-band={onBand}>
          <IconButton
            icon="menu"
            label="Abrir menú"
            className={styles.menuButton}
            onClick={() => setDrawerOpen(true)}
            data-tour="menu"
          />
          <BusinessSwitcher />
          <IconButton
            icon="notifications"
            label="Notificaciones"
            badge={avisos ? avisos.some((n) => n.urgente) : true}
            onClick={() => openSheet('notifications')}
            data-tour="notifications"
          />
        </header>

        <div className={styles.layout} data-simple={!FEATURES.inicioClasico || undefined}>
          <motion.div className={styles.primary} variants={staggerContainer(0.06)} initial="hidden" animate="show">
            {/* Banda violeta: saludo, saldo y fecha (estilo «Digital Wallet») */}
            <motion.section ref={bandRef} className={styles.band} variants={fadeUp} data-tour="saldo">
              <h1 className={styles.bandHello} data-tour="greeting">
                {greeting.text}, {profile.firstName}
              </h1>
              <span className={styles.bandLabel}>{saldoInicio ? 'Saldo actual · BCP cuenta corriente' : 'Saldo en tus conexiones'}</span>
              <Money animated value={saldoInicio?.saldo ?? saldoConexiones} className={styles.bandAmount} />
              <div className={styles.bandPills}>
                {saldoInicio && <OrigenSaldo className={styles.bandPill} fuente="BCP cuenta corriente" />}
                <button type="button" className={styles.bandPill} data-ripple="" onClick={toggleHideBalances} aria-pressed={hideBalances}>
                  <Icon name={hideBalances ? 'visibility' : 'visibility_off'} size={16} />
                  {hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
                </button>
              </div>
            </motion.section>

            {/* 2 · El riesgo que viene: la alerta de caja */}
            <div className={styles.bloque}>
              <AlertaCaja />
            </div>

            {/* Sin cuentas conectadas, lo primero es conectar una */}
            {ledger.empty && (
              <motion.div variants={fadeUp} className={styles.emptyWrap} data-tour="accounts">
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <Icon name="add_card" size={28} />
                  </span>
                  <h2 className={styles.emptyTitle}>Conecta la primera cuenta de {name}</h2>
                  <p className={styles.emptyText}>Bancos, billeteras, APIs o archivos. Aquí solo verás los movimientos de este RUC.</p>
                  <Button size="lg" icon="add" to="/conexiones/nueva" data-tour="add-account">
                    Conectar cuenta
                  </Button>
                </div>
              </motion.div>
            )}

            {FEATURES.inicioClasico && (
              <motion.div className={styles.period} variants={fadeUp}>
                <div data-tour="period">
                  <PeriodPicker />
                </div>
              </motion.div>
            )}

            {/* 3 · Cómo le va al negocio este mes */}
            {!ledger.empty && (
              <motion.h2 className={styles.monthTitle} variants={fadeUp}>
                Cómo te va en {month.toLowerCase()}
              </motion.h2>
            )}
            {tiles}

            {/* 4 · Qué hacer con esos números y 5 · lo que hay que pagar a SUNAT */}
            <div className={styles.bloque}>
              <DecisionSemana />
              <SunatMes />
            </div>

            {/* 6 · Dónde está la plata */}
            {!ledger.empty && (
              <>
                <motion.h2 className={styles.monthTitle} variants={fadeUp}>
                  Tus cuentas
                </motion.h2>
                <motion.div variants={fadeUp} data-tour="accounts">
                  <Carousel />
                </motion.div>
                <motion.div variants={fadeUp} style={{ display: 'grid' }}>
                  <Button variant="tonal" size="lg" icon="link" className={styles.addButton} to="/conexiones" data-tour="add-account">
                    Ver y agregar conexiones
                  </Button>
                </motion.div>
              </>
            )}

            {/* 7 · Atajos */}
            <motion.nav className={styles.quick} variants={fadeUp} aria-label="Acciones rápidas">
              {ACCIONES.map((accion) => (
                <Link
                  key={accion.to}
                  to={accion.to}
                  className={styles.quickItem}
                  data-ripple=""
                  onClick={(event) => {
                    // En escritorio, «Pregúntale» lleva al chat de la derecha sin salir del Inicio
                    if (accion.to === '/chat' && chatPanel) {
                      event.preventDefault()
                      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Mensaje para Zenity"]')?.focus()
                    }
                  }}
                >
                  <span className={`${styles.quickIcon} ${styles[accion.tone]}`}>
                    {accion.icon === 'spark' ? <Spark size={24} /> : <Icon name={accion.icon} size={24} />}
                  </span>
                  {accion.label}
                </Link>
              ))}
            </motion.nav>

            {/* 8 · Configuración, tu avance de aprendizaje y la lección del día */}
            <div className={styles.bloque}>
              <ConfigurarZenity />
              <Avance />
              <LeccionInicio />
            </div>
          </motion.div>

          {FEATURES.inicioClasico && (
            <div className={styles.secondary}>
              {ledger.empty ? (
                <section className={styles.emptyInsights}>
                  <SectionHeader title="Resumen al día de hoy" tourId="insights" />
                  <p className={styles.emptyText}>Cuando conectes una cuenta, Zenity analizará los movimientos de {name} y te explicará lo más importante.</p>
                </section>
              ) : (
                <InsightList key={business.id} insights={insights} title="Resumen al día de hoy" tourId="insights" />
              )}
              <div className={styles.report} hidden={ledger.empty}>
                <Button variant="tonal" size="lg" fullWidth className={styles.reportButton} icon={<Spark size={22} />} onClick={openReport} data-tour="report">
                  Ver reporte de {month.toLowerCase()}
                </Button>
                <p className={styles.reportNote}>
                  <Icon name="autorenew" size={16} />
                  Zenity lo genera solo cada mes y lo actualiza a diario
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {chatPanel && (
        <motion.aside
          className={styles.chat}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.45, ease: ease.decelerate, delay: 0.15 } }}
        >
          <ChatPanel />
        </motion.aside>
      )}

      {tourActive && <Tour steps={TOUR_STEPS} firstName={profile.firstName} onFinish={finishTour} />}
    </div>
  )
}
