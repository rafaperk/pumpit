// Tests of the time simulation (docs/time-simulation.md): the cases of section 12 of its specification, with the values
// its specification team calculated on its own. Usage: node tests/time.test.cjs
const { loadCore } = require('./load-core');

const PumpIt = loadCore('en');
const { model: M, time: TM, units: U } = PumpIt;
const q = M.q;

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const f6 = (x) => (Number.isFinite(x) ? x.toFixed(6) : String(x));

// ---------- models of the cases: user liquid of 1000 kg/m³ and 1 mPa·s, g0, 101.325 kPa, explicit friction factors
function base() {
  const m = M.newModel();
  m.system.fluid = { kind: 'user', name: 'test liquid', rho: q(1000, 'kg/m³'), mu: q(1, 'mPa·s'), pv: q(2.339, 'kPa(a)') };
  m.system.patm = q(101.325, 'kPa(a)');
  m.solution.time.on = true;
  return m;
}
function junction(m, type, id, props) {
  const j = Object.assign(M.newJunction(type, id, 0, 0), props);
  m.junctions.push(j);
  return j;
}
function pipe(m, id, up, down, L, D, f, unit = 'm') {
  const p = M.newPipe(id, up, down);
  p.length = q(L, unit);
  p.geometry.d = q(D, 'm');
  p.friction = { model: 'explicitF', f };
  m.pipes.push(p);
  return p;
}
const tank = (bottom, height, area, more = {}) => Object.assign({ model: 'open', bottom: q(bottom, 'm'), height: q(height, 'm'), shape: 'constant', area: q(area, 'm²') }, more);
const control = (m, stop, step, unit = 's', more = {}) => Object.assign(m.solution.time, { start: q(0, unit), stop: q(stop, unit), step: q(step, unit) }, more);
const timeData = (what, start, when, tables, more = {}) => Object.assign({ use: true, what, basis: 'absolute', start, when, tables, repeat: false, interp: 'linear' }, more);
const table = (t, v, tUnit, vUnit) => ({ t, v, tUnit, vUnit });

// a run of the effective model of a scenario, with its checklist complete
function simulate(m, sid = 'base') {
  const eff = M.effective(m, sid);
  const v = M.validate(eff);
  if (!v.ok) throw new Error('Incomplete model: ' + JSON.stringify([...v.undef]) + ' ' + JSON.stringify(v.items.filter((i) => !i.ok)));
  const r = TM.run(eff);
  if (!r.ok) throw new Error('Failed: ' + r.errors.join('; '));
  if (r.stopped) throw new Error('Stopped at ' + r.stopped.t + ': ' + r.stopped.errors.join('; '));
  return r;
}
// a value of the series at the time t
function at(r, kind, id, field, t) {
  const i = [...r.times].findIndex((x) => Math.abs(x - t) < 1e-9);
  if (i < 0) throw new Error('time not recorded: ' + t);
  return r.series[kind][id][field][i];
}
const events = (r, key) => r.events.filter((e) => e.key === key);
const balance = (r, jid) => { const o = r.totals.tanks[jid]; return { o, closure: o.sumQ - (o.Vf - o.V0 + o.over - o.def) }; };

// ---------- T1: a tank draining into a lower reservoir
function t1(step, method, tolRel) {
  const m = base();
  if (tolRel) m.solution.tolRel = tolRel;
  junction(m, 'reservoir', 1, { elevation: q(10, 'm'), liquidElev: q(15, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(10, 8, 10) });
  junction(m, 'reservoir', 2, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
  pipe(m, 1, 1, 2, 100, 0.1, 0.02);
  control(m, 2400, step, 's', { method });
  return m;
}
const T1_EXACT = { 300: 4.109926, 600: 3.247073, 900: 2.411442, 1200: 1.603032, 1500: 0.821844, 1800: 0.067878 };
const c1 = (Math.PI * 0.01 / 4) / 10 * Math.sqrt(2 * 9.80665 * 0.1 / (0.02 * 100));
const h1Exact = (t) => (Math.sqrt(15) - c1 * t / 2) ** 2 - 10;

console.log('\nT1  Draining into a lower reservoir');
{
  check('exact solution of the case (c and h)', near(c1, 7.77768e-4, 1e-9) && Object.entries(T1_EXACT).every(([t, h]) => near(h1Exact(+t), h, 1e-6)), 'c = ' + c1.toExponential(6));
  const r = simulate(t1(60, 'forward'));
  check('Q0 = 0.030122835 m³/s', near(at(r, 'pipes', 1, 'Q', 0), 0.030122835, 1e-9), f6(at(r, 'pipes', 1, 'Q', 0) * 1e3) + ' L/s');
  const exp = { 'forward 60': [3.241780, 2.403631, 1.592795], 'forward 30': [3.244430, 2.407543, 1.597922], 'central 60': [3.247065, 2.411430, 1.603016], 'central 30': [3.247071, 2.411439, 1.603028] };
  for (const [name, hs] of Object.entries(exp)) {
    const [method, dt] = name.split(' ');
    const rr = method === 'forward' && dt === '60' ? r : simulate(t1(+dt, method));
    const got = [600, 900, 1200].map((t) => at(rr, 'tanks', 1, 'h', t));
    check(`${method}, Δt = ${dt} s: h(600, 900, 1200 s)`, got.every((h, i) => near(h, hs[i], 1e-5)), got.map(f6).join(' · '));
  }
  check('h(1800 s) = 0.053070 m', near(at(r, 'tanks', 1, 'h', 1800), 0.053070, 1e-5), f6(at(r, 'tanks', 1, 'h', 1800)));
  const { o, closure } = balance(r, 1);
  check('emptied at 1860 s with a deficit of 0.948926 m³', near(at(r, 'tanks', 1, 'V', 1860), 0, 1e-12) && near(o.def, 0.948926, 1e-6), 'deficit ' + f6(o.def) + ' m³');
  check('the warning of the deficit', r.warnings.some((w) => w.obj === 'j:1' && /too long for the emptying/.test(w.text)));
  const empty = events(r, 'core.time.log.tank.empty'), closed = events(r, 'core.time.log.pipe.closed');
  check('the log shows "empty" and "pipe closed" at 1860 s', empty.length === 1 && empty[0].t === 1860 && closed.length === 1 && closed[0].t === 1860 && closed[0].obj === 'p:1');
  const after = [...r.times].map((t, i) => [t, r.series.pipes[1].Q[i], r.series.tanks[1].h[i]]).filter(([t]) => t >= 1860);
  check('no flow and a level of zero from 1860 s to 2400 s', after.length === 10 && after.every(([, Q, h]) => Q === 0 && h === 0));
  check('T12: the volume balance of the tank closes', Math.abs(closure) <= 1e-9 * 80, closure.toExponential(2) + ' m³');
}

console.log('\nT9  Order of accuracy, forward × central');
{
  const err = (dt, method) => at(simulate(t1(dt, method, 1e-8)), 'tanks', 1, 'h', 900) - h1Exact(900);
  const f60 = err(60, 'forward'), f30 = err(30, 'forward'), c60 = err(60, 'central'), c30 = err(30, 'central');
  check('forward: −7.8104e-3 and −3.8991e-3 m at 900 s', near(f60, -7.8104e-3, 2e-7) && near(f30, -3.8991e-3, 2e-7), f60.toExponential(4) + ' · ' + f30.toExponential(4));
  check('forward: first order (ratio between 1.8 and 2.2)', f60 / f30 > 1.8 && f60 / f30 < 2.2, (f60 / f30).toFixed(3));
  check('central: −1.2300e-5 and −3.0750e-6 m at 900 s', near(c60, -1.23e-5, 2e-7) && near(c30, -3.075e-6, 2e-7), c60.toExponential(4) + ' · ' + c30.toExponential(4));
  check('central: second order (ratio between 3.6 and 4.4)', c60 / c30 > 3.6 && c60 / c30 < 4.4, (c60 / c30).toFixed(3));
}

console.log('\nT2  Two tanks levelling');
{
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(6, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 10, 5) });
  junction(m, 'reservoir', 2, { elevation: q(0, 'm'), liquidElev: q(2, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 10, 5) });
  pipe(m, 1, 1, 2, 50, 0.08, 0.025);
  control(m, 1800, 30);
  const r = simulate(m);
  const exp = { 300: 2.752091, 600: 1.734874, 900: 0.948971, 1200: 0.395465, 1500: 0.076799, 1800: 0.001142 };
  const got = Object.keys(exp).map((t) => at(r, 'tanks', 1, 'h', +t) - at(r, 'tanks', 2, 'h', +t));
  check('Δh at 300 … 1800 s', got.every((d, i) => near(d, Object.values(exp)[i], 1e-5)), got.map(f6).join(' · '));
  const h1 = r.series.tanks[1].h, h2 = r.series.tanks[2].h;
  check('h1 + h2 = 8 m in every step (conservation)', [...h1].every((h, i) => Math.abs(h + h2[i] - 8) <= 1e-9));
  const beta = 0.001126329, lim = (beta * 30) ** 2;
  const first = [...h1].findIndex((h, i) => Math.abs(h - h2[i]) < 4 * lim);
  // the step after the first one below 4·(β·Δt)² lands within (β·Δt)²: the period-2 cycle of the forward method
  check('near the levelling, |Δh| ≤ (β·Δt)² after the first step below 4·(β·Δt)²', first > 0 && first < h1.length - 1 && [...h1].slice(first + 1).every((h, i) => Math.abs(h - h2[first + 1 + i]) <= lim * (1 + 1e-6)), 'from ' + r.times[first + 1] + ' s');
  for (const id of [1, 2]) { const { closure } = balance(r, id); check(`T12: balance of tank J${id}`, Math.abs(closure) <= 1e-9 * 50); }
}

