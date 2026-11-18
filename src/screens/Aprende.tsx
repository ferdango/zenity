import { motion } from 'motion/react'
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LessonCard, NoDemoData, Pill, ProgressBar, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { LESSON_IDS } from '../config/lessons'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { resumenMes } from '../domain/engine'
import { contenido } from '../domain/lessons'
import { progresoReto, RETO_DIAS } from '../domain/personal'
import type { LessonId } from '../domain/types'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { useCobranzas, useLecciones, useZen } from '../state/useZen'

/** Microlecciones: la lista de lecciones (vistas y pendientes) y «Mi progreso». */
export function Aprende() {
  const { business } = useApp()
  const { a, demo } = useZen()
  const lecciones = useLecciones()
  const cobranzas = useCobranzas()
  const [abierta, setAbierta] = useState<LessonId | null>(null)

  if (!a || !lecciones) {
    return (
      <div className="z-page">
        <TopBar title="Aprende" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="Aprende" />
        </div>
      </div>
    )
  }

  const id = a.business.id
  const eventos = demo.lessonEvents.filter((e) => e.businessId === id)
  const estado = (l: LessonId) =>
    eventos.some((e) => e.lessonId === l && e.tipo === 'ACCION')
      ? 'Aplicada'
      : eventos.some((e) => e.lessonId === l && e.tipo === 'LEIDA')
        ? 'Leída'
        : lecciones.activas.includes(l)
          ? 'Nueva'
          : 'Pendiente'
  const reto = progresoReto(a, demo.retoInicio[id] ?? `${HOY.slice(0, 7)}-01`, HOY)
  const pasos = [
    { label: 'Separé mis cuentas 30 días', hecho: reto.dias >= RETO_DIAS, detalle: `${reto.dias} de ${RETO_DIAS} días` },
    { label: 'Me pago un sueldo fijo de dueño', hecho: !!a.business.sueldoDueno },
    { label: 'Cobré mis facturas vencidas', hecho: !cobranzas.some((c) => c.diasVencidos > 30 && !c.promesa) },
    { label: 'Revisé mi régimen tributario', hecho: !!demo.regimenRevisado[id] },
    { label: 'Dejé «Por revisar» en cero', hecho: a.porRevisar.length === 0 },
    { label: 'Mi mes va 90% conciliado o más', hecho: resumenMes(a, HOY.slice(0, 7)).conciliado >= 0.9 },
  ]
  const hechos = pasos.filter((p) => p.hecho).length
  const metricas = {
    mostradas: new Set(eventos.filter((e) => e.tipo === 'MOSTRADA').map((e) => e.lessonId)).size,
    leidas: new Set(eventos.filter((e) => e.tipo === 'LEIDA').map((e) => e.lessonId)).size,
    acciones: eventos.filter((e) => e.tipo === 'ACCION').length,
  }

  return (
    <div className="z-page">
      <TopBar title="Aprende" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp}>
          <span className={styles.heroLabel}>Mi progreso</span>
          <span className={styles.heroAmount}>
            {hechos} de {pasos.length} pasos
          </span>
          <ProgressBar value={hechos / pasos.length} label="Mi progreso" />
          <span className={styles.heroMeta}>Aprendes finanzas con tus propios números, en el momento en que te pasa algo.</span>
        </motion.section>

        <motion.div className={styles.list} variants={fadeUp}>
          {pasos.map((p) => (
            <div key={p.label} className={styles.row}>
              <span className={styles.rowIcon} style={p.hecho ? { background: 'var(--z-positive-container)', color: 'var(--z-positive)' } : undefined}>
                <Icon name={p.hecho ? 'check' : 'radio_button_unchecked'} size={20} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{p.label}</span>
                {p.detalle && <span className={styles.rowSub}>{p.detalle}</span>}
              </span>
              <span />
            </div>
          ))}
        </motion.div>

        <motion.div className={styles.card} variants={fadeUp} style={{ borderStyle: 'dashed' }}>
          <div className={styles.sectionHead} style={{ padding: 0 }}>
            <span className="t-title-m">Índice Zenity de salud financiera</span>
            <Pill tone="info">Próximamente</Pill>
          </div>
          <p className={styles.muted}>Un puntaje de 0 a 100 con tu orden, tu caja y tu cobranza. Aquí verás cómo mejora mes a mes.</p>
        </motion.div>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Lecciones" hint={`${metricas.leidas} leídas · ${metricas.mostradas} vistas · ${metricas.acciones} acciones`} />
          <div className={styles.list}>
            {LESSON_IDS.map((l) => {
              const c = contenido(l, lecciones.context)
              const st = estado(l)
              return abierta === l ? (
                <div key={l} style={{ display: 'grid', gap: 6 }}>
                  <LessonCard id={l} force />
                  <button type="button" className={styles.why} onClick={() => setAbierta(null)} style={{ justifySelf: 'end' }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <button key={l} type="button" className={styles.row} onClick={() => setAbierta(l)} data-ripple="">
                  <span className={styles.rowIcon}>
                    <Icon name={st === 'Pendiente' ? 'lock' : 'school'} size={20} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{c.titulo}</span>
                    <span className={styles.rowSub}>{c.disparador}</span>
                  </span>
                  <Pill tone={st === 'Nueva' ? 'info' : st === 'Pendiente' ? 'neutral' : 'alta'}>{st}</Pill>
                </button>
              )
            })}
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
