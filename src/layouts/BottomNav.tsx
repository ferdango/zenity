import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { ease, spring } from '../lib/motion'
import styles from './BottomNav.module.css'
import { PRIMARY_NAV, showsBottomNav } from './nav'

/**
 * Barra inferior (Figma: 5 botones circulares). El indicador activo se desliza
 * entre opciones y el icono pasa de contorno a relleno.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const visible = showsBottomNav(pathname)

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.wrap}
          initial={{ y: '110%' }}
          animate={{ y: 0, transition: { duration: 0.45, ease: ease.decelerate } }}
          exit={{ y: '110%', transition: { duration: 0.2, ease: ease.accelerate } }}
        >
          <nav className={styles.nav} aria-label="Navegación principal">
            {PRIMARY_NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={styles.item}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  data-ripple=""
                  data-tour={`nav-${item.id}`}
                >
                  {active && <motion.span layoutId="bottom-nav-indicator" className={styles.indicator} transition={spring.snappy} />}
                  {item.icon === 'spark' ? <Spark size={24} /> : <Icon name={item.icon} size={24} fill={active} />}
                </Link>
              )
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
