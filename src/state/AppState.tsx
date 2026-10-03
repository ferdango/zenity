import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import {
  type CategoryId,
  type Connection,
  DEFAULT_PERIOD,
  INITIAL_CONNECTIONS,
  PENDING_TRANSACTIONS,
  type PendingTransaction,
  USER,
} from '../data/mock'
import { getSource } from '../data/sources'
import { readStorage, writeStorage } from '../lib/storage'
import { type AppState, AppStateContext, type Profile, type Registration, type SheetName, type Toast } from './context'

const HIDE_KEY = 'zenity.hideBalances'
const PROFILE_KEY = 'zenity.profile'
const TOUR_KEY = 'zenity.tourDone'

const EMPTY_REGISTRATION: Registration = {
  personal: { nombres: '', apellidos: '', nacimiento: '', email: '', celular: '', direccion: '' },
  company: { razonSocial: '', ruc: '', ingresoMinimo: '' },
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Solo se guarda lo necesario para mostrar (nombre y empresa), nunca el resto de datos personales.
  const [profile, setProfileState] = useState<Profile>(() => readStorage<Profile>(PROFILE_KEY, USER))
  const [registration, setRegistration] = useState<Registration>(EMPTY_REGISTRATION)
  const [hideBalances, setHideBalances] = useState(() => readStorage(HIDE_KEY, false))
  const [periodKey, setPeriodKey] = useState(DEFAULT_PERIOD)
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS)
  const [pending, setPending] = useState<PendingTransaction[]>(PENDING_TRANSACTIONS)
  const [categorized, setCategorized] = useState<Record<string, CategoryId>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetName>(null)
  const [tourDone, setTourDone] = useState(() => readStorage(TOUR_KEY, false))
  const [tourActive, setTourActive] = useState(false)
  const toastId = useRef(0)

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next)
    writeStorage(PROFILE_KEY, next)
  }, [])

  const updateRegistration = useCallback(
    <K extends keyof Registration>(part: K, data: Partial<Registration[K]>) => {
      setRegistration((prev) => ({ ...prev, [part]: { ...prev[part], ...data } }))
    },
    [],
  )

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

  const addConnection = useCallback((sourceId: string) => {
    const source = getSource(sourceId)
    if (!source) return null
    const last4 = String(1000 + ((sourceId.length * 7919) % 9000)).slice(-4)
    const connection: Connection = {
      id: `${sourceId}-${Date.now().toString(36)}`,
      label: source.kind === 'bank' ? 'Cuenta bancaria' : source.kind === 'api' ? 'Conexión API' : source.kind === 'database' ? 'Base de datos' : 'Archivo',
      name: source.name.replace('Base de datos en ', '').replace(' como base de datos', ''),
      shortName: source.name,
      last4: source.kind === 'bank' ? last4 : undefined,
      balance: 0,
      theme: source.theme,
      avatar: source.kind === 'bank' ? 'bank' : source.kind === 'file' ? 'sheet' : 'api',
      sourceId,
    }
    setConnections((list) => [...list, connection])
    return connection
  }, [])

  const removeConnection = useCallback((id: string) => {
    setConnections((list) => list.filter((c) => c.id !== id))
  }, [])

  const finishSync = useCallback(() => {
    setConnections((list) =>
      list.map((c) => {
        if (!c.sourceId || c.balance !== 0) return c
        const seed = [...c.sourceId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        return { ...c, balance: 800 + ((seed * 97) % 2400) + 0.45 }
      }),
    )
  }, [])

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
    setPending((list) => list.filter((p) => !ids.includes(p.id)))
    setCategorized({})
    return ids.length
  }, [categorized])

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
      hideBalances,
      toggleHideBalances,
      periodKey,
      setPeriodKey,
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
      hideBalances,
      toggleHideBalances,
      periodKey,
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
