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
const MAS_PATHS = ['/mas', '/resultados', '/conexiones', '/conexiones/nueva', '/conciliacion', '/personal', '/regimen', '/aprende', '/datos', '/cierre-caja', '/permisos', '/metricas']

/** Páginas que viven dentro de «Tareas» en la barra inferior: revisar, cobrar y el camino de aprendizaje. */
const TAREAS_PATHS = ['/tareas', '/revisar', '/cobrar', '/progreso', '/recompensas', '/tienda']

const INICIO: NavItem = { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: 'home', to: '/inicio', match: (p) => p === '/inicio' }
const CAJA: NavItem = { id: 'caja', label: 'Caja', short: 'Caja', icon: 'monitoring', to: '/caja', match: (p) => p === '/caja' }
const MAS: NavItem = { id: 'mas', label: 'Más', short: 'Más', icon: 'apps', to: '/mas', match: (p) => MAS_PATHS.includes(p) || p.startsWith('/conexion/') }

/** Menú lateral (escritorio): Inicio · Tareas · Por revisar · Caja · Cobrar (y «Más» queda fuera). */
export const PRIMARY_NAV: NavItem[] = [
  INICIO,
  { id: 'tareas', label: 'Tareas', short: 'Tareas', icon: 'task_alt', to: '/tareas', match: (p) => p === '/tareas' },
  { id: 'revisar', label: 'Por revisar', short: 'Revisar', icon: 'fact_check', to: '/revisar', match: (p) => p === '/revisar' },
  CAJA,
  { id: 'cobrar', label: 'Cobrar', short: 'Cobrar', icon: 'payments', to: '/cobrar', match: (p) => p === '/cobrar' },
  MAS,
]

/**
 * Barra inferior del celular: Inicio · Tareas · Caja · Zenity · Más. Revisar y Cobrar viven dentro de
 * «Tareas» (la pestaña queda activa en ellas) y «Zenity» es «Pregúntale a Zenity».
 */
export const BOTTOM_NAV: NavItem[] = [
  INICIO,
  { id: 'tareas', label: 'Tareas', short: 'Tareas', icon: 'task_alt', to: '/tareas', match: (p) => TAREAS_PATHS.includes(p) },
  CAJA,
  { id: 'chat', label: 'Pregúntale a Zenity', short: 'Zenity', icon: 'spark', to: '/chat', match: (p) => p === '/chat' },
  MAS,
]

/** Herramientas del dueño (menú lateral): solo lo que usa en el día a día. */
export const TOOLS_NAV: NavItem[] = [
  { id: 'resultados', label: 'Estado de resultados', short: 'Resultados', icon: 'receipt_long', to: '/resultados', match: (p) => p === '/resultados' },
  { id: 'progreso', label: 'Tu camino', short: 'Camino', icon: 'school', to: '/progreso', match: (p) => p === '/progreso' },
  { id: 'tienda', label: 'Tienda de puntos', short: 'Tienda', icon: 'storefront', to: '/tienda', match: (p) => p === '/tienda' },
  { id: 'recompensas', label: 'Recompensas', short: 'Recompensas', icon: 'redeem', to: '/recompensas', match: (p) => p === '/recompensas' },
  { id: 'conexiones', label: 'Conexiones', short: 'Conexiones', icon: 'link', to: '/conexiones', match: (p) => p.startsWith('/conexion') },
  ...(FEATURES.cierreCaja
    ? [{ id: 'cierre-caja', label: 'Cierre de caja', short: 'Cierre', icon: 'point_of_sale', to: '/cierre-caja', match: (p: string) => p === '/cierre-caja' }]
    : []),
  { id: 'personal', label: 'Gasto personal', short: 'Personal', icon: 'person', to: '/personal', match: (p) => p === '/personal' },
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
    BOTTOM_NAV.some((item) => item.to === path) ||
    path === '/inicio' ||
    path === '/resumen' ||
    path === '/chat' ||
    path.startsWith('/movimientos/') ||
    path.startsWith('/sunat/')
  )
}

/** Rutas que muestran la barra de navegación inferior en móvil (las pestañas y lo que se abre desde «Tareas»). */
export function showsBottomNav(path: string): boolean {
  return BOTTOM_NAV.some((item) => item.to === path) || path === '/revisar' || path === '/cobrar' || path === '/resumen' || path.startsWith('/movimientos/')
}
