import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { setPersona } from '../../state/demoStore'
import { InitialsAvatar } from '../Avatars'
import { Button } from '../Button'
import { Spark } from '../Spark'
import styles from './zen.module.css'

interface PortalShellProps {
  /** «Portal del contador», «BCP · Expedientes Zenity» */
  portal: string
  home: string
  usuario: { nombre: string; detalle: string; iniciales: string }
  title: ReactNode
  children: ReactNode
}

/** Encabezado de los portales de escritorio (contador y banco), con el cambio a la vista del dueño. */
export function PortalShell({ portal, home, usuario, title, children }: PortalShellProps) {
  const navigate = useNavigate()
  return (
    <div className="z-page" style={{ background: 'var(--z-bg)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px var(--z-gutter)',
          background: 'var(--z-surface-glass)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--z-divider)',
        }}
      >
        <Link to={home} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <Spark size={24} /> Zenity <span className={styles.muted}>· {portal}</span>
        </Link>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={styles.small} style={{ textAlign: 'right' }}>
            {usuario.nombre}
            <br />
            <span className={styles.muted}>{usuario.detalle}</span>
          </span>
          <InitialsAvatar initials={usuario.iniciales} size={36} />
          <Button
            size="sm"
            variant="tonal"
            icon="switch_account"
            onClick={() => {
              setPersona('DUENO')
              navigate('/inicio')
            }}
          >
            Ver como dueño
          </Button>
        </span>
      </header>
      <div className={styles.pageWide} style={{ width: '100%' }}>
        {typeof title === 'string' ? (
          <h1 className="t-headline-s" style={{ paddingTop: 12 }}>
            {title}
          </h1>
        ) : (
          title
        )}
        {children}
      </div>
    </div>
  )
}
