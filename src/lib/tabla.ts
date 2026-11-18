/**
 * Lee la primera hoja de un archivo de extracto como filas de texto, sin dependencias:
 * - .xlsx: es un ZIP con XML; se descomprime con DecompressionStream («deflate-raw»).
 * - .xls que en realidad es una tabla HTML (así exportan varios bancos).
 * - .csv o .txt (UTF-8 o Windows-1252).
 * El .xls binario antiguo no se puede leer aquí: se pide guardarlo como .xlsx o .csv.
 */
import { parseCsv } from '../domain/extracto.ts'

export type FormatoTabla = 'xlsx' | 'html' | 'csv'

export class ArchivoNoSoportado extends Error {}

export async function leerTabla(bytes: Uint8Array): Promise<{ formato: FormatoTabla; filas: string[][] }> {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return { formato: 'xlsx', filas: await leerXlsx(bytes) }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new ArchivoNoSoportado('Es un Excel antiguo (.xls). Ábrelo y guárdalo como .xlsx o .csv, y vuelve a subirlo.')
  }
  const texto = decodificar(bytes)
  if (/<table[\s>]/i.test(texto.slice(0, 20_000))) return { formato: 'html', filas: leerHtml(texto) }
  return { formato: 'csv', filas: parseCsv(texto) }
}

function decodificar(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/* ── HTML ─────────────────────────────────────────────────────── */

/** Lo mínimo del DOM que se usa (así el archivo también compila y se prueba en Node). */
interface Nodo {
  querySelectorAll(selector: string): ArrayLike<Nodo>
  textContent: string | null
}

function leerHtml(texto: string): string[][] {
  const Parser = (globalThis as unknown as { DOMParser?: new () => { parseFromString(t: string, tipo: string): Nodo } }).DOMParser
  if (!Parser) throw new ArchivoNoSoportado('No se puede leer una tabla HTML aquí.')
  const doc = new Parser().parseFromString(texto, 'text/html')
  return Array.from(doc.querySelectorAll('tr'), (tr) => Array.from(tr.querySelectorAll('th,td'), (c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()))
}

/* ── XLSX ─────────────────────────────────────────────────────── */

interface EntradaZip {
  nombre: string
  metodo: number
  comprimido: number
  offsetLocal: number
}

function entradasZip(b: Uint8Array): EntradaZip[] {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ArchivoNoSoportado('El archivo .xlsx está dañado.')
  const total = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const entradas: EntradaZip[] = []
  for (let k = 0; k < total; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const metodo = v.getUint16(p + 10, true)
    const comprimido = v.getUint32(p + 20, true)
    const largoNombre = v.getUint16(p + 28, true)
    const largoExtra = v.getUint16(p + 30, true)
    const largoComentario = v.getUint16(p + 32, true)
    const offsetLocal = v.getUint32(p + 42, true)
    const nombre = new TextDecoder().decode(b.subarray(p + 46, p + 46 + largoNombre))
    entradas.push({ nombre, metodo, comprimido, offsetLocal })
    p += 46 + largoNombre + largoExtra + largoComentario
  }
  return entradas
}

async function contenido(b: Uint8Array, e: EntradaZip): Promise<string> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const inicio = e.offsetLocal + 30 + v.getUint16(e.offsetLocal + 26, true) + v.getUint16(e.offsetLocal + 28, true)
  const datos = b.slice(inicio, inicio + e.comprimido)
  if (e.metodo === 0) return new TextDecoder().decode(datos)
  if (e.metodo !== 8) throw new ArchivoNoSoportado('El .xlsx usa una compresión que no conocemos.')
  const stream = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(stream).text()
}

const entidades = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')

const textos = (xml: string) => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => entidades(m[1])).join('')

/** «AB12» → 27 (columna desde 0). */
function columna(ref: string): number {
  const letras = ref.match(/^[A-Z]+/)?.[0] ?? 'A'
  let n = 0
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Filas de la primera hoja de un .xlsx (las celdas compartidas y en línea ya resueltas). */
export async function leerXlsx(b: Uint8Array): Promise<string[][]> {
  const entradas = entradasZip(b)
  const buscar = (nombre: string) => entradas.find((e) => e.nombre === nombre)
  const hojas = entradas.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nombre)).sort((x, y) => x.nombre.localeCompare(y.nombre, undefined, { numeric: true }))
  const hoja = buscar('xl/worksheets/sheet1.xml') ?? hojas[0]
  if (!hoja) throw new ArchivoNoSoportado('El .xlsx no tiene hojas.')
  const shared = buscar('xl/sharedStrings.xml')
  const compartidos = shared ? [...(await contenido(b, shared)).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1])) : []
  const xml = await contenido(b, hoja)
  const filas: string[][] = []
  for (const fila of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const numero = Number(fila[1].match(/\br="(\d+)"/)?.[1] ?? filas.length + 1)
    const celdas: string[] = []
    for (const c of fila[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1]
      const tipo = attrs.match(/\bt="(\w+)"/)?.[1]
      const cuerpo = c[2] ?? ''
      const valor = entidades(cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '')
      const texto = tipo === 's' ? (compartidos[Number(valor)] ?? '') : tipo === 'inlineStr' ? textos(cuerpo) : valor
      celdas[ref ? columna(ref) : celdas.length] = texto.trim()
    }
    while (filas.length < numero - 1) filas.push([])
    filas.push(Array.from(celdas, (x) => x ?? ''))
  }
  return filas
}
