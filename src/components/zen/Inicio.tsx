import { motion } from 'motion/react'
import { Link } from 'react-router'
import { HOY } from '../../config/demo'
import { textoAlerta } from '../../domain/cashflow'
import { totalCobranzas } from '../../domain/collections'
import { fmtFecha } from '../../domain/util'
import { fadeUp } from '../../lib/motion'
import { useApp } from '../../state/context'
import { inicioCompleto } from '../../state/demoStore'
import { useCaja, useCobranzas, useLecciones, useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { LessonCard, Money } from './index'
import styles from './zen.module.css'

/**
 * Inicio del dueño, solo lo esencial: saldo actual · alerta de caja · lo que hay que hacer hoy
 * (revisar y cobrar).
 */
export function InicioOla1() {
  const { business } = useApp()
  const { a, demo } = useZen()
  const caja = useCaja(60)
  const cobranzas = useCobranzas()
  const lecciones = useLecciones()
  if (!a) return null
  const preguntas = demo.comments.filter((c) => c.businessId === a.business.id && c.pregunta && !c.respondida).length
  const porRevisar = a.porRevisar.length + preguntas
  const vencidas = cobranzas.filter((c) => c.diasVencidos > 0).length
  const leccion = lecciones?.activas.find((id) => !demo.leccionesCerradas.includes(`${business.id}:${id}`))

  return (
    <div className={styles.inicio}>
      <motion.section className={styles.hero} variants={fadeUp} data-tour="saldo">
        <span className={styles.heroLabel}>Saldo actual · BCP cuenta corriente</span>
        <Money animated value={a.saldoActual} className={styles.heroAmount} />
        <span className={styles.heroMeta}>Al {fmtFecha(HOY)}</span>
      </motion.section>

      {!inicioCompleto(demo, a.business.id) && (
        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Link to="/bienvenida" className={styles.banner} data-ripple="">
            <Icon name="verified_user" size={22} />
            <span style={{ flex: 1 }}>
              <strong className={styles.bannerTitle}>Termina de configurar Zenity</strong>
              {demo.inicio[a.business.id]?.permisos ? 'Falta confirmar tu planilla: cambia la gratificación y la CTS de tu caja.' : 'Autoriza qué datos lee Zenity y confirma tu planilla (2 pasos).'}
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
        </motion.div>
      )}

      {caja?.alerta && (
        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Link to="/caja" className={caja.alerta.cruza === 'CERO' ? styles.bannerDanger : styles.bannerWarn} data-tour="alerta-caja">
            <Icon name="warning" size={22} />
            <span style={{ flex: 1 }}>
              <strong className={styles.bannerTitle}>{textoAlerta(caja.alerta)}</strong>
              Mira tu proyección de caja y qué puedes hacer.
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
        </motion.div>
      )}

      <motion.section className={styles.section} variants={fadeUp} data-tour="ola1">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Para hoy</h2>
          <span className={styles.sectionHint}>
            {[porRevisar === 0, vencidas === 0].filter(Boolean).length} de 2 listos
          </span>
        </div>
        <div className={styles.list}>
          <Link to="/revisar" className={styles.todo} data-ripple="">
            <span className={`${styles.rowIcon} ${porRevisar ? styles.toneInfo : styles.tonePositive}`}>
              <Icon name={porRevisar ? 'fact_check' : 'task_alt'} size={20} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.todoValue}>{porRevisar ? `Tienes ${porRevisar} por revisar` : '¡Todo revisado!'}</span>
              <span className={styles.rowSub}>{porRevisar ? `Te toma ~${Math.max(1, Math.ceil((porRevisar * 10) / 60))} minuto${porRevisar > 6 ? 's' : ''}` : 'Zenity clasificó todo'}</span>
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
          <Link to="/cobrar" className={styles.todo} data-ripple="">
            <span className={`${styles.rowIcon} ${vencidas ? styles.toneWarning : styles.tonePositive}`}>
              <Icon name="payments" size={20} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.todoValue}>
                Te deben <Money value={totalCobranzas(cobranzas)} />
              </span>
              <span className={styles.rowSub}>
                {cobranzas.length} comprobante{cobranzas.length === 1 ? '' : 's'}
                {vencidas ? ` · ${vencidas} vencido${vencidas === 1 ? '' : 's'}` : ''}
              </span>
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
        </div>
      </motion.section>

      {leccion && (
        <motion.div variants={fadeUp}>
          <LessonCard id={leccion} />
        </motion.div>
      )}
    </div>
  )
}
