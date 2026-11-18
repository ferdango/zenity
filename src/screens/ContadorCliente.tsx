import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Pill, SectionHead } from '../components/zen'
import styles from '../components/zen/zen.module.css'
import { CATEGORIA_IDS, CATEGORIAS, CUENTAS_PCGE } from '../config/categories'
import { HOY, MESES_DEMO } from '../config/demo'
import { tituloMovimiento } from '../data/demoLedger'
import { CARTERA_RESUMIDA } from '../data/seed'
import { asientos, cuentaDe, toCsv, totales } from '../domain/accountant'
import { describeRule, ruleMatches } from '../domain/categorization'
import { type Analysis, ESTADO_LABEL, resumenMes } from '../domain/engine'
import { REGIMEN_NOMBRE } from '../domain/taxSimulator'
import type { BankMovement, CategoriaId, Rule, RuleCondition } from '../domain/types'
import { diffDays, fmtFecha, lastDayOfMonth, monthOf } from '../domain/util'
import { track } from '../lib/analytics'
import { formatMoney, MONTHS_SHORT } from '../lib/format'
import { useApp } from '../state/context'
import {
  actualizarRegla,
  analysisFor,
  asignarCuenta,
  borrarRegla,
  cerrarMes,
  comentar,
  corregir,
  crearRegla,
  permisosDe,
  reabrirMes,
  setCierre,
  useDemoState,
} from '../state/demoStore'
import { ContadorShell } from './Contador'

type Tab = 'movimientos' | 'reglas' | 'comentarios' | 'cierre' | 'exportar'
const TABS: { id: Tab; label: string }[] = [
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'reglas', label: 'Reglas del contador' },
  { id: 'comentarios', label: 'Comentarios' },
  { id: 'cierre', label: 'Cierre del mes' },
  { id: 'exportar', label: 'Exportar asientos' },
]

