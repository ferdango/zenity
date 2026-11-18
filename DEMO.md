# Guion de demo (5 minutos) — Primera ola

Para BCP e inversionistas. Todo sale del seed determinístico (hoy = **18/11/2026**). Los números de abajo son los que muestra la demo recién reiniciada.

**Antes de empezar:** Más → **Reiniciar demo** (o abre `https://ferdango.github.io/zenity/` en una ventana privada y toca **«Ver la demo»** en la bienvenida, sin pasar por el login).

## 0. Antes de empezar (configuración inicial) · 20 s

- **«Ver la demo»** abre la configuración del negocio en 2 pasos. **1 · Tus datos:** Zenity lee la cuenta BCP, SUNAT y Yape/POS solo con permiso, en solo lectura y revocable (texto completo en «Leer la autorización completa», borrador para revisión legal). **Acepto y continúo**.
- **2 · Tu planilla:** Pequeña empresa (REMYPE), 4 trabajadores, S/ 1,400 → «Gratificación de diciembre: S/ 3,052 · CTS de mayo: S/ 1,400». **Guardar y ver mi negocio**.
- Con «Ahora no», Inicio muestra la tarjeta «Termina de configurar Zenity». Los permisos se revocan por fuente en Más → **Permisos de datos**. Para el dueño usa el celular o la vista de 375 px; para el contador, una pantalla de escritorio.

**Apariencia:** la app abre en tema claro. En Más → **Apariencia** (o en Ajustes de la cuenta) se cambia a Oscuro o Automático; se mantiene al reiniciar la demo.

---

## 1. Inicio como Rosa (Ferretería San Martín) · 30 s

- Saldo actual BCP: **S/ 10,655.66**.
- Alerta de caja: **«El 20/12 tu caja baja a S/ 6,437 por la gratificación y el IGV.»** (queda bajo su colchón de S/ 7,659).
- **Tienes 6 por revisar** · **Te deben S/ 9,300** · **Gasto personal este mes S/ 820**.
- Tarjeta de microlección: «Este Yape no tiene boleta: por qué importa».

## 2. Por revisar · 60 s

1. Primera tarjeta: **J. Cárdenas, −S/ 380, confianza Baja 35%**. Toca **«Transporte y movilidad»** (1 toque).
2. Aparece **«¿Aplicar siempre a pagos a J. Cárdenas?»** → **Sí, siempre**. El otro pago a J. Cárdenas (S/ 420) se reclasifica solo: el contador baja a **4**.
3. Muestra el toast con **Deshacer** (5 s) y el botón de WhatsApp (arriba a la derecha) con la misma tarjeta como mensaje.
4. Segunda tarjeta (PAGO VARIOS 00451): **Correcto**.
5. Más → **Datos de entrenamiento**: las correcciones quedan registradas por rubro (el activo de datos).

## 3. Conciliación · 45 s

1. Más → **Conciliación**: noviembre al **62% conciliado** con chips por estado.
2. Mes **Oct** → «Todo cuadra» → **Cobro · Minera Santa Inés S.A.**: vista de tres columnas (Banco | SUNAT | Cobro digital), regla **Detracción**, **Alta 92%** y el aviso **«S/ 240 en tu cuenta de detracciones del Banco de la Nación»**.
3. Mes **Nov** → **Liquidación POS · Niubiz**: «Es la liquidación POS del 07/11/2026: 23 ventas menos S/ 73.03 de comisión».
4. Chip **«Cobraste sin boleta/factura»**: 3 Yapes sin boleta + la microlección L01.

## 4. Personal vs negocio · 30 s

- **S/ 820** este mes en 6 movimientos (supermercado, Netflix, pensión del colegio, cine, delivery de noche y una transferencia a Kevin Huamán). Barras de los 3 últimos meses: bajando.
- **Definir mi sueldo de dueño → S/ 500** → alerta **«Te pasaste S/ 320 de tu sueldo este mes»** y la lección «Págate un sueldo fijo». El reto de 30 días se reinicia.

## 5. Cobrar · 45 s

- **Te deben S/ 9,300**. Primero **Multiservicios Rímac E.I.R.L.: S/ 2,950, 45 días de atraso** (Vencida 31–60).
- **Recordar** → mensaje con **tono firme**, monto, F001-454 y formas de pago (Yape, cuenta BCP, CCI) → **Abrir WhatsApp** (wa.me, sin Business API).
- **Registrar promesa** → S/ 2,950 el 25/11 → «Ya está en tu caja».
- (Opcional) **Simular que pagó** en Condominio Las Gardenias → «¡Condominio Las Gardenias te pagó S/ 1,180!» y «Te deben» baja a S/ 8,120.

## 6. Caja · 30 s

