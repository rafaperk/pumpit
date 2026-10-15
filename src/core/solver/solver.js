// Steady-state solver entry point (specification section 7). Pipeline:
//   prepare (network.js) → [configure devices → analyze (connectivity.js) → newton (newton.js) → review devices]
//   repeated until the device states settle → postprocess (results.js)
(function (root) {
  const PumpIt = root.PumpIt;
  const S = PumpIt.solver;

  function run(eff, opts = {}) {
    let prep;
    try { prep = S.prepare(eff); } catch (e) { return { ok: false, errors: [e.message], warnings: [] }; }
    if (prep.errors.length) return { ok: false, errors: prep.errors, warnings: prep.warnings };
    return solveNetwork(prep, opts);
  }

  function solveNetwork(prep, opts) {
    const { env, links, nodes } = prep;
    const rho = env.rho, g = env.g;
    const sol0 = prep.eff.solution;
    // scales: fixed pressures (boundaries and pressure set points), elevation span and pump shutoff heads
    const Pfix = nodes.filter((n) => n.kind !== 'free').map((n) => n.value)
      .concat(links.filter((l) => l.controlMode === 'pDown' || l.controlMode === 'pUp').map((l) => l.value));
    const zs = nodes.map((n) => n.z);
    let shutoff = 0;
    for (const l of links) if (l.Hof) shutoff += Math.abs(rho * g * l.Hof(0));
    const Pmax = Pfix.length ? Math.max(...Pfix) : env.patm, Pmin = Pfix.length ? Math.min(...Pfix) : env.patm;
    const Pscale = Math.max(1e3, Pmax - Pmin + rho * Math.abs(g) * (Math.max(...zs) - Math.min(...zs)) + shutoff);
    let mRef = 0, nP = 0, mFix = 0;
    for (const l of links) {
      if (l.kind === 'pipe') { mRef += rho * l.P.A * l.P.N; nP++; }
      if (l.mode === 'fixedFlow' || l.controlMode === 'fixedFlow') mFix += Math.abs(l.value);
    }
    const Mscale = Math.max(1e-6, (nP ? mRef / nP : 1) + mFix + nodes.reduce((s, n) => s + Math.abs(n.demand), 0));
    const sc = {
      Pscale, Mscale, Pmean: Pfix.length ? Pfix.reduce((a, b) => a + b, 0) / Pfix.length : env.patm,
      tol: sol0.tolRel, maxIter: sol0.maxIter, relax: sol0.relax, adaptive: sol0.adaptive,
    };

    // initial guess: 1 m/s in the reference direction (or the given one / the previous result)
    const guess = { m: new Map(), P: new Map() };
    for (const l of links) {
      let m0;
      if (l.kind === 'pipe') m0 = rho * l.P.A * l.P.N * 1;
      else if (l.kind === 'elem') m0 = rho * l.Pin.A * l.Pin.N * 1;
      else m0 = l.m0; // discharge links bring their own initial guess
      if (l.mode === 'fixedFlow') m0 = l.value;
      guess.m.set(l, m0);
    }
    if (opts.guess) {
      for (const l of links) {
        const v = l.kind === 'pipe' ? opts.guess.pipes?.[l.pid] : l.kind === 'elem' ? opts.guess.elems?.[l.jid] : undefined;
        if (Number.isFinite(v)) guess.m.set(l, v);
      }
    }

    let st = S.initialStates(prep);
    const seen = new Set();
    let res = null, cycling = false, pass = 0, totalIt = 0;
    const allHist = [];
    for (pass = 0; pass < 50; pass++) {
      S.configure(prep, st);
      const errs = S.analyze(prep);
      if (errs.length) return { ok: false, errors: errs, warnings: prep.warnings };
      seen.add(JSON.stringify(st));
      res = S.newton(prep, guess, sc);
      if (!res.ok) return { ok: false, errors: [res.error], warnings: prep.warnings, history: res.hist };
      totalIt += res.it;
      allHist.push(...res.hist.map((h) => Object.assign({ pass }, h)));
      if (!res.converged) break;
      const next = S.review(prep, res, st);
      if (JSON.stringify(next) === JSON.stringify(st)) break;
      if (seen.has(JSON.stringify(next))) { cycling = true; break; }
      st = next;
      // reuse the solution as the next guess
      res.L.forEach((l, k) => guess.m.set(l, res.m[k]));
      res.N.forEach((nd) => guess.P.set(nd, res.P[nd.ix]));
    }
    return S.postprocess(prep, res, st, { cycling, passes: pass + 1, totalIt, hist: allHist });
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { run, solveNetwork });
})(typeof window !== 'undefined' ? window : globalThis);
