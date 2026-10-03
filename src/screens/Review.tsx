import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { GradientText } from '../components/AiText'
import { Amount } from '../components/Amount'
import { BrandAvatar } from '../components/Avatars'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { Spark, SparkCluster } from '../components/Spark'
import { TopBar } from '../components/TopBar'
import { CATEGORIES, type CategoryId, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type PendingTransaction } from '../data/mock'
import { avatarFor, connectionName } from '../data/selectors'
import { formatShortDate, maskNumber } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Review.module.css'

type Filter = 'all' | 'income' | 'expense'
const FILTER_LABEL: Record<Filter, string> = { all: 'Todos', income: 'Ingresos', expense: 'Egresos' }

function suggestionsFor(tx: PendingTransaction): CategoryId[] {
  const base: CategoryId[] = tx.amount > 0 ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return [tx.recommended, ...base.filter((c) => c !== tx.recommended)]
}

function Teach({ onSave }: { onSave: (rule: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const save = () => {
    if (!value.trim()) return
    setSaved(value.trim())
    setEditing(false)
    onSave(value.trim())
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      save()
    }
  }

  if (saved) {
    return (
      <motion.p className={styles.learned} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <Icon name="check_circle" size={18} fill />
        <span>
          Regla guardada: «{saved}». Zenity aplicará lo aprendido a movimientos similares.
        </span>
      </motion.p>
    )
  }

  if (!editing) {
    return (
      <button type="button" className={styles.teach} data-ripple="" onClick={() => setEditing(true)}>
        <Icon name="edit_note" size={22} />
        Enséñame cómo identificarlo
      </button>
    )
  }

  return (
    <div className={`${styles.teach} fx-glow-border`} data-active="true">
      <Icon name="edit_note" size={22} />
      <textarea
        autoFocus
        rows={1}
        placeholder="Ej.: es un ingreso de un nuevo cliente, será mensual"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Describe cómo identificar este movimiento"
      />
      <Button size="sm" variant="filled" onClick={save} disabled={!value.trim()} aria-label="Guardar regla" icon="arrow_upward" />
    </div>
  )
}

/** Movimientos sin categoría con sugerencias de IA (Figma: No-categorized ×4). */
export function Review() {
  const navigate = useNavigate()
  const { pending, categorized, setCategory, applyReview, connections, toast } = useApp()
  const [open, setOpen] = useState<string | null>(pending[0]?.id ?? null)
  const [filter, setFilter] = useState<Filter>('all')
  const [menu, setMenu] = useState(false)
  const count = Object.keys(categorized).length

  const visible = pending.filter((p) => filter === 'all' || (filter === 'income' ? p.amount > 0 : p.amount < 0))

  const apply = () => {
    const n = applyReview()
    toast(`${n} ${n === 1 ? 'movimiento categorizado' : 'movimientos categorizados'}`, 'task_alt')
    navigate('/inicio')
  }

  return (
    <div className="z-page">
      <TopBar
        title={
          <span className={styles.menuAnchor}>
            <button
              type="button"
              className={styles.titleButton}
              data-ripple=""
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              <span className={styles.filterLabel}>
                {FILTER_LABEL[filter]} <Icon name="arrow_drop_down" size={18} />
              </span>
              <span className={styles.title}>Por revisar ({pending.length})</span>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  role="menu"
                  className={styles.menu}
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: ease.decelerate } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                >
                  {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filter === f}
                      className={styles.menuItem}
                      data-ripple=""
                      onClick={() => {
                        setFilter(f)
                        setMenu(false)
                      }}
                    >
                      {FILTER_LABEL[f]}
                      {filter === f && <Icon name="check" size={20} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        }
      />

      <div className="z-container" style={{ flex: 1 }}>
        {pending.length === 0 ? (
          <motion.div className={styles.allDone} variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <Spark size={56} animateIn />
            </motion.div>
            <motion.h2 className="t-headline-m" variants={fadeUp}>
              <GradientText>¡Todo al día!</GradientText>
            </motion.h2>
            <motion.p className="t-body-l t-variant" variants={fadeUp}>
              No tienes movimientos pendientes de revisar.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button to="/inicio" icon="account_balance_wallet">
                Ir a mi billetera
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <>
            <motion.p className={styles.intro} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <SparkCluster size={22} />
              Zenity no pudo clasificar estos movimientos con seguridad. Elige una sugerencia y aprenderá de ti.
            </motion.p>
            <motion.ul className={styles.list} variants={staggerContainer(0.04)} initial="hidden" animate="show">
              {visible.map((tx) => {
                const isOpen = open === tx.id
                const chosen = categorized[tx.id]
                const type = tx.amount > 0 ? 'income' : 'expense'
                return (
                  <motion.li key={tx.id} className={styles.item} data-open={isOpen} variants={fadeUp} layout="position">
                    <button
                      type="button"
                      className={styles.row}
                      data-ripple=""
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : tx.id)}
                    >
                      <BrandAvatar kind={avatarFor(tx.accountId, connections)} verified={avatarFor(tx.accountId, connections) === 'visa'} />
                      <span className={styles.rowText}>
                        <span className={styles.rowTitle}>{tx.title}</span>
                        <span className={styles.rowSub}>
                          <AnimatePresence mode="popLayout" initial={false}>
                            {chosen ? (
                              <motion.span
                                key={chosen}
                                className={styles.tag}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                              >
                                <Icon name="check" size={14} weight={600} />
                                {CATEGORIES[chosen].label}
                              </motion.span>
                            ) : (
                              <motion.span key="source" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {connectionName(tx.accountId, connections)}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </span>
                      <Amount value={tx.amount} sign="always" tone="auto" animate={false} className={styles.amount} />
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: ease.emphasized }}>
                        <Icon name="expand_more" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className={styles.panel}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1, transition: { duration: 0.45, ease: ease.emphasized } }}
                          exit={{ height: 0, opacity: 0, transition: { duration: 0.3, ease: ease.emphasized } }}
                        >
                          <div className={styles.panelInner}>
                            <h3 className={styles.detailTitle}>Detalle de transacción</h3>
                            <dl className={styles.details}>
                              <div>
                                <dt>Fecha:</dt>
                                <dd>{formatShortDate(tx.date)}</dd>
                              </div>
                              <div>
                                <dt>N.º de operación:</dt>
                                <dd>{tx.operation}</dd>
                              </div>
                              <div>
                                <dt>Origen:</dt>
                                <dd>{/^\d+$/.test(tx.origin) ? maskNumber(tx.origin) : tx.origin}</dd>
                              </div>
                              <div>
                                <dt>Destino:</dt>
                                <dd>{/^\d+$/.test(tx.destination) ? maskNumber(tx.destination) : tx.destination}</dd>
                              </div>
                              <div>
                                <dt>Categoría principal:</dt>
                                <dd className={styles.mainCategory}>
                                  <Icon
                                    name={type === 'income' ? 'trending_up' : 'trending_down'}
                                    size={20}
                                    style={{ color: type === 'income' ? 'var(--z-positive)' : 'var(--z-negative)' }}
                                  />
                                  {type === 'income' ? 'Ingreso' : 'Egreso'}
                                </dd>
                              </div>
                            </dl>

                            <div className={styles.suggestHead}>
                              <SparkCluster size={22} />
                              Sugerencias de IA:
                            </div>
                            <div className={`${styles.chips} no-scrollbar`} role="radiogroup" aria-label="Categorías sugeridas">
                              {suggestionsFor(tx).map((cat, i) => (
                                <Chip
                                  key={cat}
                                  size="lg"
                                  role="radio"
                                  aria-checked={chosen === cat}
                                  selected={chosen === cat}
                                  showCheck
                                  recommended={i === 0}
                                  icon={i === 0 && chosen !== cat ? <Spark size={16} /> : undefined}
                                  onClick={() => setCategory(tx.id, chosen === cat ? null : cat)}
                                >
                                  {CATEGORIES[cat].label}
                                </Chip>
                              ))}
                            </div>

                            <Teach onSave={() => toast('Zenity aprendió una nueva regla', 'school')} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </motion.ul>
          </>
        )}
      </div>

      {pending.length > 0 && (
        <div className="z-action-bar">
          <div className="z-container z-stack">
            <Button size="lg" fullWidth disabled={count === 0} onClick={apply}>
              Aplicar ({count})
            </Button>
            <Button size="lg" fullWidth variant="outlined" onClick={() => navigate('/inicio')}>
              Omitir ahora
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
