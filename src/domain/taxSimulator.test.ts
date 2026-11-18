/** F-07 · Los tres tests obligatorios del simulador de régimen. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedBodega } from '../data/seed/bodega.ts'
import { analyze } from './engine.ts'
import { avisoLimite, datosSimulador, masBarato, simularRegimenes } from './taxSimulator.ts'

const renta = (ingresos: number, gastos: number, necesitaFactura = true) =>
  Object.fromEntries(simularRegimenes({ ingresosAnuales: ingresos, comprasAnuales: gastos, gastosDeducibles: gastos, necesitaFactura }).map((r) => [r.regimen, r]))

describe('simulador de régimen', () => {
  test('400,000 de ingresos y 300,000 de gastos → RER 6,000; RMT 13,412.50; General 29,500; el más barato es el RER', () => {
    const r = renta(400_000, 300_000)
    assert.equal(r.NRUS.disponible, false)
    assert.equal(r.RER.renta, 6000)
    assert.equal(r.RMT.renta, 13412.5)
    assert.equal(r.GENERAL.renta, 29500)
    assert.equal(masBarato(Object.values(r)).regimen, 'RER')
  })

  test('400,000 y 380,000 → RER 6,000; RMT 2,000; General 5,900; el más barato es el RMT', () => {
    const r = renta(400_000, 380_000)
    assert.equal(r.RER.renta, 6000)
    assert.equal(r.RMT.renta, 2000)
    assert.equal(r.GENERAL.renta, 5900)
    assert.equal(masBarato(Object.values(r)).regimen, 'RMT')
  })

  test('90,000 al año (7,500 al mes) sin factura → NRUS disponible con cuota S/ 50 × 12 = S/ 600', () => {
    const r = renta(90_000, 60_000, false)
    assert.equal(r.NRUS.disponible, true)
    assert.equal(r.NRUS.renta, 600)
    assert.equal(masBarato(Object.values(r)).regimen, 'NRUS')
  })

  test('Bodega Doña Rosa muestra el aviso de cercanía al límite del NRUS', () => {
    const a = analyze(seedBodega(), { corrections: [], rules: [], extraMovements: [] })
    const datos = datosSimulador(a, '2026-11-18')
    const aviso = avisoLimite('NRUS', datos.ingresosAnuales)
    assert.ok(aviso && aviso.pct >= 0.8 && aviso.pct < 1)
  })
})
