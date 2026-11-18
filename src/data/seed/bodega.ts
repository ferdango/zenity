/**
 * Negocio secundario: «Bodega Doña Rosa» (Nuevo RUS categoría 2, sin trabajadores).
 * Solo emite boletas y no lleva registros en SIRE: se concilia en dos vías (banco + boletas emitidas).
 * Sus ingresos están cerca del tope anual del NRUS (S/ 96,000) para mostrar el aviso del simulador.
 */
import type { BusinessData, DemoBusiness } from '../../domain/types.ts'
import { addDays } from '../../domain/util.ts'
import { SeedBuilder } from './builder.ts'

export const BODEGA_ID = '10456789001'

const BUSINESS: DemoBusiness = {
  id: BODEGA_ID,
  ruc: BODEGA_ID,
  razonSocial: 'Huamán Quispe Rosa',
  nombreComercial: 'Bodega Doña Rosa',
  rubro: 'Bodega',
  regimenTributario: 'NRUS',
  regimenLaboral: 'MICRO_REMYPE',
  trabajadores: 0,
  sueldoPromedio: 0,
  contadorId: 'contador-luis',
  telefonoWhatsApp: '987123457',
  dueno: { nombres: 'Rosa', apellidos: 'Huamán Quispe' },
  dosVias: true,
  cuentaBcp: '191-8765432-0-45',
  cci: '002-191-008765432045-18',
}

const VECINOS = ['Teresa Chávez', 'Mario Gonzales', 'Lidia Ramos', 'Óscar Peña', 'Julia Carbajal', 'Wilmer Soto', 'Nancy Huerta', 'Fredy Cruz']

const PROVEEDORES = [
  { nombre: 'Distribuidora Alicorp Lima Sur', glosa: 'TRANSF. A DISTRIBUIDORA ALICORP' },
  { nombre: 'Gloria Distribución Mayorista', glosa: 'TRANSF. A GLORIA MAYORISTA' },
  { nombre: 'Backus Distribuidor Zona 4', glosa: 'TRANSF. A BACKUS DISTRIBUIDOR' },
  { nombre: 'Arca Continental Lindley', glosa: 'TRANSF. A ARCA CONTINENTAL' },
]

/** Historial de boletas de los 12 meses anteriores (agosto 2025 – julio 2026). */
const HISTORIAL = [
  { mes: '2025-08', ventas: 6980, compras: 5120 },
  { mes: '2025-09', ventas: 7040, compras: 5210 },
  { mes: '2025-10', ventas: 7160, compras: 5300 },
  { mes: '2025-11', ventas: 7230, compras: 5350 },
  { mes: '2025-12', ventas: 7950, compras: 5880 },
  { mes: '2026-01', ventas: 7120, compras: 5260 },
  { mes: '2026-02', ventas: 7080, compras: 5230 },
  { mes: '2026-03', ventas: 7310, compras: 5400 },
  { mes: '2026-04', ventas: 7280, compras: 5390 },
  { mes: '2026-05', ventas: 7420, compras: 5490 },
  { mes: '2026-06', ventas: 7390, compras: 5470 },
  { mes: '2026-07', ventas: 7560, compras: 5590 },
]

export function seedBodega(): BusinessData {
  const b = new SeedBuilder(BUSINESS, 10456789)
  b.reserve(26.5, 54, 1180)

  // Lunes: depósito del efectivo del fin de semana, que coincide con las boletas al contado del domingo
  const lunes = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']
  for (const dia of lunes) {
    const domingo = addDays(dia, -1)
    const montos = Array.from({ length: 4 }, () => b.amount(240, 420, 0.5))
    for (const m of montos) b.boleta(domingo, 'Clientes varios', m)
    b.mov(`${dia}T08:40`, montos.reduce((s, x) => s + x, 0), 'DEPOSITO EFECTIVO AGENTE BCP', { canal: 'DEPOSITO_EFECTIVO' })
  }

  // Yapes de vecinos con su boleta
  for (let i = 0; i < 70; i++) {
    const dia = addDays('2026-08-01', Math.floor((i * 108) / 70))
    const nombre = b.pick(VECINOS)
    const monto = b.amount(8, 75, 0.5)
    b.boleta(dia, nombre, monto)
    b.yape(`${dia}T${String(8 + (i % 12)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`, monto, nombre)
  }
  // Dos Yapes sin boleta
  b.yape('2026-11-06T19:10', 26.5, 'Wilmer Soto')
  b.yape('2026-11-14T12:30', 54, 'Lidia Ramos')

  // Compras a distribuidores (sin registro de compras en el NRUS)
  for (let i = 0; i < 30; i++) {
    const dia = addDays('2026-08-04', i * 3 + (i % 2))
    if (dia > '2026-11-17') break
    const p = PROVEEDORES[i % PROVEEDORES.length]
    b.mov(`${dia}T10:${String(10 + i).padStart(2, '0')}`, -b.amount(380, 760), p.glosa, { nombre: p.nombre })
  }

  // Cuota mensual del Nuevo RUS (categoría 2)
  for (const dia of ['2026-08-17', '2026-09-17', '2026-10-16', '2026-11-17']) b.mov(`${dia}T09:00`, -50, 'PAGO SUNAT NRUS CAT 2', { nombre: 'SUNAT' })

  // Personales y un movimiento ambiguo
  b.mov('2026-11-08T13:15', -132.4, 'COMPRA POS TOTTUS VILLA EL SALVADOR')
  b.mov('2026-10-17T21:40', -38.9, 'RAPPI*RESTAURANTES PERU')
  b.mov('2026-11-12T11:20', -1180, 'TRANSF. A C. VILCHEZ', { nombre: 'C. Vílchez', canal: 'TRANSFERENCIA' })

  return b.build(3480, { contactos: {}, historialMensual: HISTORIAL })
}