// ---------- T3: filling by a pump stopped by the level (one event)
function t3() {
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
  junction(m, 'pump', 2, {
    elevation: q(0, 'm'), mode: 'curve', curve: { x: [0, 108, 180], y: [50, 32, 0], xUnit: 'm³/h', yUnit: 'm', fit: '2' }, stopMode: 'closed',
    time: timeData('speed', 'single', [{ q: 'tankLevel', obj: 'j:3', op: '>=', value: q(8, 'm') }], [table([0], [0], 's', '%')]),
  });
  junction(m, 'reservoir', 3, { elevation: q(20, 'm'), liquidElev: q(20, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(20, 10, 20) });
  pipe(m, 1, 1, 2, 10, 0.15, 0.02);
  pipe(m, 2, 2, 3, 190, 0.15, 0.02);
  control(m, 7200, 60);
  return m;
}
console.log('\nT3  Filling by a pump stopped by the level (single event)');
let r3;
{
  r3 = simulate(t3());
  const r = r3;
  check('Q0 = 0.0350976 m³/s', rel(at(r, 'pipes', 2, 'Q', 0), 0.0350976) < 1e-5, f6(at(r, 'pipes', 2, 'Q', 0)));
  const exp = { 1200: [2.070715, 0.0338646], 2400: [4.067452, 0.0326316], 3600: [5.990209, 0.0313986], 4800: [7.838983, 0.0301655], 4920: [8.019791, 0.0300422] };
  for (const [t, [h, Q]] of Object.entries(exp)) {
    const gh = at(r, 'tanks', 3, 'h', +t), gq = at(r, 'pipes', 2, 'Q', +t);
    check(`h and Q at ${t} s`, rel(gh, h) < 1e-5 && rel(gq, Q) < 1e-5, f6(gh) + ' m · ' + gq.toFixed(7) + ' m³/s');
  }
  const ev = events(r, 'core.time.log.table.started');
  check('the event fires at 4920 s', ev.length === 1 && ev[0].t === 4920 && ev[0].obj === 'j:2');
  const after = [...r.times].map((t, i) => [t, r.series.pipes[2].Q[i], r.series.tanks[3].h[i]]).filter(([t]) => t >= 4980);
  check('from 4980 s on, Q = 0 and h = 8.109918 m', after.every(([, Q, h]) => Q === 0 && rel(h, 8.109918) < 1e-5), f6(after[0][2]));
  check('the log shows the pump stopped at 4980 s', events(r, 'core.time.log.pump.off').map((e) => e.t).join() === '4980');
  const { closure } = balance(r, 3);
  check('T12: balance of the tank, and the pump fills it', Math.abs(closure) <= 1e-9 * 200 && rel(r.totals.pumps[2].V, r.totals.tanks[3].Vin) < 1e-12, f6(r.totals.pumps[2].V) + ' m³ pumped');
}

console.log('\nT11 Reproducing a step');
{
  const s = r3.snapshot(40);
  check('snapshot(40) is the step recorded at 2400 s', s && s.time.t === 2400 && rel(s.pipes[2].Q, at(r3, 'pipes', 2, 'Q', 2400)) < 1e-9 && rel(s.junctions[2].P0out, at(r3, 'junctions', 2, 'P0out', 2400)) < 1e-9, s ? s.pipes[2].Q.toFixed(7) : 'none');
  const m = t3();
  m.solution.time.on = false;
  const j = m.junctions.find((x) => x.id === 3);
  delete j.tank;
  j.liquidElev = q(24.067452, 'm');
  const st = PumpIt.solver.run(M.effective(m, 'base'));
  check('a steady state with the surface at 24.067452 m gives Q = 0.0326316 m³/s', st.ok && rel(st.pipes[2].Q, 0.0326316) < 1e-5, st.ok ? st.pipes[2].Q.toFixed(7) : st.errors.join());
}

// ---------- T4: on and off by the level, two cyclic events
function t4() {
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(10, 'm'), surfP: q(0, 'kPa(g)') });
  junction(m, 'pump', 2, {
    elevation: q(0, 'm'), mode: 'fixedFlow', fixedFlow: q(0, 'm³/s'),
    time: timeData('Q', 'dualCyclic', [
      { q: 'tankLevel', obj: 'j:3', op: '<=', value: q(2, 'm') },
      { q: 'tankLevel', obj: 'j:3', op: '>=', value: q(4, 'm') },
    ], [table([0], [3 / 64], 's', 'm³/s'), table([0], [0], 's', 'm³/s')]),
  });
  junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(4, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 5, 8) });
  junction(m, 'flow', 4, { elevation: q(0, 'm'), Q: q(1 / 64, 'm³/s'), dir: 'out' });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  pipe(m, 2, 2, 3, 10, 0.1, 0.02);
  pipe(m, 3, 3, 4, 10, 0.1, 0.02);
  control(m, 8192, 64);
  return m;
}
console.log('\nT4  On and off by the level (two cyclic events)');
{
  const r = simulate(t4());
  const ev = events(r, 'core.time.log.table.started');
  const e1 = ev.filter((e) => e.params.n === 1).map((e) => e.t), e2 = ev.filter((e) => e.params.n === 2).map((e) => e.t);
  check('E1 (on) at 1024, 2944, 4864 and 6784 s', e1.join() === '1024,2944,4864,6784', e1.join());
  check('E2 (off) at 1664, 3584, 5504 and 7424 s', e2.join() === '1664,3584,5504,7424', e2.join());
  const X = r.extremes.tanks[3];
  check('lowest and highest levels 1.875 and 4.375 m', near(X.hmin.v, 1.875, 1e-12) && near(X.hmax.v, 4.375, 1e-12), X.hmin.v + ' · ' + X.hmax.v);
  const p = r.totals.pumps[2];
  check('the pump: 2560 s running, 4 starts, 120 m³', near(p.ton, 2560, 1e-9) && p.starts === 4 && near(p.V, 120, 1e-9), `${p.ton} s · ${p.starts} · ${f6(p.V)} m³`);
  check('the demand: 128 m³', near(r.totals.flows[4].V, 128, 1e-9), f6(r.totals.flows[4].V));
  check('level of 3.0 m at 8192 s', near(at(r, 'tanks', 3, 'h', 8192), 3, 1e-12));
  const { o, closure } = balance(r, 3);
  check('balance: 120 − 128 = −8 m³ = (3.0 − 4.0)·8', near(o.Vf - o.V0, -8, 1e-9) && Math.abs(closure) <= 1e-12 * 40, f6(o.Vf - o.V0));
  check('the pump starts and stops in the log', events(r, 'core.time.log.pump.on').map((e) => e.t).join() === '1088,3008,4928,6848' && events(r, 'core.time.log.pump.off').length === 4);
}

console.log('\nT16 Child scenario');
{
  const m = t4();
  const s = M.addScenario(m, 'base', 'child');
  M.setField(m, s.id, 'sol', 'time.stop', q(2048, 's'));
  M.setField(m, s.id, 'j:2', 'time.when.0.value', q(2.5, 'm'));
  const r = simulate(m, s.id);
  const ev = events(r, 'core.time.log.table.started').map((e) => e.t + ':' + e.params.n);
  check('E1 at 768 s and E2 at 1280 s, nothing else', ev.join() === '768:1,1280:2', ev.join());
  check('level of 3.0 m at 2048 s', near(at(r, 'tanks', 3, 'h', 2048), 3, 1e-12), f6(at(r, 'tanks', 3, 'h', 2048)));
  const rb = simulate(m, 'base');
  check('the base scenario still gives T4', events(rb, 'core.time.log.table.started').length === 8 && near(at(rb, 'tanks', 3, 'h', 8192), 3, 1e-12));
}

// ---------- T5: a daily demand profile, relative, repeated
function t5(more) {
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(50, 'm'), surfP: q(0, 'kPa(g)') });
  junction(m, 'flow', 2, {
    elevation: q(0, 'm'), Q: q(18, 'm³/h'), dir: 'out',
    time: timeData('Q', 'time', [], [table([0, 6, 8, 12, 18, 22, 24], [100, 100, 300, 240, 360, 120, 100], 'h', '%')], Object.assign({ basis: 'relative', repeat: true }, more)),
  });
  pipe(m, 1, 1, 2, 100, 0.1, 0.02);
  control(m, 48, 30, 'h', { step: q(30, 'min') });
  return m;
}
console.log('\nT5  Daily demand profile (relative table, repeated)');
{
  const r = simulate(t5());
  const Qh = (t) => at(r, 'pipes', 1, 'Q', t * 3600) * 3600;
  const exp = { 7: 36, 10: 48.6, 20.5: 37.8, 24: 18, 31: 36 };
  const got = Object.keys(exp).map((t) => Qh(+t));
  check('flows at 7, 10, 20.5, 24 and 31 h', got.every((v, i) => near(v, Object.values(exp)[i], 1e-9)), got.map((x) => x.toFixed(3)).join(' · '));
  const day = (from, to) => { let s = 0; for (let k = from; k <= to; k++) s += r.series.pipes[1].Q[k] * 1800; return s; };
  check('910.8 m³ delivered each day', near(day(0, 47), 910.8, 1e-9) && near(day(48, 95), 910.8, 1e-9), f6(day(0, 47)) + ' · ' + f6(day(48, 95)));
  check('the totals: 1821.6 m³ delivered', near(r.totals.flows[2].V, 1821.6, 1e-9), f6(r.totals.flows[2].V));
  const h = simulate(t5({ repeat: false }));
  const Qhh = (t) => at(h, 'pipes', 1, 'Q', t * 3600) * 3600;
  let d2 = 0; for (let k = 48; k <= 95; k++) d2 += h.series.pipes[1].Q[k] * 1800;
  check('held: 18 m³/h after 24 h, 432 m³ the second day, and its caution', near(Qhh(25), 18, 1e-9) && near(Qhh(40), 18, 1e-9) && near(d2, 432, 1e-9) && h.warnings.some((w) => w.level === 'caution' && /ends before the simulation does, and its last value is held/.test(w.text)));
  m5x = t5({ repeat: false });
  m5x.solution.time.dataEnd = 'extrapolate';
  const x = simulate(m5x);
  const Qx = (t) => at(x, 'pipes', 1, 'Q', t * 3600) * 3600;
  check('extrapolated: 16.2 at 25 h, 7.2 at 30 h, 0 from 34 h, with its warning', near(Qx(25), 16.2, 1e-9) && near(Qx(30), 7.2, 1e-9) && Qx(34) === 0 && Qx(40) === 0 && x.warnings.some((w) => w.level === 'warning' && /extrapolated/.test(w.text)), [25, 30, 34, 40].map((t) => Qx(t).toFixed(3)).join(' · '));
}
var m5x;

