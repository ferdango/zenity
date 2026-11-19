/**
 * Loyalty: el XP que el dueño gana aprendiendo se canjea en la tienda de puntos, y los logros dan
 * recompensas de XP que se reclaman (al estilo de los cofres de Duolingo). Canjear no baja el nivel:
 * el nivel mide lo aprendido; los puntos disponibles son lo que queda para gastar.
 */

export type CategoriaProducto = 'negocio' | 'aprende' | 'racha'

export interface Producto {
  id: string
  nombre: string
  detalle: string
  xp: number
  categoria: CategoriaProducto
  icon: string
  /** Cuántas veces se puede canjear (sin valor: sin límite) */
  limite?: number
}

export const CATEGORIAS_TIENDA: Record<CategoriaProducto, string> = {
  negocio: 'Para tu negocio',
  aprende: 'Aprende más',
  racha: 'Para tu racha',
}

/** Catálogo de ejemplo del prototipo (sin marcas de terceros). */
export const PRODUCTOS: Producto[] = [
  { id: 'protector', nombre: 'Protector de racha', detalle: 'Si un día no haces tareas, tu racha no se pierde', xp: 50, categoria: 'racha', icon: 'shield', limite: 3 },
  { id: 'doble-xp', nombre: 'Doble XP por un día', detalle: 'Cada tarea de mañana vale el doble', xp: 120, categoria: 'racha', icon: 'bolt', limite: 1 },
  { id: 'plantilla-caja', nombre: 'Plantilla de flujo de caja', detalle: 'Excel listo para proyectar tus próximos 3 meses', xp: 80, categoria: 'aprende', icon: 'description' },
  { id: 'curso-formaliza', nombre: 'Curso: formaliza tu negocio', detalle: '5 videos cortos: RUC, régimen, boletas y planilla', xp: 150, categoria: 'aprende', icon: 'school', limite: 1 },
  { id: 'recarga', nombre: 'Recarga de S/ 10', detalle: 'Saldo para tu celular', xp: 200, categoria: 'negocio', icon: 'phone_iphone' },
  { id: 'plan-basico', nombre: '1 mes del plan Básico', detalle: 'Hasta 1 000 movimientos y 200 consultas a Zenity', xp: 300, categoria: 'negocio', icon: 'workspace_premium', limite: 1 },
  { id: 'asesoria', nombre: 'Asesoría de 30 minutos', detalle: 'Una videollamada con un contador para resolver tus dudas', xp: 400, categoria: 'negocio', icon: 'headset_mic', limite: 1 },
]

export interface Canje {
  id: string
  productoId: string
  xp: number
  ts: string
  /** Código del canje para usarlo */
  codigo: string
}

export function puntosDisponibles(xpTotal: number, canjes: Canje[]): number {
  return Math.max(0, xpTotal - canjes.reduce((s, c) => s + c.xp, 0))
}

export function vecesCanjeado(productoId: string, canjes: Canje[]): number {
  return canjes.filter((c) => c.productoId === productoId).length
}

export type Disponibilidad = { ok: true } | { ok: false; motivo: 'agotado' | 'faltan'; faltan?: number }

export function disponibilidad(p: Producto, disponibles: number, canjes: Canje[]): Disponibilidad {
  if (p.limite !== undefined && vecesCanjeado(p.id, canjes) >= p.limite) return { ok: false, motivo: 'agotado' }
  if (disponibles < p.xp) return { ok: false, motivo: 'faltan', faltan: p.xp - disponibles }
  return { ok: true }
}

/** Código legible y estable a partir del id del canje (ZEN-XXXX-XXXX). */
export function codigoCanje(id: string): string {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const s = (h >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8)
  return `ZEN-${s.slice(0, 4)}-${s.slice(4)}`
}

/* ── Recompensas: logros que se desbloquean y se reclaman ─────────────── */

export interface DatosLogros {
  xpHoy: number
  metaCumplida: boolean
  racha: number
  nivel: number
  revisados: number
  recordatorios: number
  lecciones: number
  unidadesCompletas: string[]
}

export interface DefLogro {
  id: string
  titulo: string
  detalle: string
  icon: string
  /** XP que da al reclamarlo */
  xp: number
  meta: number
  actual: (d: DatosLogros) => number
}

export const LOGROS: DefLogro[] = [
  { id: 'primer-paso', titulo: 'Primer paso del día', detalle: 'Haz tu primera tarea de hoy', icon: 'flag', xp: 10, meta: 1, actual: (d) => (d.xpHoy > 0 ? 1 : 0) },
  { id: 'meta-dia', titulo: 'Meta cumplida', detalle: 'Llega a tu meta de XP del día', icon: 'bolt', xp: 25, meta: 1, actual: (d) => (d.metaCumplida ? 1 : 0) },
  { id: 'conciliador', titulo: 'Conciliador', detalle: 'Revisa 6 movimientos', icon: 'fact_check', xp: 30, meta: 6, actual: (d) => d.revisados },
  { id: 'estudiante', titulo: 'Buen estudiante', detalle: 'Aprueba 3 lecciones', icon: 'school', xp: 30, meta: 3, actual: (d) => d.lecciones },
  { id: 'cobrador', titulo: 'Cobrador puntual', detalle: 'Recuérdale el pago a 2 clientes', icon: 'payments', xp: 30, meta: 2, actual: (d) => d.recordatorios },
  { id: 'plata-ordenada', titulo: 'Plata ordenada', detalle: 'Completa la unidad «Ordena tu plata»', icon: 'account_balance_wallet', xp: 50, meta: 1, actual: (d) => (d.unidadesCompletas.includes('ordena') ? 1 : 0) },
  { id: 'racha-7', titulo: 'Una semana seguida', detalle: 'Haz tareas 7 días seguidos', icon: 'local_fire_department', xp: 50, meta: 7, actual: (d) => d.racha },
  { id: 'nivel-3', titulo: 'Previsor', detalle: 'Llega al nivel 3', icon: 'military_tech', xp: 40, meta: 3, actual: (d) => d.nivel },
]

/** XP extra de los logros ya reclamados. */
export function xpDeRecompensas(reclamados: string[]): number {
  return LOGROS.filter((l) => reclamados.includes(l.id)).reduce((s, l) => s + l.xp, 0)
}

export interface Logro extends Omit<DefLogro, 'actual'> {
  actual: number
  logrado: boolean
  reclamado: boolean
}

export function logros(d: DatosLogros, reclamados: string[]): Logro[] {
  return LOGROS.map(({ actual, ...l }) => {
    const valor = Math.min(actual(d), l.meta)
    return { ...l, actual: valor, logrado: valor >= l.meta, reclamado: reclamados.includes(l.id) }
  })
}
