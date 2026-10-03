import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { AccountSelector } from '../components/AccountSelector'
import { Amount } from '../components/Amount'
import { Button } from '../components/Button'
import { ImpactList, InsightList, QuickInsights, SectionHeader } from '../components/Insights'
import { MetricCard } from '../components/Metrics'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { CategoryRow, TransactionRow } from '../components/Transactions'
import { expenseQuickInsights, incomeQuickInsights, movementInsights } from '../data/insights'
import {
  avatarFor,
  categoryTotals,
  connectionName,
  filterByAccount,
  getPeriod,
  getTransactions,
  periodLabel,
  totals,
} from '../data/selectors'
import { formatDateTime } from '../lib/format'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Movements.module.css'

type Tab = 'todo' | 'ingresos' | 'egresos'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'todo', label: 'Todo' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'egresos', label: 'Egresos' },
]
const TITLES: Record<Tab, string> = { todo: 'Movimientos', ingresos: 'Ingresos', egresos: 'Egresos' }

function isTab(value: string | undefined): value is Tab {
  return value === 'todo' || value === 'ingresos' || value === 'egresos'
}

/** Cuenta / Ingresos / Egresos (Figma: Single account, Single account Incomes/Expenses). */
export function Movements() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const { connections, periodKey } = useApp()
  const [accountId, setAccountId] = useState<string | 'all'>('all')
  const [openCategory, setOpenCategory] = useState<string | null>('first')

  if (!isTab(tab)) return <Navigate to="/movimientos/todo" replace />

  const period = getPeriod(periodKey)
  const month = periodLabel(period)
  const txs = filterByAccount(getTransactions(periodKey), accountId)
  const t = totals(txs)
  const focus = tab === 'ingresos' ? 'income' : tab === 'egresos' ? 'expense' : 'all'
  const insights = movementInsights(txs, connections, accountId, month, focus)
  const incomeCats = categoryTotals(txs, 'income')
  const expenseCats = categoryTotals(txs, 'expense')

  const changeTab = (next: Tab) => {
    setOpenCategory('first')
    navigate(`/movimientos/${next}`, { replace: true })
  }

  const categoryList = (type: 'income' | 'expense') => {
    const cats = type === 'income' ? incomeCats : expenseCats
    return (
      <div className={styles.categories}>
        {cats.map((c, i) => {
          const open = openCategory === c.id || (openCategory === 'first' && i === 0)
          return (
            <CategoryRow
              key={c.id}
              category={c}
              type={type}
              connections={connections}
              open={open}
              onToggle={() => setOpenCategory(open ? null : c.id)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="z-page">
      <TopBar title={TITLES[tab]} />
      <div className="z-container">
        <div className={styles.top}>
          <AccountSelector connections={connections} value={accountId} onChange={setAccountId} />
          <SegmentedTabs tabs={TABS} value={tab} onChange={changeTab} label="Tipo de movimiento" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${tab}-${accountId}`}
            className={styles.content}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.decelerate } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {tab === 'todo' && (
              <>
                <div className={styles.metrics}>
                  <MetricCard label="Balance del mes" value={t.neto} tone="auto" sign="always" caption={month} />
                  <div className={styles.pair}>
                    <MetricCard label="Ingresos" value={t.ingresos} icon="up" caption={month} outlined />
                    <MetricCard label="Egresos" value={t.egresos} icon="down" caption={month} outlined />
                  </div>
                </div>
                <InsightList insights={insights} title="Resumen de hoy" />
                {incomeCats[0] && expenseCats[0] && (
                  <>
                    <SectionHeader title="Mayor impacto del mes" />
                    <ImpactList
                      items={[
                        {
                          id: incomeCats[0].id,
                          name: incomeCats[0].label,
                          caption: `${incomeCats[0].transactions.length} movimientos`,
                          amount: <Amount value={incomeCats[0].total} sign="always" />,
                          trend: 'up',
                          note: 'Principal fuente de ingresos de la cuenta.',
                        },
                        {
                          id: expenseCats[0].id,
                          name: expenseCats[0].label,
                          caption: `${expenseCats[0].transactions.length} movimientos`,
                          amount: <Amount value={-expenseCats[0].total} sign="always" />,
                          trend: 'down',
                          note: 'Categoría #1 de salida en el flujo.',
                        },
                      ]}
                    />
                  </>
                )}
                <SectionHeader title="Últimos movimientos" />
                <div className={styles.recent}>
                  {txs.slice(0, 5).map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      title={tx.title}
                      subtitle={`${connectionName(tx.accountId, connections)} · ${formatDateTime(tx.date)}`}
                      amount={tx.amount}
                      avatar={avatarFor(tx.accountId, connections)}
                    />
                  ))}
                  {txs.length === 0 && (
                    <p className="t-body-m t-low" style={{ padding: 24, textAlign: 'center' }}>
                      Sin movimientos en {month.toLowerCase()}.
                    </p>
                  )}
                </div>
                <div className={styles.ask}>
                  <Button variant="tonal" icon="auto_awesome" to={`/chat?q=${encodeURIComponent('Explícame este balance')}`}>
                    Pregúntale a Zenity
                  </Button>
                </div>
              </>
            )}

            {tab === 'ingresos' && (
              <>
                <div className={styles.metrics}>
                  <MetricCard label="Ingresos" value={t.ingresos} icon="up" size="lg" caption={month} />
                </div>
                <QuickInsights items={incomeQuickInsights(txs, connections, periodKey)} />
                <InsightList insights={insights} title="Resumen de hoy" />
                <SectionHeader title="Categorías con mayor impacto" />
                {categoryList('income')}
              </>
            )}

            {tab === 'egresos' && (
              <>
                <div className={styles.metrics}>
                  <MetricCard label="Egresos" value={t.egresos} icon="down" size="lg" caption={month} />
                </div>
                <QuickInsights items={expenseQuickInsights(txs, connections)} />
                <InsightList insights={insights} title="Resumen de hoy" />
                <SectionHeader title="Categorías con mayor impacto" />
                {categoryList('expense')}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
