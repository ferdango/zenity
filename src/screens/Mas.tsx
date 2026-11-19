import { motion } from 'motion/react'
import { useState } from 'react'
import { BusinessButton } from '../components/Business'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LinkRow, Pill, SectionHead } from '../components/zen'
import { ThemeSwitch } from '../components/zen/ThemeSwitch'
import styles from '../components/zen/zen.module.css'
import { businessName } from '../data/businesses'
import { resumenMes } from '../domain/engine'
import { HOY } from '../config/demo'
import { FEATURES } from '../lib/features'
import { fadeUp, staggerContainer } from '../lib/motion'
import { resetDemo } from '../lib/resetDemo'
import { useApp } from '../state/context'
import { useProgreso, useZen } from '../state/useZen'

/** «Más»: las herramientas del día a día, los ajustes y reiniciar la demo. */
export function Mas() {
  const { business, connections } = useApp()
  const { a, demo } = useZen()
  const progreso = useProgreso()
  const [confirmar, setConfirmar] = useState(false)
  const pct = a ? Math.round(resumenMes(a, HOY.slice(0, 7)).conciliado * 100) : null

  return (
    <div className="z-page">
      <TopBar title="Más" subtitle={businessName(business)} hideBack end={<BusinessButton />} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.04)} initial="hidden" animate="show">
        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Tu negocio" />
          <div className={styles.list}>
            <LinkRow
              tone="warning"
              to="/progreso"
              icon="school"
              title="Tu camino"
              sub={`Nivel ${progreso.nivel.numero} · ${progreso.nivel.nombre} · racha de ${progreso.racha} días`}
              end={<Pill tone="media">{progreso.xp} XP</Pill>}
            />
            <LinkRow
              tone="info"
              to="/conexiones"
              icon="link"
              title="Conexiones"
              sub="Bancos, Yape, Plin, APIs y archivos"
              end={<Pill tone="neutral">{connections.length}</Pill>}
            />
            {FEATURES.cierreCaja && (
              <LinkRow tone="positive" to="/cierre-caja" icon="point_of_sale" title="Cierre de caja" sub="Anota el efectivo que contaste hoy" />
            )}
            <LinkRow tone="violet" to="/personal" icon="person" title="Gasto personal" sub="Lo que sacaste del negocio para ti" />
            <LinkRow tone="info" to="/conciliacion?subir=1" icon="upload_file" title="Subir extracto del banco" sub="Excel o CSV de tu banca por internet" />
            <LinkRow tone="violet" to="/chat" icon="auto_awesome" title="Pregúntale a Zenity" sub="Respuestas con los números de tu negocio" />
          </div>
        </motion.section>

        {FEATURES.herramientasAvanzadas && (
          <motion.section className={styles.section} variants={fadeUp}>
            <SectionHead title="Más herramientas" />
            <div className={styles.list}>
              <LinkRow tone="info" to="/conciliacion" icon="fact_check" title="Conciliación" sub="Banco + SUNAT + Yape y POS" end={pct !== null ? <Pill tone={pct >= 90 ? 'alta' : 'media'}>{pct}%</Pill> : undefined} />
              <LinkRow tone="warning" to="/regimen" icon="balance" title="Simulador de régimen" sub="NRUS, RER, RMT o General" />
              <LinkRow tone="positive" to="/aprende" icon="school" title="Aprende" sub="Microlecciones con tus números" />
              <LinkRow tone="violet" to="/datos" icon="database" title="Datos de entrenamiento" sub="Lo que Zenity aprende" />
              <LinkRow tone="warning" to="/metricas" icon="insights" title="Métricas del piloto" sub="Las de defensa y las de cada feature" />
              <LinkRow tone="positive" to="/movimientos/ingresos" icon="trending_up" title="Ingresos" />
              <LinkRow tone="negative" to="/movimientos/egresos" icon="trending_down" title="Egresos" />
              <LinkRow tone="info" to="/resumen" icon="bar_chart" title="Balance" />
              <LinkRow tone="positive" to="/revisado" icon="checklist" title="Revisado por Zenity" />
            </div>
          </motion.section>
        )}

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Ajustes" />
          <div className={styles.list}>
            <LinkRow tone="positive" to="/permisos" icon="verified_user" title="Permisos de datos" sub="Qué lee Zenity de tus cuentas" end={!demo.datos[business.id] ? <Pill tone="media">Pendiente</Pill> : undefined} />
            <LinkRow tone="info" to="/bienvenida?paso=planilla" icon="groups" title="Tu planilla" sub="Trabajadores y sueldos" />
          </div>
          <ThemeSwitch />
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Demo" />
          <div className={styles.list}>
            <button type="button" className={styles.row} data-ripple="" onClick={() => setConfirmar(true)}>
              <span className={styles.rowIcon} style={{ color: 'var(--z-negative)' }}>
                <Icon name="restart_alt" size={20} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Reiniciar demo</span>
                <span className={styles.rowSub}>Vuelve a los datos de ejemplo del 18/11/2026</span>
              </span>
              <span />
            </button>
          </div>
        </motion.section>
      </motion.div>

      <Dialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        icon={<Icon name="restart_alt" size={24} />}
        title="¿Reiniciar la demo?"
        actions={
          <>
            <Button variant="text" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={resetDemo}>
              Reiniciar
            </Button>
          </>
        }
      >
        Se borran las correcciones, reglas, promesas, comentarios y ajustes hechos en este navegador. Los datos vuelven al seed.
      </Dialog>
    </div>
  )
}
