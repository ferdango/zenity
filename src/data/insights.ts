import { formatMoney } from '../lib/format'
import type { QuickInsight } from '../components/Insights'
import { type Connection, type Insight, PERIODS, type Transaction } from './mock'
import { accountTotals, categoryTotals, getTransactions, totals, variation } from './selectors'

const money = (n: number) => formatMoney(n)

/** Insights "Resumen de hoy" generados a partir de los datos filtrados. */
export function movementInsights(
  txs: Transaction[],
  connections: Connection[],
  accountId: string | 'all',
  month: string,
  focus: 'all' | 'income' | 'expense',
): Insight[] {
  const account = connections.find((c) => c.id === accountId)
  const t = totals(txs)
  const name = account?.name ?? 'tus cuentas'
  const summary: Insight = {
    id: `sum-${accountId}-${focus}`,
    avatar: account?.avatar ?? 'api',
    title: account ? account.name : 'Todas tus cuentas',
    body: [
      `En ${month.toLowerCase()} `,
      { b: name },
      account ? ' cerró con un balance de ' : ' cerraron con un balance de ',
      t.neto >= 0 ? { pos: formatMoney(t.neto, 'always') } : { neg: formatMoney(t.neto, 'always') },
      '. Entraron ',
      { pos: money(t.ingresos) },
      ' y salieron ',
      { neg: money(t.egresos) },
      '.',
    ],
  }

  if (t.ingresos === 0 && t.egresos === 0) {
    return [{ ...summary, body: ['Esta cuenta aún no tiene movimientos en ', { b: month.toLowerCase() }, '.'] }]
  }

  const type = focus === 'expense' ? 'expense' : 'income'
  const cats = categoryTotals(txs, type)
  const [first, second] = cats
  if (!first) return [summary]

  const category: Insight =
    type === 'income'
      ? {
          id: `cat-${accountId}-${focus}`,
          avatar: 'sheet',
          title: `${first.label} es tu principal fuente de ingresos`,
          body: [
            'Representa ',
            { b: `${first.share}%` },
            ' de lo que entró (',
            { pos: money(first.total) },
            ').',
            ...(second ? [' Le sigue ', { b: second.label }, ' con ', { pos: money(second.total) }, '.'] : []),
          ],
          note: 'Tip: conecta tu Excel de cobranzas para conciliar los pagos pendientes.',
        }
      : {
          id: `cat-${accountId}-${focus}`,
          avatar: 'api',
          title: `${first.label} concentra tus egresos`,
          body: [
            { b: `${first.share}%` },
            ' de lo que salió fue para ',
            { b: first.label.toLowerCase() },
            ' (',
            { neg: money(first.total) },
            ').',
            ...(second ? [' Después está ', { b: second.label }, ' con ', { neg: money(second.total) }, '.'] : []),
          ],
          note: 'Zenity te avisará si esta categoría supera tu promedio de los últimos 3 meses.',
        }

  return [summary, category]
}

