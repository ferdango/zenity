/** Conexiones según su tipo, para las pantallas: saldo real (sin duplicar) y lo que cobra cada canal. */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { saldoEnCuentas, seAbonaEn, type TipoConexion, tipoConexion } from '../domain/conexiones'
import type { Connection } from '../data/mock'
import { filterByAccount, getTransactions, totals } from '../data/selectors'
import { getSource } from '../data/sources'
import { useApp } from './context'
import { useZen } from './useZen'

export function tipoDe(c: Connection): TipoConexion {
  return tipoConexion(c, getSource(c.sourceId)?.kind)
}

/** Saldo real: solo las cuentas. Los canales de venta ya se abonaron en ellas y las tarjetas son deuda. */
export function saldoReal(conexiones: Connection[]): number {
  return saldoEnCuentas(conexiones.map((c) => ({ balance: c.balance, tipo: tipoDe(c) })))
}

/** «tu BCP», «tu cuenta BBVA…» o null. */
export function abonaEn(c: Connection): string | null {
  return seAbonaEn(c, getSource(c.sourceId)?.settlesIn)
}

/**
 * Lo que entró por un canal de venta este mes: en la demo, los cobros de Yape del mes; en los demás
 * negocios, los ingresos de esa conexión en el periodo elegido. null si no hay datos.
 */
export function useCobradoCanal(c: Connection): number | null {
  const { a } = useZen()
  const { ledger, periodKey } = useApp()
  return useMemo(() => {
    if (tipoDe(c) !== 'canal') return null
    if (a && c.avatar === 'yape') {
      const mes = HOY.slice(0, 7)
      const total = a.data.yapePayments.filter((y) => y.fecha.slice(0, 7) === mes).reduce((s, y) => s + y.monto, 0)
      return Math.round(total * 100) / 100
    }
    const ingresos = totals(filterByAccount(getTransactions(ledger, periodKey), c.id)).ingresos
    return ingresos > 0 ? ingresos : null
  }, [a, c, ledger, periodKey])
}
