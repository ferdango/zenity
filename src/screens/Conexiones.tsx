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
import { useApp } from '../state/context'

/** Tipo de fuente en palabras simples, para agrupar la lista. */
function grupo(c: Connection): 'Bancos y tarjetas' | 'Billeteras' | 'Archivos y APIs' {
  if (c.phone) return 'Billeteras'
  if (c.avatar === 'sheet' || c.label.toLowerCase().includes('api') || c.label.toLowerCase().includes('excel')) return 'Archivos y APIs'
  return 'Bancos y tarjetas'
}

const GRUPOS = ['Bancos y tarjetas', 'Billeteras', 'Archivos y APIs'] as const

/** Hora actual que se renueva cada medio minuto (para «hace 5 min»). */
function useNow(): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

/** «Conexiones»: todas las cuentas, billeteras, archivos y APIs del negocio, su estado y cómo agregar más. */
export function Conexiones() {
  const { connections, business } = useApp()
  const now = useNow()
  const total = connections.reduce((s, c) => s + c.balance, 0)
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
          <span className={styles.heroLabel}>Saldo en tus conexiones</span>
          <Money animated value={total} className={styles.heroAmount} />
          <span className={styles.heroMeta}>
            {connections.length} conexi{connections.length === 1 ? 'ón' : 'ones'}
            {ultima ? ` · Sincronizado ${formatAgo(ultima, now)}` : ''}
            {sincronizando > 0 && ` · ${sincronizando} sincronizando`}
          </span>
        </motion.section>

        <motion.div variants={fadeUp} style={{ display: 'grid' }}>
          <Button size="lg" icon="add" to="/conexiones/nueva">
            Agregar una conexión
          </Button>
        </motion.div>

        {connections.length === 0 ? (
          <motion.section className={styles.section} variants={fadeUp}>
            <p className={styles.rowSub} style={{ whiteSpace: 'normal' }}>Aún no conectas nada. Bancos, Yape, Plin, APIs o un Excel: todo suma en un solo lugar.</p>
          </motion.section>
        ) : (
          GRUPOS.map((g) => {
            const lista = connections.filter((c) => grupo(c) === g)
            if (!lista.length) return null
            return (
              <motion.section key={g} className={styles.section} variants={fadeUp}>
                <SectionHead title={g} hint={`${lista.length}`} />
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
  const sincronizando = Boolean(c.sourceId) && !c.syncedAt
  const detalle = c.last4 ? `•••• ${c.last4}` : c.phone ? `Celular ••• ${c.phone}` : (source?.name ?? c.label)
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
        ) : (
          <Money value={c.balance} />
        )}
      </span>
    </Link>
  )
}