- La promesa aparece como evento **Promesa de pago · certeza Media** y **la alerta de diciembre desaparece**: el 20/12 la caja ya no baja del colchón.
- Tabla de eventos: gratificación de diciembre **S/ 3,052** (4 × (S/ 700 + 9%)), impuestos de noviembre el 16/12, planilla, alquiler, proveedores recurrentes.
- Ajustes → régimen laboral: al pasar a «Régimen general» la gratificación sube a S/ 6,104.

## 7. Régimen · 20 s

- Simulador con 12 meses del SIRE: el **Régimen MYPE Tributario** (su régimen actual) es el más barato.
- **Enviar a mi contador**.
- (Opcional) Cambia a **Bodega Doña Rosa**: «Vas al 87% del límite del Nuevo RUS (S/ 96,000)».

## 8. Contador · 60 s

1. Menú → **Ver como contador**: tablero de **10 clientes** con semáforo (4 rojo, 3 ámbar, 3 verde), alertas y vencimiento SUNAT por último dígito del RUC.
2. Abre **Ferretería San Martín** → **Comentarios**: llegó el resultado del simulador.
3. **Movimientos** → **Preguntar** en un movimiento → vuelve a **Ver como dueño** → en «Por revisar» aparece **«Tu contador pregunta…»** → responde → la respuesta vuelve al hilo del contador.
4. **Reglas del contador**: crea una (contraparte contiene… → categoría + cuenta PCGE) y mira cuántos movimientos reclasifica.
5. **Exportar asientos** → **Descargar CSV** (`fecha, glosa, cuenta_pcge, debe, haber, comprobante, ruc_contraparte`), con debe = haber.

## 9. Huecos del MVP cerrados · 60 s

1. Más → **Conciliación** → **Subir extracto del banco** → **Probar con un extracto de ejemplo** (formato de la Banca por Internet BCP; también acepta tu propio .xlsx o .csv): 3 nuevos y 1 que ya estaba. **Agregar 3 movimientos** → «Zenity concilió 3»: Rímac paga la mitad (**Pago en partes**, faltan S/ 1,475), Las Gardenias paga 10 días tarde (**Monto exacto**) y se paga a Pinturas Andinas.
2. **Cobrar:** «Te deben» baja a **S/ 6,645** y Rímac muestra «Ya abonó S/ 1,475 de S/ 2,950». **Recordar por WhatsApp** y luego **Simular pago**: «Cobraste 1 de 1 comprobante después de recordarlo».
3. **Cierre de caja** (desde Conciliación o Más): «Días sin cierre» → **13/11** (6 boletas por S/ 795.50) → cuenta **S/ 915.50** → el depósito del 14/11 queda explicado: «S/ 120 sin boleta» y «S/ 120 quedaron en caja», que entran a la proyección.
4. **Por revisar** → «Conciliados con confianza media»: **Está bien** o **Preguntar a mi contador**. En Conciliación, el detalle muestra la **nota de tu contador** junto al movimiento.
5. Como contador → cliente → **Cierre del mes** → **Cerrar con pendientes**: «18 días después del fin de mes».
6. Más → **Métricas del piloto**: las 5 de defensa y las de cada feature, con el evento de PostHog que las mide (sin montos ni datos personales).

## 10. Crédito BCP (F3) · 60 s

1. Más → **Crédito BCP** (o en Caja: «Ver cuánto crédito BCP puede pagar tu negocio»): «Según tu flujo real, podrías pedir hasta **S/ 14,500**» a 12 meses, cuota ≈ S/ 1,389.
2. **Así ve el banco a tu negocio:** puntaje **72**, segmento B (riesgo moderado), con 6 componentes explicados (capacidad de pago, ventas −15%, 99.7% con comprobante, 13 días de caja, S/ 4,130 vencidos, impuestos a tiempo).
3. **Simula tu crédito:** plazo y monto; «Sin crédito, el 20/12 tu caja baja a S/ 6,437. Con este crédito, tu caja no baja de…».
4. **Enviar mi expediente al BCP** → consentimiento por fuente (SIRE, BCP, Yape/POS), 90 días, revocable → «Autorizo y envío».
5. **Ver como BCP** (Más o menú): tablero de expedientes con puntaje, monto y señales tempranas → abrir Ferretería → **Pre-aprobar**.
6. Volver como dueña: «¡Pre-aprobado! S/ 14,500 a 12 meses» → **Aceptar y desembolsar**: el saldo sube a S/ 25,155.66, las cuotas entran a Caja y la alerta de diciembre desaparece. El puntaje baja a 65: pedir prestado nunca mejora el perfil.

---

### Verificación técnica

```bash
npm test        # 82 tests: 14 casos de conciliación, pagos en partes, cierre de caja, extracto (CSV y .xlsx), métricas, 3 regímenes laborales, simulador, cobranza, lecciones, contador y crédito
npm run build
```
