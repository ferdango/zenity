/**
 * Carga del extracto del banco (Excel o CSV) mientras llega la API del BCP.
 * Encuentra la fila de cabecera, reconoce las columnas por su nombre y convierte cada fila en un
 * movimiento que el motor concilia como cualquier otro. Las filas repetidas no se duplican.
 */
import type { BankMovement, Canal } from './types.ts'
import { cents, dayOf, nameSimilarity, normalizeName, round2 } from './util.ts'

export type CampoExtracto = 'fecha' | 'descripcion' | 'monto' | 'cargo' | 'abono' | 'saldo' | 'operacion' | 'hora'

export const CAMPO_LABEL: Record<CampoExtracto, string> = {
  fecha: 'Fecha',
  descripcion: 'Descripción',
  monto: 'Monto',
  cargo: 'Cargo',
  abono: 'Abono',
  saldo: 'Saldo',
  operacion: 'N.° de operación',
  hora: 'Hora',
}

export interface FilaConError {
  /** Número de fila en la hoja (desde 1) */
  fila: number
  motivo: string
}

export interface ResultadoExtracto {
  columnas: Partial<Record<CampoExtracto, string>>
  /** Movimientos nuevos, del más antiguo al más reciente */
  nuevos: BankMovement[]
  /** Filas que ya estaban en Zenity (mismo día, monto y operación) */
  repetidos: number
  errores: FilaConError[]
  desde?: string
  hasta?: string
}

/* ── CSV ──────────────────────────────────────────────────────── */

/** Lee un CSV o TSV (delimitador «,», «;» o tabulación; comillas dobles). */
export function parseCsv(text: string): string[][] {
  const limpio = text.replace(/^﻿/, '')
  const muestra = limpio.split(/\r?\n/).slice(0, 15).join('\n').replace(/"[^"]*"/g, '')
  const delim = [';', '\t', ','].map((d) => ({ d, n: muestra.split(d).length })).sort((x, y) => y.n - x.n)[0].d
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i]
    if (quoted) {
      if (ch === '"' && limpio[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpio[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim()))
}

/** Escribe filas como CSV (comas, comillas cuando hace falta). */
export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

/* ── Columnas ─────────────────────────────────────────────────── */

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Qué campo es una cabecera (en el orden en que se prueban). */
function campoDe(header: string): CampoExtracto | null {
  const h = norm(header)
  if (!h) return null
  if (/\bvaluta\b/.test(h)) return null
  if (/\bhora\b/.test(h)) return 'hora'
  if (/descripcion|concepto|glosa|detalle/.test(h)) return 'descripcion'
  if (/^fec(ha)?\b|^f operacion/.test(h)) return 'fecha'
  if (/saldo/.test(h)) return 'saldo'
  if (/^(monto|importe|valor)\b/.test(h)) return 'monto'
  if (/cargo|debito|debe\b|retiro|salida/.test(h)) return 'cargo'
  if (/abono|credito|haber|ingreso|deposito/.test(h)) return 'abono'
  if (/operacion|^n(ro|um|ro\.|°|o)?\b.*oper|^num/.test(h)) return 'operacion'
  return null
}

function leerCabecera(row: string[]): Partial<Record<CampoExtracto, number>> | null {
  const idx: Partial<Record<CampoExtracto, number>> = {}
  row.forEach((cell, i) => {
    const campo = campoDe(cell)
    if (campo && idx[campo] === undefined) idx[campo] = i
  })
  const tieneMonto = idx.monto !== undefined || idx.cargo !== undefined || idx.abono !== undefined
  return idx.fecha !== undefined && idx.descripcion !== undefined && tieneMonto ? idx : null
}

/* ── Valores ──────────────────────────────────────────────────── */

/** «17/11/2026», «17/11/26», «2026-11-17», «17-11-2026» o un número de serie de Excel → «2026-11-17». */
export function parseFecha(v: string): { dia: string; hora?: string } | null {
  const s = v.trim()
  if (!s) return null
  const hora = s.match(/(\d{1,2}):(\d{2})/)
  const hh = hora ? `${hora[1].padStart(2, '0')}:${hora[2]}` : undefined
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valida(Number(m[1]), Number(m[2]), Number(m[3]), hh)
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])
    return valida(y, Number(m[2]), Number(m[1]), hh)
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel: días desde el 30/12/1899 (la fracción es la hora)
    const serial = Number(s)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
    const minutos = Math.round((serial % 1) * 1440)
    const hx = minutos ? `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}` : undefined
    return valida(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hx)
  }
  return null
}

function valida(y: number, mo: number, d: number, hora?: string) {
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { dia: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, hora }
}

