/** Dispara el confeti global (lo dibuja <Confetti /> montado en App). */
export interface CelebrateOptions {
  /** Punto de origen en px de la ventana; por defecto, el centro-abajo de la pantalla */
  x?: number
  y?: number
  /** Cantidad de piezas */
  count?: number
}

export const CELEBRATE_EVENT = 'zenity:celebrate'

export function celebrate(options: CelebrateOptions = {}) {
  window.dispatchEvent(new CustomEvent<CelebrateOptions>(CELEBRATE_EVENT, { detail: options }))
}

/** Origen del confeti en el centro de un elemento (p. ej. el botón que se presionó). */
export function celebrateFrom(element: Element | null | undefined, count?: number) {
  if (!element) return celebrate({ count })
  const r = element.getBoundingClientRect()
  celebrate({ x: r.left + r.width / 2, y: r.top + r.height / 2, count })
}
