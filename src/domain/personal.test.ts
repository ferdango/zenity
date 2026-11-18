/** F-04 · Detector de gastos personales. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { analyze } from './engine.ts'

const data = seedFerreteria()
const a = analyze(data, { corrections: [], rules: [], extraMovements: [] })

describe('personal vs negocio', () => {
  test('detecta los 6 gastos personales de noviembre (supermercado, streaming, colegio, cine, delivery y un familiar)', () => {
    const glosas = data.movements.filter((m) => m.fecha.startsWith('2026-11') && a.classifications.get(m.id)?.estado === 'POSIBLE_PERSONAL').map((m) => m.glosa)
    for (const palabra of ['PLAZA VEA', 'NETFLIX', 'COLEGIO', 'CINEPLANET', 'RAPPI', 'KEVIN HUAMAN']) {
      assert.ok(glosas.some((g) => g.includes(palabra)), `falta ${palabra}`)
    }
  })

  test('ningún pago a proveedores ni la planilla se marcan como personales', () => {
    for (const m of data.movements) {
      const c = a.classifications.get(m.id)!
      if (/ACEROS|CEMENTOS|HABERES|SUNAT|ALQUILER/.test(m.glosa)) assert.notEqual(c.estado, 'POSIBLE_PERSONAL', m.glosa)
    }
  })

  test('«No, es del negocio» lo saca de personal', () => {
    const cine = data.movements.find((m) => m.glosa.includes('CINEPLANET') && m.fecha.startsWith('2026-11'))!
    const b = analyze(data, {
      corrections: [{ id: 'x', movementId: cine.id, businessId: data.business.id, rubro: 'Ferretería', sugerida: 'retiro_dueno', elegida: 'publicidad', confianzaSugerida: 0.7, origen: 'APP', creoRegla: false, esNegocio: true, ts: '2026-11-18T10:30' }],
      rules: [],
      extraMovements: [],
    })
    assert.notEqual(b.classifications.get(cine.id)?.estado, 'POSIBLE_PERSONAL')
  })
})
