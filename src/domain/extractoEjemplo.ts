/**
 * Extracto de ejemplo con el formato de exportación de la Banca por Internet BCP, armado con los
 * datos del negocio para que la demo muestre la carga de punta a punta: un pago en partes, un cobro
 * atrasado, un pago a proveedor y una fila que ya estaba en Zenity.
 */
import { porCobrar } from './collections.ts'
import { comprobantesEn, saldoPendiente, type Analysis } from './engine.ts'
import type { BankMovement } from './types.ts'
import { addDays, round2 } from './util.ts'

export const CABECERA_BCP = ['Fecha', 'Fecha valuta', 'Descripción operación', 'Monto', 'Saldo', 'Sucursal - agencia', 'Operación - Número', 'Operación - Hora', 'Usuario', 'UTC', 'Referencia2']

const fechaBcp = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const glosaDe = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[.,]/g, '')

/** Filas del extracto de ejemplo (cabecera incluida), del más reciente al más antiguo como en el BCP. */
export function extractoEjemplo(a: Analysis, hoy: string): string[][] {
  const ayer = addDays(hoy, -1)
  const movs: Pick<BankMovement, 'fecha' | 'monto' | 'glosa' | 'numeroOperacion'>[] = []
  let op = 70_431_000
  const nuevo = (fecha: string, monto: number, glosa: string) => movs.push({ fecha, monto: round2(monto), glosa, numeroOperacion: String(++op) })

  // Cobros: la factura más atrasada paga la mitad; la siguiente vencida se paga completa
  const cobranzas = porCobrar(a, [], hoy).filter((c) => c.comprobante.tipo === 'FACTURA')
  const vencidas = cobranzas.filter((c) => c.diasVencidos > 0).sort((x, y) => y.diasVencidos - x.diasVencidos)
  if (vencidas[0]) nuevo(`${ayer}T18:12`, Math.round(vencidas[0].monto / 2), `TRANSF. ${glosaDe(vencidas[0].comprobante.nombreContraparte)}`)
  if (vencidas[1]) nuevo(`${hoy}T09:05`, vencidas[1].monto, `TRANSF. ${glosaDe(vencidas[1].comprobante.nombreContraparte)}`)

  // Pago de la factura de compra que vence primero
  const compra = comprobantesEn(a, 'FACTURA_SIN_PAGO').sort((x, y) => x.fechaEmision.localeCompare(y.fechaEmision))[0]
  if (compra) nuevo(`${hoy}T09:40`, -saldoPendiente(a, compra), `TRANSF. A ${glosaDe(compra.nombreContraparte)}`)

  // Sin facturas que mostrar (p. ej. una bodega en el NRUS): el depósito del efectivo de ayer
  if (movs.length === 0) nuevo(`${hoy}T08:50`, 350, 'DEPOSITO EFECTIVO VENTANILLA')

  // Una fila que ya estaba (el último movimiento del banco)
  const ultimo = [...a.movements].filter((m) => !m.simulado && !m.importado).sort((x, y) => y.fecha.localeCompare(x.fecha))[0]

  const orden = movs.sort((x, y) => x.fecha.localeCompare(y.fecha))
  let saldo = a.saldoActual
  const filas = orden.map((m) => {
    saldo = round2(saldo + m.monto)
    return [fechaBcp(m.fecha), fechaBcp(m.fecha), m.glosa, m.monto.toFixed(2), saldo.toFixed(2), '193 - Lima', m.numeroOperacion, `${m.fecha.slice(11, 16)}:00`, 'WEB', 'UTC-5', '']
  })
  if (ultimo) {
    filas.unshift([fechaBcp(ultimo.fecha), fechaBcp(ultimo.fecha), ultimo.glosa, ultimo.monto.toFixed(2), ultimo.saldoDespues.toFixed(2), '193 - Lima', ultimo.numeroOperacion, `${ultimo.fecha.slice(11, 16)}:00`, 'WEB', 'UTC-5', ''])
  }
  return [CABECERA_BCP, ...filas.reverse()].map((r) => r.map(String))
}
