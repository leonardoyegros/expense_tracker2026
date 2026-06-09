/* finance.js — motor financiero: bola de nieve, abono sostenible, costo de viáticos.
 * Sin dependencias de DOM. Usable como <script> (window.Finance) y CommonJS (tests).
 */
(function (root) {
  'use strict';

  var MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  function etiquetaMes(date) {
    return MESES[date.getMonth()] + ' ' + date.getFullYear();
  }

  /**
   * Simula el plan "Bola de Nieve" con roll-over de pagos mínimos.
   *
   * @param {Array} debts  [{ id, name, kind, rateTAN, balance, minPayment, snowballOrder }]
   *                       rateTAN en decimal (0.1972 = 19,72%). kind 'credit_card' | 'loan'.
   * @param {number} baseExtra  abono extra mensual inicial (ej. 3.000.000).
   * @param {Date}   startDate  primer mes del plan.
   * @param {number} maxMonths  tope de seguridad.
   * @returns {{ months:Array, payoffs:Object, totalInterest:number, totalPaid:number, monthsToFree:number }}
   *
   * Reglas:
   *  - Interés mensual = saldo * (TAN / 12), se acumula cada mes antes de pagar.
   *  - Cada deuda con saldo paga su mínimo.
   *  - El "pool" extra = baseExtra + suma de mínimos de deudas ya canceladas (roll-over).
   *  - El pool se aplica en orden de snowball; si sobra al cancelar una deuda, cae a la siguiente.
   */
  function simulateSnowball(debts, baseExtra, startDate, maxMonths) {
    maxMonths = maxMonths || 240;
    // Copia de trabajo ordenada
    var state = debts
      .filter(function (d) { return d.balance > 0; })
      .map(function (d) {
        return {
          id: d.id, name: d.name, kind: d.kind,
          rate: (d.rateTAN || 0) / 12,
          balance: Number(d.balance),
          minPayment: Number(d.minPayment) || 0,
          order: d.snowballOrder
        };
      })
      .sort(function (a, b) { return a.order - b.order; });

    var months = [];
    var payoffs = {};
    var totalInterest = 0;
    var totalPaid = 0;
    // El primer ciclo de pago cae en el mes del kickoff, salvo que el kickoff sea
    // a fin de mes (ej. 30/06): ahí el primer pago efectivo es el mes siguiente.
    var cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    if (startDate.getDate() > 1) cursor.setMonth(cursor.getMonth() + 1);

    for (var m = 0; m < maxMonths; m++) {
      var anyOpen = state.some(function (d) { return d.balance > 0.5; });
      if (!anyOpen) break;

      var rec = { index: m, date: new Date(cursor), label: etiquetaMes(cursor),
        perDebt: {}, interest: 0, paid: 0, remaining: 0 };

      // 1) Acumular interés
      state.forEach(function (d) {
        if (d.balance > 0.5) {
          var i = d.balance * d.rate;
          d.balance += i;
          rec.interest += i;
          totalInterest += i;
        }
      });

      // 2) Pagar mínimos + armar pool de roll-over
      var pool = baseExtra;
      state.forEach(function (d) {
        if (d.balance > 0.5) {
          var pay = Math.min(d.minPayment, d.balance);
          d.balance -= pay;
          rec.paid += pay;
        } else {
          // Deuda ya cancelada: su mínimo rueda al abono extra
          pool += d.minPayment;
        }
      });

      // 3) Aplicar pool en orden (con cascada del sobrante)
      for (var k = 0; k < state.length && pool > 0.5; k++) {
        var t = state[k];
        if (t.balance > 0.5) {
          var extra = Math.min(pool, t.balance);
          t.balance -= extra;
          pool -= extra;
          rec.paid += extra;
        }
      }

      // 4) Registrar saldos y detectar cancelaciones
      state.forEach(function (d) {
        if (d.balance < 0.5) d.balance = 0;
        rec.perDebt[d.id] = Math.round(d.balance);
        rec.remaining += d.balance;
        if (d.balance === 0 && !payoffs[d.id]) {
          payoffs[d.id] = { monthIndex: m, date: new Date(cursor), label: etiquetaMes(cursor) };
        }
      });

      totalPaid += rec.paid;
      rec.interest = Math.round(rec.interest);
      rec.paid = Math.round(rec.paid);
      rec.remaining = Math.round(rec.remaining);
      months.push(rec);

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      months: months,
      payoffs: payoffs,
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalPaid),
      monthsToFree: months.length
    };
  }

  /**
   * Abono extra sostenible = ingresos regulares − fijos − mínimos − ahorro − variables.
   * Devuelve el desglose para mostrarlo con transparencia.
   */
  function sustainableExtra(p) {
    var income = p.regularIncome || 0;
    var fixed = p.fixedTotal || 0;
    var mins = p.minTotal || 0;
    var savings = p.scheduledSavings || 0;
    var variables = p.variables || 0;
    var bono = p.bono || 0;

    var normal = income - fixed - mins - savings - variables;
    var conBono = normal + bono;
    return {
      income: income, fixed: fixed, mins: mins, savings: savings,
      variables: variables, bono: bono,
      normal: Math.round(normal),
      conBono: Math.round(conBono)
    };
  }

  /**
   * Costo de interés de un viático sin rendir (el usuario financia a la empresa).
   * interés = monto * (TAN/12) * meses_sin_rendir.
   */
  function viaticoInterest(amount, rateTAN, daysOutstanding) {
    var meses = (daysOutstanding || 0) / 30;
    return Math.round((amount || 0) * ((rateTAN || 0) / 12) * meses);
  }

  /** Utilización de tarjeta en % (0-100+). */
  function utilization(balance, creditLimit) {
    if (!creditLimit) return null;
    return (balance / creditLimit) * 100;
  }

  /** Días entre dos fechas (a - b) en días enteros. */
  function daysBetween(a, b) {
    var ms = (new Date(a)).setHours(0, 0, 0, 0) - (new Date(b)).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  }

  var api = {
    simulateSnowball: simulateSnowball,
    sustainableExtra: sustainableExtra,
    viaticoInterest: viaticoInterest,
    utilization: utilization,
    daysBetween: daysBetween,
    etiquetaMes: etiquetaMes
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Finance = api;
})(typeof window !== 'undefined' ? window : globalThis);
