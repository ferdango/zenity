/**
 * Datos de ejemplo de Zenity. Todo es ficticio y consistente entre pantallas:
 * los totales de cada mes se calculan a partir de las transacciones.
 */

export type AvatarKind = 'visa' | 'mastercard' | 'sheet' | 'api' | 'bank'
export type CardTheme = 'purple' | 'indigo' | 'light' | 'green' | 'blue' | 'navy' | 'yellow' | 'slate'
export type TxType = 'income' | 'expense'

export interface Connection {
  id: string
  label: string
  name: string
  /** Nombre corto usado en listas de movimientos */
  shortName: string
  last4?: string
  holder?: string
  balance: number
  theme: CardTheme
  avatar: AvatarKind
  /** Fuente de conexión (para conexiones creadas desde "Nueva cuenta") */
  sourceId?: string
}

export const USER = {
  firstName: 'Fernando',
  fullName: 'Fernando Goicochea',
  initials: 'FG',
}

export const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: 'negocio-retail',
    label: 'Conexión API',
    name: 'Negocio Retail 1',
    shortName: 'API Negocio Retail',
    balance: 2145.3,
    theme: 'purple',
    avatar: 'api',
  },
  {
    id: 'tarjeta-1789',
    label: 'Tarjeta Crédito',
    name: 'Visa Signature',
    shortName: 'Tarjeta crédito 1789',
    last4: '1789',
    holder: 'Fernando Goicochea',
    balance: 1244.9,
    theme: 'indigo',
    avatar: 'visa',
  },
  {
    id: 'tinbet',
    label: 'Tarjeta Crédito',
    name: 'Cuenta Tinbet',
    shortName: 'Cuenta Tinbet',
    last4: '5032',
    holder: 'Fernando Goicochea',
    balance: 500,
    theme: 'light',
    avatar: 'mastercard',
  },
  {
    id: 'locales-nacional',
    label: 'Excel',
    name: 'Locales Nacional',
    shortName: 'Hoja de cálculo',
    balance: 0,
    theme: 'green',
    avatar: 'sheet',
  },
]

/* ── Categorías ─────────────────────────────────────────────── */

export type IncomeCategory = 'ventas' | 'cobros' | 'recurrentes' | 'financieros' | 'extraordinarios'
export type ExpenseCategory = 'operaciones' | 'comercial' | 'personal' | 'gastos' | 'finanzas'
export type CategoryId = IncomeCategory | ExpenseCategory

export const CATEGORIES: Record<CategoryId, { label: string; icon: string; type: TxType }> = {
  ventas: { label: 'Ventas', icon: 'point_of_sale', type: 'income' },
  cobros: { label: 'Cobros', icon: 'payments', type: 'income' },
  recurrentes: { label: 'Recurrentes', icon: 'autorenew', type: 'income' },
  financieros: { label: 'Financieros', icon: 'savings', type: 'income' },
  extraordinarios: { label: 'Extraordinarios', icon: 'bolt', type: 'income' },
  operaciones: { label: 'Operaciones', icon: 'inventory_2', type: 'expense' },
  comercial: { label: 'Comercial', icon: 'storefront', type: 'expense' },
  personal: { label: 'Personal', icon: 'person', type: 'expense' },
  gastos: { label: 'Gastos', icon: 'shopping_bag', type: 'expense' },
  finanzas: { label: 'Finanzas', icon: 'account_balance', type: 'expense' },
}

export const INCOME_CATEGORIES: IncomeCategory[] = ['ventas', 'recurrentes', 'extraordinarios', 'cobros', 'financieros']
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['operaciones', 'comercial', 'personal', 'gastos', 'finanzas']

/* ── Transacciones (marzo 2026) ─────────────────────────────── */

export interface Transaction {
  id: string
  accountId: string
  title: string
  amount: number
  date: string
  category: CategoryId
  operation: string
  origin: string
  destination: string
}

