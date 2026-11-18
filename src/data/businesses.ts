import type { Connection } from './mock'
import { BODEGA_ID, FERRETERIA_ID } from './seed'
import { regimenFromRuc, type SunatCompany, seeded } from './registry'
import type { Regimen } from './sire'

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
  /** Régimen tributario elegido al registrar el RUC: define la tasa de Renta */
  regimen: Regimen
  connections: Connection[]
  /** Escala de los montos de ejemplo respecto al negocio base (1 = datos base del demo) */
  scale: number
  /** Paleta del avatar (0–4) */
  tone: number
}

export const BUSINESS_TONES = 5

/** Cuentas de un negocio de la demo: la cuenta BCP (el saldo sale del motor) y su Yape. */
function demoConnections(id: string, last4: string, phone: string): Connection[] {
  return [
    { id: `${id}-bcp`, label: 'Cuenta corriente', name: 'BCP Soles', shortName: 'BCP cuenta corriente', last4, balance: 0, theme: 'navy', avatar: 'bank' },
    { id: `${id}-yape`, label: 'Yape · se abona en tu BCP', name: 'Yape', shortName: 'Yape', phone, balance: 0, theme: 'grape', avatar: 'yape' },
  ]
}

/**
 * Negocios de ejemplo cuando no hubo registro: los de la primera ola (seed agosto–noviembre 2026).
 * Un RUC registrado desde el onboarding sigue usando los datos del Figma.
 */
export const DEMO_BUSINESSES: Business[] = [
  {
    id: FERRETERIA_ID,
    ruc: FERRETERIA_ID,
    razonSocial: 'Ferretería San Martín E.I.R.L.',
    nombreComercial: 'Ferretería San Martín',
    tipoContribuyente: 'Empresa individual de responsabilidad limitada',
    regimen: 'rmt',
    connections: demoConnections(FERRETERIA_ID, '0012', '456'),
    scale: 1,
    tone: 0,
  },
  {
    id: BODEGA_ID,
    ruc: BODEGA_ID,
    razonSocial: 'Huamán Quispe Rosa',
    nombreComercial: 'Bodega Doña Rosa',
    tipoContribuyente: 'Persona natural con negocio',
    regimen: 'rer',
    connections: demoConnections(BODEGA_ID, '0045', '457'),
    scale: 1,
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
export function businessFromCompany(company: SunatCompany, nombreComercial: string, regimen: Regimen, tone: number): Business {
  const rand = seeded(`negocio:${company.ruc}`)
  return {
    id: company.ruc,
    ruc: company.ruc,
    razonSocial: company.razonSocial,
    nombreComercial: nombreComercial.trim() || null,
    tipoContribuyente: company.tipoContribuyente,
    regimen,
    connections: [],
    scale: Math.round((0.35 + rand() * 1.2) * 100) / 100,
    tone: tone % BUSINESS_TONES,
  }
}

const REGIMENES_VALIDOS: readonly string[] = ['general', 'rmt', 'rer']

/**
 * Negocios guardados antes de que el registro pidiera el régimen: se les asigna el de su
 * ficha RUC (el mismo que ya mostraba el demo), así sus impuestos no cambian.
 */
export function withRegimen(business: Business): Business {
  if (REGIMENES_VALIDOS.includes(business.regimen)) return business
  return { ...business, regimen: regimenFromRuc(business.ruc) }
}
