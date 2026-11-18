/** Motor de microlecciones: cada lección tiene un disparador con los números del negocio. */
import { LESSON_IDS, LESSONS, type LessonContent, type LessonContext } from '../config/lessons.ts'
import { gratificacion } from './calendar.ts'
import { interesesTotales, perfilCrediticio } from './credit.ts'
import type { CashflowResult } from './cashflow.ts'
import type { Cobranza } from './collections.ts'
import { type Analysis, resumenMes } from './engine.ts'
import { docLabel } from './reconciliation.ts'
import { REGIMEN_NOMBRE } from './taxSimulator.ts'
import type { Correction, LessonId } from './types.ts'
import { diffDays, fmtDiaMes, fmtPct, fmtSolesCorto, monthOf, round2 } from './util.ts'

export interface LessonInputs {
  analysis: Analysis
  hoy: string
  cobranzas: Cobranza[]
  caja: CashflowResult
  /** Aviso de límite del régimen (≥ 80%) */
  limite: { pct: number; tope: number } | null
  corrections: Correction[]
  /** El dueño ya abrió su perfil de crédito (F3) */
  creditoVisto?: boolean
}

export interface LessonState {
  context: LessonContext
  /** Lecciones cuyo disparador ya ocurrió */
  activas: LessonId[]
}

export function evaluarLecciones(i: LessonInputs): LessonState {
  const a = i.analysis
  const mes = monthOf(i.hoy)
  const cls = [...a.classifications.values()]
  const movs = (estado: string) => cls.filter((c) => c.estado === estado).map((c) => a.movementsById.get(c.movementId)!)
  const sinBoleta = movs('COBRADO_SIN_COMPROBANTE')
  const sinFactura = movs('PAGADO_SIN_FACTURA')
  const personal = movs('POSIBLE_PERSONAL').filter((m) => monthOf(m.fecha) === mes)
  const detr = a.matches.find((m) => m.regla === 'DETRACCION')
  const ret = a.matches.find((m) => m.regla === 'RETENCION')
  const vencida = i.cobranzas.filter((c) => c.diasVencidos > 30).sort((x, y) => y.diasVencidos - x.diasVencidos)[0]
  const b = a.business
  const grati = gratificacion(b.regimenLaboral, b.trabajadores, b.sueldoPromedio)
  const gratiFecha = `${i.hoy.slice(0, 4)}-12-15`
  const semanas = Math.max(1, Math.ceil(diffDays(i.hoy, gratiFecha) / 7))
  const sum = (xs: { monto: number }[]) => round2(xs.reduce((s, x) => s + Math.abs(x.monto), 0))
  const marcoPersonal = i.corrections.some((c) => c.businessId === b.id && c.elegida === 'retiro_dueno')
  const revisados = new Set(i.corrections.filter((c) => c.businessId === b.id && c.origen !== 'CONTADOR').map((c) => c.movementId)).size

  const context: LessonContext = {
    negocio: b.nombreComercial,
    yapesSinBoleta: { count: sinBoleta.length, monto: fmtSolesCorto(sum(sinBoleta)) },
    pagosSinFactura: { count: sinFactura.length, monto: fmtSolesCorto(sum(sinFactura)), igv: fmtSolesCorto(round2((sum(sinFactura) * 18) / 118)) },
    detraccion: detr ? { monto: fmtSolesCorto(detr.detraccion ?? 0), doc: docLabel(a.comprobantesById.get(detr.comprobanteIds[0])!) } : null,
    retencion: ret ? { monto: fmtSolesCorto(ret.retencion ?? 0), cliente: a.comprobantesById.get(ret.comprobanteIds[0])!.nombreContraparte } : null,
    personalMes: { monto: fmtSolesCorto(sum(personal)), count: personal.length },
    sueldoDueno: b.sueldoDueno ? fmtSolesCorto(b.sueldoDueno) : null,
    vencida: vencida
      ? {
          cliente: vencida.comprobante.nombreContraparte,
          monto: fmtSolesCorto(vencida.monto),
          dias: vencida.diasVencidos,
          costo: fmtSolesCorto(round2(vencida.monto * 0.025 * (vencida.diasVencidos / 30))),
        }
      : null,
    caja: grati > 0 ? { grati: fmtSolesCorto(grati), porSemana: fmtSolesCorto(Math.ceil(grati / semanas)), fecha: fmtDiaMes(gratiFecha) } : null,
    limite: i.limite ? { pct: fmtPct(i.limite.pct), tope: fmtSolesCorto(i.limite.tope), regimen: REGIMEN_NOMBRE[b.regimenTributario] } : null,
    revisados,
    conciliado: fmtPct(resumenMes(a, mes).conciliado),
    credito: (() => {
      const p = perfilCrediticio(a, i.hoy)
      if (p.montoSugerido <= 0) return null
      return {
        excedente: fmtSolesCorto(Math.round(p.excedente)),
        cuotaMax: fmtSolesCorto(Math.round(p.cuotaMaxima)),
        monto: fmtSolesCorto(p.montoSugerido),
        plazo: p.plazoSugerido,
        intereses: fmtSolesCorto(Math.round(interesesTotales(p.montoSugerido, p.tea, p.plazoSugerido))),
      }
    })(),
  }

  const disparadas: Record<LessonId, boolean> = {
    L01: sinBoleta.length > 0,
    L02: sinFactura.length > 0,
    L03: !!detr,
    L04: !!ret,
    L05: marcoPersonal,
    L06: !!b.sueldoDueno,
    L07: !!vencida,
    L08: !!i.caja.alerta,
    L09: !!i.limite,
    L10: a.porRevisar.length === 0 && revisados > 0,
    L11: !!i.creditoVisto,
  }
  return { context, activas: LESSON_IDS.filter((id) => disparadas[id]) }
}

export function contenido(id: LessonId, context: LessonContext): LessonContent {
  return LESSONS[id](context)
}

/** Cuenta palabras (cuerpo + «¿Cómo te afecta?»), para el límite de 120. */
export function palabras(c: LessonContent): number {
  return `${c.cuerpo} ${c.comoTeAfecta}`.split(/\s+/).filter(Boolean).length
}