console.log('\nT6  Tank with a table of volume against height');
{
  const m = base();
  junction(m, 'flow', 1, { elevation: q(0, 'm'), Q: q(1 / 16, 'm³/s'), dir: 'in' });
  junction(m, 'reservoir', 2, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 3, 1, { shape: 'table', table: { h: [0, 1, 2, 3], V: [0, 2, 6, 12], hUnit: 'm', vUnit: 'm³' } }) });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  control(m, 13 * 16, 16);
  const r = simulate(m);
  const exp = { 1: 0.5, 2: 1, 3: 1.25, 6: 2, 7: 2.1666667, 9: 2.5, 12: 3, 13: 3 };
  const got = Object.keys(exp).map((k) => at(r, 'tanks', 2, 'h', 16 * k));
  check('levels at the steps 1, 2, 3, 6, 7, 9, 12 and 13', got.every((h, i) => near(h, Object.values(exp)[i], 1e-7)), got.map(f6).join(' · '));
  check('full at step 12, 1 m³ overflowed at step 13', at(r, 'tanks', 2, 'state', 192) === 1 && near(r.totals.tanks[2].over, 1, 1e-12));
  check('the empty tank does not close the pipe that fills it', events(r, 'core.time.log.pipe.closed').length === 0);
  const { closure } = balance(r, 2);
  check('T12: balance of the tank', Math.abs(closure) <= 1e-9 * 12);
}

console.log('\nT7  Overflow');
{
  const run = (stop) => {
    const m = base();
    junction(m, 'flow', 1, { elevation: q(0, 'm'), Q: q(1 / 32, 'm³/s'), dir: 'in' });
    junction(m, 'reservoir', 2, { elevation: q(0, 'm'), liquidElev: q(2.5, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 3, 4) });
    pipe(m, 1, 1, 2, 10, 0.1, 0.02);
    control(m, stop, 8);
    return simulate(m);
  };
  const r = run(96);
  check('the level rises 0.0625 m per step and reaches 3.0 m at 64 s', [0, 8, 16, 32, 56, 64].every((t) => at(r, 'tanks', 2, 'h', t) === 2.5 + 0.0625 * t / 8));
  check('the log shows "full" at 64 s', events(r, 'core.time.log.tank.full').map((e) => e.t).join() === '64');
  const over = [72, 80, 88, 96].map((t) => run(t).totals.tanks[2].over);
  check('overflowed 0.25, 0.5, 0.75 and 1.0 m³ at 72, 80, 88 and 96 s', over.join() === '0.25,0.5,0.75,1', over.join(' · '));
  check('the level stays at 3.0 m', [72, 80, 88, 96].every((t) => at(r, 'tanks', 2, 'h', t) === 3));
  const { closure } = balance(r, 2);
  check('T12: balance of the tank', Math.abs(closure) <= 1e-9 * 12);
}

console.log('\nT8  Valve ramp started by the time');
{
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(10, 'm'), surfP: q(0, 'kPa(g)') });
  junction(m, 'valve', 2, {
    elevation: q(0, 'm'), lossModel: 'Cv', Cv: 100,
    time: timeData('Cv', 'single', [{ q: 'time', op: '>=', value: q(60, 's') }], [table([0, 30], [100, 0], 's', '')]),
  });
  junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  pipe(m, 2, 2, 3, 10, 0.1, 0.02);
  control(m, 150, 10);
  const r = simulate(m);
  const used = (t) => at(r, 'inputs', 2, 'v', t);
  check('Cv 100 from 0 to 60 s', [0, 10, 30, 60].every((t) => used(t) === 100));
  check('Cv 66.6667 at 70 s and 33.3333 at 80 s', near(used(70), 200 / 3, 1e-9) && near(used(80), 100 / 3, 1e-9), f6(used(70)) + ' · ' + f6(used(80)));
  check('closed from 90 s: no flow', [90, 100, 150].every((t) => used(t) === 0 && at(r, 'pipes', 1, 'Q', t) === 0));
  check('a positive flow until 80 s', [0, 60, 70, 80].every((t) => at(r, 'pipes', 1, 'Q', t) > 0));
  check('the result Cv follows the table', rel(at(r, 'valves', 2, 'Cv', 70), 200 / 3) < 1e-6, f6(at(r, 'valves', 2, 'Cv', 70)));
  check('the log: the event at 60 s and "valve closed" at 90 s', events(r, 'core.time.log.table.started').map((e) => e.t).join() === '60' && events(r, 'core.time.log.valve.closed').map((e) => e.t).join() === '90');
}

console.log('\nT10 The steady state in every step');
{
  for (const ex of PumpIt.examples.EXAMPLES) {
    const m = ex.build();
    M.normalizeTime(m);
    for (const scn of m.scenarios.list) {
      const eff = M.effective(m, scn.id);
      if (!M.validate(eff).ok) continue;
      const st = PumpIt.solver.run(eff);
      eff.solution.time = Object.assign(M.newTimeControl(), { on: true, start: q(0, 'h'), stop: q(3, 'h'), step: q(1, 'h') });
      const r = TM.run(eff);
      let bad = 0, n = 0;
      for (const kind of ['pipes', 'junctions', 'pumps', 'valves']) {
        for (const id in st[kind]) {
          for (const f in st[kind][id]) {
            if (typeof st[kind][id][f] !== 'number') continue;
            const s = r.series[kind][id][f];
            for (let i = 0; i < r.times.length; i++) {
              n++;
              const a = s[i], b = st[kind][id][f];
              if (!(Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= 1e-12 * Math.abs(b))) bad++;
            }
          }
        }
      }
      check(`${ex.name} [${scn.name}]: ${r.times.length} steps equal to the steady state`, r.ok && !r.stopped && bad === 0 && n > 0, `${n} values${bad ? ', ' + bad + ' differ' : ''}`);
    }
  }
}

console.log('\nT13 Answer key of the reference program');
{
  const m = M.newModel();
  m.system.fluid = { kind: 'water', T: q(70, '°F'), name: 'water' };
  m.solution.time.on = true;
  const ft = (v) => q(v, 'ft');
  junction(m, 'reservoir', 1, { elevation: ft(0), liquidElev: ft(10), surfP: q(0, 'psig') });
  junction(m, 'pump', 2, { elevation: ft(0), mode: 'curve', curve: { x: [0, 500, 1000], y: [300, 380, 250], xUnit: 'gpm', yUnit: 'ft', fit: '2' } });
  junction(m, 'valve', 3, {
    elevation: ft(200), lossModel: 'Cv', Cv: 100,
    time: timeData('Cv', 'single', [{ q: 'tankLevel', obj: 'j:4', op: '>', value: ft(15) }], [table([0, 30, 3600], [100, 0, 0], 's', '')]),
  });
  junction(m, 'reservoir', 4, { elevation: ft(200), liquidElev: ft(200), surfP: q(0, 'psig'), tank: { model: 'open', bottom: ft(200), height: ft(30), shape: 'constant', area: q(150, 'ft²') } });
  const steel = (id, up, down, L) => { const p = M.newPipe(id, up, down); p.length = ft(L); m.pipes.push(p); };
  steel(1, 1, 2, 10); steel(2, 2, 3, 980); steel(3, 3, 4, 10);
  control(m, 60, 1, 'min');
  const r = simulate(m);
  const gpm = (t) => at(r, 'pipes', 2, 'Q', t) / U.CATS.volFlow.gpm;
  check('flow at 0: 504.0 gpm ± 0.15 %', rel(gpm(0), 504.0) <= 0.0015, gpm(0).toFixed(2) + ' gpm');
  check('flow at 10 min: 498.7 gpm ± 0.15 %', rel(gpm(600), 498.7) <= 0.0015, gpm(600).toFixed(2) + ' gpm');
  const h10 = at(r, 'tanks', 4, 'h', 600) / 0.3048, V10 = at(r, 'tanks', 4, 'V', 600) / 0.3048 ** 3;
  check('height in the tank at 10 min: 4.472 ft ± 0.01 ft', near(h10, 4.472, 0.01), h10.toFixed(4) + ' ft');
  check('volume in the tank at 10 min: 670.8 ft³ ± 1.5 ft³', near(V10, 670.8, 1.5), V10.toFixed(2) + ' ft³');
  const hf = at(r, 'tanks', 4, 'h', 3600) / 0.3048;
  const ev = events(r, 'core.time.log.table.started');
  check('final height between 15.5 and 16.5 ft', hf > 15.5 && hf < 16.5, hf.toFixed(3) + ' ft, event at ' + (ev[0] ? ev[0].t / 60 + ' min' : 'none'));
}

console.log('\nT14 Demand without supply');
{
  const m = base();
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0.5, 'm'), surfP: q(0, 'kPa(g)'), tank: tank(0, 2, 1) });
  junction(m, 'flow', 2, { elevation: q(0, 'm'), Q: q(1 / 256, 'm³/s'), dir: 'out' });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  control(m, 256, 32);
  const r = simulate(m);
  const hs = [0, 32, 64, 96, 128].map((t) => at(r, 'tanks', 1, 'h', t));
  check('levels 0.5, 0.375, 0.25, 0.125 and 0 at 128 s, without a deficit', hs.join() === '0.5,0.375,0.25,0.125,0' && r.totals.tanks[1].def === 0, hs.join(' · '));
  check('the demand left without supply: 0.5 m³ until 256 s', near(r.totals.flows[2].unmet, 0.5, 1e-12) && near(r.totals.flows[2].V, 0.5, 1e-12), f6(r.totals.flows[2].unmet));
  const at128 = (key) => events(r, key).map((e) => e.t).join();
  check('the log: "empty", "pipe closed" and "demand without supply", all at 128 s', at128('core.time.log.tank.empty') === '128' && at128('core.time.log.pipe.closed') === '128' && at128('core.time.log.demand.unsupplied') === '128');
  const { closure } = balance(r, 1);
  check('T12: balance of the tank, and the demand closes with it', Math.abs(closure) <= 1e-9 * 2 && near(r.totals.tanks[1].Vout, r.totals.flows[2].V, 1e-12));
}

