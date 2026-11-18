import type { TourStep } from '../components/Tour'

/** Recorrido del primer ingreso: secciones del Inicio y cada opción de la navegación. */
export const TOUR_STEPS: TourStep[] = [
  {
    target: 'business',
    title: 'Tus negocios',
    body: 'Cada RUC tiene sus propias cuentas, movimientos y reportes. Toca aquí para cambiar de negocio o agregar otro.',
  },
  {
    target: 'saldo',
    title: 'Tu saldo y tus alertas',
    body: 'El saldo de tu cuenta BCP, la alerta de caja si se viene un mes apretado y lo que tienes pendiente.',
  },
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
    title: 'Agregar una conexión',
    body: 'Conecta bancos, billeteras, APIs o archivos para consolidar todo en un solo lugar.',
  },
  {
    target: 'summary',
    title: 'Tu negocio en 5 segundos',
    body: 'Cuánto entró, cuánto salió y cuánto te queda en el mes. Toca cualquiera para ver el detalle.',
  },
  {
    target: 'insights',
    title: 'Resumen con IA',
    body: 'Zenity analiza tus movimientos todos los días y te explica lo más importante.',
  },
  {
    target: 'report',
    title: 'Reporte completo',
    body: 'Zenity arma solo el reporte de cada mes, con gráficos y explicaciones. Tócalo para verlo.',
  },
  {
    target: 'notifications',
    title: 'Notificaciones',
    body: 'Alertas de gasto, cobros conciliados y lo que Zenity clasificó por ti.',
  },
  {
    target: 'menu',
    title: 'Menú',
    body: 'Tus negocios, lo que Zenity revisó por ti y los ajustes de tu cuenta: calificación, preguntas frecuentes y este tutorial.',
  },
  {
    target: 'nav-inicio',
    title: 'Inicio',
    body: 'Tu saldo, la alerta de caja y lo que tienes pendiente, en un vistazo.',
  },
  {
    target: 'nav-revisar',
    title: 'Por revisar',
    body: 'Lo que Zenity no pudo clasificar con seguridad. Confirma o corrige en un toque y Zenity aprende.',
  },
  {
    target: 'nav-caja',
    title: 'Caja',
    body: 'Tu saldo proyectado a 30, 60 y 90 días, con la gratificación, la CTS y los impuestos.',
  },
  {
    target: 'nav-cobrar',
    title: 'Cobrar',
    body: 'Quién te debe, desde cuándo, y un recordatorio por WhatsApp listo para enviar.',
  },
  {
    target: 'nav-mas',
    title: 'Más',
    body: 'Conciliación, personal vs negocio, simulador de régimen, tu contador y Aprende.',
  },
]
