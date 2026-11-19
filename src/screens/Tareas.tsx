import { motion } from 'motion/react'
import { Link } from 'react-router'
import { BusinessButton } from '../components/Business'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { NoDemoData, SectionHead } from '../components/zen'
import { Avance } from '../components/zen/Avance'
import { DecisionSemana } from '../components/zen/DecisionSemana'
import { SunatMes } from '../components/zen/SunatMes'
import { TareasHoy } from '../components/zen/TareasHoy'
import styles from '../components/zen/zen.module.css'
import { businessName } from '../data/businesses'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { useProgreso, useZen } from '../state/useZen'

/**
 * «Tareas»: todo lo que el dueño tiene por hacer, contado como avance (estilo Duolingo). Reúne la
 * decisión de la semana, revisar y cobrar, el siguiente paso del camino, las recompensas por
 * reclamar y el pago a SUNAT.
 */
export function Tareas() {
  const { business } = useApp()
  const { a } = useZen()
  const p = useProgreso()
  const unidad = p.unidades.find((u) => u.estado === 'actual')
  // «Revisar» ya está en las tareas de hoy: el siguiente paso solo se muestra si es otro
  const siguiente = p.siguiente && p.siguiente.paso.id !== 'revisar' ? p.siguiente.paso : null

  return (
    <div className="z-page">
      <TopBar title="Tareas" subtitle={businessName(business)} hideBack end={<BusinessButton />} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        {!a ? (
          <NoDemoData feature="Las tareas" />
        ) : (
          <>
            <Avance />
            <DecisionSemana />
            <TareasHoy />

            <motion.section className={styles.section} variants={fadeUp}>
              <SectionHead title="Avanza en tu camino" hint={unidad ? `Unidad: ${unidad.titulo}` : undefined} />
              <div className={styles.flatList}>
                {siguiente && (
                  <Link to={siguiente.tipo === 'leccion' || !siguiente.to ? '/progreso' : siguiente.to} className={styles.todo} data-ripple="">
                    <span className={`${styles.rowIcon} ${siguiente.tipo === 'leccion' ? styles.toneViolet : styles.toneInfo}`}>
                      <Icon name={siguiente.tipo === 'leccion' ? 'school' : 'flag'} size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.todoValue}>{siguiente.titulo}</span>
                      <span className={styles.rowSub}>{siguiente.tipo === 'leccion' ? 'Lección corta con una pregunta de práctica' : siguiente.detalle}</span>
                    </span>
                    <span className={styles.xpChip}>+{siguiente.xp} XP</span>
                  </Link>
                )}
                {p.porReclamar > 0 && (
                  <Link to="/recompensas" className={styles.todo} data-ripple="">
                    <span className={`${styles.rowIcon} ${styles.toneWarning}`}>
                      <Icon name="redeem" size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.todoValue}>
                        Reclama {p.porReclamar} recompensa{p.porReclamar === 1 ? '' : 's'}
                      </span>
                      <span className={styles.rowSub}>Logros que ya cumpliste</span>
                    </span>
                    <Icon name="chevron_right" size={20} />
                  </Link>
                )}
                <Link to="/progreso" className={styles.todo} data-ripple="">
                  <span className={`${styles.rowIcon} ${styles.tonePositive}`}>
                    <Icon name="school" size={20} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.todoValue}>Tu camino</span>
                    <span className={styles.rowSub}>
                      {unidad ? `${unidad.titulo} · ${unidad.hechos} de ${unidad.pasos.length}` : 'Completaste todas las unidades'}
                    </span>
                  </span>
                  <Icon name="chevron_right" size={20} />
                </Link>
                <Link to="/tienda" className={styles.todo} data-ripple="">
                  <span className={`${styles.rowIcon} ${styles.toneViolet}`}>
                    <Icon name="storefront" size={20} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.todoValue}>Tienda de puntos</span>
                    <span className={styles.rowSub}>Tienes {p.puntos} XP para canjear</span>
                  </span>
                  <Icon name="chevron_right" size={20} />
                </Link>
              </div>
            </motion.section>

            <SunatMes />
          </>
        )}
      </motion.div>
    </div>
  )
}
