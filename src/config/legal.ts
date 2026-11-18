/**
 * Permisos de datos (Ley N.° 29733). El texto es un BORRADOR para revisión legal: la razón social,
 * el correo para derechos ARCO y el código de inscripción del banco de datos están PENDIENTES.
 */

export const FUENTES_DATOS = [
  {
    id: 'BCP',
    nombre: 'Tu cuenta BCP',
    detalle: 'Movimientos, saldos y glosas. Solo lectura: Zenity no puede mover tu dinero.',
    icono: 'account_balance',
    obligatoria: true,
  },
  {
    id: 'SIRE',
    nombre: 'SUNAT (SIRE o boletas emitidas)',
    detalle: 'Tus comprobantes de venta y compra. Solo lectura: Zenity no declara por ti.',
    icono: 'description',
    obligatoria: true,
  },
  {
    id: 'DIGITAL',
    nombre: 'Yape y POS',
    detalle: 'Tus cobros por Yape y las liquidaciones de tarjeta, para cuadrar las ventas del día.',
    icono: 'contactless',
    obligatoria: false,
  },
] as const

export type FuenteDatos = (typeof FUENTES_DATOS)[number]['id']

export const CONSENTIMIENTO_DATOS = {
  version: '2026-11 · borrador',
  titulo: 'Autorización para leer y usar tus datos',
  parrafos: [
    'Al aceptar, autorizas a Zenity (razón social: PENDIENTE) a leer, solo para consulta, los datos de las fuentes que marques: los movimientos de tu cuenta BCP, tus comprobantes de venta y compra en SUNAT y tus cobros por Yape y POS.',
    'Los usamos solo para conciliar tus cobros y pagos, separar los gastos personales, proyectar tu caja, avisarte de vencimientos y enseñarte con tus propios números. No vendemos tus datos ni los usamos para publicidad.',
    'Zenity no puede mover tu dinero ni presentar declaraciones a tu nombre.',
    'Tu contador solo ve tus movimientos si se lo permites en «Mi contador». El BCP solo ve tu perfil de crédito si lo autorizas aparte en «Crédito BCP».',
    'Si lo permites, usamos tus correcciones de categoría sin tu nombre, RUC ni montos, para que Zenity categorice mejor a los negocios de tu rubro.',
    'Puedes revocar cada permiso cuando quieras en Más → Permisos de datos: desde ese momento Zenity deja de leer esa fuente. También puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a PENDIENTE.',
    'Tratamos tus datos según la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento. Inscripción del banco de datos ante la Autoridad Nacional de Protección de Datos Personales: PENDIENTE.',
  ],
} as const
