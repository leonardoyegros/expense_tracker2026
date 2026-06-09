/* format.js — formato de moneda y fechas para Paraguay (PYG).
 * Funciona como <script> clásico (window.Fmt) y como módulo CommonJS (tests Node).
 */
(function (root) {
  'use strict';

  var MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /** Formatea un entero de guaraníes con separador de miles "." -> 1.234.567 */
  function gs(n) {
    var neg = n < 0;
    var v = Math.round(Math.abs(Number(n) || 0));
    var s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + s;
  }

  /** Con prefijo "Gs " */
  function pyg(n) {
    return 'Gs ' + gs(n);
  }

  /** Versión compacta para tarjetas grandes: 24,3 M / 611 k */
  function compact(n) {
    var v = Number(n) || 0;
    var abs = Math.abs(v);
    var sign = v < 0 ? '-' : '';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace('.', ',') + ' M';
    if (abs >= 1e3) return sign + Math.round(abs / 1e3) + ' k';
    return sign + Math.round(abs);
  }

  /** "Jul 2026" desde un Date */
  function mesAnio(date) {
    return MESES[date.getMonth()] + ' ' + date.getFullYear();
  }

  /** "09/06/2026" */
  function fecha(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }

  /** "9 de junio de 2026" */
  function fechaLarga(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    return d.getDate() + ' de ' + MESES_LARGO[d.getMonth()] + ' de ' + d.getFullYear();
  }

  /** Parsea "1.234.567" o "1234567" -> 1234567 (entero) */
  function parseGs(str) {
    if (typeof str === 'number') return Math.round(str);
    if (!str) return 0;
    var clean = String(str).replace(/[^\d-]/g, '');
    return parseInt(clean, 10) || 0;
  }

  /** Clave YYYY-MM para agrupar por mes */
  function claveMes(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  var api = { gs: gs, pyg: pyg, compact: compact, mesAnio: mesAnio, fecha: fecha,
    fechaLarga: fechaLarga, parseGs: parseGs, claveMes: claveMes, MESES: MESES };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fmt = api;
})(typeof window !== 'undefined' ? window : globalThis);
