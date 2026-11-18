/**
 * Estado de la demo de la primera ola: lo que hace el usuario sobre el seed (correcciones, reglas,
 * comentarios, promesas, sueldo del dueño, lecciones…). Store externo con `useSyncExternalStore`:
 * lo leen tanto AppState (para el libro de Ingresos/Egresos) como las pantallas nuevas.
 * Se guarda en localStorage; «Reiniciar demo» lo borra y vuelve al seed.
 */
import { useSyncExternalStore } from 'react'
import type { FuenteExpediente } from '../config/credit'
import { AHORA, CONTADOR_DEMO, HOY } from '../config/demo'
import { CONSENTIMIENTO_DATOS, type FuenteDatos } from '../config/legal'
import { venceConsentimiento } from '../domain/credit'
import { track } from '../lib/analytics'
import { loadBusinessData } from '../data/fuentes'
import { analyze, type Analysis } from '../domain/engine'
import type {
  BankMovement,
  CategoriaId,
  CierreCaja,
  Comment,
  Comprobante,
  Correction,
  LessonEvent,
  LessonId,
  PromesaPago,
  RegimenLaboral,
  Rule,
} from '../domain/types'
import { diffDays, lastDayOfMonth } from '../domain/util'
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

/** Permiso para leer una fuente de datos (revocable). */
export interface PermisoFuente {
  otorgado: string
  revocado?: string
}

/** Lo que el dueño autorizó a Zenity a leer (texto en `config/legal.ts`). */
export interface PermisosDatos {
  version: string
  fuentes: Partial<Record<FuenteDatos, PermisoFuente>>
  /** Usar sus correcciones, sin nombre, RUC ni montos, para mejorar la categorización del rubro */
  mejorarZenity: boolean
}

/** Configuración inicial del negocio: permisos de datos y planilla. */
export interface InicioNegocio {
  permisos?: string
  planilla?: string
  /** El dueño eligió «Ahora no» */
  omitido?: string
}

export type Overrides = { sueldoDueno?: number; colchonCaja?: number; regimenLaboral?: RegimenLaboral; trabajadores?: number; sueldoPromedio?: number }

/** Extracto que subió el dueño (solo conteos). */
export interface Importacion {
  businessId: string
  ts: string
  nuevos: number
  repetidos: number
  errores: number
  formato: string
}

/** Proyección de caja guardada para medir su error cuando pase la fecha. */
export interface ProyeccionGuardada {
  businessId: string
  fecha: string
  /** Saldo base proyectado a 7 días */
  saldo7: number
}

export interface DemoState {
  v: 1
  corrections: Correction[]
  rules: Rule[]
  extraMovements: BankMovement[]
  comments: Comment[]
  promesas: PromesaPago[]
  overrides: Record<string, Overrides>
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
  /** Cierres de caja de las ventas en efectivo */
  cierresCaja: CierreCaja[]
  /** Primer recordatorio de cobro enviado por comprobante (fecha) */
  recordatorios: Record<string, string>
  /** Permisos de datos por negocio */
  datos: Record<string, PermisosDatos>
  /** Configuración inicial por negocio */
  inicio: Record<string, InicioNegocio>
  /** Meses que el contador cerró ("negocio:mes" → fecha) */
  mesesCerrados: Record<string, string>
  importaciones: Importacion[]
  proyecciones: ProyeccionGuardada[]
  /** Conciliaciones de confianza media que el dueño confirmó o consultó con su contador */
  confirmados: Record<string, 'OK' | 'CONSULTA'>
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
    cierresCaja: [],
    recordatorios: {},
    datos: {},
    inicio: {},
    mesesCerrados: {},
    importaciones: [],
    proyecciones: [],
    confirmados: {},
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
    ? analyze(data, { corrections: s.corrections, rules: s.rules, extraMovements: s.extraMovements, overrides: s.overrides[businessId], cierres: s.cierresCaja })
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
  const primera = nuevas[0]
  if (primera) {
    track('correccion_registrada', {
      origen: primera.origen,
      cambio: primera.sugerida !== primera.elegida,
      confianza: bandaConfianza(primera.confianzaSugerida),
      movimientos: nuevas.length,
      es_negocio: !!input.esNegocio,
    })
  }
  return { correctionIds: nuevas.map((c) => c.id), ruleIds: [] }
}

/** Alta ≥ 0.9 · Media ≥ 0.6 · Baja (la misma tabla de F-02). */
function bandaConfianza(c: number): 'alta' | 'media' | 'baja' {
  return c >= 0.9 ? 'alta' : c >= 0.6 ? 'media' : 'baja'
}

