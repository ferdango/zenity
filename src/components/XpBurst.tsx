import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../state/context'
import { useProgreso } from '../state/useZen'
import { Icon } from './Icon'
import styles from './Overlay.module.css'

interface Burst {
  id: number
  xp: number
}

/**
 * Respuesta inmediata al estilo Duolingo: cada tarea que da XP muestra «+10 XP» que sube y se
 * desvanece; asegurar la racha, cumplir la meta del día o subir de nivel se celebra con un aviso.
 */
export function XpBurst() {
  const p = useProgreso()
  const { toast } = useApp()
  const antes = useRef<{ xp: number; nivel: number; meta: boolean; racha: boolean } | null>(null)
  const seq = useRef(0)
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    const previo = antes.current
    antes.current = { xp: p.xp, nivel: p.nivel.numero, meta: p.metaCumplida, racha: p.rachaHoy }
    if (!previo) return
    const ganado = p.xp - previo.xp
    if (ganado <= 0) return
    const id = ++seq.current
    // Se agenda fuera del efecto para no encadenar renders en el mismo ciclo
    queueMicrotask(() => setBursts((list) => [...list.slice(-2), { id, xp: ganado }]))
    window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1500)
    if (p.nivel.numero > previo.nivel) toast(`¡Subiste al nivel ${p.nivel.numero}: ${p.nivel.nombre}!`, 'celebration')
    else if (p.metaCumplida && !previo.meta) toast('¡Cumpliste tu meta de hoy!', 'celebration')
    else if (p.rachaHoy && !previo.racha) toast(`¡Racha de ${p.racha} días! Sigue mañana`, 'local_fire_department')
  }, [p.xp, p.nivel.numero, p.nivel.nombre, p.metaCumplida, p.rachaHoy, p.racha, toast])

  return createPortal(
    <div className={styles.xpLayer} aria-live="polite">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.span
            key={b.id}
            className={styles.xpBurst}
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], y: [16, 0, -6, -28], scale: [0.8, 1.08, 1, 1] }}
            transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1], ease: 'easeOut' }}
          >
            <Icon name="bolt" size={18} fill />+{b.xp} XP
          </motion.span>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
