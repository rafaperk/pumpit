// Compressible mode: the calculation of a model in the compressible regime (appendix C: PumpIt.solver.run hands the
// model over when its regime is 'compressible'). The pipeline is the one of the incompressible mode:
//   prepare (network.js) → [configure devices → analyze (connectivity.js) → pressures (newton.js; in the adiabatic model
//   inside the loop of the node temperatures, §10.3) → review devices] until the device states settle → postprocess
// The first pressures come from the linear theory of gas networks on P² (a few passes with linearised links).
(function (root) {
  const PumpIt = root.PumpIt;
  const S = PumpIt.solver, Gas = PumpIt.gas;

  // scales of the residual: pressures [Pa] and mass flows [kg/s]
  function scales(prep) {
    const { cx, nodes, links } = prep;
    const Pfix = nodes.filter((n) => n.kind === 'fixed').map((n) => n.value)
      .concat(links.filter((l) => l.mode === 'pDown' || l.mode === 'pUp' || l.controlMode === 'pDown' || l.controlMode === 'pUp').map((l) => l.value));
    const Pmean = Pfix.length ? Pfix.reduce((a, b) => a + b, 0) / Pfix.length : prep.env.patm;
    const Pmax = Pfix.length ? Math.max(...Pfix) : Pmean, Pmin = Pfix.length ? Math.min(...Pfix) : Pmean;
    const rho = Pmean / (cx.ZR * cx.T);
    let mRef = 0, nP = 0, mFix = 0;
    for (const l of links) {
      if (l.kind === 'pipe') { mRef += rho * l.P.A * l.P.N * 10; nP++; } // 10 m/s, a usual gas velocity
      if (l.mode === 'fixedFlow' || l.controlMode === 'fixedFlow') mFix += Math.abs(l.value || 0);
    }
    for (const n of nodes) if (n.ext) mFix += Math.abs(n.ext.m || 0) + Math.abs((n.ext.Q || 0) * rho);
    return {
      Pmean, Pscale: Math.max(1e3, Pmax - Pmin, 0.01 * Pmean),
      Mscale: Math.max(1e-9, (nP ? mRef / nP : rho * 1e-3) + mFix), rho,
    };
  }

  // first pressures: the linear theory on u = P² (isothermal closed form without the acceleration term, f = 0.02),
  // m² = C·Δu linearised as m = (C/|m_ref|)·Δu and repeated a few times with the flows it gives
  function initialGuess(prep, sc) {
    const { cx, nodes, links } = prep;
    const free = nodes.filter((n) => !n.isolated && n.kind === 'free');
    const col = new Int32Array(nodes.length).fill(-1);
    free.forEach((nd, i) => { col[nd.ix] = i; });
    const nF = free.length;
    const P = new Map();
    if (!nF) return { P, m: new Map() };
    const ZRT = cx.ZR * cx.T;
    const live = links.filter((l) => !l.isolated && l.mode !== 'closed');
    // C of every link that carries a flow following the pressures; constraint links tie their nodes strongly
    const Cof = (l) => {
      if (l.rel === 'nozzle') return l.CdA * l.CdA / ZRT;
      if (l.rel === 'duct' && l.d) {
        const d = l.d, A = d.A[0] * d.N;
        const F = (d.L > 0 ? (d.fm === 'explicit' ? d.fx : d.fm === 'none' ? 0 : 0.02) * d.L / d.D[0] : 0) + d.K[0];
        return A * A / (ZRT * Math.max(F, 0.1));
      }
      return 1e-6;
    };
    const C = new Map(live.map((l) => [l, Cof(l)]));
    const mref = new Map(live.map((l) => [l, sc.Mscale]));
    // links that impose a relation between the pressures of their nodes, linear in u: a ratio (u_b = r²·u_a), a set
    // pressure (u = set²) or a tie or set difference (u_a − u_b = 2·P̄·ΔP); their flows are unknowns of the system too
    const rel = live.filter((l) => (l.mode === 'ratio' || l.mode === 'pDown' || l.mode === 'pUp' || l.mode === 'dP') && (col[l.a] >= 0 || col[l.b] >= 0));
    const nR = rel.length, n = nF + nR;
    let u = new Float64Array(nF).fill(sc.Pmean * sc.Pmean), mrel = new Float64Array(nR);
    const uOf = (ix) => (col[ix] >= 0 ? u[col[ix]] : nodes[ix].value * nodes[ix].value);
    for (let pass = 0; pass < 12; pass++) {
      const A = new Float64Array(n * n), b = new Float64Array(n);
      // rows of the free nodes: Σ c·(u_i − u_j) + flows of the relation links out − in = external flow into i
      for (const l of live) {
        const ia = col[l.a], ib = col[l.b];
        if (l.mode === 'fixedFlow') { if (ia >= 0) b[ia] -= l.value || 0; if (ib >= 0) b[ib] += l.value || 0; continue; }
        if (l.mode !== 'loss') continue;
        const c = C.get(l) / mref.get(l);
        if (ia >= 0) { A[ia * n + ia] += c; if (ib >= 0) A[ia * n + ib] -= c; else b[ia] += c * uOf(l.b); }
        if (ib >= 0) { A[ib * n + ib] += c; if (ia >= 0) A[ib * n + ia] -= c; else b[ib] += c * uOf(l.a); }
      }
      free.forEach((nd, i) => { if (nd.ext) b[i] += (nd.ext.m || 0) + (nd.ext.Q || 0) * sc.rho; });
      // rows of the relation links
      rel.forEach((l, k) => {
        const r = nF + k, ia = col[l.a], ib = col[l.b];
        if (ia >= 0) A[ia * n + r] += 1;
        if (ib >= 0) A[ib * n + r] -= 1;
        const put = (ix, coef) => { if (col[ix] >= 0) A[r * n + col[ix]] += coef; else b[r] -= coef * uOf(ix); };
        if (l.mode === 'ratio') { const g = l.initRatio > 0 ? l.initRatio : 1; put(l.b, 1); put(l.a, -g * g); }
        else if (l.mode === 'pDown') { put(l.b, 1); b[r] += l.value * l.value; }
        else if (l.mode === 'pUp') { put(l.a, 1); b[r] += l.value * l.value; }
        else { put(l.a, 1); put(l.b, -1); b[r] += 2 * sc.Pmean * (l.value || 0); }
        if (!A.subarray(r * n, r * n + n).some((v) => v !== 0)) { A[r * n + r] = 1; b[r] = 0; }
      });
      for (let i = 0; i < n; i++) if (!A.subarray(i * n, i * n + n).some((v) => v !== 0)) { A[i * n + i] = 1; b[i] = i < nF ? sc.Pmean * sc.Pmean : 0; }
      const x = S.solveDense(A, b, n);
      if (!x) break;
      const floor = (0.05 * sc.Pmean) ** 2;
      u = x.slice(0, nF).map((v) => Math.max(v, floor));
      mrel = x.slice(nF);
      for (const l of live) {
        if (l.mode !== 'loss') continue;
        const du = Math.abs(uOf(l.a) - uOf(l.b));
        // the flows swing from one pass to the next: the average of the old and the new one damps them
        mref.set(l, Math.max((mref.get(l) + Math.sqrt(C.get(l) * du)) / 2, 1e-6 * sc.Mscale));
      }
    }
    free.forEach((nd, i) => P.set(nd.ix, Math.sqrt(u[i])));
    return { P, m: new Map(rel.map((l, k) => [l, mrel[k]])) };
  }

  // stagnation temperatures of the free nodes for the given flows (adiabatic model, §10.3): the mass-weighted mix of
  // what flows into each node (upwind); fixed nodes keep the temperature of their source, a node nothing flows into
  // keeps its previous value. A link may raise the temperature of what it carries (lk.T0ratio, a compressor).
  function mixTemperatures(prep, res, T0old) {
    const { nodes, links } = prep;
    const free = nodes.filter((n) => !n.isolated && n.kind === 'free');
    const col = new Int32Array(nodes.length).fill(-1);
    free.forEach((nd, i) => { col[nd.ix] = i; });
    const n = free.length;
    const T0 = T0old.slice();
    if (!n) return T0;
    const A = new Float64Array(n * n), b = new Float64Array(n), inflow = new Float64Array(n);
    for (const l of links) {
      if (l.isolated || l.idx < 0) continue;
      const m = res.m[l.idx];
      if (!(Math.abs(m) > 0)) continue;
      const [up, dn] = m > 0 ? [l.a, l.b] : [l.b, l.a];
      const i = col[dn];
      if (i < 0) continue;
      const w = Math.abs(m), ratio = l.T0ratio ? l.T0ratio(res, l) : 1;
      inflow[i] += w;
      const j = col[up];
      if (j >= 0) A[i * n + j] -= w * ratio;
      else b[i] += w * ratio * (l.Text && nodes[up].role === 'ext' ? l.Text : T0[up]);
    }
    free.forEach((nd, i) => {
      if (nd.ext && nd.ext.T0 !== undefined) {
        const m = nd.ext.m !== undefined ? nd.ext.m : (nd.ext.Q || 0) * res.P[nd.ix] / (prep.cx.ZR * T0old[nd.ix]);
        if (m > 0) { inflow[i] += m; b[i] += m * nd.ext.T0; }
      }
    });
    for (let i = 0; i < n; i++) {
      if (inflow[i] > 0) A[i * n + i] += inflow[i];
      else { for (let j = 0; j < n; j++) A[i * n + j] = 0; A[i * n + i] = 1; b[i] = T0old[free[i].ix]; }
    }
    const x = S.solveDense(A, b, n);
    if (x) free.forEach((nd, i) => { T0[nd.ix] = x[i]; });
    return T0;
  }

  // pressures (and, in the adiabatic model, the node temperatures) for the current device states
  function solvePressures(prep, guess, sc, opts) {
    const base = { maxIter: opts.maxIter, Pscale: sc.Pscale, Mscale: sc.Mscale, Pmean: sc.Pmean };
    const T0init = prep.nodes.map((n) => (n.kind === 'fixed' ? n.T0 : prep.env.fluid.T));
    if (prep.cx.iso) return Gas.newton(prep, guess, Object.assign({ T0: T0init }, base));
    // adiabatic: the outer loop of temperatures around the Newton method of the pressures (R-40: 1e-6)
    let T0 = guess.T0 || T0init, res = null, it = 0;
    const hist = [];
    for (let k = 0; k < 50; k++) {
      res = Gas.newton(prep, guess, Object.assign({ T0 }, base));
      it += res.ok ? res.it : 0;
      if (res.hist) hist.push(...res.hist);
      if (!res.ok || !res.converged) break;
      const T1 = mixTemperatures(prep, res, T0);
      let dT = 0;
      prep.nodes.forEach((nd, i) => { if (!nd.isolated && nd.kind === 'free') dT = Math.max(dT, Math.abs(T1[i] - T0[i]) / T0[i]); });
      T0 = T1;
      guess = { P: new Map(res.N.filter((nd) => nd.kind === 'free').map((nd) => [nd.ix, res.P[nd.ix]])), m: new Map(res.L.map((l) => [l, res.m[l.idx]])) };
      if (dT < 1e-6) { res.tLoops = k + 1; break; }
      if (k === 49) res.converged = false;
    }
    if (res && res.ok && res.converged) {
      // the last Newton ran with the temperatures before the last update: one more with the final ones keeps both coherent
      const loops = res.tLoops;
      res = Gas.newton(prep, guess, Object.assign({ T0 }, base));
      if (res.hist) hist.push(...res.hist);
      if (res.ok) { it += res.it; res.tLoops = loops; }
    }
    if (res && res.ok) { res.it = it; res.hist = hist; }
    return res;
  }

  function solveModelGas(eff, opts = {}) {
    let prep;
    try { prep = Gas.prepare(eff); } catch (e) { return { ok: false, errors: [e.message], warnings: [] }; }
    if (prep.errors.length) return { ok: false, errors: prep.errors, warnings: prep.warnings };
    // adiabatic model: the first pressures are those of the isothermal solution of the same network (§10.3); the nodes
    // are built in the same order, so the pressures of its free nodes carry over by index
    if (!opts.guess && !prep.cx.iso && !opts.isoStart) {
      const isoEff = Object.assign({}, eff, { system: Object.assign({}, eff.system, { gasMode: 'isothermal' }) });
      const iso = solveModelGas(isoEff, { raw: true, isoStart: true });
      if (iso.ok && iso.res.converged) {
        opts = Object.assign({}, opts, { guess: { P: new Map(iso.res.N.filter((nd) => nd.kind === 'free').map((nd) => [nd.ix, iso.res.P[nd.ix]])), m: new Map() } });
      }
    }
    const sc = scales(prep);
    let st = S.initialStates(prep);
    const seen = new Set();
    let res = null, cycling = false, pass = 0, totalIt = 0, guess = null;
    const allHist = [];
    for (pass = 0; pass < 50; pass++) {
      S.configure(prep, st);
      const errs = S.analyze(prep);
      if (errs.length) return { ok: false, errors: errs, warnings: prep.warnings };
      seen.add(JSON.stringify(st));
      if (!guess) guess = opts.guess || initialGuess(prep, sc);
      res = solvePressures(prep, guess, sc, { maxIter: eff.solution.maxIter });
      if (!res.ok) return { ok: false, errors: [res.error], warnings: prep.warnings, history: res.hist };
      totalIt += res.it;
      allHist.push(...res.hist.map((h) => Object.assign({ pass }, h)));
      if (!res.converged) break;
      const next = S.review(prep, res, st);
      if (JSON.stringify(next) === JSON.stringify(st)) break;
      if (seen.has(JSON.stringify(next))) { cycling = true; break; }
      st = next;
      // the solution is the next guess
      guess = {
        P: new Map(res.N.filter((nd) => nd.kind === 'free').map((nd) => [nd.ix, res.P[nd.ix]])),
        m: new Map(res.L.map((l) => [l, res.m[l.idx]])), T0: res.T0,
      };
    }
    if (opts.raw) return { ok: true, res, prep, st };
    return Gas.postprocess(prep, res, st, { cycling, passes: pass + 1, totalIt, hist: allHist, sc });
  }

  Object.assign(Gas, { solveModelGas, scales, initialGuess, mixTemperatures });
})(typeof window !== 'undefined' ? window : globalThis);
