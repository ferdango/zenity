import { useCallback } from 'react'
import { cn } from '../lib/cn'
import { formatMoney, type SignDisplay } from '../lib/format'
import { useAnimatedNumber } from '../lib/useAnimatedNumber'
import { useApp } from '../state/context'
import styles from './Amount.module.css'

interface AmountProps {
  value: number
  sign?: SignDisplay
  /** auto: verde si es positivo y rojo si es negativo */
  tone?: 'neutral' | 'auto' | 'positive' | 'negative'
  animate?: boolean
  /** Ignora la preferencia "Ocultar saldos" */
  alwaysVisible?: boolean
  className?: string
}

/** Monto en soles con conteo animado y modo "ocultar saldos" con desenfoque. */
export function Amount({ value, sign = 'auto', tone = 'neutral', animate = true, alwaysVisible, className }: AmountProps) {
  const { hideBalances } = useApp()
  const hidden = hideBalances && !alwaysVisible
  const format = useCallback((n: number) => formatMoney(n, sign), [sign])
  const ref = useAnimatedNumber<HTMLSpanElement>(value, format, { enabled: animate })

  const resolvedTone = tone === 'auto' ? (value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral') : tone

  return (
    <span
      className={cn(
        styles.amount,
        hidden && styles.hidden,
        resolvedTone === 'positive' && styles.positive,
        resolvedTone === 'negative' && styles.negative,
        className,
      )}
    >
      <span className="visually-hidden">{hidden ? 'Saldo oculto' : formatMoney(value, sign)}</span>
      <span ref={ref} className={styles.value} aria-hidden />
      <span className={styles.mask} aria-hidden>
        S/ ••••••
      </span>
    </span>
  )
}
