import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '../lib/cn'
import { useBack } from '../lib/useBack'
import { IconButton } from './IconButton'
import styles from './TopBar.module.css'

interface TopBarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Ruta de respaldo si no hay historial dentro de la app */
  backTo?: string
  onBack?: () => void
  hideBack?: boolean
  start?: ReactNode
  end?: ReactNode
  className?: string
}

export function TopBar({ title, subtitle, backTo = '/inicio', onBack, hideBack, start, end, className }: TopBarProps) {
  const back = useBack(backTo)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn(styles.topBar, className)} data-scrolled={scrolled}>
      <div className={styles.start}>
        {start ?? (!hideBack && <IconButton icon="arrow_back" label="Volver" variant="tonal" onClick={onBack ?? back} />)}
      </div>
      <div>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.end}>{end}</div>
    </header>
  )
}
