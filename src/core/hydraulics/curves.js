// Curve fitting for tabulated data (pump, efficiency, NPSHR and resistance curves). The solver always
// uses the fitted curve, never the raw points (specification section 3).
(function (root) {
  const PumpIt = root.PumpIt;

  // least squares, order 0..4, with x scaled to keep the normal matrix well conditioned
  function polyfit(x, y, order) {
    const n = x.length;
    const ord = Math.max(0, Math.min(order, n - 1, 4));
    const xs = Math.max(...x.map(Math.abs)) || 1;
    const m = ord + 1;
    const A = Array.from({ length: m }, () => new Float64Array(m + 1));
    for (let k = 0; k < n; k++) {
      const t = x[k] / xs;
      const pw = [1];
      for (let i = 1; i <= 2 * ord; i++) pw[i] = pw[i - 1] * t;
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) A[i][j] += pw[i + j];
        A[i][m] += pw[i] * y[k];
      }
    }
    const c = gaussSmall(A, m);
    // back to unscaled x: a_i = c_i / xs^i
    return c.map((ci, i) => ci / xs ** i);
  }

  function gaussSmall(A, m) {
    for (let col = 0; col < m; col++) {
      let piv = col;
      for (let r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      [A[col], A[piv]] = [A[piv], A[col]];
      const d = A[col][col];
      if (Math.abs(d) < 1e-300) throw new Error(PumpIt.i18n.t('core.curves.illConditioned'));
      for (let r = 0; r < m; r++) {
        if (r === col) continue;
        const fct = A[r][col] / d;
        for (let k = col; k <= m; k++) A[r][k] -= fct * A[col][k];
      }
    }
    return Array.from({ length: m }, (_, i) => A[i][m] / A[i][i]);
  }

  const polyval = (a, x) => { let s = 0; for (let i = a.length - 1; i >= 0; i--) s = s * x + a[i]; return s; };
  const polyder = (a) => a.slice(1).map((ai, i) => ai * (i + 1));

  // linear interpolation with linear extrapolation at both ends
  function interp(xs, ys, x) {
    const n = xs.length;
    if (n === 1) return ys[0];
    let i = 1;
    while (i < n - 1 && x > xs[i]) i++;
    const w = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + w * (ys[i] - ys[i - 1]);
  }

  // generic fitted curve: { kind: 'poly', a } | { kind: 'xy', x, y }
  function makeCurve(x, y, fit) {
    const pts = x.map((xi, i) => [xi, y[i]]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((p, q) => p[0] - q[0]);
    const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
    if (!X.length) throw new Error(PumpIt.i18n.t('core.curves.noPoints'));
    if (fit === 'xy') return { kind: 'xy', x: X, y: Y, xmin: X[0], xmax: X[X.length - 1] };
    const a = polyfit(X, Y, Number(fit));
    return { kind: 'poly', a, xmin: X[0], xmax: X[X.length - 1] };
  }
  const evalCurve = (c, x) => (c.kind === 'xy' ? interp(c.x, c.y, x) : polyval(c.a, x));

  PumpIt.hyd = Object.assign(PumpIt.hyd || {}, { polyfit, polyval, polyder, interp, makeCurve, evalCurve });
})(typeof window !== 'undefined' ? window : globalThis);
