/**
 * F-01 · Conciliación de tres vías: banco (BCP) + SUNAT (SIRE) + cobros digitales (POS / Yape).
 * Las reglas se aplican en orden y un movimiento o comprobante ya usado no se reutiliza.
 * Los motivos salen de plantillas determinísticas (F-02): nunca de un LLM.
 */
import { TAX_2026 } from '../config/taxParams2026.ts'
import type { BankMovement, Comprobante, Match, PosBatch, PosSale } from './types.ts'
import { addDays, cents, dayOf, diffDays, fmtFecha, fmtSoles, nameSimilarity, round2 } from './util.ts'

export interface ReconcileInput {
  movements: BankMovement[]
  comprobantes: Comprobante[]
  posSales: PosSale[]
  posBatches: PosBatch[]
  tipoCambio: (fecha: string) => number
}

/** Factura o boleta abierta, con su ventana de fechas y su total neto de notas de crédito. */
export interface OpenItem {
  comp: Comprobante
  /** El comprobante y sus notas de crédito */
  ids: string[]
  /** Total efectivo en céntimos (total − notas de crédito) */
  total: number
  start: string
  end: string
  retencionId?: string
  notas: Comprobante[]
}

/** Confianzas por regla (sección F-01 del brief). */
export const CONFIANZA = {
  exactoConNombre: 0.98,
  exactoSinNombre: 0.85,
  detraccion: 0.92,
  retencionConComprobante: 0.92,
  retencionSinComprobante: 0.75,
  pos: 0.9,
  agrupadoCliente: 0.85,
  moneda: 0.8,
  sugeridoMinimo: 0.5,
} as const

const TOLERANCIA_EXACTA = 1 // céntimo
const TOLERANCIA_SOL = 100 // ±S/ 1
const MAX_AGRUPADO = 4

export function tipoLabel(c: Comprobante): string {
  return c.tipo === 'BOLETA' ? 'boleta' : c.tipo === 'NOTA_CREDITO' ? 'nota de crédito' : c.tipo === 'RETENCION' ? 'retención' : 'factura'
}

export function docLabel(c: Comprobante): string {
  return `${c.serie}-${c.numero}`
}

/** Vencimiento del comprobante: la última cuota o, si no hay cuotas, la fecha de emisión. */
export function vencimientoDe(c: Comprobante): string {
  return c.cuotas?.length ? c.cuotas[c.cuotas.length - 1].fecha : c.fechaEmision
}

export function openItems(comprobantes: Comprobante[]): OpenItem[] {
  const notas = new Map<string, Comprobante[]>()
  const retenciones = new Map<string, Comprobante>()
  for (const c of comprobantes) {
    if (c.tipo === 'NOTA_CREDITO' && c.referenciaId) notas.set(c.referenciaId, [...(notas.get(c.referenciaId) ?? []), c])
    if (c.tipo === 'RETENCION' && c.referenciaId) retenciones.set(c.referenciaId, c)
  }
  return comprobantes
    .filter((c) => c.tipo === 'FACTURA' || c.tipo === 'BOLETA')
    .map((c) => {
      const ncs = notas.get(c.id) ?? []
      return {
        comp: c,
        ids: [c.id, ...ncs.map((n) => n.id)],
        total: cents(c.total) - ncs.reduce((acc, n) => acc + cents(n.total), 0),
        start: addDays(c.fechaEmision, -3),
        end: addDays(vencimientoDe(c), 7),
        retencionId: retenciones.get(c.id)?.id,
        notas: ncs,
      }
    })
    .sort((a, b) => a.comp.fechaEmision.localeCompare(b.comp.fechaEmision) || a.comp.id.localeCompare(b.comp.id))
}

const sameDirection = (m: BankMovement, item: OpenItem) => (item.comp.direccion === 'VENTA' ? m.monto > 0 : m.monto < 0)
const inWindow = (m: BankMovement, item: OpenItem) => dayOf(m.fecha) >= item.start && dayOf(m.fecha) <= item.end
const absCents = (m: BankMovement) => Math.abs(cents(m.monto))

