import { motion } from 'motion/react'
import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LessonCard, Money, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { type Cobranza, diasPromedioCobro, linkWhatsApp, mensajeCobro, TRAMO_LABEL, tonoDe, totalCobranzas } from '../domain/collections'
import { docLabel, tipoLabel } from '../domain/reconciliation'
import { addDays, addMonths, fmtFecha, fmtSolesCorto } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { registrarPromesa, simularPago } from '../state/demoStore'
import { useCobranzas, useZen } from '../state/useZen'

const TONO_LABEL = { AMABLE: 'Tono amable', DIRECTO: 'Tono directo', FIRME: 'Tono firme' } as const

/** F-05 · Cobranza asistida. */
export function Cobrar() {
  const { business, toast } = useApp()
  const { a } = useZen()
  const lista = useCobranzas()
  const [recordar, setRecordar] = useState<{ c: Cobranza; texto: string } | null>(null)
  const [promesa, setPromesa] = useState<{ c: Cobranza; fecha: string; monto: string } | null>(null)

  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Cobrar" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="La cobranza" />
        </div>
      </div>
    )
  }

  const total = totalCobranzas(lista)
  const vencidas = lista.filter((c) => c.diasVencidos > 0)
  const mes = HOY.slice(0, 7)
  const promedio = diasPromedioCobro(a, mes)
  const promedioAnterior = diasPromedioCobro(a, addMonths(mes, -1))

  const pagar = (c: Cobranza) => {
    simularPago(a.business.id, c.comprobante, c.monto)
    toast(`¡${c.comprobante.nombreContraparte} te pagó ${fmtSolesCorto(c.monto)}!`, 'celebration')
  }

  const guardarPromesa = () => {
    if (!promesa) return
    const monto = Number(promesa.monto.replace(/[^\d.]/g, ''))
    if (!monto || !promesa.fecha) return
    registrarPromesa({ comprobanteId: promesa.c.comprobante.id, fecha: promesa.fecha, monto })
    toast(`Promesa registrada: ${fmtSolesCorto(monto)} el ${fmtFecha(promesa.fecha)}. Ya está en tu caja.`, 'event_available')
    setPromesa(null)
  }

  return (
    <div className="z-page">
      <TopBar title="Cobrar" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.heroLabel}>Te deben</span>
          <Money value={total} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            {lista.length} comprobante{lista.length === 1 ? '' : 's'} sin cobrar
            {vencidas.length > 0 && ` · ${vencidas.length} vencido${vencidas.length === 1 ? '' : 's'} por ${fmtSolesCorto(totalCobranzas(vencidas))}`}
          </span>
        </motion.section>

        <motion.div className={styles.grid2} variants={fadeUp}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>
              <Icon name="timer" size={16} /> Días promedio de cobro
            </span>
            <span className={styles.statValue}>{promedio ?? '—'} días</span>
            <span className={styles.muted}>
              {promedioAnterior !== null ? `El mes pasado: ${promedioAnterior} días` : 'Este mes'}
              {promedio !== null && promedioAnterior !== null && (promedio <= promedioAnterior ? ' · mejoraste 👏' : ' · cobras más lento')}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>
              <Icon name="event_available" size={16} /> Promesas de pago
            </span>
            <span className={styles.statValue}>{lista.filter((c) => c.promesa).length}</span>
            <span className={styles.muted}>Aparecen en tu proyección de caja</span>
          </div>
        </motion.div>

        <LessonCard id="L07" />

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Quién te debe" hint="Primero lo más urgente" />
          {lista.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.celebrate}>🙌</span>
              <p className="t-title-m">Nadie te debe</p>
              <p className={styles.muted}>Todas tus facturas y boletas están cobradas.</p>
            </div>
          )}
          <div className={styles.list}>
            {lista.map((c) => (
              <article key={c.comprobante.id} className={styles.card}>
                <div className={styles.row} style={{ padding: 0, background: 'none', minHeight: 0 }}>
                  <span className={styles.rowIcon}>
                    <Icon name="request_quote" size={20} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{c.comprobante.nombreContraparte}</span>
                    <span className={styles.rowSub}>
                      {tipoLabel(c.comprobante)} {docLabel(c.comprobante)} · vence {fmtFecha(c.vencimiento)}
                    </span>
                  </span>
                  <span className={styles.rowEnd}>
                    <Money value={c.monto} className="t-title-m" />
                    <Pill tone={c.tramo === 'POR_VENCER' ? 'neutral' : c.diasVencidos > 30 ? 'baja' : 'media'}>
                      {TRAMO_LABEL[c.tramo]}
                    </Pill>
                  </span>
                </div>
                <p className={styles.muted}>
                  {c.diasVencidos > 0 ? `${c.diasVencidos} días de atraso` : c.diasVencidos === 0 ? 'Vence hoy' : `Vence en ${-c.diasVencidos} días`}
                  {c.promesa && ` · Prometió pagar ${fmtSolesCorto(c.promesa.monto)} el ${fmtFecha(c.promesa.fecha)}`}
                </p>
                <div className={styles.actions}>
                  <Button size="sm" icon="chat" onClick={() => setRecordar({ c, texto: mensajeCobro(c, a.business) })}>
                    Recordar
                  </Button>
                  <Button size="sm" variant="tonal" icon="event_available" onClick={() => setPromesa({ c, fecha: c.promesa?.fecha ?? addDays(HOY, 7), monto: String(c.promesa?.monto ?? c.monto) })}>
                    Registrar promesa
                  </Button>
                  <Button size="sm" variant="text" icon="bolt" onClick={() => pagar(c)}>
                    Simular que pagó
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.muted}>«Simular que pagó» es solo para la demo: inserta un abono de ejemplo y Zenity lo concilia solo.</p>
        </motion.section>
      </motion.div>

      <BottomSheet open={!!recordar} onClose={() => setRecordar(null)} title="Recordar el pago">
        {recordar && (
          <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
            <div className={styles.actions}>
              <Pill tone={tonoDe(recordar.c.diasVencidos) === 'FIRME' ? 'baja' : tonoDe(recordar.c.diasVencidos) === 'DIRECTO' ? 'media' : 'alta'}>
                {TONO_LABEL[tonoDe(recordar.c.diasVencidos)]}
              </Pill>
              <Pill tone="neutral" icon="call">
                {recordar.c.telefono ? `+51 ${recordar.c.telefono.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}` : 'Sin celular registrado'}
              </Pill>
            </div>
            <label className={styles.field}>
              Mensaje (puedes editarlo)
              <textarea className={styles.input} value={recordar.texto} onChange={(e) => setRecordar({ ...recordar, texto: e.target.value })} />
            </label>
            <Button
              size="lg"
              icon="open_in_new"
              disabled={!recordar.c.telefono}
              onClick={() => {
                window.open(linkWhatsApp(recordar.c.telefono!, recordar.texto), '_blank', 'noopener')
                setRecordar(null)
              }}
            >
              Abrir WhatsApp
            </Button>
            <Button
              size="lg"
              variant="text"
              icon="content_copy"
              onClick={() => {
                navigator.clipboard?.writeText(recordar.texto).then(
                  () => toast('Mensaje copiado', 'content_copy'),
                  () => toast('No se pudo copiar', 'error'),
                )
              }}
            >
              Copiar mensaje
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!promesa} onClose={() => setPromesa(null)} title="Registrar promesa de pago">
        {promesa && (
          <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
            <p className={styles.small}>
              {promesa.c.comprobante.nombreContraparte} prometió pagar. La promesa aparece en tu proyección de caja con certeza media.
            </p>
            <label className={styles.field}>
              Fecha
              <input className={styles.input} type="date" min={HOY} value={promesa.fecha} onChange={(e) => setPromesa({ ...promesa, fecha: e.target.value })} />
            </label>
            <label className={styles.field}>
              Monto (S/)
              <input className={styles.input} inputMode="decimal" value={promesa.monto} onChange={(e) => setPromesa({ ...promesa, monto: e.target.value })} />
            </label>
            <Button size="lg" icon="check" onClick={guardarPromesa}>
              Guardar promesa
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
