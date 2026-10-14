// Formatação numérica (pt-BR), leitura de números digitados e unidades padrão de saída.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units;

  function fmt(v, sig = 4) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e7 || a < 1e-4) return v.toExponential(sig - 1).replace('.', ',').replace('e+', 'e').replace(/-/g, '−');
    const dec = Math.max(0, Math.min(6, sig - 1 - Math.floor(Math.log10(a))));
    return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace('-', '−');
  }

  // valor de campo de entrada: mostra como digitado, com vírgula decimal
  const inputStr = (v) => (v === null || v === undefined || Number.isNaN(v) ? '' : String(v).replace('.', ','));
  function parseNum(s) {
    const t = String(s).trim().replace(/\s/g, '').replace('−', '-');
    if (t === '') return NaN;
    // aceita "1,5", "1.5" e "1.234,5"
    const norm = /,\d*$/.test(t) && t.includes('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
    const n = Number(norm);
    return Number.isFinite(n) ? n : NaN;
  }

  const DEFAULT_OUT = {
    pressure: 'kgf/cm²(g)', dp: 'kgf/cm²', head: 'm', massFlow: 'kg/s', volFlow: 'm³/h', velocity: 'm/s',
    power: 'kW', length: 'm', density: 'kg/m³', viscosity: 'cP', temperature: '°C',
  };

  function conv(vSI, cat, unit, ctx) {
    if (!cat || !Number.isFinite(vSI)) return vSI;
    return U.fromSI(vSI, unit, cat, ctx);
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  HR.fmt = { fmt, inputStr, parseNum, DEFAULT_OUT, conv, esc };
})(typeof window !== 'undefined' ? window : globalThis);
