import { motion } from 'motion/react'
import { Button } from '../components/Button'
import { InitialsAvatar } from '../components/Avatars'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { businessName } from '../data/businesses'
import { tituloMovimiento } from '../data/demoLedger'
import { fmtFecha } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { CONTADOR, permisosDe, setPermisos } from '../state/demoStore'
import { useZen } from '../state/useZen'

/** Lado del dueño de F-08: quién es su contador, qué puede ver y la conversación. */
export function MiContador() {
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const permisos = permisosDe(demo, business.id)
  const hilos = new Map<string, typeof demo.comments>()
  for (const c of demo.comments.filter((x) => x.businessId === business.id)) hilos.set(c.movementId, [...(hilos.get(c.movementId) ?? []), c])
  const pendientes = demo.comments.filter((c) => c.businessId === business.id && c.pregunta && !c.respondida).length

  return (
    <div className="z-page">
      <TopBar title="Mi contador" subtitle={businessName(business)} backTo="/mas" />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.card} variants={fadeUp}>
          <div className={styles.row} style={{ padding: 0, background: 'none' }}>
            <InitialsAvatar initials={CONTADOR.iniciales} size={44} />
            <span className={styles.rowText}>
              <span className="t-title-m">{CONTADOR.nombre}</span>
              <span className={styles.rowSub}>{CONTADOR.estudio} · contador independiente</span>
            </span>
            {permisos.activo ? <Pill tone="alta">Con acceso</Pill> : <Pill tone="baja">Sin acceso</Pill>}
          </div>
          {pendientes > 0 && (
            <Button variant="tonal" icon="forum" to="/revisar">
              Responder {pendientes} pregunta{pendientes === 1 ? '' : 's'}
            </Button>
          )}
        </motion.section>

        <motion.section className={styles.card} variants={fadeUp}>
          <SectionHead title="Permisos" />
          {[
            { key: 'verMovimientos' as const, label: 'Ver mis movimientos y comprobantes' },
            { key: 'editarCategorias' as const, label: 'Editar categorías y cuentas contables' },
          ].map((p) => (
            <label key={p.key} className={styles.toggleRow}>
              <span>{p.label}</span>
              <input
                type="checkbox"
                className={styles.switch}
                checked={permisos.activo && permisos[p.key]}
                disabled={!permisos.activo}
                onChange={(e) => setPermisos(business.id, { [p.key]: e.target.checked })}
              />
            </label>
          ))}
          {permisos.activo ? (
            <Button
              variant="text"
              icon="person_remove"
              onClick={() => {
                setPermisos(business.id, { activo: false })
                toast(`${CONTADOR.nombre} ya no tiene acceso`, 'lock')
              }}
            >
              Quitar acceso
            </Button>
          ) : (
            <Button variant="tonal" icon="person_add" onClick={() => setPermisos(business.id, { activo: true })}>
              Volver a dar acceso
            </Button>
          )}
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Conversaciones" hint={`${hilos.size}`} />
          {hilos.size === 0 && <p className={`${styles.card} ${styles.muted}`}>Aún no hay mensajes. Desde el simulador de régimen puedes enviarle tu comparación.</p>}
          {[...hilos.entries()].map(([movementId, mensajes]) => {
            const m = a?.movementsById.get(movementId)
            return (
              <div key={movementId} className={styles.card}>
                <span className={styles.statLabel}>
                  <Icon name={m ? 'receipt_long' : 'balance'} size={16} />
                  {m ? `${fmtFecha(m.fecha)} · ${tituloMovimiento(m)}` : 'Simulador de régimen'}
                </span>
                <div className={styles.thread}>
                  {mensajes.map((c) => (
                    <p key={c.id} className={c.autor === 'DUENO' ? styles.msgMine : styles.msg}>
                      <span className={styles.muted}>{c.autor === 'DUENO' ? 'Tú' : CONTADOR.nombre}</span>
                      {c.texto}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </motion.section>
      </motion.div>
    </div>
  )
}
