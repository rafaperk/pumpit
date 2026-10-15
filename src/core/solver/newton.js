// Newton-Raphson on link mass flows and node stagnation pressures — the same system as the Todini & Pilati
// gradient method — solved by Gaussian elimination, with relaxation and a line search (adaptive relaxation).
//
// Link rows by mode:  loss   Pa − Pb + G − φ(m) = 0        closed     m = 0
//                     fixedFlow   m = value                 pDown/pUp  P(b|a) − ½ρV²(dynPipe) = value
//                     dP     Pa − Pb = value
// Node rows:          free   Σ inflows − Σ outflows − demand = 0
//                     fixed  P = value      fixedStatic  P − ½ρV²(pipe) = value
(function (root) {
  const PumpIt = root.PumpIt;
  const S = PumpIt.solver;
  const { dynOf, dynDer, describe } = S.util;
  const { t } = PumpIt.i18n;

  function newton(prep, guess, sc) {
    const { env } = prep;
    const rho = env.rho;
    const L = prep.links.filter((l) => !l.isolated);
    const N = prep.nodes.filter((n) => !n.isolated);
    const nL = L.length, nN = N.length, n = nL + nN;
    L.forEach((l, i) => { l.idx = i; });
    prep.links.filter((l) => l.isolated).forEach((l) => { l.idx = -1; });
    const nIx = new Int32Array(prep.nodes.length).fill(-1);
    N.forEach((nd, i) => { nIx[nd.ix] = nL + i; });
    const inL = N.map(() => []), outL = N.map(() => []);
    L.forEach((l, i) => {
      if (nIx[l.b] >= 0) inL[nIx[l.b] - nL].push(i);
      if (nIx[l.a] >= 0) outL[nIx[l.a] - nL].push(i);
    });

    // scales for the residual norm and the absolute criterion
    const Pscale = sc.Pscale, Mscale = sc.Mscale;
    const gmin = 1e-9 * Pscale / Mscale;

    // initial vector
    const x = new Float64Array(n);
    L.forEach((l, i) => { x[i] = guess.m.get(l) ?? 0; });
    N.forEach((nd, i) => { x[nL + i] = guess.P.get(nd) ?? sc.Pmean; });
    const rowScale = new Float64Array(n);

    function residual(xv, R, J) {
      R.fill(0);
      if (J) J.fill(0);
      for (let k = 0; k < nL; k++) {
        const l = L[k], m = xv[k];
        const ia = nIx[l.a], ib = nIx[l.b];
        const Pa = ia >= 0 ? xv[ia] : 0, Pb = ib >= 0 ? xv[ib] : 0;
        switch (l.mode) {
          case 'loss': {
            R[k] = Pa - Pb + l.G - l.phi(m);
            rowScale[k] = 1 / Pscale;
            if (J) {
              const h = 1e-6 * Math.max(Math.abs(m), l.mref);
              let d = (l.phi(m + h) - l.phi(m - h)) / (2 * h);
              if (!(d > gmin)) d = gmin;
              J[k * n + k] = -d;
              if (ia >= 0) J[k * n + ia] += 1;
              if (ib >= 0) J[k * n + ib] -= 1;
            }
            break;
          }
          case 'closed': R[k] = m; rowScale[k] = 1 / Mscale; if (J) J[k * n + k] = 1; break;
          case 'fixedFlow': R[k] = m - l.value; rowScale[k] = 1 / Mscale; if (J) J[k * n + k] = 1; break;
          case 'pDown': case 'pUp': {
            const iP = l.mode === 'pDown' ? ib : ia;
            const dp = l.dynPipe, dl = dp ? dp.link.idx : -1;
            const md = dl >= 0 ? xv[dl] : 0;
            R[k] = xv[iP] - (dp ? dynOf(dp, rho, md) : 0) - l.value;
            rowScale[k] = 1 / Pscale;
            if (J) { J[k * n + iP] = 1; if (dl >= 0) J[k * n + dl] -= dynDer(dp, rho, md); }
            break;
          }
          case 'dP': R[k] = Pa - Pb - l.value; rowScale[k] = 1 / Pscale; if (J) { J[k * n + ia] += 1; J[k * n + ib] -= 1; } break;
        }
      }
      for (let i = 0; i < nN; i++) {
        const nd = N[i], r = nL + i;
        if (nd.kind === 'free') {
          let s = -nd.demand;
          for (const k of inL[i]) { s += xv[k]; if (J) J[r * n + k] += 1; }
          for (const k of outL[i]) { s -= xv[k]; if (J) J[r * n + k] -= 1; }
          R[r] = s; rowScale[r] = 1 / Mscale;
        } else {
          let dyn = 0;
          if (nd.kind === 'fixedStatic') {
            const pk = inL[i].concat(outL[i])[0];
            if (pk !== undefined && L[pk].kind === 'pipe') {
              dyn = dynOf(L[pk].P, rho, xv[pk]);
              if (J) J[r * n + pk] -= dynDer(L[pk].P, rho, xv[pk]);
            }
          }
          R[r] = xv[r] - dyn - nd.value; rowScale[r] = 1 / Pscale;
          if (J) J[r * n + r] = 1;
        }
      }
    }
    const norm = (R) => { let s = 0; for (let i = 0; i < n; i++) { const v = R[i] * rowScale[i]; s += v * v; } return Math.sqrt(s); };

    const R = new Float64Array(n), Rt = new Float64Array(n), J = new Float64Array(n * n);
    const xt = new Float64Array(n);
    const hist = [];
    residual(x, R, null);
    let nrm = norm(R);
    let converged = false, it = 0, polish = 0, relaxNow = sc.relax;
    let worst = null;
    if (n === 0) converged = true;
    for (it = 1; it <= sc.maxIter && !converged; it++) {
      residual(x, R, J);
      nrm = norm(R);
      const b = new Float64Array(n);
      for (let i = 0; i < n; i++) b[i] = -R[i];
      const dx = S.solveDense(J, b, n);
      if (!dx) return { ok: false, error: t('core.solver.singular'), it, hist };
      // criterion on the full Newton step (avoids false convergence under relaxation)
      let maxRel = 0; worst = null;
      for (let i = 0; i < n; i++) {
        const isFlow = i < nL;
        const xn = x[i] + dx[i];
        const absTol = isFlow ? 1e-10 * Mscale : 1e-9 * Pscale;
        const rel = Math.abs(dx[i]) / Math.max(Math.abs(xn), absTol / sc.tol);
        if (rel > maxRel) { maxRel = rel; worst = isFlow ? L[i] : N[i - nL]; }
      }
      // relaxed step with a line search (adaptive relaxation)
      let a = relaxNow, nt;
      const nearlyDone = maxRel <= sc.tol * 10; // near the solution the full step is always accepted
      for (let tries = 0; ; tries++) {
        for (let i = 0; i < n; i++) xt[i] = x[i] + a * dx[i];
        residual(xt, Rt, null);
        nt = norm(Rt);
        if (!sc.adaptive || nearlyDone || nt <= (1 - 1e-4 * a) * nrm || tries >= 10 || !Number.isFinite(nrm)) break;
        a /= 2;
      }
      if (!Number.isFinite(nt)) return { ok: false, error: t('core.solver.diverged'), it, hist };
      x.set(xt); R.set(Rt); nrm = nt;
      hist.push({ it, maxRel, step: a, norm: nt, worst: worst ? describe(worst) : '' });
      if (maxRel <= sc.tol) { polish++; if (polish >= 2) converged = true; }
      else polish = 0;
    }
    // unpack
    const m = new Float64Array(nL), P = new Float64Array(prep.nodes.length).fill(NaN);
    for (let k = 0; k < nL; k++) m[k] = x[k];
    N.forEach((nd, i) => { P[nd.ix] = x[nL + i]; });
    // continuity residual per node (mass balance)
    const imb = new Map();
    for (let i = 0; i < nN; i++) {
      const nd = N[i];
      if (nd.kind !== 'free') continue;
      let sin = 0, sout = 0;
      for (const k of inL[i]) { if (m[k] >= 0) sin += m[k]; else sout -= m[k]; }
      for (const k of outL[i]) { if (m[k] >= 0) sout += m[k]; else sin -= m[k]; }
      if (nd.demand > 0) sout += nd.demand; else sin -= nd.demand;
      imb.set(nd, { err: Math.abs(sin - sout), thr: Math.max(sin, sout) });
    }
    return { ok: true, converged, it: it - 1, hist, m, P, x, nIx, L, N, nL, imb };
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { newton });
})(typeof window !== 'undefined' ? window : globalThis);
