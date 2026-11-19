import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import { DoneCheck, SectionHead } from '../components/zen'
import { businessName } from '../data/businesses'
import { type Canje, CATEGORIAS_TIENDA, type CategoriaProducto, disponibilidad, type Producto, PRODUCTOS, vecesCanjeado } from '../domain/loyalty'
import { fmtFecha } from '../domain/util'
import { celebrateFrom } from '../lib/celebrate'
import { haptic } from '../lib/haptics'
import { fadeUp, spring, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import { canjearProducto } from '../state/demoStore'
import { useProgreso } from '../state/useZen'
import styles from './Loyalty.module.css'

type Filtro = 'todo' | CategoriaProducto
const FILTROS: Filtro[] = ['todo', 'racha', 'aprende', 'negocio']

/** «Tienda de puntos»: lo que se compra con el XP ganado aprendiendo. */
export function Tienda() {
  const { business } = useApp()
  const p = useProgreso()
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [elegido, setElegido] = useState<Producto | null>(null)
  const lista = PRODUCTOS.filter((x) => filtro === 'todo' || x.categoria === filtro)
  const mios = [...p.canjes].reverse()

  return (
    <div className="z-page">
      <TopBar title="Tienda de puntos" subtitle={businessName(business)} />
      <motion.div className={`z-container ${styles.page}`} variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.section className={styles.saldo} variants={fadeUp} aria-live="polite">
          <span className={styles.saldoLabel}>Tus puntos para canjear</span>
          <motion.strong key={p.puntos} className={styles.saldoValor} initial={{ scale: 0.92, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
            <Icon name="bolt" size={30} fill />
            {p.puntos} XP
          </motion.strong>
          <span className={styles.saldoMeta}>
            Nivel {p.nivel.numero} · {p.nivel.nombre}. Canjear no baja tu nivel.
          </span>
          <Link to="/progreso" className={styles.saldoLink}>
            Gana más XP en Tu camino
            <Icon name="chevron_right" size={18} />
          </Link>
        </motion.section>

        <motion.div className={styles.filtros} variants={fadeUp} role="tablist" aria-label="Categorías">
          {FILTROS.map((f) => (
            <Chip key={f} selected={filtro === f} onClick={() => setFiltro(f)} role="tab" aria-selected={filtro === f}>
              {f === 'todo' ? 'Todo' : CATEGORIAS_TIENDA[f]}
            </Chip>
          ))}
        </motion.div>

        <motion.div className={styles.grid} variants={fadeUp} layout>
          <AnimatePresence initial={false}>
            {lista.map((x) => (
              <motion.div key={x.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                <ProductoCard producto={x} disponibles={p.puntos} canjes={p.canjes} onCanjear={() => setElegido(x)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {mios.length > 0 && (
          <motion.section className={styles.section} variants={fadeUp}>
            <SectionHead title="Mis canjes" hint={`${mios.length}`} />
            <div className={styles.canjes}>
              {mios.map((c) => (
                <CanjeFila key={c.id} canje={c} />
              ))}
            </div>
          </motion.section>
        )}

        <motion.p className={styles.nota} variants={fadeUp}>
          <Icon name="info" size={16} />
          <span>Prototipo: el catálogo y los canjes son de ejemplo; todavía no se entregan.</span>
        </motion.p>
      </motion.div>

      <HojaCanje producto={elegido} disponibles={p.puntos} canjes={p.canjes} onClose={() => setElegido(null)} />
    </div>
  )
}

function ProductoCard({ producto: x, disponibles, canjes, onCanjear }: { producto: Producto; disponibles: number; canjes: Canje[]; onCanjear: () => void }) {
  const d = disponibilidad(x, disponibles, canjes)
  const tienes = vecesCanjeado(x.id, canjes)
  return (
    <article className={styles.producto} data-categoria={x.categoria}>
      <span className={styles.productoIcon}>
        <Icon name={x.icon} size={26} fill />
      </span>
      {tienes > 0 && <span className={styles.tienes}>Tienes {tienes}</span>}
      <strong className={styles.productoNombre}>{x.nombre}</strong>
      <span className={styles.productoDetalle}>{x.detalle}</span>
      <span className={styles.precio}>
        <Icon name="bolt" size={16} fill />
        {x.xp} XP
      </span>
      <Button size="sm" variant={d.ok ? 'filled' : 'tonal'} disabled={!d.ok} onClick={onCanjear} fullWidth>
        {d.ok ? 'Canjear' : d.motivo === 'agotado' ? 'Agotado' : `Te faltan ${d.faltan}`}
      </Button>
    </article>
  )
}

function CanjeFila({ canje: c }: { canje: Canje }) {
  const { toast } = useApp()
  const x = PRODUCTOS.find((p) => p.id === c.productoId)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(c.codigo)
      toast('Código copiado', 'content_copy')
    } catch {
      toast('No se pudo copiar', 'error')
    }
  }
  return (
    <div className={styles.canje}>
      <span className={styles.canjeIcon} data-categoria={x?.categoria}>
        <Icon name={x?.icon ?? 'redeem'} size={20} fill />
      </span>
      <span className={styles.canjeTexto}>
        <strong>{x?.nombre ?? 'Canje'}</strong>
        <span>
          {fmtFecha(c.ts.slice(0, 10))} · {c.xp} XP
        </span>
      </span>
      <button type="button" className={styles.codigo} onClick={copiar} aria-label={`Copiar el código ${c.codigo}`}>
        {c.codigo}
        <Icon name="content_copy" size={16} />
      </button>
    </div>
  )
}

/** Confirmación y resultado del canje. */
function HojaCanje({ producto: x, disponibles, canjes, onClose }: { producto: Producto | null; disponibles: number; canjes: Canje[]; onClose: () => void }) {
  const [hecho, setHecho] = useState<Canje | null>(null)
  const cerrar = () => {
    setHecho(null)
    onClose()
  }
  const confirmar = (el: HTMLElement) => {
    if (!x) return
    const c = canjearProducto(x.id, disponibles)
    if (!c) {
      haptic('error')
      return
    }
    haptic('success')
    celebrateFrom(el, 40)
    setHecho(c)
  }
  const d = x ? disponibilidad(x, disponibles, canjes) : null

  return (
    <BottomSheet open={!!x} onClose={cerrar} title={hecho ? '¡Canjeado!' : 'Canjear'} label="Canjear producto">
      {x && (
        <div className={styles.hoja}>
          <span className={styles.hojaIcon} data-categoria={x.categoria}>
            {hecho ? <DoneCheck size={64} /> : <Icon name={x.icon} size={34} fill />}
          </span>
          <strong className={styles.hojaNombre}>{x.nombre}</strong>
          <span className={styles.productoDetalle}>{x.detalle}</span>
          {hecho ? (
            <>
              <span className={styles.hojaCodigo}>{hecho.codigo}</span>
              <span className={styles.productoDetalle}>Lo encuentras en «Mis canjes». Te quedan {disponibles} XP.</span>
              <Button size="lg" fullWidth onClick={cerrar}>
                Listo
              </Button>
            </>
          ) : (
            <>
              <span className={styles.hojaResumen}>
                Cuesta <strong>{x.xp} XP</strong> · te quedarían <strong>{Math.max(0, disponibles - x.xp)} XP</strong>
              </span>
              <Button size="lg" fullWidth icon="redeem" disabled={!d?.ok} onClick={(e) => confirmar(e.currentTarget)}>
                Canjear por {x.xp} XP
              </Button>
              <Button size="lg" variant="text" fullWidth onClick={cerrar}>
                Ahora no
              </Button>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
