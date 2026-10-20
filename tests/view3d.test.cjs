// Tests of the 3D views (3D views specification §12, Appendix C adapted to Pump It). Usage: node tests/view3d.test.cjs
// The geometry of src/core/view3d/ against exact values, and the contract between the drawing and the calculation
// (src/core/model/layout.js): a drawing never changes a result and a new pipe never takes its length from it.
const { loadCore } = require('./load-core');

const PumpIt = loadCore();
const V = PumpIt.view3d, M = PumpIt.model, S = PumpIt.solver, EX = PumpIt.examples;
const q = M.q;

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) pass++; else fail++;
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  ' + detail : ''));
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const nearPt = (s, x, y, tol = 0.01) => !!s && near(s.x, x, tol) && near(s.y, y, tol);
const keyList = (cs) => cs.map((c) => c.key).join(' ; ');
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const vp = { w: 800, h: 600 };
const iso = { projection: 'ortho', azimuth: -45, elevation: V.ISO_ELEVATION, scale: 100, target: [0, 0, 0] };
const preset = (p) => ({ projection: 'ortho', scale: 100, target: [0, 0, 0], ...V.PRESETS[p] });

console.log('\nProjection and cursor rays');
// T1 true isometric: axes at 30° and (1, −1, 1) along the line of sight
ok('T1 X', nearPt(V.project(iso, vp, [1, 0, 0]), 470.71, 340.82));
ok('T1 Y', nearPt(V.project(iso, vp, [0, 1, 0]), 470.71, 259.18));
ok('T1 Z', nearPt(V.project(iso, vp, [0, 0, 1]), 400, 218.35));
ok('T1 (1, -1, 1) at the centre', nearPt(V.project(iso, vp, [1, -1, 1]), 400, 300));

// T2 2:1 style
const iso21 = { ...iso, squash: V.SQUASH_2_1 };
const x21 = V.project(iso21, vp, [1, 0, 0]);
ok('T2 X in the 2:1 style', nearPt(x21, 470.71, 335.36), `slope ${((x21.y - 300) / (x21.x - 400)).toFixed(4)}`);
ok('T2 (1, -1, 1) at the centre', nearPt(V.project(iso21, vp, [1, -1, 1]), 400, 300));

// T3 ready-made views
ok('T3 top X', nearPt(V.project(preset('top'), vp, [1, 0, 0]), 500, 300));
ok('T3 top Y', nearPt(V.project(preset('top'), vp, [0, 1, 0]), 400, 200));
ok('T3 front X', nearPt(V.project(preset('front'), vp, [1, 0, 0]), 500, 300));
ok('T3 front Z', nearPt(V.project(preset('front'), vp, [0, 0, 1]), 400, 200));
ok('T3 side Y', nearPt(V.project(preset('side'), vp, [0, 1, 0]), 500, 300));
ok('T3 side Z', nearPt(V.project(preset('side'), vp, [0, 0, 1]), 400, 200));

// T4 perspective
const per = { projection: 'persp', azimuth: 0, elevation: 0, distance: 10, fov: 90, target: [0, 0, 0] };
ok('T4 (0, 1, 0)', nearPt(V.project(per, vp, [0, 1, 0]), 430, 300));
const p5 = V.project(per, vp, [5, 1, 0]);
ok('T4 (5, 1, 0) and local scale', nearPt(p5, 460, 300) && near(p5.k, 60, 1e-9));
ok('T4 point behind the camera', V.project(per, vp, [12, 0, 0]) === null);

// T5 round trip screen → ray
let worst = 0;
for (const c of [iso, iso21, per, { projection: 'persp', azimuth: 33, elevation: 21, distance: 40, fov: 35, target: [3, -2, 1] }]) {
  for (let k = 0; k < 300; k++) {
    const p = [rnd() * 20 - 10, rnd() * 20 - 10, rnd() * 6];
    const s = V.project(c, vp, p);
    if (!s) continue;
    const ray = V.unproject(c, vp, s.x, s.y);
    const t = V.dot(V.sub(p, ray.o), ray.d);
    worst = Math.max(worst, V.len(V.sub(V.add(ray.o, V.mul(ray.d, t)), p)));
  }
}
ok('T5 the cursor ray goes through the point', worst < 1e-8, `largest deviation ${worst.toExponential(2)} du`);

// T6 ray × plane and ray × vertical
const hit = V.rayPlaneZ(V.unproject(iso, vp, 470.71, 340.82), 0);
ok('T6 ray ∩ Z = 0', !!hit && near(hit[0], 1, 1e-3) && near(hit[1], 0, 1e-3) && near(hit[2], 0, 1e-9));
const zv = V.closestOnVertical(V.unproject(per, vp, 430, 300), 0, 1);
ok('T6 closest point on a vertical line', zv != null && near(zv, 0, 1e-9));

console.log('\nRoutes, segments and symbols');
// T7 route candidates from the screen (isometric)
const s21 = V.project(iso, vp, [2, 1, 0]);
const c7 = V.routeCandidatesScreen(iso, vp, [0, 0, 0], s21.x, s21.y, 1);
ok('T7 order of the candidates', keyList(c7) === 'x2|y1 ; y1|x2 ; x3|z1 ; z1|x3 ; y3|z-2 ; z-2|y3', keyList(c7));
ok('T7 3D end points', c7.map((c) => c.pts[c.pts.length - 1].join(',')).join(' ') === '2,1,0 2,1,0 3,0,1 3,0,1 0,3,-2 0,3,-2');
ok('T7 every end point falls under the cursor', c7.every((c) => nearPt(V.project(iso, vp, c.pts[c.pts.length - 1]), s21.x, s21.y, 1e-6)));
ok('T7 legs along the axes', c7.every((c) => c.pts.slice(1).every((p, i) => V.axisOf(c.pts[i], p))));

// T8 cursor near an axis: the single leg comes first
const s20 = V.project(iso, vp, [2, 0, 0]);
const c8 = V.routeCandidatesScreen(iso, vp, [0, 0, 0], s20.x + 3, s20.y - 2, 1);
ok('T8 single leg first', keyList(c8) === 'x2 ; y2|z-2 ; z-2|y2', keyList(c8));

// T9 route to an existing junction
const c9 = V.routeCandidatesTo([0, 0, 0], [2, -1, 3], 'x');
ok('T9 orders of the axes', c9.map((c) => c.key).join(' ') === 'xyz xzy yxz yzx zxy zyx', c9.map((c) => c.key).join(' '));
ok('T9 three legs, length 6', c9.every((c) => near(V.drawnLength(c.pts), 6, 1e-12) && c.pts.length === 4));
ok('T9 without a previous axis: x before y', V.routeCandidatesTo([0, 0, 0], [3, 2, 0])[0].key === 'xy');

