import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CELEBRATE_EVENT, type CelebrateOptions } from '../lib/celebrate'
import { haptic } from '../lib/haptics'

const COLORS = ['#4285f4', '#9b72cb', '#d96570', '#34a853', '#fbbc04', '#1a73e8']

interface Piece {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  rotate: number
  color: string
  w: number
  h: number
  round: boolean
  delay: number
}

interface Burst {
  id: number
  pieces: Piece[]
}

/** Ráfaga de confeti ligera (sin canvas): unas decenas de piezas animadas con Motion. */
export function Confetti() {
  const [bursts, setBursts] = useState<Burst[]>([])
  const seq = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const opts = (event as CustomEvent<CelebrateOptions>).detail ?? {}
      haptic('success')
      if (reduce) return
      const x = opts.x ?? window.innerWidth / 2
      const y = opts.y ?? window.innerHeight * 0.62
      const count = opts.count ?? 34
      const id = ++seq.current
      const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
        const speed = 160 + Math.random() * 260
        return {
          id: i,
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          rotate: (Math.random() - 0.5) * 720,
          color: COLORS[i % COLORS.length],
          w: 6 + Math.random() * 5,
          h: 8 + Math.random() * 8,
          round: Math.random() > 0.7,
          delay: Math.random() * 0.08,
        }
      })
      setBursts((list) => [...list.slice(-2), { id, pieces }])
      window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1600)
    }
    window.addEventListener(CELEBRATE_EVENT, onCelebrate)
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate)
  }, [reduce])

  return createPortal(
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
      <AnimatePresence>
        {bursts.flatMap((b) =>
          b.pieces.map((p) => (
            <motion.span
              key={`${b.id}-${p.id}`}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.w,
                height: p.round ? p.w : p.h,
                borderRadius: p.round ? '50%' : 2,
                background: p.color,
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{
                x: [0, p.dx * 0.8, p.dx],
                y: [0, p.dy * 0.8, p.dy + 320],
                rotate: p.rotate,
                scale: 1,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.35, delay: p.delay, ease: [0.15, 0.6, 0.4, 1], times: [0, 0.45, 1] }}
            />
          )),
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
