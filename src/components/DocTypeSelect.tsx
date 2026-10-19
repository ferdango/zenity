import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { DOC_ORDER, DOC_TYPES, type DocType } from '../lib/validation'
import { ease } from '../lib/motion'
import { Icon } from './Icon'
import styles from './DocTypeSelect.module.css'

/** Nombre completo de cada documento en el menú. */
const NAMES: Record<DocType, string> = { dni: 'Documento de identidad', pp: 'Pasaporte', ce: 'Carné de extranjería' }

interface DocTypeSelectProps {
  value: DocType
  onChange: (value: DocType) => void
}

/** Desplegable del tipo de documento (DNI, PP, CE), pensado para ir al lado del campo del número. */
export function DocTypeSelect({ value, onChange }: DocTypeSelectProps) {
  const [open, setOpen] = useState(false)

  const select = (next: DocType) => {
    setOpen(false)
    onChange(next)
  }

  return (
    <div
      className={styles.wrap}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        data-ripple=""
        className={styles.trigger}
        data-open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tipo de documento: ${NAMES[value]}`}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.label}>Tipo</span>
        <span className={styles.value}>{DOC_TYPES[value].short}</span>
        <motion.span className={styles.chevron} animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: ease.emphasized }}>
          <Icon name="expand_more" size={22} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              aria-label="Tipo de documento"
              className={styles.menu}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: ease.decelerate } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: ease.accelerate } }}
            >
              {DOC_ORDER.map((type) => (
                <li key={type} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={type === value}
                    data-ripple=""
                    className={styles.item}
                    onClick={() => select(type)}
                  >
                    <span>
                      <strong>{DOC_TYPES[type].short}</strong> · {NAMES[type]}
                    </span>
                    {type === value && <Icon name="check" size={20} />}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