// T10 moving a segment
const m1 = V.moveSegment([[0, 0, 0], [4, 0, 0], [4, 3, 0]], 0, 'z', 2);
ok('T10 a', JSON.stringify(m1) === '[[0,0,0],[0,0,2],[4,0,2],[4,0,0],[4,3,0]]', JSON.stringify(m1));
const m2 = V.moveSegment([[0, 0, 0], [4, 0, 0], [4, 3, 0], [4, 3, 5]], 1, 'x', 2);
ok('T10 b', JSON.stringify(m2) === '[[0,0,0],[6,0,0],[6,3,0],[4,3,0],[4,3,5]]', JSON.stringify(m2));
const m3 = V.moveSegment([[0, 0, 0], [4, 0, 0], [4, 3, 0], [4, 3, 5]], 1, 'z', 1);
ok('T10 c', JSON.stringify(m3) === '[[0,0,0],[4,0,0],[4,0,1],[4,3,1],[4,3,5]]', JSON.stringify(m3));
ok('T10 fixed end points and legs along the axes', [m1, m2, m3].every((m) => m.slice(1).every((p, i) => V.axisOf(m[i], p))));

// T11 simplify
ok('T11 simplify', JSON.stringify(V.simplify([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 0, 0], [2, 1, 0]])) === '[[0,0,0],[2,0,0],[2,1,0]]');

// T12 symbols
const ax = V.iconAxes([1, 0, 0], iso);
const im = V.iconMatrix(iso, vp, [0, 0, 0], ax.a, ax.up);
ok('T12 isometric, X axis', im.m.map((v) => v.toFixed(3)).join(',') === '0.866,0.500,0.000,1.000,400.000,300.000' && !im.billboard);
const fr = preset('front');
const imf = V.iconMatrix(fr, vp, [0, 0, 0], [1, 0, 0], [0, 1, 0]);
ok('T12 plane seen edge-on becomes a billboard', imf.billboard && near(imf.m[0], 1, 1e-9) && near(imf.m[3], 1, 1e-9));
ok('T12 front view = identity', V.iconMatrix(fr, vp, [0, 0, 0], [1, 0, 0], [0, 0, 1]).m.slice(0, 4).map((v) => v.toFixed(3)).join(',') === '1.000,0.000,0.000,1.000');
ok('T12 never mirrors', V.iconMatrix(fr, vp, [0, 0, 0], [1, 0, 0], [0, 0, -1]).m.slice(0, 4).map((v) => v.toFixed(3)).join(',') === '1.000,0.000,0.000,1.000');
const vert = V.iconAxes([0, 0, 1], iso);
ok('T12 vertical axis: horizontal up', near(vert.up[2], 0, 1e-12) && near(V.len(vert.up), 1, 1e-12));
ok('T12 roll of 90° about X', near(V.iconAxes([1, 0, 0], iso, 90).up[1], -1, 1e-12));

console.log('\nGrids, framing, zoom and pan');
// T13 isometric screen grid
const iso40 = { ...iso, scale: 40 };
const g = V.isoGridLines(iso40, vp, 1, 5);
const fam = (f) => g.filter((l) => l.family === f);
ok('T13 three families', fam('x').length > 0 && fam('y').length > 0 && fam('z').length > 0, `${fam('x').length}/${fam('y').length}/${fam('z').length} lines`);
ok('T13 lines inside the screen', g.every((l) => [l.x1, l.x2].every((x) => x >= -1e-6 && x <= 800 + 1e-6) && [l.y1, l.y2].every((y) => y >= -1e-6 && y <= 600 + 1e-6)));
const pt = V.project(iso40, vp, [2, -1, 0]);
const distTo = (l) => Math.abs((l.x2 - l.x1) * (l.y1 - pt.y) - (l.x1 - pt.x) * (l.y2 - l.y1)) / Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
ok('T13 integer world point on a line of each family', ['x', 'y', 'z'].every((f) => fam(f).some((l) => distTo(l) < 1e-6)));
ok('T13 family z is vertical', fam('z').every((l) => near(l.x1, l.x2, 1e-6)));
ok('T13 left out when too dense', V.isoGridLines({ ...iso, scale: 0.5 }, vp, 1, 5).length === 0);
for (const azimuth of [45, 135, -135]) {
  for (const style of ['true', '2:1']) {
    const c = V.isoCamera({ azimuth, style, scale: 40, target: [0, 0, 0] });
    const gl = V.isoGridLines(c, vp, 1, 5);
    const qp = V.project(c, vp, [2, -1, 1]);
    const dq = (l) => Math.abs((l.x2 - l.x1) * (l.y1 - qp.y) - (l.x1 - qp.x) * (l.y2 - l.y1)) / Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    const fz = gl.filter((l) => l.family === 'z');
    ok(`T13 azimuth ${azimuth}°, ${style}: vertical lines and integer point on the three families`,
      fz.length > 0 && fz.every((l) => near(l.x1, l.x2, 1e-6)) && ['x', 'y', 'z'].every((f) => gl.filter((l) => l.family === f).some((l) => dq(l) < 1e-6)));
  }
}

// T14 framing
const pts = [[0, 0, 0], [10, 0, 0], [10, 6, 0], [10, 6, 4]];
const fitted = V.fit(iso, vp, pts);
ok('T14 orthographic: everything inside, with the margin', pts.map((p) => V.project(fitted, vp, p)).every((s) => s.x >= 47.9 && s.x <= 752.1 && s.y >= 47.9 && s.y <= 552.1));
const fp = V.fit({ projection: 'persp', azimuth: -60, elevation: 30, fov: 35, distance: 5, target: [0, 0, 0] }, vp, pts);
ok('T14 perspective: everything visible', pts.every((p) => { const s = V.project(fp, vp, p); return s && s.x >= 0 && s.x <= 800 && s.y >= 0 && s.y <= 600; }));

// T15 zoom at the cursor and pan
const z1 = V.zoomAt(iso, vp, 600, 150, 1.7);
ok('T15 orthographic: the point under the cursor stays still', nearPt(V.project(z1, vp, V.rayPlaneZ(V.unproject(iso, vp, 600, 150), 0)), 600, 150, 1e-6));
const pz = { projection: 'persp', azimuth: -60, elevation: 30, fov: 35, distance: 30, target: [1, 2, 0] };
const onTargetPlane = (c, sx, sy) => { const { w } = V.basis(c); const ray = V.unproject(c, vp, sx, sy); const t = V.dot(V.sub(c.target, ray.o), w) / V.dot(ray.d, w); return V.add(ray.o, V.mul(ray.d, t)); };
ok('T15 perspective: the point under the cursor stays still', nearPt(V.project(V.zoomAt(pz, vp, 520, 380, 1.5), vp, onTargetPlane(pz, 520, 380)), 520, 380, 1e-6));
const o0 = V.project(iso, vp, [0, 0, 0]);
ok('T15 pan follows the drag', nearPt(V.project(V.pan(iso, vp, 30, -20), vp, [0, 0, 0]), o0.x + 30, o0.y - 20, 1e-9));
const a0 = V.project(pz, vp, pz.target);
ok('T15 pan in perspective', nearPt(V.project(V.pan(pz, vp, 30, -20), vp, pz.target), a0.x + 30, a0.y - 20, 1e-9));

