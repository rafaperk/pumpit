// Pump: head curve H(Q) scaled by speed (affinity laws) and number of identical pumps in parallel.
// Modes: curve; fixed flow (sizing, no curve needed); flow, discharge-pressure or suction-pressure control
// (the speed that meets the set point is reported). States: on, off with flow through, off and closed.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const U = PumpIt.units, H = PumpIt.hyd;
  const q = PumpIt.model.q;
  const { KGF, fmtSI } = PumpIt.solver.util;

  function buildElement(j, lk, net) {
    const { rho, g, si, errors, warnings, Pin, Pout } = net;
    const s = j.speed / 100, N = j.nPumps || 1;
    lk.s = s; lk.N = N;
    // fixed flow (sizing): the pump adds whatever is needed; curves are not used
    const needsCurve = j.mode !== 'fixedFlow' && j.state === 'on';
    if (needsCurve) {
      const c = j.curve;
      const xs = c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow'));
      const ys = c.y.map((v) => U.toSI(v, c.yUnit, 'head'));
      try { lk.curve = H.makeCurve(xs, ys, c.fit); } catch (e) { errors.push(t('junctions.pump.error.curve', { id: j.id, message: e.message })); return; }
      const cv = lk.curve;
      lk.Hof = (Q, sp = s) => sp * sp * H.evalCurve(cv, Q / (N * sp));
      // poor curve fit: rises over part of the range, or never crosses zero head
      const h0 = H.evalCurve(cv, 0);
      let rises = false, crosses = false;
      for (let i = 1; i <= 40; i++) {
        const x1 = (cv.xmax * (i - 1)) / 40, x2 = (cv.xmax * i) / 40;
        if (H.evalCurve(cv, x2) - H.evalCurve(cv, x1) > 1e-6 * Math.abs(h0)) rises = true;
      }
      for (let i = 1; i <= 100 && !crosses; i++) if (H.evalCurve(cv, cv.xmax * i / 10) <= 0) crosses = true;
      if (rises) warnings.push({ level: 'caution', text: t('junctions.pump.warn.curveRises', { id: j.id }), obj: 'j:' + j.id });
      if (!crosses) warnings.push({ level: 'caution', text: t('junctions.pump.warn.noZeroHead', { id: j.id }), obj: 'j:' + j.id });
    }
    if (needsCurve && j.eff && j.eff.x.length) {
      const c = j.eff;
      lk.effCurve = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => v / 100), c.fit);
    }
    if (needsCurve && j.npshr && j.npshr.x.length) {
      const c = j.npshr;
      lk.npshrCurve = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => U.toSI(v, c.yUnit, 'head')), c.fit);
    }
    lk.phi = (m) => -rho * g * lk.Hof(m / rho);
    if (j.state === 'offClosed') { lk.mode = 'closed'; lk.fixedClosed = true; }
    else if (j.state === 'offOpen') { lk.phi = () => 0; lk.mode = 'loss'; lk.offOpen = true; }
    else if (j.mode === 'fixedFlow') { lk.mode = 'fixedFlow'; lk.value = si(j.fixedFlow, 'flow'); }
    else if (j.mode === 'controlFlow') { lk.mode = 'fixedFlow'; lk.value = si(j.setQ, 'flow'); lk.controlled = true; }
    else if (j.mode === 'controlDischarge') { lk.mode = 'pDown'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = Pout; lk.controlled = true; }
    else if (j.mode === 'controlSuction') { lk.mode = 'pUp'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = Pin; lk.controlled = true; }
  }

  function pumpResult(env, el, j, jr, warn) {
    const { rho, g, pv } = env;
    const m = jr.m, Q = m / rho;
    const dP = jr.P0out - jr.P0in;
    const dH = dP / (rho * g);
    const r = { m, Q, dP, dH, speed: j.speed, state: j.state, mode: j.mode, NPSHA: (jr.P0in - pv) / (rho * g) };
    if (j.state !== 'on') { r.speed = 0; r.NPSHA = NaN; return r; }
    if (j.mode === 'fixedFlow') {
      // sizing: reports the required head; without a curve there is no speed, efficiency or NPSHR
      r.speed = NaN; r.eta = NaN; r.etaAssumed = true;
      r.Pideal = Q * dP; r.Pshaft = NaN;
      if (dP < 0) warn('warning', t('junctions.pump.warn.fixedNegative', { id: j.id, dp: fmtSI(dP / KGF) }), 'j:' + j.id);
      if (m < 0) warn('critical', t('junctions.pump.warn.fixedReverse', { id: j.id }), 'j:' + j.id);
      return r;
    }
    let s = el.s;
    if (el.controlled && el.curve) {
      // speed that delivers the required head: s²·H1(Q/(N·s)) = ΔH
      const target = dH;
      const f = (sp) => sp * sp * H.evalCurve(el.curve, Q / (el.N * sp)) - target;
      let lo = 0.01, hi = 3;
      if (f(hi) < 0) { s = NaN; warn('warning', t('junctions.pump.warn.speedTooHigh', { id: j.id }), 'j:' + j.id); }
      else if (f(lo) > 0) { s = lo; warn('warning', t('junctions.pump.warn.speedTooLow', { id: j.id }), 'j:' + j.id); }
      else {
        for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
        s = (lo + hi) / 2;
      }
      r.speed = s * 100;
    }
    const Qs = Number.isFinite(s) ? Q / (el.N * s) : NaN; // equivalent flow per pump on the 100% curve
    r.eta = el.effCurve && Number.isFinite(Qs) ? H.evalCurve(el.effCurve, Qs) : 1;
    bestEfficiency(r, el, s, Q);
    r.Pideal = Q * dP;
    r.Pshaft = r.eta > 0 ? r.Pideal / r.eta : NaN;
    if (el.npshrCurve && Number.isFinite(Qs)) r.NPSHR = s * s * H.evalCurve(el.npshrCurve, Qs);
    if (m < 0) warn('critical', t('junctions.pump.warn.reverse', { id: j.id }), 'j:' + j.id);
    if (el.curve && Number.isFinite(Qs) && Qs > el.curve.xmax * 1.0001) warn('warning', t('junctions.pump.warn.beyondCurve', { id: j.id }), 'j:' + j.id);
    if (Number.isFinite(r.NPSHR) && r.NPSHA < r.NPSHR) warn('warning', t('junctions.pump.warn.npsh', { id: j.id, available: r.NPSHA.toFixed(2), required: r.NPSHR.toFixed(2) }), 'j:' + j.id);
    if (!el.effCurve) r.etaAssumed = true;
    return r;
  }

  // best efficiency point (an output, docs/result-outputs.md): the flow at the peak of the efficiency curve, taken to the
  // speed s and to the N machines of the operating point by the affinity laws, and the flow Q as a percentage of it. No
  // efficiency curve, or a curve without a peak between its points: no result.
  function bestEfficiency(r, el, s, Q) {
    if (!el.effCurve || !(s > 0)) return;
    const best = H.curveMax(el.effCurve);
    if (!Number.isFinite(best.x)) return;
    r.QBEP = best.x * el.N * s;
    r.bepPct = r.QBEP > 0 ? 100 * Q / r.QBEP : NaN;
  }

  PumpIt.junctionTypes.register({
    type: 'pump', order: 60, group: 'equipment',
    pipes: [2, 2], directional: true,
    reverseFlowCaution: false, // reverse flow in a pump has its own critical warning

    defaults: () => ({
      mode: 'fixedFlow', speed: 100, nPumps: 1, state: 'on', // a new pump sizes: the head needed for its flow
      curve: { x: [0, 20, 40, 60], y: [42, 40.5, 36, 28.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
      eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' },
      npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
      fixedFlow: q(30, 'm³/h'), setQ: q(30, 'm³/h'), setP: q(3, 'kgf/cm²(g)'),
      ratio: 2, etaGas: 75, // compressible mode: pressure ratio and polytropic efficiency (%) of a compressor
    }),

    validate(j, miss, { fin, pos, curveOk, gas, gasP }) {
      if (j.state !== 'on') return;
      const need = (k) => miss.push(t('junctions.pump.check.' + k));
      // a fixed pressure ratio is a compressor of the compressible mode
      if (j.mode === 'ratio') { if (!gas) need('ratioGasOnly'); else if (!(j.ratio > 0)) need('ratio'); }
      if (gas && j.etaGas !== undefined && !(j.etaGas > 0 && j.etaGas <= 100)) need('etaGas');
      if (['curve', 'controlFlow', 'controlDischarge', 'controlSuction'].includes(j.mode) && !curveOk(j.curve)) need('curve');
      if (j.mode === 'fixedFlow' && !(fin(j.fixedFlow) && j.fixedFlow.value >= 0)) need('fixedFlow');
      if (j.mode === 'controlFlow' && !pos(j.setQ)) need('setQ');
      if ((j.mode === 'controlDischarge' || j.mode === 'controlSuction') && !fin(j.setP)) need('setP');
      if (j.mode === 'controlDischarge' || j.mode === 'controlSuction') gasP(j.setP, 'junctions.pump.check.setP');
      if (j.mode !== 'fixedFlow' && !(j.speed > 0)) need('speed');
      if (j.mode !== 'fixedFlow' && !(Number.isInteger(j.nPumps) && j.nPumps >= 1)) need('nPumps');
    },

    buildElement,

    elementResults(j, jr, rc) { rc.pumps[j.id] = pumpResult(rc.env, rc.el, j, jr, rc.warn); },

    // compressible mode: the pump is a compressor or a blower (§10.5)
    gas: { element: gasElement, results: gasResults },
  });

  // ---------- compressible mode (§10.5; decision G-27)
  // A compressor is a link between its suction and discharge nodes whose flow is an unknown with a row of its own:
  //   ratio             P0 out = r·P0 in
  //   curve             the head of the curve read as the isentropic head of the gas against the volume flow at the
  //                     suction, H = s²·H1(Q/(N·s)), so that P0 out = P0 in·(1 + g·H·(k−1)/(k·Z·R·T0 in))^(k/(k−1));
  //                     for a small head this is ΔP = ρ·g·H, the pump of a liquid
  //   fixedFlow, controlFlow             the flow: a mass flow, or a volume at the suction conditions
  //   controlDischarge, controlSuction   the static pressure at the discharge or at the suction
  // In the adiabatic model the gas leaves hotter: T0 out = T0 in·r^((k−1)/(k·η)), η the polytropic efficiency (the
  // efficiency curve when given, otherwise etaGas). The isothermal model keeps the gas at its temperature after the
  // machine (as if an aftercooler brought it back); the discharge temperature is still reported.
  const JS = () => PumpIt.junctionTypes.shared;
  function gasElement(j, lk, net) {
    if (j.state === 'offClosed') { lk.mode = 'closed'; lk.fixedClosed = true; return; }
    if (j.state === 'offOpen') { net.tie(lk); return; }
    const { cx, si, g, Pin, Pout } = net;
    const S = JS(), k = cx.k, s = j.speed / 100, N = j.nPumps || 1;
    lk.pk = net.internal; lk.s = s; lk.N = N;
    // stagnation pressure of the suction or discharge node, seen through the pipe at that end
    const p0 = (nd, P, ix, sol) => S.gasBasisP(cx, nd, 'stagnation', S.gasMachAt(sol, P, ix));
    const T0of = (nd) => (cx.iso ? cx.T : nd.T0);
    lk.headRatio = (H, T0) => Math.pow(Math.max(1e-6, 1 + g * H * (k - 1) / (k * cx.ZR * T0)), k / (k - 1));
    if (j.mode !== 'fixedFlow' && j.mode !== 'ratio' && j.curve && j.curve.x.length) {
      const c = j.curve;
      try { lk.curve = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => U.toSI(v, c.yUnit, 'head')), c.fit); } catch (e) { net.errors.push(t('junctions.pump.error.curve', { id: j.id, message: e.message })); return; }
    }
    if (j.eff && j.eff.x.length) {
      const c = j.eff;
      lk.effCurve = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => v / 100), c.fit);
    }
    // polytropic efficiency at a volume flow Q of the suction
    lk.etaAt = (Q) => {
      const e = lk.effCurve ? H.evalCurve(lk.effCurve, Q / (N * s)) : (j.etaGas > 0 ? j.etaGas : 75) / 100;
      return e > 0.01 ? Math.min(e, 1) : 0.01;
    };
    const suction = (m, na, sol) => { const P0 = p0(na, Pin, lk.a, sol), T0 = T0of(na); return { P0, T0, Q: m * cx.ZR * T0 / P0 }; };
    lk.suction = suction; lk.p0 = p0; lk.T0of = T0of;
    const flowRow = (qt) => {
      const f = net.flowExt(qt, 1, j) || { m: 0 };
      if (f.m !== undefined) { lk.mode = 'fixedFlow'; lk.value = f.m; return; }
      lk.mode = 'fixedFlow'; lk.value = f.Q * net.env.rhoN; lk.conScale = 'M';
      lk.con = (m, na) => m - f.Q * Fw().rhoOf(cx, na.P, Fw().tempOf(cx, na));
    };
    if (j.mode === 'ratio') {
      lk.mode = 'ratio'; lk.joins = true; lk.conScale = 'P'; lk.initRatio = j.ratio;
      lk.con = (m, na, nb, sol) => p0(nb, Pout, lk.b, sol) - j.ratio * p0(na, Pin, lk.a, sol);
    } else if (j.mode === 'curve') {
      if (!lk.curve) return;
      lk.mode = 'ratio'; lk.joins = true; lk.conScale = 'P';
      lk.initRatio = lk.headRatio(s * s * H.evalCurve(lk.curve, 0.6 * lk.curve.xmax), cx.T); // for the first pressures
      lk.con = (m, na, nb, sol) => {
        const su = suction(m, na, sol);
        return p0(nb, Pout, lk.b, sol) - su.P0 * lk.headRatio(s * s * H.evalCurve(lk.curve, su.Q / (N * s)), su.T0);
      };
    } else if (j.mode === 'fixedFlow') flowRow(j.fixedFlow);
    else if (j.mode === 'controlFlow') { flowRow(j.setQ); lk.controlled = true; }
    else if (j.mode === 'controlDischarge' || j.mode === 'controlSuction') {
      const v = si(j.setP, 'pressure'), down = j.mode === 'controlDischarge';
      lk.mode = down ? 'pDown' : 'pUp'; lk.value = v; lk.conScale = 'P'; lk.controlled = true;
      lk.con = (m, na, nb, sol) => S.gasBasisP(cx, down ? nb : na, 'static', S.gasMachAt(sol, down ? Pout : Pin, down ? lk.b : lk.a)) - v;
    }
    // the stagnation temperature the gas leaves with, for the temperature loop of the adiabatic model
    lk.T0ratio = (res, l) => {
      const m = res.m[l.idx];
      if (cx.iso || !(m > 0)) return 1;
      const na = S.gasNode(lk.pk, res, l.a), nb = S.gasNode(lk.pk, res, l.b);
      const r = p0(nb, Pout, l.b, res) / p0(na, Pin, l.a, res);
      return r > 1 ? Math.pow(r, (k - 1) / (k * lk.etaAt(suction(m, na, res).Q))) : 1;
    };
  }
  const Fw = () => PumpIt.gas.flow;

  // results of a compressor: flow, pressure ratio, rise, isentropic head, discharge temperature and power to the gas
  function gasResults(j, jr, rc) {
    const { cx } = rc, el = rc.el, k = cx.k, m = rc.m;
    const r = { type: 'pump', m, Q: jr.Q, QN: jr.QN, state: j.state, mode: j.mode, speed: j.speed, stateTxt: t('junctions.pump.form.' + j.state) };
    r.dP = rc.P0out - rc.P0in;
    r.ratio = rc.P0out / rc.P0in;
    if (j.state !== 'on' || !el.etaAt) { r.speed = 0; rc.pumps[j.id] = r; return; }
    const S = JS();
    const na = S.gasNode(el.pk, rc.res, el.a);
    const su = el.suction(m, na, rc.res);
    r.Q = su.Q; r.T0in = su.T0;
    r.dHs = cx.ZR * su.T0 * k / (k - 1) * (Math.pow(Math.max(r.ratio, 1e-9), (k - 1) / k) - 1) / rc.env.g; // isentropic head
    r.eta = el.etaAt(su.Q);
    r.T0out = r.ratio > 1 ? su.T0 * Math.pow(r.ratio, (k - 1) / (k * r.eta)) : su.T0;
    r.Pgas = m * cx.cp * (r.T0out - su.T0);
    if (el.controlled && el.curve) {
      // the speed whose curve gives the head the network asks for: s²·H1(Q/(N·s)) = H
      const f = (sp) => sp * sp * H.evalCurve(el.curve, su.Q / (el.N * sp)) - r.dHs;
      let lo = 0.01, hi = 3, sp = NaN;
      if (f(hi) < 0) rc.warn('warning', t('junctions.pump.warn.speedTooHigh', { id: j.id }), 'j:' + j.id);
      else if (f(lo) > 0) { sp = lo; rc.warn('warning', t('junctions.pump.warn.speedTooLow', { id: j.id }), 'j:' + j.id); }
      else { for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; } sp = (lo + hi) / 2; }
      r.speed = sp * 100;
    } else if (j.mode === 'fixedFlow' || j.mode === 'ratio') r.speed = NaN;
    bestEfficiency(r, el, el.controlled && el.curve ? r.speed / 100 : el.s, su.Q);
    if (m < 0) rc.warn('critical', t('junctions.pump.warn.reverse', { id: j.id }), 'j:' + j.id);
    if (el.curve && j.mode === 'curve' && su.Q / (el.N * el.s) > el.curve.xmax * 1.0001) rc.warn('warning', t('junctions.pump.warn.beyondCurve', { id: j.id }), 'j:' + j.id);
    if (r.ratio < 1 && m > 0) rc.warn('warning', t('core.gas.compressorBelowOne', { id: j.id, r: r.ratio.toFixed(3) }), 'j:' + j.id);
    rc.pumps[j.id] = r;
  }
})(typeof window !== 'undefined' ? window : globalThis);
