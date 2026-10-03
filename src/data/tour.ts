import type { TourStep } from '../components/Tour'

/** Recorrido del primer ingreso: secciones del Inicio y cada opción de la navegación. */
export const TOUR_STEPS: TourStep[] = [
  {
    target: 'greeting',
    title: 'Tu resumen del día',
    body: 'Te saludamos con el estado de tus cuentas. Toca el ojo para ocultar o mostrar tus saldos.',
  },
  {
    target: 'period',
    title: 'Elige el periodo',
    body: 'Cambia el mes y el año para ver los números de otro periodo en toda la app.',
  },
  {
    target: 'accounts',
    title: 'Tus cuentas conectadas',
    body: 'Desliza para ver cada cuenta, tarjeta, API o Excel. Toca una para ver su detalle y movimientos.',
  },
  {
    target: 'add-account',
    title: 'Agrega una cuenta',
    body: 'Conecta bancos, APIs, bases de datos o archivos para consolidar todo en un solo lugar.',
  },
  {
    target: 'summary',
    title: 'Ingresos, egresos y total',
    body: 'Lo que entró y salió en el mes, tu resultado neto y cómo cambió frente al mes anterior.',
  },
  {
    target: 'insights',
    title: 'Resumen con IA',
    body: 'Zenity analiza tus movimientos todos los días y te explica lo más importante.',
  },
  {
    target: 'report',
    title: 'Reporte completo',
    body: 'Con un toque genera un reporte del mes con gráficos y explicaciones.',
  },
  {
    target: 'notifications',
    title: 'Notificaciones',
    body: 'Alertas de gasto, cobros conciliados y movimientos que necesitan tu revisión.',
  },
  {
    target: 'menu',
    title: 'Menú',
    body: 'Tu perfil, movimientos por revisar, preguntas frecuentes y este tutorial.',
  },
  {
    target: 'nav-wallet',
    title: 'Billetera',
    body: 'Vuelve a este inicio desde cualquier pantalla.',
  },
  {
    target: 'nav-income',
    title: 'Ingresos',
    body: 'El detalle de lo que entra, por categoría y por cuenta, con insights de tus cobros.',
  },
  {
    target: 'nav-expense',
    title: 'Egresos',
    body: 'En qué se va tu dinero, la categoría dominante y las alertas de gasto.',
  },
  {
    target: 'nav-balance',
    title: 'Balance',
    body: 'Tu balance mes a mes en un gráfico interactivo, con la explicación de la IA.',
  },
  {
    target: 'nav-chat',
    title: 'Habla con Zenity',
    body: 'Pregúntale lo que quieras a tu asistente: balances, comparaciones o un consolidado.',
  },
]