export const BASE_TRANSACTIONS: Transaction[] = [
  // Ingresos → S/ 1,890.20
  { id: 't1', accountId: 'negocio-retail', title: 'Venta POS · Tienda Miraflores', amount: 420, date: '2026-03-28T19:42', category: 'ventas', operation: '0097873323', origin: '1910898773626893', destination: '1910455120983317' },
  { id: 't2', accountId: 'negocio-retail', title: 'Venta online · Pedido #4821', amount: 310.5, date: '2026-03-24T11:05', category: 'ventas', operation: '0097873190', origin: '1910898773620021', destination: '1910455120983317' },
  { id: 't3', accountId: 'negocio-retail', title: 'Cobro factura F001-238 · Andina SAC', amount: 389.5, date: '2026-03-20T22:15', category: 'cobros', operation: '0097872881', origin: '1910777410023658', destination: '1910455120983317' },
  { id: 't4', accountId: 'tarjeta-1789', title: 'Suscripción mensual · Lumen Studio', amount: 180.2, date: '2026-03-15T09:30', category: 'recurrentes', operation: '0097871102', origin: '1910302215548870', destination: '4557880011221789' },
  { id: 't5', accountId: 'tarjeta-1789', title: 'Intereses de ahorro', amount: 90, date: '2026-03-01T06:00', category: 'financieros', operation: '0097869955', origin: '1910000000000001', destination: '4557880011221789' },
  { id: 't6', accountId: 'tinbet', title: 'Transferencia recibida · Tinbet SAC', amount: 350, date: '2026-03-26T16:20', category: 'cobros', operation: '0097873001', origin: '1910654400128843', destination: '5412750033445032' },
  { id: 't7', accountId: 'tinbet', title: 'Devolución de impuestos · SUNAT', amount: 150, date: '2026-03-12T10:10', category: 'extraordinarios', operation: '0097870566', origin: '0000000000000068', destination: '5412750033445032' },
  // Egresos → S/ 890.20
  { id: 't8', accountId: 'negocio-retail', title: 'Compra de insumos · Makro', amount: -210.5, date: '2026-03-27T13:22', category: 'operaciones', operation: '0097873270', origin: '1910455120983317', destination: '1910120044557812' },
  { id: 't9', accountId: 'negocio-retail', title: 'Campaña Meta Ads', amount: -120, date: '2026-03-18T08:00', category: 'comercial', operation: '0097872455', origin: '1910455120983317', destination: '4000123412341234' },
  { id: 't10', accountId: 'negocio-retail', title: 'Delivery · Rappi', amount: -80, date: '2026-03-22T21:47', category: 'operaciones', operation: '0097872990', origin: '1910455120983317', destination: '1910887700112233' },
  { id: 't11', accountId: 'tarjeta-1789', title: 'Almuerzo de equipo · La Mar', amount: -96.4, date: '2026-03-21T14:05', category: 'gastos', operation: '0097872901', origin: '4557880011221789', destination: '1910442211009988' },
  { id: 't12', accountId: 'tarjeta-1789', title: 'Netflix', amount: -44.9, date: '2026-03-10T07:00', category: 'personal', operation: '0097870311', origin: '4557880011221789', destination: '4000987698769876' },
  { id: 't13', accountId: 'tarjeta-1789', title: 'Comisión de mantenimiento', amount: -18.4, date: '2026-03-05T00:10', category: 'finanzas', operation: '0097869802', origin: '4557880011221789', destination: '1910000000000001' },
  { id: 't14', accountId: 'tarjeta-1789', title: 'Google Workspace', amount: -200, date: '2026-03-03T12:00', category: 'comercial', operation: '0097869700', origin: '4557880011221789', destination: '4000555566667777' },
  { id: 't15', accountId: 'tinbet', title: 'Luz del Sur', amount: -120, date: '2026-03-16T18:30', category: 'personal', operation: '0097871400', origin: '5412750033445032', destination: '1910321100554433' },
]

/* ── Periodos (los 6 meses con datos) ─────────────────────────── */

export interface Period {
  key: string
  month: number
  year: number
  ingresos: number
  egresos: number
  /** Balance total consolidado al cierre del mes */
  balance: number
}

export const PERIODS: Period[] = [
  { key: '2025-10', month: 9, year: 2025, ingresos: 1520.4, egresos: 980.3, balance: 2410.3 },
  { key: '2025-11', month: 10, year: 2025, ingresos: 1760.1, egresos: 1050.9, balance: 2980.6 },
  { key: '2025-12', month: 11, year: 2025, ingresos: 3240, egresos: 1730.4, balance: 4900 },
  { key: '2026-01', month: 0, year: 2026, ingresos: 1410.7, egresos: 1220.1, balance: 3120.4 },
  { key: '2026-02', month: 1, year: 2026, ingresos: 1650.3, egresos: 1180.6, balance: 3457.8 },
  { key: '2026-03', month: 2, year: 2026, ingresos: 1890.2, egresos: 890.2, balance: 3890.2 },
]

export const DEFAULT_PERIOD = '2026-03'

/* ── Movimientos por revisar (sin categoría) ──────────────────── */

export interface PendingTransaction extends Omit<Transaction, 'category'> {
  recommended: CategoryId
}

