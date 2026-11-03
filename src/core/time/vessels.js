// Finite gas vessels of the time simulation in the compressible mode (docs/time-simulation.md, §11 of its specification):
// a reservoir of a fixed volume whose gas the simulation follows by its mass and, in the adiabatic model, its internal
// energy (an ideal gas with the Z of the system). At every step the vessel is the gas reservoir of today: a node at the
// stagnation pressure and the temperature of its gas. Its walls exchange no heat; the gas that leaves takes the
// temperature of the vessel, and the gas that comes in brings the stagnation temperature of its pipe.
//
//   j.vessel = { model: 'infinite' | 'finite', volume }
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const q = M.q;

  const MODELS = ['infinite', 'finite'];
  const isFinite = (j) => !!(j && j.vessel && typeof j.vessel === 'object' && j.vessel.model === 'finite');
  const newVessel = () => ({ model: 'finite', volume: q(1, 'm³') });

  // what is missing in a finite vessel, as keys under core.checklist.vessel
  function check(j) {
    const v = j.vessel, out = [];
    if (!MODELS.includes(v.model)) out.push('model');
    else if (!(v.volume && Number.isFinite(v.volume.value) && v.volume.value > 0 && U.has('volume', v.volume.unit))) out.push('volume');
    return out;
  }

  // a finite vessel in SI: its volume, the pipes that reach it (the end of each one at the vessel) and its gas at the start
  // (the pressure of the reservoir, absolute, and the temperature of the gas it supplies, or the one of the system in the
  // isothermal model). gp = { R, Z, cv, adiabatic, T } of the gas of the model
  function prepare(j, eff, si, gp) {
    const V = si(j.vessel.volume, 'volume');
    const T0 = gp.adiabatic && j.gasT && Number.isFinite(j.gasT.value) ? si(j.gasT, 'temperature') : gp.T;
    const P0 = si(j.surfP, 'pressure');
    const M0 = (P0 * V) / (gp.Z * gp.R * T0);
    return {
      jid: j.id, V, T0, P0, M0, U0: M0 * gp.cv * T0,
      conns: M.pipesAt(eff, j.id).map((p) => ({ pid: p.id, up: p.up === j.id })),
    };
  }

  // the mass flows of a vessel in a solution (kg/s): what comes in (and its enthalpy as Σ ṁ·T0, with the stagnation
  // temperature of each pipe at the vessel), what goes out, and the net flow in
  function flows(Vs, sol) {
    let min = 0, mout = 0, hin = 0;
    for (const c of Vs.conns) {
      const r = sol.pipes[c.pid];
      if (!r || !Number.isFinite(r.m)) continue;
      const into = c.up ? -r.m : r.m;
      if (into > 0) { min += into; hin += into * (c.up ? r.T0in : r.T0out); } else mout -= into;
    }
    return { min, mout, hin, mnet: min - mout };
  }

  // the gas after an interval dt with the flows f, from its mass M, its internal energy Uin and its temperature T
  // (§11): the mass by its balance; the temperature from the energy (adiabatic) or kept (isothermal); the pressure from
  // the law of the gas. Null when the vessel would empty in the interval
  function after(Vs, gp, s, f, dt) {
    const Mn = s.M + dt * f.mnet;
    if (!(Mn > 0)) return null;
    let Un = s.U, Tn = s.T;
    if (gp.adiabatic) {
      Un = s.U + dt * gp.cp * (f.hin - f.mout * s.T);
      Tn = Un / (Mn * gp.cv);
      if (!(Tn > 0)) return null;
    } else Un = Mn * gp.cv * Tn;
    return { M: Mn, U: Un, T: Tn, P: (Mn * gp.Z * gp.R * Tn) / Vs.V };
  }

  PumpIt.time = Object.assign(PumpIt.time || {}, { vessels: { MODELS, isFinite, newVessel, check, prepare, flows, after } });
})(typeof window !== 'undefined' ? window : globalThis);
