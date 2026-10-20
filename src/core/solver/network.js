// Network preparation (specification section 7): converts the effective model to SI, evaluates the fluid,
// prepares the pipes and builds the nodes and links that the Newton stage solves. Junction-type specific
// pieces come from the junction type registry (buildNode / buildElement).
//
// Unknowns: mass flow in every link (pipe, two-port element, discharge link) and stagnation pressure in
// every node. Two-port junctions become an element between an inlet node and an outlet node.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, H = PumpIt.hyd;
  const types = PumpIt.junctionTypes;
  const { t } = PumpIt.i18n;

  // pipe data in SI, by pipe id (also used by the compressible mode): section, length, friction model, ΣK of the
  // fittings, parallel tubes and the elevations where the pipe connects
  function pipeData(eff, si, errors) {
    const jById = new Map(eff.junctions.map((j) => [j.id, j]));
    const pp = new Map();
    for (const p of eff.pipes) {
      const gm = p.geometry;
      let A, Dh;
      if (gm.kind === 'circular') { const d = si(gm.d, 'length'); A = Math.PI * d * d / 4; Dh = d; }
      else if (gm.kind === 'annulus') { const a = si(gm.dOuter, 'length'), b = si(gm.dInner, 'length'); A = Math.PI * (a * a - b * b) / 4; Dh = a - b; }
      else if (gm.kind === 'rectangular') { const w = si(gm.width, 'length'), h = si(gm.height, 'length'); A = w * h; Dh = 2 * w * h / (w + h); }
      else { A = si(gm.area, 'area'); Dh = 4 * A / si(gm.perim, 'length'); }
      const red = 1 - (p.idReduction || 0) / 100;
      Dh *= red; A *= red * red;
      if (!(A > 0) || !(Dh > 0)) { errors.push(t('core.solver.badGeometry', { id: p.id })); continue; }
      const fr = p.friction;
      let fm = 'darcy', eD = 0, fx = 0, C = 0;
      if (fr.model === 'roughness') eD = si(fr.eps, 'length') / Dh;
      else if (fr.model === 'relRoughness') eD = fr.rel;
      else if (fr.model === 'smooth') eD = 0;
      else if (fr.model === 'explicitF') { fm = 'explicit'; fx = fr.f; }
      else if (fr.model === 'hw') { fm = 'hw'; C = fr.C; }
      else fm = 'none';
      const fT = H.craneFT(Dh);
      let Ksum = 0;
      for (const it of p.fittings || []) Ksum += (it.qty ?? 1) * (it.model === 'KfT' ? it.value * fT : it.value);
      const ju = jById.get(p.up), jd = jById.get(p.down);
      pp.set(p.id, {
        id: p.id, p, A, Dh, L: si(p.length, 'length'), fm, eD, fx, C, Ksum, fT,
        fTurb: H.colebrook(1e8, eD), // same pipe at a very high Re (reference of the 'pipeFt' laminar correction)
        N: p.nParallel || 1,
        zUp: endElev(ju, p.id), zDown: endElev(jd, p.id), closed: !!p.closed,
      });
    }

    // elevation where a pipe connects: the junction elevation, unless the type defines its own (reservoir depth)
    function endElev(j, pid) {
      const pk = j.pipeK && j.pipeK[pid];
      const def = types.get(j.type);
      const z = def && def.pipeEndElevation ? def.pipeEndElevation(j, pk, si) : undefined;
      return z !== undefined ? z : si(j.elevation, 'length');
    }
    return pp;
  }

  function prepare(eff) {
    const errors = [], warnings = [];
    const sys = eff.system;
    const fl = PumpIt.fluids.evaluate(sys);
    warnings.push(...fl.warnings);
    const rho = fl.rho, mu = fl.mu;
    if (!(rho > 0) || !(mu > 0)) throw new Error(t('core.solver.badFluid'));
    const patm = U.toSI(sys.patm.value, sys.patm.unit, 'pressure');
    const g = U.G0 * sys.gravity;
    if (sys.gravity === 0) warnings.push({ level: 'caution', text: t('core.solver.zeroGravity') });
    const ctx = { rho, patm };
    const si = (qt, cat) => U.toSI(qt.value, qt.unit, cat, ctx);
    const reLam = sys.reLam, reTurb = sys.reTurb;
    const lamMode = sys.laminarK;
    const env = { rho, mu, pv: fl.pv, patm, g, reLam, reTurb, fluid: fl };

    const jById = new Map(eff.junctions.map((j) => [j.id, j]));
    const pp = pipeData(eff, si, errors); // pipe data in SI

    // laminar correction factor of the K values, against the Crane fT or the pipe's own turbulent f; continuous at Re_lam
    // and Re_turb
    function kTerm(K, P, V) {
      if (!K) return 0;
      const aV = Math.abs(V);
      const base = K * rho * V * aV / 2;
      if (lamMode === 'none') return base;
      const Re = rho * aV * P.Dh / mu;
      if (Re >= reTurb) return base;
      const fref = lamMode === 'craneFt' ? P.fT : P.fTurb;
      if (Re < reLam) {
        const lam = K * 32 * mu * V / (P.Dh * fref); // = K·(64/Re)/f_ref·ρV|V|/2, finite as V → 0
        return Math.abs(lam) > Math.abs(base) ? lam : base;
      }
      const cl = Math.max(1, (64 / reLam) / fref);
      const w = (Re - reLam) / (reTurb - reLam);
      return base * ((1 - w) * cl + w);
    }

    function pipeLoss(P, m, endK) {
      const mm = m / P.N;
      const V = mm / (rho * P.A);
      const aV = Math.abs(V);
      const Re = rho * aV * P.Dh / mu;
      let dpF = 0, f = NaN;
      if (P.fm === 'darcy') {
        if (Re < reLam) { dpF = 32 * mu * P.L * V / (P.Dh * P.Dh); f = Re > 0 ? 64 / Re : Infinity; }
        else { f = H.frictionFactor(Re, P.eD, reLam, reTurb); dpF = f * P.L / P.Dh * rho * V * aV / 2; }
      } else if (P.fm === 'explicit') { f = P.fx; dpF = f * P.L / P.Dh * rho * V * aV / 2; }
      else if (P.fm === 'hw') {
        dpF = Math.sign(V) * rho * U.G0 * H.hazenWilliamsS(V, P.C, P.Dh) * P.L;
        f = aV > 0 ? Math.abs(dpF) / (P.L / P.Dh * rho * V * V / 2) : NaN;
      } else f = 0;
      const dpK = kTerm(P.Ksum, P, V);
      const dpE = kTerm(V >= 0 ? endK.fwd : endK.rev, P, V);
      return { dp: dpF + dpK + dpE, dpF, dpK, dpE, V, Re, f };
    }

    // ---- nodes and links
    const nodes = [], links = [];
    const addNode = (o) => { o.ix = nodes.length; nodes.push(Object.assign({ kind: 'free', demand: 0, value: 0 }, o)); return nodes[nodes.length - 1]; };
    const jNodes = new Map(); // jid → { main } or { in, out, pin, pout }

    // what a junction type sees while it builds its part of the network
    const builder = {
      eff, env, si, rho, g, errors, warnings, pp, kTerm, addNode,
      addLink: (lk) => { links.push(lk); return lk; },
    };

    for (const j of eff.junctions) {
      const def = types.get(j.type);
      const z = si(j.elevation, 'length');
      if (def.multi) {
        jNodes.set(j.id, { main: def.buildNode(j, builder, z) });
      } else {
        const pr = PumpIt.model.ports(eff, j);
        if (!pr) { errors.push(t('core.solver.needsTwoPipes', { id: j.id })); continue; }
        if (def.directional && !pr.consistent) { errors.push(t('core.solver.notDirectional', { id: j.id, label: def.label })); continue; }
        const nin = addNode({ z, jid: j.id, role: 'in' });
        const nout = addNode({ z, jid: j.id, role: 'out' });
        jNodes.set(j.id, { in: nin, out: nout, pin: pr.in.id, pout: pr.out.id });
      }
    }

    // ---- pipe links
    for (const p of eff.pipes) {
      const P = pp.get(p.id);
      if (!P) continue;
      const ja = jById.get(p.up), jb = jById.get(p.down);
      if (!ja || !jb) { errors.push(t('core.solver.pipeNotConnected', { id: p.id })); continue; }
      const na = nodeFor(ja, p.id), nb = nodeFor(jb, p.id);
      if (!na || !nb) continue;
      const pkA = pipeKs(ja, p.id), pkB = pipeKs(jb, p.id);
      const endK = { fwd: pkA.out + pkB.in, rev: pkB.out + pkA.in };
      const zaEff = effZ(na, P.zUp), zbEff = effZ(nb, P.zDown);
      P.zaEff = zaEff; P.zbEff = zbEff; P.endK = endK; P.pkA = pkA; P.pkB = pkB;
      links.push({
        kind: 'pipe', pid: p.id, a: na.ix, b: nb.ix, G: rho * g * (zaEff - zbEff),
        mode: P.closed ? 'closed' : 'loss', fixedClosed: P.closed,
        phi: (m) => pipeLoss(P, m, endK).dp, mref: rho * P.A * P.N * 0.01, P,
      });
      P.link = links[links.length - 1];
    }

    function nodeFor(j, pid) {
      const jn = jNodes.get(j.id);
      if (!jn) return null;
      if (jn.main) return jn.main;
      return pid === jn.pin ? jn.in : jn.out;
    }
    function pipeKs(j, pid) {
      const pk = j.pipeK && j.pipeK[pid];
      return { out: pk?.kOut || 0, in: pk?.kIn || 0 };
    }
    // reservoir: a pipe above the liquid level discharges in free fall (boundary pressure = surface pressure)
    function effZ(nd, zEnd) { return nd.isRes && zEnd > nd.z ? zEnd : nd.z; }

    // ---- elements of two-port junctions
    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn || jn.main) continue;
      const Pin = pp.get(jn.pin), Pout = pp.get(jn.pout);
      if (!Pin || !Pout) continue;
      const Ain = Pin.A * Pin.N, Aout = Pout.A * Pout.N;
      // K element: K referred to the upstream pipe area, per flow direction
      const kElem = (Kf, Kr) => (m) => (m >= 0 ? kTerm(Kf, Pin, m / (rho * Ain)) : kTerm(Kr, Pout, m / (rho * Aout)));
      const lk = { kind: 'elem', jid: j.id, type: j.type, a: jn.in.ix, b: jn.out.ix, G: 0, mode: 'loss', mref: rho * Ain * 0.01, Pin, Pout, j };
      types.get(j.type).buildElement(j, lk, Object.assign(Object.create(builder), { Pin, Pout, Ain, Aout, kElem }));
      links.push(lk);
    }

    return { eff, env, nodes, links, pp, jNodes, jById, errors, warnings, pipeLoss, kTerm };
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { prepare, pipeData });
})(typeof window !== 'undefined' ? window : globalThis);
