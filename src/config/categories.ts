import type { CategoriaId } from '../domain/types.ts'

export interface Categoria {
  id: CategoriaId
  /** Lo que ve el dueño */
  label: string
  icon: string
  /** Lo que ve el contador (propuesta inicial, validar con un contador piloto) */
  cuentaPCGE: string
  /** Código corto para el asiento */
  codigoPCGE: string
  /** true = un cargo de esta categoría debería tener factura */
  necesitaFactura: boolean
  /** Para ordenar las alternativas por tipo de movimiento */
  tipo: 'ingreso' | 'egreso' | 'ambos'
  /** Categoría equivalente en las pantallas de Ingresos y Egresos del prototipo */
  legacy: 'ventas' | 'cobros' | 'recurrentes' | 'financieros' | 'extraordinarios' | 'operaciones' | 'comercial' | 'personal' | 'gastos' | 'finanzas'
}

export const CATEGORIAS: Record<CategoriaId, Categoria> = {
  ventas: { id: 'ventas', label: 'Ventas', icon: 'point_of_sale', cuentaPCGE: '70 Ventas', codigoPCGE: '70', necesitaFactura: false, tipo: 'ingreso', legacy: 'ventas' },
  insumos: { id: 'insumos', label: 'Insumos y mercadería', icon: 'inventory_2', cuentaPCGE: '60 Compras', codigoPCGE: '60', necesitaFactura: true, tipo: 'egreso', legacy: 'operaciones' },
  alquiler: { id: 'alquiler', label: 'Alquiler', icon: 'storefront', cuentaPCGE: '635 Alquileres', codigoPCGE: '635', necesitaFactura: true, tipo: 'egreso', legacy: 'operaciones' },
  servicios: { id: 'servicios', label: 'Luz, agua, internet, teléfono', icon: 'bolt', cuentaPCGE: '636 Servicios básicos', codigoPCGE: '636', necesitaFactura: true, tipo: 'egreso', legacy: 'operaciones' },
  transporte: { id: 'transporte', label: 'Transporte y movilidad', icon: 'local_shipping', cuentaPCGE: '631 Transporte, correos y gastos de viaje', codigoPCGE: '631', necesitaFactura: true, tipo: 'egreso', legacy: 'operaciones' },
  publicidad: { id: 'publicidad', label: 'Publicidad', icon: 'campaign', cuentaPCGE: '637 Publicidad, publicaciones, relaciones públicas', codigoPCGE: '637', necesitaFactura: true, tipo: 'egreso', legacy: 'comercial' },
  mantenimiento: { id: 'mantenimiento', label: 'Mantenimiento y reparaciones', icon: 'build', cuentaPCGE: '634 Mantenimiento y reparaciones', codigoPCGE: '634', necesitaFactura: true, tipo: 'egreso', legacy: 'operaciones' },
  asesoria: { id: 'asesoria', label: 'Contador y asesoría', icon: 'support_agent', cuentaPCGE: '632 Asesoría y consultoría', codigoPCGE: '632', necesitaFactura: true, tipo: 'egreso', legacy: 'gastos' },
  planilla: { id: 'planilla', label: 'Sueldos de mi equipo', icon: 'groups', cuentaPCGE: '62 Gastos de personal', codigoPCGE: '62', necesitaFactura: false, tipo: 'egreso', legacy: 'gastos' },
  impuestos: { id: 'impuestos', label: 'Impuestos', icon: 'account_balance', cuentaPCGE: '40 Tributos por pagar / 64 Gastos por tributos', codigoPCGE: '40', necesitaFactura: false, tipo: 'egreso', legacy: 'finanzas' },
  prestamos: { id: 'prestamos', label: 'Préstamos y cuotas', icon: 'credit_score', cuentaPCGE: '45 Obligaciones financieras', codigoPCGE: '45', necesitaFactura: false, tipo: 'ambos', legacy: 'finanzas' },
  comisiones: { id: 'comisiones', label: 'Comisiones bancarias', icon: 'receipt', cuentaPCGE: '67 Gastos financieros', codigoPCGE: '67', necesitaFactura: false, tipo: 'egreso', legacy: 'finanzas' },
  retiro_dueno: { id: 'retiro_dueno', label: 'Retiro del dueño / personal', icon: 'person', cuentaPCGE: '14 Cuentas por cobrar a accionistas y personal (validar)', codigoPCGE: '14', necesitaFactura: false, tipo: 'egreso', legacy: 'personal' },
  otros: { id: 'otros', label: 'Otros', icon: 'category', cuentaPCGE: '(a definir por el contador)', codigoPCGE: '659', necesitaFactura: true, tipo: 'ambos', legacy: 'gastos' },
}

export const CATEGORIA_IDS = Object.keys(CATEGORIAS) as CategoriaId[]

/** Cuentas que el contador puede asignar en el portal. */
export const CUENTAS_PCGE = [
  { codigo: '1041', nombre: 'Cuentas corrientes operativas' },
  { codigo: '12', nombre: 'Cuentas por cobrar comerciales – terceros' },
  { codigo: '14', nombre: 'Cuentas por cobrar al personal, accionistas y gerentes' },
  { codigo: '40', nombre: 'Tributos por pagar' },
  { codigo: '42', nombre: 'Cuentas por pagar comerciales – terceros' },
  { codigo: '45', nombre: 'Obligaciones financieras' },
  { codigo: '60', nombre: 'Compras' },
  { codigo: '62', nombre: 'Gastos de personal' },
  { codigo: '631', nombre: 'Transporte, correos y gastos de viaje' },
  { codigo: '632', nombre: 'Asesoría y consultoría' },
  { codigo: '634', nombre: 'Mantenimiento y reparaciones' },
  { codigo: '635', nombre: 'Alquileres' },
  { codigo: '636', nombre: 'Servicios básicos' },
  { codigo: '637', nombre: 'Publicidad, publicaciones, relaciones públicas' },
  { codigo: '64', nombre: 'Gastos por tributos' },
  { codigo: '659', nombre: 'Otros gastos de gestión' },
  { codigo: '67', nombre: 'Gastos financieros' },
  { codigo: '70', nombre: 'Ventas' },
  { codigo: '75', nombre: 'Otros ingresos de gestión' },
] as const

export function nombreCuenta(codigo: string): string {
  return CUENTAS_PCGE.find((c) => c.codigo === codigo)?.nombre ?? codigo
}
