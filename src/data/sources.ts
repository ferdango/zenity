import excel from '../assets/brands/excel.svg'
import googleSheets from '../assets/brands/google-sheets.svg'
import type { Source } from './mock'

const BANK_COPY = 'Conecta tu cuenta bancaria con Zenity para consolidar tu balance'

export const SOURCES: Source[] = [
  {
    id: 'bcp',
    name: 'Banco de Crédito del Perú',
    description: BANK_COPY,
    kind: 'bank',
    badge: { label: 'Nuevo', tone: 'pink' },
    logo: { type: 'monogram', text: 'BCP', theme: 'bcp' },
    theme: 'navy',
  },
  {
    id: 'bbva',
    name: 'BBVA Perú',
    description: BANK_COPY,
    kind: 'bank',
    badge: { label: 'Nuevo', tone: 'pink' },
    logo: { type: 'monogram', text: 'BBVA', theme: 'bbva' },
    theme: 'blue',
  },
  {
    id: 'pichincha',
    name: 'Banco Pichincha',
    description: BANK_COPY,
    kind: 'bank',
    badge: { label: 'Rápido', tone: 'orange' },
    logo: { type: 'monogram', text: 'P', theme: 'pichincha' },
    theme: 'yellow',
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank Perú',
    description: BANK_COPY,
    kind: 'bank',
    badge: { label: 'Nuevo', tone: 'pink' },
    logo: { type: 'monogram', text: 'S', theme: 'scotiabank' },
    theme: 'red',
  },
  {
    id: 'yape',
    name: 'Yape',
    description: 'Consolida los cobros con QR y celular de tu negocio',
    kind: 'wallet',
    badge: { label: 'Nuevo', tone: 'pink' },
    logo: { type: 'monogram', text: 'yape', theme: 'yape' },
    avatar: 'yape',
    settlesIn: 'tu cuenta BCP',
    theme: 'grape',
  },
  {
    id: 'plin',
    name: 'Plin',
    description: 'Consolida los cobros con Plin que llegan a tu banco',
    kind: 'wallet',
    badge: { label: 'Nuevo', tone: 'pink' },
    logo: { type: 'monogram', text: 'plin', theme: 'plin' },
    avatar: 'plin',
    settlesIn: 'tu cuenta BBVA, Interbank o Scotiabank',
    theme: 'teal',
  },
  {
    id: 'api',
    name: 'API externa',
    description: 'Conecta una API a tu consolidado financiero para el seguimiento diario',
    kind: 'api',
    logo: { type: 'icon', icon: 'api', tile: 'var(--z-card-purple)' },
    simulateError: true,
    theme: 'purple',
  },
  {
    id: 'excel',
    name: 'Excel como base de datos',
    description: 'Importa tus hojas de cálculo y mantén tu balance al día',
    kind: 'file',
    logo: { type: 'image', src: excel },
    upload: { label: 'Importar Excel', accept: '.xlsx,.xls,.csv' },
    theme: 'green',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Sincroniza tus hojas de cálculo de Google con Zenity',
    kind: 'file',
    logo: { type: 'image', src: googleSheets },
    theme: 'green',
  },
  {
    id: 'pdf',
    name: 'Archivo PDF',
    description: 'Carga estados de cuenta y comprobantes en PDF',
    kind: 'file',
    logo: { type: 'icon', icon: 'picture_as_pdf', tile: '#e5322d' },
    avatar: 'pdf',
    upload: { label: 'Importar PDF', accept: '.pdf' },
    theme: 'slate',
  },
]

export function getSource(id: string | null | undefined): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}
