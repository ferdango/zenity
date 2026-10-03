import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import google from '../assets/brands/google.svg'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { AppleGlyph } from '../components/Glyphs'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Login.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Pending = 'email' | 'google' | 'apple' | null

/** Inicio de sesión / registro (Figma: Login). Flujo simulado, sin backend. */
export function Login() {
  const [params, setParams] = useSearchParams()
  const signup = params.get('modo') === 'registro'
  const navigate = useNavigate()
  const { updateRegistration } = useApp()
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const valid = EMAIL.test(email.trim())

  const go = (kind: Exclude<Pending, null>) => {
    setPending(kind)
    // Registro: continúa con los formularios de datos personales y de empresa.
    if (signup && kind === 'email') updateRegistration('personal', { email: email.trim() })
    window.setTimeout(() => navigate(signup ? '/registro/datos' : '/notificaciones'), 1100)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (valid) go('email')
  }

  const toggleMode = () => setParams(signup ? {} : { modo: 'registro' }, { replace: true })

  return (
    <div className="z-page">
      <Aurora placement="bottom" fixed />
      <TopBar title={signup ? 'Crear cuenta' : 'Conectarse'} backTo="/" />

      <motion.div className={styles.content} variants={staggerContainer(0.07, 0.05)} initial="hidden" animate="show">
        <motion.div className={styles.heading} variants={fadeUp}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={signup ? 'signup' : 'login'}
              className={styles.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: ease.decelerate } }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            >
              {signup ? 'Crea tu cuenta y conecta tus finanzas' : 'Conecta tus finanzas en un solo lugar'}
            </motion.h2>
          </AnimatePresence>
          <p className={styles.subtitle}>Ingresa tu correo electrónico o selecciona otra opción</p>
        </motion.div>

        <motion.form className={styles.form} onSubmit={onSubmit} noValidate variants={fadeUp}>
          <label
            className={`${styles.field} fx-glow-border`}
            data-active={focused}
            data-invalid={touched && !valid && !focused}
          >
            <Icon name="alternate_email" size={22} style={{ color: 'var(--z-on-surface-variant)' }} />
            <span className="visually-hidden">Correo electrónico</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                if (email) setTouched(true)
              }}
            />
            <AnimatePresence>
              {valid && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  style={{ color: 'var(--z-positive)', display: 'inline-flex' }}
                >
                  <Icon name="check_circle" size={22} fill />
                </motion.span>
              )}
            </AnimatePresence>
          </label>
          <span className={styles.hint} role="alert">
            {touched && !valid && !focused ? 'Ingresa un correo válido, por ejemplo nombre@empresa.com' : ''}
          </span>
          <Button type="submit" size="lg" fullWidth loading={pending === 'email'} disabled={pending !== null && pending !== 'email'}>
            {signup ? 'Continuar' : 'Inicia sesión'}
          </Button>
        </motion.form>

        <motion.div className={styles.divider} variants={fadeUp}>
          o también
        </motion.div>

        <motion.div className={styles.social} variants={fadeUp}>
          <Button
            variant="outlined"
            size="lg"
            fullWidth
            className={styles.socialButton}
            icon={pending === 'google' ? undefined : <img src={google} alt="" width={26} height={26} />}
            loading={pending === 'google'}
            disabled={pending !== null && pending !== 'google'}
            onClick={() => go('google')}
          >
            {signup ? 'Regístrate' : 'Inicia sesión'} con Google
          </Button>
          <Button
            variant="outlined"
            size="lg"
            fullWidth
            className={styles.socialButton}
            icon={pending === 'apple' ? undefined : <AppleGlyph size={26} />}
            loading={pending === 'apple'}
            disabled={pending !== null && pending !== 'apple'}
            onClick={() => go('apple')}
          >
            {signup ? 'Regístrate' : 'Inicia sesión'} con Apple
          </Button>
        </motion.div>

        <motion.p className={styles.legal} variants={fadeUp}>
          Prototipo de demostración: no se envían ni guardan datos.
        </motion.p>
      </motion.div>

      <p className={styles.footer}>
        {signup ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
        <button type="button" className={styles.link} onClick={toggleMode}>
          {signup ? 'Inicia sesión' : 'Regístrate'}
        </button>
      </p>
    </div>
  )
}
