import { AnimatePresence, motion } from 'motion/react'
import type { OpcionDecision, TipoDecision } from '../../domain/decision'
import { XP } from '../../domain/progreso'
import { celebrateFrom } from '../../lib/celebrate'
import { haptic } from '../../lib/haptics'
import { ease, fadeUp, spring } from '../../lib/motion'
import { useApp } from '../../state/context'
import { cambiarDecision, tomarDecision } from '../../state/demoStore'
import { useDecision } from '../../state/useZen'
import { Button } from '../Button'
import { Icon } from '../Icon'
import styles from './zen.module.css'

/** Lo que se logró cuando el problema de la decisión ya no está en los números. */
const LOGRO: Record<TipoDecision, string> = {
  caja: 'Tu caja ya no baja de tu colchón.',
  cobrar: 'Ya no tienes facturas vencidas.',
  sueldo: 'Ya tienes tu sueldo de dueño.',
  sunat: '',
}

/** Termina la frase con punto sin duplicarlo («… S.A.C.»). */
const conPunto = (t: string) => (t.endsWith('.') ? t : `${t}.`)

/**
 * «Decisión de la semana» en el Inicio: una decisión real del negocio con el efecto de cada opción
 * en sus números. Al elegir, gana XP y aprende por qué (y cuál deja mejor al negocio).
 */
export function DecisionSemana() {
  const { business } = useApp()
  const d = useDecision()
  if (!d) return null
  const { decision, tomada, resuelta } = d
  const elegida = tomada ? decision.opciones.find((o) => o.id === tomada.opcion) : undefined
  const mejor = decision.opciones.find((o) => o.mejor)
  const accion = elegida?.mejor ? elegida.accion : (mejor?.accion ?? elegida?.accion)

  const elegir = (o: OpcionDecision, el: HTMLElement) => {
    haptic(o.mejor ? 'success' : 'tap')
    if (o.mejor) celebrateFrom(el, 22)
    tomarDecision(business.id, decision, o)
  }

  return (
    <motion.section className={styles.decision} variants={fadeUp} aria-label="Decisión de la semana" data-tour="decision">
      <header className={styles.decisionHead}>
        <span className={styles.decisionKicker}>
          <Icon name="lightbulb" size={18} fill />
          Decisión de la semana
        </span>
        {!elegida && <span className={styles.xpChip}>+{XP.decision} XP</span>}
      </header>
      <p className={styles.decisionPregunta}>{decision.pregunta}</p>
      <p className={styles.decisionContexto}>{decision.contexto}</p>

      <AnimatePresence mode="wait" initial={false}>
        {!elegida ? (
          <motion.div
            key="opciones"
            className={styles.decisionOpciones}
            role="group"
            aria-label="Opciones"
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: ease.accelerate } }}
          >
            {decision.opciones.map((o) => (
              <button key={o.id} type="button" className={styles.decisionOpcion} data-ripple="" onClick={(e) => elegir(o, e.currentTarget)}>
                <span className={styles.decisionOpcionTexto}>
                  <strong>{o.titulo}</strong>
                  <span>{o.detalle}</span>
                </span>
                <span className={styles.decisionEfecto} data-bueno={o.efectoBueno || undefined}>
                  <Icon name={o.efectoBueno ? 'trending_up' : 'trending_down'} size={16} />
                  {o.efecto}
                </span>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="resultado"
            className={styles.decisionResultado}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { ...spring.snappy } }}
          >
            {resuelta && (
              <p className={styles.decisionLograda}>
                <Icon name="emoji_events" size={20} fill />
                <span>
                  <strong>¡Lo lograste!</strong> {LOGRO[decision.tipo]}
                </span>
              </p>
            )}
            <p className={styles.decisionElegida} data-mejor={elegida.mejor || undefined}>
              <Icon name={elegida.mejor ? 'check_circle' : 'info'} size={20} fill />
              <span>
                <strong>Elegiste: {conPunto(elegida.titulo)}</strong> {conPunto(elegida.efecto)}
              </span>
            </p>
            <p className={styles.decisionPorque}>{elegida.porque}</p>
            {!elegida.mejor && mejor && (
              <p className={styles.decisionMejor}>
                <Icon name="lightbulb" size={18} />
                <span>
                  Con mejor resultado: <strong>{conPunto(mejor.titulo)}</strong> {conPunto(mejor.efecto)}
                </span>
              </p>
            )}
            <div className={styles.decisionAcciones}>
              {/* Si no eligió la mejor, el botón lleva a la opción con mejor resultado */}
              {accion && !resuelta && (
                <Button size="sm" trailingIcon="arrow_forward" to={accion.to}>
                  {accion.label}
                </Button>
              )}
              {!resuelta && (
                <Button size="sm" variant="text" icon="undo" onClick={() => cambiarDecision(business.id, decision.id)}>
                  Cambiar mi decisión
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
