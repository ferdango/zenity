/** Educación financiera como avance progresivo: XP, meta diaria, racha, niveles y camino. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { QUIZ } from '../config/quiz.ts'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { analyze } from './engine.ts'
import { camino, type EntradaProgreso, META_DIARIA, nivelDe, progreso, RACHA_PREVIA, siguientePaso, XP, XP_PREVIO } from './progreso.ts'

const vacio: EntradaProgreso = {
  corrections: [],
  recordatorios: {},
  promesas: [],
  lessonEvents: [],
  datos: {},
  inicio: {},
  overrides: {},
  importaciones: [],
  confirmados: {},
  regimenRevisado: {},
  hitos: {},
}

const a = analyze(seedFerreteria(), { corrections: [], rules: [], extraMovements: [] })
const BIZ = a.business.id

describe('XP, meta diaria y racha', () => {
  test('sin tareas hoy: el avance previo de la demo, meta en 0 y la racha sin asegurar', () => {
    const p = progreso(vacio)
    assert.equal(p.xp, XP_PREVIO)
    assert.equal(p.xpHoy, 0)
    assert.equal(p.racha, RACHA_PREVIA)
    assert.equal(p.rachaHoy, false)
    assert.equal(p.metaCumplida, false)
  })

  test('cada tarea suma XP; una tarea basta para la racha y 50 XP cumplen la meta', () => {
    const correccion = { id: 'c1', movementId: 'm1', businessId: BIZ, rubro: 'ferreteria', sugerida: 'otros', elegida: 'otros', confianzaSugerida: 0.5, origen: 'APP', creoRegla: false, ts: '2026-11-18T10:00' } as const
    const p = progreso({
      ...vacio,
      corrections: [correccion, { ...correccion, id: 'c2' }, { ...correccion, id: 'c3', origen: 'CONTADOR' }],
      recordatorios: { f1: '2026-11-18' },
      lessonEvents: [
        { lessonId: 'L10', businessId: BIZ, tipo: 'LEIDA', ts: '' },
        { lessonId: 'L10', businessId: BIZ, tipo: 'LEIDA', ts: '' },
      ],
    })
    // 2 revisados (la del contador no cuenta) + 1 recordatorio + 1 lección (sin repetir)
    assert.equal(p.xpHoy, 2 * XP.revisar + XP.recordatorio + XP.leccion)
    assert.equal(p.racha, RACHA_PREVIA + 1)
    assert.equal(p.metaCumplida, p.xpHoy >= META_DIARIA)
  })
})

describe('niveles', () => {
  test('los niveles suben con el XP y dicen cuánto falta', () => {
    assert.equal(nivelDe(0).numero, 1)
    const n = nivelDe(180)
    assert.equal(n.numero, 2)
    assert.equal(n.nombre, 'Ordenado')
    assert.equal(n.faltan, 70)
    assert.ok(n.pct > 0 && n.pct < 1)
    assert.equal(nivelDe(5000).hasta, null)
  })
})

describe('camino', () => {
  test('la primera unidad sin terminar es la actual; las siguientes quedan bloqueadas', () => {
    const u = camino(a, vacio, 2)
    assert.equal(u[0].id, 'ordena')
    assert.equal(u[0].estado, 'actual')
    assert.ok(u.slice(1).every((x) => x.estado === 'bloqueada'))
    assert.equal(siguientePaso(u)?.paso.id, 'permisos')
  })

  test('cada lección del camino tiene su pregunta de práctica con una respuesta válida', () => {
    for (const unidad of camino(a, vacio, 2)) {
      for (const paso of unidad.pasos.filter((p) => p.tipo === 'leccion')) {
        const q = QUIZ[paso.lessonId!]
        assert.ok(q, `falta la pregunta de ${paso.lessonId}`)
        assert.ok(q.correcta >= 0 && q.correcta < q.opciones.length)
      }
    }
  })

  test('marcar permisos y leer una lección avanzan la unidad', () => {
    const u = camino(a, { ...vacio, datos: { [BIZ]: {} }, lessonEvents: [{ lessonId: 'L10', businessId: BIZ, tipo: 'LEIDA', ts: '' }] }, 2)
    assert.equal(u[0].pasos.find((p) => p.id === 'permisos')?.hecho, true)
    assert.equal(u[0].pasos.find((p) => p.id === 'L10')?.hecho, true)
  })
})
