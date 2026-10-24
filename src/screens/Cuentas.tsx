import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Amount } from '../components/Amount'
import { BusinessButton } from '../components/Business'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { InsightList, SectionHeader } from '../components/Insights'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { businessName } from '../data/businesses'
import {
  contrapartesLabel,
  type Corte,
  corte,
  type CuentaTipo,
  cuentasInsights,
  estado,
  type Pendiente,
  plural,
  type Saldo,
  TRAMOS,
} from '../data/cuentas'
import { formatDayMonth, formatDayMonthShort } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useCuentas } from '../lib/useCuentas'
import { useApp } from '../state/context'
import styles from './Cuentas.module.css'

const TABS: Array<{ id: CuentaTipo; label: string }> = [
  { id: 'cobrar', label: 'Por cobrar' },
  { id: 'pagar', label: 'Por pagar' },
]

const COPY: Record<CuentaTipo, { title: string; hero: string; list: string; ask: string; empty: string }> = {
  cobrar: { title: 'Por cobrar', hero: 'Te deben', list: 'Quién te debe', ask: '¿Cuánto me deben?', empty: 'Nadie te debe' },
  pagar: { title: 'Por pagar', hero: 'Debes', list: 'A quién le debes', ask: '¿Cuánto debo?', empty: 'No debes nada' },
}

function isTipo(value: string | undefined): value is CuentaTipo {
  return value === 'cobrar' || value === 'pagar'
}

/** "Clínica Santa Rosa S.A.C." → "CS" */
function initials(nombre: string) {
  return nombre
    .split(' ')
    .filter((word) => /^\p{Lu}/u.test(word) && !word.includes('.'))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}

