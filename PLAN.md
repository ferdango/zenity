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

## Look and feel (19/11/2026)

- **Tema claro por defecto** («Día»: fondo gris azulado, superficies blancas con sombra suave) y **tema oscuro mejorado** («Noche suave»: menos negro puro, superficies azul pizarra). Selector Claro · Oscuro · Automático en Más y en Ajustes de la cuenta (`src/lib/theme.ts`; `index.html` aplica el tema antes de pintar).
- Las tarjetas de conexiones no cambian en ningún tema. Los tiles de Ingresos/Egresos/Utilidad pasan a tonos pastel en el tema claro.
- Íconos con color según el estado (verde: cuadra, ámbar: atención, rojo: deuda, violeta: personal).
- **Flujos:** «Ver la demo» en la bienvenida (sin login); las pestañas Por revisar, Caja y Cobrar ya no muestran flecha de volver; notificaciones calculadas con los datos y con enlace a su pantalla (la campana solo se enciende si hay algo que hacer); Conciliación abre en el primer estado con pendientes; Inicio con «Para hoy» en filas; Cobrar marca la urgencia con color; Caja muestra «Lo que viene» como lista por mes.

## F3 · Perfil crediticio con flujo real (19/11/2026)

- **Dueño (`/credito`):** perfil de crédito con puntaje 0–100 y 6 componentes explicados, monto sugerido, simulador (plazo, monto, cuota, intereses y efecto en la caja), consentimiento por fuente (90 días, revocable) y estado de la solicitud hasta el desembolso.
- **Banco (`/bcp`, «Ver como BCP»):** expedientes de los clientes que autorizaron compartir, con señales tempranas (adelanto de F4), y decisión: pre-aprobar, pedir información o «no por ahora».
- **Reglas de ejemplo** en `src/config/credit.ts` (TEA 30%, cuota ≤ 50% de lo que le sobra al negocio, factor por segmento). El cálculo vive en `src/domain/credit.ts` con tests. La política real es del BCP.
- **Decisiones:** pedir prestado nunca mejora el perfil (el desembolso no cuenta como liquidez y la cuota nueva suma a la deuda); el perfil es del dueño y el banco solo lo ve con consentimiento vigente; eventos de PostHog sin montos (`credito_*`).
- **Pendiente:** texto legal real del consentimiento, tarifa y política del BCP, comisión por crédito colocado y la mora de los créditos originados.

## Huecos del MVP (18/11/2026)

- **Extracto en Excel o CSV** (`src/domain/extracto.ts`, `src/lib/tabla.ts`): lee .xlsx (ZIP + XML con `DecompressionStream`, sin dependencias), tablas HTML con extensión .xls y CSV (UTF-8 o Windows-1252). Reconoce las columnas por nombre (Fecha, Descripción, Monto o Cargo/Abono, Saldo, N.° de operación, Hora), deduce canal y contraparte de la glosa y no duplica lo que ya está. «Probar con un extracto de ejemplo» arma uno con el formato de la Banca por Internet BCP. El .xls binario antiguo pide guardarlo como .xlsx o .csv.
- **Pagos en partes** (regla `PARCIAL`): varios abonos de la misma contraparte que suman el total (0.85; 0.92 si coinciden con las cuotas) o pagos a cuenta (0.7, solo con RUC o nombre muy parecido). El comprobante sigue abierto con lo que falta (`saldoPendiente`), que es lo que usan Cobrar y Caja. También se agregó el **cobro atrasado**: mismo monto y misma contraparte hasta 90 días después de la ventana (`EXACTO`, 0.9).
- **Cierre de caja** (regla `CIERRE`, `src/domain/cierres.ts`, `/cierre-caja`): el dueño anota el efectivo contado; el depósito de 1 a 3 cierres de los últimos 4 días se explica con 0.95 (0.85 si depositó al menos el 80%). Muestra lo vendido sin boleta, el faltante frente a las boletas y lo que quedó en caja, que entra a la proyección como «Efectivo en caja».
- **Configuración inicial** (`/bienvenida`): permisos de datos por fuente (texto en `src/config/legal.ts`, borrador para revisión legal según la Ley N.° 29733) y planilla (régimen laboral, trabajadores, sueldo). «Ver la demo» pasa por aquí; Más → **Permisos de datos** revoca por fuente.
- **Confianza media** en «Por revisar»: sección aparte para confirmar o consultar al contador; no cambia el contador de pendientes (la decisión de abrir con 6 tarjetas se mantiene).
- **Nota del contador** junto al movimiento en el detalle de Conciliación.
- **Métricas:** eventos de PostHog sin montos para cada feature (`src/lib/analytics.ts`) y la pantalla **Métricas del piloto** (`/metricas`, `src/domain/metricas.ts`). El error de la proyección se mide con la proyección a 7 días guardada (en la demo la fecha está fija). El contador puede **cerrar el mes** (también con pendientes) y así se miden los días de cierre.
- **Pendiente:** reporte de retención semanal en PostHog, razón social, correo de derechos ARCO e inscripción del banco de datos para el texto legal.

## Pendientes / TODO

- Cronograma de vencimientos SUNAT y tipo de cambio: tablas mock, reemplazar por las oficiales.
- Cuentas PCGE: propuesta inicial, validar con un contador piloto.
- Plantillas de importación Contasis, Concar y Siigo: TODO hasta tener los formatos reales (se exporta CSV genérico).
