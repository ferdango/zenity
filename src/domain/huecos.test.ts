/** Huecos del MVP: pagos en partes, cobros atrasados, cierre de caja y carga del extracto. */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { seedFerreteria } from '../data/seed/ferreteria.ts'
import { proyectarCaja } from './cashflow.ts'
import { estadoCierres, eventoEfectivo } from './cierres.ts'
import { porCobrar, totalCobranzas } from './collections.ts'
import { analyze, saldoPendiente, type UserInputs } from './engine.ts'
import { canalDe, contraparteDe, leerExtracto, parseCsv, parseFecha, parseMonto, toCsv } from './extracto.ts'
import { extractoEjemplo } from './extractoEjemplo.ts'
import { cobrosTrasRecordatorio, diasDeCierre, errorProyecciones, saldoAl, sinIntervencion } from './metricas.ts'
import { reconcile } from './reconciliation.ts'
import type { BankMovement, CierreCaja, Comprobante } from './types.ts'

const HOY = '2026-11-18'
const data = seedFerreteria()
const BIZ = data.business.id
const base: UserInputs = { corrections: [], rules: [], extraMovements: [] }
const sinCambios = analyze(data, base)
const factura = (nombre: string) => data.comprobantes.find((c) => c.nombreContraparte === nombre && c.tipo === 'FACTURA' && sinCambios.comprobanteEstado.get(c.id) !== 'CONCILIADO')!

let n = 0
const abono = (fecha: string, monto: number, nombre: string, extra: Partial<BankMovement> = {}): BankMovement => ({
  id: `t-${++n}`,
  businessId: BIZ,
  fecha,
  monto,
  glosa: `TRANSF. ${nombre.toUpperCase()}`,
  numeroOperacion: String(900_000 + n),
  contraparteNombre: nombre,
  canal: 'TRANSFERENCIA',
  saldoDespues: 0,
  ...extra,
})

describe('pagos en partes (regla PARCIAL)', () => {
  const rimac = factura('Multiservicios Rímac E.I.R.L.')

  test('un abono de la mitad deja la factura abierta con lo que falta', () => {
    const a = analyze(data, { ...base, extraMovements: [abono('2026-11-17T18:12', 1475, 'Multiservicios Rimac EIRL')] })
    const match = a.matchByComprobante.get(rimac.id)!
    assert.equal(match.regla, 'PARCIAL')
    assert.equal(match.pendiente, 1475)
    assert.equal(match.confianza, 0.7)
    assert.match(match.motivo, /Pago a cuenta .* Faltan S\/ 1,475\.00 de S\/ 2,950\.00/)
    assert.equal(a.comprobanteEstado.get(rimac.id), 'COMPROBANTE_SIN_COBRO')
    assert.equal(saldoPendiente(a, rimac), 1475)
    // Cobrar y la caja usan lo que falta, no el total
    const lista = porCobrar(a, [], HOY)
    assert.equal(lista.find((c) => c.comprobante.id === rimac.id)?.monto, 1475)
    assert.equal(totalCobranzas(lista), 9300 - 1475)
  })

  test('el segundo abono completa la factura: queda conciliada', () => {
    const a = analyze(data, {
      ...base,
      extraMovements: [abono('2026-11-17T18:12', 1475, 'Multiservicios Rimac EIRL'), abono('2026-11-18T10:30', 1475, 'Multiservicios Rimac EIRL')],
    })
    const match = a.matchByComprobante.get(rimac.id)!
    assert.equal(match.regla, 'PARCIAL')
    assert.equal(match.movementIds.length, 2)
    assert.equal(match.pendiente, 0)
    assert.match(match.motivo, /en 2 abonos que suman S\/ 2,950\.00/)
    assert.equal(a.comprobanteEstado.get(rimac.id), 'CONCILIADO')
    assert.equal(totalCobranzas(porCobrar(a, [], HOY)), 9300 - 2950)
  })

  test('las cuotas del comprobante dan confianza alta', () => {
    const comp: Comprobante = {
      id: 'c1',
      businessId: 'b',
      tipo: 'FACTURA',
      direccion: 'VENTA',
      serie: 'F001',
      numero: '9',
      rucContraparte: '20111111111',
      nombreContraparte: 'Cliente Cuotas S.A.C.',
      fechaEmision: '2026-10-01',
      moneda: 'PEN',
      base: 847.46,
      igv: 152.54,
      total: 1000,
      formaPago: 'CREDITO',
      cuotas: [
        { fecha: '2026-10-31', monto: 500 },
        { fecha: '2026-11-30', monto: 500 },
      ],
    }
    const m = abono('2026-10-31T09:00', 500, 'Otra Razon', { contraparteRuc: '20111111111', businessId: 'b' })
    const [match] = reconcile({ movements: [m], comprobantes: [comp], posSales: [], posBatches: [], tipoCambio: () => 3.75 })
    assert.equal(match.regla, 'PARCIAL')
    assert.equal(match.confianza, 0.92)
    assert.equal(match.pendiente, 500)
    assert.match(match.motivo, /Es 1 de las 2 cuotas/)
  })

  test('un abono de otra empresa no se toma como pago a cuenta', () => {
    const a = analyze(data, { ...base, extraMovements: [abono('2026-11-17T18:12', 1475, 'Comercial Rímac Norte')] })
    assert.notEqual(a.matchByComprobante.get(rimac.id)?.regla, 'PARCIAL')
  })
})

