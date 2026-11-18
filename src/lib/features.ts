/**
 * Interruptores de funcionalidades. Ocultar una opción no borra sus pantallas:
 * las rutas siguen existiendo y basta con volver a activarla aquí.
 */
export const FEATURES = {
  /** Opción "SUNAT · SIRE" del menú y tile "Impuestos SUNAT" del inicio */
  sunatSire: false,
  /**
   * Herramientas secundarias para el dueño: simulador de régimen, Aprende, datos de entrenamiento,
   * métricas del piloto y los reportes del prototipo anterior (ingresos, egresos, balance, revisado).
   */
  herramientasAvanzadas: false,
  /** Microlecciones dentro de las pantallas */
  lecciones: false,
  /** Inicio del prototipo anterior: periodo, carrusel de cuentas, resumen con IA y reporte del mes */
  inicioClasico: false,
  /** «Por revisar»: vista previa en WhatsApp y conciliados con confianza media */
  revisarExtras: false,
}
