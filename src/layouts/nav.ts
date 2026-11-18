import { FEATURES } from '../lib/features'

export interface NavItem {
  id: string
  label: string
  /** Etiqueta corta (barra inferior) */
  short: string
  /** Material Symbol, o "spark" para el destello de Zenity */
  icon: string
  to: string
  match: (path: string) => boolean
}

/** Páginas que viven dentro de «Más» (la pestaña queda activa en la barra inferior). */
const MAS_PATHS = ['/mas', '/conciliacion', '/personal', '/regimen', '/aprende', '/datos', '/mi-contador', '/credito', '/cierre-caja', '/permisos', '/metricas']

/** Barra inferior del dueño (sección 8 del brief): Inicio · Por revisar · Caja · Cobrar · Más. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: 'home', to: '/inicio', match: (p) => p === '/inicio' },
  { id: 'revisar', label: 'Por revisar', short: 'Revisar', icon: 'fact_check', to: '/revisar', match: (p) => p === '/revisar' },
  { id: 'caja', label: 'Caja', short: 'Caja', icon: 'monitoring', to: '/caja', match: (p) => p === '/caja' },
  { id: 'cobrar', label: 'Cobrar', short: 'Cobrar', icon: 'payments', to: '/cobrar', match: (p) => p === '/cobrar' },
  { id: 'mas', label: 'Más', short: 'Más', icon: 'apps', to: '/mas', match: (p) => MAS_PATHS.includes(p) },
]

/** Herramientas del dueño (menú lateral): solo lo que usa en el día a día. */
export const TOOLS_NAV: NavItem[] = [
  { id: 'cierre-caja', label: 'Cierre de caja', short: 'Cierre', icon: 'point_of_sale', to: '/cierre-caja', match: (p) => p === '/cierre-caja' },
  { id: 'personal', label: 'Gasto personal', short: 'Personal', icon: 'person', to: '/personal', match: (p) => p === '/personal' },
  { id: 'credito', label: 'Crédito BCP', short: 'Crédito', icon: 'credit_score', to: '/credito', match: (p) => p === '/credito' },
  { id: 'mi-contador', label: 'Mi contador', short: 'Contador', icon: 'support_agent', to: '/mi-contador', match: (p) => p === '/mi-contador' },
  { id: 'chat', label: 'Pregúntale a Zenity', short: 'Zenity', icon: 'spark', to: '/chat', match: (p) => p === '/chat' },
  ...(FEATURES.herramientasAvanzadas
    ? [
        { id: 'conciliacion', label: 'Conciliación', short: 'Conciliación', icon: 'rule', to: '/conciliacion', match: (p: string) => p === '/conciliacion' },
        { id: 'regimen', label: 'Simulador de régimen', short: 'Régimen', icon: 'balance', to: '/regimen', match: (p: string) => p === '/regimen' },
        { id: 'aprende', label: 'Aprende', short: 'Aprende', icon: 'school', to: '/aprende', match: (p: string) => p === '/aprende' },
        { id: 'datos', label: 'Datos de entrenamiento', short: 'Datos', icon: 'database', to: '/datos', match: (p: string) => p === '/datos' },
      ]
    : []),
]

/** Pantallas del prototipo anterior (reportes, chat y conexiones). */
export const REPORTS_NAV: NavItem[] = !FEATURES.herramientasAvanzadas ? [] : [
  { id: 'income', label: 'Ingresos', short: 'Ingresos', icon: 'trending_up', to: '/movimientos/ingresos', match: (p) => p === '/movimientos/ingresos' },
  { id: 'expense', label: 'Egresos', short: 'Egresos', icon: 'trending_down', to: '/movimientos/egresos', match: (p) => p === '/movimientos/egresos' },
  { id: 'balance', label: 'Balance', short: 'Balance', icon: 'bar_chart', to: '/resumen', match: (p) => p === '/resumen' },
  { id: 'review', label: 'Revisado por Zenity', short: 'Revisado', icon: 'checklist', to: '/revisado', match: (p) => p === '/revisado' },
]

/** Rutas de primer nivel: entre ellas se usa la transición "fade through" de Material 3. */
export function isTabRoute(path: string): boolean {
  return (
    PRIMARY_NAV.some((item) => item.to === path) ||
    path === '/inicio' ||
    path === '/resumen' ||
    path === '/chat' ||
    path.startsWith('/movimientos/') ||
    path.startsWith('/sunat/')
  )
}

/** Rutas que muestran la barra de navegación inferior en móvil. */
export function showsBottomNav(path: string): boolean {
  return PRIMARY_NAV.some((item) => item.to === path) || path === '/resumen' || path.startsWith('/movimientos/')
}
