/** F-08 · Portal del contador: semáforo de la cartera y asientos exportables. */
import { CATEGORIAS } from '../config/categories.ts'
import { proximoVencimiento } from './calendar.ts'
import { ruleMatches } from './categorization.ts'
import { type Analysis, resumenMes } from './engine.ts'
import type { RegimenTributario, Rule } from './types.ts'
import { monthOf, round2 } from './util.ts'

export type Semaforo = 'VERDE' | 'AMBAR' | 'ROJO'

export interface FilaCartera {
  id: string
  ruc: string
  razonSocial: string
  regimen: RegimenTributario
  conciliado: number
  pendientes: number
  alertas: { cobradoSinComprobante: number; pagadoSinFactura: number; diferencias: number }
  vencimiento: { fecha: string; dias: number }
  semaforo: Semaforo
  /** true = cliente con datos completos en la demo */
  completo: boolean
}

/** Verde: ≥ 90% y sin alertas · Rojo: vence en ≤ 3 días con < 70%, o cobró sin comprobante · Ámbar: el resto. */
export function semaforo(conciliado: number, alertas: FilaCartera['alertas'], diasVencimiento: number): Semaforo {
  const sinAlertas = alertas.cobradoSinComprobante + alertas.pagadoSinFactura + alertas.diferencias === 0
  if ((diasVencimiento <= 3 && conciliado < 0.7) || alertas.cobradoSinComprobante > 0) return 'ROJO'
  if (conciliado >= 0.9 && sinAlertas) return 'VERDE'
  return 'AMBAR'
}

export function filaDesdeAnalisis(a: Analysis, hoy: string, preguntasAbiertas = 0): FilaCartera {
  const r = resumenMes(a, monthOf(hoy))
  const alertas = {
    cobradoSinComprobante: r.porEstado.COBRADO_SIN_COMPROBANTE.count,
    pagadoSinFactura: r.porEstado.PAGADO_SIN_FACTURA.count,
    diferencias: r.porEstado.COMPROBANTE_SIN_COBRO.count + r.porEstado.FACTURA_SIN_PAGO.count,
  }
  const v = proximoVencimiento(a.business.ruc, hoy)
  return {
    id: a.business.id,
    ruc: a.business.ruc,
    razonSocial: a.business.razonSocial === a.business.nombreComercial ? a.business.razonSocial : `${a.business.nombreComercial} (${a.business.razonSocial})`,
    regimen: a.business.regimenTributario,
    conciliado: r.conciliado,
    pendientes: a.porRevisar.length + preguntasAbiertas,
    alertas,
    vencimiento: { fecha: v.fecha, dias: v.dias },
    semaforo: semaforo(r.conciliado, alertas, v.dias),
    completo: true,
  }
}

export interface LineaAsiento {
  fecha: string
  glosa: string
  cuenta_pcge: string
  debe: number
  haber: number
  comprobante: string
  ruc_contraparte: string
}

export const CUENTA_BANCO = '1041'

/** Cuenta PCGE de un movimiento: la que asignó el contador, la de su regla o la de la categoría. */
export function cuentaDe(a: Analysis, movementId: string, asignadas: Record<string, string>, rules: Rule[] = []): string {
  if (asignadas[movementId]) return asignadas[movementId]
  const cl = a.classifications.get(movementId)
  if (!cl) return '659'
  const m = a.movementsById.get(movementId)
  if (cl.fuente === 'REGLA_CONTADOR' && m) {
    const rule = [...rules].reverse().find((r) => r.businessId === a.business.id && r.scope === 'CONTADOR' && r.cuentaPCGE && ruleMatches(r.condicion, m))
    if (rule?.cuentaPCGE) return rule.cuentaPCGE
  }
  return CATEGORIAS[cl.categoriaId].codigoPCGE
}

/** Asientos de un mes: cada movimiento es una línea al debe y otra al haber (cuadran siempre). */
export function asientos(a: Analysis, mes: string, cuenta: (movementId: string) => string): LineaAsiento[] {
  const lineas: LineaAsiento[] = []
  const movs = a.movements.filter((m) => monthOf(m.fecha) === mes).sort((x, y) => x.fecha.localeCompare(y.fecha))
  for (const m of movs) {
    const match = a.matchByMovement.get(m.id)
    const comp = match?.comprobanteIds.map((id) => a.comprobantesById.get(id)).find((c) => c && (c.tipo === 'FACTURA' || c.tipo === 'BOLETA'))
    const base = {
      fecha: m.fecha.slice(0, 10),
      glosa: m.glosa,
      comprobante: comp ? `${comp.serie}-${comp.numero}${match && match.comprobanteIds.length > 1 ? ` (+${match.comprobanteIds.length - 1})` : ''}` : '',
      ruc_contraparte: m.contraparteRuc ?? comp?.rucContraparte ?? '',
    }
    const monto = round2(Math.abs(m.monto))
    const otra = cuenta(m.id)
    if (m.monto > 0) {
      lineas.push({ ...base, cuenta_pcge: CUENTA_BANCO, debe: monto, haber: 0 })
      lineas.push({ ...base, cuenta_pcge: otra, debe: 0, haber: monto })
    } else {
      lineas.push({ ...base, cuenta_pcge: otra, debe: monto, haber: 0 })
      lineas.push({ ...base, cuenta_pcge: CUENTA_BANCO, debe: 0, haber: monto })
    }
  }
  return lineas
}

const COLUMNAS: (keyof LineaAsiento)[] = ['fecha', 'glosa', 'cuenta_pcge', 'debe', 'haber', 'comprobante', 'ruc_contraparte']

export function toCsv(lineas: LineaAsiento[]): string {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? v.toFixed(2) : v
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [COLUMNAS.join(','), ...lineas.map((l) => COLUMNAS.map((c) => esc(l[c])).join(','))].join('\n')
}

export function totales(lineas: LineaAsiento[]) {
  return {
    debe: round2(lineas.reduce((s, l) => s + l.debe, 0)),
    haber: round2(lineas.reduce((s, l) => s + l.haber, 0)),
  }
}
