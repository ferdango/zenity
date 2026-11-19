/**
 * Negocio principal de la demo: «Ferretería San Martín» (RMT, pequeña empresa REMYPE, 4 trabajadores).
 * Agosto a noviembre de 2026; hoy es 18/11/2026. RUCs, nombres y teléfonos ficticios.
 *
 * Los 14 casos obligatorios del brief están marcados con «CASO n».
 */
import type { BusinessData, Comprobante, DemoBusiness } from '../../domain/types.ts'
import { addDays, diffDays, monthOf, round2 } from '../../domain/util.ts'
import { SeedBuilder } from './builder.ts'

export const FERRETERIA_ID = '20605125990'

const BUSINESS: DemoBusiness = {
  id: FERRETERIA_ID,
  ruc: FERRETERIA_ID,
  razonSocial: 'Ferretería San Martín E.I.R.L.',
  nombreComercial: 'Ferretería San Martín',
  rubro: 'Ferretería',
  regimenTributario: 'RMT',
  regimenLaboral: 'PEQUENA_REMYPE',
  trabajadores: 4,
  sueldoPromedio: 1400,
  telefonoWhatsApp: '987123456',
  dueno: { nombres: 'Rosa', apellidos: 'Huamán Quispe' },
  cuentaBcp: '191-2345678-0-12',
  cci: '002-191-002345678012-56',
}

/** Clientes con factura (RUC 20…). */
const CLIENTES = {
  llanos: { nombre: 'Constructora Llanos S.A.C.', ruc: '20548711203' },
  pachacamac: { nombre: 'Servicios Generales Pachacámac S.A.C.', ruc: '20602233445' },
  valleSur: { nombre: 'Inversiones Valle Sur S.A.C.', ruc: '20605544112' },
  metalica: { nombre: 'Corporación Metálica Ate S.A.C.', ruc: '20601239876' },
  lurin: { nombre: 'Proyectos Civiles Lurín E.I.R.L.', ruc: '20604561234' },
  // Casos obligatorios
  minera: { nombre: 'Minera Santa Inés S.A.', ruc: '20100345678' },
  edifica: { nombre: 'Grupo Edifica Perú S.A.C.', ruc: '20601877412' },
  andina: { nombre: 'Corporación Andina de Obras S.A.C.', ruc: '20556677881' },
  hidrotech: { nombre: 'Hidrotech Solutions S.R.L.', ruc: '20605566770' },
  molina: { nombre: 'Estudio Arquitectura Molina S.A.C.', ruc: '20603344556' },
  rimac: { nombre: 'Multiservicios Rímac E.I.R.L.', ruc: '20604433221' },
  gardenias: { nombre: 'Condominio Las Gardenias', ruc: '20607788990' },
  huanuco: { nombre: 'Obras y Proyectos Huánuco S.A.C.', ruc: '20609911223' },
  vega: { nombre: 'Talleres Mecánicos Vega S.A.C.', ruc: '20608822334' },
}

const PROVEEDORES = {
  aceros: { nombre: 'Distribuidora Aceros del Norte S.A.C.', ruc: '20450012345' },
  cementos: { nombre: 'Cementos y Agregados Lima S.A.C.', ruc: '20460023456' },
  pinturas: { nombre: 'Pinturas Andinas S.A.', ruc: '20470034567' },
  tubos: { nombre: 'Importadora Tubos del Pacífico S.A.C.', ruc: '20480045678' },
  electricos: { nombre: 'Eléctricos Industriales Unión S.A.C.', ruc: '20490056789' },
  local: { nombre: 'Inmobiliaria San Borja S.A.C.', ruc: '20500067890' },
  luz: { nombre: 'Luz del Sur S.A.A.', ruc: '20331898008' },
  movistar: { nombre: 'Telefónica del Perú S.A.A.', ruc: '20100017491' },
  contador: { nombre: 'Paredes & Asociados S.A.C.', ruc: '20511223344' },
}