describe('cobro atrasado (EXACTO fuera de la ventana)', () => {
  test('mismo monto y misma empresa, 10 días después del vencimiento', () => {
    const gardenias = factura('Condominio Las Gardenias')
    const a = analyze(data, { ...base, extraMovements: [abono('2026-11-18T09:05', 1180, 'Condominio Las Gardenias')] })
    const match = a.matchByComprobante.get(gardenias.id)!
    assert.equal(match.regla, 'EXACTO')
    assert.equal(match.confianza, 0.9)
    assert.match(match.motivo, /cobrada 10 días después de su vencimiento/)
    assert.equal(a.comprobanteEstado.get(gardenias.id), 'CONCILIADO')
  })
})

describe('cierre de caja (regla CIERRE)', () => {
  const deposito = data.movements.find((m) => m.canal === 'DEPOSITO_EFECTIVO')!
  const cierre = (fecha: string, efectivo: number, id = `cierre-${fecha}`): CierreCaja => ({ id, businessId: BIZ, fecha, efectivo, registrado: `${fecha}T20:00` })

  test('con el cierre registrado, el depósito se explica con confianza alta', () => {
    const a = analyze(data, { ...base, cierres: [cierre('2026-11-13', deposito.monto)] })
    const match = a.matchByMovement.get(deposito.id)!
    assert.equal(match.regla, 'CIERRE')
    assert.equal(match.confianza, 0.95)
    assert.equal(match.comprobanteIds.length, 6)
    assert.match(match.motivo, /cierre de caja del 13\/11\/2026 .* Emitiste 6 boletas al contado/)
    const [estado] = estadoCierres(a, [cierre('2026-11-13', deposito.monto)])
    assert.equal(estado.deposito?.id, deposito.id)
    assert.equal(estado.porDepositar, 0)
    assert.equal(estado.sinBoleta, 0)
  })

  test('si se contó más de lo depositado, lo demás quedó en caja y entra a la proyección', () => {
    const cierres = [cierre('2026-11-13', deposito.monto + 50)]
    const a = analyze(data, { ...base, cierres })
    const match = a.matchByMovement.get(deposito.id)!
    assert.equal(match.confianza, 0.85)
    assert.equal(match.enCaja, 50)
    assert.equal(match.sinBoleta, 50)
    const [estado] = estadoCierres(a, cierres)
    assert.equal(estado.porDepositar, 50)
    assert.equal(estado.sinBoleta, 50)
    const extra = eventoEfectivo(estadoCierres(a, cierres), HOY)
    assert.equal(extra[0].monto, 50)
    const caja = proyectarCaja(a, [], HOY, 30, extra)
    assert.ok(caja.eventos.some((e) => e.fuente === 'EFECTIVO'))
  })

  test('el efectivo sin boleta y el faltante se ven en el cierre', () => {
    const a = analyze(data, base)
    const [conMas] = estadoCierres(a, [cierre('2026-11-13', 2000)])
    assert.ok(conMas.sinBoleta > 0)
    assert.equal(conMas.porDepositar, 2000)
    const [conMenos] = estadoCierres(a, [cierre('2026-11-13', 10)])
    assert.ok(conMenos.faltante > 0)
  })

  test('sin cierres, el depósito sigue sugerido contra las boletas (caso 14)', () => {
    assert.equal(sinCambios.matchByMovement.get(deposito.id)?.regla, 'SUGERIDO')
  })
})

