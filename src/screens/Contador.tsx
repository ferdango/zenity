import { motion } from 'motion/react'
import { type ReactNode, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { InitialsAvatar } from '../components/Avatars'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { Spark } from '../components/Spark'
import { Pill } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { HOY } from '../config/demo'
import { CARTERA_RESUMIDA, SEED_IDS } from '../data/seed'
import { type FilaCartera, filaDesdeAnalisis, semaforo, type Semaforo } from '../domain/accountant'
import { proximoVencimiento } from '../domain/calendar'
import { REGIMEN_NOMBRE } from '../domain/taxSimulator'
import type { RegimenTributario } from '../domain/types'
import { fmtFecha } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { analysisFor, CONTADOR, permisosDe, setPersona, useDemoState } from '../state/demoStore'

const SEMAFORO_LABEL: Record<Semaforo, string> = { VERDE: 'Verde', AMBAR: 'Ámbar', ROJO: 'Rojo' }
const SEMAFORO_CLASS: Record<Semaforo, string> = { VERDE: styles.verde, AMBAR: styles.ambar, ROJO: styles.rojo }
const ORDEN: Record<Semaforo, number> = { ROJO: 0, AMBAR: 1, VERDE: 2 }

/** Encabezado del portal del contador (desktop-first). */
export function ContadorShell({ children, title }: { children: ReactNode; title: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="z-page" style={{ background: 'var(--z-bg)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px var(--z-gutter)',
          background: 'var(--z-surface-glass)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--z-divider)',
        }}
      >
        <Link to="/contador" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <Spark size={24} /> Zenity <span className={styles.muted}>· Portal del contador</span>
        </Link>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.small} style={{ textAlign: 'right' }}>
            {CONTADOR.nombre}
            <br />
            <span className={styles.muted}>{CONTADOR.estudio}</span>
          </span>
          <InitialsAvatar initials={CONTADOR.iniciales} size={36} />
          <Button
            size="sm"
            variant="tonal"
            icon="switch_account"
            onClick={() => {
              setPersona('DUENO')
              navigate('/inicio')
            }}
          >
            Ver como dueño
          </Button>
        </span>
      </header>
      <div className={styles.pageWide} style={{ width: '100%' }}>
        {typeof title === 'string' ? <h1 className="t-headline-s" style={{ paddingTop: 12 }}>{title}</h1> : title}
        {children}
      </div>
    </div>
  )
}

