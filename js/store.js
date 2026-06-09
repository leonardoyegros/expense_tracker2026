/* store.js — estado de la app + persistencia en localStorage.
 * Carga la semilla la primera vez; luego trabaja sobre lo guardado.
 */
(function (root) {
  'use strict';

  var KEY = 'leo_finanzas_v1';

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  /** Completa campos que versiones anteriores del estado no tenían. */
  function migrate(st) {
    if (!st.cardCycles) st.cardCycles = [];
    st.debts.forEach(function (d) {
      if (d.kind === 'credit_card' && d.closeDay === undefined) {
        var seed = root.SeedData.debts.find(function (x) { return x.id === d.id; });
        d.closeDay = seed ? seed.closeDay : null;
        d.dueDay = seed ? seed.dueDay : null;
      }
    });
    return st;
  }

  function load() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return deepClone(root.SeedData);
  }

  var state = load();
  var listeners = [];

  function save() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* almacenamiento lleno o no disponible */ }
    listeners.forEach(function (fn) { fn(state); });
  }

  function subscribe(fn) { listeners.push(fn); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---- Mutaciones ----

  function addTransaction(tx) {
    tx.id = uid();
    tx.currency = 'PYG';
    if (!tx.date) tx.date = new Date().toISOString().slice(0, 10);
    state.transactions.unshift(tx);

    // Si es viático, crear su registro de seguimiento
    if (tx.isViatico) {
      state.viaticos.unshift({
        id: uid(),
        transactionId: tx.id,
        amount: tx.amount,
        date: tx.date,
        status: tx.receiptPhotoUrl ? 'por_rendir' : 'pendiente_foto',
        receiptPhotoUrl: tx.receiptPhotoUrl || null,
        submittedAt: null,
        reimbursedAt: null,
        note: tx.note || ''
      });
    }
    save();
    return tx;
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
    state.viaticos = state.viaticos.filter(function (v) { return v.transactionId !== id; });
    save();
  }

  function updateDebtBalance(id, balance, minPayment) {
    var d = state.debts.find(function (x) { return x.id === id; });
    if (d) {
      d.balance = balance;
      if (minPayment != null) d.minPayment = minPayment;
      if (id === 'itau') d.needsBalanceUpdate = false;
      save();
    }
  }

  function setExtraPayment(v) { state.extraPayment = v; save(); }

  function updateDebtCycle(id, closeDay, dueDay) {
    var d = state.debts.find(function (x) { return x.id === id; });
    if (d) { d.closeDay = closeDay; d.dueDay = dueDay; save(); }
  }

  /** Registra el extracto del ciclo vigente de una tarjeta. */
  function addCardStatement(stmt) {
    stmt.id = uid();
    // Un extracto por tarjeta y vencimiento: reemplaza si ya existía.
    state.cardCycles = state.cardCycles.filter(function (c) {
      return !(c.debtId === stmt.debtId && c.dueDate === stmt.dueDate);
    });
    state.cardCycles.unshift(stmt);
    save();
  }

  /** Extracto pendiente (vencimiento >= hoy) de una tarjeta, si hay. */
  function pendingStatement(debtId) {
    var today = new Date().toISOString().slice(0, 10);
    return state.cardCycles.find(function (c) {
      return c.debtId === debtId && c.dueDate >= today;
    }) || null;
  }

  function updateViatico(id, patch) {
    var v = state.viaticos.find(function (x) { return x.id === id; });
    if (v) { Object.assign(v, patch); save(); }
  }

  function toggleTask(id) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (t) { t.done = !t.done; save(); }
  }

  function addWeeklyReview(review) {
    review.id = uid();
    if (!review.date) review.date = new Date().toISOString().slice(0, 10);
    state.weeklyReviews.unshift(review);
    save();
  }

  function resetAll() {
    state = deepClone(root.SeedData);
    save();
  }

  // ---- Selectores ----

  function debtsByOrder() {
    return state.debts.slice().sort(function (a, b) { return a.snowballOrder - b.snowballOrder; });
  }

  function activeDebts() {
    return debtsByOrder().filter(function (d) { return d.balance > 0; });
  }

  function regularIncome() {
    return state.income
      .filter(function (i) { return i.recurrence === 'monthly'; })
      .reduce(function (s, i) { return s + i.amount; }, 0);
  }

  function fixedTotal() {
    return state.fixedExpenses.reduce(function (s, e) { return s + e.amount; }, 0);
  }

  function minTotal() {
    return activeDebts().reduce(function (s, d) { return s + d.minPayment; }, 0);
  }

  function scheduledSavingsTotal() {
    return state.accounts
      .filter(function (a) { return a.type === 'scheduled_savings'; })
      .reduce(function (s, a) { return s + (a.monthlyAutoDebit || 0); }, 0);
  }

  function transactionsForMonth(monthKey) {
    return state.transactions.filter(function (t) {
      return (t.date || '').slice(0, 7) === monthKey;
    });
  }

  function variablesForMonth(monthKey) {
    var cats = {};
    state.categories.forEach(function (c) { cats[c.id] = c; });
    return transactionsForMonth(monthKey)
      .filter(function (t) {
        var c = cats[t.category];
        return c && c.type === 'variable' && !t.isViatico;
      })
      .reduce(function (s, t) { return s + t.amount; }, 0);
  }

  var api = {
    get state() { return state; },
    save: save,
    subscribe: subscribe,
    uid: uid,
    addTransaction: addTransaction,
    deleteTransaction: deleteTransaction,
    updateDebtBalance: updateDebtBalance,
    setExtraPayment: setExtraPayment,
    updateDebtCycle: updateDebtCycle,
    addCardStatement: addCardStatement,
    pendingStatement: pendingStatement,
    updateViatico: updateViatico,
    toggleTask: toggleTask,
    addWeeklyReview: addWeeklyReview,
    resetAll: resetAll,
    debtsByOrder: debtsByOrder,
    activeDebts: activeDebts,
    regularIncome: regularIncome,
    fixedTotal: fixedTotal,
    minTotal: minTotal,
    scheduledSavingsTotal: scheduledSavingsTotal,
    transactionsForMonth: transactionsForMonth,
    variablesForMonth: variablesForMonth
  };

  root.Store = api;
})(typeof window !== 'undefined' ? window : globalThis);
