import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { NoDemoData, ProgressBar } from '../components/zen'
import { LESSONS } from '../config/lessons'
import { QUIZ } from '../config/quiz'
import { businessName } from '../data/businesses'
import type { Paso, Unidad } from '../domain/progreso'
import { celebrateFrom } from '../lib/celebrate'
import { haptic } from '../lib/haptics'
import { ease, fadeUp, spring, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { registrarLeccion } from '../state/demoStore'
import { useLecciones, useProgreso } from '../state/useZen'
import styles from './Progreso.module.css'

/** Posición en zigzag de cada paso (como el camino de Duolingo). */
const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1]

const ICONO_TAREA: Record<string, string> = {
  conectar: 'link',
  permisos: 'verified_user',
  revisar: 'fact_check',
  sueldo: 'savings',
  recordar: 'chat',
  promesa: 'event',
  planilla: 'groups',
  caja: 'monitoring',
  sunat: 'account_balance',
}

/**
 * «Tu camino financiero»: el avance del dueño como un curso. Cada unidad junta tareas reales de la
 * app con una microlección y su pregunta de práctica. Las unidades se desbloquean en orden.
 */
export function Progreso() {
  const { business } = useApp()
  const p = useProgreso()
  const [leccion, setLeccion] = useState<Paso | null>(null)

  return (
    <div className="z-page">
      <TopBar title="Tu camino" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.06)} initial="hidden" animate="show">
        <motion.section className={styles.resumen} variants={fadeUp}>
          <div className={styles.nivelFila}>
            <span className={styles.nivelBadge}>
              <Icon name="workspace_premium" size={26} fill />
            </span>
            <span className={styles.nivelTexto}>
              <span className={styles.nivelKicker}>Nivel {p.nivel.numero}</span>
              <strong>{p.nivel.nombre}</strong>
            </span>
            <span className={styles.xpTotal}>{p.xp} XP</span>
          </div>
          <ProgressBar value={p.nivel.pct} label="Avance al siguiente nivel" />
          <span className={styles.nivelFalta}>
            {p.nivel.hasta === null ? 'Llegaste al nivel más alto' : `Te faltan ${p.nivel.faltan} XP para el nivel ${p.nivel.numero + 1}`}
          </span>
          <div className={styles.stats}>
            <span className={styles.stat} data-activa={p.rachaHoy || undefined}>
              <Icon name="local_fire_department" size={22} fill />
              <span>
                <strong>{p.racha} días</strong>
                <small>{p.rachaHoy ? 'Racha asegurada hoy' : 'Haz una tarea para seguir'}</small>
              </span>
            </span>
            <span className={styles.stat} data-activa={p.metaCumplida || undefined}>
              <Icon name="bolt" size={22} fill />
              <span>
                <strong>
                  {Math.min(p.xpHoy, p.meta)}/{p.meta} XP
                </strong>
                <small>{p.metaCumplida ? '¡Meta de hoy cumplida!' : 'Meta de hoy'}</small>
              </span>
            </span>
          </div>
          <div className={styles.accesos}>
            <Link to="/tienda" className={styles.acceso} data-ripple="">
              <Icon name="storefront" size={20} />
              Tienda · {p.puntos} XP
            </Link>
            <Link to="/recompensas" className={styles.acceso} data-ripple="">
              <Icon name="redeem" size={20} />
              Recompensas
              {p.porReclamar > 0 && <span className={styles.accesoBadge}>{p.porReclamar}</span>}
            </Link>
          </div>
        </motion.section>

        {!p.unidades.length ? (
          <NoDemoData feature="El camino de aprendizaje" />
        ) : (
          p.unidades.map((u, i) => <UnidadCamino key={u.id} unidad={u} numero={i + 1} anterior={p.unidades[i - 1]} siguienteId={p.siguiente?.paso.id} onLeccion={setLeccion} />)
        )}
      </motion.div>

      <HojaLeccion paso={leccion} onClose={() => setLeccion(null)} />
    </div>
  )
}