// T16 working plane grid in perspective
const pg = V.planeGridLines({ projection: 'persp', azimuth: -60, elevation: 10, fov: 35, distance: 8, target: [0, 0, 0] }, vp, 0, 1, 5, 20);
ok('T16 no invalid points', pg.length > 0 && pg.every((l) => [l.x1, l.y1, l.x2, l.y2].every(Number.isFinite)), `${pg.length} lines`);

console.log('\nScene from the plan and the elevations (D-20)');
// T17 the schematic is the plan and the height is the elevation; automatic routes follow the axes
{
  const p = V.toScene(140, -60, 22.5, 0.5);
  ok('T17 plan point: X = x / 20, Y = −y / 20, Z = elevation × scale', JSON.stringify(p) === '[7,3,11.25]', JSON.stringify(p));
  const back = V.fromScene(p, 0.5);
  ok('T17 and back to the schematic and the elevation', back.x === 140 && back.y === -60 && back.elev === 22.5);
  const zs = PumpIt.examples.EXAMPLES.map((ex) => V.autoZScale(ex.build().junctions.map((j) => ({ x: j.x, y: j.y, elev: j.elevation.value }))));
  ok('T17 vertical scale of every example: 1, 2 or 5 × 10ⁿ', zs.every((s) => s > 0 && /^[125]$/.test(String(+(s / 10 ** Math.floor(Math.log10(s))).toFixed(6)))), zs.join(' '));
  ok('T17 flat model: scale 1', V.autoZScale([{ x: 0, y: 0, elev: 3 }, { x: 200, y: 0, elev: 3 }]) === 1);
  for (const ex of EX.EXAMPLES) {
    const m = ex.build();
    const s = V.autoZScale(m.junctions.map((j) => ({ x: j.x, y: j.y, elev: j.elevation.value })));
    const pos = new Map(m.junctions.map((j) => [j.id, V.toScene(j.x, j.y, j.elevation.value, s)]));
    const ortho = m.pipes.every((pp) => { const r = V.autoRoute(pos.get(pp.up), pos.get(pp.down)); return r.slice(1).every((q, i) => V.axisOf(r[i], q)); });
    ok(`T17 ${ex.id}: automatic routes along the axes`, ortho);
  }
}

console.log('\nRoutes that follow their junctions');
// T22 bends kept relative to the ends: unchanged ends give the same points; moved ends keep the route along the axes
{
  const route = [[0, 0, 0], [4, 0, 0], [4, 0, 2], [4, 3, 2], [6, 3, 2]];
  const bends = V.anchorBends(route);
  ok('T22 same ends: same bends', JSON.stringify(V.resolveBends(bends, route[0], route[4])) === JSON.stringify(route.slice(1, -1)), JSON.stringify(bends));
  let worstOff = 0, allAxes = true;
  for (let k = 0; k < 200; k++) {
    const a = [Math.round(rnd() * 10 - 5), Math.round(rnd() * 10 - 5), Math.round(rnd() * 6)];
    const b = [Math.round(rnd() * 10 - 5), Math.round(rnd() * 10 - 5), Math.round(rnd() * 6)];
    const pts = V.orthogonalize([a, ...V.resolveBends(bends, a, b), b]);
    if (!V.pointsEqual(pts[0], a) || !V.pointsEqual(pts[pts.length - 1], b)) worstOff++;
    if (!pts.slice(1).every((q, i) => V.axisOf(pts[i], q))) allAxes = false;
  }
  ok('T22 moved ends: the route keeps its ends and stays along the axes', worstOff === 0 && allAxes, `${worstOff} misplaced ends`);
  const moved = V.orthogonalize([[0, 0, 0], ...V.resolveBends(bends, [0, 0, 0], [6, 3, 5]), [6, 3, 5]]);
  ok('T22 the end goes up: the legs that follow it go up with it', JSON.stringify(moved) === '[[0,0,0],[4,0,0],[4,0,5],[4,3,5],[6,3,5]]', JSON.stringify(moved));
  ok('T22 orthogonalize splits a leg off the axes, the vertical last', JSON.stringify(V.orthogonalize([[0, 0, 0], [2, 1, 3]])) === '[[0,0,0],[2,0,0],[2,1,0],[2,1,3]]');
  const L = V.routeCandidatesTo([0, 0, 0], [3, 2, 0])[1].pts;
  ok('T22 a chosen order of the axes is kept after a move', JSON.stringify(V.orthogonalize([[0, 0, 0], ...V.resolveBends(V.anchorBends(L), [0, 0, 0], [5, 4, 0]), [5, 4, 0]])) === '[[0,0,0],[0,4,0],[5,4,0]]');
}

