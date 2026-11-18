import { motion } from 'motion/react'
import { type ReactNode, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Expediente, ScoreGauge } from '../components/zen/Expediente'
import { PortalShell } from '../components/zen/PortalShell'
import { Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { CREDITO, FUENTES_EXPEDIENTE, SEGMENTO_LABEL } from '../config/credit'
import { BANCO_DEMO, HOY } from '../config/demo'
import { EXPEDIENTES_EJEMPLO, SEED_IDS } from '../data/seed'
import { proyectarCaja } from '../domain/cashflow'
import { cuotaAceptada, cuotaMensual, montoOfrecido, perfilCrediticio, senalesTempranas } from '../domain/credit'
import { fmtFecha, fmtSolesCorto } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { analysisFor, consentimientoActivo, type EstadoSolicitud, responderSolicitud, useDemoState } from '../state/demoStore'

const ESTADO: Record<EstadoSolicitud | 'SIN', { label: string; tone: 'alta' | 'info' | 'media' | 'baja' | 'neutral' }> = {
  ENVIADA: { label: 'Nueva solicitud', tone: 'info' },
  MAS_INFO: { label: 'Esperando información', tone: 'media' },
  PRE_APROBADA: { label: 'Pre-aprobada', tone: 'alta' },
  NO_POR_AHORA: { label: 'No por ahora', tone: 'baja' },
  ACEPTADA: { label: 'Desembolsada', tone: 'alta' },
  SIN: { label: 'Perfil compartido', tone: 'neutral' },
}

function Shell({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <PortalShell portal="BCP · Expedientes Zenity" home="/bcp" usuario={BANCO_DEMO} title={title}>
      {children}
    </PortalShell>
  )
}

interface Fila {
  id: string
  negocio: string
  ruc: string
  rubro: string
  score: number
  segmento: keyof typeof SEGMENTO_LABEL
  ventasMes: number
  monto: number
  plazo: number
  senales: string[]
  estado: EstadoSolicitud | 'SIN'
  demo: boolean
}

/** Vista del banco: los expedientes que los clientes Zenity autorizaron compartir (F3). */
export function Bcp() {
  const demo = useDemoState()
  const filas = useMemo<Fila[]>(() => {
    const propias: Fila[] = []
    for (const id of SEED_IDS) {
      const c = demo.credito[id]
      if (!consentimientoActivo(c)) continue
      const a = analysisFor(id, demo)!
      const p = perfilCrediticio(a, HOY, demo.promesas, cuotaAceptada(c?.solicitud))
      const caja = proyectarCaja(a, demo.promesas, HOY, 60)
      propias.push({
        id,
        negocio: a.business.nombreComercial,
        ruc: a.business.ruc,
        rubro: a.business.rubro,
        score: p.score,
        segmento: p.segmento,
        ventasMes: p.ventasMes,
        monto: c?.solicitud?.respuesta?.monto ?? c?.solicitud?.monto ?? p.montoSugerido,
        plazo: c?.solicitud?.respuesta?.plazo ?? c?.solicitud?.plazo ?? p.plazoSugerido,
        senales: senalesTempranas(p, caja.alerta?.fecha ?? null),
        estado: c?.solicitud?.estado ?? 'SIN',
        demo: true,
      })
    }
    const ejemplo: Fila[] = EXPEDIENTES_EJEMPLO.map((e) => ({ ...e, monto: e.montoSugerido, demo: false }))
    return [...propias, ...ejemplo]
  }, [demo])

  const preaprobados = filas.filter((f) => f.estado === 'PRE_APROBADA' || f.estado === 'ACEPTADA')
  const kpis = [
    { label: 'Expedientes recibidos', valor: String(filas.length) },
    { label: 'Pre-aprobados', valor: String(preaprobados.length) },
    { label: 'Monto pre-aprobado', valor: fmtSolesCorto(preaprobados.reduce((s, f) => s + f.monto, 0)) },
    { label: 'Puntaje promedio', valor: String(Math.round(filas.reduce((s, f) => s + f.score, 0) / filas.length)) },
  ]

  return (
    <Shell title="Expedientes de clientes Zenity">
      <motion.div className={styles.page} style={{ padding: 0 }} variants={staggerContainer(0.04)} initial="hidden" animate="show">
        <motion.p className={styles.banner} variants={fadeUp}>
          <Icon name="verified" size={20} />
          <span>
            Cada expediente llega con el consentimiento del cliente: ventas SUNAT, flujo BCP y cobros digitales ya conciliados por Zenity. Puntajes y montos con
            reglas de ejemplo; la política de crédito la define el BCP.
          </span>
        </motion.p>

        <motion.div className={styles.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }} variants={fadeUp}>
          {kpis.map((k) => (
            <div key={k.label} className={styles.stat}>
              <span className={styles.statLabel}>{k.label}</span>
              <span className={styles.statValue}>{k.valor}</span>
            </div>
          ))}
        </motion.div>

        {!filas.some((f) => f.demo) && (
          <motion.p className={styles.bannerWarn} variants={fadeUp}>
            <Icon name="info" size={20} />
            <span>Ferretería San Martín y Bodega Doña Rosa aparecen aquí cuando su dueña autoriza compartir el expediente desde «Crédito BCP».</span>
          </motion.p>
        )}

        <motion.div className={styles.tableWrap} variants={fadeUp}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Rubro</th>
                <th className={styles.num}>Puntaje</th>
                <th className={styles.num}>Ventas/mes</th>
                <th className={styles.num}>Monto</th>
                <th>Señales tempranas</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className={styles.wrapCell}>
                    {f.negocio}
                    <br />
                    <span className={styles.muted}>RUC {f.ruc}</span> {f.demo && <Pill tone="info">Demo</Pill>}
                  </td>
                  <td>{f.rubro}</td>
                  <td className={styles.num}>
                    {f.score} <span className={styles.muted}>· {f.segmento}</span>
                  </td>
                  <td className={styles.num}>{fmtSolesCorto(Math.round(f.ventasMes))}</td>
                  <td className={styles.num}>{f.monto ? `${fmtSolesCorto(f.monto)} · ${f.plazo} m` : '—'}</td>
                  <td>
                    <span className={styles.actions} style={{ gap: 4 }}>
                      {f.senales.length ? f.senales.map((s) => <Pill key={s} tone="media">{s}</Pill>) : <span className={styles.muted}>—</span>}
                    </span>
                  </td>
                  <td>
                    <Pill tone={ESTADO[f.estado].tone}>{ESTADO[f.estado].label}</Pill>
                  </td>
                  <td>
                    <Button size="sm" variant="text" trailingIcon="chevron_right" to={`/bcp/${f.id}`}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <p className={styles.muted}>Señales tempranas: adelanto de F4 (caída de ventas, caja corta, facturas vencidas o cobros sin comprobante).</p>
      </motion.div>
    </Shell>
  )
}

