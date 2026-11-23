import { motion } from 'motion/react'
import type { ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { MapaAfinidad, MapaEmpatia, MapaSupuestos } from '../components/ux/Entender'
import { MapaBlueprint, MapaEcosistema, MapaJourney } from '../components/ux/Experiencia'
import { IlustracionMapa } from '../components/ux/Ilustraciones'
import { MapaRoadmap, MapaSiteMap, MapaUserFlow } from '../components/ux/Solucion'
import styles from '../components/ux/ux.module.css'
import { FUENTES_MAPA, FUENTES_UX, MAPAS, type MapaId, mapaPorId, ORDEN_SECCIONES, SECCIONES } from '../config/mapasUx'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useBack } from '../lib/useBack'

const DETALLE: Record<MapaId, ComponentType> = {
  empatia: MapaEmpatia,
  afinidad: MapaAfinidad,
  supuestos: MapaSupuestos,
  'customer-journey': MapaJourney,
  'service-blueprint': MapaBlueprint,
  ecosistema: MapaEcosistema,
  'user-flow': MapaUserFlow,
  'site-map': MapaSiteMap,
  roadmap: MapaRoadmap,
}

/** «Mapas de UX»: los 9 mapas de investigación de Zenity en tarjetas, agrupados por para qué sirven. */
export function MapasUx() {
  const back = useBack('/mas')
  return (
    <div className={cn('z-page', styles.ux)}>
      <header className={styles.top}>
        <IconButton icon="arrow_back" label="Volver a la app" variant="tonal" onClick={back} />
        <span className={styles.topTitle}>Zenity · Mapas de UX</span>
      </header>

      <motion.main className={styles.wrap} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.intro} variants={fadeUp}>
          <span className={styles.eyebrow}>Investigación de producto</span>
          <h1 className={styles.h1}>Mapas de UX de Zenity</h1>
          <p className={styles.lead}>
            Nueve mapas para entender a la dueña de una mype peruana, ver cómo vive Zenity paso a paso y decidir qué construir primero. Todos usan a
            Rosa y los números de la demo.
          </p>
          <p className={styles.disclaimer}>
            <Icon name="science" size={18} />
            <span>
              Investigación de escritorio: brief, competencia, riesgos, roadmap y datos de la demo. Las entrevistas con dueños reales están{' '}
              <strong>PENDIENTES</strong>; lo que no tiene fuente es hipótesis.
            </span>
          </p>
        </motion.section>

        {ORDEN_SECCIONES.map((s) => (
          <motion.section key={s} className={styles.group} variants={fadeUp} aria-labelledby={`sec-${s}`}>
            <h2 id={`sec-${s}`} className={cn(styles.sectionLabel, styles[`sec_${s}`])}>
              {SECCIONES[s].titulo}
            </h2>
            <div className={styles.cards}>
              {MAPAS.filter((m) => m.seccion === s).map((m) => (
                <Link key={m.id} to={`/ux/${m.id}`} className={styles.card}>
                  <span className={styles.illoPanel}>
                    <IlustracionMapa id={m.id} />
                  </span>
                  <span className={styles.cardTitle}>{m.titulo}</span>
                  <span className={styles.cardQuestion}>{m.pregunta}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        ))}
      </motion.main>
    </div>
  )
}

/** Detalle de un mapa: la respuesta primero, el mapa y las fuentes. */
export function MapaUxDetalle() {
  const { mapa } = useParams()
  const m = mapaPorId(mapa)
  const back = useBack('/ux')
  if (!m) return <Navigate to="/ux" replace />

  const i = MAPAS.indexOf(m)
  const anterior = MAPAS[i - 1]
  const siguiente = MAPAS[i + 1]
  const Mapa = DETALLE[m.id]

  return (
    <div className={cn('z-page', styles.ux)}>
      <header className={styles.top}>
        <IconButton icon="arrow_back" label="Volver a los mapas" variant="tonal" onClick={back} />
        <Link to="/ux" className={styles.topTitle}>
          Zenity · Mapas de UX
        </Link>
        <span className={styles.topCount}>
          {i + 1} de {MAPAS.length}
        </span>
      </header>

      <motion.main className={cn(styles.wrap, styles.wrapWide)} variants={staggerContainer(0.06)} initial="hidden" animate="show">
        <motion.section className={styles.detailHead} variants={fadeUp}>
          <span className={styles.detailIllo} aria-hidden="true">
            <IlustracionMapa id={m.id} />
          </span>
          <div className={styles.detailHeadText}>
            <span className={cn(styles.sectionLabel, styles[`sec_${m.seccion}`])}>{SECCIONES[m.seccion].titulo}</span>
            <h1 className={styles.h1}>{m.titulo}</h1>
            <p className={styles.cardQuestion}>{m.pregunta}</p>
          </div>
        </motion.section>

        <motion.div className={styles.answer} variants={fadeUp}>
          <span className={styles.answerLabel}>La respuesta</span>
          <p>{m.respuesta}</p>
          <span className={styles.howTo}>
            <Icon name="info" size={16} />
            {m.comoLeer}
          </span>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Mapa />
        </motion.div>

        <motion.footer className={styles.detailFoot} variants={fadeUp}>
          <div className={styles.sources}>
            <span className={styles.eyebrowSmall}>Fuentes</span>
            <div className={styles.chips}>
              {FUENTES_MAPA[m.id].map((f) => (
                <span key={f} className={styles.tag}>
                  {FUENTES_UX[f]}
                </span>
              ))}
            </div>
          </div>
          <nav className={styles.pager} aria-label="Otros mapas">
            {anterior ? (
              <Link to={`/ux/${anterior.id}`} className={styles.pageLink}>
                <Icon name="arrow_back" size={18} />
                <span>
                  <small>Anterior</small>
                  {anterior.titulo}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {siguiente ? (
              <Link to={`/ux/${siguiente.id}`} className={cn(styles.pageLink, styles.pageNext)}>
                <span>
                  <small>Siguiente</small>
                  {siguiente.titulo}
                </span>
                <Icon name="arrow_forward" size={18} />
              </Link>
            ) : (
              <Link to="/ux" className={cn(styles.pageLink, styles.pageNext)}>
                <span>
                  <small>Volver</small>
                  Todos los mapas
                </span>
                <Icon name="apps" size={18} />
              </Link>
            )}
          </nav>
        </motion.footer>
      </motion.main>
    </div>
  )
}
