import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import whatsapp from '../assets/brands/whatsapp.svg'
import { InitialsAvatar } from '../components/Avatars'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { Spark } from '../components/Spark'
import { USER } from '../data/mock'
import { cn } from '../lib/cn'
import { fadeUp, spring, staggerContainer } from '../lib/motion'
import { type ThemePreference, useApp } from '../state/context'
import styles from './NavMenu.module.css'
import { PRIMARY_NAV } from './nav'

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
  const { theme, setTheme, pending, openSheet, toast } = useApp()
  const layoutId = `nav-active-${variant}`

  const row = (key: string, content: ReactNode, opts: { to?: string; onClick?: () => void; active?: boolean; end?: ReactNode }) => {
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
          <Link to={opts.to} className={className} data-ripple="" aria-current={opts.active ? 'page' : undefined} onClick={onNavigate}>
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
        onClick={action(() => toast('Ajustes de cuenta estará disponible pronto', 'settings'))}
      >
        <span className={styles.avatarRing}>
          <InitialsAvatar initials={USER.initials} size={40} />
        </span>
        <span className={styles.profileName}>
          <strong>{USER.fullName}</strong>
          <span>Ajustes de cuenta</span>
        </span>
        <Icon name="chevron_right" size={18} className={styles.chevron} />
      </button>

      {variant === 'rail' && (
        <Button variant="primaryTonal" icon="add" className={styles.newButton} to="/conexiones/nueva">
          Nueva conexión
        </Button>
      )}

      <div className={styles.divider} />

      <div className={styles.scroll}>
        <motion.ul className={styles.group} variants={staggerContainer(0.035, 0.05)} initial="hidden" animate="show">
          {PRIMARY_NAV.map((item) =>
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
          {row(
            'review',
            <>
              <span className={styles.itemIcon}>
                <Icon name="fact_check" size={20} />
              </span>
              <span>Por revisar</span>
            </>,
            {
              to: '/revisar',
              active: pathname === '/revisar',
              end: pending.length > 0 ? <span className={styles.count}>{pending.length}</span> : undefined,
            },
          )}
        </motion.ul>

        <div className={styles.divider} />

        <motion.ul className={styles.group} variants={staggerContainer(0.035, 0.25)} initial="hidden" animate="show">
          {row(
            'rate',
            <>
              <span className={styles.itemIcon}>
                <Icon name="favorite" size={20} />
              </span>
              <span>Califícanos</span>
            </>,
            { onClick: action(() => openSheet('rating')) },
          )}
          {row(
            'whatsapp',
            <>
              <span className={styles.itemIcon}>
                <img src={whatsapp} alt="" width={20} height={20} />
              </span>
              <span>Comunidad en WhatsApp</span>
            </>,
            { onClick: action(() => toast('Muy pronto: comunidad de Zenity en WhatsApp', 'groups')) },
          )}
          {row(
            'faq',
            <>
              <span className={styles.itemIcon}>
                <Icon name="help" size={20} />
              </span>
              <span>Preguntas frecuentes</span>
            </>,
            { onClick: action(() => openSheet('faq')) },
          )}
          {row(
            'logout',
            <>
              <span className={styles.itemIcon}>
                <Icon name="logout" size={20} />
              </span>
              <span>Cerrar sesión</span>
            </>,
            { onClick: action(() => navigate('/', { replace: true })) },
          )}
        </motion.ul>
      </div>

      <div className={styles.footer}>
        <span className={styles.themeLabel}>Apariencia</span>
        <SegmentedTabs<ThemePreference>
          label="Tema"
          stretch
          value={theme}
          onChange={setTheme}
          tabs={[
            { id: 'dark', label: 'Oscuro' },
            { id: 'light', label: 'Claro' },
            { id: 'system', label: 'Sistema' },
          ]}
        />
        <span className={styles.version}>v. 1.0.0</span>
      </div>
    </nav>
  )
}