/** Expediente de un cliente y la decisión del banco. */
export function BcpExpediente() {
  const { id = '' } = useParams()
  const { toast } = useApp()
  const demo = useDemoState()
  const a = analysisFor(id, demo)
  const credito = demo.credito[id]
  const consentimiento = consentimientoActivo(credito)
  const perfil = useMemo(() => (a ? perfilCrediticio(a, HOY, demo.promesas, cuotaAceptada(credito?.solicitud)) : null), [a, demo.promesas, credito?.solicitud])
  const solicitud = credito?.solicitud
  const [monto, setMonto] = useState<string>('')
  const [plazo, setPlazo] = useState<number | null>(null)
  const [nota, setNota] = useState('')
  const ejemplo = EXPEDIENTES_EJEMPLO.find((e) => e.id === id)

  if (!a || !perfil || !consentimiento) {
    return (
      <Shell title={ejemplo?.negocio ?? 'Expediente'}>
        <div className={styles.card}>
          {ejemplo ? (
            <>
              <div style={{ justifySelf: 'center' }}>
                <ScoreGauge score={ejemplo.score} segmento={ejemplo.segmento} label={SEGMENTO_LABEL[ejemplo.segmento]} />
              </div>
              <p className={styles.small}>
                {ejemplo.rubro} · ventas de {fmtSolesCorto(ejemplo.ventasMes)} al mes · {ejemplo.montoSugerido ? `sugerido ${fmtSolesCorto(ejemplo.montoSugerido)} a ${ejemplo.plazo} meses` : 'sin monto sugerido'}
              </p>
              <p className={styles.muted}>Expediente de ejemplo con datos resumidos. Ferretería San Martín y Bodega Doña Rosa tienen el expediente completo.</p>
            </>
          ) : (
            <p className={styles.small}>
              <Icon name="lock" size={18} /> Este cliente no comparte su expediente con el BCP, o dejó de compartirlo.
            </p>
          )}
          <Button variant="tonal" icon="arrow_back" to="/bcp">
            Volver a los expedientes
          </Button>
        </div>
      </Shell>
    )
  }

  const caja = proyectarCaja(a, demo.promesas, HOY, 60)
  const senales = senalesTempranas(perfil, caja.alerta?.fecha ?? null)
  const plazoElegido = plazo ?? solicitud?.plazo ?? perfil.plazoSugerido
  const tope = montoOfrecido(perfil, plazoElegido)
  const montoElegido = monto ? Number(monto.replace(/[^\d]/g, '')) : Math.min(solicitud?.monto ?? perfil.montoSugerido, tope || Infinity)
  const decidir = (estado: 'PRE_APROBADA' | 'MAS_INFO' | 'NO_POR_AHORA') => {
    const textos = {
      PRE_APROBADA: nota.trim() || 'Firmas el contrato desde la app y el desembolso llega a tu cuenta BCP.',
      MAS_INFO: nota.trim() || '¿Nos cuentas para qué usarás el crédito y si tus ventas de diciembre serán como las del año pasado?',
      NO_POR_AHORA: nota.trim() || 'Hoy tu flujo no alcanza para la cuota. Vuelve a pedirlo cuando cobres tus facturas vencidas.',
    }
    responderSolicitud(id, estado, { monto: estado === 'PRE_APROBADA' ? montoElegido : undefined, plazo: estado === 'PRE_APROBADA' ? plazoElegido : undefined, nota: textos[estado] })
    setNota('')
    toast(estado === 'PRE_APROBADA' ? 'Crédito pre-aprobado: el cliente lo ve en su app' : estado === 'MAS_INFO' ? 'Pedido de información enviado' : 'Respuesta enviada', 'send')
  }

  return (
    <Shell
      title={
        <div style={{ display: 'grid', gap: 4, paddingTop: 12 }}>
          <div>
            <Button size="sm" variant="text" icon="arrow_back" to="/bcp">
              Expedientes
            </Button>
          </div>
          <h1 className="t-headline-s">{a.business.nombreComercial}</h1>
          <span className={styles.muted}>
            {a.business.razonSocial} · RUC {a.business.ruc} · {a.business.rubro} · dueña {a.business.dueno.nombres} {a.business.dueno.apellidos}
          </span>
        </div>
      }
    >
      <div className={styles.split}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Expediente perfil={perfil} vista="bcp" />
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className={styles.card}>
            <SectionHead title="Solicitud" action={<Pill tone={ESTADO[solicitud?.estado ?? 'SIN'].tone}>{ESTADO[solicitud?.estado ?? 'SIN'].label}</Pill>} />
            {solicitud ? (
              <p className={styles.small}>
                Pide {fmtSolesCorto(solicitud.monto)} a {solicitud.plazo} meses (cuota de {fmtSolesCorto(Math.round(cuotaMensual(solicitud.monto, solicitud.tea, solicitud.plazo)))}).
                Enviada el {fmtFecha(solicitud.enviada)}.
              </p>
            ) : (
              <p className={styles.small}>Compartió su perfil, pero todavía no envió una solicitud.</p>
            )}
            {solicitud?.infoDueno && (
              <p className={styles.msg}>
                <span className={styles.muted}>Respuesta de la clienta</span>
                {solicitud.infoDueno}
              </p>
            )}
            {solicitud?.respuesta && solicitud.estado !== 'ENVIADA' && (
              <p className={styles.muted}>
                Respuesta del banco: {solicitud.respuesta.nota}
                {solicitud.respuesta.monto ? ` (${fmtSolesCorto(solicitud.respuesta.monto)} a ${solicitud.respuesta.plazo} meses)` : ''}
              </p>
            )}
          </section>

          {solicitud && (solicitud.estado === 'ENVIADA' || solicitud.estado === 'MAS_INFO') && (
            <section className={styles.card}>
              <span className="t-title-m">Decisión</span>
              <div className={styles.grid2}>
                <label className={styles.field}>
                  Monto (S/)
                  <input className={styles.input} inputMode="numeric" value={monto || String(montoElegido)} onChange={(e) => setMonto(e.target.value)} />
                </label>
                <label className={styles.field}>
                  Plazo
                  <select className={styles.select} style={{ height: 44 }} value={plazoElegido} onChange={(e) => setPlazo(Number(e.target.value))}>
                    {CREDITO.plazos.map((p) => (
                      <option key={p} value={p}>
                        {p} meses
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={styles.muted}>
                Con su flujo, la cuota sugerida no pasa de {fmtSolesCorto(Math.round(perfil.cuotaMaxima))}: hasta {fmtSolesCorto(tope)} a {plazoElegido} meses.
                {montoElegido > tope && ' El monto elegido supera esa capacidad.'}
              </p>
              <label className={styles.field}>
                Nota para la clienta (opcional)
                <textarea className={styles.input} style={{ minHeight: 80 }} value={nota} onChange={(e) => setNota(e.target.value)} />
              </label>
              <div className={styles.actions}>
                <Button icon="check" onClick={() => decidir('PRE_APROBADA')} disabled={!montoElegido}>
                  Pre-aprobar
                </Button>
                <Button variant="tonal" icon="help" onClick={() => decidir('MAS_INFO')}>
                  Pedir información
                </Button>
                <Button variant="text" onClick={() => decidir('NO_POR_AHORA')}>
                  No por ahora
                </Button>
              </div>
            </section>
          )}

          <section className={styles.card}>
            <span className="t-title-m">Señales tempranas</span>
            {senales.length ? (
              <div className={styles.chipsWrap}>
                {senales.map((s) => (
                  <Pill key={s} tone="media">
                    {s}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className={styles.small}>Sin señales de riesgo en los últimos meses.</p>
            )}
            <p className={styles.muted}>Adelanto de F4: el banco las ve antes de que aparezca la mora, siempre con el consentimiento del cliente.</p>
          </section>

          <section className={styles.card}>
            <span className="t-title-m">Consentimiento</span>
            <p className={styles.small}>
              Comparte {consentimiento.fuentes.map((f) => FUENTES_EXPEDIENTE.find((x) => x.id === f)!.nombre.toLowerCase()).join(', ')} desde el{' '}
              {fmtFecha(consentimiento.otorgado)} hasta el {fmtFecha(consentimiento.vence)}, solo para evaluar crédito. Puede revocarlo en cualquier momento.
            </p>
          </section>
        </div>
      </div>
    </Shell>
  )
}
