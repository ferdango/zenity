/**
 * «Tu negocio en esta unidad»: cada unidad del camino mueve un número real del negocio. Mostrarlo
 * une el aprendizaje con el interés del dueño (fórmula de Zenity: datos reales + interés en su
 * negocio + juego + aprendizaje). Función pura: recibe los números ya calculados.
 */
import { fmtDiaMes, fmtPct, fmtSolesCorto } from './util.ts'

export type UnidadId = 'ordena' | 'separa' | 'cobra' | 'anticipa' | 'sunat'

export interface Indicador {
  /** El número del negocio, en palabras: «62% conciliado» */
  texto: string
  /** Hacia dónde se quiere llegar: «meta 90%» */
  meta: string
  /** Avance hacia la meta, de 0 a 1; null si no aplica (un dato informativo) */
  progreso: number | null
  logrado: boolean
}

export interface EntradaIndicadores {
  /** Conciliado del mes, de 0 a 1 */
  conciliado: number
  /** Gastos personales pagados con la cuenta del negocio este mes (positivo) */
  gastoPersonalMes: number
  sueldoDueno: number | null
  /** Total por cobrar y lo que ya está vencido */
  porCobrar: number
  vencido: number
  /** Proyección de caja: el punto más bajo y el colchón mínimo */
  caja: { minimo: number; colchon: number } | null
  /** Próximo pago a SUNAT */
  sunat: { total: number; vence: string; dias: number } | null
}

/** Conciliado que se considera «mes en orden». */
export const META_CONCILIADO = 0.9

const entre0y1 = (n: number) => Math.min(1, Math.max(0, n))

export function indicadores(e: EntradaIndicadores): Record<UnidadId, Indicador> {
  const separa: Indicador = e.sueldoDueno
    ? {
        texto: `${fmtSolesCorto(e.gastoPersonalMes)} de gasto personal`,
        meta: `tu sueldo: ${fmtSolesCorto(e.sueldoDueno)}`,
        progreso: e.gastoPersonalMes <= e.sueldoDueno ? 1 : entre0y1(e.sueldoDueno / e.gastoPersonalMes),
        logrado: e.gastoPersonalMes <= e.sueldoDueno,
      }
    : {
        texto: `${fmtSolesCorto(e.gastoPersonalMes)} de gasto personal este mes`,
        meta: 'sin sueldo de dueño',
        progreso: null,
        logrado: false,
      }

  const anticipa: Indicador = e.caja
    ? {
        texto: e.caja.minimo >= e.caja.colchon ? `tu caja no baja de ${fmtSolesCorto(e.caja.minimo)}` : `tu caja baja a ${fmtSolesCorto(e.caja.minimo)}`,
        meta: `colchón ${fmtSolesCorto(e.caja.colchon)}`,
        progreso: e.caja.colchon > 0 ? entre0y1(e.caja.minimo / e.caja.colchon) : 1,
        logrado: e.caja.minimo >= e.caja.colchon,
      }
    : { texto: 'sin proyección de caja', meta: 'conecta tu banco', progreso: null, logrado: false }

  return {
    ordena: {
      texto: `${fmtPct(e.conciliado)} conciliado`,
      meta: `meta ${fmtPct(META_CONCILIADO)}`,
      progreso: entre0y1(e.conciliado / META_CONCILIADO),
      logrado: e.conciliado >= META_CONCILIADO,
    },
    separa,
    cobra: {
      texto: e.vencido > 0 ? `${fmtSolesCorto(e.vencido)} vencido` : 'nada vencido',
      meta: 'meta S/ 0',
      progreso: e.porCobrar > 0 ? entre0y1(1 - e.vencido / e.porCobrar) : 1,
      logrado: e.vencido <= 0,
    },
    anticipa,
    sunat: e.sunat
      ? {
          texto: `${fmtSolesCorto(e.sunat.total)} a pagar`,
          meta: `vence el ${fmtDiaMes(e.sunat.vence)} (${e.sunat.dias} días)`,
          progreso: null,
          logrado: false,
        }
      : { texto: 'sin pago estimado', meta: 'autoriza SUNAT', progreso: null, logrado: false },
  }
}
