/* app.js — interfaz (SPA por pestañas). Depende de: Fmt, Finance, Store, SeedData. */
(function () {
  'use strict';

  var F = window.Fmt, Fin = window.Finance, S = window.Store;

  var TABS = [
    { id: 'hoy', label: 'Hoy', icon: '✏️' },
    { id: 'deudas', label: 'Deudas', icon: '💳' },
    { id: 'plan', label: 'Plan', icon: '⛄' },
    { id: 'viaticos', label: 'Viáticos', icon: '🧾' },
    { id: 'resumen', label: 'Mes', icon: '📊' },
    { id: 'revision', label: 'Revisión', icon: '✅' },
    { id: 'tareas', label: 'Tareas', icon: '📌' }
  ];

  var current = 'hoy';
  var app = document.getElementById('app');

  function hoyISO() { return new Date().toISOString().slice(0, 10); }
  function mesActual() { return F.claveMes(new Date()); }

  /** Ciclos de las tarjetas activas con fechas próximas, orden por vencimiento. */
  function cardCycles() {
    return S.activeDebts()
      .filter(function (d) { return d.kind === 'credit_card'; })
      .map(function (d) {
        return { debt: d, cycle: Fin.nextCardDates(new Date(), d.closeDay, d.dueDay) };
      })
      .sort(function (a, b) {
        var x = a.cycle ? a.cycle.daysToDue : 9999;
        var y = b.cycle ? b.cycle.daysToDue : 9999;
        return x - y;
      });
  }

  /** Banner de vencimientos dentro de los próximos 5 días. */
  function dueBanner() {
    var urgentes = cardCycles().filter(function (c) { return c.cycle && c.cycle.daysToDue <= 5; });
    if (!urgentes.length) return '';
    return urgentes.map(function (c) {
      var stmt = S.pendingStatement(c.debt.id);
      var monto = stmt ? ' · ' + F.pyg(stmt.totalDue) : '';
      var dias = c.cycle.daysToDue === 0 ? '¡HOY!' : 'en ' + c.cycle.daysToDue + ' día' + (c.cycle.daysToDue > 1 ? 's' : '');
      return '<div class="alert danger-glow">💳 <b>' + esc(c.debt.name) + '</b> vence el ' +
        F.fecha(c.cycle.due) + ' (' + dias + ')' + monto + '</div>';
    }).join('');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ============================================================ NAV + RENDER
  function render() {
    var nav = TABS.map(function (t) {
      return '<button class="nav-btn' + (t.id === current ? ' active' : '') +
        '" data-tab="' + t.id + '"><span class="nav-icon">' + t.icon +
        '</span><span class="nav-label">' + t.label + '</span></button>';
    }).join('');

    var view = ({
      hoy: viewHoy, deudas: viewDeudas, plan: viewPlan, viaticos: viewViaticos,
      resumen: viewResumen, revision: viewRevision, tareas: viewTareas
    }[current])();

    app.innerHTML =
      '<header class="topbar"><h1>Finanzas · Leo</h1>' +
      '<span class="topbar-date">' + F.fechaLarga(new Date()) + '</span></header>' +
      '<main class="content">' + view + '</main>' +
      '<nav class="bottomnav">' + nav + '</nav>';

    bindCommon();
    ({ hoy: bindHoy, deudas: bindDeudas, plan: bindPlan, viaticos: bindViaticos,
      resumen: function () {}, revision: bindRevision, tareas: bindTareas }[current])();
  }

  function bindCommon() {
    [].forEach.call(app.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () { current = b.dataset.tab; render(); });
    });
  }

  // ============================================================ HOY (registro)
  function viewHoy() {
    var cats = S.state.categories.filter(function (c) {
      return c.type === 'variable' || c.type === 'viatico' || c.type === 'carga_financiera';
    });
    var hoy = hoyISO();
    var txHoy = S.state.transactions.filter(function (t) { return t.date === hoy; });
    var gastadoHoy = txHoy.reduce(function (s, t) { return s + (t.amount > 0 ? t.amount : 0); }, 0);
    var variablesMes = S.variablesForMonth(mesActual());

    var optCats = cats.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
    }).join('');
    var optDebts = S.activeDebts().map(function (d) {
      return '<option value="' + d.id + '">' + esc(d.name) + '</option>';
    }).join('');

    return dueBanner() +
      '<section class="card stat-row">' +
        '<div class="stat"><div class="stat-num">' + F.gs(gastadoHoy) + '</div><div class="stat-lbl">gastado hoy</div></div>' +
        '<div class="stat"><div class="stat-num">' + F.gs(variablesMes) + '</div><div class="stat-lbl">variables del mes</div></div>' +
      '</section>' +

      '<form id="tx-form" class="card">' +
        '<h2>Registrar gasto <span class="hint">≤30 s</span></h2>' +
        '<label>Monto (Gs)<input type="text" inputmode="numeric" id="tx-amount" placeholder="120.000" autocomplete="off"></label>' +
        '<label>Categoría<select id="tx-cat">' + optCats + '</select></label>' +
        '<div class="seg" id="tx-method">' +
          '<button type="button" class="seg-btn active" data-m="card">Tarjeta</button>' +
          '<button type="button" class="seg-btn" data-m="cash">Efectivo</button>' +
          '<button type="button" class="seg-btn" data-m="debit">Débito</button>' +
        '</div>' +
        '<label id="tx-debt-wrap">Tarjeta<select id="tx-debt">' + optDebts + '</select></label>' +
        '<label class="check"><input type="checkbox" id="tx-viatico"> Es viático (reembolsable)</label>' +
        '<div id="tx-photo-wrap" class="hidden">' +
          '<label>Foto del comprobante <span class="hint">requerida para viáticos</span>' +
          '<input type="file" accept="image/*" id="tx-photo"></label>' +
          '<div id="tx-photo-prev"></div>' +
        '</div>' +
        '<label>Nota<input type="text" id="tx-note" placeholder="opcional / o solo estado emocional"></label>' +
        '<div id="tx-alert"></div>' +
        '<button type="submit" class="btn-primary">Guardar</button>' +
      '</form>' +

      '<section class="card">' +
        '<h2>Hoy</h2>' +
        (txHoy.length ? txHoy.map(txRow).join('') : '<p class="empty">Sin movimientos todavía. Registrá el primero arriba.</p>') +
      '</section>';
  }

  function txRow(t) {
    var cat = S.state.categories.find(function (c) { return c.id === t.category; });
    var via = t.isViatico ? '<span class="tag tag-viatico">viático</span>' : '';
    return '<div class="row">' +
      '<div class="row-main"><strong>' + F.gs(t.amount) + '</strong> ' + via +
      '<div class="row-sub">' + esc(cat ? cat.name : t.category) + ' · ' + esc(t.paymentMethod) +
      (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
      '<button class="link-del" data-del="' + t.id + '">✕</button></div>';
  }

  function bindHoy() {
    var form = document.getElementById('tx-form');
    var method = 'card';
    var photoData = null;

    [].forEach.call(form.querySelectorAll('#tx-method .seg-btn'), function (b) {
      b.addEventListener('click', function () {
        method = b.dataset.m;
        [].forEach.call(form.querySelectorAll('.seg-btn'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        document.getElementById('tx-debt-wrap').style.display = (method === 'card') ? '' : 'none';
        checkAlert();
      });
    });

    var viaticoCb = document.getElementById('tx-viatico');
    var photoWrap = document.getElementById('tx-photo-wrap');
    viaticoCb.addEventListener('change', function () {
      photoWrap.classList.toggle('hidden', !viaticoCb.checked);
    });
    document.getElementById('tx-cat').addEventListener('change', function (e) {
      if (e.target.value === 'viatico') { viaticoCb.checked = true; photoWrap.classList.remove('hidden'); }
    });

    document.getElementById('tx-photo').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        photoData = reader.result;
        document.getElementById('tx-photo-prev').innerHTML = '<img src="' + photoData + '" class="thumb">';
      };
      reader.readAsDataURL(f);
    });

    function checkAlert() {
      var box = document.getElementById('tx-alert');
      // Regla de oro: usar tarjeta solo si hay efectivo de respaldo en cuenta.
      var cajaTotal = S.state.accounts
        .filter(function (a) { return a.type === 'savings'; })
        .reduce(function (s, a) { return s + a.balance; }, 0);
      var amount = F.parseGs(document.getElementById('tx-amount').value);
      if (method === 'card' && !document.getElementById('tx-viatico').checked && amount > cajaTotal) {
        box.innerHTML = '<div class="alert warn">⚠️ Regla de oro: no hay efectivo de respaldo suficiente (' +
          F.pyg(cajaTotal) + ') para cubrir esta compra con tarjeta.</div>';
      } else { box.innerHTML = ''; }
    }
    document.getElementById('tx-amount').addEventListener('input', checkAlert);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = F.parseGs(document.getElementById('tx-amount').value);
      if (amount <= 0) { alert('Ingresá un monto válido.'); return; }
      var cat = document.getElementById('tx-cat').value;
      var isViatico = document.getElementById('tx-viatico').checked || cat === 'viatico';
      if (isViatico && !photoData) {
        if (!confirm('Viático sin foto del comprobante. ¿Guardar como "pendiente de foto"?')) return;
      }
      S.addTransaction({
        date: hoyISO(), amount: amount, category: cat, paymentMethod: method,
        debtId: method === 'card' ? document.getElementById('tx-debt').value : null,
        isViatico: isViatico, receiptPhotoUrl: photoData,
        note: document.getElementById('tx-note').value.trim()
      });
      render();
    });

    [].forEach.call(app.querySelectorAll('[data-del]'), function (b) {
      b.addEventListener('click', function () {
        if (confirm('¿Borrar este movimiento?')) { S.deleteTransaction(b.dataset.del); render(); }
      });
    });
  }

  // ============================================================ DEUDAS
  function viewDeudas() {
    var debts = S.debtsByOrder();
    var totalDeuda = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var totalMin = S.minTotal();

    var cards = debts.map(function (d) {
      var util = Fin.utilization(d.balance, d.creditLimit);
      var utilHtml = '';
      if (util != null) {
        var cls = util > 80 ? 'danger' : (util > 50 ? 'warn' : 'ok');
        utilHtml = '<div class="util"><div class="util-bar"><span class="util-fill ' + cls +
          '" style="width:' + Math.min(100, util).toFixed(0) + '%"></span></div>' +
          '<div class="util-lbl">Utilización ' + util.toFixed(0) + '%' +
          (util > 80 ? ' · ⚠️ alta' : '') + ' · disponible ' +
          F.gs(Math.max(0, d.creditLimit - d.balance)) + '</div></div>';
      }
      var payoff = d.balance <= 0 ? '<span class="tag tag-ok">cancelada</span>' :
        '<span class="hint">proyec. ' + esc(d.projectedPayoffDate || '—') + '</span>';
      var upd = d.needsBalanceUpdate ? '<span class="tag tag-warn">saldo a actualizar</span>' : '';
      var liquidar = (d.id === 'sudameris' && d.balance > 0) ?
        '<button class="btn-small" data-liquidar="' + d.id + '">Liquidar y retirar</button>' : '';

      // Ciclo de tarjeta: cierre / vencimiento / extracto
      var cycleHtml = '';
      var cycleBtns = '';
      if (d.kind === 'credit_card' && d.balance > 0) {
        var cyc = Fin.nextCardDates(new Date(), d.closeDay, d.dueDay);
        if (cyc) {
          var dueCls = cyc.daysToDue <= 5 ? 'chip-danger' : (cyc.daysToDue <= 10 ? 'chip-warn' : '');
          var stmt = S.pendingStatement(d.id);
          cycleHtml = '<div class="cycle-row">' +
            '<span class="chip">🔒 cierra ' + F.fecha(cyc.close) + ' <b>· ' + cyc.daysToClose + 'd</b></span>' +
            '<span class="chip ' + dueCls + '">⏰ vence ' + F.fecha(cyc.due) + ' <b>· ' + cyc.daysToDue + 'd</b></span>' +
            (stmt ? '<span class="chip chip-cyan">🧾 a pagar ' + F.gs(stmt.totalDue) + '</span>' : '') +
            '</div>';
          cycleBtns = '<button class="btn-small" data-stmt="' + d.id + '">Registrar extracto</button>' +
            '<button class="btn-small" data-cycle="' + d.id + '">Editar ciclo</button>';
        } else {
          cycleBtns = '<button class="btn-small glow" data-cycle="' + d.id + '">Configurar ciclo ⚡</button>';
        }
      }

      return '<div class="card debt' + (d.balance <= 0 ? ' paid' : '') + '">' +
        '<div class="debt-head"><div><strong>#' + d.snowballOrder + ' ' + esc(d.name) + '</strong> ' + upd +
        '<div class="row-sub">' + (d.kind === 'loan' ? 'Préstamo' : 'Tarjeta') + ' · TAN ' +
        (d.rateTAN * 100).toFixed(2).replace('.', ',') + '%</div></div>' +
        '<div class="debt-bal">' + F.gs(d.balance) + '</div></div>' +
        utilHtml + cycleHtml +
        '<div class="debt-foot"><span>mín. ' + F.gs(d.minPayment) + '</span>' + payoff + '</div>' +
        '<div class="debt-actions"><button class="btn-small" data-edit="' + d.id + '">Actualizar saldo</button>' +
        cycleBtns + liquidar + '</div>' +
        '</div>';
    }).join('');

    // Próximos vencimientos (resumen ordenado)
    var proximos = cardCycles().filter(function (c) { return c.cycle; });
    var proximosHtml = proximos.length ?
      '<section class="card"><h2>Próximos vencimientos</h2>' +
      proximos.map(function (c) {
        var dias = c.cycle.daysToDue;
        var cls = dias <= 5 ? 'danger' : (dias <= 10 ? 'warn' : 'ok');
        var stmt = S.pendingStatement(c.debt.id);
        return '<div class="row"><div class="row-main"><strong>' + esc(c.debt.name) + '</strong>' +
          '<div class="row-sub">vence ' + F.fecha(c.cycle.due) +
          (stmt ? ' · ' + F.pyg(stmt.totalDue) : ' · extracto sin registrar') + '</div></div>' +
          '<span class="due-count ' + cls + '">' + dias + 'd</span></div>';
      }).join('') + '</section>' : '';

    return dueBanner() +
      '<section class="card stat-row">' +
        '<div class="stat"><div class="stat-num">' + F.compact(totalDeuda) + '</div><div class="stat-lbl">deuda total</div></div>' +
        '<div class="stat"><div class="stat-num">' + F.gs(totalMin) + '</div><div class="stat-lbl">mínimos / mes</div></div>' +
      '</section>' + proximosHtml + cards;
  }

  function bindDeudas() {
    [].forEach.call(app.querySelectorAll('[data-edit]'), function (b) {
      b.addEventListener('click', function () {
        var d = S.state.debts.find(function (x) { return x.id === b.dataset.edit; });
        var nuevo = prompt('Saldo actual de ' + d.name + ' (Gs):', d.balance);
        if (nuevo == null) return;
        var min = prompt('Pago mínimo (Gs):', d.minPayment);
        S.updateDebtBalance(d.id, F.parseGs(nuevo), min == null ? null : F.parseGs(min));
        render();
      });
    });
    [].forEach.call(app.querySelectorAll('[data-liquidar]'), function (b) {
      b.addEventListener('click', function () {
        if (confirm('¿Marcar Sudameris como liquidada (saldo 0) y retirarla de circulación?')) {
          S.updateDebtBalance(b.dataset.liquidar, 0, 0);
          var t = S.state.tasks.find(function (x) { return x.id === 't5'; });
          if (t) t.done = true; S.save();
          render();
        }
      });
    });
    [].forEach.call(app.querySelectorAll('[data-cycle]'), function (b) {
      b.addEventListener('click', function () {
        var d = S.state.debts.find(function (x) { return x.id === b.dataset.cycle; });
        var cd = prompt('Día de CIERRE del extracto de ' + d.name + ' (1-28):', d.closeDay || '');
        if (cd == null) return;
        var dd = prompt('Día de VENCIMIENTO (del mes siguiente al cierre, 1-28):', d.dueDay || '');
        if (dd == null) return;
        var ci = parseInt(cd, 10), di = parseInt(dd, 10);
        if (!(ci >= 1 && ci <= 28) || !(di >= 1 && di <= 28)) { alert('Días inválidos (1-28).'); return; }
        S.updateDebtCycle(d.id, ci, di);
        render();
      });
    });
    [].forEach.call(app.querySelectorAll('[data-stmt]'), function (b) {
      b.addEventListener('click', function () {
        var d = S.state.debts.find(function (x) { return x.id === b.dataset.stmt; });
        var cyc = Fin.nextCardDates(new Date(), d.closeDay, d.dueDay);
        var total = prompt('Total a pagar del extracto de ' + d.name +
          ' (vence ' + F.fecha(cyc.due) + ') en Gs:');
        if (total == null) return;
        S.addCardStatement({
          debtId: d.id,
          closeDate: cyc.close.toISOString().slice(0, 10),
          dueDate: cyc.due.toISOString().slice(0, 10),
          totalDue: F.parseGs(total)
        });
        render();
      });
    });
  }

  // ============================================================ PLAN (bola de nieve)
  function viewPlan() {
    var debts = S.activeDebts();
    var extra = S.state.extraPayment;
    var start = new Date(S.state.planStart);
    var sim = Fin.simulateSnowball(debts, extra, start);

    var sust = Fin.sustainableExtra({
      regularIncome: S.regularIncome(), fixedTotal: S.fixedTotal(),
      minTotal: S.minTotal(), scheduledSavings: S.scheduledSavingsTotal(),
      variables: S.variablesForMonth(mesActual())
    });

    var insostenible = extra > sust.normal;
    var rollover = rolloverNarrative(debts, extra);

    var payoffRows = debts.map(function (d) {
      var p = sim.payoffs[d.id];
      return '<tr><td>#' + d.snowballOrder + ' ' + esc(d.name) + '</td><td>' + F.gs(d.balance) +
        '</td><td>' + (p ? p.label : '—') + '</td></tr>';
    }).join('');

    // Tabla mensual compacta (saldo restante por deuda)
    var headCells = debts.map(function (d) { return '<th>' + esc(d.name.split(' ')[0]) + '</th>'; }).join('');
    var monthRows = sim.months.map(function (m) {
      var cells = debts.map(function (d) {
        var v = m.perDebt[d.id];
        return '<td>' + (v > 0 ? F.compact(v) : '<span class="ok">0</span>') + '</td>';
      }).join('');
      return '<tr><td>' + m.label + '</td>' + cells + '<td>' + F.compact(m.remaining) + '</td></tr>';
    }).join('');

    return '' +
      '<section class="card">' +
        '<h2>Abono extra mensual</h2>' +
        '<div class="extra-row"><input type="text" inputmode="numeric" id="extra-input" value="' + F.gs(extra) + '">' +
        '<button class="btn-small" id="extra-save">Aplicar</button></div>' +
        '<div class="alert ' + (insostenible ? 'warn' : 'ok-soft') + '">' +
          (insostenible
            ? '⚠️ ' + F.pyg(extra) + ' supera el abono <b>sostenible</b> de un mes normal (' +
              F.pyg(sust.normal) + '). Sólo es viable en meses con bono. <a href="#" id="goto-resumen">Ver desglose →</a>'
            : '✅ Dentro del abono sostenible (' + F.pyg(sust.normal) + ').') +
        '</div>' +
      '</section>' +

      '<section class="card highlight">' +
        '<h2>Proyección · Bola de Nieve</h2>' +
        '<div class="stat-row">' +
          '<div class="stat"><div class="stat-num">' + sim.monthsToFree + '</div><div class="stat-lbl">meses a libre de deuda</div></div>' +
          '<div class="stat"><div class="stat-num">' + F.compact(sim.totalInterest) + '</div><div class="stat-lbl">interés total proyectado</div></div>' +
        '</div>' +
        '<table class="tbl"><thead><tr><th>Deuda</th><th>Saldo</th><th>Cancela</th></tr></thead><tbody>' +
        payoffRows + '</tbody></table>' +
        '<p class="note">' + rollover + '</p>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Mes a mes <span class="hint">saldo restante</span></h2>' +
        '<div class="tbl-scroll"><table class="tbl small"><thead><tr><th>Mes</th>' + headCells +
        '<th>Total</th></tr></thead><tbody>' + monthRows + '</tbody></table></div>' +
      '</section>';
  }

  function rolloverNarrative(debts, extra) {
    var parts = ['El abono arranca en ' + F.pyg(extra)];
    var acc = extra;
    debts.forEach(function (d) {
      acc += d.minPayment;
      parts.push('al cancelar ' + d.name.split(' ').slice(-1)[0] + ' rueda a ' + F.pyg(acc));
    });
    parts.pop(); // la última deuda no tiene a quién rodar
    return 'Roll-over automático: ' + parts.join(' → ') + '. ' +
      'El auto (7%) queda último a propósito: no conviene acelerarlo mientras haya tarjetas al ~19,8%.';
  }

  function bindPlan() {
    var save = document.getElementById('extra-save');
    if (save) save.addEventListener('click', function () {
      S.setExtraPayment(F.parseGs(document.getElementById('extra-input').value));
      render();
    });
    var goto = document.getElementById('goto-resumen');
    if (goto) goto.addEventListener('click', function (e) { e.preventDefault(); current = 'resumen'; render(); });
  }

  // ============================================================ VIÁTICOS
  function viewViaticos() {
    var pend = S.state.viaticos.filter(function (v) { return v.status !== 'reembolsado'; });
    var itau = S.state.debts.find(function (d) { return d.id === 'itau'; });
    var tasa = itau ? itau.rateTAN : 0.198;

    if (!S.state.viaticos.length) {
      return '<section class="card"><h2>Viáticos</h2>' +
        '<p class="empty">No hay viáticos registrados. Marcá un gasto como "viático" en la pestaña Hoy ' +
        'y exigite la foto del comprobante en el momento.</p>' +
        '<p class="note">Recordá: rendir tarde = financiás a la empresa al ' +
        (tasa * 100).toFixed(1).replace('.', ',') + '%. El reembolso va directo a la tarjeta, no a caja de ahorro.</p></section>';
    }

    var rows = pend.map(function (v) {
      var dias = Fin.daysBetween(new Date(), v.date);
      var costo = Fin.viaticoInterest(v.amount, tasa, dias);
      var alerta = dias >= 7 ? '<span class="tag tag-warn">+7 días</span>' : '';
      var foto = v.receiptPhotoUrl ? '<img src="' + v.receiptPhotoUrl + '" class="thumb">' :
        '<span class="tag tag-danger">sin foto</span>';
      return '<div class="card viatico">' +
        '<div class="debt-head"><div><strong>' + F.gs(v.amount) + '</strong> ' + alerta +
        '<div class="row-sub">' + esc(estadoLabel(v.status)) + ' · ' + dias + ' días sin rendir · ' +
        (v.note ? esc(v.note) : 'sin nota') + '</div></div>' + foto + '</div>' +
        '<div class="row-sub">Interés perdido estimado: <b>' + F.gs(costo) + '</b></div>' +
        '<div class="debt-actions">' +
          (v.status !== 'rendido' ? '<button class="btn-small" data-rendir="' + v.id + '">Marcar rendido</button>' : '') +
          '<button class="btn-primary btn-small" data-reembolso="' + v.id + '">Reembolsado → tarjeta</button>' +
        '</div></div>';
    }).join('');

    var totalPend = pend.reduce(function (s, v) { return s + v.amount; }, 0);
    var totalCosto = pend.reduce(function (s, v) {
      return s + Fin.viaticoInterest(v.amount, tasa, Fin.daysBetween(new Date(), v.date)); }, 0);

    return '<section class="card stat-row">' +
        '<div class="stat"><div class="stat-num">' + F.gs(totalPend) + '</div><div class="stat-lbl">por rendir</div></div>' +
        '<div class="stat"><div class="stat-num">' + F.gs(totalCosto) + '</div><div class="stat-lbl">interés perdido</div></div>' +
      '</section>' + rows;
  }

  function estadoLabel(s) {
    return { pendiente_foto: 'pendiente de foto', por_rendir: 'por rendir',
      rendido: 'rendido (esperando reembolso)', reembolsado: 'reembolsado' }[s] || s;
  }

  function bindViaticos() {
    [].forEach.call(app.querySelectorAll('[data-rendir]'), function (b) {
      b.addEventListener('click', function () {
        S.updateViatico(b.dataset.rendir, { status: 'rendido', submittedAt: hoyISO() });
        render();
      });
    });
    [].forEach.call(app.querySelectorAll('[data-reembolso]'), function (b) {
      b.addEventListener('click', function () {
        if (confirm('Registrar reembolso. Destino sugerido: pago directo a la tarjeta (no a caja de ahorro). ¿Confirmar?')) {
          S.updateViatico(b.dataset.reembolso, { status: 'reembolsado', reimbursedAt: hoyISO() });
          render();
        }
      });
    });
  }

  // ============================================================ RESUMEN (mes)
  function viewResumen() {
    var mk = mesActual();
    var income = S.regularIncome();
    var fixed = S.fixedTotal();
    var mins = S.minTotal();
    var savings = S.scheduledSavingsTotal();
    var variables = S.variablesForMonth(mk);
    var sust = Fin.sustainableExtra({ regularIncome: income, fixedTotal: fixed,
      minTotal: mins, scheduledSavings: savings, variables: variables });

    // Variables por categoría con presupuesto
    var txMes = S.transactionsForMonth(mk);
    var catRows = S.state.categories.filter(function (c) { return c.type === 'variable'; }).map(function (c) {
      var gasto = txMes.filter(function (t) { return t.category === c.id && !t.isViatico; })
        .reduce(function (s, t) { return s + t.amount; }, 0);
      var pct = c.budgetMonthly ? Math.min(100, (gasto / c.budgetMonthly) * 100) : 0;
      var cls = pct > 100 ? 'danger' : (pct > 80 ? 'warn' : 'ok');
      return '<div class="cat-row"><div class="cat-lbl">' + esc(c.name) +
        '<span>' + F.gs(gasto) + (c.budgetMonthly ? ' / ' + F.gs(c.budgetMonthly) : '') + '</span></div>' +
        '<div class="util-bar"><span class="util-fill ' + cls + '" style="width:' + pct.toFixed(0) + '%"></span></div></div>';
    }).join('');

    var carga = S.state.categories.find(function (c) { return c.id === 'carga'; });
    var cargaMes = carga && carga.budgetMonthly ? carga.budgetMonthly : 0;

    var flujo = income - fixed - mins - savings - variables;

    return '' +
      '<section class="card highlight">' +
        '<h2>Abono sostenible <span class="hint">mes normal</span></h2>' +
        '<div class="big-num ' + (sust.normal < 0 ? 'neg' : '') + '">' + F.pyg(sust.normal) + '</div>' +
        '<table class="tbl breakdown">' +
          fila('Ingresos regulares', income, '+') +
          fila('Gastos fijos', -fixed) +
          fila('Pagos mínimos de deuda', -mins) +
          fila('Ahorro programado (débito)', -savings) +
          fila('Variables del mes (real)', -variables) +
          '<tr class="total"><td>= Abono sostenible</td><td>' + F.gs(sust.normal) + '</td></tr>' +
        '</table>' +
        '<p class="note">Con bono del mes se suma el extraordinario. Hallazgo central: el abono de ' +
        F.pyg(S.state.extraPayment) + ' sólo es sostenible en meses con bono.</p>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Variables del mes</h2>' +
        (catRows || '<p class="empty">Sin gastos variables cargados este mes.</p>') +
      '</section>' +

      '<section class="card">' +
        '<h2>Costo de deber <span class="hint">lo que cuesta deber</span></h2>' +
        '<div class="big-num neg">' + F.pyg(cargaMes) + ' / mes</div>' +
        '<p class="note">≈ ' + F.pyg(cargaMes * 12) + ' al año en interés + seguros + cuotas. ' +
        'Esto desaparece a medida que se cancelan las tarjetas.</p>' +
      '</section>' +

      '<section class="card">' +
        '<h2>Flujo del mes</h2>' +
        '<div class="big-num ' + (flujo < 0 ? 'neg' : '') + '">' + F.pyg(flujo) + '</div>' +
        '<p class="note">Ingresos − fijos − mínimos − ahorro − variables. Negativo = el mes no se banca solo.</p>' +
      '</section>';
  }

  function fila(label, val, sign) {
    var v = sign === '+' ? '+' + F.gs(val) : F.gs(val);
    return '<tr><td>' + esc(label) + '</td><td>' + v + '</td></tr>';
  }

  // ============================================================ REVISIÓN semanal
  function viewRevision() {
    var revs = S.state.weeklyReviews;
    var ultimas = revs.slice(0, 6).map(function (r) {
      return '<div class="row"><div class="row-main"><strong>' + F.fecha(r.date) + '</strong>' +
        (r.stressMode ? ' <span class="tag tag-warn">modo estrés</span>' : '') +
        '<div class="row-sub">' + (r.emotionalState ? '😶 ' + esc(r.emotionalState) + ' · ' : '') +
        (r.completed ? 'completada' : 'parcial') + (r.notes ? ' · ' + esc(r.notes) : '') + '</div></div></div>';
    }).join('');

    return '' +
      '<form id="rev-form" class="card">' +
        '<h2>Revisión semanal <span class="hint">viernes · 15 min</span></h2>' +
        '<p class="note">Rendir viáticos + actualizar saldos. ¿Día de estrés? Registrá solo tu estado y completá mañana.</p>' +
        '<label class="check"><input type="checkbox" id="rev-stress"> Modo estrés (solo estado emocional)</label>' +
        '<label>Estado emocional<input type="text" id="rev-emotion" placeholder="una palabra"></label>' +
        '<div id="rev-full">' +
          '<label class="check"><input type="checkbox" id="rev-viaticos"> Rendí los viáticos pendientes</label>' +
          '<label class="check"><input type="checkbox" id="rev-saldos"> Actualicé saldos de deudas</label>' +
          '<label>Notas<input type="text" id="rev-notes" placeholder="opcional"></label>' +
        '</div>' +
        '<button type="submit" class="btn-primary">Guardar revisión</button>' +
      '</form>' +
      '<section class="card"><h2>Historial</h2>' +
        (ultimas || '<p class="empty">Todavía no registraste revisiones.</p>') + '</section>';
  }

  function bindRevision() {
    var stress = document.getElementById('rev-stress');
    var full = document.getElementById('rev-full');
    stress.addEventListener('change', function () { full.classList.toggle('hidden', stress.checked); });
    document.getElementById('rev-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var sm = stress.checked;
      S.addWeeklyReview({
        date: hoyISO(), stressMode: sm,
        completed: sm ? false : (document.getElementById('rev-viaticos').checked &&
          document.getElementById('rev-saldos').checked),
        emotionalState: document.getElementById('rev-emotion').value.trim(),
        notes: sm ? '' : document.getElementById('rev-notes').value.trim()
      });
      render();
    });
  }

  // ============================================================ TAREAS + activos
  function viewTareas() {
    var tasks = S.state.tasks.map(function (t) {
      return '<label class="check task"><input type="checkbox" data-task="' + t.id + '"' +
        (t.done ? ' checked' : '') + '><span' + (t.done ? ' class="done"' : '') + '>' + esc(t.text) + '</span></label>';
    }).join('');

    var accounts = S.state.accounts.map(function (a) {
      var auto = a.monthlyAutoDebit ? ' <span class="hint">débito ' + F.gs(a.monthlyAutoDebit) + '/mes</span>' : '';
      return '<div class="row"><div class="row-main"><strong>' + F.gs(a.balance) + '</strong>' + auto +
        '<div class="row-sub">' + esc(a.name) + '</div></div></div>';
    }).join('');

    var prog = S.state.accounts.filter(function (a) { return a.type === 'scheduled_savings'; })
      .reduce(function (s, a) { return s + a.balance; }, 0);

    return '' +
      '<section class="card"><h2>Pendientes</h2>' + tasks + '</section>' +
      '<section class="card highlight"><h2>Decisión crítica: rescatar ahorro</h2>' +
        '<div class="big-num">' + F.pyg(prog) + '</div>' +
        '<p class="note">Rescatar el ahorro programado para matar UENO + Sudameris y bajar Itaú ahorraría ' +
        '≈ Gs 8,5 M/año en intereses. <b>Bloqueante:</b> confirmar la penalidad por cancelación anticipada.</p>' +
      '</section>' +
      '<section class="card"><h2>Cuentas / activos</h2>' + accounts + '</section>' +
      '<section class="card"><h2>Datos</h2>' +
        '<button class="btn-small" id="export-btn">Exportar (JSON)</button> ' +
        '<button class="btn-small danger-btn" id="reset-btn">Restaurar datos semilla</button>' +
        '<p class="note">Los datos viven en este dispositivo (localStorage). Exportá para respaldar o migrar.</p>' +
      '</section>';
  }

  function bindTareas() {
    [].forEach.call(app.querySelectorAll('[data-task]'), function (b) {
      b.addEventListener('change', function () { S.toggleTask(b.dataset.task); });
    });
    document.getElementById('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(S.state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'finanzas-leo-' + hoyISO() + '.json';
      a.click();
    });
    document.getElementById('reset-btn').addEventListener('click', function () {
      if (confirm('¿Restaurar datos semilla? Se perderá lo cargado en este dispositivo.')) {
        S.resetAll(); current = 'hoy'; render();
      }
    });
  }

  // ============================================================ INIT
  render();
})();
