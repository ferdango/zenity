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
| Fuentes mock | `src/data/fuentes/` (`src/data/sources.ts` ya existía: catálogo de conexiones) | `BankSource`, `SunatSireSource`, `DigitalPaymentsSource` con implementación mock |
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

## Estado (18/11/2026)

| Paso | Estado |
| --- | --- |
| 0 · Inspección + `PLAN.md` | Hecho |
| 1 · Seed + adaptadores mock + config | Hecho (`src/data/seed`, `src/data/fuentes`, `src/config`) |
| 2 · `reconciliation` y `categorization` con tests de los 14 casos | Hecho (`src/domain/*.test.ts`) |
| 3 · F-02 + F-03 (`/revisar`) | Hecho: tarjetas, ✓ Correcto / deslizar, 3 alternativas, «Otra…», «Es personal», reglas con parecidos, Deshacer 5 s, vista WhatsApp, preguntas del contador |
| 4 · F-01 (`/conciliacion`) | Hecho: mes, % conciliado, chips por estado, detalle en tres columnas, banner NRUS |
| 5 · F-04 (`/personal`) | Hecho: resumen + 3 meses, sueldo de dueño, alerta de exceso, reto de 30 días |
| 6 · F-05 (`/cobrar`) | Hecho: lista por días × monto, tramos, mensaje por tono, wa.me, promesa, «Simular que pagó», días promedio de cobro |
| 7 · F-06 (`/caja`) con tests | Hecho: 30/60/90, base + pesimista + colchón, alerta, acciones, tabla de eventos, ajustes (régimen laboral y colchón) |
| 8 · F-07 (`/regimen`) con los tres tests | Hecho |
| 9 · F-08 (`/contador`) | Hecho: tablero de 10 clientes con semáforo, movimientos con PCGE, reglas, comentarios, cierre, CSV |
| 10 · Microlecciones | Hecho: 10 lecciones, tarjetas en contexto, `/aprende` con «Mi progreso» y eventos |
| 11 · Inicio, navegación y «Reiniciar demo» | Hecho |
| 12 · QA + `DEMO.md` | Hecho: 53 tests, build y lint; guion probado en el navegador (375 px dueño, 1280 px contador) |

Decisiones tomadas durante la construcción:

- **Alerta de caja = primer cruce del colchón** (o de cero) y su punto más bajo de esa semana; se nombran primero los picos peruanos (gratificación, IGV, CTS, planilla).
- **Escenario pesimista con la desviación semanal** (no diaria): los abonos diarios son muy irregulares y con la desviación diaria las ventas pesimistas quedaban en cero.
- **Yape no tiene saldo propio:** cada cobro se abona en la cuenta BCP; su tarjeta queda en S/ 0 para no contar dos veces el consolidado.
- **Seed calibrado** para que, con hoy = 18/11/2026, la alerta caiga el 20/12 por la gratificación y el IGV, y desaparezca al registrar la promesa de pago de la factura vencida.
- **Microlección en contexto:** se muestra hasta que el usuario la lee o la cierra; después solo queda en `/aprende`.

## Pendientes / TODO

- Cronograma de vencimientos SUNAT y tipo de cambio: tablas mock, reemplazar por las oficiales.
- Cuentas PCGE: propuesta inicial, validar con un contador piloto.
- Plantillas de importación Contasis, Concar y Siigo: TODO hasta tener los formatos reales (se exporta CSV genérico).