function UnidadCamino({
  unidad: u,
  numero,
  anterior,
  siguienteId,
  onLeccion,
}: {
  unidad: Unidad
  numero: number
  anterior?: Unidad
  siguienteId?: string
  onLeccion: (p: Paso) => void
}) {
  const navigate = useNavigate()
  const { toast } = useApp()
  const bloqueada = u.estado === 'bloqueada'

  const abrir = (paso: Paso) => {
    if (bloqueada && !paso.hecho) {
      haptic('warning')
      toast(`Termina «${anterior?.titulo}» para desbloquear esta unidad`, 'lock')
      return
    }
    haptic('tap')
    if (paso.tipo === 'leccion') onLeccion(paso)
    else if (paso.to) navigate(paso.to)
  }

  return (
    <motion.section className={styles.unidad} data-estado={u.estado} variants={fadeUp} aria-label={`Unidad ${numero}: ${u.titulo}`}>
      <header className={styles.unidadHead}>
        <span className={styles.unidadIcon}>
          <Icon name={u.estado === 'completa' ? 'emoji_events' : bloqueada ? 'lock' : u.icon} size={24} fill={u.estado === 'completa'} />
        </span>
        <span className={styles.unidadTexto}>
          <span className={styles.unidadKicker}>
            Unidad {numero} · {u.hechos} de {u.pasos.length}
          </span>
          <strong>{u.titulo}</strong>
          <span>{u.meta}</span>
        </span>
      </header>

      <ol className={styles.pasos}>
        {u.pasos.map((paso, i) => {
          const actual = paso.id === siguienteId
          return (
            <li key={paso.id} className={styles.paso} style={{ '--x': ZIGZAG[i % ZIGZAG.length] } as React.CSSProperties}>
              <button
                type="button"
                className={styles.nodo}
                data-hecho={paso.hecho || undefined}
                data-actual={actual || undefined}
                data-bloqueado={(bloqueada && !paso.hecho) || undefined}
                data-leccion={paso.tipo === 'leccion' || undefined}
                onClick={() => abrir(paso)}
                aria-label={`${paso.titulo}${paso.hecho ? ' (hecho)' : ''}`}
              >
                {actual && (
                  <motion.span className={styles.empieza} initial={{ y: 6, opacity: 0 }} animate={{ y: [0, -4, 0], opacity: 1 }} transition={{ y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}>
                    {paso.tipo === 'leccion' ? 'Lección' : 'Empieza aquí'}
                  </motion.span>
                )}
                <Icon
                  name={paso.hecho ? 'check' : bloqueada ? 'lock' : paso.tipo === 'leccion' ? 'school' : (ICONO_TAREA[paso.id] ?? 'task_alt')}
                  size={28}
                  weight={paso.hecho ? 700 : 500}
                />
              </button>
              <span className={styles.pasoTexto}>
                <strong>{paso.titulo}</strong>
                <span>
                  {paso.avance && !paso.hecho ? `${paso.avance.hechos} de ${paso.avance.total} · ` : ''}+{paso.xp} XP{paso.avance && !paso.hecho ? ' c/u' : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </motion.section>
  )
}

/** Microlección + pregunta de práctica: acertar registra la lección como leída y da su XP. */
function HojaLeccion({ paso, onClose }: { paso: Paso | null; onClose: () => void }) {
  const { business } = useApp()
  const lecciones = useLecciones()
  const [elegida, setElegida] = useState<number | null>(null)
  const id = paso?.lessonId
  const quiz = id ? QUIZ[id] : undefined
  const contenido = id && lecciones ? LESSONS[id](lecciones.context) : null
  const acerto = elegida !== null && quiz ? elegida === quiz.correcta : null

  const cerrar = () => {
    setElegida(null)
    onClose()
  }

  const responder = (i: number, el: HTMLElement) => {
    if (!quiz || !id || acerto) return
    setElegida(i)
    if (i === quiz.correcta) {
      haptic('success')
      if (!paso?.hecho) {
        registrarLeccion(business.id, id, 'LEIDA')
        celebrateFrom(el, 26)
      }
    } else haptic('error')
  }

  return (
    <BottomSheet open={!!paso} onClose={cerrar} title={paso?.titulo ?? ''} label="Lección">
      {paso && (
        <div className={styles.leccion}>
          {contenido ? (
            <>
              <p className={styles.leccionCuerpo}>{contenido.cuerpo}</p>
              <p className={styles.leccionAfecta}>
                <Icon name="lightbulb" size={18} />
                <span>{contenido.comoTeAfecta}</span>
              </p>
            </>
          ) : (
            <p className={styles.leccionCuerpo}>{paso.detalle}</p>
          )}

          {quiz && (
            <div className={styles.quiz} role="group" aria-label="Pregunta de práctica">
              <span className={styles.quizKicker}>
                <Icon name="quiz" size={18} /> Practica
              </span>
              <strong className={styles.quizPregunta}>{quiz.pregunta}</strong>
              {quiz.opciones.map((op, i) => (
                <motion.button
                  key={op}
                  type="button"
                  className={styles.opcion}
                  data-estado={elegida === i ? (i === quiz.correcta ? 'bien' : 'mal') : acerto && i === quiz.correcta ? 'bien' : undefined}
                  disabled={!!acerto}
                  onClick={(e) => responder(i, e.currentTarget)}
                  animate={elegida === i && i !== quiz.correcta ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {op}
                </motion.button>
              ))}

              <AnimatePresence mode="wait">
                {acerto !== null && (
                  <motion.div
                    key={acerto ? 'bien' : 'mal'}
                    className={styles.feedback}
                    data-bien={acerto || undefined}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { ...spring.snappy } }}
                    exit={{ opacity: 0, transition: { duration: 0.15, ease: ease.accelerate } }}
                  >
                    <strong>
                      <Icon name={acerto ? 'check_circle' : 'cancel'} size={20} fill />
                      {acerto ? (paso.hecho ? '¡Correcto! Ya tenías esta lección' : `¡Correcto! +${paso.xp} XP`) : 'Casi. Mira por qué:'}
                    </strong>
                    <span>{quiz.explicacion}</span>
                    {acerto ? (
                      <Button size="lg" fullWidth onClick={cerrar}>
                        Continuar
                      </Button>
                    ) : (
                      <Button size="lg" variant="tonal" fullWidth onClick={() => setElegida(null)}>
                        Intentar de nuevo
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
