import type { CategoryId, Connection, Transaction } from './mock'

/** Un movimiento tal como llega de una conexión, antes de conciliarlo. */
export interface MatchLeg {
  accountId: string
  title: string
  date: string
  amount: number
  /** N.º de operación, comprobante u hoja de origen */
  reference: string
  /** El origen no trae hora (filas de Excel) */
  dateOnly?: boolean
  /** Movimiento del libro que ya es este lado: no se vuelve a sumar */
  txId?: string
}

/** Por qué Zenity cree que dos movimientos son el mismo. */
export interface MatchReason {
  icon: string
  label: string
}

/**
 * Dos movimientos de conexiones distintas que pueden ser el mismo hecho (un cobro que
 * aparece en la billetera, en el banco y en el Excel). Si se unen, cuenta una sola vez.
 */
export interface MatchCandidate {
  id: string
  legs: [MatchLeg, MatchLeg]
  /** Puntaje de coincidencia (0–100) */
  score: number
  reasons: MatchReason[]
  /** Lado que representa el dinero: es el que cuenta cuando el par es un solo movimiento */
  primary: 0 | 1
  category: CategoryId
}

export type MatchChoice = 'same' | 'different'

/** Desde este puntaje Zenity une el par sola; por debajo, los deja como movimientos distintos. */
export const AUTO_SAME_SCORE = 75

/** Lo que Zenity decide sin esperar al usuario. */
export function autoChoice(match: MatchCandidate): MatchChoice {
  return match.score >= AUTO_SAME_SCORE ? 'same' : 'different'
}

const SAME_AMOUNT: MatchReason = { icon: 'payments', label: 'Mismo monto' }
const SAME_DAY: MatchReason = { icon: 'calendar_month', label: 'Mismo día' }

/** Pares de ejemplo sobre las cuentas base (API, tarjetas y Excel del Figma). */
export const BASE_MATCHES: MatchCandidate[] = [
  {
    id: 'm-andina',
    score: 98,
    primary: 0,
    category: 'cobros',
    legs: [
      {
        accountId: 'negocio-retail',
        title: 'Cobro factura F001-238 · Andina SAC',
        date: '2026-03-20T22:15',
        amount: 389.5,
        reference: 'Op. 0097872881',
        txId: 't3',
      },
      {
        accountId: 'locales-nacional',
        title: 'Fila 162 · Factura F001-238 · Andina SAC',
        date: '2026-03-20T00:00',
        amount: 389.5,
        reference: 'Hoja «Ventas»',
        dateOnly: true,
      },
    ],
    reasons: [{ icon: 'receipt_long', label: 'Mismo comprobante' }, SAME_AMOUNT, SAME_DAY],
  },
  {
    id: 'm-miraflores',
    score: 91,
    primary: 0,
    category: 'ventas',
    legs: [
      {
        accountId: 'negocio-retail',
        title: 'Venta POS · Tienda Miraflores',
        date: '2026-03-28T19:42',
        amount: 420,
        reference: 'Op. 0097873323',
        txId: 't1',
      },
      {
        accountId: 'locales-nacional',
        title: 'Fila 209 · Cierre de caja Miraflores',
        date: '2026-03-28T00:00',
        amount: 420,
        reference: 'Hoja «Ventas»',
        dateOnly: true,
      },
    ],
    reasons: [SAME_AMOUNT, SAME_DAY, { icon: 'storefront', label: 'Misma tienda' }],
  },
  {
    id: 'm-tinbet',
    score: 76,
    primary: 0,
    category: 'cobros',
    legs: [
      {
        accountId: 'tinbet',
        title: 'Transferencia recibida · Tinbet SAC',
        date: '2026-03-26T16:20',
        amount: 350,
        reference: 'Op. 0097873001',
        txId: 't6',
      },
      {
        accountId: 'locales-nacional',
        title: 'Fila 201 · Cobro Tinbet',
        date: '2026-03-27T00:00',
        amount: 350,
        reference: 'Hoja «Cobranzas»',
        dateOnly: true,
      },
    ],
    reasons: [SAME_AMOUNT, { icon: 'person', label: 'Cliente parecido' }, { icon: 'calendar_month', label: '1 día de diferencia' }],
  },
]

const round2 = (n: number) => Math.round(n * 100) / 100

/** Clientes ficticios de los cobros con QR */
const PAYERS = ['Lucía R.', 'Jorge M.']

/**
 * Un cobro con Yape o Plin aparece también donde se abona (el banco) o donde se anota
 * la venta (el Excel). Sin una de esas cuentas no hay con qué conciliarlo.
 */
export function walletMatches(connections: Connection[], scale: number): MatchCandidate[] {
  const bank = connections.find((c) => c.avatar === 'bank')
  const sheet = connections.find((c) => c.avatar === 'sheet')
  const counterpart = bank ?? sheet
  if (!counterpart) return []

  return connections
    .filter((c) => c.avatar === 'yape' || c.avatar === 'plin')
    .map((wallet, i) => {
      const payer = PAYERS[i % PAYERS.length]
      const amount = round2((96 + i * 39) * scale)
      const date = `2026-03-29T${13 + i}:04`
      const legs: [MatchLeg, MatchLeg] = [
        { accountId: wallet.id, title: `Cobro con QR · ${payer}`, date, amount, reference: `Op. 1827364${5 + i}` },
        bank
          ? { accountId: bank.id, title: `${wallet.name} de ${payer}`.toUpperCase(), date, amount, reference: 'Abono en cuenta' }
          : {
              accountId: counterpart.id,
              title: `Fila ${215 + i} · Venta por ${wallet.name} · ${payer}`,
              date: '2026-03-29T00:00',
              amount,
              reference: 'Hoja «Ventas»',
              dateOnly: true,
            },
      ]
      return {
        id: `m-${wallet.id}`,
        score: bank ? 97 : 89,
        // El dinero está en el banco; sin banco, en la billetera (el Excel solo anota la venta)
        primary: bank ? 1 : 0,
        category: 'ventas',
        legs,
        reasons: [SAME_AMOUNT, bank ? { icon: 'calendar_month', label: 'Misma hora' } : SAME_DAY, { icon: 'person', label: 'Mismo cliente' }],
      }
    })
}

/**
 * Movimientos que los pares agregan al libro. Si son el mismo, el par cuenta una vez (su lado
 * de dinero); si son distintos, cuentan los dos. Sin respuesta del usuario vale la de Zenity.
 */
export function matchTransactions(matches: MatchCandidate[], decisions: Record<string, MatchChoice>): Transaction[] {
  return matches.flatMap((m) =>
    m.legs.flatMap((leg, i) =>
      !leg.txId && (i === m.primary || (decisions[m.id] ?? autoChoice(m)) === 'different')
        ? [
            {
              id: `${m.id}-${i}`,
              accountId: leg.accountId,
              title: leg.title,
              amount: leg.amount,
              date: leg.date,
              category: m.category,
              operation: leg.reference,
              origin: '—',
              destination: '—',
            },
          ]
        : [],
    ),
  )
}
