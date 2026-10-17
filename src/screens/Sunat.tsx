import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useDeferredValue, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Amount } from '../components/Amount'
import { BarChart } from '../components/BarChart'
import { BusinessButton } from '../components/Business'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { InsightList } from '../components/Insights'
import { MetricCard } from '../components/Metrics'
import { PeriodPicker } from '../components/PeriodPicker'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { IgvBar, SireRecordRow, TaxLine } from '../components/Sire'
import { TopBar } from '../components/TopBar'
import { businessName } from '../data/businesses'
import { calendarPeriod, periodLabel, periodShort } from '../data/selectors'
import {
  formatDue,
  noDeducibles,
  previousSirePeriod,
  type Regimen,
  REGIMENES,
  renta,
  SIN_CREDITO,
  type Sire,
  type SireBook,
  type SirePeriod,
  sireInsights,
  sirePeriod,
  vencimiento,
} from '../data/sire'
import { formatCompactMoney, MONTHS } from '../lib/format'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useSire } from '../lib/useSire'
import { useApp } from '../state/context'
import styles from './Sunat.module.css'

type Tab = 'balance' | 'comprobantes' | 'impuestos'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'balance', label: 'Balance' },
  { id: 'comprobantes', label: 'Comprobantes' },
  { id: 'impuestos', label: 'Impuestos' },
]

function isTab(value: string | undefined): value is Tab {
  return value === 'balance' || value === 'comprobantes' || value === 'impuestos'
}

const ASK_IGV = `/chat?q=${encodeURIComponent('¿Cuánto pago de IGV este mes?')}`

