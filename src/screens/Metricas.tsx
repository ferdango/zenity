import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { NoDemoData, Pill, SectionHead } from '../components/zen'
import { TONE_CLASS, type Tone } from '../components/zen/tone'
import styles from '../components/zen/zen.module.css'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { diasPromedioCobro } from '../domain/collections'
import { resumenMes } from '../domain/engine'
import { cobrosTrasRecordatorio, errorProyecciones, sinIntervencion } from '../domain/metricas'
import { fmtFecha, fmtPct } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { useCierres, useZen } from '../state/useZen'

function Fila({ icon, tone, titulo, valor, nota, evento }: { icon: string; tone: Tone; titulo: string; valor: ReactNode; nota: ReactNode; evento: string }) {
  return (
    <div className={`${styles.row} ${styles.rowWrap}`}>
      <span className={`${styles.rowIcon} ${TONE_CLASS[tone]}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{titulo}</span>
        <span className={styles.rowSub}>{nota}</span>
        <span className={styles.rowSub}>
          <Icon name="query_stats" size={14} /> PostHog: <code>{evento}</code>
        </span>
      </span>
      <span className={styles.rowEnd}>
        <span className="t-title-m">{valor}</span>
      </span>
    </div>
  )
}

/**
 * Métricas del piloto: las de defensa del roadmap y las de cada feature, calculadas con lo que pasó
 * en esta demo. En producción salen de los eventos de PostHog (sin montos ni datos personales).
 */
export function Metricas() {
  const { business } = useApp()
  const { a, demo, businessId } = useZen()
  const cierres = useCierres()
  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Métricas del piloto" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="Las métricas del piloto" />
        </div>
      </div>
    )
  }
  const mes = HOY.slice(0, 7)
  const auto = sinIntervencion(a, demo.corrections, mes)
  const correcciones = demo.corrections.filter((c) => c.businessId === businessId)
  const rubros = new Set(demo.corrections.map((c) => c.rubro)).size
  const cobros = cobrosTrasRecordatorio(a, demo.recordatorios)
  const promedio = diasPromedioCobro(a, mes)
  const errores = errorProyecciones(a, demo.proyecciones, HOY)
  const guardadas = demo.proyecciones.filter((p) => p.businessId === businessId).length
  const lecciones = demo.lessonEvents.filter((e) => e.businessId === businessId)
  const mostradas = new Set(lecciones.filter((e) => e.tipo === 'MOSTRADA').map((e) => e.lessonId)).size
  const leidas = new Set(lecciones.filter((e) => e.tipo === 'LEIDA').map((e) => e.lessonId)).size
  const subidos = a.movements.filter((m) => m.importado)
  const subidosConciliados = subidos.filter((m) => a.matchByMovement.has(m.id)).length
  const depositosExplicados = cierres.filter((c) => c.deposito).length

  return (
    <div className="z-page">
      <TopBar title="Métricas del piloto" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.04)} initial="hidden" animate="show">
        <motion.p className={styles.banner} variants={fadeUp}>
          <Icon name="insights" size={20} />
          <span>
            Calculadas con lo que hiciste en esta demo. En el piloto salen de los eventos de PostHog, que nunca llevan montos, nombres ni RUC.
          </span>
        </motion.p>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Métricas de defensa" />
          <div className={styles.list}>
            <Fila
              icon="auto_awesome"
              tone="positive"
              titulo="Movimientos resueltos sin intervención"
              valor={fmtPct(auto.pct)}
              nota={`${auto.auto} de ${auto.total} movimientos de noviembre, sin correcciones ni pendientes`}
              evento="correccion_registrada"
            />
            <Fila
              icon="database"
              tone="violet"
              titulo="Correcciones acumuladas por rubro"
              valor={correcciones.length}
              nota={`${demo.corrections.length} en total, de ${rubros} rubro${rubros === 1 ? '' : 's'}. Se guardan en este navegador; en el piloto, en el servidor`}
              evento="correccion_registrada · regla_creada"
            />
            <Fila
              icon="event_repeat"
              tone="warning"
              titulo="Dueños que vuelven cada semana"
              valor="—"
              nota="PostHog ya registra las visitas por pantalla; el reporte de retención semanal está PENDIENTE de armar"
              evento="$pageview"
            />
          </div>
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Por feature" />
          <div className={styles.list}>
            <Fila
              icon="rule"
              tone="info"
              titulo="Conciliación del mes"
              valor={fmtPct(resumenMes(a, mes).conciliado)}
              nota={subidos.length ? `Del extracto subido: ${subidosConciliados} de ${subidos.length} conciliados` : 'Banco + SUNAT + Yape y POS'}
              evento="conciliacion_vista · extracto_subido"
            />
            <Fila
              icon="mark_chat_read"
              tone="positive"
              titulo="Cobrado tras un recordatorio"
              valor={cobros.pct === null ? '—' : fmtPct(cobros.pct)}
              nota={
                cobros.recordados
                  ? `${cobros.cobrados} de ${cobros.recordados} comprobante${cobros.recordados === 1 ? '' : 's'} recordado${cobros.recordados === 1 ? '' : 's'}${cobros.dias === null ? '' : cobros.dias === 0 ? ', cobrado el mismo día' : `, en ${cobros.dias} días en promedio`}`
                  : `Aún no envías recordatorios. Días promedio de cobro: ${promedio ?? '—'}`
              }
              evento="cobro_recordatorio · cobro_recibido"
            />
            <Fila
              icon="monitoring"
              tone="warning"
              titulo="Error de la proyección de caja (7 días)"
              valor={errores.length ? fmtPct(errores.reduce((s, e) => s + e.error, 0) / errores.length) : '—'}
              nota={
                errores.length
                  ? `Promedio de ${errores.length} proyecciones`
                  : `${guardadas} proyección${guardadas === 1 ? '' : 'es'} guardada${guardadas === 1 ? '' : 's'}: se comparan con el saldo real 7 días después (en la demo la fecha está fija en el ${fmtFecha(HOY)})`
              }
              evento="caja_vista"
            />
            <Fila
              icon="balance"
              tone="violet"
              titulo="Simulaciones de régimen revisadas"
              valor={Object.keys(demo.regimenRevisado).length}
              nota="Negocios que abrieron el simulador"
              evento="regimen_simulado · regimen_revisado"
            />
            <Fila
              icon="point_of_sale"
              tone="positive"
              titulo="Cierres de caja"
              valor={cierres.length}
              nota={cierres.length ? `${depositosExplicados} con su depósito en el banco` : 'Ventas en efectivo del día'}
              evento="cierre_caja_registrado"
            />
            <Fila
              icon="school"
              tone="positive"
              titulo="Microlecciones leídas"
              valor={`${leidas} / ${mostradas}`}
              nota="Leídas de las que se mostraron en contexto"
              evento="leccion_evento"
            />
          </div>
        </motion.section>

        <motion.div variants={fadeUp} className={styles.actions}>
          <Pill tone="neutral" icon="privacy_tip">
            Sin montos ni datos personales en los eventos
          </Pill>
        </motion.div>
      </motion.div>
    </div>
  )
}
