import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ease } from '../lib/motion'

/** iconoir:db-error redibujado con trazos animados. */
function DbErrorGlyph() {
  const draw = (delay: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1, transition: { duration: 0.9, delay, ease: ease.emphasized } },
  })
  return (
    <svg viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden>
      <motion.ellipse cx="10" cy="5.5" rx="7" ry="2.5" {...draw(0)} />
      <motion.path d="M3 5.5v6c0 1.38 3.13 2.5 7 2.5" {...draw(0.15)} />
      <motion.path d="M3 11.5v6c0 1.38 3.13 2.5 7 2.5c.7 0 1.37-.04 2-.1" {...draw(0.3)} />
      <motion.path d="M17 5.5v5" {...draw(0.3)} />
      <motion.path d="M16.5 16.5l4 4m0-4l-4 4" stroke="var(--z-negative)" strokeWidth="1.4" {...draw(0.7)} />
    </svg>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 12,
        padding: '48px 24px',
        borderRadius: 'var(--z-radius-2xl)',
        background: 'var(--z-surface)',
        textAlign: 'center',
        color: 'var(--z-on-surface-variant)',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.decelerate } }}
    >
      <DbErrorGlyph />
      <p className="t-body-l">{title}</p>
      <p className="t-headline-m" style={{ color: 'var(--z-on-surface)', maxWidth: 300 }}>
        {description}
      </p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </motion.div>
  )
}
