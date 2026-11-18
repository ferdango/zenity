import { motion } from 'motion/react'
import { Link } from 'react-router'
import { HOY } from '../../config/demo'
import { textoAlerta } from '../../domain/cashflow'
import { totalCobranzas } from '../../domain/collections'
import { personalesDelMes } from '../../domain/personal'
import { fmtFecha, round2 } from '../../domain/util'
import { fadeUp } from '../../lib/motion'
import { useApp } from '../../state/context'
import { useCaja, useCobranzas, useLecciones, useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { LessonCard, Money } from './index'
import styles from './zen.module.css'

/**
 * Inicio del dueño (sección 8 del brief), en este orden: saldo actual · alerta principal de caja ·
 * por revisar · te deben · gasto personal del mes · tarjeta de microlección.
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
  const personal = round2(personalesDelMes(a, HOY.slice(0, 7)).reduce((s, m) => s - m.monto, 0))
  const leccion = lecciones?.activas.find((id) => !demo.leccionesCerradas.includes(`${business.id}:${id}`))

  return (
    <div className={styles.inicio}>
      <motion.section className={styles.hero} variants={fadeUp} data-tour="saldo">
        <span className={styles.heroLabel}>Saldo actual · BCP cuenta corriente</span>
        <Money value={a.saldoActual} className={styles.heroAmount} />
        <span className={styles.heroMeta}>Al {fmtFecha(HOY)} · se actualiza solo</span>
      </motion.section>

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

      <motion.div className={styles.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }} variants={fadeUp} data-tour="ola1">
        <Link to="/revisar" className={styles.stat} data-ripple="">
          <span className={styles.statLabel}>
            <Icon name="fact_check" size={16} /> Por revisar
          </span>
          <span className={styles.statValue}>{porRevisar === 0 ? '¡Al día!' : `Tienes ${porRevisar}`}</span>
          <span className={styles.muted}>{porRevisar === 0 ? 'Nada pendiente' : `~${Math.max(1, Math.ceil((porRevisar * 10) / 60))} min`}</span>
        </Link>
        <Link to="/cobrar" className={styles.stat} data-ripple="">
          <span className={styles.statLabel}>
            <Icon name="payments" size={16} /> Te deben
          </span>
          <Money value={totalCobranzas(cobranzas)} className={styles.statValue} />
          <span className={styles.muted}>
            {cobranzas.length} comprobante{cobranzas.length === 1 ? '' : 's'}
          </span>
        </Link>
        <Link to="/personal" className={styles.stat} data-ripple="">
          <span className={styles.statLabel}>
            <Icon name="person" size={16} /> Gasto personal este mes
          </span>
          <Money value={personal} className={styles.statValue} />
          <span className={styles.muted}>Salió de la cuenta del negocio</span>
        </Link>
      </motion.div>

      {leccion && (
        <motion.div variants={fadeUp}>
          <LessonCard id={leccion} />
        </motion.div>
      )}
    </div>
  )
}
