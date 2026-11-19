/**
 * Tipos de conexión y saldo real. No todas las conexiones guardan plata: los canales de venta (Yape,
 * Plin, POS, tiendas por API) son por dónde te pagan, y lo que cobran se abona en una cuenta. Si se
 * sumaran sus saldos con los de las cuentas, la misma venta contaría dos veces. Las tarjetas de crédito
 * son deuda y los archivos son datos: tampoco se suman.
 */
import type { AvatarKind, Connection, SourceKind } from '../data/mock.ts'

export type TipoConexion = 'cuenta' | 'canal' | 'tarjeta' | 'archivo'

export const TIPOS_CONEXION: Record<TipoConexion, { titulo: string; detalle: string; icon: string }> = {
  cuenta: { titulo: 'Cuentas', detalle: 'Donde está tu plata', icon: 'account_balance' },
  canal: { titulo: 'Canales de venta', detalle: 'Por dónde te pagan', icon: 'storefront' },
  tarjeta: { titulo: 'Tarjetas de crédito', detalle: 'Lo que debes', icon: 'credit_card' },
  archivo: { titulo: 'Archivos', detalle: 'Datos que lee Zenity', icon: 'description' },
}

export const ORDEN_TIPOS: TipoConexion[] = ['cuenta', 'canal', 'tarjeta', 'archivo']

const POR_AVATAR: Record<AvatarKind, TipoConexion> = {
  bank: 'cuenta',
  yape: 'canal',
  plin: 'canal',
  api: 'canal',
  visa: 'tarjeta',
  mastercard: 'tarjeta',
  sheet: 'archivo',
  pdf: 'archivo',
}

/** Tipo de una conexión: por su fuente si se creó desde «Nueva conexión»; si no, por su avatar. */
export function tipoConexion(c: Pick<Connection, 'avatar'>, kind?: SourceKind): TipoConexion {
  if (kind === 'bank') return 'cuenta'
  if (kind === 'wallet' || kind === 'api') return 'canal'
  if (kind === 'file') return 'archivo'
  return POR_AVATAR[c.avatar] ?? 'archivo'
}

/** Saldo real del negocio: solo las cuentas (los canales ya se abonaron en ellas; las tarjetas son deuda). */
export function saldoEnCuentas(conexiones: { balance: number; tipo: TipoConexion }[]): number {
  return Math.round(conexiones.filter((c) => c.tipo === 'cuenta').reduce((s, c) => s + c.balance, 0) * 100) / 100
}

/** Cuenta donde se abonan los cobros de un canal («Yape · se abona en tu BCP» → «tu BCP»). */
export function seAbonaEn(c: Pick<Connection, 'label'>, settlesIn?: string): string | null {
  if (settlesIn) return settlesIn
  const m = c.label.match(/se abona en (.+)$/i)
  return m ? m[1] : null
}