/** «S/ 1,234.56», «-1,234.56», «(1,234.56)», «1.234,56», «1,234.56-» → número; vacío o inválido → null. */
export function parseMonto(v: string): number | null {
  let s = v.replace(/ /g, ' ').trim()
  if (!s) return null
  let negativo = false
  if (/^\(.*\)$/.test(s)) {
    negativo = true
    s = s.slice(1, -1)
  }
  if (/-\s*$/.test(s)) {
    negativo = true
    s = s.replace(/-\s*$/, '')
  }
  s = s.replace(/S\/\.?|PEN|US\$|\$/gi, '').replace(/\s/g, '')
  if (s.startsWith('-')) {
    negativo = !negativo
    s = s.slice(1)
  } else if (s.startsWith('+')) s = s.slice(1)
  const coma = s.lastIndexOf(',')
  const punto = s.lastIndexOf('.')
  if (coma > -1 && punto > -1) s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (coma > -1) s = /,\d{1,2}$/.test(s) && s.split(',').length === 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = round2(Number(s))
  return negativo ? -n : n
}

/* ── Canal y contraparte ──────────────────────────────────────── */

export function canalDe(glosa: string, monto: number): Canal {
  const g = normalizeName(glosa)
  if (/\bYAPE\b|\bYAPEO\b/.test(g)) return 'YAPE'
  if (monto > 0 && /NIUBIZ|IZIPAY|VISANET|CULQI|LIQUIDACION|\bPOS\b/.test(g)) return 'POS_LIQUIDACION'
  if (monto > 0 && /DEP(OSITO)? (EN )?EFECT|DEPOSITO VENTANILLA|DEP VENTANILLA/.test(g)) return 'DEPOSITO_EFECTIVO'
  if (/RETIRO|CAJERO|\bATM\b/.test(g)) return 'CAJERO'
  if (/TRANSF|\bTRAN\b|\bTRF\b|INTERB|\bCCI\b|TRASPASO|\bPLIN\b/.test(g)) return 'TRANSFERENCIA'
  return monto > 0 ? 'TRANSFERENCIA' : 'CARGO'
}

const PREFIJOS = new Set(['ABONO', 'CARGO', 'TRANSF', 'TRANSFERENCIA', 'TRAN', 'TRF', 'INTERB', 'INTERBANCARIA', 'CTAS', 'CTA', 'TERC', 'TERCEROS', 'OTROS', 'BANCOS', 'BCO', 'DE', 'A', 'AL', 'DESDE', 'POR', 'YAPE', 'PLIN', 'ENVIADO', 'RECIBIDO', 'PAGO'])
const MAYUSCULAS = new Set(['SAC', 'SA', 'SRL', 'EIRL', 'SAA', 'BCP', 'BBVA', 'SUNAT'])

