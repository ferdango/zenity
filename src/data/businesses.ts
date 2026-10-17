import { type Connection, INITIAL_CONNECTIONS } from './mock'
import { type SunatCompany, seeded } from './registry'

/**
 * Un negocio es un RUC con sus propias conexiones. Cada negocio es independiente:
 * sus cuentas, movimientos, reportes y pendientes no se mezclan con los de otro RUC.
 */
export interface Business {
  id: string
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  tipoContribuyente: string
  connections: Connection[]
  /** Escala de los montos de ejemplo respecto al negocio base (1 = datos base del demo) */
  scale: number
  /** Paleta del avatar (0–4) */
  tone: number
}

export const BUSINESS_TONES = 5

/** Cuentas del segundo negocio de ejemplo. */
const COCINA_CONNECTIONS: Connection[] = [
  {
    id: 'bcp-4410',
    label: 'Cuenta corriente',
    name: 'BCP Soles',
    shortName: 'BCP cuenta corriente',
    balance: 1268.4,
    theme: 'navy',
    avatar: 'bank',
  },
  {
    id: 'visa-6624',
    label: 'Tarjeta Crédito',
    name: 'Visa Empresarial',
    shortName: 'Visa empresarial 6624',
    last4: '6624',
    holder: 'Fernando Goicochea',
    balance: 642.15,
    theme: 'blue',
    avatar: 'visa',
  },
  {
    id: 'caja-diaria',
    label: 'Excel',
    name: 'Caja diaria',
    shortName: 'Caja diaria',
    balance: 345.6,
    theme: 'yellow',
    avatar: 'sheet',
  },
]

/** Negocios de ejemplo cuando no hubo registro (el primero usa los datos base del Figma). */
export const DEMO_BUSINESSES: Business[] = [
  {
    id: '20603123451',
    ruc: '20603123451',
    razonSocial: 'Comercializadora Los Andes S.A.C.',
    nombreComercial: 'Andes Market',
    tipoContribuyente: 'Sociedad anónima cerrada',
    connections: INITIAL_CONNECTIONS,
    scale: 1,
    tone: 0,
  },
  {
    id: '20558712342',
    ruc: '20558712342',
    razonSocial: 'Inversiones Gastronómicas del Pacífico S.A.C.',
    nombreComercial: 'Cocina Pacífico',
    tipoContribuyente: 'Sociedad anónima cerrada',
    connections: COCINA_CONNECTIONS,
    scale: 0.58,
    tone: 1,
  },
]

export function businessName(business: Business): string {
  return business.nombreComercial || business.razonSocial
}

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

/** Iniciales del negocio: "Cocina Pacífico" → "CP". */
export function businessInitials(business: Business): string {
  return businessName(business)
    .split(' ')
    .filter((word) => word && !STOPWORDS.has(word.toLowerCase()) && !word.includes('.'))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function businessBalance(business: Business): number {
  return Math.round(business.connections.reduce((acc, c) => acc + c.balance, 0) * 100) / 100
}

/** Crea un negocio a partir de la ficha de SUNAT. Empieza sin conexiones. */
export function businessFromCompany(company: SunatCompany, nombreComercial: string, tone: number): Business {
  const rand = seeded(`negocio:${company.ruc}`)
  return {
    id: company.ruc,
    ruc: company.ruc,
    razonSocial: company.razonSocial,
    nombreComercial: nombreComercial.trim() || null,
    tipoContribuyente: company.tipoContribuyente,
    connections: [],
    scale: Math.round((0.35 + rand() * 1.2) * 100) / 100,
    tone: tone % BUSINESS_TONES,
  }
}
