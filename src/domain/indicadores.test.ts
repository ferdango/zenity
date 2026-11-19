/** «Tu negocio en esta unidad»: el número real que mueve cada unidad del camino. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { cambiosDelNegocio, type EntradaIndicadores, indicadores } from './indicadores.ts'

const base: EntradaIndicadores = {
  conciliado: 0.62,
  gastoPersonalMes: 850,
  sueldoDueno: null,
  porCobrar: 9300,
  vencido: 4130,
  caja: { minimo: 4733.81, colchon: 7659 },
  sunat: { total: 2783.37, vence: '2026-12-16', dias: 28 },
}

describe('indicadores del camino', () => {
  test('ordena: conciliado del mes contra la meta de 90%', () => {
    const i = indicadores(base).ordena
    assert.equal(i.texto, '62% conciliado')
    assert.equal(i.meta, 'meta 90%')
    assert.ok(Math.abs(i.progreso! - 0.62 / 0.9) < 1e-9)
    assert.equal(i.logrado, false)
    assert.equal(indicadores({ ...base, conciliado: 0.95 }).ordena.logrado, true)
    assert.equal(indicadores({ ...base, conciliado: 0.95 }).ordena.progreso, 1)
  })

  test('separa: sin sueldo de dueño es solo un dato; con sueldo mide si el gasto entra', () => {
    assert.equal(indicadores(base).separa.progreso, null)
    assert.equal(indicadores(base).separa.meta, 'sin sueldo de dueño')
    const dentro = indicadores({ ...base, sueldoDueno: 1500 }).separa
    assert.equal(dentro.logrado, true)
    assert.equal(dentro.progreso, 1)
    const fuera = indicadores({ ...base, sueldoDueno: 425 }).separa
    assert.equal(fuera.logrado, false)
    assert.equal(fuera.progreso, 0.5)
  })

  test('cobra: lo vencido baja el avance; sin vencidos, logrado', () => {
    const i = indicadores(base).cobra
    assert.equal(i.texto, 'S/ 4,130 vencido')
    assert.ok(Math.abs(i.progreso! - (1 - 4130 / 9300)) < 1e-9)
    const sinVencidos = indicadores({ ...base, vencido: 0 }).cobra
    assert.equal(sinVencidos.texto, 'nada vencido')
    assert.equal(sinVencidos.logrado, true)
  })

  test('anticipa: el punto más bajo de la caja contra el colchón', () => {
    const i = indicadores(base).anticipa
    assert.equal(i.texto, 'tu caja baja a S/ 4,733.81')
    assert.equal(i.logrado, false)
    const ok = indicadores({ ...base, caja: { minimo: 8000, colchon: 7659 } }).anticipa
    assert.equal(ok.texto, 'tu caja no baja de S/ 8,000')
    assert.equal(ok.logrado, true)
    assert.equal(indicadores({ ...base, caja: { minimo: -500, colchon: 7659 } }).anticipa.progreso, 0)
  })

  test('sunat: cuánto y cuándo, sin barra de avance', () => {
    const i = indicadores(base).sunat
    assert.equal(i.texto, 'S/ 2,783.37 a pagar')
    assert.equal(i.meta, 'vence el 16/12 (28 días)')
    assert.equal(i.progreso, null)
  })
})

describe('tu semana: qué cambió en los números', () => {
  test('solo lista lo que se movió, con su dirección', () => {
    const ahora: EntradaIndicadores = { ...base, conciliado: 0.7, vencido: 1180, caja: { minimo: 7684, colchon: 7659 }, sueldoDueno: 2500 }
    const c = cambiosDelNegocio(base, ahora)
    assert.deepEqual(
      c.map((x) => [x.etiqueta, x.antes, x.ahora, x.mejoro]),
      [
        ['Conciliado del mes', '62%', '70%', true],
        ['Vencido por cobrar', 'S/ 4,130', 'S/ 1,180', true],
        ['Punto más bajo de tu caja', 'S/ 4,734', 'S/ 7,684', true],
        ['Sueldo de dueño', 'sin definir', 'S/ 2,500', true],
      ],
    )
  })

  test('sin cambios, la lista queda vacía; si algo empeora, se marca', () => {
    assert.deepEqual(cambiosDelNegocio(base, base), [])
    const peor = cambiosDelNegocio(base, { ...base, vencido: 5000 })
    assert.equal(peor[0].mejoro, false)
  })
})

