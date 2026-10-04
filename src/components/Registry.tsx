import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { ReniecPerson, SunatCompany } from '../data/registry'
import { cn } from '../lib/cn'
import { formatDate } from '../lib/format'
import { fadeUp, staggerContainer } from '../lib/motion'
import { ShimmerText } from './AiText'
import { Icon } from './Icon'
import styles from './Registry.module.css'
import { Spark } from './Spark'

export type LookupState = 'idle' | 'searching' | 'verified'

/** Estado de la consulta dentro del campo: "Consultando RENIEC…" o el sello de verificado. */
export function LookupStatus({ state, source }: { state: LookupState; source: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {state !== 'idle' && (
        <motion.span
          key={state}
          className={cn(styles.status, state === 'verified' && styles.statusVerified)}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
        >
          {state === 'searching' ? (
            <ShimmerText>Consultando {source}…</ShimmerText>
          ) : (
            <>
              <Icon name="verified" size={18} fill /> {source}
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Explica qué se completará con la consulta, antes de ingresar el documento. */
export function LookupHint({ children }: { children: ReactNode }) {
  return (
    <div className={styles.hint}>
      <Spark size={22} />
      <p>{children}</p>
    </div>
  )
}

/** Esqueleto azul de Gemini mientras responde RENIEC o SUNAT. */
export function LookupSkeleton({ variant }: { variant: 'person' | 'company' }) {
  return (
    <div className={styles.skeleton} aria-hidden>
      <div className={styles.skeletonHead}>
        <span className={cn(styles.skeletonAvatar, 'fx-skeleton-line')} />
        <div className={styles.skeletonLines}>
          <span className="fx-skeleton-line" style={{ width: '72%' }} />
          <span className="fx-skeleton-line" style={{ width: '44%', animationDelay: '-0.35s' }} />
        </div>
      </div>
      {variant === 'person' ? (
        [0, 1, 2].map((i) => (
          <span key={i} className={cn(styles.skeletonField, 'fx-skeleton-line')} style={{ animationDelay: `${i * -0.3}s` }} />
        ))
      ) : (
        <div className={styles.skeletonLines}>
          {['100%', '86%', '92%', '64%', '78%'].map((width, i) => (
            <span key={width} className="fx-skeleton-line" style={{ width, animationDelay: `${i * -0.3}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Confirmación de identidad tras consultar RENIEC. */
export function IdentityVerified({ person }: { person: ReniecPerson }) {
  return (
    <div className={styles.identity}>
      <span className={styles.identityIcon}>
        <Icon name="verified" size={22} fill />
      </span>
      <span className={styles.identityText}>
        <strong>Identidad verificada con RENIEC</strong>
        <span>Completamos tus datos según el DNI {person.dni}</span>
      </span>
    </div>
  )
}

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

function monogram(name: string) {
  return name
    .split(' ')
    .filter((word) => word && !STOPWORDS.has(word.toLowerCase()) && !word.includes('.'))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <motion.div className={cn(styles.fact, wide && styles.factWide)} variants={fadeUp}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </motion.div>
  )
}

/** Ficha RUC de SUNAT con toda la información de la empresa. */
export function CompanyProfile({ company }: { company: SunatCompany }) {
  const active = company.estado === 'Activo'
  const habido = company.condicion === 'Habido'
  return (
    <motion.section
      className={styles.company}
      aria-label={`Ficha RUC de ${company.razonSocial}`}
      variants={staggerContainer(0.04)}
      initial="hidden"
      animate="show"
    >
      <motion.header className={styles.companyHead} variants={fadeUp}>
        <span className={styles.companyAvatar} aria-hidden>
          {monogram(company.razonSocial)}
        </span>
        <span className={styles.companyTitle}>
          <strong>{company.razonSocial}</strong>
          <span>RUC {company.ruc}</span>
        </span>
        <span className={styles.source}>
          <Icon name="verified" size={16} fill /> SUNAT
        </span>
      </motion.header>

      <motion.div className={styles.pills} variants={fadeUp}>
        <span className={styles.pill} data-tone={active ? 'good' : 'bad'}>
          <span className={styles.dot} />
          {company.estado}
        </span>
        <span className={styles.pill} data-tone={habido ? 'good' : 'bad'}>
          <span className={styles.dot} />
          {company.condicion}
        </span>
        <span className={styles.kind}>{company.tipoContribuyente}</span>
      </motion.div>

      <dl className={styles.facts}>
        <Fact label="Nombre comercial">{company.nombreComercial ?? '—'}</Fact>
        <Fact label="Trabajadores">{company.trabajadores === 0 ? 'Sin trabajadores' : company.trabajadores}</Fact>
        <Fact label="Actividad económica principal" wide>
          <span className={styles.ciiu}>CIIU {company.actividadPrincipal.ciiu}</span> {company.actividadPrincipal.descripcion}
        </Fact>
        {company.actividadesSecundarias.length > 0 && (
          <Fact label="Actividades secundarias" wide>
            {company.actividadesSecundarias.map((activity) => (
              <span key={activity.ciiu} className={styles.line}>
                <span className={styles.ciiu}>CIIU {activity.ciiu}</span> {activity.descripcion}
              </span>
            ))}
          </Fact>
        )}
        <Fact label="Domicilio fiscal" wide>
          {company.domicilioFiscal}
          <span className={styles.muted}>{company.ubigeo}</span>
        </Fact>
        <Fact label="Fecha de inscripción">{formatDate(company.fechaInscripcion)}</Fact>
        <Fact label="Inicio de actividades">{formatDate(company.inicioActividades)}</Fact>
        <Fact label="Sistema de emisión">{company.sistemaEmision}</Fact>
        <Fact label="Sistema de contabilidad">{company.sistemaContabilidad}</Fact>
        <Fact label="Comercio exterior">{company.comercioExterior}</Fact>
        <Fact label="Emisor electrónico desde">{formatDate(company.emisorElectronicoDesde)}</Fact>
        <Fact label="Comprobantes electrónicos" wide>
          <span className={styles.chips}>
            {company.comprobantes.map((name) => (
              <span key={name} className={styles.chip}>
                {name}
              </span>
            ))}
          </span>
        </Fact>
      </dl>

      <motion.footer className={styles.companyFoot} variants={fadeUp}>
        Fuente: SUNAT · consulta simulada para el prototipo
      </motion.footer>
    </motion.section>
  )
}
