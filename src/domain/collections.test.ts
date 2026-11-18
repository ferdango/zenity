/** F-05 · Cobranza: orden, tono del mensaje y link de WhatsApp. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { linkWhatsApp, mensajeCobro, porCobrar, tonoDe } from './collections.ts'
import { analyze } from './engine.ts'

const data = seedFerreteria()
const a = analyze(data, { corrections: [], rules: [], extraMovements: [] })
const lista = porCobrar(a, [], '2026-11-18')

describe('cobranza asistida', () => {
  test('ordena por días vencidos × monto: primero la factura con 45 días de atraso', () => {
    assert.equal(lista[0].diasVencidos, 45)
    assert.equal(lista[0].tramo, 'VENCIDA_31_60')
  })

  test('el tono depende de los días vencidos', () => {
    assert.equal(tonoDe(-5), 'AMABLE')
    assert.equal(tonoDe(15), 'AMABLE')
    assert.equal(tonoDe(20), 'DIRECTO')
    assert.equal(tonoDe(45), 'FIRME')
    assert.match(mensajeCobro(lista[0], data.business), /¿En qué fecha nos podrá pagar\?/)
  })

  test('el mensaje incluye monto, serie-número y formas de pago', () => {
    const msg = mensajeCobro(lista[0], data.business)
    assert.match(msg, /S\/ 2,950\.00/)
    assert.match(msg, new RegExp(`${lista[0].comprobante.serie}-${lista[0].comprobante.numero}`))
    assert.match(msg, /Yape al 987 123 456/)
    assert.match(msg, /CCI/)
  })

  test('el link de WhatsApp codifica tildes y saltos de línea', () => {
    assert.equal(linkWhatsApp('987 650 045', 'Hola, Rímac\n\nS/ 1,180'), 'https://wa.me/51987650045?text=Hola%2C%20R%C3%ADmac%0A%0AS%2F%201%2C180')
    const url = new URL(linkWhatsApp('987650045', mensajeCobro(lista[0], data.business)))
    assert.equal(url.searchParams.get('text'), mensajeCobro(lista[0], data.business))
  })

  test('«Simular que pagó» concilia la factura y baja «Te deben»', () => {
    const vencida = lista.find((c) => c.monto === 1180)!
    const ultimo = data.movements.at(-1)!
    const b = analyze(data, {
      corrections: [],
      rules: [],
      extraMovements: [
        { ...ultimo, id: 'sim', fecha: '2026-11-18T10:30', monto: 1180, glosa: 'TRANSF. CONDOMINIO LAS GARDENIAS', contraparteNombre: vencida.comprobante.nombreContraparte, contraparteRuc: vencida.comprobante.rucContraparte, canal: 'TRANSFERENCIA', saldoDespues: ultimo.saldoDespues + 1180, simulado: true },
      ],
    })
    assert.equal(b.comprobanteEstado.get(vencida.comprobante.id), 'CONCILIADO')
    assert.equal(porCobrar(b, [], '2026-11-18').reduce((s, c) => s + c.monto, 0), 8120)
  })
})
