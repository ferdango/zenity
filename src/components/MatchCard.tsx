import { AnimatePresence, motion } from 'motion/react'
import type { Connection } from '../data/mock'
import type { MatchCandidate, MatchChoice } from '../data/matches'
import { avatarFor, connectionName } from '../data/selectors'
import { formatDateTime, formatMoney, formatShortDate } from '../lib/format'
import { ease, fadeUp } from '../lib/motion'
import { Amount } from './Amount'
import { BrandAvatar } from './Avatars'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './MatchCard.module.css'

interface MatchCardProps {
  match: MatchCandidate
  choice?: MatchChoice
  connections: Connection[]
  onChoose: (choice: MatchChoice | null) => void
}

/** Puntaje alto, medio o bajo (colores verde, ámbar y neutro). */
function scoreLevel(score: number) {
  return score >= 90 ? 'high' : score >= 75 ? 'medium' : 'low'
}

/** «¿Es el mismo movimiento?»: dos movimientos de conexiones distintas que pueden ser uno solo. */
export function MatchCard({ match, choice, connections, onChoose }: MatchCardProps) {
  const [first] = match.legs
  const flow = first.amount > 0 ? 'ingresos' : 'egresos'
  const toggle = (next: MatchChoice) => onChoose(choice === next ? null : next)

  return (
    <motion.li className={styles.card} data-choice={choice} variants={fadeUp} layout="position">
      <div className={styles.head}>
        <span className={styles.score} data-level={scoreLevel(match.score)}>
          <Icon name="link" size={16} />
          {match.score}% de coincidencia
        </span>
      </div>

      <div className={styles.legs}>
        {match.legs.map((leg) => {
          const avatar = avatarFor(leg.accountId, connections)
          return (
            <div key={leg.accountId} className={styles.leg}>
              <BrandAvatar kind={avatar} size={36} verified={avatar === 'visa' || avatar === 'mastercard'} />
              <span className={styles.legText}>
                <span className={styles.legTitle}>{leg.title}</span>
                <span className={styles.legSub}>{connectionName(leg.accountId, connections)}</span>
                <span className={styles.legRef}>
                  {leg.dateOnly ? formatShortDate(leg.date) : formatDateTime(leg.date)} · {leg.reference}
                </span>
              </span>
              <Amount value={leg.amount} sign="always" tone="auto" animate={false} className={styles.legAmount} />
            </div>
          )
        })}
      </div>

      <ul className={styles.reasons} aria-label="Por qué se parecen">
        {match.reasons.map((reason) => (
          <li key={reason.label}>
            <Icon name={reason.icon} size={16} />
            {reason.label}
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <Button
          size="sm"
          variant={choice === 'same' ? 'filled' : 'tonal'}
          icon={choice === 'same' ? 'check' : 'link'}
          aria-pressed={choice === 'same'}
          onClick={() => toggle('same')}
        >
          Es el mismo
        </Button>
        <Button
          size="sm"
          variant={choice === 'different' ? 'filled' : 'outlined'}
          icon={choice === 'different' ? 'check' : 'link_off'}
          aria-pressed={choice === 'different'}
          onClick={() => toggle('different')}
        >
          Son distintos
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {choice && (
          <motion.p
            key={choice}
            className={styles.outcome}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.35, ease: ease.emphasized } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: ease.emphasized } }}
          >
            <span>
              {choice === 'same'
                ? `Zenity los unirá: ${formatMoney(Math.abs(first.amount))} contará una sola vez en tus ${flow}.`
                : 'Quedarán como dos movimientos separados y Zenity no volverá a sugerir este par.'}
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