/** F-08 · Tablero de la cartera de clientes. */
export function Contador() {
  const demo = useDemoState()
  const [filtro, setFiltro] = useState<Semaforo | 'TODOS'>('TODOS')
  const [regimen, setRegimen] = useState<RegimenTributario | 'TODOS'>('TODOS')
  const [orden, setOrden] = useState<'semaforo' | 'vencimiento' | 'conciliado'>('semaforo')

  const filas = useMemo<(FilaCartera & { sinAcceso?: boolean })[]>(() => {
    const completas = SEED_IDS.map((id) => {
      const a = analysisFor(id, demo)!
      const preguntas = demo.comments.filter((c) => c.businessId === id && c.pregunta && !c.respondida).length
      return { ...filaDesdeAnalisis(a, HOY, preguntas), sinAcceso: !permisosDe(demo, id).activo }
    })
    const resumidas: FilaCartera[] = CARTERA_RESUMIDA.map((c) => {
      const v = proximoVencimiento(c.ruc, HOY)
      return { ...c, vencimiento: { fecha: v.fecha, dias: v.dias }, semaforo: semaforo(c.conciliado, c.alertas, v.dias), completo: false }
    })
    return [...completas, ...resumidas]
  }, [demo])

  const visibles = filas
    .filter((f) => (filtro === 'TODOS' || f.semaforo === filtro) && (regimen === 'TODOS' || f.regimen === regimen))
    .sort((x, y) =>
      orden === 'vencimiento'
        ? x.vencimiento.fecha.localeCompare(y.vencimiento.fecha)
        : orden === 'conciliado'
          ? x.conciliado - y.conciliado
          : ORDEN[x.semaforo] - ORDEN[y.semaforo] || x.vencimiento.dias - y.vencimiento.dias,
    )
  const conteo = (s: Semaforo) => filas.filter((f) => f.semaforo === s).length

  return (
    <ContadorShell title={`Tu cartera · ${filas.length} clientes`}>
      <motion.div className={styles.page} style={{ padding: 0 }} variants={staggerContainer(0.04)} initial="hidden" animate="show">
        <motion.div className={styles.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }} variants={fadeUp}>
          {(['ROJO', 'AMBAR', 'VERDE'] as Semaforo[]).map((s) => (
            <button key={s} type="button" className={styles.stat} onClick={() => setFiltro(filtro === s ? 'TODOS' : s)} aria-pressed={filtro === s}>
              <span className={styles.statLabel}>
                <span className={`${styles.dot} ${SEMAFORO_CLASS[s]}`} /> {SEMAFORO_LABEL[s]}
              </span>
              <span className={styles.statValue}>{conteo(s)}</span>
            </button>
          ))}
          <div className={styles.stat}>
            <span className={styles.statLabel}>
              <Icon name="event" size={16} /> Hoy
            </span>
            <span className={styles.statValue}>{fmtFecha(HOY)}</span>
          </div>
        </motion.div>

        <motion.div className={styles.actions} variants={fadeUp} style={{ alignItems: 'center' }}>
          <div className={styles.chips}>
            {(['TODOS', 'NRUS', 'RER', 'RMT', 'GENERAL'] as const).map((r) => (
              <Chip key={r} selected={regimen === r} onClick={() => setRegimen(r)}>
                {r === 'TODOS' ? 'Todos los regímenes' : r}
              </Chip>
            ))}
          </div>
          <label className={styles.small} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            Ordenar por
            <select className={styles.select} value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)}>
              <option value="semaforo">Semáforo</option>
              <option value="vencimiento">Vencimiento SUNAT</option>
              <option value="conciliado">% conciliado</option>
            </select>
          </label>
        </motion.div>

        <motion.div className={styles.tableWrap} variants={fadeUp}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th />
                <th>Razón social</th>
                <th>RUC</th>
                <th>Régimen</th>
                <th className={styles.num}>Conciliado</th>
                <th className={styles.num}>Pendientes</th>
                <th>Alertas</th>
                <th>Vence SUNAT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id}>
                  <td title={SEMAFORO_LABEL[f.semaforo]}>
                    <span className={`${styles.dot} ${SEMAFORO_CLASS[f.semaforo]}`} aria-label={`Semáforo ${SEMAFORO_LABEL[f.semaforo]}`} />
                  </td>
                  <td className={styles.wrapCell}>
                    {f.razonSocial}
                    {f.completo && (
                      <>
                        {' '}
                        <Pill tone="info">Demo</Pill>
                      </>
                    )}
                  </td>
                  <td>{f.ruc}</td>
                  <td>{REGIMEN_NOMBRE[f.regimen]}</td>
                  <td className={styles.num}>{Math.round(f.conciliado * 100)}%</td>
                  <td className={styles.num}>{f.pendientes}</td>
                  <td>
                    <span className={styles.actions} style={{ gap: 4 }}>
                      {f.alertas.cobradoSinComprobante > 0 && <Pill tone="baja">{f.alertas.cobradoSinComprobante} cobrado sin comprobante</Pill>}
                      {f.alertas.pagadoSinFactura > 0 && <Pill tone="media">{f.alertas.pagadoSinFactura} pagado sin factura</Pill>}
                      {f.alertas.diferencias > 0 && <Pill tone="neutral">{f.alertas.diferencias} diferencias</Pill>}
                      {f.alertas.cobradoSinComprobante + f.alertas.pagadoSinFactura + f.alertas.diferencias === 0 && <span className={styles.muted}>—</span>}
                    </span>
                  </td>
                  <td>
                    {fmtFecha(f.vencimiento.fecha)}{' '}
                    <span className={styles.muted}>{f.vencimiento.dias === 0 ? '(hoy)' : `(${f.vencimiento.dias} d)`}</span>
                  </td>
                  <td>
                    {f.sinAcceso ? (
                      <Pill tone="neutral" icon="lock">
                        Sin acceso
                      </Pill>
                    ) : (
                      <Button size="sm" variant="text" trailingIcon="chevron_right" to={`/contador/${f.id}`}>
                        Abrir
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <p className={styles.muted}>
          Semáforo: verde ≥ 90% conciliado y sin alertas · rojo si vence en 3 días o menos con menos de 70%, o si cobró sin comprobante · ámbar el resto.
          Vencimientos según el cronograma de ejemplo por último dígito del RUC.
        </p>
      </motion.div>
    </ContadorShell>
  )
}
