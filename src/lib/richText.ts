import type { RichText } from '../data/mock'

export type Segment = { text: string; kind: 'text' | 'b' | 'pos' | 'neg' }

export function toSegments(rich: RichText | string): Segment[] {
  if (typeof rich === 'string') return [{ text: rich, kind: 'text' }]
  return rich.map((part) => {
    if (typeof part === 'string') return { text: part, kind: 'text' }
    if ('b' in part) return { text: part.b, kind: 'b' }
    if ('pos' in part) return { text: part.pos, kind: 'pos' }
    return { text: part.neg, kind: 'neg' }
  })
}

/** Duración aproximada (s) del streaming palabra por palabra de un texto. */
export function streamDuration(value: RichText | string, speed = 0.018): number {
  const text = toSegments(value)
    .map((s) => s.text)
    .join('')
  return text.split(/\s+/).filter(Boolean).length * speed
}
