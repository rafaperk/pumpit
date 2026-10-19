// Control valve: PRV (downstream pressure), PSV (upstream pressure), FCV (flow) or PDCV (pressure drop).
// It is a stateful device: controlling, fully open or closed, reviewed after each hydraulic convergence
// (specification section 7). A special condition (open/closed) fixes the state.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;
  const JS = PumpIt.junctionTypes.shared;
  const { KGF, fmtSI, dynOf } = PumpIt.solver.util;

  const device = {
    initial: (lk) => (lk.j.special === 'closed' ? 'closed' : lk.j.special === 'open' ? 'open' : 'control'),

    configure(lk, s) {
      if (s === 'closed') lk.mode = 'closed';
      else if (s === 'open') { lk.mode = 'loss'; lk.phi = lk.phiOpen; }
      else lk.mode = lk.controlMode;
    },

    review(lk, sol, st, next, env) {
      const j = lk.j;
      if (j.special && j.special !== 'none') return; // a special condition fixes the state
      const { rho } = env;
      const m = sol.m[lk.idx];
      const Pa = sol.P[lk.a], Pb = sol.P[lk.b];
      const s = st[lk.jid];
      const dPreq = Pa - Pb;
      const dPopen = lk.phiOpen(m);
      const basisDown = Pb - dynOf(lk.ctype === 'PRV' ? lk.dynPipe : null, rho, sol.m[lk.dynPipe?.link?.idx ?? -1] ?? m);
      const basisUp = Pa - dynOf(lk.ctype === 'PSV' ? lk.dynPipe : null, rho, sol.m[lk.dynPipe?.link?.idx ?? -1] ?? m);
      if (s === 'control') {
        if (j.alwaysControl) return;
        if (lk.ctype === 'FCV') { if (dPreq < dPopen) next[lk.jid] = j.failAction === 'closed' ? 'closed' : 'open'; }
        else if (lk.ctype === 'PRV' || lk.ctype === 'PSV') {
          if (m < 0) next[lk.jid] = 'closed';
          else if (dPreq < dPopen) next[lk.jid] = 'open';
        }
      } else if (s === 'open') {
        if (lk.ctype === 'PRV' && basisDown > lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'PSV' && basisUp < lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'FCV' && m > lk.value) next[lk.jid] = 'control';
      } else if (s === 'closed') {
        if (lk.ctype === 'PRV' && Pa > Pb && Pb < lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'PSV' && Pa > lk.value && Pa > Pb) next[lk.jid] = 'control';
      }
    },
  };

  PumpIt.junctionTypes.register({
    type: 'control', order: 80, group: 'valves',
    pipes: [2, 2], directional: true,

    defaults: () => ({
      ctype: 'PRV', setP: q(2, 'kgf/cm²(g)'), setQ: q(20, 'm³/h'), setDP: q(0.5, 'kgf/cm²'),
      basis: 'static', alwaysControl: true, kOpen: 0, failAction: 'open', special: 'none',
    }),

    validate(j, miss, { fin, pos }) {
      if ((j.ctype === 'PRV' || j.ctype === 'PSV') && !fin(j.setP)) miss.push(t('junctions.control.check.setP'));
      if (j.ctype === 'FCV' && !pos(j.setQ)) miss.push(t('junctions.control.check.setQ'));
      if (j.ctype === 'PDCV' && !fin(j.setDP)) miss.push(t('junctions.control.check.setDP'));
      if (!(j.kOpen >= 0)) miss.push(t('junctions.control.check.kOpen'));
    },

    buildElement(j, lk, net) {
      const { si, Pin, Pout } = net;
      lk.phiOpen = net.kElem(j.kOpen, j.kOpen);
      lk.ctype = j.ctype;
      if (j.ctype === 'PRV') { lk.controlMode = 'pDown'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = j.basis === 'static' ? Pout : null; }
      else if (j.ctype === 'PSV') { lk.controlMode = 'pUp'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = j.basis === 'static' ? Pin : null; }
      else if (j.ctype === 'FCV') { lk.controlMode = 'fixedFlow'; lk.value = si(j.setQ, 'flow'); }
      else { lk.controlMode = 'dP'; lk.value = si(j.setDP, 'dp'); }
      lk.phi = lk.phiOpen;
      lk.device = device;
    },

    elementResults(j, jr, rc) {
      const vr = JS.inlineValveResult(j, jr, rc);
      stateAndWarnings(j, vr, rc);
      rc.valves[j.id] = vr;
    },

    // compressible mode: the same states and rules, with the gas relations. Open, the valve is a K element of kOpen;
    // controlling, its flow is an unknown with a row of its own: the pressure on the basis of the set point (static or
    // stagnation, converted through the Mach number of the pipe at that end), the mass flow (a volume is read at the
    // inlet conditions) or the pressure drop.
    gas: {
      element(j, lk, net) {
        const { si, cx } = net;
        lk.ctype = j.ctype;
        lk.pk = net.internal;
        net.kElement(j.kOpen, j.kOpen);
        lk.open = { mode: lk.mode, con: lk.con, conScale: lk.conScale };
        const basis = j.basis === 'static' ? 'static' : 'stagnation';
        if (j.ctype === 'PRV' || j.ctype === 'PSV') {
          const v = si(j.setP, 'pressure'), down = j.ctype === 'PRV';
          lk.value = v;
          lk.basisOf = (sol, side) => basisP(cx, side === 'b' ? gnode(lk, sol, lk.b) : gnode(lk, sol, lk.a), basis, machAt(sol, side === 'b' ? net.Pout : net.Pin, side === 'b' ? lk.b : lk.a));
          lk.ctrl = {
            mode: down ? 'pDown' : 'pUp', conScale: 'P',
            con: (m, na, nb, sol) => basisP(cx, down ? nb : na, basis, machAt(sol, down ? net.Pout : net.Pin, down ? lk.b : lk.a)) - v,
          };
        } else if (j.ctype === 'FCV') {
          const f = net.flowExt(j.setQ, 1, j) || { m: 0 };
          if (f.m !== undefined) { lk.ctrl = { mode: 'fixedFlow', value: f.m }; lk.setMass = () => f.m; }
          else {
            lk.setMass = (na) => f.Q * PumpIt.gas.flow.rhoOf(cx, na.P, PumpIt.gas.flow.tempOf(cx, na));
            lk.ctrl = { mode: 'fixedFlow', value: f.Q * net.env.rhoN, conScale: 'M', con: (m, na) => m - lk.setMass(na) };
          }
          lk.value = lk.ctrl.value;
        } else {
          const v = si(j.setDP, 'dp');
          lk.ctrl = { mode: 'dP', conScale: 'P', con: (m, na, nb) => na.P - nb.P - v };
        }
        lk.controlMode = lk.ctrl.mode;
        lk.device = gasDevice;
      },
      results(j, jr, rc) {
        const vr = { type: j.type, m: rc.m, Q: jr.Q, QN: jr.QN, dP: rc.dP, Pin: jr.Pin, P0in: rc.P0in, K: jr.K, choked: jr.choked };
        vr.Cv = JS.gasEquivalentCv(jr.K, rc.el.d ? rc.el.d.A[0] : NaN);
        stateAndWarnings(j, vr, rc);
        rc.valves[j.id] = vr;
      },
    },
  });

  // state shown for the valve and the warnings of a valve that adds pressure or does not control
  function stateAndWarnings(j, vr, rc) {
    const s = rc.st[j.id];
    vr.state = t('junctions.states.' + (s === 'control' ? 'controlling' : s === 'open' ? 'fullyOpen' : 'closed'));
    vr.ctype = j.ctype;
    if (s === 'control' && rc.dP < 0) {
      vr.state = t('junctions.states.addingPressure');
      rc.warn('critical', t('junctions.control.warn.addingPressure', { id: j.id, dp: fmtSI(-rc.dP / KGF) }), 'j:' + j.id);
    }
    if (s !== 'control' && j.special === 'none') rc.warn('warning', t('junctions.control.warn.notControlling', { ctype: j.ctype, id: j.id, state: vr.state }), 'j:' + j.id);
  }

  // ---------- compressible mode helpers
  const gnode = (lk, sol, ix) => JS.gasNode(lk.pk, sol, ix);
  const machAt = JS.gasMachAt, basisP = JS.gasBasisP;
  // pressure drop the fully open valve needs for the mass flow m (Infinity when it cannot pass it)
  function openDrop(cx, lk, na, nb, m) {
    if (!(m > 0) || lk.open.mode !== 'loss') return 0;
    const Fw = PumpIt.gas.flow;
    const s = Fw.ductOut(cx, lk.d, 1, na, m / (lk.d.A[0] * lk.d.N));
    return s.ok ? na.P - Fw.outEq(cx, s, nb.pk) : Infinity;
  }
  const gasDevice = {
    initial: device.initial,
    configure(lk, s) {
      const o = s === 'open' ? lk.open : s === 'control' ? lk.ctrl : null;
      if (!o) { lk.mode = 'closed'; return; }
      lk.mode = o.mode; lk.con = o.con; lk.conScale = o.conScale;
      if (o.mode === 'fixedFlow') lk.value = o.value;
    },
    review(lk, sol, st, next, env) {
      const j = lk.j;
      if (j.special && j.special !== 'none') return;
      const cx = env.cx;
      const m = sol.m[lk.idx];
      const na = gnode(lk, sol, lk.a), nb = gnode(lk, sol, lk.b);
      const s = st[lk.jid];
      const dPreq = na.P - nb.P, dPopen = openDrop(cx, lk, na, nb, m);
      if (s === 'control') {
        if (j.alwaysControl) return;
        if (lk.ctype === 'FCV') { if (dPreq < dPopen) next[lk.jid] = j.failAction === 'closed' ? 'closed' : 'open'; }
        else if (lk.ctype === 'PRV' || lk.ctype === 'PSV') {
          if (m < 0) next[lk.jid] = 'closed';
          else if (dPreq < dPopen) next[lk.jid] = 'open';
        }
      } else if (s === 'open') {
        if (lk.ctype === 'PRV' && lk.basisOf(sol, 'b') > lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'PSV' && lk.basisOf(sol, 'a') < lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'FCV' && m > lk.setMass(na)) next[lk.jid] = 'control';
      } else if (s === 'closed') {
        if (lk.ctype === 'PRV' && na.P > nb.P && lk.basisOf(sol, 'b') < lk.value) next[lk.jid] = 'control';
        if (lk.ctype === 'PSV' && na.P > lk.value && na.P > nb.P) next[lk.jid] = 'control';
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
