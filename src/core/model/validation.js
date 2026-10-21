// Checklist: the model only runs when the solution control, the fluid and every pipe and junction are
// defined (specification section 2). Junction-type specific checks live in each type's validate().
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model;
  const types = PumpIt.junctionTypes;
  const { t } = PumpIt.i18n;

  // unknown units (corrupted file or a file from another version)
  const known = (u) => Object.values(PumpIt.units.CATS).some((c) => u in c);
  function badUnits(o, out = new Set()) {
    if (!o || typeof o !== 'object') return out;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'unit' || k === 'xUnit' || k === 'yUnit') && typeof v === 'string' && v !== '' && !known(v)) out.add(v);
      else if (v && typeof v === 'object') badUnits(v, out);
    }
    return out;
  }
  const unitMiss = (o) => { const b = badUnits(o); return b.size ? [t('core.checklist.unknownUnit', { units: [...b].join(', ') })] : []; };

  const pos = (x) => x && Number.isFinite(x.value) && x.value > 0;
  const fin = (x) => x && Number.isFinite(x.value);
  const curveOk = (c, min = 1) => c && c.x.length >= min && c.x.every(Number.isFinite) && c.y.every(Number.isFinite);

  function checkPipe(m, p) {
    const miss = unitMiss(p);
    const need = (k) => miss.push(t('core.checklist.pipe.' + k));
    if (!m.junctions.some((j) => j.id === p.up) || !m.junctions.some((j) => j.id === p.down)) need('connect');
    if (p.up !== null && p.up !== undefined && p.up === p.down) need('sameEnds');
    if (!pos(p.length)) need('length');
    const g = p.geometry;
    if (g.kind === 'circular' && !pos(g.d)) need('diameter');
    if (g.kind === 'annulus' && !(pos(g.dOuter) && fin(g.dInner) && g.dOuter.value > 0)) need('annulus');
    if (g.kind === 'rectangular' && !(pos(g.width) && pos(g.height))) need('rectangle');
    if (g.kind === 'noncircular' && !(pos(g.area) && pos(g.perim))) need('noncircular');
    const f = p.friction;
    if (f.model === 'roughness' && !(fin(f.eps) && f.eps.value >= 0)) need('roughness');
    if (f.model === 'relRoughness' && !(f.rel >= 0)) need('relRoughness');
    if (f.model === 'explicitF' && !(f.f > 0)) need('frictionFactor');
    if (f.model === 'hw' && !(f.C > 0)) need('hwC');
    if (!(Number.isInteger(p.nParallel) && p.nParallel >= 1)) need('nParallel');
    if (!(p.idReduction >= 0 && p.idReduction < 100)) need('idReduction');
    return miss;
  }

  function checkJunction(m, j) {
    const miss = unitMiss(j);
    const def = types.get(j.type);
    const n = M.pipesAt(m, j.id).length;
    const [min, max] = def.pipes;
    if (n < min || n > max) {
      miss.push(min === max ? t('core.checklist.junction.pipesExact', { n: min, has: n }) : t('core.checklist.junction.pipesRange', { min, max, has: n }));
    }
    if (!fin(j.elevation)) miss.push(t('core.checklist.junction.elevation'));
    // temperature of the gas a source supplies (compressible mode, adiabatic model): empty, or above absolute zero
    if (fin(j.gasT) && !(PumpIt.units.toSI(j.gasT.value, j.gasT.unit, 'temperature') > 0)) miss.push(t('core.checklist.junction.gasT'));
    if (!def.multi && n === 2) {
      const pr = M.ports(m, j);
      if (def.directional && pr && !pr.consistent) miss.push(t('core.checklist.junction.direction'));
    }
    if (def.validate) def.validate(j, miss, { fin, pos, curveOk, pipeCount: n, gas: M.isCompressible(m), gasP: gasPressure(m, miss) });
    return miss;
  }

  // compressible mode (R-13): a pressure is gauge or absolute by its unit, and the gas is calculated in absolute pressure,
  // so a pressure the calculation takes must be above vacuum once a gauge value is added to the atmospheric pressure of
  // the system. gasP(x, key) checks one such field of a junction; key names the field in the catalogs. A liquid is not
  // checked, nor a field another item already reports (empty, a unit that is not a pressure, no valid atmospheric pressure).
  function gasPressure(m, miss) {
    const U = PumpIt.units, pa = m.system.patm;
    const patm = M.isCompressible(m) && fin(pa) && U.has('pressure', pa.unit) ? U.toSI(pa.value, pa.unit, 'pressure') : NaN;
    return (x, key) => {
      if (!(patm > 0) || !fin(x) || !U.has('pressure', x.unit)) return;
      if (!(U.toSI(x.value, x.unit, 'pressure', { patm }) > 0)) miss.push(t('core.checklist.junction.vacuum', { what: t(key) }));
    };
  }

  // the gas of the compressible mode (§8.5): temperature above absolute zero and Z > 0; a custom gas also MW > 0,
  // k > 1 and μ > 0. The atmospheric pressure above zero (R-13) and the design limits of the warnings too.
  function checkGas(sys) {
    const g = sys.fluidGas || {};
    const miss = [];
    const T = fin(g.T) ? PumpIt.units.toSI(g.T.value, g.T.unit, 'temperature') : NaN;
    if (!(T > 0)) miss.push(t('core.checklist.gas.temperature'));
    if (!(g.Z > 0)) miss.push(t('core.checklist.gas.Z'));
    if (!PumpIt.fluids.gasById(g.gas)) {
      if (!(g.MW > 0)) miss.push(t('core.checklist.gas.molarMass'));
      if (!(g.k > 1)) miss.push(t('core.checklist.gas.kRatio'));
      if (!pos(g.mu)) miss.push(t('core.checklist.gas.viscosity'));
    }
    const pa = sys.patm;
    if (!(fin(pa) && PumpIt.units.has('pressure', pa.unit) && PumpIt.units.toSI(pa.value, pa.unit, 'pressure') > 0)) miss.push(t('core.checklist.gas.patm'));
    if (!(sys.machLimit > 0)) miss.push(t('core.checklist.gas.machLimit'));
    if (!pos(sys.gasVelLimit)) miss.push(t('core.checklist.gas.velocityLimit'));
    return miss;
  }

  function checkFluid(sys) {
    const f = sys.fluid;
    const um = unitMiss(sys);
    if (um.length) return um;
    if (sys.regime === 'compressible') return checkGas(sys);
    if (PumpIt.fluids.LIBRARY[f.kind]) return fin(f.T) ? [] : [t('core.checklist.fluid.temperature')]; // library fluid: by temperature
    const miss = [];
    if (!pos(f.rho)) miss.push(t('core.checklist.fluid.density'));
    if (!pos(f.mu)) miss.push(t('core.checklist.fluid.viscosity'));
    return miss;
  }

  function validate(eff) {
    const undef = new Map();
    eff.pipes.forEach((p) => { const mm = checkPipe(eff, p); if (mm.length) undef.set('p:' + p.id, mm); });
    eff.junctions.forEach((j) => { const mm = checkJunction(eff, j); if (mm.length) undef.set('j:' + j.id, mm); });
    const fluidMiss = checkFluid(eff.system);
    const s = eff.solution;
    const solOk = s.tolRel > 0 && s.maxIter >= 1 && s.relax > 0 && s.relax <= 1;
    const pipesBad = [...undef.keys()].filter((k) => k[0] === 'p').length;
    const jBad = [...undef.keys()].filter((k) => k[0] === 'j').length;
    // key: the object the item checks, where it has one (the solution control and the system)
    const items = [
      { key: 'sol', label: t('core.checklist.items.solution'), ok: solOk },
      { key: 'sys', label: t('core.checklist.items.system'), ok: fluidMiss.length === 0, detail: fluidMiss.join(', ') },
      { label: t('core.checklist.items.pipes'), ok: eff.pipes.length > 0 && pipesBad === 0, detail: eff.pipes.length ? t('core.checklist.items.pipesIncomplete', { bad: pipesBad, n: eff.pipes.length }) : t('core.checklist.items.noPipes') },
      { label: t('core.checklist.items.junctions'), ok: eff.junctions.length > 0 && jBad === 0, detail: eff.junctions.length ? t('core.checklist.items.junctionsIncomplete', { bad: jBad, n: eff.junctions.length }) : t('core.checklist.items.noJunctions') },
    ];
    return { ok: items.every((i) => i.ok), items, undef };
  }

  Object.assign(M, { validate, checkPipe, checkJunction });
})(typeof window !== 'undefined' ? window : globalThis);
