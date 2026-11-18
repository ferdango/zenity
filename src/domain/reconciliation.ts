/**
 * F-01 · Conciliación de tres vías: banco (BCP) + SUNAT (SIRE) + cobros digitales (POS / Yape).
 * Las reglas se aplican en orden y un movimiento o comprobante ya usado no se reutiliza.
 * Los motivos salen de plantillas determinísticas (F-02): nunca de un LLM.
 */
import { TAX_2026 } from '../config/taxParams2026.ts'
import type { BankMovement, CierreCaja, Comprobante, Match, PosBatch, PosSale } from './types.ts'
import { addDays, cents, dayOf, diffDays, fmtFecha, fmtSoles, nameSimilarity, round2 } from './util.ts'

export interface ReconcileInput {
  movements: BankMovement[]
  comprobantes: Comprobante[]
  posSales: PosSale[]
  posBatches: PosBatch[]
  tipoCambio: (fecha: string) => number
  /** Cierres de caja que registró el dueño (ventas en efectivo) */
  cierres?: CierreCaja[]
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
  /** Mismo monto y misma contraparte, pagado después de la ventana (cobro atrasado) */
  exactoTardio: 0.9,
  detraccion: 0.92,
  retencionConComprobante: 0.92,
  retencionSinComprobante: 0.75,
  pos: 0.9,
  agrupadoCliente: 0.85,
  /** Abonos que coinciden con las cuotas del comprobante */
  parcialCuotas: 0.92,
  /** Varios abonos de la misma contraparte que suman el total */
  parcialTotal: 0.85,
  /** Pago a cuenta: abonos de la misma contraparte que todavía no suman el total */
  parcialACuenta: 0.7,
  moneda: 0.8,
  /** Depósito igual al efectivo de un cierre de caja */
  cierre: 0.95,
  /** Depósito de una parte del cierre (el resto quedó en caja) */
  cierreParcial: 0.85,
  sugeridoMinimo: 0.5,
} as const

