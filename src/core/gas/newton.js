// Compressible mode: Newton-Raphson on the pressures of the free nodes — and on the flows of the links that impose a
// pressure, a pressure difference or a ratio — until the mass balance closes at every node (§10, R-30). The flow of an
// ordinary link follows from the pressures of its two nodes (flow.js), capped at the critical flow when it chokes; the
// Jacobian comes from the derivatives of each link and is solved densely, with row equilibration and partial pivoting,
// as in the incompressible mode. A line search on the residual (halving up to 10 times) and a limit that keeps every
// pressure positive make the steps safe.
//
// Rows      free node            Σ inflows − Σ outflows + external flow = 0          (kg/s)
//           constraint link      lk.con(m, node a, node b, links) = 0                 (Pa or kg/s, lk.conScale)
// Unknowns  P of every free node; m of every constraint link: modes 'dP', 'pDown', 'pUp', 'ratio', and 'fixedFlow' with a
//           row of its own (a flow set as a volume at the inlet conditions, which follows the pressure there)
// Converged when every free node balances within 1e-8 of the flow through it (R-40) and every constraint row within
// 1e-10 of its scale. A node joined by a link of almost no loss (a short, wide pipe) may not balance that finely: a few
// units in the last place of its pressure move its flows by more than that. When the Newton step falls below that
// resolution with every misfit under 1e-6, nothing can improve the balance further, and the solution is taken.
(function (root) {
  const PumpIt = root.PumpIt;
  const S = PumpIt.solver;
  const Fw = PumpIt.gas.flow;
  const { t } = PumpIt.i18n;

  const CON_MODES = new Set(['dP', 'pDown', 'pUp', 'ratio']);
  const isCon = (l) => CON_MODES.has(l.mode) || (l.mode === 'fixedFlow' && !!l.con);
  const { abs, max, min, sqrt } = Math; // local names (faster in the Node vm contexts of the tests)
  const isFin = Number.isFinite;

  // flow of an ordinary link from its two nodes: { m, dPa, dPb, choked, s, ... }
  function linkFlow(cx, lk, na, nb, wantDer) {
    if (lk.rel === 'nozzle') {
      const r = Fw.nozzleFlow(cx, na, nb.P, lk.CdA, lk.Text);
      if (!wantDer) return r;
      const h = 1e-7 * max(na.P, nb.P);
      r.dPa = (Fw.nozzleFlow(cx, Object.assign({}, na, { P: na.P + h }), nb.P, lk.CdA, lk.Text).m - r.m) / h;
      r.dPb = (Fw.nozzleFlow(cx, na, nb.P + h, lk.CdA, lk.Text).m - r.m) / h;
      return r;
    }
    if (lk.rel === 'curve') {
      const r = lk.curveFlow(na, nb);
      if (!wantDer) return r;
      const h = 1e-7 * max(na.P, nb.P);
      r.dPa = (lk.curveFlow(Object.assign({}, na, { P: na.P + h }), nb).m - r.m) / h;
      r.dPb = (lk.curveFlow(na, Object.assign({}, nb, { P: nb.P + h })).m - r.m) / h;
      return r;
    }
    lk.cache = lk.cache || {};
    return Fw.ductFlow(cx, lk.d, na, nb, lk.cache, wantDer);
  }

  // node temperature used for densities and for the gas leaving a node
  const nodeT = (cx, nd, T0) => (cx.iso ? cx.T : T0);

  // guess: { P: Map(node ix → Pa), m: Map(link → kg/s) }; T0: stagnation temperature per node (adiabatic model)
  function newton(prep, guess, opts) {
    const { cx } = prep;
    const nodes = prep.nodes, links = prep.links;
    const T0 = opts.T0 || nodes.map(() => cx.T);
    const N = nodes.filter((n) => !n.isolated);
    const L = links.filter((l) => !l.isolated);
    L.forEach((l, i) => { l.idx = i; });
    links.filter((l) => l.isolated).forEach((l) => { l.idx = -1; });
    const free = N.filter((n) => n.kind === 'free');
    const con = L.filter(isCon);
    const reg = L.filter((l) => l.mode === 'loss');
    const fix = L.filter((l) => l.mode === 'fixedFlow' && !l.con);
    const conSet = new Set(con);
    const nF = free.length, nC = con.length, n = nF + nC;
    const col = new Int32Array(nodes.length).fill(-1); // node ix → unknown index (free nodes)
    free.forEach((nd, i) => { col[nd.ix] = i; });
    con.forEach((l, i) => { l.ci = nF + i; });

    // pressures: fixed nodes at their value, free nodes from the guess
    const P = new Float64Array(nodes.length).fill(NaN);
    for (const nd of N) P[nd.ix] = nd.kind === 'free' ? (guess.P.get(nd.ix) ?? opts.Pmean) : nd.value;
    const x = new Float64Array(n);
    free.forEach((nd, i) => { x[i] = P[nd.ix]; });
    con.forEach((l, i) => { x[nF + i] = guess.m.get(l) ?? (l.mode === 'fixedFlow' ? l.value || 0 : 0); });
    const Pscale = opts.Pscale, Mscale = opts.Mscale;

    const nodeOf = (ix, Pv) => ({ P: Pv[ix], pk: nodes[ix].pk, T0: T0[ix] });
    const mL = new Float64Array(L.length);   // flow of every link (a → b)
    const st = new Array(L.length);          // state of every ordinary link
    const R = new Float64Array(n), rowScale = new Float64Array(n);
    const thr = new Float64Array(nF);        // flow through every free node (convergence measure)

    // residual (and Jacobian when J is given) at the unknowns xv
    function evaluate(xv, Rv, J) {
      const Pv = P.slice();
      free.forEach((nd, i) => { Pv[nd.ix] = xv[i]; });
      Rv.fill(0); thr.fill(0);
      if (J) J.fill(0);
      for (const l of reg) {
        const r = linkFlow(cx, l, nodeOf(l.a, Pv), nodeOf(l.b, Pv), !!J);
        if (!isFin(r.m)) return false;
        mL[l.idx] = r.m; st[l.idx] = r;
      }
      for (const l of fix) mL[l.idx] = l.value;
      for (const l of con) mL[l.idx] = xv[l.ci];
      for (const l of links) if (l.mode === 'closed' && l.idx >= 0) mL[l.idx] = 0;
      // balances
      for (const l of L) {
        const m = mL[l.idx], ia = col[l.a], ib = col[l.b];
        if (ia >= 0) { Rv[ia] -= m; thr[ia] += abs(m); }
        if (ib >= 0) { Rv[ib] += m; thr[ib] += abs(m); }
        if (!J) continue;
        if (l.mode === 'loss') {
          const r = st[l.idx], ja = col[l.a], jb = col[l.b];
          if (ia >= 0) { if (ja >= 0) J[ia * n + ja] -= r.dPa; if (jb >= 0) J[ia * n + jb] -= r.dPb; }
          if (ib >= 0) { if (ja >= 0) J[ib * n + ja] += r.dPa; if (jb >= 0) J[ib * n + jb] += r.dPb; }
        } else if (conSet.has(l)) {
          if (ia >= 0) J[ia * n + l.ci] -= 1;
          if (ib >= 0) J[ib * n + l.ci] += 1;
        }
      }
      // external flows (a volume at the conditions of the node is a mass flow that follows its pressure)
      for (let i = 0; i < nF; i++) {
        const nd = free[i];
        rowScale[i] = 1 / Mscale;
        if (!nd.ext) continue;
        let m = nd.ext.m || 0, dm = 0;
        if (nd.ext.Q) {
          const Tn = nodeT(cx, nd, T0[nd.ix]);
          m = nd.ext.Q * xv[i] / (cx.ZR * Tn); dm = nd.ext.Q / (cx.ZR * Tn);
        }
        Rv[i] += m; thr[i] += abs(m);
        if (J) J[i * n + i] += dm;
      }
      // constraint rows
      const sol = { m: mL, st, P: Pv };
      for (const l of con) {
        const r = l.ci, na = nodeOf(l.a, Pv), nb = nodeOf(l.b, Pv), m = xv[r];
        Rv[r] = l.con(m, na, nb, sol);
        rowScale[r] = 1 / (l.conScale === 'M' ? Mscale : Pscale);
        if (!isFin(Rv[r])) return false;
        if (!J) continue;
        const hm = 1e-7 * max(abs(m), Mscale * 1e-3);
        J[r * n + r] = (l.con(m + hm, na, nb, sol) - Rv[r]) / hm;
        const ja = col[l.a], jb = col[l.b];
        if (ja >= 0) { const h = 1e-7 * na.P; J[r * n + ja] = (l.con(m, Object.assign({}, na, { P: na.P + h }), nb, sol) - Rv[r]) / h; }
        if (jb >= 0) { const h = 1e-7 * nb.P; J[r * n + jb] = (l.con(m, na, Object.assign({}, nb, { P: nb.P + h }), sol) - Rv[r]) / h; }
      }
      return true;
    }
    const norm = (Rv) => { let s = 0; for (let i = 0; i < n; i++) { const v = Rv[i] * rowScale[i]; s += v * v; } return sqrt(s); };
    // the largest misfit, relative to its measure (R-40); the worst node or link for the history
    function misfit(Rv) {
      let worst = 0, who = '';
      for (let i = 0; i < nF; i++) {
        const v = abs(Rv[i]) / max(thr[i], 1e-6 * Mscale);
        if (v > worst) { worst = v; who = 'J' + free[i].jid; }
      }
      for (const l of con) {
        const v = abs(Rv[l.ci]) / (l.conScale === 'M' ? Mscale : Pscale) * 1e2; // 1e-10 of the scale ≡ 1e-8
        if (v > worst) { worst = v; who = l.jid !== undefined ? 'J' + l.jid : 'P' + l.pid; }
      }
      return { worst, who };
    }

    const J = new Float64Array(n * n), Rt = new Float64Array(n), xt = new Float64Array(n);
    const hist = [];
    if (!evaluate(x, R, J)) return { ok: false, error: t('core.solver.diverged'), it: 0, hist };
    let nrm = norm(R), fit = misfit(R), converged = n === 0 || fit.worst <= 1e-8, it = 0, haveJ = true;
    for (it = 1; it <= opts.maxIter && !converged; it++) {
      if (!haveJ) evaluate(x, R, J);
      const b = new Float64Array(n);
      for (let i = 0; i < n; i++) b[i] = -R[i];
      let dx = S.solveDense(J.slice(), b, n);
      if (!dx) {
        // nearly singular (a link far stiffer than the rest): a small damping on the diagonal of the pressure rows
        const Jd = J.slice();
        let dmax = 0;
        for (let i = 0; i < n; i++) dmax = max(dmax, abs(Jd[i * n + i]));
        for (let i = 0; i < nF; i++) Jd[i * n + i] += 1e-10 * dmax * (Jd[i * n + i] < 0 ? -1 : 1);
        for (let i = 0; i < n; i++) b[i] = -R[i];
        dx = S.solveDense(Jd, b, n);
      }
      if (!dx) return { ok: false, error: t('core.solver.singular'), it, hist };
      // a step below the resolution of the unknowns (32 units in the last place) cannot balance the nodes any better
      if (fit.worst <= 1e-6 && dx.every((d, i) => abs(d) <= 32 * Number.EPSILON * max(abs(x[i]), i < nF ? 0 : Mscale))) { converged = true; break; }
      // pressures stay positive: at most 90 % of the way to zero in one step
      let a = 1;
      for (let i = 0; i < nF; i++) if (x[i] + dx[i] < 0.1 * x[i]) a = min(a, 0.9 * x[i] / abs(dx[i]));
      // line search: the first try also brings the Jacobian of the next iteration
      let ok = false, nt = Infinity, tries = 0;
      for (; tries <= 10; tries++) {
        for (let i = 0; i < n; i++) xt[i] = x[i] + a * dx[i];
        const wantJ = tries === 0;
        if (evaluate(xt, Rt, wantJ ? J : null)) {
          nt = norm(Rt);
          if (nt <= (1 - 1e-4 * a) * nrm || misfit(Rt).worst <= 1e-8) { ok = true; haveJ = wantJ; break; }
        }
        a /= 2;
      }
      if (!ok) {
        // no decrease along the Newton direction: take the smallest step anyway (the residual may grow for a moment)
        if (!evaluate(xt, Rt, null)) return { ok: false, error: t('core.solver.diverged'), it, hist };
        nt = norm(Rt); haveJ = false;
      }
      x.set(xt); R.set(Rt); nrm = nt;
      fit = misfit(R);
      hist.push({ it, maxRel: fit.worst, step: a, norm: nt, worst: fit.who });
      if (fit.worst <= 1e-8) converged = true;
    }
    // final state, with the derivatives (the review of devices and the results read them)
    evaluate(x, R, null);
    const Pout = new Float64Array(nodes.length).fill(NaN);
    for (const nd of N) Pout[nd.ix] = nd.kind === 'free' ? x[col[nd.ix]] : nd.value;
    // mass balance per free node, as in the incompressible results
    const imb = new Map();
    free.forEach((nd, i) => {
      let sin = 0, sout = 0;
      for (const l of L) {
        const m = mL[l.idx];
        if (l.b === nd.ix) { if (m >= 0) sin += m; else sout -= m; }
        if (l.a === nd.ix) { if (m >= 0) sout += m; else sin -= m; }
      }
      imb.set(nd, { err: abs(R[i]), thr: max(sin, sout) });
    });
    return { ok: true, converged, it: it - 1, hist, P: Pout, m: mL.slice(), st: st.slice(), L, N, imb, T0 };
  }

  Object.assign(PumpIt.gas, { newton, linkFlow, CON_MODES, isCon });
})(typeof window !== 'undefined' ? window : globalThis);
