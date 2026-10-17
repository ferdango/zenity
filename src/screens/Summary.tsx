import { motion } from 'motion/react'
import { useState } from 'react'
import { Amount } from '../components/Amount'
import { BarChart } from '../components/BarChart'
import { BusinessButton } from '../components/Business'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { InsightList } from '../components/Insights'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { businessName } from '../data/businesses'
import { balanceInsights } from '../data/insights'
import { getPeriod, periodLabel, periodShort, variation } from '../data/selectors'
import { formatCompactMoney } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Summary.module.css'

type Series = 'balance' | 'ingresos' | 'egresos'
const LABELS: Record<Series, string> = { balance: 'Balance total', ingresos: 'Ingresos', egresos: 'Egresos' }

/** Resumen con gráfico de barras (Figma: Resume). */
export function Summary() {
  const { periodKey, setPeriodKey, connections, ledger, business } = useApp()
  const [series, setSeries] = useState<Series>('balance')
  const periods = ledger.periods
  const period = getPeriod(ledger, periodKey)
  const selected = Math.max(0, periods.findIndex((p) => p.key === periodKey))
  const delta = variation(ledger, periodKey, series)
  const month = periodLabel(period)
  const good = series === 'egresos' ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0

  return (
    <div className="z-page">
      <TopBar title="Resumen" subtitle={businessName(business)} end={<BusinessButton />} />
      {ledger.empty ? (
        <div className="z-container z-gutter">
          <EmptyState
            title={`${businessName(business)} aún no tiene cuentas`}
            description="Conecta una cuenta de este RUC para ver su balance mes a mes."
            action={
              <Button icon="add" to="/conexiones/nueva">
                Conectar cuenta
              </Button>
            }
          />
        </div>
      ) : (
      <motion.div className="z-container" variants={staggerContainer(0.06)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.label}>{LABELS[series]}</span>
          <Amount value={period[series]} className={styles.amount} />
          <span className={styles.meta}>
            {month} {period.year}
            {delta !== null && (
              <span className={styles.delta} data-negative={!good}>
                <Icon name={delta >= 0 ? 'arrow_upward' : 'arrow_downward'} size={14} weight={600} />
                {Math.abs(delta)}% vs. {periodShort(periods[selected - 1] ?? period)}
              </span>
            )}
          </span>
        </motion.section>

        <motion.div className={styles.tabs} variants={fadeUp}>
          <SegmentedTabs<Series>
            label="Serie del gráfico"
            stretch
            value={series}
            onChange={setSeries}
            tabs={[
              { id: 'balance', label: 'Balance' },
              { id: 'ingresos', label: 'Ingresos' },
              { id: 'egresos', label: 'Egresos' },
            ]}
          />
        </motion.div>

        <motion.div className={styles.chart} variants={fadeUp}>
          <BarChart
            label={`${LABELS[series]} de los últimos 6 meses`}
            data={periods.map((p) => ({ label: periodShort(p), value: p[series] }))}
            selected={selected}
            onSelect={(i) => setPeriodKey(periods[i].key)}
            formatValue={formatCompactMoney}
          />
        </motion.div>

        <InsightList key={periodKey} insights={balanceInsights(ledger, periodKey, connections, month)} title="Explícame este balance" />

        <div className={styles.ask}>
          <Button variant="tonal" icon="auto_awesome" to={`/chat?q=${encodeURIComponent('Explícame este balance')}`}>
            Profundizar con Zenity
          </Button>
        </div>
      </motion.div>
      )}
    </div>
  )
}
