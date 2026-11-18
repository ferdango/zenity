/** F-05 · Cobranza asistida: quién te debe, cuánto, desde cuándo y cómo recordárselo. */
import { comprobantesEn, totalNeto, type Analysis } from './engine.ts'
import { docLabel, tipoLabel, vencimientoDe } from './reconciliation.ts'
import type { Comprobante, DemoBusiness, PromesaPago } from './types.ts'
import { diffDays, fmtFecha, fmtSoles, monthOf, round2 } from './util.ts'

export type Tramo = 'POR_VENCER' | 'VENCIDA_1_30' | 'VENCIDA_31_60' | 'VENCIDA_60'

export const TRAMO_LABEL: Record<Tramo, string> = {
  POR_VENCER: 'Por vencer',
  VENCIDA_1_30: 'Vencida 1–30',
  VENCIDA_31_60: 'Vencida 31–60',
  VENCIDA_60: 'Vencida +60',
}

export interface Cobranza {
  comprobante: Comprobante
  /** Neto de notas de crédito */
  monto: number
  vencimiento: string
  /** Positivo = días de atraso; cero o negativo = por vencer */
  diasVencidos: number
  tramo: Tramo
  promesa?: PromesaPago
  telefono?: string
}

export function tramoDe(dias: number): Tramo {
  if (dias <= 0) return 'POR_VENCER'
  if (dias <= 30) return 'VENCIDA_1_30'
  if (dias <= 60) return 'VENCIDA_31_60'
  return 'VENCIDA_60'
}

/** Comprobantes de venta sin cobro, ordenados por días vencidos × monto. */
export function porCobrar(a: Analysis, promesas: PromesaPago[], hoy: string): Cobranza[] {
  return comprobantesEn(a, 'COMPROBANTE_SIN_COBRO')
    .map((c) => {
      const vencimiento = vencimientoDe(c)
      const dias = diffDays(vencimiento, hoy)
      return {
        comprobante: c,
        monto: totalNeto(a, c),
        vencimiento,
        diasVencidos: dias,
        tramo: tramoDe(dias),
        promesa: [...promesas].reverse().find((p) => p.comprobanteId === c.id),
        telefono: a.data.contactos[c.rucContraparte ?? ''] ?? a.data.contactos[c.nombreContraparte],
      }
    })
    .sort((x, y) => Math.max(0, y.diasVencidos) * y.monto - Math.max(0, x.diasVencidos) * x.monto || x.vencimiento.localeCompare(y.vencimiento))
}

export function totalCobranzas(list: Cobranza[]): number {
  return round2(list.reduce((acc, c) => acc + c.monto, 0))
}

export type Tono = 'AMABLE' | 'DIRECTO' | 'FIRME'

/** Por vencer o ≤ 15 días: amable · 16–30: directo · más de 30: firme. */
export function tonoDe(dias: number): Tono {
  if (dias <= 15) return 'AMABLE'
  if (dias <= 30) return 'DIRECTO'
  return 'FIRME'
}

function formatoTelefono(t: string): string {
  return t.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

/** Mensaje prellenado (editable) con monto, serie-número y formas de pago. */
export function mensajeCobro(c: Cobranza, b: DemoBusiness): string {
  const doc = `${tipoLabel(c.comprobante)} ${docLabel(c.comprobante)}`
  const monto = fmtSoles(c.monto)
  const vence = fmtFecha(c.vencimiento)
  const firma = `${b.dueno.nombres}, de ${b.nombreComercial}`
  const pagos = [
    'Puede pagar por:',
    b.telefonoWhatsApp ? `• Yape al ${formatoTelefono(b.telefonoWhatsApp)} (${b.nombreComercial})` : null,
    `• Cuenta BCP soles ${b.cuentaBcp}`,
    `• CCI ${b.cci}`,
  ]
    .filter(Boolean)
    .join('\n')
  const cliente = c.comprobante.nombreContraparte
  switch (tonoDe(c.diasVencidos)) {
    case 'AMABLE':
      return [
        `Hola, ${cliente}. Le saluda ${firma}.`,
        c.diasVencidos <= 0
          ? `Le recordamos con mucho gusto la ${doc} por ${monto}, que vence el ${vence}.`
          : `Le recordamos con mucho gusto la ${doc} por ${monto}, que venció el ${vence}.`,
        pagos,
        '¡Muchas gracias por su preferencia!',
      ].join('\n\n')
    case 'DIRECTO':
      return [
        `Hola, ${cliente}. Le escribe ${firma}.`,
        `La ${doc} por ${monto} venció el ${vence} (hace ${c.diasVencidos} días). ¿Nos ayuda con el pago esta semana?`,
        pagos,
        'Gracias.',
      ].join('\n\n')
    case 'FIRME':
      return [
        `Estimado cliente ${cliente}:`,
        `La ${doc} por ${monto} tiene ${c.diasVencidos} días de atraso (venció el ${vence}). Necesitamos regularizar este pago.`,
        '¿En qué fecha nos podrá pagar? Por favor, confírmenos por este medio.',
        pagos,
        `Atentamente, ${firma}.`,
      ].join('\n\n')
  }
}

/** Link de WhatsApp sin Business API: https://wa.me/51{celular}?text={mensaje codificado}. */
export function linkWhatsApp(celular: string, mensaje: string): string {
  return `https://wa.me/51${celular.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
}

/** Días promedio entre la emisión y el cobro de las facturas a crédito cobradas en un mes. */
export function diasPromedioCobro(a: Analysis, mes: string): number | null {
  const dias: number[] = []
  for (const match of a.matches) {
    const m = a.movementsById.get(match.movementIds[0])
    if (!m || m.monto <= 0 || monthOf(m.fecha) !== mes) continue
    for (const id of match.comprobanteIds) {
      const c = a.comprobantesById.get(id)
      if (c && c.formaPago === 'CREDITO' && (c.tipo === 'FACTURA' || c.tipo === 'BOLETA')) dias.push(diffDays(c.fechaEmision, m.fecha))
    }
  }
  if (dias.length === 0) return null
  return Math.round(dias.reduce((x, y) => x + y, 0) / dias.length)
}
