// Result outputs: every column a results table can show, for a liquid and for a gas, in the groups of the column
// window; the columns each table shows by default (those it always had); and the rows of each table. No DOM: the
// Node tests load this file with the core. Values are SI, read from the results of the core (solver/results.js,
// gas/results.js and the junction types) or worked out here from them; the tables convert them to the unit of each
// column. The outputs and their formulas: docs/result-outputs.md.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const { t } = PumpIt.i18n;

  const TABLES = ['pipes', 'junctions', 'pumps', 'valves'];
  const REGIMES = ['liquid', 'gas'];
  // groups of the column window, in their order
  const GROUPS = ['ident', 'flow', 'press', 'loss', 'rise', 'lines', 'perf', 'bep', 'npsh', 'compressible', 'regime', 'coef', 'temp', 'fluid'];

  // Kv of a valve from its Cv. Cv: gpm with ΔP in psi, water at 60 °F (999 kg/m³); Kv: m³/h with ΔP in bar, 1000 kg/m³.
  // The same loss gives Kv = Cv·(3600·gpm)·√(10⁵·0.999/psi) ≈ 0.8645·Cv.
  const KV_PER_CV = 3600 * U.CATS.volFlow.gpm * Math.sqrt(1e5 * 0.999 / U.PSI);
  // speed of sound of the gas at a temperature T: a = √(k·Z·R·T)
  const sound = (fl, T) => Math.sqrt(fl.k * (fl.Z || 1) * fl.R * T);
  // highest and lowest static pressure along a pipe: at its ends (a liquid changes in a straight line between them) and,
  // for a gas, at the points of its profile
  function staticRange(r) {
    const ps = [r.Pin, r.Pout].concat(r.profile ? r.profile.map((p) => p[1]) : []);
    return ps.every(Number.isFinite) ? [Math.max(...ps), Math.min(...ps)] : [NaN, NaN];
  }
  const volume = (r) => r.A * r.L * r.N;
  const staticDrop = (r) => r.Pin - r.Pout;
  const head = (p, x) => p / (x.rho * x.g);

  // an output: k = the field of the row (or the name of the value v works out), g = its group, c = its unit category
  // ('txt': a text; none: a number without unit); more: u = its unit when not the default of the category, x = fixed
  // decimals (the classic columns of the pipe table, on screen and in Excel), v(row, ctx) = the value when it is
  // not the field k of the row, ctx = { rho, g, fluid, patm } of the results
  const o = (k, g, c, more) => Object.assign({ k, g }, c === 'txt' ? { t: 'txt' } : c ? { c } : {}, more);
  const ID = { k: 'id', t: 'id', g: 'ident' };

  const CATALOG = {
    liquid: {
      pipes: [
        ID, o('name', 'ident', 'txt'), o('dn', 'ident', 'txt'), o('schTxt', 'ident', 'txt'),
        o('L', 'ident', 'length'), o('Dh', 'ident', 'length', { u: 'mm' }), o('A', 'ident', 'area', { u: 'cm²' }),
        o('vol', 'ident', 'volume', { v: volume }),
        o('zin', 'ident', 'length', { x: '0.00' }), o('zout', 'ident', 'length', { x: '0.00' }),
        o('Q', 'flow', 'volFlow', { x: '0.00' }), o('m', 'flow', 'massFlow'), o('V', 'flow', 'velocity', { x: '0.00' }),
        o('P0in', 'press', 'pressure', { x: '0.000' }), o('P0out', 'press', 'pressure', { x: '0.000' }),
        o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'),
        o('Pmax', 'press', 'pressure', { v: (r) => staticRange(r)[0] }), o('Pmin', 'press', 'pressure', { v: (r) => staticRange(r)[1] }),
        o('dP0', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: staticDrop }), o('dPgrav', 'loss', 'dp'),
        o('dPfric', 'loss', 'dp'), o('dPfit', 'loss', 'dp'), o('dPend', 'loss', 'dp'),
        o('hL', 'loss', 'head'), o('hLgrad', 'loss', 'headGradient', { v: (r) => r.hL / r.L }),
        o('dPgrad', 'loss', 'dpGradient', { v: (r, x) => r.hL * x.rho * x.g / r.L }),
        o('HGLin', 'lines', 'head'), o('HGLout', 'lines', 'head'), o('EGLin', 'lines', 'head'), o('EGLout', 'lines', 'head'),
        o('Re', 'regime'), o('f', 'regime'), o('regime', 'regime', 'txt'), o('K', 'regime', '', { x: '0.00' }), o('eD', 'regime'),
        o('rho', 'fluid', 'density', { v: (r, x) => x.rho }), o('mu', 'fluid', 'viscosity', { v: (r, x) => x.fluid.mu }),
      ],
      junctions: [
        ID, o('name', 'ident', 'txt'), o('typeLabel', 'ident', 'txt'), o('z', 'ident', 'length'),
        o('Qt', 'flow', 'volFlow'), o('m', 'flow', 'massFlow'), o('Qnet', 'flow', 'volFlow'), o('mnet', 'flow', 'massFlow'),
        o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'), o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'),
        o('dP', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: (r) => (r.two ? staticDrop(r) : undefined) }),
        o('hL', 'loss', 'head', { v: (r, x) => head(r.dP, x) }),
        o('HGL', 'lines', 'head'), o('HGLout', 'lines', 'head', { v: (r, x) => head(r.Pout, x) + r.z }),
        o('EGLin', 'lines', 'head', { v: (r, x) => head(r.P0in, x) + r.z }), o('EGLout', 'lines', 'head', { v: (r, x) => head(r.P0out, x) + r.z }),
        o('K', 'coef'),
      ],
      pumps: [
        ID, o('name', 'ident', 'txt'), o('stateTxt', 'ident', 'txt'),
        o('Q', 'flow', 'volFlow'), o('m', 'flow', 'massFlow'),
        o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'), o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'),
        o('dH', 'rise', 'head'), o('dP', 'rise', 'dp'), o('dPs', 'rise', 'dp', { v: (r) => r.Pout - r.Pin }),
        o('speed', 'perf'), o('etaPct', 'perf'), o('Pideal', 'perf', 'power'), o('Pshaft', 'perf', 'power'),
        o('QBEP', 'bep', 'volFlow'), o('bepPct', 'bep'),
        o('NPSHA', 'npsh', 'head'), o('NPSHR', 'npsh', 'head'),
        o('NPSHmargin', 'npsh', 'head', { v: (r) => r.NPSHA - r.NPSHR }), o('NPSHratio', 'npsh', '', { v: (r) => r.NPSHA / r.NPSHR }),
      ],
      valves: [
        ID, o('name', 'ident', 'txt'), o('typeLabel', 'ident', 'txt'), o('state', 'ident', 'txt'),
        o('Q', 'flow', 'volFlow'), o('m', 'flow', 'massFlow'),
        o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'), o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'),
        o('dP', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: staticDrop }), o('hL', 'loss', 'head', { v: (r, x) => head(r.dP, x) }),
        o('Cv', 'coef'), o('Kv', 'coef', '', { v: (r) => r.Cv * KV_PER_CV }), o('K', 'coef'),
      ],
    },
    // compressible mode (R-25): heads (HGL, EGL, head loss) mean nothing for a gas and are left out
    gas: {
      pipes: [
        ID, o('name', 'ident', 'txt'), o('dn', 'ident', 'txt'), o('schTxt', 'ident', 'txt'),
        o('L', 'ident', 'length'), o('Dh', 'ident', 'length', { u: 'mm' }), o('A', 'ident', 'area', { u: 'cm²' }),
        o('vol', 'ident', 'volume', { v: volume }), o('zin', 'ident', 'length', { x: '0.00' }), o('zout', 'ident', 'length', { x: '0.00' }),
        o('m', 'flow', 'massFlow'), o('Q', 'flow', 'volFlow', { x: '0.00' }), o('Qout', 'flow', 'volFlow'), o('QN', 'flow', 'normFlow'),
        // V: the higher velocity of the two ends, the one of the pipe panel and of the velocity warning
        o('V', 'flow', 'velocity', { x: '0.00' }), o('Vin', 'flow', 'velocity'), o('Vout', 'flow', 'velocity'),
        o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'), o('P0in', 'press', 'pressure', { x: '0.000' }), o('P0out', 'press', 'pressure', { x: '0.000' }),
        o('Pmax', 'press', 'pressure', { v: (r) => staticRange(r)[0] }), o('Pmin', 'press', 'pressure', { v: (r) => staticRange(r)[1] }),
        o('dP0', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: staticDrop }), o('dPgrav', 'loss', 'dp'),
        o('dPfric', 'loss', 'dp'), o('dPfit', 'loss', 'dp'), o('dPgrad', 'loss', 'dpGradient', { v: (r) => (r.dPfric + r.dPfit) / r.L }),
        o('Min', 'compressible'), o('Mout', 'compressible'),
        o('ain', 'compressible', 'velocity', { v: (r, x) => sound(x.fluid, r.Tin) }), o('aout', 'compressible', 'velocity', { v: (r, x) => sound(x.fluid, r.Tout) }),
        o('chokedTxt', 'compressible', 'txt'),
        o('Re', 'regime'), o('f', 'regime'), o('regime', 'regime', 'txt'), o('K', 'regime', '', { x: '0.00' }), o('eD', 'regime'),
        o('Tin', 'temp', 'temperature'), o('Tout', 'temp', 'temperature'), o('T0in', 'temp', 'temperature'), o('T0out', 'temp', 'temperature'),
        o('rhoIn', 'fluid', 'density'), o('rhoOut', 'fluid', 'density'), o('mu', 'fluid', 'viscosity', { v: (r, x) => x.fluid.mu }),
      ],
      junctions: [
        ID, o('name', 'ident', 'txt'), o('typeLabel', 'ident', 'txt'), o('z', 'ident', 'length'),
        o('m', 'flow', 'massFlow'), o('Q', 'flow', 'volFlow'), o('QN', 'flow', 'normFlow'),
        o('mnet', 'flow', 'massFlow'), o('QNnet', 'flow', 'normFlow', { v: (r, x) => r.mnet / x.fluid.rhoN }), o('massErr', 'flow', 'massFlow'),
        o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'), o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'),
        o('dP', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: (r) => (r.two ? staticDrop(r) : undefined) }),
        o('chokedTxt', 'compressible', 'txt'), o('K', 'coef'),
        o('Tin', 'temp', 'temperature'), o('Tout', 'temp', 'temperature'), o('T0in', 'temp', 'temperature'), o('T0out', 'temp', 'temperature'),
        o('rho', 'fluid', 'density'),
      ],
      pumps: [
        ID, o('name', 'ident', 'txt'), o('stateTxt', 'ident', 'txt'),
        o('m', 'flow', 'massFlow'), o('Q', 'flow', 'volFlow'), o('QN', 'flow', 'normFlow'),
        o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'), o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'),
        o('ratio', 'rise'), o('dP', 'rise', 'dp'), o('dPs', 'rise', 'dp', { v: (r) => r.Pout - r.Pin }), o('dHs', 'rise', 'head'),
        o('speed', 'perf'), o('etaPct', 'perf'), o('Pgas', 'perf', 'power'),
        o('QBEP', 'bep', 'volFlow'), o('bepPct', 'bep'),
        o('T0in', 'temp', 'temperature'), o('T0out', 'temp', 'temperature'),
      ],
      valves: [
        ID, o('name', 'ident', 'txt'), o('typeLabel', 'ident', 'txt'), o('state', 'ident', 'txt'),
        o('m', 'flow', 'massFlow'), o('Q', 'flow', 'volFlow'), o('QN', 'flow', 'normFlow'),
        o('Pin', 'press', 'pressure'), o('Pout', 'press', 'pressure'), o('P0in', 'press', 'pressure'), o('P0out', 'press', 'pressure'),
        o('dP', 'loss', 'dp'), o('dPs', 'loss', 'dp', { v: staticDrop }),
        o('chokedTxt', 'compressible', 'txt'),
        o('K', 'coef'), o('Cv', 'coef'), o('Kv', 'coef', '', { v: (r) => r.Cv * KV_PER_CV }),
      ],
    },
  };

  // the columns of each table before they could be chosen: still the default ones, except that a gas pipe shows those
  // of a liquid pipe (its flow at the inlet, its higher velocity)
  const DEFAULTS = {
    liquid: {
      pipes: ['id', 'dn', 'schTxt', 'zin', 'zout', 'Q', 'V', 'P0in', 'P0out', 'K'],
      junctions: ['id', 'name', 'typeLabel', 'P0in', 'P0out', 'Pin', 'Pout', 'dP', 'K', 'Qt', 'HGL', 'z'],
      pumps: ['id', 'name', 'Q', 'dH', 'dP', 'speed', 'etaPct', 'Pideal', 'Pshaft', 'NPSHA', 'NPSHR'],
      valves: ['id', 'name', 'typeLabel', 'state', 'Q', 'dP', 'Pin', 'Cv', 'K'],
    },
    gas: {
      pipes: ['id', 'dn', 'schTxt', 'zin', 'zout', 'Q', 'V', 'P0in', 'P0out', 'K'],
      junctions: ['id', 'name', 'typeLabel', 'Pin', 'Pout', 'P0in', 'P0out', 'Tin', 'T0in', 'dP', 'm', 'Q', 'massErr', 'z'],
      pumps: ['id', 'name', 'm', 'Q', 'ratio', 'dP', 'T0out', 'Pgas', 'stateTxt'],
      valves: ['id', 'name', 'typeLabel', 'state', 'm', 'Q', 'dP', 'Pin', 'K', 'chokedTxt'],
    },
  };

  const outputs = (regime, table) => CATALOG[regime][table];
  const find = (regime, table, k) => outputs(regime, table).find((e) => e.k === k);
  const defaults = (regime, table) => DEFAULTS[regime][table];
  // header of a column, in the catalogs results.columns (liquid) and results.gasColumns (gas)
  const label = (regime, table, k) => t((regime === 'gas' ? 'results.gasColumns.' : 'results.columns.') + table + '.' + k);
  const value = (e, row, ctx) => (e.v ? e.v(row, ctx) : row[e.k]);
  const ctxOf = (res) => ({ rho: res.fluid.rho, patm: res.patm, g: res.g, fluid: res.fluid });

  // the rows of a table: the result of each object with the fields its outputs read. hooks: what the interface knows,
  //   dn(p, r), series(p)   the nominal size and series of a pipe (or its inner diameter)
  //   boundary(j, r)        the net mass flow into the network at a junction (NaN: not a boundary)
  function rows(table, res, eff, hooks) {
    const name = (k) => (M.getObj(eff, k) || {}).name || '';
    const choked = (r) => (r.choked ? t('results.gas.choked') : '');
    // the pressures at both sides of a pump or of a valve between two pipes, from its junction
    const sides = (jr) => {
      const s = {};
      if (jr && !('net' in jr)) for (const k of ['P0in', 'P0out', 'Pin', 'Pout']) if (k in jr) s[k] = jr[k];
      return s;
    };
    if (table === 'pipes') return eff.pipes.map((p) => {
      const r = res.pipes[p.id] || {};
      return Object.assign({ id: p.id, name: p.name, key: 'p:' + p.id }, r, { dn: hooks.dn(p, r), schTxt: hooks.series(p), chokedTxt: choked(r) });
    });
    if (table === 'junctions') return eff.junctions.map((j) => {
      const r = res.junctions[j.id] || {};
      const net = hooks.boundary(j, r);
      // a two-port junction (no net flow of its own) has a static pressure drop between its pipes
      return Object.assign({ id: j.id, name: j.name, key: 'j:' + j.id, typeLabel: M.JT[j.type].label, Qt: r.m / res.fluid.rho }, r,
        { two: !('net' in r), mnet: net, Qnet: net / res.fluid.rho, chokedTxt: choked(r) });
    });
    if (table === 'pumps') return Object.entries(res.pumps).map(([id, r]) => Object.assign(
      { id: +id, name: name('j:' + id), key: 'j:' + id, etaPct: r.etaAssumed ? NaN : r.eta * 100, stateTxt: t('junctions.pump.form.' + r.state) },
      sides(res.junctions[id]), r));
    // a control valve shows its kind next to the type ("Control valve PRV")
    if (table === 'valves') return Object.entries(res.valves).map(([id, r]) => Object.assign(
      { id: +id, name: name('j:' + id), key: 'j:' + id, typeLabel: M.JT[r.type].label + (r.ctype ? ' ' + r.ctype : '') },
      sides(res.junctions[id]), r, { chokedTxt: choked(r) }));
    return [];
  }

  PumpIt.ui = PumpIt.ui || {};
  PumpIt.ui.resultCatalog = { TABLES, REGIMES, GROUPS, KV_PER_CV, outputs, find, defaults, label, value, ctxOf, rows };
})(typeof window !== 'undefined' ? window : globalThis);
