import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CategoryId,
  type Connection,
  DEFAULT_PERIOD,
  INITIAL_CONNECTIONS,
  PENDING_TRANSACTIONS,
  type PendingTransaction,
} from '../data/mock'
import { getSource } from '../data/sources'
import { readStorage, writeStorage } from '../lib/storage'
import { type AppState, AppStateContext, type SheetName, type ThemePreference, type Toast } from './context'

const THEME_KEY = 'zenity.theme'
const HIDE_KEY = 'zenity.hideBalances'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStorage<ThemePreference>(THEME_KEY, 'dark'))
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme)
  const [hideBalances, setHideBalances] = useState(() => readStorage(HIDE_KEY, false))
  const [periodKey, setPeriodKey] = useState(DEFAULT_PERIOD)
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS)
  const [pending, setPending] = useState<PendingTransaction[]>(PENDING_TRANSACTIONS)
  const [categorized, setCategorized] = useState<Record<string, CategoryId>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetName>(null)
  const toastId = useRef(0)

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemTheme(media.matches ? 'light' : 'dark')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolvedTheme === 'light' ? '#ffffff' : '#131314')
  }, [resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    writeStorage(THEME_KEY, next)
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

  const value = useMemo<AppState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
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
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
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
    ],
  )

  return <AppStateContext value={value}>{children}</AppStateContext>
}
