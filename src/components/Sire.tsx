import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { type IgvCalc, IGV_RATE, SIN_CREDITO, type SireRecord, TIPOS_CPE } from '../data/sire'
import { formatDate, MONTHS_SHORT } from '../lib/format'
import { ease } from '../lib/motion'
import { Amount } from './Amount'
import { Icon } from './Icon'
import styles from './Sire.module.css'

/** "2026-03-20" → "20 mar" (sin pasar por Date, para no correr el día por la zona horaria). */
function dayMonth(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1].toLowerCase()}`
}

function Detail({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? styles.detailStrong : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Comprobante del RVIE o del RCE con su detalle tributario desplegable. */
export function SireRecordRow({ record, open, onToggle }: { record: SireRecord; open: boolean; onToggle: () => void }) {
  const tipo = TIPOS_CPE[record.tipo]
  const compra = record.libro === 'compras'
  const panelId = `cpe-${record.id}`
  const boleta = record.sinCredito === 'boleta'

  return (
    <motion.article layout="position" className={styles.record} data-open={open}>
      <button
        type="button"
        data-ripple=""
        className={styles.recordHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={styles.recordIcon} data-libro={record.libro} data-nota={record.tipo === '07'}>
          <Icon name={tipo.icon} size={20} />
        </span>
        <span className={styles.recordText}>
          <span className={styles.recordTitle}>{record.contraparte.nombre}</span>
          <span className={styles.recordSub}>
            {record.serie}-{record.numero} · {tipo.label} · {dayMonth(record.fecha)}
          </span>
        </span>
        <span className={styles.recordEnd}>
          <Amount value={compra ? -record.total : record.total} sign="always" tone="auto" animate={false} />
          {record.sinCredito && (
            <span className={styles.flag} data-reason={record.sinCredito}>
              {SIN_CREDITO[record.sinCredito].label}
            </span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.4, ease: ease.emphasized } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: ease.emphasized } }}
          >
            <dl className={styles.details}>
              <Detail label={record.contraparte.ruc ? 'RUC' : 'Cliente'}>
                {record.contraparte.ruc ?? 'Sin documento (venta menor a S/ 700)'}
              </Detail>
              <Detail label="Fecha de emisión">{formatDate(record.fecha)}</Detail>
              <Detail label="Concepto">{record.glosa}</Detail>
              {record.noGravado !== 0 ? (
                <Detail label="Exonerado">
                  <Amount value={record.noGravado} animate={false} />
                </Detail>
              ) : (
                <>
                  <Detail label={boleta ? 'Valor (estimado)' : 'Base imponible'}>
                    <Amount value={record.baseImponible} animate={false} />
                  </Detail>
                  <Detail label={boleta ? 'IGV incluido (no discriminado)' : `IGV ${IGV_RATE * 100}%`}>
                    <Amount value={record.igv} animate={false} />
                  </Detail>
                </>
              )}
              <Detail label="Importe total" strong>
                <Amount value={record.total} animate={false} />
              </Detail>
            </dl>
            {compra && (
              <p className={styles.creditNote} data-ok={!record.sinCredito}>
                <Icon name={record.sinCredito ? 'block' : 'check_circle'} size={18} />
                <span>
                  {record.sinCredito ? (
                    SIN_CREDITO[record.sinCredito].detail
                  ) : (
                    <>
                      Su IGV de <Amount value={record.igv} animate={false} /> suma a tu crédito fiscal.
                    </>
                  )}
                </span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

interface TaxLineProps {
  label: string
  hint?: string
  value: number | string
  /** Operación respecto a la línea anterior */
  op?: '−' | '×' | '='
  tone?: 'positive' | 'negative'
}

/** Línea de un cálculo tributario: "− Crédito fiscal … S/ 117.58". */
export function TaxLine({ label, hint, value, op, tone }: TaxLineProps) {
  return (
    <div className={styles.line} data-total={op === '='}>
      <span className={styles.op} aria-hidden>
        {op}
      </span>
      <span className={styles.lineText}>
        <span className={styles.lineLabel}>{label}</span>
        {hint && <span className={styles.lineHint}>{hint}</span>}
      </span>
      {typeof value === 'number' ? (
        <Amount value={value} tone={tone} animate={op === '='} className={styles.lineValue} />
      ) : (
        <span className={styles.lineValue}>{value}</span>
      )}
    </div>
  )
}

/** Barra del IGV: cuánto del débito cubren el crédito fiscal y el saldo a favor, y cuánto se paga. */
export function IgvBar({ igv }: { igv: IgvCalc }) {
  const scale = Math.max(igv.debito, igv.credito + igv.saldoAnterior) || 1
  const payable = Math.max(0, igv.resultado)
  const segments = [
    { id: 'credito', label: 'Crédito fiscal', value: igv.credito },
    { id: 'saldo', label: 'Saldo a favor anterior', value: igv.saldoAnterior },
    { id: 'pagar', label: 'IGV a pagar', value: payable },
  ].filter((s) => s.value > 0)

  return (
    <figure className={styles.bar} aria-label="Composición del débito fiscal">
      <div className={styles.barTrack}>
        {segments.map((s, i) => (
          <motion.span
            key={s.id}
            className={styles.barSegment}
            data-segment={s.id}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / scale) * 100}%` }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: ease.emphasized }}
          />
        ))}
      </div>
      <figcaption className={styles.legend}>
        {segments.map((s) => (
          <span key={s.id} className={styles.legendItem}>
            <span className={styles.legendDot} data-segment={s.id} aria-hidden />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
