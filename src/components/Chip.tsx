import { AnimatePresence, motion } from 'motion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { ease } from '../lib/motion'
import styles from './Chip.module.css'
import { Icon } from './Icon'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** Muestra un check animado al seleccionarse (filter chip de Material 3) */
  showCheck?: boolean
  icon?: string | ReactNode
  tone?: 'neutral' | 'primary'
  size?: 'md' | 'lg'
  /** Borde con degradado de IA para la sugerencia recomendada */
  recommended?: boolean
}

export function Chip({
  selected,
  showCheck,
  icon,
  tone = 'neutral',
  size = 'md',
  recommended,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      data-ripple=""
      aria-pressed={rest.role ? undefined : selected}
      className={cn(
        styles.chip,
        size === 'lg' && styles.lg,
        selected && styles.selected,
        tone === 'primary' && styles.primary,
        recommended && styles.recommended,
        className,
      )}
      {...rest}
    >
      <AnimatePresence initial={false}>
        {showCheck && selected && (
          <motion.span
            className={styles.check}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 18, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: ease.emphasized }}
          >
            <Icon name="check" size={18} weight={500} />
          </motion.span>
        )}
      </AnimatePresence>
      {typeof icon === 'string' ? <Icon name={icon} size={18} /> : icon}
      {children}
    </button>
  )
}
