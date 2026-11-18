import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LessonCard, Money, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { type Cobranza, linkWhatsApp, mensajeCobro, TRAMO_LABEL, tonoDe, totalCobranzas } from '../domain/collections'
import { abonosDe } from '../domain/engine'
import { docLabel, tipoLabel } from '../domain/reconciliation'
import { addDays, addMonths, fmtFecha, fmtSolesCorto } from '../domain/util'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { registrarPromesa, registrarRecordatorio, simularPago } from '../state/demoStore'
import { useCobranzas, useZen } from '../state/useZen'

/** Atajos para fechar la promesa sin abrir el calendario. */
const FECHAS_RAPIDAS = [
  { label: 'En 3 días', fecha: () => addDays(HOY, 3) },
  { label: 'En 1 semana', fecha: () => addDays(HOY, 7) },
  { label: 'En 15 días', fecha: () => addDays(HOY, 15) },
  {
    label: 'Fin de mes',
    fecha: () => addDays(`${addMonths(HOY.slice(0, 7), 1)}-01`, -1),
  },
]

const TONO_LABEL = { AMABLE: 'Tono amable', DIRECTO: 'Tono directo', FIRME: 'Tono firme' } as const

/** F-05 · Cobranza asistida. */
export function Cobrar() {
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const lista = useCobranzas()
  const [recordar, setRecordar] = useState<{ c: Cobranza; texto: string } | null>(null)
  const [promesa, setPromesa] = useState<{ c: Cobranza; fecha: string; monto: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

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
  const recordar1 = (c: Cobranza, canal: 'whatsapp' | 'copiado') => registrarRecordatorio(c.comprobante.id, { tono: tonoDe(c.diasVencidos), tramo: c.tramo, canal })

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
      <TopBar title="Cobrar" subtitle={businessName(business)} hideBack />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.heroLabel}>Te deben</span>
          <Money animated value={total} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            {lista.length} comprobante{lista.length === 1 ? '' : 's'} sin cobrar
            {vencidas.length > 0 && ` · ${vencidas.length} vencido${vencidas.length === 1 ? '' : 's'} por ${fmtSolesCorto(totalCobranzas(vencidas))}`}
          </span>
        </motion.section>

        <LessonCard id="L07" />

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Quién te debe" hint="Lo más urgente primero" />
          {lista.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.celebrate}>🙌</span>
              <p className="t-title-m">Nadie te debe</p>
              <p className={styles.muted}>Todas tus facturas y boletas están cobradas.</p>
            </div>
          )}
          <motion.div className={styles.list} layout>
            <AnimatePresence initial={false}>
            {lista.map((c) => (
              <motion.article
                key={c.comprobante.id}
                layout
                exit={{ opacity: 0, x: 80, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.35, ease: ease.emphasized } }}
                style={{ overflow: 'hidden' }}
                className={`${styles.card} ${c.diasVencidos > 30 ? styles.urgent : c.diasVencidos > 0 ? styles.soon : styles.calm}`}
              >
                <div className={styles.row} style={{ padding: 0, background: 'none', minHeight: 0 }}>
                  <span className={`${styles.rowIcon} ${c.diasVencidos > 30 ? styles.toneNegative : c.diasVencidos > 0 ? styles.toneWarning : styles.toneInfo}`}>
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
                  {demo.recordatorios[c.comprobante.id] && ` · Le recordaste el ${fmtFecha(demo.recordatorios[c.comprobante.id])}`}
                </p>
                {(() => {
                  const abonos = abonosDe(a, c.comprobante)
                  return abonos ? (
                    <p className={styles.small}>
                      <Pill tone="info" icon="splitscreen">
                        Pago en partes
                      </Pill>{' '}
                      Ya abonó {fmtSolesCorto(abonos.pagado)} de {fmtSolesCorto(abonos.pagado + c.monto)}: faltan <strong>{fmtSolesCorto(c.monto)}</strong>.
                    </p>
                  ) : null
                })()}
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    icon="chat"
                    onClick={() => {
                      setCopiado(false)
                      setRecordar({ c, texto: mensajeCobro(c, a.business) })
                    }}
                  >
                    Recordar por WhatsApp
                  </Button>
                  <Button size="sm" variant="tonal" icon="event_available" onClick={() => setPromesa({ c, fecha: c.promesa?.fecha ?? addDays(HOY, 7), monto: String(c.promesa?.monto ?? c.monto) })}>
                    Promesa de pago
                  </Button>
                  <Button size="sm" variant="text" icon="bolt" onClick={() => pagar(c)} title="Solo para la demo">
                    Simular pago
                  </Button>
                </div>
              </motion.article>
            ))}
            </AnimatePresence>
          </motion.div>
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
                recordar1(recordar.c, 'whatsapp')
                setRecordar(null)
              }}
            >
              Abrir WhatsApp
            </Button>
            <Button
              size="lg"
              variant="text"
              icon={copiado ? 'check' : 'content_copy'}
              onClick={() => {
                navigator.clipboard?.writeText(recordar.texto).then(
                  () => {
                    recordar1(recordar.c, 'copiado')
                    setCopiado(true)
                    toast('Mensaje copiado', 'content_copy')
                  },
                  () => toast('No se pudo copiar', 'error'),
                )
              }}
            >
              {copiado ? 'Copiado' : 'Copiar mensaje'}
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
            <div className={styles.chipsWrap} role="group" aria-label="Fechas rápidas">
              {FECHAS_RAPIDAS.map((f) => {
                const fecha = f.fecha()
                return (
                  <Chip key={f.label} selected={promesa.fecha === fecha} showCheck onClick={() => setPromesa({ ...promesa, fecha })}>
                    {f.label}
                  </Chip>
                )
              })}
            </div>
            <label className={styles.field}>
              Fecha
              <input className={styles.input} type="date" min={HOY} value={promesa.fecha} onChange={(e) => setPromesa({ ...promesa, fecha: e.target.value })} />
            </label>
            <label className={styles.field}>
              Monto (S/)
              <input className={styles.input} inputMode="decimal" value={promesa.monto} onChange={(e) => setPromesa({ ...promesa, monto: e.target.value })} />
            </label>
            {(() => {
              const monto = Number(promesa.monto.replace(/[^\d.]/g, ''))
              const excede = monto > promesa.c.monto + 0.005
              return (
                <>
                  <div className={styles.chipsWrap} role="group" aria-label="Monto rápido">
                    <Chip selected={monto === promesa.c.monto} showCheck onClick={() => setPromesa({ ...promesa, monto: String(promesa.c.monto) })}>
                      Todo ({fmtSolesCorto(promesa.c.monto)})
                    </Chip>
                    <Chip
                      selected={monto === Math.round(promesa.c.monto / 2)}
                      showCheck
                      onClick={() => setPromesa({ ...promesa, monto: String(Math.round(promesa.c.monto / 2)) })}
                    >
                      La mitad
                    </Chip>
                  </div>
                  {excede && <p className={styles.small} style={{ color: 'var(--z-negative)' }}>Es más de lo que debe ({fmtSolesCorto(promesa.c.monto)}).</p>}
                  <Button size="lg" icon="check" onClick={guardarPromesa} disabled={!monto || !promesa.fecha || excede}>
                    Guardar promesa
                  </Button>
                </>
              )
            })()}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
