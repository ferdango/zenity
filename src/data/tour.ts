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
    target: 'accounts',
    title: 'Tus conexiones',
    body: 'Desliza para ver cada banco, billetera, API o Excel. Toca una para ver su detalle y movimientos.',
  },
  {
    target: 'add-account',
    title: 'Ver y agregar conexiones',
    body: 'Todas tus conexiones en una lista, con su estado. Desde aquí conectas bancos, Yape, Plin, APIs o archivos.',
  },
  {
    target: 'summary',
    title: 'Tu negocio en 5 segundos',
    body: 'Cuánto entró, cuánto salió y cuánto te queda en el mes.',
  },
  {
    target: 'notifications',
    title: 'Notificaciones',
    body: 'Alertas de gasto, cobros conciliados y lo que Zenity clasificó por ti.',
  },
  {
    target: 'menu',
    title: 'Menú',
    body: 'Tus negocios y los ajustes de tu cuenta, con este tutorial.',
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
    body: 'Conexiones, gasto personal, subir tu extracto y los ajustes.',
  },
]
