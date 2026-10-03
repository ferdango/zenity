import { AnimatePresence, motion } from 'motion/react'
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { GradientText, RichTextView, ShimmerText } from '../components/AiText'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { IconButton } from '../components/IconButton'
import { Spark } from '../components/Spark'
import { TopBar } from '../components/TopBar'
import { answer, type ChatBlock, fileAnswer, SUGGESTIONS } from '../data/chat'
import { streamDuration, toSegments } from '../lib/richText'
import { ease, fadeUp, staggerContainer } from '../lib/motion'
import { useApp } from '../state/context'
import styles from './Chat.module.css'

const SPEED = 0.02

interface Message {
  id: number
  role: 'user' | 'ai'
  text?: string
  file?: { name: string; size: number }
  blocks?: ChatBlock[]
  status: 'thinking' | 'streaming' | 'done'
}

function blockDuration(block: ChatBlock): number {
  if (block.type === 'p') return streamDuration(block.text, SPEED)
  if (block.type === 'list') return block.items.reduce((acc, item) => acc + streamDuration(item, SPEED) + 0.08, 0)
  if (block.type === 'table') return 0.5
  return 0.2
}

function totalDuration(blocks: ChatBlock[]) {
  return blocks.reduce((acc, b) => acc + blockDuration(b), 0)
}

/** Acumula duraciones: [a, b, c] → [0, a, a + b] */
function offsets(durations: number[]): number[] {
  return durations.map((_, i) => durations.slice(0, i).reduce((acc, d) => acc + d, 0))
}

function AiBlocks({ blocks }: { blocks: ChatBlock[] }) {
  const starts = offsets(blocks.map(blockDuration))
  return (
    <>
      {blocks.map((block, i) => {
        const start = starts[i]
        if (block.type === 'p') {
          return (
            <p key={i}>
              <RichTextView value={block.text} stream delay={start} speed={SPEED} />
            </p>
          )
        }
        if (block.type === 'list') {
          const itemStarts = offsets(block.items.map((item) => streamDuration(item, SPEED) + 0.08))
          return (
            <ul key={i} className={styles.list}>
              {block.items.map((item, j) => {
                const d = start + itemStarts[j]
                return (
                  <motion.li key={j} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: d, duration: 0.2 } }}>
                    <RichTextView value={item} stream delay={d} speed={SPEED} />
                  </motion.li>
                )
              })}
            </ul>
          )
        }
        if (block.type === 'table') {
          return (
            <motion.div
              key={i}
              className={styles.tableWrap}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: start, duration: 0.45, ease: ease.decelerate } }}
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    {block.head.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.join()}>
                      {row.map((cell, k) => (
                        <td key={k}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {block.foot && (
                  <tfoot>
                    <tr>
                      {block.foot.map((cell, k) => (
                        <td key={k}>{cell}</td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </motion.div>
          )
        }
        return (
          <motion.div
            key={i}
            className={styles.actionsRow}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: start, duration: 0.35, ease: ease.decelerate } }}
          >
            {block.items.map((action) => (
              <Button key={action.to} variant="tonal" size="sm" icon={action.icon} to={action.to}>
                {action.label}
              </Button>
            ))}
          </motion.div>
        )
      })}
    </>
  )
}

