import type { Connection } from './mock'

/**
 * Sincronización automática: Zenity lee cada conexión por su cuenta, sin botones. Una
 * conexión nueva se sincroniza apenas se agrega y todas vuelven a leerse cada 6 horas
 * (en el prototipo, mientras la app está abierta y al volver a abrirla).
 */

/** Cada cuánto Zenity vuelve a leer las cuentas conectadas. */
export const SYNC_EVERY_HOURS = 6
const SYNC_EVERY_MS = SYNC_EVERY_HOURS * 60 * 60 * 1000

/** Lo que tarda la primera sincronización (simulada) de una conexión nueva. */
export const FIRST_SYNC_MS = 3000

/** Cada cuánto se revisa si alguna conexión ya toca sincronizarse. */
export const SYNC_CHECK_MS = 60_000

/** La conexión nunca se sincronizó (recién agregada). */
export function isNew(connection: Connection): boolean {
  return !connection.syncedAt
}

/** Ya pasaron 6 horas desde su última lectura. */
export function isStale(connection: Connection, now: number): boolean {
  return Boolean(connection.syncedAt) && now - Date.parse(connection.syncedAt as string) >= SYNC_EVERY_MS
}

/** Resultado de leer la conexión: las nuevas reciben su saldo y todas guardan la hora. */
export function synced(connection: Connection, now: number): Connection {
  const { sourceId } = connection
  if (!sourceId || connection.balance !== 0) return { ...connection, syncedAt: new Date(now).toISOString() }
  const seed = [...sourceId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return { ...connection, balance: 800 + ((seed * 97) % 2400) + 0.45, syncedAt: new Date(now).toISOString() }
}
