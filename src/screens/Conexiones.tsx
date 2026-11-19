import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BrandAvatar } from '../components/Avatars'
import { BusinessButton } from '../components/Business'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { Money, Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { businessName } from '../data/businesses'
import type { Connection } from '../data/mock'
import { getSource } from '../data/sources'
import { SYNC_EVERY_HOURS } from '../data/sync'
import { formatAgo } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { ORDEN_TIPOS, type TipoConexion, TIPOS_CONEXION } from '../domain/conexiones'
import { useApp } from '../state/context'
import { abonaEn, saldoReal, tipoDe, useCobradoCanal } from '../state/useConexiones'

/** Hora actual que se renueva cada medio minuto (para «hace 5 min»). */
function useNow(): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * «Conexiones» separadas por tipo: las cuentas (donde está la plata, su saldo se suma), los canales de
 * venta (por dónde te pagan; lo que cobran ya se abonó en una cuenta, así que no se suman), las
 * tarjetas de crédito (deuda) y los archivos.
 */
export function Conexiones() {
  const { connections, business } = useApp()
  const now = useNow()
  const total = saldoReal(connections)
  const porTipo = (t: TipoConexion) => connections.filter((c) => tipoDe(c) === t)
  const cuentas = porTipo('cuenta').length
  const canales = porTipo('canal').length
  const sincronizando = connections.filter((c) => !c.syncedAt && c.sourceId).length
  const ultima = connections
    .map((c) => c.syncedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)

  return (
    <div className="z-page">
      <TopBar title="Conexiones" subtitle={businessName(business)} end={<BusinessButton />} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.04)} initial="hidden" animate="show">
        <motion.section className={styles.hero} variants={fadeUp} aria-live="polite">
          <span className={styles.heroLabel}>Saldo en tus cuentas</span>
          <Money animated value={total} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            {plural(cuentas, 'cuenta', 'cuentas')}
            {canales > 0 && ` · ${plural(canales, 'canal de venta', 'canales de venta')}`}
            {ultima ? ` · Sincronizado ${formatAgo(ultima, now)}` : ''}
            {sincronizando > 0 && ` · ${sincronizando} sincronizando`}
          </span>
        </motion.section>

        {canales > 0 && (
          <motion.p className={styles.nota} variants={fadeUp}>
            <Icon name="info" size={18} />
            <span>
              Los canales de venta no se suman a tu saldo: lo que cobran por ahí ya se abonó en tus cuentas. Así la misma venta no cuenta dos veces.
            </span>
          </motion.p>
        )}

        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Button size="lg" icon="add" to="/conexiones/nueva">
            Agregar una conexión
          </Button>
        </motion.div>

        {connections.length === 0 ? (
          <motion.section className={styles.section} variants={fadeUp}>
            <p className={styles.rowSub} style={{ whiteSpace: 'normal' }}>Aún no conectas nada. Tu banco te da el saldo; Yape, Plin, el POS o tu tienda en línea, tus ventas; y un Excel, tus datos.</p>
          </motion.section>
        ) : (
          ORDEN_TIPOS.map((t) => {
            const lista = porTipo(t)
            if (!lista.length) return null
            return (
              <motion.section key={t} className={styles.section} variants={fadeUp}>
                <SectionHead title={TIPOS_CONEXION[t].titulo} hint={TIPOS_CONEXION[t].detalle} />
                <div className={styles.list}>
                  <AnimatePresence initial={false}>
                    {lista.map((c) => (
                      <motion.div key={c.id} layout exit={{ opacity: 0, height: 0 }}>
                        <ConexionRow connection={c} now={now} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )
          })
        )}

        <motion.p className={styles.rowSub} variants={fadeUp} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', whiteSpace: 'normal' }}>
          <Icon name="sync" size={18} />
          Zenity lee tus cuentas cada {SYNC_EVERY_HOURS} horas. Solo lectura: no puede mover tu dinero.
        </motion.p>
      </motion.div>
    </div>
  )
}

function ConexionRow({ connection: c, now }: { connection: Connection; now: number }) {
  const source = getSource(c.sourceId)
  const tipo = tipoDe(c)
  const cobrado = useCobradoCanal(c)
  const destino = tipo === 'canal' ? abonaEn(c) : null
  const sincronizando = Boolean(c.sourceId) && !c.syncedAt
  const detalle = destino
    ? `Se abona en ${destino}`
    : c.last4
      ? `•••• ${c.last4}`
      : c.phone
        ? `Celular ••• ${c.phone}`
        : (source?.name ?? c.label)
  return (
    <Link to={`/conexion/${c.id}`} className={styles.row} data-ripple="">
      <BrandAvatar kind={c.avatar} size={40} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{c.name}</span>
        <span className={styles.rowSub}>
          {detalle}
          {c.syncedAt && ` · ${formatAgo(c.syncedAt, now)}`}
        </span>
      </span>
      <span className={styles.rowEnd}>
        {sincronizando ? (
          <Pill tone="info" icon="sync">
            Sincronizando
          </Pill>
        ) : tipo === 'cuenta' ? (
          <Money value={c.balance} />
        ) : tipo === 'canal' ? (
          cobrado !== null ? (
            <>
              <Money value={cobrado} className={styles.amountPos} />
              <span className={styles.rowSub}>cobrado este mes</span>
            </>
          ) : (
            <Icon name="chevron_right" size={20} />
          )
        ) : tipo === 'tarjeta' ? (
          <>
            <Money value={c.balance} />
            <span className={styles.rowSub}>usado</span>
          </>
        ) : (
          <Icon name="chevron_right" size={20} />
        )}
      </span>
    </Link>
  )
}