export const PENDING_TRANSACTIONS: PendingTransaction[] = [
  { id: 'p1', accountId: 'tarjeta-1789', title: 'Transferencia · J. Ramírez', amount: 385, date: '2026-03-29T10:12', recommended: 'recurrentes', operation: '0097873323', origin: '1910898773626893', destination: '4557880011221789' },
  { id: 'p2', accountId: 'negocio-retail', title: 'Pago con QR · Bodega San Martín', amount: -64.5, date: '2026-03-29T08:40', recommended: 'operaciones', operation: '0097873360', origin: '1910455120983317', destination: '1910700012345678' },
  { id: 'p3', accountId: 'negocio-retail', title: 'Abono · PedidosYa', amount: 212.8, date: '2026-03-28T23:05', recommended: 'ventas', operation: '0097873349', origin: '1910123498761234', destination: '1910455120983317' },
  { id: 'p4', accountId: 'locales-nacional', title: 'Fila 214 · Proveedor sin nombre', amount: -480, date: '2026-03-28T12:00', recommended: 'operaciones', operation: 'XLS-000214', origin: 'Hoja «Compras»', destination: 'Proveedor desconocido' },
  { id: 'p5', accountId: 'tarjeta-1789', title: 'Cargo recurrente · Spotify', amount: -22.9, date: '2026-03-27T07:00', recommended: 'personal', operation: '0097873280', origin: '4557880011221789', destination: '4000111122223333' },
  { id: 'p6', accountId: 'tinbet', title: 'Compra · Plaza Vea', amount: -156.3, date: '2026-03-26T19:18', recommended: 'gastos', operation: '0097873050', origin: '5412750033445032', destination: '1910555566667777' },
  { id: 'p7', accountId: 'tinbet', title: 'Compra · Sodimac', amount: -389.9, date: '2026-03-25T17:44', recommended: 'operaciones', operation: '0097872980', origin: '5412750033445032', destination: '1910888899990000' },
  { id: 'p8', accountId: 'tarjeta-1789', title: 'Abono · Mercado Pago', amount: 145, date: '2026-03-24T15:31', recommended: 'cobros', operation: '0097872911', origin: '1910246813579135', destination: '4557880011221789' },
]

/* ── Insights de IA ─────────────────────────────────────────── */

export type RichText = Array<string | { b: string } | { pos: string } | { neg: string }>

export interface Insight {
  id: string
  avatar: AvatarKind
  title: string
  body: RichText
  note?: string
}

export const HOME_INSIGHTS: Insight[] = [
  {
    id: 'i-excel',
    avatar: 'sheet',
    title: 'Locales Nacional: detectamos un aumento atípico en compras',
    body: [
      'El cierre del mes pasado la cuenta ',
      { b: 'Locales Nacional' },
      ' cerró con un balance de ',
      { pos: '+S/ 385' },
      '. Entró más dinero del que salió, con ',
      { pos: 'S/ 4,280' },
      ' en ingresos y ',
      { neg: 'S/ 3,895' },
      ' en egresos.',
    ],
    note: 'Para ver un balance actualizado, importa el Excel al día de hoy.',
  },
  {
    id: 'i-api',
    avatar: 'api',
    title: 'Negocio Retail 1: tus cobros crecieron, pero el margen se redujo',
    body: [
      'En marzo la cuenta ',
      { b: 'API Negocio Retail' },
      ' recibió ',
      { pos: 'S/ 1,120.00' },
      ' (+18% vs. febrero), pero sus egresos subieron a ',
      { neg: 'S/ 410.50' },
      ' por la compra de insumos.',
    ],
  },
]

/* ── Fuentes de conexión ────────────────────────────────────── */

export type SourceKind = 'bank' | 'api' | 'database' | 'file'

export interface Source {
  id: string
  name: string
  description: string
  kind: SourceKind
  badge?: { label: string; tone: 'pink' | 'orange' | 'blue' }
  logo:
    | { type: 'image'; src: string; tile?: string }
    | { type: 'monogram'; text: string; theme: 'bcp' | 'bbva' | 'pichincha' }
    | { type: 'icon'; icon: string; tile: string }
  /** Simula credenciales inválidas para mostrar el estado de error */
  simulateError?: boolean
  theme: CardTheme
}

export const SOURCE_FILTERS: Array<{ id: 'all' | SourceKind; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'bank', label: 'Bancos' },
  { id: 'api', label: 'APIs' },
  { id: 'database', label: 'Bases de datos' },
  { id: 'file', label: 'Archivos' },
]

/* ── Notificaciones ─────────────────────────────────────────── */

export const NOTIFICATIONS = [
  { id: 'n1', icon: 'auto_awesome', title: 'Tienes 8 movimientos por revisar', time: 'Hace 2 min', tone: 'ai' as const },
  { id: 'n2', icon: 'task_alt', title: 'El cobro de Andina SAC fue conciliado', time: 'Hace 1 h', tone: 'positive' as const },
  { id: 'n3', icon: 'warning', title: 'Comercial subió 32% vs. febrero', time: 'Ayer', tone: 'warning' as const },
  { id: 'n4', icon: 'account_balance', title: 'Ya puedes conectar BBVA Perú', time: 'Hace 2 días', tone: 'neutral' as const },
]

export const FAQ = [
  {
    q: '¿Zenity mueve mi dinero?',
    a: 'No. Zenity solo lee tus movimientos para consolidarlos y explicarlos. Nunca realiza pagos ni transferencias.',
  },
  {
    q: '¿Cómo clasifica la IA mis transacciones?',
    a: 'Analiza el comercio, el monto y tu historial. Cuando no está segura, te pide revisar y aprende de tus correcciones.',
  },
  {
    q: '¿Puedo conectar un Excel o una base de datos?',
    a: 'Sí. Puedes importar Excel, XML o conectar MySQL, SQL Server y PostgreSQL desde «Nueva cuenta».',
  },
]
