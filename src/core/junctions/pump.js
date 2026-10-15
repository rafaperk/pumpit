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
    r.Pideal = Q * dP;
    r.Pshaft = r.eta > 0 ? r.Pideal / r.eta : NaN;
    if (el.npshrCurve && Number.isFinite(Qs)) r.NPSHR = s * s * H.evalCurve(el.npshrCurve, Qs);
    if (m < 0) warn('critical', t('junctions.pump.warn.reverse', { id: j.id }), 'j:' + j.id);
    if (el.curve && Number.isFinite(Qs) && Qs > el.curve.xmax * 1.0001) warn('warning', t('junctions.pump.warn.beyondCurve', { id: j.id }), 'j:' + j.id);
    if (Number.isFinite(r.NPSHR) && r.NPSHA < r.NPSHR) warn('warning', t('junctions.pump.warn.npsh', { id: j.id, available: r.NPSHA.toFixed(2), required: r.NPSHR.toFixed(2) }), 'j:' + j.id);
    if (!el.effCurve) r.etaAssumed = true;
    return r;
  }

  PumpIt.junctionTypes.register({
    type: 'pump', order: 60, group: 'equipment',
    pipes: [2, 2], directional: true,
    reverseFlowCaution: false, // reverse flow in a pump has its own critical warning

    defaults: () => ({
      mode: 'curve', speed: 100, nPumps: 1, state: 'on',
      curve: { x: [0, 20, 40, 60], y: [42, 40.5, 36, 28.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
      eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' },
      npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
      fixedFlow: q(30, 'm³/h'), setQ: q(30, 'm³/h'), setP: q(3, 'kgf/cm²(g)'),
    }),

    validate(j, miss, { fin, pos, curveOk }) {
      if (j.state !== 'on') return;
      const need = (k) => miss.push(t('junctions.pump.check.' + k));
      if (['curve', 'controlFlow', 'controlDischarge', 'controlSuction'].includes(j.mode) && !curveOk(j.curve)) need('curve');
      if (j.mode === 'fixedFlow' && !(fin(j.fixedFlow) && j.fixedFlow.value >= 0)) need('fixedFlow');
      if (j.mode === 'controlFlow' && !pos(j.setQ)) need('setQ');
      if ((j.mode === 'controlDischarge' || j.mode === 'controlSuction') && !fin(j.setP)) need('setP');
      if (j.mode !== 'fixedFlow' && !(j.speed > 0)) need('speed');
      if (j.mode !== 'fixedFlow' && !(Number.isInteger(j.nPumps) && j.nPumps >= 1)) need('nPumps');
    },

    buildElement,

    elementResults(j, jr, rc) { rc.pumps[j.id] = pumpResult(rc.env, rc.el, j, jr, rc.warn); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