/** Cuentas por cobrar y por pagar: cuánto te deben, cuánto debes, a quién y desde cuándo. */
export function Cuentas() {
  const { tipo } = useParams()
  const navigate = useNavigate()
  const { periodKey, ledger, business } = useApp()
  const cuentas = useCuentas()
  const [openId, setOpenId] = useState<string | null>(null)

  if (!isTipo(tipo)) return <Navigate to="/cuentas/cobrar" replace />

  const cobrar = corte(cuentas, 'cobrar', periodKey)
  const pagar = corte(cuentas, 'pagar', periodKey)
  const c = tipo === 'cobrar' ? cobrar : pagar
  const copy = COPY[tipo]
  const insights = cuentasInsights(tipo, cobrar, pagar)
  const porVencer = c.items.length - c.vencidas

  const changeTab = (next: CuentaTipo) => {
    setOpenId(null)
    navigate(`/cuentas/${next}`, { replace: true })
  }

  return (
    <div className="z-page">
      <TopBar title={copy.title} subtitle={businessName(business)} end={<BusinessButton />} />
      {ledger.empty ? (
        <div className="z-container z-gutter">
          <EmptyState
            title={`${businessName(business)} aún no tiene cuentas`}
            description="Conecta una cuenta de este RUC para saber cuánto te deben y cuánto debes."
            action={
              <Button icon="add" to="/conexiones/nueva">
                Conectar cuenta
              </Button>
            }
          />
        </div>
      ) : (
        <div className="z-container">
          <div className={styles.top}>
            <SegmentedTabs tabs={TABS} value={tipo} onChange={changeTab} label="Cuentas por cobrar o por pagar" stretch />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tipo}
              className={styles.content}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.decelerate } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <motion.div className={styles.content} variants={staggerContainer(0.06)} initial="hidden" animate="show">
                <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
                  <span className={styles.heroLabel}>{copy.hero}</span>
                  <Amount value={c.total} className={styles.heroAmount} />
                  <span className={styles.heroMeta}>
                    {c.total > 0
                      ? `${plural(c.items.length, 'factura')} de ${contrapartesLabel(c)} · al ${formatDayMonth(c.fecha)}`
                      : `${copy.empty} al ${formatDayMonth(c.fecha)}`}
                  </span>
                  {c.total > 0 && <AgingBar corte={c} />}
                </motion.section>

                <motion.div className={styles.split} variants={fadeUp}>
                  <div className={styles.splitItem} data-tone={c.vencido > 0 ? 'negative' : 'positive'}>
                    <span className={styles.splitLabel}>
                      <Icon name={c.vencido > 0 ? 'warning' : 'check_circle'} size={16} className={styles.splitIcon} />
                      Vencido
                    </span>
                    <Amount value={c.vencido} className={styles.splitValue} />
                    <span className={styles.splitCaption}>
                      {c.vencidas > 0 ? plural(c.vencidas, 'factura') : 'Nada vencido'}
                    </span>
                  </div>
                  <div className={styles.splitItem}>
                    <span className={styles.splitLabel}>
                      <Icon name="calendar_month" size={16} className={styles.splitIcon} />
                      Por vencer
                    </span>
                    <Amount value={c.porVencer} className={styles.splitValue} />
                    <span className={styles.splitCaption}>{plural(porVencer, 'factura')}</span>
                  </div>
                </motion.div>
              </motion.div>

              {insights.length > 0 && <InsightList insights={insights} title="Qué hacer hoy" />}

              {c.saldos.length > 0 && (
                <>
                  <SectionHeader title={copy.list} />
                  <ul className={styles.list}>
                    {c.saldos.map((saldo) => (
                      <SaldoRow
                        key={saldo.contraparte.ruc}
                        saldo={saldo}
                        docs={c.items.filter((d) => d.contraparte.ruc === saldo.contraparte.ruc)}
                        open={openId === saldo.contraparte.ruc}
                        onToggle={() => setOpenId(openId === saldo.contraparte.ruc ? null : saldo.contraparte.ruc)}
                      />
                    ))}
                  </ul>
                </>
              )}

              <div className={styles.ask}>
                <Button variant="tonal" icon="auto_awesome" to={`/chat?q=${encodeURIComponent(copy.ask)}`}>
                  Pregúntale a Zenity
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/** Antigüedad de lo pendiente: por vencer, 1 a 30, 31 a 60 y más de 60 días de atraso. */
function AgingBar({ corte: c }: { corte: Corte }) {
  const segments = TRAMOS.filter((t) => c.tramos[t.id] > 0)
  return (
    <figure className={styles.aging} aria-label="Antigüedad de las facturas">
      <div className={styles.agingTrack}>
        {segments.map((t, i) => (
          <motion.span
            key={t.id}
            className={styles.agingSegment}
            data-tramo={t.id}
            initial={{ width: 0 }}
            animate={{ width: `${(c.tramos[t.id] / c.total) * 100}%` }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: ease.emphasized }}
          />
        ))}
      </div>
      <figcaption className={styles.legend}>
        {segments.map((t) => (
          <span key={t.id} className={styles.legendItem}>
            <span className={styles.legendDot} data-tramo={t.id} aria-hidden />
            {t.label}
            <Amount value={c.tramos[t.id]} animate={false} className={styles.legendValue} />
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

/** Cliente o proveedor con lo que se le debe y sus facturas pendientes. */
function SaldoRow({ saldo, docs, open, onToggle }: { saldo: Saldo; docs: Pendiente[]; open: boolean; onToggle: () => void }) {
  const [first] = docs
  const status = estado(first.atraso, first.vence)
  const panelId = `saldo-${saldo.contraparte.ruc}`

  return (
    <li className={styles.saldo} data-open={open}>
      <button type="button" data-ripple="" className={styles.saldoHead} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className={styles.avatar} data-tone={status.tone} aria-hidden>
          {initials(saldo.contraparte.nombre)}
        </span>
        <span className={styles.saldoText}>
          <span className={styles.saldoName}>{saldo.contraparte.nombre}</span>
          <span className={styles.saldoSub}>{plural(saldo.documentos, 'factura')}</span>
          <span className={styles.badge} data-tone={status.tone}>
            {status.label}
          </span>
        </span>
        <span className={styles.saldoEnd}>
          <Amount value={saldo.total} animate={false} className={styles.saldoAmount} />
          <Icon name="expand_more" size={22} className={styles.chevron} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            className={styles.docs}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.4, ease: ease.emphasized } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: ease.emphasized } }}
          >
            {docs.map((doc) => {
              const docStatus = estado(doc.atraso, doc.vence)
              return (
                <li key={doc.id} className={styles.doc}>
                  <Icon name={doc.icon} size={20} className={styles.docIcon} />
                  <span className={styles.docText}>
                    <span className={styles.docTitle}>
                      {doc.comprobante} {doc.numero}
                    </span>
                    <span className={styles.docSub}>
                      {doc.glosa} · emitida el {formatDayMonthShort(doc.emision)}
                    </span>
                    <span className={styles.badge} data-tone={docStatus.tone}>
                      {docStatus.label}
                    </span>
                  </span>
                  <Amount value={doc.monto} animate={false} className={styles.docAmount} />
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}