console.log('\nTables, checklist and options');
{
  const tb = TM.tables;
  const T = tb.prepare(table([0, 10, 10, 20], [1, 2, 5, 6], 's', ''), { cat: 'none' }, { basis: 'absolute', ctx: {} });
  const o = { repeat: false, interp: 'linear', dataEnd: 'hold' };
  check('two points at the same time: the second applies from that time', tb.valueAt(T, 9.999, o).v < 2 && tb.valueAt(T, 10, o).v === 5 && tb.valueAt(T, 15, o).v === 5.5);
  check('step interpolation', tb.valueAt(T, 15, Object.assign({}, o, { interp: 'step' })).v === 5);
  const K = tb.prepare(table([0, 10], [4, -1], 's', ''), { cat: 'none', space: PumpIt.junctionTypes.shared.K_SPACE }, { basis: 'absolute', ctx: {} });
  check('a ramp of K is interpolated in 1/√K and K < 0 closes', near(tb.valueAt(K, 5, o).v, 16, 1e-12) && tb.valueAt(K, 10, o).v === -1, f6(tb.valueAt(K, 5, o).v));
  // the checklist with the time simulation on
  const m = t4();
  m.solution.time.step = q(0, 's');
  m.junctions[1].time.when[0].obj = 'j:4';
  m.junctions[2].tank.area = q(0, 'm²');
  const v = M.validate(M.effective(m, 'base'));
  check('the checklist: time control, an event on a junction without a tank, a tank without area', !v.ok && v.items.some((i) => i.key === 'time' && !i.ok) && v.undef.has('j:2') && v.undef.has('j:3'));
  m.solution.time.on = false;
  check('with the simulation off, the time data and the tanks are kept and not checked', M.validate(M.effective(m, 'base')).ok);
  // the solver options without the time simulation
  const s = base();
  junction(s, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(5, 'm') });
  junction(s, 'valve', 2, { elevation: q(0, 'm'), closed: true });
  junction(s, 'flow', 3, { elevation: q(0, 'm'), Q: q(10, 'm³/h'), dir: 'out' });
  pipe(s, 1, 1, 2, 10, 0.1, 0.02); pipe(s, 2, 2, 3, 10, 0.1, 0.02);
  const eff = M.effective(s, 'base');
  const r0 = PumpIt.solver.run(eff), r1 = PumpIt.solver.run(eff, { dropUnsupplied: true });
  check('a demand behind a closed valve: an error, or without supply with dropUnsupplied', !r0.ok && r1.ok && r1.unsupplied.length === 1 && r1.unsupplied[0].jid === 3 && r1.pipes[2].m === 0);
}

// ---------- T17: reading the .fth files, written here from Annex A of the specification (no file of another program)
console.log('\nT17 Reading the time data of .fth files');
{
  const FTH = PumpIt.importers.fth;
  // records with the documented positions: a pipe, and a junction with its common block (b+0 … b+45), the tables of the
  // common block closed by −999 at b+68, then the block of its kind from b+69
  function pipeRec({ id, from, to, L = 10, z1 = 0, z2 = 0 }) {
    const blk = new Array(64).fill('0');
    Object.assign(blk, { 0: 'None', 1: '-1', 3: from, 4: to, 5: 10, 6: 'cm', 8: 'None', 10: 'None', 11: 'None', 12: '0', 13: 0.004572, 14: 'cm', 17: 'None', 18: 'None', 19: 'None', 20: 0, 21: '06 None', 22: 1, 23: 1, 26: 'None', 32: 'None', 34: 'None', 36: 'None', 38: 0, 39: 'None', 40: 1 });
    return [id, 'Pipe', 'meters', 'meters', z1, 1, L, z2, 0, 2, 0, 0, 0, 100, 0, 0, ...blk].join(',');
  }
  const TABLES = ['1', '-1', '3', '1', '%ALL%', '3', 'Percent', '1', '100', '2', '100', '3', '100', '0', '2', 'years', '-9999', '-9999', '4', '0', '5', '0', '-999'];
  function juncRec({ type, id, pipes, z = 0, t }) {
    const blk = new Array(46).fill('0');
    Object.assign(blk, { 2: -1, 4: 24, 5: -1, 7: z, 9: 'meters', 14: 'None', 15: 1, 18: 'None', 20: 'None', 22: 'None', 23: 'None', 24: -1, 25: 0, 26: '' });
    return [type, id, 1, 8, 'J' + id, pipes.length, ...pipes, ...blk, ...TABLES, ...t].join(',');
  }
  // the block of the time data: the trigger, two events of 8 fields, a name, and the tables
  const ev = (e) => (e ? [e.code, e.cond, e.v, e.unit, 1, e.obj ?? -1, -1, -1] : [-1, -1, 0, 'None', -1, -1, -1, -1]);
  const tbl = (x) => [1, x.pts.length, x.tu, x.vu, ...x.pts.flat(), 'None'];
  const timeBlock = ({ trig, e1, e2, t1, t2 }) => [trig, ...ev(e1), ...ev(e2), 'None', ...tbl(t1), ...(t2 ? tbl(t2) : [1, 0, 'seconds', 'None', 'None'])];
  const pad = (blk, at) => { while (blk.length < at) blk.push('0'); return blk; };
  // blocks of the kinds, padded up to the place of their time data (b+69 is the first field of the block of the kind)
  const valveT = (Cv, time) => [...pad([0, 0, 0, 'None', 0, 'None', -1, 1, 5, 0, 0, 0, 0, 0, 1, 0, 'None', 0, 'None', 0, 'None', Cv, 0, 0, 'None', 0, 1, 0, 'None', 2], 110 - 69), ...timeBlock(time)];
  const flowT = (Q, qu, out, time) => [...pad([0, Q, qu, out ? 1 : 0, 0, 'None', 0, 'None', 0, 'NA', 0, 0, 0], 83 - 69), ...(time ? timeBlock(time) : [])];
  function tankT({ np = 1, P = 0, level, bottom, height, area, model = 1, byHeight = 1, time }) {
    const o = 5 * (np - 1), blk = pad([], 42 + o);
    Object.assign(blk, { [6 + o]: 'meters', [7 + o]: P, [8 + o]: 'barG', [10 + o]: 'None', [12 + o]: 'None', [17 + o]: 'NA', [18 + o]: '' });
    Object.assign(blk, { [19 + o]: model, [20 + o]: byHeight, [21 + o]: level, [22 + o]: 'meters', [24 + o]: bottom, [25 + o]: 'meters', [26 + o]: height, [27 + o]: 'meters', [28 + o]: 0, [29 + o]: area, [30 + o]: 'meters2' });
    return time ? [...blk, ...timeBlock(time)] : blk;
  }
  function pumpT(time) {
    const cfgs = ['', -1, -1, 'None', 200, 1, 3, 50, 0, -0.00154321, 'Table1', 1, 0, 2, -9999, 1, 0, 0, -1, 'None', 0, 'None', -1, -1, -1, -1, -1, -1, -1, 'None'];
    const post = [1, 0, -1, 0, 0, 'None', 0, 0, 'None', '', 0, 0, 'None'];
    return [...pad([0, 0, 0, 'None', 0, 0, 'meters', 0, 'm3/hr', 0, 'Percent', 1, 1, ...cfgs, ...post], 168 - 69), ...timeBlock(time)];
  }
  const fthText = (junctions, pipes, transient, analysis = 2) => [
    'Synthetic file written by tests/time.test.cjs', '[SCENARIO MANAGER]', 'Number of Scenarios= 1', 'Scenario #1= Base Scenario,,0,,0,0,0,0',
    '[SETTINGS]', 'AnalysisType=' + analysis, '[FLUID DATA]', 'Number of Fluids= 1', 'Fluid 1= Water,0,Water,0', 'Ambient Pressure= 1,atm',
    'Temperature= 20,deg. C', 'Density= 998.2,kg/m3', 'Viscosity= 1.002,centipoise', 'Vapor Pressure= 2.339,kPa', 'Gravity= 1',
    '[TRANSIENT CONTROL]', ...Object.entries(transient).map(([k, v]) => `${k}= ${v}`),
    '[JUNCTIONS -- SCENARIO #1 -- Base Scenario]', ...junctions, '[PIPES -- SCENARIO #1 -- Base Scenario]', ...pipes,
  ].join('\r\n') + '\r\n';
  const text = fthText([
    juncRec({ type: 2, id: 1, pipes: [-1], t: tankT({ level: 10, bottom: 0, height: 20, area: 1, model: 0, byHeight: 0 }) }),
    juncRec({ type: 17, id: 2, pipes: [1, -2], t: pumpT({ trig: 2, e1: { code: 21, cond: 3, v: 2, unit: 'meters', obj: 4 }, e2: { code: 21, cond: 1, v: 4, unit: 'meters', obj: 4 }, t1: { tu: 'seconds', vu: 'Percent', pts: [[0, 100]] }, t2: { tu: 'seconds', vu: 'Percent', pts: [[0, 0]] } }) }),
    juncRec({ type: 8, id: 3, pipes: [2, -3], z: 20, t: valveT(100, { trig: 1, e1: { code: 21, cond: 1, v: 15, unit: 'feet', obj: 4 }, t1: { tu: 'seconds', vu: 'None', pts: [[0, 100], [30, 0]] } }) }),
    juncRec({ type: 2, id: 4, pipes: [3], z: 20, t: tankT({ level: 2, bottom: 20, height: 10, area: 5 }) }),
    juncRec({ type: 2, id: 5, pipes: [-4], t: tankT({ level: 30, bottom: 0, height: 40, area: 1, model: 0, byHeight: 0 }) }),
    juncRec({ type: 3, id: 6, pipes: [4], t: flowT(18, 'm3/hr', true, { trig: 0, t1: { tu: 'hours', vu: 'm3/hr', pts: [[0, 18], [6, 18], [12, 40], [18, 30], [24, 18]] } }) }),
    juncRec({ type: 3, id: 7, pipes: [-5], t: flowT(10, 'm3/hr', false, { trig: 1, e1: { code: 99, cond: 1, v: 1, unit: 'None', obj: 8 }, t1: { tu: 'seconds', vu: 'm3/hr', pts: [[0, 20]] } }) }),
    juncRec({ type: 2, id: 8, pipes: [5, -6], t: tankT({ np: 2, level: 3, bottom: 0, height: 6, area: 2 }) }),
    juncRec({ type: 3, id: 9, pipes: [6], t: flowT(5, 'm3/hr', true) }),
  ], [
    pipeRec({ id: 1, from: 1, to: 2 }), pipeRec({ id: 2, from: 2, to: 3, L: 100, z2: 20 }), pipeRec({ id: 3, from: 3, to: 4, z1: 20, z2: 20 }),
    pipeRec({ id: 4, from: 5, to: 6 }), pipeRec({ id: 5, from: 7, to: 8 }), pipeRec({ id: 6, from: 8, to: 9 }),
  ], {
    StartTime: 0, StopTime: 2, TimeUnits: 'hours', TimeStep: 5, TimeStepUnits: 'minutes', Frequency: 2, TotalSteps: 24,
    DifferenceMethod: 0, RelativeTolerance: 1e-5, AbsoluteTolerance: 0.0001, AbsoluteToleranceUnits: 'feet', MaxIterations: 10000, Relaxation: 1,
  });
  const res = FTH.read(text, { name: 'time.fth' });
  const m = res.model, J = (id) => m.junctions.find((j) => j.id === id);
  const tc = m.solution.time;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  check('the time control', tc.on === true && same(tc.start, q(0, 'h')) && same(tc.stop, q(2, 'h')) && same(tc.step, q(5, 'min')) && tc.saveEvery === 2 && tc.method === 'forward'
    && tc.relTol === 1e-5 && same(tc.absTol, q(0.0001, 'ft')) && tc.maxIter === 10000 && tc.relax === 1, JSON.stringify([tc.start, tc.stop, tc.step]));
  check('the note of a time simulation', res.notes.some((n) => n.key === 'timeControl'));
  const v = J(3).time;
  check('a valve with an event on the level of a tank', v && v.what === 'Cv' && v.start === 'single' && same(v.when, [{ q: 'tankLevel', obj: 'j:4', op: '>=', value: q(15, 'ft') }])
    && same(v.tables, [{ t: [0, 30], v: [100, 0], tUnit: 's', vUnit: '' }]) && v.basis === 'absolute' && v.repeat === false, JSON.stringify(v && v.when));
  const p = J(2).time;
  check('a pump with two cyclic events', p && p.what === 'speed' && p.start === 'dualCyclic' && p.when.length === 2 && p.when[0].op === '<=' && p.when[1].op === '>='
    && same(p.tables.map((x) => x.v), [[100], [0]]) && p.tables.every((x) => x.vUnit === '%'), JSON.stringify(p && p.tables));
  const fl = J(6).time;
  check('an imposed flow with a table of 24 h', fl && fl.what === 'Q' && fl.start === 'time' && same(fl.tables[0], { t: [0, 6, 12, 18, 24], v: [18, 18, 40, 30, 18], tUnit: 'h', vUnit: 'm³/h' }));
  check('the notes of the time data (repetition, relative values, use: assumed)', ['J2', 'J3', 'J6'].every((o) => res.notes.some((n) => n.key === 'timeData' && n.objs.includes(o))));
  const t4 = J(4).tank, t8 = J(8).tank;
  check('a finite open tank with one pipe', t4 && t4.model === 'open' && same(t4.bottom, q(20, 'm')) && same(t4.height, q(10, 'm')) && same(t4.area, q(5, 'm²')) && same(J(4).liquidElev, q(22, 'm')), JSON.stringify(J(4).liquidElev));
  check('a finite open tank with two pipes', t8 && t8.model === 'open' && same(t8.bottom, q(0, 'm')) && same(t8.height, q(6, 'm')) && same(t8.area, q(2, 'm²')) && same(J(8).liquidElev, q(3, 'm')));
  check('the infinite reservoirs stay infinite', !J(1).tank && !J(5).tank);
  check('an event of unknown code: a note, and no time data for the junction', !J(7).time && res.notes.some((n) => n.key === 'timeEvent' && n.objs.includes('J7')));
  const eff = M.effective(m, 'base');
  const vv = M.validate(eff);
  check('the imported model is complete for the time simulation', vv.ok, JSON.stringify([...vv.undef]));
  const r = vv.ok ? TM.run(eff) : null;
  check('and it runs', r && r.ok && !r.stopped && r.times.length === 13, r ? `${r.times.length} recorded steps, ${r.events.length} events` : '');
  const off = FTH.read(text.replace('AnalysisType=2', 'AnalysisType=1'), { name: 'steady.fth' }).model;
  check('a steady analysis keeps the time data with the simulation off', off.solution.time.on === false && !!off.junctions.find((j) => j.id === 3).time);
  // F2: a closed tank keeps its model, with the exponent of its gas for the user; an event on the opening of a control
  // valve is read, and the user gives the characteristic of the valve
  const text2 = text
    .replace(juncRec({ type: 2, id: 8, pipes: [5, -6], t: tankT({ np: 2, level: 3, bottom: 0, height: 6, area: 2 }) }), juncRec({ type: 2, id: 8, pipes: [5, -6], t: tankT({ np: 2, level: 3, bottom: 0, height: 6, area: 2, model: 2, P: 2 }) }))
    .replace(juncRec({ type: 3, id: 7, pipes: [-5], t: flowT(10, 'm3/hr', false, { trig: 1, e1: { code: 99, cond: 1, v: 1, unit: 'None', obj: 8 }, t1: { tu: 'seconds', vu: 'm3/hr', pts: [[0, 20]] } }) }),
      juncRec({ type: 3, id: 7, pipes: [-5], t: flowT(10, 'm3/hr', false, { trig: 1, e1: { code: 25, cond: 3, v: 40, unit: 'Percent', obj: 3 }, t1: { tu: 'seconds', vu: 'm3/hr', pts: [[0, 20]] } }) }));
  const res2 = FTH.read(text2, { name: 'time2.fth' });
  const J2 = (id) => res2.model.junctions.find((j) => j.id === id);
  const t8c = J2(8).tank;
  check('F2: a closed tank, with its exponent left for the user', t8c && t8c.model === 'closed' && t8c.gas.n === null && res2.notes.some((n) => n.key === 'tankClosed' && n.level === 'missing' && n.objs.includes('J8')));
  check('F2: an event on the opening of a valve, with a note on its characteristic', same(J2(7).time.when, [{ q: 'opening', obj: 'j:3', op: '<=', value: q(40, '%') }]) && res2.notes.some((n) => n.key === 'timeOpening' && n.objs.includes('J7')));
}

