import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useDeferredValue, useState } from 'react'
import type { AvatarKind, Connection } from '../data/mock'
import { avatarFor, type CategoryTotal } from '../data/selectors'
import { cn } from '../lib/cn'
import { formatDateTime } from '../lib/format'
import { ease } from '../lib/motion'
import { Amount } from './Amount'
import { BrandAvatar } from './Avatars'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './Transactions.module.css'

interface TransactionRowProps {
  title: string
  subtitle: string
  amount: number
  avatar: AvatarKind
  trailing?: ReactNode
  divided?: boolean
  onClick?: () => void
  className?: string
}

export function TransactionRow({ title, subtitle, amount, avatar, trailing, divided, onClick, className }: TransactionRowProps) {
  const content = (
    <>
      <BrandAvatar kind={avatar} verified={avatar === 'visa' || avatar === 'mastercard'} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSubtitle}>{subtitle}</span>
      </span>
      <span className={styles.rowEnd}>
        <Amount value={amount} sign="always" tone="auto" animate={false} />
        {trailing}
      </span>
    </>
  )
  if (onClick) {
    return (
      <button type="button" data-ripple="" className={cn(styles.row, divided && styles.divided, className)} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className={cn(styles.row, divided && styles.divided, className)}>{content}</div>
}

/** Categoría con total y panel de transacciones (búsqueda + "Ver más"). */
export function CategoryRow({
  category,
  type,
  connections,
  open,
  onToggle,
}: {
  category: CategoryTotal
  type: 'income' | 'expense'
  connections: Connection[]
  open: boolean
  onToggle: () => void
}) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(4)
  const deferred = useDeferredValue(query)
  const filtered = category.transactions.filter((t) => t.title.toLowerCase().includes(deferred.trim().toLowerCase()))
  const visible = filtered.slice(0, limit)
  const panelId = `panel-${category.id}`

  return (
    <motion.article
      layout="position"
      className={cn(styles.category, type === 'income' ? styles.income : styles.expense)}
      data-open={open}
    >
      <button
        type="button"
        data-ripple=""
        className={styles.categoryHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={styles.categoryIcon}>
          <Icon name={category.icon} size={22} />
        </span>
        <span>
          <span className="t-title-m" style={{ display: 'block' }}>
            {category.label}
          </span>
          <span className="t-body-s t-low">
            {category.transactions.length} mov. · {category.share}%
          </span>
        </span>
        <span className={styles.categoryAmount}>
          <Amount
            value={type === 'income' ? category.total : -category.total}
            sign="always"
            className={styles.categoryValue}
          />
          <span className="t-label-s t-low">este mes</span>
        </span>
        <motion.span className={styles.chevron} animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: ease.emphasized }}>
          <Icon name="expand_more" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.45, ease: ease.emphasized } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.3, ease: ease.emphasized } }}
          >
            <div className={styles.panelInner}>
              <h3 className={styles.panelTitle}>Transacciones</h3>
              <label className={styles.search}>
                <Icon name="search" size={20} />
                <span className="visually-hidden">Buscar en {category.label}</span>
                <input
                  type="search"
                  placeholder="Buscar"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {visible.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, duration: 0.3, ease: ease.decelerate } }}
                >
                  <TransactionRow
                    title={t.title}
                    subtitle={formatDateTime(t.date)}
                    amount={t.amount}
                    avatar={avatarFor(t.accountId, connections)}
                  />
                </motion.div>
              ))}
              {filtered.length === 0 && <p className={styles.noResults}>No hay transacciones que coincidan con «{query}».</p>}
              {filtered.length > limit && (
                <Button variant="tonal" className={styles.more} onClick={() => setLimit((l) => l + 4)}>
                  Ver más
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
