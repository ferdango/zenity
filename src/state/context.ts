import { createContext, use } from 'react'
import type { CategoryId, Connection, PendingTransaction } from '../data/mock'

export type ThemePreference = 'dark' | 'light' | 'system'
export type SheetName = 'notifications' | 'faq' | 'rating' | null

export interface Toast {
  id: number
  message: string
  icon?: string
}

export interface AppState {
  theme: ThemePreference
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemePreference) => void
  hideBalances: boolean
  toggleHideBalances: () => void
  periodKey: string
  setPeriodKey: (key: string) => void
  connections: Connection[]
  addConnection: (sourceId: string) => Connection | null
  removeConnection: (id: string) => void
  /** Marca como sincronizadas las conexiones nuevas (tras el análisis) */
  finishSync: () => void
  pending: PendingTransaction[]
  categorized: Record<string, CategoryId>
  setCategory: (pendingId: string, category: CategoryId | null) => void
  applyReview: () => number
  toasts: Toast[]
  toast: (message: string, icon?: string) => void
  dismissToast: (id: number) => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  sheet: SheetName
  openSheet: (sheet: SheetName) => void
}

export const AppStateContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = use(AppStateContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppStateProvider>')
  return ctx
}
