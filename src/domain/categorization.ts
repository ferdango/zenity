/**
 * F-02 / F-03 · Categorización con confianza y motivo.
 * Prioridad: corrección del usuario → regla del negocio → regla del contador → match con un
 * comprobante → historial → palabras de la glosa → mapa por rubro.
 */
import { CATEGORIAS } from '../config/categories.ts'
import type { BankMovement, CategoriaId, Comprobante, Correction, FuenteClasificacion, Match, Rule, RuleCondition } from './types.ts'
import { normalizeName, round2 } from './util.ts'

export interface CategoryGuess {
  categoriaId: CategoriaId
  confianza: number
  motivo: string
  fuente: FuenteClasificacion
}

export interface CategorizeContext {
  rubro: string
  rules: Rule[]
  /** Correcciones del negocio, en orden cronológico */
  corrections: Correction[]
  matchByMovement: Map<string, Match>
  comprobantesById: Map<string, Comprobante>
  movementsById: Map<string, BankMovement>
}

interface Keyword {
  palabras: string[]
  categoriaId: CategoriaId
  confianza: number
  /** Cómo se muestra en el motivo */
  muestra: string
  /** Solo para abonos (+) o cargos (−) */
  signo?: 1 | -1
}

/** Diccionario de palabras clave de la glosa (motivo: «La glosa dice "…"»). */
export const GLOSA_KEYWORDS: Keyword[] = [
  { palabras: ['SUNAT', 'PAGO TRIBUTOS', 'NPS'], categoriaId: 'impuestos', confianza: 0.95, muestra: 'SUNAT', signo: -1 },
  { palabras: ['HABERES', 'PLANILLA', 'REMUNERAC'], categoriaId: 'planilla', confianza: 0.95, muestra: 'haberes', signo: -1 },
  { palabras: ['DEPOSITO CTS', 'GRATIFICACION'], categoriaId: 'planilla', confianza: 0.95, muestra: 'CTS', signo: -1 },
  { palabras: ['COMISION', 'MANTENIMIENTO CTA', 'ITF', 'PORTES'], categoriaId: 'comisiones', confianza: 0.95, muestra: 'comisión', signo: -1 },
  { palabras: ['CUOTA PRESTAMO', 'PRESTAMO'], categoriaId: 'prestamos', confianza: 0.95, muestra: 'préstamo' },
  { palabras: ['LUZ DEL SUR', 'ENEL', 'SEDAPAL', 'MOVISTAR', 'CLARO', 'ENTEL'], categoriaId: 'servicios', confianza: 0.95, muestra: 'servicios', signo: -1 },
  { palabras: ['ALQUILER', 'INMOBILIARIA'], categoriaId: 'alquiler', confianza: 0.93, muestra: 'alquiler', signo: -1 },
  { palabras: ['YAPE DE'], categoriaId: 'ventas', confianza: 0.9, muestra: 'Yape de', signo: 1 },
  { palabras: ['DEP EFECTIVO', 'DEPOSITO EFECTIVO'], categoriaId: 'ventas', confianza: 0.75, muestra: 'depósito en efectivo', signo: 1 },
  { palabras: ['TRANSPORTES', 'FLETE', 'OLVA', 'SHALOM'], categoriaId: 'transporte', confianza: 0.9, muestra: 'transportes', signo: -1 },
  { palabras: ['FACEBK', 'FACEBOOK', 'META ADS', 'GOOGLE ADS', 'IMPRENTA'], categoriaId: 'publicidad', confianza: 0.9, muestra: 'publicidad', signo: -1 },
  { palabras: ['CONTADOR', 'ASESORIA', 'ESTUDIO CONTABLE'], categoriaId: 'asesoria', confianza: 0.9, muestra: 'asesoría', signo: -1 },
  { palabras: ['GASFITER', 'ELECTRICISTA', 'REPARACION'], categoriaId: 'mantenimiento', confianza: 0.85, muestra: 'reparación', signo: -1 },
  {
    palabras: ['PLAZA VEA', 'WONG', 'TOTTUS', 'METRO ', 'CINEPLANET', 'CINEMARK', 'NETFLIX', 'SPOTIFY', 'DISNEY', 'COLEGIO', 'UNIVERSIDAD', 'CLINICA', 'INKAFARMA', 'MIFARMA', 'RAPPI', 'PEDIDOSYA'],
    categoriaId: 'retiro_dueno',
    confianza: 0.7,
    muestra: 'compra personal',
    signo: -1,
  },
]

