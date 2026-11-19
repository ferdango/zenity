/**
 * «Decisión de la semana»: una decisión real del negocio, con sus opciones y el efecto de cada una
 * calculado con los números del dueño (fórmula de Zenity: datos reales + interés en su negocio +
 * juego + aprendizaje). Se elige la más urgente: el bache de caja, lo vencido, el sueldo de dueño o
 * el pago a SUNAT. Función pura.
 */
import { type CashflowResult, pagoParaMover, proyectarCaja, textoAlerta } from './cashflow.ts'
import type { Cobranza } from './collections.ts'
import type { Analysis } from './engine.ts'
import { resumenSunat } from './sunat.ts'
import type { CashEvent, PromesaPago } from './types.ts'
import { addDays, fmtDiaMes, fmtSolesCorto, round2, weekday } from './util.ts'

export type TipoDecision = 'caja' | 'cobrar' | 'sueldo' | 'sunat'

export interface OpcionDecision {
  id: string
  titulo: string
  detalle: string
  /** Qué pasa en tus números si eliges esta opción */
  efecto: string
  /** El efecto deja el negocio bien (p. ej. la caja no baja del colchón) */
  efectoBueno: boolean
  /** La opción con mejor resultado para el negocio */
  mejor: boolean
  /** Lo que se aprende al elegirla */
  porque: string
  /** Dónde hacerlo en Zenity */
  accion?: { label: string; to: string }
}

export interface Decision {
  /** Única por tipo y semana: «caja@2026-11-16» */
  id: string
  tipo: TipoDecision
  pregunta: string
  contexto: string
  opciones: OpcionDecision[]
}

export interface EntradaDecision {
  a: Analysis
  promesas: PromesaPago[]
  hoy: string
  /** Eventos extra de la caja (p. ej. el efectivo de los cierres) */
  extras?: CashEvent[]
  cobranzas: Cobranza[]
  /** Gastos personales pagados con la cuenta del negocio este mes (positivo) */
  gastoPersonalMes: number
}

/** Costo de esperar un cobro: 2.5% al mes, como un préstamo para capital de trabajo (igual que la lección L07). */
export const COSTO_MENSUAL_ESPERA = 0.025
const DESCUENTO_PRONTO_PAGO = 0.05

