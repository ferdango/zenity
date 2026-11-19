/** «Decisión de la semana»: la decisión más urgente, con el efecto real de cada opción. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { porCobrar } from './collections.ts'
import { decisionDeLaSemana, lunesDe } from './decision.ts'
import { analyze } from './engine.ts'

const HOY = '2026-11-18'
const a = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [], overrides: {} })
const base = { a, promesas: [], hoy: HOY, cobranzas: porCobrar(a, [], HOY), gastoPersonalMes: 820 }

describe('decisión de la semana', () => {
  test('la semana empieza el lunes', () => {
    assert.equal(lunesDe('2026-11-18'), '2026-11-16') // miércoles
    assert.equal(lunesDe('2026-11-16'), '2026-11-16') // lunes
    assert.equal(lunesDe('2026-11-22'), '2026-11-16') // domingo
  })

  test('con un bache de caja, decide sobre la caja y cada opción muestra su efecto real', () => {
    const d = decisionDeLaSemana(base)!
    assert.equal(d.tipo, 'caja')
    assert.equal(d.id, 'caja@2026-11-16')
    assert.match(d.pregunta, /¿Qué haces\?$/)
    const cobrar = d.opciones.find((o) => o.id === 'cobrar')!
    assert.match(cobrar.efecto, /^Tu caja (no baja de|baja a) S\/ /)
    // Solo una opción es la mejor, y nunca el préstamo ni esperar
    assert.equal(d.opciones.filter((o) => o.mejor).length, 1)
    assert.ok(!d.opciones.find((o) => o.id === 'prestamo')!.mejor)
    assert.ok(!d.opciones.find((o) => o.id === 'esperar')!.mejor)
  })

  test('cobrar lo vencido sube la caja respecto de esperar', () => {
    const d = decisionDeLaSemana(base)!
    const monto = (texto: string) => Number(texto.replace(/[^\d.]/g, ''))
    const cobrar = d.opciones.find((o) => o.id === 'cobrar')!
    const esperar = d.opciones.find((o) => o.id === 'esperar')!
    assert.ok(monto(cobrar.efecto) > monto(esperar.efecto.split(' el ')[0]))
  })

  test('sin bache pero con facturas vencidas, decide qué cobrar primero', () => {
    const colchonExtra = [{ fecha: '2026-11-19', concepto: 'Ingreso de prueba', monto: 50_000, certeza: 'ALTA' as const, fuente: 'POR_COBRAR' as const }]
    const d = decisionDeLaSemana({ ...base, extras: colchonExtra })!
    assert.equal(d.tipo, 'cobrar')
    assert.equal(d.opciones[0].id, 'recordar')
    assert.ok(d.opciones[0].mejor)
    assert.match(d.opciones[0].titulo, /^Recordarle a /)
  })

  test('sin bache ni vencidas, ordena el sueldo de dueño; con sueldo, prepara el pago a SUNAT', () => {
    const colchonExtra = [{ fecha: '2026-11-19', concepto: 'Ingreso de prueba', monto: 50_000, certeza: 'ALTA' as const, fuente: 'POR_COBRAR' as const }]
    const sinVencidas = { ...base, extras: colchonExtra, cobranzas: base.cobranzas.filter((c) => c.diasVencidos <= 0) }
    assert.equal(decisionDeLaSemana(sinVencidas)!.tipo, 'sueldo')
    const conSueldo = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [], overrides: { sueldoDueno: 2500 } })
    const d = decisionDeLaSemana({ ...sinVencidas, a: conSueldo })!
    assert.equal(d.tipo, 'sunat')
    assert.ok(d.opciones[0].mejor)
  })
})
