# Finanzas · Leo

Web app de finanzas personales para trackear la vida financiera completa: gastos, deudas de
tarjetas, plan de pago **bola de nieve**, viáticos reembolsables y revisión semanal.
Moneda: **Guaraníes (PYG)**, formato `1.234.567`. UI en **español (Paraguay)**.

Reemplaza/complementa el Google Sheets "Life Dashboard 2026".

## Filosofía de diseño

El patrón del usuario es **evitación bajo estrés**, no impulsividad. Por eso la app:

- Registro de gasto en **≤30 s** (pestaña *Hoy*).
- **Sin backfill**: arranca desde hoy, nunca pide reconstruir historial viejo.
- **Modo estrés** en la revisión semanal: registrar solo una palabra de estado emocional y
  completar los números al día siguiente.

## Cómo correrlo

No requiere build ni dependencias. Es HTML + CSS + JavaScript plano.

```bash
npm start         # servidor Node en http://localhost:8080
# o
npm run serve     # alternativa con python3 -m http.server 8080
```

También funciona abriendo `index.html` directamente en el navegador. Es una **PWA**: en el
celular, "Agregar a la pantalla de inicio" para usarla como app y registrar gastos en el día.

Los datos se guardan en `localStorage` del dispositivo. Exportá un respaldo JSON desde la
pestaña *Tareas*.

## Tests

El motor financiero (bola de nieve, abono sostenible, interés de viáticos, formato PYG) tiene
pruebas con el runner nativo de Node:

```bash
npm test          # node --test
```

## Funcionalidades

| Pestaña | Qué hace |
|---|---|
| **Hoy** | Registro rápido de gasto: monto, categoría, medio de pago, flag viático + foto del comprobante, nota. Alerta de la *regla de oro* (usar tarjeta solo con efectivo de respaldo). |
| **Deudas** | Saldos por deuda con barra de **utilización** y alerta a >80% (Itaú ~98%). Actualizar saldo, liquidar Sudameris. |
| **Plan** | Proyección **bola de nieve** con *roll-over* automático de mínimos, fechas de cancelación, interés total y tabla mes a mes. Compara el abono con el **abono sostenible**. |
| **Viáticos** | Pendientes con contador de "días sin rendir" e **interés perdido estimado**, alerta a los 7 días, reembolso con destino sugerido: pago directo a la tarjeta. |
| **Mes** | Abono **sostenible** con desglose, variables por categoría vs presupuesto, "costo de deber", flujo del mes. |
| **Revisión** | Revisión semanal (viernes, 15 min) con **modo estrés**. |
| **Tareas** | Pendientes del usuario, decisión crítica del rescate de ahorro (~43 M), cuentas/activos, export/reset. |

## Reglas de negocio implementadas

1. **Regla de oro de tarjeta** — alerta si se registra compra con tarjeta sin efectivo de respaldo.
2. **Snowball roll-over** — el mínimo de una deuda cancelada rueda al abono de la siguiente
   (3,0 M → 3,611 M → 5,111 M → 6,281 M).
3. **Viáticos** — foto en el momento, contador de días, costo de interés `saldo × TAN/12 × meses`,
   alerta a 7 días, reembolso al destino correcto (tarjeta, no caja de ahorro).
4. **Costo de deber** — categoría propia (interés + seguros + cuotas), ~1 M/mes.
5. **Utilización** — alerta a >80% del límite.
6. **Abono sostenible** — `ingresos − fijos − mínimos − ahorro − variables`; distingue mes normal
   vs mes con bono. No promete 3 M si el flujo no lo banca.
7. **Auto último** a propósito (7% << 19,7–19,8%).

## Estructura

```
index.html              # shell + carga de scripts
css/styles.css          # estilos mobile-first (claro/oscuro)
js/format.js            # formato PYG y fechas (UMD: navegador + Node)
js/finance.js           # motor: snowball, sostenible, viáticos (UMD)
js/data.js              # datos semilla reales jun-2026 (UMD)
js/store.js             # estado + persistencia localStorage
js/app.js               # interfaz por pestañas
test/finance.test.js    # pruebas del motor
server.js               # servidor estático sin dependencias
```

## Datos semilla

Cargados desde el análisis real de junio 2026: 4 deudas activas (Sudameris, UENO, Itaú, préstamo
auto), ingresos, gastos fijos, cuentas y las tareas pendientes. El saldo de Itaú está marcado
como "a actualizar" (el extracto de 58,7 M ya fue parcialmente pagado).

## Roadmap

- **Fase 2**: ciclos de tarjeta (cierre/vencimiento) con recordatorios, comparación plan vs real.
- **Fase 3**: import de extractos Itaú (PY), escenarios ("rescatar ahorro programado"), gráficos
  de evolución, sync con Google Sheets.
