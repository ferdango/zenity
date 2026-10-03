import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ShimmerText } from '../components/AiText'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { TextField } from '../components/TextField'
import { TopBar } from '../components/TopBar'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import {
  adultMaxDate,
  formatAmountInput,
  formatPhone,
  validateAddress,
  validateBirthdate,
  validateCompanyName,
  validateEmail,
  validateIncome,
  validateName,
  validatePhone,
  validateRuc,
} from '../lib/validation'
import { type CompanyData, type PersonalData, useApp } from '../state/context'
import styles from './Register.module.css'

const TOTAL_STEPS = 2

function StepProgress({ step }: { step: number }) {
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label="Progreso del registro"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span key={i} className={styles.segment}>
          {i < step && (
            <motion.span
              className={styles.segmentFill}
              initial={{ scaleX: i === step - 1 ? 0 : 1 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: ease.emphasized, delay: 0.15 }}
            />
          )}
        </span>
      ))}
    </div>
  )
}

interface RegisterLayoutProps {
  step: number
  icon: string
  title: string
  subtitle: string
  formId: string
  cta: ReactNode
  submitting?: boolean
  backTo: string
  children: ReactNode
}

function RegisterLayout({ step, icon, title, subtitle, formId, cta, submitting, backTo, children }: RegisterLayoutProps) {
  return (
    <div className="z-page">
      <Aurora placement="top" fixed />
      <TopBar title="Crea tu cuenta" subtitle={`Paso ${step} de ${TOTAL_STEPS}`} backTo={backTo} />
      <motion.div className={styles.content} variants={staggerContainer(0.06, 0.05)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <StepProgress step={step} />
        </motion.div>
        <motion.header className={styles.header} variants={fadeUp}>
          <span className={styles.headerIcon}>
            <Icon name={icon} size={28} />
          </span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </motion.header>
        {children}
      </motion.div>
      <div className="z-action-bar">
        <div className={`z-stack ${styles.actions}`} style={{ width: '100%' }}>
          <Button type="submit" form={formId} size="lg" fullWidth loading={submitting} trailingIcon={submitting ? undefined : 'arrow_forward'}>
            {cta}
          </Button>
        </div>
      </div>
    </div>
  )
}

type Touched<T> = Partial<Record<keyof T, boolean>>

function focusFirstInvalid<T extends object>(prefix: string, errors: Record<keyof T, string | null>): boolean {
  const first = (Object.keys(errors) as Array<keyof T>).find((key) => errors[key])
  if (!first) return false
  document.getElementById(`${prefix}-${String(first)}`)?.focus()
  return true
}

/** Paso 1: datos personales. */
export function RegisterPersonal() {
  const navigate = useNavigate()
  const { registration, updateRegistration } = useApp()
  const [values, setValues] = useState<PersonalData>(registration.personal)
  const [touched, setTouched] = useState<Touched<PersonalData>>({})

  const errors: Record<keyof PersonalData, string | null> = {
    nombres: validateName(values.nombres, 'nombres'),
    apellidos: validateName(values.apellidos, 'apellidos'),
    nacimiento: validateBirthdate(values.nacimiento),
    email: validateEmail(values.email),
    celular: validatePhone(values.celular),
    direccion: validateAddress(values.direccion),
  }
  const show = (key: keyof PersonalData) => (touched[key] ? errors[key] : null)
  const field = (key: keyof PersonalData) => ({
    id: `personal-${key}`,
    value: values[key],
    error: show(key),
    valid: touched[key] && !errors[key],
    onChange: (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched({ nombres: true, apellidos: true, nacimiento: true, email: true, celular: true, direccion: true })
    if (focusFirstInvalid<PersonalData>('personal', errors)) return
    updateRegistration('personal', {
      ...values,
      nombres: values.nombres.trim().replace(/\s+/g, ' '),
      apellidos: values.apellidos.trim().replace(/\s+/g, ' '),
      email: values.email.trim(),
      direccion: values.direccion.trim(),
    })
    navigate('/registro/empresa')
  }

  return (
    <RegisterLayout
      step={1}
      icon="person"
      title="Tus datos personales"
      subtitle="Los usamos para crear tu cuenta y proteger tu información."
      formId="register-personal"
      cta="Continuar"
      backTo="/login?modo=registro"
    >
      <motion.form id="register-personal" className={styles.form} onSubmit={onSubmit} noValidate variants={staggerContainer(0.05)}>
        <motion.div className={styles.row} variants={fadeUp}>
          <TextField label="Nombres" icon="person" autoComplete="given-name" autoCapitalize="words" maxLength={60} {...field('nombres')} />
          <TextField label="Apellidos" icon="badge" autoComplete="family-name" autoCapitalize="words" maxLength={60} {...field('apellidos')} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TextField
            label="Fecha de nacimiento"
            icon="cake"
            type="date"
            autoComplete="bday"
            floatLabel
            max={adultMaxDate()}
            min="1915-01-01"
            {...field('nacimiento')}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TextField
            label="Correo electrónico"
            icon="alternate_email"
            type="email"
            inputMode="email"
            autoComplete="email"
            {...field('email')}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TextField
            {...field('celular')}
            label="Celular"
            icon="smartphone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix="+51"
            value={formatPhone(values.celular)}
            onChange={(event) => setValues((v) => ({ ...v, celular: event.target.value.replace(/\D/g, '').slice(0, 9) }))}
            helper={show('celular') ? undefined : 'Te enviaremos alertas de tus cuentas'}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TextField
            label="Dirección"
            icon="location_on"
            autoComplete="street-address"
            maxLength={120}
            {...field('direccion')}
            helper={show('direccion') ? undefined : 'Calle, número y distrito'}
          />
        </motion.div>
        <motion.p className={styles.legal} variants={fadeUp}>
          Prototipo de demostración: tus datos no se envían a ningún servidor.
        </motion.p>
      </motion.form>
    </RegisterLayout>
  )
}

const INCOME_PRESETS = [5000, 10000, 30000, 50000, 100000]

/** Paso 2: datos de la empresa. */
export function RegisterCompany() {
  const navigate = useNavigate()
  const { registration, updateRegistration, setProfile, toast } = useApp()
  const personal = registration.personal
  const [values, setValues] = useState<CompanyData>(registration.company)
  const [touched, setTouched] = useState<Touched<CompanyData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [verifiedRuc, setVerifiedRuc] = useState<string | null>(null)

  const errors: Record<keyof CompanyData, string | null> = {
    razonSocial: validateCompanyName(values.razonSocial),
    ruc: validateRuc(values.ruc),
    ingresoMinimo: validateIncome(values.ingresoMinimo),
  }
  const show = (key: keyof CompanyData) => (touched[key] ? errors[key] : null)

  // Verificación simulada del RUC con SUNAT cuando el formato y el dígito verificador son válidos
  const rucValid = !errors.ruc
  const verifying = rucValid && verifiedRuc !== values.ruc
  useEffect(() => {
    if (!rucValid || verifiedRuc === values.ruc) return
    const timer = window.setTimeout(() => setVerifiedRuc(values.ruc), 900)
    return () => window.clearTimeout(timer)
  }, [rucValid, values.ruc, verifiedRuc])

  if (!personal.nombres) return <Navigate to="/registro/datos" replace />

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setTouched({ razonSocial: true, ruc: true, ingresoMinimo: true })
    if (focusFirstInvalid<CompanyData>('company', errors)) return
    setSubmitting(true)
    updateRegistration('company', { ...values, razonSocial: values.razonSocial.trim() })
    const firstName = personal.nombres.split(' ')[0]
    const firstSurname = personal.apellidos.split(' ')[0]
    window.setTimeout(() => {
      setProfile({
        firstName,
        fullName: `${firstName} ${firstSurname}`,
        initials: `${firstName[0]}${firstSurname[0]}`.toUpperCase(),
        company: values.razonSocial.trim(),
      })
      toast('Tu cuenta está lista', 'verified')
      navigate('/notificaciones', { replace: true })
    }, 1500)
  }

  return (
    <RegisterLayout
      step={2}
      icon="domain"
      title="Datos de tu empresa"
      subtitle="Con esto Zenity adapta tus reportes y alertas a tu negocio."
      formId="register-company"
      cta={submitting ? <ShimmerText>Creando tu cuenta…</ShimmerText> : 'Crear cuenta'}
      submitting={submitting}
      backTo="/registro/datos"
    >
      <motion.div className={styles.summary} variants={fadeUp}>
        <span className={styles.summaryCheck}>
          <Icon name="check" size={18} weight={600} />
        </span>
        <span className={styles.summaryText}>
          <strong>
            {personal.nombres} {personal.apellidos}
          </strong>
          <span>{personal.email}</span>
        </span>
        <IconButton icon="edit" label="Editar datos personales" size="sm" onClick={() => navigate('/registro/datos')} />
      </motion.div>

      <motion.form id="register-company" className={styles.form} onSubmit={onSubmit} noValidate variants={staggerContainer(0.05)}>
        <motion.div variants={fadeUp}>
          <TextField
            id="company-razonSocial"
            label="Razón social"
            icon="domain"
            autoComplete="organization"
            maxLength={120}
            value={values.razonSocial}
            error={show('razonSocial')}
            valid={touched.razonSocial && !errors.razonSocial}
            onChange={(event) => setValues((v) => ({ ...v, razonSocial: event.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, razonSocial: true }))}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TextField
            id="company-ruc"
            label="RUC de la empresa"
            icon="pin"
            inputMode="numeric"
            autoComplete="off"
            value={values.ruc}
            error={show('ruc')}
            helper={show('ruc') ? undefined : '11 dígitos. Ej.: 20123456786'}
            onChange={(event) => setValues((v) => ({ ...v, ruc: event.target.value.replace(/\D/g, '').slice(0, 11) }))}
            onBlur={() => setTouched((t) => ({ ...t, ruc: true }))}
            trailing={
              <AnimatePresence mode="wait" initial={false}>
                {rucValid && (
                  <motion.span
                    key={verifying ? 'verifying' : 'verified'}
                    className={`${styles.verify} ${verifying ? '' : styles.verified}`}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    aria-live="polite"
                  >
                    {verifying ? (
                      <ShimmerText>Validando en SUNAT…</ShimmerText>
                    ) : (
                      <>
                        <Icon name="verified" size={18} fill /> Activo
                      </>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            }
          />
        </motion.div>

        <motion.p className={styles.sectionLabel} variants={fadeUp}>
          Ingresos
        </motion.p>
        <motion.div variants={fadeUp}>
          <TextField
            id="company-ingresoMinimo"
            label="Ingreso mínimo al mes"
            icon="payments"
            inputMode="numeric"
            prefix="S/"
            value={values.ingresoMinimo}
            error={show('ingresoMinimo')}
            valid={touched.ingresoMinimo && !errors.ingresoMinimo}
            helper={show('ingresoMinimo') ? undefined : 'Lo mínimo que factura tu empresa en un mes'}
            onChange={(event) => setValues((v) => ({ ...v, ingresoMinimo: formatAmountInput(event.target.value) }))}
            onBlur={() => setTouched((t) => ({ ...t, ingresoMinimo: true }))}
          />
        </motion.div>
        <motion.div className={`${styles.chips} no-scrollbar`} variants={fadeUp} role="group" aria-label="Montos sugeridos">
          {INCOME_PRESETS.map((amount) => {
            const formatted = formatAmountInput(String(amount))
            return (
              <Chip
                key={amount}
                selected={values.ingresoMinimo === formatted}
                showCheck
                onClick={() => {
                  setValues((v) => ({ ...v, ingresoMinimo: formatted }))
                  setTouched((t) => ({ ...t, ingresoMinimo: true }))
                }}
              >
                S/ {formatted}
                {amount === INCOME_PRESETS[INCOME_PRESETS.length - 1] ? '+' : ''}
              </Chip>
            )
          })}
        </motion.div>
        <motion.p className={styles.legal} variants={fadeUp}>
          Al crear tu cuenta aceptas los Términos y la Política de privacidad (demo).
        </motion.p>
      </motion.form>
    </RegisterLayout>
  )
}
