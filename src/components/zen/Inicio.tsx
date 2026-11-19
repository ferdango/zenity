import { motion } from 'motion/react'
import { Link } from 'react-router'
import { textoAlerta } from '../../domain/cashflow'
import { fadeUp } from '../../lib/motion'
import { useApp } from '../../state/context'
import { inicioCompleto } from '../../state/demoStore'
import { useCaja, useDecision, useLecciones, useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { LessonCard } from './index'
import styles from './zen.module.css'

/*
 * Piezas del Inicio del dueño. La pantalla (Home) las ordena por importancia: saldo → alerta de caja →
 * cómo te va en el mes → decisión de la semana → SUNAT → cuentas → atajos → configuración y avance.
 */

/** Riesgo de caja: el primer aviso después del saldo. Si la decisión de la semana es sobre la caja, apunta a ella. */
export function AlertaCaja() {
  const caja = useCaja(60)
  const decision = useDecision()
  if (!caja?.alerta) return null
  const sobreCaja = decision?.decision.tipo === 'caja' && !decision.resuelta
  return (
    <motion.div variants={fadeUp} style={{ display: 'grid' }}>
      <Link to="/caja" className={caja.alerta.cruza === 'CERO' ? styles.bannerDanger : styles.bannerWarn} data-tour="alerta-caja">
        <span className={styles.bannerIcon}>
          <Icon name="warning" size={22} fill />
        </span>
        <span style={{ flex: 1 }}>
          <strong className={styles.bannerTitle}>{textoAlerta(caja.alerta)}</strong>
          {sobreCaja ? 'Abajo, en «Decisión de la semana», ves qué hacer y el efecto de cada opción.' : 'Mira tu proyección de caja y qué puedes hacer.'}
        </span>
        <Icon name="chevron_right" size={20} />
      </Link>
    </motion.div>
  )
}

/** «Termina de configurar Zenity»: permisos de datos y planilla (afectan la caja). */
export function ConfigurarZenity() {
  const { a, demo } = useZen()
  if (!a || inicioCompleto(demo, a.business.id)) return null
  return (
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
  )
}

/** Microlección en contexto (solo si las lecciones están activas). */
export function LeccionInicio() {
  const { business } = useApp()
  const { demo } = useZen()
  const lecciones = useLecciones()
  const leccion = lecciones?.activas.find((id) => !demo.leccionesCerradas.includes(`${business.id}:${id}`))
  if (!leccion) return null
  return (
    <motion.div variants={fadeUp}>
      <LessonCard id={leccion} />
    </motion.div>
  )
}