function AiMessage({ message, onRetry }: { message: Message; onRetry: () => void }) {
  const { toast } = useApp()
  const [vote, setVote] = useState<'up' | 'down' | null>(null)

  const copy = async () => {
    const plain = (value: Parameters<typeof toSegments>[0]) =>
      toSegments(value)
        .map((segment) => segment.text)
        .join('')
    const text = (message.blocks ?? [])
      .map((b) =>
        b.type === 'p'
          ? plain(b.text)
          : b.type === 'list'
            ? b.items.map((item) => `• ${plain(item)}`).join('\n')
            : b.type === 'table'
              ? [b.head, ...b.rows, ...(b.foot ? [b.foot] : [])].map((row) => row.join(' | ')).join('\n')
              : '',
      )
      .filter(Boolean)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Respuesta copiada', 'content_copy')
    } catch {
      toast('No se pudo copiar', 'error')
    }
  }

  return (
    <motion.div className={styles.ai} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ease.decelerate }}>
      <span className={styles.aiAvatar}>
        <Spark size={26} state={message.status === 'done' ? 'idle' : 'thinking'} />
      </span>
      <div className={styles.aiContent} aria-live="polite" aria-busy={message.status !== 'done'}>
        {message.status === 'thinking' ? (
          <ShimmerText className={styles.thinking}>Pensando…</ShimmerText>
        ) : (
          <>
            <AiBlocks blocks={message.blocks ?? []} />
            <AnimatePresence>
              {message.status === 'done' && (
                <motion.div className={styles.feedback} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <IconButton icon="thumb_up" label="Buena respuesta" size="sm" selected={vote === 'up'} onClick={() => setVote(vote === 'up' ? null : 'up')} />
                  <IconButton icon="thumb_down" label="Mala respuesta" size="sm" selected={vote === 'down'} onClick={() => setVote(vote === 'down' ? null : 'down')} />
                  <IconButton icon="content_copy" label="Copiar" size="sm" onClick={copy} />
                  <IconButton icon="refresh" label="Volver a generar" size="sm" onClick={onRetry} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  )
}

type Recognition = {
  lang: string
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

/** Chat con Zenity (Figma: Chat) con el comportamiento de Gemini. */
export function Chat() {
  const { connections, periodKey, toast, profile } = useApp()
  const [params, setParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [listening, setListening] = useState(false)
  const timers = useRef<number[]>([])
  const nextId = useRef(1)
  const fileRef = useRef<HTMLInputElement>(null)
  const recognition = useRef<Recognition | null>(null)
  const consumedQuery = useRef<string | null>(null)
  const busy = messages.some((msg) => msg.role === 'ai' && msg.status !== 'done')

  const respond = useCallback(
    (blocks: ChatBlock[]) => {
      const id = nextId.current++
      setMessages((list) => [...list, { id, role: 'ai', status: 'thinking' }])
      const think = window.setTimeout(() => {
        setMessages((list) => list.map((msg) => (msg.id === id ? { ...msg, blocks, status: 'streaming' } : msg)))
        const done = window.setTimeout(
          () => setMessages((list) => list.map((msg) => (msg.id === id ? { ...msg, status: 'done' } : msg))),
          totalDuration(blocks) * 1000 + 400,
        )
        timers.current.push(done)
      }, 1200)
      timers.current.push(think)
    },
    [],
  )

  const send = useCallback(
    (text: string) => {
      const value = text.trim()
      if (!value) return
      setMessages((list) => [...list, { id: nextId.current++, role: 'user', text: value, status: 'done' }])
      setInput('')
      respond(answer(value, { connections, periodKey }))
    },
    [connections, periodKey, respond],
  )

  // Pregunta enviada desde otra pantalla (?q=…)
  useEffect(() => {
    const q = params.get('q')
    if (q && consumedQuery.current !== q) {
      consumedQuery.current = q
      setParams({}, { replace: true })
      send(q)
    }
  }, [params, setParams, send])

  // Como en Gemini: al enviar se baja al final; cuando llega la respuesta,
  // la última pregunta queda arriba y el texto se escribe debajo.
  const scrolledFor = useRef<number | null>(null)
  useEffect(() => {
    const last = messages.at(-1)
    if (!last) return
    if (last.role === 'user' || last.status === 'thinking') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    } else if (last.status === 'streaming' && scrolledFor.current !== last.id) {
      scrolledFor.current = last.id
      const question = document.querySelector<HTMLElement>('[data-last-question]')
      if (question) window.scrollTo({ top: question.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' })
    }
  }, [messages])

  const stop = () => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    setMessages((list) =>
      list
        .filter((msg) => !(msg.role === 'ai' && msg.status === 'thinking'))
        .map((msg) => (msg.status === 'streaming' ? { ...msg, status: 'done' } : msg)),
    )
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!busy) send(input)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!busy) send(input)
    }
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessages((list) => [
      ...list,
      { id: nextId.current++, role: 'user', text: 'Analiza este archivo', file: { name: file.name, size: file.size }, status: 'done' },
    ])
    respond(fileAnswer(file.name, file.size))
  }

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const rec = getRecognition()
    if (!rec) {
      toast('El dictado por voz no está disponible en este navegador', 'mic_off')
      return
    }
    rec.lang = 'es-PE'
    rec.interimResults = true
    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('')
      setInput(transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognition.current = rec
    setListening(true)
    rec.start()
  }

  const reset = () => {
    stop()
    setMessages([])
  }

  const lastUser = [...messages].reverse().find((msg) => msg.role === 'user')
  const lastUserText = lastUser?.text ?? ''
  const lastUserId = lastUser?.id

  return (
    <div className={`z-page ${styles.page}`}>
      <TopBar
        title="Zenity"
        end={messages.length > 0 && <IconButton icon="edit_square" label="Nuevo chat" onClick={reset} />}
      />

      <div className={styles.body}>
        <AnimatePresence mode="wait" initial={false}>
          {messages.length === 0 ? (
            <motion.section
              key="zero"
              className={styles.zero}
              variants={staggerContainer(0.07, 0.1)}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <Spark size={44} animateIn />
              <motion.h1 className={styles.hello} variants={fadeUp}>
                <GradientText>Hola, {profile.firstName}</GradientText>
              </motion.h1>
              <motion.p className={styles.question} variants={fadeUp}>
                ¿Por dónde empezamos?
              </motion.p>
              <motion.div className={styles.suggestions} variants={staggerContainer(0.06, 0.25)}>
                {SUGGESTIONS.map((s) => (
                  <motion.div key={s.label} variants={fadeUp}>
                    <button
                      type="button"
                      className={styles.suggestion}
                      data-ripple=""
                      onClick={() => ('upload' in s ? fileRef.current?.click() : send(s.label))}
                    >
                      <Icon name={s.icon} size={20} />
                      {s.label}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          ) : (
            <motion.div key="messages" className={styles.messages} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <motion.div
                    key={msg.id}
                    data-last-question={msg.id === lastUserId || undefined}
                    className={styles.user}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: ease.decelerate }}
                  >
                    {msg.file && (
                      <span className={styles.attachment}>
                        <span className={styles.attachmentIcon}>
                          <Icon name="description" size={20} />
                        </span>
                        <span>
                          <strong className="t-strong">{msg.file.name}</strong>
                          <br />
                          <span className="t-low">{Math.max(1, Math.round(msg.file.size / 1024))} KB</span>
                        </span>
                      </span>
                    )}
                    <div className={styles.bubble}>{msg.text}</div>
                  </motion.div>
                ) : (
                  <AiMessage key={msg.id} message={msg} onRetry={() => respond(answer(lastUserText, { connections, periodKey }))} />
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.composerWrap}>
        <form className={`${styles.composer} fx-glow-border`} data-active={focused || busy || listening} onSubmit={onSubmit}>
          <IconButton icon="add" label="Subir un archivo" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,.xml,.pdf" onChange={onFile} />
          <textarea
            className={styles.textarea}
            rows={1}
            placeholder={listening ? 'Te escucho…' : 'Pregunta lo que quieras'}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Mensaje para Zenity"
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {busy ? (
              <motion.span key="stop" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <IconButton icon="stop" label="Detener respuesta" variant="inverse" fillIcon onClick={stop} />
              </motion.span>
            ) : input.trim() ? (
              <motion.span key="send" initial={{ scale: 0.6, opacity: 0, rotate: -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }}>
                <IconButton icon="arrow_upward" label="Enviar" variant="filled" type="submit" />
              </motion.span>
            ) : (
              <motion.span key="mic" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <IconButton
                  icon={
                    listening ? (
                      <span className={styles.wave} aria-hidden>
                        {[0, 1, 2, 3].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ height: [6, 18, 8, 14, 6] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                          />
                        ))}
                      </span>
                    ) : (
                      'mic'
                    )
                  }
                  label={listening ? 'Detener dictado' : 'Dictar por voz'}
                  selected={listening}
                  onClick={toggleMic}
                />
              </motion.span>
            )}
          </AnimatePresence>
        </form>
        <p className={styles.disclaimer}>Zenity es una IA y puede cometer errores. Prototipo con datos de ejemplo.</p>
      </div>
    </div>
  )
}
