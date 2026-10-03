import { motion, useInView } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { Insight } from '../data/mock'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/motion'
import { RichTextView, SkeletonLines } from './AiText'
import { BrandAvatar } from './Avatars'
import { Icon } from './Icon'
import styles from './Insights.module.css'
import { SparkCluster } from './Spark'

export function SectionHeader({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className={styles.header}>
      <SparkCluster size={24} />
      <h2 className={styles.headerTitle} id={id}>
        {title}
      </h2>
      {action}
    </div>
  )
}

/**
 * Lista de insights de IA. Al entrar en pantalla muestra el loader de Gemini y luego
 * "escribe" el texto palabra por palabra.
 */
export function InsightList({ insights, title }: { insights: Insight[]; title: string }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!inView) return
    const timer = window.setTimeout(() => setReady(true), 750)
    return () => window.clearTimeout(timer)
  }, [inView])

  return (
    <section ref={ref} className={styles.section} aria-labelledby={`${insights[0]?.id}-title`} aria-busy={!ready}>
      <SectionHeader title={title} id={`${insights[0]?.id}-title`} />
      <motion.ul
        className={styles.list}
        variants={staggerContainer(0.12)}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
      >
        {insights.map((insight, index) => (
          <motion.li key={insight.id} className={styles.item} variants={fadeUp}>
            <BrandAvatar kind={insight.avatar} verified={insight.avatar === 'visa' || insight.avatar === 'mastercard'} />
            <div className={styles.content}>
              <h3 className={styles.title}>{insight.title}</h3>
              {ready ? (
                <>
                  <p className={styles.body}>
                    <RichTextView value={insight.body} stream delay={index * 0.35} />
                  </p>
                  {insight.note && (
                    <motion.p
                      className={styles.note}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: 0.9 + index * 0.35, duration: 0.5 } }}
                    >
                      {insight.note}
                    </motion.p>
                  )}
                </>
              ) : (
                <SkeletonLines lines={3} className={styles.loading} />
              )}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}

export interface ImpactItem {
  id: string
  name: string
  caption: string
  amount: ReactNode
  trend: 'up' | 'down'
  note: string
}

/** Tarjetas "Mayor impacto del mes" con nota generada por IA. */
export function ImpactList({ items }: { items: ImpactItem[] }) {
  return (
    <motion.div
      className={styles.impactList}
      variants={staggerContainer(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {items.map((item) => (
        <motion.article key={item.id} className={styles.impact} variants={fadeUp}>
          <div className={styles.impactTop}>
            <div className={styles.impactName}>
              <p className="t-title-m">{item.name}</p>
              <p className="t-body-s t-low">{item.caption}</p>
            </div>
            <div className={styles.impactAmount}>
              <span className={styles.impactValue}>
                <Icon
                  name={item.trend === 'up' ? 'trending_up' : 'trending_down'}
                  size={22}
                  style={{ color: item.trend === 'up' ? 'var(--z-positive)' : 'var(--z-negative)' }}
                />
                {item.amount}
              </span>
              <span className="t-label-s t-low">este mes</span>
            </div>
          </div>
          <p className={styles.impactNote}>
            <SparkCluster size={18} />
            <span>
              <strong className="t-strong">Nota:</strong> {item.note}
            </span>
          </p>
        </motion.article>
      ))}
    </motion.div>
  )
}

export interface QuickInsight {
  id: string
  label: string
  icon: string
  value: ReactNode
  hint?: string
  warning?: boolean
}

/** Carrusel de insights cortos (notas del Figma: fuente principal, variación, etc.). */
export function QuickInsights({ items }: { items: QuickInsight[] }) {
  return (
    <motion.div
      className={cn(styles.quick, 'no-scrollbar')}
      variants={staggerContainer(0.06)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {items.map((item) => (
        <motion.div key={item.id} className={cn(styles.quickCard, item.warning && styles.warning)} variants={fadeUp}>
          <span className={styles.quickLabel}>
            <Icon name={item.icon} size={16} />
            {item.label}
          </span>
          <span className={styles.quickValue}>{item.value}</span>
          {item.hint && <span className={styles.quickHint}>{item.hint}</span>}
        </motion.div>
      ))}
    </motion.div>
  )
}