export function crearRegla(rule: Omit<Rule, 'id' | 'creadaEn'>): string {
  const id = uid('regla')
  setDemoState((s) => ({ ...s, rules: [...s.rules, { ...rule, id, creadaEn: new Date().toISOString() }] }))
  track('regla_creada', { por: rule.creadaPor })
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
  track('cobro_recibido', { tras_recordatorio: !!getDemoState().recordatorios[comprobante.id], simulado: true })
}

export function registrarPromesa(p: Omit<PromesaPago, 'registradaEn'>) {
  setDemoState((s) => ({
    ...s,
    promesas: [...s.promesas.filter((x) => x.comprobanteId !== p.comprobanteId), { ...p, registradaEn: AHORA }],
  }))
  track('cobro_promesa', { tras_recordatorio: !!getDemoState().recordatorios[p.comprobanteId] })
}

/** El dueño abrió WhatsApp (o copió el mensaje) para recordar un cobro. */
export function registrarRecordatorio(comprobanteId: string, props: { tono: string; tramo: string; canal: 'whatsapp' | 'copiado' }) {
  setDemoState((s) => (s.recordatorios[comprobanteId] ? s : { ...s, recordatorios: { ...s.recordatorios, [comprobanteId]: AHORA } }))
  track('cobro_recordatorio', props)
}

export function setOverride(businessId: string, patch: Overrides) {
  setDemoState((s) => ({ ...s, overrides: { ...s.overrides, [businessId]: { ...s.overrides[businessId], ...patch } } }))
  if (patch.sueldoDueno) track('sueldo_dueno_definido')
}

export function iniciarReto(businessId: string, fecha: string) {
  setDemoState((s) => ({ ...s, retoInicio: { ...s.retoInicio, [businessId]: fecha } }))
  track('reto_iniciado')
}

