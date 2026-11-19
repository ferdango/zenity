/** F-06 · Proyección de caja: gratificación y CTS por régimen laboral, promesas y la caída de diciembre. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { ctsSemestral, gratificacion, proximoVencimiento, vencimientoSunat } from './calendar.ts'
import { proyectarCaja, semanasDeCaja, tramoBajoColchon } from './cashflow.ts'
import { analyze } from './engine.ts'
import type { RegimenLaboral } from './types.ts'

const data = seedFerreteria()
const HOY = '2026-11-18'
const conRegimen = (regimenLaboral: RegimenLaboral) => analyze(data, { corrections: [], rules: [], extraMovements: [], overrides: { regimenLaboral } })

describe('calendario peruano', () => {
  test('gratificación: general 1 sueldo + 9%, pequeña empresa medio sueldo + 9%, microempresa 0', () => {
    assert.equal(gratificacion('GENERAL', 4, 1400), 6104)
    assert.equal(gratificacion('PEQUENA_REMYPE', 4, 1400), 3052)
    assert.equal(gratificacion('MICRO_REMYPE', 4, 1400), 0)
  })

  test('CTS por semestre: general medio sueldo, pequeña empresa un cuarto, microempresa 0', () => {
    assert.equal(ctsSemestral('GENERAL', 4, 1400), 2800)
    assert.equal(ctsSemestral('PEQUENA_REMYPE', 4, 1400), 1400)
    assert.equal(ctsSemestral('MICRO_REMYPE', 4, 1400), 0)
  })

  test('vencimiento SUNAT según el último dígito del RUC (cronograma mock)', () => {
    assert.equal(vencimientoSunat('2026-11', '20605125990'), '2026-12-16')
    assert.deepEqual(proximoVencimiento('20605125990', HOY), { periodo: '2026-11', fecha: '2026-12-16', dias: 28 })
  })
})

describe('proyección de caja', () => {
  for (const [regimen, grati] of [['PEQUENA_REMYPE', 3052], ['GENERAL', 6104], ['MICRO_REMYPE', 0]] as const) {
    test(`${regimen}: la gratificación de diciembre es ${grati}`, () => {
      const r = proyectarCaja(conRegimen(regimen), [], HOY, 60)
      const ev = r.eventos.find((e) => e.fuente === 'GRATIFICACION')
      if (grati === 0) assert.equal(ev, undefined)
      else {
        assert.equal(ev?.fecha, '2026-12-15')
        assert.equal(ev?.monto, -grati)
        assert.equal(ev?.certeza, 'ALTA')
      }
    })
  }

  test('la CTS de noviembre entra si la proyección empieza antes del 15', () => {
    const r = proyectarCaja(conRegimen('GENERAL'), [], '2026-11-01', 30)
    assert.equal(r.eventos.find((e) => e.fuente === 'CTS')?.monto, -2800)
  })

  test('con el seed, diciembre muestra la caída por la gratificación y los impuestos (alerta)', () => {
    const r = proyectarCaja(conRegimen('PEQUENA_REMYPE'), [], HOY, 60)
    assert.ok(r.eventos.some((e) => e.fuente === 'IMPUESTOS' && e.fecha.startsWith('2026-12')))
    assert.ok(r.alerta, 'debe haber alerta')
    assert.ok(r.alerta!.fecha.startsWith('2026-12'))
    assert.deepEqual(r.alerta!.motivos, ['la gratificación', 'el IGV'])
  })

  test('una promesa de pago aparece como evento MEDIA y reduce la caída de diciembre', () => {
    const a = conRegimen('PEQUENA_REMYPE')
    const sin = proyectarCaja(a, [], HOY, 60)
    const factura = data.comprobantes.find((c) => c.total === 2950)!
    const con = proyectarCaja(a, [{ comprobanteId: factura.id, fecha: '2026-12-04', monto: 2950, registradaEn: HOY }], HOY, 60)
    const ev = con.eventos.find((e) => e.fuente === 'PROMESA')
    assert.equal(ev?.certeza, 'MEDIA')
    assert.equal(ev?.monto, 2950)
    const dia = (r: typeof sin) => r.serie.find((p) => p.fecha === '2026-12-20')!.base
    assert.equal(Math.round(dia(con) - dia(sin)), 2950)
  })

  test('cada evento tiene fuente y certeza', () => {
    for (const e of proyectarCaja(conRegimen('PEQUENA_REMYPE'), [], HOY, 90).eventos) {
      assert.ok(e.fuente && e.certeza && e.concepto)
    }
  })
})

describe('gráfico de caja en una frase', () => {
  const p = (fecha: string, base: number) => ({ fecha, base, pesimista: base })

  test('el tramo bajo el colchón va del primer al último día debajo', () => {
    const serie = [p('2026-11-18', 9000), p('2026-11-19', 7000), p('2026-11-20', 8500), p('2026-11-21', 6000), p('2026-11-22', 9000)]
    assert.deepEqual(tramoBajoColchon(serie, 7659), { desde: '2026-11-19', hasta: '2026-11-21' })
  })

  test('si nunca baja del colchón, no hay tramo', () => {
    assert.equal(tramoBajoColchon([p('2026-11-18', 9000), p('2026-11-19', 8000)], 7659), null)
  })
})

describe('caja por semanas (gráfico de barras)', () => {
  test('agrupa de 7 en 7 desde hoy y guarda el día más bajo de cada semana', () => {
    const serie = Array.from({ length: 10 }, (_, i) => ({ fecha: `2026-11-${String(18 + i).padStart(2, '0')}`, base: 9000 - (i === 3 ? 3000 : 0) - (i === 8 ? 500 : 0), pesimista: 0 }))
    const s = semanasDeCaja(serie)
    assert.equal(s.length, 2)
    assert.deepEqual([s[0].desde, s[0].hasta], ['2026-11-18', '2026-11-24'])
    assert.equal(s[0].minimo.fecha, '2026-11-21')
    assert.equal(s[0].minimo.base, 6000)
    assert.deepEqual([s[1].desde, s[1].hasta], ['2026-11-25', '2026-11-27'])
    assert.equal(s[1].minimo.base, 8500)
  })

  test('con el seed, 60 días son 9 semanas', () => {
    assert.equal(semanasDeCaja(proyectarCaja(conRegimen('PEQUENA_REMYPE'), [], HOY, 60).serie).length, 9)
  })
})

