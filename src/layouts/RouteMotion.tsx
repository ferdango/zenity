import { motion } from 'motion/react'
import { type ReactNode, useLayoutEffect } from 'react'
import { pageVariants, restoreScroll, type RouteTransition } from './transitions'

interface RouteMotionProps {
  children: ReactNode
  transition: RouteTransition
  scrollKey: string
  className?: string
}

/** Contenedor animado de cada pantalla; restaura el scroll al montar. */
export function RouteMotion({ children, transition, scrollKey, className }: RouteMotionProps) {
  useLayoutEffect(() => {
    restoreScroll(scrollKey, transition.pop)
    // Solo al montar: cada pantalla es una instancia nueva con su propia key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className={className}
      custom={transition}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ minHeight: '100dvh' }}
    >
      {children}
    </motion.div>
  )
}
