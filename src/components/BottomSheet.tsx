import { AnimatePresence, motion, useDragControls } from 'motion/react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ease, spring } from '../lib/motion'
import { useOverlay } from '../lib/useOverlay'
import { IconButton } from './IconButton'
import styles from './Overlay.module.css'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Etiqueta accesible si no hay título visible */
  label?: string
  children: ReactNode
  showClose?: boolean
}

/** Hoja inferior de Material 3: entra con resorte y se cierra arrastrando hacia abajo. */
export function BottomSheet({ open, onClose, title, label, children, showClose = true }: BottomSheetProps) {
  const panelRef = useOverlay(open, onClose)
  const dragControls = useDragControls()

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: ease.standard }}
            onClick={onClose}
          />
          <div className={styles.sheetWrap} key="sheet">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === 'string' ? title : label}
              tabIndex={-1}
              className={styles.sheet}
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1, transition: spring.soft }}
              exit={{ y: '100%', opacity: 0.6, transition: { duration: 0.25, ease: ease.accelerate } }}
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 650) onClose()
              }}
            >
              <div className={styles.handle} onPointerDown={(event) => dragControls.start(event)} />
              {(title || showClose) && (
                <div className={styles.sheetHeader} onPointerDown={(event) => dragControls.start(event)}>
                  <h2 className="t-headline-s">{title}</h2>
                  {showClose && <IconButton icon="close" label="Cerrar" onClick={onClose} />}
                </div>
              )}
              <div className={styles.sheetBody}>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
