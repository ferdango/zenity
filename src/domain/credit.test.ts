/** F3 · Perfil crediticio: puntaje explicable, capacidad de pago y efecto del crédito en la caja. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { CREDITO } from '../config/credit.ts'
import { seedBodega } from '../data/seed/bodega.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { proyectarCaja } from './cashflow.ts'
import { cuotaMensual, eventosCredito, interesesTotales, montoMaximo, montoOfrecido, perfilCrediticio } from './credit.ts'
import { analyze } from './engine.ts'

const HOY = '2026-11-18'
const ferreteria = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [] })
const bodega = analyze(seedBodega(), { corrections: [], rules: [], extraMovements: [] })
const pf = perfilCrediticio(ferreteria, HOY)

describe('cuotas (sistema francés)', () => {
  test('S/ 10,000 a 12 meses con TEA 30% → cuota de S/ 957.80', () => {
    assert.ok(Math.abs(cuotaMensual(10_000, 0.3, 12) - 957.8) < 0.5)
  })

  test('el monto máximo es la inversa de la cuota', () => {
    const monto = montoMaximo(957.8, 0.3, 12)
    assert.ok(Math.abs(monto - 10_000) < 5)
    assert.ok(interesesTotales(10_000, 0.3, 12) > 1_400 && interesesTotales(10_000, 0.3, 12) < 1_550)
  })
})

describe('perfil crediticio', () => {
  test('el puntaje es el promedio ponderado de 6 componentes explicados', () => {
    assert.equal(pf.componentes.length, 6)
    const pesos = pf.componentes.reduce((s, c) => s + c.peso, 0)
    assert.ok(Math.abs(pesos - 1) < 1e-9)
    const score = Math.round(pf.componentes.reduce((s, c) => s + c.puntaje * c.peso, 0))
    assert.equal(pf.score, score)
    for (const c of pf.componentes) {
      assert.ok(c.puntaje >= 0 && c.puntaje <= 100, c.nombre)
      assert.doesNotMatch(c.detalle, /[{}]|undefined|NaN/)
    }
  })

  test('Ferretería San Martín: riesgo moderado, ventas en baja, impuestos al día y crédito sugerido a 12 meses', () => {
    assert.equal(pf.segmento, 'B')
    assert.ok(pf.tendencia < -0.1)
    assert.deepEqual(pf.impuestosATiempo, { pagados: 3, total: 3 })
    assert.ok(pf.excedente > 0)
    assert.ok(pf.montoSugerido >= CREDITO.montoMinimo && pf.montoSugerido % CREDITO.redondeo === 0)
    // La cuota del monto sugerido no pasa de la mitad de lo que le sobra al mes
    assert.ok(cuotaMensual(pf.montoSugerido, pf.tea, 12) <= pf.excedente * CREDITO.ratioCuota)
    assert.ok(pf.factores.some((f) => f.tipo === 'negativo' && f.texto.includes('facturas vencidas')))
  })

  test('Bodega Doña Rosa: riesgo bajo con un monto acorde a sus ventas', () => {
    const pb = perfilCrediticio(bodega, HOY)
    assert.equal(pb.segmento, 'A')
    assert.ok(pb.montoSugerido > 0 && pb.montoSugerido < pf.montoSugerido)
  })

  test('sin capacidad de pago no se ofrece monto (segmento D)', () => {
    assert.equal(montoOfrecido({ cuotaMaxima: 2_000, segmento: 'D' }, 12), 0)
    assert.equal(montoOfrecido({ cuotaMaxima: 50, segmento: 'A' }, 12), 0)
  })

  test('definir el sueldo del dueño cambia el gasto familiar y la capacidad de pago', () => {
    const conSueldo = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [], overrides: { sueldoDueno: 3000 } })
    const p = perfilCrediticio(conSueldo, HOY)
    assert.equal(p.gastoFamiliar, 3000)
    assert.ok(p.excedente < pf.excedente)
  })
})

describe('el crédito en la caja', () => {
  test('el desembolso y las cuotas entran como eventos y la alerta de diciembre desaparece', () => {
    const sin = proyectarCaja(ferreteria, [], HOY, 60)
    assert.ok(sin.alerta)
    const eventos = eventosCredito(pf.montoSugerido, 12, pf.tea, '2026-11-20')
    assert.equal(eventos.length, 13)
    const con = proyectarCaja(ferreteria, [], HOY, 60, eventos)
    assert.equal(con.alerta, null)
    assert.ok(con.eventos.some((e) => e.fuente === 'CREDITO' && e.monto === pf.montoSugerido))
  })
})

describe('pedir prestado no mejora el perfil', () => {
  test('con el desembolso en la cuenta y su cuota, el puntaje no sube y el monto ofrecido baja', () => {
    const base = seedFerreteria()
    const ultimo = base.movements.at(-1)!
    const desembolso = { ...ultimo, id: 'desembolso-test', fecha: '2026-11-18T10:30', monto: pf.montoSugerido, glosa: 'DESEMBOLSO PRESTAMO CAPITAL DE TRABAJO BCP', contraparteNombre: 'BCP', contraparteRuc: undefined, canal: 'TRANSFERENCIA' as const, saldoDespues: ultimo.saldoDespues + pf.montoSugerido }
    const con = analyze(base, { corrections: [], rules: [], extraMovements: [desembolso] })
    const despues = perfilCrediticio(con, HOY, [], cuotaMensual(pf.montoSugerido, pf.tea, 12))
    assert.ok(despues.score <= pf.score)
    assert.equal(despues.diasCaja, pf.diasCaja)
    assert.ok(despues.montoSugerido < pf.montoSugerido)
  })
})
