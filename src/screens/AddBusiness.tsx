import { AnimatePresence, motion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { BusinessAvatar } from '../components/Business'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { RegimenPicker } from '../components/RegimenPicker'
import { CompanyProfile, LookupHint, LookupSkeleton, LookupStatus } from '../components/Registry'
import { TextField } from '../components/TextField'
import { TopBar } from '../components/TopBar'
import { businessName } from '../data/businesses'
import type { Regimen } from '../data/sire'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useFocusOnEnter } from '../lib/useFocusOnEnter'
import { useRucLookup } from '../lib/useRucLookup'
import { useSwitchBusiness } from '../lib/useSwitchBusiness'
import { useApp } from '../state/context'
import styles from './AddBusiness.module.css'
// Mismo lenguaje visual que el paso 2 del registro
import form from './Register.module.css'

const fadeSwap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

/** Agrega otro negocio (RUC) consultando SUNAT. Queda activo y sin cuentas. */
export function AddBusiness() {
  const navigate = useNavigate()
  const { businesses, addBusiness, toast } = useApp()
  const switchTo = useSwitchBusiness()
  const [ruc, setRuc] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [touched, setTouched] = useState(false)
  const [autofilled, setAutofilled] = useState(false)
  const [regimen, setRegimen] = useState<Regimen | ''>('')
  const [regimenTouched, setRegimenTouched] = useState(false)
  const existing = businesses.find((b) => b.ruc === ruc)
  const lookup = useRucLookup(ruc, {
    blocked: existing ? `Este RUC ya está en tus negocios como ${businessName(existing)}` : null,
    onFound: (found) => {
      setNombreComercial(found.nombreComercial ?? '')
      setAutofilled(true)
    },
  })
  const { company, verified, searching } = lookup
  // El RUC completo se valida al instante: es el que dispara la consulta
  const error = touched || ruc.length === 11 ? lookup.error : null

  useFocusOnEnter('business-ruc', true)

  const onRucChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 11)
    setAutofilled(false)
    setRuc(next)
    if (company && next === company.ruc) setNombreComercial(company.nombreComercial ?? '')
    else if (company && ruc === company.ruc) setNombreComercial('')
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!verified || !company) {
      setTouched(true)
      if (!searching) document.getElementById('business-ruc')?.focus()
      return
    }
    if (!regimen) {
      setRegimenTouched(true)
      document.getElementById('business-regimen')?.focus()
      return
    }
    const created = addBusiness(company, nombreComercial, regimen)
    window.scrollTo({ top: 0, behavior: 'instant' })
    toast(`Agregaste ${businessName(created)}. Conecta su primera cuenta`, 'add_business')
    navigate('/inicio', { replace: true })
  }

  return (
    <div className="z-page">
      <TopBar title="Nuevo negocio" backTo="/inicio" />
      <motion.div className={form.content} variants={staggerContainer(0.06, 0.05)} initial="hidden" animate="show">
        <motion.header className={form.header} variants={fadeUp}>
          <span className={form.headerIcon}>
            <Icon name="add_business" size={28} />
          </span>
          <h1 className={form.title}>Agrega otro RUC</h1>
          <p className={form.subtitle}>
            Cada negocio tiene sus propias cuentas, movimientos y reportes. Cambias de uno a otro desde el inicio.
          </p>
        </motion.header>

        <motion.div className={styles.current} variants={fadeUp}>
          <span className={styles.stack} aria-hidden>
            {businesses.slice(0, 4).map((b) => (
              <BusinessAvatar key={b.id} business={b} size={28} className={styles.stacked} />
            ))}
          </span>
          <span>
            Ya tienes {businesses.length} {businesses.length === 1 ? 'negocio' : 'negocios'}:{' '}
            {businesses.map((b) => businessName(b)).join(', ')}
          </span>
        </motion.div>

        <motion.form id="add-business" className={form.form} onSubmit={onSubmit} noValidate variants={staggerContainer(0.05)}>
          <motion.div variants={fadeUp}>
            <TextField
              id="business-ruc"
              label="RUC del negocio"
              icon="pin"
              inputMode="numeric"
              autoComplete="off"
              value={ruc}
              error={error}
              helper={error || verified ? undefined : '11 dígitos: empresa (20…) o persona natural con negocio (10…)'}
              onChange={(event) => onRucChange(event.target.value)}
              onBlur={() => setTouched(true)}
              trailing={<LookupStatus state={lookup.state} source="SUNAT" />}
            />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {existing ? (
              <motion.div key="existing" {...fadeSwap}>
                <Button
                  variant="tonal"
                  fullWidth
                  icon={<BusinessAvatar business={existing} size={24} />}
                  trailingIcon="arrow_forward"
                  onClick={() => {
                    switchTo(existing)
                    navigate('/inicio', { replace: true })
                  }}
                >
                  Ir a {businessName(existing)}
                </Button>
              </motion.div>
            ) : verified && company ? (
              <motion.div key="filled" className={form.form} variants={staggerContainer(0.05)} initial="hidden" animate="show" exit={fadeSwap.exit}>
                <motion.div variants={fadeUp}>
                  <CompanyProfile company={company} />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <TextField
                    id="business-nombre"
                    label="Nombre comercial (opcional)"
                    icon="storefront"
                    autoComplete="organization"
                    maxLength={80}
                    autofilled={autofilled && nombreComercial !== ''}
                    value={nombreComercial}
                    helper="Así lo verás en el selector de negocios"
                    onChange={(event) => setNombreComercial(event.target.value)}
                  />
                </motion.div>
                <motion.p className={form.sectionLabel} variants={fadeUp}>
                  Régimen tributario
                </motion.p>
                <motion.div variants={fadeUp}>
                  <RegimenPicker
                    id="business-regimen"
                    value={regimen}
                    error={regimenTouched && !regimen ? 'Elige el régimen tributario del negocio' : null}
                    onChange={setRegimen}
                  />
                </motion.div>
              </motion.div>
            ) : searching ? (
              <motion.div key="loading" {...fadeSwap}>
                <LookupSkeleton variant="company" />
              </motion.div>
            ) : (
              <motion.div key="hint" {...fadeSwap}>
                <LookupHint>
                  Con el RUC traemos desde SUNAT la <strong>razón social, estado y domicilio fiscal</strong>. El nuevo negocio
                  empieza sin cuentas: luego conectas las suyas.
                </LookupHint>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p className={form.legal} variants={fadeUp}>
            Prototipo de demostración: la consulta a SUNAT es simulada.
          </motion.p>
        </motion.form>
      </motion.div>

      <div className="z-action-bar">
        <div className={`z-stack ${form.actions}`} style={{ width: '100%' }}>
          <Button
            type="submit"
            form="add-business"
            size="lg"
            fullWidth
            loading={searching}
            disabled={Boolean(existing)}
            trailingIcon={verified ? 'arrow_forward' : 'manage_search'}
          >
            {verified ? 'Agregar negocio' : searching ? 'Consultando…' : 'Consultar RUC'}
          </Button>
        </div>
      </div>
    </div>
  )
}
