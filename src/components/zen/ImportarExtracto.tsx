import { useRef, useState } from 'react'
import { HOY } from '../../config/demo'
import { tituloMovimiento } from '../../data/demoLedger'
import { ESTADO_LABEL } from '../../domain/engine'
import { CAMPO_LABEL, type CampoExtracto, leerExtracto, type ResultadoExtracto, toCsv } from '../../domain/extracto'
import { extractoEjemplo } from '../../domain/extractoEjemplo'
import { fmtFecha } from '../../domain/util'
import { ArchivoNoSoportado, type FormatoTabla, leerTabla } from '../../lib/tabla'
import { importarExtracto } from '../../state/demoStore'
import { useZen } from '../../state/useZen'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { ConfidenceBadge, Money, Pill } from './index'
import { REGLA_LABEL } from './reglas'
import styles from './zen.module.css'

type Paso =
  | { tipo: 'elegir' }
  | { tipo: 'leyendo'; nombre: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'vista'; nombre: string; formato: FormatoTabla; r: ResultadoExtracto }
  | { tipo: 'listo'; ids: string[] }

const FORMATO_LABEL: Record<FormatoTabla, string> = { xlsx: 'Excel', html: 'Excel (tabla)', csv: 'CSV' }

/**
 * Carga del extracto BCP en Excel o CSV (mientras llega la API): lee el archivo en el navegador,
 * muestra qué encontró y, al confirmar, los movimientos entran al motor y se concilian solos.
 */
