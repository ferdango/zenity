/**
 * Ayudante para escribir el seed: crea movimientos BCP, comprobantes SIRE y cobros digitales con
 * ids estables y, al final, calcula el saldo después de cada movimiento.
 * Todo es determinístico: misma semilla = mismos datos.
 */
import type {
  BankMovement,
  BusinessData,
  Canal,
  Comprobante,
  DemoBusiness,
  PosBatch,
  PosSale,
  YapePayment,
} from '../../domain/types.ts'
import { cents, dayOf, prng, round2 } from '../../domain/util.ts'

export interface MovOptions {
  nombre?: string
  ruc?: string
  canal?: Canal
}

export interface CompOptions {
  ruc?: string
  formaPago?: 'CONTADO' | 'CREDITO'
  /** Fecha de la única cuota (crédito) */
  cuota?: string
  cuotas?: { fecha: string; monto: number }[]
  detraccion?: number
  agenteRetencion?: boolean
  moneda?: 'PEN' | 'USD'
  referenciaId?: string
  serie?: string
}

export class SeedBuilder {
  readonly rand: () => number
  private movs: Omit<BankMovement, 'saldoDespues'>[] = []
  private comps: Comprobante[] = []
  private sales: PosSale[] = []
  private batches: PosBatch[] = []
  private yapes: YapePayment[] = []
  private seq = { mov: 0, comp: 0, sale: 0, op: 0 }
  private numeros: Record<string, number> = {}
  /** Montos ya usados (en céntimos) para que el relleno no choque con los casos obligatorios */
  private usados = new Set<number>()
  readonly prefix: string
  readonly business: DemoBusiness

  constructor(business: DemoBusiness, seed: number) {
    this.business = business
    this.rand = prng(seed)
    this.prefix = business.id.slice(-4)
  }

  private opNumber(): string {
    this.seq.op++
    return String(1_000_000 + Math.floor(this.rand() * 8_000_000) + this.seq.op).padStart(9, '0')
  }

  /** Reserva un monto exacto (casos obligatorios). */
  reserve(...montos: number[]) {
    for (const m of montos) this.usados.add(cents(m))
  }

