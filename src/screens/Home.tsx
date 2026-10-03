import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import sun from '../assets/sun.svg'
import { GradientText, ShimmerText } from '../components/AiText'
import { Button } from '../components/Button'
import { AccountCard } from '../components/Cards'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { InsightList } from '../components/Insights'
import { SummaryTile } from '../components/Metrics'
import { PeriodPicker } from '../components/PeriodPicker'
import { Spark } from '../components/Spark'
import { HOME_INSIGHTS, USER } from '../data/mock'
import { getPeriod, periodLabel, variation } from '../data/selectors'
import { GREETING, getDayPart } from '../lib/greeting'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Home.module.css'

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
  const { hideBalances, toggleHideBalances, periodKey, setDrawerOpen, openSheet, toast } = useApp()
  const scrolled = useScrolled()
  const [generating, setGenerating] = useState(false)
  const period = getPeriod(periodKey)
  const month = periodLabel(period)
  const dayPart = getDayPart()
  const greeting = GREETING[dayPart]
  const neto = Math.round((period.ingresos - period.egresos) * 100) / 100

  const generateReport = () => {
    if (generating) return
    setGenerating(true)
    window.setTimeout(() => {
      toast(`Tu reporte de ${month.toLowerCase()} está listo`, 'auto_awesome')
      navigate('/resumen')
    }, 1800)
  }

  return (
    <div className={`z-page ${styles.home}`}>
      <header className={styles.header} data-scrolled={scrolled}>
        <IconButton icon="menu" label="Abrir menú" className={styles.menuButton} onClick={() => setDrawerOpen(true)} />
        <span className={styles.headerTitle}>Mi billetera</span>
        <IconButton icon="notifications" label="Notificaciones" badge onClick={() => openSheet('notifications')} />
      </header>

      <div className={styles.layout}>
        <motion.div className={styles.primary} variants={staggerContainer(0.06)} initial="hidden" animate="show">
          <motion.section className={styles.greeting} variants={fadeUp}>
            {dayPart === 'morning' ? (
              <motion.img
                src={sun}
                alt=""
                className={styles.sun}
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <Icon name={greeting.icon} size={30} fill style={{ color: 'var(--z-celestial)' }} />
            )}
            <div>
              <span className={styles.live}>
                <span className="fx-live-dot" aria-hidden />
                Resumen
              </span>
              <h1 className={styles.hello}>
                {greeting.text}, <GradientText>{USER.firstName}</GradientText>
              </h1>
            </div>
            <button type="button" className={styles.eye} data-ripple="" onClick={toggleHideBalances} aria-pressed={hideBalances}>
              <Icon name={hideBalances ? 'visibility' : 'visibility_off'} size={26} />
              {hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
            </button>
          </motion.section>

          <motion.div className={styles.period} variants={fadeUp}>
            <PeriodPicker />
          </motion.div>

          <motion.div variants={fadeUp}>
            <Carousel />
          </motion.div>

          <motion.div variants={fadeUp} style={{ display: 'grid' }}>
            <Button variant="tonal" size="lg" icon="add" className={styles.addButton} to="/conexiones/nueva">
              Agrega una cuenta
            </Button>
          </motion.div>

          <motion.div className={styles.tiles} variants={staggerContainer(0.07)}>
            <motion.div variants={fadeUp}>
              <SummaryTile
                kind="income"
                label="Ingresos"
                value={period.ingresos}
                caption={month}
                to="/movimientos/ingresos"
                delta={variation(periodKey, 'ingresos')}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <SummaryTile
                kind="expense"
                label="Egresos"
                value={period.egresos}
                caption={month}
                to="/movimientos/egresos"
                delta={variation(periodKey, 'egresos')}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <SummaryTile kind="total" label="Total" value={neto} caption={month} to="/movimientos/todo" />
            </motion.div>
          </motion.div>
        </motion.div>

        <div className={styles.secondary}>
          <InsightList insights={HOME_INSIGHTS} title="Resumen al día de hoy" />
          <div className={styles.report}>
            <Button
              variant="tonal"
              size="lg"
              fullWidth
              className={styles.reportButton}
              icon={<Spark size={22} state={generating ? 'thinking' : 'idle'} />}
              onClick={generateReport}
              aria-busy={generating}
            >
              {generating ? <ShimmerText>Generando reporte…</ShimmerText> : 'Generar reporte completo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
