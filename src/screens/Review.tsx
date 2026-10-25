import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, useState } from 'react'
import { GradientText } from '../components/AiText'
import { Amount } from '../components/Amount'
import { BrandAvatar } from '../components/Avatars'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { MatchCard } from '../components/MatchCard'
import { Spark, SparkCluster } from '../components/Spark'
import { TopBar } from '../components/TopBar'
import { AUTO_SAME_SCORE } from '../data/matches'
import { CATEGORIES, type CategoryId, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type PendingTransaction } from '../data/mock'
import { avatarFor, connectionName } from '../data/selectors'
import { formatShortDate, maskNumber } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { type ClassifiedMovement, useApp } from '../state/context'
import styles from './Review.module.css'

type Filter = 'all' | 'income' | 'expense'
const FILTER_LABEL: Record<Filter, string> = { all: 'Todos', income: 'Ingresos', expense: 'Egresos' }

/** Por debajo de esta confianza, el movimiento se marca para que el usuario le eche un vistazo (sin exigirlo). */
const LOW_CONFIDENCE = 70

function suggestionsFor(tx: PendingTransaction): CategoryId[] {
  const base: CategoryId[] = tx.amount > 0 ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return [tx.recommended, ...base.filter((c) => c !== tx.recommended)]
}

/** «Zenity clasificó 8 movimientos y concilió 3 pares por ti» */
function summary(movements: number, pairs: number): string {
  const parts = [
    movements && `clasificó ${movements} ${movements === 1 ? 'movimiento' : 'movimientos'}`,
    pairs && `concilió ${pairs} ${pairs === 1 ? 'par' : 'pares'}`,
  ].filter((part): part is string => Boolean(part))
  return `Zenity ${parts.join(' y ')} por ti.`
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

/**
 * Revisado por Zenity (Figma: No-categorized ×4). Zenity clasifica sola los movimientos que
 * llegan sin categoría y concilia los pares de distintas conexiones («¿Es el mismo
 * movimiento?»): nada espera al usuario. Aquí ve qué decidió, por qué, y puede cambiarlo.
 */
export function Review() {
  const { classified, setCategory, reconciled, setMatchChoice, connections, toast } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [menu, setMenu] = useState(false)
  const total = classified.length + reconciled.length

  const inFilter = (amount: number) => filter === 'all' || (filter === 'income' ? amount > 0 : amount < 0)
  const visible = classified.filter((p) => inFilter(p.amount))
  const visibleMatches = reconciled.filter((r) => inFilter(r.match.legs[0].amount))
  const changed = classified.filter((p) => !p.auto).length + reconciled.filter((r) => !r.auto).length

  const changeCategory = (tx: ClassifiedMovement, category: CategoryId) => {
    if (category === tx.category) return
    setCategory(tx.id, category)
    if (category !== tx.recommended) toast('Listo. Zenity aplicará tu cambio a movimientos parecidos', 'school')
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
              <span className={styles.title}>Revisado por Zenity ({total})</span>
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
        {total === 0 ? (
          <motion.div className={styles.allDone} variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <Spark size={56} animateIn />
            </motion.div>
            <motion.h2 className="t-headline-m" variants={fadeUp}>
              <GradientText>¡Todo al día!</GradientText>
            </motion.h2>
            <motion.p className="t-body-l t-variant" variants={fadeUp}>
              No llegaron movimientos nuevos para clasificar ni conciliar.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button to="/inicio" icon="account_balance_wallet">
                Ir a mi billetera
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <>
            <motion.div className={styles.intro} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <SparkCluster size={22} />
              <span>
                <strong className={styles.introTitle}>{summary(classified.length, reconciled.length)}</strong>
                {changed > 0
                  ? ` Cambiaste ${changed === 1 ? '1 decisión' : `${changed} decisiones`}: Zenity aprende de tus cambios.`
                  : ' No tienes que hacer nada: ya suman en tus totales del mes. Si algo no te cuadra, cámbialo y Zenity aprenderá.'}
              </span>
            </motion.div>

            {visibleMatches.length > 0 && (
              <section className={styles.matches} aria-labelledby="mismo-movimiento">
                <h2 id="mismo-movimiento" className={styles.sectionTitle}>
                  <Icon name="link" size={20} />
                  Movimientos conciliados ({visibleMatches.length})
                </h2>
                <p className={styles.sectionText}>
                  Zenity encontró movimientos parecidos en distintas conexiones. Desde {AUTO_SAME_SCORE}% de coincidencia los
                  une y cuentan una sola vez; por debajo, los deja separados.
                </p>
                <motion.ul className={styles.matchList} variants={staggerContainer(0.06)} initial="hidden" animate="show">
                  {visibleMatches.map(({ match, choice, auto }) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      choice={choice}
                      auto={auto}
                      connections={connections}
                      onChoose={(next) => setMatchChoice(match.id, next)}
                    />
                  ))}
                </motion.ul>
              </section>
            )}
            {visible.length > 0 && (
              <h2 className={styles.sectionTitle}>
                <Icon name="category" size={20} />
                Movimientos clasificados ({visible.length})
              </h2>
            )}
            <motion.ul className={styles.list} variants={staggerContainer(0.04)} initial="hidden" animate="show">
              {visible.map((tx) => {
                const isOpen = open === tx.id
                const type = tx.amount > 0 ? 'income' : 'expense'
                const low = tx.auto && tx.confidence < LOW_CONFIDENCE
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
                            <motion.span
                              key={tx.category}
                              className={styles.tag}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                            >
                              <Icon name="check" size={14} weight={600} />
                              {CATEGORIES[tx.category].label}
                            </motion.span>
                          </AnimatePresence>
                          <span className={styles.decidedBy} data-tone={tx.auto ? (low ? 'low' : 'auto') : 'user'}>
                            {tx.auto ? `Zenity · ${tx.confidence}%` : 'Cambiado por ti'}
                          </span>
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
                                <dt>Cuenta:</dt>
                                <dd>{connectionName(tx.accountId, connections)}</dd>
                              </div>
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

                            <p className={styles.why}>
                              <SparkCluster size={22} />
                              <span>
                                <strong>
                                  Zenity eligió {CATEGORIES[tx.recommended].label} con {tx.confidence}% de confianza.
                                </strong>{' '}
                                {tx.reason}.
                              </span>
                            </p>
                            <div className={`${styles.chips} no-scrollbar`} role="radiogroup" aria-label="Categoría del movimiento">
                              {suggestionsFor(tx).map((cat, i) => (
                                <Chip
                                  key={cat}
                                  size="lg"
                                  role="radio"
                                  aria-checked={tx.category === cat}
                                  selected={tx.category === cat}
                                  showCheck
                                  recommended={i === 0}
                                  icon={i === 0 && tx.category !== cat ? <Spark size={16} /> : undefined}
                                  onClick={() => changeCategory(tx, cat)}
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
    </div>
  )
}
