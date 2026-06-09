/* data.js — datos semilla (seed) basados en el análisis real de jun-2026.
 * Usable como <script> (window.SeedData) y CommonJS (tests).
 */
(function (root) {
  'use strict';

  var seed = {
    // Inicio del plan bola de nieve
    planStart: '2026-06-30',
    extraPayment: 3000000, // abono extra planificado (revisar contra "sostenible")

    // --- Cuentas / activos ---
    accounts: [
      { id: 'caja1', name: 'Caja de ahorro I', type: 'savings', balance: 12654111 },
      { id: 'cajaU', name: 'Caja U', type: 'savings', balance: 4500 },
      { id: 'aprog1', name: 'Ahorro programado 1', type: 'scheduled_savings', balance: 6600000, monthlyAutoDebit: 200000 },
      { id: 'aprog2', name: 'Ahorro programado 2', type: 'scheduled_savings', balance: 36520000, monthlyAutoDebit: 1660000 }
    ],

    // --- Deudas (orden bola de nieve) ---
    debts: [
      { id: 'sudameris', name: 'Mastercard Sudameris', kind: 'credit_card', rateTAN: 0.1972,
        balance: 611000, minPayment: 611000, snowballOrder: 1, projectedPayoffDate: '2026-07',
        closeDay: null, dueDay: null },
      { id: 'ueno', name: 'Mastercard UENO', kind: 'credit_card', rateTAN: 0.1972,
        balance: 24290258, minPayment: 1500000, snowballOrder: 2, projectedPayoffDate: '2026-12',
        closeDay: null, dueDay: null },
      { id: 'itau', name: 'VISA Itaú', kind: 'credit_card', rateTAN: 0.1980,
        balance: 58729075, minPayment: 1170000, snowballOrder: 3, projectedPayoffDate: '2027-09',
        creditLimit: 59900000, needsBalanceUpdate: true,
        closeDay: 17, dueDay: 5 },
      { id: 'auto', name: 'Préstamo Auto Cooperativa', kind: 'loan', rateTAN: 0.0700,
        balance: 111202696, minPayment: 3702977, snowballOrder: 4, projectedPayoffDate: '2028-04' }
    ],

    // --- Extractos registrados por ciclo (CardCycle) ---
    cardCycles: [],

    // --- Ingresos mensuales (regulares) y extraordinarios ---
    income: [
      { id: 'salario', name: 'Salario neto', amount: 22680000, recurrence: 'monthly' },
      { id: 'allowance', name: 'Extra allowance', amount: 3500000, recurrence: 'monthly' },
      { id: 'ips', name: 'IPS (descuento)', amount: -2041200, recurrence: 'monthly' },
      { id: 'bono_abr', name: 'Bono abril', amount: 18900000, recurrence: 'once', month: '2026-04' },
      { id: 'bono_may', name: 'Bono mayo', amount: 63000000, recurrence: 'once', month: '2026-05' },
      { id: 'aguinaldo', name: 'Aguinaldo', amount: 29500000, recurrence: 'once', month: '2026-12' }
    ],

    // --- Gastos fijos mensuales (vivienda/servicios/educación) ---
    fixedExpenses: [
      { id: 'alquiler', name: 'Alquiler', amount: 7500000 },
      { id: 'ande', name: 'ANDE (luz)', amount: 600000 },
      { id: 'agua', name: 'Agua (ESSAP)', amount: 50000 },
      { id: 'tigo', name: 'Tigo', amount: 400000 },
      { id: 'claro', name: 'Claro', amount: 358000 },
      { id: 'seguro', name: 'Seguro médico', amount: 1005000 },
      { id: 'colegio', name: 'Colegio', amount: 2500000 },
      { id: 'gym1', name: 'Gimnasio', amount: 425000 },
      { id: 'gym2', name: 'Gimnasio 2', amount: 199000 }
    ],

    // --- Categorías ---
    categories: [
      { id: 'comida', name: 'Supermercado / comida', type: 'variable', budgetMonthly: 1000000 },
      { id: 'combustible', name: 'Combustible', type: 'variable', budgetMonthly: 200000 },
      { id: 'restaurantes', name: 'Restaurantes / cafés / ocio', type: 'variable', budgetMonthly: 2100000 },
      { id: 'compras', name: 'Compras puntuales', type: 'variable', budgetMonthly: 0 },
      { id: 'farmacia', name: 'Colegio / farmacia / otros', type: 'variable', budgetMonthly: 700000 },
      { id: 'viatico', name: 'Viático (reembolsable)', type: 'viatico' },
      { id: 'carga', name: 'Costo de deber (interés+seguros)', type: 'carga_financiera', budgetMonthly: 1070000 },
      { id: 'pago_tarjeta', name: 'Pago de tarjeta', type: 'deuda' }
    ],

    // --- Transacciones (sin backfill: arranca vacío) ---
    transactions: [],

    // --- Viáticos pendientes (se registran al usar la app) ---
    viaticos: [],

    // --- Revisiones semanales ---
    weeklyReviews: [],

    // --- Tareas pendientes del usuario (§6) ---
    tasks: [
      { id: 't1', text: 'Confirmar penalidad de cancelación anticipada del ahorro programado (bloquea decisión de los 43 M)', done: false },
      { id: 't2', text: 'Actualizar saldo real de Itaú (extracto 58,7 M ya parcialmente pagado)', done: false },
      { id: 't3', text: 'Rendir TODOS los viáticos pendientes esta semana y cuantificarlos', done: false },
      { id: 't4', text: 'Medir variables reales (comida + combustible) durante 1 mes', done: false },
      { id: 't5', text: 'Liquidar Sudameris (611.000) y retirar esa tarjeta de circulación', done: false }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = seed;
  else root.SeedData = seed;
})(typeof window !== 'undefined' ? window : globalThis);
