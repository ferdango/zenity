import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { ease, spring } from '../lib/motion'
import { useZen } from '../state/useZen'
import styles from './BottomNav.module.css'
import { PRIMARY_NAV, showsBottomNav } from './nav'

/**
 * Barra inferior (Figma: 5 botones circulares). El indicador activo se desliza
 * entre opciones y el icono pasa de contorno a relleno.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const visible = showsBottomNav(pathname)
  const { a, demo, businessId } = useZen()
  const preguntas = demo.comments.filter((c) => c.businessId === businessId && c.pregunta && !c.respondida).length
  const porRevisar = (a?.porRevisar.length ?? 0) + preguntas

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
              const count = item.id === 'revisar' ? porRevisar : 0
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={styles.item}
                  aria-label={count ? `${item.label} (${count})` : item.label}
                  aria-current={active ? 'page' : undefined}
                  data-ripple=""
                  data-tour={`nav-${item.id}`}
                  onClick={() => {
                    // Volver a tocar la pestaña activa sube al inicio de la pantalla
                    if (active) window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  <span className={styles.circle}>
                    {active && <motion.span layoutId="bottom-nav-indicator" className={styles.indicator} transition={spring.snappy} />}
                    {item.icon === 'spark' ? <Spark size={22} /> : <Icon name={item.icon} size={22} fill={active} />}
                    <AnimatePresence>
                      {count > 0 && (
                        <motion.span
                          key={count}
                          className={styles.count}
                          initial={{ scale: 0.4 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={spring.bouncy}
                        >
                          {count}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {item.short}
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
