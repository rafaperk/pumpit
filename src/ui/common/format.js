// Number formatting in the number locale of the current language, parsing of typed numbers, unit labels and
// default output units.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units;
  const i18n = PumpIt.i18n;

  // number locale of the current language and its decimal separator
  const locale = () => i18n.numberLocale();
  const sepCache = { locale: null, sep: ',' };
  function decimalSep() {
    const loc = locale();
    if (sepCache.locale !== loc) { sepCache.locale = loc; sepCache.sep = (1.5).toLocaleString(loc).charAt(1); }
    return sepCache.sep;
  }

  function fmt(v, sig = 4) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e7 || a < 1e-4) return v.toExponential(sig - 1).replace('.', decimalSep()).replace('e+', 'e').replace(/-/g, '−');
    const dec = Math.max(0, Math.min(6, sig - 1 - Math.floor(Math.log10(a))));
    return v.toLocaleString(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace('-', '−');
  }

  // number with a fixed count of decimals (grouped digits, local decimal separator)
  const fixed = (v, d) => v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');

  // value of an input field: shown as typed, with the local decimal separator
  const inputStr = (v) => (v === null || v === undefined || Number.isNaN(v) ? '' : String(v).replace('.', decimalSep()));
  function parseNum(s) {
    const t = String(s).trim().replace(/\s/g, '').replace('−', '-');
    if (t === '') return NaN;
    // accepts "1,5", "1.5", "1.234,5" and "1,234.5": with both separators, the last one is the decimal one
    let norm;
    if (t.includes(',') && t.includes('.')) norm = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else norm = t.replace(',', '.');
    const n = Number(norm);
    return Number.isFinite(n) ? n : NaN;
  }

  // text shown for a unit (some symbols change with the language)
  const unit = (u) => U.label(u);

  const DEFAULT_OUT = {
    pressure: 'kgf/cm²(g)', dp: 'kgf/cm²', head: 'm', massFlow: 'kg/s', volFlow: 'm³/h', normFlow: 'Nm³/h', velocity: 'm/s',
    power: 'kW', length: 'm', density: 'kg/m³', viscosity: 'cP', temperature: '°C',
    volume: 'm³', headGradient: 'm/100 m', dpGradient: 'kgf/cm²/100 m',
    energy: 'kWh', mass: 'kg', time: 'h', flow: 'm³/h', area: 'cm²',
  };

  function conv(vSI, cat, unit, ctx) {
    if (!cat || !Number.isFinite(vSI)) return vSI;
    return U.fromSI(vSI, unit, cat, ctx);
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // <option> of a select; the value attribute is only needed when the text differs from it
  const option = (value, text, selected) => `<option${String(value) !== String(text) ? ` value="${esc(value)}"` : ''}${selected ? ' selected' : ''}>${esc(text)}</option>`;

  PumpIt.ui.format = { fmt, fixed, inputStr, parseNum, unit, option, locale, decimalSep, DEFAULT_OUT, conv, esc };
})(typeof window !== 'undefined' ? window : globalThis);
