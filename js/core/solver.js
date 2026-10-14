// Solver de regime permanente (seção 7): Newton-Raphson sobre vazões mássicas (elementos) e pressões
// de estagnação (nós), o mesmo sistema do método do gradiente de Todini & Pilati, resolvido por eliminação
// de Gauss. Em volta do Newton, o laço de estados de dispositivos (retenção e válvulas de controle).
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, H = HR.hyd, M = HR.model;
  const GAL_MIN = U.CATS.volFlow.gpm;
  const KGF = 98066.5; // Pa por kgf/cm²

  function run(eff, opts = {}) {
    let prep;
    try { prep = prepare(eff); } catch (e) { return { ok: false, errors: [e.message], warnings: [] }; }
    if (prep.errors.length) return { ok: false, errors: prep.errors, warnings: prep.warnings };
    return solveNetwork(prep, opts);
  }

  // ---------------------------------------------------------------- preparação

  function prepare(eff) {
    const errors = [], warnings = [];
    const sys = eff.system;
    const fl = HR.fluids.evaluate(sys);
    warnings.push(...fl.warnings);
    const rho = fl.rho, mu = fl.mu;
    if (!(rho > 0) || !(mu > 0)) throw new Error('Propriedades do fluido inválidas.');
    const patm = U.toSI(sys.patm.value, sys.patm.unit, 'pressure');
    const g = U.G0 * sys.gravity;
    if (sys.gravity === 0) warnings.push({ level: 'caution', text: 'Gravidade zero: saídas em altura (HGL, EGL, ΔH) não têm sentido.' });
    const ctx = { rho, patm };
    const si = (qt, cat) => U.toSI(qt.value, qt.unit, cat, ctx);
    const reLam = sys.reLam, reTurb = sys.reTurb;
    const lamMode = sys.laminarK;
    const env = { rho, mu, pv: fl.pv, patm, g, reLam, reTurb, fluid: fl };

    const jById = new Map(eff.junctions.map((j) => [j.id, j]));
    const pp = new Map(); // dados de tubo em SI

    // ---- tubos
    for (const p of eff.pipes) {
      const gm = p.geometry;
      let A, Dh;
      if (gm.kind === 'circular') { const d = si(gm.d, 'length'); A = Math.PI * d * d / 4; Dh = d; }
      else if (gm.kind === 'annulus') { const a = si(gm.dOuter, 'length'), b = si(gm.dInner, 'length'); A = Math.PI * (a * a - b * b) / 4; Dh = a - b; }
      else if (gm.kind === 'rectangular') { const w = si(gm.width, 'length'), h = si(gm.height, 'length'); A = w * h; Dh = 2 * w * h / (w + h); }
      else { A = si(gm.area, 'area'); Dh = 4 * A / si(gm.perim, 'length'); }
      const red = 1 - (p.idReduction || 0) / 100;
      Dh *= red; A *= red * red;
      if (!(A > 0) || !(Dh > 0)) { errors.push(`Tubo P${p.id}: geometria inválida.`); continue; }
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
        fTurb: H.colebrook(1e8, eD), // mesmo tubo a Re muito alto (ATKF)
        N: p.nParallel || 1,
        zUp: endElev(ju, p.id), zDown: endElev(jd, p.id), closed: !!p.closed,
      });
    }

    function endElev(j, pid) {
      const pk = j.pipeK && j.pipeK[pid];
      if (j.type === 'reservoir' && pk && pk.elev && Number.isFinite(pk.elev.value)) return si(pk.elev, 'length');
      return si(j.elevation, 'length');
    }

    // fator de correção laminar dos K (ATKF); contínuo em Re_lam e Re_turb
    function kTerm(K, P, V) {
      if (!K) return 0;
      const aV = Math.abs(V);
      const base = K * rho * V * aV / 2;
      if (lamMode === 'none') return base;
      const Re = rho * aV * P.Dh / mu;
      if (Re >= reTurb) return base;
      const fref = lamMode === 'improvedAtkf' ? P.fT : P.fTurb;
      if (Re < reLam) {
        const lam = K * 32 * mu * V / (P.Dh * fref); // = K·(64/Re)/f_ref·ρV|V|/2, finito em V → 0
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

    // perda de válvula: Cv (EUA, SG da água a 60 °F), Kv (métrico) ou K pela função dada
    function valveLossFn(j, kFn) {
      if (j.lossModel === 'Cv') return (m) => { const Qg = Math.abs(m) / rho / GAL_MIN; return Math.sign(m) * (rho / 999.0) * (Qg / j.Cv) ** 2 * U.PSI; };
      if (j.lossModel === 'Kv') return (m) => { const Qh = Math.abs(m) / rho * 3600; return Math.sign(m) * (rho / 1000) * (Qh / j.Kv) ** 2 * 1e5; };
      return kFn;
    }

    // ---- nós e elementos
    const nodes = [], links = [];
    const addNode = (o) => { o.ix = nodes.length; nodes.push(Object.assign({ kind: 'free', demand: 0, value: 0 }, o)); return nodes[nodes.length - 1]; };
    const jNodes = new Map(); // jid → { main } ou { in, out, pin, pout }

    for (const j of eff.junctions) {
      const t = M.JT[j.type];
      const z = si(j.elevation, 'length');
      if (t.multi) {
        let nd;
        switch (j.type) {
          case 'reservoir':
            nd = addNode({ kind: 'fixed', value: si(j.surfP, 'pressure'), z: si(j.liquidElev, 'length'), jid: j.id, isRes: true });
            break;
          case 'pressure': {
            const P = si(j.P, 'pressure');
            nd = addNode({ kind: j.ptype === 'static' ? 'fixedStatic' : 'fixed', value: P, z, jid: j.id });
            break;
          }
          case 'flow': {
            const m = si(j.Q, 'flow');
            nd = addNode({ z, jid: j.id, demand: j.dir === 'in' ? -m : m });
            break;
          }
          case 'branch': nd = addNode({ z, jid: j.id, demand: -si(j.source, 'flow') }); break;
          case 'spray': {
            nd = addNode({ z, jid: j.id });
            const ext = addNode({ kind: 'fixed', value: si(j.Pext, 'pressure'), z, jid: j.id, role: 'ext' });
            let CdA;
            if (j.sprayModel === 'K') CdA = Math.sqrt(1000 / 2) * si(j.Kf, 'kfactor');
            else { const d = si(j.dHole, 'length'); CdA = j.Cd * j.nHoles * Math.PI * d * d / 4; }
            links.push({
              kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, G: 0, mode: 'loss', CdA,
              phi: (m) => m * Math.abs(m) / (2 * rho * CdA * CdA),
              mref: rho * CdA * 1,
            });
            break;
          }
          case 'exitvalve': {
            // válvula de saída: um tubo descarregando para a pressão residual informada
            nd = addNode({ z, jid: j.id });
            const ext = addNode({ kind: 'fixed', value: si(j.Pout, 'pressure'), z, jid: j.id, role: 'ext' });
            const pc = M.pipesAt(eff, j.id)[0];
            const P = pc && pp.get(pc.id);
            if (!P) { errors.push(`Válvula de saída J${j.id}: ligue um tubo a ela.`); break; }
            links.push({
              kind: 'ext', jid: j.id, a: nd.ix, b: ext.ix, G: 0, mode: 'loss', P,
              phi: valveLossFn(j, (m) => kTerm(j.K, P, m / (rho * P.A * P.N))),
              mref: rho * P.A * P.N * 0.01,
            });
            break;
          }
        }
        jNodes.set(j.id, { main: nd });
      } else {
        const pr = M.ports(eff, j);
        if (!pr) { errors.push(`Junção J${j.id}: exige 2 tubos.`); continue; }
        if (t.directional && !pr.consistent) { errors.push(`Junção J${j.id} (${t.label}): um tubo deve chegar e outro sair dela.`); continue; }
        const nin = addNode({ z, jid: j.id, role: 'in' });
        const nout = addNode({ z, jid: j.id, role: 'out' });
        jNodes.set(j.id, { in: nin, out: nout, pin: pr.in.id, pout: pr.out.id });
      }
    }

    // ---- elementos de tubo
    for (const p of eff.pipes) {
      const P = pp.get(p.id);
      if (!P) continue;
      const ja = jById.get(p.up), jb = jById.get(p.down);
      if (!ja || !jb) { errors.push(`Tubo P${p.id}: precisa estar ligado a duas junções.`); continue; }
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
    // reservatório: tubo acima do nível descarrega em queda livre (pressão de contorno = a da superfície)
    function effZ(nd, zEnd) { return nd.isRes && zEnd > nd.z ? zEnd : nd.z; }

    // ---- elementos de junções de 2 portas
    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn || jn.main) continue;
      const Pin = pp.get(jn.pin), Pout = pp.get(jn.pout);
      if (!Pin || !Pout) continue;
      const Ain = Pin.A * Pin.N, Aout = Pout.A * Pout.N;
      const kElem = (Kf, Kr) => (m) => (m >= 0 ? kTerm(Kf, Pin, m / (rho * Ain)) : kTerm(Kr, Pout, m / (rho * Aout)));
      const lk = { kind: 'elem', jid: j.id, type: j.type, a: jn.in.ix, b: jn.out.ix, G: 0, mode: 'loss', mref: rho * Ain * 0.01, Pin, Pout, j };
      switch (j.type) {
        case 'valve':
          lk.phi = valveLossFn(j, kElem(j.K, j.K));
          if (j.closed) { lk.mode = 'closed'; lk.fixedClosed = true; }
          break;
        case 'orifice': {
          let Kf, Kr;
          if (j.orModel === 'K') { Kf = Kr = j.K; }
          else {
            const dO = si(j.dO, 'length'), Ao = Math.PI * dO * dO / 4;
            if (Ao >= Math.min(Ain, Aout)) errors.push(`Orifício J${j.id}: a área do orifício deve ser menor que a dos tubos.`);
            if (j.orModel === 'Cd') {
              Kf = (1 - (Ao / Ain) ** 2) / (j.Cd * j.Cd) * (Ain / Ao) ** 2;
              Kr = (1 - (Ao / Aout) ** 2) / (j.Cd * j.Cd) * (Aout / Ao) ** 2;
            } else {
              const r = si(j.rEdge, 'length');
              Kf = H.orificeK(Ain, Aout, Ao, j.orModel, r, dO);
              Kr = H.orificeK(Aout, Ain, Ao, j.orModel, r, dO);
            }
          }
          lk.phi = kElem(Kf, Kr); lk.info = { Kfwd: Kf, Krev: Kr };
          break;
        }
        case 'generic':
          if (j.genModel === 'curve') {
            const c = j.curve;
            const xs = c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow'));
            const ys = c.y.map((v) => U.toSI(v, c.yUnit, 'dp'));
            const cv = H.makeCurve(xs, ys, c.fit);
            lk.phi = (m) => Math.sign(m) * H.evalCurve(cv, Math.abs(m) / rho);
            lk.curve = cv;
          } else lk.phi = kElem(j.K, j.K);
          break;
        case 'pump': {
          lk.dev = 'pump';
          const s = j.speed / 100, N = j.nPumps || 1;
          lk.s = s; lk.N = N;
          // vazão fixa (dimensionamento): a bomba adiciona o que for preciso; curvas não entram
          const needsCurve = j.mode !== 'fixedFlow' && j.state === 'on';
          if (needsCurve) {
            const c = j.curve;
            const xs = c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow'));
            const ys = c.y.map((v) => U.toSI(v, c.yUnit, 'head'));
            try { lk.curve = H.makeCurve(xs, ys, c.fit); } catch (e) { errors.push(`Bomba J${j.id}: ${e.message}`); break; }
            const cv = lk.curve;
            lk.Hof = (Q, sp = s) => sp * sp * H.evalCurve(cv, Q / (N * sp));
            // aviso de curva ruim: sobe em parte da faixa, ou não cruza o eixo de altura zero
            const h0 = H.evalCurve(cv, 0);
            let rises = false, crosses = false;
            for (let i = 1; i <= 40; i++) {
              const x1 = (cv.xmax * (i - 1)) / 40, x2 = (cv.xmax * i) / 40;
              if (H.evalCurve(cv, x2) - H.evalCurve(cv, x1) > 1e-6 * Math.abs(h0)) rises = true;
            }
            for (let i = 1; i <= 100 && !crosses; i++) if (H.evalCurve(cv, cv.xmax * i / 10) <= 0) crosses = true;
            if (rises) warnings.push({ level: 'caution', text: `Bomba J${j.id}: a curva ajustada sobe em parte da faixa de vazão; confira o ajuste.`, obj: 'j:' + j.id });
            if (!crosses) warnings.push({ level: 'caution', text: `Bomba J${j.id}: a curva ajustada não cruza o eixo de altura zero.`, obj: 'j:' + j.id });
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
          break;
        }
        case 'control': {
          lk.dev = 'control';
          lk.phiOpen = kElem(j.kOpen, j.kOpen);
          lk.ctype = j.ctype;
          if (j.ctype === 'PRV') { lk.cMode = 'pDown'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = j.basis === 'static' ? Pout : null; }
          else if (j.ctype === 'PSV') { lk.cMode = 'pUp'; lk.value = si(j.setP, 'pressure'); lk.dynPipe = j.basis === 'static' ? Pin : null; }
          else if (j.ctype === 'FCV') { lk.cMode = 'fixedFlow'; lk.value = si(j.setQ, 'flow'); }
          else { lk.cMode = 'dP'; lk.value = si(j.setDP, 'dp'); }
          lk.phi = lk.phiOpen;
          break;
        }
      }
      links.push(lk);
    }

    return { eff, env, nodes, links, pp, jNodes, jById, errors, warnings, pipeLoss, kTerm };
  }

  // ---------------------------------------------------------------- estados de dispositivos

  function initialStates(prep) {
    const st = {};
    for (const lk of prep.links) {
      if (lk.dev === 'control') st[lk.jid] = lk.j.special === 'closed' ? 'closed' : lk.j.special === 'open' ? 'open' : 'control';
    }
    return st;
  }

  function configure(prep, st) {
    for (const lk of prep.links) {
      if (lk.dev === 'control') {
        const s = st[lk.jid];
        if (s === 'closed') lk.mode = 'closed';
        else if (s === 'open') { lk.mode = 'loss'; lk.phi = lk.phiOpen; }
        else lk.mode = lk.cMode;
      }
    }
  }

  const dynOf = (P, rho, m) => { if (!P) return 0; const A = P.A * P.N; return m * m / (2 * rho * A * A); };
  const dynDer = (P, rho, m) => { if (!P) return 0; const A = P.A * P.N; return m / (rho * A * A); };

  function review(prep, sol, st) {
    const { rho } = prep.env;
    const next = Object.assign({}, st);
    for (const lk of prep.links) {
      if (!lk.dev || lk.dev === 'pump' || lk.isolated) continue;
      const j = lk.j;
      if (j.special && j.special !== 'none') continue; // condição especial fixa o estado
      const m = sol.m[lk.idx];
      const Pa = sol.P[lk.a], Pb = sol.P[lk.b];
      // válvula de controle
      const s = st[lk.jid];
      const dPreq = Pa - Pb;
      const dPopen = lk.phiOpen(m);
      const basisDown = Pb - dynOf(lk.ctype === 'PRV' ? lk.dynPipe : null, rho, sol.m[lk.dynPipe?.link?.idx ?? -1] ?? m);
      const basisUp = Pa - dynOf(lk.ctype === 'PSV' ? lk.dynPipe : null, rho, sol.m[lk.dynPipe?.link?.idx ?? -1] ?? m);
      if (s === 'control') {
        if (j.alwaysControl) continue;
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
    }
    return next;
  }

  // ---------------------------------------------------------------- unicidade e trechos isolados

  function analyze(prep) {
    const { nodes, links } = prep;
    const par = nodes.map((_, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const lk of links) if (lk.mode === 'loss' || lk.mode === 'dP') par[find(lk.a)] = find(lk.b);
    const ref = new Set(), active = new Set();
    nodes.forEach((n, i) => {
      if (n.kind !== 'free') ref.add(find(i));
      if (n.demand) active.add(find(i));
    });
    for (const lk of links) {
      if (lk.mode === 'pDown') { ref.add(find(lk.b)); active.add(find(lk.a)); }
      if (lk.mode === 'pUp') { ref.add(find(lk.a)); active.add(find(lk.b)); }
      if (lk.mode === 'fixedFlow' && lk.value) { active.add(find(lk.a)); active.add(find(lk.b)); }
    }
    const errors = [];
    const isoRoots = new Set();
    const comps = new Map();
    nodes.forEach((n, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(n); });
    for (const [r, ns] of comps) {
      if (ref.has(r)) continue;
      if (active.has(r)) {
        const js = [...new Set(ns.map((n) => 'J' + n.jid))].join(', ');
        errors.push(`Trecho sem referência de pressão (${js}): ligue um reservatório, pressão imposta ou bocal a ele, ou remova a vazão fixada que o alimenta.`);
      } else isoRoots.add(r);
    }
    nodes.forEach((n, i) => { n.isolated = isoRoots.has(find(i)); });
    for (const lk of links) lk.isolated = (lk.mode === 'loss' || lk.mode === 'dP') && nodes[lk.a].isolated;
    return errors;
  }

  // ---------------------------------------------------------------- Newton

  function solveDense(A, b, n) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < n; k++) s = Math.max(s, Math.abs(A[i * n + k]));
      if (s === 0) return null;
      for (let k = 0; k < n; k++) A[i * n + k] /= s;
      b[i] /= s;
    }
    for (let c = 0; c < n; c++) {
      let piv = c, best = Math.abs(A[c * n + c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > best) { best = v; piv = r; } }
      if (best < 1e-13) return null;
      if (piv !== c) {
        for (let k = c; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[piv * n + k]; A[piv * n + k] = t; }
        const t = b[c]; b[c] = b[piv]; b[piv] = t;
      }
      const d = A[c * n + c];
      for (let r = c + 1; r < n; r++) {
        const f = A[r * n + c] / d;
        if (f === 0) continue;
        for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k];
      x[r] = s / A[r * n + r];
    }
    return x;
  }

  function newton(prep, guess, sc) {
    const { env } = prep;
    const rho = env.rho;
    const L = prep.links.filter((l) => !l.isolated);
    const N = prep.nodes.filter((n) => !n.isolated);
    const nL = L.length, nN = N.length, n = nL + nN;
    L.forEach((l, i) => { l.idx = i; });
    prep.links.filter((l) => l.isolated).forEach((l) => { l.idx = -1; });
    const nIx = new Int32Array(prep.nodes.length).fill(-1);
    N.forEach((nd, i) => { nIx[nd.ix] = nL + i; });
    const inL = N.map(() => []), outL = N.map(() => []);
    L.forEach((l, i) => {
      if (nIx[l.b] >= 0) inL[nIx[l.b] - nL].push(i);
      if (nIx[l.a] >= 0) outL[nIx[l.a] - nL].push(i);
    });

    // escalas para a norma do resíduo e o critério absoluto
    const Pscale = sc.Pscale, Mscale = sc.Mscale;
    const gmin = 1e-9 * Pscale / Mscale;

    // vetor inicial
    const x = new Float64Array(n);
    L.forEach((l, i) => { x[i] = guess.m.get(l) ?? 0; });
    N.forEach((nd, i) => { x[nL + i] = guess.P.get(nd) ?? sc.Pmean; });
    const rowScale = new Float64Array(n);

    function residual(xv, R, J) {
      R.fill(0);
      if (J) J.fill(0);
      for (let k = 0; k < nL; k++) {
        const l = L[k], m = xv[k];
        const ia = nIx[l.a], ib = nIx[l.b];
        const Pa = ia >= 0 ? xv[ia] : 0, Pb = ib >= 0 ? xv[ib] : 0;
        switch (l.mode) {
          case 'loss': {
            R[k] = Pa - Pb + l.G - l.phi(m);
            rowScale[k] = 1 / Pscale;
            if (J) {
              const h = 1e-6 * Math.max(Math.abs(m), l.mref);
              let d = (l.phi(m + h) - l.phi(m - h)) / (2 * h);
              if (!(d > gmin)) d = gmin;
              J[k * n + k] = -d;
              if (ia >= 0) J[k * n + ia] += 1;
              if (ib >= 0) J[k * n + ib] -= 1;
            }
            break;
          }
          case 'closed': R[k] = m; rowScale[k] = 1 / Mscale; if (J) J[k * n + k] = 1; break;
          case 'fixedFlow': R[k] = m - l.value; rowScale[k] = 1 / Mscale; if (J) J[k * n + k] = 1; break;
          case 'pDown': case 'pUp': {
            const iP = l.mode === 'pDown' ? ib : ia;
            const dp = l.dynPipe, dl = dp ? dp.link.idx : -1;
            const md = dl >= 0 ? xv[dl] : 0;
            R[k] = xv[iP] - (dp ? dynOf(dp, rho, md) : 0) - l.value;
            rowScale[k] = 1 / Pscale;
            if (J) { J[k * n + iP] = 1; if (dl >= 0) J[k * n + dl] -= dynDer(dp, rho, md); }
            break;
          }
          case 'dP': R[k] = Pa - Pb - l.value; rowScale[k] = 1 / Pscale; if (J) { J[k * n + ia] += 1; J[k * n + ib] -= 1; } break;
        }
      }
      for (let i = 0; i < nN; i++) {
        const nd = N[i], r = nL + i;
        if (nd.kind === 'free') {
          let s = -nd.demand;
          for (const k of inL[i]) { s += xv[k]; if (J) J[r * n + k] += 1; }
          for (const k of outL[i]) { s -= xv[k]; if (J) J[r * n + k] -= 1; }
          R[r] = s; rowScale[r] = 1 / Mscale;
        } else {
          let dyn = 0;
          if (nd.kind === 'fixedStatic') {
            const pk = inL[i].concat(outL[i])[0];
            if (pk !== undefined && L[pk].kind === 'pipe') {
              dyn = dynOf(L[pk].P, rho, xv[pk]);
              if (J) J[r * n + pk] -= dynDer(L[pk].P, rho, xv[pk]);
            }
          }
          R[r] = xv[r] - dyn - nd.value; rowScale[r] = 1 / Pscale;
          if (J) J[r * n + r] = 1;
        }
      }
    }
    const norm = (R) => { let s = 0; for (let i = 0; i < n; i++) { const v = R[i] * rowScale[i]; s += v * v; } return Math.sqrt(s); };

    const R = new Float64Array(n), Rt = new Float64Array(n), J = new Float64Array(n * n);
    const xt = new Float64Array(n);
    const hist = [];
    residual(x, R, null);
    let nrm = norm(R);
    let converged = false, it = 0, polish = 0, relaxNow = sc.relax;
    let worst = null;
    if (n === 0) converged = true;
    for (it = 1; it <= sc.maxIter && !converged; it++) {
      residual(x, R, J);
      nrm = norm(R);
      const b = new Float64Array(n);
      for (let i = 0; i < n; i++) b[i] = -R[i];
      const dx = solveDense(J, b, n);
      if (!dx) return { ok: false, error: 'Sistema singular: confira se cada trecho tem caminho até uma referência de pressão.', it, hist };
      // critério no passo de Newton completo (evita falsa convergência com relaxação)
      let maxRel = 0; worst = null;
      for (let i = 0; i < n; i++) {
        const isFlow = i < nL;
        const xn = x[i] + dx[i];
        const absTol = isFlow ? 1e-10 * Mscale : 1e-9 * Pscale;
        const rel = Math.abs(dx[i]) / Math.max(Math.abs(xn), absTol / sc.tol);
        if (rel > maxRel) { maxRel = rel; worst = isFlow ? L[i] : N[i - nL]; }
      }
      // passo com relaxação e busca linear (relaxação adaptativa)
      let a = relaxNow, nt;
      const nearlyDone = maxRel <= sc.tol * 10; // perto da solução o passo completo é sempre aceito
      for (let tries = 0; ; tries++) {
        for (let i = 0; i < n; i++) xt[i] = x[i] + a * dx[i];
        residual(xt, Rt, null);
        nt = norm(Rt);
        if (!sc.adaptive || nearlyDone || nt <= (1 - 1e-4 * a) * nrm || tries >= 10 || !Number.isFinite(nrm)) break;
        a /= 2;
      }
      if (!Number.isFinite(nt)) return { ok: false, error: 'O cálculo divergiu (valores não finitos). Tente relaxação menor ou chutes iniciais.', it, hist };
      x.set(xt); R.set(Rt); nrm = nt;
      hist.push({ it, maxRel, step: a, norm: nt, worst: worst ? describe(worst) : '' });
      if (maxRel <= sc.tol) { polish++; if (polish >= 2) converged = true; }
      else polish = 0;
    }
    // desempacota
    const m = new Float64Array(nL), P = new Float64Array(prep.nodes.length).fill(NaN);
    for (let k = 0; k < nL; k++) m[k] = x[k];
    N.forEach((nd, i) => { P[nd.ix] = x[nL + i]; });
    // resíduo de continuidade por nó (balanço de massa)
    const imb = new Map();
    for (let i = 0; i < nN; i++) {
      const nd = N[i];
      if (nd.kind !== 'free') continue;
      let sin = 0, sout = 0;
      for (const k of inL[i]) { if (m[k] >= 0) sin += m[k]; else sout -= m[k]; }
      for (const k of outL[i]) { if (m[k] >= 0) sout += m[k]; else sin -= m[k]; }
      if (nd.demand > 0) sout += nd.demand; else sin -= nd.demand;
      imb.set(nd, { err: Math.abs(sin - sout), thr: Math.max(sin, sout) });
    }
    return { ok: true, converged, it: it - 1, hist, m, P, x, nIx, L, N, nL, imb };
  }

  function describe(o) {
    if (o.kind === 'pipe') return 'P' + o.pid;
    if (o.jid !== undefined) return 'J' + o.jid;
    return '';
  }

  // ---------------------------------------------------------------- execução completa

  function solveNetwork(prep, opts) {
    const { env, links, nodes } = prep;
    const rho = env.rho, g = env.g;
    const sol0 = prep.eff.solution;
    // escalas
    const Pfix = nodes.filter((n) => n.kind !== 'free').map((n) => n.value)
      .concat(links.filter((l) => l.dev === 'control' && l.cMode !== 'fixedFlow' && l.cMode !== 'dP').map((l) => l.value));
    const zs = nodes.map((n) => n.z);
    let shutoff = 0;
    for (const l of links) if (l.dev === 'pump' && l.Hof) shutoff += Math.abs(rho * g * l.Hof(0));
    const Pmax = Pfix.length ? Math.max(...Pfix) : env.patm, Pmin = Pfix.length ? Math.min(...Pfix) : env.patm;
    const Pscale = Math.max(1e3, Pmax - Pmin + rho * Math.abs(g) * (Math.max(...zs) - Math.min(...zs)) + shutoff);
    let mRef = 0, nP = 0, mFix = 0;
    for (const l of links) {
      if (l.kind === 'pipe') { mRef += rho * l.P.A * l.P.N; nP++; }
      if (l.mode === 'fixedFlow' || l.cMode === 'fixedFlow') mFix += Math.abs(l.value);
    }
    const Mscale = Math.max(1e-6, (nP ? mRef / nP : 1) + mFix + nodes.reduce((s, n) => s + Math.abs(n.demand), 0));
    const sc = {
      Pscale, Mscale, Pmean: Pfix.length ? Pfix.reduce((a, b) => a + b, 0) / Pfix.length : env.patm,
      tol: sol0.tolRel, maxIter: sol0.maxIter, relax: sol0.relax, adaptive: sol0.adaptive,
    };

    // chute inicial: 1 m/s no sentido de referência (ou o informado / o resultado anterior)
    const guess = { m: new Map(), P: new Map() };
    for (const l of links) {
      let m0;
      if (l.kind === 'pipe') m0 = rho * l.P.A * l.P.N * 1;
      else if (l.kind === 'elem') m0 = rho * l.Pin.A * l.Pin.N * 1;
      else m0 = l.P ? rho * l.P.A * l.P.N * 1 : rho * l.CdA * 10;
      if (l.mode === 'fixedFlow') m0 = l.value;
      guess.m.set(l, m0);
    }
    if (opts.guess) {
      for (const l of links) {
        const v = l.kind === 'pipe' ? opts.guess.pipes?.[l.pid] : l.kind === 'elem' ? opts.guess.elems?.[l.jid] : undefined;
        if (Number.isFinite(v)) guess.m.set(l, v);
      }
    }

    let st = initialStates(prep);
    const seen = new Set();
    let res = null, cycling = false, pass = 0, totalIt = 0;
    const allHist = [];
    for (pass = 0; pass < 50; pass++) {
      configure(prep, st);
      const errs = analyze(prep);
      if (errs.length) return { ok: false, errors: errs, warnings: prep.warnings };
      seen.add(JSON.stringify(st));
      res = newton(prep, guess, sc);
      if (!res.ok) return { ok: false, errors: [res.error], warnings: prep.warnings, history: res.hist };
      totalIt += res.it;
      allHist.push(...res.hist.map((h) => Object.assign({ pass }, h)));
      if (!res.converged) break;
      const next = review(prep, res, st);
      if (JSON.stringify(next) === JSON.stringify(st)) break;
      if (seen.has(JSON.stringify(next))) { cycling = true; break; }
      st = next;
      // reaproveita a solução como chute
      res.L.forEach((l, k) => guess.m.set(l, res.m[k]));
      res.N.forEach((nd) => guess.P.set(nd, res.P[nd.ix]));
    }
    return postprocess(prep, res, st, { cycling, passes: pass + 1, totalIt, hist: allHist });
  }

  // ---------------------------------------------------------------- pós-processamento

  function postprocess(prep, res, st, meta) {
    const { env, links, nodes, pp, eff, jNodes } = prep;
    const { rho, g, pv, patm } = env;
    const W = prep.warnings.slice();
    const warn = (level, text, obj) => W.push({ level, text, obj });
    if (!res.converged) warn('critical', `A solução não convergiu em ${eff.solution.maxIter} iterações. Os resultados servem apenas para diagnóstico.`);
    if (meta.cycling) warn('warning', 'Estados de dispositivos alternando entre execuções: solução única impossível.');
    if (eff.solution.relax <= eff.solution.tolRel * 10) warn('critical', 'A relaxação está próxima ou abaixo da tolerância: o passo relaxado pode parecer convergido sem estar.');

    const mOf = (l) => (l.isolated || l.idx < 0 ? 0 : res.m[l.idx]);
    const Pn = (ix) => res.P[ix];
    const rg = rho * g;
    const pipes = {}, junctions = {}, pumps = {}, valves = {};

    for (const l of links) {
      if (l.kind !== 'pipe') continue;
      const P = l.P, p = P.p;
      const m = mOf(l);
      const lo = prep.pipeLoss(P, m, P.endK);
      const V = lo.V;
      const dyn = rho * V * V / 2;
      const kdyn = (K) => Math.abs(prep.kTerm(K, P, V));
      const Pa = Pn(l.a), Pb = Pn(l.b);
      const nA = nodes[l.a], nB = nodes[l.b];
      const P0jA = Pa + rho * g * (P.zaEff - P.zUp);
      const P0jB = Pb + rho * g * (P.zbEff - P.zDown);
      const P0in = V >= 0 ? P0jA - kdyn(P.pkA.out) : P0jA + kdyn(P.pkA.in);
      const P0out = V >= 0 ? P0jB + kdyn(P.pkB.in) : P0jB - kdyn(P.pkB.out);
      const r = {
        m, Q: m / rho, V, Re: lo.Re, f: lo.f,
        regime: lo.Re < env.reLam ? 'laminar' : lo.Re > env.reTurb ? 'turbulento' : 'transição',
        P0in, P0out, Pin: P0in - dyn, Pout: P0out - dyn,
        dP0: P0in - P0out, dPfric: lo.dpF, dPfit: lo.dpK, dPgrav: rho * g * (P.zDown - P.zUp),
        zin: P.zUp, zout: P.zDown, L: P.L, Dh: P.Dh, A: P.A, N: P.N, K: P.Ksum,
        nps: p.material && p.material.kind === 'steel' ? p.material.nps : null,
        sch: p.material && p.material.kind === 'steel' ? p.material.sch : null,
        hL: (lo.dpF + lo.dpK + lo.dpE) / rg,
        isolated: !!(l.isolated || (nA.isolated && nB.isolated)), closed: P.closed,
      };
      r.HGLin = r.Pin / rg + r.zin; r.HGLout = r.Pout / rg + r.zout;
      r.EGLin = r.P0in / rg + r.zin; r.EGLout = r.P0out / rg + r.zout;
      if (r.isolated) { for (const k of ['P0in', 'P0out', 'Pin', 'Pout', 'dP0', 'HGLin', 'HGLout', 'EGLin', 'EGLout']) r[k] = NaN; }
      pipes[p.id] = r;
      if (!r.isolated && Number.isFinite(pv)) {
        if (r.Pin < pv) warn('warning', `Pressão estática abaixo da pressão de vapor na entrada do tubo P${p.id}.`, 'p:' + p.id);
        if (r.Pout < pv) warn('warning', `Pressão estática abaixo da pressão de vapor na saída do tubo P${p.id}.`, 'p:' + p.id);
      }
      if (P.L < Math.abs(P.zDown - P.zUp) - 1e-9) warn('caution', `Tubo P${p.id}: comprimento menor que a diferença de cota.`, 'p:' + p.id);
      if (nA.isRes && P.zUp > nA.z && m < 0) warn('warning', `Tubo P${p.id} acima do nível do reservatório J${nA.jid} tomando fluido dele.`, 'p:' + p.id);
      if (nB.isRes && P.zDown > nB.z && m > 0) warn('warning', `Tubo P${p.id} acima do nível do reservatório J${nB.jid} tomando fluido dele.`, 'p:' + p.id);
    }

    const pipeOfId = (id) => pipes[id];
    const pipeV = (id) => (pipes[id] ? pipes[id].V : 0);

    for (const j of eff.junctions) {
      const jn = jNodes.get(j.id);
      if (!jn) continue;
      const z = U.toSI(j.elevation.value, j.elevation.unit, 'length');
      const con = M.pipesAt(eff, j.id);
      if (jn.main) {
        const nd = jn.main;
        let inflow = 0, outflow = 0, vin = 0, vout = 0;
        for (const p of con) {
          const r = pipeOfId(p.id); if (!r) continue;
          const into = p.down === j.id ? r.m : -r.m; // positivo = entra na junção
          if (into >= 0) { inflow += into; vin = Math.max(vin, Math.abs(r.V)); } else { outflow -= into; vout = Math.max(vout, Math.abs(r.V)); }
        }
        let P0 = Pn(nd.ix);
        if (nd.isRes) { P0 = nd.value; vin = vout = 0; } // na superfície do líquido, em repouso
        const zr = nd.isRes ? nd.z : z;
        const jr = {
          type: j.type, P0in: P0, P0out: P0, Pin: P0 - rho * vin * vin / 2, Pout: P0 - rho * vout * vout / 2,
          m: Math.max(inflow, outflow), net: outflow - inflow, z: zr, isolated: nd.isolated,
        };
        if (j.type === 'spray' || j.type === 'exitvalve') {
          const el = links.find((l) => l.kind === 'ext' && l.jid === j.id);
          if (el) { jr.m = mOf(el); jr.Q = jr.m / rho; jr.dP = P0 - Pn(el.b); jr.Pext = Pn(el.b); }
        }
        if (j.type === 'exitvalve' && !nd.isolated) {
          const pc = con[0], pr = pc && pipeOfId(pc.id);
          const vr = { type: j.type, m: jr.m, Q: jr.Q, dP: jr.dP, Pin: jr.Pin, P0in: P0, Pout: jr.Pext, state: 'descarregando' };
          vr.K = pr && pr.V ? jr.dP / (rho * pr.V * pr.V / 2) : NaN;
          const Qg = Math.abs(jr.m) / rho / GAL_MIN, dPpsi = jr.dP / U.PSI;
          vr.Cv = jr.dP > 0 ? Qg * Math.sqrt((rho / 999.0) / dPpsi) : NaN;
          if (jr.m < 0) warn('warning', `Válvula de saída J${j.id} com fluxo entrando no sistema: a pressão residual é maior que a da rede.`, 'j:' + j.id);
          valves[j.id] = vr;
        }
        jr.HGL = jr.Pin / rg + zr;
        if (nd.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, HGL: NaN });
        junctions[j.id] = jr;
        continue;
      }
      // junção de 2 portas
      const el = links.find((l) => l.kind === 'elem' && l.jid === j.id);
      const m = mOf(el);
      const P0in = Pn(jn.in.ix), P0out = Pn(jn.out.ix);
      const Vin = pipeV(jn.pin), Vout = pipeV(jn.pout);
      const dP = P0in - P0out;
      const jr = {
        type: j.type, m, Q: m / rho, P0in, P0out, Pin: P0in - rho * Vin * Vin / 2, Pout: P0out - rho * Vout * Vout / 2,
        dP, K: Vin ? dP / (rho * Vin * Vin / 2) : NaN, z, isolated: jn.in.isolated && jn.out.isolated,
      };
      jr.HGL = jr.Pin / rg + z;
      if (jr.isolated) Object.assign(jr, { P0in: NaN, P0out: NaN, Pin: NaN, Pout: NaN, dP: NaN, K: NaN, HGL: NaN });
      junctions[j.id] = jr;
      if (m < 0 && j.type !== 'pump' && !jr.isolated) warn('caution', `Fluxo contra o sentido de referência na junção J${j.id}: os K podem não se aplicar.`, 'j:' + j.id);

      if (j.type === 'pump') pumps[j.id] = pumpResult(prep, el, j, jr, warn);
      if (j.type === 'valve' || j.type === 'control') {
        const vr = { type: j.type, m, Q: m / rho, dP, Pin: jr.Pin, P0in, K: jr.K, state: 'aberta' };
        const Qg = Math.abs(m) / rho / GAL_MIN, dPpsi = dP / U.PSI;
        vr.Cv = dP > 0 ? Qg * Math.sqrt((rho / 999.0) / dPpsi) : NaN;
        if (j.type === 'valve' && j.closed) vr.state = 'fechada';
        if (j.type === 'control') {
          const s = st[j.id];
          vr.state = s === 'control' ? 'controlando' : s === 'open' ? 'totalmente aberta' : 'fechada';
          vr.ctype = j.ctype;
          if (s === 'control' && dP < 0) {
            vr.state = 'controlando (adicionando pressão)';
            warn('critical', `Válvula de controle J${j.id} está adicionando ${fmtSI(-dP / KGF)} kgf/cm² para manter o ajuste (age como bomba).`, 'j:' + j.id);
          }
          if (s !== 'control' && j.special === 'none') warn('warning', `Válvula ${j.ctype} J${j.id} sem controle (${vr.state}).`, 'j:' + j.id);
        }
        valves[j.id] = vr;
      }
    }

    // balanço de massa por junção
    if (eff.solution.checkMass) {
      for (const [nd, b] of res.imb) {
        if (b.err > Math.max(1e-9, eff.solution.tolRel * b.thr)) warn('warning', `Massa desbalanceada na junção J${nd.jid} (${fmtSI(b.err)} kg/s).`, 'j:' + nd.jid);
      }
    } else warn('critical', 'A checagem de balanço de massa está desligada.');

    const order = { critical: 0, warning: 1, caution: 2 };
    W.sort((a, b) => order[a.level] - order[b.level]);
    return {
      ok: true, converged: res.converged, iterations: meta.totalIt, passes: meta.passes, history: meta.hist,
      fluid: { name: env.fluid.name, rho, mu: env.mu, pv, T: env.fluid.T }, patm, g,
      pipes, junctions, pumps, valves, states: st, warnings: W,
    };
  }

  function pumpResult(prep, el, j, jr, warn) {
    const { rho, g, pv } = prep.env;
    const m = jr.m, Q = m / rho;
    const dP = jr.P0out - jr.P0in;
    const dH = dP / (rho * g);
    const r = { m, Q, dP, dH, speed: j.speed, state: j.state, mode: j.mode, NPSHA: (jr.P0in - pv) / (rho * g) };
    if (j.state !== 'on') { r.speed = 0; r.NPSHA = NaN; return r; }
    if (j.mode === 'fixedFlow') {
      // dimensionamento: informa a altura necessária; sem curva não há velocidade, eficiência nem NPSHR
      r.speed = NaN; r.eta = NaN; r.etaAssumed = true;
      r.Pideal = Q * dP; r.Pshaft = NaN;
      if (dP < 0) warn('warning', `Bomba de vazão fixa J${j.id} adicionando pressão negativa (${fmtSI(dP / KGF)} kgf/cm²).`, 'j:' + j.id);
      if (m < 0) warn('critical', `Refluxo na bomba J${j.id}.`, 'j:' + j.id);
      return r;
    }
    let s = el.s;
    if (el.controlled && el.curve) {
      // velocidade que fornece a altura exigida: s²·H1(Q/(N·s)) = ΔH
      const target = dH;
      const f = (sp) => sp * sp * H.evalCurve(el.curve, Q / (el.N * sp)) - target;
      let lo = 0.01, hi = 3;
      if (f(hi) < 0) { s = NaN; warn('warning', `Bomba J${j.id}: nem a 300% da velocidade a curva atinge a altura exigida.`, 'j:' + j.id); }
      else if (f(lo) > 0) { s = lo; warn('warning', `Bomba J${j.id}: velocidade exigida abaixo de 1% da nominal.`, 'j:' + j.id); }
      else {
        for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
        s = (lo + hi) / 2;
      }
      r.speed = s * 100;
    }
    const Qs = Number.isFinite(s) ? Q / (el.N * s) : NaN; // vazão equivalente por bomba na curva a 100%
    r.eta = el.effCurve && Number.isFinite(Qs) ? H.evalCurve(el.effCurve, Qs) : 1;
    r.Pideal = Q * dP;
    r.Pshaft = r.eta > 0 ? r.Pideal / r.eta : NaN;
    if (el.npshrCurve && Number.isFinite(Qs)) r.NPSHR = s * s * H.evalCurve(el.npshrCurve, Qs);
    if (m < 0) warn('critical', `Refluxo na bomba J${j.id}: a altura não pode ser prevista pela curva.`, 'j:' + j.id);
    if (el.curve && Number.isFinite(Qs) && Qs > el.curve.xmax * 1.0001) warn('warning', `Bomba J${j.id} operando além do fim da curva informada.`, 'j:' + j.id);
    if (Number.isFinite(r.NPSHR) && r.NPSHA < r.NPSHR) warn('warning', `Bomba J${j.id}: NPSH disponível (${r.NPSHA.toFixed(2)} m) menor que o requerido (${r.NPSHR.toFixed(2)} m).`, 'j:' + j.id);
    if (!el.effCurve) r.etaAssumed = true;
    return r;
  }

  const fmtSI = (v) => (Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(3));

  // ---------------------------------------------------------------- curva do sistema

  // Varre vazões fixas na bomba e registra a altura exigida pelo sistema.
  function systemCurve(eff, pumpId, npts = 16) {
    const j0 = eff.junctions.find((j) => j.id === pumpId);
    if (!j0 || j0.type !== 'pump') return null;
    const fl = HR.fluids.evaluate(eff.system);
    const c = j0.curve;
    let cv = null;
    if (j0.mode !== 'fixedFlow' && c && c.x.length) {
      try { cv = H.makeCurve(c.x.map((v) => U.toSI(v, c.xUnit, 'volFlow')), c.y.map((v) => U.toSI(v, c.yUnit, 'head')), c.fit); } catch (e) { cv = null; }
    }
    const s = j0.speed / 100, N = j0.nPumps || 1;
    let qmax = cv ? cv.xmax * N * s * 1.25 : 0;
    if (!cv) {
      const qf = j0.mode === 'fixedFlow' ? U.toSI(j0.fixedFlow.value, j0.fixedFlow.unit, 'flow', { rho: fl.rho }) / fl.rho : 0;
      qmax = qf > 0 ? qf * 2 : 0.05;
    }
    const sys = [], pump = [];
    for (let i = 0; i <= npts; i++) {
      const Q = (qmax * i) / npts;
      const e2 = M.clone(eff);
      const jj = e2.junctions.find((j) => j.id === pumpId);
      Object.assign(jj, { mode: 'fixedFlow', state: 'on', fixedFlow: { value: Q, unit: 'm³/s' } });
      const r = run(e2);
      if (r.ok && r.converged && r.pumps[pumpId]) sys.push([Q, r.pumps[pumpId].dH]);
      if (cv) pump.push([Q, s * s * H.evalCurve(cv, Q / (N * s))]);
    }
    return { sys, pump, rho: fl.rho };
  }

  HR.solver = { run, prepare, systemCurve };
})(typeof window !== 'undefined' ? window : globalThis);
