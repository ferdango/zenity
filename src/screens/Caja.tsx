import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { CashChart } from '../components/zen/CashChart'
import { LessonCard, Money, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { REGIMEN_LABORAL_LABEL } from '../domain/calendar'
import { textoAlerta } from '../domain/cashflow'
import type { CashEvent, Certeza, FuenteCaja, RegimenLaboral } from '../domain/types'
import { addDays, diffDays, fmtDiaMes, fmtSolesCorto } from '../domain/util'
import { HOY } from '../config/demo'
import { track } from '../lib/analytics'
import { businessName } from '../data/businesses'
import { MONTHS, MONTHS_SHORT } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { guardarProyeccion, setOverride } from '../state/demoStore'
import { useCaja, useZen } from '../state/useZen'

type Dias = '30' | '60' | '90'

const FUENTE_LABEL: Record<FuenteCaja, string> = {
  POR_COBRAR: 'Por cobrar',
  PROMESA: 'Promesa de pago',
  VENTAS_ESTIMADAS: 'Ventas estimadas',
  POR_PAGAR: 'Por pagar',
  RECURRENTE: 'Pago recurrente',
  PLANILLA: 'Planilla',
  IMPUESTOS: 'Impuestos',
  GRATIFICACION: 'Gratificación',
  CTS: 'CTS',
  CREDITO: 'Crédito BCP',
  EFECTIVO: 'Efectivo en caja',
}

const CERTEZA_TONE: Record<Certeza, 'alta' | 'media' | 'baja'> = { ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' }
const CERTEZA_LABEL: Record<Certeza, string> = { ALTA: 'Seguro', MEDIA: 'Probable', BAJA: 'Incierto' }

/** Eventos que se muestran sin abrir «Ver todos»: los de mayor monto. */
const EVENTOS_VISIBLES = 6

/** F-06 · Proyección de caja 30/60/90. */
export function Caja() {
  const { business } = useApp()
  const { a } = useZen()
  const [dias, setDias] = useState<Dias>('60')
  const [ajustes, setAjustes] = useState(false)
  const [colchon, setColchon] = useState('')
  const [verTodo, setVerTodo] = useState(false)
  const caja = useCaja(Number(dias))
  const businessId = a?.business.id
  const alerta = caja?.alerta
  // Métricas: la vista de caja (sin montos) y la proyección a 7 días para medir su error después
  useEffect(() => {
    if (!businessId || !caja) return
    track('caja_vista', { horizonte: Number(dias), alerta: !!alerta, dias_a_alerta: alerta ? diffDays(HOY, alerta.fecha) : -1 })
    const punto = caja.serie.find((p) => p.fecha === addDays(HOY, 7))
    if (punto) guardarProyeccion(businessId, punto.base)
  }, [businessId, dias]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!a || !caja) {
    return (
      <div className="z-page">
        <TopBar title="Caja" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="La proyección de caja" />
        </div>
      </div>
    )
  }

  const eventos = caja.eventos
  // Por defecto solo los más grandes (lo que mueve la caja); el resto con «Ver todos»
  const grandes = new Set([...eventos].sort((x, y) => Math.abs(y.monto) - Math.abs(x.monto)).slice(0, EVENTOS_VISIBLES))
  const visibles = verTodo ? eventos : eventos.filter((e) => grandes.has(e))
  // Eventos agrupados por mes: «Noviembre 2026», «Diciembre 2026»…
  const grupos = new Map<string, CashEvent[]>()
  for (const e of visibles) {
    const mes = `${MONTHS[Number(e.fecha.slice(5, 7)) - 1]} ${e.fecha.slice(0, 4)}`
    grupos.set(mes, [...(grupos.get(mes) ?? []), e])
  }
  const meses = [...grupos.entries()]

  return (
    <div className="z-page">
      <TopBar
        title="Caja"
        subtitle={businessName(business)}
        hideBack
        end={
          <Button size="sm" variant="text" icon="tune" onClick={() => { setColchon(String(Math.round(caja.colchon))); setAjustes(true) }}>
            Ajustes
          </Button>
        }
      />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <SegmentedTabs<Dias>
            label="Horizonte"
            stretch
            value={dias}
            onChange={setDias}
            tabs={[
              { id: '30', label: '30 días' },
              { id: '60', label: '60 días' },
              { id: '90', label: '90 días' },
            ]}
          />
        </motion.div>

        {caja.alerta ? (
          <motion.div className={caja.alerta.cruza === 'CERO' ? styles.bannerDanger : styles.bannerWarn} variants={fadeUp} role="alert">
            <Icon name="warning" size={22} />
            <span style={{ display: 'grid', gap: 4 }}>
              <strong className={styles.bannerTitle}>{textoAlerta(caja.alerta)}</strong>
              <span>
                {caja.alerta.cruza === 'CERO'
                  ? 'Te quedarías sin plata para pagar a tiempo.'
                  : `Queda por debajo de tu colchón mínimo de ${fmtSolesCorto(Math.round(caja.colchon))} (una semana de egresos).`}
              </span>
            </span>
          </motion.div>
        ) : (
          <motion.p className={styles.banner} variants={fadeUp}>
            <Icon name="verified" size={20} />
            <span>
              <strong className={styles.bannerTitle}>Tu caja no baja del colchón en los próximos {dias} días</strong>
              Mira abajo los pagos grandes que vienen.
            </span>
          </motion.p>
        )}

        {caja.alerta && (
          <motion.section className={styles.section} variants={fadeUp}>
            <SectionHead title="Qué puedes hacer" />
            <div className={styles.list}>
              {caja.acciones.filter((ac) => !ac.disabled).map((ac) =>
                ac.to ? (
                  <Link key={ac.id} to={ac.to} className={`${styles.row} ${styles.rowWrap}`} data-ripple="">
                    <span className={styles.rowIcon}>
                      <Icon name={ac.id === 'capital' ? 'credit_score' : 'payments'} size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{ac.texto}</span>
                    </span>
                    <Icon name="chevron_right" size={20} />
                  </Link>
                ) : (
                  <div key={ac.id} className={`${styles.row} ${styles.rowWrap}`} aria-disabled={ac.disabled}>
                    <span className={styles.rowIcon}>
                      <Icon name={ac.id === 'mover' ? 'event_repeat' : 'account_balance'} size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle} style={ac.disabled ? { color: 'var(--z-on-surface-low)' } : undefined}>
                        {ac.texto}
                      </span>
                      {ac.id === 'mover' && <span className={styles.rowSub}>Solo es una sugerencia: coordina con tu proveedor.</span>}
                    </span>
                    {ac.disabled && <Pill tone="neutral">Próximamente</Pill>}
                  </div>
                ),
              )}
            </div>
          </motion.section>
        )}

        <motion.div className={`${styles.card} ${styles.chartHero}`} variants={fadeUp}>
          <div className={styles.grid2}>
            <div style={{ display: 'grid', gap: 2 }}>
              <span className={styles.muted}>Saldo de hoy</span>
              <Money value={caja.saldoInicial} className="t-title-l" />
            </div>
            <div style={{ display: 'grid', gap: 2 }}>
              <span className={styles.muted}>Punto más bajo ({fmtDiaMes(caja.minimo.fecha)})</span>
              <Money value={caja.minimo.base} className="t-title-l" />
            </div>
          </div>
          <CashChart serie={caja.serie} colchon={caja.colchon} alerta={caja.alerta?.fecha} />
        </motion.div>

        <LessonCard id="L08" />

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead
            title="Lo que viene"
            action={
              eventos.length > EVENTOS_VISIBLES ? (
                <Button size="sm" variant="text" onClick={() => setVerTodo(!verTodo)}>
                  {verTodo ? 'Ver menos' : `Ver los ${eventos.length}`}
                </Button>
              ) : undefined
            }
          />
          {meses.map(([mes, lista]) => (
            <div key={mes} className={styles.list}>
              <p className={styles.monthHead}>{mes}</p>
              {lista.map((e, i) => (
                <div key={`${e.fecha}-${i}`} className={`${styles.row} ${styles.rowWrap}`}>
                  <span className={styles.eventDate}>
                    <span className={styles.eventDay}>{e.fecha.slice(8, 10)}</span>
                    <span className={styles.eventMonth}>{MONTHS_SHORT[Number(e.fecha.slice(5, 7)) - 1]}</span>
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{e.concepto}</span>
                    <span className={styles.rowSub}>{FUENTE_LABEL[e.fuente]}</span>
                  </span>
                  <span className={styles.rowEnd}>
                    <Money value={e.monto} sign="always" className={e.monto > 0 ? styles.amountPos : undefined} />
                    {e.certeza !== 'ALTA' && <Pill tone={CERTEZA_TONE[e.certeza]}>{CERTEZA_LABEL[e.certeza]}</Pill>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </motion.section>
      </motion.div>

      <BottomSheet open={ajustes} onClose={() => setAjustes(false)} title="Ajustes de caja">
        <div style={{ display: 'grid', gap: 14, padding: '0 0 16px' }}>
          <label className={styles.field}>
            Régimen laboral (cambia la gratificación y la CTS)
            <select
              className={styles.select}
              style={{ height: 44 }}
              value={a.business.regimenLaboral}
              onChange={(e) => setOverride(a.business.id, { regimenLaboral: e.target.value as RegimenLaboral })}
            >
              {(Object.keys(REGIMEN_LABORAL_LABEL) as RegimenLaboral[]).map((r) => (
                <option key={r} value={r}>
                  {REGIMEN_LABORAL_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Colchón mínimo de caja (S/)
            <input className={styles.input} inputMode="decimal" value={colchon} onChange={(e) => setColchon(e.target.value)} />
          </label>
          <p className={styles.muted}>Por defecto es una semana de tus egresos promedio.</p>
          <Link to="/bienvenida?paso=planilla" className={styles.row} data-ripple="">
            <span className={`${styles.rowIcon} ${styles.toneInfo}`}>
              <Icon name="groups" size={20} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Tu planilla</span>
              <span className={styles.rowSub}>
                {a.business.trabajadores} trabajador{a.business.trabajadores === 1 ? '' : 'es'} · {REGIMEN_LABORAL_LABEL[a.business.regimenLaboral]}
              </span>
            </span>
            <Icon name="chevron_right" size={20} />
          </Link>
          <Button
            size="lg"
            icon="check"
            onClick={() => {
              const v = Number(colchon.replace(/[^\d.]/g, ''))
              if (v > 0) setOverride(a.business.id, { colchonCaja: v })
              setAjustes(false)
            }}
          >
            Guardar
          </Button>
          <Button size="lg" variant="text" onClick={() => { setOverride(a.business.id, { colchonCaja: undefined, regimenLaboral: undefined }); setAjustes(false) }}>
            Volver a los valores de ejemplo
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
