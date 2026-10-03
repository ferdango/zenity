import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import type { Connection } from '../data/mock'
import { cn } from '../lib/cn'
import { ease } from '../lib/motion'
import styles from './AccountSelector.module.css'
import { Amount } from './Amount'
import { BrandAvatar } from './Avatars'
import { Icon } from './Icon'

interface AccountSelectorProps {
  connections: Connection[]
  value: string | 'all'
  onChange: (id: string | 'all') => void
}

function Option({ connection }: { connection: Connection | null }) {
  if (!connection) {
    return (
      <>
        <span className={styles.allIcon}>
          <Icon name="account_balance_wallet" size={22} />
        </span>
        <span className={styles.name}>
          <strong>Consolidado</strong>
          <span>Todas las cuentas</span>
        </span>
      </>
    )
  }
  return (
    <>
      <BrandAvatar kind={connection.avatar} verified={connection.avatar === 'visa' || connection.avatar === 'mastercard'} />
      <span className={styles.name}>
        <strong>{connection.name}</strong>
        <span>{connection.last4 ? `•••• ${connection.last4}` : connection.label}</span>
      </span>
    </>
  )
}

/** Selector desplegable "Elige una cuenta" (Figma: Single account). */
export function AccountSelector({ connections, value, onChange }: AccountSelectorProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const current = connections.find((c) => c.id === value) ?? null
  const total = connections.reduce((acc, c) => acc + c.balance, 0)

  return (
    <div className={cn(styles.selector, open && styles.open)}>
      <button
        type="button"
        data-ripple=""
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <>
            <span />
            <span className="t-body-l">Elige una cuenta</span>
            <span />
          </>
        ) : (
          <>
            <Option connection={current} />
            <Amount value={current ? current.balance : total} className={styles.amount} />
          </>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: ease.emphasized }}>
          <Icon name="expand_more" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.list}
            initial={{ height: 0 }}
            animate={{ height: 'auto', transition: { duration: 0.4, ease: ease.emphasized } }}
            exit={{ height: 0, transition: { duration: 0.28, ease: ease.emphasized } }}
          >
            <div className={styles.listInner} role="listbox" id={listId} aria-label="Cuentas">
              {[null, ...connections].map((c, i) => {
                const id = c?.id ?? 'all'
                return (
                  <motion.button
                    key={id}
                    type="button"
                    role="option"
                    data-ripple=""
                    aria-selected={value === id}
                    className={styles.option}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * i, duration: 0.25 } }}
                    onClick={() => {
                      onChange(id)
                      setOpen(false)
                    }}
                  >
                    <Option connection={c} />
                    <Amount value={c ? c.balance : total} className={styles.amount} animate={false} />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