/** Mapa por rubro (mock): palabras típicas de los proveedores de cada rubro. */
export const RUBRO_KEYWORDS: Record<string, Keyword[]> = {
  Ferretería: [
    {
      palabras: ['ACEROS', 'FIERRO', 'CEMENTO', 'PINTURA', 'TUBOS', 'FERRET', 'AGREGADOS', 'MADERERA', 'SODIMAC', 'PROMART', 'IMPORTADORA', 'DISTRIBUIDORA', 'ELECTRICOS'],
      categoriaId: 'insumos',
      confianza: 0.9,
      muestra: 'proveedor del rubro',
      signo: -1,
    },
  ],
  Bodega: [
    {
      palabras: ['ALICORP', 'GLORIA', 'BACKUS', 'ARCA', 'MAYORISTA', 'MAKRO', 'DISTRIBUIDORA', 'BODEGUERO'],
      categoriaId: 'insumos',
      confianza: 0.9,
      muestra: 'proveedor del rubro',
      signo: -1,
    },
  ],
}

/** Texto con el que se compara la glosa: glosa + contraparte, normalizados. */
function haystack(m: BankMovement): string {
  return ` ${normalizeName(m.glosa)} ${normalizeName(m.contraparteNombre)} `
}

function keywordHit(m: BankMovement, list: Keyword[]): Keyword | null {
  const text = haystack(m)
  const sign = m.monto >= 0 ? 1 : -1
  // Cada palabra debe empezar una palabra de la glosa: «ENEL» no calza con «GENERAL»
  return list.find((k) => (!k.signo || k.signo === sign) && k.palabras.some((p) => text.includes(` ${p}`))) ?? null
}

/** Nombre corto de la contraparte para los motivos. */
export function contraparteDe(m: BankMovement): string {
  return m.contraparteNombre ?? m.glosa
}

export function partyKey(m: BankMovement): string {
  return m.contraparteRuc ?? normalizeName(m.contraparteNombre ?? m.glosa)
}

export function ruleMatches(cond: RuleCondition, m: BankMovement): boolean {
  const checks: boolean[] = []
  if (cond.rucContraparte) checks.push(m.contraparteRuc === cond.rucContraparte)
  if (cond.contraparteNombre) {
    const target = normalizeName(cond.contraparteNombre)
    checks.push(normalizeName(m.contraparteNombre ?? m.glosa).includes(target) || normalizeName(m.glosa).includes(target))
  }
  if (cond.glosaContiene) checks.push(normalizeName(m.glosa).includes(normalizeName(cond.glosaContiene)))
  if (cond.montoMin !== undefined) checks.push(Math.abs(m.monto) >= cond.montoMin)
  if (cond.montoMax !== undefined) checks.push(Math.abs(m.monto) <= cond.montoMax)
  return checks.length > 0 && checks.every(Boolean)
}

export function describeRule(cond: RuleCondition): string {
  if (cond.contraparteNombre) return cond.contraparteNombre
  if (cond.rucContraparte) return `RUC ${cond.rucContraparte}`
  if (cond.glosaContiene) return `«${cond.glosaContiene}»`
  return 'estos montos'
}

const label = (id: CategoriaId) => CATEGORIAS[id].label

/** Categoría de un movimiento conciliado, a partir de su comprobante. */
function categoryFromMatch(m: BankMovement, match: Match, ctx: CategorizeContext): CategoriaId {
  if (m.monto > 0) return 'ventas'
  const keyword = keywordHit(m, GLOSA_KEYWORDS)
  if (keyword && keyword.categoriaId !== 'retiro_dueno') return keyword.categoriaId
  const comp = match.comprobanteIds.map((id) => ctx.comprobantesById.get(id)).find(Boolean)
  if (comp) {
    const fake = { ...m, glosa: comp.nombreContraparte }
    const hit = keywordHit(fake, GLOSA_KEYWORDS)
    if (hit && hit.categoriaId !== 'retiro_dueno') return hit.categoriaId
  }
  return 'insumos'
}

