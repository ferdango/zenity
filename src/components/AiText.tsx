import type { CSSProperties, ElementType, ReactNode } from 'react'
import type { RichText } from '../data/mock'
import { cn } from '../lib/cn'
import { type Segment, toSegments } from '../lib/richText'
import styles from './AiText.module.css'

/** Texto con el degradado de Gemini que "barre" al aparecer (saludo "Hola, …"). */
export function GradientText({
  children,
  as: Tag = 'span',
  animate = true,
  className,
}: {
  children: ReactNode
  as?: ElementType
  animate?: boolean
  className?: string
}) {
  return (
    <Tag className={cn('fx-gradient-text', className)} data-animate={animate}>
      {children}
    </Tag>
  )
}

/** Texto con brillo que recorre las letras (estado "pensando…"). */
export function ShimmerText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('fx-shimmer-text', className)}>{children}</span>
}

/** Barras azules del loader de respuestas de Gemini. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['100%', '92%', '64%', '80%', '48%']
  return (
    <div className={cn(styles.skeleton, className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="fx-skeleton-line"
          style={{ width: widths[i % widths.length], animationDelay: `${i * -0.35}s` }}
        />
      ))}
    </div>
  )
}

const kindClass: Record<Segment['kind'], string | undefined> = {
  text: undefined,
  b: styles.strong,
  pos: styles.pos,
  neg: styles.neg,
}

interface RichTextViewProps {
  value: RichText | string
  /** Aparición palabra por palabra (efecto de streaming) */
  stream?: boolean
  /** Retraso inicial en segundos */
  delay?: number
  /** Segundos entre palabras */
  speed?: number
  className?: string
  style?: CSSProperties
}

/** Muestra texto enriquecido (negritas, montos positivos/negativos) con streaming opcional. */
export function RichTextView({ value, stream = false, delay = 0, speed = 0.018, className, style }: RichTextViewProps) {
  const segments = toSegments(value)

  if (!stream) {
    return (
      <span className={className} style={style}>
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.text}</span>
          ) : (
            <span key={i} className={kindClass[s.kind]}>
              {s.text}
            </span>
          ),
        )}
      </span>
    )
  }

  let index = 0
  return (
    <span className={className} style={style}>
      {segments.map((s, si) => {
        const words = s.text.split(/(\s+)/)
        return (
          <span key={si} className={kindClass[s.kind]}>
            {words.map((w, wi) => {
              if (!w) return null
              if (/^\s+$/.test(w)) return w
              const d = delay + index++ * speed
              return (
                <span key={wi} className={styles.word} style={{ animationDelay: `${d}s` }}>
                  {w}
                </span>
              )
            })}
          </span>
        )
      })}
    </span>
  )
}
