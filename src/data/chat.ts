import { formatDayMonth, formatMoney } from '../lib/format'
import { contrapartesLabel, type Corte, corte, type Cuentas, estado, plural, proximos7 } from './cuentas'
import type { Ledger } from './ledger'
import type { Connection, RichText } from './mock'
import { accountTotals, categoryTotals, getPeriod, getTransactions, periodLabel, totals, variation } from './selectors'
import { formatDue, rateLabel, REGIMENES, renta, type Sire, sirePeriod, vencimiento } from './sire'

export type ChatText = RichText | string

export type ChatBlock =
  | { type: 'p'; text: ChatText }
  | { type: 'list'; items: ChatText[] }
  | { type: 'table'; head: string[]; rows: string[][]; foot?: string[] }
  | { type: 'actions'; items: Array<{ label: string; to: string; icon: string }> }

/** Las 5 preguntas que todo dueño de negocio necesita responder en segundos. */
export const SUGGESTIONS = [
  { label: '¿Cómo está mi negocio?', icon: 'query_stats' },
  { label: '¿Cuánto ingresó este mes?', icon: 'trending_up' },
  { label: '¿Cuánto salió este mes?', icon: 'trending_down' },
  { label: '¿Cuánto le queda al negocio?', icon: 'savings' },
  { label: '¿Cuánto me deben?', icon: 'call_received' },
  { label: '¿Cuánto debo?', icon: 'call_made' },
  { label: 'Subir un archivo', icon: 'upload_file', upload: true },
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
  ledger: Ledger
  /** Nombre del negocio (RUC) activo */
  business: string
  ruc: string
  /** Comprobantes del SIRE del negocio activo */
  sire: Sire
  /** Facturas por cobrar y por pagar del negocio activo */
  cuentas: Cuentas
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}%`

/** "¿Cuánto me deben?" / "¿Cuánto debo?": total, lo vencido, quién y qué hacer primero. */
function cuentasAnswer(c: Corte, business: string): ChatBlock[] {
  const cobrar = c.tipo === 'cobrar'
  const action: ChatBlock = {
    type: 'actions',
    items: [
      cobrar
        ? { label: 'Ver por cobrar', to: '/cuentas/cobrar', icon: 'call_received' }
        : { label: 'Ver por pagar', to: '/cuentas/pagar', icon: 'call_made' },
    ],
  }
  const fecha = formatDayMonth(c.fecha)
  if (c.total === 0) {
    return [
      {
        type: 'p',
        text: cobrar
          ? ['Al ', fecha, ' nadie le debe a ', { b: business }, ': todas sus facturas están cobradas.']
          : ['Al ', fecha, ' ', { b: business }, ' no tiene facturas por pagar.'],
      },
      action,
    ]
  }

  const [top] = c.saldos
  const vencido: RichText = c.vencido > 0 ? [' De eso, ', { neg: m(c.vencido) }, ' ya venció.'] : [' Nada está vencido.']
  const semana = proximos7(c)
  const [next] = c.items.filter((d) => d.atraso <= 0).sort((a, b) => a.vence.localeCompare(b.vence))
  let consejo: ChatText = ''
  if (cobrar && c.vencido > 0) {
    consejo = ['Empieza por ', { b: top.contraparte.nombre }, ': te debe ', { neg: m(top.vencido) }, ` vencidos desde hace ${plural(top.atraso, 'día')}.`]
  } else if (!cobrar && c.vencido > 0) {
    consejo = ['Lo más urgente es ', { b: top.contraparte.nombre }, ', con ', { neg: m(top.vencido) }, ` vencidos desde hace ${plural(top.atraso, 'día')}.`]
  } else if (!cobrar && semana.length > 0) {
    consejo = ['En los próximos 7 días vencen ', { neg: m(semana.reduce((acc, d) => acc + d.monto, 0)) }, ': sepáralos para pagar a tiempo.']
  } else if (next) {
    consejo = cobrar
      ? [{ b: next.contraparte.nombre }, ' te paga ', { pos: m(next.monto) }, ' el ', formatDayMonth(next.vence), ': es tu próximo cobro.']
      : ['Tu próximo pago es a ', { b: next.contraparte.nombre }, ', por ', { neg: m(next.monto) }, ', el ', formatDayMonth(next.vence), '.']
  }

  return [
    {
      type: 'p',
      text: cobrar
        ? ['Al ', fecha, ' te deben ', { pos: m(c.total) }, `: ${plural(c.items.length, 'factura')} de ${contrapartesLabel(c)}.`, ...vencido]
        : ['Al ', fecha, ' debes ', { neg: m(c.total) }, ` a ${contrapartesLabel(c)} (${plural(c.items.length, 'factura')}).`, ...vencido],
    },
    {
      type: 'table',
      head: [cobrar ? 'Cliente' : 'Proveedor', 'Monto', 'Estado'],
      rows: c.saldos.slice(0, 5).map((s) => {
        const first = c.items.find((d) => d.contraparte.ruc === s.contraparte.ruc)!
        return [s.contraparte.nombre, m(s.total), estado(first.atraso, first.vence).label]
      }),
      foot: ['Total', m(c.total), ''],
    },
    ...(consejo ? [{ type: 'p', text: consejo } as ChatBlock] : []),
    action,
  ]
}

/** Genera una respuesta simulada (demo sin backend) con los datos del negocio activo. */
export function answer(question: string, { connections, periodKey, ledger, business, ruc, sire, cuentas }: Context): ChatBlock[] {
  const q = normalize(question)
  const period = getPeriod(ledger, periodKey)
  const month = periodLabel(period).toLowerCase()
  const txs = getTransactions(ledger, periodKey)
  const t = totals(txs)
  const incomeCats = categoryTotals(txs, 'income')
  const expenseCats = categoryTotals(txs, 'expense')
  const dIn = variation(ledger, periodKey, 'ingresos')
  const dOut = variation(ledger, periodKey, 'egresos')
  const margin = t.ingresos ? Math.round((t.neto / t.ingresos) * 100) : 0
  const [topAccount] = accountTotals(txs, connections, 'income')
  const idle = connections.find((c) => c.balance === 0)

  // El SIRE solo depende del RUC: responde aunque el negocio no tenga cuentas conectadas
  if (/\b(igv|sunat|sire|impuestos?|tributos?|renta|credito fiscal|declarar|declaracion)\b/.test(q)) {
    const sp = sirePeriod(sire, periodKey)
    const { igv } = sp
    const ir = renta(sp, sire.regimen)
    const regimen = REGIMENES[sire.regimen]
    return [
      {
        type: 'p',
        text: ['Con los comprobantes del ', { b: 'SIRE' }, ' de ', { b: business }, ' en ', month, ', esto pagarías a SUNAT:'],
      },
      {
        type: 'table',
        head: ['Concepto', 'Monto'],
        rows: [
          ['Débito fiscal (IGV de ventas)', m(igv.debito)],
          ['Crédito fiscal (IGV de compras)', m(-igv.credito)],
          ...(igv.saldoAnterior > 0 ? [['Saldo a favor anterior', m(-igv.saldoAnterior)]] : []),
          ['IGV a pagar', m(igv.aPagar)],
          [`Renta ${regimen.short} (${rateLabel(regimen.tasa)} de ${m(ir.ingresosNetos)})`, m(ir.aPagar)],
        ],
        foot: ['Total', m(igv.aPagar + ir.aPagar)],
      },
      {
        type: 'p',
        text: [
          'Vence el ',
          { b: formatDue(vencimiento(sp.key, ruc)) },
          ` (RUC terminado en ${ruc.at(-1)}) y se declara en el Formulario Virtual 621.`,
          ...(igv.saldoFavor > 0 ? [' Además te queda ', { pos: m(igv.saldoFavor) }, ' de saldo a favor de IGV para el próximo mes.'] : []),
          ...(igv.noDeducible > 0
            ? [' Ojo: perdiste ', { neg: m(igv.noDeducible) }, ' de crédito fiscal por compras con boleta o de proveedores no habidos.']
            : []),
        ],
      },
      {
        type: 'actions',
        items: [
          { label: 'Ver impuestos', to: '/sunat/impuestos', icon: 'calculate' },
          { label: 'Ver comprobantes', to: '/sunat/comprobantes', icon: 'receipt_long' },
        ],
      },
    ]
  }

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

  if (ledger.empty && !q.includes('conectar')) {
    return [
      {
        type: 'p',
        text: [{ b: business }, ' aún no tiene cuentas conectadas, así que todavía no tengo movimientos que analizar.'],
      },
      {
        type: 'p',
        text: 'Conecta un banco, una API, una base de datos o un Excel de este RUC y te explico sus ingresos, egresos y balance.',
      },
      { type: 'actions', items: [{ label: 'Conectar cuenta', to: '/conexiones/nueva', icon: 'add' }] },
    ]
  }

  // Las 5 respuestas de un vistazo
  if (/\bcomo (esta|va|anda|vamos|voy)\b/.test(q)) {
    const cobrar = corte(cuentas, 'cobrar', periodKey)
    const pagar = corte(cuentas, 'pagar', periodKey)
    const alertas: RichText = [
      ...(cobrar.vencido > 0 ? [' Ojo: ', { neg: m(cobrar.vencido) }, ' de lo que te deben ya venció.'] : []),
      ...(pagar.vencido > 0 ? [' Tienes ', { neg: m(pagar.vencido) }, ' vencidos con proveedores.'] : []),
    ]
    return [
      { type: 'p', text: ['Así está ', { b: business }, ' en ', month, ':'] },
      {
        type: 'table',
        head: ['Concepto', 'Monto'],
        rows: [
          ['Ingresos (entró)', m(t.ingresos)],
          ['Egresos (salió)', m(t.egresos)],
          ['Utilidad (te queda)', m(t.neto)],
          ['Por cobrar (te deben)', m(cobrar.total)],
          ['Por pagar (debes)', m(pagar.total)],
        ],
      },
      {
        type: 'p',
        text: [
          t.neto >= 0 ? 'Ganas dinero: tu margen es de ' : 'Este mes salió más de lo que entró: tu margen es de ',
          t.neto >= 0 ? { pos: `${margin}%` } : { neg: `${margin}%` },
          '.',
          ...alertas,
        ],
      },
      {
        type: 'actions',
        items: [
          { label: 'Ver por cobrar', to: '/cuentas/cobrar', icon: 'call_received' },
          { label: 'Ver por pagar', to: '/cuentas/pagar', icon: 'call_made' },
        ],
      },
    ]
  }

  if (/\b(me|nos|le) deben\b|cobrar|cobranza|deudor/.test(q)) return cuentasAnswer(corte(cuentas, 'cobrar', periodKey), business)

  if (/\b(debo|debemos|debe|pagar|proveedor(es)?|deudas?)\b/.test(q)) return cuentasAnswer(corte(cuentas, 'pagar', periodKey), business)

  if (q.includes('consolidado') || q.includes('todas mis cuentas') || q.includes('general')) {
    const total = connections.reduce((acc, c) => acc + c.balance, 0)
    return [
      {
        type: 'p',
        text: ['Este es el consolidado de las ', { b: `${connections.length} cuentas conectadas` }, ' de ', { b: business }, ':'],
      },
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
          '.',
          ...(idle ? [' ', { b: idle.name }, ' aún no tiene movimientos: actualízala para incluirla.'] : []),
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
          '.',
          ...(topAccount ? [' Lo que más aportó fue ', { b: topAccount.connection.name }, '.'] : []),
        ],
      },
      { type: 'list', items: top.map((tx) => [{ b: tx.title }, ': ', tx.amount > 0 ? { pos: m(tx.amount, 'always') } : { neg: m(tx.amount) }]) },
      {
        type: 'p',
        text: ['Ojo: ', { b: 'Comercial' }, ' viene subiendo frente a febrero. Si quieres, te aviso cuando supere tu promedio.'],
      },
    ]
  }

  if (/\b(queda|quedo|quedan|utilidad|ganancias?|gane|gano|margen)\b/.test(q)) {
    const index = ledger.periods.findIndex((p) => p.key === period.key)
    const prev = index > 0 ? ledger.periods[index - 1] : null
    const prevNeto = prev ? Math.round((prev.ingresos - prev.egresos) * 100) / 100 : null
    return [
      {
        type: 'p',
        text: [
          'En ',
          month,
          ', a ',
          { b: business },
          t.neto >= 0 ? ' le quedaron ' : ' le faltaron ',
          t.neto >= 0 ? { pos: m(t.neto) } : { neg: m(-t.neto) },
          prev && prevNeto !== null ? ` (en ${periodLabel(prev).toLowerCase()} fueron ${m(prevNeto)})` : '',
          '.',
        ],
      },
      {
        type: 'table',
        head: ['Concepto', 'Monto'],
        rows: [
          ['Ingresos (entró)', m(t.ingresos)],
          ['Egresos (salió)', m(-t.egresos)],
        ],
        foot: ['Utilidad (te queda)', m(t.neto)],
      },
      {
        type: 'p',
        text: !t.ingresos
          ? 'Aún no hay ingresos este mes, así que no puedo calcular tu margen.'
          : margin >= 0
            ? ['Tu margen es de ', { b: `${margin}%` }, `: de cada S/ 100 que entran, te quedan S/ ${margin}.`]
            : ['Tu margen es de ', { neg: `${margin}%` }, `: por cada S/ 100 que entran, salen S/ ${100 - margin}.`],
      },
      {
        type: 'actions',
        items: [
          { label: 'Ver movimientos', to: '/movimientos/todo', icon: 'savings' },
          { label: 'Ver resumen', to: '/resumen', icon: 'bar_chart' },
        ],
      },
    ]
  }

  if (/egres|salio|salieron|gaste|gasto|gastamos/.test(q)) {
    const cat = expenseCats.find((c) => q.includes(normalize(c.label)))
    if (cat) {
      return [
        {
          type: 'p',
          text: ['En ', month, ' gastaste ', { neg: m(cat.total) }, ' en ', { b: cat.label }, `, el ${cat.share}% de tus egresos.`],
        },
        {
          type: 'list',
          items: cat.transactions.slice(0, 3).map((tx) => [{ b: tx.title }, ': ', { neg: m(tx.amount) }]),
        },
        { type: 'actions', items: [{ label: 'Ver egresos', to: '/movimientos/egresos', icon: 'trending_down' }] },
      ]
    }
    return [
      {
        type: 'p',
        text: [
          'En ',
          month,
          ', ',
          { b: business },
          ' gastó ',
          { neg: m(t.egresos) },
          dOut !== null ? ` (${signed(dOut)} vs. el mes anterior)` : '',
          '.',
        ],
      },
      {
        type: 'table',
        head: ['Categoría', 'Monto', '%'],
        rows: expenseCats.map((c) => [c.label, m(c.total), `${c.share}%`]),
        foot: ['Total', m(t.egresos), '100%'],
      },
      ...(expenseCats[0]
        ? [{ type: 'p', text: ['Donde más se va tu dinero es ', { b: expenseCats[0].label }, ` (${expenseCats[0].share}%).`] } as ChatBlock]
        : []),
      { type: 'actions', items: [{ label: 'Ver egresos', to: '/movimientos/egresos', icon: 'trending_down' }] },
    ]
  }

  if (/ingres|entro|entraron|vendi|vendimos|ventas/.test(q)) {
    return [
      {
        type: 'p',
        text: [
          'En ',
          month,
          ', ',
          { b: business },
          ' recibió ',
          { pos: m(t.ingresos) },
          dIn !== null ? ` (${signed(dIn)} vs. el mes anterior)` : '',
          '.',
        ],
      },
      {
        type: 'table',
        head: ['Categoría', 'Monto', '%'],
        rows: incomeCats.map((c) => [c.label, m(c.total), `${c.share}%`]),
        foot: ['Total', m(t.ingresos), '100%'],
      },
      ...(incomeCats[0]
        ? [{ type: 'p', text: ['Lo que más aportó fue ', { b: incomeCats[0].label }, ` (${incomeCats[0].share}%).`] } as ChatBlock]
        : []),
      { type: 'actions', items: [{ label: 'Ver ingresos', to: '/movimientos/ingresos', icon: 'trending_up' }] },
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
          [{ b: 'Utilidad: ' }, t.neto >= 0 ? { pos: m(t.neto, 'always') } : { neg: m(t.neto) }, `, un margen de ${margin}%.`],
        ],
      },
      {
        type: 'p',
        text: [
          'Mi recomendación: revisa los gastos de ',
          { b: expenseCats[0]?.label.toLowerCase() ?? 'comercial' },
          ' y concilia los cobros pendientes de ',
          { b: topAccount?.connection.name ?? business },
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
        'Puedo decirte en segundos ',
        { b: 'cuánto entró' },
        ', ',
        { b: 'cuánto salió' },
        ', ',
        { b: 'cuánto te queda' },
        ', ',
        { b: 'cuánto te deben' },
        ' y ',
        { b: 'cuánto debes' },
        '. También puedo explicar tu balance o armar un consolidado de tus cuentas.',
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
