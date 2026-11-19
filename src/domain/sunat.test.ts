/** Pago mensual a SUNAT resumido: próximo vencimiento, desglose y último pago visto en el banco. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedBodega } from '../data/seed/bodega.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { analyze } from './engine.ts'
import { resumenSunat } from './sunat.ts'

const HOY = '2026-11-18'
const sinCambios = { corrections: [], rules: [], extraMovements: [] }

describe('resumen del pago a SUNAT', () => {
  test('ferretería (RMT): el de octubre ya salió el 16/11; el próximo es noviembre, estimado, al 16/12', () => {
    const r = resumenSunat(analyze(seedFerreteria(), sinCambios), HOY)
    assert.equal(r.periodo, '2026-11')
    assert.equal(r.vence, '2026-12-16')
    assert.equal(r.dias, 28)
    assert.equal(r.estimado, true)
    assert.ok(r.igv > 0 && r.renta > 0 && r.essalud > 0)
    assert.equal(r.total, Math.round((r.igv + r.renta + r.essalud) * 100) / 100)
    assert.equal(r.ultimoPago?.fecha, '2026-11-16')
    assert.ok((r.ultimoPago?.monto ?? 0) > 0)
  })

  test('bodega (Nuevo RUS, sin trabajadores): cuota fija sin IGV ni EsSalud; último pago de S/ 50 el 17/11', () => {
    const r = resumenSunat(analyze(seedBodega(), sinCambios), HOY)
    assert.equal(r.igv, 0)
    assert.equal(r.essalud, 0)
    // Categoría 2 (lo que paga cada mes), no la 1 que saldría de un mes a medias
    assert.equal(r.renta, 50)
    assert.equal(r.total, 50)
    assert.deepEqual(r.ultimoPago, { fecha: '2026-11-17', monto: 50 })
  })
})
