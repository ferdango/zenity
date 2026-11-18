import { createContext, use } from 'react'
import type { Business } from '../data/businesses'
import type { Ledger } from '../data/ledger'
import type { MatchCandidate, MatchChoice } from '../data/matches'
import type { CategoryId, Connection, PendingTransaction } from '../data/mock'
import type { ReniecPerson, SunatCompany } from '../data/registry'
import type { Regimen } from '../data/sire'
import type { DocType } from '../lib/validation'

export type SheetName = 'notifications' | 'account' | 'businesses' | null

export interface Toast {
  id: number
  message: string
  icon?: string
  /** Botón del aviso (p. ej. «Deshacer») */
  action?: { label: string; onClick: () => void }
  /** Milisegundos antes de cerrarse solo */
  duration: number
}

/** Datos del usuario que se muestran en la app (saludo, menú, tarjetas). */
export interface Profile {
  firstName: string
  fullName: string
  initials: string
  company?: string
}

export interface PersonalData {
  /** Tipo de documento con el que se registra */
  tipoDoc: DocType
  /** Número del documento (DNI, pasaporte o carné de extranjería) */
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

/** Movimiento sin categoría que Zenity ya clasificó (o que el usuario cambió). */
export interface ClassifiedMovement extends PendingTransaction {
  category: CategoryId
  /** true: la eligió Zenity; false: la cambió el usuario */
  auto: boolean
  /** El usuario ya lo revisó (confirmó o cambió): en la bandeja pasa a «Aprobado» */
  reviewed: boolean
}

/** Par de movimientos que Zenity ya concilió (o que el usuario corrigió). */
export interface ReconciledMatch {
  match: MatchCandidate
  choice: MatchChoice
  /** true: lo decidió Zenity; false: lo corrigió el usuario */
  auto: boolean
  /** El usuario ya lo revisó (confirmó o corrigió): en la bandeja pasa a «Aprobado» */
  reviewed: boolean
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
  /** Sincroniza ya las conexiones nuevas (sin esperar a la sincronización automática) */
  finishSync: () => void
  /** Movimientos sin categoría del negocio activo, ya clasificados por Zenity */
  classified: ClassifiedMovement[]
  /** Pares de distintas conexiones del negocio activo, ya conciliados por Zenity */
  reconciled: ReconciledMatch[]
  /** Cambia la categoría que eligió Zenity; se aplica al instante */
  setCategory: (pendingId: string, category: CategoryId) => void
  /** Corrige la conciliación que hizo Zenity; se aplica al instante */
  setMatchChoice: (matchId: string, choice: MatchChoice) => void
  /** Marca un movimiento o un par como revisado por el usuario (o lo devuelve a la bandeja) */
  setReviewed: (id: string, done: boolean) => void
  toasts: Toast[]
  toast: (message: string, icon?: string, action?: Toast['action']) => void
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
