import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { ProgressBar } from '../components/zen'
import { businessName } from '../data/businesses'
import type { Logro } from '../domain/loyalty'
import { celebrateFrom } from '../lib/celebrate'
import { haptic } from '../lib/haptics'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { reclamarRecompensa } from '../state/demoStore'
import { useProgreso } from '../state/useZen'
import styles from './Loyalty.module.css'

/** Primero lo que se puede reclamar, luego lo que está en camino y al final lo ya reclamado. */
const orden = (l: Logro) => (l.logrado && !l.reclamado ? 0 : !l.logrado ? 1 : 2)

/** «Recompensas»: logros que se desbloquean con tareas reales y dan XP extra al reclamarlos. */
export function Recompensas() {
  const { business } = useApp()
  const p = useProgreso()
  const logrados = p.logros.filter((l) => l.logrado).length
  const lista = [...p.logros].sort((x, y) => orden(x) - orden(y))

  return (
    <div className="z-page">
      <TopBar title="Recompensas" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.saldo} variants={fadeUp} aria-live="polite">
          <span className={styles.saldoLabel}>Tus logros</span>
          <strong className={styles.saldoValor}>
            <Icon name="emoji_events" size={30} fill />
            {logrados} de {p.logros.length}
          </strong>
          <span className={styles.saldoMeta}>
            {p.porReclamar > 0
              ? `Tienes ${p.porReclamar} recompensa${p.porReclamar === 1 ? '' : 's'} por reclamar`
              : 'Sigue haciendo tareas para desbloquear más'}
          </span>
          <Link to="/tienda" className={styles.saldoLink}>
            Gasta tus {p.puntos} XP en la tienda
            <Icon name="chevron_right" size={18} />
          </Link>
        </motion.section>

        <motion.div className={styles.logros} variants={fadeUp}>
          {lista.map((l) => (
            <LogroCard key={l.id} logro={l} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

function LogroCard({ logro: l }: { logro: Logro }) {
  const reclamable = l.logrado && !l.reclamado
  const reclamar = (el: HTMLElement) => {
    haptic('success')
    celebrateFrom(el, 30)
    reclamarRecompensa(l.id)
  }
  return (
    <motion.article layout className={styles.logro} data-estado={l.reclamado ? 'reclamado' : l.logrado ? 'logrado' : 'pendiente'}>
      <span className={styles.logroIcon}>
        <Icon name={l.icon} size={26} fill={l.logrado} />
      </span>
      <span className={styles.logroTexto}>
        <strong>{l.titulo}</strong>
        <span>{l.detalle}</span>
        {!l.logrado && (
          <span className={styles.logroAvance}>
            <ProgressBar value={l.actual / l.meta} label={`Avance de ${l.titulo}`} />
            <span>
              {l.actual}/{l.meta}
            </span>
          </span>
        )}
      </span>
      <span className={styles.logroEnd}>
        {reclamable ? (
          <Button size="sm" icon="redeem" onClick={(e) => reclamar(e.currentTarget)}>
            +{l.xp} XP
          </Button>
        ) : l.reclamado ? (
          <span className={styles.reclamado}>
            <Icon name="check" size={16} /> Reclamado
          </span>
        ) : (
          <span className={styles.premio}>+{l.xp} XP</span>
        )}
      </span>
    </motion.article>
  )
}