const YAPEROS = [
  'María Torres',
  'José Quispe',
  'Lucía Ramos',
  'Carmen Flores',
  'Jorge Salinas',
  'Ana Gutiérrez',
  'Luis Chávez',
  'Rosa Medina',
  'Miguel Vargas',
  'Elena Rojas',
  'Raúl Paz',
  'Sofía León',
  'Diego Ríos',
  'Patricia Soto',
  'Hugo Tello',
  'Gladys Núñez',
]

const MESES = ['2026-08', '2026-09', '2026-10', '2026-11'] as const
const d = (mes: string, dia: number) => `${mes}-${String(dia).padStart(2, '0')}`
const t = (fecha: string, hora: string) => `${fecha}T${hora}`

/** Historial SIRE de los 12 meses anteriores (agosto 2025 – julio 2026), sin IGV. */
const HISTORIAL = [
  { mes: '2025-08', ventas: 26140, compras: 15980 },
  { mes: '2025-09', ventas: 27310, compras: 16720 },
  { mes: '2025-10', ventas: 28420, compras: 17310 },
  { mes: '2025-11', ventas: 29580, compras: 18090 },
  { mes: '2025-12', ventas: 38870, compras: 23810 },
  { mes: '2026-01', ventas: 25230, compras: 15420 },
  { mes: '2026-02', ventas: 26040, compras: 15870 },
  { mes: '2026-03', ventas: 28910, compras: 17640 },
  { mes: '2026-04', ventas: 29380, compras: 17920 },
  { mes: '2026-05', ventas: 30150, compras: 18360 },
  { mes: '2026-06', ventas: 29960, compras: 18270 },
  { mes: '2026-07', ventas: 31620, compras: 19290 },
]

/** IGV + pago a cuenta de renta (RMT 1%) + EsSalud del periodo, calculado desde los comprobantes. */
function impuestosDelPeriodo(comps: readonly Comprobante[], mes: string, essalud: number): number {
  const delMes = comps.filter((c) => monthOf(c.fechaEmision) === mes)
  const tc = (c: Comprobante) => (c.moneda === 'USD' ? 3.78 : 1)
  const signo = (c: Comprobante) => (c.tipo === 'NOTA_CREDITO' ? -1 : c.tipo === 'RETENCION' ? 0 : 1)
  const igvVentas = delMes.filter((c) => c.direccion === 'VENTA').reduce((a, c) => a + signo(c) * c.igv * tc(c), 0)
  const baseVentas = delMes.filter((c) => c.direccion === 'VENTA').reduce((a, c) => a + signo(c) * c.base * tc(c), 0)
  const igvCompras = delMes.filter((c) => c.direccion === 'COMPRA').reduce((a, c) => a + c.igv, 0)
  return round2(Math.max(0, igvVentas - igvCompras) + baseVentas * 0.01 + essalud)
}

