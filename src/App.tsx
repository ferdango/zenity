import { AnimatePresence, MotionConfig } from 'motion/react'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Confetti } from './components/Confetti'
import { Toaster } from './components/Toaster'
import { XpBurst } from './components/XpBurst'
import { AppShell } from './layouts/AppShell'
import { RouteMotion } from './layouts/RouteMotion'
import { saveScroll, useRouteTransition } from './layouts/transitions'
import { AddBusiness } from './screens/AddBusiness'
import { AddConnection } from './screens/AddConnection'
import { Analyzing } from './screens/Analyzing'
import { Aprende } from './screens/Aprende'
import { Bienvenida, PermisosDatos } from './screens/Bienvenida'
import { Caja } from './screens/Caja'
import { CierreCaja } from './screens/CierreCaja'
import { Cobrar } from './screens/Cobrar'
import { Conciliacion } from './screens/Conciliacion'
import { DatosEntrenamiento } from './screens/DatosEntrenamiento'
import { Mas } from './screens/Mas'
import { Metricas } from './screens/Metricas'
import { Personal } from './screens/Personal'
import { Progreso } from './screens/Progreso'
import { Recompensas } from './screens/Recompensas'
import { Resultados } from './screens/Resultados'
import { Tareas } from './screens/Tareas'
import { Tienda } from './screens/Tienda'
import { PorRevisar } from './screens/PorRevisar'
import { Regimen } from './screens/Regimen'
import { Chat } from './screens/Chat'
import { ConnectionDetail } from './screens/ConnectionDetail'
import { Conexiones } from './screens/Conexiones'
import { ConnectionResult } from './screens/ConnectionResult'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { Movements } from './screens/Movements'
import { NotificationsPrompt } from './screens/NotificationsPrompt'
import { RegisterCompany, RegisterPersonal } from './screens/Register'
import { Review } from './screens/Review'
import { Splash } from './screens/Splash'
import { Summary } from './screens/Summary'
import { Sunat } from './screens/Sunat'
import { VerifyOtp } from './screens/VerifyOtp'
import { AppStateProvider } from './state/AppState'

/** Pantallas de la primera ola que viven dentro del layout del dueño. */
const OLA1_PATHS = ['/tareas', '/resultados', '/progreso', '/tienda', '/recompensas', '/revisar', '/revisado', '/caja', '/cobrar', '/mas', '/conciliacion', '/personal', '/regimen', '/aprende', '/datos', '/cierre-caja', '/permisos', '/metricas']

/** Rutas que viven dentro del layout con navegación (barra lateral / inferior). */
function isShellPath(path: string) {
  return (
    OLA1_PATHS.includes(path) ||
    path === '/inicio' ||
    path === '/resumen' ||
    path === '/chat' ||
    path === '/conexiones' ||
    path === '/conexiones/nueva' ||
    path === '/negocios/nuevo' ||
    path.startsWith('/movimientos/') ||
    path.startsWith('/sunat/') ||
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
        <Route path="/bienvenida" element={screen(<Bienvenida />)} />
        <Route element={screen(<AppShell />)}>
          <Route path="/inicio" element={<Home />} />
          <Route path="/movimientos/:tab" element={<Movements />} />
          <Route path="/resumen" element={<Summary />} />
          <Route path="/sunat/:tab" element={<Sunat />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/revisar" element={<PorRevisar />} />
          <Route path="/revisado" element={<Review />} />
          <Route path="/conciliacion" element={<Conciliacion />} />
          <Route path="/personal" element={<Personal />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/tareas" element={<Tareas />} />
          <Route path="/tienda" element={<Tienda />} />
          <Route path="/recompensas" element={<Recompensas />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/cobrar" element={<Cobrar />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/regimen" element={<Regimen />} />
          <Route path="/aprende" element={<Aprende />} />
          <Route path="/datos" element={<DatosEntrenamiento />} />
          <Route path="/mas" element={<Mas />} />
          <Route path="/cierre-caja" element={<CierreCaja />} />
          <Route path="/permisos" element={<PermisosDatos />} />
          <Route path="/metricas" element={<Metricas />} />
          <Route path="/conexiones" element={<Conexiones />} />
          <Route path="/conexiones/nueva" element={<AddConnection />} />
          <Route path="/negocios/nuevo" element={<AddBusiness />} />
          <Route path="/conexion/:id" element={<ConnectionDetail />} />
        </Route>
        <Route path="/movimientos" element={<Navigate to="/movimientos/todo" replace />} />
        <Route path="/sunat" element={<Navigate to="/sunat/balance" replace />} />
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
          <Confetti />
          <XpBurst />
        </AppStateProvider>
      </MotionConfig>
    </HashRouter>
  )
}