export function registrarLeccion(businessId: string, lessonId: LessonId, tipo: LessonEvent['tipo']) {
  setDemoState((s) => {
    // «Mostrada» se registra una sola vez por negocio
    if (tipo === 'MOSTRADA' && s.lessonEvents.some((e) => e.businessId === businessId && e.lessonId === lessonId && e.tipo === 'MOSTRADA')) return s
    track('leccion_evento', { leccion: lessonId, tipo })
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
  track('comentario', { autor: c.autor, pregunta: !!c.pregunta })
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
  track('contador_cuenta_asignada', { movimientos: movementIds.length, lote: movementIds.length > 1 })
}

export function setCierre(key: string, value: boolean) {
  setDemoState((s) => ({ ...s, cierre: { ...s.cierre, [key]: value } }))
}

export function marcarRegimenRevisado(businessId: string) {
  if (getDemoState().regimenRevisado[businessId]) return
  setDemoState((s) => ({ ...s, regimenRevisado: { ...s.regimenRevisado, [businessId]: true } }))
  track('regimen_revisado')
}

/** El contador cierra el mes del cliente: «días de cierre» = días desde el fin de mes. */
export function cerrarMes(businessId: string, mes: string, conPendientes = false) {
  setDemoState((s) => ({ ...s, mesesCerrados: { ...s.mesesCerrados, [`${businessId}:${mes}`]: AHORA } }))
  track('cierre_mes_completado', { dias: diffDays(lastDayOfMonth(mes), HOY), con_pendientes: conPendientes })
}

export function reabrirMes(businessId: string, mes: string) {
  const clave = `${businessId}:${mes}`
  setDemoState((s) => ({ ...s, mesesCerrados: Object.fromEntries(Object.entries(s.mesesCerrados).filter(([k]) => k !== clave)) }))
}

/* ── Extracto, cierre de caja y proyecciones ──────────────────── */

/** Agrega los movimientos del extracto que subió el dueño: el motor los concilia como cualquier otro. */
export function importarExtracto(businessId: string, nuevos: BankMovement[], meta: { repetidos: number; errores: number; formato: string }) {
  setDemoState((s) => ({
    ...s,
    extraMovements: [...s.extraMovements, ...nuevos.filter((m) => !s.extraMovements.some((x) => x.id === m.id))],
    importaciones: [...s.importaciones, { businessId, ts: AHORA, nuevos: nuevos.length, ...meta }],
  }))
  track('extracto_subido', { nuevos: nuevos.length, ...meta })
}

/** Registra (o corrige) el efectivo contado al cerrar un día. */
export function registrarCierreCaja(businessId: string, fecha: string, efectivo: number) {
  const id = `cierre-${businessId}-${fecha}`
  setDemoState((s) => ({
    ...s,
    cierresCaja: [...s.cierresCaja.filter((c) => c.id !== id), { id, businessId, fecha, efectivo, registrado: AHORA }],
  }))
  track('cierre_caja_registrado', { dias_atras: diffDays(fecha, HOY) })
}

export function borrarCierreCaja(id: string) {
  setDemoState((s) => ({ ...s, cierresCaja: s.cierresCaja.filter((c) => c.id !== id) }))
}

/** Guarda la proyección a 7 días (una por negocio y día) para medir su error cuando pase la fecha. */
export function guardarProyeccion(businessId: string, saldo7: number) {
  const s = getDemoState()
  if (s.proyecciones.some((p) => p.businessId === businessId && p.fecha === HOY)) return
  setDemoState((st) => ({ ...st, proyecciones: [...st.proyecciones, { businessId, fecha: HOY, saldo7 }] }))
}

/** El dueño confirma una conciliación de confianza media, o se la consulta a su contador. */
export function responderConciliacion(input: { businessId: string; matchId: string; movementId: string; regla: string; motivo: string; respuesta: 'OK' | 'CONSULTA' }) {
  setDemoState((s) => ({ ...s, confirmados: { ...s.confirmados, [input.matchId]: input.respuesta } }))
  if (input.respuesta === 'CONSULTA') {
    comentar({ businessId: input.businessId, movementId: input.movementId, autor: 'DUENO', texto: `¿Puedes revisar esta conciliación? Zenity dice: ${input.motivo}` })
  }
  track('conciliacion_confirmada', { regla: input.regla, respuesta: input.respuesta === 'OK' ? 'correcta' : 'consulta' })
}

/* ── Permisos de datos y configuración inicial ────────────────── */

export function permisoActivo(d: PermisosDatos | undefined, fuente: FuenteDatos): boolean {
  const p = d?.fuentes[fuente]
  return !!p && !p.revocado
}

/** Acepta el texto de permisos con las fuentes marcadas. */
export function otorgarPermisosDatos(businessId: string, fuentes: FuenteDatos[], mejorarZenity: boolean) {
  setDemoState((s) => ({
    ...s,
    datos: {
      ...s.datos,
      [businessId]: {
        version: CONSENTIMIENTO_DATOS.version,
        fuentes: Object.fromEntries(fuentes.map((f) => [f, { otorgado: AHORA }])),
        mejorarZenity,
      },
    },
    inicio: { ...s.inicio, [businessId]: { ...s.inicio[businessId], permisos: AHORA } },
  }))
  track('datos_consentimiento', { fuentes: fuentes.length, mejora: mejorarZenity })
}

/** Activa o revoca el permiso de una fuente. */
export function setPermisoDato(businessId: string, fuente: FuenteDatos, activo: boolean) {
  setDemoState((s) => {
    const actual = s.datos[businessId] ?? { version: CONSENTIMIENTO_DATOS.version, fuentes: {}, mejorarZenity: false }
    const p = actual.fuentes[fuente]
    const nuevo: PermisoFuente = activo ? { otorgado: AHORA } : { otorgado: p?.otorgado ?? AHORA, revocado: AHORA }
    return { ...s, datos: { ...s.datos, [businessId]: { ...actual, fuentes: { ...actual.fuentes, [fuente]: nuevo } } } }
  })
  track(activo ? 'datos_permiso_activado' : 'datos_permiso_revocado', { fuente })
}

export function setMejorarZenity(businessId: string, mejorarZenity: boolean) {
  setDemoState((s) => {
    const actual = s.datos[businessId] ?? { version: CONSENTIMIENTO_DATOS.version, fuentes: {}, mejorarZenity: false }
    return { ...s, datos: { ...s.datos, [businessId]: { ...actual, mejorarZenity } } }
  })
}

/** Confirma el régimen laboral y la planilla (cambian la gratificación y la CTS de la caja). */
export function confirmarPlanilla(businessId: string, planilla: Required<Pick<Overrides, 'regimenLaboral' | 'trabajadores' | 'sueldoPromedio'>>, cambio: boolean) {
  setDemoState((s) => ({
    ...s,
    overrides: { ...s.overrides, [businessId]: { ...s.overrides[businessId], ...planilla } },
    inicio: { ...s.inicio, [businessId]: { ...s.inicio[businessId], planilla: AHORA } },
  }))
  track('planilla_confirmada', { regimen: planilla.regimenLaboral, trabajadores: planilla.trabajadores, cambio })
}

export function omitirInicio(businessId: string) {
  setDemoState((s) => ({ ...s, inicio: { ...s.inicio, [businessId]: { ...s.inicio[businessId], omitido: AHORA } } }))
  track('configuracion_omitida')
}

export function inicioCompleto(s: DemoState, businessId: string): boolean {
  const i = s.inicio[businessId]
  return !!i?.permisos && !!i?.planilla
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