const mesLabel = (key: string) => `${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

/** F-08 · Vista de un cliente en el portal del contador. */
export function ContadorCliente() {
  const { id = '' } = useParams()
  const demo = useDemoState()
  const a = analysisFor(id, demo)
  const [tab, setTab] = useState<Tab>('movimientos')
  const [mes, setMes] = useState<string>(HOY.slice(0, 7))
  const resumido = CARTERA_RESUMIDA.find((c) => c.id === id)
  useEffect(() => {
    track('contador_cliente_abierto', { completo: !!a })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!a) {
    return (
      <ContadorShell title={resumido?.razonSocial ?? 'Cliente'}>
        <div className={styles.card}>
          {resumido ? (
            <>
              <p className="t-title-m">
                {REGIMEN_NOMBRE[resumido.regimen]} · {Math.round(resumido.conciliado * 100)}% conciliado · {resumido.pendientes} pendientes
              </p>
              <p className={styles.muted}>
                En la demo, este cliente solo tiene datos resumidos para el tablero. Abre Ferretería San Martín o Bodega Doña Rosa para ver movimientos, reglas,
                comentarios, cierre y exportación.
              </p>
            </>
          ) : (
            <p className={styles.muted}>No encontramos este cliente.</p>
          )}
          <Button variant="tonal" icon="arrow_back" to="/contador">
            Volver a la cartera
          </Button>
        </div>
      </ContadorShell>
    )
  }

  const permisos = permisosDe(demo, id)
  const r = resumenMes(a, mes)
  return (
    <ContadorShell
      title={
        <div style={{ display: 'grid', gap: 4, paddingTop: 12 }}>
          <div>
            <Button size="sm" variant="text" icon="arrow_back" to="/contador">
              Cartera
            </Button>
          </div>
          <h1 className="t-headline-s">{a.business.nombreComercial}</h1>
          <span className={styles.muted}>
            {a.business.razonSocial} · RUC {a.business.ruc} · {REGIMEN_NOMBRE[a.business.regimenTributario]} · {Math.round(r.conciliado * 100)}% conciliado en{' '}
            {mesLabel(mes).toLowerCase()}
          </span>
        </div>
      }
    >
      {!permisos.activo ? (
        <p className={styles.bannerDanger}>
          <Icon name="lock" size={20} />
          <span>{a.business.nombreComercial} te quitó el acceso. Pídele que lo vuelva a activar desde «Mi contador».</span>
        </p>
      ) : (
        <>
          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={styles.tab} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
            <label className={styles.small} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
              Mes
              <select className={styles.select} value={mes} onChange={(e) => setMes(e.target.value)}>
                {MESES_DEMO.map((m) => (
                  <option key={m} value={m}>
                    {mesLabel(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {tab === 'movimientos' && <Movimientos a={a} mes={mes} puedeVer={permisos.verMovimientos} puedeEditar={permisos.editarCategorias} />}
          {tab === 'reglas' && <Reglas a={a} />}
          {tab === 'comentarios' && <Comentarios a={a} />}
          {tab === 'cierre' && <Cierre a={a} mes={mes} />}
          {tab === 'exportar' && <Exportar a={a} mes={mes} />}
        </>
      )}
    </ContadorShell>
  )
}

function Movimientos({ a, mes, puedeVer, puedeEditar }: { a: Analysis; mes: string; puedeVer: boolean; puedeEditar: boolean }) {
  const { toast } = useApp()
  const demo = useDemoState()
  const [sel, setSel] = useState<string[]>([])
  const [cuenta, setCuenta] = useState('60')
  const [pregunta, setPregunta] = useState<{ m: BankMovement; texto: string } | null>(null)
  const movs = a.movements.filter((m) => monthOf(m.fecha) === mes)
  if (!puedeVer) return <p className={`${styles.card} ${styles.muted}`}>El cliente no te dio permiso para ver sus movimientos.</p>
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <section className={styles.section}>
      <div className={styles.actions} style={{ alignItems: 'center' }}>
        <span className={styles.small}>{sel.length ? `${sel.length} seleccionados` : `${movs.length} movimientos`}</span>
        <select className={styles.select} value={cuenta} onChange={(e) => setCuenta(e.target.value)} aria-label="Cuenta PCGE">
          {CUENTAS_PCGE.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.codigo} {c.nombre}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          icon="account_tree"
          disabled={!sel.length || !puedeEditar}
          onClick={() => {
            asignarCuenta(sel, cuenta)
            toast(`Cuenta ${cuenta} asignada a ${sel.length} movimientos`, 'account_tree')
            setSel([])
          }}
        >
          Asignar cuenta
        </Button>
        {!puedeEditar && <Pill tone="neutral">Solo lectura</Pill>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos"
                  checked={sel.length === movs.length && movs.length > 0}
                  onChange={(e) => setSel(e.target.checked ? movs.map((m) => m.id) : [])}
                />
              </th>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th className={styles.num}>Monto</th>
              <th>Categoría (dueño)</th>
              <th>Cuenta PCGE</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => {
              const cl = a.classifications.get(m.id)!
              const cta = cuentaDe(a, m.id, demo.pcge, demo.rules)
              return (
                <tr key={m.id} className={sel.includes(m.id) ? styles.highlightRow : undefined}>
                  <td>
                    <input type="checkbox" aria-label="Seleccionar" checked={sel.includes(m.id)} onChange={() => toggle(m.id)} />
                  </td>
                  <td>{fmtFecha(m.fecha)}</td>
                  <td className={styles.wrapCell}>
                    {tituloMovimiento(m)}
                    <br />
                    <span className={styles.muted}>{m.glosa}</span>
                  </td>
                  <td className={styles.num}>{formatMoney(m.monto, 'always')}</td>
                  <td>
                    <select
                      className={styles.select}
                      value={cl.categoriaId}
                      disabled={!puedeEditar}
                      onChange={(e) => {
                        corregir({ movementIds: [m.id], businessId: a.business.id, rubro: a.business.rubro, elegida: e.target.value as CategoriaId, origen: 'CONTADOR' })
                        toast('Categoría actualizada', 'edit')
                      }}
                    >
                      {CATEGORIA_IDS.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORIAS[c].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className={styles.select} value={cta} disabled={!puedeEditar} onChange={(e) => asignarCuenta([m.id], e.target.value)}>
                      {!CUENTAS_PCGE.some((c) => c.codigo === cta) && <option value={cta}>{cta}</option>}
                      {CUENTAS_PCGE.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.codigo} {c.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Pill tone={cl.estado === 'CONCILIADO' ? 'alta' : cl.estado === 'SIN_CATEGORIA_SEGURA' ? 'baja' : 'media'}>{ESTADO_LABEL[cl.estado]}</Pill>
                  </td>
                  <td>
                    <Button size="sm" variant="text" icon="help" onClick={() => setPregunta({ m, texto: `¿Qué fue el ${m.monto < 0 ? 'pago' : 'abono'} de ${formatMoney(Math.abs(m.monto))} del ${fmtFecha(m.fecha)} (${m.glosa})?` })}>
                      Preguntar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <BottomSheet open={!!pregunta} onClose={() => setPregunta(null)} title="Preguntar al cliente">
        {pregunta && (
          <div style={{ display: 'grid', gap: 12, padding: '0 0 16px' }}>
            <p className={styles.small}>La pregunta le llega al dueño como una tarjeta en «Por revisar». Su respuesta vuelve a este hilo.</p>
            <textarea className={styles.input} style={{ minHeight: 110 }} value={pregunta.texto} onChange={(e) => setPregunta({ ...pregunta, texto: e.target.value })} />
            <Button
              size="lg"
              icon="send"
              onClick={() => {
                comentar({ businessId: a.business.id, movementId: pregunta.m.id, autor: 'CONTADOR', texto: pregunta.texto, pregunta: true })
                toast('Pregunta enviada al cliente', 'send')
                setPregunta(null)
              }}
            >
              Enviar pregunta
            </Button>
          </div>
        )}
      </BottomSheet>
    </section>
  )
}

function Reglas({ a }: { a: Analysis }) {
  const { toast } = useApp()
  const demo = useDemoState()
  const reglas = demo.rules.filter((r) => r.businessId === a.business.id && r.scope === 'CONTADOR')
  const delDueno = demo.rules.filter((r) => r.businessId === a.business.id && r.scope === 'NEGOCIO')
  const [tipo, setTipo] = useState<'contraparteNombre' | 'rucContraparte' | 'glosaContiene'>('contraparteNombre')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<CategoriaId>('insumos')
  const [cuenta, setCuenta] = useState('60')
  const afectados = useMemo(() => {
    if (!valor.trim()) return 0
    const cond: RuleCondition = { [tipo]: valor.trim() }
    return a.movements.filter((m) => ruleMatches(cond, m)).length
  }, [a, tipo, valor])

  const crear = () => {
    if (!valor.trim()) return
    const cond: RuleCondition = { [tipo]: valor.trim() }
    crearRegla({ businessId: a.business.id, scope: 'CONTADOR', condicion: cond, categoriaId: categoria, cuentaPCGE: cuenta, creadaPor: 'CONTADOR' })
    toast(`Regla creada: ${afectados} movimientos reclasificados`, 'rule')
    setValor('')
  }

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <SectionHead title="Nueva regla" hint="Prioridad 2: después de las reglas del dueño" />
        <div className={styles.actions} style={{ alignItems: 'end' }}>
          <label className={styles.field}>
            Si
            <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              <option value="contraparteNombre">la contraparte contiene</option>
              <option value="rucContraparte">el RUC es</option>
              <option value="glosaContiene">la glosa contiene</option>
            </select>
          </label>
          <label className={styles.field} style={{ flex: 1, minWidth: 180 }}>
            Valor
            <input className={styles.input} style={{ minHeight: 36, padding: '6px 10px' }} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej. J. Cárdenas" />
          </label>
          <label className={styles.field}>
            Categoría
            <select className={styles.select} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaId)}>
              {CATEGORIA_IDS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS[c].label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Cuenta PCGE
            <select className={styles.select} value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
              {CUENTAS_PCGE.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <Button icon="add" onClick={crear} disabled={!valor.trim()}>
            Crear regla
          </Button>
        </div>
        {valor.trim() && <span className={styles.muted}>Aplica a {afectados} movimientos de este cliente.</span>}
      </div>

      <SectionHead title="Reglas del contador" hint={`${reglas.length}`} />
      {reglas.length === 0 && <p className={`${styles.card} ${styles.muted}`}>Todavía no creaste reglas para este cliente.</p>}
      {reglas.map((r) => (
        <ReglaRow key={r.id} rule={r} />
      ))}
      {delDueno.length > 0 && (
        <>
          <SectionHead title="Reglas que creó el dueño" hint="Prioridad 1" />
          {delDueno.map((r) => (
            <p key={r.id} className={styles.card}>
              <span>
                {describeRule(r.condicion)} → <strong>{CATEGORIAS[r.categoriaId].label}</strong>
              </span>
            </p>
          ))}
        </>
      )}
    </section>
  )
}

function ReglaRow({ rule }: { rule: Rule }) {
  return (
    <div className={styles.card} style={{ gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', display: 'grid' }}>
      <span>
        {describeRule(rule.condicion)} → <strong>{CATEGORIAS[rule.categoriaId].label}</strong>
      </span>
      <select className={styles.select} value={rule.categoriaId} onChange={(e) => actualizarRegla({ ...rule, categoriaId: e.target.value as CategoriaId })} aria-label="Categoría">
        {CATEGORIA_IDS.map((c) => (
          <option key={c} value={c}>
            {CATEGORIAS[c].label}
          </option>
        ))}
      </select>
      <select className={styles.select} value={rule.cuentaPCGE ?? ''} onChange={(e) => actualizarRegla({ ...rule, cuentaPCGE: e.target.value })} aria-label="Cuenta PCGE">
        {CUENTAS_PCGE.map((c) => (
          <option key={c.codigo} value={c.codigo}>
            {c.codigo}
          </option>
        ))}
      </select>
      <Button size="sm" variant="text" icon="delete" onClick={() => borrarRegla(rule.id)}>
        Borrar
      </Button>
    </div>
  )
}

function Comentarios({ a }: { a: Analysis }) {
  const demo = useDemoState()
  const [borradores, setBorradores] = useState<Record<string, string>>({})
  const hilos = new Map<string, typeof demo.comments>()
  for (const c of demo.comments.filter((x) => x.businessId === a.business.id)) hilos.set(c.movementId, [...(hilos.get(c.movementId) ?? []), c])
  if (hilos.size === 0) return <p className={`${styles.card} ${styles.muted}`}>Sin comentarios todavía. Usa «Preguntar» en un movimiento o espera el resultado del simulador del cliente.</p>
  return (
    <section className={styles.section}>
      {[...hilos.entries()].map(([movementId, mensajes]) => {
        const m = a.movementsById.get(movementId)
        const enviar = (pregunta: boolean) => {
          const texto = borradores[movementId]?.trim()
          if (!texto) return
          comentar({ businessId: a.business.id, movementId, autor: 'CONTADOR', texto, pregunta })
          setBorradores({ ...borradores, [movementId]: '' })
        }
        return (
          <div key={movementId} className={styles.card}>
            <span className={styles.statLabel}>
              <Icon name={m ? 'receipt_long' : 'balance'} size={16} />
              {m ? `${fmtFecha(m.fecha)} · ${tituloMovimiento(m)} · ${formatMoney(m.monto, 'always')}` : 'Simulador de régimen'}
            </span>
            <div className={styles.thread}>
              {mensajes.map((c) => (
                <p key={c.id} className={c.autor === 'CONTADOR' ? styles.msgMine : styles.msg}>
                  <span className={styles.muted}>
                    {c.autor === 'CONTADOR' ? 'Tú' : a.business.dueno.nombres} {c.pregunta && (c.respondida ? '· respondida' : '· esperando respuesta')}
                  </span>
                  {c.texto}
                </p>
              ))}
            </div>
            <div className={styles.actions}>
              <input
                className={styles.input}
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Escribe un comentario"
                value={borradores[movementId] ?? ''}
                onChange={(e) => setBorradores({ ...borradores, [movementId]: e.target.value })}
              />
              <Button size="sm" variant="tonal" onClick={() => enviar(false)}>
                Comentar
              </Button>
              {m && (
                <Button size="sm" icon="help" onClick={() => enviar(true)}>
                  Preguntar al cliente
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function Cierre({ a, mes }: { a: Analysis; mes: string }) {
  const demo = useDemoState()
  const r = resumenMes(a, mes)
  const preguntas = demo.comments.filter((c) => c.businessId === a.business.id && c.pregunta && !c.respondida).length
  const faltantes = r.porEstado.PAGADO_SIN_FACTURA.count + r.porEstado.COBRADO_SIN_COMPROBANTE.count
  const key = (item: string) => `${a.business.id}:${mes}:${item}`
  const items = [
    { id: 'conc', label: `Conciliación ≥ 95% (va ${Math.round(r.conciliado * 100)}%)`, auto: true, ok: r.conciliado >= 0.95 },
    { id: 'pend', label: `Sin pendientes por revisar (${a.porRevisar.length} movimientos, ${preguntas} preguntas)`, auto: true, ok: a.porRevisar.length === 0 && preguntas === 0 },
    { id: 'sire', label: 'Propuesta SIRE revisada', auto: false, ok: !!demo.cierre[key('sire')] },
    { id: 'falt', label: `Comprobantes faltantes pedidos al cliente (${faltantes})`, auto: false, ok: !!demo.cierre[key('falt')] },
  ]
  const listo = items.every((i) => i.ok)
  const cerrado = demo.mesesCerrados[`${a.business.id}:${mes}`]
  const finDeMes = lastDayOfMonth(mes)
  return (
    <section className={styles.card}>
      <SectionHead
        title={`Cierre de ${mesLabel(mes).toLowerCase()}`}
        action={cerrado ? <Pill tone="alta" icon="lock">Cerrado</Pill> : listo ? <Pill tone="alta">Listo para cerrar</Pill> : <Pill tone="media">En proceso</Pill>}
      />
      {items.map((i) => (
        <label key={i.id} className={styles.check}>
          <input type="checkbox" checked={i.ok} disabled={i.auto} onChange={(e) => setCierre(key(i.id), e.target.checked)} />
          <span>
            {i.label}
            {i.auto && <span className={styles.muted}> · automático</span>}
          </span>
        </label>
      ))}
      {cerrado ? (
        <div className={styles.actions}>
          <p className={styles.small}>
            Cerrado el {fmtFecha(cerrado)}: <strong>{diffDays(finDeMes, cerrado.slice(0, 10))} días</strong> después del fin de mes.
          </p>
          <Button size="sm" variant="text" icon="lock_open" onClick={() => reabrirMes(a.business.id, mes)}>
            Reabrir
          </Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button icon="lock" variant={listo ? 'filled' : 'tonal'} disabled={HOY <= finDeMes} onClick={() => cerrarMes(a.business.id, mes, !listo)}>
            {listo ? 'Cerrar el mes' : 'Cerrar con pendientes'}
          </Button>
          <span className={styles.muted}>
            {HOY <= finDeMes ? 'El mes todavía no termina.' : `Van ${diffDays(finDeMes, HOY)} días desde el fin de mes.${listo ? '' : ' Lo pendiente queda anotado para el próximo cierre.'}`}
          </span>
        </div>
      )}
    </section>
  )
}

function Exportar({ a, mes }: { a: Analysis; mes: string }) {
  const demo = useDemoState()
  const lineas = asientos(a, mes, (id) => cuentaDe(a, id, demo.pcge, demo.rules))
  const t = totales(lineas)
  const descargar = () => {
    const blob = new Blob([`﻿${toCsv(lineas)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asientos-${a.business.ruc}-${mes}.csv`
    link.click()
    URL.revokeObjectURL(url)
    track('contador_csv_exportado', { lineas: lineas.length })
  }
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <SectionHead title="CSV genérico" hint={`${lineas.length} líneas · debe ${formatMoney(t.debe)} = haber ${formatMoney(t.haber)}`} />
        <p className={styles.muted}>Columnas: fecha, glosa, cuenta_pcge, debe, haber, comprobante, ruc_contraparte. Cada movimiento va contra la cuenta 1041 (banco).</p>
        <div className={styles.actions}>
          <Button icon="download" onClick={descargar}>
            Descargar CSV
          </Button>
          {['Contasis', 'Concar', 'Siigo'].map((s) => (
            <Button key={s} variant="tonal" disabled>
              {s} · Próximamente
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>fecha</th>
              <th>glosa</th>
              <th>cuenta_pcge</th>
              <th className={styles.num}>debe</th>
              <th className={styles.num}>haber</th>
              <th>comprobante</th>
              <th>ruc_contraparte</th>
            </tr>
          </thead>
          <tbody>
            {lineas.slice(0, 16).map((l, i) => (
              <tr key={i}>
                <td>{l.fecha}</td>
                <td className={styles.wrapCell}>{l.glosa}</td>
                <td>{l.cuenta_pcge}</td>
                <td className={styles.num}>{l.debe ? l.debe.toFixed(2) : ''}</td>
                <td className={styles.num}>{l.haber ? l.haber.toFixed(2) : ''}</td>
                <td>{l.comprobante}</td>
                <td>{l.ruc_contraparte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lineas.length > 16 && <p className={styles.muted}>Vista previa de las primeras 16 líneas.</p>}
    </section>
  )
}