/** Módulo SUNAT: solo lo que SUNAT ve en el SIRE (RVIE y RCE), su balance y los impuestos del mes. */
export function Sunat() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const { periodKey, business } = useApp()
  const sire = useSire()

  if (!isTab(tab)) return <Navigate to="/sunat/balance" replace />

  const period = sirePeriod(sire, periodKey)
  const calendar = calendarPeriod(period.key)
  const month = periodLabel(calendar)

  return (
    <div className="z-page">
      <TopBar title="SUNAT" subtitle={businessName(business)} end={<BusinessButton />} />
      <div className="z-container">
        <section className={styles.sync} aria-label="Conexión con el SIRE">
          <div className={styles.syncMain}>
            <span className={styles.syncIcon}>
              <Icon name="account_balance" size={24} />
            </span>
            <span className={styles.syncText}>
              <strong>SIRE · RUC {business.ruc}</strong>
              <span>
                <span className="fx-live-dot" aria-hidden />
                Sincronizado con SUNAT hoy
              </span>
            </span>
            <span className={styles.regimen} title={REGIMENES[sire.regimen].label}>
              {REGIMENES[sire.regimen].short}
            </span>
          </div>
          <p className={styles.status} data-pending={period.propuesta}>
            <Icon name={period.propuesta ? 'pending' : 'task_alt'} size={18} />
            {period.propuesta
              ? `Propuesta de ${month.toLowerCase()} pendiente de aceptar en SUNAT`
              : `Registros de ${month.toLowerCase()} generados en el SIRE`}
          </p>
        </section>

        <div className={styles.controls}>
          <PeriodPicker />
          <SegmentedTabs
            tabs={TABS}
            value={tab}
            onChange={(next) => navigate(`/sunat/${next}`, { replace: true })}
            label="Secciones de SUNAT"
            stretch
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className={styles.content}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.decelerate } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {tab === 'balance' && <BalanceTab sire={sire} period={period} month={month} year={calendar.year} />}
            {tab === 'comprobantes' && <RecordsTab period={period} month={month} />}
            {tab === 'impuestos' && <TaxesTab sire={sire} period={period} month={month} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Balance ─────────────────────────────────────────────────── */

type Series = 'balance' | 'ventas' | 'compras'
const SERIES_LABELS: Record<Series, string> = { balance: 'Balance SIRE', ventas: 'Ventas', compras: 'Compras' }

function seriesValue(period: SirePeriod, series: Series) {
  if (series === 'ventas') return period.totalVentas.total
  if (series === 'compras') return period.totalCompras.total
  return period.balance
}

function BalanceTab({ sire, period, month, year }: { sire: Sire; period: SirePeriod; month: string; year: number }) {
  const { setPeriodKey, ledger, business } = useApp()
  const [series, setSeries] = useState<Series>('balance')
  const selected = Math.max(0, sire.periods.findIndex((p) => p.key === period.key))

  return (
    <motion.div className={styles.stack} variants={staggerContainer(0.06)} initial="hidden" animate="show">
      <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
        <span className={styles.heroLabel}>Balance SIRE</span>
        <Amount value={period.balance} sign="always" className={styles.heroAmount} />
        <span className={styles.heroMeta}>
          {month} {year} · ventas menos compras
        </span>
      </motion.section>

      <motion.div className={styles.pair} variants={fadeUp}>
        <MetricCard
          label="Ventas · RVIE"
          value={period.totalVentas.total}
          icon="up"
          caption={`${period.totalVentas.count} comprobantes`}
          outlined
        />
        <MetricCard
          label="Compras · RCE"
          value={period.totalCompras.total}
          icon="down"
          caption={`${period.totalCompras.count} comprobantes`}
          outlined
        />
      </motion.div>

      <motion.div className={styles.gutter} variants={fadeUp}>
        <SegmentedTabs<Series>
          label="Serie del gráfico"
          stretch
          value={series}
          onChange={setSeries}
          tabs={[
            { id: 'balance', label: 'Balance' },
            { id: 'ventas', label: 'Ventas' },
            { id: 'compras', label: 'Compras' },
          ]}
        />
      </motion.div>

      <motion.div className={styles.gutter} variants={fadeUp}>
        <BarChart
          label={`${SERIES_LABELS[series]} de los últimos 6 meses`}
          data={sire.periods.map((p) => ({ label: periodShort(calendarPeriod(p.key)), value: seriesValue(p, series) }))}
          selected={selected}
          onSelect={(i) => setPeriodKey(sire.periods[i].key)}
          formatValue={formatCompactMoney}
        />
      </motion.div>

      <InsightList
        key={period.key}
        insights={sireInsights(period, ledger, business.ruc, month)}
        title="Explícame mi SIRE"
      />

      <div className={styles.ask}>
        <Button variant="tonal" icon="auto_awesome" to={ASK_IGV}>
          Pregúntale a Zenity
        </Button>
      </div>
    </motion.div>
  )
}

/* ── Comprobantes ───────────────────────────────────────────── */

type CreditFilter = 'todos' | 'con' | 'sin'

function RecordsTab({ period, month }: { period: SirePeriod; month: string }) {
  const [params] = useSearchParams()
  const [libro, setLibro] = useState<SireBook>(() => (params.get('libro') === 'compras' ? 'compras' : 'ventas'))
  const [filter, setFilter] = useState<CreditFilter>(() => (params.get('credito') === 'sin' ? 'sin' : 'todos'))
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const deferred = useDeferredValue(query)

  const records = libro === 'ventas' ? period.ventas : period.compras
  const totals = libro === 'ventas' ? period.totalVentas : period.totalCompras
  const q = deferred.trim().toLowerCase()
  const visible = records.filter((r) => {
    if (libro === 'compras' && filter !== 'todos' && (filter === 'sin') !== Boolean(r.sinCredito)) return false
    if (!q) return true
    return [r.contraparte.nombre, r.contraparte.ruc ?? '', `${r.serie}-${r.numero}`, r.glosa].some((text) =>
      text.toLowerCase().includes(q),
    )
  })

  const changeLibro = (next: SireBook) => {
    setLibro(next)
    setFilter('todos')
    setOpenId(null)
  }

  return (
    <div className={styles.stack}>
      <div className={styles.gutter}>
        <SegmentedTabs<SireBook>
          label="Registro del SIRE"
          tone="primary"
          stretch
          value={libro}
          onChange={changeLibro}
          tabs={[
            { id: 'ventas', label: `Ventas · ${period.totalVentas.count}` },
            { id: 'compras', label: `Compras · ${period.totalCompras.count}` },
          ]}
        />
      </div>

      <div className={styles.bookSummary}>
        <div>
          <span>Importe total</span>
          <Amount value={totals.total} />
        </div>
        <div>
          <span>Base imponible</span>
          <Amount value={totals.baseImponible} />
        </div>
        <div>
          <span>IGV</span>
          <Amount value={totals.igv} />
        </div>
      </div>

      {libro === 'compras' && (
        <div className={styles.filters} role="group" aria-label="Filtrar por crédito fiscal">
          {(
            [
              { id: 'todos', label: 'Todas' },
              { id: 'con', label: 'Con crédito' },
              { id: 'sin', label: 'Sin crédito' },
            ] as const
          ).map((f) => (
            <Chip key={f.id} selected={filter === f.id} showCheck onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      )}

      <label className={styles.search}>
        <Icon name="search" size={20} />
        <span className="visually-hidden">Buscar comprobantes</span>
        <input
          type="search"
          placeholder="Buscar por razón social, RUC o serie"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className={styles.records}>
        {visible.map((r) => (
          <SireRecordRow key={r.id} record={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
        ))}
        {visible.length === 0 && (
          <p className={styles.noResults}>
            {q ? `No hay comprobantes que coincidan con «${query}».` : `Sin comprobantes en ${month.toLowerCase()}.`}
          </p>
        )}
      </div>

      <p className={styles.footnote}>
        <Icon name="info" size={18} />
        <span>
          Solo ves los comprobantes electrónicos que SUNAT registra en el SIRE: el {libro === 'ventas' ? 'Registro de Ventas e Ingresos (RVIE)' : 'Registro de Compras (RCE)'}. Los cobros y pagos de tus cuentas sin comprobante no aparecen aquí.
        </span>
      </p>
    </div>
  )
}

/* ── Impuestos ──────────────────────────────────────────────── */

function Section({ icon, title, caption, children }: { icon: string; title: string; caption: string; children: ReactNode }) {
  return (
    <motion.section className={styles.section} variants={fadeUp}>
      <header className={styles.sectionHead}>
        <span className={styles.sectionIcon}>
          <Icon name={icon} size={20} />
        </span>
        <span>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <span className={styles.sectionCaption}>{caption}</span>
        </span>
      </header>
      <div className={styles.card}>{children}</div>
    </motion.section>
  )
}

const percentLabel = (rate: number) => `${(rate * 100).toLocaleString('es-PE')}%`

function TaxesTab({ sire, period, month }: { sire: Sire; period: SirePeriod; month: string }) {
  const { business } = useApp()
  const [regimen, setRegimen] = useState<Regimen>(sire.regimen)
  const { igv } = period
  const own = renta(period, sire.regimen)
  const simulated = renta(period, regimen)
  const total = igv.aPagar + own.aPagar
  const due = formatDue(vencimiento(period.key, business.ruc))
  const previous = previousSirePeriod(sire, period.key)
  const calendar = calendarPeriod(period.key)
  const nextMonth = MONTHS[(calendar.month + 1) % 12].toLowerCase()
  const excluded = noDeducibles(period)
  const exonerado = period.totalCompras.noGravado
  const difference = simulated.aPagar - own.aPagar

  return (
    <motion.div className={styles.stack} variants={staggerContainer(0.07)} initial="hidden" animate="show">
      <motion.section className={styles.due} variants={fadeUp} aria-live="polite">
        <span className={styles.dueLabel}>Total a pagar a SUNAT · {month}</span>
        <Amount value={total} className={styles.dueAmount} />
        <span className={styles.dueMeta}>
          <Icon name="calendar_month" size={16} />
          Vence el {due} · RUC terminado en {business.ruc.at(-1)}
        </span>
        <div className={styles.dueSplit}>
          <div>
            <span>IGV</span>
            <Amount value={igv.aPagar} />
            {igv.saldoFavor > 0 && (
              <small>
                Saldo a favor <Amount value={igv.saldoFavor} animate={false} />
              </small>
            )}
          </div>
          <div>
            <span>Renta · {REGIMENES[sire.regimen].short}</span>
            <Amount value={own.aPagar} />
          </div>
        </div>
        <span className={styles.dueForm}>Se declara en el Formulario Virtual 621 (IGV-Renta mensual), en soles enteros.</span>
      </motion.section>

      <Section icon="request_quote" title="IGV" caption="Impuesto General a las Ventas · 18%">
        <TaxLine label="Débito fiscal" hint={`IGV de ${period.totalVentas.count} comprobantes de venta`} value={igv.debito} />
        <TaxLine op="−" label="Crédito fiscal" hint="IGV de compras con derecho a crédito" value={igv.credito} />
        {igv.saldoAnterior > 0 && previous && (
          <TaxLine
            op="−"
            label="Saldo a favor anterior"
            hint={`Viene de ${periodLabel(calendarPeriod(previous.key)).toLowerCase()}`}
            value={igv.saldoAnterior}
          />
        )}
        <TaxLine
          op="="
          label={igv.resultado > 0 ? 'IGV resultante' : `Saldo a favor para ${nextMonth}`}
          hint={igv.resultado > 0 ? 'Se paga redondeado a soles enteros' : 'No pagas IGV este mes'}
          value={Math.abs(igv.resultado)}
          tone={igv.resultado > 0 ? 'negative' : 'positive'}
        />
        <IgvBar igv={igv} />
      </Section>

      <Section icon="calculate" title="Crédito fiscal" caption="El IGV de tus compras que puedes descontar">
        <TaxLine label="IGV de tus compras" hint={`${period.totalCompras.count} comprobantes en el RCE`} value={igv.igvCompras} />
        <TaxLine op="−" label="IGV no deducible" hint="Boletas y proveedores no habidos" value={igv.noDeducible} />
        <TaxLine op="=" label="Crédito fiscal del mes" value={igv.credito} tone="positive" />
        {excluded.length > 0 && (
          <ul className={styles.excluded}>
            {excluded.map((r) => (
              <li key={r.id}>
                <span className={styles.excludedText}>
                  <span>{r.contraparte.nombre}</span>
                  <span>
                    {r.serie}-{r.numero} · {r.sinCredito && SIN_CREDITO[r.sinCredito].label}
                  </span>
                </span>
                <Amount value={-r.igv} sign="always" tone="negative" animate={false} />
              </li>
            ))}
          </ul>
        )}
        {exonerado > 0 && (
          <p className={styles.cardNote}>
            Además compraste <Amount value={exonerado} animate={false} /> en productos exonerados: no llevan IGV, así que no
            suman ni restan crédito.
          </p>
        )}
        <div className={styles.cardAction}>
          <Button variant="text" size="sm" trailingIcon="arrow_forward" to="/sunat/comprobantes?libro=compras&credito=sin">
            Ver compras sin crédito
          </Button>
        </div>
      </Section>

      <Section icon="percent" title="Impuesto a la Renta" caption="Pago a cuenta mensual según tu régimen">
        <div className={styles.regimenTabs}>
          <SegmentedTabs<Regimen>
            label="Régimen tributario"
            stretch
            value={regimen}
            onChange={setRegimen}
            tabs={(['rer', 'rmt', 'general'] as const).map((id) => ({ id, label: REGIMENES[id].short }))}
          />
          <p className={styles.regimenNote} data-simulated={regimen !== sire.regimen}>
            {regimen === sire.regimen ? (
              `Tu régimen: ${REGIMENES[sire.regimen].label}, según tu ficha RUC.`
            ) : (
              <>
                Simulación: con {REGIMENES[regimen].short} pagarías <Amount value={Math.abs(difference)} animate={false} />{' '}
                {difference >= 0 ? 'más' : 'menos'} que en tu régimen ({REGIMENES[sire.regimen].short}).
              </>
            )}
          </p>
        </div>
        <TaxLine label="Ingresos netos del mes" hint="Base imponible de tus ventas" value={simulated.ingresosNetos} />
        <TaxLine op="×" label="Tasa" value={percentLabel(simulated.tasa)} />
        <TaxLine
          op="="
          label={regimen === 'rer' ? 'Cuota mensual' : 'Pago a cuenta'}
          hint="Se paga redondeado a soles enteros"
          value={simulated.monto}
          tone="negative"
        />
        <p className={styles.cardNote}>{REGIMENES[regimen].nota}</p>
      </Section>

      <motion.p className={styles.footnote} variants={fadeUp}>
        <Icon name="info" size={18} />
        <span>
          Cálculo referencial con los comprobantes del SIRE. No incluye retenciones, percepciones, detracciones ni el coeficiente
          de Renta. Revísalo con tu contador antes de declarar.
        </span>
      </motion.p>

      <div className={styles.ask}>
        <Button variant="tonal" icon="auto_awesome" to={ASK_IGV}>
          Pregúntale a Zenity
        </Button>
      </div>
    </motion.div>
  )
}