/** El movimiento y el comprobante son de la misma contraparte (RUC o nombre). */
export function sameParty(m: BankMovement, c: Comprobante): boolean {
  if (m.contraparteRuc && c.rucContraparte) return m.contraparteRuc === c.rucContraparte
  return nameSimilarity(m.contraparteNombre ?? m.glosa, c.nombreContraparte) >= 0.5
}

function diasTexto(n: number): string {
  if (n === 0) return 'el mismo día'
  if (n === 1) return '1 día después'
  if (n > 1) return `${n} días después`
  return n === -1 ? '1 día antes' : `${-n} días antes`
}

function matchId(movementIds: string[]): string {
  return `match-${movementIds.join('+')}`
}

/** 1 si los montos son iguales; 0 si difieren 5% o más. */
function closeness(a: number, b: number): number {
  if (b === 0) return 0
  return Math.max(0, 1 - Math.abs(a - b) / (0.05 * b))
}

export function reconcile(input: ReconcileInput): Match[] {
  const movements = [...input.movements].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const items = openItems(input.comprobantes)
  const usedMov = new Set<string>()
  const usedItem = new Set<string>()
  const matches: Match[] = []

  const freeMovs = () => movements.filter((m) => !usedMov.has(m.id))
  const freeItems = () => items.filter((i) => !usedItem.has(i.comp.id))
  const take = (match: Omit<Match, 'id'>, its: OpenItem[]) => {
    for (const id of match.movementIds) usedMov.add(id)
    for (const it of its) usedItem.add(it.comp.id)
    matches.push({ id: matchId(match.movementIds), ...match })
  }

  const pick = (item: OpenItem, cands: BankMovement[]) =>
    [...cands].sort((a, b) => {
      const pa = sameParty(a, item.comp) ? 0 : 1
      const pb = sameParty(b, item.comp) ? 0 : 1
      if (pa !== pb) return pa - pb
      const da = Math.abs(diffDays(item.comp.fechaEmision, a.fecha))
      const db = Math.abs(diffDays(item.comp.fechaEmision, b.fecha))
      return da - db || a.id.localeCompare(b.id)
    })[0]

  /* 1 · EXACTO */
  for (const item of freeItems()) {
    if (item.comp.moneda !== 'PEN') continue
    const cands = freeMovs().filter(
      (m) => m.canal !== 'POS_LIQUIDACION' && sameDirection(m, item) && inWindow(m, item) && Math.abs(absCents(m) - item.total) <= TOLERANCIA_EXACTA,
    )
    if (cands.length === 0) continue
    const m = pick(item, cands)
    const party = sameParty(m, item.comp)
    const dias = diffDays(item.comp.fechaEmision, m.fecha)
    const doc = `la ${tipoLabel(item.comp)} ${docLabel(item.comp)}`
    const motivo = item.notas.length
      ? `Coincide con ${doc} de ${item.comp.nombreContraparte} menos la nota de crédito ${item.notas.map(docLabel).join(', ')}: ${fmtSoles(item.total / 100)} netos, ${diasTexto(dias)}.`
      : `Coincide con ${doc} de ${item.comp.nombreContraparte}: mismo monto, ${diasTexto(dias)}.`
    take(
      {
        movementIds: [m.id],
        comprobanteIds: item.ids,
        regla: 'EXACTO',
        confianza: party ? CONFIANZA.exactoConNombre : CONFIANZA.exactoSinNombre,
        motivo,
      },
      [item],
    )
  }

  /* 2 · DETRACCION */
  for (const item of freeItems()) {
    const p = item.comp.detraccionPorcentaje
    if (!p || item.comp.total <= TAX_2026.detraccion.montoMinimo || item.comp.moneda !== 'PEN') continue
    const expected = Math.round(item.total * (1 - p))
    const cands = freeMovs().filter((m) => sameDirection(m, item) && inWindow(m, item) && Math.abs(absCents(m) - expected) <= TOLERANCIA_SOL)
    if (cands.length === 0) continue
    const m = pick(item, cands)
    const detraccion = round2(item.total / 100 - Math.abs(m.monto))
    take(
      {
        movementIds: [m.id],
        comprobanteIds: item.ids,
        regla: 'DETRACCION',
        confianza: CONFIANZA.detraccion,
        motivo: `Llegó ${fmtSoles(Math.abs(m.monto))}: la factura de ${fmtSoles(item.total / 100)} menos ${Math.round(p * 100)}% de detracción.`,
        detraccion,
      },
      [item],
    )
  }

  /* 3 · RETENCION */
  for (const item of freeItems()) {
    if (!item.comp.clienteEsAgenteRetencion && !item.retencionId) continue
    if (item.comp.moneda !== 'PEN') continue
    const expected = Math.round(item.total * (1 - TAX_2026.retencionIgv))
    const cands = freeMovs().filter((m) => sameDirection(m, item) && inWindow(m, item) && Math.abs(absCents(m) - expected) <= TOLERANCIA_SOL)
    if (cands.length === 0) continue
    const m = pick(item, cands)
    take(
      {
        movementIds: [m.id],
        comprobanteIds: item.retencionId ? [...item.ids, item.retencionId] : item.ids,
        regla: 'RETENCION',
        confianza: item.retencionId ? CONFIANZA.retencionConComprobante : CONFIANZA.retencionSinComprobante,
        motivo: `Llegó ${fmtSoles(Math.abs(m.monto))}: la factura de ${fmtSoles(item.total / 100)} menos 3% de retención de IGV.`,
        retencion: round2(item.total / 100 - Math.abs(m.monto)),
      },
      [item],
    )
  }

  /* 4 · AGRUPADO (POS): liquidación = ventas del lote − comisión */
  for (const m of freeMovs()) {
    if (m.canal !== 'POS_LIQUIDACION') continue
    const batch = input.posBatches.find(
      (b) => Math.abs(cents(b.neto) - absCents(m)) <= TOLERANCIA_EXACTA && Math.abs(diffDays(b.fechaAbono, m.fecha)) <= 3,
    )
    if (!batch) continue
    const sales = input.posSales.filter((s) => s.loteId === batch.loteId)
    const bruto = sales.reduce((acc, s) => acc + cents(s.monto), 0)
    if (Math.abs(bruto - cents(batch.comision) - absCents(m)) > TOLERANCIA_EXACTA) continue
    const linked: OpenItem[] = []
    for (const s of sales) {
      const boleta = freeItems().find(
        (i) => !linked.includes(i) && i.comp.direccion === 'VENTA' && i.total === cents(s.monto) && i.comp.fechaEmision === dayOf(s.fecha),
      )
      if (boleta) linked.push(boleta)
    }
    take(
      {
        movementIds: [m.id],
        comprobanteIds: linked.flatMap((i) => i.ids),
        posSaleIds: sales.map((s) => s.id),
        regla: 'AGRUPADO',
        confianza: CONFIANZA.pos,
        motivo: `Es la liquidación POS del ${fmtFecha(sales[0]?.fecha ?? batch.fechaAbono)}: ${sales.length} ventas menos ${fmtSoles(batch.comision)} de comisión.`,
      },
      linked,
    )
  }

  /* 5 · AGRUPADO (cliente): hasta 4 comprobantes abiertos de la misma contraparte */
  for (const m of freeMovs()) {
    if (m.canal === 'POS_LIQUIDACION' || m.canal === 'CAJERO') continue
    const cands = freeItems()
      .filter((i) => i.comp.moneda === 'PEN' && sameDirection(m, i) && sameParty(m, i.comp) && dayOf(m.fecha) >= i.start && dayOf(m.fecha) <= i.end)
      .slice(0, 10)
    if (cands.length < 2) continue
    const target = absCents(m)
    let found: OpenItem[] | null = null
    const search = (start: number, chosen: OpenItem[], sum: number) => {
      if (found) return
      if (chosen.length >= 2 && Math.abs(sum - target) <= TOLERANCIA_SOL) {
        found = [...chosen]
        return
      }
      if (chosen.length === MAX_AGRUPADO) return
      for (let i = start; i < cands.length; i++) search(i + 1, [...chosen, cands[i]], sum + cands[i].total)
    }
    search(0, [], 0)
    const group = found as OpenItem[] | null
    if (!group) continue
    const tipo = group.every((g) => g.comp.tipo === 'BOLETA') ? 'boletas' : 'facturas'
    take(
      {
        movementIds: [m.id],
        comprobanteIds: group.flatMap((g) => g.ids),
        regla: 'AGRUPADO',
        confianza: CONFIANZA.agrupadoCliente,
        motivo: `Paga ${group.length} ${tipo} de ${group[0].comp.nombreContraparte} en una sola transferencia: ${group.map((g) => docLabel(g.comp)).join(', ')}.`,
      },
      group,
    )
  }

  /* 6 · MONEDA: comprobante en dólares cobrado en soles */
  for (const item of freeItems()) {
    if (item.comp.moneda !== 'USD') continue
    let best: { m: BankMovement; tc: number; diff: number } | null = null
    for (const m of freeMovs()) {
      if (!sameDirection(m, item) || !inWindow(m, item)) continue
      const tc = input.tipoCambio(dayOf(m.fecha))
      const expected = (item.total / 100) * tc
      const diff = Math.abs(Math.abs(m.monto) - expected) / expected
      if (diff <= 0.015 && (!best || diff < best.diff)) best = { m, tc, diff }
    }
    if (!best) continue
    take(
      {
        movementIds: [best.m.id],
        comprobanteIds: item.ids,
        regla: 'MONEDA',
        confianza: CONFIANZA.moneda,
        motivo: `Llegó ${fmtSoles(Math.abs(best.m.monto))}: la factura ${docLabel(item.comp)} de US$ ${(item.total / 100).toFixed(2)} al tipo de cambio ${best.tc.toFixed(2)}.`,
        tipoCambio: best.tc,
      },
      [item],
    )
  }

  /* 7 · SUGERIDO: el mejor candidato con puntaje ≥ 0.5 */
  // Primero los depósitos de efectivo: se comparan con las boletas al contado de un mismo día
  for (const m of freeMovs().filter((x) => x.canal === 'DEPOSITO_EFECTIVO')) {
    let best: { day: string; group: OpenItem[]; score: number } | null = null
    for (let back = 0; back <= 3; back++) {
      const day = addDays(dayOf(m.fecha), -back)
      const group = freeItems().filter(
        (i) => i.comp.tipo === 'BOLETA' && i.comp.formaPago === 'CONTADO' && i.comp.moneda === 'PEN' && !i.comp.rucContraparte && i.comp.fechaEmision === day,
      )
      if (group.length === 0) continue
      const sum = group.reduce((acc, i) => acc + i.total, 0)
      const score = 0.5 * closeness(sum, absCents(m)) + 0.3 * Math.max(0, 1 - back / 7)
      if (!best || score > best.score) best = { day, group, score }
    }
    if (!best || best.score < CONFIANZA.sugeridoMinimo) continue
    take(
      {
        movementIds: [m.id],
        comprobanteIds: best.group.flatMap((g) => g.ids),
        regla: 'SUGERIDO',
        confianza: round2(best.score),
        motivo: `Depósito de la caja del ${fmtFecha(best.day)}: suma lo mismo que ${best.group.length} boletas al contado de ese día. Lo sugerimos como ventas en efectivo.`,
      },
      best.group,
    )
  }
  for (const m of freeMovs()) {
    if (m.canal === 'POS_LIQUIDACION' || m.canal === 'CAJERO' || m.canal === 'DEPOSITO_EFECTIVO') continue
    let best: { item: OpenItem; score: number } | null = null
    for (const item of freeItems()) {
      if (item.comp.moneda !== 'PEN' || !sameDirection(m, item)) continue
      const amount = closeness(absCents(m), item.total)
      if (amount === 0) continue
      const dias = Math.min(Math.abs(diffDays(item.comp.fechaEmision, m.fecha)), Math.abs(diffDays(vencimientoDe(item.comp), m.fecha)))
      const score = 0.5 * amount + 0.3 * Math.max(0, 1 - dias / 15) + 0.2 * nameSimilarity(m.contraparteNombre ?? m.glosa, item.comp.nombreContraparte)
      if (!best || score > best.score) best = { item, score }
    }
    if (!best || best.score < CONFIANZA.sugeridoMinimo) continue
    take(
      {
        movementIds: [m.id],
        comprobanteIds: best.item.ids,
        regla: 'SUGERIDO',
        confianza: round2(best.score),
        motivo: `Se parece a la ${tipoLabel(best.item.comp)} ${docLabel(best.item.comp)} de ${best.item.comp.nombreContraparte}: monto y fecha cercanos.`,
      },
      [best.item],
    )
  }

  return matches
}
