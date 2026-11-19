import { motion } from 'motion/react'
import { Link } from 'react-router'
import { fadeUp } from '../../lib/motion'
import { useProgreso } from '../../state/useZen'
import { Icon } from '../Icon'
import { ProgressBar } from './index'
import styles from './zen.module.css'

/**
 * Tu avance de hoy en el Inicio (estilo Duolingo): racha, nivel, meta diaria de XP y el siguiente
 * paso del camino. Un toque lleva a «Tu camino».
 */
export function Avance() {
  const p = useProgreso()
  const siguiente = p.siguiente?.paso

  return (
    <motion.div variants={fadeUp} style={{ display: 'grid' }}>
      <Link to="/progreso" className={styles.avance} data-ripple="" data-tour="avance" aria-label={`Tu camino: nivel ${p.nivel.numero}, racha de ${p.racha} días`}>
        <span className={styles.racha} data-activa={p.rachaHoy || undefined}>
          <Icon name="local_fire_department" size={26} fill />
          <strong>{p.racha}</strong>
        </span>
        <span className={styles.avanceTexto}>
          <span className={styles.avanceTitulo}>
            Nivel {p.nivel.numero} · {p.nivel.nombre}
            <span className={styles.avanceXp}>
              {Math.min(p.xpHoy, p.meta)}/{p.meta} XP hoy
            </span>
          </span>
          <ProgressBar value={p.xpHoy / p.meta} label="Meta de XP de hoy" />
          <span className={styles.rowSub}>
            {p.metaCumplida
              ? '¡Meta de hoy cumplida! Sigue sumando para subir de nivel'
              : siguiente
                ? `Siguiente: ${siguiente.titulo} · +${siguiente.xp} XP`
                : 'Completaste tu camino. ¡Bien hecho!'}
          </span>
        </span>
        <Icon name="chevron_right" size={20} />
      </Link>
    </motion.div>
  )
}