console.log('\nEditing in the free 3D view');
{
  const cam = { projection: 'persp', azimuth: -60, elevation: 30, distance: 20, fov: 35, target: [0, 0, 0] };
  const front = { ...cam, ...V.PRESETS.front };
  // the cursor ray through the screen point of the world point p
  const rayAt = (c, p) => { const s = V.project(c, vp, p); return V.unproject(c, vp, s.x, s.y); };
  const same = (a, b, tol = 1e-6) => !!a && !!b && a.length === b.length && a.every((v, k) => Math.abs(v - b[k]) <= tol);
  const samePts = (a, b) => !!a && a.length === b.length && a.every((p, i) => same(p, b[i]));

  // T23 the tip of a pipe being drawn (§8.10, R-45)
  const t1 = V.drawTip(rayAt(cam, [3.2, -1.7, 0]), cam, [0, 0, 0], { g: 1 });
  ok('T23 horizontal: on the plane of the last point, X and Y on the grid', samePts(t1.pts, [[3, -2, 0]]) && same(t1.anchor, [3, -2, 0]), JSON.stringify(t1));
  const t2 = V.drawTip(rayAt(cam, [3.2, -1.7, 2]), cam, [1, 1, 2]);
  ok('T23 without snapping: the exact point, at the height of the last point', samePts(t2.pts, [[3.2, -1.7, 2]]));
  const t3 = V.drawTip(rayAt(cam, [3.2, 1.1, 0]), cam, [0, 0, 0], { g: 1, lock: true });
  ok('T23 Ctrl: locked on the axis closest to the direction', samePts(t3.pts, [[3, 0, 0]]), JSON.stringify(t3.pts));
  const t4 = V.drawTip(rayAt(cam, [3, -2, 2.4]), cam, [0, 0, 0], { g: 1, vertical: true, anchor: [3, -2, 0] });
  ok('T23 Shift: up the vertical of the last horizontal tip, turning there (an L)', samePts(t4.pts, [[3, -2, 0], [3, -2, 2]]), JSON.stringify(t4.pts));
  const t5 = V.drawTip(rayAt(cam, [0, 0, -1.6]), cam, [0, 0, 0], { g: 0.5, vertical: true });
  ok('T23 Shift from the last point: a single vertical leg, Z on the grid', samePts(t5.pts, [[0, 0, -1.5]]), JSON.stringify(t5.pts));
  const t6 = V.drawTip(rayAt(front, [2.2, 0, 1.3]), front, [0, 0, 0], { g: 1 });
  ok('T23 a view with the horizontal plane edge on draws on the vertical plane facing the camera', samePts(t6.pts, [[2, 0, 1]]), JSON.stringify(t6.pts));
  const t7 = V.drawTip(rayAt(front, [2.2, 0.4, 1.3]), front, [0, 0.4, 0], { g: 1 });
  ok('T23 ... snapping only X and Z there, so the tip keeps the depth of the last point', samePts(t7.pts, [[2, 0.4, 1]]), JSON.stringify(t7.pts));

  // T24 moving a junction or a bend (§8.9, R-46, R-47)
  const p0 = [1, 1, 2];
  ok('T24 horizontal drag, keeping the offset from the cursor', same(V.dragPoint(cam, rayAt(cam, [1.2, 1.1, 2]), rayAt(cam, [3.2, 1.1, 2]), p0), [3, 1, 2]));
  ok('T24 horizontal drag snapped to the grid', same(V.dragPoint(cam, rayAt(cam, p0), rayAt(cam, [3.4, 0.6, 2]), p0, { g: 1 }), [3, 1, 2]));
  ok('T24 Shift: up its vertical line, Z snapped', same(V.dragPoint(cam, rayAt(cam, p0), rayAt(cam, [1, 1, 4.3]), p0, { vertical: true, g: 1 }), [1, 1, 4]));
  ok('T24 Front view: in the vertical plane facing the camera', same(V.dragPoint(front, rayAt(front, p0), rayAt(front, [3, 1, 5]), p0, { g: 1 }), [3, 1, 5]));
  const seg = [[0, 0, 0], [4, 0, 0]];
  ok('T24 a double click inserts the bend on the segment, under the cursor', same(V.closestOnSegment(seg[0], seg[1], rayAt(cam, [1.5, 0, 0])), [1.5, 0, 0]));
  ok('T24 ... and never beyond its ends', same(V.closestOnSegment(seg[0], seg[1], rayAt(cam, [7, 0, 0])), [4, 0, 0]));
  ok('T24 route kinds: along the axes, off the axes, with a bend in a straight run',
    V.routeKind([[0, 0, 0], [2, 0, 0], [2, 3, 0]]) === 'axes' && V.routeKind([[0, 0, 0], [2, 1, 0]]) === 'free' && V.routeKind([[0, 0, 0], [2, 0, 0], [4, 0, 0]]) === 'free' && V.routeKind([[0, 0, 0], [0, 0, 0], [2, 0, 0]]) === 'axes');
  ok('T24 Ctrl lock and snapping', same(V.lockAxis([1, 1, 1], [1.2, 4, 0.5]), [1, 4, 1]) && same(V.snapTo([0.26, 1.74, 2.2], 0.5, [0, 1]), [0.5, 1.5, 2.2]));

  // T26 camera transitions (R-63)
  const ca = { projection: 'persp', azimuth: 170, elevation: 20, distance: 10, fov: 35, scale: 10, target: [0, 0, 0] };
  const cb = { projection: 'persp', azimuth: -170, elevation: 60, distance: 40, fov: 35, scale: 40, target: [4, -2, 6] };
  const half = V.lerpCamera(ca, cb, 0.5);
  ok('T26 the ends of a transition are the two cameras', JSON.stringify(V.lerpCamera(ca, cb, 0)) === JSON.stringify(ca) && JSON.stringify(V.lerpCamera(ca, cb, 1)) === JSON.stringify(cb));
  ok('T26 halfway: the azimuth turns the short way round, the distance by equal ratios', near(half.azimuth, 180, 1e-9) && near(half.elevation, 40, 1e-9) && near(half.distance, 20, 1e-9) && near(half.scale, 20, 1e-9) && same(half.target, [2, -1, 3]));
}

console.log('\nDrawing and calculation (R-10, R-13, R-16)');
// T18–T19 for every scenario of every example
ok('T18 contract exported', typeof M.stripLayout === 'function' && !!M.LAYOUT_KEYS && typeof M.pipeDefaults === 'function');
for (const ex of EX.EXAMPLES) {
  const base = ex.build();
  const noisy = JSON.parse(JSON.stringify(base));
  noisy.view3 = { mode: 'iso', step: 1, major: 5, level: 3, zScale: 0.5 };
  for (const j of noisy.junctions) { j.x = rnd() * 900; j.y = rnd() * 600; j.icon3 = { roll: 90 }; }
  for (const p of noisy.pipes) { p.bends3 = [{ ref: 'aab', d: [rnd(), rnd(), rnd()] }, { ref: 'bbb', d: [rnd(), 0, 0] }]; p.snap3 = rnd() > 0.5; }
  const snapshot = JSON.stringify(noisy);
  let same = true, untouched = true;
  for (const s of base.scenarios.list) {
    const r0 = JSON.stringify(S.run(M.effective(M.stripLayout(base), s.id)));
    const eff = M.effective(noisy, s.id);
    const before = JSON.stringify(eff);
    if (JSON.stringify(S.run(eff)) !== r0) same = false;
    if (JSON.stringify(eff) !== before) untouched = false;
  }
  ok(`T18 ${ex.id}: identical results with a random drawing`, same, `${base.scenarios.list.length} scenario(s)`);
  ok(`T18 ${ex.id}: the calculation does not change the model`, untouched && JSON.stringify(noisy) === snapshot);
  ok(`T19 ${ex.id}: stripLayout removes only the drawing`, JSON.stringify(M.stripLayout(noisy)) === JSON.stringify(M.stripLayout(base)));
}

// T20 data of a new pipe
const d0 = M.pipeDefaults(null);
ok('T20 new pipe without a reference: 100 m', d0.length.value === 100 && d0.length.unit === 'm');
const ref = M.newPipe(9, 1, 2);
ref.length = q(42, 'm');
ref.geometry.d = q(200, 'mm');
ref.friction = { model: 'roughness', eps: q(0, 'mm'), rel: 0, f: 0.02, C: 120 };
const d1 = M.pipeDefaults(ref);
ok('T20 new pipe copies the reference pipe (roughness 0 included)', d1.length.value === 42 && d1.geometry.d.value === 200 && d1.friction.eps.value === 0);
d1.geometry.d.value = 1;
ok('T20 the copy shares no object with the reference', ref.geometry.d.value === 200);
ok('T20 reference without a valid length: 100 m', M.pipeDefaults(Object.assign(M.newPipe(9, 1, 2), { length: q(null, 'm') })).length.value === 100);

