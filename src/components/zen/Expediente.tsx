import { motion } from 'motion/react'
import type { Segmento } from '../../config/credit'
import type { PerfilCrediticio } from '../../domain/credit'
import { fmtSolesCorto } from '../../domain/util'
import { ease } from '../../lib/motion'
import { Icon } from '../Icon'
import { Pill } from './index'
import styles from './zen.module.css'

const TONO_SEGMENTO: Record<Segmento, 'alta' | 'info' | 'media' | 'baja'> = { A: 'alta', B: 'info', C: 'media', D: 'baja' }

/** Medidor del puntaje (0–100): un arco que se llena con el color del segmento. */
export function ScoreGauge({ score, segmento, label }: { score: number; segmento: Segmento; label: string }) {
  const color = segmento === 'A' ? 'var(--z-positive)' : segmento === 'B' ? 'var(--z-primary)' : segmento === 'C' ? 'var(--z-warning)' : 'var(--z-negative)'
  const r = 52
  const largo = Math.PI * r
  return (
    <figure style={{ display: 'grid', justifyItems: 'center', gap: 4, margin: 0 }} aria-label={`Puntaje ${score} de 100, segmento ${segmento}: ${label}`}>
      <svg viewBox="0 0 128 72" width="168" height="94" aria-hidden>
        <path d={`M 12 64 A ${r} ${r} 0 0 1 116 64`} fill="none" stroke="var(--z-surface-highest)" strokeWidth="12" strokeLinecap="round" />
        <motion.path
          d={`M 12 64 A ${r} ${r} 0 0 1 116 64`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={largo}
          initial={{ strokeDashoffset: largo }}
          animate={{ strokeDashoffset: largo * (1 - score / 100) }}
          transition={{ duration: 1, ease: ease.emphasized }}
        />
        <text x="64" y="58" textAnchor="middle" fontSize="28" fontWeight="600" fill="var(--z-on-surface)">
          {score}
        </text>
      </svg>
      <Pill tone={TONO_SEGMENTO[segmento]}>
        Segmento {segmento} · {label}
      </Pill>
    </figure>
  )
}

/**
 * Expediente de crédito: puntaje, componentes con su peso y los factores en palabras.
 * `vista`: el dueño lo lee como «así te ve el banco»; el BCP, como el expediente del cliente.
 */
export function Expediente({ perfil: p, vista }: { perfil: PerfilCrediticio; vista: 'dueno' | 'bcp' }) {
  const datos = [
    { label: 'Ventas al mes (12 meses)', valor: fmtSolesCorto(Math.round(p.ventasMes)) },
    { label: 'Le sobra al mes', valor: fmtSolesCorto(Math.round(p.excedente)) },
    { label: 'Cuota máxima sugerida', valor: fmtSolesCorto(Math.round(p.cuotaMaxima)) },
    { label: 'Días de caja', valor: `${p.diasCaja} días` },
  ]
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={styles.card} style={{ justifyItems: 'center', textAlign: 'center' }}>
        <ScoreGauge score={p.score} segmento={p.segmento} label={p.segmentoLabel} />
        <p className={styles.muted}>
          {vista === 'dueno' ? 'Puntaje de tu negocio con tus datos reales de SUNAT, BCP y cobros digitales.' : 'Puntaje armado por Zenity con SIRE, movimientos BCP y cobros digitales.'}
        </p>
      </div>

      <div className={styles.grid2}>
        {datos.map((d) => (
          <div key={d.label} className={styles.stat}>
            <span className={styles.statLabel}>{d.label}</span>
            <span className={styles.statValue}>{d.valor}</span>
          </div>
        ))}
      </div>

      <section className={styles.card}>
        <span className="t-title-m">Cómo se arma el puntaje</span>
        <div style={{ display: 'grid', gap: 12 }}>
          {p.componentes.map((c) => (
            <div key={c.id} style={{ display: 'grid', gap: 4 }}>
              <div className={styles.sectionHead} style={{ padding: 0 }}>
                <span className={styles.small} style={{ color: 'var(--z-on-surface)' }}>
                  {c.nombre} <span className={styles.muted}>· {Math.round(c.peso * 100)}%</span>
                </span>
                <span className="t-label-l">{c.puntaje}</span>
              </div>
              <div className={styles.progress} aria-hidden>
                <motion.span
                  className={styles.progressFill}
                  style={{ background: c.puntaje >= 70 ? 'var(--z-positive)' : c.puntaje >= 45 ? 'var(--z-warning)' : 'var(--z-negative)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.puntaje}%` }}
                  transition={{ duration: 0.8, ease: ease.decelerate }}
                />
              </div>
              <span className={styles.muted}>{c.detalle}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <span className="t-title-m">{vista === 'dueno' ? 'Lo que ve el banco' : 'Factores'}</span>
        <ul style={{ display: 'grid', gap: 8 }}>
          {p.factores.map((f) => (
            <li key={f.texto} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span
                className={`${styles.rowIcon} ${f.tipo === 'positivo' ? styles.tonePositive : f.tipo === 'negativo' ? styles.toneWarning : styles.toneInfo}`}
                style={{ width: 28, height: 28, flex: 'none' }}
              >
                <Icon name={f.tipo === 'positivo' ? 'check' : f.tipo === 'negativo' ? 'priority_high' : 'info'} size={16} />
              </span>
              <span className={styles.small} style={{ color: 'var(--z-on-surface)', paddingTop: 4 }}>
                {f.texto}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
