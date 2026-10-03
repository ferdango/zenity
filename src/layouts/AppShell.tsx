import { AnimatePresence } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router'
import styles from './AppShell.module.css'
import { BottomNav } from './BottomNav'
import { Drawer } from './Drawer'
import { GlobalSheets } from './GlobalSheets'
import { NavMenu } from './NavMenu'
import { showsBottomNav } from './nav'
import { RouteMotion } from './RouteMotion'
import { saveScroll, useRouteTransition } from './transitions'

/**
 * Layout de la app autenticada: barra lateral en escritorio (como Gemini),
 * barra inferior en móvil y transiciones entre pantallas.
 */
export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const transition = useRouteTransition(location)
  const withBottomNav = showsBottomNav(location.pathname)
  // Las pestañas de Movimientos comparten pantalla: solo cambia su contenido.
  const pageKey = location.pathname.startsWith('/movimientos/') ? '/movimientos' : location.pathname
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
            {outlet}
          </RouteMotion>
        </AnimatePresence>
      </main>
      <BottomNav />
      <Drawer />
      <GlobalSheets />
    </div>
  )
}
