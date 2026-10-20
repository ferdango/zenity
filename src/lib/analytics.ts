import posthog, { type PostHogConfig } from 'posthog-js'

/** Token público del proyecto de PostHog; sin él la app funciona igual, sin analítica. */
export const POSTHOG_TOKEN: string | undefined = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN

/**
 * Configuración de PostHog para Zenity. La app muestra montos, nombres, DNI y RUC, así que nada
 * de ese texto sale del navegador: autocapture no guarda el texto de los elementos y las
 * grabaciones de sesión (si se activan en el proyecto) enmascaran todo el texto y los campos.
 */
export const POSTHOG_OPTIONS: Partial<PostHogConfig> = {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: '2026-08-30',
  // La app usa HashRouter: cada cambio de "#/ruta" es una pantalla nueva. Los defaults recientes
  // descartan el hash de las URLs; aquí se conserva porque solo contiene la ruta (sin datos personales).
  capture_pageview: { path: true, hash: true },
  disable_capture_url_hashes: false,
  mask_all_text: true,
  // Varias etiquetas accesibles y títulos llevan el nombre del negocio, su RUC o montos
  autocapture: { element_attribute_ignorelist: ['aria-label', 'title', 'alt', 'value', 'placeholder'] },
  session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  before_send: (event) => {
    // Con HashRouter el pathname real siempre es "/zenity/": se reporta la ruta de la app
    const route = window.location.hash.startsWith('#/') ? window.location.hash.slice(1).split('?')[0] : null
    if (event && route) event.properties.$pathname = route
    return event
  },
  loaded: (instance) => instance.register({ app_env: import.meta.env.MODE }),
}

/** Eventos de producto. Las propiedades nunca llevan datos personales ni montos. */
export type AnalyticsEvent =
  | 'login_completado'
  | 'registro_completado'
  | 'negocio_agregado'
  | 'negocio_cambiado'
  | 'conexion_agregada'
  | 'movimientos_revisados'
  | 'chat_pregunta_enviada'
  | 'reporte_generado'
  | 'tutorial_finalizado'

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!POSTHOG_TOKEN) return
  posthog.capture(event, properties)
}
