import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ShimmerText } from '../components/AiText'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { NotificationBanner } from '../components/NotificationBanner'
import { OtpInput, type OtpStatus } from '../components/OtpInput'
import { TopBar } from '../components/TopBar'
import { maskEmail, maskPhone } from '../lib/format'
import { ease, fadeUp, spring, staggerContainer } from '../lib/motion'
import { useBack } from '../lib/useBack'
import { useTimeouts } from '../lib/useTimeouts'
import { useApp } from '../state/context'
import styles from './VerifyOtp.module.css'

/** Estado con el que Login abre la verificación */
export type VerifyState = { via: 'email'; email: string } | { via: 'google' }

const CODE_LENGTH = 4
const MAX_ATTEMPTS = 3
const RESEND_SECONDS = 30
/** Demora simulada hasta que llega el SMS o el correo */
const ARRIVAL_MS = 1600
const BANNER_MS = 6000
const VERIFY_MS = 1100
/** Celular de ejemplo si no se registró uno en esta sesión */
const DEMO_PHONE = '987654321'

const CHANNELS = {
  email: { app: 'Correo', icon: 'email', tone: 'mail', from: 'Desde Correo', sent: 'a tu correo', eta: 'Revisa tu bandeja de entrada' },
  google: { app: 'Mensajes', icon: 'sms', tone: 'sms', from: 'Desde Mensajes', sent: 'por SMS', eta: 'Llega por SMS en unos segundos' },
} as const

function generateCode(previous?: string): string {
  let code: string
  do {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** CODE_LENGTH
    code = String(n).padStart(CODE_LENGTH, '0')
  } while (code === previous)
  return code
}

function isVerifyState(value: unknown): value is VerifyState {
  const state = value as { via?: unknown; email?: unknown } | null
  return state?.via === 'google' || (state?.via === 'email' && typeof state.email === 'string' && state.email !== '')
}

