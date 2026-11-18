import { motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { CATEGORIAS } from '../config/categories'
import { SEED_IDS } from '../data/seed'
import { tituloMovimiento } from '../data/demoLedger'
import { nivel, type Nivel } from '../domain/categorization'
import { fmtFecha } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { analysisFor } from '../state/demoStore'
import { useZen } from '../state/useZen'

const ORIGEN_LABEL = { APP: 'App', WHATSAPP: 'WhatsApp', CONTADOR: 'Contador' } as const

/** «Datos de entrenamiento»: cada corrección es un dato propio de Zenity (el foso). */
export function DatosEntrenamiento() {
  const { demo } = useZen()
  const [dev, setDev] = useState(false)
  const correcciones = [...demo.corrections].reverse()
  const porRubro = new Map<string, number>()
  for (const c of demo.corrections) porRubro.set(c.rubro, (porRubro.get(c.rubro) ?? 0) + 1)
  const conRegla = demo.corrections.filter((c) => c.creoRegla).length

  // Calibración: % de clasificaciones de cada nivel que el usuario cambió
  const calibracion = (['Alta', 'Media', 'Baja'] as Nivel[]).map((n) => {
    let total = 0
    for (const id of SEED_IDS) {
      const a = analysisFor(id, demo)
      if (!a) continue
      for (const c of a.classifications.values()) if (c.fuente !== 'MANUAL' && nivel(c.confianza) === n) total++
    }
    const vistas = demo.corrections.filter((c) => nivel(c.confianzaSugerida) === n)
    const cambiadas = vistas.filter((c) => c.elegida !== c.sugerida).length
    return { n, total: total + vistas.length, cambiadas, pct: total + vistas.length ? cambiadas / (total + vistas.length) : 0 }
  })
  const alerta = calibracion.find((c) => c.n === 'Alta')!.pct > 0.05

  return (
    <div className="z-page">
      <TopBar title="Datos de entrenamiento" subtitle="Acerca de los datos" backTo="/mas" />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.p className={styles.banner} variants={fadeUp}>
          <Icon name="database" size={20} />
          <span>
            Cada vez que confirmas o corriges una categoría, Zenity aprende. Estas correcciones son datos propios, por rubro, que ningún banco ni software contable
            tiene: con ellos la clasificación mejora para todos los negocios del mismo rubro.
          </span>
        </motion.p>

        <motion.div className={styles.grid2} variants={fadeUp}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Correcciones acumuladas</span>
            <span className={styles.statValue}>{demo.corrections.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Crearon una regla</span>
            <span className={styles.statValue}>{conRegla}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Reglas activas</span>
            <span className={styles.statValue}>{demo.rules.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rubros</span>
            <span className={styles.statValue}>{porRubro.size}</span>
          </div>
        </motion.div>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Total acumulado por rubro" />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rubro</th>
                  <th className={styles.num}>Correcciones</th>
                </tr>
              </thead>
              <tbody>
                {porRubro.size === 0 && (
                  <tr>
                    <td colSpan={2} className={styles.muted}>
                      Todavía no hay correcciones. Revisa una tarjeta en «Por revisar».
                    </td>
                  </tr>
                )}
                {[...porRubro.entries()].map(([rubro, n]) => (
                  <tr key={rubro}>
                    <td>{rubro}</td>
                    <td className={styles.num}>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Correcciones" hint={`${correcciones.length}`} />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Sugerida</th>
                  <th>Elegida</th>
                  <th>Origen</th>
                  <th>Regla</th>
                </tr>
              </thead>
              <tbody>
                {correcciones.map((c) => {
                  const m = analysisFor(c.businessId, demo)?.movementsById.get(c.movementId)
                  return (
                    <tr key={c.id} className={c.elegida !== c.sugerida ? undefined : styles.highlightRow}>
                      <td>{fmtFecha(c.ts.slice(0, 10))}</td>
                      <td className={styles.wrapCell}>{m ? tituloMovimiento(m) : c.movementId}</td>
                      <td>
                        {CATEGORIAS[c.sugerida].label} <span className={styles.muted}>({Math.round(c.confianzaSugerida * 100)}%)</span>
                      </td>
                      <td>{CATEGORIAS[c.elegida].label}</td>
                      <td>{ORIGEN_LABEL[c.origen]}</td>
                      <td>{c.creoRegla ? <Pill tone="info">Sí</Pill> : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.div variants={fadeUp} style={{ display: 'grid', justifyItems: 'start', gap: 10 }}>
          <Button variant="text" size="sm" icon="code" onClick={() => setDev(!dev)}>
            {dev ? 'Ocultar vista de desarrollo' : 'Vista de desarrollo: calibración'}
          </Button>
          {dev && (
            <div className={styles.card} style={{ width: '100%' }}>
              <SectionHead title="Calibración de la confianza" hint="Oculta en la demo" />
              {alerta && (
                <p className={styles.bannerDanger}>
                  <Icon name="warning" size={20} />
                  <span>Las sugerencias con confianza «Alta» se corrigen más del 5%: hay que recalibrar el umbral.</span>
                </p>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nivel</th>
                      <th className={styles.num}>Clasificadas</th>
                      <th className={styles.num}>Corregidas</th>
                      <th className={styles.num}>% corregidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibracion.map((c) => (
                      <tr key={c.n}>
                        <td>{c.n}</td>
                        <td className={styles.num}>{c.total}</td>
                        <td className={styles.num}>{c.cambiadas}</td>
                        <td className={styles.num}>{(c.pct * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
