import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Business, DEMO_BUSINESSES, businessFromCompany, withRegimen } from '../data/businesses'
import { buildLedger } from '../data/ledger'
import { autoChoice, type MatchChoice } from '../data/matches'
import { type CategoryId, type Connection, DEFAULT_PERIOD, INITIAL_CONNECTIONS, type SourceKind, USER } from '../data/mock'
import type { SunatCompany } from '../data/registry'
import type { Regimen } from '../data/sire'
import { getSource } from '../data/sources'
import { FIRST_SYNC_MS, isNew, isStale, SYNC_CHECK_MS, synced } from '../data/sync'
import { track } from '../lib/analytics'
import { readStorage, writeStorage } from '../lib/storage'
import {
  type AppState,
  AppStateContext,
  type ClassifiedMovement,
  type Profile,
  type ReconciledMatch,
  type Registration,
  type SheetName,
  type Toast,
} from './context'

const HIDE_KEY = 'zenity.hideBalances'
const PROFILE_KEY = 'zenity.profile'
const TOUR_KEY = 'zenity.tourDone'
const BUSINESSES_KEY = 'zenity.businesses'
const ACTIVE_BUSINESS_KEY = 'zenity.business'

/** Etiqueta de la tarjeta según el tipo de fuente conectada. */
const KIND_LABELS: Record<SourceKind, string> = {
  bank: 'Cuenta bancaria',
  wallet: 'Billetera digital',
  api: 'Conexión API',
  file: 'Archivo',
}

