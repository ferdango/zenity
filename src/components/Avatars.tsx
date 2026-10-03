import type { CSSProperties } from 'react'
import mastercard from '../assets/brands/mastercard.svg'
import visa from '../assets/brands/visa.svg'
import type { AvatarKind, Source } from '../data/mock'
import { cn } from '../lib/cn'
import styles from './Avatars.module.css'
import { ApiGlyph, SheetGlyph } from './Glyphs'
import { Icon } from './Icon'

interface BrandAvatarProps {
  kind: AvatarKind
  size?: number
  /** Insignia de cuenta verificada (Figma: check morado) */
  verified?: boolean
  className?: string
}

/** Avatar circular de cuenta/medio de pago. */
export function BrandAvatar({ kind, size = 40, verified, className }: BrandAvatarProps) {
  const style = { '--av-size': `${size}px` } as CSSProperties
  const glyph = Math.round(size * 0.55)
  return (
    <span
      className={cn(
        styles.avatar,
        (kind === 'visa' || kind === 'mastercard') && styles.white,
        kind === 'sheet' && styles.sheet,
        kind === 'api' && styles.api,
        kind === 'bank' && styles.bank,
        className,
      )}
      style={style}
      aria-hidden
    >
      {kind === 'visa' && <img src={visa} alt="" />}
      {kind === 'mastercard' && <img src={mastercard} alt="" style={{ width: '60%' }} />}
      {kind === 'sheet' && <SheetGlyph size={glyph} />}
      {kind === 'api' && <ApiGlyph size={glyph} />}
      {kind === 'bank' && <Icon name="account_balance" size={glyph} />}
      {verified && (
        <span className={styles.check}>
          <Icon name="check" size={12} weight={700} />
        </span>
      )}
    </span>
  )
}

export function InitialsAvatar({ initials, size = 44 }: { initials: string; size?: number }) {
  return (
    <span
      className={cn(styles.avatar, styles.initials)}
      style={{ '--av-size': `${size}px` } as CSSProperties}
      aria-hidden
    >
      {initials}
    </span>
  )
}

/** Logo de una fuente de conexión (bancos, APIs, bases de datos, archivos). */
export function SourceLogo({ source, size = 56 }: { source: Source; size?: number }) {
  const style = { '--logo-size': `${size}px` } as CSSProperties
  const { logo } = source

  if (logo.type === 'monogram') {
    return (
      <span className={cn(styles.logo, styles.mono, styles[logo.theme])} style={style} aria-hidden>
        {logo.theme !== 'pichincha' && <span>{logo.text}</span>}
      </span>
    )
  }

  if (logo.type === 'icon') {
    return (
      <span className={cn(styles.logo, styles.iconTile)} style={{ ...style, background: logo.tile }} aria-hidden>
        <ApiGlyph size={Math.round(size * 0.55)} />
      </span>
    )
  }

  return (
    <span className={cn(styles.logo, styles.logoTile)} style={{ ...style, background: logo.tile }} aria-hidden>
      <img src={logo.src} alt="" />
    </span>
  )
}
