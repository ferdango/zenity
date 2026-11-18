/** Los 14 casos obligatorios del seed terminan en el estado esperado (F-01, F-02). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { porCobrar } from './collections.ts'
import { analyze, ESTADOS, resumenMes, type UserInputs } from './engine.ts'
import type { Estado } from './types.ts'

const SIN_CAMBIOS: UserInputs = { corrections: [], rules: [], extraMovements: [] }
const data = seedFerreteria()
const a = analyze(data, SIN_CAMBIOS)

const mov = (monto: number, glosa?: string) => {
  const found = data.movements.filter((m) => m.monto === monto && (!glosa || m.glosa.includes(glosa)))
  assert.equal(found.length, 1, `un solo movimiento de ${monto} ${glosa ?? ''}`)
  return found[0]
}
const estado = (id: string) => a.classifications.get(id)?.estado
const match = (id: string) => a.matchByMovement.get(id)

describe('seed de la Ferretería San Martín', () => {
  test('tiene el volumen pedido (≈150 movimientos, ≈120 ventas, ≈40 compras)', () => {
    assert.ok(data.movements.length >= 140 && data.movements.length <= 190)
    const ventas = data.comprobantes.filter((c) => c.direccion === 'VENTA' && (c.tipo === 'FACTURA' || c.tipo === 'BOLETA'))
    const compras = data.comprobantes.filter((c) => c.direccion === 'COMPRA')
    assert.ok(ventas.length >= 100 && ventas.length <= 140, `ventas: ${ventas.length}`)
    assert.ok(compras.length >= 30 && compras.length <= 45, `compras: ${compras.length}`)
  })

  test('es determinístico: misma semilla, mismos datos', () => {
    assert.deepEqual(seedFerreteria(), data)
  })
})

describe('los 14 casos obligatorios', () => {
  test('1 · factura pagada exacta dentro de ±3 días → CONCILIADO por EXACTO', () => {
    const m = mov(3186)
    assert.equal(match(m.id)?.regla, 'EXACTO')
    assert.equal(match(m.id)?.confianza, 0.98)
    assert.equal(estado(m.id), 'CONCILIADO')
  })

  test('2 · servicio con detracción 12% → CONCILIADO por DETRACCION con aviso de S/ 240', () => {
    const m = mov(1760)
    assert.equal(match(m.id)?.regla, 'DETRACCION')
    assert.equal(match(m.id)?.detraccion, 240)
    assert.match(match(m.id)!.motivo, /menos 12% de detracción/)
    assert.equal(estado(m.id), 'CONCILIADO')
  })

  test('3 · agente de retención → CONCILIADO por RETENCION (con comprobante de retención)', () => {
    const m = mov(4850)
    assert.equal(match(m.id)?.regla, 'RETENCION')
    assert.equal(match(m.id)?.confianza, 0.92)
    assert.ok(match(m.id)!.comprobanteIds.some((id) => a.comprobantesById.get(id)?.tipo === 'RETENCION'))
  })

  test('4 · 23 boletas de un sábado → una liquidación POS el lunes (AGRUPADO)', () => {
    const m = data.movements.find((x) => x.canal === 'POS_LIQUIDACION')!
    const mt = match(m.id)!
    assert.equal(mt.regla, 'AGRUPADO')
    assert.equal(mt.comprobanteIds.length, 23)
    assert.equal(mt.posSaleIds?.length, 23)
    assert.equal(m.fecha.slice(0, 10), '2026-11-09')
  })

  test('5 · un cliente paga 3 facturas con una transferencia (AGRUPADO)', () => {
    const mt = match(mov(4524.9).id)!
    assert.equal(mt.regla, 'AGRUPADO')
    assert.equal(mt.comprobanteIds.length, 3)
  })

  test('6 · factura en dólares cobrada en soles (MONEDA)', () => {
    const mt = match(mov(4722.5).id)!
    assert.equal(mt.regla, 'MONEDA')
    assert.equal(a.comprobantesById.get(mt.comprobanteIds[0])?.moneda, 'USD')
  })

  test('7 · 3 Yapes sin boleta → COBRADO_SIN_COMPROBANTE', () => {
    for (const monto of [38, 115, 72.5]) assert.equal(estado(mov(monto, 'YAPE').id), 'COBRADO_SIN_COMPROBANTE')
  })

  test('8 · 4 facturas a crédito sin cobrar → «Te deben S/ 9,300» (45 días, 10 días y dos por vencer)', () => {
    const lista = porCobrar(a, [], '2026-11-18')
    assert.equal(lista.length, 4)
    assert.equal(lista.reduce((s, c) => s + c.monto, 0), 9300)
    assert.deepEqual(
      lista.map((c) => c.diasVencidos).sort((x, y) => y - x).slice(0, 2),
      [45, 10],
    )
    assert.equal(lista.filter((c) => c.tramo === 'POR_VENCER').length, 2)
    for (const c of lista) assert.equal(a.comprobanteEstado.get(c.comprobante.id), 'COMPROBANTE_SIN_COBRO')
  })

  test('9 · 2 pagos a proveedores sin factura → PAGADO_SIN_FACTURA', () => {
    assert.equal(estado(mov(-1275).id), 'PAGADO_SIN_FACTURA')
    assert.equal(estado(mov(-845).id), 'PAGADO_SIN_FACTURA')
  })

  test('10 · 2 facturas de compra sin pagar → FACTURA_SIN_PAGO', () => {
    const abiertas = data.comprobantes.filter((c) => a.comprobanteEstado.get(c.id) === 'FACTURA_SIN_PAGO')
    assert.deepEqual(abiertas.map((c) => c.total).sort(), [1416, 2360])
  })

  test('11 · 6 gastos personales de noviembre → POSIBLE_PERSONAL por S/ 820', () => {
    const nov = data.movements.filter((m) => m.fecha.startsWith('2026-11') && estado(m.id) === 'POSIBLE_PERSONAL')
    assert.equal(nov.length, 6)
    assert.equal(Math.round(nov.reduce((s, m) => s - m.monto, 0) * 100) / 100, 820)
  })

  test('12 · 6 movimientos ambiguos → SIN_CATEGORIA_SEGURA y son los 6 de «Por revisar»', () => {
    const ambiguos = [...a.classifications.values()].filter((c) => c.estado === 'SIN_CATEGORIA_SEGURA')
    assert.equal(ambiguos.length, 6)
    assert.equal(a.porRevisar.length, 6)
    for (const c of ambiguos) assert.ok(c.confianza < 0.6)
  })

  test('13 · nota de crédito: la factura original se concilia por el neto', () => {
    const mt = match(mov(2655).id)!
    assert.equal(mt.regla, 'EXACTO')
    assert.ok(mt.comprobanteIds.some((id) => a.comprobantesById.get(id)?.tipo === 'NOTA_CREDITO'))
    assert.match(mt.motivo, /nota de crédito/)
  })

  test('14 · depósito de efectivo de la caja del día → sugerido como ventas en efectivo', () => {
    const m = data.movements.find((x) => x.canal === 'DEPOSITO_EFECTIVO')!
    assert.equal(match(m.id)?.regla, 'SUGERIDO')
    assert.equal(a.classifications.get(m.id)?.categoriaId, 'ventas')
    assert.match(match(m.id)!.motivo, /ventas en efectivo/)
  })
})

describe('estados, confianza y motivos (F-01 / F-02)', () => {
  test('cada uno de los 7 estados tiene al menos un caso', () => {
    const vistos = new Set<Estado>([...a.classifications.values()].map((c) => c.estado))
    for (const e of a.comprobanteEstado.values()) vistos.add(e)
    for (const e of ESTADOS) assert.ok(vistos.has(e), `falta ${e}`)
  })

  test('todo movimiento tiene confianza y motivo, sin {placeholders}', () => {
    for (const c of a.classifications.values()) {
      assert.ok(c.confianza > 0 && c.confianza <= 1)
      assert.ok(c.motivo.length > 10)
      assert.doesNotMatch(c.motivo, /[{}]|undefined|NaN/)
    }
  })

  test('el % conciliado del mes está entre 0 y 1 y cuenta los comprobantes sin movimiento', () => {
    const r = resumenMes(a, '2026-11')
    assert.ok(r.conciliado > 0 && r.conciliado < 1)
    assert.equal(r.porEstado.COMPROBANTE_SIN_COBRO.count, 1)
  })
})
