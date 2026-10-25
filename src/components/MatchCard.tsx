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
import { Spark } from './Spark'
import styles from './MatchCard.module.css'

interface MatchCardProps {
  match: MatchCandidate
  choice: MatchChoice
  /** La decisión es de Zenity (no la corrigió el usuario) */
  auto: boolean
  connections: Connection[]
  onChoose: (choice: MatchChoice) => void
}

/** Puntaje alto, medio o bajo (colores verde, ámbar y neutro). */
function scoreLevel(score: number) {
  return score >= 90 ? 'high' : score >= 75 ? 'medium' : 'low'
}

/**
 * Dos movimientos de conexiones distintas que pueden ser uno solo. Zenity ya decidió si los
 * une; la tarjeta muestra por qué y deja corregirlo con un toque.
 */
export function MatchCard({ match, choice, auto, connections, onChoose }: MatchCardProps) {
  const [first] = match.legs
  const flow = first.amount > 0 ? 'ingresos' : 'egresos'
  const amount = Math.abs(first.amount)

  return (
    <motion.li className={styles.card} data-choice={choice} variants={fadeUp} layout="position">
      <div className={styles.head}>
        <span className={styles.score} data-level={scoreLevel(match.score)}>
          <Icon name="link" size={16} />
          {match.score}% de coincidencia
        </span>
        <span className={styles.decidedBy} data-auto={auto}>
          {auto ? <Spark size={14} /> : <Icon name="person" size={16} />}
          {auto ? (choice === 'same' ? 'Unido por Zenity' : 'Separado por Zenity') : 'Corregido por ti'}
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
          onClick={() => onChoose('same')}
        >
          Es el mismo
        </Button>
        <Button
          size="sm"
          variant={choice === 'different' ? 'filled' : 'outlined'}
          icon={choice === 'different' ? 'check' : 'link_off'}
          aria-pressed={choice === 'different'}
          onClick={() => onChoose('different')}
        >
          Son distintos
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={choice}
          className={styles.outcome}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3, ease: ease.decelerate } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <span>
            {choice === 'same'
              ? `Unidos: ${formatMoney(amount)} cuenta una sola vez en tus ${flow}.`
              : `Separados: tus ${flow} suman ${formatMoney(amount * 2)} en lugar de ${formatMoney(amount)}.`}
          </span>
        </motion.p>
      </AnimatePresence>
    </motion.li>
  )
}
