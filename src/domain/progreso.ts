/**
 * Educación financiera como avance progresivo (al estilo Duolingo): cada tarea real del dueño da XP,
 * hay una meta diaria y una racha, los niveles suben con el XP y el «camino» ordena las tareas en
 * unidades con una microlección al final de cada paso. Todo se calcula con lo que el dueño ya hizo.
 */
import type { Analysis } from './engine.ts'
import type { Correction, LessonEvent, LessonId, PromesaPago } from './types.ts'

/** Lo que hizo el dueño en la demo (en todos sus negocios). */
export interface EntradaProgreso {
  corrections: Correction[]
  recordatorios: Record<string, string>
  promesas: PromesaPago[]
  lessonEvents: LessonEvent[]
  datos: Record<string, unknown>
  inicio: Record<string, { permisos?: string; planilla?: string }>
  overrides: Record<string, { sueldoDueno?: number }>
  importaciones: { businessId: string }[]
  confirmados: Record<string, string>
  regimenRevisado: Record<string, boolean>
  /** Hitos sueltos («negocio:caja», «negocio:sunat») → fecha */
  hitos: Record<string, string>
}

/** XP por cada cosa que hace el dueño. */
export const XP = {
  revisar: 10,
  recordatorio: 10,
  promesa: 10,
  leccion: 20,
  permisos: 20,
  planilla: 20,
  sueldo: 20,
  extracto: 20,
  confirmado: 5,
  regimen: 15,
  hito: 10,
} as const

/**
 * La demo cuenta la historia de una dueña que ya usa Zenity hace unos días: ese avance previo es
 * fijo. La fecha de la demo no avanza, así que todo lo que se hace en ella cuenta como «hoy».
 */
export const XP_PREVIO = 180
export const RACHA_PREVIA = 4
export const META_DIARIA = 50

export const NIVELES = [
  { desde: 0, nombre: 'Primeros pasos' },
  { desde: 100, nombre: 'Ordenado' },
  { desde: 250, nombre: 'Previsor' },
  { desde: 450, nombre: 'Estratega' },
  { desde: 700, nombre: 'Dueño experto' },
  { desde: 1000, nombre: 'Maestro de tus números' },
] as const

export interface Nivel {
  numero: number
  nombre: string
  desde: number
  /** XP del siguiente nivel; null en el último */
  hasta: number | null
  /** Avance dentro del nivel, de 0 a 1 */
  pct: number
  faltan: number
}

export function nivelDe(xp: number): Nivel {
  let i = 0
  while (i + 1 < NIVELES.length && xp >= NIVELES[i + 1].desde) i++
  const desde = NIVELES[i].desde
  const hasta = i + 1 < NIVELES.length ? NIVELES[i + 1].desde : null
  return {
    numero: i + 1,
    nombre: NIVELES[i].nombre,
    desde,
    hasta,
    pct: hasta === null ? 1 : (xp - desde) / (hasta - desde),
    faltan: hasta === null ? 0 : hasta - xp,
  }
}

const leidas = (e: EntradaProgreso) => new Set(e.lessonEvents.filter((l) => l.tipo === 'LEIDA').map((l) => `${l.businessId}:${l.lessonId}`))

/** XP ganado en la demo (todo es de «hoy»). */
export function xpDeHoy(e: EntradaProgreso): number {
  const propias = e.corrections.filter((c) => c.origen !== 'CONTADOR')
  return (
    propias.length * XP.revisar +
    Object.keys(e.recordatorios).length * XP.recordatorio +
    e.promesas.length * XP.promesa +
    leidas(e).size * XP.leccion +
    Object.keys(e.datos).length * XP.permisos +
    Object.values(e.inicio).filter((i) => i.planilla).length * XP.planilla +
    Object.values(e.overrides).filter((o) => o.sueldoDueno).length * XP.sueldo +
    e.importaciones.length * XP.extracto +
    Object.keys(e.confirmados).length * XP.confirmado +
    Object.values(e.regimenRevisado).filter(Boolean).length * XP.regimen +
    Object.keys(e.hitos).length * XP.hito
  )
}

export interface Progreso {
  xp: number
  xpHoy: number
  meta: number
  metaCumplida: boolean
  /** Días seguidos con al menos una tarea */
  racha: number
  /** Ya hizo algo hoy (la racha de hoy está asegurada) */
  rachaHoy: boolean
  nivel: Nivel
}

export function progreso(e: EntradaProgreso): Progreso {
  const xpHoy = xpDeHoy(e)
  const xp = XP_PREVIO + xpHoy
  return {
    xp,
    xpHoy,
    meta: META_DIARIA,
    metaCumplida: xpHoy >= META_DIARIA,
    racha: RACHA_PREVIA + (xpHoy > 0 ? 1 : 0),
    rachaHoy: xpHoy > 0,
    nivel: nivelDe(xp),
  }
}

/* ── El camino: unidades con tareas reales y una microlección ───────────── */

export interface Paso {
  id: string
  tipo: 'tarea' | 'leccion'
  titulo: string
  detalle: string
  hecho: boolean
  xp: number
  /** Tareas: a dónde ir para hacerla */
  to?: string
  lessonId?: LessonId
  /** «4 de 6» en tareas que se hacen por partes */
  avance?: { hechos: number; total: number }
}

export interface Unidad {
  id: string
  titulo: string
  meta: string
  icon: string
  pasos: Paso[]
  estado: 'completa' | 'actual' | 'bloqueada'
  hechos: number
}

