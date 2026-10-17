import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Business, DEMO_BUSINESSES, businessFromCompany, withRegimen } from '../data/businesses'
import { buildLedger } from '../data/ledger'
import { type CategoryId, type Connection, DEFAULT_PERIOD, INITIAL_CONNECTIONS, USER } from '../data/mock'
import type { SunatCompany } from '../data/registry'
import type { Regimen } from '../data/sire'
import { getSource } from '../data/sources'
import { readStorage, writeStorage } from '../lib/storage'
import { type AppState, AppStateContext, type Profile, type Registration, type SheetName, type Toast } from './context'

const HIDE_KEY = 'zenity.hideBalances'
const PROFILE_KEY = 'zenity.profile'
const TOUR_KEY = 'zenity.tourDone'
const BUSINESSES_KEY = 'zenity.businesses'
const ACTIVE_BUSINESS_KEY = 'zenity.business'

const EMPTY_REGISTRATION: Registration = {
  personal: { dni: '', nombres: '', apellidos: '', nacimiento: '', email: '', celular: '', direccion: '' },
  company: { ruc: '', razonSocial: '', nombreComercial: '', ingresoMinimo: '', regimen: '' },
  reniec: null,
  sunat: null,
}

/** Negocios guardados en este navegador; si no hay (o están dañados), los de ejemplo. */
function loadBusinesses(): Business[] {
  const stored = readStorage<unknown>(BUSINESSES_KEY, null)
  const valid =
    Array.isArray(stored) &&
    stored.length > 0 &&
    stored.every((b: Partial<Business> | null) => typeof b?.ruc === 'string' && Array.isArray(b.connections))
  return valid ? (stored as Business[]).map(withRegimen) : DEMO_BUSINESSES
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Solo se guarda lo necesario para mostrar (nombre y empresa), nunca el resto de datos personales.
  const [profile, setProfileState] = useState<Profile>(() => readStorage<Profile>(PROFILE_KEY, USER))
  const [registration, setRegistration] = useState<Registration>(EMPTY_REGISTRATION)
  const [hideBalances, setHideBalances] = useState(() => readStorage(HIDE_KEY, false))
  const [periodKey, setPeriodKey] = useState(DEFAULT_PERIOD)
  const [businesses, setBusinesses] = useState<Business[]>(loadBusinesses)
  const [activeId, setActiveId] = useState(() => readStorage(ACTIVE_BUSINESS_KEY, ''))
  /** Movimientos ya categorizados, por negocio */
  const [reviewed, setReviewed] = useState<Record<string, string[]>>({})
  const [categorized, setCategorized] = useState<Record<string, CategoryId>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [tourDone, setTourDone] = useState(() => readStorage(TOUR_KEY, false))
  const [tourActive, setTourActive] = useState(false)
  const toastId = useRef(0)

  const business = businesses.find((b) => b.id === activeId) ?? businesses[0]
  const businessId = business.id
  const connections = business.connections
  const ledger = useMemo(() => buildLedger(business), [business])
  const pending = useMemo(() => {
    const done = reviewed[businessId] ?? []
    return ledger.pending.filter((p) => !done.includes(p.id))
  }, [ledger, reviewed, businessId])

  useEffect(() => writeStorage(BUSINESSES_KEY, businesses), [businesses])
  useEffect(() => writeStorage(ACTIVE_BUSINESS_KEY, businessId), [businessId])

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next)
    writeStorage(PROFILE_KEY, next)
  }, [])

  const updateRegistration = useCallback(
    <K extends 'personal' | 'company'>(part: K, data: Partial<Registration[K]>) => {
      setRegistration((prev) => ({ ...prev, [part]: { ...prev[part], ...data } }))
    },
    [],
  )

  const setLookup = useCallback(<K extends 'reniec' | 'sunat'>(kind: K, result: Registration[K]) => {
    setRegistration((prev) => ({ ...prev, [kind]: result }))
  }, [])

  const toggleHideBalances = useCallback(() => {
    setHideBalances((prev) => {
      writeStorage(HIDE_KEY, !prev)
      return !prev
    })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, icon?: string) => {
      const id = ++toastId.current
      setToasts((list) => [...list.slice(-1), { id, message, icon }])
      window.setTimeout(() => dismissToast(id), 3200)
    },
    [dismissToast],
  )

  const switchBusiness = useCallback((id: string) => {
    setActiveId(id)
    setCategorized({})
  }, [])

  const addBusiness = useCallback(
    (company: SunatCompany, nombreComercial: string, regimen: Regimen) => {
      const created = businessFromCompany(company, nombreComercial, regimen, businesses.length)
      setBusinesses((list) => (list.some((b) => b.id === created.id) ? list : [...list, created]))
      setActiveId(created.id)
      setCategorized({})
      return created
    },
    [businesses.length],
  )

  const registerBusiness = useCallback((company: SunatCompany, nombreComercial: string, regimen: Regimen) => {
    // El prototipo le da al RUC registrado las cuentas de ejemplo del Figma
    const registered = { ...businessFromCompany(company, nombreComercial, regimen, 0), connections: INITIAL_CONNECTIONS, scale: 1 }
    setBusinesses([registered])
    setActiveId(registered.id)
    setReviewed({})
    setCategorized({})
  }, [])

  /** Cambia las conexiones del negocio activo. */
  const updateConnections = useCallback(
    (update: (list: Connection[]) => Connection[]) => {
      setBusinesses((list) => list.map((b) => (b.id === businessId ? { ...b, connections: update(b.connections) } : b)))
    },
    [businessId],
  )

  const addConnection = useCallback(
    (sourceId: string) => {
      const source = getSource(sourceId)
      if (!source) return null
      const last4 = String(1000 + ((sourceId.length * 7919) % 9000)).slice(-4)
      const connection: Connection = {
        id: `${sourceId}-${Date.now().toString(36)}`,
        label:
          source.kind === 'bank' ? 'Cuenta bancaria' : source.kind === 'api' ? 'Conexión API' : source.kind === 'database' ? 'Base de datos' : 'Archivo',
        name: source.name.replace('Base de datos en ', '').replace(' como base de datos', ''),
        shortName: source.name,
        last4: source.kind === 'bank' ? last4 : undefined,
        balance: 0,
        theme: source.theme,
        avatar: source.kind === 'bank' ? 'bank' : source.kind === 'file' ? 'sheet' : 'api',
        sourceId,
      }
      updateConnections((list) => [...list, connection])
      return connection
    },
    [updateConnections],
  )

  const removeConnection = useCallback(
    (id: string) => updateConnections((list) => list.filter((c) => c.id !== id)),
    [updateConnections],
  )

  const finishSync = useCallback(() => {
    updateConnections((list) =>
      list.map((c) => {
        if (!c.sourceId || c.balance !== 0) return c
        const seed = [...c.sourceId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        return { ...c, balance: 800 + ((seed * 97) % 2400) + 0.45 }
      }),
    )
  }, [updateConnections])

  const setCategory = useCallback((pendingId: string, category: CategoryId | null) => {
    setCategorized((prev) => {
      const next = { ...prev }
      if (category) next[pendingId] = category
      else delete next[pendingId]
      return next
    })
  }, [])

  const applyReview = useCallback(() => {
    const ids = Object.keys(categorized)
    setReviewed((prev) => ({ ...prev, [businessId]: [...(prev[businessId] ?? []), ...ids] }))
    setCategorized({})
    return ids.length
  }, [categorized, businessId])

  const openSheet = useCallback((next: SheetName) => setSheet(next), [])

  const startTour = useCallback(() => setTourActive(true), [])

  const endTour = useCallback(() => {
    setTourActive(false)
    setTourDone(true)
    writeStorage(TOUR_KEY, true)
  }, [])

  const value = useMemo<AppState>(
    () => ({
      profile,
      setProfile,
      registration,
      updateRegistration,
      setLookup,
      hideBalances,
      toggleHideBalances,
      periodKey,
      setPeriodKey,
      businesses,
      business,
      ledger,
      switchBusiness,
      addBusiness,
      registerBusiness,
      connections,
      addConnection,
      removeConnection,
      finishSync,
      pending,
      categorized,
      setCategory,
      applyReview,
      toasts,
      toast,
      dismissToast,
      drawerOpen,
      setDrawerOpen,
      sheet,
      openSheet,
      tourDone,
      tourActive,
      startTour,
      endTour,
    }),
    [
      profile,
      setProfile,
      registration,
      updateRegistration,
      setLookup,
      hideBalances,
      toggleHideBalances,
      periodKey,
      businesses,
      business,
      ledger,
      switchBusiness,
      addBusiness,
      registerBusiness,
      connections,
      addConnection,
      removeConnection,
      finishSync,
      pending,
      categorized,
      setCategory,
      applyReview,
      toasts,
      toast,
      dismissToast,
      drawerOpen,
      sheet,
      openSheet,
      tourDone,
      tourActive,
      startTour,
      endTour,
    ],
  )

  return <AppStateContext value={value}>{children}</AppStateContext>
}
