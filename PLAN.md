# PLAN — Primera ola en el prototipo

Brief: «Zenity — Brief para construir la primera ola en el prototipo» (F-01 a F-08 + microlecciones).

## Lo que ya existe (y se mantiene)

- **Stack:** Vite 8 + React 19 + React Router 8 (`HashRouter`) + Motion + CSS Modules + oxlint. Estilo Gemini (tokens en `src/styles/tokens.css`). No se cambia.
- **Estado:** `src/state/AppState.tsx` (contexto con negocios, conexiones, libro, toasts, hojas). Persistencia en `localStorage` (`src/lib/storage.ts`).
- **Pantallas existentes:** registro e ingreso, Inicio, Ingresos/Egresos (`/movimientos/:tab`), Balance (`/resumen`), Chat, conexiones, «Revisado por Zenity» (bandeja tipo checklist), SUNAT·SIRE (oculto por `FEATURES`).
- **Componentes reutilizados:** `TopBar`, `Button`, `Chip`, `BottomSheet`, `Dialog`, `SegmentedTabs`, `Amount`, `Icon`, `EmptyState`, `BarChart`, `Toaster`.

## Lo que se crea

| Capa | Dónde | Qué |
| --- | --- | --- |
| Config | `src/config/` | `demo.ts` (hoy = 18/11/2026), `taxParams2026.ts` (UIT, IGV, regímenes, cronograma mock, tipo de cambio mock), `categories.ts` (categoría simple ↔ cuenta PCGE), `lessons.ts` (textos de microlecciones) |
| Fuentes mock | `src/data/sources/` | `BankSource`, `SunatSireSource`, `DigitalPaymentsSource` con implementación mock |
| Seed | `src/data/seed/` | Generador determinístico: Ferretería San Martín (RMT, 4 trabajadores), Bodega Doña Rosa (NRUS, dos vías) y 8 clientes resumidos para el contador |
| Dominio | `src/domain/` | Funciones puras con tests: `reconciliation`, `categorization`, `personal`, `collections`, `cashflow`, `taxSimulator`, `calendar`, `lessons`, `engine` (une todo) |
| Estado demo | `src/state/demoStore.ts` | Store externo (`useSyncExternalStore`) con correcciones, reglas, comentarios, promesas, sueldo del dueño, eventos de lecciones, persona y permisos. Se guarda en `localStorage`; «Reiniciar demo» lo borra y vuelve al seed |
| Pantallas | `src/screens/` | `/revisar` (F-03), `/conciliacion` (F-01/F-02), `/personal` (F-04), `/cobrar` (F-05), `/caja` (F-06), `/regimen` (F-07), `/contador` y `/contador/:id` (F-08), `/aprende`, `/datos`, `/mi-contador`, `/mas` |

## Decisiones

- **Tests:** el repo no tenía test runner. Se usa el de Node (`node --test`), sin dependencias: el dominio importa con extensión `.ts` y Node quita los tipos. `npm test` y el CI lo corren.
- **Dos mundos de datos:** los negocios de ejemplo pasan a ser los del brief (Ferretería San Martín y Bodega Doña Rosa, agosto–noviembre 2026). Un RUC registrado desde el onboarding sigue usando los datos del Figma (marzo 2026). Cada negocio tiene su propio calendario de meses.
- **`/revisar` cambia de dueño:** ahora es «Por revisar» (F-03, tarjetas una a una). La bandeja anterior «Revisado por Zenity» se mueve a `/revisado` y sigue en el menú.
- **Navegación del dueño (sección 8 del brief):** la barra inferior pasa a Inicio · Por revisar · Caja · Cobrar · Más. Ingresos, Egresos, Balance y el chat siguen en el menú lateral y en «Más».
- **Por revisar = movimientos sin match con confianza < 0.90** (no personales, no corregidos). Los movimientos conciliados con confianza media (p. ej. EXACTO sin coincidencia de nombre, 0.85) se ven en Conciliación con su insignia, pero no llenan la bandeja: así el seed abre con los 6 casos ambiguos.
- **Escenario base de caja:** incluye certeza ALTA y MEDIA; las cobranzas vencidas (BAJA) solo cuentan si hay promesa. El pesimista usa ventas promedio − 1 desviación y deja fuera las promesas.
- **Personal:** además de las señales del brief, +0.5 si la transferencia va a una persona con el apellido del dueño («transferencia a un familiar»).
- **Depósito de efectivo:** la regla SUGERIDO lo compara con las boletas al contado del día anterior (sin match) y lo propone como ventas en efectivo.

## Pendientes / TODO

- Cronograma de vencimientos SUNAT y tipo de cambio: tablas mock, reemplazar por las oficiales.
- Cuentas PCGE: propuesta inicial, validar con un contador piloto.
- Plantillas de importación Contasis, Concar y Siigo: TODO hasta tener los formatos reales (se exporta CSV genérico).