/** Lunes de la semana de `hoy`: la decisión cambia cada semana. */
export function lunesDe(hoy: string): string {
  return addDays(hoy, -((weekday(hoy) + 6) % 7))
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function decisionDeLaSemana(e: EntradaDecision): Decision | null {
  const id = (tipo: TipoDecision) => `${tipo}@${lunesDe(e.hoy)}`
  const extras = e.extras ?? []
  const proyectar = (mas: CashEvent[] = []) => proyectarCaja(e.a, e.promesas, e.hoy, 60, [...extras, ...mas])
  const caja = proyectar()
  const vencidas = e.cobranzas.filter((c) => c.diasVencidos > 0 && !c.promesa).sort((x, y) => y.diasVencidos - x.diasVencidos)
  const totalVencido = round2(vencidas.reduce((s, c) => s + c.monto, 0))

  /* 1 · Bache de caja: cada opción se simula en la proyección real */
  if (caja.alerta) {
    const alerta = caja.alerta
    const colchon = caja.colchon
    const efectoDe = (r: CashflowResult) =>
      r.minimo.base >= colchon ? `Tu caja no baja de ${fmtSolesCorto(Math.round(r.minimo.base))}` : `Tu caja baja a ${fmtSolesCorto(Math.round(r.minimo.base))}`
    const candidatas: (OpcionDecision & { minimo: number })[] = []

    if (totalVencido > 0) {
      const r = proyectar([{ fecha: addDays(e.hoy, 7), concepto: 'Cobro de lo vencido', monto: totalVencido, certeza: 'ALTA', fuente: 'POR_COBRAR' }])
      candidatas.push({
        id: 'cobrar',
        titulo: 'Cobrar lo que te deben',
        detalle: `${plural(vencidas.length, 'factura vencida', 'facturas vencidas')}: ${fmtSolesCorto(totalVencido)}`,
        efecto: efectoDe(r),
        efectoBueno: r.minimo.base >= colchon,
        minimo: r.minimo.base,
        mejor: false,
        porque: `Cobrar lo que ya vendiste es la plata más barata: no pagas intereses ni dependes de nadie más. Con ${fmtSolesCorto(totalVencido)} cobrados, ${efectoDe(r).charAt(0).toLowerCase()}${efectoDe(r).slice(1)}.`,
        accion: { label: 'Ir a cobrar', to: '/cobrar' },
      })
    }

    const mover = pagoParaMover(caja.eventos, alerta)
    if (mover) {
      const despues = addDays(alerta.fecha, 1)
      const r = proyectar([
        { fecha: mover.fecha, concepto: 'Pago movido', monto: -mover.monto, certeza: 'ALTA', fuente: mover.fuente },
        { fecha: despues, concepto: mover.concepto, monto: mover.monto, certeza: 'ALTA', fuente: mover.fuente },
      ])
      const proveedor = mover.concepto.replace(/^Pago a /, '')
      candidatas.push({
        id: 'mover',
        titulo: `Mover el pago a ${proveedor}`,
        detalle: `${fmtSolesCorto(Math.round(-mover.monto))} para después del ${fmtDiaMes(despues)}`,
        efecto: efectoDe(r),
        efectoBueno: r.minimo.base >= colchon,
        minimo: r.minimo.base,
        mejor: false,
        porque: `Mover un pago solo lo corre de fecha: la deuda sigue y ${efectoDe(r).charAt(0).toLowerCase()}${efectoDe(r).slice(1)}. Úsalo si no alcanzas a cobrar a tiempo y tu proveedor acepta.`,
        accion: { label: 'Ver mi caja', to: '/caja' },
      })
    }

    // La mejor: la que deja la caja más alta (si empatan, la primera: cobrar)
    const mejor = candidatas.reduce<(typeof candidatas)[number] | null>((m, o) => (!m || o.minimo > m.minimo + 0.5 ? o : m), null)
    if (mejor) mejor.mejor = true

    const falta = Math.max(0, Math.ceil((colchon - caja.minimo.base) / 100) * 100)
    const opciones: OpcionDecision[] = [
      ...candidatas.map(({ minimo: _minimo, ...o }) => o),
      {
        id: 'prestamo',
        titulo: 'Pedir un préstamo',
        detalle: `Unos ${fmtSolesCorto(falta)} para cubrir el bache`,
        efecto: 'Cubre el bache, pero pagas intereses',
        efectoBueno: false,
        mejor: false,
        porque: 'Un préstamo resuelve el bache, pero pagas intereses por plata que ya te deben o que puedes ordenar. Déjalo para cuando no haya otra salida.',
      },
      {
        id: 'esperar',
        titulo: 'Esperar a ver qué pasa',
        detalle: 'No cambiar nada por ahora',
        efecto: `${efectoDe(caja)} el ${fmtDiaMes(caja.minimo.fecha)}`,
        efectoBueno: false,
        mejor: false,
        porque: `Si no haces nada, ${textoAlerta(alerta).charAt(0).toLowerCase()}${textoAlerta(alerta).slice(1)} Con poca caja te arriesgas a atrasarte con la planilla o la gratificación.`,
      },
    ]
    return {
      id: id('caja'),
      tipo: 'caja',
      pregunta: `${textoAlerta(alerta)} ¿Qué haces?`,
      contexto: `Tu colchón es ${fmtSolesCorto(Math.round(colchon))}: lo que gastas en una semana. Mira qué pasa con tu caja en cada opción.`,
      opciones,
    }
  }

  /* 2 · Cobros vencidos */
  if (vencidas.length > 0) {
    const c = vencidas[0]
    const quien = c.comprobante.nombreContraparte
    const costoMes = round2(totalVencido * COSTO_MENSUAL_ESPERA)
    const costoCliente = round2(c.monto * COSTO_MENSUAL_ESPERA * (c.diasVencidos / 30))
    return {
      id: id('cobrar'),
      tipo: 'cobrar',
      pregunta: `Te deben ${fmtSolesCorto(totalVencido)} en facturas vencidas. ¿Qué haces primero?`,
      contexto: `${quien} es quien más se atrasó: ${c.diasVencidos} días.`,
      opciones: [
        {
          id: 'recordar',
          titulo: `Recordarle a ${quien}`,
          detalle: `${fmtSolesCorto(c.monto)} · ${c.diasVencidos} días de atraso`,
          efecto: `Recuperas ${fmtSolesCorto(c.monto)} sin costo`,
          efectoBueno: true,
          mejor: true,
          porque: `Empieza por el más atrasado: esperar ya te costó cerca de ${fmtSolesCorto(costoCliente)}. Un recordatorio amable y a tiempo es la forma más barata de cobrar.`,
          accion: { label: 'Recordarle el pago', to: '/cobrar' },
        },
        {
          id: 'descuento',
          titulo: 'Ofrecer 5% de descuento si pagan esta semana',
          detalle: `Cobras ${fmtSolesCorto(round2(totalVencido * (1 - DESCUENTO_PRONTO_PAGO)))}`,
          efecto: `Dejas de ganar ${fmtSolesCorto(round2(totalVencido * DESCUENTO_PRONTO_PAGO))}`,
          efectoBueno: false,
          mejor: false,
          porque: 'Sirve con clientes difíciles, pero regalas parte de tu plata. Primero recuerda; el descuento es el último recurso.',
        },
        {
          id: 'esperar',
          titulo: 'Esperar a que paguen',
          detalle: 'No hacer nada por ahora',
          efecto: `Te cuesta cerca de ${fmtSolesCorto(costoMes)} cada mes`,
          efectoBueno: false,
          mejor: false,
          porque: 'Mientras esperas, financias a tus clientes con tu propia plata y tú igual pagas proveedores y sueldos.',
        },
      ],
    }
  }

  /* 3 · Sueldo de dueño */
  if (!e.a.business.sueldoDueno && e.gastoPersonalMes > 0) {
    const gasto = fmtSolesCorto(Math.round(e.gastoPersonalMes))
    return {
      id: id('sueldo'),
      tipo: 'sueldo',
      pregunta: `Este mes sacaste ${gasto} del negocio para gastos de tu casa. ¿Cómo lo ordenas?`,
      contexto: 'Sin un sueldo fijo, no sabes cuánto gana tu negocio de verdad.',
      opciones: [
        {
          id: 'sueldo',
          titulo: 'Ponerme un sueldo fijo de dueño',
          detalle: 'Un monto que el negocio pueda pagar cada mes',
          efecto: 'Ves tu utilidad real cada mes',
          efectoBueno: true,
          mejor: true,
          porque: 'Con un sueldo fijo tu casa sabe con cuánto cuenta y lo que sobra se queda en el negocio para crecer y aguantar los meses flojos.',
          accion: { label: 'Definir mi sueldo', to: '/personal' },
        },
        {
          id: 'seguir',
          titulo: 'Seguir sacando cuando lo necesite',
          detalle: `Como este mes: ${gasto}`,
          efecto: 'Tu utilidad real queda escondida',
          efectoBueno: false,
          mejor: false,
          porque: 'Así puedes gastar sin darte cuenta la plata de tus proveedores o de la planilla.',
        },
        {
          id: 'nada',
          titulo: 'No sacar nada del negocio',
          detalle: 'Aguantar sin pagarme',
          efecto: 'Terminas sacando sin orden',
          efectoBueno: false,
          mejor: false,
          porque: 'Tú también trabajas en el negocio. Si no te pagas, tarde o temprano sacas sin control: mejor un monto fijo que el negocio pueda pagar.',
        },
      ],
    }
  }

  /* 4 · Pago a SUNAT */
  const sunat = resumenSunat(e.a, e.hoy)
  if (sunat.total > 0) {
    const semanas = Math.max(1, Math.ceil(sunat.dias / 7))
    const porSemana = fmtSolesCorto(Math.ceil(sunat.total / semanas))
    return {
      id: id('sunat'),
      tipo: 'sunat',
      pregunta: `Pagas ${fmtSolesCorto(sunat.total)} a SUNAT el ${fmtDiaMes(sunat.vence)}. ¿Cómo te preparas?`,
      contexto: `Faltan ${plural(sunat.dias, 'día', 'días')}.`,
      opciones: [
        {
          id: 'separar',
          titulo: `Separar ${porSemana} cada semana`,
          detalle: `Durante ${plural(semanas, 'semana', 'semanas')}`,
          efecto: 'Llegas con la plata lista',
          efectoBueno: true,
          mejor: true,
          porque: 'Separar un poco cada semana convierte un pago grande en varios pequeños: no aprieta tu caja y no hay sorpresas.',
          accion: { label: 'Ver mi caja', to: '/caja' },
        },
        {
          id: 'ese-dia',
          titulo: 'Pagar con lo que haya ese día',
          detalle: 'Sin preparar nada',
          efecto: 'Puedes quedarte corto ese día',
          efectoBueno: false,
          mejor: false,
          porque: 'Si ese día coincide con otro pago grande te quedas corto, y pagar tarde a SUNAT suma intereses y multas.',
        },
        {
          id: 'fraccionar',
          titulo: 'Pedir fraccionamiento a SUNAT',
          detalle: 'Pagarlo en cuotas',
          efecto: 'Pagas intereses',
          efectoBueno: false,
          mejor: false,
          porque: 'El fraccionamiento es para emergencias: tiene intereses y requisitos. Si puedes separar cada semana, te sale más barato.',
        },
      ],
    }
  }

  return null
}
