import { AnimatePresence, motion } from 'motion/react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ShimmerText, SkeletonLines } from '../components/AiText'
import { SourceLogo } from '../components/Avatars'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { TopBar } from '../components/TopBar'
import { SOURCE_FILTERS, type Source, type SourceKind } from '../data/mock'
import { getSource, SOURCES } from '../data/sources'
import { cn } from '../lib/cn'
import { ease } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './AddConnection.module.css'

const STEPS = ['Estableciendo conexión segura', 'Validando credenciales', 'Sincronizando cuentas']

/** Fuentes que ya mostraron el error simulado: el reintento sí conecta. */
const failedOnce = new Set<string>()

function ConnectingSheet({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { addConnection } = useApp()
  const [step, setStep] = useState(0)
  const [current, setCurrent] = useState(source)
  const cancelled = useRef(false)

  // Reinicia los pasos cuando se elige otra fuente (estado derivado, sin efecto).
  if (source !== current) {
    setCurrent(source)
    setStep(0)
  }

  useEffect(() => {
    if (!source) return
    cancelled.current = false
    const timers = [
      window.setTimeout(() => setStep(1), 900),
      window.setTimeout(() => setStep(2), 1800),
      window.setTimeout(() => {
        if (cancelled.current) return
        if (source.simulateError && !failedOnce.has(source.id)) {
          failedOnce.add(source.id)
          navigate(`/conexiones/resultado?estado=error&fuente=${source.id}`)
          return
        }
        const connection = addConnection(source.id)
        navigate(`/conexiones/resultado?estado=exito&fuente=${source.id}&cuenta=${connection?.id ?? ''}`)
      }, 2800),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [source, navigate, addConnection])

  const cancel = () => {
    cancelled.current = true
    onClose()
  }

  return (
    <BottomSheet open={source !== null} onClose={cancel} label="Conectando" showClose={false}>
      {source && (
        <div className={styles.connecting}>
          <div className={styles.logoPulse}>
            <span className={styles.orbit} aria-hidden />
            <SourceLogo source={source} size={64} />
          </div>
          <h2 className="t-headline-s">Conectando con {source.name}</h2>
          <ShimmerText className="t-body-m">Zenity está preparando tu consolidado…</ShimmerText>
          <ul className={styles.steps} aria-live="polite">
            {STEPS.map((label, i) => {
              const state = i < step ? 'done' : i === step ? 'active' : 'pending'
              return (
                <li key={label} className={styles.step} data-state={state}>
                  <span className={styles.stepIcon}>
                    <AnimatePresence mode="wait" initial={false}>
                      {state === 'done' ? (
                        <motion.span
                          key="done"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          style={{ color: 'var(--z-positive)', display: 'inline-flex' }}
                        >
                          <Icon name="check_circle" size={22} fill />
                        </motion.span>
                      ) : (
                        <motion.span key="pending" exit={{ scale: 0 }} style={{ display: 'inline-flex' }}>
                          <Icon name={state === 'active' ? 'progress_activity' : 'radio_button_unchecked'} size={22} className={state === 'active' ? 'z-spin' : undefined} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {label}
                </li>
              )
            })}
          </ul>
          <SkeletonLines lines={2} />
          <span className={styles.secure}>
            <Icon name="lock" size={14} fill /> Conexión cifrada · Zenity solo lee tus movimientos
          </span>
          <Button variant="text" onClick={cancel}>
            Cancelar
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}

/** Nueva cuenta / fuentes de conexión (Figma: Add new connection). */
export function AddConnection() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [filter, setFilter] = useState<'all' | SourceKind>('all')
  const [connecting, setConnecting] = useState<Source | null>(() => getSource(params.get('reintentar')) ?? null)
  const deferred = useDeferredValue(query.trim().toLowerCase())

  useEffect(() => {
    if (params.has('reintentar')) navigate('/conexiones/nueva', { replace: true })
  }, [params, navigate])

  const results = SOURCES.filter(
    (s) =>
      (filter === 'all' || s.kind === filter) &&
      (!deferred || `${s.name} ${s.description}`.toLowerCase().includes(deferred)),
  )

  return (
    <div className="z-page">
      <TopBar title="Nueva cuenta" />
      <div className="z-container">
        <label className={cn(styles.search, 'fx-glow-border')} data-active={focused}>
          <Icon name="search" size={22} />
          <span className="visually-hidden">Buscar fuente de conexión</span>
          <input
            type="search"
            placeholder="Mi nueva conexión es…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <AnimatePresence>
            {query && (
              <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                <IconButton icon="close" label="Limpiar búsqueda" size="sm" onClick={() => setQuery('')} />
              </motion.span>
            )}
          </AnimatePresence>
        </label>

        <div className={cn(styles.filters, 'no-scrollbar')} role="toolbar" aria-label="Filtrar por tipo">
          {SOURCE_FILTERS.map((f) => (
            <Chip key={f.id} selected={filter === f.id} showCheck onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <motion.ul className={styles.list} layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {results.map((source, i) => (
              <motion.li
                key={source.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, delay: Math.min(i, 8) * 0.03, ease: ease.decelerate } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: ease.accelerate } }}
              >
                <button type="button" className={styles.source} data-ripple="" onClick={() => setConnecting(source)}>
                  <span className={styles.logoWrap}>
                    <SourceLogo source={source} />
                    {source.badge && <span className={cn(styles.badge, styles[source.badge.tone])}>{source.badge.label}</span>}
                  </span>
                  <span className={styles.sourceText}>
                    <span className={styles.sourceTitle}>{source.name}</span>
                    <span className={styles.sourceDesc}>{source.description}</span>
                  </span>
                  <Icon name="chevron_right" style={{ color: 'var(--z-on-surface-variant)' }} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {results.length === 0 && (
          <motion.div className={styles.empty} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Icon name="search_off" size={40} />
            <p className="t-body-l">No encontramos «{query}»</p>
            <Button variant="tonal" icon="auto_awesome" to={`/chat?q=${encodeURIComponent(`¿Puedo conectar ${query}?`)}`}>
              Pregúntale a Zenity
            </Button>
          </motion.div>
        )}
      </div>

      <ConnectingSheet source={connecting} onClose={() => setConnecting(null)} />
    </div>
  )
}
