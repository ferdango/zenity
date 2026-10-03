import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '../lib/cn'
import { spring } from '../lib/motion'
import styles from './SegmentedTabs.module.css'

interface Tab<T extends string> {
  id: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  tabs: Array<Tab<T>>
  value: T
  onChange: (value: T) => void
  label: string
  stretch?: boolean
  tone?: 'neutral' | 'primary'
  className?: string
}

/** Pestañas tipo píldora con indicador que se desliza entre opciones. */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  stretch,
  tone = 'neutral',
  className,
}: SegmentedTabsProps<T>) {
  const layoutId = useId()
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(styles.tabs, stretch && styles.stretch, tone === 'primary' && styles.primary, 'no-scrollbar', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-ripple=""
            className={styles.tab}
            onClick={() => onChange(tab.id)}
          >
            {selected && <motion.span layoutId={layoutId} className={styles.pill} transition={spring.snappy} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
