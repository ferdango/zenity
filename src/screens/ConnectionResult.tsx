import { motion } from 'motion/react'
import { Navigate, useSearchParams } from 'react-router'
import { Aurora } from '../components/Aurora'
import { SourceLogo } from '../components/Avatars'
import { Button } from '../components/Button'
import { Spark } from '../components/Spark'
import { getSource } from '../data/sources'
import { cn } from '../lib/cn'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import styles from './ConnectionResult.module.css'

const CLOUD = 'M7 18.5h10.5a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.6 8.3 5.1 5.1 0 0 0 7 18.5Z'

function CloudIcon({ ok }: { ok: boolean }) {
  const draw = (delay: number, duration = 0.9) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1, transition: { delay, duration, ease: ease.emphasized } },
  })
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width="108"
      height="108"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      animate={ok ? { scale: [1, 1.06, 1] } : { x: [0, -6, 6, -4, 4, 0] }}
      transition={{ delay: 1.15, duration: ok ? 0.5 : 0.45 }}
    >
      <motion.path d={CLOUD} {...draw(0.1)} />
      {ok ? (
        <motion.path d="M9.2 13.4l2 2 3.8-4" strokeWidth="1.5" {...draw(0.8, 0.45)} />
      ) : (
        <>
          <motion.path d="M10 11.5l4 4" strokeWidth="1.5" {...draw(0.8, 0.3)} />
          <motion.path d="M14 11.5l-4 4" strokeWidth="1.5" {...draw(0.95, 0.3)} />
        </>
      )}
    </motion.svg>
  )
}

/** Resultado de conexión (Figma: Conection added / Conection error). */
export function ConnectionResult() {
  const [params] = useSearchParams()
  const ok = params.get('estado') !== 'error'
  const source = getSource(params.get('fuente'))
  if (!source) return <Navigate to="/conexiones/nueva" replace />

  return (
    <div className={cn(styles.screen, ok ? styles.success : styles.error)}>
      {ok && <Aurora placement="bottom" fixed />}
      <motion.div className={styles.center} variants={staggerContainer(0.08, 0.6)} initial="hidden" animate="show">
        <div className={styles.iconWrap}>
          <motion.span
            className={styles.glow}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.35 }}
            transition={{ duration: 1, ease: ease.decelerate }}
          />
          {ok &&
            Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * Math.PI * 2
              const distance = 78 + (i % 2) * 18
              return (
                <motion.span
                  key={i}
                  className={styles.particle}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    scale: [0, 1, 0.6],
                    opacity: [0, 1, 0],
                    rotate: 90,
                  }}
                  transition={{ delay: 1.1 + i * 0.02, duration: 1.1, ease: ease.decelerate }}
                >
                  <Spark size={14} />
                </motion.span>
              )
            })}
          <CloudIcon ok={ok} />
        </div>

        <motion.p className={styles.kicker} variants={fadeUp}>
          {ok ? '¡Genial!' : 'Credenciales inválidas'}
        </motion.p>
        <motion.h1 className={styles.title} variants={fadeUp}>
          {ok ? 'Conexión agregada con éxito' : 'No pudimos agregar la conexión'}
        </motion.h1>
        <motion.span className={styles.detail} variants={fadeUp}>
          <SourceLogo source={source} size={32} />
          {source.name}
        </motion.span>
      </motion.div>

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 1, duration: 0.5, ease: ease.decelerate } }}
      >
        {ok ? (
          <>
            <Button size="lg" fullWidth to="/analizando" replace icon="auto_awesome">
              Ver cuenta
            </Button>
            <Button size="lg" fullWidth variant="text" to="/conexiones/nueva" replace>
              Conectar otra fuente
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" fullWidth to={`/conexiones/nueva?reintentar=${source.id}`} replace icon="refresh">
              Reintentar
            </Button>
            <Button size="lg" fullWidth variant="text" to="/conexiones/nueva" replace>
              Editar conexión
            </Button>
          </>
        )}
      </motion.div>
    </div>
  )
}