describe('extracto del banco (Excel o CSV)', () => {
  test('montos y fechas en los formatos de los bancos peruanos', () => {
    assert.equal(parseMonto('S/ 1,234.56'), 1234.56)
    assert.equal(parseMonto('-1,234.56'), -1234.56)
    assert.equal(parseMonto('(980.00)'), -980)
    assert.equal(parseMonto('1.234,56'), 1234.56)
    assert.equal(parseMonto('75,5'), 75.5)
    assert.equal(parseMonto('1,234.56-'), -1234.56)
    assert.equal(parseMonto(''), null)
    assert.equal(parseMonto('abc'), null)
    assert.deepEqual(parseFecha('17/11/2026'), { dia: '2026-11-17', hora: undefined })
    assert.deepEqual(parseFecha('17/11/26 10:15'), { dia: '2026-11-17', hora: '10:15' })
    assert.equal(parseFecha('2026-11-17')?.dia, '2026-11-17')
    assert.equal(parseFecha('46343')?.dia, '2026-11-17')
    assert.equal(parseFecha('31/13/2026'), null)
  })

  test('canal y contraparte salen de la glosa', () => {
    assert.equal(canalDe('ABONO LIQUIDACION NIUBIZ 0012', 500), 'POS_LIQUIDACION')
    assert.equal(canalDe('COMPRA POS WONG BENAVIDES', -80), 'CARGO')
    assert.equal(canalDe('DEPOSITO EFECTIVO VENTANILLA', 640), 'DEPOSITO_EFECTIVO')
    assert.equal(canalDe('YAPE DE LUCIA FERNANDEZ', 38), 'YAPE')
    assert.deepEqual(contraparteDe('TRANSF. MULTISERVICIOS RIMAC EIRL', 'TRANSFERENCIA'), { nombre: 'Multiservicios Rimac EIRL', ruc: undefined })
    assert.equal(contraparteDe('TRAN.CTAS.TERC. 20604433221 RIMAC', 'TRANSFERENCIA').ruc, '20604433221')
    assert.equal(contraparteDe('COMISION MANTENIMIENTO CTA', 'CARGO').nombre, undefined)
  })

  test('CSV con «;», comillas y columnas de cargo y abono', () => {
    const csv = 'Extracto de la cuenta 191-1234567-0-12\n\nFec. Operación;Concepto;Cargo;Abono;Saldo contable\n17/11/2026;"TRANSF. A PINTURAS ANDINAS SA";"2,360.00";;8,295.66\n17/11/2026;YAPE DE ANA;;72.50;8,368.16\nSaldo final;;;;8,368.16\n'
    const rows = parseCsv(csv)
    const r = leerExtracto(rows, { businessId: BIZ, existentes: [] })
    assert.deepEqual(Object.keys(r.columnas).sort(), ['abono', 'cargo', 'descripcion', 'fecha', 'saldo'])
    assert.equal(r.nuevos.length, 2)
    assert.equal(r.nuevos[0].monto, -2360)
    assert.equal(r.nuevos[0].contraparteNombre, 'Pinturas Andinas SA')
    assert.equal(r.nuevos[1].canal, 'YAPE')
    assert.equal(r.nuevos[1].saldoDespues, 8368.16)
    assert.equal(r.errores.length, 0)
  })

  test('sin cabecera reconocible devuelve un error claro', () => {
    const r = leerExtracto([['a', 'b'], ['1', '2']], { businessId: BIZ, existentes: [] })
    assert.equal(r.nuevos.length, 0)
    assert.match(r.errores[0].motivo, /No encontramos las columnas/)
  })

  test('el extracto de ejemplo (formato BCP) se lee, no duplica y el motor lo concilia', () => {
    const rows = extractoEjemplo(sinCambios, HOY)
    assert.deepEqual(rows[0].slice(0, 5), ['Fecha', 'Fecha valuta', 'Descripción operación', 'Monto', 'Saldo'])
    // Ida y vuelta por CSV, como lo descarga el usuario
    const r = leerExtracto(parseCsv(toCsv(rows)), { businessId: BIZ, existentes: data.movements })
    assert.equal(r.repetidos, 1)
    assert.equal(r.errores.length, 0)
    assert.equal(r.nuevos.length, 3)
    // Subirlo dos veces no duplica nada
    const otraVez = leerExtracto(parseCsv(toCsv(rows)), { businessId: BIZ, existentes: [...data.movements, ...r.nuevos] })
    assert.equal(otraVez.nuevos.length, 0)
    assert.equal(otraVez.repetidos, 4)

    const a = analyze(data, { ...base, extraMovements: r.nuevos })
    const regla = (i: number) => a.matchByMovement.get(r.nuevos[i].id)?.regla
    const reglas = r.nuevos.map((_, i) => regla(i))
    assert.ok(reglas.includes('PARCIAL'), `reglas: ${reglas.join(', ')}`)
    assert.ok(reglas.includes('EXACTO'))
    // El saldo final es el del extracto
    assert.equal(a.saldoActual, Number(rows[1][4]))
    // Rímac paga la mitad, Gardenias completa y se paga a Pinturas Andinas
    assert.equal(totalCobranzas(porCobrar(a, [], HOY)), 9300 - 1475 - 1180)
    assert.equal(a.data.comprobantes.filter((c) => a.comprobanteEstado.get(c.id) === 'FACTURA_SIN_PAGO').length, 1)
  })
})

