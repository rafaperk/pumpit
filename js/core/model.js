// Modelo de dados, tipos de junção, valores padrão, cenários e lista de verificação (seções 2, 3 e 6).
(function (root) {
  const HR = (root.HR = root.HR || {});
  const q = (value, unit) => ({ value, unit });
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

  // multi = um nó só; os demais viram um elemento entre nó de entrada e nó de saída
  const JT = {
    reservoir: { label: 'Reservatório', pipes: [1, 25], multi: true, ref: true, group: 'Contorno' },
    pressure: { label: 'Pressão imposta', pipes: [1, 25], multi: true, ref: true, group: 'Contorno' },
    flow: { label: 'Vazão imposta', pipes: [1, 1], multi: true, group: 'Contorno' },
    spray: { label: 'Bocal / aspersor', pipes: [1, 4], multi: true, ref: true, group: 'Contorno' },
    branch: { label: 'Nó', pipes: [2, 25], multi: true, group: 'Conexão' },
    pump: { label: 'Bomba', pipes: [2, 2], directional: true, group: 'Equipamento' },
    valve: { label: 'Válvula', pipes: [2, 2], group: 'Válvula' },
    control: { label: 'Válvula de controle', pipes: [2, 2], directional: true, group: 'Válvula' },
    exitvalve: { label: 'Válvula de saída', pipes: [1, 1], multi: true, ref: true, group: 'Válvula' },
    orifice: { label: 'Orifício', pipes: [2, 2], group: 'Perda' },
    generic: { label: 'Componente genérico', pipes: [2, 2], group: 'Perda' },
  };

  function newJunction(type, id, x, y) {
    const j = { id, name: '', type, x, y, elevation: q(0, 'm') };
    switch (type) {
      case 'reservoir': Object.assign(j, { liquidElev: q(5, 'm'), surfP: q(0, 'kgf/cm²(g)'), pipeK: {} }); break;
      case 'pressure': Object.assign(j, { P: q(2, 'kgf/cm²(g)'), ptype: 'stagnation', pipeK: {} }); break;
      case 'flow': Object.assign(j, { Q: q(10, 'm³/h'), dir: 'out' }); break;
      case 'branch': Object.assign(j, { source: q(0, 'm³/h'), pipeK: {} }); break;
      case 'spray': Object.assign(j, { sprayModel: 'CdA', Cd: 0.62, dHole: q(10, 'mm'), nHoles: 1, Kf: q(80, 'L/min/bar½'), Pext: q(0, 'kgf/cm²(g)') }); break;
      case 'pump': Object.assign(j, {
        mode: 'curve', speed: 100, nPumps: 1, state: 'on',
        curve: { x: [0, 20, 40, 60], y: [42, 40.5, 36, 28.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
        eff: { x: [], y: [], xUnit: 'm³/h', fit: '2' },
        npshr: { x: [], y: [], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
        fixedFlow: q(30, 'm³/h'), setQ: q(30, 'm³/h'), setP: q(3, 'kgf/cm²(g)'),
      }); break;
      case 'valve': Object.assign(j, { lossModel: 'K', K: 0.2, Cv: 100, Kv: 86, closed: false }); break;
      case 'control': Object.assign(j, {
        ctype: 'PRV', setP: q(2, 'kgf/cm²(g)'), setQ: q(20, 'm³/h'), setDP: q(0.5, 'kgf/cm²'),
        basis: 'static', alwaysControl: true, kOpen: 0, failAction: 'open', special: 'none',
      }); break;
      case 'exitvalve': Object.assign(j, { Pout: q(0, 'kgf/cm²(g)'), lossModel: 'K', K: 0, Cv: 100, Kv: 86 }); break;
      case 'orifice': Object.assign(j, { orModel: 'sharp', dO: q(25, 'mm'), rEdge: q(2, 'mm'), Cd: 0.61, K: 10 }); break;
      case 'generic': Object.assign(j, {
        genModel: 'K', K: 1,
        curve: { x: [0, 10, 20, 30], y: [0, 0.05, 0.2, 0.45], xUnit: 'm³/h', yUnit: 'kgf/cm²', fit: '2' },
      }); break;
      default: throw new Error('Tipo de junção desconhecido: ' + type);
    }
    return j;
  }

  // Modelos salvos antes da remoção de alguns tipos: converte para o equivalente mais próximo.
  function migrate(m) {
    const notes = [];
    for (const j of m.junctions) {
      const was = j.type;
      if (was === 'check') { j.type = 'valve'; j.closed = j.special === 'closed'; }
      else if (was === 'bend' || was === 'areachange') {
        Object.assign(j, { type: 'generic', genModel: 'K', K: was === 'bend' && j.bendModel === 'K' ? j.K : (was === 'bend' ? 0.3 : 0) });
        if (!j.curve) j.curve = newJunction('generic', 0, 0, 0).curve;
      } else if (was === 'deadend') Object.assign(j, { type: 'flow', Q: q(0, 'm³/h'), dir: 'out' });
      if (was !== j.type) notes.push(`J${j.id}: ${was} → ${JT[j.type].label}`);
      delete j.designFactor;
    }
    for (const p of m.pipes) delete p.factors;
    return notes;
  }

  function newPipe(id, up, down, template) {
    const p = {
      id, name: '', up, down,
      length: q(10, 'm'),
      material: { kind: 'steel', nps: '4', sch: '40' },
      geometry: {
        kind: 'circular', d: q(102.26, 'mm'), dOuter: q(100, 'mm'), dInner: q(50, 'mm'),
        width: q(100, 'mm'), height: q(50, 'mm'), area: q(50, 'cm²'), perim: q(30, 'cm'),
      },
      friction: { model: 'roughness', eps: q(0.046, 'mm'), rel: 0.0001, f: 0.02, C: 120 },
      fittings: [],
      idReduction: 0,
      nParallel: 1,
      closed: false,
    };
    if (template) {
      // reaproveita material, geometria e atrito do último tubo
      p.material = clone(template.material);
      p.geometry = clone(template.geometry);
      p.friction = clone(template.friction);
    }
    return p;
  }

  function newModel() {
    return {
      version: 1,
      title: 'Modelo sem título',
      system: {
        fluid: { kind: 'water', T: q(20, '°C'), name: 'Fluido', rho: q(998.2, 'kg/m³'), mu: q(1.002, 'cP'), pv: q(0.02386, 'kgf/cm²(a)') },
        patm: q(1.03323, 'kgf/cm²(a)'),
        gravity: 1,
        reLam: 2300,
        reTurb: 4000,
        laminarK: 'improvedAtkf',
      },
      solution: { tolRel: 1e-4, maxIter: 500, relax: 1, adaptive: true, checkMass: true },
      pipes: [],
      junctions: [],
      scenarios: { list: [{ id: 'base', name: 'Base', parent: null, overrides: {}, notes: '' }], current: 'base' },
      nextId: { p: 1, j: 1 },
    };
  }

  // ---------- acesso por caminho ----------

  function getPath(o, path) {
    if (!path) return o;
    let cur = o;
    for (const k of path.split('.')) { if (cur == null) return undefined; cur = cur[k]; }
    return cur;
  }
  function setPath(o, path, v) {
    const ks = path.split('.');
    let cur = o;
    for (let i = 0; i < ks.length - 1; i++) {
      if (cur[ks[i]] == null || typeof cur[ks[i]] !== 'object') cur[ks[i]] = {};
      cur = cur[ks[i]];
    }
    cur[ks[ks.length - 1]] = v;
  }
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // objKey: 'sys' | 'sol' | 'p:ID' | 'j:ID'
  function getObj(m, key) {
    if (key === 'sys') return m.system;
    if (key === 'sol') return m.solution;
    const [k, id] = key.split(':');
    const n = Number(id);
    return k === 'p' ? m.pipes.find((p) => p.id === n) : m.junctions.find((j) => j.id === n);
  }

  // ---------- cenários: a base define tudo; cada filho guarda só o que difere do pai ----------

  const scen = (m, sid) => m.scenarios.list.find((s) => s.id === sid);
  function chain(m, sid) {
    const out = [];
    for (let s = scen(m, sid); s; s = s.parent ? scen(m, s.parent) : null) out.unshift(s);
    return out;
  }

  // modelo efetivo do cenário: cópia da base com as sobrescritas aplicadas da raiz até a folha
  function effective(m, sid) {
    const e = clone({ system: m.system, solution: m.solution, pipes: m.pipes, junctions: m.junctions, title: m.title });
    for (const s of chain(m, sid)) {
      const keys = Object.keys(s.overrides).sort((a, b) => a.length - b.length);
      for (const k of keys) {
        const [objKey, path] = k.split('|');
        const o = getObj(e, objKey);
        if (o) setPath(o, path, clone(s.overrides[k]));
      }
    }
    return e;
  }

  function effValue(m, sid, objKey, path) {
    const o = getObj(effective(m, sid), objKey);
    return o ? getPath(o, path) : undefined;
  }

  // editar: igual ao herdado = religa ao pai; diferente = quebra o vínculo só desse atributo
  function setField(m, sid, objKey, path, value) {
    const s = scen(m, sid);
    if (!s.parent) {
      const o = getObj(m, objKey);
      setPath(o, path, clone(value));
      return;
    }
    const k = objKey + '|' + path;
    // sobrescritas mais específicas deste cenário dentro do caminho deixam de valer
    for (const ok of Object.keys(s.overrides)) if (ok.startsWith(k + '.')) delete s.overrides[ok];
    const inherited = effValue(m, s.parent, objKey, path);
    if (deepEqual(inherited, value)) delete s.overrides[k];
    else s.overrides[k] = clone(value);
  }

  function isOverridden(m, sid, objKey, path) {
    const s = scen(m, sid);
    if (!s || !s.parent) return false;
    const k = objKey + '|' + path;
    return Object.keys(s.overrides).some((ok) => ok === k || ok.startsWith(k + '.') || k.startsWith(ok + '.'));
  }
  function clearOverride(m, sid, objKey, path) {
    const s = scen(m, sid);
    const k = objKey + '|' + path;
    for (const ok of Object.keys(s.overrides)) if (ok === k || ok.startsWith(k + '.')) delete s.overrides[ok];
  }

  function removeObjectOverrides(m, objKey) {
    for (const s of m.scenarios.list) {
      for (const k of Object.keys(s.overrides)) if (k.split('|')[0] === objKey) delete s.overrides[k];
    }
  }

  function addScenario(m, parentId, name) {
    let n = 1;
    while (m.scenarios.list.some((s) => s.id === 's' + n)) n++;
    const s = { id: 's' + n, name, parent: parentId, overrides: {}, notes: '' };
    m.scenarios.list.push(s);
    return s;
  }
  function descendants(m, sid) {
    const out = [];
    const walk = (id) => m.scenarios.list.filter((s) => s.parent === id).forEach((s) => { out.push(s.id); walk(s.id); });
    walk(sid);
    return out;
  }
  function deleteScenario(m, sid) {
    const s = scen(m, sid);
    if (!s || !s.parent) return false;
    const kill = new Set([sid, ...descendants(m, sid)]);
    m.scenarios.list = m.scenarios.list.filter((x) => !kill.has(x.id));
    if (kill.has(m.scenarios.current)) m.scenarios.current = s.parent;
    return true;
  }

  // ---------- topologia ----------

  function pipesAt(m, jid) { return m.pipes.filter((p) => p.up === jid || p.down === jid); }

  // tubos de entrada e saída de uma junção de 2 portas, pelo sentido de referência
  function ports(m, j) {
    const ps = pipesAt(m, j.id);
    const inP = ps.filter((p) => p.down === j.id);
    const outP = ps.filter((p) => p.up === j.id);
    if (inP.length === 1 && outP.length === 1) return { in: inP[0], out: outP[0], consistent: true };
    if (ps.length === 2) return { in: ps[0], out: ps[1], consistent: false };
    return null;
  }

  // ---------- lista de verificação ----------

  // unidades desconhecidas (arquivo corrompido ou de outra versão)
  const known = (u) => Object.values(HR.units.CATS).some((c) => u in c);
  function badUnits(o, out = new Set()) {
    if (!o || typeof o !== 'object') return out;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'unit' || k === 'xUnit' || k === 'yUnit') && typeof v === 'string' && v !== '' && !known(v)) out.add(v);
      else if (v && typeof v === 'object') badUnits(v, out);
    }
    return out;
  }
  const unitMiss = (o) => { const b = badUnits(o); return b.size ? ['unidade desconhecida: ' + [...b].join(', ')] : []; };

  const pos = (x) => x && Number.isFinite(x.value) && x.value > 0;
  const fin = (x) => x && Number.isFinite(x.value);
  const curveOk = (c, min = 1) => c && c.x.length >= min && c.x.every(Number.isFinite) && c.y.every(Number.isFinite);

  function checkPipe(m, p) {
    const miss = unitMiss(p);
    if (!m.junctions.some((j) => j.id === p.up) || !m.junctions.some((j) => j.id === p.down)) miss.push('conectar às duas junções');
    if (p.up === p.down) miss.push('as pontas devem estar em junções diferentes');
    if (!pos(p.length)) miss.push('comprimento');
    const g = p.geometry;
    if (g.kind === 'circular' && !pos(g.d)) miss.push('diâmetro');
    if (g.kind === 'annulus' && !(pos(g.dOuter) && fin(g.dInner) && g.dOuter.value > 0)) miss.push('diâmetros do anel');
    if (g.kind === 'rectangular' && !(pos(g.width) && pos(g.height))) miss.push('largura e altura');
    if (g.kind === 'noncircular' && !(pos(g.area) && pos(g.perim))) miss.push('área e perímetro molhado');
    const f = p.friction;
    if (f.model === 'roughness' && !(fin(f.eps) && f.eps.value >= 0)) miss.push('rugosidade');
    if (f.model === 'relRoughness' && !(f.rel >= 0)) miss.push('rugosidade relativa');
    if (f.model === 'explicitF' && !(f.f > 0)) miss.push('fator de atrito');
    if (f.model === 'hw' && !(f.C > 0)) miss.push('coeficiente C');
    if (!(Number.isInteger(p.nParallel) && p.nParallel >= 1)) miss.push('número de tubos em paralelo');
    if (!(p.idReduction >= 0 && p.idReduction < 100)) miss.push('redução de diâmetro');
    return miss;
  }

  function checkJunction(m, j) {
    const miss = unitMiss(j);
    const t = JT[j.type];
    const n = pipesAt(m, j.id).length;
    if (n < t.pipes[0] || n > t.pipes[1]) {
      miss.push(t.pipes[0] === t.pipes[1] ? `exige ${t.pipes[0]} tubo(s); tem ${n}` : `exige de ${t.pipes[0]} a ${t.pipes[1]} tubos; tem ${n}`);
    }
    if (!fin(j.elevation)) miss.push('cota');
    if (!t.multi && n === 2) {
      const pr = ports(m, j);
      if (t.directional && pr && !pr.consistent) miss.push('sentido dos tubos: um deve chegar e outro sair');
    }
    switch (j.type) {
      case 'reservoir': if (!fin(j.liquidElev)) miss.push('nível do líquido'); if (!fin(j.surfP)) miss.push('pressão na superfície'); break;
      case 'pressure':
        if (!fin(j.P)) miss.push('pressão');
        if (j.ptype === 'static' && n !== 1) miss.push('pressão estática admite só 1 tubo');
        break;
      case 'flow': if (!(fin(j.Q) && j.Q.value >= 0)) miss.push('vazão (valor positivo)'); break;
      case 'branch': if (!fin(j.source)) miss.push('vazão de fonte'); break;
      case 'spray':
        if (j.sprayModel === 'CdA' && !(j.Cd > 0 && pos(j.dHole) && j.nHoles >= 1)) miss.push('Cd, diâmetro e número de furos');
        if (j.sprayModel === 'K' && !pos(j.Kf)) miss.push('fator K do aspersor');
        if (!fin(j.Pext)) miss.push('pressão externa');
        break;
      case 'pump':
        if (j.state === 'on') {
          if (['curve', 'controlFlow', 'controlDischarge', 'controlSuction'].includes(j.mode) && !curveOk(j.curve)) miss.push('curva de altura × vazão');
          if (j.mode === 'fixedFlow' && !(fin(j.fixedFlow) && j.fixedFlow.value >= 0)) miss.push('vazão fixa');
          if (j.mode === 'controlFlow' && !pos(j.setQ)) miss.push('vazão de controle');
          if ((j.mode === 'controlDischarge' || j.mode === 'controlSuction') && !fin(j.setP)) miss.push('pressão de controle');
          if (j.mode !== 'fixedFlow' && !(j.speed > 0)) miss.push('velocidade');
          if (j.mode !== 'fixedFlow' && !(Number.isInteger(j.nPumps) && j.nPumps >= 1)) miss.push('número de bombas');
        }
        break;
      case 'exitvalve':
        if (!fin(j.Pout)) miss.push('pressão de saída');
      // falls through
      case 'valve':
        if (j.lossModel === 'K' && !(j.K >= 0)) miss.push('K');
        if (j.lossModel === 'Cv' && !(j.Cv > 0)) miss.push('Cv');
        if (j.lossModel === 'Kv' && !(j.Kv > 0)) miss.push('Kv');
        break;
      case 'control':
        if ((j.ctype === 'PRV' || j.ctype === 'PSV') && !fin(j.setP)) miss.push('pressão de ajuste');
        if (j.ctype === 'FCV' && !pos(j.setQ)) miss.push('vazão de ajuste');
        if (j.ctype === 'PDCV' && !fin(j.setDP)) miss.push('queda de pressão de ajuste');
        if (!(j.kOpen >= 0)) miss.push('K totalmente aberta');
        break;
      case 'orifice':
        if (j.orModel !== 'K' && !pos(j.dO)) miss.push('diâmetro do orifício');
        if (j.orModel === 'Cd' && !(j.Cd > 0 && j.Cd <= 1)) miss.push('Cd');
        if (j.orModel === 'K' && !(j.K >= 0)) miss.push('K');
        break;
      case 'generic':
        if (j.genModel === 'K' && !(j.K >= 0)) miss.push('K');
        if (j.genModel === 'curve' && !curveOk(j.curve, 2)) miss.push('curva de perda (mín. 2 pontos)');
        break;
    }
    return miss;
  }

  function checkFluid(sys) {
    const f = sys.fluid;
    const um = unitMiss(sys);
    if (um.length) return um;
    if (f.kind === 'water') return fin(f.T) ? [] : ['temperatura'];
    const miss = [];
    if (!pos(f.rho)) miss.push('densidade');
    if (!pos(f.mu)) miss.push('viscosidade');
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
    const items = [
      { label: 'Controle da solução', ok: solOk },
      { label: 'Propriedades do sistema', ok: fluidMiss.length === 0, detail: fluidMiss.join(', ') },
      { label: 'Tubos definidos', ok: eff.pipes.length > 0 && pipesBad === 0, detail: eff.pipes.length ? `${pipesBad} de ${eff.pipes.length} incompletos` : 'nenhum tubo' },
      { label: 'Junções definidas', ok: eff.junctions.length > 0 && jBad === 0, detail: eff.junctions.length ? `${jBad} de ${eff.junctions.length} incompletas` : 'nenhuma junção' },
    ];
    return { ok: items.every((i) => i.ok), items, undef };
  }

  HR.model = {
    JT, q, clone, newJunction, newPipe, newModel, migrate,
    getPath, setPath, getObj, deepEqual,
    chain, effective, effValue, setField, isOverridden, clearOverride, removeObjectOverrides,
    addScenario, deleteScenario, descendants,
    pipesAt, ports, validate, checkPipe, checkJunction,
  };
})(typeof window !== 'undefined' ? window : globalThis);
