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
  | 'decision_automatica_cambiada'
  | 'bandeja_revisada'
  | 'chat_pregunta_enviada'
  | 'reporte_abierto'
  | 'tutorial_finalizado'
  // F3 · Perfil crediticio (sin montos ni datos personales)
  | 'credito_perfil_visto'
  | 'credito_consentimiento'
  | 'credito_consentimiento_revocado'
  | 'credito_solicitud_enviada'
  | 'credito_respuesta_bcp'
  | 'credito_aceptado'
  // Métricas de la primera ola (sin montos ni datos personales)
  | 'correccion_registrada'
  | 'regla_creada'
  | 'conciliacion_vista'
  | 'conciliacion_confirmada'
  | 'extracto_subido'
  | 'cierre_caja_registrado'
  | 'cobro_recordatorio'
  | 'cobro_promesa'
  | 'cobro_recibido'
  | 'caja_vista'
  | 'sueldo_dueno_definido'
  | 'reto_iniciado'
  | 'regimen_simulado'
  | 'regimen_revisado'
  | 'leccion_evento'
  | 'comentario'
  | 'contador_portal_visto'
  | 'contador_cliente_abierto'
  | 'contador_cuenta_asignada'
  | 'contador_csv_exportado'
  | 'cierre_mes_completado'
  | 'datos_consentimiento'
  | 'datos_permiso_activado'
  | 'datos_permiso_revocado'
  | 'planilla_confirmada'
  | 'configuracion_omitida'

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!POSTHOG_TOKEN) return
  posthog.capture(event, properties)
}
