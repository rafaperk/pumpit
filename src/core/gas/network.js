// Compressible mode: the gas network of a model. The topology is the one of the incompressible network (P3): one node per
// single-node junction, an inlet and an outlet node per two-port junction, one link per pipe and per two-port junction.
// What the nodes and links carry is what changes. The pieces that depend on the junction type come from the `gas` hooks
// of the type definitions (src/core/junctions/*.js); a type without them is refused in this mode.
//   node  { ix, kind: 'free' | 'fixed', value (Pa, absolute), pk: 'static' | 'stagnation', z, jid, role, isRes, T0, ext }
//         pk: what the pressure of the node is — static at the junctions of the isothermal model, stagnation at those of
//         the adiabatic model (R-31, R-32), and the nature of the boundary at reservoirs and assigned pressures;
//         T0: stagnation temperature of a source (adiabatic model; the gas temperature by default);
//         ext: flow from outside into a free node, { m } [kg/s] or { Q } [m³/s at the conditions of the node], + enters
//   link  { kind: 'pipe' | 'elem' | 'ext', a, b, mode, rel: 'duct' | 'nozzle' | 'curve', d, ... }
//         mode 'loss': the flow follows from the pressures of a and b through `rel`; 'closed': no flow; 'fixedFlow': a
//         given mass flow; otherwise the flow is an unknown of the Newton method with a row of its own (`con`)
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model, S = PumpIt.solver;
  const types = PumpIt.junctionTypes;
  const { t } = PumpIt.i18n;

  function prepare(eff) {
    const errors = [], warnings = [];
    const sys = eff.system;
    const fl = PumpIt.fluids.evaluateGas(sys); // a clear message when the gas data is invalid
    warnings.push(...fl.warnings);
    const patm = U.toSI(sys.patm.value, sys.patm.unit, 'pressure');
    const g = U.G0 * sys.gravity;
    const mode = sys.gasMode === 'adiabatico' ? 'adiabatico' : 'isotermico';
    const cx = PumpIt.gas.flow.context(fl, mode, g);
    const si = (qt, cat) => U.toSI(qt.value, qt.unit, cat, { patm });
    const rhoN = PumpIt.fluids.normalDensity(fl.MW);
    const env = {
      patm, g, mode, fluid: fl, cx, rhoN, reLam: sys.reLam, reTurb: sys.reTurb, lamMode: sys.laminarK,
      machLimit: sys.machLimit, velLimit: si(sys.gasVelLimit, 'velocity'),
    };
    const internal = cx.iso ? 'static' : 'stagnation';

    const jById = new Map(eff.junctions.map((j) => [j.id, j]));
    const pp = S.pipeData(eff, si, errors);
    const lamOf = (P) => ({ mode: env.lamMode, reLam: env.reLam, reTurb: env.reTurb, fT: P.fT, fTurb: P.fTurb });

    // friction of a pipe: Darcy always (§8.2); Hazen-Williams has no meaning for a gas and is taken as Darcy with the
    // roughness kept in the pipe
    const hwPipes = [];
    function frictionOf(P) {
      if (P.fm !== 'hw') return { fm: P.fm, eD: P.eD, fx: P.fx };
      hwPipes.push('P' + P.id);
      const e = P.p.friction.eps;
      return { fm: 'darcy', eD: e && Number.isFinite(e.value) && e.value >= 0 ? si(e, 'length') / P.Dh : 0.046e-3 / P.Dh, fx: 0 };
    }

    // ---- nodes and links
    const nodes = [], links = [];
    const addNode = (o) => {
      o.ix = nodes.length;
      const nd = Object.assign({ kind: 'free', value: 0, pk: internal, T0: fl.T, ext: null, demand: 0 }, o);
      if (nd.ext && (nd.ext.m || nd.ext.Q)) nd.demand = 1; // an external flow makes its part active (connectivity.js)
      nodes.push(nd);
      return nd;
    };
    const jNodes = new Map();
    // temperature of the gas a junction supplies (adiabatic model): its own, when given, or the gas temperature
    const sourceT = (j) => (j.gasT && Number.isFinite(j.gasT.value) ? si(j.gasT, 'temperature') : fl.T);
    // flow given to a junction: a mass flow, or a volume at the conditions of the node (§8.4); + enters the system
    function flowExt(qt, sign, j) {
      if (!qt || !Number.isFinite(qt.value) || qt.value === 0) return null;
      const T0 = sourceT(j);
      if (U.has('massFlow', qt.unit)) return { m: sign * U.toSI(qt.value, qt.unit, 'massFlow'), T0 };
      if (U.has('normFlow', qt.unit)) return { m: sign * U.toSI(qt.value, qt.unit, 'normFlow') * rhoN, T0 };
      return { Q: sign * U.toSI(qt.value, qt.unit, 'volFlow'), T0 };
    }
    // a K element between two pipes, referred to the pipe the flow comes from (as in the incompressible mode)
    function kElement(lk, Kf, Kr, Pin, Pout) {
      lk.rel = 'duct';
      lk.d = {
        L: 0, N: 1, A: [Pin.A * Pin.N, Pout.A * Pout.N], D: [Pin.Dh, Pout.Dh], K: [Kf, Kr],
        lam: [lamOf(Pin), lamOf(Pout)], fm: 'none', eD: 0, fx: 0, dz: 0, reLam: env.reLam, reTurb: env.reTurb,
      };
      if (!(Kf > 0) && !(Kr > 0) && nodes[lk.a].pk === nodes[lk.b].pk) tie(lk); // no loss at all: one pressure
    }
    // a link without any loss between two nodes of one kind of pressure: the pressures are equal, the flow an unknown
    function tie(lk) {
      lk.mode = 'dP'; lk.value = 0;
      lk.con = (m, na, nb) => na.P - nb.P; lk.conScale = 'P';
    }

    // what a junction type sees while it builds its part of the gas network
    const builder = {
      eff, env, cx, si, g, errors, warnings, pp, addNode, internal, sourceT, flowExt, lamOf, tie,
      addLink: (lk) => { links.push(lk); return lk; },
    };

    for (const j of eff.junctions) {
      const def = types.get(j.type);
      const z = si(j.elevation, 'length');
      if (!def.gas) { errors.push(t('core.gas.typeNotSupported', { id: j.id, label: def.label })); continue; }
      if (def.multi) {
        jNodes.set(j.id, { main: def.gas.node(j, builder, z) });
      } else {
        const pr = M.ports(eff, j);
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
      Object.assign(P, { zaEff, zbEff, endK, pkA, pkB });
      const fr = frictionOf(P);
      const d = {
        L: P.L, N: P.N, A: [P.A, P.A], D: [P.Dh, P.Dh], K: [P.Ksum + endK.fwd, P.Ksum + endK.rev], lam: [lamOf(P), lamOf(P)],
        fm: fr.fm, eD: fr.eD, fx: fr.fx, dz: zbEff - zaEff, reLam: env.reLam, reTurb: env.reTurb, nSeg: 100,
      };
      const lk = { kind: 'pipe', pid: p.id, a: na.ix, b: nb.ix, mode: P.closed ? 'closed' : 'loss', fixedClosed: P.closed, rel: 'duct', d, P };
      // a pipe without friction nor losses ties the pressures of its ends
      if (!P.closed && d.fm === 'none' && !(d.K[0] > 0) && !(d.K[1] > 0) && na.pk === nb.pk) tie(lk);
      links.push(lk);
      P.link = lk;
    }
    if (hwPipes.length) warnings.push({ level: 'caution', text: t('core.gas.hwAsDarcy', { pipes: hwPipes.join(', ') }) });

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
    // reservoir: a pipe that connects above the reference level keeps its own elevation (as in the incompressible mode)
    function effZ(nd, zEnd) { return nd.isRes && zEnd > nd.z ? zEnd : nd.z; }

    // ---- elements of two-port junctions
    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn || jn.main) continue;
      const Pin = pp.get(jn.pin), Pout = pp.get(jn.pout);
      if (!Pin || !Pout) continue;
      const lk = { kind: 'elem', jid: j.id, type: j.type, a: jn.in.ix, b: jn.out.ix, mode: 'loss', Pin, Pout, j };
      const net = Object.assign(Object.create(builder), {
        Pin, Pout, Ain: Pin.A * Pin.N, Aout: Pout.A * Pout.N,
        kElement: (Kf, Kr) => kElement(lk, Kf, Kr, Pin, Pout),
      });
      types.get(j.type).gas.element(j, lk, net);
      links.push(lk);
    }

    return { eff, env, cx, nodes, links, pp, jNodes, jById, errors, warnings };
  }

  PumpIt.gas = Object.assign(PumpIt.gas || {}, { prepare });
})(typeof window !== 'undefined' ? window : globalThis);
