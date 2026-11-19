/** Loyalty: tienda de puntos con XP y recompensas por logros. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { type Canje, codigoCanje, disponibilidad, LOGROS, logros, PRODUCTOS, puntosDisponibles, xpDeRecompensas } from './loyalty.ts'
import { type EntradaProgreso, progreso, XP_PREVIO } from './progreso.ts'

const canje = (productoId: string, xp: number, id = productoId): Canje => ({ id, productoId, xp, ts: '2026-11-18T10:30', codigo: codigoCanje(id) })
const protector = PRODUCTOS.find((p) => p.id === 'protector')!

describe('tienda de puntos', () => {
  test('canjear descuenta puntos disponibles, no el XP ganado', () => {
    assert.equal(puntosDisponibles(300, [canje('protector', 50), canje('recarga', 200)]), 50)
    assert.equal(puntosDisponibles(30, [canje('recarga', 200)]), 0)
  })

  test('sin puntos suficientes dice cuánto falta; con el límite alcanzado, agotado', () => {
    assert.deepEqual(disponibilidad(protector, 20, []), { ok: false, motivo: 'faltan', faltan: 30 })
    assert.deepEqual(disponibilidad(protector, 500, []), { ok: true })
    const tres = [canje('protector', 50, 'a'), canje('protector', 50, 'b'), canje('protector', 50, 'c')]
    assert.deepEqual(disponibilidad(protector, 500, tres), { ok: false, motivo: 'agotado' })
  })

  test('el código del canje es estable y legible', () => {
    assert.equal(codigoCanje('canje-1'), codigoCanje('canje-1'))
    assert.notEqual(codigoCanje('canje-1'), codigoCanje('canje-2'))
    assert.match(codigoCanje('canje-1'), /^ZEN-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
  })

  test('cada producto tiene precio y categoría', () => {
    for (const p of PRODUCTOS) assert.ok(p.xp > 0 && p.nombre && p.categoria)
  })
})

describe('recompensas', () => {
  const datos = { xpHoy: 60, metaCumplida: true, racha: 5, nivel: 2, revisados: 6, recordatorios: 1, lecciones: 1, unidadesCompletas: [] }

  test('un logro se cumple al llegar a su meta y se reclama una sola vez', () => {
    const l = logros(datos, ['primer-paso'])
    assert.equal(l.find((x) => x.id === 'primer-paso')?.reclamado, true)
    assert.equal(l.find((x) => x.id === 'conciliador')?.logrado, true)
    assert.equal(l.find((x) => x.id === 'cobrador')?.logrado, false)
    assert.equal(l.find((x) => x.id === 'racha-7')?.actual, 5)
  })

  test('reclamar suma su XP al progreso (y puede subir de nivel)', () => {
    const bonus = xpDeRecompensas(['primer-paso', 'meta-dia', 'conciliador'])
    assert.equal(bonus, 10 + 25 + 30)
    const vacio: EntradaProgreso = { corrections: [], recordatorios: {}, promesas: [], lessonEvents: [], datos: {}, inicio: {}, overrides: {}, importaciones: [], confirmados: {}, regimenRevisado: {}, hitos: {} }
    assert.equal(progreso({ ...vacio, bonus }).xp, XP_PREVIO + bonus)
  })

  test('los ids de los logros no se repiten', () => {
    assert.equal(new Set(LOGROS.map((l) => l.id)).size, LOGROS.length)
  })
})
