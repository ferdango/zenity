import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { type Business, businessBalance, businessInitials, businessName } from '../data/businesses'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useSwitchBusiness } from '../lib/useSwitchBusiness'
import { useApp } from '../state/context'
import { Amount } from './Amount'
import styles from './Business.module.css'
import { Button } from './Button'
import { Icon } from './Icon'

/** Monograma del negocio con su color. */
export function BusinessAvatar({ business, size = 40, className }: { business: Business; size?: number; className?: string }) {
  return (
    <span
      className={cn(styles.avatar, className)}
      data-tone={business.tone}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), borderRadius: Math.round(size * 0.32) }}
      aria-hidden
    >
      {businessInitials(business)}
    </span>
  )
}

/** Selector del encabezado del inicio: negocio activo y RUC; abre "Tus negocios". */
export function BusinessSwitcher() {
  const { business, openSheet } = useApp()
  const name = businessName(business)
  return (
    <button
      type="button"
      className={styles.switcher}
      data-ripple=""
      data-tour="business"
      aria-haspopup="dialog"
      aria-label={`Negocio: ${name}, RUC ${business.ruc}. Cambiar de negocio`}
      onClick={() => openSheet('businesses')}
    >
      <BusinessAvatar business={business} size={30} />
      <span className={styles.switcherText}>
        <strong>{name}</strong>
        <span>RUC {business.ruc}</span>
      </span>
      <Icon name="unfold_more" size={20} className={styles.switcherIcon} />
    </button>
  )
}

/** Avatar del negocio para las barras superiores: un toque abre "Tus negocios". */
export function BusinessButton() {
  const { business, openSheet } = useApp()
  return (
    <button
      type="button"
      className={styles.avatarButton}
      data-ripple=""
      aria-haspopup="dialog"
      aria-label={`Negocio: ${businessName(business)}. Cambiar de negocio`}
      title={businessName(business)}
      onClick={() => openSheet('businesses')}
    >
      <BusinessAvatar business={business} size={32} />
    </button>
  )
}

/** Fila de un negocio: avatar, nombre, RUC, cuentas y saldo consolidado. */
function BusinessRow({ business, active, onSelect }: { business: Business; active: boolean; onSelect: () => void }) {
  const count = business.connections.length
  return (
    <motion.li variants={fadeUp}>
      <button
        type="button"
        role="radio"
        aria-checked={active}
        className={cn(styles.row, active && styles.rowActive)}
        data-ripple=""
        onClick={onSelect}
      >
        <BusinessAvatar business={business} size={44} />
        <span className={styles.rowText}>
          <strong>{businessName(business)}</strong>
          <span>RUC {business.ruc}</span>
          <span className={styles.rowFigures}>
            {count > 0 && (
              <>
                <Amount value={businessBalance(business)} className={styles.rowAmount} />
                {' · '}
              </>
            )}
            {count === 0 ? 'Sin cuentas' : `${count} ${count === 1 ? 'cuenta' : 'cuentas'}`}
          </span>
        </span>
        <span className={styles.radio} aria-hidden>
          {active && <Icon name="check" size={16} weight={700} />}
        </span>
      </button>
    </motion.li>
  )
}

/** Contenido de la hoja "Tus negocios". */
export function BusinessPicker({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const { business, businesses } = useApp()
  const switchTo = useSwitchBusiness()

  return (
    <div className={styles.picker}>
      <p className={styles.lead}>Cada RUC tiene sus propias cuentas, movimientos y reportes.</p>
      <motion.ul
        className={styles.list}
        role="radiogroup"
        aria-label="Negocios"
        variants={staggerContainer(0.04, 0.05)}
        initial="hidden"
        animate="show"
      >
        {businesses.map((b) => (
          <BusinessRow
            key={b.id}
            business={b}
            active={b.id === business.id}
            onSelect={() => {
              onDone()
              switchTo(b)
            }}
          />
        ))}
      </motion.ul>
      <Button
        variant="tonal"
        size="lg"
        fullWidth
        icon="add_business"
        onClick={() => {
          onDone()
          navigate('/negocios/nuevo')
        }}
      >
        Agregar otro RUC
      </Button>
    </div>
  )
}
