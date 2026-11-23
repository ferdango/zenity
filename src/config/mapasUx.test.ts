/** Mapas de UX: datos coherentes y enlaces que llevan a pantallas que existen. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import {
  AFINIDAD,
  BLUEPRINT,
  CARRILES,
  cuadranteDe,
  ECOSISTEMA,
  FLUJO_FLECHAS,
  FLUJO_NODOS,
  JOURNEY,
  MAPAS,
  type NodoSitio,
  ORDEN_SECCIONES,
  ROADMAP_FASES,
  ROADMAP_PUERTAS,
  SITIO_OCULTOS,
  SITIO_RAMAS,
  SUPUESTOS,
} from './mapasUx.ts'

/** Rutas declaradas en App.tsx (`<Route path="…">`). */
const RUTAS = [...readFileSync(new URL('../App.tsx', import.meta.url), 'utf8').matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*')

function existe(ruta: string): boolean {
  const limpia = ruta.split('?')[0]
  return RUTAS.some((r) => new RegExp(`^${r.replace(/:[^/]+/g, '[^/]+')}$`).test(limpia))
}

function rutasDe(nodos: NodoSitio[]): string[] {
  return nodos.flatMap((n) => [...(n.ruta ? [n.ruta] : []), ...rutasDe(n.hijos ?? [])])
}

describe('mapas de UX', () => {
  test('son 9 mapas, 3 por sección y con id único', () => {
    assert.equal(MAPAS.length, 9)
    assert.equal(new Set(MAPAS.map((m) => m.id)).size, 9)
    for (const s of ORDEN_SECCIONES) assert.equal(MAPAS.filter((m) => m.seccion === s).length, 3, s)
  })

  test('cada enlace del site map y del user flow abre una pantalla que existe', () => {
    const rutas = [
      ...SITIO_RAMAS.map((r) => r.ruta),
      ...SITIO_RAMAS.flatMap((r) => rutasDe(r.hijos)),
      ...rutasDe(SITIO_OCULTOS),
      ...FLUJO_NODOS.flatMap((n) => (n.ruta ? [n.ruta] : [])),
    ]
    assert.ok(rutas.length > 20)
    for (const r of rutas) assert.ok(existe(r), `No existe la ruta ${r}`)
    assert.ok(existe('/ux/empatia'))
  })

  test('las flechas del user flow unen nodos que existen', () => {
    const ids = new Set(FLUJO_NODOS.map((n) => n.id))
    for (const f of FLUJO_FLECHAS) {
      assert.ok(ids.has(f.desde), f.desde)
      assert.ok(ids.has(f.hasta), f.hasta)
    }
    // Todo nodo, salvo el inicio, recibe al menos una flecha
    for (const n of FLUJO_NODOS.filter((x) => x.tipo !== 'inicio')) {
      assert.ok(FLUJO_FLECHAS.some((f) => f.hasta === n.id), `Nadie llega a ${n.id}`)
    }
  })

  test('supuestos dentro del plano y con al menos 3 por probar primero', () => {
    for (const s of SUPUESTOS) {
      assert.ok(s.incertidumbre >= 0 && s.incertidumbre <= 1, s.id)
      assert.ok(s.importancia >= 0 && s.importancia <= 1, s.id)
    }
    assert.ok(SUPUESTOS.filter((s) => cuadranteDe(s) === 'probar').length >= 3)
    assert.equal(cuadranteDe({ incertidumbre: 0.1, importancia: 0.9 }), 'planear')
    assert.equal(cuadranteDe({ incertidumbre: 0.9, importancia: 0.1 }), 'investigar')
  })

  test('journey con un solo momento crítico, en la emoción más baja', () => {
    const criticos = JOURNEY.filter((e) => e.critico)
    assert.equal(criticos.length, 1)
    assert.equal(Math.min(...JOURNEY.map((e) => e.emocion)), criticos[0].emocion)
  })

  test('blueprint con todas las celdas y ecosistema de 15 actores en 3 anillos', () => {
    for (const p of BLUEPRINT) for (const c of CARRILES) assert.ok(p.celdas[c.id]?.length, `${p.id}/${c.id}`)
    assert.equal(ECOSISTEMA.length, 15)
    assert.deepEqual([...new Set(ECOSISTEMA.map((a) => a.anillo))].sort(), [1, 2, 3])
    assert.ok(AFINIDAD.every((g) => g.notas.length >= 3))
  })

  test('roadmap: tres fases seguidas y una puerta al cierre de cada una', () => {
    assert.equal(ROADMAP_FASES.length, 3)
    ROADMAP_FASES.forEach((f, i) => {
      if (i) assert.equal(f.desde, ROADMAP_FASES[i - 1].hasta)
      assert.equal(ROADMAP_PUERTAS[i].mes, f.hasta)
    })
  })
})
