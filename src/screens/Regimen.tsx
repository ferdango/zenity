import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { LessonCard, NoDemoData, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { businessName } from '../data/businesses'
import { masBarato, REGIMEN_NOMBRE, simularRegimenes, topeRegimen } from '../domain/taxSimulator'
import { fmtPct, fmtSolesCorto } from '../domain/util'
import { fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { track } from '../lib/analytics'
import { comentar, marcarRegimenRevisado } from '../state/demoStore'
import { useSimulador, useZen } from '../state/useZen'

const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
const miles = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })

/** F-07 · Simulador de régimen tributario. */
export function Regimen() {
  const { business, toast } = useApp()
  const { a } = useZen()
  const sim = useSimulador()
  const [ingresos, setIngresos] = useState('')
  const [compras, setCompras] = useState('')
  const [gastos, setGastos] = useState('')
  const [factura, setFactura] = useState<boolean | null>(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    if (!a || !sim) return
    marcarRegimenRevisado(a.business.id)
    const r = simularRegimenes({ ...sim.datos, necesitaFactura: a.business.regimenTributario !== 'NRUS' })
    const mejor = masBarato(r)
    track('regimen_simulado', { actual: a.business.regimenTributario, mas_barato: mejor.regimen, conviene_cambiar: mejor.regimen !== a.business.regimenTributario })
  }, [a?.business.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!a || !sim) {
    return (
      <div className="z-page">
        <TopBar title="Simulador de régimen" subtitle={businessName(business)} />
        <div className="z-container z-gutter">
          <NoDemoData feature="El simulador de régimen" />
        </div>
      </div>
    )
  }

  const ing = ingresos ? num(ingresos) : sim.datos.ingresosAnuales
  const com = compras ? num(compras) : sim.datos.comprasAnuales
  const gas = gastos ? num(gastos) : sim.datos.gastosDeducibles
  const necesitaFactura = factura ?? a.business.regimenTributario !== 'NRUS'
  const resultados = simularRegimenes({ ingresosAnuales: ing, comprasAnuales: com, gastosDeducibles: gas, ingresoMensualMax: ingresos ? ing / 12 : sim.datos.ingresoMensualMax, necesitaFactura })
  const mejor = masBarato(resultados)
  const actual = a.business.regimenTributario
  const tope = topeRegimen(actual)
  const pct = tope ? ing / tope : 0

  const enviar = () => {
    const filas = resultados.map((r) => `${r.nombre}: ${r.disponible ? fmtSolesCorto(r.total) : 'no disponible'}`).join(' · ')
    comentar({
      businessId: a.business.id,
      movementId: 'simulador',
      autor: 'DUENO',
      texto: `Hice el simulador de régimen con ingresos de ${fmtSolesCorto(ing)} y gastos de ${fmtSolesCorto(gas)} al año. ${filas}. Me sale más barato el ${mejor.nombre}. ¿Lo revisamos?`,
    })
    setEnviado(true)
    toast('Enviado a tu contador', 'send')
  }

  return (
    <div className="z-page">
      <TopBar title="Simulador de régimen" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        {tope && pct >= 0.8 && (
          <motion.div className={pct >= 1 ? styles.bannerDanger : styles.bannerWarn} variants={fadeUp} role="alert">
            <Icon name="speed" size={22} />
            <span>
              <strong className={styles.bannerTitle}>
                Vas al {fmtPct(pct)} del límite del {REGIMEN_NOMBRE[actual]} ({fmtSolesCorto(tope)})
              </strong>
              Si lo pasas, SUNAT te cambia de régimen. Conviene decidir con tiempo.
            </span>
          </motion.div>
        )}

        <motion.section className={styles.card} variants={fadeUp}>
          <SectionHead title="Tus números de los últimos 12 meses" hint={a.business.dosVias ? 'Desde tus boletas' : 'Desde el SIRE'} />
          <label className={styles.field}>
            Ingresos netos (sin IGV)
            <input className={styles.input} inputMode="numeric" value={ingresos || miles(sim.datos.ingresosAnuales)} onChange={(e) => setIngresos(e.target.value)} />
          </label>
          <label className={styles.field}>
            Compras con comprobante (sin IGV)
            <input className={styles.input} inputMode="numeric" value={compras || miles(sim.datos.comprasAnuales)} onChange={(e) => setCompras(e.target.value)} />
          </label>
          <label className={styles.field}>
            Gastos deducibles estimados (compras + gastos del negocio)
            <input className={styles.input} inputMode="numeric" value={gastos || miles(sim.datos.gastosDeducibles)} onChange={(e) => setGastos(e.target.value)} />
          </label>
          <div className={styles.field}>
            ¿Tus clientes te piden factura?
            <div className={styles.chipsWrap}>
              <Chip selected={necesitaFactura} showCheck onClick={() => setFactura(true)}>
                Sí
              </Chip>
              <Chip selected={!necesitaFactura} showCheck onClick={() => setFactura(false)}>
                No, solo boletas
              </Chip>
            </div>
          </div>
        </motion.section>

        <motion.section className={styles.section} variants={fadeUp}>
          <SectionHead title="Cuánto pagarías al año" hint={`El más barato: ${mejor.nombre}`} />
          <div className={styles.list}>
            {resultados.map((r) => (
              <article
                key={r.regimen}
                className={styles.card}
                style={r.regimen === mejor.regimen ? { borderColor: 'var(--z-positive)', background: 'color-mix(in srgb, var(--z-positive) 6%, var(--z-surface))' } : !r.disponible ? { opacity: 0.6 } : undefined}
              >
                <div className={styles.sectionHead} style={{ padding: 0 }}>
                  <span className="t-title-m">{r.nombre}</span>
                  <span className={styles.actions}>
                    {r.regimen === actual && <Pill tone="info">Tu régimen actual</Pill>}
                    {r.regimen === mejor.regimen && <Pill tone="alta">Más barato</Pill>}
                    {!r.disponible && <Pill tone="baja">No disponible</Pill>}
                  </span>
                </div>
                {r.disponible ? (
                  <div className={styles.grid2}>
                    <div>
                      <span className={styles.muted}>{r.regimen === 'NRUS' ? 'Cuotas del año (incluye IGV)' : 'Renta anual'}</span>
                      <p className="t-title-m">{fmtSolesCorto(r.renta)}</p>
                    </div>
                    <div>
                      <span className={styles.muted}>IGV anual estimado</span>
                      <p className="t-title-m">{r.regimen === 'NRUS' ? 'Incluido' : fmtSolesCorto(r.igv)}</p>
                    </div>
                    <div>
                      <span className={styles.muted}>Total</span>
                      <p className="t-headline-s">{fmtSolesCorto(r.total)}</p>
                    </div>
                  </div>
                ) : (
                  <p className={styles.small}>{r.motivoNoDisponible}</p>
                )}
                <p className={styles.muted}>{r.implica.join(' · ')}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.p className={styles.banner} variants={fadeUp}>
          <Icon name="info" size={20} />
          <span>Estimación referencial. Valida con tu contador antes de cambiar de régimen: el cambio solo se puede hacer en ciertos momentos y tiene reglas.</span>
        </motion.p>

        <LessonCard id="L09" />

        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Button size="lg" icon={enviado ? 'check' : 'send'} onClick={enviar} disabled={enviado}>
            {enviado ? 'Enviado a tu contador' : 'Enviar a mi contador'}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