function titulo(palabras: string[]): string {
  return palabras.map((w) => (MAYUSCULAS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ')
}

/** Nombre y RUC de la contraparte de una transferencia o un Yape, a partir de la glosa. */
export function contraparteDe(glosa: string, canal: Canal): { nombre?: string; ruc?: string } {
  const ruc = glosa.match(/\b(10|15|17|20)\d{9}\b/)?.[0]
  if (canal !== 'TRANSFERENCIA' && canal !== 'YAPE') return { ruc }
  const palabras = glosa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  let i = 0
  while (i < palabras.length && PREFIJOS.has(palabras[i])) i++
  const resto = palabras.slice(i).filter((w) => !/^\d+$/.test(w))
  if (resto.length === 0 || resto.join('').length < 3) return { ruc }
  return { nombre: titulo(resto), ruc }
}

/* ── Extracto ─────────────────────────────────────────────────── */

const SALTAR = /^(saldo (inicial|anterior|final|disponible|contable)|total|totales)\b/

export interface LeerExtractoOpts {
  businessId: string
  /** Movimientos que ya tiene Zenity (para no duplicar) */
  existentes: BankMovement[]
}

/** Convierte las filas de la hoja en movimientos nuevos. */
export function leerExtracto(rows: string[][], opts: LeerExtractoOpts): ResultadoExtracto {
  let headerRow = -1
  let idx: Partial<Record<CampoExtracto, number>> | null = null
  for (let r = 0; r < Math.min(rows.length, 25) && !idx; r++) {
    idx = leerCabecera(rows[r])
    if (idx) headerRow = r
  }
  if (!idx) {
    return { columnas: {}, nuevos: [], repetidos: 0, errores: [{ fila: 0, motivo: 'No encontramos las columnas Fecha, Descripción y Monto (o Cargo y Abono).' }] }
  }
  const col = idx
  const columnas = Object.fromEntries(Object.entries(col).map(([k, i]) => [k, rows[headerRow][i!]])) as ResultadoExtracto['columnas']
  const cell = (row: string[], campo: CampoExtracto) => (col[campo] !== undefined ? (row[col[campo]!] ?? '').trim() : '')

  const leidos: (Omit<BankMovement, 'saldoDespues'> & { saldo: number | null; fila: number })[] = []
  const errores: FilaConError[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row.some((c) => c.trim())) continue
    const desc = cell(row, 'descripcion').replace(/\s+/g, ' ')
    const fechaTxt = cell(row, 'fecha')
    if (!fechaTxt && SALTAR.test(norm(desc))) continue
    if (SALTAR.test(norm(fechaTxt)) || SALTAR.test(norm(desc))) continue
    const fecha = parseFecha(fechaTxt)
    let monto: number | null
    if (col.monto !== undefined) monto = parseMonto(cell(row, 'monto'))
    else {
      const cargo = parseMonto(cell(row, 'cargo'))
      const abono = parseMonto(cell(row, 'abono'))
      monto = cargo === null && abono === null ? null : round2(Math.abs(abono ?? 0) - Math.abs(cargo ?? 0))
    }
    if (!fecha) {
      errores.push({ fila: r + 1, motivo: fechaTxt ? `La fecha «${fechaTxt}» no se entiende` : 'No tiene fecha' })
      continue
    }
    if (monto === null || monto === 0) {
      errores.push({ fila: r + 1, motivo: 'No tiene un monto válido' })
      continue
    }
    const horaCol = cell(row, 'hora').match(/(\d{1,2}):(\d{2})/)
    const hora = horaCol ? `${horaCol[1].padStart(2, '0')}:${horaCol[2]}` : (fecha.hora ?? '12:00')
    const canal = canalDe(desc, monto)
    const { nombre, ruc } = contraparteDe(desc, canal)
    const operacion = cell(row, 'operacion').replace(/\D/g, '')
    const iso = `${fecha.dia}T${hora}`
    leidos.push({
      id: `ext-${opts.businessId.slice(-4)}-${iso.replace(/\D/g, '')}-${operacion || r + 1}-${Math.abs(cents(monto))}`,
      businessId: opts.businessId,
      fecha: iso,
      monto,
      glosa: desc || 'MOVIMIENTO',
      numeroOperacion: operacion,
      contraparteNombre: nombre,
      contraparteRuc: ruc,
      canal,
      importado: true,
      saldo: col.saldo !== undefined ? parseMonto(cell(row, 'saldo')) : null,
      fila: r + 1,
    })
  }

  // Repetidos: ya estaban (mismo día y monto, y la misma operación o una glosa parecida)
  const existentes = opts.existentes.filter((m) => m.businessId === opts.businessId)
  const yaEsta = (x: (typeof leidos)[number]) =>
    existentes.some(
      (m) =>
        m.id === x.id ||
        (dayOf(m.fecha) === dayOf(x.fecha) &&
          cents(m.monto) === cents(x.monto) &&
          (m.numeroOperacion && x.numeroOperacion ? m.numeroOperacion.replace(/^0+/, '') === x.numeroOperacion.replace(/^0+/, '') : nameSimilarity(m.glosa, x.glosa) >= 0.5)),
    )
  const nuevosLeidos = leidos.filter((x) => !yaEsta(x)).sort((x, y) => x.fecha.localeCompare(y.fecha) || x.fila - y.fila)
  const repetidos = leidos.length - nuevosLeidos.length

  // Saldo después de cada movimiento: el del extracto o, si no trae, el último conocido + el monto
  const todos = [...existentes].sort((x, y) => x.fecha.localeCompare(y.fecha))
  const nuevos: BankMovement[] = []
  for (const x of nuevosLeidos) {
    const previo = [...todos, ...nuevos].filter((m) => m.fecha <= x.fecha).sort((p, q) => p.fecha.localeCompare(q.fecha)).at(-1)
    nuevos.push({
      id: x.id,
      businessId: x.businessId,
      fecha: x.fecha,
      monto: x.monto,
      glosa: x.glosa,
      numeroOperacion: x.numeroOperacion,
      contraparteNombre: x.contraparteNombre,
      contraparteRuc: x.contraparteRuc,
      canal: x.canal,
      importado: true,
      saldoDespues: x.saldo ?? round2((previo?.saldoDespues ?? 0) + x.monto),
    })
  }

  return {
    columnas,
    nuevos,
    repetidos,
    errores,
    desde: leidos.length ? leidos.map((x) => dayOf(x.fecha)).sort()[0] : undefined,
    hasta: leidos.length ? leidos.map((x) => dayOf(x.fecha)).sort().at(-1) : undefined,
  }
}
