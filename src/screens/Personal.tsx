import { motion } from 'motion/react'
import { useState } from 'react'
import { BarChart } from '../components/BarChart'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LessonCard, Money, NoDemoData, Pill, ProgressBar, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { HOY, MESES_DEMO } from '../config/demo'
import { businessName } from '../data/businesses'
import { tituloMovimiento } from '../data/demoLedger'
import { personalesDelMes, progresoReto, RETO_DIAS } from '../domain/personal'
import type { BankMovement } from '../domain/types'
import { fmtDiaMes, fmtFecha, fmtSolesCorto, round2 } from '../domain/util'
import { formatCompactMoney, MONTHS_SHORT } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { corregir, deshacer, iniciarReto, setOverride } from '../state/demoStore'
import { useZen } from '../state/useZen'

/** F-04 · Separación personal / negocio. */
export function Personal() {
  const { business, toast } = useApp()
  const { a, demo } = useZen()
  const [sheet, setSheet] = useState(false)
  const [monto, setMonto] = useState('')
  const mes = HOY.slice(0, 7)

  if (!a) {
    return (
      <div className="z-page">
        <TopBar title="Personal vs negocio" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="Personal vs negocio" />
        </div>
      </div>
    )
  }

  const lista = personalesDelMes(a, mes)
  const total = round2(lista.reduce((s, m) => s - m.monto, 0))
  const meses = MESES_DEMO.slice(-3)
  const serie = meses.map((m) => ({ label: MONTHS_SHORT[Number(m.slice(5)) - 1], value: round2(personalesDelMes(a, m).reduce((s, x) => s - x.monto, 0)) }))
  const sueldo = a.business.sueldoDueno
  const exceso = sueldo !== undefined ? round2(total - sueldo) : null
  const inicio = demo.retoInicio[a.business.id] ?? `${mes}-01`
  const reto = progresoReto(a, inicio, HOY)
  const owns = new Set(demo.corrections.filter((c) => c.businessId === a.business.id).map((c) => c.movementId))

  const marcar = (m: BankMovement, personal: boolean) => {
    const token = corregir({
      movementIds: [m.id],
      businessId: a.business.id,
      rubro: a.business.rubro,
      elegida: personal ? 'retiro_dueno' : 'otros',
      esNegocio: !personal,
    })
    toast(personal ? 'Confirmado como gasto personal' : 'Lo dejamos como gasto del negocio', personal ? 'person' : 'storefront', {
      label: 'Deshacer',
      onClick: () => deshacer(token),
    })
  }

  const guardarSueldo = () => {
    const valor = Number(monto.replace(/[^\d.]/g, ''))
    if (!valor) return
    setOverride(a.business.id, { sueldoDueno: valor })
    if (!demo.retoInicio[a.business.id]) iniciarReto(a.business.id, `${mes}-01`)
    setSheet(false)
    toast(`Tu sueldo de dueño: ${fmtSolesCorto(valor)} al mes`, 'savings')
  }

  return (
    <div className="z-page">
      <TopBar title="Personal vs negocio" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp}>
          <span className={styles.heroLabel}>Este mes salieron del negocio para gastos personales</span>
          <Money value={total} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            {lista.length} movimiento{lista.length === 1 ? '' : 's'} · Si baja mes a mes, estás separando mejor tus cuentas.
          </span>
        </motion.section>

        <motion.div className={styles.card} variants={fadeUp}>
          <SectionHead title="Últimos 3 meses" hint={serie.length > 1 && serie[2].value < serie[1].value ? 'Vas bajando 👏' : undefined} />
          <BarChart label="Gasto personal de los últimos 3 meses" data={serie} selected={serie.length - 1} onSelect={() => {}} formatValue={formatCompactMoney} />
        </motion.div>

        {exceso !== null && exceso > 0 && (
          <motion.p className={styles.bannerDanger} variants={fadeUp}>
            <Icon name="warning" size={20} />
            <span>
              <strong className={styles.bannerTitle}>Te pasaste {fmtSolesCorto(exceso)} de tu sueldo este mes</strong>
              Tu sueldo de dueño es {fmtSolesCorto(sueldo!)}: hasta ahí es «Retiro del dueño» y está bien. Lo demás sale de la plata del negocio.
            </span>
          </motion.p>
        )}
        {exceso !== null && exceso <= 0 && (
          <motion.p className={styles.banner} variants={fadeUp}>
            <Icon name="verified" size={20} />
            <span>
              <strong className={styles.bannerTitle}>Vas dentro de tu sueldo de dueño</strong>
              Llevas {fmtSolesCorto(total)} de {fmtSolesCorto(sueldo!)} este mes: todo cuenta como «Retiro del dueño».
            </span>
          </motion.p>
        )}

        <motion.div className={styles.grid2} variants={fadeUp}>
          <button type="button" className={styles.stat} onClick={() => { setMonto(sueldo ? String(sueldo) : ''); setSheet(true) }}>
            <span className={styles.statLabel}>
              <Icon name="savings" size={16} /> Mi sueldo de dueño
            </span>
            <span className={styles.statValue}>{sueldo ? fmtSolesCorto(sueldo) : 'Definir'}</span>
            <span className={styles.muted}>{sueldo ? 'Toca para cambiarlo' : 'Págate un monto fijo al mes'}</span>
          </button>
          <div className={styles.stat}>
            <span className={styles.statLabel}>
              <Icon name="emoji_events" size={16} /> Reto 30 días
            </span>
            <span className={styles.statValue}>
              {reto.dias}/{RETO_DIAS}
            </span>
            <ProgressBar value={reto.dias / RETO_DIAS} label="Reto 30 días con cuentas separadas" />
          </div>
        </motion.div>

        <motion.div className={styles.card} variants={fadeUp}>
          <SectionHead title="Reto «30 días con cuentas separadas»" />
          <p className={styles.small}>
            {reto.dias >= RETO_DIAS
              ? '¡Lo lograste! 30 días sin pagar gastos personales con la plata del negocio.'
              : reto.reinicio
                ? `Se reinició el ${fmtDiaMes(reto.reinicio.fecha)} por «${tituloMovimiento(reto.reinicio)}», que no cubría tu sueldo de dueño. ${sueldo ? '' : 'Define tu sueldo para que tus retiros cuenten como correctos.'}`
                : `Llevas ${reto.dias} días sin gastos personales fuera de tu sueldo. Sigue así hasta llegar a 30.`}
          </p>
          {!sueldo && (
            <Button icon="savings" onClick={() => setSheet(true)}>
              Definir mi sueldo de dueño
            </Button>
          )}
        </motion.div>

        <LessonCard id="L05" />
        <LessonCard id="L06" />

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Gastos personales de este mes" hint={`${lista.length}`} />
          {lista.length === 0 && <p className={`${styles.card} ${styles.muted}`}>No detectamos gastos personales este mes.</p>}
          <div className={styles.list}>
            {lista.map((m) => {
              const cl = a.classifications.get(m.id)!
              const confirmado = owns.has(m.id)
              const senales = a.personal.get(m.id)?.senales ?? []
              return (
                <div key={m.id} className={styles.card} style={{ gap: 10 }}>
                  <div className={styles.row} style={{ padding: 0, background: 'none', minHeight: 0 }}>
                    <span className={styles.rowIcon}>
                      <Icon name="person" size={20} />
                    </span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{tituloMovimiento(m)}</span>
                      <span className={styles.rowSub}>
                        {fmtFecha(m.fecha)} · {m.fecha.slice(11, 16)}
                      </span>
                    </span>
                    <span className={styles.rowEnd}>
                      <Money value={m.monto} />
                      {confirmado ? <Pill tone="alta">Confirmado</Pill> : <Pill tone="media">¿Personal?</Pill>}
                    </span>
                  </div>
                  {!confirmado && <p className={styles.muted}>{senales.length ? senales.join(' · ') : cl.motivo}</p>}
                  {!confirmado && (
                    <div className={styles.actions}>
                      <Button size="sm" variant="tonal" icon="check" onClick={() => marcar(m, true)}>
                        Sí, es personal
                      </Button>
                      <Button size="sm" variant="text" icon="storefront" onClick={() => marcar(m, false)}>
                        No, es del negocio
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.section>
      </motion.div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Mi sueldo de dueño">
        <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
          <p className={styles.small}>
            ¿Cuánto te vas a pagar al mes? Lo personal hasta ese monto cuenta como «Retiro del dueño». Si te pasas, Zenity te avisa.
          </p>
          <label className={styles.field}>
            Monto mensual (S/)
            <input className={styles.input} inputMode="decimal" placeholder="Ej. 500" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
          </label>
          <Button size="lg" icon="check" onClick={guardarSueldo} disabled={!Number(monto.replace(/[^\d.]/g, ''))}>
            Guardar
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
