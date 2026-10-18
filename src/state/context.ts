import { createContext, use } from 'react'
import type { Business } from '../data/businesses'
import type { Ledger } from '../data/ledger'
import type { CategoryId, Connection, PendingTransaction } from '../data/mock'
import type { ReniecPerson, SunatCompany } from '../data/registry'
import type { Regimen } from '../data/sire'

export type SheetName = 'notifications' | 'account' | 'businesses' | null

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
  dni: string
  nombres: string
  apellidos: string
  nacimiento: string
  email: string
  celular: string
  direccion: string
}

export interface CompanyData {
  ruc: string
  razonSocial: string
  nombreComercial: string
  ingresoMinimo: string
  /** '' mientras no se elija */
  regimen: Regimen | ''
}

/** Borrador del registro: vive solo en memoria mientras se completan los pasos. */
export interface Registration {
  personal: PersonalData
  company: CompanyData
  /** Respuesta de RENIEC para el DNI ingresado */
  reniec: ReniecPerson | null
  /** Ficha RUC de SUNAT de la empresa */
  sunat: SunatCompany | null
}

type RegistrationForm = 'personal' | 'company'
type RegistrationLookup = 'reniec' | 'sunat'

export interface AppState {
  profile: Profile
  setProfile: (profile: Profile) => void
  registration: Registration
  updateRegistration: <K extends RegistrationForm>(part: K, data: Partial<Registration[K]>) => void
  /** Guarda la respuesta de la consulta a RENIEC o SUNAT */
  setLookup: <K extends RegistrationLookup>(kind: K, result: Registration[K]) => void
  hideBalances: boolean
  toggleHideBalances: () => void
  periodKey: string
  setPeriodKey: (key: string) => void
  /** Negocios (RUC) del usuario; cada uno con sus propias conexiones y datos */
  businesses: Business[]
  /** Negocio activo: todo lo que se ve en la app es de este RUC */
  business: Business
  ledger: Ledger
  switchBusiness: (id: string) => void
  /** Agrega un RUC consultado en SUNAT y lo deja activo */
  addBusiness: (company: SunatCompany, nombreComercial: string, regimen: Regimen) => Business
  /** Registro: el RUC registrado pasa a ser el único negocio, con las cuentas de ejemplo */
  registerBusiness: (company: SunatCompany, nombreComercial: string, regimen: Regimen) => void
  /** Conexiones del negocio activo */
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
