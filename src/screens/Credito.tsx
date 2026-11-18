import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Expediente } from '../components/zen/Expediente'
import { LessonCard, Money, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { CREDITO, type FuenteExpediente, FUENTES_EXPEDIENTE } from '../config/credit'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { proyectarCaja } from '../domain/cashflow'
import { cuotaMensual, eventosCredito, interesesTotales, montoOfrecido } from '../domain/credit'
import { addDays, fmtDiaMes, fmtFecha, fmtSolesCorto } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import {
  aceptarCredito,
  consentimientoActivo,
  enviarInformacion,
  enviarSolicitud,
  marcarCreditoVisto,
  otorgarConsentimiento,
  revocarConsentimiento,
  setPersona,
} from '../state/demoStore'
import { useCuotasCredito, usePerfilCrediticio, useZen } from '../state/useZen'

const ESTADO_LABEL = {
  ENVIADA: 'En evaluación del BCP',
  PRE_APROBADA: 'Pre-aprobado',
  MAS_INFO: 'El BCP pide información',
  NO_POR_AHORA: 'No por ahora',
  ACEPTADA: 'Desembolsado',
} as const

/** F3 · Perfil crediticio con flujo real (lado del dueño). */
export function Credito() {
  const navigate = useNavigate()
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const perfil = usePerfilCrediticio()
  const cuotasActuales = useCuotasCredito()
  const [plazo, setPlazo] = useState<number>(CREDITO.plazoSugerido)
  const [monto, setMonto] = useState<number | null>(null)
  const [consentir, setConsentir] = useState(false)
  const [fuentes, setFuentes] = useState<FuenteExpediente[]>(['SIRE', 'BCP', 'DIGITAL'])
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (a && perfil) marcarCreditoVisto(a.business.id, perfil.segmento)
  }, [a, perfil])

  const maximo = perfil ? montoOfrecido(perfil, plazo) : 0
  const elegido = Math.min(monto ?? maximo, maximo)
  // Efecto en la caja: la proyección de 60 días sin y con este crédito
  const efecto = useMemo(() => {
    if (!a || elegido <= 0) return null
    const sin = proyectarCaja(a, demo.promesas, HOY, 60, cuotasActuales)
    const con = proyectarCaja(a, demo.promesas, HOY, 60, [...cuotasActuales, ...eventosCredito(elegido, plazo, CREDITO.teaReferencial, addDays(HOY, 2))])
    return { sin, con }
  }, [a, demo.promesas, cuotasActuales, elegido, plazo])

  if (!a || !perfil) {
    return (
      <div className="z-page">
        <TopBar title="Crédito BCP" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="El perfil de crédito" />
        </div>
      </div>
    )
  }

  const id = a.business.id
  const credito = demo.credito[id]
  const consentimiento = consentimientoActivo(credito)
  const solicitud = credito?.solicitud
  const cuota = elegido > 0 ? cuotaMensual(elegido, CREDITO.teaReferencial, plazo) : 0
  const abierta = solicitud && solicitud.estado !== 'NO_POR_AHORA'

  const enviar = () => {
    if (!consentimiento) {
      setConsentir(true)
      return
    }
    enviarSolicitud(id, elegido, plazo, CREDITO.teaReferencial)
    toast('Expediente enviado al BCP', 'send')
  }

  const autorizarYEnviar = () => {
    otorgarConsentimiento(id, fuentes)
    enviarSolicitud(id, elegido, plazo, CREDITO.teaReferencial)
    setConsentir(false)
    toast('Autorizaste compartir tu expediente y lo enviaste al BCP', 'verified')
  }

  return (
    <div className="z-page">
      <TopBar title="Crédito BCP" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        {solicitud && (
          <motion.section className={styles.card} variants={fadeUp} aria-live="polite">
            <div className={styles.sectionHead} style={{ padding: 0 }}>
              <span className="t-title-m">Tu solicitud</span>
              <Pill tone={solicitud.estado === 'PRE_APROBADA' || solicitud.estado === 'ACEPTADA' ? 'alta' : solicitud.estado === 'NO_POR_AHORA' ? 'baja' : 'info'}>
                {ESTADO_LABEL[solicitud.estado]}
              </Pill>
            </div>
            <p className={styles.small}>
              Pediste {fmtSolesCorto(solicitud.monto)} a {solicitud.plazo} meses el {fmtFecha(solicitud.enviada)}.
            </p>
            {solicitud.estado === 'ENVIADA' && (
              <>
                <p className={styles.muted}>El BCP está revisando tu expediente. Te avisamos aquí y en tus notificaciones.</p>
                <Button
                  size="sm"
                  variant="text"
                  icon="switch_account"
                  onClick={() => {
                    setPersona('BCP')
                    navigate(`/bcp/${id}`)
                  }}
                >
                  Demo: responder como BCP
                </Button>
              </>
            )}
            {solicitud.estado === 'PRE_APROBADA' && solicitud.respuesta && (
              <>
                <p className="t-headline-s">
                  ¡Pre-aprobado! {fmtSolesCorto(solicitud.respuesta.monto ?? solicitud.monto)} a {solicitud.respuesta.plazo ?? solicitud.plazo} meses
                </p>
                <p className={styles.small}>
                  Cuota aproximada de{' '}
                  {fmtSolesCorto(
                    Math.round(cuotaMensual(solicitud.respuesta.monto ?? solicitud.monto, solicitud.tea, solicitud.respuesta.plazo ?? solicitud.plazo)),
                  )}{' '}
                  al mes. {solicitud.respuesta.nota}
                </p>
                <div className={styles.actions}>
                  <Button
                    icon="check"
                    onClick={() => {
                      aceptarCredito(id)
                      toast('Crédito desembolsado en tu cuenta BCP', 'celebration')
                    }}
                  >
                    Aceptar y desembolsar
                  </Button>
                  <Button variant="text" to="/caja">
                    Ver mi caja primero
                  </Button>
                </div>
              </>
            )}
            {solicitud.estado === 'MAS_INFO' && solicitud.respuesta && (
              <>
                <p className={styles.bannerWarn}>
                  <Icon name="info" size={20} />
                  <span>{solicitud.respuesta.nota}</span>
                </p>
                <textarea className={styles.input} style={{ minHeight: 90 }} placeholder="Escribe tu respuesta" value={info} onChange={(e) => setInfo(e.target.value)} />
                <Button
                  icon="send"
                  disabled={!info.trim()}
                  onClick={() => {
                    enviarInformacion(id, info.trim())
                    setInfo('')
                    toast('Información enviada al BCP', 'send')
                  }}
                >
                  Enviar información
                </Button>
              </>
            )}
            {solicitud.estado === 'NO_POR_AHORA' && solicitud.respuesta && (
              <p className={styles.small}>{solicitud.respuesta.nota} Puedes volver a pedirlo cuando mejoren los puntos de tu perfil.</p>
            )}
            {solicitud.estado === 'ACEPTADA' && solicitud.desembolso && (
              <>
                <p className={styles.small}>
                  Desembolsado el {fmtFecha(solicitud.desembolso)}. Pagas {fmtSolesCorto(Math.round(cuotaMensual(solicitud.monto, solicitud.tea, solicitud.plazo)))} al mes
                  desde el {fmtDiaMes(eventosCredito(solicitud.monto, solicitud.plazo, solicitud.tea, solicitud.desembolso)[1].fecha)}: las cuotas ya están en tu caja.
                </p>
                <Button size="sm" variant="tonal" icon="monitoring" to="/caja">
                  Ver mi caja
                </Button>
              </>
            )}
          </motion.section>
        )}

        {!abierta && (
          <motion.section className={styles.hero} variants={fadeUp}>
            {perfil.montoSugerido > 0 ? (
              <>
                <span className={styles.heroLabel}>Según tu flujo real, podrías pedir hasta</span>
                <Money animated value={perfil.montoSugerido} className={styles.heroAmount} />
                <span className={styles.heroMeta}>
                  A {perfil.plazoSugerido} meses, con una cuota de unos {fmtSolesCorto(Math.round(cuotaMensual(perfil.montoSugerido, perfil.tea, perfil.plazoSugerido)))}{' '}
                  al mes. Pre-evaluación con reglas de ejemplo de Zenity: la decisión y la tasa reales son del BCP.
                </span>
              </>
            ) : (
              <>
                <span className={styles.heroLabel}>Hoy tu flujo no alcanza para una cuota</span>
                <span className="t-headline-s">Primero ordena tus gastos y tu cobranza</span>
                <span className={styles.heroMeta}>Los puntos en rojo de tu perfil son los que más suben tu puntaje.</span>
              </>
            )}
          </motion.section>
        )}

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Así ve el banco a tu negocio" />
          <Expediente perfil={perfil} vista="dueno" />
        </motion.section>

        <LessonCard id="L11" />

        {!abierta && maximo > 0 && (
          <motion.section className={styles.card} variants={fadeUp}>
            <span className="t-title-m">Simula tu crédito</span>
            <div className={styles.field}>
              Plazo
              <div className={styles.chipsWrap}>
                {CREDITO.plazos.map((p) => (
                  <Chip key={p} selected={plazo === p} showCheck onClick={() => setPlazo(p)}>
                    {p} meses
                  </Chip>
                ))}
              </div>
            </div>
            <label className={styles.field}>
              Monto: <strong style={{ color: 'var(--z-on-surface)', fontSize: '1.25rem' }}>{fmtSolesCorto(elegido)}</strong>
              <input
                type="range"
                min={CREDITO.montoMinimo}
                max={maximo}
                step={CREDITO.redondeo}
                value={elegido}
                onChange={(e) => setMonto(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--z-primary)' }}
                aria-label="Monto del crédito"
              />
              <span className={styles.muted}>
                De {fmtSolesCorto(CREDITO.montoMinimo)} a {fmtSolesCorto(maximo)} a {plazo} meses
              </span>
            </label>
            <div className={styles.grid2}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Cuota mensual</span>
                <span className={styles.statValue}>{fmtSolesCorto(Math.round(cuota))}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Intereses en total</span>
                <span className={styles.statValue}>{fmtSolesCorto(Math.round(interesesTotales(elegido, CREDITO.teaReferencial, plazo)))}</span>
              </div>
            </div>
            {efecto && (
              <p className={efecto.con.alerta ? styles.bannerWarn : styles.banner}>
                <Icon name="monitoring" size={20} />
                <span>
                  {efecto.sin.alerta
                    ? `Sin crédito, el ${fmtDiaMes(efecto.sin.alerta.fecha)} tu caja baja a ${fmtSolesCorto(Math.round(efecto.sin.alerta.saldo))}. `
                    : `Sin crédito, tu punto más bajo en 60 días es ${fmtSolesCorto(Math.round(efecto.sin.minimo.base))}. `}
                  {efecto.con.alerta
                    ? `Con este crédito igual baja del colchón el ${fmtDiaMes(efecto.con.alerta.fecha)}.`
                    : `Con este crédito, tu caja no baja de ${fmtSolesCorto(Math.round(efecto.con.minimo.base))} en los próximos 60 días.`}
                </span>
              </p>
            )}
            <p className={styles.muted}>TEA referencial de ejemplo: {Math.round(CREDITO.teaReferencial * 100)}%. La tasa real la define el BCP.</p>
            <Button size="lg" icon="send" onClick={enviar}>
              Enviar mi expediente al BCP
            </Button>
          </motion.section>
        )}

        <motion.section className={styles.card} variants={fadeUp}>
          <span className="t-title-m">Tus datos y el BCP</span>
          {consentimiento ? (
            <>
              <p className={styles.small}>
                Compartes con el BCP: {consentimiento.fuentes.map((f) => FUENTES_EXPEDIENTE.find((x) => x.id === f)!.nombre.toLowerCase()).join(', ')}, hasta el{' '}
                {fmtFecha(consentimiento.vence)}. Solo para evaluar tu crédito.
              </p>
              <Button
                variant="text"
                icon="lock"
                onClick={() => {
                  revocarConsentimiento(id)
                  toast('Dejaste de compartir tu expediente con el BCP', 'lock')
                }}
              >
                Dejar de compartir
              </Button>
            </>
          ) : (
            <p className={styles.small}>
              Tu perfil es solo tuyo. El BCP lo ve únicamente si autorizas compartirlo, y puedes dejar de compartirlo cuando quieras.
            </p>
          )}
        </motion.section>
      </motion.div>

      <BottomSheet open={consentir} onClose={() => setConsentir(false)} title="Autoriza compartir tu expediente">
        <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
          <p className={styles.small}>
            Zenity enviará al BCP tu perfil de crédito para que evalúe un préstamo de {fmtSolesCorto(elegido)} a {plazo} meses. Elige qué datos compartir:
          </p>
          {FUENTES_EXPEDIENTE.map((f) => (
            <label key={f.id} className={styles.check}>
              <input
                type="checkbox"
                checked={fuentes.includes(f.id)}
                onChange={(e) => setFuentes(e.target.checked ? [...fuentes, f.id] : fuentes.filter((x) => x !== f.id))}
              />
              <span>
                {f.nombre}
                {f.obligatoria && <span className={styles.muted}> · necesaria para evaluar</span>}
              </span>
            </label>
          ))}
          <p className={styles.muted}>
            Para qué: solo evaluar tu crédito. Hasta cuándo: {fmtFecha(addDays(HOY, CREDITO.vigenciaConsentimientoDias))} ({CREDITO.vigenciaConsentimientoDias} días). Puedes
            revocarlo cuando quieras desde esta pantalla. Texto de ejemplo, a validar por el área legal según la Ley de Protección de Datos Personales (Ley 29733).
          </p>
          <Button size="lg" icon="verified" disabled={FUENTES_EXPEDIENTE.some((f) => f.obligatoria && !fuentes.includes(f.id))} onClick={autorizarYEnviar}>
            Autorizo y envío
          </Button>
          <Button size="lg" variant="text" onClick={() => setConsentir(false)}>
            Ahora no
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
