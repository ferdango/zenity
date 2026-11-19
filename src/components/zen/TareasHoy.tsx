import { motion } from 'motion/react'
import { Link } from 'react-router'
import { totalCobranzas } from '../../domain/collections'
import { XP } from '../../domain/progreso'
import { fadeUp } from '../../lib/motion'
import { useCobranzas, useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { Money } from './index'
import styles from './zen.module.css'

/**
 * «Tareas de hoy»: revisar movimientos y cobrar, con el XP que da cada una. Se usa en el Inicio y en
 * la pestaña Tareas.
 */
export function TareasHoy() {
  const { a } = useZen()
  const cobranzas = useCobranzas()
  if (!a) return null
  const porRevisar = a.porRevisar.length
  const vencidas = cobranzas.filter((c) => c.diasVencidos > 0).length
  // XP que se gana con las tareas de hoy: cada movimiento revisado y cada recordatorio de cobro
  const xpRevisar = porRevisar * XP.revisar
  const xpCobrar = vencidas * XP.recordatorio
  const xpPendiente = xpRevisar + xpCobrar

  return (
    <motion.section className={styles.section} variants={fadeUp} data-tour="ola1">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Tareas de hoy</h2>
        <span className={styles.sectionHint}>
          {[porRevisar === 0, vencidas === 0].filter(Boolean).length} de 2 listas
          {xpPendiente > 0 && ` · +${xpPendiente} XP`}
        </span>
      </div>
      <div className={styles.flatList}>
        <Link to="/revisar" className={styles.todo} data-ripple="">
          <span className={`${styles.rowIcon} ${porRevisar ? styles.toneInfo : styles.tonePositive}`}>
            <Icon name={porRevisar ? 'fact_check' : 'task_alt'} size={20} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.todoValue}>{porRevisar ? `Tienes ${porRevisar} por revisar` : '¡Todo revisado!'}</span>
            <span className={styles.rowSub}>{porRevisar ? `Te toma ~${Math.max(1, Math.ceil((porRevisar * 10) / 60))} minuto${porRevisar > 6 ? 's' : ''}` : 'Zenity clasificó todo'}</span>
          </span>
          {xpRevisar > 0 ? <span className={styles.xpChip}>+{xpRevisar} XP</span> : <Icon name="chevron_right" size={20} />}
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
          {xpCobrar > 0 ? <span className={styles.xpChip}>+{xpCobrar} XP</span> : <Icon name="chevron_right" size={20} />}
        </Link>
      </div>
    </motion.section>
  )
}