// ==================== phase F2: complements
// ---------- T15: a closed tank filled from below
function t15(n, more = {}) {
  const m = base();
  junction(m, 'flow', 1, { elevation: q(0, 'm'), Q: q(1 / 64, 'm³/s'), dir: 'in' });
  junction(m, 'reservoir', 2, {
    elevation: q(0, 'm'), liquidElev: q(1, 'm'), surfP: q(200, 'kPa(a)'),
    tank: tank(0, 4, 2, { model: 'closed', gas: Object.assign({ n, pMax: q(null, 'kPa(a)'), pMin: q(null, 'kPa(a)') }, more) }),
  });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  return m;
}
console.log('\nT15 Closed tank (F2)');
{
  const m1 = t15(1); control(m1, 128, 16);
  const r1 = simulate(m1);
  const kPa = (r, t) => at(r, 'tanks', 2, 'Pg', t) / 1e3;
  const exp1 = [200, 218.1818, 240, 266.6667, 300], exp14 = [200, 225.9092, 258.1569, 299.1880, 352.8237];
  const ts = [0, 32, 64, 96, 128];
  check('n = 1: the gas pressure at 0, 32, 64, 96 and 128 s', ts.every((t, i) => near(kPa(r1, t), exp1[i], 1e-4)), ts.map((t) => kPa(r1, t).toFixed(4)).join(' · '));
  const m14 = t15(1.4); control(m14, 128, 16);
  const r14 = simulate(m14);
  check('n = 1.4: the gas pressure at 0, 32, 64, 96 and 128 s', ts.every((t, i) => near(kPa(r14, t), exp14[i], 1e-4)), ts.map((t) => kPa(r14, t).toFixed(4)).join(' · '));
  check('the gas volume: 6 m³ at the start, 5 m³ at 64 s', near(at(r1, 'tanks', 2, 'Vg', 0), 6, 1e-12) && near(at(r1, 'tanks', 2, 'Vg', 64), 5, 1e-12));
  // with a relief at 350 kPa
  const mr = t15(1, { pMax: q(350, 'kPa(a)') }); control(mr, 448, 16);
  const rr = simulate(mr);
  check('pMax = 350 kPa: 342.857 kPa at 160 s', near(kPa(rr, 160), 342.857, 1e-3), kPa(rr, 160).toFixed(3));
  check('at 176 s the pressure is held at 350 kPa, and the log shows the relief', near(kPa(rr, 176), 350, 1e-9) && events(rr, 'core.time.log.tank.relief').some((e) => e.t === 176), kPa(rr, 176).toFixed(3));
  const full = events(rr, 'core.time.log.tank.full');
  check('full of liquid at 384 s', full.length === 1 && full[0].t === 384 && near(at(rr, 'tanks', 2, 'h', 384), 4, 1e-12), full.map((e) => e.t).join(','));
  const o = rr.totals.tanks[2];
  check('then 0.25 m³ overflow per step through the relief (1 m³ at 448 s)', near(o.over, 1, 1e-12) && near(at(rr, 'tanks', 2, 'Pg', 448) / 1e3, 350, 1e-9), 'overflow ' + f6(o.over));
  check('T12: the balance of the closed tank closes', Math.abs(balance(rr, 2).closure) <= 1e-9 * 8);
  // without a relief the tank stops the run when it fills
  const mf = t15(1); control(mf, 448, 16);
  const rf = TM.run(M.effective(mf, 'base'));
  check('without a relief, a closed tank full of liquid stops the run at 384 s', rf.stopped && rf.stopped.reason === 'error' && rf.stopped.t === 384 && /full of liquid/.test(rf.stopped.errors[0]), rf.stopped && rf.stopped.errors[0]);
  // with a vent: a tank drained below its vent pressure takes gas in
  const mv = t15(1, { pMin: q(160, 'kPa(a)') });
  mv.junctions[0].dir = 'out';
  control(mv, 112, 16);
  const rv = simulate(mv);
  // Vg from 6 to 6.5 m³ at 32 s: 200·6/6.5 = 184.6 kPa; 160 kPa at 96 s; at 112 s, 154.8 kPa is held at 160 kPa
  check('a vent holds the pressure at its value, and the log shows it', near(kPa(rv, 32), 200 * 6 / 6.5, 1e-9) && near(kPa(rv, 96), 160, 1e-9) && near(kPa(rv, 112), 160, 1e-9) && events(rv, 'core.time.log.tank.vent').map((e) => e.t).join() === '112', kPa(rv, 112).toFixed(4));
  // the checklist of a closed tank
  const bad = t15(0, { pMax: q(150, 'kPa(a)'), pMin: q(180, 'kPa(a)') }); control(bad, 128, 16);
  const ck = M.validate(M.effective(bad, 'base'));
  const txt = JSON.stringify([...ck.undef].concat(ck.items.map((i) => i.detail)));
  check('the checklist: exponent, vent below the relief, gas pressure between them', !ck.ok && /exponent/.test(JSON.stringify(M.checkJunction(M.effective(bad, 'base'), M.effective(bad, 'base').junctions[1])))
    && /vent pressure below the relief/.test(JSON.stringify(M.checkJunction(M.effective(bad, 'base'), M.effective(bad, 'base').junctions[1]))), txt.slice(0, 80));
}

