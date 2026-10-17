import { AnimatePresence, motion } from 'motion/react'
import { type Regimen, REGIMEN_ORDER, REGIMENES, rateLabel } from '../data/sire'
import { Icon } from './Icon'
import styles from './RegimenPicker.module.css'

interface RegimenPickerProps {
  /** id del primer radio, para enfocarlo cuando falta elegir */
  id: string
  value: Regimen | ''
  onChange: (regimen: Regimen) => void
  error?: string | null
  /** Regímenes que no aplican, con el motivo que se muestra en su lugar */
  unavailable?: Partial<Record<Regimen, string>>
}

/** Selector del régimen tributario del RUC (General, RMT o RER) con la tasa de Renta de cada uno. */
export function RegimenPicker({ id, value, onChange, error, unavailable }: RegimenPickerProps) {
  const errorId = `${id}-error`
  return (
    <fieldset className={styles.picker} aria-describedby={error ? errorId : `${id}-help`} aria-invalid={Boolean(error)}>
      <legend className="visually-hidden">Régimen tributario</legend>
      {REGIMEN_ORDER.map((regimen, i) => {
        const info = REGIMENES[regimen]
        const reason = unavailable?.[regimen]
        const checked = value === regimen
        return (
          <label key={regimen} className={styles.option} data-checked={checked} data-unavailable={Boolean(reason)} data-ripple="">
            <input
              type="radio"
              id={i === 0 ? id : undefined}
              name={id}
              value={regimen}
              checked={checked}
              disabled={Boolean(reason) && !checked}
              onChange={() => onChange(regimen)}
              className={styles.input}
            />
            <span className={styles.radio} aria-hidden>
              <AnimatePresence initial={false}>
                {checked && (
                  <motion.span
                    className={styles.dot}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  />
                )}
              </AnimatePresence>
            </span>
            <span className={styles.text}>
              <span className={styles.head}>
                <strong>{info.label}</strong>
                <span className={styles.rate}>Renta {rateLabel(info.tasa)} al mes</span>
              </span>
              <span className={styles.desc} data-warning={Boolean(reason)}>
                {reason ?? info.requisito}
              </span>
            </span>
          </label>
        )
      })}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          <Icon name="error" size={16} />
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className={styles.help}>
          En los tres pagas IGV de 18%. Si no sabes cuál es el tuyo, revísalo en SUNAT con tu Clave SOL o con tu contador.
        </p>
      )}
    </fieldset>
  )
}
