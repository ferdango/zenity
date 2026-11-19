/** Estado de resultados por mes e histórico, con el seed. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedBodega } from '../data/seed/bodega.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { analyze } from './engine.ts'
import { csvResultados, estadoResultados, historicoResultados, mesesConDatos } from './resultados.ts'

const HOY = '2026-11-18'
const sinCambios = { corrections: [], rules: [], extraMovements: [], overrides: {} }
const ferreteria = analyze(seedFerreteria(), sinCambios)
const bodega = analyze(seedBodega(), sinCambios)
const cerca = (x: number, y: number) => Math.abs(x - y) < 0.02

describe('estado de resultados', () => {
  test('las ventas con comprobante van sin IGV (base imponible) y no se cuentan dos veces', () => {
    const e = estadoResultados(ferreteria, '2026-08', HOY)
    const base = ferreteria.data.comprobantes
      .filter((c) => c.direccion === 'VENTA' && c.fechaEmision.startsWith('2026-08') && (c.tipo === 'FACTURA' || c.tipo === 'BOLETA'))
      .reduce((s, c) => s + c.base, 0)
    assert.ok(cerca(e.ventas.conComprobante, base))
    // Los cobros del banco ya están conciliados con esos comprobantes: no suman otra vez
    assert.equal(e.ventas.sinComprobante, 0)
  })

  test('la cascada cuadra: ventas − costo − gastos + otros − comisiones − renta = utilidad neta', () => {
    for (const e of historicoResultados(ferreteria, HOY)) {
      assert.ok(cerca(e.utilidadBruta, e.ventas.total - e.costoVentas))
      assert.ok(cerca(e.utilidadOperativa, e.utilidadBruta - e.gastosOperativos.total))
      assert.ok(cerca(e.utilidadNeta, e.utilidadOperativa + e.otrosIngresos - e.gastosFinancieros - e.impuestoRenta))
    }
  })

  test('los retiros del dueño y las cuotas de préstamo no son gastos: quedan fuera del resultado', () => {
    const e = estadoResultados(ferreteria, '2026-08', HOY)
    assert.ok(e.fueraDelResultado.retiros > 0)
    assert.ok(e.fueraDelResultado.prestamos > 0)
    assert.ok(!e.gastosOperativos.lineas.some((l) => l.id === 'retiro_dueno' || l.id === 'prestamos' || l.id === 'impuestos'))
  })

  test('la planilla incluye EsSalud y el mes en curso se marca', () => {
    const e = estadoResultados(ferreteria, '2026-10', HOY)
    const sueldos = e.gastosOperativos.lineas.find((l) => l.id === 'planilla')!
    assert.equal(sueldos.label, 'Sueldos y EsSalud')
    assert.ok(sueldos.monto > 5600)
    assert.equal(e.enCurso, false)
    assert.equal(estadoResultados(ferreteria, '2026-11', HOY).enCurso, true)
  })

  test('en el Nuevo RUS no hay IGV: una venta sin boleta cuenta completa', () => {
    const e = estadoResultados(bodega, '2026-11', HOY)
    const sinBoleta = bodega.movements
      .filter((m) => m.fecha.startsWith('2026-11') && m.monto > 0 && !(bodega.matchByMovement.get(m.id)?.comprobanteIds.length) && bodega.classifications.get(m.id)?.categoriaId === 'ventas')
      .reduce((s, m) => s + m.monto, 0)
    assert.ok(cerca(e.ventas.sinComprobante, sinBoleta))
  })

  test('el histórico va del mes más antiguo al actual, uno por mes con datos', () => {
    assert.deepEqual(mesesConDatos(ferreteria, HOY), ['2026-08', '2026-09', '2026-10', '2026-11'])
    const h = historicoResultados(ferreteria, HOY)
    assert.equal(h.length, 4)
    assert.equal(h.at(-1)!.mes, '2026-11')
    assert.ok(h.every((e, i) => i === 0 || e.mes > h[i - 1].mes))
  })
})

describe('descarga para el contador', () => {
  test('una fila por mes, montos con punto decimal y el estado del mes', () => {
    const lineas = csvResultados(historicoResultados(ferreteria, HOY)).split('\n')
    assert.equal(lineas.length, 5)
    assert.match(lineas[0], /^Mes,Ventas sin IGV,/)
    assert.match(lineas[1], /^2026-08,\d+\.\d{2},/)
    assert.match(lineas[4], /,En curso$/)
    assert.match(lineas[3], /,Cerrado$/)
  })
})

