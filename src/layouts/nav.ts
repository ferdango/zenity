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

export const PRIMARY_NAV: NavItem[] = [
  {
    id: 'wallet',
    label: 'Mi billetera',
    short: 'Billetera',
    icon: 'account_balance_wallet',
    to: '/inicio',
    match: (p) => p === '/inicio',
  },
  {
    id: 'income',
    label: 'Ingresos',
    short: 'Ingresos',
    icon: 'trending_up',
    to: '/movimientos/ingresos',
    match: (p) => p === '/movimientos/ingresos',
  },
  {
    id: 'expense',
    label: 'Egresos',
    short: 'Egresos',
    icon: 'trending_down',
    to: '/movimientos/egresos',
    match: (p) => p === '/movimientos/egresos',
  },
  { id: 'balance', label: 'Balance', short: 'Balance', icon: 'bar_chart', to: '/resumen', match: (p) => p === '/resumen' },
  { id: 'chat', label: 'Habla con Zenity', short: 'Zenity', icon: 'spark', to: '/chat', match: (p) => p === '/chat' },
]

/** Rutas de primer nivel: entre ellas se usa la transición "fade through" de Material 3. */
export function isTabRoute(path: string): boolean {
  return path === '/inicio' || path === '/resumen' || path === '/chat' || path.startsWith('/movimientos/')
}

/** Rutas que muestran la barra de navegación inferior en móvil. */
export function showsBottomNav(path: string): boolean {
  return path === '/inicio' || path === '/resumen' || path.startsWith('/movimientos/')
}