console.log('\nLevel or pressure unknown at the start (F2)');
{
  // two reservoirs at 30 m and 0 m through two equal pipes; a tank hangs on the middle junction by a third pipe, where
  // the energy grade line is at 15 m
  function floating(tk, level) {
    const m = base();
    junction(m, 'reservoir', 1, { elevation: q(30, 'm'), liquidElev: q(30, 'm'), surfP: q(0, 'kPa(g)') });
    junction(m, 'branch', 2, { elevation: q(0, 'm'), source: q(0, 'm³/s') });
    junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
    junction(m, 'reservoir', 4, { elevation: q(0, 'm'), liquidElev: q(level, 'm'), surfP: q(0, 'kPa(g)'), tank: tk });
    pipe(m, 1, 1, 2, 100, 0.1, 0.02);
    pipe(m, 2, 2, 3, 100, 0.1, 0.02);
    pipe(m, 3, 2, 4, 10, 0.1, 0.02);
    control(m, 600, 60);
    return m;
  }
  const r = simulate(floating(tank(0, 20, 1, { known: { level: false, pressure: true } }), 3));
  check('an open tank of unknown level starts at the grade line of its junction (15 m)', near(at(r, 'tanks', 4, 'zs', 0), 15, 1e-9) && near(at(r, 'tanks', 4, 'V', 0), 15, 1e-9), f6(at(r, 'tanks', 4, 'zs', 0)));
  check('and stays there, without flow, from the first step on', near(at(r, 'tanks', 4, 'zs', 600), 15, 1e-6) && Math.abs(at(r, 'pipes', 3, 'Q', 60)) < 1e-6, f6(at(r, 'tanks', 4, 'zs', 600)));
  check('the start of the totals is the volume found', near(r.totals.tanks[4].V0, 15, 1e-9));
  const rc = simulate(floating(tank(0, 20, 1, { model: 'closed', gas: { n: 1, pMax: q(null, 'kPa(a)'), pMin: q(null, 'kPa(a)') }, known: { level: true, pressure: false } }), 12));
  const Pexp = 101325 + 1000 * 9.80665 * 3;
  check('a closed tank of unknown pressure starts with the gas that holds its level against the junction', near(at(rc, 'tanks', 4, 'Pg', 0), Pexp, 1e-3) && near(at(rc, 'tanks', 4, 'zs', 600), 12, 1e-6), (at(rc, 'tanks', 4, 'Pg', 0) / 1e3).toFixed(4) + ' kPa');
  const out = TM.run(M.effective(floating(tank(0, 10, 1, { known: { level: false, pressure: true } }), 3), 'base'));
  check('a level found outside the tank stops the run at the start', out.stopped && /outside the tank/.test(out.stopped.errors[0]), out.stopped && out.stopped.errors[0]);
  const both = floating(tank(0, 20, 1, { known: { level: false, pressure: false } }), 3);
  check('the level and the pressure cannot both be unknown', /level or the pressure known/.test(JSON.stringify(M.checkJunction(M.effective(both, 'base'), M.effective(both, 'base').junctions[3]))));
}

console.log('\nCombined events (F2)');
{
  // T4 with the start of the pump by a combined event: the level at or below 2 m and the time at or after 2000 s
  const m = t4();
  m.events = [
    { name: 'low', cond: { q: 'tankLevel', obj: 'j:3', op: '<=', value: q(2, 'm') } },
    { name: 'late', cond: { q: 'time', op: '>=', value: q(2000, 's') } },
    { name: 'go', op: 'and', of: ['low', 'late'] },
  ];
  Object.assign(m.junctions[1].time, { start: 'combined', combined: 'go', when: [], tables: [table([0], [3 / 64], 's', 'm³/s')] });
  const r = simulate(m);
  const ev = events(r, 'core.time.log.table.started');
  check('"and": the pump starts at the first step where both hold (2048 s)', ev.length === 1 && ev[0].t === 2048, ev.map((e) => e.t).join(','));
  const eff = M.effective(m, 'base');
  check('the events of the model reach the effective model of a scenario', Array.isArray(eff.events) && eff.events.length === 3);
  const S = (t, h) => ({ t, ta: 0, sol: { pipes: {}, junctions: {}, pumps: {}, valves: {} }, model: eff, si: (x, c) => U.toSI(x.value, x.unit, c), tank: () => ({ h, zs: h, V: 8 * h }) });
  const ctx = { patm: 101325, rho: 1000 };
  const named = (ev2) => { const mm = M.clone(eff); mm.events = eff.events.concat([ev2]); return TM.events.prepareNamed(mm, ev2.name, ctx); };
  const or = named({ name: 'either', op: 'or', of: ['low', 'late'] }), not = named({ name: 'neither', op: 'not', of: ['low', 'late'] });
  check('"or" and "not"', TM.events.holds(or, S(0, 1)) && !TM.events.holds(or, S(0, 3)) && TM.events.holds(not, S(0, 3)) && !TM.events.holds(not, S(2500, 3)));
  const cyc = M.clone(eff);
  cyc.events = [{ name: 'a', op: 'or', of: ['b', 'low'] }, { name: 'b', op: 'and', of: ['a', 'late'] }].concat(eff.events);
  check('an event inside itself is refused, and a junction cannot use it', TM.events.checkNamed(cyc).includes('events.cycle') && !TM.events.namedOk(cyc, 'a') && TM.events.namedOk(cyc, 'go'));
  const miss = M.clone(eff);
  miss.events = [{ name: 'x', op: 'and', of: ['low', 'nothing'] }, { name: 'x', cond: { q: 'time', op: '>=', value: q(1, 'h') } }];
  check('a missing event and a repeated name are refused', TM.events.checkNamed(miss).includes('events.ref') && TM.events.checkNamed(miss).includes('events.duplicate'));
  // a difference of two objects: the levels of two tanks
  const c = TM.events.prepare({ q: 'pStag', obj: 'p:1', end: 'in', obj2: 'p:1', end2: 'out', op: '>', value: q(1, 'kPa') }, eff, ctx);
  const sol = { pipes: { 1: { P0in: 205000, P0out: 203500 } }, junctions: {}, pumps: {}, valves: {} };
  check('a difference of a quantity between two places (1.5 kPa > 1 kPa)', TM.events.holds(c, { t: 0, ta: 0, sol, model: eff, si: () => NaN, tank: () => null }) && c.v === 1000);
}

console.log('\nCheck valves (F2)');
{
  function line(z1, z2, type, more = {}) {
    const m = base();
    m.solution.time.on = false;
    junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(z1, 'm'), surfP: q(0, 'kPa(g)') });
    junction(m, type, 2, Object.assign({ elevation: q(0, 'm') }, more));
    junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(z2, 'm'), surfP: q(0, 'kPa(g)') });
    pipe(m, 1, 1, 2, 50, 0.1, 0.02);
    pipe(m, 2, 2, 3, 50, 0.1, 0.02);
    return m;
  }
  const solve = (m) => PumpIt.solver.run(M.effective(m, 'base'));
  const fwd = solve(line(10, 0, 'check', { K: 2 })), ref = solve(line(10, 0, 'valve', { K: 2 }));
  check('forward flow: open, with the loss of its K', fwd.ok && fwd.states[2] === 'open' && near(fwd.pipes[1].Q, ref.pipes[1].Q, 1e-9 * ref.pipes[1].Q), f6(fwd.pipes[1].Q * 1e3) + ' L/s');
  const back = solve(line(0, 10, 'check', { K: 2 }));
  check('reverse flow: it closes, and nothing flows', back.ok && back.states[2] === 'closed' && back.pipes[1].Q === 0 && /closed/.test(back.valves[2].state));
  const held = solve(line(10, 0, 'check', { K: 2, vClose: q(10, 'm/s') }));
  check('a closing velocity above the flow keeps it closed', held.ok && held.states[2] === 'closed');
  // over time: the upstream level rises from 0 to 20 m in 200 s; the valve opens once it passes 10 m (and logs it)
  const m = line(0, 10, 'check', { K: 2 });
  m.solution.time.on = true;
  m.junctions[0].time = timeData('level', 'time', [], [table([0, 200], [0, 20], 's', 'm')]);
  control(m, 200, 10);
  const r = simulate(m);
  const op = events(r, 'core.time.log.check.open');
  check('over time: closed while the level is below 10 m, open from 110 s, in the log', op.length === 1 && op[0].t === 110 && at(r, 'pipes', 1, 'Q', 100) === 0 && at(r, 'pipes', 1, 'Q', 120) > 0, op.map((e) => e.t).join(','));
  // a pump with its check valve against a head above its shutoff: no flow; with the head falling, it opens
  const pm = line(0, 50, 'pump', { mode: 'curve', curve: { x: [0, 108, 180], y: [40, 25.6, 0], xUnit: 'm³/h', yUnit: 'm', fit: '2' }, state: 'on', noReverse: true });
  const pr = solve(pm);
  pm.junctions[1].noReverse = false;
  const pb = solve(pm);
  check('a pump with a check valve against 50 m (shutoff 40 m): closed, no flow; without it, reverse flow', pr.ok && pr.states[2] === 'shut' && pr.pipes[1].Q === 0 && pr.pumps[2].checkClosed === true && pb.ok && pb.pipes[1].Q < 0);
  pm.junctions[1].noReverse = true;
  pm.solution.time.on = true;
  pm.junctions[2].time = timeData('level', 'time', [], [table([0, 100], [50, 30], 's', 'm')]);
  control(pm, 100, 10);
  const rp = simulate(pm);
  const ro = rp.events.filter((e) => e.obj === 'j:2' && /check/.test(e.key));
  check('over time the check valve of the pump opens once the head is below its shutoff (from 60 s)', ro.length === 1 && ro[0].key === 'core.time.log.check.open' && ro[0].t === 60 && at(rp, 'pipes', 1, 'Q', 50) === 0 && at(rp, 'pipes', 1, 'Q', 60) > 0, ro.map((e) => e.t + ' ' + e.key).join(','));
  // a model saved before the check valve was removed opens as a check valve with the fields it lacks, closed when its
  // special condition closed it
  const old = line(10, 0, 'check', {});
  for (const k of ['vClose', 'dPopen', 'closed']) delete old.junctions[1][k];
  old.junctions[1].special = 'closed';
  M.migrate(old);
  check('an old check valve gets its new fields, and stays closed', old.junctions[1].type === 'check' && JSON.stringify(old.junctions[1].vClose) === JSON.stringify(q(0, 'm/s')) && old.junctions[1].closed === true);
}