export function seedFerreteria(): BusinessData {
  const b = new SeedBuilder(BUSINESS, 18112026)

  // Montos de los casos obligatorios: el relleno no se acerca a ellos
  b.reserve(3186, 2000, 1760, 5000, 4850, 1420.5, 2118, 986.4, 4524.9, 4722.5, 38, 115, 72.5, 2950, 1180, 3540, 1630)
  b.reserve(1275, 845, 2360, 1416, 3068, 413, 2655, 380, 420, 265, 1500, 95.5, 600, 2500, 149.9, 5600, 1400, 980, 18.5, 450)

  /* ── Ventas de relleno: facturas al contado pagadas por transferencia ── */
  const contado: Record<string, number[]> = {
    '2026-08': [3, 6, 10, 13, 17, 21, 26, 28],
    '2026-09': [2, 8, 11, 15, 18, 23, 28],
    '2026-10': [1, 6, 8, 13, 15, 20, 23, 29],
    '2026-11': [3, 5, 10, 12, 16],
  }
  const relleno = [CLIENTES.llanos, CLIENTES.pachacamac, CLIENTES.valleSur, CLIENTES.metalica, CLIENTES.lurin]
  let n = 0
  for (const mes of MESES) {
    for (const dia of contado[mes]) {
      n++
      const cliente = b.pick(relleno)
      const total = b.amount(900, 2500)
      const emision = d(mes, dia)
      // Las constructoras suelen pagar a 15 días; si el cobro caería después de hoy, la venta es al contado
      const cuota = addDays(emision, 15)
      const aCredito = n % 3 === 0 && addDays(cuota, 1) <= '2026-11-17'
      const dias = aCredito ? diffDays(emision, cuota) + Math.floor(b.rand() * 2) : Math.floor(b.rand() * 3)
      // Nada después de hoy (18/11 en la mañana)
      const pago = addDays(emision, dias) > '2026-11-17' ? '2026-11-17' : addDays(emision, dias)
      b.venta(emision, cliente.nombre, total, aCredito ? { ruc: cliente.ruc, cuota } : { ruc: cliente.ruc })
      b.mov(t(pago, `${10 + Math.floor(b.rand() * 7)}:${String(Math.floor(b.rand() * 60)).padStart(2, '0')}`), total, `TRANSF. ${cliente.nombre.toUpperCase()}`, cliente)
    }
  }

  /* ── Facturas a crédito pagadas a tiempo (para los días promedio de cobro) ── */
  const credito: Array<[string, string, string, typeof CLIENTES.llanos]> = [
    ['2026-08-05', '2026-08-20', '2026-08-21T11:20', CLIENTES.llanos],
    ['2026-08-12', '2026-08-27', '2026-08-27T15:05', CLIENTES.pachacamac],
    ['2026-09-03', '2026-09-18', '2026-09-18T10:40', CLIENTES.metalica],
    ['2026-09-14', '2026-09-29', '2026-09-30T09:55', CLIENTES.llanos],
    ['2026-10-02', '2026-10-17', '2026-10-19T16:10', CLIENTES.valleSur],
    ['2026-10-22', '2026-11-06', '2026-11-06T12:30', CLIENTES.lurin],
    ['2026-10-27', '2026-11-11', '2026-11-12T10:15', CLIENTES.pachacamac],
  ]
  for (const [emision, cuota, pago, cliente] of credito) {
    const total = b.amount(1200, 3300)
    b.venta(emision, cliente.nombre, total, { ruc: cliente.ruc, cuota })
    b.mov(pago, total, `TRANSF. ${cliente.nombre.toUpperCase()}`, cliente)
  }

  /* ── Yapes con boleta ── */
  for (const mes of MESES) {
    const ultimo = mes === '2026-11' ? 17 : mes === '2026-09' ? 30 : 31
    for (let dia = 1; dia <= ultimo; dia += 2 + Math.floor(b.rand() * 2)) {
      const fecha = d(mes, dia)
      const nombre = b.pick(YAPEROS)
      const total = b.amount(18, 190, 0.5)
      b.boleta(fecha, b.rand() < 0.6 ? nombre : 'Clientes varios', total)
      b.yape(t(fecha, `${11 + Math.floor(b.rand() * 8)}:${String(Math.floor(b.rand() * 60)).padStart(2, '0')}`), total, nombre)
    }
  }

  /* ── Compras: proveedores recurrentes y esporádicos (todas con factura) ── */
  const aceros: Array<[string, string, number]> = [
    ['2026-08-20', '2026-08-20T16:40', 4120.4],
    ['2026-09-19', '2026-09-21T10:05', 4286],
    ['2026-10-20', '2026-10-20T15:30', 3978.6],
    ['2026-11-17', '2026-11-17T11:45', 4195.3],
  ]
  const cementos: Array<[string, string, number]> = [
    ['2026-08-07', '2026-08-08T09:30', 2180],
    ['2026-09-08', '2026-09-08T10:15', 2265.5],
    ['2026-10-08', '2026-10-09T09:50', 2090.8],
    ['2026-11-06', '2026-11-09T10:20', 2240],
  ]
  for (const [p, lista] of [[PROVEEDORES.aceros, aceros], [PROVEEDORES.cementos, cementos]] as const) {
    for (const [emision, pago, total] of lista) {
      b.compra(emision, p.nombre, p.ruc, total)
      b.mov(pago, -total, `TRANSF. A ${p.nombre.toUpperCase()}`, p)
    }
  }
  const esporadicas: Array<[string, string, typeof PROVEEDORES.pinturas, number, number]> = [
    ['2026-08-12', '2026-08-13T12:10', PROVEEDORES.electricos, 1100, 1700],
    ['2026-08-24', '2026-08-25T10:00', PROVEEDORES.pinturas, 1700, 2100],
    ['2026-09-10', '2026-09-11T11:35', PROVEEDORES.tubos, 2200, 2600],
    ['2026-09-24', '2026-09-24T17:20', PROVEEDORES.pinturas, 1100, 1300],
    ['2026-10-13', '2026-10-14T09:40', PROVEEDORES.electricos, 1650, 1900],
    ['2026-11-10', '2026-11-10T14:25', PROVEEDORES.electricos, 900, 1050],
  ]
  for (const [emision, pago, p, min, max] of esporadicas) {
    const total = b.amount(min, max)
    b.compra(emision, p.nombre, p.ruc, total)
    b.mov(pago, -total, `TRANSF. A ${p.nombre.toUpperCase()}`, p)
  }

  /* ── Compras de temporada: la ferretería se abastece para diciembre ── */
  const temporada: Array<[string, string, typeof PROVEEDORES.pinturas, number]> = [
    ['2026-10-30', '2026-10-30T15:10', PROVEEDORES.tubos, 5920.6],
    ['2026-11-13', '2026-11-13T16:30', PROVEEDORES.pinturas, 4870.2],
  ]
  for (const [emision, pago, p, total] of temporada) {
    b.compra(emision, p.nombre, p.ruc, total)
    b.mov(pago, -total, `TRANSF. A ${p.nombre.toUpperCase()}`, p)
  }

  /* ── Gastos fijos con factura: alquiler, luz, internet y contador ── */
  const luz = [312.4, 298.7, 335.1, 341.8]
  MESES.forEach((mes, i) => {
    b.compra(d(mes, 1), PROVEEDORES.local.nombre, PROVEEDORES.local.ruc, 2500)
    b.mov(t(d(mes, 5), '09:10'), -2500, 'TRANSF. ALQUILER LOCAL INMOB SAN BORJA', PROVEEDORES.local)
    b.compra(d(mes, 3), PROVEEDORES.luz.nombre, PROVEEDORES.luz.ruc, luz[i], { cuota: d(mes, 18) })
    b.mov(t(d(mes, 12), '08:45'), -luz[i], 'PAGO LUZ DEL SUR SUM 0451287', PROVEEDORES.luz)
    b.compra(d(mes, 1), PROVEEDORES.movistar.nombre, PROVEEDORES.movistar.ruc, 149.9, { cuota: d(mes, 20) })
    b.mov(t(d(mes, mes === '2026-11' ? 16 : 15), '07:30'), -149.9, 'PAGO MOVISTAR INTERNET FIBRA', PROVEEDORES.movistar)
    b.compra(d(mes, 2), PROVEEDORES.contador.nombre, PROVEEDORES.contador.ruc, 450)
    b.mov(t(d(mes, 3), '12:00'), -450, 'TRANSF. ESTUDIO CONTABLE PAREDES', PROVEEDORES.contador)
  })

  /* ── Gastos fijos sin factura: planilla, préstamo, comisiones ── */
  for (const fecha of ['2026-08-31', '2026-09-30', '2026-10-30']) {
    b.mov(t(fecha, '18:00'), -5600, `PAGO HABERES PLANILLA ${fecha.slice(5, 7)}/2026`)
  }
  b.mov('2026-11-13T09:00', -1400, 'DEPOSITO CTS NOV-2026 (4 TRAB.)')
  for (const fecha of ['2026-08-25', '2026-09-25', '2026-10-26']) b.mov(t(fecha, '06:15'), -980, 'CUOTA PRESTAMO BCP 0012345', { nombre: 'BCP Préstamo capital de trabajo' })
  for (const fecha of ['2026-08-31', '2026-09-30', '2026-10-31']) b.mov(t(fecha, '23:50'), -18.5, 'COMISION MANTENIMIENTO CTA')

  /* ── CASO 1 · factura pagada exacta dentro de ±3 días ── */
  b.venta('2026-11-02', CLIENTES.llanos.nombre, 3186, { ruc: CLIENTES.llanos.ruc })
  b.mov('2026-11-04T11:12', 3186, 'TRANSF. CONSTRUCTORA LLANOS SAC', CLIENTES.llanos)

  /* ── CASO 2 · servicio de S/ 2,000 con detracción 12% → abono de S/ 1,760 ── */
  b.venta('2026-10-22', CLIENTES.minera.nombre, 2000, { ruc: CLIENTES.minera.ruc, detraccion: 0.12, cuota: '2026-10-27' })
  b.mov('2026-10-27T10:05', 1760, 'TRANSF. MINERA SANTA INES SA', CLIENTES.minera)

  /* ── CASO 3 · S/ 5,000 a un agente de retención → abono de S/ 4,850 ── */
  const edifica = b.venta('2026-10-09', CLIENTES.edifica.nombre, 5000, { ruc: CLIENTES.edifica.ruc, agenteRetencion: true, cuota: '2026-10-14' })
  b.comp('RETENCION', 'VENTA', '2026-10-14', CLIENTES.edifica.nombre, 150, { ruc: CLIENTES.edifica.ruc, referenciaId: edifica.id })
  b.mov('2026-10-14T15:40', 4850, 'TRANSF. GRUPO EDIFICA PERU SAC', CLIENTES.edifica)

  /* ── CASO 4 · 23 boletas de un sábado con tarjeta → una liquidación POS el lunes ── */
  const ventasPos = Array.from({ length: 23 }, () => b.amount(22, 165, 0.5))
  for (const monto of ventasPos) b.boleta('2026-11-07', 'Clientes varios', monto)
  const lote = b.pos('2026-11-07', ventasPos, '2026-11-09', 0.0344)
  b.mov('2026-11-09T08:15', lote.neto, `ABONO LIQUIDACION NIUBIZ ${lote.loteId}`, { nombre: 'Niubiz', canal: 'POS_LIQUIDACION' })

  /* ── CASO 5 · un cliente paga 3 facturas con una sola transferencia ── */
  b.venta('2026-10-05', CLIENTES.andina.nombre, 1420.5, { ruc: CLIENTES.andina.ruc, cuota: '2026-10-20' })
  b.venta('2026-10-12', CLIENTES.andina.nombre, 2118, { ruc: CLIENTES.andina.ruc, cuota: '2026-10-27' })
  b.venta('2026-10-19', CLIENTES.andina.nombre, 986.4, { ruc: CLIENTES.andina.ruc, cuota: '2026-11-03' })
  b.mov('2026-10-27T16:20', 4524.9, 'TRANSF. CORPORACION ANDINA DE OBRAS', CLIENTES.andina)

  /* ── CASO 6 · factura en dólares cobrada en soles ── */
  b.venta('2026-10-20', CLIENTES.hidrotech.nombre, 1250, { ruc: CLIENTES.hidrotech.ruc, moneda: 'USD', cuota: '2026-10-25' })
  b.mov('2026-10-26T12:45', 4722.5, 'TRANSF. HIDROTECH SOLUTIONS SRL', CLIENTES.hidrotech)

  /* ── CASO 7 · 3 Yapes sin boleta emitida ── */
  b.yape('2026-11-03T18:22', 38, 'Lucía Fernández')
  b.yape('2026-11-10T13:05', 115, 'Carlos Mendoza')
  b.yape('2026-11-16T17:48', 72.5, 'Ana Paredes')

  /* ── CASO 8 · 4 facturas a crédito sin cobrar (vencida hace 45 días, hace 10 y dos por vencer) ── */
  b.venta('2026-09-04', CLIENTES.rimac.nombre, 2950, { ruc: CLIENTES.rimac.ruc, cuota: '2026-10-04' })
  b.venta('2026-10-09', CLIENTES.gardenias.nombre, 1180, { ruc: CLIENTES.gardenias.ruc, cuota: '2026-11-08' })
  b.venta('2026-10-31', CLIENTES.huanuco.nombre, 3540, { ruc: CLIENTES.huanuco.ruc, cuota: '2026-11-30' })
  b.venta('2026-11-15', CLIENTES.vega.nombre, 1630, { ruc: CLIENTES.vega.ruc, cuota: '2026-12-15' })

  /* ── CASO 9 · 2 pagos a proveedores sin factura recibida ── */
  b.mov('2026-10-21T11:30', -1275, 'TRANSF. A COMERCIAL FERRETERA HUARAZ', { nombre: 'Comercial Ferretera Huaraz' })
  b.mov('2026-11-06T10:50', -845, 'TRANSF. A MADERERA UCAYALI EIRL', { nombre: 'Maderera Ucayali E.I.R.L.' })

  /* ── CASO 10 · 2 facturas de compra todavía no pagadas ── */
  b.compra('2026-10-26', PROVEEDORES.pinturas.nombre, PROVEEDORES.pinturas.ruc, 2360, { cuota: '2026-11-25' })
  b.compra('2026-11-02', PROVEEDORES.tubos.nombre, PROVEEDORES.tubos.ruc, 1416, { cuota: '2026-12-02' })

  /* ── CASO 11 · gastos personales (los 6 de noviembre suman S/ 820) ── */
  const personales: Array<[string, number, string, string?]> = [
    // agosto
    ['2026-08-03T03:12', 44.9, 'NETFLIX.COM LIMA'],
    ['2026-08-08T10:05', 350, 'PAGO COLEGIO SAN AGUSTIN PENSION'],
    ['2026-08-16T13:20', 289.5, 'COMPRA POS WONG BENAVIDES'],
    ['2026-08-22T20:40', 74, 'COMPRA POS CINEPLANET SAN MIGUEL'],
    ['2026-08-28T22:30', 61.2, 'RAPPI*RESTAURANTES PERU'],
    ['2026-08-30T11:00', 400, 'TRANSF. A KEVIN HUAMAN', 'Kevin Huamán'],
    // septiembre
    ['2026-09-03T03:12', 44.9, 'NETFLIX.COM LIMA'],
    ['2026-09-05T10:10', 350, 'PAGO COLEGIO SAN AGUSTIN PENSION'],
    ['2026-09-13T12:45', 312.6, 'COMPRA POS PLAZA VEA SURCO'],
    ['2026-09-18T23:05', 66.4, 'RAPPI*RESTAURANTES PERU'],
    ['2026-09-19T10:30', 300, 'TRANSF. A KEVIN HUAMAN', 'Kevin Huamán'],
    ['2026-09-26T19:15', 86, 'COMPRA POS CINEPLANET SAN MIGUEL'],
    // octubre
    ['2026-10-03T03:12', 44.9, 'NETFLIX.COM LIMA'],
    ['2026-10-03T09:50', 350, 'PAGO COLEGIO SAN AGUSTIN PENSION'],
    ['2026-10-18T13:10', 274.2, 'COMPRA POS PLAZA VEA SURCO'],
    ['2026-10-22T22:15', 49.9, 'RAPPI*RESTAURANTES PERU'],
    ['2026-10-25T12:30', 198.4, 'COMPRA POS TOTTUS LA MOLINA'],
    // noviembre: supermercado domingo, streaming, pensión, cine, delivery de noche y un familiar
    ['2026-11-15T13:40', 245.3, 'COMPRA POS PLAZA VEA SURCO'],
    ['2026-11-03T03:12', 44.9, 'NETFLIX.COM LIMA'],
    ['2026-11-07T10:05', 350, 'PAGO COLEGIO SAN AGUSTIN PENSION'],
    ['2026-11-14T20:30', 62, 'COMPRA POS CINEPLANET SAN MIGUEL'],
    ['2026-11-11T22:40', 57.8, 'RAPPI*RESTAURANTES PERU'],
    ['2026-11-08T11:00', 60, 'TRANSF. A KEVIN HUAMAN', 'Kevin Huamán'],
  ]
  for (const [fecha, monto, glosa, nombre] of personales) {
    b.mov(fecha, -monto, glosa, { nombre, canal: nombre ? 'TRANSFERENCIA' : 'CARGO' })
  }

  /* ── CASO 12 · 6 movimientos ambiguos (glosa poco clara, monto nuevo) ── */
  b.mov('2026-10-22T10:20', -380, 'TRANSF. A J. CARDENAS', { nombre: 'J. Cárdenas', canal: 'TRANSFERENCIA' })
  b.mov('2026-11-12T11:05', -420, 'TRANSF. A J. CARDENAS', { nombre: 'J. Cárdenas', canal: 'TRANSFERENCIA' })
  b.mov('2026-11-04T15:30', -265, 'PAGO VARIOS 00451')
  b.mov('2026-11-05T12:10', 1500, 'ABONO TRANSF. INTERBANCARIA', { nombre: 'Inversiones Kallpa' })
  b.mov('2026-11-09T16:45', -95.5, 'CARGO POR OPERACION 8812')
  b.mov('2026-11-13T14:00', -600, 'TRANSF. A M. SALAZAR R.', { nombre: 'M. Salazar R.', canal: 'TRANSFERENCIA' })

  /* ── CASO 13 · nota de crédito que reduce una factura ── */
  const molina = b.venta('2026-09-08', CLIENTES.molina.nombre, 3068, { ruc: CLIENTES.molina.ruc, cuota: '2026-09-23' })
  b.comp('NOTA_CREDITO', 'VENTA', '2026-09-15', CLIENTES.molina.nombre, 413, { ruc: CLIENTES.molina.ruc, referenciaId: molina.id })
  b.mov('2026-09-24T10:30', 2655, 'TRANSF. ESTUDIO ARQUITECTURA MOLINA', CLIENTES.molina)

  /* ── CASO 14 · depósito del efectivo de la caja del día ── */
  const efectivo = Array.from({ length: 6 }, () => b.amount(35, 230, 0.5))
  for (const monto of efectivo) b.boleta('2026-11-13', 'Clientes varios', monto)
  b.mov('2026-11-14T09:20', round2(efectivo.reduce((a, x) => a + x, 0)), 'DEPOSITO EFECTIVO VENTANILLA', { canal: 'DEPOSITO_EFECTIVO' })

  /* ── Impuestos del mes (IGV + renta + EsSalud), pagados al vencimiento (último dígito 0 → día 16) ── */
  const essalud = BUSINESS.trabajadores * BUSINESS.sueldoPromedio * 0.09
  const julio = round2((HISTORIAL[11].ventas - HISTORIAL[11].compras) * 0.18 + HISTORIAL[11].ventas * 0.01 + essalud)
  b.mov('2026-08-14T10:00', -julio, 'PAGO SUNAT NPS 1062 PERIODO 07/2026', { nombre: 'SUNAT' })
  for (const [mes, fecha] of [['2026-08', '2026-09-16'], ['2026-09', '2026-10-16'], ['2026-10', '2026-11-16']] as const) {
    b.mov(t(fecha, '10:00'), -impuestosDelPeriodo(b.comprobantes, mes, essalud), `PAGO SUNAT NPS 1062 PERIODO ${mes.slice(5)}/2026`, { nombre: 'SUNAT' })
  }

  return b.build(14950, {
    contactos: {
      [CLIENTES.rimac.ruc]: '987650045',
      [CLIENTES.gardenias.ruc]: '986400118',
      [CLIENTES.huanuco.ruc]: '985331207',
      [CLIENTES.vega.ruc]: '984220391',
      [CLIENTES.llanos.ruc]: '983114560',
    },
    historialMensual: HISTORIAL,
  })
}