function formatSeconds(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Verificación con código de un solo uso (OTP) al iniciar sesión con correo o con Google. */
export function VerifyOtp() {
  const { state } = useLocation()
  if (!isVerifyState(state)) return <Navigate to="/login" replace />
  return <OtpVerification {...state} />
}

function OtpVerification(props: VerifyState) {
  const { via } = props
  const navigate = useNavigate()
  const back = useBack('/login')
  const schedule = useTimeouts()
  const { registration, toast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [expected, setExpected] = useState(() => generateCode())
  const [arrived, setArrived] = useState<string | null>(null)
  const [bannerHidden, setBannerHidden] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<OtpStatus>('idle')
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)
  const [filling, setFilling] = useState(false)

  const channel = CHANNELS[via]
  const delivered = arrived === expected
  const busy = status === 'verifying' || status === 'success'
  const canFill = delivered && !busy && !filling && !resending && status !== 'locked'
  const destination = props.via === 'email' ? maskEmail(props.email) : maskPhone(registration.personal.celular || DEMO_PHONE)
  const spokenCode = expected.split('').join(' ')

  // Llegada simulada del código (al entrar y en cada reenvío)
  useEffect(() => {
    const timer = window.setTimeout(() => setArrived(expected), ARRIVAL_MS)
    return () => window.clearTimeout(timer)
  }, [expected])

  // La notificación se oculta sola, como las del sistema
  useEffect(() => {
    if (!delivered) return
    const timer = window.setTimeout(() => setBannerHidden(expected), BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [delivered, expected])

  // Cuenta regresiva para poder reenviar
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  // Enfoca el código cuando termina la transición de entrada
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 450)
    return () => window.clearTimeout(timer)
  }, [])

  const verify = (value: string) => {
    setStatus('verifying')
    schedule(() => {
      if (value === expected) {
        setStatus('success')
        schedule(() => navigate('/notificaciones', { replace: true }), 1200)
        return
      }
      const left = attemptsLeft - 1
      setAttemptsLeft(left)
      setStatus(left > 0 ? 'error' : 'locked')
    }, VERIFY_MS)
  }

  const onCodeChange = (digits: string) => {
    if (busy || filling || resending) return
    // Tras un error, lo que se escribe reemplaza al código incorrecto
    const typed = status === 'error' && digits.length > code.length ? digits.slice(code.length) : digits
    const next = typed.slice(0, CODE_LENGTH)
    setCode(next)
    if (delivered) setBannerHidden(expected)
    if (status === 'error') setStatus('idle')
    if (next.length === CODE_LENGTH) verify(next)
  }

  // Autocompleta con el código recibido, dígito a dígito
  const autofill = () => {
    if (!canFill) return
    const value = expected
    setBannerHidden(value)
    setFilling(true)
    setStatus('idle')
    setCode('')
    for (let i = 1; i <= CODE_LENGTH; i++) schedule(() => setCode(value.slice(0, i)), i * 110)
    schedule(() => {
      setFilling(false)
      verify(value)
    }, CODE_LENGTH * 110 + 220)
  }

  const resend = () => {
    if (resending || busy) return
    setResending(true)
    setBannerHidden(expected)
    schedule(() => {
      setExpected((previous) => generateCode(previous))
      setCode('')
      setStatus('idle')
      setAttemptsLeft(MAX_ATTEMPTS)
      setSeconds(RESEND_SECONDS)
      setResending(false)
      toast(`Te enviamos un código nuevo ${channel.sent}`, channel.icon)
      schedule(() => inputRef.current?.focus({ preventScroll: true }), 50)
    }, 900)
  }

  let message: ReactNode = null
  let tone: 'muted' | 'error' | 'success' = 'muted'
  if (status === 'verifying') {
    message = <ShimmerText>Verificando código…</ShimmerText>
  } else if (status === 'success') {
    tone = 'success'
    message = (
      <>
        <Icon name="verified" size={18} fill /> Identidad verificada
      </>
    )
  } else if (status === 'error') {
    tone = 'error'
    message = (
      <>
        <Icon name="error" size={18} fill /> Código incorrecto. {attemptsLeft === 1 ? 'Te queda 1 intento.' : `Te quedan ${attemptsLeft} intentos.`}
      </>
    )
  } else if (status === 'locked') {
    tone = 'error'
    message = (
      <>
        <Icon name="lock" size={18} fill /> Superaste los {MAX_ATTEMPTS} intentos. Pide un código nuevo.
      </>
    )
  }

  const waiting = !delivered && !busy && status !== 'locked'

  return (
    <div className="z-page">
      <Aurora placement="top" fixed />
      <TopBar
        title="Verificación"
        subtitle={via === 'google' ? 'Inicio de sesión con Google' : 'Inicio de sesión con correo'}
        backTo="/login"
      />

      <motion.div className={styles.content} variants={staggerContainer(0.06, 0.05)} initial="hidden" animate="show">
        <motion.header className={styles.header} variants={fadeUp}>
          <span className={styles.headerIcon} data-success={status === 'success'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status === 'success' ? 'success' : 'channel'}
                className={styles.headerGlyph}
                initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.12 } }}
                transition={spring.bouncy}
              >
                <Icon
                  name={status === 'success' ? 'check' : via === 'email' ? 'mark_email_read' : 'sms'}
                  size={30}
                  weight={status === 'success' ? 600 : 400}
                />
              </motion.span>
            </AnimatePresence>
          </span>
          <h2 className={styles.title}>{via === 'email' ? 'Revisa tu correo' : 'Verifica que eres tú'}</h2>
          <p id="otp-help" className={styles.subtitle}>
            {via === 'email'
              ? `Ingresa el código de ${CODE_LENGTH} dígitos que enviamos a `
              : `Por tu seguridad, ingresa el código de ${CODE_LENGTH} dígitos que enviamos por SMS al `}
            <strong className={styles.destination}>{destination}</strong>
          </p>
          {via === 'email' && (
            <button type="button" className={styles.link} data-ripple="" onClick={back}>
              Cambiar correo
            </button>
          )}
        </motion.header>

        <motion.div className={styles.code} variants={fadeUp}>
          <OtpInput
            ref={inputRef}
            id="otp-code"
            value={code}
            onChange={onCodeChange}
            length={CODE_LENGTH}
            status={status}
            readOnly={filling || resending}
            label={`Código de verificación de ${CODE_LENGTH} dígitos`}
            describedBy="otp-help otp-status"
          />
          <p id="otp-status" className={styles.status} data-tone={tone} role="status">
            {message}
          </p>
        </motion.div>

        <motion.div className={styles.suggestionSlot} variants={fadeUp}>
          <AnimatePresence mode="wait" initial={false}>
            {waiting && (
              <motion.div
                key="waiting"
                className={styles.waiting}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <span className={`${styles.waitingIcon} fx-skeleton-line`} aria-hidden />
                <span className={styles.suggestionText}>
                  <ShimmerText>Esperando el código…</ShimmerText>
                  <span className={styles.caption}>{channel.eta}</span>
                </span>
              </motion.div>
            )}
            {canFill && (
              <motion.button
                key="suggestion"
                type="button"
                className={styles.suggestion}
                data-ripple=""
                aria-label={`Completar con el código ${spokenCode}, recibido ${channel.sent}`}
                onClick={autofill}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.18, ease: ease.accelerate } }}
                transition={{ duration: 0.4, ease: ease.decelerate }}
              >
                <span className={styles.suggestionIcon} data-tone={channel.tone}>
                  <Icon name={channel.icon} size={20} fill />
                </span>
                <span className={styles.suggestionText}>
                  <span className={styles.caption}>{channel.from}</span>
                  <strong className={styles.suggestionCode}>{expected}</strong>
                </span>
                <span className={styles.suggestionAction}>
                  Completar
                  <Icon name="arrow_forward" size={18} />
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div className={styles.resend} variants={fadeUp}>
          {status === 'locked' ? (
            <Button variant="tonal" icon="refresh" loading={resending} onClick={resend}>
              Pedir un código nuevo
            </Button>
          ) : seconds > 0 ? (
            <span>
              ¿No te llegó? Pide otro en <span className={styles.countdown}>{formatSeconds(seconds)}</span>
            </span>
          ) : (
            <>
              <span>¿No te llegó?</span>
              <Button variant="text" size="sm" icon="refresh" loading={resending} disabled={busy} onClick={resend}>
                Reenviar código
              </Button>
            </>
          )}
        </motion.div>

        <motion.p className={styles.legal} variants={fadeUp}>
          Prototipo de demostración: el código llega en una notificación simulada.
        </motion.p>
      </motion.div>

      <NotificationBanner
        open={delivered && bannerHidden !== expected && status === 'idle' && !filling && !resending}
        app={channel.app}
        icon={channel.icon}
        tone={channel.tone}
        title="Zenity"
        label={`Notificación de ${channel.app}: tu código de Zenity es ${spokenCode}. Toca para completarlo.`}
        onPress={autofill}
        onDismiss={() => setBannerHidden(expected)}
      >
        {via === 'email' ? (
          <>
            Tu código de acceso es <strong>{expected}</strong>. Si no fuiste tú, ignora este correo.
          </>
        ) : (
          <>
            <strong>{expected}</strong> es tu código de verificación. No lo compartas con nadie.
          </>
        )}
      </NotificationBanner>
      <span className="visually-hidden" aria-live="polite">
        {delivered ? `Te llegó el código ${channel.sent}.` : ''}
      </span>
    </div>
  )
}
