# Zenity

**Conecta tus finanzas en un solo lugar.** Prototipo front-end *mobile first* de Zenity, un consolidador financiero con asistente de IA. Toma como concepto las pantallas del [Figma de Zenity](https://www.figma.com/design/AhyL5qRK94EyUsUHlr1fjU/Zenity-App?node-id=26-2) y las lleva al lenguaje visual y de movimiento de [Gemini](https://gemini.google.com/app).

<p>
  <img src="docs/screenshots/splash.jpg" width="200" alt="Bienvenida" />
  <img src="docs/screenshots/verificacion.jpg" width="200" alt="Verificación con código de 4 dígitos" />
  <img src="docs/screenshots/registro-personal.jpg" width="200" alt="Registro: datos personales" />
  <img src="docs/screenshots/registro-empresa.jpg" width="200" alt="Registro: datos de la empresa" />
</p>
<p>
  <img src="docs/screenshots/onboarding.jpg" width="200" alt="Recorrido de bienvenida" />
  <img src="docs/screenshots/inicio.jpg" width="200" alt="Inicio con la paleta Midnight" />
  <img src="docs/screenshots/chat.jpg" width="200" alt="Chat con Zenity" />
  <img src="docs/screenshots/resumen.jpg" width="200" alt="Resumen" />
</p>
<p>
  <img src="docs/screenshots/negocios.jpg" width="200" alt="Selector de negocios (RUC)" />
  <img src="docs/screenshots/ingresos.jpg" width="200" alt="Ingresos" />
  <img src="docs/screenshots/escritorio.jpg" width="412" alt="Vista de escritorio" />
</p>

> Prototipo con datos de ejemplo: no hay backend, no se envían ni guardan datos y las respuestas de la IA son simuladas.

## Cómo correrlo

Requiere Node 20.19+ (o 22.12+).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build
npm run lint      # oxlint
```

## Pantallas

| Figma | Ruta | Qué hace |
| --- | --- | --- |
| Splash | `/` | Bienvenida con destello animado, resplandor de fondo y CTA |
| Login (×2) | `/login` · `/login?modo=registro` | Correo con validación, Google/Apple (simulado). Al iniciar sesión con correo o con Google pide un código de verificación |
| — (nuevo) | `/verificacion` | Código OTP de 4 dígitos enviado al correo (inicio con correo) o por SMS (inicio con Google), con notificación simulada, autocompletado, 3 intentos y reenvío |
| — (nuevo) | `/registro/datos` | Registro paso 1: el DNI va primero; la consulta a RENIEC completa nombres, apellidos, fecha de nacimiento y dirección, y se agregan correo y celular (+51) |
| — (nuevo) | `/registro/empresa` | Registro paso 2: el RUC va primero (con dígito verificador); la consulta a SUNAT muestra la ficha de la empresa y completa razón social, nombre comercial, **régimen tributario** e **ingreso mínimo mensual** (calculado con el SIRE) |
| Notifications | `/notificaciones` | Hoja inferior para activar notificaciones push |
| Home | `/inicio` | **Selector de negocio (RUC)**, saludo según la hora, ocultar saldos, periodo, carrusel de cuentas del negocio, ingresos/egresos/total, resumen de IA, **reporte del mes ya generado** y **recorrido de bienvenida** en el primer ingreso |
| Menu | menú lateral | Drawer en móvil, barra lateral fija en escritorio (como Gemini), perfil, **tus negocios** con cambio en un toque, "Ver tutorial" |
| — (nuevo) | `/negocios/nuevo` | Agregar otro RUC: consulta a SUNAT con su ficha, nombre comercial y aviso si el RUC ya está agregado |
| Add new connection | `/conexiones/nueva` | Búsqueda, filtros y conexión animada a bancos, APIs, bases de datos y archivos |
| Conection added / error | `/conexiones/resultado` | Éxito o error con nube animada. *API externa* falla la primera vez y Zenity **reintenta sola**: el error solo se muestra si fallan los reintentos |
| Loading (×4) | `/analizando` | Análisis con IA en 4 pasos con progreso |
| No-categorized (×4) | `/revisar` | **Revisado por Zenity**: los movimientos que Zenity clasificó y los pares que concilió sola, con su confianza y su motivo. Se puede cambiar cualquier decisión con un toque (se aplica al instante) y "Enséñame cómo identificarlo" |
| Single account / Incomes / Expenses | `/movimientos/todo` · `/ingresos` · `/egresos` | Selector de cuenta, métricas, insights, categorías con transacciones y búsqueda |
| Resume | `/resumen` | Balance total y gráfico de barras interactivo por mes |
| Chat | `/chat` | Chat con Zenity: sugerencias, respuestas que se escriben en vivo, tablas, adjuntos y dictado por voz |
| Single conection / Empty data | `/conexion/:id` | Tarjeta con inclinación 3D, **sincronización o importación automática** con su última lectura, movimientos, estado vacío y eliminar conexión |

## Acceso, registro y onboarding

- **Verificación con código de 4 dígitos** al iniciar sesión con correo o con Google. El código "llega" como una notificación simulada (correo o SMS) y **se escribe solo** al llegar, como el autocompletado del teclado del celular (también se puede tocar la sugerencia). Con SMS la app ya pide el código por **WebOTP**, que en Android lo entrega apenas llega el mensaje. Las casillas aceptan escribir, pegar y el autocompletado real del sistema (`autocomplete="one-time-code"`), verifican solas al completar los 4 dígitos y muestran los estados de verificando, error (con sacudida), éxito y bloqueo tras 3 intentos, con reenvío después de 30 segundos.
- **Registro en 2 pasos** después de "Regístrate", con campos *filled* de Material 3 (etiqueta flotante, brillo de Gemini al enfocar), validación en vivo y formato automático del celular y del monto. Los datos solo viven en memoria; la app guarda únicamente el nombre y la empresa para el saludo y el menú.
  - **Paso 1 · DNI → RENIEC**: al escribir los 8 dígitos se consulta RENIEC (barras de carga azules de Gemini) y se completan nombres, apellidos y fecha de nacimiento (bloqueados, con candado) y la dirección (editable). Faltan solo el correo y el celular.
  - **Paso 2 · RUC → SUNAT**: con el RUC completo y su dígito verificador válido se consulta SUNAT y aparece la ficha de la empresa: estado y condición, tipo de contribuyente, régimen tributario, nombre comercial, trabajadores, actividad económica (CIIU) principal y secundarias, domicilio fiscal, fechas de inscripción e inicio de actividades, sistemas de emisión y contabilidad, comercio exterior y comprobantes electrónicos. Se completan la razón social (bloqueada), el nombre comercial, el **régimen tributario** (marcado "Tu régimen según SUNAT") y el **ingreso mínimo mensual** (el mes con menos ventas del SIRE); los tres últimos se pueden cambiar, pero no hace falta tocarlos.
  - **Consultas simuladas**: no hay conexión real con RENIEC ni SUNAT. Los datos se generan a partir del número (el mismo documento siempre devuelve la misma persona o empresa) con la forma de una respuesta real, en `src/data/registry.ts`, para cambiarlas luego por una API. Para probar: cualquier DNI de 8 dígitos; un DNI con todos los dígitos iguales o `12345678` no existe. RUC de ejemplo `20123456786`; un RUC 10 con tu DNI (`10` + DNI + dígito verificador) devuelve a la misma persona como "persona natural con negocio"; un RUC con los 8 dígitos centrales iguales (p. ej. `20111111112`) no existe.
- **Recorrido de bienvenida** en el primer ingreso: un foco animado con borde de degradado recorre cada sección del inicio (resumen, periodo, cuentas, agregar cuenta, ingresos/egresos/total, resumen con IA, reporte, notificaciones, menú) y cada opción de la barra inferior. Se puede repetir desde **Menú → Ver tutorial**.

## Piloto automático: Zenity sin pasos manuales

Zenity no espera a que el usuario actúe para que sus números estén bien. Estos son todos los pasos que antes dependían del usuario (sin contar el chat, que es para conversar) y cómo se automatizaron:

| # | Paso manual (antes) | Dónde | Qué hace Zenity ahora (prototipo) | Cómo sería en producción |
| --- | --- | --- | --- | --- |
| 1 | Elegir la categoría de cada movimiento "Sin categoría" y tocar **Aplicar** | `/revisar` | Aplica sola la categoría recomendada, con su **confianza** y su **motivo**. Las de confianza baja (menos de 70 %) se marcan, pero igual se aplican. Cambiar una categoría se aplica al instante | Cascada reglas del RUC → similitud con `pgvector` → Claude Haiku/Sonnet: todo se clasifica en el worker de ingesta; las correcciones alimentan las reglas |
| 2 | Responder "¿Es el mismo movimiento?" para cada par | `/revisar` | Concilia sola: desde **75 % de coincidencia** une el par (cuenta una vez); por debajo, los deja separados. Se puede corregir con un toque | Mismo umbral en el worker de conciliación, con mismo comprobante, monto, fecha (±1 día) y contraparte |
| 3 | Tocar **Ver cuenta** o **Sincronizar ahora** para que una cuenta nueva tenga saldo | Resultado de conexión, `/conexion/:id` | Toda conexión se **sincroniza sola** apenas se agrega y vuelve a leerse **cada 6 horas** (al abrir la app y mientras está abierta), en todos los negocios. El detalle muestra "Actualizada hace…" | EventBridge Scheduler + SQS: una tarea por conexión cada 6 h (y webhooks del banco o agregador cuando existan) |
| 4 | Volver a subir el Excel o el PDF para tener el balance al día | `/conexion/:id`, insight del inicio | Cada archivo tiene su **importación automática**: Excel desde OneDrive/Google Drive, Google Sheets sincronizado y PDF tomado del correo. Subir a mano queda como opción | Microsoft Graph / Google Drive con notificaciones de cambios; lectura del correo (solo lectura) filtrando los estados de cuenta del banco |
| 5 | Tocar **Reintentar** cuando una conexión falla | `/conexiones/nueva` | Zenity **reintenta sola** ("Falló el primer intento: Zenity reintenta sola") y la conexión se agrega sin pasar por el error | Reintentos con espera exponencial (3 intentos) antes de avisar; el error solo llega al usuario si sus credenciales ya no sirven |
| 6 | Elegir el **régimen tributario** (General, RMT o RER) | Registro y `/negocios/nuevo` | Se toma de la **ficha RUC** y llega elegido ("Tu régimen según SUNAT") | Tributos afectos de la ficha RUC, con la autorización SOL/SIRE del contribuyente |
| 7 | Escribir el **ingreso mínimo mensual** | Registro paso 2 | Se calcula con el **SIRE**: el mes con menos ventas de los últimos 6 | Registro de Ventas (RVIE) por la API del SIRE |
| 8 | Tocar **Generar reporte completo** y esperar | `/inicio` | El reporte del mes **ya está hecho**: el botón lo abre ("Ver reporte de marzo") y se avisa cuando está listo | Worker de informes al cierre de cada mes y actualización diaria; aviso por notificación |
| 9 | Copiar o tocar el **código de verificación** | `/verificacion` | El código **se escribe solo** al llegar y se verifica | WebOTP para SMS (Android) y enlace mágico o *passkeys* para no pedir código en cada ingreso |

**Lo que sigue siendo del usuario** (porque es su decisión o lo exige un tercero, no porque Zenity lo necesite para funcionar):

- **Dar acceso una sola vez**: conectar cada cuenta (consentimiento del banco, la billetera o el archivo) y autorizar el SIRE con la Clave SOL. Después todo corre solo.
- **Permiso de notificaciones push** (`/notificaciones`): el navegador exige un toque del usuario. Zenity no depende de él: los avisos llegan dentro de la app aunque lo rechace.
- **Aceptar la propuesta del SIRE** (módulo SUNAT, hoy oculto): es una declaración ante SUNAT. La propuesta es aceptarla automáticamente antes del vencimiento solo con una autorización expresa del usuario y cuando no haya diferencias con sus movimientos; si las hay, avisar.
- **Decisiones del negocio**: agregar o quitar un RUC o una conexión, y cobrar a los clientes que deben.

## Varios negocios (RUC)

- **Cada RUC es independiente**: tiene sus propias cuentas conectadas, movimientos, balance mes a mes, insights, movimientos por revisar y respuestas del chat. Nada se mezcla entre negocios.
- **Cambio rápido**: el selector del encabezado del inicio (avatar, nombre y RUC) abre **Tus negocios** con el saldo y las cuentas de cada uno. En Movimientos, Balance y el chat, el avatar del negocio arriba a la derecha abre la misma hoja, y el menú lateral muestra el negocio activo con accesos de un toque a los demás. Al cambiar, la pantalla entra con un fundido y un aviso confirma el negocio activo.
- **Agregar otro RUC** (`/negocios/nuevo`): se consulta en SUNAT y el negocio nuevo empieza sin cuentas, con un estado vacío que invita a conectar la primera. Si el RUC ya está agregado, ofrece ir a ese negocio.
- El registro deja el RUC registrado como único negocio. Sin registro, la demo trae dos negocios de ejemplo: **Andes Market** (los datos del Figma) y **Cocina Pacífico**. Los negocios y sus cuentas se guardan en el navegador.

## Paleta Midnight (solo modo oscuro)

El fondo gris neutro (`#131314`) con tiles verde y naranja al 18 % producía tonos oliva y marrón apagados, con poco contraste entre las tarjetas y el fondo. La propuesta actual:

- **Fondo** negro azulado `#0b0d13` con superficies de matiz índigo y una luz ambiental muy suave (azul, violeta y turquesa) detrás de todas las pantallas.
- **Ingresos**: degradado esmeralda con luz menta en la esquina, borde degradado y halo verde.
- **Egresos**: degradado rosa/borgoña (en lugar de marrón) con acento coral, más legible como alerta.
- **Total**: protagonista con el degradado de IA (azul → violeta → rosa) en el relleno y en el borde.
- Iconos en pastillas del color del acento, montos en blanco y variación vs. mes anterior en píldoras verde/roja según sea buena o mala.

## Estilo Gemini aplicado

- **Tokens de Gemini** (`src/styles/tokens.css`): roles de color (`primary #a8c7fa`, contenedores, contornos), formas y curvas de movimiento, sobre la paleta Midnight.
- **Tipografía variable Google Sans Flex** (la de Gemini) con ejes de peso, ancho y redondez; iconos **Material Symbols Rounded** (equivalente público de Google Symbols) con transición de contorno a relleno.
- **Movimiento Material 3**: curvas `emphasized` y `decelerate`, transición de eje compartido al avanzar/volver (detecta el botón atrás del navegador) y *fade through* entre pestañas.
- **Efectos de IA**: saludo con degradado que barre el texto, texto con brillo ("Pensando…"), barras de carga azules, texto que aparece palabra por palabra, destello que gira mientras piensa, borde cónico giratorio en el campo de entrada y resplandor de fondo animado.
- **Detalles**: ripple y *state layers* de Material 3, montos con conteo animado, desenfoque al ocultar saldos, hojas inferiores que se cierran arrastrando, snackbars, diálogos e indicadores que se deslizan entre opciones.
- Respeta `prefers-reduced-motion` y funciona con teclado y lectores de pantalla.

## Cambios respecto al Figma

- Números de ejemplo consistentes: los totales se calculan desde las transacciones (en el Figma, por ejemplo, Ingresos 1,890.20 − Egresos 890.20 mostraba Total 890.20).
- Moneda unificada en soles (`S/`) y ortografía corregida («¿No tienes una cuenta?», «Regístrate», «¡Genial!», «¿Por dónde empezamos?»…). El texto «Carty» de las fuentes de conexión pasó a «Zenity».
- Se implementaron las notas del diseño: insights rápidos de **Ingresos** (fuente principal, cuenta con más ingresos, variación, cobros conciliados) y de **Egresos** (alerta, categoría dominante, cuenta con más salidas, operativo vs. comercial, devoluciones).
- Vista de escritorio con barra lateral y contenido en columnas.
- Los logos de los bancos son monogramas simplificados; los de Google, Excel, MySQL, SQL Server, PostgreSQL, XML, Visa y Mastercard vienen de los sets de iconos usados en el Figma (Iconify).

## Stack

[Vite 8](https://vite.dev) · React 19 · TypeScript · [React Router 8](https://reactrouter.com) (`HashRouter`) · [Motion](https://motion.dev) · CSS Modules · oxlint.

```
src/
  styles/      tokens, base, efectos y layout globales
  components/  UI reutilizable (botones, chips, hojas, tarjetas, gráfico, textos de IA…)
  layouts/     shell con navegación, transiciones entre pantallas, menú
  screens/     una pantalla por archivo
  data/        datos de ejemplo, negocios y sus datos (ledger), consultas RENIEC/SUNAT, insights y chat
  state/       estado global (perfil, negocios y su RUC activo, saldos ocultos, periodo, revisión, recorrido)
  lib/         utilidades (formato, animaciones, ripple…)
```

## Despliegue

El workflow `.github/workflows/deploy.yml` compila y valida cada push y pull request. Si **GitHub Pages** está habilitado en el repositorio (*Settings → Pages → Source: GitHub Actions*), también publica la demo en cada push a `master`. El build usa rutas relativas y `HashRouter`, así que funciona desde cualquier subruta.