describe('métricas de la primera ola', () => {
  test('% sin intervención: baja con los pendientes y con cada corrección', () => {
    const m = sinIntervencion(sinCambios, [], '2026-11')
    assert.ok(m.total > 0)
    assert.equal(m.total - m.auto, sinCambios.porRevisar.filter((x) => x.fecha.startsWith('2026-11')).length)
    const otro = data.movements.find((x) => x.fecha.startsWith('2026-11') && !sinCambios.porRevisar.includes(x))!
    const corr = { id: 'c', movementId: otro.id, businessId: BIZ, rubro: 'ferreteria', sugerida: 'ventas', elegida: 'otros', confianzaSugerida: 0.9, origen: 'APP', creoRegla: false, ts: '' } as const
    assert.equal(sinIntervencion(sinCambios, [corr], '2026-11').auto, m.auto - 1)
  })

  test('cobro tras un recordatorio: cuenta solo lo cobrado completo después de recordar', () => {
    const gardenias = factura('Condominio Las Gardenias')
    const rimac = factura('Multiservicios Rímac E.I.R.L.')
    const a = analyze(data, { ...base, extraMovements: [abono('2026-11-18T09:05', 1180, 'Condominio Las Gardenias'), abono('2026-11-18T09:30', 1000, 'Multiservicios Rimac EIRL')] })
    const r = cobrosTrasRecordatorio(a, { [gardenias.id]: '2026-11-15T10:00', [rimac.id]: '2026-11-15T10:00' })
    assert.deepEqual(r, { recordados: 2, cobrados: 1, pct: 0.5, dias: 3 })
  })

  test('días de cierre y error de la proyección', () => {
    assert.deepEqual(diasDeCierre(BIZ, { [`${BIZ}:2026-10`]: '2026-11-18T10:30', 'otro:2026-10': '2026-11-02T10:00' }), [{ mes: '2026-10', dias: 18 }])
    const errores = errorProyecciones(sinCambios, [{ businessId: BIZ, fecha: '2026-11-10', saldo7: 10000 }, { businessId: BIZ, fecha: '2026-11-15', saldo7: 1 }], HOY)
    assert.equal(errores.length, 1)
    assert.equal(errores[0].real, saldoAl(sinCambios, '2026-11-17'))
    assert.ok(errores[0].error >= 0)
  })
})
