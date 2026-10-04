import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ShimmerText } from '../components/AiText'
import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import {
  CompanyProfile,
  IdentityVerified,
  LookupHint,
  LookupSkeleton,
  type LookupState,
  LookupStatus,
} from '../components/Registry'
import { TextField } from '../components/TextField'
import { TopBar } from '../components/TopBar'
import { consultarDni, consultarRuc, type ReniecPerson, type SunatCompany } from '../data/registry'
import { formatLongDate } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useTimeouts } from '../lib/useTimeouts'
import {
  ageFrom,
  formatAmountInput,
  formatPhone,
  validateAddress,
  validateBirthdate,
  validateCompanyName,
  validateDni,
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
  ctaIcon?: string
  submitting?: boolean
  backTo: string
  children: ReactNode
}

function RegisterLayout({
  step,
  icon,
  title,
  subtitle,
  formId,
  cta,
  ctaIcon = 'arrow_forward',
  submitting,
  backTo,
  children,
}: RegisterLayoutProps) {
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
          <Button type="submit" form={formId} size="lg" fullWidth loading={submitting} trailingIcon={ctaIcon}>
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

/** Enfoca el primer campo cuando termina la transición de entrada. */
function useFocusOnEnter(id: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => document.getElementById(id)?.focus({ preventScroll: true }), 450)
    return () => window.clearTimeout(timer)
    // Solo al entrar a la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

const fadeSwap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

/** Datos del formulario que llegan de RENIEC. */
function identityFrom(person: ReniecPerson): Pick<PersonalData, 'nombres' | 'apellidos' | 'nacimiento' | 'direccion'> {
  return {
    nombres: person.nombres,
    apellidos: `${person.apellidoPaterno} ${person.apellidoMaterno}`,
    nacimiento: person.fechaNacimiento,
    direccion: `${person.domicilio}, ${person.distrito}`,
  }
}

const EMPTY_IDENTITY = { nombres: '', apellidos: '', nacimiento: '', direccion: '' }

/** Paso 1: DNI (consulta a RENIEC) y datos personales. */
export function RegisterPersonal() {
  const navigate = useNavigate()
  const { registration, updateRegistration, setLookup } = useApp()
  const [values, setValues] = useState<PersonalData>(registration.personal)
  const [touched, setTouched] = useState<Touched<PersonalData>>({})
  const [person, setPerson] = useState<ReniecPerson | null>(registration.reniec)
  const [failure, setFailure] = useState<{ dni: string; message: string } | null>(null)
  const [autofilled, setAutofilled] = useState(false)

  const dniFormat = validateDni(values.dni)
  const verified = person !== null && person.dni === values.dni
  const notFound = failure?.dni === values.dni
  const searching = !dniFormat && !verified && !notFound
  const lookup: LookupState = verified ? 'verified' : searching ? 'searching' : 'idle'

  useFocusOnEnter('personal-dni', !verified)

  // Consulta a RENIEC en cuanto el DNI tiene 8 dígitos
  useEffect(() => {
    if (!searching) return
    let active = true
    const dni = values.dni
    consultarDni(dni).then((result) => {
      if (!active) return
      if (!result.ok) {
        setFailure({ dni, message: result.error })
        return
      }
      setPerson(result.data)
      setAutofilled(true)
      setValues((v) => ({ ...v, ...identityFrom(result.data) }))
    })
    return () => {
      active = false
    }
  }, [searching, values.dni])

  const errors: Record<keyof PersonalData, string | null> = {
    dni: dniFormat ?? (notFound ? failure.message : null),
    nombres: validateName(values.nombres, 'nombres'),
    apellidos: validateName(values.apellidos, 'apellidos'),
    nacimiento: validateBirthdate(values.nacimiento),
    email: validateEmail(values.email),
    celular: validatePhone(values.celular),
    direccion: validateAddress(values.direccion),
  }
  const show = (key: keyof PersonalData) => (touched[key] || (key === 'dni' && notFound) ? errors[key] : null)
  const field = (key: keyof PersonalData) => ({
    id: `personal-${key}`,
    value: values[key],
    error: show(key),
    valid: touched[key] && !errors[key],
    onChange: (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  })

  // Si cambia el DNI ya verificado, los datos de RENIEC dejan de corresponder
  const onDniChange = (raw: string) => {
    const dni = raw.replace(/\D/g, '').slice(0, 8)
    setAutofilled(false)
    setValues((v) => {
      if (person && dni === person.dni) return { ...v, dni, ...identityFrom(person) }
      if (person && v.dni === person.dni) return { ...v, dni, ...EMPTY_IDENTITY }
      return { ...v, dni }
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!verified) {
      setTouched((t) => ({ ...t, dni: true }))
      if (!searching) document.getElementById('personal-dni')?.focus()
      return
    }
    setTouched({ dni: true, nombres: true, apellidos: true, nacimiento: true, email: true, celular: true, direccion: true })
    if (focusFirstInvalid<PersonalData>('personal', errors)) return
    updateRegistration('personal', { ...values, email: values.email.trim(), direccion: values.direccion.trim() })
    setLookup('reniec', person)
    navigate('/registro/empresa')
  }

  return (
    <RegisterLayout
      step={1}
      icon="person"
      title="Tus datos personales"
      subtitle="Ingresa tu DNI y completamos tus datos con RENIEC."
      formId="register-personal"
      cta={verified ? 'Continuar' : searching ? 'Consultando…' : 'Consultar DNI'}
      ctaIcon={verified ? 'arrow_forward' : 'person_search'}
      submitting={searching}
      backTo="/login?modo=registro"
    >
      <motion.form id="register-personal" className={styles.form} onSubmit={onSubmit} noValidate variants={staggerContainer(0.05)}>
        <motion.div variants={fadeUp}>
          <TextField
            {...field('dni')}
            label="DNI"
            icon="id_card"
            inputMode="numeric"
            autoComplete="off"
            valid={false}
            onChange={(event) => onDniChange(event.target.value)}
            helper={show('dni') || verified ? undefined : 'Documento Nacional de Identidad (8 dígitos)'}
            trailing={<LookupStatus state={lookup} source="RENIEC" />}
          />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {verified ? (
            <motion.div key="filled" className={styles.form} variants={staggerContainer(0.05)} initial="hidden" animate="show" exit={fadeSwap.exit}>
              <motion.div variants={fadeUp}>
                <IdentityVerified person={person} />
              </motion.div>
              <motion.div className={styles.row} variants={fadeUp}>
                <TextField id="personal-nombres" label="Nombres" icon="person" locked autofilled={autofilled} value={values.nombres} error={show('nombres')} />
                <TextField id="personal-apellidos" label="Apellidos" icon="badge" locked autofilled={autofilled} value={values.apellidos} error={show('apellidos')} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <TextField
                  id="personal-nacimiento"
                  label="Fecha de nacimiento"
                  icon="cake"
                  locked
                  autofilled={autofilled}
                  value={values.nacimiento ? `${formatLongDate(values.nacimiento)} · ${ageFrom(values.nacimiento)} años` : ''}
                  error={show('nacimiento')}
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <TextField label="Correo electrónico" icon="alternate_email" type="email" inputMode="email" autoComplete="email" {...field('email')} />
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
                  autofilled={autofilled}
                  {...field('direccion')}
                  helper={show('direccion') ? undefined : 'Domicilio según tu DNI. Actualízalo si cambió.'}
                />
              </motion.div>
            </motion.div>
          ) : searching ? (
            <motion.div key="loading" {...fadeSwap}>
              <LookupSkeleton variant="person" />
            </motion.div>
          ) : (
            <motion.div key="hint" {...fadeSwap}>
              <LookupHint>
                Con tu DNI completamos automáticamente tus <strong>nombres, apellidos, fecha de nacimiento y dirección</strong>{' '}
                desde RENIEC.
              </LookupHint>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p className={styles.legal} variants={fadeUp}>
          Prototipo de demostración: la consulta a RENIEC es simulada y tus datos no se envían a ningún servidor.
        </motion.p>
      </motion.form>
    </RegisterLayout>
  )
}

const INCOME_PRESETS = [5000, 10000, 30000, 50000, 100000]

/** Paso 2: RUC (consulta a SUNAT) y datos de la empresa. */
export function RegisterCompany() {
  const navigate = useNavigate()
  const schedule = useTimeouts()
  const { registration, updateRegistration, setLookup, setProfile, toast } = useApp()
  const personal = registration.personal
  const [values, setValues] = useState<CompanyData>(registration.company)
  const [touched, setTouched] = useState<Touched<CompanyData>>({})
  const [company, setCompany] = useState<SunatCompany | null>(registration.sunat)
  const [failure, setFailure] = useState<{ ruc: string; message: string } | null>(null)
  const [autofilled, setAutofilled] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const rucFormat = validateRuc(values.ruc)
  const verified = company !== null && company.ruc === values.ruc
  const notFound = failure?.ruc === values.ruc
  const searching = !rucFormat && !verified && !notFound
  const lookup: LookupState = verified ? 'verified' : searching ? 'searching' : 'idle'

  useFocusOnEnter('company-ruc', !verified)

  // Consulta a SUNAT en cuanto el RUC tiene formato y dígito verificador válidos
  useEffect(() => {
    if (!searching) return
    let active = true
    const ruc = values.ruc
    consultarRuc(ruc).then((result) => {
      if (!active) return
      if (!result.ok) {
        setFailure({ ruc, message: result.error })
        return
      }
      setCompany(result.data)
      setAutofilled(true)
      setValues((v) => ({ ...v, razonSocial: result.data.razonSocial, nombreComercial: result.data.nombreComercial ?? '' }))
    })
    return () => {
      active = false
    }
  }, [searching, values.ruc])

  if (!personal.nombres) return <Navigate to="/registro/datos" replace />

  const errors: Record<keyof CompanyData, string | null> = {
    ruc: rucFormat ?? (notFound ? failure.message : null),
    razonSocial: validateCompanyName(values.razonSocial),
    nombreComercial: null,
    ingresoMinimo: validateIncome(values.ingresoMinimo),
  }
  // El RUC completo (11 dígitos) se valida al instante: es el que dispara la consulta
  const show = (key: keyof CompanyData) =>
    touched[key] || (key === 'ruc' && (notFound || values.ruc.length === 11)) ? errors[key] : null

  // Si cambia el RUC ya consultado, los datos de SUNAT dejan de corresponder
  const onRucChange = (raw: string) => {
    const ruc = raw.replace(/\D/g, '').slice(0, 11)
    setAutofilled(false)
    setValues((v) => {
      if (company && ruc === company.ruc) return { ...v, ruc, razonSocial: company.razonSocial, nombreComercial: company.nombreComercial ?? '' }
      if (company && v.ruc === company.ruc) return { ...v, ruc, razonSocial: '', nombreComercial: '' }
      return { ...v, ruc }
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!verified) {
      setTouched((t) => ({ ...t, ruc: true }))
      if (!searching) document.getElementById('company-ruc')?.focus()
      return
    }
    setTouched({ ruc: true, razonSocial: true, nombreComercial: true, ingresoMinimo: true })
    if (focusFirstInvalid<CompanyData>('company', errors)) return
    setSubmitting(true)
    const nombreComercial = values.nombreComercial.trim()
    updateRegistration('company', { ...values, nombreComercial })
    setLookup('sunat', company)
    const firstName = personal.nombres.split(' ')[0]
    const firstSurname = personal.apellidos.split(' ')[0]
    schedule(() => {
      setProfile({
        firstName,
        fullName: `${firstName} ${firstSurname}`,
        initials: `${firstName[0]}${firstSurname[0]}`.toUpperCase(),
        company: nombreComercial || values.razonSocial,
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
      subtitle="Ingresa el RUC y traemos la información de tu empresa desde SUNAT."
      formId="register-company"
      cta={
        submitting ? <ShimmerText>Creando tu cuenta…</ShimmerText> : verified ? 'Crear cuenta' : searching ? 'Consultando…' : 'Consultar RUC'
      }
      ctaIcon={verified ? 'arrow_forward' : 'manage_search'}
      submitting={submitting || searching}
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
          <span>
            DNI {personal.dni} · {personal.email}
          </span>
        </span>
        <IconButton icon="edit" label="Editar datos personales" size="sm" onClick={() => navigate('/registro/datos')} />
      </motion.div>

      <motion.form id="register-company" className={styles.form} onSubmit={onSubmit} noValidate variants={staggerContainer(0.05)}>
        <motion.div variants={fadeUp}>
          <TextField
            id="company-ruc"
            label="RUC de la empresa"
            icon="pin"
            inputMode="numeric"
            autoComplete="off"
            value={values.ruc}
            error={show('ruc')}
            helper={show('ruc') || verified ? undefined : '11 dígitos. Ej.: 20123456786, o tu RUC 10 si eres persona natural'}
            onChange={(event) => onRucChange(event.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, ruc: true }))}
            trailing={<LookupStatus state={lookup} source="SUNAT" />}
          />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {verified ? (
            <motion.div key="filled" className={styles.form} variants={staggerContainer(0.05)} initial="hidden" animate="show" exit={fadeSwap.exit}>
              <motion.div variants={fadeUp}>
                <CompanyProfile company={company} />
              </motion.div>
              <motion.p className={styles.sectionLabel} variants={fadeUp}>
                Completado con SUNAT
              </motion.p>
              <motion.div variants={fadeUp}>
                <TextField
                  id="company-razonSocial"
                  label="Razón social"
                  icon="domain"
                  locked
                  autofilled={autofilled}
                  value={values.razonSocial}
                  error={show('razonSocial')}
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <TextField
                  id="company-nombreComercial"
                  label="Nombre comercial (opcional)"
                  icon="storefront"
                  autoComplete="organization"
                  maxLength={80}
                  autofilled={autofilled && values.nombreComercial !== ''}
                  value={values.nombreComercial}
                  helper="Así verás a tu empresa en Zenity"
                  onChange={(event) => setValues((v) => ({ ...v, nombreComercial: event.target.value }))}
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
            </motion.div>
          ) : searching ? (
            <motion.div key="loading" {...fadeSwap}>
              <LookupSkeleton variant="company" />
            </motion.div>
          ) : (
            <motion.div key="hint" {...fadeSwap}>
              <LookupHint>
                Con el RUC traemos desde SUNAT la <strong>razón social, estado, domicilio fiscal y actividad económica</strong> de tu
                empresa, entre otros datos.
              </LookupHint>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p className={styles.legal} variants={fadeUp}>
          Al crear tu cuenta aceptas los Términos y la Política de privacidad (demo). La consulta a SUNAT es simulada.
        </motion.p>
      </motion.form>
    </RegisterLayout>
  )
}
