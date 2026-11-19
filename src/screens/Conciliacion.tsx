import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { TopBar } from '../components/TopBar'
import { ConfidenceBadge, LessonCard, Money, NoDemoData, Pill, ProgressBar, SectionHead, Why } from '../components/zen'
import { ImportarExtracto } from '../components/zen/ImportarExtracto'
import { REGLA_LABEL } from '../components/zen/reglas'
import { TONE_CLASS, type Tone } from '../components/zen/tone'
import styles from '../components/zen/zen.module.css'
import { CATEGORIAS } from '../config/categories'
import { HOY, MESES_DEMO } from '../config/demo'
import { businessName } from '../data/businesses'
import { tituloMovimiento } from '../data/demoLedger'
import { abonosDe, type Analysis, ESTADO_LABEL, ESTADOS, type EstadoItem, resumenMes } from '../domain/engine'
import { docLabel, tipoLabel } from '../domain/reconciliation'
import type { Estado, Match } from '../domain/types'
import { fmtFecha, fmtSolesCorto } from '../domain/util'
import { track } from '../lib/analytics'
import { FEATURES } from '../lib/features'
import { MONTHS_SHORT } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { useZen } from '../state/useZen'

const ESTADO_ICON: Record<Estado, string> = {
  CONCILIADO: 'task_alt',
  COBRADO_SIN_COMPROBANTE: 'receipt_long',
  COMPROBANTE_SIN_COBRO: 'request_quote',
  PAGADO_SIN_FACTURA: 'receipt',
  FACTURA_SIN_PAGO: 'pending_actions',
  POSIBLE_PERSONAL: 'person',
  SIN_CATEGORIA_SEGURA: 'help',
}

const ESTADO_TONE: Record<Estado, Tone> = {
  CONCILIADO: 'positive',
  COBRADO_SIN_COMPROBANTE: 'warning',
  COMPROBANTE_SIN_COBRO: 'warning',
  PAGADO_SIN_FACTURA: 'warning',
  FACTURA_SIN_PAGO: 'negative',
  POSIBLE_PERSONAL: 'violet',
  SIN_CATEGORIA_SEGURA: 'info',
}

