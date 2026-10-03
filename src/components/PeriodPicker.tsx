import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { PERIODS } from '../data/mock'
import { getPeriod } from '../data/selectors'
import { cn } from '../lib/cn'
import { MONTHS } from '../lib/format'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import { Icon } from './Icon'
import styles from './PeriodPicker.module.css'

type MenuKind = 'month' | 'year' | null

/** Selector de periodo (Figma: píldoras "Marzo" + "2026") con menús de Material 3. */
export function PeriodPicker() {
  const { periodKey, setPeriodKey } = useApp()
  const [menu, setMenu] = useState<MenuKind>(null)
  const period = getPeriod(periodKey)
  const years = [...new Set(PERIODS.map((p) => p.year))]
  const monthsOfYear = PERIODS.filter((p) => p.year === period.year)

  const select = (key: string) => {
    setPeriodKey(key)
    setMenu(null)
  }

  return (
    <div className={styles.picker}>
      <button
        type="button"
        data-ripple=""
        className={cn(styles.pill, styles.month)}
        aria-haspopup="menu"
        aria-expanded={menu === 'month'}
        onClick={() => setMenu(menu === 'month' ? null : 'month')}
      >
        <Icon name="calendar_month" size={18} />
        {MONTHS[period.month]}
      </button>
      <button
        type="button"
        data-ripple=""
        className={cn(styles.pill, styles.year)}
        aria-haspopup="menu"
        aria-expanded={menu === 'year'}
        onClick={() => setMenu(menu === 'year' ? null : 'year')}
      >
        {period.year}
      </button>

      <AnimatePresence>
        {menu && (
          <>
            <div className={styles.backdrop} onClick={() => setMenu(null)} />
            <motion.div
              role="menu"
              className={cn(styles.menu, menu === 'year' && styles.menuRight)}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: ease.decelerate } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: ease.accelerate } }}
            >
              {menu === 'month'
                ? monthsOfYear.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={p.key === periodKey}
                      data-ripple=""
                      className={styles.item}
                      onClick={() => select(p.key)}
                    >
                      {MONTHS[p.month]}
                      {p.key === periodKey && <Icon name="check" size={20} />}
                    </button>
                  ))
                : years.map((year) => {
                    const last = [...PERIODS].reverse().find((p) => p.year === year)!
                    return (
                      <button
                        key={year}
                        type="button"
                        role="menuitemradio"
                        aria-checked={year === period.year}
                        data-ripple=""
                        className={styles.item}
                        onClick={() => select(last.key)}
                      >
                        {year}
                        {year === period.year && <Icon name="check" size={20} />}
                      </button>
                    )
                  })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
