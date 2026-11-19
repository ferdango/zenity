import type { CSSProperties } from 'react'
import { PATRON_MARCA, SPARK_MASK } from '../lib/sparkPath'
import styles from './BrandPattern.module.css'

type Tono = 'ia' | 'oro' | 'violeta'

/** Destellos sueltos a los costados, repartidos a lo largo de la página (el camino es largo). */
const ACENTOS: { top: string; lado: 'left' | 'right'; x: string; size: number; tono: Tono; delay: number }[] = [
  { top: '7%', lado: 'left', x: '5%', size: 18, tono: 'oro', delay: 0 },
  { top: '16%', lado: 'right', x: '6%', size: 26, tono: 'ia', delay: 1.2 },
  { top: '27%', lado: 'left', x: '7%', size: 14, tono: 'violeta', delay: 2.1 },
  { top: '36%', lado: 'right', x: '4%', size: 16, tono: 'oro', delay: 0.6 },
  { top: '47%', lado: 'left', x: '4%', size: 24, tono: 'ia', delay: 1.8 },
  { top: '58%', lado: 'right', x: '8%', size: 14, tono: 'violeta', delay: 2.6 },
  { top: '68%', lado: 'left', x: '8%', size: 18, tono: 'oro', delay: 0.9 },
  { top: '79%', lado: 'right', x: '5%', size: 24, tono: 'ia', delay: 2.3 },
  { top: '90%', lado: 'left', x: '6%', size: 14, tono: 'violeta', delay: 1.4 },
]

/**
 * Fondo ilustrado con la marca: luces de color, el patrón de destellos de Zenity y algunos
 * destellos que titilan. Va detrás del contenido de una página con `isolation: isolate` (`.z-page`).
 */
export function BrandPattern({ className }: { className?: string }) {
  return (
    <div className={`${styles.fondo} ${className ?? ''}`} aria-hidden style={{ '--patron': PATRON_MARCA, '--destello': SPARK_MASK } as CSSProperties}>
      <span className={styles.luz} data-luz="violeta" />
      <span className={styles.luz} data-luz="rosa" />
      <span className={styles.luz} data-luz="oro" />
      <span className={styles.luz} data-luz="violeta-bajo" />
      <span className={styles.patron} />
      {ACENTOS.map((a) => (
        <span
          key={a.top}
          className={styles.acento}
          data-tono={a.tono}
          style={{ top: a.top, [a.lado]: a.x, width: a.size, height: a.size, animationDelay: `${a.delay}s` }}
        />
      ))}
    </div>
  )
}
