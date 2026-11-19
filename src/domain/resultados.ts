/**
 * Estado de resultados del negocio, mes a mes (devengado simplificado para una mype):
 * - Lo que tiene comprobante cuenta en el mes en que se emitió, sin IGV (base imponible).
 * - Lo que no tiene comprobante cuenta en el mes en que se movió la plata. Una venta sin boleta se
 *   lleva sin IGV (igual se debe a SUNAT); un pago sin factura cuenta completo (su IGV no se recupera).
 * - Un movimiento conciliado con un comprobante no se cuenta dos veces: manda el comprobante.
 * - No son gastos y quedan «fuera del resultado»: los retiros del dueño, las cuotas de préstamo y los
 *   pagos a SUNAT (el IGV no es del negocio; la renta y EsSalud se estiman por periodo).
 */
import { CATEGORIAS } from '../config/categories.ts'
import { TAX_2026 } from '../config/taxParams2026.ts'
import { impuestosEstimados } from './cashflow.ts'
import { type Analysis, tipoCambio } from './engine.ts'
import type { CategoriaId, Comprobante } from './types.ts'
import { monthOf, round2 } from './util.ts'

export interface LineaResultado {
  id: string
  label: string
  monto: number
}

export interface EstadoResultados {
  /** «2026-10» */
  mes: string
  /** El mes todavía no termina: faltan pagos (planilla, servicios…) */
  enCurso: boolean
  ventas: { total: number; conComprobante: number; sinComprobante: number }
  costoVentas: number
  utilidadBruta: number
  gastosOperativos: { total: number; lineas: LineaResultado[] }
  utilidadOperativa: number
  otrosIngresos: number
  gastosFinancieros: number
  /** Pago a cuenta de renta (o cuota del Nuevo RUS) del periodo */
  impuestoRenta: number
  utilidadNeta: number
  /** Sobre las ventas, de 0 a 1 (null sin ventas) */
  margenBruto: number | null
  margenNeto: number | null
  /** Lo que salió de la cuenta pero no es gasto del negocio */
  fueraDelResultado: { retiros: number; prestamos: number }
}

/** Categorías que van en el costo de lo vendido. */
const COSTO: CategoriaId[] = ['insumos']
/** Categorías que no son ingreso ni gasto del negocio. */
const FUERA: CategoriaId[] = ['retiro_dueno', 'prestamos', 'impuestos']

const enSoles = (c: Comprobante, monto: number) => (c.moneda === 'USD' ? monto * tipoCambio(c.fechaEmision) : monto)

