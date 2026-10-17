import { type Business, businessName } from '../data/businesses'
import { useApp } from '../state/context'

/** Cambia de negocio desde cualquier pantalla: vuelve arriba y avisa a qué RUC se pasó. */
export function useSwitchBusiness() {
  const { business, switchBusiness, toast } = useApp()
  return (target: Business) => {
    if (target.id === business.id) return
    switchBusiness(target.id)
    window.scrollTo({ top: 0, behavior: 'instant' })
    toast(`Ahora ves ${businessName(target)}`, 'swap_horiz')
  }
}
