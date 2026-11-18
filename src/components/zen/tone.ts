import styles from './zen.module.css'

/** Tonos de color para los íconos de las filas. */
export type Tone = 'info' | 'positive' | 'negative' | 'warning' | 'violet'

export const TONE_CLASS: Record<Tone, string> = {
  info: styles.toneInfo,
  positive: styles.tonePositive,
  negative: styles.toneNegative,
  warning: styles.toneWarning,
  violet: styles.toneViolet,
}