export function estadoResultados(a: Analysis, mes: string, hoy: string): EstadoResultados {
  const b = a.business
  const factorIgv = b.regimenTributario === 'NRUS' ? 1 : 1 + TAX_2026.igv
  const gastos = new Map<CategoriaId, number>()
  const sumar = (cat: CategoriaId, monto: number) => gastos.set(cat, round2((gastos.get(cat) ?? 0) + monto))
  let ventasCon = 0
  let ventasSin = 0
  let otrosIngresos = 0
  let retiros = 0
  let prestamos = 0

  /* Comprobantes del mes, sin IGV */
  for (const c of a.data.comprobantes) {
    if (monthOf(c.fechaEmision) !== mes) continue
    const base = enSoles(c, c.base)
    if (c.direccion === 'VENTA') {
      if (c.tipo === 'FACTURA' || c.tipo === 'BOLETA') ventasCon += base
      else if (c.tipo === 'NOTA_CREDITO') ventasCon -= base
    } else if (c.tipo === 'FACTURA' || c.tipo === 'BOLETA') {
      // La categoría sale del pago con el que se concilió; si aún no se paga, es mercadería
      const pago = a.matchByComprobante.get(c.id)?.movementIds[0]
      const cat = (pago && a.classifications.get(pago)?.categoriaId) || 'insumos'
      if (cat === 'retiro_dueno') retiros += base
      else if (!FUERA.includes(cat)) sumar(cat, base)
    }
  }

  /* Movimientos del mes que no tienen comprobante */
  for (const m of a.movements) {
    if (monthOf(m.fecha) !== mes) continue
    const match = a.matchByMovement.get(m.id)
    if (match && match.comprobanteIds.length > 0) continue
    const cat = a.classifications.get(m.id)?.categoriaId ?? 'otros'
    const monto = Math.abs(m.monto)
    if (m.monto > 0) {
      if (cat === 'ventas') ventasSin += monto / factorIgv
      else if (!FUERA.includes(cat)) otrosIngresos += monto
    } else if (cat === 'retiro_dueno') retiros += monto
    else if (cat === 'prestamos') prestamos += monto
    else if (cat !== 'impuestos') sumar(cat, monto)
  }

  /* Renta y EsSalud del periodo (los pagos a SUNAT no se cuentan: incluyen el IGV, que no es del negocio) */
  const imp = impuestosEstimados(b, a.data.comprobantes, mes, monthOf(hoy))
  if (imp.essalud > 0) sumar('planilla', imp.essalud)

  const ventas = round2(ventasCon + ventasSin)
  const costoVentas = round2(COSTO.reduce((s, c) => s + (gastos.get(c) ?? 0), 0))
  const comisiones = gastos.get('comisiones') ?? 0
  const lineas: LineaResultado[] = [...gastos.entries()]
    .filter(([cat]) => !COSTO.includes(cat) && cat !== 'comisiones')
    .map(([cat, monto]) => ({ id: cat, label: cat === 'planilla' ? 'Sueldos y EsSalud' : CATEGORIAS[cat].label, monto: round2(monto) }))
    .sort((x, y) => y.monto - x.monto)
  const totalOperativos = round2(lineas.reduce((s, l) => s + l.monto, 0))
  const utilidadBruta = round2(ventas - costoVentas)
  const utilidadOperativa = round2(utilidadBruta - totalOperativos)
  const utilidadNeta = round2(utilidadOperativa + otrosIngresos - comisiones - imp.renta)

  return {
    mes,
    enCurso: mes >= monthOf(hoy),
    ventas: { total: ventas, conComprobante: round2(ventasCon), sinComprobante: round2(ventasSin) },
    costoVentas,
    utilidadBruta,
    gastosOperativos: { total: totalOperativos, lineas },
    utilidadOperativa,
    otrosIngresos: round2(otrosIngresos),
    gastosFinancieros: round2(comisiones),
    impuestoRenta: round2(imp.renta),
    utilidadNeta,
    margenBruto: ventas > 0 ? utilidadBruta / ventas : null,
    margenNeto: ventas > 0 ? utilidadNeta / ventas : null,
    fueraDelResultado: { retiros: round2(retiros), prestamos: round2(prestamos) },
  }
}

/** Meses con datos (movimientos o comprobantes) hasta el de `hoy`, del más antiguo al más reciente. */
export function mesesConDatos(a: Analysis, hoy: string): string[] {
  const tope = monthOf(hoy)
  const meses = new Set<string>()
  for (const m of a.movements) meses.add(monthOf(m.fecha))
  for (const c of a.data.comprobantes) meses.add(monthOf(c.fechaEmision))
  return [...meses].filter((m) => m <= tope).sort()
}

/** El histórico: un estado de resultados por mes. */
export function historicoResultados(a: Analysis, hoy: string): EstadoResultados[] {
  return mesesConDatos(a, hoy).map((mes) => estadoResultados(a, mes, hoy))
}

/** El histórico como CSV para el contador (montos con punto decimal y sin separador de miles). */
export function csvResultados(historico: EstadoResultados[]): string {
  const filas = [
    ['Mes', 'Ventas sin IGV', 'Costo de ventas', 'Utilidad bruta', 'Gastos del negocio', 'Utilidad operativa', 'Otros ingresos', 'Comisiones', 'Impuesto a la renta', 'Utilidad neta', 'Margen neto', 'Retiros del dueño', 'Cuotas de préstamo', 'Estado'],
    ...historico.map((e) => [
      e.mes,
      ...[e.ventas.total, e.costoVentas, e.utilidadBruta, e.gastosOperativos.total, e.utilidadOperativa, e.otrosIngresos, e.gastosFinancieros, e.impuestoRenta, e.utilidadNeta].map((n) => n.toFixed(2)),
      e.margenNeto === null ? '' : `${(e.margenNeto * 100).toFixed(1)}%`,
      e.fueraDelResultado.retiros.toFixed(2),
      e.fueraDelResultado.prestamos.toFixed(2),
      e.enCurso ? 'En curso' : 'Cerrado',
    ]),
  ]
  return filas.map((f) => f.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')
}

