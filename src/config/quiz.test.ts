/** Preguntas de práctica con los números del negocio (y la general cuando falta el dato). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { LessonContext } from './lessons.ts'
import { preguntaDe, QUIZ } from './quiz.ts'

const ctx: LessonContext = {
  negocio: 'Ferretería San Martín',
  yapesSinBoleta: { count: 3, monto: 'S/ 420' },
  pagosSinFactura: { count: 2, monto: 'S/ 1,180', igv: 'S/ 180' },
  detraccion: null,
  retencion: null,
  personalMes: { monto: 'S/ 850', count: 4 },
  sueldoDueno: null,
  vencida: { cliente: 'Multiservicios Rímac E.I.R.L.', monto: 'S/ 2,950', dias: 45, costo: 'S/ 110.63' },
  caja: { grati: 'S/ 4,800', porSemana: 'S/ 1,200', fecha: '15/12' },
  limite: null,
  revisados: 0,
  conciliado: '62%',
}

describe('práctica con tus números', () => {
  test('usa los números del negocio cuando los hay', () => {
    assert.match(preguntaDe('L07', ctx)!.pregunta, /Multiservicios Rímac.*S\/ 2,950.*45 días/)
    assert.match(preguntaDe('L10', ctx)!.pregunta, /62% conciliado/)
    assert.match(preguntaDe('L08', ctx)!.opciones[1], /S\/ 1,200/)
    assert.match(preguntaDe('L02', ctx)!.opciones[0], /S\/ 180/)
  })

  test('sin el dato, vuelve a la pregunta general', () => {
    assert.equal(preguntaDe('L06', ctx), QUIZ.L06)
    assert.equal(preguntaDe('L07', { ...ctx, vencida: null }), QUIZ.L07)
    assert.equal(preguntaDe('L05', null), QUIZ.L05)
  })

  test('cada pregunta tiene una respuesta correcta válida', () => {
    for (const id of Object.keys(QUIZ) as (keyof typeof QUIZ)[]) {
      const q = preguntaDe(id, ctx)!
      assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length, id)
      assert.ok(q.explicacion.length > 0, id)
    }
  })
})
