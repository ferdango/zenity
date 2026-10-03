import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { FAQ, NOTIFICATIONS } from '../data/mock'
import { cn } from '../lib/cn'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './GlobalSheets.module.css'

function FaqList() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className={styles.list}>
      {FAQ.map((item, i) => (
        <div key={item.q} className={styles.faq}>
          <button
            type="button"
            className={styles.faqQuestion}
            data-ripple=""
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
            <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.3, ease: ease.emphasized }}>
              <Icon name="expand_more" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, transition: { duration: 0.35, ease: ease.emphasized } }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: ease.emphasized } }}
                style={{ overflow: 'hidden' }}
              >
                <p className={styles.faqAnswer}>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

function Rating({ onDone }: { onDone: (stars: number) => void }) {
  const [stars, setStars] = useState(0)
  const labels = ['', 'Necesita mejorar', 'Regular', 'Buena', '¡Muy buena!', '¡Excelente!']
  return (
    <div>
      <div className={styles.stars} role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} estrellas`}
            className={styles.star}
            data-on={n <= stars}
            data-ripple=""
            whileTap={{ scale: 0.85 }}
            animate={n <= stars ? { scale: [1, 1.25, 1], transition: { delay: n * 0.04, duration: 0.35 } } : { scale: 1 }}
            onClick={() => setStars(n)}
          >
            <Icon name="star" size={36} fill={n <= stars} />
          </motion.button>
        ))}
      </div>
      <p className={styles.rateText}>{stars ? labels[stars] : '¿Cómo va tu experiencia con Zenity?'}</p>
      <Button fullWidth size="lg" disabled={!stars} onClick={() => onDone(stars)}>
        Enviar calificación
      </Button>
    </div>
  )
}

/** Hojas globales abiertas desde el menú o la campana: notificaciones, FAQ y calificación. */
export function GlobalSheets() {
  const { sheet, openSheet, toast } = useApp()
  const close = () => openSheet(null)

  return (
    <>
      <BottomSheet open={sheet === 'notifications'} onClose={close} title="Notificaciones">
        <motion.ul className={styles.list} variants={staggerContainer(0.05, 0.1)} initial="hidden" animate="show">
          {NOTIFICATIONS.map((n) => (
            <motion.li key={n.id} className={styles.notification} variants={fadeUp}>
              <span className={cn(styles.notifIcon, styles[n.tone])}>
                <Icon name={n.icon} size={20} fill gradient={n.tone === 'ai'} />
              </span>
              <span>
                <span className="t-body-l" style={{ display: 'block' }}>
                  {n.title}
                </span>
                <span className="t-body-s t-low">{n.time}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </BottomSheet>

      <BottomSheet open={sheet === 'faq'} onClose={close} title="Preguntas frecuentes">
        <FaqList />
      </BottomSheet>

      <BottomSheet open={sheet === 'rating'} onClose={close} title="Califícanos">
        <Rating
          onDone={(stars) => {
            close()
            toast(`¡Gracias por tus ${stars} estrellas!`, 'favorite')
          }}
        />
      </BottomSheet>
    </>
  )
}
