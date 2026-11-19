import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { HOY } from '../../config/demo'
import { resumenSunat } from '../../domain/sunat'
import { fmtDiaMes } from '../../domain/util'
import { ease, fadeUp } from '../../lib/motion'
import { marcarHito } from '../../state/demoStore'
import { useZen } from '../../state/useZen'
import { Icon } from '../Icon'
import { Money, Pill } from './index'
import styles from './zen.module.css'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesDe = (periodo: string) => MESES[Number(periodo.slice(5, 7)) - 1]

/** Cuándo vence, en palabras: «Vence hoy», «Mañana», «En 28 días». */
function cuandoVence(dias: number): string {
  if (dias <= 0) return 'Vence hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

/**
 * Pago mensual a SUNAT, pequeño y resumido: total y fecha de vencimiento de un vistazo;
 * al tocarlo, el desglose (IGV, renta y EsSalud) y el último pago que salió del banco.
 */
export function SunatMes() {
  const { a } = useZen()
  const [abierto, setAbierto] = useState(false)
  const r = useMemo(() => (a ? resumenSunat(a, HOY) : null), [a])
  if (!a || !r || r.total <= 0) return null

  const nrus = a.business.regimenTributario === 'NRUS'
  const partes = [
    { label: 'IGV', valor: r.igv },
    { label: nrus ? 'Cuota Nuevo RUS' : 'Renta (pago a cuenta)', valor: r.renta },
    { label: 'EsSalud', valor: r.essalud },
  ].filter((p) => p.valor > 0)
  const tono = r.dias <= 3 ? 'baja' : r.dias <= 7 ? 'media' : 'neutral'

  return (
    <motion.section className={styles.section} variants={fadeUp} aria-label="Tu pago a SUNAT">
      <div className={styles.sunat}>
        <button
          type="button"
          className={styles.sunatHead}
          data-ripple=""
          aria-expanded={abierto}
          aria-controls="sunat-detalle"
          onClick={() => {
            // Camino de aprendizaje: «Revisa tu pago a SUNAT»
            if (!abierto) marcarHito(a.business.id, 'sunat')
            setAbierto(!abierto)
          }}
        >
          <span className={`${styles.rowIcon} ${styles.toneWarning}`}>
            <Icon name="account_balance" size={20} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowSub}>SUNAT · {mesDe(r.periodo)}</span>
            <span className={styles.todoValue}>
              <Money value={r.total} />
            </span>
            <span className={styles.sunatEstimado}>
              Vence el {fmtDiaMes(r.vence)}
              {r.estimado ? ' · estimado' : ''}
            </span>
          </span>
          <span className={styles.sunatEnd}>
            <Pill tone={tono}>{cuandoVence(r.dias)}</Pill>
            <motion.span animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.3, ease: ease.emphasized }} style={{ display: 'grid' }}>
              <Icon name="expand_more" size={20} />
            </motion.span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {abierto && (
            <motion.div
              id="sunat-detalle"
              key="detalle"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: { duration: 0.35, ease: ease.emphasized } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.22, ease: ease.accelerate } }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.sunatBody}>
                <dl className={styles.sunatPartes}>
                  {partes.map((p) => (
                    <div key={p.label}>
                      <dt>{p.label}</dt>
                      <dd>
                        <Money value={p.valor} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {r.ultimoPago && (
                  <p className={styles.sunatNota}>
                    <Icon name="task_alt" size={16} style={{ color: 'var(--z-positive)' }} />
                    <span>
                      Último pago: <Money value={r.ultimoPago.monto} /> el {fmtDiaMes(r.ultimoPago.fecha)}
                    </span>
                  </p>
                )}
                <p className={styles.sunatNota}>
                  <Icon name="info" size={16} />
                  <span>
                    {r.estimado
                      ? 'Estimado con tus comprobantes de los 3 últimos meses. Tu contador confirma el monto al cerrar el mes.'
                      : 'Calculado con tus comprobantes del mes. Tu contador confirma el monto antes de declarar.'}
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
