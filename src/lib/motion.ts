import type { Transition, Variants } from 'motion/react'

/** Curvas de Material 3 usadas por Gemini (gem-sys-motion--easing-*). */
export const ease = {
  emphasized: [0.2, 0, 0, 1],
  decelerate: [0.05, 0.7, 0.1, 1],
  accelerate: [0.3, 0, 0.8, 0.15],
  standard: [0.2, 0, 0, 1],
} as const

export const spring = {
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 520, damping: 38 },
  bouncy: { type: 'spring', stiffness: 380, damping: 22 },
} satisfies Record<string, Transition>

/** Entrada "lm-fade-in-up" de Gemini: opacidad + desplazamiento vertical. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: ease.decelerate },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: ease.standard } },
}

export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  }
}
