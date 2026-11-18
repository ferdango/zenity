/**
 * F-04 · Detector de gastos personales pagados desde la cuenta del negocio.
 * Puntaje 0..1; se marca POSIBLE_PERSONAL si llega a 0.6.
 */
import { ruleMatches } from './categorization.ts'
import type { BankMovement, Correction, Rule } from './types.ts'
import { hourOf, isWeekend, normalizeName, round2 } from './util.ts'

export const UMBRAL_PERSONAL = 0.6

/** Comercios típicamente personales: supermercado, cine, streaming, colegio, clínica, delivery… */
const COMERCIOS_PERSONALES: Array<{ palabras: string[]; tipo: string }> = [
  { palabras: ['PLAZA VEA', 'WONG', 'TOTTUS', 'METRO', 'SUPERMERCADO', 'MASS'], tipo: 'supermercado' },
  { palabras: ['CINEPLANET', 'CINEMARK', 'CINE'], tipo: 'cine' },
  { palabras: ['NETFLIX', 'SPOTIFY', 'DISNEY', 'HBO', 'PRIME VIDEO'], tipo: 'streaming' },
  { palabras: ['COLEGIO', 'UNIVERSIDAD', 'PENSION ESCOLAR'], tipo: 'colegio o universidad' },
  { palabras: ['CLINICA', 'FARMACIA', 'INKAFARMA', 'MIFARMA'], tipo: 'clínica o farmacia' },
  { palabras: ['RESTAURANT', 'RAPPI', 'PEDIDOSYA', 'DIDI FOOD', 'POLLERIA', 'CHIFA'], tipo: 'restaurante o delivery' },
]

export interface PersonalContext {
  /** Apellidos del dueño, para detectar transferencias a familiares */
  apellidos: string[]
  /** Correcciones del negocio (para «marcado antes como personal» y «es del negocio») */
  corrections: Correction[]
  movementsById: Map<string, BankMovement>
  /** Reglas del negocio: si una lo clasifica como gasto del negocio, resta */
  rules: Rule[]
}

export interface PersonalScore {
  score: number
  senales: string[]
}

const key = (m: BankMovement) => m.contraparteRuc ?? normalizeName(m.contraparteNombre ?? m.glosa)

export function personalScore(m: BankMovement, ctx: PersonalContext): PersonalScore {
  if (m.monto >= 0) return { score: 0, senales: [] }
  const text = ` ${normalizeName(m.glosa)} ${normalizeName(m.contraparteNombre)} `
  let score = 0
  const senales: string[] = []

  const comercio = COMERCIOS_PERSONALES.find((c) => c.palabras.some((p) => text.includes(` ${p}`)))
  if (comercio) {
    score += 0.5
    senales.push(`Es un comercio de ${comercio.tipo}`)
  }
  if (isWeekend(m.fecha)) {
    score += 0.2
    senales.push('Fue en fin de semana')
  }
  const h = hourOf(m.fecha)
  if (h !== null && (h >= 21 || h < 6)) {
    score += 0.2
    senales.push(`Fue de noche (${m.fecha.slice(11, 16)})`)
  }
  const apellidos = ctx.apellidos.map((a) => normalizeName(a)).filter((a) => a.length > 3)
  if (m.canal === 'TRANSFERENCIA' && apellidos.some((a) => text.includes(` ${a}`))) {
    score += 0.5
    senales.push('La transferencia va a alguien con tu apellido')
  }
  const marcadas = ctx.corrections.filter((c) => c.elegida === 'retiro_dueno' && c.movementId !== m.id)
  if (marcadas.some((c) => { const o = ctx.movementsById.get(c.movementId); return o && key(o) === key(m) })) {
    score += 0.6
    senales.push('Antes marcaste esta contraparte como personal')
  }
  if (m.canal === 'CAJERO') {
    score += 0.3
    senales.push('Retiro en cajero sin comprobante')
  }
  if (ctx.rules.some((r) => r.scope === 'NEGOCIO' && r.categoriaId !== 'retiro_dueno' && ruleMatches(r.condicion, m))) {
    score -= 0.5
    senales.push('Tienes una regla que lo trata como gasto del negocio')
  }
  return { score: round2(Math.max(0, Math.min(1, score))), senales }
}
