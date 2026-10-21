// Tests of the ends of pipes (docs/pipe-ends.md): freeing an end, where a loose end goes, connecting it again, the
// checklist and the calculation while an end is loose, and loaded models whose ends point nowhere.
// Usage: node tests/pipe-ends.test.cjs
const { loadCore } = require('./load-core');

const PumpIt = loadCore('en');
const M = PumpIt.model, S = PumpIt.solver, EX = PumpIt.examples;
const { t } = PumpIt.i18n;

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) pass++; else fail++;
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  ' + detail : ''));
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const pipe = (m, id) => m.pipes.find((p) => p.id === id);
const run = (m) => S.run(M.effective(m, m.scenarios.current));
const missing = (m, key) => M.validate(M.effective(m, m.scenarios.current)).undef.get(key) || [];
const CONNECT = t('core.checklist.pipe.connect'), SAME = t('core.checklist.pipe.sameEnds');

console.log('\nFreeing an end');
{
  const m = EX.get('pump').build(); // J1 → P1 → J2 (pump) → P2 → J3 (valve) → P3 → J4
  const before = JSON.stringify(m);
  const r0 = run(m);
  const p2 = pipe(m, 2); // from J2 at (300, 300) to J3 at (520, 180), elevation 1 m
  const s = M.spotNear(m, p2, 'down');
  const L = Math.hypot(300 - 520, 300 - 180);
  ok('E1 a freed end leaves its junction towards the other end, 40 units away',
    near(s.x, 520 + ((300 - 520) * 40) / L, 0.006) && near(s.y, 180 + ((300 - 180) * 40) / L, 0.006), `(${s.x}, ${s.y})`);
  ok('E1 at the elevation of the junction it leaves', s.z === 1);
  M.loosenEnd(p2, 'down', s);
  ok('E2 the end is loose and the pipe keeps its data', p2.down === null && M.isLoose(p2, 'down') && p2.up === 2 && p2.length.value === JSON.parse(before).pipes[1].length.value);
  ok('E2 the loose end is where it was put', JSON.stringify(M.endPoint(m, p2, 'down')) === JSON.stringify({ x: s.x, y: s.y }));
  ok('E2 the junction it left has one pipe less', M.pipesAt(m, 3).map((p) => p.id).join() === '3');
  ok('E3 the checklist asks to connect the pipe', missing(m, 'p:2').includes(CONNECT) && !missing(m, 'p:2').includes(SAME));
  ok('E3 and the calculation waits', !M.validate(M.effective(m, 'base')).ok);
  let r;
  try { r = run(m); } catch (e) { r = { threw: e.message }; }
  ok('E4 the solver refuses it with its message, without failing', !!r && r.ok === false && r.errors.some((x) => x === t('core.solver.pipeNotConnected', { id: 2 })), JSON.stringify(r.errors || r.threw));

  ok('E5 the end cannot join the junction of the other end', M.connectEnd(m, p2, 'down', 2) === false && p2.down === null);
  ok('E5 nor a junction that is not in the model', M.connectEnd(m, p2, 'down', 99) === false && p2.down === null);
  ok('E6 connected again, the model is as it was', M.connectEnd(m, p2, 'down', 3) === true && JSON.stringify(m) === before);
  const r1 = run(m);
  ok('E6 and so are the results', r1.ok && [1, 2, 3].every((id) => r1.pipes[id].m === r0.pipes[id].m));
}

console.log('\nWhere a loose end goes');
{
  const m = EX.get('pump').build();
  const p1 = pipe(m, 1);
  m.junctions.find((j) => j.id === 2).x = 100; // J2 on top of J1
  m.junctions.find((j) => j.id === 2).y = 300;
  const s = M.spotNear(m, p1, 'up');
  ok('E7 with the other end on top of the junction, to its right', s.x === 140 && s.y === 300);
  const m2 = EX.get('pump').build();
  const q = pipe(m2, 3); // J3 (520, 180) → J4 (800, 100): long enough for the whole gap
  const s2 = M.spotNear(m2, q, 'up', () => 7.5);
  ok('E7 the elevation comes from the scenario that asks', s2.z === 7.5);
  m2.junctions.find((j) => j.id === 4).x = 540; // a short pipe: half the way at most
  m2.junctions.find((j) => j.id === 4).y = 180;
  const s3 = M.spotNear(m2, q, 'up');
  ok('E7 never more than half the way', s3.x === 530 && s3.y === 180);
}

