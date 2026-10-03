import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Icon } from './Icon'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string | ReactNode
  /** Texto accesible obligatorio */
  label: string
  variant?: 'standard' | 'tonal' | 'filled' | 'outlined' | 'inverse'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  selected?: boolean
  badge?: boolean
  iconSize?: number
  fillIcon?: boolean
}

export function IconButton({
  icon,
  label,
  variant = 'standard',
  size = 'md',
  selected,
  badge,
  iconSize,
  fillIcon,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const glyph = iconSize ?? (size === 'sm' ? 20 : 24)
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      data-ripple=""
      className={cn(
        styles.iconButton,
        variant !== 'standard' && styles[variant],
        size !== 'md' && styles[size],
        selected && styles.selected,
        className,
      )}
      {...rest}
    >
      {typeof icon === 'string' ? <Icon name={icon} size={glyph} fill={fillIcon || selected} /> : icon}
      {badge && <span className={styles.badge} aria-hidden />}
    </button>
  )
}
