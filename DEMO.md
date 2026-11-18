# Guion de demo (5 minutos) — Primera ola

Para BCP e inversionistas. Todo sale del seed determinístico (hoy = **18/11/2026**). Los números de abajo son los que muestra la demo recién reiniciada.

**Antes de empezar:** Más → **Reiniciar demo** (o abre `https://ferdango.github.io/zenity/#/inicio` en una ventana privada). Para el dueño usa el celular o la vista de 375 px; para el contador, una pantalla de escritorio.

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

---

### Verificación técnica

```bash
npm test        # 53 tests: 14 casos de conciliación, 3 regímenes laborales, 3 casos del simulador, cobranza, lecciones y contador
npm run build
```
