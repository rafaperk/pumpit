// Triggers of the time data (docs/time-simulation.md, §5 of its specification). A junction's tables apply by the clock
// ('time') or after events: one event ('single'), two events that alternate ('dualCyclic'), two in sequence
// ('dualSequential') or one combined event of the model ('combined'). An event is a condition: a quantity of an object
// (or its difference to the same quantity of another object) compared with a value. A combined event joins named events
// of the model with and, or and not. Only the next event of the sequence is watched; it is tested on the state of a
// step, and its table applies from the next step on.
//
//   condition = { q, obj ('p:ID' | 'j:ID'), end ('in' | 'out'), obj2, end2 (a difference), op, value ({ value, unit }
//                 or a state) }
//   model.events = [{ name, cond: condition } | { name, op: 'and' | 'or' | 'not', of: [names] }]
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units;
  const types = PumpIt.junctionTypes;

  // the quantities of a condition: the unit category of the value, and where it is read (at)
  //   tank: a finite tank   reservoir: any reservoir   end: the end of a pipe or the side of a junction
  //   pipeEnd: the end of a pipe   flow: a pipe or a two-port junction   pump, valve: the results of one
  //   opening: a valve that gives its opening   state: a junction whose type has states (pumps, valves, control valves)
  const QUANTITIES = {
    time: { cat: 'time' },
    elapsed: { cat: 'time' },
    tankLevel: { cat: 'length', at: 'tank' },
    surfaceElev: { cat: 'length', at: 'reservoir' },
    tankVolume: { cat: 'volume', at: 'tank' },
    surfP: { cat: 'pressure', at: 'reservoir' },
    pStatic: { cat: 'pressure', at: 'end' },
    pStag: { cat: 'pressure', at: 'end' },
    hgl: { cat: 'length', at: 'pipeEnd' },
    egl: { cat: 'length', at: 'pipeEnd' },
    flowVol: { cat: 'volFlow', at: 'flow' },
    flowMass: { cat: 'massFlow', at: 'flow' },
    velocity: { cat: 'velocity', at: 'flow' },
    pumpSpeed: { cat: 'percent', at: 'pump' },
    pumpFlow: { cat: 'volFlow', at: 'pump' },
    pumpHead: { cat: 'head', at: 'pump' },
    cv: { cat: 'none', at: 'valve' },
    opening: { cat: 'percent', at: 'opening' },
    state: { at: 'state' },
  };
  const OPS = ['>', '>=', '<', '<=', '=', '!='];
  const NUMERIC_OPS = ['>', '>=', '<', '<='];
  const STATE_OPS = ['=', '!='];
  const STARTS = ['time', 'single', 'dualCyclic', 'dualSequential', 'combined'];
  // number of conditions and of tables of each kind of trigger (a combined event is named, not a condition of its own)
  const EVENTS = { time: 0, single: 1, dualCyclic: 2, dualSequential: 2, combined: 0 };
  const TABLES = { time: 1, single: 1, dualCyclic: 2, dualSequential: 2, combined: 1 };
  const JOINS = ['and', 'or', 'not'];
  // a difference of two objects: the quantities read on an object, except a state
  const canDiffer = (q) => !!(QUANTITIES[q] && QUANTITIES[q].at && QUANTITIES[q].at !== 'state');

  // the object of a condition in a model: { kind: 'p' | 'j', o, def }
  function objectOf(eff, key) {
    if (typeof key !== 'string' || !/^[pj]:\d+$/.test(key)) return null;
    const o = M.getObj(eff, key);
    if (!o) return null;
    return { kind: key[0], o, def: key[0] === 'j' ? types.get(o.type) : null };
  }

  // where a quantity can be read: does the object fit?
  function fits(at, ob) {
    const tm = ob.def && ob.def.time;
    switch (at) {
      case 'tank': return !!(tm && tm.tank && PumpIt.time.tanks.isFinite(ob.o));
      case 'reservoir': return !!(tm && tm.tank);
      case 'end': return ob.kind === 'p' || ob.kind === 'j';
      case 'pipeEnd': return ob.kind === 'p';
      case 'flow': return ob.kind === 'p' || (ob.def && !ob.def.multi);
      case 'pump': return !!(tm && tm.results === 'pumps');
      case 'valve': return !!(tm && tm.results === 'valves');
      case 'opening': return !!(tm && tm.opening && tm.opening(ob.o));
      case 'state': return !!(tm && tm.states);
      default: return false;
    }
  }
  const needsEnd = (at) => at === 'end' || at === 'pipeEnd';

  // what is wrong with a condition, as keys under core.checklist.time.condition (an empty list: complete)
  function check(c, eff) {
    if (!c || typeof c !== 'object') return ['quantity'];
    const Q = QUANTITIES[c.q];
    if (!Q) return ['quantity'];
    const out = [];
    let ob = null;
    if (Q.at) {
      ob = objectOf(eff, c.obj);
      if (!ob || !fits(Q.at, ob)) out.push('object');
      if (needsEnd(Q.at) && c.end !== 'in' && c.end !== 'out') out.push('end');
    }
    // the difference to a second object (§5.2): the same quantity, read on an object that has it
    if (c.obj2) {
      const ob2 = canDiffer(c.q) ? objectOf(eff, c.obj2) : null;
      if (!ob2 || !fits(Q.at, ob2)) out.push('object2');
      if (needsEnd(Q.at) && c.end2 !== 'in' && c.end2 !== 'out') out.push('end');
    }
    if (!(Q.at === 'state' ? STATE_OPS : NUMERIC_OPS).includes(c.op)) out.push('operator');
    if (Q.at === 'state') {
      const states = ob && ob.def && ob.def.time && ob.def.time.states;
      if (!states || !states.includes(c.value)) out.push('value');
    } else {
      const v = c.value;
      if (!(v && typeof v === 'object' && Number.isFinite(v.value) && U.has(valueCat(c), v.unit))) out.push('value');
    }
    return out;
  }
  // the unit category of the value of a condition: a difference of two pressures is a pressure difference
  const valueCat = (c) => (c.obj2 && QUANTITIES[c.q].cat === 'pressure' ? 'dp' : QUANTITIES[c.q].cat);

  // a checked condition ready for the steps: its value in SI (a gauge pressure with the ambient pressure of ctx; the
  // difference of two pressures is a difference, whatever the kind of the unit)
  function prepare(c, eff, ctx) {
    const Q = QUANTITIES[c.q];
    const pc = { q: c.q, at: Q.at, op: c.op };
    const target = (key, end) => {
      const ob = objectOf(eff, key);
      const x = { kind: ob.kind, id: ob.o.id, def: ob.def, end };
      if (Q.at === 'flow' && ob.kind === 'j') {
        const pr = M.ports(eff, ob.o);
        x.inPipe = pr ? pr.in.id : null;
      }
      return x;
    };
    if (Q.at) Object.assign(pc, target(c.obj, c.end));
    if (c.obj2 && canDiffer(c.q)) pc.second = target(c.obj2, c.end2);
    if (Q.at === 'state') pc.s = c.value;
    else pc.v = U.toSI(c.value.value, c.value.unit, valueCat(c), ctx);
    return pc;
  }

  // the value of a quantity on one object in a step. S = { t, ta, sol (the results of the step), model (the model of
  // the step), si, tank(jid) → { h, zs, V } (the level shown at t) }
  function read(q, x, S) {
    const sol = S.sol;
    const pick = (r, a, b) => (r ? (x.end === 'out' ? r[b] : r[a]) : NaN);
    switch (q) {
      case 'tankLevel': { const y = S.tank(x.id); return y ? y.h : NaN; }
      case 'tankVolume': { const y = S.tank(x.id); return y ? y.V : NaN; }
      case 'surfaceElev': {
        const y = S.tank(x.id);
        if (y) return y.zs;
        const j = S.model.junctions.find((o) => o.id === x.id);
        return j && j.liquidElev ? S.si(j.liquidElev, 'length') : NaN;
      }
      case 'surfP': {
        const y = S.tank(x.id);
        if (y && Number.isFinite(y.Ps)) return y.Ps;
        const j = S.model.junctions.find((o) => o.id === x.id);
        return j && j.surfP ? S.si(j.surfP, 'pressure') : NaN;
      }
      case 'pStatic': return pick(x.kind === 'p' ? sol.pipes[x.id] : sol.junctions[x.id], 'Pin', 'Pout');
      case 'pStag': return pick(x.kind === 'p' ? sol.pipes[x.id] : sol.junctions[x.id], 'P0in', 'P0out');
      case 'hgl': return pick(sol.pipes[x.id], 'HGLin', 'HGLout');
      case 'egl': return pick(sol.pipes[x.id], 'EGLin', 'EGLout');
      case 'flowVol': {
        const r = x.kind === 'p' ? sol.pipes[x.id] : sol.junctions[x.id];
        return r ? (Number.isFinite(r.Q) ? r.Q : r.m / sol.fluid.rho) : NaN;
      }
      case 'flowMass': { const r = x.kind === 'p' ? sol.pipes[x.id] : sol.junctions[x.id]; return r ? r.m : NaN; }
      case 'velocity': {
        const r = x.kind === 'p' ? sol.pipes[x.id] : x.inPipe !== null && x.inPipe !== undefined ? sol.pipes[x.inPipe] : null;
        return r ? r.V : NaN;
      }
      case 'pumpSpeed': return sol.pumps[x.id] ? sol.pumps[x.id].speed : NaN;
      case 'pumpFlow': return sol.pumps[x.id] ? sol.pumps[x.id].Q : NaN;
      case 'pumpHead': return sol.pumps[x.id] ? sol.pumps[x.id].dH : NaN;
      case 'cv': return sol.valves[x.id] ? sol.valves[x.id].Cv : NaN;
      case 'opening': return sol.valves[x.id] && Number.isFinite(sol.valves[x.id].open) ? sol.valves[x.id].open : NaN;
      case 'state': {
        const j = S.model.junctions.find((o) => o.id === x.id);
        return j ? x.def.time.stateOf(j, sol) : undefined;
      }
      default: return NaN;
    }
  }
  // the value of a condition's quantity in a step: on its object, or its difference to the second one
  function valueOf(pc, S) {
    if (pc.q === 'time') return S.t;
    if (pc.q === 'elapsed') return S.t - S.ta;
    const a = read(pc.q, pc, S);
    return pc.second ? a - read(pc.q, pc.second, S) : a;
  }

  // does the condition hold in the step? (a quantity without a value, as an isolated pipe, never holds). A combined
  // event holds by its operator: all of its events (and), any of them (or) or none of them (not)
  function holds(pc, S) {
    if (pc.node) return holdsNode(pc.node, S);
    const x = valueOf(pc, S);
    if (pc.at === 'state') return pc.op === '=' ? x === pc.s : x !== undefined && x !== pc.s;
    return Number.isFinite(x) && compare(pc.op, x, pc.v);
  }
  // a number against the value of a condition
  function compare(op, x, v) {
    switch (op) {
      case '>': return x > v;
      case '>=': return x >= v;
      case '<': return x < v;
      case '<=': return x <= v;
      default: return false;
    }
  }
  function holdsNode(n, S) {
    if (n.cond) return holds(n.cond, S);
    if (n.op === 'and') return n.of.every((x) => holdsNode(x, S));
    if (n.op === 'or') return n.of.some((x) => holdsNode(x, S));
    return !n.of.some((x) => holdsNode(x, S));
  }

  // ---------- the named events of the model (§5.4): the same in every scenario
  const namedList = (eff) => (Array.isArray(eff.events) ? eff.events : []);
  const findNamed = (eff, name) => namedList(eff).find((e) => e && e.name === name) || null;
  // what is wrong with one named event on its own (its references aside)
  function namedOwn(e, eff) {
    if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !e.name.trim()) return ['events.name'];
    if (e.op === undefined) return check(e.cond, eff).length ? ['events.condition'] : [];
    if (!JOINS.includes(e.op)) return ['events.operator'];
    if (!Array.isArray(e.of) || !e.of.length || (e.op !== 'not' && e.of.length < 2)) return ['events.parts'];
    return e.of.every((n) => findNamed(eff, n)) ? [] : ['events.ref'];
  }
  // the events an event leads to, once each, or null when it leads back to itself (a cycle is refused)
  function reach(eff, name, path = new Set()) {
    if (path.has(name)) return null;
    const e = findNamed(eff, name);
    if (!e || e.op === undefined) return [name];
    path.add(name);
    let out = [name];
    for (const n of e.of || []) {
      const r = reach(eff, n, path);
      if (!r) return null;
      out = out.concat(r);
    }
    path.delete(name);
    return out;
  }
  // the checklist of the named events of a model, as keys under core.checklist.time (an empty list: complete)
  function checkNamed(eff) {
    const out = new Set(), names = new Set();
    for (const e of namedList(eff)) {
      for (const k of namedOwn(e, eff)) out.add(k);
      if (e && typeof e.name === 'string') {
        if (names.has(e.name)) out.add('events.duplicate');
        names.add(e.name);
        if (e.op !== undefined && !reach(eff, e.name)) out.add('events.cycle');
      }
    }
    return [...out];
  }
  // a named event that a junction can use: there, complete, with every event it leads to complete and without a cycle
  function namedOk(eff, name) {
    if (!findNamed(eff, name)) return false;
    const r = reach(eff, name);
    return !!r && r.every((n) => !namedOwn(findNamed(eff, n), eff).length);
  }
  // a named event ready for the steps: its tree of operators with its conditions prepared
  function prepareNamed(eff, name, ctx) {
    const build = (n) => {
      const e = findNamed(eff, n);
      return e.op === undefined ? { cond: prepare(e.cond, eff, ctx) } : { op: e.op, of: e.of.map(build) };
    };
    return { q: 'combined', name, node: build(name) };
  }

  // ---------- the phases of a junction (§5.1): 0 waiting for the first event (the model as it is), 1 its first table,
  // 2 its second one. te: the time zero of the table in use (the step where its event fired), ta: when it began to apply
  // (the start of the simulation before any event)
  const initial = (jt, t0) => (jt.start === 'time' ? { phase: 1, te: 0, ta: t0 } : { phase: 0, te: t0, ta: t0 });

  // the index of the condition watched now (0: the first event, 1: the second), or −1
  function armed(jt, s) {
    switch (jt.start) {
      case 'single': case 'combined': return s.phase === 0 ? 0 : -1;
      case 'dualCyclic': return s.phase === 1 ? 1 : 0;
      case 'dualSequential': return s.phase === 0 ? 0 : s.phase === 1 ? 1 : -1;
      default: return -1;
    }
  }

  // the phase after event e fired at the time t
  const after = (e, t) => ({ phase: e + 1, te: t, ta: t });

  PumpIt.time = Object.assign(PumpIt.time || {}, {
    events: {
      QUANTITIES, OPS, NUMERIC_OPS, STATE_OPS, STARTS, EVENTS, TABLES, JOINS, canDiffer, valueCat, needsEnd, fits, objectOf, check,
      prepare, valueOf, holds, compare, checkNamed, namedOk, prepareNamed, initial, armed, after,
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
