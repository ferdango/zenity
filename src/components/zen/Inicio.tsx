import { motion } from 'motion/react'
import { Link } from 'react-router'
import { textoAlerta } from '../../domain/cashflow'
import { fadeUp } from '../../lib/motion'
import { useApp } from '../../state/context'
import { inicioCompleto } from '../../state/demoStore'
import { useCaja, useDecision, useLecciones, useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { Avance } from './Avance'
import { DecisionSemana } from './DecisionSemana'
import { LessonCard } from './index'
import { SunatMes } from './SunatMes'
import styles from './zen.module.css'

/**
 * Inicio del dueño, solo lo esencial: tu avance · la decisión de la semana · alerta de caja · el pago
 * mensual a SUNAT, resumido. Revisar y cobrar viven en la pestaña «Tareas».
 * El saldo actual vive en la banda violeta de la pantalla (Home).
 */
export function InicioOla1() {
  const { business } = useApp()
  const { a, demo } = useZen()
  const caja = useCaja(60)
  const lecciones = useLecciones()
  const decision = useDecision()
  if (!a) return null
  const leccion = lecciones?.activas.find((id) => !demo.leccionesCerradas.includes(`${business.id}:${id}`))

  return (
    <div className={styles.inicio}>
      <Avance />

      {!inicioCompleto(demo, a.business.id) && (
        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Link to="/bienvenida" className={styles.banner} data-ripple="">
            <span className={styles.bannerIcon}>
              <Icon name="verified_user" size={22} fill />
            </span>
            <span style={{ flex: 1 }}>
              <strong className={styles.bannerTitle}>Termina de configurar Zenity</strong>
              {demo.inicio[a.business.id]?.permisos ? 'Falta confirmar tu planilla: cambia la gratificación y la CTS de tu caja.' : 'Autoriza qué datos lee Zenity y confirma tu planilla (2 pasos).'}
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
        </motion.div>
      )}

      {/* La decisión de la semana va antes que todo lo demás: es lo que el dueño hace hoy con sus números */}
      <DecisionSemana />

      {/* Si la decisión ya es sobre la caja, el aviso de caja estaría repetido */}
      {caja?.alerta && decision?.decision.tipo !== 'caja' && (
        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Link to="/caja" className={caja.alerta.cruza === 'CERO' ? styles.bannerDanger : styles.bannerWarn} data-tour="alerta-caja">
            <span className={styles.bannerIcon}>
              <Icon name="warning" size={22} fill />
            </span>
            <span style={{ flex: 1 }}>
              <strong className={styles.bannerTitle}>{textoAlerta(caja.alerta)}</strong>
              Mira tu proyección de caja y qué puedes hacer.
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
        </motion.div>
      )}

      <SunatMes />

      {leccion && (
        <motion.div variants={fadeUp}>
          <LessonCard id={leccion} />
        </motion.div>
      )}
    </div>
  )
}
