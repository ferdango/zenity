import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'

/** Estrella de 4 puntas con lados cóncavos centrada en (cx, cy) con radio r. */
function starPath(cx: number, cy: number, r: number): string {
  const a = 0.0857 * r
  const b = 0.457 * r
  return [
    `M${cx} ${cy - r}`,
    `C${cx + a} ${cy - b} ${cx + b} ${cy - a} ${cx + r} ${cy}`,
    `C${cx + b} ${cy + a} ${cx + a} ${cy + b} ${cx} ${cy + r}`,
    `C${cx - a} ${cy + b} ${cx - b} ${cy + a} ${cx - r} ${cy}`,
    `C${cx - b} ${cy - a} ${cx - a} ${cy - b} ${cx} ${cy - r}Z`,
  ].join('')
}

const SINGLE = starPath(12, 12, 10.5)
const CLUSTER = [starPath(9.5, 13.5, 8), starPath(18.6, 4.6, 3.6), starPath(19.2, 19.4, 2.8)].join('')

function useGradientId(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function Gradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4285f4" />
        <stop offset="0.55" stopColor="#9b72cb" />
        <stop offset="1" stopColor="#d96570" />
      </linearGradient>
    </defs>
  )
}

interface SparkProps {
  size?: number
  /** "thinking" gira y respira como el destello de Gemini mientras genera */
  state?: 'idle' | 'thinking'
  animateIn?: boolean
  className?: string
  title?: string
}

/** Destello de Zenity (IA) con degradado azul → violeta → rosa. */
export function Spark({ size = 24, state = 'idle', animateIn = false, className, title }: SparkProps) {
  const id = useGradientId('spark')
  const reduceMotion = useReducedMotion()
  const thinking = state === 'thinking' && !reduceMotion

  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ overflow: 'visible', flexShrink: 0 }}
      initial={animateIn ? { scale: 0, rotate: -135, opacity: 0 } : false}
      animate={thinking ? { scale: [1, 0.82, 1], rotate: [0, 180, 360], opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }}
      transition={
        thinking
          ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 200, damping: 16, delay: animateIn ? 0.1 : 0 }
      }
    >
      <Gradient id={id} />
      <path d={SINGLE} fill={`url(#${id})`} />
    </motion.svg>
  )
}

/** Grupo de destellos (equivalente a mdi:stars del Figma) con degradado. */
export function SparkCluster({ size = 24, className }: { size?: number; className?: string }) {
  const id = useGradientId('sparks')
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden style={{ flexShrink: 0 }}>
      <Gradient id={id} />
      <path d={CLUSTER} fill={`url(#${id})`} />
    </svg>
  )
}
