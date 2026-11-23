import type { ReactNode } from 'react'
import type { MapaId } from '../../config/mapasUx'
import styles from './ux.module.css'

/*
 * Ilustraciones de las tarjetas de «Mapas de UX» (viewBox 436 × 250). Trazo azul marino, relleno
 * índigo y un acento naranja: los colores salen de las variables --ux-* del módulo, así que cambian
 * con el tema claro u oscuro.
 */

const INK = 'var(--ux-ink)'
const FILL = 'var(--ux-fill)'
const LINE = 'var(--ux-line)'
const HOT = 'var(--ux-hot)'
const SW = 3.5

function Empatia() {
  return (
    <>
      <rect x="118" y="45" width="200" height="160" rx="14" fill="none" stroke={INK} strokeWidth={SW} />
      <line x1="218" y1="45" x2="218" y2="205" stroke={INK} strokeWidth={SW} />
      <line x1="118" y1="125" x2="318" y2="125" stroke={INK} strokeWidth={SW} />
      <circle cx="218" cy="125" r="28" fill={FILL} />
      <g className={styles.illoText} fill={INK}>
        <text x="168" y="92" textAnchor="middle">Dice</text>
        <text x="268" y="92" textAnchor="middle">Piensa</text>
        <text x="168" y="172" textAnchor="middle">Hace</text>
        <text x="268" y="172" textAnchor="middle">Siente</text>
      </g>
    </>
  )
}

function Afinidad() {
  const box = (x: number, y: number, filled = false) => (
    <rect x={x} y={y} width="44" height="44" rx="9" fill={filled ? FILL : 'none'} stroke={filled ? 'none' : INK} strokeWidth={SW} />
  )
  return (
    <>
      {box(66, 54)}
      {box(117, 54)}
      {box(91, 104)}
      <line x1="56" y1="170" x2="170" y2="170" stroke={INK} strokeWidth={SW} strokeDasharray="9 7" />
      {box(196, 64, true)}
      {box(247, 64, true)}
      {box(221, 113, true)}
      <line x1="186" y1="186" x2="302" y2="186" stroke={INK} strokeWidth={SW} strokeDasharray="9 7" />
      {box(328, 98)}
      {box(328, 148)}
    </>
  )
}

function Supuestos() {
  return (
    <>
      <line x1="218" y1="42" x2="218" y2="204" stroke={INK} strokeWidth={SW} />
      <line x1="98" y1="124" x2="338" y2="124" stroke={INK} strokeWidth={SW} />
      <circle cx="159" cy="90" r="9" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="176" cy="166" r="9" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="285" cy="169" r="9" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="268" cy="82" r="13" fill={FILL} />
      <circle cx="294" cy="102" r="9" fill={FILL} />
    </>
  )
}

function Journey() {
  return (
    <>
      <rect x="48" y="44" width="338" height="158" rx="12" fill="none" stroke={INK} strokeWidth={SW} />
      <line x1="133" y1="44" x2="133" y2="202" stroke={INK} strokeWidth={SW} />
      <line x1="217" y1="44" x2="217" y2="202" stroke={INK} strokeWidth={SW} />
      <line x1="301" y1="44" x2="301" y2="202" stroke={INK} strokeWidth={SW} />
      <path
        d="M62 150 C 92 150, 106 82, 133 82 C 164 82, 186 166, 217 166 C 248 166, 270 82, 301 82 C 330 82, 348 116, 372 118"
        fill="none"
        stroke={FILL}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <circle cx="217" cy="166" r="9" fill={HOT} />
    </>
  )
}

