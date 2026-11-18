import { motion } from 'motion/react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LinkRow, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { CONSENTIMIENTO_DATOS, FUENTES_DATOS, type FuenteDatos } from '../config/legal'
import { businessName } from '../data/businesses'
import { ctsSemestral, gratificacion, REGIMEN_LABORAL_LABEL } from '../domain/calendar'
import type { RegimenLaboral } from '../domain/types'
import { fmtFecha, fmtSolesCorto } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import {
  CONTADOR,
  confirmarPlanilla,
  inicioCompleto,
  omitirInicio,
  otorgarPermisosDatos,
  permisoActivo,
  setMejorarZenity,
  setPermisoDato,
} from '../state/demoStore'
import { useZen } from '../state/useZen'

const REGIMENES: { id: RegimenLaboral; detalle: string }[] = [
  { id: 'MICRO_REMYPE', detalle: 'Sin gratificación ni CTS. Vacaciones de 15 días.' },
  { id: 'PEQUENA_REMYPE', detalle: 'Media gratificación en julio y diciembre, y media CTS.' },
  { id: 'GENERAL', detalle: 'Gratificación completa en julio y diciembre, y CTS de un sueldo al año.' },
]

/** El texto completo de la autorización (borrador para revisión legal). */
function TextoLegal() {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className={styles.card}>
      <button type="button" className={styles.toggleRow} onClick={() => setAbierto(!abierto)} aria-expanded={abierto} style={{ padding: 0 }}>
        <span className="t-title-s">Leer la autorización completa</span>
        <Icon name={abierto ? 'expand_less' : 'expand_more'} size={20} />
      </button>
      {abierto && (
        <div style={{ display: 'grid', gap: 8 }}>
          <Pill tone="media" icon="gavel">
            Borrador para revisión legal · {CONSENTIMIENTO_DATOS.version}
          </Pill>
          <span className="t-title-s">{CONSENTIMIENTO_DATOS.titulo}</span>
          {CONSENTIMIENTO_DATOS.parrafos.map((p) => (
            <p key={p} className={styles.small}>
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function FuenteRow({ id, activo, onChange }: { id: FuenteDatos; activo: boolean; onChange: (v: boolean) => void }) {
  const f = FUENTES_DATOS.find((x) => x.id === id)!
  return (
    <label className={`${styles.row} ${styles.rowWrap}`} style={{ cursor: 'pointer' }}>
      <span className={`${styles.rowIcon} ${activo ? styles.tonePositive : ''}`}>
        <Icon name={f.icono} size={20} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>
          {f.nombre} {f.obligatoria ? '' : <span className={styles.muted}>· opcional</span>}
        </span>
        <span className={styles.rowSub}>{f.detalle}</span>
      </span>
      <input type="checkbox" className={styles.switch} checked={activo} onChange={(e) => onChange(e.target.checked)} aria-label={f.nombre} />
    </label>
  )
}

/**
 * Configuración inicial de un negocio (dos pasos): los permisos para leer sus datos y su planilla
 * (el régimen laboral cambia la gratificación y la CTS de la proyección de caja).
 */
export function Bienvenida() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { business } = useApp()
  const { a, demo, businessId } = useZen()
  const inicio = demo.inicio[businessId]
  const [paso, setPaso] = useState<'permisos' | 'planilla'>(params.get('paso') === 'planilla' || inicio?.permisos ? 'planilla' : 'permisos')
  const [fuentes, setFuentes] = useState<Record<FuenteDatos, boolean>>({ BCP: true, SIRE: true, DIGITAL: true })
  const [mejorar, setMejorar] = useState(false)
  const [regimen, setRegimen] = useState<RegimenLaboral | null>(a?.business.regimenLaboral ?? null)
  const [trabajadores, setTrabajadores] = useState(a?.business.trabajadores ?? 0)
  const [sueldo, setSueldo] = useState(String(a?.business.sueldoPromedio || ''))

  // Un negocio sin datos de la demo, o ya configurado (sin pedir un paso): directo al inicio
  if (!a || (inicioCompleto(demo, businessId) && !params.get('paso'))) return <Navigate to="/inicio" replace />

  const faltaObligatoria = FUENTES_DATOS.some((f) => f.obligatoria && !fuentes[f.id])
  const sueldoNum = Number(sueldo.replace(/[^\d.]/g, '')) || 0
  const r = regimen ?? 'MICRO_REMYPE'
  const grati = gratificacion(r, trabajadores, sueldoNum)
  const cts = ctsSemestral(r, trabajadores, sueldoNum)
  const volver = params.get('paso') === 'planilla' && inicio?.planilla

  const aceptar = () => {
    otorgarPermisosDatos(businessId, FUENTES_DATOS.filter((f) => fuentes[f.id]).map((f) => f.id), mejorar)
    setPaso('planilla')
    window.scrollTo({ top: 0 })
  }
  const guardarPlanilla = () => {
    if (!regimen) return
    const b = a.business
    confirmarPlanilla(businessId, { regimenLaboral: regimen, trabajadores, sueldoPromedio: sueldoNum }, regimen !== b.regimenLaboral || trabajadores !== b.trabajadores || sueldoNum !== b.sueldoPromedio)
    if (volver) navigate(-1)
    else navigate('/inicio', { replace: true })
  }
  const ahoraNo = () => {
    omitirInicio(businessId)
    navigate('/inicio', { replace: true })
  }

  return (
    <div className="z-page">
      <TopBar title={paso === 'permisos' ? 'Antes de empezar' : 'Tu planilla'} subtitle={businessName(business)} hideBack={!volver} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show" key={paso}>
        {!volver && (
          <motion.div variants={fadeUp} className={styles.actions}>
            <Pill tone={paso === 'permisos' ? 'info' : 'alta'} icon={paso === 'permisos' ? 'lock' : 'check'}>
              1 · Tus datos
            </Pill>
            <Pill tone={paso === 'planilla' ? 'info' : 'neutral'} icon="groups">
              2 · Tu planilla
            </Pill>
          </motion.div>
        )}

        {paso === 'permisos' ? (
          <>
            <motion.section className={styles.hero} variants={fadeUp}>
              <span className={styles.heroLabel}>Paso 1 de 2</span>
              <span className="t-title-l">Zenity lee tus datos solo con tu permiso</span>
              <span className={styles.heroMeta}>Solo lectura: no movemos tu dinero ni declaramos por ti. Puedes revocar cada permiso cuando quieras.</span>
            </motion.section>
            <motion.div className={styles.list} variants={fadeUp}>
              {FUENTES_DATOS.map((f) => (
                <FuenteRow key={f.id} id={f.id} activo={fuentes[f.id]} onChange={(v) => setFuentes({ ...fuentes, [f.id]: v })} />
              ))}
              <label className={`${styles.row} ${styles.rowWrap}`} style={{ cursor: 'pointer' }}>
                <span className={`${styles.rowIcon} ${mejorar ? styles.toneViolet : ''}`}>
                  <Icon name="database" size={20} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>
                    Ayudar a mejorar Zenity <span className={styles.muted}>· opcional</span>
                  </span>
                  <span className={styles.rowSub}>Usamos tus correcciones de categoría, sin tu nombre, RUC ni montos, para categorizar mejor a tu rubro.</span>
                </span>
                <input type="checkbox" className={styles.switch} checked={mejorar} onChange={(e) => setMejorar(e.target.checked)} aria-label="Ayudar a mejorar Zenity" />
              </label>
            </motion.div>
            <motion.div variants={fadeUp}>
              <TextoLegal />
            </motion.div>
            <motion.p className={styles.muted} variants={fadeUp}>
              Tu contador ({CONTADOR.nombre}) solo ve tus movimientos si se lo permites en «Mi contador», y el BCP solo ve tu perfil si lo autorizas en «Crédito BCP».
            </motion.p>
            {faltaObligatoria && (
              <motion.p className={styles.bannerWarn} variants={fadeUp}>
                <Icon name="info" size={20} />
                <span>Sin tu cuenta BCP y SUNAT, Zenity no puede conciliar ni proyectar tu caja.</span>
              </motion.p>
            )}
            <motion.div variants={fadeUp} style={{ display: 'grid', gap: 8 }}>
              <Button size="lg" icon="check" disabled={faltaObligatoria} onClick={aceptar}>
                Acepto y continúo
              </Button>
              <Button size="lg" variant="text" onClick={ahoraNo}>
                Ahora no
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.section className={styles.hero} variants={fadeUp}>
              <span className={styles.heroLabel}>{volver ? 'Ajustes' : 'Paso 2 de 2'}</span>
              <span className="t-title-l">¿Cómo está inscrita tu planilla?</span>
              <span className={styles.heroMeta}>Cambia la gratificación de julio y diciembre, y la CTS de mayo y noviembre en tu proyección de caja.</span>
            </motion.section>
            <motion.div className={styles.list} variants={fadeUp} role="radiogroup" aria-label="Régimen laboral">
              {REGIMENES.map((x) => (
                <label key={x.id} className={`${styles.row} ${styles.rowWrap}`} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="regimen" checked={regimen === x.id} onChange={() => setRegimen(x.id)} style={{ width: 20, height: 20, accentColor: 'var(--z-primary)' }} />
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{REGIMEN_LABORAL_LABEL[x.id]}</span>
                    <span className={styles.rowSub}>{x.detalle}</span>
                  </span>
                </label>
              ))}
            </motion.div>
            <motion.div className={styles.grid2} variants={fadeUp}>
              <div className={styles.field}>
                Trabajadores en planilla
                <div className={styles.actions} style={{ alignItems: 'center' }}>
                  <Button size="sm" variant="tonal" icon="remove" aria-label="Uno menos" onClick={() => setTrabajadores(Math.max(0, trabajadores - 1))} />
                  <span className="t-title-m" aria-live="polite" style={{ minWidth: 24, textAlign: 'center' }}>
                    {trabajadores}
                  </span>
                  <Button size="sm" variant="tonal" icon="add" aria-label="Uno más" onClick={() => setTrabajadores(trabajadores + 1)} />
                </div>
              </div>
              <label className={styles.field}>
                Sueldo promedio (S/)
                <input className={styles.input} inputMode="decimal" value={sueldo} disabled={trabajadores === 0} onChange={(e) => setSueldo(e.target.value)} />
              </label>
            </motion.div>
            {regimen && trabajadores > 0 && sueldoNum > 0 && (
              <motion.p className={styles.banner} variants={fadeUp}>
                <Icon name="event" size={20} />
                <span>
                  Gratificación de diciembre: <strong>{fmtSolesCorto(grati)}</strong>
                  {grati === 0 && ' (no corresponde)'} · CTS de mayo: <strong>{fmtSolesCorto(cts)}</strong>
                  {cts === 0 && ' (no corresponde)'}.
                </span>
              </motion.p>
            )}
            <motion.div variants={fadeUp} style={{ display: 'grid', gap: 8 }}>
              <Button size="lg" icon="check" disabled={!regimen || (trabajadores > 0 && !sueldoNum)} onClick={guardarPlanilla}>
                {volver ? 'Guardar' : 'Guardar y ver mi negocio'}
              </Button>
              {!volver && (
                <Button size="lg" variant="text" onClick={ahoraNo}>
                  Ahora no
                </Button>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  )
}

/** Más → Permisos de datos: qué lee Zenity de cada fuente, con revocación por fuente. */
export function PermisosDatos() {
  const { business, toast } = useApp()
  const { a, demo, businessId } = useZen()
  const d = demo.datos[businessId]
  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Permisos de datos" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="Los permisos de datos" />
        </div>
      </div>
    )
  }
  const permiso = (id: FuenteDatos) => d?.fuentes[id]
  return (
    <div className="z-page">
      <TopBar title="Permisos de datos" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        {!d && (
          <motion.p className={styles.bannerWarn} variants={fadeUp}>
            <Icon name="lock_open" size={20} />
            <span>
              Todavía no aceptas la autorización de datos. <Button size="sm" variant="text" to="/bienvenida">Revisar ahora</Button>
            </span>
          </motion.p>
        )}
        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Qué lee Zenity" hint="Solo lectura" />
          <div className={styles.list}>
            {FUENTES_DATOS.map((f) => {
              const p = permiso(f.id)
              const activo = permisoActivo(d, f.id)
              return (
                <div key={f.id} className={`${styles.row} ${styles.rowWrap}`}>
                  <span className={`${styles.rowIcon} ${activo ? styles.tonePositive : styles.toneWarning}`}>
                    <Icon name={f.icono} size={20} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{f.nombre}</span>
                    <span className={styles.rowSub}>
                      {activo ? `Autorizado el ${fmtFecha(p!.otorgado)}` : p?.revocado ? `Revocado el ${fmtFecha(p.revocado)}: Zenity dejó de leer esta fuente` : 'Sin autorizar'}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className={styles.switch}
                    checked={activo}
                    aria-label={f.nombre}
                    onChange={(e) => {
                      setPermisoDato(businessId, f.id, e.target.checked)
                      toast(e.target.checked ? `Zenity vuelve a leer ${f.nombre}` : `Revocaste el permiso de ${f.nombre}`, e.target.checked ? 'lock' : 'lock_open')
                    }}
                  />
                </div>
              )
            })}
            <div className={`${styles.row} ${styles.rowWrap}`}>
              <span className={`${styles.rowIcon} ${d?.mejorarZenity ? styles.toneViolet : ''}`}>
                <Icon name="database" size={20} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Ayudar a mejorar Zenity</span>
                <span className={styles.rowSub}>Tus correcciones, sin nombre, RUC ni montos, entrenan la categorización de tu rubro.</span>
              </span>
              <input
                type="checkbox"
                className={styles.switch}
                checked={!!d?.mejorarZenity}
                aria-label="Ayudar a mejorar Zenity"
                onChange={(e) => setMejorarZenity(businessId, e.target.checked)}
              />
            </div>
          </div>
          {FUENTES_DATOS.some((f) => f.obligatoria && d?.fuentes[f.id]?.revocado) && (
            <p className={styles.bannerWarn}>
              <Icon name="info" size={20} />
              <span>Con un permiso revocado, lo que ves es la última lectura: la conciliación y la caja no se actualizan con esa fuente.</span>
            </p>
          )}
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Quién más ve tus datos" />
          <div className={styles.list}>
            <LinkRow tone="info" to="/mi-contador" icon="support_agent" title={`Tu contador · ${CONTADOR.nombre}`} sub="Ve tus movimientos solo si se lo permites" />
            <LinkRow tone="positive" to="/credito" icon="credit_score" title="BCP" sub="Solo tu perfil de crédito, y solo si lo autorizas" />
          </div>
        </motion.section>

        <motion.div variants={fadeUp}>
          <TextoLegal />
        </motion.div>
      </motion.div>
    </div>
  )
}
