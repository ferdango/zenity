import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, type InputHTMLAttributes, type ReactNode, useId, useState } from 'react'
import { cn } from '../lib/cn'
import { Icon } from './Icon'
import styles from './TextField.module.css'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  label: string
  icon?: string
  /** Texto fijo antes del valor (p. ej. "+51" o "S/") */
  prefix?: string
  /** Error a mostrar (solo cuando el campo ya fue tocado) */
  error?: string | null
  helper?: string
  /** Muestra un check verde cuando el valor es válido */
  valid?: boolean
  trailing?: ReactNode
  /** Mantiene la etiqueta arriba (inputs de fecha) */
  floatLabel?: boolean
  /** Dato verificado (RENIEC, SUNAT): solo lectura, con candado */
  locked?: boolean
  /** Destaca por un momento el campo recién completado automáticamente */
  autofilled?: boolean
}

/** Campo de texto "filled" de Material 3 con etiqueta flotante y brillo de Gemini al enfocar. */
export function TextField({
  label,
  icon,
  prefix,
  error,
  helper,
  valid,
  trailing,
  floatLabel,
  locked,
  autofilled,
  className,
  id,
  onFocus,
  onBlur,
  ...input
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-msg`
  const [focused, setFocused] = useState(false)
  const message = error || helper
  const style = prefix ? ({ '--prefix-pad': `${prefix.length * 0.62 + 0.45}em` } as CSSProperties) : undefined

  return (
    <div
      className={cn(
        styles.field,
        error && styles.invalid,
        !input.value && styles.empty,
        locked && styles.locked,
        autofilled && styles.autofilled,
        className,
      )}
    >
      <label htmlFor={inputId} className={cn(styles.box, 'fx-glow-border')} data-active={focused && !error && !locked}>
        {icon && <Icon name={icon} size={22} className={styles.icon} />}
        <span className={cn(styles.control, floatLabel && styles.float)} style={style}>
          <input
            id={inputId}
            placeholder=" "
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            onFocus={(event) => {
              setFocused(true)
              onFocus?.(event)
            }}
            onBlur={(event) => {
              setFocused(false)
              onBlur?.(event)
            }}
            {...input}
            readOnly={locked || input.readOnly}
          />
          <span className={styles.label}>{label}</span>
          {prefix && (
            <span className={styles.prefix} aria-hidden>
              {prefix}
            </span>
          )}
        </span>
        <AnimatePresence>
          {valid && !error && (
            <motion.span
              className={styles.check}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            >
              <Icon name="check_circle" size={22} fill />
            </motion.span>
          )}
        </AnimatePresence>
        {trailing}
        {locked && <Icon name="lock" size={18} className={styles.lock} label="Dato verificado, no editable" />}
      </label>
      <AnimatePresence initial={false} mode="wait">
        {message && (
          <motion.p
            key={error ? `e-${error}` : 'helper'}
            id={messageId}
            className={cn(styles.message, error && styles.error)}
            role={error ? 'alert' : undefined}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {error && <Icon name="error" size={16} fill />}
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
