import type { CSSProperties } from 'react'
import { cn } from '../lib/cn'

interface IconProps {
  /** Nombre del símbolo (Material Symbols Rounded) */
  name: string
  fill?: boolean
  size?: number
  weight?: number
  grade?: number
  gradient?: boolean
  className?: string
  /** Si se define, el icono se anuncia a lectores de pantalla */
  label?: string
  style?: CSSProperties
}

export function Icon({ name, fill = false, size = 24, weight = 400, grade = 0, gradient, className, label, style }: IconProps) {
  const opsz = Math.min(48, Math.max(20, size))
  return (
    <span
      className={cn('z-icon', gradient && 'z-icon--gradient', className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opsz}`,
        ...style,
      }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {name}
    </span>
  )
}
