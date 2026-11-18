/**
 * Tema de la app: claro (por defecto), oscuro o automático (el del sistema).
 * El script de index.html aplica el tema antes de pintar para que no parpadee.
 */
import { useSyncExternalStore } from 'react'
import { readStorage, writeStorage } from './storage'

export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'zenity.theme'
const META_COLOR = { light: '#f3f5fa', dark: '#0f121a' } as const

let pref: ThemePref = readStorage<ThemePref>(KEY, 'light')
const listeners = new Set<() => void>()
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function resolved(p: ThemePref): 'light' | 'dark' {
  if (p === 'system') return media?.matches ? 'dark' : 'light'
  return p
}

function apply() {
  const theme = resolved(pref)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
}

media?.addEventListener('change', () => {
  if (pref === 'system') apply()
})

export function setTheme(next: ThemePref) {
  pref = next
  writeStorage(KEY, next)
  apply()
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useTheme(): ThemePref {
  return useSyncExternalStore(subscribe, () => pref, () => pref)
}

export const THEME_LABEL: Record<ThemePref, string> = { light: 'Claro', dark: 'Oscuro', system: 'Automático' }
