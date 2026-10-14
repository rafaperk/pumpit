// Correlações de atrito, perdas localizadas e ajuste de curvas (seções 3, 5 e 6 da especificação).
(function (root) {
  const HR = (root.HR = root.HR || {});

  // ---------- atrito ----------

  // Colebrook na forma original (constantes 1,14 e 9,35); retorna o f de Darcy
  function colebrook(Re, eD) {
    let x = 1.14 - 2 * Math.log10(eD + 9.35 / (Re * Math.sqrt(0.02))); // x = 1/√f, partindo de f = 0,02
    for (let i = 0; i < 60; i++) {
      const xn = 1.14 - 2 * Math.log10(eD + (9.35 * x) / Re);
      if (Math.abs(xn - x) < 1e-13 * xn) return 1 / (xn * xn);
      x = xn;
    }
    return 1 / (x * x);
  }

  // f de Darcy: 64/Re abaixo de Re_lam, Colebrook acima de Re_turb, interpolação linear entre f_lam(Re_lam) e f_turb(Re_turb)
  function frictionFactor(Re, eD, reLam = 2300, reTurb = 4000) {
    if (Re < reLam) return 64 / Re;
    if (Re > reTurb) return colebrook(Re, eD);
    const w = (Re - reLam) / (reTurb - reLam);
    return (1 - w) * (64 / reLam) + w * colebrook(reTurb, eD);
  }

  // limite totalmente turbulento (Re → ∞) do Colebrook original
  function fullyTurbulent(eD) {
    if (eD <= 0) return NaN;
    const x = 1.14 - 2 * Math.log10(eD);
    return 1 / (x * x);
  }

  // f_T de Crane para qualquer diâmetro interno: aço comercial limpo (ε = 0,0018 in), totalmente turbulento
  const EPS_CRANE = 0.0018 * 0.0254;
  const craneFT = (Dm) => fullyTurbulent(EPS_CRANE / Dm);

  // Hazen-Williams: V = k·C·Rh^0,63·S^0,54 (SI) → S (m/m). Expoentes da forma clássica; k = 0,848684 foi
  // calibrado contra resultados gravados de referência (inferido; a forma clássica 0,8492 fica ~0,1% abaixo na perda)
  const HW_K = 0.848684;
  function hazenWilliamsS(V, C, Dh) {
    const Rh = Dh / 4;
    return Math.pow(Math.abs(V) / (HW_K * C * Math.pow(Rh, 0.63)), 1 / 0.54);
  }

  // ---------- ajuste de curvas ----------

  // mínimos quadrados, ordem 0..4, com x escalado para condicionar bem a matriz normal
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
    // de volta para x sem escala: a_i = c_i / xs^i
    return c.map((ci, i) => ci / xs ** i);
  }

  function gaussSmall(A, m) {
    for (let col = 0; col < m; col++) {
      let piv = col;
      for (let r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      [A[col], A[piv]] = [A[piv], A[col]];
      const d = A[col][col];
      if (Math.abs(d) < 1e-300) throw new Error('Ajuste de curva mal condicionado: pontos insuficientes ou repetidos');
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

  // interpolação linear com extrapolação linear nas pontas
  function interp(xs, ys, x) {
    const n = xs.length;
    if (n === 1) return ys[0];
    let i = 1;
    while (i < n - 1 && x > xs[i]) i++;
    const w = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + w * (ys[i] - ys[i - 1]);
  }

  // curva genérica ajustada: { kind: 'poly', a } | { kind: 'xy', x, y }
  function makeCurve(x, y, fit) {
    const pts = x.map((xi, i) => [xi, y[i]]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((p, q) => p[0] - q[0]);
    const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
    if (!X.length) throw new Error('Curva sem pontos');
    if (fit === 'xy') return { kind: 'xy', x: X, y: Y, xmin: X[0], xmax: X[X.length - 1] };
    const a = polyfit(X, Y, Number(fit));
    return { kind: 'poly', a, xmin: X[0], xmax: X[X.length - 1] };
  }
  const evalCurve = (c, x) => (c.kind === 'xy' ? interp(c.x, c.y, x) : polyval(c.a, x));

  // ---------- perdas localizadas (K referido à área de montante) ----------

  // orifício (Idelchik): canto vivo ou arredondado (r = raio da borda, Do = diâmetro do orifício)
  function orificeK(Aup, Adown, Ao, kind, r, Do) {
    const ru = Ao / Aup, rd = Ao / Adown, s = (Aup / Ao) ** 2;
    if (kind === 'sharp') return s * (0.707 * (1 - ru) ** 0.375 + 1 - rd) ** 2;
    const Kp = 0.03 + 0.47 * 10 ** (-7.7 * (r / Do));
    if (Math.abs(Aup - Adown) < 1e-9 * Aup) return s * (1 - ru + Math.sqrt(Kp) * (1 - ru) ** 0.75) ** 2;
    return s * (Kp * (1 - ru) ** 0.75 + (1 - rd) ** 2 + 2 * (1 - rd) * Math.sqrt(Kp * (1 - ru) ** 0.375));
  }

  HR.hyd = {
    colebrook, frictionFactor, fullyTurbulent, craneFT, EPS_CRANE, hazenWilliamsS, HW_K,
    polyfit, polyval, polyder, interp, makeCurve, evalCurve,
    orificeK,
  };
})(typeof window !== 'undefined' ? window : globalThis);