  /** Monto aleatorio que no repite ningún otro del seed (así cada pago calza con un solo comprobante). */
  amount(min: number, max: number, step = 0.1): number {
    for (let i = 0; i < 500; i++) {
      const raw = min + this.rand() * (max - min)
      const value = round2(Math.round(raw / step) * step)
      const c = cents(value)
      if (!this.usados.has(c)) {
        this.usados.add(c)
        return value
      }
    }
    throw new Error('No se encontró un monto libre')
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.rand() * list.length)]
  }

  mov(fecha: string, monto: number, glosa: string, opts: MovOptions = {}): string {
    this.seq.mov++
    const id = `${this.prefix}-m${String(this.seq.mov).padStart(3, '0')}`
    this.movs.push({
      id,
      businessId: this.business.id,
      fecha,
      monto: round2(monto),
      glosa,
      numeroOperacion: this.opNumber(),
      contraparteNombre: opts.nombre,
      contraparteRuc: opts.ruc,
      canal: opts.canal ?? (monto < 0 ? 'CARGO' : 'TRANSFERENCIA'),
    })
    this.usados.add(cents(Math.abs(monto)))
    return id
  }

  /** Abono por Yape: el movimiento BCP y el registro de la billetera (columna «Cobro digital»). */
  yape(fecha: string, monto: number, nombre: string): string {
    const id = this.mov(fecha, monto, `YAPE DE ${nombre.toUpperCase()}`, { nombre, canal: 'YAPE' })
    const op = this.movs[this.movs.length - 1].numeroOperacion
    this.yapes.push({ id: `${id}-yape`, businessId: this.business.id, fecha, monto, nombre, numeroOperacion: op })
    return id
  }

  private numero(serie: string, start: number): string {
    this.numeros[serie] = (this.numeros[serie] ?? start - 1) + 1
    return String(this.numeros[serie])
  }

  comp(
    tipo: Comprobante['tipo'],
    direccion: Comprobante['direccion'],
    fechaEmision: string,
    nombre: string,
    total: number,
    opts: CompOptions = {},
  ): Comprobante {
    this.seq.comp++
    const serie =
      opts.serie ??
      (tipo === 'BOLETA' ? 'B001' : tipo === 'NOTA_CREDITO' ? 'FC01' : tipo === 'RETENCION' ? 'R001' : direccion === 'VENTA' ? 'F001' : 'E001')
    const start = tipo === 'BOLETA' ? 1840 : tipo === 'FACTURA' && direccion === 'VENTA' ? 412 : 20
    // La retención no lleva IGV; en el NRUS la cuota ya incluye el IGV y la boleta no lo separa
    const exento = tipo === 'RETENCION' || this.business.regimenTributario === 'NRUS'
    const base = exento ? total : round2(total / 1.18)
    const cuotas = opts.cuotas ?? (opts.cuota ? [{ fecha: opts.cuota, monto: total }] : undefined)
    const comp: Comprobante = {
      id: `${this.prefix}-c${String(this.seq.comp).padStart(3, '0')}`,
      businessId: this.business.id,
      tipo,
      direccion,
      serie,
      numero: this.numero(`${direccion}-${serie}`, start),
      rucContraparte: opts.ruc,
      nombreContraparte: nombre,
      fechaEmision,
      moneda: opts.moneda ?? 'PEN',
      base,
      igv: round2(total - base),
      total: round2(total),
      formaPago: opts.formaPago ?? (cuotas ? 'CREDITO' : 'CONTADO'),
      cuotas,
      detraccionPorcentaje: opts.detraccion,
      clienteEsAgenteRetencion: opts.agenteRetencion,
      referenciaId: opts.referenciaId,
    }
    this.comps.push(comp)
    if (tipo === 'FACTURA' || tipo === 'BOLETA') this.usados.add(cents(total))
    return comp
  }

  venta(fecha: string, nombre: string, total: number, opts: CompOptions = {}): Comprobante {
    return this.comp(opts.ruc ? 'FACTURA' : 'BOLETA', 'VENTA', fecha, nombre, total, opts)
  }

  boleta(fecha: string, nombre: string, total: number, opts: CompOptions = {}): Comprobante {
    return this.comp('BOLETA', 'VENTA', fecha, nombre, total, opts)
  }

  compra(fecha: string, nombre: string, ruc: string, total: number, opts: CompOptions = {}): Comprobante {
    return this.comp('FACTURA', 'COMPRA', fecha, nombre, total, { ...opts, ruc })
  }

  /** Lote POS: ventas con tarjeta de un día y su liquidación (neta de comisión) días después. */
  pos(fechaVentas: string, montos: number[], fechaAbono: string, tasaComision: number, horaInicio = 9): { loteId: string; neto: number; comision: number } {
    const loteId = `${this.prefix}-L${String(this.batches.length + 1).padStart(4, '0')}`
    montos.forEach((monto, i) => {
      this.seq.sale++
      const h = horaInicio + Math.floor((i * 9) / montos.length)
      const min = String((i * 17) % 60).padStart(2, '0')
      this.sales.push({ id: `${this.prefix}-s${String(this.seq.sale).padStart(3, '0')}`, businessId: this.business.id, fecha: `${fechaVentas}T${String(h).padStart(2, '0')}:${min}`, monto, loteId })
    })
    const bruto = round2(montos.reduce((a, b) => a + b, 0))
    const comision = round2(bruto * tasaComision)
    const neto = round2(bruto - comision)
    this.batches.push({ loteId, fechaAbono: dayOf(fechaAbono), bruto, comision, neto })
    return { loteId, neto, comision }
  }

  /** Datos finales: el saldo de cada movimiento se calcula desde el saldo inicial. */
  build(saldoInicial: number, extra: Pick<BusinessData, 'contactos' | 'historialMensual'>): BusinessData {
    const sorted = [...this.movs].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
    let saldo = cents(saldoInicial)
    const movements: BankMovement[] = sorted.map((m) => {
      saldo += cents(m.monto)
      return { ...m, saldoDespues: saldo / 100 }
    })
    return {
      business: this.business,
      movements,
      comprobantes: this.comps,
      posSales: this.sales,
      posBatches: this.batches,
      yapePayments: this.yapes,
      ...extra,
    }
  }

  /** Comprobantes creados hasta ahora (para calcular impuestos del seed). */
  get comprobantes(): readonly Comprobante[] {
    return this.comps
  }
}
