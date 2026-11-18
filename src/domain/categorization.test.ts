/** F-03 · Una corrección o una regla reclasifica al instante (incluye los movimientos parecidos y futuros). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { alternativas, nivel } from './categorization.ts'
import { analyze, resumenMes } from './engine.ts'
import type { BankMovement, Correction, Rule } from './types.ts'

const data = seedFerreteria()
const base = analyze(data, { corrections: [], rules: [], extraMovements: [] })
const cardenas = data.movements.filter((m) => m.glosa === 'TRANSF. A J. CARDENAS')

const correccion = (m: BankMovement, elegida: Correction['elegida']): Correction => ({
  id: `c-${m.id}`,
  movementId: m.id,
  businessId: data.business.id,
  rubro: data.business.rubro,
  sugerida: base.classifications.get(m.id)!.categoriaId,
  elegida,
  confianzaSugerida: base.classifications.get(m.id)!.confianza,
  origen: 'APP',
  creoRegla: false,
  ts: '2026-11-18T10:30',
})

describe('categorización', () => {
  test('niveles de confianza: Alta ≥ 0.90, Media 0.60–0.89, Baja < 0.60', () => {
    assert.equal(nivel(0.9), 'Alta')
    assert.equal(nivel(0.85), 'Media')
    assert.equal(nivel(0.6), 'Media')
    assert.equal(nivel(0.59), 'Baja')
  })

  test('una corrección saca el movimiento de «Por revisar» y recalcula el estado', () => {
    const a = analyze(data, { corrections: [correccion(cardenas[0], 'transporte')], rules: [], extraMovements: [] })
    assert.equal(a.porRevisar.length, 5)
    assert.equal(a.classifications.get(cardenas[0].id)?.fuente, 'MANUAL')
    assert.equal(a.classifications.get(cardenas[0].id)?.estado, 'PAGADO_SIN_FACTURA')
  })

  test('una regla del negocio reclasifica los parecidos y los futuros', () => {
    const regla: Rule = {
      id: 'r1',
      businessId: data.business.id,
      scope: 'NEGOCIO',
      condicion: { contraparteNombre: 'J. Cárdenas' },
      categoriaId: 'transporte',
      creadaPor: 'DUENO',
      creadaEn: '2026-11-18T10:30',
    }
    const futuro: BankMovement = { ...cardenas[0], id: 'futuro', fecha: '2026-11-18T10:00', monto: -410 }
    const a = analyze(data, { corrections: [], rules: [regla], extraMovements: [futuro] })
    for (const m of [...cardenas, futuro]) {
      const c = a.classifications.get(m.id)!
      assert.equal(c.categoriaId, 'transporte')
      assert.equal(c.fuente, 'REGLA_NEGOCIO')
      assert.match(c.motivo, /^Tu regla: pagos a J\. Cárdenas → Transporte/)
    }
    assert.equal(a.porRevisar.length, 4)
  })

  test('el historial (≥ 2 correcciones a la misma contraparte) sugiere con confianza alta', () => {
    const a = analyze(data, { corrections: cardenas.map((m) => correccion(m, 'transporte')), rules: [], extraMovements: [] })
    const nuevo: BankMovement = { ...cardenas[0], id: 'nuevo', fecha: '2026-11-18T09:00', monto: -333 }
    const b = analyze(data, { corrections: cardenas.map((m) => correccion(m, 'transporte')), rules: [], extraMovements: [nuevo] })
    assert.equal(b.classifications.get('nuevo')?.fuente, 'HISTORIAL')
    assert.ok(b.classifications.get('nuevo')!.confianza >= 0.9)
    assert.ok(resumenMes(a, '2026-11').conciliado <= 1)
  })

  test('las alternativas son 3 y no repiten la sugerida', () => {
    const alt = alternativas(cardenas[0], 'otros')
    assert.equal(alt.length, 3)
    assert.ok(!alt.includes('otros'))
  })
})
