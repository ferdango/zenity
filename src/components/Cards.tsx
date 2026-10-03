import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router'
import mastercard from '../assets/brands/mastercard.svg'
import visa from '../assets/brands/visa.svg'
import type { Connection } from '../data/mock'
import { cn } from '../lib/cn'
import { useApp } from '../state/context'
import { Amount } from './Amount'
import styles from './Cards.module.css'
import { ApiGlyph, SheetGlyph } from './Glyphs'
import { Icon } from './Icon'

function BrandMark({ connection, size = 26 }: { connection: Connection; size?: number }) {
  switch (connection.avatar) {
    case 'visa': {
      const onDark = connection.theme !== 'light' && connection.theme !== 'yellow'
      return <img src={visa} alt="" style={{ height: size * 0.62, filter: onDark ? 'brightness(0) invert(1)' : undefined }} />
    }
    case 'mastercard':
      return <img src={mastercard} alt="" style={{ height: size }} />
    case 'sheet':
      return <SheetGlyph size={size + 2} />
    case 'api':
      return <ApiGlyph size={size} />
    default:
      return <Icon name="account_balance" size={size} />
  }
}

function Digits({ last4 }: { last4: string }) {
  return (
    <span className={styles.cardDigits} aria-label={`Terminada en ${last4}`}>
      <span aria-hidden>••••</span>
      <span aria-hidden>••••</span>
      <span aria-hidden>••••</span>
      <span>{last4}</span>
    </span>
  )
}

/** Tarjeta del carrusel de cuentas en Inicio. */
export function AccountCard({ connection }: { connection: Connection }) {
  const holder = useApp().profile.fullName
  const isCard = Boolean(connection.last4 && connection.holder)
  const isNew = Boolean(connection.sourceId)
  return (
    <Link
      to={`/conexion/${connection.id}`}
      className={cn(styles.accountCard, styles[connection.theme])}
      aria-label={`${connection.label} ${connection.name}`}
    >
      <div>
        <p className={styles.cardLabel}>{connection.label}</p>
        {isCard ? <Digits last4={connection.last4!} /> : <p className={styles.cardName}>{connection.name}</p>}
      </div>
      <span className={styles.openBadge} aria-hidden>
        <Icon name="arrow_outward" size={20} />
      </span>
      <div className={styles.cardBottom}>
        <div>
          {isNew && connection.balance === 0 ? (
            <span className={styles.status}>
              <Icon name="sync" size={14} /> Sincronizando
            </span>
          ) : (
            <Amount value={connection.balance} className={styles.cardAmount} />
          )}
          {isCard && <p className={styles.cardHolder}>{holder}</p>}
        </div>
        <span className={styles.brand}>
          <BrandMark connection={connection} />
        </span>
      </div>
    </Link>
  )
}

/** Tarjeta grande con inclinación 3D y reflejo que sigue al puntero. */
export function CreditCard({ connection }: { connection: Connection }) {
  const reduceMotion = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [9, -9]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-12, 12]), { stiffness: 200, damping: 20 })
  const gx = useTransform(px, (v) => `${v * 100}%`)
  const gy = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgb(255 255 255 / 0.55), transparent 55%)`

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width)
    py.set((event.clientY - rect.top) / rect.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  const isCard = Boolean(connection.last4 && connection.holder)
  const holder = useApp().profile.fullName

  return (
    <div className={styles.creditWrap}>
      <motion.div
        className={cn(styles.creditCard, styles[connection.theme])}
        style={{ rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerUp={reset}
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.05, 0.7, 0.1, 1] }}
      >
        <motion.span className={styles.glare} style={{ background: glare }} aria-hidden />
        <div>
          <p className={styles.cardLabel}>{connection.label}</p>
          {isCard ? <Digits last4={connection.last4!} /> : <p className="t-title-l">{connection.name}</p>}
        </div>
        {isCard && <span className={styles.chip} aria-hidden />}
        <div className={styles.cardBottom}>
          <div>
            <Amount value={connection.balance} className={styles.creditAmount} />
            {isCard && <p className={styles.cardHolder}>{holder}</p>}
          </div>
          <span className={styles.brand} style={{ height: 32 }}>
            <BrandMark connection={connection} size={32} />
          </span>
        </div>
      </motion.div>
    </div>
  )
}
