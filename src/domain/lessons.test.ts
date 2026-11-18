/** Microlecciones: ≤ 120 palabras, sin {placeholders} y con los números reales del negocio. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { LESSON_IDS } from '../config/lessons.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { proyectarCaja } from './cashflow.ts'
import { porCobrar } from './collections.ts'
import { analyze } from './engine.ts'
import { contenido, evaluarLecciones, palabras } from './lessons.ts'

const a = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [] })
const estado = evaluarLecciones({ analysis: a, hoy: '2026-11-18', cobranzas: porCobrar(a, [], '2026-11-18'), caja: proyectarCaja(a, [], '2026-11-18', 60), limite: null, corrections: [] })

describe('microlecciones', () => {
  test('cada lección tiene ≤ 120 palabras y ningún placeholder', () => {
    for (const id of LESSON_IDS) {
      const c = contenido(id, estado.context)
      assert.ok(palabras(c) <= 120, `${id}: ${palabras(c)} palabras`)
      assert.doesNotMatch(`${c.titulo} ${c.cuerpo} ${c.comoTeAfecta}`, /[{}]|undefined|NaN/)
    }
  })

  test('con el seed se disparan las lecciones de lo que ya pasó', () => {
    for (const id of ['L01', 'L02', 'L03', 'L04', 'L07', 'L08'] as const) assert.ok(estado.activas.includes(id), id)
    assert.ok(!estado.activas.includes('L10'))
  })

  test('«¿Cómo te afecta?» usa el número real del negocio', () => {
    assert.match(contenido('L03', estado.context).comoTeAfecta, /S\/ 240/)
    assert.match(contenido('L08', estado.context).comoTeAfecta, /S\/ 3,052/)
  })
})
