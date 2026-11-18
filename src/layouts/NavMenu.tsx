import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { InitialsAvatar } from '../components/Avatars'
import { BusinessAvatar } from '../components/Business'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { businessName } from '../data/businesses'
import { cn } from '../lib/cn'
import { FEATURES } from '../lib/features'
import { fadeUp, spring, staggerContainer } from '../lib/motion'
import { useSwitchBusiness } from '../lib/useSwitchBusiness'
import { useApp } from '../state/context'
import { setPersona } from '../state/demoStore'
import { useZen } from '../state/useZen'
import styles from './NavMenu.module.css'
import { PRIMARY_NAV, REPORTS_NAV, TOOLS_NAV } from './nav'

/** Negocios que se muestran como acceso directo; el resto, en "Tus negocios". */
const QUICK_LIMIT = 4

interface NavMenuProps {
  variant: 'drawer' | 'rail'
  onNavigate?: () => void
}

function ItemIcon({ icon }: { icon: string }) {
  if (icon === 'spark') return <Spark size={20} />
  return <Icon name={icon} size={20} />
}

/** Contenido del menú lateral (Figma: Menu). Se usa en el drawer móvil y en la barra lateral de escritorio. */
export function NavMenu({ variant, onNavigate }: NavMenuProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { openSheet, profile, business, businesses } = useApp()
  const { a, demo } = useZen()
  const porRevisar = (a?.porRevisar.length ?? 0) + demo.comments.filter((c) => c.businessId === business.id && c.pregunta && !c.respondida).length
  const switchTo = useSwitchBusiness()
  const others = businesses.filter((b) => b.id !== business.id)
  const layoutId = `nav-active-${variant}`

  const row = (
    key: string,
    content: ReactNode,
    opts: { to?: string; onClick?: () => void; active?: boolean; end?: ReactNode; tour?: string },
  ) => {
    const inner = (
      <>
        {opts.active && <motion.span layoutId={layoutId} className={styles.activeBg} transition={spring.snappy} />}
        {content}
        {opts.end ?? (variant === 'drawer' && <Icon name="chevron_right" size={18} className={styles.chevron} />)}
      </>
    )
    const className = cn(styles.item, opts.active && styles.active)
    return (
      <motion.li key={key} variants={fadeUp}>
        {opts.to ? (
          <Link
            to={opts.to}
            className={className}
            data-ripple=""
            data-tour={opts.tour}
            aria-current={opts.active ? 'page' : undefined}
            onClick={onNavigate}
          >
            {inner}
          </Link>
        ) : (
          <button type="button" className={className} data-ripple="" onClick={opts.onClick}>
            {inner}
          </button>
        )}
      </motion.li>
    )
  }

  const action = (fn: () => void) => () => {
    onNavigate?.()
    fn()
  }

  return (
    <nav className={styles.menu} aria-label="Menú principal">
      {variant === 'rail' && (
        <div className={styles.brand}>
          <Spark size={26} />
          Zenity
        </div>
      )}

      <button
        type="button"
        className={styles.profile}
        data-ripple=""
        aria-haspopup="dialog"
        data-tour="account"
        onClick={action(() => openSheet('account'))}
      >
        <span className={styles.avatarRing}>
          <InitialsAvatar initials={profile.initials} size={40} />
        </span>
        <span className={styles.profileName}>
          <strong>{profile.fullName}</strong>
          <span>Ajustes de cuenta</span>
        </span>
        <Icon name="chevron_right" size={18} className={styles.chevron} />
      </button>

      {variant === 'rail' && (
        <Button variant="primaryTonal" icon="add" className={styles.newButton} to="/conexiones/nueva">
          Nueva conexión
        </Button>
      )}

      <section className={styles.businesses} aria-labelledby={`${layoutId}-negocios`}>
        <p className={styles.sectionLabel} id={`${layoutId}-negocios`}>
          Tus negocios
        </p>
        <button
          type="button"
          className={styles.activeBusiness}
          data-ripple=""
          aria-haspopup="dialog"
          aria-label={`Negocio activo: ${businessName(business)}, RUC ${business.ruc}. Ver todos los negocios`}
          onClick={action(() => openSheet('businesses'))}
        >
          <BusinessAvatar business={business} size={36} />
          <span className={styles.businessText}>
            <span>{businessName(business)}</span>
            <span>RUC {business.ruc}</span>
          </span>
          <Icon name="unfold_more" size={20} className={styles.chevron} />
        </button>
        <div className={styles.quickSwitch} role="group" aria-label="Cambiar de negocio">
          {others.slice(0, QUICK_LIMIT).map((b) => (
              <button
                key={b.id}
                type="button"
                className={styles.quick}
                data-ripple=""
                title={`${businessName(b)} · RUC ${b.ruc}`}
                onClick={action(() => switchTo(b))}
              >
                <BusinessAvatar business={b} size={22} />
                <span>{businessName(b)}</span>
              </button>
            ))}
          {others.length > QUICK_LIMIT && (
            <button
              type="button"
              className={styles.quick}
              data-ripple=""
              aria-label={`Ver los ${others.length} negocios`}
              onClick={action(() => openSheet('businesses'))}
            >
              <span>+{others.length - QUICK_LIMIT}</span>
            </button>
          )}
          <Link to="/negocios/nuevo" className={cn(styles.quick, styles.quickAdd)} data-ripple="" onClick={onNavigate}>
            <Icon name="add" size={18} />
            <span>Agregar RUC</span>
          </Link>
        </div>
      </section>

      <div className={styles.divider} />

      <div className={styles.scroll}>
        <motion.ul className={styles.group} variants={staggerContainer(0.03, 0.05)} initial="hidden" animate="show">
          {PRIMARY_NAV.filter((item) => item.id !== 'mas').map((item) =>
            row(
              item.id,
              <>
                <span className={styles.itemIcon}>
                  <ItemIcon icon={item.icon} />
                </span>
                <span>{item.label}</span>
              </>,
              {
                to: item.to,
                active: item.match(pathname),
                tour: `nav-${item.id}`,
                end: item.id === 'revisar' && porRevisar > 0 ? <span className={styles.count}>{porRevisar}</span> : undefined,
              },
            ),
          )}
        </motion.ul>
        <p className={styles.sectionLabel}>Herramientas</p>
        <motion.ul className={styles.group} variants={staggerContainer(0.03, 0.1)} initial="hidden" animate="show">
          {TOOLS_NAV.map((item) =>
            row(
              item.id,
              <>
                <span className={styles.itemIcon}>
                  <ItemIcon icon={item.icon} />
                </span>
                <span>{item.label}</span>
              </>,
              { to: item.to, active: item.match(pathname) },
            ),
          )}
        </motion.ul>
        <p className={styles.sectionLabel}>Reportes</p>
        <motion.ul className={styles.group} variants={staggerContainer(0.03, 0.15)} initial="hidden" animate="show">
          {REPORTS_NAV.map((item) =>
            row(
              item.id,
              <>
                <span className={styles.itemIcon}>
                  <ItemIcon icon={item.icon} />
                </span>
                <span>{item.label}</span>
              </>,
              { to: item.to, active: item.match(pathname), tour: `nav-${item.id}` },
            ),
          )}
          {FEATURES.sunatSire &&
            row(
              'sunat',
              <>
                <span className={styles.itemIcon}>
                  <Icon name="account_balance" size={20} />
                </span>
                <span>SUNAT · SIRE</span>
              </>,
              { to: '/sunat/balance', active: pathname.startsWith('/sunat/') },
            )}
        </motion.ul>
        <p className={styles.sectionLabel}>Demo</p>
        <motion.ul className={styles.group} variants={staggerContainer(0.03, 0.2)} initial="hidden" animate="show">
          {row(
            'contador',
            <>
              <span className={styles.itemIcon}>
                <Icon name="switch_account" size={20} />
              </span>
              <span>Ver como contador</span>
            </>,
            {
              onClick: action(() => {
                setPersona('CONTADOR')
                navigate('/contador')
              }),
            },
          )}
          {row(
            'reset',
            <>
              <span className={styles.itemIcon}>
                <Icon name="restart_alt" size={20} />
              </span>
              <span>Reiniciar demo</span>
            </>,
            { to: '/mas' },
          )}
        </motion.ul>
      </div>

      <div className={styles.footer}>
        <span className={styles.version}>v. 1.0.0</span>
      </div>
    </nav>
  )
}
