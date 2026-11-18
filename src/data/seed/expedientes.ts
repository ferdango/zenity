import type { Segmento } from '../../config/credit.ts'

/** Expedientes de ejemplo que ya llegaron al BCP (resumidos), para poblar la vista del banco. */
export interface ExpedienteResumen {
  id: string
  negocio: string
  ruc: string
  rubro: string
  score: number
  segmento: Segmento
  ventasMes: number
  montoSugerido: number
  plazo: number
  senales: string[]
  estado: 'ENVIADA' | 'PRE_APROBADA' | 'NO_POR_AHORA'
}

export const EXPEDIENTES_EJEMPLO: ExpedienteResumen[] = [
  { id: '20605204598', negocio: 'Agroexportadora Valle Verde S.A.C.', ruc: '20605204598', rubro: 'Agroexportación', score: 88, segmento: 'A', ventasMes: 184000, montoSugerido: 60000, plazo: 18, senales: [], estado: 'PRE_APROBADA' },
  { id: '20605135952', negocio: 'Textiles Gamarra Andina S.A.C.', ruc: '20605135952', rubro: 'Textil', score: 81, segmento: 'A', ventasMes: 68500, montoSugerido: 25000, plazo: 12, senales: [], estado: 'PRE_APROBADA' },
  { id: '20605179496', negocio: 'Clínica Dental Sonrisa S.A.C.', ruc: '20605179496', rubro: 'Salud', score: 66, segmento: 'B', ventasMes: 52300, montoSugerido: 15000, plazo: 12, senales: ['Cobros sin comprobante'], estado: 'ENVIADA' },
  { id: '20605153284', negocio: 'Panificadora La Espiga S.A.C.', ruc: '20605153284', rubro: 'Panadería', score: 57, segmento: 'C', ventasMes: 41200, montoSugerido: 6000, plazo: 12, senales: ['Ventas −9%', 'Caja para 11 días'], estado: 'ENVIADA' },
  { id: '20605213449', negocio: 'Minimarket Don Lucho S.A.C.', ruc: '20605213449', rubro: 'Minimarket', score: 43, segmento: 'D', ventasMes: 23800, montoSugerido: 0, plazo: 12, senales: ['Ventas −22%', 'Caja para 6 días', 'Facturas vencidas'], estado: 'NO_POR_AHORA' },
]
