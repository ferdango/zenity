/** F-08 · Semáforo de la cartera y CSV de asientos (debe = haber). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { CARTERA_RESUMIDA } from '../data/seed/cartera.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { asientos, cuentaDe, filaDesdeAnalisis, semaforo, toCsv, totales } from './accountant.ts'
import { analyze } from './engine.ts'

const a = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [] })

describe('portal del contador', () => {
  test('semáforo: verde, ámbar y rojo según las reglas del brief', () => {
    const sin = { cobradoSinComprobante: 0, pagadoSinFactura: 0, diferencias: 0 }
    assert.equal(semaforo(0.95, sin, 1), 'VERDE')
    assert.equal(semaforo(0.65, sin, 2), 'ROJO')
    assert.equal(semaforo(0.65, sin, 10), 'AMBAR')
    assert.equal(semaforo(0.95, { ...sin, cobradoSinComprobante: 1 }, 20), 'ROJO')
    assert.equal(semaforo(0.95, { ...sin, pagadoSinFactura: 1 }, 20), 'AMBAR')
  })

  test('la cartera tiene 10 clientes: 2 completos + 8 resumidos', () => {
    assert.equal(CARTERA_RESUMIDA.length + 2, 10)
  })

  test('la Ferretería sale en rojo (cobró sin comprobante) y vence el 16/12', () => {
    const fila = filaDesdeAnalisis(a, '2026-11-18')
    assert.equal(fila.semaforo, 'ROJO')
    assert.equal(fila.vencimiento.fecha, '2026-12-16')
  })

  test('el CSV tiene las columnas pedidas y cuadra debe = haber', () => {
    const lineas = asientos(a, '2026-11', (id) => cuentaDe(a, id, {}))
    const csv = toCsv(lineas)
    assert.equal(csv.split('\n')[0], 'fecha,glosa,cuenta_pcge,debe,haber,comprobante,ruc_contraparte')
    const t = totales(lineas)
    assert.equal(t.debe, t.haber)
    assert.ok(lineas.length > 0 && lineas.length % 2 === 0)
  })
})