export function incomeQuickInsights(txs: Transaction[], connections: Connection[], periodKey: string): QuickInsight[] {
  const [top] = categoryTotals(txs, 'income')
  const [bestAccount] = accountTotals(txs, connections, 'income')
  const delta = variation(periodKey, 'ingresos')
  return [
    {
      id: 'source',
      label: 'Fuente principal',
      icon: 'star',
      value: top?.label ?? '—',
      hint: top ? `${money(top.total)} · ${top.share}%` : undefined,
    },
    {
      id: 'account',
      label: 'Cuenta con más ingresos',
      icon: 'account_balance_wallet',
      value: bestAccount?.connection.name ?? '—',
      hint: bestAccount ? money(bestAccount.total) : undefined,
    },
    {
      id: 'delta',
      label: 'Vs. mes anterior',
      icon: delta !== null && delta < 0 ? 'trending_down' : 'trending_up',
      value: delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}%`,
      hint: 'Variación de ingresos',
    },
    { id: 'reconciled', label: 'Cobros conciliados', icon: 'task_alt', value: '82%', hint: '18% pendientes' },
  ]
}

export function expenseQuickInsights(txs: Transaction[], connections: Connection[]): QuickInsight[] {
  const cats = categoryTotals(txs, 'expense')
  const [top] = cats
  const [worstAccount] = accountTotals(txs, connections, 'expense')
  const operativo = cats.find((c) => c.id === 'operaciones')?.total ?? 0
  const comercial = cats.find((c) => c.id === 'comercial')?.total ?? 0
  const opShare = operativo + comercial ? Math.round((operativo / (operativo + comercial)) * 100) : 0
  const refunds = txs.filter((t) => t.amount > 0 && /devoluci/i.test(t.title))
  return [
    {
      id: 'alert',
      label: 'Alerta',
      icon: 'warning',
      value: `${top?.label ?? 'Comercial'} subió 32%`,
      hint: 'Respecto a febrero',
      warning: true,
    },
    {
      id: 'dominant',
      label: 'Categoría dominante',
      icon: 'donut_large',
      value: top?.label ?? '—',
      hint: top ? `${money(top.total)} · ${top.share}%` : undefined,
    },
    {
      id: 'account',
      label: 'Cuenta con más salidas',
      icon: 'account_balance_wallet',
      value: worstAccount?.connection.name ?? '—',
      hint: worstAccount ? money(worstAccount.total) : undefined,
    },
    {
      id: 'split',
      label: 'Operativo vs. comercial',
      icon: 'balance',
      value: `${opShare}% / ${opShare ? 100 - opShare : 0}%`,
      hint: `${money(operativo)} vs. ${money(comercial)}`,
    },
    {
      id: 'refunds',
      label: 'Devoluciones',
      icon: 'undo',
      value: refunds.length ? `${refunds.length} recibida${refunds.length > 1 ? 's' : ''}` : 'Ninguna',
      hint: refunds.length ? money(refunds.reduce((a, t) => a + t.amount, 0)) : 'Este mes',
    },
  ]
}

/** Insights de "Explícame este balance" para la pantalla Resumen. */
export function balanceInsights(periodKey: string, connections: Connection[], month: string): Insight[] {
  const index = PERIODS.findIndex((p) => p.key === periodKey)
  const period = PERIODS[index]
  const previous = index > 0 ? PERIODS[index - 1] : null
  const txs = getTransactions(periodKey)
  const t = totals(txs)
  const margin = t.ingresos ? Math.round((t.neto / t.ingresos) * 100) : 0
  const delta = variation(periodKey, 'balance')
  const [bestAccount] = accountTotals(txs, connections, 'income')
  const [topExpense] = categoryTotals(txs, 'expense')

  const first: Insight = {
    id: `bal-${periodKey}`,
    avatar: 'api',
    title:
      delta === null
        ? `Tu balance de ${month.toLowerCase()}`
        : `Tu balance ${delta >= 0 ? 'creció' : 'bajó'} ${Math.abs(delta)}% en ${month.toLowerCase()}`,
    body: [
      ...(previous ? ['Pasaste de ', { b: money(previous.balance) }, ' a ', { b: money(period.balance) }, '. '] : []),
      'Ingresaron ',
      { pos: money(t.ingresos) },
      ' y salieron ',
      { neg: money(t.egresos) },
      ', un margen de ',
      { b: `${margin}%` },
      '.',
    ],
  }

  const insights: Insight[] = [first]
  if (bestAccount) {
    insights.push({
      id: `bal-acc-${periodKey}`,
      avatar: bestAccount.connection.avatar,
      title: `${bestAccount.connection.name} explica la mayor parte`,
      body: [
        'Aportó ',
        { pos: money(bestAccount.total) },
        ` de tus ingresos (${Math.round((bestAccount.total / t.ingresos) * 100)}%).`,
        ...(topExpense ? [' Tu mayor gasto fue ', { b: topExpense.label.toLowerCase() }, ' con ', { neg: money(topExpense.total) }, '.'] : []),
      ],
      note: 'Pregúntale a Zenity para ver el detalle por cuenta.',
    })
  }
  return insights
}