export function camino(a: Analysis, e: EntradaProgreso, conexiones: number): Unidad[] {
  const id = a.business.id
  const leida = leidas(e)
  const leccion = (lessonId: LessonId, titulo: string, detalle: string): Paso => ({
    id: lessonId,
    tipo: 'leccion',
    lessonId,
    titulo,
    detalle,
    hecho: leida.has(`${id}:${lessonId}`),
    xp: XP.leccion,
  })
  const revisados = e.corrections.filter((c) => c.businessId === id && c.origen !== 'CONTADOR').length
  const totalRevisar = revisados + a.porRevisar.length
  const recordados = Object.keys(e.recordatorios).filter((c) => a.comprobantesById.has(c)).length
  const promesas = e.promesas.filter((p) => a.comprobantesById.has(p.comprobanteId)).length

  const base: Omit<Unidad, 'estado' | 'hechos'>[] = [
    {
      id: 'ordena',
      titulo: 'Ordena tu plata',
      meta: 'Sabe cuánto entra y cuánto sale de verdad',
      icon: 'account_balance_wallet',
      pasos: [
        { id: 'conectar', tipo: 'tarea', titulo: 'Conecta tu banco', detalle: 'Zenity lee tus movimientos solo para consulta', hecho: conexiones > 0, xp: XP.permisos, to: '/conexiones' },
        { id: 'permisos', tipo: 'tarea', titulo: 'Autoriza qué lee Zenity', detalle: 'Tú decides cada fuente y puedes revocarla', hecho: id in e.datos, xp: XP.permisos, to: '/bienvenida' },
        {
          id: 'revisar',
          tipo: 'tarea',
          titulo: 'Revisa tus movimientos',
          detalle: a.porRevisar.length ? `Te faltan ${a.porRevisar.length}: unos segundos cada uno` : 'Todo revisado',
          hecho: a.porRevisar.length === 0,
          xp: XP.revisar,
          to: '/revisar',
          avance: totalRevisar ? { hechos: revisados, total: totalRevisar } : undefined,
        },
        leccion('L10', 'Qué es conciliar', 'Lo que hace tu contador, en minutos'),
      ],
    },
    {
      id: 'separa',
      titulo: 'Separa lo tuyo del negocio',
      meta: 'Conoce la utilidad real de tu negocio',
      icon: 'person',
      pasos: [
        leccion('L05', 'Tu bolsillo y el del negocio', 'Por qué no mezclarlos'),
        { id: 'sueldo', tipo: 'tarea', titulo: 'Define tu sueldo de dueño', detalle: 'Un monto fijo que el negocio pueda pagarte', hecho: !!a.business.sueldoDueno, xp: XP.sueldo, to: '/personal' },
        leccion('L06', 'Págate un sueldo fijo', 'Lo que sobra se queda para crecer'),
      ],
    },
    {
      id: 'cobra',
      titulo: 'Cobra a tiempo',
      meta: 'Que tu plata no se quede en manos de otros',
      icon: 'payments',
      pasos: [
        { id: 'recordar', tipo: 'tarea', titulo: 'Recuérdale a un cliente', detalle: 'Un WhatsApp listo para enviar', hecho: recordados > 0, xp: XP.recordatorio, to: '/cobrar' },
        { id: 'promesa', tipo: 'tarea', titulo: 'Anota una promesa de pago', detalle: 'Entra a tu caja con su fecha', hecho: promesas > 0, xp: XP.promesa, to: '/cobrar' },
        leccion('L07', 'Vender al crédito también cuesta', 'Cobrar a tiempo es tan importante como vender'),
      ],
    },
    {
      id: 'anticipa',
      titulo: 'Anticipa tu caja',
      meta: 'Que los pagos grandes no te agarren desprevenido',
      icon: 'monitoring',
      pasos: [
        { id: 'planilla', tipo: 'tarea', titulo: 'Confirma tu planilla', detalle: 'Para calcular gratificación y CTS', hecho: !!e.inicio[id]?.planilla, xp: XP.planilla, to: '/bienvenida?paso=planilla' },
        { id: 'caja', tipo: 'tarea', titulo: 'Mira tu caja de los próximos meses', detalle: 'Lo que viene a 30, 60 y 90 días', hecho: `${id}:caja` in e.hitos, xp: XP.hito, to: '/caja' },
        leccion('L08', 'Provisiona la gratificación', 'Separa un poco cada semana'),
      ],
    },
    {
      id: 'sunat',
      titulo: 'Cumple con SUNAT',
      meta: 'Paga lo justo y a tiempo',
      icon: 'account_balance',
      pasos: [
        { id: 'sunat', tipo: 'tarea', titulo: 'Revisa tu pago a SUNAT', detalle: 'Cuánto y cuándo pagas este mes', hecho: `${id}:sunat` in e.hitos, xp: XP.hito, to: '/inicio' },
        leccion('L01', 'Cada venta con su boleta', 'También las que cobras por Yape'),
        leccion('L02', 'Sin factura no hay crédito fiscal', 'El IGV que puedes recuperar'),
      ],
    },
  ]

  let actualAsignada = false
  return base.map((u) => {
    const hechos = u.pasos.filter((p) => p.hecho).length
    let estado: Unidad['estado']
    if (hechos === u.pasos.length) estado = 'completa'
    else if (!actualAsignada) {
      estado = 'actual'
      actualAsignada = true
    } else estado = 'bloqueada'
    return { ...u, hechos, estado }
  })
}

/** El siguiente paso del camino: el primero sin hacer de la unidad actual. */
export function siguientePaso(unidades: Unidad[]): { unidad: Unidad; paso: Paso } | null {
  const unidad = unidades.find((u) => u.estado === 'actual')
  const paso = unidad?.pasos.find((p) => !p.hecho)
  return unidad && paso ? { unidad, paso } : null
}
