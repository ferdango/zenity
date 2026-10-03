import { cn } from '../lib/cn'
import styles from './Aurora.module.css'

interface AuroraProps {
  placement?: 'bottom' | 'top' | 'full'
  intense?: boolean
  /** position: fixed para que cubra el viewport aunque la página haga scroll */
  fixed?: boolean
  className?: string
}

/** Resplandor animado de fondo al estilo del estado inicial de Gemini. */
export function Aurora({ placement = 'bottom', intense, fixed, className }: AuroraProps) {
  return (
    <div
      aria-hidden
      className={cn(
        styles.aurora,
        placement !== 'full' && styles[placement],
        intense && styles.intense,
        fixed && styles.fixed,
        className,
      )}
    >
      <span className={cn(styles.blob, styles.b1)} />
      <span className={cn(styles.blob, styles.b2)} />
      <span className={cn(styles.blob, styles.b3)} />
      <span className={cn(styles.blob, styles.b4)} />
    </div>
  )
}
