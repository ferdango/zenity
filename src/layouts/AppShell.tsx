import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './AppShell.module.css'
import { BottomNav } from './BottomNav'
import { Drawer } from './Drawer'
import { GlobalSheets } from './GlobalSheets'
import { NavMenu } from './NavMenu'
import { showsBottomNav } from './nav'
import { RouteMotion } from './RouteMotion'
import { saveScroll, useRouteTransition } from './transitions'

/**
 * Al cambiar de negocio la pantalla se vuelve a montar con los datos del nuevo RUC
 * (filtros y estados locales incluidos) y entra con un fundido corto.
 */
function BusinessScope({ id, children }: { id: string; children: ReactNode }) {
  const [shown, setShown] = useState(id)
  const [switched, setSwitched] = useState(false)
  if (id !== shown) {
    setShown(id)
    setSwitched(true)
  }
  return (
    <motion.div
      key={id}
      initial={switched ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.decelerate }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Layout de la app autenticada: barra lateral en escritorio (como Gemini),
 * barra inferior en móvil y transiciones entre pantallas.
 */
export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const { business } = useApp()
  const transition = useRouteTransition(location)
  const withBottomNav = showsBottomNav(location.pathname)
  // Las pestañas de Movimientos y de SUNAT comparten pantalla: solo cambia su contenido.
  const tabbed = location.pathname.match(/^\/(movimientos|sunat)\//)
  const pageKey = tabbed ? tabbed[0] : location.pathname
  const previousKey = useRef(location.key)

  useLayoutEffect(() => {
    if (previousKey.current !== location.key) {
      saveScroll(previousKey.current)
      previousKey.current = location.key
    }
  }, [location.key])

  useEffect(() => {
    document.documentElement.style.setProperty('--z-toast-offset', withBottomNav ? '112px' : '24px')
    return () => {
      document.documentElement.style.removeProperty('--z-toast-offset')
    }
  }, [withBottomNav])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidenav}>
        <NavMenu variant="rail" />
      </aside>
      <main className={styles.main} data-bottom-nav={withBottomNav}>
        <AnimatePresence mode="wait" initial={false} custom={transition}>
          <RouteMotion key={pageKey} transition={transition} scrollKey={location.key}>
            <BusinessScope id={business.id}>{outlet}</BusinessScope>
          </RouteMotion>
        </AnimatePresence>
      </main>
      <BottomNav />
      <Drawer />
      <GlobalSheets />
    </div>
  )
}
