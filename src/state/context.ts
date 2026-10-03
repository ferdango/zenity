import { createContext, use } from 'react'
import type { CategoryId, Connection, PendingTransaction } from '../data/mock'

export type SheetName = 'notifications' | 'faq' | 'rating' | null

export interface Toast {
  id: number
  message: string
  icon?: string
}

/** Datos del usuario que se muestran en la app (saludo, menú, tarjetas). */
export interface Profile {
  firstName: string
  fullName: string
  initials: string
  company?: string
}

export interface PersonalData {
  nombres: string
  apellidos: string
  nacimiento: string
  email: string
  celular: string
  direccion: string
}

export interface CompanyData {
  razonSocial: string
  ruc: string
  ingresoMinimo: string
}

/** Borrador del registro: vive solo en memoria mientras se completan los pasos. */
export interface Registration {
  personal: PersonalData
  company: CompanyData
}

export interface AppState {
  profile: Profile
  setProfile: (profile: Profile) => void
  registration: Registration
  updateRegistration: <K extends keyof Registration>(part: K, data: Partial<Registration[K]>) => void
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
  /** Recorrido de bienvenida (onboarding) */
  tourDone: boolean
  tourActive: boolean
  startTour: () => void
  endTour: () => void
}

export const AppStateContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = use(AppStateContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppStateProvider>')
  return ctx
}
