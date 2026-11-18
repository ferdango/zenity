import { reiniciarDemo } from '../state/demoStore'

/**
 * «Reiniciar demo»: borra lo que se hizo en este navegador (correcciones, reglas, promesas,
 * negocios y perfil) y vuelve al seed. El recorrido de bienvenida no se repite.
 */
export function resetDemo() {
  reiniciarDemo()
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith('zenity.') && k !== 'zenity.tourDone') keys.push(k)
    }
    for (const k of keys) window.localStorage.removeItem(k)
  } catch {
    /* almacenamiento no disponible: basta con recargar */
  }
  window.location.hash = '#/inicio'
  window.location.reload()
}