const TOLERANCIA_EXACTA = 1 // céntimo
const TOLERANCIA_SOL = 100 // ±S/ 1
const MAX_AGRUPADO = 4
/** Un cobro atrasado se busca hasta 90 días después del vencimiento */
const DIAS_TARDIO = 90
/** Los abonos parciales se buscan hasta 180 días después de la emisión */
const DIAS_PARCIAL = 180
/** Un depósito puede juntar el efectivo de hasta 3 cierres de los últimos 4 días */
const MAX_CIERRES = 3
const DIAS_CIERRE = 4

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

  /* 1b · EXACTO tardío: mismo monto y misma contraparte, pagado después de la ventana */
  for (const item of freeItems()) {
    if (item.comp.moneda !== 'PEN') continue
    const cands = freeMovs().filter(
      (m) =>
        m.canal !== 'POS_LIQUIDACION' &&
        sameDirection(m, item) &&
        dayOf(m.fecha) > item.end &&
        diffDays(item.end, m.fecha) <= DIAS_TARDIO &&
        Math.abs(absCents(m) - item.total) <= TOLERANCIA_EXACTA &&
        sameParty(m, item.comp),
    )
    if (cands.length === 0) continue
    const m = pick(item, cands)
    const atraso = diffDays(vencimientoDe(item.comp), m.fecha)
    take(
      {
        movementIds: [m.id],
        comprobanteIds: item.ids,
        regla: 'EXACTO',
        confianza: CONFIANZA.exactoTardio,
        motivo: `Coincide con la ${tipoLabel(item.comp)} ${docLabel(item.comp)} de ${item.comp.nombreContraparte}: mismo monto, ${item.comp.direccion === 'VENTA' ? 'cobrada' : 'pagada'} ${atraso} días después de su vencimiento.`,
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

  /* 5b · PARCIAL: un comprobante pagado en varios abonos (cuotas o pagos a cuenta) */
  for (const item of freeItems()) {
    if (item.comp.moneda !== 'PEN') continue
    const hasta = addDays(item.comp.fechaEmision, DIAS_PARCIAL)
    const cands = freeMovs()
      .filter(
        (m) =>
          m.canal !== 'POS_LIQUIDACION' &&
          m.canal !== 'CAJERO' &&
          m.canal !== 'DEPOSITO_EFECTIVO' &&
          sameDirection(m, item) &&
          sameParty(m, item.comp) &&
          dayOf(m.fecha) >= item.start &&
          dayOf(m.fecha) <= hasta &&
          absCents(m) < item.total - TOLERANCIA_SOL,
      )
      .slice(0, 8)
    if (cands.length === 0) continue

    const doc = `la ${tipoLabel(item.comp)} ${docLabel(item.comp)}`
    const abonos = (ms: BankMovement[]) => ms.map((m) => `${fmtSoles(Math.abs(m.monto))} el ${fmtFecha(m.fecha)}`).join(', ')
    const cuotas = item.comp.cuotas && item.comp.cuotas.length > 1 ? item.comp.cuotas : null
    const esCuota = (m: BankMovement) => !!cuotas?.some((q) => Math.abs(cents(q.monto) - absCents(m)) <= TOLERANCIA_SOL)

    // a) Abonos que ya suman el total
    let total: BankMovement[] | null = null
    const search = (start: number, chosen: BankMovement[], sum: number) => {
      if (total) return
      if (chosen.length >= 2 && Math.abs(sum - item.total) <= TOLERANCIA_SOL) {
        total = [...chosen]
        return
      }
      if (chosen.length === MAX_AGRUPADO || sum > item.total + TOLERANCIA_SOL) return
      for (let i = start; i < cands.length; i++) search(i + 1, [...chosen, cands[i]], sum + absCents(cands[i]))
    }
    search(0, [], 0)
    const completo = total as BankMovement[] | null
    if (completo) {
      take(
        {
          movementIds: completo.map((m) => m.id),
          comprobanteIds: item.ids,
          regla: 'PARCIAL',
          confianza: completo.every(esCuota) ? CONFIANZA.parcialCuotas : CONFIANZA.parcialTotal,
          motivo: `${item.comp.direccion === 'VENTA' ? 'Te pagó' : 'Pagaste'} ${doc} en ${completo.length} abonos que suman ${fmtSoles(item.total / 100)}: ${abonos(completo)}.`,
          pendiente: 0,
        },
        [item],
      )
      continue
    }

    // b) Abonos que todavía no suman el total: cuotas, o pagos a cuenta de una contraparte clara
    const fuerte = (m: BankMovement) =>
      m.contraparteRuc && item.comp.rucContraparte ? m.contraparteRuc === item.comp.rucContraparte : nameSimilarity(m.contraparteNombre ?? m.glosa, item.comp.nombreContraparte) >= 0.75
    const elegibles = cuotas ? cands.filter(esCuota) : cands.filter(fuerte)
    const parciales: BankMovement[] = []
    let suma = 0
    for (const m of elegibles) {
      if (suma + absCents(m) > item.total - TOLERANCIA_SOL) break
      parciales.push(m)
      suma += absCents(m)
    }
    if (parciales.length === 0) continue
    const pendiente = round2((item.total - suma) / 100)
    take(
      {
        movementIds: parciales.map((m) => m.id),
        comprobanteIds: item.ids,
        regla: 'PARCIAL',
        confianza: cuotas ? CONFIANZA.parcialCuotas : CONFIANZA.parcialACuenta,
        motivo: cuotas
          ? `${parciales.length === 1 ? 'Es 1' : `Son ${parciales.length}`} de las ${cuotas.length} cuotas de ${doc} de ${item.comp.nombreContraparte}: ${abonos(parciales)}. Faltan ${fmtSoles(pendiente)}.`
          : `Pago a cuenta de ${doc} de ${item.comp.nombreContraparte}: ${abonos(parciales)}. Faltan ${fmtSoles(pendiente)} de ${fmtSoles(item.total / 100)}.`,
        pendiente,
      },
      [item],
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

  /* 6b · CIERRE: el depósito del efectivo de uno o más cierres de caja que registró el dueño */
  const cierres = [...(input.cierres ?? [])].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.id.localeCompare(y.id))
  const usedCierre = new Set<string>()
  for (const m of freeMovs().filter((x) => x.canal === 'DEPOSITO_EFECTIVO' && x.monto > 0)) {
    const dia = dayOf(m.fecha)
    const previos = cierres.filter((c) => !usedCierre.has(c.id) && c.fecha <= dia && diffDays(c.fecha, dia) <= DIAS_CIERRE)
    const dep = absCents(m)
    // Del cierre más reciente hacia atrás: 1, 2 o 3 cierres seguidos. Primero el monto exacto;
    // si no, un depósito de al menos el 80% del efectivo (el resto quedó en caja).
    const buscar = (cumple: (suma: number) => boolean): CierreCaja[] | null => {
      for (let fin = previos.length - 1; fin >= 0; fin--) {
        let suma = 0
        for (let inicio = fin; inicio >= Math.max(0, fin - MAX_CIERRES + 1); inicio--) {
          suma += cents(previos[inicio].efectivo)
          if (cumple(suma)) return previos.slice(inicio, fin + 1)
        }
      }
      return null
    }
    const grupo = buscar((suma) => Math.abs(suma - dep) <= TOLERANCIA_SOL) ?? buscar((suma) => dep < suma && dep >= suma * 0.8)
    if (!grupo) continue
    for (const c of grupo) usedCierre.add(c.id)
    const dias = grupo.map((c) => c.fecha)
    const contado = grupo.reduce((acc, c) => acc + cents(c.efectivo), 0)
    const boletas = freeItems().filter(
      (i) => i.comp.tipo === 'BOLETA' && i.comp.formaPago === 'CONTADO' && i.comp.moneda === 'PEN' && !i.comp.rucContraparte && dias.includes(i.comp.fechaEmision),
    )
    const conBoleta = boletas.reduce((acc, i) => acc + i.total, 0)
    const sinBoleta = contado - conBoleta > TOLERANCIA_SOL ? round2((contado - conBoleta) / 100) : 0
    const enCaja = contado - dep > TOLERANCIA_SOL ? round2((contado - dep) / 100) : 0
    const fechas = dias.length === 1 ? `del ${fmtFecha(dias[0])}` : `del ${dias.slice(0, -1).map(fmtFecha).join(', ')} y ${fmtFecha(dias[dias.length - 1])}`
    const partes = [
      `Es el efectivo de tu cierre de caja ${fechas} (${fmtSoles(contado / 100)} contados).`,
      boletas.length === 0
        ? 'No emitiste boletas al contado esos días.'
        : sinBoleta
          ? `Emitiste ${boletas.length} boletas al contado por ${fmtSoles(conBoleta / 100)}: ${fmtSoles(sinBoleta)} se vendieron sin boleta.`
          : `Emitiste ${boletas.length} boletas al contado por ${fmtSoles(conBoleta / 100)}.`,
      enCaja ? `Depositaste ${fmtSoles(dep / 100)}: ${fmtSoles(enCaja)} quedaron en caja.` : '',
    ]
    take(
      {
        movementIds: [m.id],
        comprobanteIds: boletas.flatMap((b) => b.ids),
        regla: 'CIERRE',
        confianza: enCaja ? CONFIANZA.cierreParcial : CONFIANZA.cierre,
        motivo: partes.filter(Boolean).join(' '),
        cierreFechas: dias,
        sinBoleta: sinBoleta || undefined,
        enCaja: enCaja || undefined,
      },
      boletas,
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
