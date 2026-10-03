import excel from '../assets/brands/excel.svg'
import googleCloud from '../assets/brands/google-cloud.svg'
import mysql from '../assets/brands/mysql.svg'
import postgresql from '../assets/brands/postgresql.svg'
import sqlserver from '../assets/brands/sqlserver.svg'
import xml from '../assets/brands/xml.svg'
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
    id: 'google-cloud',
    name: 'Google Cloud Platform',
    description: 'Conecta tu cuenta de Google para acceder a los servicios de Google',
    kind: 'api',
    badge: { label: 'Más usado', tone: 'blue' },
    logo: { type: 'image', src: googleCloud },
    theme: 'blue',
  },
  {
    id: 'api',
    name: 'API externa',
    description: 'Conecta una API a tu consolidado financiero para el seguimiento diario',
    kind: 'api',
    logo: { type: 'icon', icon: 'api', tile: 'var(--z-card-purple)' },
    theme: 'purple',
  },
  {
    id: 'excel',
    name: 'Excel como base de datos',
    description: 'Importa tus hojas de cálculo y mantén tu balance al día',
    kind: 'file',
    logo: { type: 'image', src: excel },
    theme: 'green',
  },
  {
    id: 'mysql',
    name: 'Base de datos en MySQL',
    description: 'Sincroniza tus tablas de ventas y gastos con Zenity',
    kind: 'database',
    logo: { type: 'image', src: mysql },
    theme: 'slate',
  },
  {
    id: 'sqlserver',
    name: 'Base de datos en SQL Server',
    description: 'Sincroniza tus tablas de ventas y gastos con Zenity',
    kind: 'database',
    logo: { type: 'image', src: sqlserver, tile: '#ffffff' },
    simulateError: true,
    theme: 'slate',
  },
  {
    id: 'postgresql',
    name: 'Base de datos en PostgreSQL',
    description: 'Sincroniza tus tablas de ventas y gastos con Zenity',
    kind: 'database',
    logo: { type: 'image', src: postgresql },
    theme: 'blue',
  },
  {
    id: 'xml',
    name: 'XML como base de datos',
    description: 'Carga facturas y comprobantes electrónicos en XML',
    kind: 'file',
    logo: { type: 'image', src: xml },
    theme: 'green',
  },
]

export function getSource(id: string | null | undefined): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}
