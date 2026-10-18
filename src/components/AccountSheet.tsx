import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import whatsapp from '../assets/brands/whatsapp.svg'
import { FAQ } from '../data/mock'
import { businessName } from '../data/businesses'
import { cn } from '../lib/cn'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './AccountSheet.module.css'
import { InitialsAvatar } from './Avatars'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { Icon } from './Icon'

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

type View = 'menu' | 'rating' | 'faq'

const TITLES: Record<View, string> = {
  menu: 'Ajustes de la cuenta',
  rating: 'Califícanos',
  faq: 'Preguntas frecuentes',
}

interface RowProps {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  tour?: string
}

function Row({ icon, label, onClick, danger, tour }: RowProps) {
  return (
    <motion.li variants={fadeUp}>
      <button type="button" className={cn(styles.row, danger && styles.danger)} data-ripple="" data-tour={tour} onClick={onClick}>
        <span className={styles.rowIcon}>{icon}</span>
        <span>{label}</span>
        <Icon name="chevron_right" size={18} className={styles.chevron} />
      </button>
    </motion.li>
  )
}

/**
 * Ajustes de la cuenta: perfil y las opciones que antes vivían al pie del menú (calificar,
 * comunidad, preguntas frecuentes, tutorial y cerrar sesión). Calificar y las preguntas
 * frecuentes se abren dentro del mismo modal, con botón de volver.
 */
export function AccountSheet() {
  const { sheet, openSheet, profile, business, toast, startTour } = useApp()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [view, setView] = useState<View>('menu')
  const open = sheet === 'account'

  // Cada vez que se abre, empieza en el menú
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setView('menu')
  }

  const close = () => openSheet(null)

  const startTutorial = () => {
    close()
    if (pathname !== '/inicio') navigate('/inicio')
    window.setTimeout(startTour, pathname === '/inicio' ? 350 : 900)
  }

  return (
    <BottomSheet open={open} onClose={close} title={TITLES[view]} onBack={view === 'menu' ? undefined : () => setView('menu')}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === 'menu' ? -16 : 16 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: ease.decelerate } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          {view === 'menu' && (
            <>
              <div className={styles.profile}>
                <span className={styles.avatarRing}>
                  <InitialsAvatar initials={profile.initials} size={52} />
                </span>
                <span className={styles.profileText}>
                  <strong>{profile.fullName}</strong>
                  <span>
                    {businessName(business)} · RUC {business.ruc}
                  </span>
                </span>
              </div>

              <motion.ul className={styles.list} variants={staggerContainer(0.04)} initial="hidden" animate="show">
                <Row icon={<Icon name="favorite" size={20} />} label="Califícanos" onClick={() => setView('rating')} />
                <Row
                  icon={<img src={whatsapp} alt="" width={20} height={20} />}
                  label="Comunidad en WhatsApp"
                  onClick={() => {
                    close()
                    toast('Muy pronto: comunidad de Zenity en WhatsApp', 'groups')
                  }}
                />
                <Row icon={<Icon name="help" size={20} />} label="Preguntas frecuentes" onClick={() => setView('faq')} />
                <Row icon={<Icon name="tour" size={20} />} label="Ver tutorial" onClick={startTutorial} />
              </motion.ul>

              <div className={styles.divider} />

              <ul className={styles.list}>
                <Row
                  icon={<Icon name="logout" size={20} />}
                  label="Cerrar sesión"
                  danger
                  onClick={() => {
                    close()
                    navigate('/', { replace: true })
                  }}
                />
              </ul>
              <p className={styles.version}>Zenity · v. 1.0.0</p>
            </>
          )}

          {view === 'rating' && (
            <Rating
              onDone={(stars) => {
                close()
                toast(`¡Gracias por tus ${stars} estrellas!`, 'favorite')
              }}
            />
          )}

          {view === 'faq' && <FaqList />}
        </motion.div>
      </AnimatePresence>
    </BottomSheet>
  )
}
