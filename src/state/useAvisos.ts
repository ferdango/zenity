/** Notificaciones de la campana, calculadas con los datos del negocio (cada una lleva a su pantalla). */
import { useMemo } from 'react'
import { HOY } from '../config/demo'
import { contenido } from '../domain/lessons'
import { proximoVencimiento } from '../domain/calendar'
import { textoAlerta } from '../domain/cashflow'
import { resumenMes } from '../domain/engine'
import { fmtFecha, fmtSolesCorto } from '../domain/util'
import { CONTADOR } from './demoStore'
import { useCaja, useCobranzas, useLecciones, useZen } from './useZen'

export interface Aviso {
  id: string
  icon: string
  title: string
  time: string
  tone: 'ai' | 'positive' | 'warning' | 'neutral'
  to: string
  /** Pide una acción (enciende el punto de la campana) */
  urgente?: boolean
}

export function useAvisos(): Aviso[] | null {
  const { a, demo } = useZen()
  const caja = useCaja(60)
  const cobranzas = useCobranzas()
  const lecciones = useLecciones()
  return useMemo(() => {
    if (!a) return null
    const id = a.business.id
    const out: Aviso[] = []
    const preguntas = demo.comments.filter((c) => c.businessId === id && c.pregunta && !c.respondida).length
    if (preguntas) out.push({ id: 'preguntas', icon: 'support_agent', title: `${CONTADOR.nombre} te hizo ${preguntas === 1 ? 'una pregunta' : `${preguntas} preguntas`}`, time: 'Ahora', tone: 'ai', to: '/revisar', urgente: true })
    const sol = demo.credito[id]?.solicitud
    if (sol?.estado === 'PRE_APROBADA') out.push({ id: 'credito', icon: 'credit_score', title: `¡El BCP pre-aprobó tu crédito de ${fmtSolesCorto(sol.respuesta?.monto ?? sol.monto)}!`, time: 'Ahora', tone: 'positive', to: '/credito', urgente: true })
    if (sol?.estado === 'MAS_INFO') out.push({ id: 'credito', icon: 'credit_score', title: 'El BCP necesita un dato más para tu crédito', time: 'Ahora', tone: 'warning', to: '/credito', urgente: true })
    const pagos = demo.extraMovements.filter((m) => m.businessId === id && !m.id.startsWith('desembolso')).slice(-2).reverse()
    for (const m of pagos) out.push({ id: m.id, icon: 'task_alt', title: `${m.contraparteNombre ?? 'Un cliente'} te pagó ${fmtSolesCorto(m.monto)} y Zenity lo concilió`, time: 'Hace un momento', tone: 'positive', to: '/conciliacion' })
    if (a.porRevisar.length) out.push({ id: 'revisar', icon: 'fact_check', title: `Tienes ${a.porRevisar.length} movimiento${a.porRevisar.length === 1 ? '' : 's'} por revisar`, time: 'Hoy', tone: 'ai', to: '/revisar', urgente: true })
    if (caja?.alerta) out.push({ id: 'caja', icon: 'warning', title: textoAlerta(caja.alerta), time: 'Hoy', tone: 'warning', to: '/caja', urgente: true })
    const vencida = cobranzas.filter((c) => c.diasVencidos > 30 && !c.promesa)[0]
    if (vencida) out.push({ id: 'vencida', icon: 'request_quote', title: `${vencida.comprobante.nombreContraparte} te debe ${fmtSolesCorto(vencida.monto)} hace ${vencida.diasVencidos} días`, time: 'Hoy', tone: 'warning', to: '/cobrar' })
    const r = resumenMes(a, HOY.slice(0, 7))
    out.push({ id: 'conciliado', icon: 'auto_awesome', title: `Zenity concilió ${r.porEstado.CONCILIADO.count} movimientos de noviembre (${Math.round(r.conciliado * 100)}%)`, time: 'Hace 2 h', tone: 'ai', to: '/conciliacion' })
    const leccion = lecciones?.activas.find((l) => !demo.leccionesCerradas.includes(`${id}:${l}`))
    if (leccion && lecciones) out.push({ id: `l-${leccion}`, icon: 'school', title: `Nueva lección: ${contenido(leccion, lecciones.context).titulo}`, time: 'Hoy', tone: 'ai', to: '/aprende' })
    const v = proximoVencimiento(a.business.ruc, HOY)
    out.push({ id: 'sunat', icon: 'event', title: `Tu declaración SUNAT vence el ${fmtFecha(v.fecha)} (en ${v.dias} días)`, time: 'Recordatorio', tone: 'neutral', to: '/caja' })
    return out
  }, [a, demo, caja, cobranzas, lecciones])
}
