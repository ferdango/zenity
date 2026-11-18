import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Money, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { HOY } from '../config/demo'
import { businessName } from '../data/businesses'
import { boletasEnEfectivo, efectivoPorDepositar } from '../domain/cierres'
import { addDays, fmtFecha, fmtSolesCorto, round2 } from '../domain/util'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { borrarCierreCaja, registrarCierreCaja } from '../state/demoStore'
import { useCierres, useZen } from '../state/useZen'

/**
 * Cierre de caja de las ventas en efectivo: el dueño anota cuánto contó al cerrar el día. Zenity lo
 * cruza con las boletas al contado de ese día y con el depósito en el banco.
 */
export function CierreCaja() {
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const estados = useCierres()
  const [fecha, setFecha] = useState(HOY)
  const [efectivo, setEfectivo] = useState('')
  const efectivoRef = useRef<HTMLInputElement>(null)

  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Cierre de caja" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="El cierre de caja" />
        </div>
      </div>
    )
  }

  const porDepositar = efectivoPorDepositar(estados, HOY)
  const boletasDia = boletasEnEfectivo(a, fecha)
  const totalBoletasDia = round2(boletasDia.reduce((s, b) => s + b.total, 0))
  const conCierre = new Set(estados.map((e) => e.cierre.fecha))
  // Días recientes con boletas al contado en efectivo y sin cierre registrado
  const sugeridos = Array.from({ length: 7 }, (_, i) => addDays(HOY, -i)).filter((d) => !conCierre.has(d) && boletasEnEfectivo(a, d).length > 0)

  const guardar = () => {
    const monto = Number(efectivo.replace(/[^\d.]/g, ''))
    if (!monto || !fecha) return
    registrarCierreCaja(a.business.id, fecha, monto)
    toast(`Cierre del ${fmtFecha(fecha)} guardado: ${fmtSolesCorto(monto)} en efectivo`, 'point_of_sale')
    setEfectivo('')
  }

  return (
    <div className="z-page">
      <TopBar title="Cierre de caja" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.heroLabel}>Efectivo por depositar</span>
          <Money animated value={porDepositar} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            De tus cierres de los últimos 7 días que todavía no llegan al banco. Entra a tu proyección de caja como depósito de mañana.
          </span>
        </motion.section>

        <motion.form
          className={styles.card}
          variants={fadeUp}
          onSubmit={(e) => {
            e.preventDefault()
            guardar()
          }}
        >
          <span className="t-title-m">¿Cuánto efectivo contaste?</span>
          <div className={styles.grid2}>
            <label className={styles.field}>
              Día
              <input className={styles.input} type="date" max={HOY} min={addDays(HOY, -30)} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
            <label className={styles.field}>
              Efectivo (S/)
              <input
                ref={efectivoRef}
                className={styles.input}
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="0.00"
                value={efectivo}
                onChange={(e) => setEfectivo(e.target.value)}
              />
            </label>
          </div>
          <p className={styles.muted}>
            {boletasDia.length
              ? `Ese día emitiste ${boletasDia.length} boleta${boletasDia.length === 1 ? '' : 's'} al contado por ${fmtSolesCorto(totalBoletasDia)}, sin contar Yape ni tarjeta.`
              : 'Ese día no emitiste boletas al contado en efectivo.'}
          </p>
          <AnimatePresence initial={false}>
            {(() => {
              const monto = Number(efectivo.replace(/[^\d.]/g, ''))
              if (!monto || !boletasDia.length) return null
              const dif = round2(monto - totalBoletasDia)
              const cuadra = Math.abs(dif) < 0.01
              return (
                <motion.p
                  key="dif"
                  className={styles.banner}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: ease.emphasized }}
                  style={{ overflow: 'hidden' }}
                >
                  <Icon name={cuadra ? 'task_alt' : dif > 0 ? 'trending_up' : 'trending_down'} size={20} />
                  <span>
                    {cuadra
                      ? 'Cuadra exacto con tus boletas. ¡Bien!'
                      : dif > 0
                        ? `Contaste ${fmtSolesCorto(dif)} más que tus boletas: puede ser una venta sin boleta.`
                        : `Faltan ${fmtSolesCorto(-dif)} frente a tus boletas: revisa vueltos o pagos en efectivo.`}
                  </span>
                </motion.p>
              )
            })()}
          </AnimatePresence>
          <div className={styles.actions}>
            <Button type="submit" icon="check" disabled={!Number(efectivo.replace(/[^\d.]/g, ''))}>
              Guardar cierre
            </Button>
            {boletasDia.length > 0 && (
              <Button variant="tonal" icon="receipt_long" onClick={() => setEfectivo(totalBoletasDia.toFixed(2))}>
                Igual a mis boletas
              </Button>
            )}
          </div>
        </motion.form>

        {sugeridos.length > 0 && (
          <motion.section className={styles.section} variants={fadeUp}>
            <SectionHead title="Días sin cierre" hint="Con ventas al contado" />
            <div className={styles.list}>
              {sugeridos.map((d) => {
                const bs = boletasEnEfectivo(a, d)
                return (
                  <button key={d} type="button" className={styles.row} data-ripple="" onClick={() => {
                      setFecha(d)
                      // Lleva al formulario con el campo de efectivo listo para escribir
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      window.setTimeout(() => efectivoRef.current?.focus({ preventScroll: true }), 350)
                    }}>
                    <span className={`${styles.rowIcon} ${styles.toneWarning}`}>
                      <Icon name="event" size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{fmtFecha(d)}</span>
                      <span className={styles.rowSub}>
                        {bs.length} boleta{bs.length === 1 ? '' : 's'} al contado por {fmtSolesCorto(round2(bs.reduce((s, b) => s + b.total, 0)))}
                      </span>
                    </span>
                    <Icon name="chevron_right" size={20} />
                  </button>
                )
              })}
            </div>
          </motion.section>
        )}

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Tus cierres" hint={estados.length ? `${estados.length}` : undefined} />
          {estados.length === 0 ? (
            <p className={styles.card}>
              <span className={styles.muted}>
                Todavía no registras cierres. Anota el efectivo al cerrar cada día: así Zenity cuadra tus depósitos y te avisa lo que vendiste sin boleta.
              </span>
            </p>
          ) : (
            <div className={styles.list}>
              {estados.map((e) => (
                <article key={e.cierre.id} className={styles.card}>
                  <div className={styles.row} style={{ padding: 0, background: 'none', minHeight: 0 }}>
                    <span className={`${styles.rowIcon} ${e.deposito ? styles.tonePositive : styles.toneWarning}`}>
                      <Icon name={e.deposito ? 'task_alt' : 'point_of_sale'} size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>Cierre del {fmtFecha(e.cierre.fecha)}</span>
                      <span className={styles.rowSub}>
                        {e.boletas.length} boleta{e.boletas.length === 1 ? '' : 's'} al contado por {fmtSolesCorto(e.conBoleta)}
                      </span>
                    </span>
                    <span className={styles.rowEnd}>
                      <Money value={e.cierre.efectivo} className="t-title-m" />
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {e.deposito ? (
                      <Pill tone="alta" icon="account_balance">
                        Depositado el {fmtFecha(e.deposito.fecha)}
                      </Pill>
                    ) : (
                      <Pill tone="media" icon="schedule">
                        Por depositar
                      </Pill>
                    )}
                    {e.deposito && e.porDepositar > 0 && <Pill tone="media">{fmtSolesCorto(e.porDepositar)} quedaron en caja</Pill>}
                    {e.sinBoleta > 0 && <Pill tone="baja">{fmtSolesCorto(e.sinBoleta)} sin boleta</Pill>}
                    {e.faltante > 0 && <Pill tone="baja">Faltan {fmtSolesCorto(e.faltante)} frente a tus boletas</Pill>}
                  </div>
                  <div className={styles.actions}>
                    <Button size="sm" variant="text" icon="edit" onClick={() => { setFecha(e.cierre.fecha); setEfectivo(String(e.cierre.efectivo)) }}>
                      Corregir
                    </Button>
                    <Button size="sm" variant="text" icon="delete" onClick={() => borrarCierreCaja(e.cierre.id)}>
                      Borrar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className={styles.muted}>
            Lo vendido sin boleta también es venta: emite la boleta aunque sea al final del día. Si tus boletas suman más que el efectivo, revisa vueltos y
            retiros de caja.
          </p>
        </motion.section>
        {demo.cierresCaja.length > 0 && (
          <Button variant="text" icon="rule" to="/conciliacion?estado=CONCILIADO">
            Ver los depósitos en Conciliación
          </Button>
        )}
      </motion.div>
    </div>
  )
}
