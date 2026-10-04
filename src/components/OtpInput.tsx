import { motion } from 'motion/react'
import { type Ref, useState } from 'react'
import { cn } from '../lib/cn'
import { ease, spring } from '../lib/motion'
import styles from './OtpInput.module.css'

export type OtpStatus = 'idle' | 'verifying' | 'error' | 'success' | 'locked'

interface OtpInputProps {
  ref?: Ref<HTMLInputElement>
  id: string
  value: string
  /** Recibe solo los dígitos escritos o pegados, sin recortar */
  onChange: (digits: string) => void
  length?: number
  status?: OtpStatus
  readOnly?: boolean
  label: string
  describedBy?: string
}

/** El código se escribe y se borra siempre desde el último dígito. */
function caretToEnd(input: HTMLInputElement) {
  const end = input.value.length
  if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end)
}

/**
 * Código de un solo uso en casillas. Un único input invisible sobre las casillas recibe
 * el teclado, el pegado y el autocompletado del SMS (autocomplete="one-time-code").
 */
export function OtpInput({
  ref,
  id,
  value,
  onChange,
  length = 4,
  status = 'idle',
  readOnly,
  label,
  describedBy,
}: OtpInputProps) {
  const [focused, setFocused] = useState(false)
  const editable = status === 'idle' && !readOnly
  const current = Math.min(value.length, length - 1)

  return (
    <motion.div
      className={cn(styles.otp, styles[status])}
      animate={status === 'error' ? { x: [0, -12, 10, -8, 6, -3, 0] } : { x: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <input
        ref={ref}
        id={id}
        className={styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        enterKeyHint="done"
        spellCheck={false}
        value={value}
        readOnly={readOnly || status === 'verifying' || status === 'success'}
        disabled={status === 'locked'}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={status === 'error' || status === 'locked' || undefined}
        data-1p-ignore=""
        data-lpignore="true"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        onSelect={(event) => caretToEnd(event.currentTarget)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div className={styles.slots} aria-hidden>
        {Array.from({ length }, (_, i) => {
          const digit = value[i]
          const active = focused && editable && i === current
          return (
            <motion.span
              key={i}
              className={cn(styles.slot, 'fx-glow-border', digit && styles.filled)}
              data-active={active || status === 'verifying'}
              animate={status === 'success' ? { y: [0, -8, 0] } : { y: 0 }}
              transition={{ duration: 0.5, delay: status === 'success' ? i * 0.07 : 0, ease: ease.emphasized }}
            >
              {digit ? (
                <motion.span
                  key={digit}
                  className={styles.digit}
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={spring.bouncy}
                >
                  {digit}
                </motion.span>
              ) : (
                active && <span className={styles.caret} />
              )}
            </motion.span>
          )
        })}
      </div>
    </motion.div>
  )
}