console.log('\nLoaded models (§7.5)');
// T21 validation of the drawing fields of a loaded model
{
  const m = M.newModel();
  m.junctions.push(Object.assign(M.newJunction('branch', 1, 0, 0), { pos3: [1, 2], icon3: { roll: 45 } }));
  m.junctions.push(Object.assign(M.newJunction('branch', 2, 20, 0), { pos3: [1, 2, 3], icon3: { roll: 270 } }));
  m.pipes.push(Object.assign(M.newPipe(1, 1, 2), { bends3: [{ ref: 'abb', d: [1, 2, 3], extra: 1 }, { ref: 'abc', d: [0, 0, 0] }, [1, 2, 3], null], snap3: 'yes' }));
  m.pipes.push(Object.assign(M.newPipe(2, 2, 1), { bends3: [{ ref: 'aaa', d: [NaN, 0, 0] }], snap3: false }));
  m.view3 = {
    mode: 'x', step: 0, major: 7.5, level: 'a', zScale: -1, map2d: { ox: 1, oy: 2, k: 20 },
    iso: { azimuth: 170, style: 'z', scale: 1000, target: [0, 0] },
    free: { projection: 'q', elevation: 120, fov: 5, distance: 1e6, scale: 1, target: [1, 2, 3], snap: 1 },
  };
  M.normalizeLayout(m);
  const [j1, j2] = m.junctions, [p1, p2] = m.pipes, v = m.view3;
  ok('T21 stored 3D positions of an earlier version removed; icon3 checked', !('pos3' in j1) && !('pos3' in j2) && !('icon3' in j1) && j2.icon3.roll === 270);
  ok('T21 bends3: invalid bends dropped, an empty list removed', JSON.stringify(p1.bends3) === '[{"ref":"abb","d":[1,2,3]}]' && !('bends3' in p2));
  ok('T21 snap3: booleans only', !('snap3' in p1) && p2.snap3 === false);
  ok('T21 view3: mode, grid, working level, vertical scale reset; old conversion data dropped', v.mode === '2d' && v.step === 1 && v.major === 5 && v.level === 0 && v.zScale === 1 && !('map2d' in v));
  ok('T21 view3: isometric camera', v.iso.azimuth === 135 && v.iso.style === 'true' && v.iso.scale === 400 && JSON.stringify(v.iso.target) === '[0,0,0]' && v.iso.grid === true && v.iso.shadows === true);
  ok('T21 view3: free camera', v.free.projection === 'persp' && v.free.elevation === 90 && v.free.fov === 15 && v.free.distance === 5000 && v.free.scale === 2 && JSON.stringify(v.free.target) === '[1,2,3]' && v.free.snap === true && v.free.shadows === true);
  ok('T21 a model without drawing data stays without it', !('view3' in M.normalizeLayout(M.newModel())));
}
// T25 a model saved as JSON and opened again keeps its 3D drawing (§13, item 14)
{
  const m = EX.EXAMPLES[0].build();
  m.view3 = M.newView3();
  Object.assign(m.view3, { mode: 'iso', step: 0.5, level: 2, zScale: 0.5 });
  m.view3.free.snap = false;
  m.junctions[1].icon3 = { roll: 180 };
  m.pipes[0].bends3 = V.anchorBends([[0, 0, 0], [3, 0, 0], [3, 0, 2], [5, 1, 2]]);
  m.pipes[1].snap3 = false;
  const drawing = (x) => JSON.stringify({ view3: x.view3, j: x.junctions.map((j) => [j.x, j.y, j.icon3]), p: x.pipes.map((p) => [p.bends3, p.snap3]) });
  const back = M.normalizeLayout(JSON.parse(JSON.stringify(m)));
  ok('T25 the drawing survives a trip through JSON and the validation of §7.5', drawing(back) === drawing(m));
  const old = EX.EXAMPLES[0].build();
  ok('T25 a model without a drawing opens unchanged', JSON.stringify(M.normalizeLayout(JSON.parse(JSON.stringify(old)))) === JSON.stringify(old));
}