function Blueprint() {
  return (
    <>
      <line x1="48" y1="68" x2="388" y2="68" stroke={LINE} strokeWidth="3" />
      <line x1="48" y1="118" x2="388" y2="118" stroke={LINE} strokeWidth="3" />
      <line x1="48" y1="170" x2="388" y2="170" stroke={LINE} strokeWidth="3" />
      <line x1="48" y1="93" x2="388" y2="93" stroke={FILL} strokeWidth="3" strokeDasharray="9 6" />
      <line x1="213" y1="82" x2="213" y2="106" stroke={INK} strokeWidth={SW} />
      <line x1="330" y1="82" x2="330" y2="154" stroke={INK} strokeWidth={SW} />
      <rect x="66" y="52" width="60" height="30" rx="8" fill="var(--ux-panel)" stroke={INK} strokeWidth={SW} />
      <rect x="183" y="52" width="60" height="30" rx="8" fill="var(--ux-panel)" stroke={INK} strokeWidth={SW} />
      <rect x="300" y="52" width="60" height="30" rx="8" fill="var(--ux-panel)" stroke={INK} strokeWidth={SW} />
      <rect x="183" y="106" width="60" height="30" rx="8" fill="var(--ux-panel)" stroke={INK} strokeWidth={SW} />
      <rect x="300" y="154" width="60" height="32" rx="8" fill={FILL} />
    </>
  )
}

function Ecosistema() {
  return (
    <>
      <circle cx="218" cy="124" r="78" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="218" cy="124" r="44" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="218" cy="124" r="13" fill={FILL} />
      <circle cx="151" cy="84" r="9" fill={INK} />
      <circle cx="289" cy="152" r="9" fill={INK} />
      <circle cx="162" cy="178" r="9" fill={INK} />
      <circle cx="252" cy="98" r="9" fill={INK} />
      <circle cx="181" cy="142" r="9" fill={INK} />
    </>
  )
}

function Flujo() {
  return (
    <>
      <line x1="105" y1="122" x2="143" y2="122" stroke={INK} strokeWidth={SW} />
      <line x1="211" y1="122" x2="247" y2="122" stroke={INK} strokeWidth={SW} />
      <line x1="321" y1="122" x2="358" y2="122" stroke={INK} strokeWidth={SW} />
      <path d="M177 156 V185 H247" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="31" y="100" width="74" height="45" rx="11" fill="none" stroke={INK} strokeWidth={SW} />
      <path d="M177 88 L211 122 L177 156 L143 122 Z" fill={FILL} />
      <rect x="247" y="100" width="74" height="45" rx="11" fill="none" stroke={INK} strokeWidth={SW} />
      <circle cx="375" cy="122" r="17" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="247" y="165" width="74" height="40" rx="11" fill="none" stroke={INK} strokeWidth={SW} />
    </>
  )
}

function SiteMap() {
  return (
    <>
      <path d="M218 80 V100 M101 100 H336 M101 100 V115 M217 100 V115 M336 100 V115 M101 150 V167 M336 150 V167" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="175" y="40" width="86" height="40" rx="10" fill={FILL} />
      <rect x="67" y="115" width="68" height="35" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="183" y="115" width="68" height="35" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="302" y="115" width="68" height="35" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="67" y="167" width="68" height="30" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="302" y="167" width="68" height="30" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
    </>
  )
}

function Roadmap() {
  return (
    <>
      <line x1="50" y1="45" x2="50" y2="205" stroke={INK} strokeWidth={SW} />
      <rect x="66" y="55" width="154" height="28" rx="9" fill={FILL} />
      <rect x="150" y="97" width="135" height="25" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="234" y="136" width="119" height="28" rx="9" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="99" y="178" width="103" height="19" rx="9" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="7 5" />
    </>
  )
}

const DIBUJOS: Record<MapaId, () => ReactNode> = {
  empatia: Empatia,
  afinidad: Afinidad,
  supuestos: Supuestos,
  'customer-journey': Journey,
  'service-blueprint': Blueprint,
  ecosistema: Ecosistema,
  'user-flow': Flujo,
  'site-map': SiteMap,
  roadmap: Roadmap,
}

export function IlustracionMapa({ id }: { id: MapaId }) {
  const Dibujo = DIBUJOS[id]
  return (
    <svg className={styles.illo} viewBox="0 0 436 250" aria-hidden="true">
      <Dibujo />
    </svg>
  )
}