console.log('\nBoth ends, reversing and reconnecting');
{
  const m = EX.get('pump').build();
  const p1 = pipe(m, 1);
  M.loosenEnd(p1, 'up', M.spotNear(m, p1, 'up'));
  const spot = { ...p1.loose.up };
  M.swapEnds(p1);
  ok('E8 a reversed pipe takes its loose spot to the other end', p1.up === 2 && p1.down === null && JSON.stringify(p1.loose) === JSON.stringify({ down: spot }));
  M.swapEnds(p1);
  ok('E8 and back', p1.up === null && p1.down === 2 && JSON.stringify(p1.loose) === JSON.stringify({ up: spot }));
  M.loosenEnd(p1, 'down', M.spotNear(m, p1, 'down'));
  ok('E9 a pipe with both ends loose asks to be connected, not for two different junctions', missing(m, 'p:1').includes(CONNECT) && !missing(m, 'p:1').includes(SAME));
  ok('E9 a loose end connects while the other is loose too', M.connectEnd(m, p1, 'up', 1) && p1.up === 1 && Object.keys(p1.loose).join() === 'down');

  // three reservoirs: the pipes to J2 and J3 exchange their far ends, and the network solves
  const r3 = EX.get('threeRes').build();
  const a = pipe(r3, 2), b = pipe(r3, 3); // J4 → J2 and J4 → J3
  M.loosenEnd(a, 'down', M.spotNear(r3, a, 'down'));
  M.loosenEnd(b, 'down', M.spotNear(r3, b, 'down'));
  M.connectEnd(r3, a, 'down', 3);
  M.connectEnd(r3, b, 'down', 2);
  const res = run(r3);
  const sum = res.ok ? res.pipes[1].m - res.pipes[2].m - res.pipes[3].m : NaN;
  ok('E10 reconnected pipes solve, with the mass balance at the branch', res.ok && !a.loose && !b.loose && near(sum, 0, 1e-6 * Math.abs(res.pipes[1].m)), res.ok ? `Σṁ = ${sum.toExponential(2)}` : res.errors.join('; '));
}

console.log('\nCompressible mode');
{
  const m = EX.get('air').build();
  const p3 = pipe(m, 3);
  M.loosenEnd(p3, 'down', M.spotNear(m, p3, 'down'));
  let r;
  try { r = run(m); } catch (e) { r = { threw: e.message }; }
  ok('E11 a gas network with a loose end is refused with the same message', !!r && r.ok === false && (r.errors || []).some((x) => x === t('core.solver.pipeNotConnected', { id: 3 })), JSON.stringify(r.errors || r.threw));
}

console.log('\nLoaded models and the drawing data');
{
  const plain = EX.get('pump').build();
  const was = JSON.stringify(plain);
  ok('E12 a model without loose ends opens unchanged', JSON.stringify(M.normalizeEnds(plain)) === was);

  const m = EX.get('pump').build();
  pipe(m, 1).up = 99;                                       // a junction that is not in the file
  pipe(m, 2).loose = { up: { x: 1, y: 2, z: 3 } };          // a spot for an end that is connected
  pipe(m, 3).down = null;                                   // loose, with a broken spot
  pipe(m, 3).loose = { down: { x: 'a', y: 0, z: 0 } };
  M.normalizeEnds(m);
  const p1 = pipe(m, 1), p2 = pipe(m, 2), p3 = pipe(m, 3);
  ok('E13 an end tied to a missing junction becomes loose, next to the other end', p1.up === null && JSON.stringify(p1.loose) === JSON.stringify({ up: { x: 360, y: 300, z: 0 } }), JSON.stringify(p1.loose));
  ok('E13 the spot of a connected end is dropped', p2.up === 2 && !('loose' in p2));
  ok('E13 a broken spot is replaced', p3.down === null && JSON.stringify(p3.loose) === JSON.stringify({ down: { x: 580, y: 180, z: 1 } }), JSON.stringify(p3.loose));

  const lone = { junctions: [], pipes: [M.newPipe(1, null, undefined)] };
  M.normalizeEnds(lone);
  ok('E14 a pipe without junctions gets a spot for each end', JSON.stringify(lone.pipes[0].loose) === JSON.stringify({ up: { x: 0, y: 0, z: 0 }, down: { x: 60, y: 0, z: 0 } }) && lone.pipes[0].down === null);

  ok('E15 the loose spots are drawing data: the calculation never sees them', !('loose' in M.stripLayout(m).pipes[0]) && M.LAYOUT_KEYS.pipe.includes('loose'));
}

console.log(`\n${pass} checks passed, ${fail} failed`);
if (fail) process.exit(1);