console.log('\nOpening with the characteristic of the valve (F2)');
{
  function valveLine(more) {
    const m = base();
    m.solution.time.on = false;
    junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(10, 'm'), surfP: q(0, 'kPa(g)') });
    junction(m, 'valve', 2, Object.assign({ elevation: q(0, 'm') }, more));
    junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
    pipe(m, 1, 1, 2, 10, 0.1, 0.02);
    pipe(m, 2, 2, 3, 10, 0.1, 0.02);
    return m;
  }
  const Q = (more) => PumpIt.solver.run(M.effective(valveLine(more), 'base')).pipes[1].Q;
  check('linear: an opening of 50 % is half the Cv', near(Q({ lossModel: 'opening', CvMax: 100, char: 'linear', open: 50 }), Q({ lossModel: 'Cv', Cv: 50 }), 1e-12));
  const ep = 100 * Math.pow(50, -0.5);
  check('equal percentage: Cv = Cvmax·R^(x−1) (R = 50, 50 %: Cv = 14.142)', near(Q({ lossModel: 'opening', CvMax: 100, char: 'equalPct', R: 50, open: 50 }), Q({ lossModel: 'Cv', Cv: ep }), 1e-12));
  const shut = PumpIt.solver.run(M.effective(valveLine({ lossModel: 'opening', CvMax: 100, char: 'equalPct', R: 50, open: 0 }), 'base'));
  check('an opening of 0 closes the valve, also in equal percentage', shut.ok && shut.pipes[1].Q === 0 && shut.valves[2].open === 0);
  check('the results give the opening', PumpIt.solver.run(M.effective(valveLine({ lossModel: 'opening', CvMax: 100, char: 'linear', open: 35 }), 'base')).valves[2].open === 35);
  // over time: the opening from 100 % to 0 in 30 s, after 60 s (as T8)
  const m = valveLine({ lossModel: 'opening', CvMax: 100, char: 'linear', open: 100 });
  m.solution.time.on = true;
  m.junctions[1].time = timeData('open', 'single', [{ q: 'time', op: '>=', value: q(60, 's') }], [table([0, 30], [100, 0], 's', '%')]);
  control(m, 150, 10);
  const r = simulate(m);
  check('a table of the opening: 66.67 % at 70 s, closed from 90 s', near(at(r, 'valves', 2, 'open', 70), 200 / 3, 1e-9) && at(r, 'pipes', 1, 'Q', 90) === 0 && events(r, 'core.time.log.valve.closed').some((e) => e.t === 90));
  // a control valve with a characteristic: its opening is the inverse of its Cv
  const cm = valveLine({});
  cm.junctions[1] = Object.assign(M.newJunction('control', 2, 0, 0), { elevation: q(0, 'm'), ctype: 'FCV', setQ: q(10, 'L/s'), char: 'linear', CvMax: 400 });
  const cr = PumpIt.solver.run(M.effective(cm, 'base'));
  check('a control valve gives its opening from its Cv (linear: 100·Cv/Cvmax)', cr.ok && near(cr.valves[2].open, 100 * cr.valves[2].Cv / 400, 1e-9) && cr.valves[2].open > 0 && cr.valves[2].open < 100, (cr.valves[2].open || NaN).toFixed(3) + ' %');
  // a condition on the opening
  const effc = M.effective(cm, 'base');
  const pc = TM.events.prepare({ q: 'opening', obj: 'j:2', op: '<', value: q(cr.valves[2].open + 1, '%') }, effc, { patm: 101325 });
  check('a condition on the opening of a valve', TM.events.check({ q: 'opening', obj: 'j:2', op: '<', value: q(5, '%') }, effc).length === 0 && TM.events.holds(pc, { t: 0, ta: 0, sol: cr, model: effc, si: () => NaN, tank: () => null }));
  const nochar = M.clone(effc); nochar.junctions[1].char = 'none';
  check('… which needs a characteristic', TM.events.check({ q: 'opening', obj: 'j:2', op: '<', value: q(5, '%') }, nochar).includes('object'));
}

console.log('\nEnergy cost (F2)');
{
  // a pump between two reservoirs, at a constant power; 1 per kWh from 0 to 6 h, 2 from 6 h on
  function pumping(stopH) {
    const m = base();
    junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)') });
    junction(m, 'pump', 2, { elevation: q(0, 'm'), mode: 'curve', state: 'on', curve: { x: [0, 108, 180], y: [50, 32, 0], xUnit: 'm³/h', yUnit: 'm', fit: '2' } });
    junction(m, 'reservoir', 3, { elevation: q(20, 'm'), liquidElev: q(20, 'm'), surfP: q(0, 'kPa(g)') });
    pipe(m, 1, 1, 2, 10, 0.15, 0.02);
    pipe(m, 2, 2, 3, 190, 0.15, 0.02);
    control(m, stopH, 0.5, 'h', { tariff: { use: true, currency: 'R$', t: [0, 6], v: [1, 2], tUnit: 'h' } });
    return m;
  }
  const r = simulate(pumping(12));
  const P = at(r, 'pumps', 2, 'Pshaft', 0);
  const c = r.totals.cost;
  check('cost of 12 h: P·(6 h × 1 + 6 h × 2) per kWh', near(c.total, P / 1000 * 18, 1e-9 * P) && near(r.totals.pumps[2].cost, c.total, 1e-12) && c.currency === 'R$', c.total.toFixed(4) + ' R$');
  check('no yearly estimate for half a day', Number.isNaN(c.annual));
  const r24 = simulate(pumping(24));
  const c24 = r24.totals.cost;
  check('a whole day: the yearly estimate is 365 days of it', near(c24.total, P / 1000 * (6 + 18 * 2), 1e-9 * P) && near(c24.annual, 365 * c24.total, 1e-9 * c24.total), c24.annual.toFixed(2));
  check('the tariff repeats every day', near(TM.cost.priceAt({ hs: [0, 21600], ps: [1, 2] }, 86400 + 3600), 1, 0) && TM.cost.priceAt({ hs: [0, 21600], ps: [1, 2] }, 86400 + 30000) === 2);
  const badT = pumping(12); badT.solution.time.tariff.t = [1, 6];
  check('the checklist of the tariff (its first time is 0)', !M.validate(M.effective(badT, 'base')).ok && TM.cost.check(badT.solution.time.tariff).includes('tariff'));
}

console.log('\nHorizontal cylinder (F2)');
{
  const T = TM.tanks.prepare({ id: 1, type: 'reservoir', elevation: q(0, 'm'), liquidElev: q(0, 'm'), tank: { model: 'open', bottom: q(0, 'm'), shape: 'horizontalCylinder', diameter: q(2, 'm'), length: q(5, 'm') } },
    { pipes: [], junctions: [] }, (x, c) => U.toSI(x.value, x.unit, c));
  check('full: π·R²·L, half full at h = R', near(T.Vmax, Math.PI * 5, 1e-12) && near(TM.tanks.volumeOf(T, 1), Math.PI * 2.5, 1e-12) && near(TM.tanks.levelOf(T, Math.PI * 2.5), 1, 1e-11));
  const hs = [0.1, 0.5, 1.3, 1.9];
  check('the level from the volume (bisection to 1e-12 m)', hs.every((h) => near(TM.tanks.levelOf(T, TM.tanks.volumeOf(T, h)), h, 2e-12)));
  // filled from below at 0.1 m³/s: 1 m³ every 10 s
  const m = base();
  junction(m, 'flow', 1, { elevation: q(0, 'm'), Q: q(0.1, 'm³/s'), dir: 'in' });
  junction(m, 'reservoir', 2, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(0, 'kPa(g)'), tank: { model: 'open', bottom: q(0, 'm'), height: q(1, 'm'), shape: 'horizontalCylinder', diameter: q(2, 'm'), length: q(5, 'm') } });
  pipe(m, 1, 1, 2, 10, 0.1, 0.02);
  control(m, 200, 10);
  const r = simulate(m);
  check('filling: the level of the volume at every step, and full at 160 s (15.708 m³)', [50, 100, 150].every((t) => near(at(r, 'tanks', 2, 'h', t), TM.tanks.levelOf(T, t / 10), 1e-12)) && events(r, 'core.time.log.tank.full')[0].t === 160);
}

console.log('\nExact time of an event (F2, optional)');
{
  // T3: without the option the pump stops at the step after the level passes 8 m; with it, at the crossing itself
  const r0 = simulate(t3());
  const h1 = at(r0, 'tanks', 3, 'h', 4860), h2 = at(r0, 'tanks', 3, 'h', 4920);
  const tStar = 4860 + 60 * (8 - h1) / (h2 - h1);
  const m = t3();
  m.solution.time.exactEvents = true;
  const r = simulate(m);
  const ev = events(r, 'core.time.log.table.started');
  check('the event fires at the crossing of 8 m, between two steps', ev.length === 1 && near(ev[0].t, tStar, 1e-9) && ev[0].t > 4860 && ev[0].t < 4920, ev.map((e) => e.t.toFixed(3)).join(','));
  const i = [...r.times].findIndex((x) => x === ev[0].t);
  check('a step is recorded at that time, marked as such, and the pump stops there', i > 0 && r.exact[i] === 1 && r.steps[i] === 81 && r.series.pipes[2].Q[i] === 0);
  check('so the level stops at 8 m (8.109918 m without the option)', near(at(r, 'tanks', 3, 'h', 7200), 8, 1e-9) && near(at(r0, 'tanks', 3, 'h', 7200), 8.109918, 1e-5), f6(at(r, 'tanks', 3, 'h', 7200)));
  check('the step at the event is solved again from its snapshot', near(r.snapshotAt(i).pipes[2].Q, 0, 0) && r.snapshot(81).time.t === 4860);
  check('T12: the balance of the tank still closes', Math.abs(balance(r, 3).closure) <= 1e-9 * 200);
  const mc = t3();
  Object.assign(mc.solution.time, { exactEvents: true, method: 'central' });
  check('with the central method the option is not used', !simulate(mc).exact.some((x) => x));
}

