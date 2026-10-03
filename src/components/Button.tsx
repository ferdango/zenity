import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/cn'
import styles from './Button.module.css'
import { Icon } from './Icon'

export type ButtonVariant = 'filled' | 'tonal' | 'primaryTonal' | 'outlined' | 'text' | 'danger'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  ref?: Ref<HTMLButtonElement>
  onClick?: (event: MouseEvent<HTMLElement>) => void
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  /** Nombre de Material Symbol o un nodo (logo, destello…) */
  icon?: string | ReactNode
  trailingIcon?: string
  loading?: boolean
  fullWidth?: boolean
  /** Si se define, se renderiza como enlace de react-router */
  to?: string
  replace?: boolean
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn(styles.spinner, className)} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function Button({
  variant = 'filled',
  size = 'md',
  icon,
  trailingIcon,
  loading,
  fullWidth,
  to,
  replace,
  className,
  children,
  disabled,
  type = 'button',
  onClick,
  ...rest
}: ButtonProps) {
  const classes = cn(
    styles.button,
    styles[variant],
    size !== 'md' && styles[size],
    fullWidth && styles.full,
    className,
  )
  const iconSize = size === 'sm' ? 18 : 20
  const content = (
    <>
      {loading ? <Spinner /> : typeof icon === 'string' ? <Icon name={icon} size={iconSize} /> : icon}
      {children && <span className={styles.label}>{children}</span>}
      {trailingIcon && !loading && <Icon name={trailingIcon} size={iconSize} />}
    </>
  )

  if (to) {
    // Los atributos data-* (p. ej. data-tour) también llegan al enlace
    const dataAttributes = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith('data-')))
    return (
      <Link
        to={to}
        replace={replace}
        className={classes}
        data-ripple=""
        onClick={onClick}
        aria-label={rest['aria-label']}
        {...dataAttributes}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      data-ripple=""
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  )
}