export function categorize(m: BankMovement, ctx: CategorizeContext): CategoryGuess {
  // 0 · Lo que eligió el usuario (o el contador) para este movimiento
  const own = [...ctx.corrections].reverse().find((c) => c.movementId === m.id)
  if (own) {
    const quien = own.origen === 'CONTADOR' ? 'Lo clasificó tu contador' : 'Lo elegiste tú'
    return { categoriaId: own.elegida, confianza: 1, motivo: `${quien}: ${label(own.elegida)}.`, fuente: 'MANUAL' }
  }

  // 1 · Regla del negocio, 2 · regla del contador
  for (const scope of ['NEGOCIO', 'CONTADOR'] as const) {
    const rule = [...ctx.rules].reverse().find((r) => r.scope === scope && ruleMatches(r.condicion, m))
    if (rule) {
      return scope === 'NEGOCIO'
        ? { categoriaId: rule.categoriaId, confianza: 0.99, motivo: `Tu regla: pagos a ${describeRule(rule.condicion)} → ${label(rule.categoriaId)}.`, fuente: 'REGLA_NEGOCIO' }
        : { categoriaId: rule.categoriaId, confianza: 0.97, motivo: `Regla de tu contador: ${describeRule(rule.condicion)} → ${label(rule.categoriaId)}.`, fuente: 'REGLA_CONTADOR' }
    }
  }

  // Match con un comprobante: el motivo es el de la conciliación
  const match = ctx.matchByMovement.get(m.id)
  if (match) {
    return { categoriaId: categoryFromMatch(m, match, ctx), confianza: match.confianza, motivo: match.motivo, fuente: 'MATCH' }
  }

  // 3 · Historial: misma contraparte marcada ≥ 2 veces con la misma categoría
  const key = partyKey(m)
  const counts = new Map<CategoriaId, number>()
  for (const c of ctx.corrections) {
    if (c.movementId === m.id) continue
    const other = ctx.movementsById.get(c.movementId)
    if (other && partyKey(other) === key) counts.set(c.elegida, (counts.get(c.elegida) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 2) {
    return {
      categoriaId: top[0],
      confianza: 0.92,
      motivo: `Igual que tus últimos ${top[1]} pagos a ${contraparteDe(m)}, que marcaste como ${label(top[0])}.`,
      fuente: 'HISTORIAL',
    }
  }

  // 4 · Palabras clave de la glosa
  const keyword = keywordHit(m, GLOSA_KEYWORDS)
  if (keyword) return { categoriaId: keyword.categoriaId, confianza: keyword.confianza, motivo: `La glosa dice "${keyword.muestra}".`, fuente: 'GLOSA' }

  // 5 · Mapa por rubro
  const rubro = keywordHit(m, RUBRO_KEYWORDS[ctx.rubro] ?? [])
  if (rubro) {
    return {
      categoriaId: rubro.categoriaId,
      confianza: rubro.confianza,
      motivo: `${contraparteDe(m)} es un proveedor típico de tu rubro (${ctx.rubro.toLowerCase()}): ${label(rubro.categoriaId)}.`,
      fuente: 'RUBRO',
    }
  }

  // Sin pistas: Zenity pregunta
  return m.monto > 0
    ? { categoriaId: 'ventas', confianza: 0.45, motivo: 'No reconocemos este abono: ¿de dónde vino?', fuente: 'GLOSA' }
    : { categoriaId: 'otros', confianza: 0.35, motivo: 'No reconocemos este pago: ¿en qué se gastó?', fuente: 'GLOSA' }
}

/** Las alternativas más probables (sin la sugerida), para los chips de F-03. */
export function alternativas(m: BankMovement, sugerida: CategoriaId, n = 3): CategoriaId[] {
  const base: CategoriaId[] =
    m.monto > 0
      ? ['ventas', 'prestamos', 'otros']
      : ['insumos', 'transporte', 'servicios', 'mantenimiento', 'planilla', 'otros', 'publicidad', 'alquiler']
  const hits = [keywordHit(m, GLOSA_KEYWORDS)?.categoriaId].filter((c): c is CategoriaId => !!c)
  return [...new Set([...hits, ...base])].filter((c) => c !== sugerida && c !== 'retiro_dueno').slice(0, n)
}

export type Nivel = 'Alta' | 'Media' | 'Baja'

/** Insignia de confianza (F-02): Alta ≥ 0.90, Media 0.60–0.89, Baja < 0.60. */
export function nivel(confianza: number): Nivel {
  const c = round2(confianza)
  return c >= 0.9 ? 'Alta' : c >= 0.6 ? 'Media' : 'Baja'
}
