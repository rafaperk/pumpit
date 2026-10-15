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
      const s = rc.st[j.id];
      vr.state = t('junctions.states.' + (s === 'control' ? 'controlling' : s === 'open' ? 'fullyOpen' : 'closed'));
      vr.ctype = j.ctype;
      if (s === 'control' && rc.dP < 0) {
        vr.state = t('junctions.states.addingPressure');
        rc.warn('critical', t('junctions.control.warn.addingPressure', { id: j.id, dp: fmtSI(-rc.dP / KGF) }), 'j:' + j.id);
      }
      if (s !== 'control' && j.special === 'none') rc.warn('warning', t('junctions.control.warn.notControlling', { ctype: j.ctype, id: j.id, state: vr.state }), 'j:' + j.id);
      rc.valves[j.id] = vr;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
