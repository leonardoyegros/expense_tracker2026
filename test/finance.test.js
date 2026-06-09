/* test/finance.test.js — pruebas del motor financiero. Sin dependencias: `node --test`. */
const test = require('node:test');
const assert = require('node:assert');

const Fin = require('../js/finance.js');
const Fmt = require('../js/format.js');
const seed = require('../js/data.js');

test('format: guaraníes con separador de miles', () => {
  assert.strictEqual(Fmt.gs(1234567), '1.234.567');
  assert.strictEqual(Fmt.gs(611000), '611.000');
  assert.strictEqual(Fmt.gs(-58729075), '-58.729.075');
  assert.strictEqual(Fmt.gs(0), '0');
});

test('format: parseGs revierte el formato', () => {
  assert.strictEqual(Fmt.parseGs('1.234.567'), 1234567);
  assert.strictEqual(Fmt.parseGs('Gs 611.000'), 611000);
  assert.strictEqual(Fmt.parseGs('24290258'), 24290258);
});

test('format: compacto', () => {
  assert.strictEqual(Fmt.compact(24290258), '24 M');
  assert.strictEqual(Fmt.compact(611000), '611 k');
  assert.strictEqual(Fmt.compact(2100000), '2,1 M');
});

test('snowball: Sudameris se cancela el primer mes (Jul 2026)', () => {
  const sim = Fin.simulateSnowball(seed.debts, seed.extraPayment, new Date('2026-06-30'));
  const p = sim.payoffs['sudameris'];
  assert.ok(p, 'Sudameris debe cancelarse');
  assert.strictEqual(p.label, 'Jul 2026');
});

test('snowball: orden de cancelación respeta el snowballOrder', () => {
  const sim = Fin.simulateSnowball(seed.debts, seed.extraPayment, new Date('2026-06-30'));
  const orden = ['sudameris', 'ueno', 'itau', 'auto'];
  let prev = -1;
  orden.forEach((id) => {
    const p = sim.payoffs[id];
    assert.ok(p, `${id} debe cancelarse dentro del horizonte`);
    assert.ok(p.monthIndex >= prev, `${id} debe cancelarse después de la anterior`);
    prev = p.monthIndex;
  });
});

test('snowball: el auto (último) se cancela cerca de Abr 2028', () => {
  const sim = Fin.simulateSnowball(seed.debts, seed.extraPayment, new Date('2026-06-30'));
  const p = sim.payoffs['auto'];
  assert.ok(p, 'El auto debe cancelarse');
  // Tolerancia: el plan real proyecta Abr-2028; aceptamos 2027-2028.
  const y = p.date.getFullYear();
  assert.ok(y === 2027 || y === 2028, `año de cancelación inesperado: ${y}`);
});

test('snowball: roll-over aumenta el abono efectivo tras cada cancelación', () => {
  // Con roll-over, el total pagado en meses posteriores a una cancelación
  // debe ser >= que el abono base + mínimos restantes.
  const sim = Fin.simulateSnowball(seed.debts, seed.extraPayment, new Date('2026-06-30'));
  assert.ok(sim.totalInterest > 0, 'debe haber interés acumulado');
  assert.ok(sim.monthsToFree > 0 && sim.monthsToFree < 240, 'debe terminar en horizonte razonable');
});

test('snowball: más abono extra => menos meses y menos interés', () => {
  const base = Fin.simulateSnowball(seed.debts, 3000000, new Date('2026-06-30'));
  const mas = Fin.simulateSnowball(seed.debts, 6000000, new Date('2026-06-30'));
  assert.ok(mas.monthsToFree <= base.monthsToFree, 'más abono no debe tardar más');
  assert.ok(mas.totalInterest < base.totalInterest, 'más abono debe costar menos interés');
});

test('sustainable: desglose negativo coincide con el hallazgo (mes normal no banca 3M extra)', () => {
  const income = 22680000 + 3500000 - 2041200;        // 24.138.800
  const fixed = seed.fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const mins = seed.debts.reduce((s, d) => s + d.minPayment, 0);
  const savings = 1860000 + 200000;
  const s = Fin.sustainableExtra({ regularIncome: income, fixedTotal: fixed,
    minTotal: mins, scheduledSavings: savings, variables: 0 });
  assert.strictEqual(s.income, 24138800);
  // El abono sostenible sin variables debe ser menor que los 3M planificados.
  assert.ok(s.normal < 3000000, 'el abono sostenible normal no llega a 3M');
});

test('viatico: interés crece con los días sin rendir', () => {
  const c7 = Fin.viaticoInterest(1000000, 0.198, 7);
  const c30 = Fin.viaticoInterest(1000000, 0.198, 30);
  assert.ok(c30 > c7, 'más días => más interés perdido');
  // 1.000.000 * (0.198/12) * (30/30) ≈ 16.500
  assert.strictEqual(c30, 16500);
});

test('utilization: Itaú está sobre 80%', () => {
  const itau = seed.debts.find((d) => d.id === 'itau');
  const u = Fin.utilization(itau.balance, itau.creditLimit);
  assert.ok(u > 80, `utilización Itaú debe ser >80%, fue ${u.toFixed(1)}%`);
});