export function ImportarExtracto({ onClose }: { onClose: () => void }) {
  const { a, businessId } = useZen()
  const fileRef = useRef<HTMLInputElement>(null)
  const [paso, setPaso] = useState<Paso>({ tipo: 'elegir' })
  if (!a) return null

  const leer = async (file: File) => {
    setPaso({ tipo: 'leyendo', nombre: file.name })
    try {
      const { formato, filas } = await leerTabla(new Uint8Array(await file.arrayBuffer()))
      setPaso({ tipo: 'vista', nombre: file.name, formato, r: leerExtracto(filas, { businessId, existentes: a.movements }) })
    } catch (e) {
      setPaso({ tipo: 'error', mensaje: e instanceof ArchivoNoSoportado ? e.message : 'No pudimos leer el archivo. Prueba con el Excel (.xlsx) o el CSV que descargas de tu banca por internet.' })
    }
  }

  const ejemplo = () => extractoEjemplo(a, HOY)
  const usarEjemplo = () => setPaso({ tipo: 'vista', nombre: 'Extracto de ejemplo (BCP)', formato: 'csv', r: leerExtracto(ejemplo(), { businessId, existentes: a.movements }) })
  const descargarEjemplo = () => {
    const blob = new Blob([`﻿${toCsv(ejemplo())}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'extracto-bcp-ejemplo.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const input = (
    <input
      ref={fileRef}
      type="file"
      hidden
      accept=".xlsx,.xls,.csv,.txt"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) void leer(file)
        e.target.value = ''
      }}
    />
  )

  if (paso.tipo === 'listo') {
    const movs = paso.ids.map((id) => a.movementsById.get(id)).filter((m) => !!m)
    const conciliados = movs.filter((m) => a.matchByMovement.has(m.id)).length
    return (
      <div style={{ display: 'grid', gap: 14, padding: '0 0 20px' }}>
        <p className={styles.banner}>
          <Icon name="task_alt" size={20} />
          <span>
            Zenity agregó {movs.length} movimiento{movs.length === 1 ? '' : 's'} y concilió <strong>{conciliados}</strong> con tus comprobantes.
          </span>
        </p>
        <div className={styles.list}>
          {movs.map((m) => {
            const match = a.matchByMovement.get(m.id)
            const cl = a.classifications.get(m.id)
            return (
              <div key={m.id} className={`${styles.row} ${styles.rowWrap}`}>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{tituloMovimiento(m)}</span>
                  <span className={styles.rowSub}>{match ? match.motivo : cl?.motivo}</span>
                </span>
                <span className={styles.rowEnd}>
                  <Money value={m.monto} sign="always" className={m.monto > 0 ? styles.amountPos : undefined} />
                  {match ? <Pill tone="info">{REGLA_LABEL[match.regla]}</Pill> : cl && <Pill tone="media">{ESTADO_LABEL[cl.estado]}</Pill>}
                  {match && <ConfidenceBadge confianza={match.confianza} showPct={false} />}
                </span>
              </div>
            )
          })}
        </div>
        <Button size="lg" icon="check" onClick={onClose}>
          Listo
        </Button>
      </div>
    )
  }

  if (paso.tipo === 'vista') {
    const { r } = paso
    const campos = Object.keys(r.columnas) as CampoExtracto[]
    return (
      <div style={{ display: 'grid', gap: 14, padding: '0 0 20px' }}>
        <div className={styles.card}>
          <span className="t-title-m">{paso.nombre}</span>
          <span className={styles.muted}>
            {FORMATO_LABEL[paso.formato]}
            {r.desde && r.hasta && ` · del ${fmtFecha(r.desde)} al ${fmtFecha(r.hasta)}`}
          </span>
          {campos.length > 0 && (
            <div className={styles.actions}>
              {campos.map((c) => (
                <Pill key={c} tone="neutral" icon="check">
                  {CAMPO_LABEL[c]}
                </Pill>
              ))}
            </div>
          )}
        </div>
        <div className={styles.grid2}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Nuevos</span>
            <span className={styles.statValue}>{r.nuevos.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Ya estaban</span>
            <span className={styles.statValue}>{r.repetidos}</span>
            <span className={styles.muted}>No se duplican</span>
          </div>
        </div>
        {r.errores.length > 0 && (
          <p className={styles.bannerWarn}>
            <Icon name="warning" size={20} />
            <span>
              {r.errores.length === 1 && r.errores[0].fila === 0
                ? r.errores[0].motivo
                : `${r.errores.length} fila${r.errores.length === 1 ? '' : 's'} no se pudieron leer: ${r.errores
                    .slice(0, 3)
                    .map((e) => `fila ${e.fila} (${e.motivo.toLowerCase()})`)
                    .join(', ')}${r.errores.length > 3 ? '…' : ''}.`}
            </span>
          </p>
        )}
        {r.nuevos.length > 0 && (
          <div className={styles.list}>
            {r.nuevos.slice(0, 6).map((m) => (
              <div key={m.id} className={styles.row}>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{m.glosa}</span>
                  <span className={styles.rowSub}>
                    {fmtFecha(m.fecha)} {m.fecha.slice(11, 16)}
                  </span>
                </span>
                <span className={styles.rowEnd}>
                  <Money value={m.monto} sign="always" className={m.monto > 0 ? styles.amountPos : undefined} />
                </span>
              </div>
            ))}
            {r.nuevos.length > 6 && <p className={styles.muted}>y {r.nuevos.length - 6} más.</p>}
          </div>
        )}
        <Button
          size="lg"
          icon="playlist_add"
          disabled={r.nuevos.length === 0}
          onClick={() => {
            importarExtracto(businessId, r.nuevos, { repetidos: r.repetidos, errores: r.errores.length, formato: paso.formato })
            setPaso({ tipo: 'listo', ids: r.nuevos.map((m) => m.id) })
          }}
        >
          {r.nuevos.length === 0 ? 'No hay movimientos nuevos' : `Agregar ${r.nuevos.length} movimiento${r.nuevos.length === 1 ? '' : 's'}`}
        </Button>
        <Button size="lg" variant="text" icon="upload_file" onClick={() => fileRef.current?.click()}>
          Elegir otro archivo
        </Button>
        {input}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 14, padding: '0 0 20px' }}>
      <p className={styles.small}>
        Mientras conectamos la API del BCP, descarga el extracto de tu cuenta en la Banca por Internet (Excel o CSV) y súbelo. Zenity lo lee en tu celular, no
        duplica lo que ya tiene y lo concilia con tus comprobantes de SUNAT.
      </p>
      {paso.tipo === 'error' && (
        <p className={styles.bannerWarn}>
          <Icon name="error" size={20} />
          <span>{paso.mensaje}</span>
        </p>
      )}
      <Button size="lg" icon="upload_file" disabled={paso.tipo === 'leyendo'} onClick={() => fileRef.current?.click()}>
        {paso.tipo === 'leyendo' ? `Leyendo ${paso.nombre}…` : 'Elegir archivo (.xlsx o .csv)'}
      </Button>
      <Button size="lg" variant="tonal" icon="science" onClick={usarEjemplo}>
        Probar con un extracto de ejemplo
      </Button>
      <Button size="lg" variant="text" icon="download" onClick={descargarEjemplo}>
        Descargar el ejemplo en CSV
      </Button>
      <p className={styles.muted}>Columnas que reconoce: Fecha, Descripción, Monto (o Cargo y Abono), Saldo, N.° de operación y Hora.</p>
      {input}
    </div>
  )
}
