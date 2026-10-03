import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button'
import { CreditCard } from '../components/Cards'
import { Dialog } from '../components/Dialog'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { InsightList, SectionHeader } from '../components/Insights'
import { MetricCard } from '../components/Metrics'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { TransactionRow } from '../components/Transactions'
import { movementInsights } from '../data/insights'
import { filterByAccount, getPeriod, getTransactions, periodLabel, totals } from '../data/selectors'
import { formatDateTime } from '../lib/format'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './ConnectionDetail.module.css'

type Tab = 'todo' | 'ingresos' | 'egresos'

/** Detalle de una conexión (Figma: Single conection / Empty data). */
export function ConnectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { connections, periodKey, removeConnection, toast } = useApp()
  const [tab, setTab] = useState<Tab>('todo')
  const [confirm, setConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const found = connections.find((c) => c.id === id)
  // Conserva la última conexión vista para que la pantalla salga animada tras eliminarla.
  const [lastSeen, setLastSeen] = useState(found)
  if (found && found !== lastSeen) setLastSeen(found)
  const connection = found ?? lastSeen

  if (!connection) return <Navigate to="/inicio" replace />

  const month = periodLabel(getPeriod(periodKey))
  const all = filterByAccount(getTransactions(periodKey), connection.id)
  const t = totals(all)
  const list = all.filter((tx) => (tab === 'todo' ? true : tab === 'ingresos' ? tx.amount > 0 : tx.amount < 0))
  const empty = all.length === 0
  const [summary] = movementInsights(all, connections, connection.id, month, 'all')
  const insights = summary
    ? [{ ...summary, title: connection.id === 'tinbet' ? 'Cuenta Tinbet: ingresos estables de acuerdo a tu histórico' : summary.title }]
    : []

  const remove = () => {
    setConfirm(false)
    toast(`${connection.name} se eliminó de tu consolidado`, 'delete')
    navigate('/inicio', { replace: true })
    removeConnection(connection.id)
  }

  return (
    <div className="z-page">
      <TopBar title={connection.name} subtitle={connection.label} />
      <div className="z-container">
        <CreditCard connection={connection} />

        <div className={styles.tabs}>
          <SegmentedTabs<Tab>
            label="Filtrar movimientos"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'todo', label: 'Todo' },
              { id: 'ingresos', label: 'Ingresos' },
              { id: 'egresos', label: 'Egresos' },
            ]}
          />
        </div>

        {empty ? (
          <div className={styles.empty}>
            <EmptyState
              title="No encontramos datos"
              description="La cuenta aún no tiene movimientos disponibles"
              action={
                connection.avatar === 'sheet' ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) => {
                        if (event.target.files?.length) navigate('/analizando')
                      }}
                    />
                    <Button icon="upload_file" onClick={() => fileRef.current?.click()}>
                      Importar Excel
                    </Button>
                  </>
                ) : (
                  <Button icon="sync" to="/analizando">
                    Sincronizar ahora
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: ease.decelerate } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {tab === 'todo' ? (
                <div className={styles.pair}>
                  <MetricCard label="Ingresos" value={t.ingresos} icon="up" caption={month} />
                  <MetricCard label="Egresos" value={t.egresos} icon="down" caption={month} />
                </div>
              ) : (
                <div className={styles.single}>
                  <MetricCard
                    label={tab === 'ingresos' ? 'Ingresos' : 'Egresos'}
                    value={tab === 'ingresos' ? t.ingresos : t.egresos}
                    icon={tab === 'ingresos' ? 'up' : 'down'}
                    size="lg"
                    caption={month}
                  />
                </div>
              )}

              {tab === 'todo' && <InsightList insights={insights} title="Resumen al día de hoy" />}

              <SectionHeader title="Movimientos" />
              <div className={styles.list}>
                {list.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    title={tx.title}
                    subtitle={formatDateTime(tx.date)}
                    amount={tx.amount}
                    avatar={connection.avatar}
                  />
                ))}
                {list.length === 0 && (
                  <p className="t-body-m t-low" style={{ padding: 24, textAlign: 'center' }}>
                    Sin {tab} en {month.toLowerCase()}.
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <div className={styles.danger}>
          <Button variant="danger" size="lg" icon="link_off" onClick={() => setConfirm(true)}>
            Eliminar conexión
          </Button>
        </div>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        icon={
          <span className={styles.dangerIcon}>
            <Icon name="link_off" />
          </span>
        }
        title="¿Eliminar conexión?"
        actions={
          <>
            <Button variant="text" onClick={() => setConfirm(false)} data-autofocus="">
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove}>
              Eliminar
            </Button>
          </>
        }
      >
        Dejarás de ver los movimientos de {connection.name} en tu consolidado. Puedes volver a conectarla cuando quieras.
      </Dialog>
    </div>
  )
}
