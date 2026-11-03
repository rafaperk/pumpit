// Finite tanks of the time simulation (docs/time-simulation.md, §6 of its specification). A reservoir with j.tank of
// model 'open' or 'closed' is a tank of a given geometry whose level the simulation calculates: a constant section, a
// table of volume against the height over the bottom, or a horizontal cylinder. The state of a tank is its volume (so
// the mass is kept exactly); the level comes from it. A closed tank holds a gas over the liquid, polytropic between
// a relief and a vent pressure (§6.5). In the steady state, and in the first step, a finite tank is the reservoir of
// today, unless its level or its pressure is unknown at the start (§6.6).
//
//   j.tank = { model: 'infinite' | 'open' | 'closed', bottom, height, shape: 'constant' | 'table' | 'horizontalCylinder',
//              area, table: { h: [], V: [], hUnit, vUnit }, diameter, length, gas: { n, pMax, pMin },
//              known: { level, pressure } }
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const q = M.q;

  const MODELS = ['infinite', 'open', 'closed'];
  const SHAPES = ['constant', 'table', 'horizontalCylinder'];
  const isFinite = (j) => !!(j && j.tank && typeof j.tank === 'object' && j.tank.model && j.tank.model !== 'infinite');
  const isClosed = (j) => isFinite(j) && j.tank.model === 'closed';
  // the level and the pressure at the start are known unless the tank says otherwise
  const knownOf = (tk) => ({ level: !(tk.known && tk.known.level === false), pressure: !(tk.known && tk.known.pressure === false) });

  // a tank for reservoir j, as the inspector first offers it: open, its bottom at the elevation of the junction, 10 m high
  // (or up to twice the level), a constant section of 10 m²; a closed one holds an isothermal gas without relief or vent
  function newTank(j) {
    const z = j.elevation && Number.isFinite(j.elevation.value) ? j.elevation : q(0, 'm');
    const lv = j.liquidElev && Number.isFinite(j.liquidElev.value) ? U.toSI(j.liquidElev.value, j.liquidElev.unit, 'length') : NaN;
    const zb = U.toSI(z.value, z.unit, 'length');
    const h = Number.isFinite(lv) && lv > zb ? Math.max(10, Math.ceil(2 * (lv - zb))) : 10;
    return {
      model: 'open', bottom: M.clone(z), height: q(h, 'm'), shape: 'constant', area: q(10, 'm²'),
      table: { h: [0, h], V: [0, 10 * h], hUnit: 'm', vUnit: 'm³' },
      diameter: q(2, 'm'), length: q(5, 'm'),
      gas: { n: 1, pMax: q(null, 'kgf/cm²(g)'), pMin: q(null, 'kgf/cm²(g)') },
      known: { level: true, pressure: true },
    };
  }

  // ---------- geometry (a prepared tank: zb, H, and A, hs/Vs or R/L, all in SI)
  // a horizontal cylinder of radius R and length L filled to h: the area of the circular segment times L
  const cylVolume = (R, L, h) => {
    const x = Math.min(2 * R, Math.max(0, h));
    return L * (R * R * Math.acos((R - x) / R) - (R - x) * Math.sqrt(Math.max(0, 2 * R * x - x * x)));
  };
  function volumeOf(T, h) {
    if (T.R) return cylVolume(T.R, T.L, h);
    if (!T.hs) return T.A * h;
    const { hs, Vs } = T, n = hs.length;
    let i = 0;
    while (i < n - 2 && h > hs[i + 1]) i++;
    return Vs[i] + (Vs[i + 1] - Vs[i]) * (h - hs[i]) / (hs[i + 1] - hs[i]);
  }
  function levelOf(T, V) {
    if (T.R) {
      // the inverse of the segment by bisection, to 10⁻¹² m (§6.2)
      if (V <= 0) return 0;
      if (V >= T.Vmax) return T.H;
      let lo = 0, hi = 2 * T.R;
      while (hi - lo > 1e-12) { const mid = (lo + hi) / 2; if (cylVolume(T.R, T.L, mid) < V) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }
    if (!T.hs) return V / T.A;
    const { hs, Vs } = T, n = hs.length;
    let i = 0;
    while (i < n - 2 && V > Vs[i + 1]) i++;
    return hs[i] + (hs[i + 1] - hs[i]) * (V - Vs[i]) / (Vs[i + 1] - Vs[i]);
  }

  // checklist of a finite tank (with the time simulation on): what is missing, as catalog keys under
  // core.checklist.tank (src/core/model/validation.js adds them to the items of the junction). ctx: { patm } turns a
  // gauge pressure into an absolute one
  function check(j, ctx = {}) {
    const tk = j.tank, out = [];
    const fin = (x) => x && Number.isFinite(x.value);
    const has = (x, cat) => fin(x) && U.has(cat, x.unit);
    const abs = (x) => U.toSI(x.value, x.unit, 'pressure', ctx);
    if (!MODELS.includes(tk.model)) { out.push('model'); return out; }
    if (!has(tk.bottom, 'length')) out.push('bottom');
    const cyl = tk.shape === 'horizontalCylinder';
    // the height of a horizontal cylinder is its diameter
    if (!cyl && !(has(tk.height, 'length') && tk.height.value > 0)) out.push('height');
    if (!SHAPES.includes(tk.shape)) out.push('shape');
    else if (tk.shape === 'constant') { if (!(has(tk.area, 'area') && tk.area.value > 0)) out.push('area'); }
    else if (cyl) {
      if (!(has(tk.diameter, 'length') && tk.diameter.value > 0)) out.push('diameter');
      if (!(has(tk.length, 'length') && tk.length.value > 0)) out.push('length');
    } else {
      const tb = tk.table || {};
      const ok = Array.isArray(tb.h) && Array.isArray(tb.V) && tb.h.length >= 2 && tb.h.length === tb.V.length
        && U.has('length', tb.hUnit) && U.has('volume', tb.vUnit) && tb.h.every(Number.isFinite) && tb.V.every(Number.isFinite);
      const rising = (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
      if (!ok || tb.h[0] !== 0 || tb.V[0] !== 0 || !rising(tb.h) || !rising(tb.V)) out.push('table');
      else if (has(tk.height, 'length') && U.toSI(tb.h[tb.h.length - 1], tb.hUnit, 'length') < U.toSI(tk.height.value, tk.height.unit, 'length') * (1 - 1e-12)) out.push('tableShort');
    }
    const kn = knownOf(tk);
    if (!kn.level && !kn.pressure) out.push('known');
    else if (!kn.pressure && tk.model !== 'closed') out.push('knownOpen');
    if (tk.model === 'closed') {
      const g = tk.gas || {};
      if (!(Number.isFinite(g.n) && g.n > 0)) out.push('n');
      const pOk = (x) => !fin(x) || (U.has('pressure', x.unit) && abs(x) > 0);
      if (!pOk(g.pMax)) out.push('pMax');
      if (!pOk(g.pMin)) out.push('pMin');
      if (fin(g.pMax) && fin(g.pMin) && pOk(g.pMax) && pOk(g.pMin) && !(abs(g.pMin) < abs(g.pMax))) out.push('pRange');
      // the pressure at the start: of the gas, absolute above zero and between the vent and the relief
      if (kn.pressure && has(j.surfP, 'pressure')) {
        const P0 = abs(j.surfP);
        if (!(P0 > 0)) out.push('p0');
        else if ((fin(g.pMax) && pOk(g.pMax) && P0 > abs(g.pMax) * (1 + 1e-9)) || (fin(g.pMin) && pOk(g.pMin) && P0 < abs(g.pMin) * (1 - 1e-9))) out.push('p0Range');
      }
    }
    if (!out.length && kn.level && fin(j.liquidElev) && U.has('length', j.liquidElev.unit)) {
      const zb = U.toSI(tk.bottom.value, tk.bottom.unit, 'length');
      const H = U.toSI((cyl ? tk.diameter : tk.height).value, (cyl ? tk.diameter : tk.height).unit, 'length');
      const z = U.toSI(j.liquidElev.value, j.liquidElev.unit, 'length');
      if (z < zb - 1e-9 || z > zb + H + 1e-9) out.push('level');
      // a closed tank needs room for its gas
      else if (tk.model === 'closed' && z >= zb + H - 1e-9) out.push('levelClosed');
    }
    return out;
  }

  // a finite tank in SI, for the simulation: its geometry, the volume at the start and when full, the elevation where
  // each pipe connects, fixed at the start (a depth below the surface becomes an elevation, §6.1), and for a closed tank
  // its gas: the exponent, the relief and vent pressures (absolute) and the constant of the gas at the start
  function prepare(j, eff, si) {
    const tk = j.tank;
    const T = { jid: j.id, zb: si(tk.bottom, 'length'), H: NaN, A: NaN, hs: null, Vs: null, R: 0, L: 0, closed: tk.model === 'closed', known: knownOf(tk) };
    if (tk.shape === 'horizontalCylinder') {
      T.R = si(tk.diameter, 'length') / 2; T.L = si(tk.length, 'length'); T.H = 2 * T.R;
    } else {
      T.H = si(tk.height, 'length');
      if (tk.shape === 'table') {
        T.hs = tk.table.h.map((x) => U.toSI(x, tk.table.hUnit, 'length'));
        T.Vs = tk.table.V.map((x) => U.toSI(x, tk.table.vUnit, 'volume'));
      } else T.A = si(tk.area, 'area');
    }
    T.Vmax = volumeOf(T, T.H);
    const z0 = si(j.liquidElev, 'length');
    // a level a hair outside the tank (the checklist allows 1e-9 m) is taken at the bottom or at the top
    T.V0 = Math.min(T.Vmax, Math.max(0, volumeOf(T, Math.min(T.H, Math.max(0, z0 - T.zb)))));
    const def = PumpIt.junctionTypes.get(j.type);
    const zJ = si(j.elevation, 'length');
    T.conns = M.pipesAt(eff, j.id).map((p) => {
      const pk = j.pipeK && j.pipeK[p.id];
      const z = def.pipeEndElevation ? def.pipeEndElevation(j, pk, si) : undefined;
      return { pid: p.id, z: z === undefined ? zJ : z, up: p.up === j.id };
    });
    if (T.closed) {
      const g = tk.gas;
      const fin = (x) => x && Number.isFinite(x.value);
      T.n = g.n;
      T.pMax = fin(g.pMax) ? si(g.pMax, 'pressure') : Infinity;
      T.pMin = fin(g.pMin) ? si(g.pMin, 'pressure') : 0;
      T.P0 = si(j.surfP, 'pressure');
      T.C0 = T.P0 * Math.pow(T.Vmax - T.V0, T.n);
    }
    return T;
  }

  // what a step sees of a tank at the volume V: the level over the bottom, the elevation of the surface
  const surface = (T, V) => { const h = levelOf(T, V); return { h, zs: T.zb + h }; };

  // ---------- the gas of a closed tank (§6.5): P·Vg^n = C, absolute pressures. pMax relieves the gas and pMin lets gas in;
  // both change the constant. The pressure of a tank full of liquid (no gas left) is that of the relief.
  //   → { P, C, valve: 'relief' | 'vent' | '', full }
  function gasAt(T, V, C, pMax = T.pMax) {
    const Vg = T.Vmax - V;
    if (Vg <= 1e-9 * T.Vmax) return { P: pMax, C, valve: 'relief', full: true };
    const P = C / Math.pow(Vg, T.n);
    if (P > pMax) return { P: pMax, C: pMax * Math.pow(Vg, T.n), valve: 'relief', full: false };
    if (P < T.pMin) return { P: T.pMin, C: T.pMin * Math.pow(Vg, T.n), valve: 'vent', full: false };
    return { P, C, valve: '', full: false };
  }

  PumpIt.time = Object.assign(PumpIt.time || {}, { tanks: { MODELS, SHAPES, isFinite, isClosed, knownOf, newTank, volumeOf, levelOf, surface, check, prepare, gasAt } });
})(typeof window !== 'undefined' ? window : globalThis);