// ==================== phase F3: gas vessels
// a vessel of 1 m³ of air at 1000 kPa and 293.15 K discharging through a short wide pipe and a nozzle (Cd 0.62, a hole
// of 10 mm) to 101.325 kPa
function blowdown(mode, step, stop = 60) {
  const m = base();
  m.system.regime = 'compressible';
  m.system.gasMode = mode;
  m.system.fluidGas = Object.assign(M.newGasFluid(), { gas: 'air', Z: 1, T: q(293.15, 'K') });
  junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(1000, 'kPa(a)'), vessel: { model: 'finite', volume: q(1, 'm³') } });
  junction(m, 'spray', 2, { elevation: q(0, 'm'), sprayModel: 'CdA', Cd: 0.62, dHole: q(10, 'mm'), nHoles: 1, Pext: q(101.325, 'kPa(a)') });
  pipe(m, 1, 1, 2, 0.1, 0.5, 0.02);
  control(m, stop, step);
  return m;
}
const kPaV = (r, t) => at(r, 'tanks', 1, 'Pv', t) / 1e3;
console.log('\nT18 Isothermal gas vessel, choked discharge (F3)');
{
  const kk = 1.4, R = 287.0550, T = 293.15, A = 0.62 * Math.PI * 0.01 * 0.01 / 4;
  const c = A * Math.sqrt(kk / (R * T)) * Math.pow(2 / (kk + 1), (kk + 1) / (2 * (kk - 1)));
  const tau = 1 / (c * R * T);
  check('the exact solution of the case (τ = 103.3881 s)', near(tau, 103.3881, 1e-4) && near(1000 * Math.exp(-30 / tau), 748.137, 1e-3) && near(1000 * Math.exp(-60 / tau), 559.709, 1e-3), 'τ = ' + tau.toFixed(4) + ' s');
  const r1 = simulate(blowdown('isothermal', 1));
  check('forward, Δt = 1 s: P(60 s) = 558.131 kPa (0.1 %)', rel(kPaV(r1, 60), 558.131) < 1e-3, kPaV(r1, 60).toFixed(3));
  const r05 = simulate(blowdown('isothermal', 0.5));
  check('forward, Δt = 0.5 s: P(60 s) = 558.922 kPa (0.1 %)', rel(kPaV(r05, 60), 558.922) < 1e-3, kPaV(r05, 60).toFixed(3));
  check('against the exact solution at 30 s (0.2 %, the error of the step)', rel(kPaV(r05, 30), 748.137) < 2e-3, kPaV(r05, 30).toFixed(3));
  check('the temperature stays at 293.15 K', near(at(r1, 'tanks', 1, 'Tv', 60), 293.15, 1e-9));
  const o = r1.totals.tanks[1];
  check('the mass of the vessel balances what left it', Math.abs(o.closure) <= 1e-12 * o.M0 && o.Mout > 0 && near(o.Mf, at(r1, 'tanks', 1, 'M', 60), 1e-12), 'left ' + o.Mout.toFixed(4) + ' kg');
  check('the flow is choked at the nozzle in every step', r1.series.junctions[2].choked.length === 61 && r1.series.junctions[2].choked.every((x) => x === 1));
}

console.log('\nT19 Adiabatic gas vessel, choked discharge (F3)');
{
  const exp = { 1: [461.226, 234.759], 0.5: [462.430, 235.054], 0.25: [463.028, 235.201] };
  for (const [dt, [P60, T60]] of Object.entries(exp)) {
    const r = simulate(blowdown('adiabatic', +dt));
    const P = kPaV(r, 60), T = at(r, 'tanks', 1, 'Tv', 60);
    check(`forward, Δt = ${dt} s: P(60 s) = ${P60} kPa and T(60 s) = ${T60} K (0.1 %)`, rel(P, P60) < 1e-3 && rel(T, T60) < 1e-3, P.toFixed(3) + ' kPa · ' + T.toFixed(3) + ' K');
  }
  // the gas left behind expands isentropically: T/T0 = (P/P0)^((k−1)/k) at every step
  const r = simulate(blowdown('adiabatic', 0.25, 30));
  // (the forward steps are isentropic to the order of the step)
  const dev = Math.max(...[10, 20, 30].map((t) => rel(at(r, 'tanks', 1, 'Tv', t) / 293.15, Math.pow(kPaV(r, t) / 1000, 0.4 / 1.4))));
  check('the gas left in the vessel expands isentropically (to 0.05 %)', dev < 5e-4, dev.toExponential(2));
  check('against the exact solution at 30 s (0.1 %)', rel(kPaV(r, 30), 673.757) < 1e-3 && rel(at(r, 'tanks', 1, 'Tv', 30), 261.873) < 1e-3, kPaV(r, 30).toFixed(3) + ' kPa');
}

console.log('\nGas vessels in the model (F3)');
{
  const m = blowdown('isothermal', 1, 10);
  const eff = M.effective(m, 'base');
  check('a finite vessel needs a volume above zero', (() => { const e2 = M.clone(eff); e2.junctions[0].vessel.volume = q(0, 'm³'); return !M.validate(e2).ok; })());
  check('a liquid tank kept in the model is not used for a gas (and does not stop it)', (() => { const e2 = M.clone(eff); e2.junctions[0].tank = tank(0, 4, 1); return M.validate(e2).ok; })());
  check('the reservoir of a finite vessel takes no table for a gas', PumpIt.junctionTypes.get('reservoir').time.quantities(eff.junctions[0], { gas: true }).length === 0
    && PumpIt.junctionTypes.get('reservoir').time.quantities(Object.assign(M.clone(eff.junctions[0]), { vessel: undefined }), { gas: true }).length === 2);
  const r = simulate(m);
  check('the first step is the steady state of the model as it is', near(at(r, 'pipes', 1, 'm', 0), PumpIt.solver.run(eff).pipes[1].m, 1e-12));
  check('a step solved again from its snapshot gives the recorded flow', near(r.snapshot(5).pipes[1].m, at(r, 'pipes', 1, 'm', 5), 1e-9 * Math.abs(at(r, 'pipes', 1, 'm', 5))));
  const mc = blowdown('isothermal', 1, 10);
  mc.solution.time.method = 'central';
  const rc = simulate(mc);
  check('with the central method asked, the vessels go forward, with a caution', rc.method === 'forward' && rc.warnings.some((w) => /forward/.test(w.text)));
}

console.log('\nA vessel filled by a compressor (F3)');
{
  // the atmosphere, a compressor at a fixed pressure ratio and a vessel of 1 m³ that starts at the pressure of the
  // atmosphere; a table takes the ratio from 2 to 3 in 10 s, and then to 0, which stops the compressor
  function filling(mode) {
    const m = base();
    m.system.regime = 'compressible';
    m.system.gasMode = mode;
    m.system.fluidGas = Object.assign(M.newGasFluid(), { gas: 'air', Z: 1, T: q(293.15, 'K') });
    junction(m, 'reservoir', 1, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(101.325, 'kPa(a)') });
    junction(m, 'pump', 2, { elevation: q(0, 'm'), mode: 'ratio', ratio: 2, state: 'on' });
    junction(m, 'reservoir', 3, { elevation: q(0, 'm'), liquidElev: q(0, 'm'), surfP: q(101.325, 'kPa(a)'), vessel: { model: 'finite', volume: q(1, 'm³') } });
    pipe(m, 1, 1, 2, 1, 0.05, 0.02);
    pipe(m, 2, 2, 3, 10, 0.02, 0.02);
    control(m, 20, 1);
    m.junctions[1].time = timeData('ratio', 'time', [], [table([0, 10, 10, 20], [2, 3, 0, 0], 's', '')]);
    return m;
  }
  const r = simulate(filling('isothermal'));
  check('a table drives the pressure ratio of a compressor (§11)', near(at(r, 'pumps', 2, 'ratio', 5), 2.5, 1e-6) && near(at(r, 'pumps', 2, 'ratio', 9), 2.9, 1e-6), at(r, 'pumps', 2, 'ratio', 5).toFixed(6));
  const o = r.totals.tanks[3];
  check('the vessel gains the mass the compressor gives', o.Min > 0 && o.Mout === 0 && Math.abs(o.closure) <= 1e-12 * o.Mf && near(o.Min, r.totals.pumps[2].M, 1e-6 * o.Min), 'gained ' + o.Min.toFixed(4) + ' kg');
  check('its pressure follows its mass (isothermal)', near(at(r, 'tanks', 3, 'Pv', 10), at(r, 'tanks', 3, 'M', 10) * 287.055 * 293.15, 1e-3 * at(r, 'tanks', 3, 'Pv', 10)) && at(r, 'tanks', 3, 'Pv', 10) > 101325);
  check('a ratio of 0 stops the compressor: no flow, and the vessel keeps its gas', at(r, 'pipes', 2, 'm', 15) === 0 && at(r, 'tanks', 3, 'M', 20) === at(r, 'tanks', 3, 'M', 10)
    && events(r, 'core.time.log.pump.off').map((e) => e.t).join() === '10');
  const ra = simulate(filling('adiabatic'));
  check('adiabatic: the gas pushed into the vessel heats it, and it keeps its heat once the flow stops', at(ra, 'tanks', 3, 'Tv', 10) > 300 && at(ra, 'tanks', 3, 'Tv', 20) === at(ra, 'tanks', 3, 'Tv', 10), at(ra, 'tanks', 3, 'Tv', 10).toFixed(2) + ' K');
}

console.log('\nFlows of a gas over time (F3)');
{
  // the vessel of T18 emptied by an imposed flow that a table takes from 100 to 50 Nm³/h in 10 s
  const m = blowdown('isothermal', 1, 10);
  m.junctions[1] = Object.assign(M.newJunction('flow', 2, 0, 0), { elevation: q(0, 'm'), Q: q(100, 'Nm³/h'), dir: 'out' });
  m.junctions[1].time = timeData('Q', 'time', [], [table([0, 10], [100, 50], 's', 'Nm³/h')]);
  const r = simulate(m);
  const rhoN = PumpIt.fluids.normalDensity(PumpIt.fluids.evaluateGas(m.system).MW);
  // forward: the flows of the steps 0 to 9, 100 then 100 − 5k Nm³/h, for 1 s each
  const left = r.totals.tanks[1].M0 - at(r, 'tanks', 1, 'M', 10);
  check('a table in Nm³/h gives a mass flow by the normal density', near(left, rhoN * 775 / 3600, 1e-9 * r.totals.tanks[1].M0), left.toFixed(6) + ' kg');
  const items = (mm) => { const e = M.effective(mm, 'base'); return JSON.stringify(M.checkJunction(e, e.junctions[1])); };
  const mt = M.clone(m); mt.junctions[1].time.tables[0].vUnit = 'm³/h';
  const mj = M.clone(m); mj.junctions[1].Q = q(100, 'm³/h'); mj.junctions[1].time.tables[0].vUnit = 'kg/s';
  check('a volume at the conditions of the pipe cannot follow a table, in the table or in the junction', /normal volume flow/.test(items(mt)) && /normal volume flow/.test(items(mj)) && !/normal volume flow/.test(items(m)));
}

console.log(`\n${pass} checks passed, ${fail} failed`);
if (fail) process.exitCode = 1;
