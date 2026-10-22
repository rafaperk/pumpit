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

  // the highest point of a curve between its first and last points (of an efficiency curve: the best efficiency
  // point): the highest point given, for an interpolated curve; otherwise the best of 200 steps, refined by golden
  // section and then by Newton on the slope (a search by comparison stops at about √ε, where the curve is flat). A
  // curve that is highest at one of its ends has no peak in its range: { x: NaN, y: NaN }.
  function curveMax(c) {
    const none = { x: NaN, y: NaN };
    if (c.kind === 'xy') {
      let i = 0;
      for (let k = 1; k < c.y.length; k++) if (c.y[k] > c.y[i]) i = k;
      return i > 0 && i < c.y.length - 1 ? { x: c.x[i], y: c.y[i] } : none;
    }
    const a = c.xmin, n = 200, h = (c.xmax - c.xmin) / n;
    if (!(h > 0)) return none;
    let best = 0;
    for (let i = 1; i <= n; i++) if (polyval(c.a, a + i * h) > polyval(c.a, a + best * h)) best = i;
    if (best === 0 || best === n) return none;
    let lo = a + (best - 1) * h, hi = a + (best + 1) * h;
    const r = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 60; i++) {
      const x1 = hi - r * (hi - lo), x2 = lo + r * (hi - lo);
      if (polyval(c.a, x1) < polyval(c.a, x2)) lo = x1; else hi = x2;
    }
    let x = (lo + hi) / 2;
    const d1 = polyder(c.a), d2 = polyder(d1);
    for (let i = 0; i < 4; i++) {
      const s2 = polyval(d2, x), nx = x - polyval(d1, x) / s2;
      if (!(s2 < 0) || !(Math.abs(nx - x) <= 2 * h)) break;
      x = nx;
    }
    return { x, y: polyval(c.a, x) };
  }

  PumpIt.hyd = Object.assign(PumpIt.hyd || {}, { polyfit, polyval, polyder, interp, makeCurve, evalCurve, curveMax });
})(typeof window !== 'undefined' ? window : globalThis);
