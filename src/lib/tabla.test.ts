/** Lectura de extractos en .xlsx, .csv y .xls antiguo (sin dependencias). */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ArchivoNoSoportado, leerTabla } from './tabla.ts'

/** ZIP mínimo: cada archivo comprimido con deflate-raw (como Excel). */
async function zip(archivos: Record<string, string>): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const locales: Uint8Array[] = []
  const centrales: Uint8Array[] = []
  let offset = 0
  for (const [nombre, texto] of Object.entries(archivos)) {
    const datos = new Uint8Array(await new Response(new Blob([enc.encode(texto)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())
    const n = enc.encode(nombre)
    const local = new Uint8Array(30 + n.length + datos.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(8, 8, true)
    lv.setUint32(18, datos.length, true)
    lv.setUint16(26, n.length, true)
    local.set(n, 30)
    local.set(datos, 30 + n.length)
    const central = new Uint8Array(46 + n.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(10, 8, true)
    cv.setUint32(20, datos.length, true)
    cv.setUint16(28, n.length, true)
    cv.setUint32(42, offset, true)
    central.set(n, 46)
    locales.push(local)
    centrales.push(central)
    offset += local.length
  }
  const tamCentral = centrales.reduce((s, c) => s + c.length, 0)
  const fin = new Uint8Array(22)
  const fv = new DataView(fin.buffer)
  fv.setUint32(0, 0x06054b50, true)
  fv.setUint16(8, centrales.length, true)
  fv.setUint16(10, centrales.length, true)
  fv.setUint32(12, tamCentral, true)
  fv.setUint32(16, offset, true)
  const partes = [...locales, ...centrales, fin]
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0))
  let p = 0
  for (const parte of partes) {
    out.set(parte, p)
    p += parte.length
  }
  return out
}

describe('leerTabla', () => {
  test('lee un .xlsx con textos compartidos, celdas en línea, números y celdas vacías', async () => {
    const bytes = await zip({
      'xl/sharedStrings.xml': '<sst><si><t>Fecha</t></si><si><t>Descripción operación</t></si><si><t>Monto</t></si><si><r><t>TRANSF. </t></r><r><t>A &amp; B SAC</t></r></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
        '<row r="3"><c r="A3"><v>46343</v></c><c r="B3" t="s"><v>3</v></c><c r="C3"><v>-120.5</v></c></row>' +
        '<row r="4"><c r="A4" t="inlineStr"><is><t>18/11/2026</t></is></c><c r="C4"><v>80</v></c></row></sheetData></worksheet>',
    })
    const { formato, filas } = await leerTabla(bytes)
    assert.equal(formato, 'xlsx')
    assert.deepEqual(filas, [['Fecha', 'Descripción operación', 'Monto'], [], ['46343', 'TRANSF. A & B SAC', '-120.5'], ['18/11/2026', '', '80']])
  })

  test('lee un CSV en Windows-1252 (tildes)', async () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('Fecha;Descripci'), 0xf3, ...new TextEncoder().encode('n;Monto\n17/11/2026;PAGO;-10')])
    const { formato, filas } = await leerTabla(bytes)
    assert.equal(formato, 'csv')
    assert.equal(filas[0][1], 'Descripción')
  })

  test('el .xls antiguo pide guardarlo como .xlsx o .csv', async () => {
    await assert.rejects(() => leerTabla(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])), ArchivoNoSoportado)
  })
})
