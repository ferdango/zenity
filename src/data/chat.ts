import { formatMoney } from '../lib/format'
import type { Connection, RichText } from './mock'
import { accountTotals, categoryTotals, getPeriod, getTransactions, periodLabel, totals, variation } from './selectors'

export type ChatText = RichText | string

export type ChatBlock =
  | { type: 'p'; text: ChatText }
  | { type: 'list'; items: ChatText[] }
  | { type: 'table'; head: string[]; rows: string[][]; foot?: string[] }
  | { type: 'actions'; items: Array<{ label: string; to: string; icon: string }> }

export const SUGGESTIONS = [
  { label: 'Explícame este balance', icon: 'query_stats' },
  { label: '¿Qué aumentó esta semana?', icon: 'trending_up' },
  { label: 'Subir un archivo', icon: 'upload_file', upload: true },
  { label: '¿Qué cuenta generó más?', icon: 'leaderboard' },
  { label: 'Consolidado general de mis cuentas', icon: 'account_balance' },
] as const

const m = (n: number, sign: 'auto' | 'always' = 'auto') => formatMoney(n, sign)

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

interface Context {
  connections: Connection[]
  periodKey: string
}

/** Genera una respuesta simulada (demo sin backend) a partir de los datos de ejemplo. */
export function answer(question: string, { connections, periodKey }: Context): ChatBlock[] {
  const q = normalize(question)
  const period = getPeriod(periodKey)
  const month = periodLabel(period).toLowerCase()
  const txs = getTransactions(periodKey)
  const t = totals(txs)
  const incomeCats = categoryTotals(txs, 'income')
  const expenseCats = categoryTotals(txs, 'expense')
  const dIn = variation(periodKey, 'ingresos')
  const dOut = variation(periodKey, 'egresos')
  const margin = t.ingresos ? Math.round((t.neto / t.ingresos) * 100) : 0

  if (q.includes('conectar')) {
    return [
      {
        type: 'p',
        text: [
          'Hoy puedes conectar ',
          { b: 'bancos' },
          ' (BCP, BBVA y Pichincha), ',
          { b: 'APIs' },
          ', ',
          { b: 'bases de datos' },
          ' (MySQL, SQL Server y PostgreSQL) y ',
          { b: 'archivos' },
          ' (Excel y XML).',
        ],
      },
      {
        type: 'p',
        text: 'Si tu fuente no aparece, exporta tus movimientos a Excel y los clasificaré igual. También puedes pedirnos la integración desde la comunidad.',
      },
      { type: 'actions', items: [{ label: 'Nueva cuenta', to: '/conexiones/nueva', icon: 'add' }] },
    ]
  }

  if (q.includes('consolidado') || q.includes('todas mis cuentas') || q.includes('general')) {
    const total = connections.reduce((acc, c) => acc + c.balance, 0)
    return [
      { type: 'p', text: ['Este es el consolidado de tus ', { b: `${connections.length} cuentas conectadas` }, ':'] },
      {
        type: 'table',
        head: ['Cuenta', 'Saldo'],
        rows: connections.map((c) => [c.name, m(c.balance)]),
        foot: ['Total', m(total)],
      },
      {
        type: 'p',
        text: [
          'Tu saldo consolidado es ',
          { b: m(total) },
          '. ',
          { b: 'Locales Nacional' },
          ' aún no tiene movimientos: importa el Excel al día de hoy para incluirlo.',
        ],
      },
      { type: 'actions', items: [{ label: 'Ver mi billetera', to: '/inicio', icon: 'account_balance_wallet' }] },
    ]
  }

  if (q.includes('cuenta') && (q.includes('genero') || q.includes('mas') || q.includes('mejor'))) {
    const ranking = accountTotals(txs, connections, 'income')
    const [best] = ranking
    return [
      {
        type: 'p',
        text: best
          ? [
              'En ',
              month,
              ' la cuenta que más generó fue ',
              { b: best.connection.name },
              ' con ',
              { pos: m(best.total) },
              `, el ${Math.round((best.total / t.ingresos) * 100)}% de tus ingresos.`,
            ]
          : 'Aún no hay ingresos registrados este mes.',
      },
      {
        type: 'table',
        head: ['Cuenta', 'Ingresos', '%'],
        rows: ranking.map((r) => [r.connection.name, m(r.total), `${Math.round((r.total / t.ingresos) * 100)}%`]),
      },
      { type: 'actions', items: [{ label: 'Ver ingresos', to: '/movimientos/ingresos', icon: 'trending_up' }] },
    ]
  }

  if (q.includes('semana') || q.includes('aument') || q.includes('subio')) {
    const latest = txs.reduce((max, tx) => (tx.date > max ? tx.date : max), '')
    const end = new Date(latest)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    const week = txs.filter((tx) => new Date(tx.date) >= start)
    const w = totals(week)
    const top = [...week].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 3)
    return [
      {
        type: 'p',
        text: [
          'En los últimos 7 días entraron ',
          { pos: m(w.ingresos) },
          ' y salieron ',
          { neg: m(w.egresos) },
          '. Lo que más aumentó fueron las ',
          { b: 'ventas de Negocio Retail 1' },
          ', impulsadas por la tienda de Miraflores.',
        ],
      },
      { type: 'list', items: top.map((tx) => [{ b: tx.title }, ': ', tx.amount > 0 ? { pos: m(tx.amount, 'always') } : { neg: m(tx.amount) }]) },
      {
        type: 'p',
        text: ['Ojo: ', { b: 'Comercial' }, ' viene subiendo frente a febrero. Si quieres, te aviso cuando supere tu promedio.'],
      },
    ]
  }

  if (q.includes('balance') || q.includes('explica') || q.includes('resumen')) {
    return [
      {
        type: 'p',
        text: ['En ', month, ' tu balance consolidado es ', { b: m(period.balance) }, '. Esto es lo más importante:'],
      },
      {
        type: 'list',
        items: [
          [
            { b: 'Ingresos: ' },
            { pos: m(t.ingresos) },
            dIn !== null ? ` (${dIn > 0 ? '+' : ''}${dIn}% vs. el mes anterior)` : '',
            incomeCats[0] ? `, liderados por ${incomeCats[0].label} (${m(incomeCats[0].total)})` : '',
            '.',
          ],
          [
            { b: 'Egresos: ' },
            { neg: m(t.egresos) },
            dOut !== null ? ` (${dOut > 0 ? '+' : ''}${dOut}%)` : '',
            expenseCats[0] ? `, donde ${expenseCats[0].label} pesa ${expenseCats[0].share}%` : '',
            '.',
          ],
          [{ b: 'Neto: ' }, t.neto >= 0 ? { pos: m(t.neto, 'always') } : { neg: m(t.neto) }, `, un margen de ${margin}%.`],
        ],
      },
      {
        type: 'p',
        text: [
          'Mi recomendación: revisa los gastos de ',
          { b: expenseCats[0]?.label.toLowerCase() ?? 'comercial' },
          ' y concilia los cobros pendientes de ',
          { b: 'Negocio Retail 1' },
          ' para mejorar tu margen.',
        ],
      },
      {
        type: 'actions',
        items: [
          { label: 'Ver resumen', to: '/resumen', icon: 'bar_chart' },
          { label: 'Ver egresos', to: '/movimientos/egresos', icon: 'trending_down' },
        ],
      },
    ]
  }

  return [
    {
      type: 'p',
      text: [
        'Puedo ayudarte a entender tus finanzas: ',
        { b: 'explicar tu balance' },
        ', comparar ',
        { b: 'ingresos y egresos' },
        ', ver ',
        { b: 'qué cuenta generó más' },
        ' o armar un ',
        { b: 'consolidado' },
        ' de todas tus cuentas.',
      ],
    },
    { type: 'p', text: 'Prueba con una de las sugerencias o pregúntame algo como «¿cuánto gasté en comercial este mes?».' },
  ]
}

export function fileAnswer(name: string, size: number): ChatBlock[] {
  const kb = Math.max(1, Math.round(size / 1024))
  return [
    { type: 'p', text: ['Recibí ', { b: name }, ` (${kb} KB).`] },
    {
      type: 'p',
      text: 'En la versión final leería sus movimientos, los clasificaría y te mostraría los que necesitan revisión. Este prototipo no procesa archivos reales.',
    },
    { type: 'actions', items: [{ label: 'Ver por revisar', to: '/revisar', icon: 'fact_check' }] },
  ]
}