const EMPTY_REGISTRATION: Registration = {
  personal: { tipoDoc: 'dni', dni: '', nombres: '', apellidos: '', nacimiento: '', email: '', celular: '', direccion: '' },
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
  /** Categorías que el usuario cambió, por negocio (las demás las decide Zenity) */
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, Record<string, CategoryId>>>({})
  /** Pares que el usuario corrigió, por negocio (los demás los concilia Zenity) */
  const [matchOverrides, setMatchOverrides] = useState<Record<string, Record<string, MatchChoice>>>({})
  /** Movimientos y pares que el usuario ya revisó, por negocio */
  const [reviewedIds, setReviewedIds] = useState<Record<string, string[]>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [tourDone, setTourDone] = useState(() => readStorage(TOUR_KEY, false))
  const [tourActive, setTourActive] = useState(false)
  const toastId = useRef(0)

  const business = businesses.find((b) => b.id === activeId) ?? businesses[0]
  const businessId = business.id
  const connections = business.connections
  const ledger = useMemo(
    () => buildLedger(business, matchOverrides[business.id], categoryOverrides[business.id]),
    [business, matchOverrides, categoryOverrides],
  )
  // Piloto automático: cada movimiento lleva la categoría recomendada y cada par la decisión de
  // Zenity, salvo que el usuario las haya cambiado. Nada queda esperando una respuesta.
  const reviewed = reviewedIds[businessId]
  const classified = useMemo<ClassifiedMovement[]>(() => {
    const own = categoryOverrides[businessId] ?? {}
    return ledger.pending.map((p) => ({
      ...p,
      category: own[p.id] ?? p.recommended,
      auto: !(p.id in own),
      reviewed: reviewed?.includes(p.id) ?? false,
    }))
  }, [ledger, categoryOverrides, businessId, reviewed])
  const reconciled = useMemo<ReconciledMatch[]>(() => {
    const own = matchOverrides[businessId] ?? {}
    return ledger.matches.map((match) => ({
      match,
      choice: own[match.id] ?? autoChoice(match),
      auto: !(match.id in own),
      reviewed: reviewed?.includes(match.id) ?? false,
    }))
  }, [ledger, matchOverrides, businessId, reviewed])

  useEffect(() => writeStorage(BUSINESSES_KEY, businesses), [businesses])
  useEffect(() => writeStorage(ACTIVE_BUSINESS_KEY, businessId), [businessId])

  /** Lee las conexiones que cumplen `due`, en todos los negocios. */
  const syncWhere = useCallback((due: (connection: Connection, now: number) => boolean) => {
    const now = Date.now()
    setBusinesses((list) =>
      list.some((b) => b.connections.some((c) => due(c, now)))
        ? list.map((b) => ({ ...b, connections: b.connections.map((c) => (due(c, now) ? synced(c, now) : c)) }))
        : list,
    )
  }, [])

  // Sincronización automática: una conexión nueva se lee apenas se agrega...
  const unsynced = businesses.flatMap((b) => b.connections.filter(isNew).map((c) => c.id)).join()
  useEffect(() => {
    if (!unsynced) return
    const timer = window.setTimeout(() => syncWhere(isNew), FIRST_SYNC_MS)
    return () => window.clearTimeout(timer)
  }, [unsynced, syncWhere])

  // ...y todas vuelven a leerse cada 6 horas: al abrir la app y mientras sigue abierta
  useEffect(() => {
    const onOpen = window.setTimeout(() => syncWhere(isStale), FIRST_SYNC_MS)
    const interval = window.setInterval(() => syncWhere(isStale), SYNC_CHECK_MS)
    return () => {
      window.clearTimeout(onOpen)
      window.clearInterval(interval)
    }
  }, [syncWhere])

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
    track('negocio_cambiado')
  }, [])

  const addBusiness = useCallback(
    (company: SunatCompany, nombreComercial: string, regimen: Regimen) => {
      const created = businessFromCompany(company, nombreComercial, regimen, businesses.length)
      setBusinesses((list) => (list.some((b) => b.id === created.id) ? list : [...list, created]))
      track('negocio_agregado', { regimen, tipo_contribuyente: company.tipoContribuyente, negocios: businesses.length + 1 })
      setActiveId(created.id)
      return created
    },
    [businesses.length],
  )

  const registerBusiness = useCallback((company: SunatCompany, nombreComercial: string, regimen: Regimen) => {
    // El prototipo le da al RUC registrado las cuentas de ejemplo del Figma
    const registered = { ...businessFromCompany(company, nombreComercial, regimen, 0), connections: INITIAL_CONNECTIONS, scale: 1 }
    setBusinesses([registered])
    setActiveId(registered.id)
    setCategoryOverrides({})
    setMatchOverrides({})
    setReviewedIds({})
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
      const seed = [...sourceId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      const connection: Connection = {
        id: `${sourceId}-${Date.now().toString(36)}`,
        label: KIND_LABELS[source.kind],
        name: source.name.replace(' como base de datos', ''),
        shortName: source.name,
        last4: source.kind === 'bank' ? last4 : undefined,
        phone: source.kind === 'wallet' ? String(100 + ((seed * 37) % 900)) : undefined,
        balance: 0,
        theme: source.theme,
        avatar: source.avatar ?? (source.kind === 'bank' ? 'bank' : source.kind === 'file' ? 'sheet' : 'api'),
        sourceId,
      }
      updateConnections((list) => [...list, connection])
      track('conexion_agregada', { fuente: sourceId, tipo: source.kind })
      return connection
    },
    [updateConnections],
  )

  const removeConnection = useCallback(
    (id: string) => updateConnections((list) => list.filter((c) => c.id !== id)),
    [updateConnections],
  )

  const finishSync = useCallback(() => syncWhere(isNew), [syncWhere])

  // Volver a la opción de Zenity borra el cambio: el movimiento queda otra vez en automático
  const setCategory = useCallback(
    (pendingId: string, category: CategoryId) => {
      const recommended = ledger.pending.find((p) => p.id === pendingId)?.recommended
      setCategoryOverrides((prev) => {
        const own = { ...prev[businessId] }
        if (category === recommended) delete own[pendingId]
        else own[pendingId] = category
        return { ...prev, [businessId]: own }
      })
      track('decision_automatica_cambiada', { tipo: 'categoria', a_la_de_zenity: category === recommended })
    },
    [ledger, businessId],
  )

  const setMatchChoice = useCallback(
    (matchId: string, choice: MatchChoice) => {
      const match = ledger.matches.find((m) => m.id === matchId)
      const isAuto = match ? autoChoice(match) === choice : false
      setMatchOverrides((prev) => {
        const own = { ...prev[businessId] }
        if (isAuto) delete own[matchId]
        else own[matchId] = choice
        return { ...prev, [businessId]: own }
      })
      track('decision_automatica_cambiada', { tipo: 'conciliacion', a_la_de_zenity: isAuto })
    },
    [ledger, businessId],
  )

  const setReviewed = useCallback(
    (id: string, done: boolean) => {
      setReviewedIds((prev) => {
        const own = prev[businessId] ?? []
        if (own.includes(id) === done) return prev
        return { ...prev, [businessId]: done ? [...own, id] : own.filter((x) => x !== id) }
      })
    },
    [businessId],
  )

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
      classified,
      reconciled,
      setCategory,
      setMatchChoice,
      setReviewed,
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
      classified,
      reconciled,
      setCategory,
      setMatchChoice,
      setReviewed,
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