const mesLabel = (key: string) => `${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

/** F-01 · Conciliación de tres vías (con F-02: confianza y motivo). */
export function Conciliacion() {
  const { business } = useApp()
  const { a } = useZen()
  const [params, setParams] = useSearchParams()
  const [mes, setMes] = useState<string>(MESES_DEMO[MESES_DEMO.length - 1])
  const [detalle, setDetalle] = useState<EstadoItem | null>(null)
  const resumen = useMemo(() => (a ? resumenMes(a, mes) : null), [a, mes])
  const chipRef = useRef<HTMLButtonElement>(null)
  const estadoParam = params.get('estado')
  const subir = params.get('subir') === '1'
  useEffect(() => {
    chipRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [estadoParam, mes])
  const pctMes = resumen ? Math.round(resumen.conciliado * 100) : null
  const vistoRef = useRef<string | null>(null)
  useEffect(() => {
    if (pctMes === null || vistoRef.current === mes) return
    vistoRef.current = mes
    track('conciliacion_vista', { pct: pctMes, mes_actual: mes === HOY.slice(0, 7) })
  }, [mes, pctMes])
  const abrirSubir = (abrir: boolean) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (abrir) next.set('subir', '1')
        else next.delete('subir')
        return next
      },
      { replace: true },
    )

  if (!a || !resumen) {
    return (
      <div className="z-page">
        <TopBar title="Conciliación" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="La conciliación" />
        </div>
      </div>
    )
  }

  const pedido = params.get('estado') as Estado | null
  // Sin estado en la URL, abre en lo primero que pide atención (o en «Todo cuadra» si no hay nada)
  const pendiente = ESTADOS.find((e) => e !== 'CONCILIADO' && resumen.porEstado[e].count > 0)
  const estado: Estado = pedido && ESTADOS.includes(pedido) ? pedido : (pendiente ?? 'CONCILIADO')
  const bucket = resumen.porEstado[estado]
  const elegir = (e: Estado) => setParams({ estado: e }, { replace: true })
  const importados = a.movements.filter((m) => m.importado).length

  return (
    <div className="z-page">
      <TopBar title="Conciliación" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <SegmentedTabs<string>
            label="Mes"
            stretch
            value={mes}
            onChange={setMes}
            tabs={MESES_DEMO.map((m) => ({ id: m, label: MONTHS_SHORT[Number(m.slice(5, 7)) - 1] }))}
          />
        </motion.div>

        {a.business.dosVias && (
          <motion.p className={styles.banner} variants={fadeUp}>
            <Icon name="info" size={20} />
            <span>Tu régimen no lleva registros en SIRE: conciliamos banco y cobros contra tus boletas.</span>
          </motion.p>
        )}

        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.heroLabel}>{mes === HOY.slice(0, 7) ? 'Este mes' : mesLabel(mes)}</span>
          <span className={styles.heroAmount}>{Math.round(resumen.conciliado * 100)}% conciliado</span>
          <ProgressBar value={resumen.conciliado} label="Porcentaje conciliado" />
          <span className={styles.heroMeta}>
            Banco BCP + SUNAT {a.business.dosVias ? '(boletas)' : 'SIRE'} + Yape y POS. Lo que vendiste, lo que facturaste y lo que entró al banco.
          </span>
        </motion.section>

        <motion.div className={FEATURES.cierreCaja ? styles.grid2 : undefined} variants={fadeUp}>
          <button type="button" className={styles.cardButton} onClick={() => abrirSubir(true)} data-ripple="">
            <span className={`${styles.rowIcon} ${styles.toneInfo}`}>
              <Icon name="upload_file" size={20} />
            </span>
            <span className={styles.rowTitle}>Subir extracto del banco</span>
            <span className={styles.rowSub}>{importados ? `${importados} movimientos subidos` : 'Excel o CSV de tu banca por internet'}</span>
          </button>
          {FEATURES.cierreCaja && (
          <Link to="/cierre-caja" className={styles.cardButton} data-ripple="">
            <span className={`${styles.rowIcon} ${styles.tonePositive}`}>
              <Icon name="point_of_sale" size={20} />
            </span>
            <span className={styles.rowTitle}>Cierre de caja</span>
            <span className={styles.rowSub}>Tus ventas en efectivo del día</span>
          </Link>
          )}
        </motion.div>

        <motion.div className={styles.chips} variants={fadeUp} role="tablist" aria-label="Estados">
          {ESTADOS.map((e) => (
            <Chip
              key={e}
              selected={e === estado}
              onClick={() => elegir(e)}
              icon={ESTADO_ICON[e]}
              role="tab"
              aria-selected={e === estado}
              ref={e === estado ? chipRef : undefined}
            >
              {ESTADO_LABEL[e]} · {resumen.porEstado[e].count}
              {resumen.porEstado[e].count > 0 && ` · ${fmtSolesCorto(resumen.porEstado[e].monto)}`}
            </Chip>
          ))}
        </motion.div>

        {estado === 'COBRADO_SIN_COMPROBANTE' && <LessonCard id="L01" />}
        {estado === 'PAGADO_SIN_FACTURA' && <LessonCard id="L02" />}

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title={ESTADO_LABEL[estado]} hint={`${bucket.count} en ${mesLabel(mes).toLowerCase()}`} />
          {bucket.items.length === 0 ? (
            <p className={styles.card}>
              <span className={styles.muted}>Nada en este estado este mes.</span>
            </p>
          ) : (
            <div className={styles.list}>
              {bucket.items.map((item) => (
                <ItemRow key={item.id} a={a} item={item} onOpen={() => setDetalle(item)} />
              ))}
            </div>
          )}
        </motion.section>
      </motion.div>

      <BottomSheet open={!!detalle} onClose={() => setDetalle(null)} title="Detalle de la conciliación">
        {detalle && <Detalle a={a} item={detalle} />}
      </BottomSheet>

      <BottomSheet open={subir} onClose={() => abrirSubir(false)} title="Subir extracto del banco">
        {subir && <ImportarExtracto onClose={() => abrirSubir(false)} />}
      </BottomSheet>
    </div>
  )
}

function ItemRow({ a, item, onOpen }: { a: Analysis; item: EstadoItem; onOpen: () => void }) {
  if (item.kind === 'comprobante') {
    const c = a.comprobantesById.get(item.id)!
    const abonos = abonosDe(a, c)
    return (
      <button type="button" className={styles.row} onClick={onOpen} data-ripple="">
        <span className={`${styles.rowIcon} ${TONE_CLASS[ESTADO_TONE[a.comprobanteEstado.get(c.id) ?? 'CONCILIADO']]}`}>
          <Icon name="description" size={20} />
        </span>
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{c.nombreContraparte}</span>
          <span className={styles.rowSub}>
            {tipoLabel(c)} {docLabel(c)} · {fmtFecha(c.fechaEmision)}
            {abonos && ` · abonó ${fmtSolesCorto(abonos.pagado)}`}
          </span>
        </span>
        <span className={styles.rowEnd}>
          <Money value={c.total} />
          {abonos && <Pill tone="info">Pago en partes</Pill>}
        </span>
      </button>
    )
  }
  const m = a.movementsById.get(item.id)!
  const cl = a.classifications.get(m.id)!
  const match = a.matchByMovement.get(m.id)
  return (
    <button type="button" className={styles.row} onClick={onOpen} data-ripple="">
      <span className={`${styles.rowIcon} ${TONE_CLASS[ESTADO_TONE[cl.estado]]}`}>
        <Icon name={CATEGORIAS[cl.categoriaId].icon} size={20} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{tituloMovimiento(m)}</span>
        <span className={styles.rowSub}>
          {fmtFecha(m.fecha)} · {match ? REGLA_LABEL[match.regla] : CATEGORIAS[cl.categoriaId].label}
        </span>
      </span>
      <span className={styles.rowEnd}>
        <Money value={m.monto} sign="always" className={m.monto > 0 ? styles.amountPos : undefined} />
        <ConfidenceBadge confianza={match?.confianza ?? cl.confianza} showPct={false} />
      </span>
    </button>
  )
}

/** Vista de tres columnas: Banco | SUNAT | Cobro digital, con la regla, la confianza y el motivo. */
function Detalle({ a, item }: { a: Analysis; item: EstadoItem }) {
  const match: Match | undefined = item.kind === 'movimiento' ? a.matchByMovement.get(item.id) : a.matchByComprobante.get(item.id)
  const movs = match ? match.movementIds.map((id) => a.movementsById.get(id)!) : item.kind === 'movimiento' ? [a.movementsById.get(item.id)!] : []
  const comps = match ? match.comprobanteIds.map((id) => a.comprobantesById.get(id)!) : item.kind === 'comprobante' ? [a.comprobantesById.get(item.id)!] : []
  const m = movs[0]
  const cl = m ? a.classifications.get(m.id) : undefined
  const yape = m ? a.data.yapePayments.find((y) => y.numeroOperacion === m.numeroOperacion) : undefined
  const lote = match?.posSaleIds?.length ? a.data.posBatches.find((b) => a.data.posSales.some((s) => s.loteId === b.loteId && match.posSaleIds!.includes(s.id))) : undefined
  const estado: Estado = item.kind === 'comprobante' ? a.comprobanteEstado.get(item.id)! : cl!.estado

  return (
    <div style={{ display: 'grid', gap: 14, padding: '0 0 20px' }}>
      <div className={styles.actions}>
        <Pill tone={estado === 'CONCILIADO' ? 'alta' : 'media'} icon={ESTADO_ICON[estado]}>
          {ESTADO_LABEL[estado]}
        </Pill>
        {match && <Pill tone="info">Regla: {REGLA_LABEL[match.regla]}</Pill>}
        {(match || cl) && <ConfidenceBadge confianza={match?.confianza ?? cl!.confianza} />}
      </div>

      <div className={styles.three}>
        <div className={styles.source}>
          <span className={styles.sourceHead}>
            <Icon name="account_balance" size={18} /> Banco BCP
          </span>
          {movs.length === 0 ? (
            <span className={styles.sourceEmpty}>Todavía no hay un movimiento en el banco.</span>
          ) : (
            movs.map((x) => (
              <dl key={x.id} className={styles.kv}>
                <dt>Fecha</dt>
                <dd>
                  {fmtFecha(x.fecha)} {x.fecha.slice(11, 16)}
                </dd>
                <dt>Monto</dt>
                <dd>
                  <Money value={x.monto} sign="always" />
                </dd>
                <dt>Glosa</dt>
                <dd>{x.glosa}</dd>
                <dt>Operación</dt>
                <dd>{x.numeroOperacion}</dd>
              </dl>
            ))
          )}
        </div>
        <div className={styles.source}>
          <span className={styles.sourceHead}>
            <Icon name="description" size={18} /> SUNAT {a.business.dosVias ? '· boletas' : '· SIRE'}
          </span>
          {comps.length === 0 ? (
            <span className={styles.sourceEmpty}>No encontramos un comprobante para este movimiento.</span>
          ) : comps.length > 4 ? (
            <dl className={styles.kv}>
              <dt>Comprobantes</dt>
              <dd>{comps.length} boletas</dd>
              <dt>Del</dt>
              <dd>{fmtFecha(comps[0].fechaEmision)}</dd>
              <dt>Total</dt>
              <dd>
                <Money value={comps.reduce((s, c) => s + c.total, 0)} />
              </dd>
              <dt>Series</dt>
              <dd>
                {docLabel(comps[0])} … {docLabel(comps[comps.length - 1])}
              </dd>
            </dl>
          ) : (
            comps.map((c) => (
              <dl key={c.id} className={styles.kv}>
                <dt>{tipoLabel(c).replace(/^./, (x) => x.toUpperCase())}</dt>
                <dd>{docLabel(c)}</dd>
                <dt>{c.direccion === 'VENTA' ? 'Cliente' : 'Proveedor'}</dt>
                <dd>{c.nombreContraparte}</dd>
                <dt>Emisión</dt>
                <dd>{fmtFecha(c.fechaEmision)}</dd>
                <dt>Total</dt>
                <dd>{c.moneda === 'USD' ? `US$ ${c.total.toFixed(2)}` : <Money value={c.tipo === 'NOTA_CREDITO' ? -c.total : c.total} />}</dd>
                {c.formaPago === 'CREDITO' && c.cuotas && (
                  <>
                    <dt>Vence</dt>
                    <dd>{fmtFecha(c.cuotas[c.cuotas.length - 1].fecha)}</dd>
                  </>
                )}
              </dl>
            ))
          )}
        </div>
        <div className={styles.source}>
          <span className={styles.sourceHead}>
            <Icon name="contactless" size={18} /> Cobro digital
          </span>
          {yape ? (
            <dl className={styles.kv}>
              <dt>Yape de</dt>
              <dd>{yape.nombre}</dd>
              <dt>Monto</dt>
              <dd>
                <Money value={yape.monto} />
              </dd>
              <dt>Operación</dt>
              <dd>{yape.numeroOperacion}</dd>
            </dl>
          ) : lote ? (
            <dl className={styles.kv}>
              <dt>Lote</dt>
              <dd>{lote.loteId}</dd>
              <dt>Ventas</dt>
              <dd>{match!.posSaleIds!.length}</dd>
              <dt>Bruto</dt>
              <dd>
                <Money value={lote.bruto} />
              </dd>
              <dt>Comisión</dt>
              <dd>
                <Money value={-lote.comision} />
              </dd>
              <dt>Abonado</dt>
              <dd>
                <Money value={lote.neto} />
              </dd>
            </dl>
          ) : (
            <span className={styles.sourceEmpty}>No pasó por Yape ni POS.</span>
          )}
        </div>
      </div>

      {match?.regla === 'DETRACCION' && match.detraccion && (
        <p className={styles.bannerWarn}>
          <Icon name="savings" size={20} />
          <span>
            <strong>{fmtSolesCorto(match.detraccion)}</strong> en tu cuenta de detracciones del Banco de la Nación. Sirven para pagar tus impuestos.
          </span>
        </p>
      )}
      {match?.regla === 'PARCIAL' && (
        <p className={match.pendiente ? styles.bannerWarn : styles.banner}>
          <Icon name="splitscreen" size={20} />
          <span>
            {match.pendiente ? (
              <>
                Llegaron <strong>{fmtSolesCorto(movs.reduce((s, x) => s + Math.abs(x.monto), 0))}</strong> en {movs.length} abono{movs.length === 1 ? '' : 's'}. Faltan{' '}
                <strong>{fmtSolesCorto(match.pendiente)}</strong> para completar el comprobante.
              </>
            ) : (
              <>Pagado completo en {movs.length} abonos.</>
            )}
          </span>
        </p>
      )}
      {match?.regla === 'CIERRE' && (match.sinBoleta || match.enCaja) && (
        <p className={styles.bannerWarn}>
          <Icon name="point_of_sale" size={20} />
          <span>
            {match.sinBoleta ? (
              <>
                <strong>{fmtSolesCorto(match.sinBoleta)}</strong> de tu cierre no tienen boleta: emítela o regístrala como venta sin comprobante.{' '}
              </>
            ) : null}
            {match.enCaja ? (
              <>
                <strong>{fmtSolesCorto(match.enCaja)}</strong> quedaron en caja: deposítalos para que tu cuenta cuadre.
              </>
            ) : null}
          </span>
        </p>
      )}
      {match?.regla === 'RETENCION' && match.retencion && (
        <p className={styles.bannerWarn}>
          <Icon name="savings" size={20} />
          <span>
            Te retuvieron <strong>{fmtSolesCorto(match.retencion)}</strong> de IGV: se descuentan de tu próxima declaración.
          </span>
        </p>
      )}

      <Why motivo={match?.motivo ?? cl?.motivo ?? (estado === 'COMPROBANTE_SIN_COBRO' ? 'Emitiste este comprobante y todavía no llega su pago al banco.' : 'Recibiste esta factura y todavía no sale su pago del banco.')} defaultOpen />

      {cl && !match && (
        <p className={styles.small}>
          Categoría: <strong>{CATEGORIAS[cl.categoriaId].label}</strong>
        </p>
      )}

      {match?.regla === 'DETRACCION' && <LessonCard id="L03" />}
      {match?.regla === 'RETENCION' && <LessonCard id="L04" />}

      <div className={styles.actions}>
        {estado === 'SIN_CATEGORIA_SEGURA' && (
          <Button icon="fact_check" to="/revisar">
            Revisar ahora
          </Button>
        )}
        {estado === 'COMPROBANTE_SIN_COBRO' && (
          <Button icon="payments" to="/cobrar">
            Ir a cobrar
          </Button>
        )}
        {estado === 'POSIBLE_PERSONAL' && (
          <Button icon="person" variant="tonal" to="/personal">
            Ver personal vs negocio
          </Button>
        )}
        {(estado === 'FACTURA_SIN_PAGO' || estado === 'PAGADO_SIN_FACTURA' || estado === 'COBRADO_SIN_COMPROBANTE') && (
          <Button icon="schedule" variant="tonal" disabled>
            {estado === 'COBRADO_SIN_COMPROBANTE' ? 'Emitir boleta · Próximamente' : estado === 'PAGADO_SIN_FACTURA' ? 'Pedir factura · Próximamente' : 'Pagar · Próximamente'}
          </Button>
        )}
      </div>
    </div>
  )
}
