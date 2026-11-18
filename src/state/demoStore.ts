/**
 * Estado de la demo de la primera ola: lo que hace el usuario sobre el seed (correcciones, reglas,
 * comentarios, promesas, sueldo del dueño, lecciones…). Store externo con `useSyncExternalStore`:
 * lo leen tanto AppState (para el libro de Ingresos/Egresos) como las pantallas nuevas.
 * Se guarda en localStorage; «Reiniciar demo» lo borra y vuelve al seed.
 */
import { useSyncExternalStore } from 'react'
import type { FuenteExpediente } from '../config/credit'
import { AHORA, CONTADOR_DEMO, HOY } from '../config/demo'
import { venceConsentimiento } from '../domain/credit'
import { track } from '../lib/analytics'
import { loadBusinessData } from '../data/fuentes'
import { analyze, type Analysis } from '../domain/engine'
import type {
  BankMovement,
  CategoriaId,
  Comment,
  Comprobante,
  Correction,
  LessonEvent,
  LessonId,
  PromesaPago,
  RegimenLaboral,
  Rule,
} from '../domain/types'
import { readStorage, writeStorage } from '../lib/storage'

export interface Permisos {
  verMovimientos: boolean
  editarCategorias: boolean
  /** false = el dueño le quitó el acceso */
  activo: boolean
}

export type EstadoSolicitud = 'ENVIADA' | 'PRE_APROBADA' | 'MAS_INFO' | 'NO_POR_AHORA' | 'ACEPTADA'

/** Consentimiento del dueño para compartir su expediente con el BCP (revocable). */
export interface Consentimiento {
  fuentes: FuenteExpediente[]
  otorgado: string
  vence: string
  revocado?: string
}

export interface Solicitud {
  monto: number
  plazo: number
  tea: number
  enviada: string
  estado: EstadoSolicitud
  /** Respuesta del BCP (simulada en la vista BCP) */
  respuesta?: { monto?: number; plazo?: number; nota: string; ts: string }
  /** Lo que el dueño contestó cuando el BCP pidió más información */
  infoDueno?: string
  /** Fecha del desembolso al aceptar */
  desembolso?: string
}

export interface CreditoNegocio {
  visto?: boolean
  consentimiento?: Consentimiento
  solicitud?: Solicitud
}

export interface DemoState {
  v: 1
  corrections: Correction[]
  rules: Rule[]
  extraMovements: BankMovement[]
  comments: Comment[]
  promesas: PromesaPago[]
  overrides: Record<string, { sueldoDueno?: number; colchonCaja?: number; regimenLaboral?: RegimenLaboral }>
  /** Inicio del reto «30 días con cuentas separadas» por negocio */
  retoInicio: Record<string, string>
  lessonEvents: LessonEvent[]
  /** Lecciones cerradas en contexto ("negocio:L01"): ya no se muestran como tarjeta */
  leccionesCerradas: string[]
  persona: 'DUENO' | 'CONTADOR' | 'BCP'
  /** F3 · Perfil crediticio por negocio */
  credito: Record<string, CreditoNegocio>
  permisos: Record<string, Permisos>
  /** Cuenta PCGE que asignó el contador a un movimiento */
  pcge: Record<string, string>
  /** Checks manuales del cierre del mes ("negocio:mes:item") */
  cierre: Record<string, boolean>
  /** El dueño ya revisó su régimen (Mi progreso) */
  regimenRevisado: Record<string, boolean>
}

const KEY = 'zenity.demo.v1'

export const PERMISOS_INICIALES: Permisos = { verMovimientos: true, editarCategorias: true, activo: true }

function initial(): DemoState {
  return {
    v: 1,
    corrections: [],
    rules: [],
    extraMovements: [],
    comments: [],
    promesas: [],
    overrides: {},
    // El reto empezó el 1 de noviembre
    retoInicio: {},
    lessonEvents: [],
    leccionesCerradas: [],
    persona: 'DUENO',
    credito: {},
    permisos: {},
    pcge: {},
    cierre: {},
    regimenRevisado: {},
  }
}

