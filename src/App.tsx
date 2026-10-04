import { AnimatePresence, MotionConfig } from 'motion/react'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Toaster } from './components/Toaster'
import { AppShell } from './layouts/AppShell'
import { RouteMotion } from './layouts/RouteMotion'
import { saveScroll, useRouteTransition } from './layouts/transitions'
import { AddConnection } from './screens/AddConnection'
import { Analyzing } from './screens/Analyzing'
import { Chat } from './screens/Chat'
import { ConnectionDetail } from './screens/ConnectionDetail'
import { ConnectionResult } from './screens/ConnectionResult'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { Movements } from './screens/Movements'
import { NotificationsPrompt } from './screens/NotificationsPrompt'
import { RegisterCompany, RegisterPersonal } from './screens/Register'
import { Review } from './screens/Review'
import { Splash } from './screens/Splash'
import { Summary } from './screens/Summary'
import { VerifyOtp } from './screens/VerifyOtp'
import { AppStateProvider } from './state/AppState'

/** Rutas que viven dentro del layout con navegación (barra lateral / inferior). */
function isShellPath(path: string) {
  return (
    path === '/inicio' ||
    path === '/resumen' ||
    path === '/chat' ||
    path === '/revisar' ||
    path === '/conexiones/nueva' ||
    path.startsWith('/movimientos/') ||
    path.startsWith('/conexion/')
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  const transition = useRouteTransition(location)
  const previousKey = useRef(location.key)
  const routesKey = isShellPath(location.pathname) ? 'app' : location.pathname

  useLayoutEffect(() => {
    if (previousKey.current !== location.key) {
      saveScroll(previousKey.current)
      previousKey.current = location.key
    }
  }, [location.key])

  const screen = (element: ReactNode) => (
    <RouteMotion transition={transition} scrollKey={location.key}>
      {element}
    </RouteMotion>
  )

  return (
    <AnimatePresence mode="wait" custom={transition}>
      <Routes location={location} key={routesKey}>
        <Route path="/" element={screen(<Splash />)} />
        <Route path="/login" element={screen(<Login />)} />
        <Route path="/verificacion" element={screen(<VerifyOtp />)} />
        <Route path="/registro/datos" element={screen(<RegisterPersonal />)} />
        <Route path="/registro/empresa" element={screen(<RegisterCompany />)} />
        <Route path="/registro" element={<Navigate to="/registro/datos" replace />} />
        <Route path="/notificaciones" element={screen(<NotificationsPrompt />)} />
        <Route path="/analizando" element={screen(<Analyzing />)} />
        <Route path="/conexiones/resultado" element={screen(<ConnectionResult />)} />
        <Route element={screen(<AppShell />)}>
          <Route path="/inicio" element={<Home />} />
          <Route path="/movimientos/:tab" element={<Movements />} />
          <Route path="/resumen" element={<Summary />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/revisar" element={<Review />} />
          <Route path="/conexiones/nueva" element={<AddConnection />} />
          <Route path="/conexion/:id" element={<ConnectionDetail />} />
        </Route>
        <Route path="/movimientos" element={<Navigate to="/movimientos/todo" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export function App() {
  return (
    <HashRouter>
      <MotionConfig reducedMotion="user">
        <AppStateProvider>
          <AnimatedRoutes />
          <Toaster />
        </AppStateProvider>
      </MotionConfig>
    </HashRouter>
  )
}
