import { useState } from 'react'
import { HOY } from '../../config/demo'
import { SYNC_EVERY_HOURS } from '../../data/sync'
import { fmtFecha } from '../../domain/util'
import { haptic } from '../../lib/haptics'
import { permisoActivo } from '../../state/demoStore'
import { useZen } from '../../state/useZen'
import { BottomSheet } from '../BottomSheet'
import { Button } from '../Button'
import { Icon } from '../Icon'
import styles from './zen.module.css'

/** Por qué puedes confiar en el número: de dónde sale, qué puede hacer Zenity y qué no. */
const GARANTIAS = [
  { icon: 'visibility', titulo: 'Solo lectura', texto: 'Zenity ve tus movimientos para ordenarlos. No puede mover tu dinero, pagar ni declarar por ti.' },
  { icon: 'sync', titulo: `Se actualiza cada ${SYNC_EVERY_HOURS} horas`, texto: 'Si algo no cuadra con tu banca por internet, lo que manda es tu banco.' },
  { icon: 'lock', titulo: 'Tus datos son tuyos', texto: 'Solo se usan para tu negocio: no los vendemos ni los usamos para publicidad.' },
  { icon: 'verified_user', titulo: 'Tú decides qué se lee', texto: 'Puedes revocar cada fuente cuando quieras y Zenity deja de leerla.' },
] as const

/**
 * Píldora «Solo lectura · 18/11» de la banda del Inicio y la hoja que explica de dónde sale el saldo.
 * Si el dueño revocó el permiso del banco, avisa que es la última lectura.
 */
export function OrigenSaldo({ className, fuente }: { className?: string; fuente: string }) {
  const { demo, businessId } = useZen()
  const [open, setOpen] = useState(false)
  const datos = demo.datos[businessId]
  const revocado = !!datos && !permisoActivo(datos, 'BCP')
  const fecha = fmtFecha(HOY)

  return (
    <>
      <button
        type="button"
        className={className}
        data-ripple=""
        onClick={() => {
          haptic('tap')
          setOpen(true)
        }}
        aria-haspopup="dialog"
        aria-label={`${revocado ? 'Última lectura' : 'Solo lectura'} al ${fecha}. ¿De dónde sale este saldo?`}
      >
        <Icon name={revocado ? 'lock_open' : 'lock'} size={16} />
        {revocado ? 'Última lectura' : 'Solo lectura'} · {fecha.slice(0, 5)}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="¿De dónde sale este saldo?">
        <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
          <div className={styles.row}>
            <span className={`${styles.rowIcon} ${revocado ? styles.toneWarning : styles.tonePositive}`}>
              <Icon name="account_balance" size={20} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{fuente}</span>
              <span className={styles.rowSub}>
                {revocado ? `Revocaste el permiso: es la última lectura, del ${fecha}` : `Leído de tu banco el ${fecha}`}
              </span>
            </span>
          </div>

          <ul className={styles.garantias}>
            {GARANTIAS.map((g) => (
              <li key={g.titulo}>
                <Icon name={g.icon} size={20} />
                <span>
                  <strong>{g.titulo}</strong>
                  {g.texto}
                </span>
              </li>
            ))}
          </ul>

          <Button size="lg" icon="verified_user" to="/permisos" onClick={() => setOpen(false)}>
            Ver qué lee Zenity
          </Button>
          <Button size="lg" variant="text" icon="link" to="/conexiones" onClick={() => setOpen(false)}>
            Ver mis conexiones
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
