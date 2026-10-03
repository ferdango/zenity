import { AnimatePresence, motion } from 'motion/react'
import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import overlay from '../components/Overlay.module.css'
import { ease, spring } from '../lib/motion'
import { useOverlay } from '../lib/useOverlay'
import { useApp } from '../state/context'
import { NavMenu } from './NavMenu'

/** Menú lateral móvil (Figma: Menu) con scrim y gesto de arrastre para cerrar. */
export function Drawer() {
  const { drawerOpen, setDrawerOpen } = useApp()
  const close = useCallback(() => setDrawerOpen(false), [setDrawerOpen])
  const panelRef = useOverlay(drawerOpen, close)

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            key="scrim"
            className={overlay.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: ease.standard }}
            onClick={close}
          />
          <motion.aside
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            tabIndex={-1}
            style={{
              position: 'fixed',
              inset: '0 auto 0 0',
              zIndex: 61,
              width: 'min(86vw, 340px)',
              background: 'var(--z-surface-low)',
              borderRadius: '0 var(--z-radius-2xl) var(--z-radius-2xl) 0',
              boxShadow: 'var(--z-shadow-3)',
              paddingTop: 'var(--z-safe-top)',
              outline: 'none',
              touchAction: 'pan-y',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0, transition: spring.soft }}
            exit={{ x: '-100%', transition: { duration: 0.25, ease: ease.accelerate } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.6, right: 0.04 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90 || info.velocity.x < -600) close()
            }}
          >
            <NavMenu variant="drawer" onNavigate={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