function load(): DemoState {
  const stored = readStorage<Partial<DemoState> | null>(KEY, null)
  if (!stored || stored.v !== 1) return initial()
  return { ...initial(), ...stored }
}

let state: DemoState = load()
const listeners = new Set<() => void>()

function emit() {
  writeStorage(KEY, state)
  for (const l of listeners) l()
}

export function getDemoState(): DemoState {
  return state
}

export function setDemoState(update: (s: DemoState) => DemoState): void {
  state = update(state)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getDemoState, getDemoState)
}

/* ── Análisis (memorizado por estado y negocio) ───────────────── */

const cache = new WeakMap<DemoState, Map<string, Analysis | null>>()

export function analysisFor(businessId: string, s: DemoState = state): Analysis | null {
  let byBiz = cache.get(s)
  if (!byBiz) {
    byBiz = new Map()
    cache.set(s, byBiz)
  }
  if (byBiz.has(businessId)) return byBiz.get(businessId)!
  const data = loadBusinessData(businessId)
  const result = data
    ? analyze(data, { corrections: s.corrections, rules: s.rules, extraMovements: s.extraMovements, overrides: s.overrides[businessId] })
    : null
  byBiz.set(businessId, result)
  return result
}

/* ── Acciones ─────────────────────────────────────────────────── */

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`

/** Lo que se crea con una acción, para poder deshacerla. */
export interface UndoToken {
  correctionIds: string[]
  ruleIds: string[]
}

export function corregir(input: {
  movementIds: string[]
  businessId: string
  rubro: string
  elegida: CategoriaId
  origen?: Correction['origen']
  esNegocio?: boolean
  creoRegla?: boolean
}): UndoToken {
  const a = analysisFor(input.businessId)
  const nuevas: Correction[] = input.movementIds.map((movementId) => {
    const cl = a?.classifications.get(movementId)
    return {
      id: uid('corr'),
      movementId,
      businessId: input.businessId,
      rubro: input.rubro,
      sugerida: cl?.categoriaId ?? 'otros',
      elegida: input.elegida,
      confianzaSugerida: cl?.confianza ?? 0,
      origen: input.origen ?? 'APP',
      creoRegla: input.creoRegla ?? false,
      esNegocio: input.esNegocio,
      ts: new Date().toISOString(),
    }
  })
  setDemoState((s) => ({ ...s, corrections: [...s.corrections, ...nuevas] }))
  return { correctionIds: nuevas.map((c) => c.id), ruleIds: [] }
}

export function crearRegla(rule: Omit<Rule, 'id' | 'creadaEn'>): string {
  const id = uid('regla')
  setDemoState((s) => ({ ...s, rules: [...s.rules, { ...rule, id, creadaEn: new Date().toISOString() }] }))
  return id
}

export function actualizarRegla(rule: Rule) {
  setDemoState((s) => ({ ...s, rules: s.rules.map((r) => (r.id === rule.id ? rule : r)) }))
}

export function borrarRegla(id: string) {
  setDemoState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }))
}

/** Marca en las correcciones que se creó una regla (datos de entrenamiento). */
export function marcarCreoRegla(correctionIds: string[]) {
  setDemoState((s) => ({ ...s, corrections: s.corrections.map((c) => (correctionIds.includes(c.id) ? { ...c, creoRegla: true } : c)) }))
}

export function deshacer(token: UndoToken) {
  setDemoState((s) => ({
    ...s,
    corrections: s.corrections.filter((c) => !token.correctionIds.includes(c.id)),
    rules: s.rules.filter((r) => !token.ruleIds.includes(r.id)),
  }))
}

/** «Simular que pagó»: inserta un abono mock que el motor concilia solo. */
export function simularPago(businessId: string, comprobante: Comprobante, monto: number) {
  const a = analysisFor(businessId)
  const saldo = a?.saldoActual ?? 0
  const nombre = comprobante.nombreContraparte
  const movement: BankMovement = {
    id: uid('sim'),
    businessId,
    fecha: AHORA,
    monto,
    glosa: `TRANSF. ${nombre.toUpperCase()}`,
    numeroOperacion: String(Math.floor(100_000_000 + Math.random() * 800_000_000)),
    contraparteNombre: nombre,
    contraparteRuc: comprobante.rucContraparte,
    canal: 'TRANSFERENCIA',
    saldoDespues: Math.round((saldo + monto) * 100) / 100,
    simulado: true,
  }
  setDemoState((s) => ({ ...s, extraMovements: [...s.extraMovements, movement] }))
}

export function registrarPromesa(p: Omit<PromesaPago, 'registradaEn'>) {
  setDemoState((s) => ({
    ...s,
    promesas: [...s.promesas.filter((x) => x.comprobanteId !== p.comprobanteId), { ...p, registradaEn: AHORA }],
  }))
}

export function setOverride(businessId: string, patch: DemoState['overrides'][string]) {
  setDemoState((s) => ({ ...s, overrides: { ...s.overrides, [businessId]: { ...s.overrides[businessId], ...patch } } }))
}

export function iniciarReto(businessId: string, fecha: string) {
  setDemoState((s) => ({ ...s, retoInicio: { ...s.retoInicio, [businessId]: fecha } }))
}

export function registrarLeccion(businessId: string, lessonId: LessonId, tipo: LessonEvent['tipo']) {
  setDemoState((s) => {
    // «Mostrada» se registra una sola vez por negocio
    if (tipo === 'MOSTRADA' && s.lessonEvents.some((e) => e.businessId === businessId && e.lessonId === lessonId && e.tipo === 'MOSTRADA')) return s
    return { ...s, lessonEvents: [...s.lessonEvents, { lessonId, businessId, tipo, ts: new Date().toISOString() }] }
  })
}

export function cerrarLeccion(businessId: string, lessonId: LessonId) {
  setDemoState((s) => ({ ...s, leccionesCerradas: [...new Set([...s.leccionesCerradas, `${businessId}:${lessonId}`])] }))
}

export function setPersona(persona: DemoState['persona']) {
  setDemoState((s) => (s.persona === persona ? s : { ...s, persona }))
}

export function permisosDe(s: DemoState, businessId: string): Permisos {
  return s.permisos[businessId] ?? PERMISOS_INICIALES
}

export function setPermisos(businessId: string, patch: Partial<Permisos>) {
  setDemoState((s) => ({ ...s, permisos: { ...s.permisos, [businessId]: { ...permisosDe(s, businessId), ...patch } } }))
}

export function comentar(c: Omit<Comment, 'id' | 'ts'>): string {
  const id = uid('com')
  setDemoState((s) => ({ ...s, comments: [...s.comments, { ...c, id, ts: new Date().toISOString() }] }))
  return id
}

/** El dueño responde una pregunta del contador: la respuesta vuelve al hilo. */
export function responderPregunta(pregunta: Comment, texto: string) {
  setDemoState((s) => ({
    ...s,
    comments: [
      ...s.comments.map((c) => (c.id === pregunta.id ? { ...c, respondida: true } : c)),
      { id: uid('com'), businessId: pregunta.businessId, movementId: pregunta.movementId, autor: 'DUENO', texto, ts: new Date().toISOString() },
    ],
  }))
}

export function asignarCuenta(movementIds: string[], cuenta: string) {
  setDemoState((s) => ({ ...s, pcge: { ...s.pcge, ...Object.fromEntries(movementIds.map((id) => [id, cuenta])) } }))
}

export function setCierre(key: string, value: boolean) {
  setDemoState((s) => ({ ...s, cierre: { ...s.cierre, [key]: value } }))
}

export function marcarRegimenRevisado(businessId: string) {
  setDemoState((s) => (s.regimenRevisado[businessId] ? s : { ...s, regimenRevisado: { ...s.regimenRevisado, [businessId]: true } }))
}

/* ── F3 · Crédito ─────────────────────────────────────────────── */

function setCredito(businessId: string, patch: (c: CreditoNegocio) => CreditoNegocio) {
  setDemoState((s) => ({ ...s, credito: { ...s.credito, [businessId]: patch(s.credito[businessId] ?? {}) } }))
}

/** Consentimiento vigente (no revocado ni vencido). */
export function consentimientoActivo(c: CreditoNegocio | undefined): Consentimiento | null {
  const k = c?.consentimiento
  return k && !k.revocado && k.vence >= HOY ? k : null
}

export function marcarCreditoVisto(businessId: string, segmento: string) {
  if (getDemoState().credito[businessId]?.visto) return
  setCredito(businessId, (c) => ({ ...c, visto: true }))
  track('credito_perfil_visto', { segmento })
}

export function otorgarConsentimiento(businessId: string, fuentes: FuenteExpediente[]) {
  setCredito(businessId, (c) => ({ ...c, consentimiento: { fuentes, otorgado: AHORA, vence: venceConsentimiento(HOY) } }))
  track('credito_consentimiento', { fuentes: fuentes.length })
}

export function revocarConsentimiento(businessId: string) {
  setCredito(businessId, (c) => (c.consentimiento ? { ...c, consentimiento: { ...c.consentimiento, revocado: AHORA } } : c))
  track('credito_consentimiento_revocado')
}

export function enviarSolicitud(businessId: string, monto: number, plazo: number, tea: number) {
  setCredito(businessId, (c) => ({ ...c, solicitud: { monto, plazo, tea, enviada: AHORA, estado: 'ENVIADA' } }))
  track('credito_solicitud_enviada', { plazo })
}

/** El BCP responde (vista BCP de la demo). */
export function responderSolicitud(businessId: string, estado: 'PRE_APROBADA' | 'MAS_INFO' | 'NO_POR_AHORA', respuesta: { monto?: number; plazo?: number; nota: string }) {
  setCredito(businessId, (c) => (c.solicitud ? { ...c, solicitud: { ...c.solicitud, estado, respuesta: { ...respuesta, ts: AHORA } } } : c))
  track('credito_respuesta_bcp', { estado })
}

/** El dueño contesta el pedido de información: la solicitud vuelve a evaluación. */
export function enviarInformacion(businessId: string, texto: string) {
  setCredito(businessId, (c) => (c.solicitud ? { ...c, solicitud: { ...c.solicitud, estado: 'ENVIADA', infoDueno: texto } } : c))
}

/** Acepta la pre-aprobación: el desembolso entra hoy a la cuenta BCP y las cuotas, a la caja. */
export function aceptarCredito(businessId: string) {
  const s = getDemoState()
  const sol = s.credito[businessId]?.solicitud
  if (!sol || sol.estado !== 'PRE_APROBADA') return
  const monto = sol.respuesta?.monto ?? sol.monto
  const plazo = sol.respuesta?.plazo ?? sol.plazo
  const saldo = analysisFor(businessId)?.saldoActual ?? 0
  const movement: BankMovement = {
    id: uid('desembolso'),
    businessId,
    fecha: AHORA,
    monto,
    glosa: 'DESEMBOLSO PRESTAMO CAPITAL DE TRABAJO BCP',
    numeroOperacion: String(Math.floor(100_000_000 + Math.random() * 800_000_000)),
    contraparteNombre: 'BCP',
    canal: 'TRANSFERENCIA',
    saldoDespues: Math.round((saldo + monto) * 100) / 100,
    simulado: true,
  }
  setDemoState((st) => ({
    ...st,
    extraMovements: [...st.extraMovements, movement],
    credito: { ...st.credito, [businessId]: { ...st.credito[businessId], solicitud: { ...sol, monto, plazo, estado: 'ACEPTADA', desembolso: HOY } } },
  }))
  track('credito_aceptado', { plazo })
}

/** Restaura el seed: borra todo lo que hizo el usuario en la demo. */
export function reiniciarDemo() {
  state = initial()
  emit()
}

export const CONTADOR = CONTADOR_DEMO
