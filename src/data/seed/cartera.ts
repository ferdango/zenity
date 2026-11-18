import type { RegimenTributario } from '../../domain/types.ts'

/** Clientes del contador con datos resumidos (para poblar el tablero de F-08). */
export interface ClienteResumen {
  id: string
  ruc: string
  razonSocial: string
  rubro: string
  regimen: RegimenTributario
  /** % conciliado del mes (0..1) */
  conciliado: number
  pendientes: number
  alertas: { cobradoSinComprobante: number; pagadoSinFactura: number; diferencias: number }
}

export const CARTERA_RESUMIDA: ClienteResumen[] = [
  { id: '20605135952', ruc: '20605135952', razonSocial: 'Textiles Gamarra Andina S.A.C.', rubro: 'Textil', regimen: 'RMT', conciliado: 0.94, pendientes: 0, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 0, diferencias: 0 } },
  { id: '20605144803', ruc: '20605144803', razonSocial: 'Restaurante El Sabor Norteño E.I.R.L.', rubro: 'Restaurante', regimen: 'RER', conciliado: 0.72, pendientes: 9, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 3, diferencias: 0 } },
  { id: '20605153284', ruc: '20605153284', razonSocial: 'Panificadora La Espiga S.A.C.', rubro: 'Panadería', regimen: 'RMT', conciliado: 0.58, pendientes: 14, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 1, diferencias: 2 } },
  { id: '20605162135', ruc: '20605162135', razonSocial: 'Transportes Rápidos del Centro S.A.C.', rubro: 'Transporte', regimen: 'GENERAL', conciliado: 0.91, pendientes: 2, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 0, diferencias: 0 } },
  { id: '20605179496', ruc: '20605179496', razonSocial: 'Clínica Dental Sonrisa S.A.C.', rubro: 'Salud', regimen: 'RMT', conciliado: 0.83, pendientes: 5, alertas: { cobradoSinComprobante: 4, pagadoSinFactura: 0, diferencias: 0 } },
  { id: '20605188347', ruc: '20605188347', razonSocial: 'Librería y Bazar Mi Cole E.I.R.L.', rubro: 'Librería', regimen: 'RER', conciliado: 0.76, pendientes: 11, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 2, diferencias: 1 } },
  { id: '20605204598', ruc: '20605204598', razonSocial: 'Agroexportadora Valle Verde S.A.C.', rubro: 'Agroexportación', regimen: 'GENERAL', conciliado: 0.97, pendientes: 0, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 0, diferencias: 0 } },
  { id: '20605213449', ruc: '20605213449', razonSocial: 'Minimarket Don Lucho S.A.C.', rubro: 'Minimarket', regimen: 'RMT', conciliado: 0.88, pendientes: 3, alertas: { cobradoSinComprobante: 0, pagadoSinFactura: 1, diferencias: 0 } },
]
