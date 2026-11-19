/** Tipos de conexión: los canales de venta y las tarjetas no se suman al saldo (no se duplica la plata). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { saldoEnCuentas, seAbonaEn, tipoConexion } from './conexiones.ts'

describe('tipos de conexión', () => {
  test('bancos son cuentas; Yape, Plin y APIs son canales; tarjetas y archivos aparte', () => {
    assert.equal(tipoConexion({ avatar: 'bank' }), 'cuenta')
    assert.equal(tipoConexion({ avatar: 'yape' }), 'canal')
    assert.equal(tipoConexion({ avatar: 'plin' }), 'canal')
    assert.equal(tipoConexion({ avatar: 'api' }), 'canal')
    assert.equal(tipoConexion({ avatar: 'visa' }), 'tarjeta')
    assert.equal(tipoConexion({ avatar: 'sheet' }), 'archivo')
  })

  test('la fuente manda sobre el avatar (una billetera es canal aunque su avatar diga otra cosa)', () => {
    assert.equal(tipoConexion({ avatar: 'bank' }, 'wallet'), 'canal')
    assert.equal(tipoConexion({ avatar: 'sheet' }, 'bank'), 'cuenta')
  })
})

describe('saldo real', () => {
  test('un cobro por Yape que ya se abonó en el BCP no cuenta dos veces', () => {
    const conexiones = [
      { balance: 10655.66, tipo: 'cuenta' as const },
      { balance: 380, tipo: 'canal' as const },
      { balance: 1244.9, tipo: 'tarjeta' as const },
      { balance: 500, tipo: 'archivo' as const },
    ]
    assert.equal(saldoEnCuentas(conexiones), 10655.66)
  })

  test('varias cuentas sí se suman', () => {
    assert.equal(saldoEnCuentas([{ balance: 100.1, tipo: 'cuenta' }, { balance: 200.2, tipo: 'cuenta' }]), 300.3)
  })

  test('dónde se abona un canal', () => {
    assert.equal(seAbonaEn({ label: 'Yape · se abona en tu BCP' }), 'tu BCP')
    assert.equal(seAbonaEn({ label: 'Plin' }, 'tu cuenta BBVA'), 'tu cuenta BBVA')
    assert.equal(seAbonaEn({ label: 'Conexión API' }), null)
  })
})