console.log('\nJunction symbols as solids (D-29)');
{
  // the junction views, where every type describes its solid, from the script list of index.html
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const { ROOT } = require('./load-core');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = ['src/ui/namespace.js', ...[...html.matchAll(/<script src="(src\/ui\/junctions\/[^"]+)"/g)].map((m) => m[1])];
  const ctx = vm.createContext({ PumpIt, console });
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  const JT = PumpIt.ui.junctionTypes, S = V.solid;

  const same3 = (a, b) => V.len(V.sub(a, b)) < 1e-9;
  const top = preset('top'), front = preset('front'), side = preset('side');
  const cam = { projection: 'persp', azimuth: -60, elevation: 30, distance: 40, fov: 35, target: [0, 0, 0] };
  const below = { ...cam, elevation: -35 };
  const W = V.solidAxes(null);
  const draw = (c, model, axes = W, at = [0, 0, 0]) => V.drawSolid(model, V.solidPlacement(c, vp, at, axes));
  const faces = (d) => d.parts.flatMap((pt) => pt.faces || []);
  const drum = { parts: [S.cyl([0, 0, -8], [0, 0, 8], 10, 'a')], reach: [S.cyl([0, 0, -8], [0, 0, 8], 10)] };

  // T27 faces turned away are left out; the symbol meets the projection of the scene; the farthest part comes first
  ok('T27 a drum seen from above shows only its top', faces(draw(top, drum)).length === 1);
  ok('T27 ... and from the front half of its 20 sides, without its ends', faces(draw(front, drum)).length === 10);
  const axes = V.solidAxes([1, 1, 0]);
  let worst = 0;
  for (const c of [iso, { ...iso, squash: V.SQUASH_2_1 }, cam]) {
    for (const at of [[0, 0, 0], [6, -4, 2]]) {
      const pl = V.solidPlacement(c, vp, at, axes), c0 = V.project(c, vp, at);
      for (const L of [[16, 0, 0], [0, -10, 5], [-8, 6, -12]]) {
        const sp = V.project(c, vp, V.add(at, V.mul(V.add(V.add(V.mul(axes.ex, L[0]), V.mul(axes.ey, L[1])), V.mul(axes.ez, L[2])), pl.du)));
        const ax = c0.x + pl.A[0][0] * L[0] + pl.A[0][1] * L[1] + pl.A[0][2] * L[2], ay = c0.y + pl.A[1][0] * L[0] + pl.A[1][1] * L[1] + pl.A[1][2] * L[2];
        worst = Math.max(worst, Math.hypot(sp.x - ax, sp.y - ay));
      }
    }
  }
  ok('T27 the symbol meets the projection of the scene (exact in orthographic)', worst < 0.5, `${worst.toFixed(3)} px at most`);
  const two = { parts: [S.box([-8, 0, 0], [3, 3, 3], 'a'), S.box([8, 0, 0], [3, 3, 3], 'b')] };
  const order = (d) => d.parts.map((pt) => pt.faces[0].mat).join('');
  ok('T27 parts painted from the farthest to the nearest', order(draw(side, two)) === 'ab' && order(draw({ ...side, azimuth: 180 }, two)) === 'ba');
  const cube = faces(draw(iso, { parts: [S.box([0, 0, 0], [5, 5, 5], 'a')] }));
  const cy = (fc) => fc.pts.reduce((sum, p) => sum + p[1], 0) / fc.pts.length;
  const lid = cube.reduce((a, b) => (cy(a) < cy(b) ? a : b)); // the face highest on the screen
  ok('T27 three faces of a box show, its top lit the most', cube.length === 3 && cube.every((fc) => fc === lid || fc.shade < lid.shade), cube.map((fc) => fc.shade).join(' '));
  ok('T27 no symbol behind the camera', V.solidPlacement(per, vp, [12, 0, 0], W) === null);

  // T28 axes of a symbol and where the pipes stop
  const h = V.solidAxes([1, 1, 0]), vv = V.solidAxes([0, 0, 1]), r90 = V.solidAxes([1, 0, 0], 90);
  const frame = (a) => [a.ex, a.ey, a.ez].every((e) => near(V.len(e), 1, 1e-12)) && near(V.dot(a.ex, a.ey), 0, 1e-12) && near(V.dot(a.ey, a.ez), 0, 1e-12) && same3(V.cross(a.ex, a.ey), a.ez);
  ok('T28 x along the pipe and z up, in a right-handed frame', same3(h.ex, V.norm([1, 1, 0])) && same3(h.ez, [0, 0, 1]) && frame(h) && frame(vv) && frame(r90));
  ok('T28 a vertical pipe turns z to the front of the plan (−Y); a roll of 90° about X too', same3(vv.ez, [0, -1, 0]) && same3(r90.ez, [0, -1, 0]));
  const plY = V.solidPlacement(top, vp, [0, 0, 0], V.solidAxes([0, 1, 0]));
  ok('T28 a symbol that turns with its pipe lies along it on the screen', near(plY.A[0][0], 0, 1e-9) && near(plY.A[1][0], -1, 1e-9));
  ok('T28 a pipe stops at the body: across, through an end and through a corner of a drum', near(V.solidReach(drum, [1, 0, 0]), 10, 1e-9) && near(V.solidReach(drum, [0, 0, -1]), 8, 1e-9) && near(V.solidReach(drum, V.norm([1, 0, 1])), 8 * Math.SQRT2, 1e-9));
  const pumpLike = { reach: [S.cyl([-16, 0, 0], [16, 0, 0], 5.6), S.ball([0, 0, 0], 10.5)] };
  ok('T28 ... and at the end of a nozzle', near(V.solidReach(pumpLike, [-1, 0, 0]), 16, 1e-9) && near(V.solidReach(pumpLike, [0, 0, 1]), 10.5, 1e-9) && near(V.solidReach(pumpLike, [0, 1, 0]), 10.5, 1e-9));
  ok('T28 convex hull of the outline', JSON.stringify(V.convexHull([[0, 0], [2, 0], [1, 1], [2, 2], [0, 2]])) === '[[0,0],[2,0],[2,2],[0,2]]');

  // T29 the solids of the junction types
  const bad = [];
  for (const { type } of PumpIt.junctionTypes.list()) {
    const model = JT.get(type).solid;
    if (!model) { bad.push(type + ' has none'); continue; }
    for (const c of [iso, top, front, cam, below]) {
      const d = draw(c, model, V.solidAxes([1, 0, 0]));
      if (!d.parts.length || JSON.stringify(d).includes('null')) bad.push(`${type} from ${c.azimuth}/${c.elevation}`);
    }
    if (!(V.solidReach(model, [1, 0, 0]) > 0 && V.solidReach(model, [-1, 0, 0]) > 0)) bad.push(type + ' reach');
  }
  ok('T29 every junction type has a solid that draws from every side', bad.length === 0, bad.join('; '));
  const tank = JT.get('reservoir').solid;
  const liquid = (c) => faces(draw(c, tank)).some((fc) => fc.mat === 'liquid');
  ok('T29 the liquid of a reservoir shows from above, not from below', liquid(iso) && liquid(top) && !liquid(below));

  // T30 sizes in the scene (D-30): symbols and tubes keep the proportions of the schematic at every zoom
  console.log('\nSizes in the scene (D-30)');
  const size = (k) => V.scenePx(1.3, k);
  const placed = (c, at = [0, 0, 0]) => V.solidPlacement(c, vp, at, W, size);
  const dus = [10, 40, 160].map((scale) => placed({ ...iso, scale }).du);
  ok('T30 a symbol keeps its size in the scene at every zoom', dus.every((d) => near(d, 1.3 / V.PLAN_PX, 1e-12)), dus.join(' '));
  const ball = { parts: [S.ball([0, 0, 0], 7, 'a')] };
  const across = (c) => { const b = V.drawSolid(ball, placed(c)).box; return b.x1 - b.x0; };
  ok('T30 ... and on the screen it grows and shrinks with the zoom', near(across({ ...iso, scale: 80 }) / across({ ...iso, scale: 20 }), 4, 1e-9) && near(across({ ...iso, scale: 20 }), 2 * 7 * 1.3, 1e-9));
  ok('T30 n px of the schematic take n px at the scale of the schematic', near(V.scenePx(12, V.PLAN_PX), 12, 1e-12) && near(V.scenePx(12, 2 * V.PLAN_PX), 24, 1e-12));
  const ahead = { projection: 'persp', azimuth: 0, elevation: 0, distance: 20, fov: 35, target: [0, 0, 0] };
  const nearer = placed(ahead, [10, 0, 0]), farther = placed(ahead, [-10, 0, 0]);
  ok('T30 perspective: a symbol three times nearer is three times larger, and as large in the scene', near(nearer.s / farther.s, 3, 1e-9) && near(nearer.du, farther.du, 1e-12));
  // a tube as wide as the local scale has straight sides: the local scale runs linearly along a segment on the screen
  const A = [6, -3, 2], B = [-14, 5, -1], pa = V.project(ahead, vp, A), pb = V.project(ahead, vp, B);
  let off = 0;
  for (let t = 0.1; t < 1; t += 0.1) {
    const q = V.project(ahead, vp, V.add(A, V.mul(V.sub(B, A), t)));
    const u = Math.hypot(q.x - pa.x, q.y - pa.y) / Math.hypot(pb.x - pa.x, pb.y - pa.y);
    off = Math.max(off, Math.abs(q.k - (pa.k + (pb.k - pa.k) * u)) / pa.k);
  }
  ok('T30 perspective: the local scale runs linearly along a segment on the screen (tapered tubes have straight sides)', off < 1e-9, `${off.toExponential(1)} at most`);

  // T31 high zoom (D-31): the near plane, the closest zoom, turns and zooms about what the screen shows, solids in the
  // true perspective near the camera, the outline of a tapered tube
  console.log('\nHigh zoom (D-31)');
  const look = { projection: 'persp', azimuth: -60, elevation: 30, distance: 40, fov: 35, target: [0, 0, 0] };
  const eyeOf = (c) => V.add(c.target, V.mul(V.basis(c).w, c.distance));
  const ahead2 = (c, t) => V.sub(eyeOf(c), V.mul(V.basis(c).w, t)); // t du ahead of the camera, in the middle
  const through = V.clipNear(look, ahead2(look, -4), ahead2(look, 9)); // a pipe that runs through the camera
  ok('T31 nothing nearer to the camera than NEAR du is drawn, so one du never takes more than f / NEAR px',
    V.project(look, vp, ahead2(look, V.NEAR * 0.99)) === null && near((V.project(look, vp, through[0]).k * V.NEAR) / V.focalPx(look, vp), 1, 0.01));
  let zp = { ...look }, zo = { ...iso };
  for (let i = 0; i < 60; i++) { zp = V.zoomAt(zp, vp, 500, 260, 1.3); zo = V.zoomAt(zo, vp, 500, 260, 1.3); }
  ok('T31 the closest zoom: CLOSEST du from the target in perspective (MAX_SCALE px per du there at most), MAX_SCALE px per du in orthographic',
    near(zp.distance, Math.max(V.CLOSEST, V.focalPx(look, vp) / V.MAX_SCALE), 1e-9) && zo.scale === V.MAX_SCALE && V.fit(look, vp, [[1, 2, 3]]).distance >= V.CLOSEST);
  const tooNear = { ...look, distance: 2 };
  ok('T31 ... a camera already nearer is not pushed back by zooming in, and zooms out', V.zoomAt(tooNear, vp, 400, 300, 1.3).distance === 2 && near(V.zoomAt(tooNear, vp, 400, 300, 0.5).distance, 4, 1e-12));
  const probes = [[3, -2, 1], [-4, 6, 2], [10, 1, -3]];
  const sameView = (c1, c2) => probes.every((p) => { const a = V.project(c1, vp, p), b = V.project(c2, vp, p); return a && b && near(a.x, b.x, 1e-9) && near(a.y, b.y, 1e-9); });
  const rp = V.refocus(look, 25), ro = V.refocus(iso, -3);
  ok('T31 refocus: the same view, with the target at the depth asked for',
    sameView(look, rp) && sameView(iso, ro) && near(V.project(look, vp, rp.target).depth, 25, 1e-9) && near(V.project(iso, vp, ro.target).depth, -3, 1e-9) && same3(eyeOf(rp), eyeOf(look)));
  // what the screen shows: a junction J, another one K hidden behind it, a third one L elsewhere
  const J = [2, 1, 0], K = V.add(eyeOf(look), V.mul(V.sub(J, eyeOf(look)), 1.5)), L = [-9, 7, 3];
  const sJ = V.project(look, vp, J), pt = (p, r = 0.7) => ({ a: p, b: p, r });
  ok('T31 focus: of two junctions under the cursor, the nearer one', near(V.focusDepth(look, vp, sJ.x, sJ.y, [pt(K), pt(J), pt(L)]), sJ.depth, 1e-9));
  ok('T31 ... over empty space, what is drawn closest to the cursor', near(V.focusDepth(look, vp, sJ.x + 90, sJ.y, [pt(L), pt(J)]), sJ.depth, 1e-9));
  ok('T31 ... and nothing when all lies behind the camera', V.focusDepth(look, vp, 400, 300, [pt(ahead2(look, -3))]) === null);
  // a pipe crosses the middle of the screen 12 du in front of the target: an orbit about the target swings it away
  const Mid = ahead2(look, look.distance - 12), across3 = [{ a: V.add(Mid, [-3, 0, 0]), b: V.add(Mid, [3, 0, 0]), r: 0.3 }];
  const swing = (c) => { const s = V.project(V.orbit(c, 50, 20), vp, Mid); return Math.hypot(s.x - 400, s.y - 300); };
  ok('T31 an orbit turns about what the middle of the screen shows', swing(V.refocus(look, V.focusDepth(look, vp, 400, 300, across3))) < 1e-6 && swing(look) > 100, `${swing(look).toFixed(0)} px off about the old target`);
  const isoNear = { ...iso, scale: 200 }, Mi = V.add(isoNear.target, V.mul(V.basis(isoNear).w, 5));
  const turned = (c) => { const s = V.project({ ...c, azimuth: c.azimuth + 90 }, vp, Mi); return Math.hypot(s.x - 400, s.y - 300); };
  ok('T31 ... and so does a turn of the isometric view', turned(V.refocus(isoNear, V.focusDepth(isoNear, vp, 400, 300, [pt(Mi)]))) < 1e-6 && turned(isoNear) > 100, `${turned(isoNear).toFixed(0)} px off about the old target`);
  // a box 1.3 du a side, 5 du from the camera: the linear map misses the perspective of its corners
  const box3 = { parts: [S.box([0, 0, 0], [10, 10, 10], 'a')] }, Rbox = V.solidRadius(box3);
  const C5 = V.add(ahead2(look, 5), [0.8, -0.5, 0.3]);
  const plN = V.solidPlacement(look, vp, C5, W, size, Rbox);
  const corners = [];
  for (const cx of [-10, 10]) for (const cy of [-10, 10]) for (const cz of [-10, 10]) corners.push(V.project(look, vp, V.add(C5, V.mul([cx, cy, cz], plN.du))));
  const bx = (k, f) => f(...corners.map((c) => c[k])) - plN.c[k];
  const miss = (pl) => { const b = V.drawSolid(box3, pl).box; return Math.max(Math.abs(b.x0 - bx('x', Math.min)), Math.abs(b.x1 - bx('x', Math.max)), Math.abs(b.y0 - bx('y', Math.min)), Math.abs(b.y1 - bx('y', Math.max))); };
  ok('T31 near the camera a solid follows the true projection', !!plN.persp && miss(plN) < 1e-6 && miss({ ...plN, persp: null }) > 10, `${miss({ ...plN, persp: null }).toFixed(0)} px off through the linear map`);
  ok('T31 ... far away the linear map, which keeps the markup of a solid that only moves (D-29)', V.solidPlacement(look, vp, ahead2(look, 400), W, size, Rbox).persp === null);
  const fadeAt = (t) => V.solidPlacement(look, vp, ahead2(look, t), W, size, Rbox).fade, Rdu = (Rbox * 1.3) / V.PLAN_PX;
  ok('T31 a solid fades out as its nearest point comes within 2·NEAR du of the camera, before it reaches NEAR', fadeAt(Rdu + 2 * V.NEAR + 0.01) === 1 && near(fadeAt(Rdu + 1.5 * V.NEAR), 0.5, 1e-9) && near(fadeAt(Rdu + V.NEAR), 0, 1e-9));
  const sv = V.screenVec(look, vp, [3, -2, 1], [0.3, -0.5, 0.8]), s0 = V.project(look, vp, [3, -2, 1]), s1 = V.project(look, vp, V.add([3, -2, 1], V.mul([0.3, -0.5, 0.8], 1e-6)));
  ok('T31 screen vectors: the derivative of the projection', near(sv[0], (s1.x - s0.x) / 1e-6, 1e-3) && near(sv[1], (s1.y - s0.y) / 1e-6, 1e-3));
  // the outline of a tapered tube (render.js): straight lines that touch both round ends, and arcs drawn on those ends
  const rctx = vm.createContext({ console });
  rctx.window = { PumpIt };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/view3d/render.js'), 'utf8'), rctx, { filename: 'src/ui/view3d/render.js' });
  const outline = (a, b, ra, rb) => {
    const n = PumpIt.ui.render3d.capsule(a, b, ra, rb).match(/-?[\d.]+/g).map(Number);
    const P = (i) => ({ x: n[i], y: n[i + 1] });
    const p1 = P(0), p2 = P(2), p3 = P(9), p4 = P(11), large = [n[7], n[16]]; // M p1 L p2 A rb rb 0 large 0 p3 L p4 A …
    const dist = (c, u, v) => Math.abs((v.x - u.x) * (u.y - c.y) - (u.x - c.x) * (v.y - u.y)) / Math.hypot(v.x - u.x, v.y - u.y);
    const ang = (c, p) => Math.atan2(p.y - c.y, p.x - c.x);
    // span of the arc from u to v about c in the direction of a sweep flag of 0, and whether its middle faces away from o
    const arc = (c, u, v, o) => { const span = (((ang(c, u) - ang(c, v)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), m = ang(c, u) - span / 2; return { big: span > Math.PI, out: Math.cos(m) * (c.x - o.x) + Math.sin(m) * (c.y - o.y) > 0 }; };
    const atB = arc(b, p2, p3, a), atA = arc(a, p4, p1, b);
    return [dist(a, p1, p2) - ra, dist(b, p1, p2) - rb, dist(a, p3, p4) - ra, dist(b, p3, p4) - rb].every((e) => Math.abs(e) < 0.15)
      && atB.out && atA.out && atB.big === (large[0] === 1) && atA.big === (large[1] === 1);
  };
  ok('T31 a tapered tube: its sides touch both round ends, which show their outer arcs', outline({ x: 100, y: 100 }, { x: 400, y: 250 }, 60, 15) && outline({ x: 100, y: 100 }, { x: 400, y: 250 }, 15, 60) && outline({ x: 50, y: 300 }, { x: 60, y: 40 }, 30, 26));

  // T32 moving at a high zoom (D-32): the quick frames draw the tubes near the camera as the full drawing does, a tube
  // is tapered wherever a line would miss its outline, and a zoom that cannot go on changes nothing
  console.log('\nMoving at a high zoom (D-32)');
  const R = PumpIt.ui.render3d;
  ok('T32 a tube is tapered when a line as wide as the mean of its ends would be more than half a pixel off at an end',
    !R.tapered(10, 12) && R.tapered(10, 12.1) && !R.tapered(600, 601.9) && R.tapered(600, 680));
  // the frame of a pipe that runs from near the camera into the distance, with stand-ins for the application
  const pipe1 = { id: 1, up: 1, down: 2, geometry: { kind: 'circular', d: { value: 200, unit: 'mm' } } };
  const camF = { projection: 'persp', target: [0, 0, 0], azimuth: -90, elevation: 10, distance: 6, fov: 35 };
  const ui = {
    format: {}, solids3d: {}, edit3d: { preview: () => null },
    colorScales: { syncPicker() {}, offered: () => false, overlayValues: () => null },
    scene3d: { camera: () => camF, scene: () => ({ pos: new Map(), routes: new Map([[1, [[-1, -4, 0], [1, 30, 0]]]]) }) },
  };
  const appF = {
    model: { pipes: [pipe1], junctions: [], view3: { mode: '3d', level: 0, zScale: 1, free: {} } }, eff: () => ({ pipes: [pipe1], junctions: [] }),
    okResults: () => null, prefs: { overlay: 'none' }, outUnit: () => 'm', selSet: new Set(), undefSet: () => new Set(),
  };
  const fctx = vm.createContext({ console, document: { getElementById: () => null } });
  fctx.window = { PumpIt: { ...PumpIt, ui, app: appF } };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/ui/view3d/render.js'), 'utf8'), fctx, { filename: 'src/ui/view3d/render.js' });
  const tubeOf = (light) => ui.render3d.frameOf({ getBoundingClientRect: () => ({ width: 800, height: 600 }) }, light).items.find((it) => it.kind === 'seg').s;
  const qt = tubeOf(true), ft = tubeOf(false);
  ok('T32 a quick frame draws a tube near the camera tapered, with the ends of the full drawing',
    qt.taper && ft.taper && qt.wa === ft.wa && qt.wb === ft.wb && qt.wa > 5 * qt.wb, `${qt.wa.toFixed(0)} and ${qt.wb.toFixed(0)} px at its ends`);
  ok('T32 ... both draw two straight lines between round ends as wide as the tube there', R.taperedShapes(qt, { solid: true }).tube === R.capsule(qt.a, qt.b, qt.wa / 2, qt.wb / 2));
  // the dashes of a closed pipe (2.5 widths long), each [radius at its end, radius at its start], on a long tube: they
  // narrow along it like the tube
  const long = { a: { x: 0, y: 300 }, b: { x: 2000, y: 300 }, wa: 60, wb: 12, len: 2000, inA: false, inB: false };
  const dashes = R.taperedShapes(long, { solid: false }).tube.split('M').slice(1).map((d) => d.match(/A-?[\d.]+/g).map((a) => Number(a.slice(1))));
  const radii = dashes.flatMap(([end, start]) => [start, end]);
  ok('T32 ... and so do the dashes of a closed pipe, which narrow along it like the tube', dashes.length > 2 && radii.every((r, i) => !i || r <= radii[i - 1] + 0.05)
    && near(radii[0], long.wa / 2, 0.05) && radii[radii.length - 1] >= long.wb / 2 - 0.05, `${dashes.length} dashes`);
  const closest = { ...look, distance: V.closestOf(look, vp) }, zIn = V.zoomAt(closest, vp, 120, 80, 1.3);
  const isoMax = { ...iso, scale: V.MAX_SCALE }, oIn = V.zoomAt(isoMax, vp, 120, 80, 1.3);
  ok('T32 at the closest zoom a zoom in changes nothing, so nothing is drawn', zIn.distance === closest.distance && same3(zIn.target, closest.target)
    && oIn.scale === isoMax.scale && same3(oIn.target, isoMax.target));
}

console.log(`\n${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
