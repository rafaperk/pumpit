// 3D views: pipe routes (3D views specification §8.7–8.9). A route is the polyline of a pipe in the 3D scene, from
// the position of its start junction to that of its end junction; its inner points are the bends (drawing only).
(function (root) {
  const PumpIt = root.PumpIt;
  const { AX, add, sub, mul, cross, len, project, screenVec } = PumpIt.view3d;

  const pointsEqual = (a, b, eps = 1e-9) => Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps;

  // axis ('x', 'y' or 'z') of the segment a–b, or null when it does not run along a single axis
  function axisOf(a, b, eps = 1e-9) {
    const d = sub(b, a);
    const nz = [0, 1, 2].filter((i) => Math.abs(d[i]) > eps);
    return nz.length === 1 ? 'xyz'[nz[0]] : null;
  }

  // removes repeated points and points in the middle of collinear segments
  function simplify(pts, eps = 1e-9) {
    const out = [];
    for (const p of pts) if (!out.length || !pointsEqual(p, out[out.length - 1], eps)) out.push(p);
    for (let i = out.length - 2; i >= 1; i--) {
      const a = sub(out[i], out[i - 1]);
      const b = sub(out[i + 1], out[i]);
      if (len(cross(a, b)) <= eps * Math.max(1, len(a) * len(b))) out.splice(i, 1);
    }
    return out;
  }
  const drawnLength = (pts) => pts.slice(1).reduce((s, p, i) => s + len(sub(p, pts[i])), 0);

  // Route candidates in the isometric view, from p0 to the screen point (sx, sy). For each pair of axes, solves
  // α·Ea + β·Eb = D on the screen (D: from p0 to the cursor; Ea, Eb: screen directions of the axes), rounds α and
  // β to the step and makes a route of up to two legs in each order. Each candidate: { legs: [{ axis, d }], pts,
  // key, cost }, from the most to the least likely: fewer legs, shorter, no vertical leg, first leg continuing
  // prevAxis, X before Y before Z.
  function routeCandidatesScreen(cam, vp, p0, sx, sy, step, prevAxis = null) {
    const s0 = project(cam, vp, p0);
    const D = [sx - s0.x, sy - s0.y];
    const E = { x: screenVec(cam, vp, p0, AX.x), y: screenVec(cam, vp, p0, AX.y), z: screenVec(cam, vp, p0, AX.z) };
    const out = [];
    const seen = new Set();
    for (const [a, b] of [['x', 'y'], ['x', 'z'], ['y', 'z']]) {
      const det = E[a][0] * E[b][1] - E[a][1] * E[b][0];
      if (Math.abs(det) < 1e-9) continue;
      const al = step * Math.round((D[0] * E[b][1] - D[1] * E[b][0]) / det / step);
      const be = step * Math.round((E[a][0] * D[1] - E[a][1] * D[0]) / det / step);
      for (const order of [[[a, al], [b, be]], [[b, be], [a, al]]]) {
        const legs = order.filter(([, d]) => Math.abs(d) > 1e-9).map(([axis, d]) => ({ axis, d }));
        const key = legs.map((l) => `${l.axis}${l.d}`).join('|');
        if (!legs.length || seen.has(key)) continue;
        seen.add(key);
        const pts = [p0];
        for (const l of legs) pts.push(add(pts[pts.length - 1], mul(AX[l.axis], l.d)));
        out.push({ legs, pts, key, cost: legs.reduce((s, l) => s + Math.abs(l.d), 0) });
      }
    }
    const rank = (c) => [c.legs.length, c.cost, c.legs.some((l) => l.axis === 'z') ? 1 : 0, c.legs[0].axis === prevAxis ? 0 : 1, 'xyz'.indexOf(c.legs[0].axis)];
    return out.sort((m, n) => { const A = rank(m); const B = rank(n); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0; });
  }

  // Orthogonal routes from p0 to p1 (known 3D points), one per order of the axes: first the one that continues
  // the previous leg, then the one that leaves the vertical leg last. Each candidate: { order, pts, key }.
  function routeCandidatesTo(p0, p1, prevAxis = null) {
    const d = sub(p1, p0);
    const axes = ['x', 'y', 'z'].filter((a, i) => Math.abs(d[i]) > 1e-9);
    const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((v, i) => perms(arr.filter((_, k) => k !== i)).map((p) => [v, ...p])));
    const out = perms(axes).map((order) => {
      const pts = [p0];
      for (const a of order) { const i = 'xyz'.indexOf(a); const n = [...pts[pts.length - 1]]; n[i] = p1[i]; pts.push(n); }
      return { order, pts, key: order.join('') };
    });
    const rank = (c) => [c.order[0] === prevAxis ? 0 : 1, c.order.includes('z') ? c.order.length - 1 - c.order.indexOf('z') : 0];
    return out.sort((m, n) => { const A = rank(m); const B = rank(n); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0; });
  }

  // moves segment i (pts[i] → pts[i + 1]) by t du along axis, inserting connecting segments where the neighbour is
  // not parallel to axis; a parallel neighbour stretches instead. The end points (junctions) never move.
  function moveSegment(pts, i, axis, t) {
    const m = mul(AX[axis], t);
    const out = pts.map((p) => [...p]);
    const a = add(pts[i], m);
    const b = add(pts[i + 1], m);
    if (i + 1 === pts.length - 1 || axisOf(pts[i + 1], pts[i + 2]) !== axis) out.splice(i + 1, 0, b);
    else out[i + 1] = b;
    if (i === 0 || axisOf(pts[i - 1], pts[i]) !== axis) out.splice(i + 1, 0, a);
    else out[i] = a;
    return simplify(out);
  }

  // automatic route from a to b: along the axes, X before Y, the vertical leg last
  function autoRoute(a, b) {
    const c = routeCandidatesTo(a, b)[0];
    return c && c.pts.length > 1 ? c.pts : [a, b];
  }

  // Bends kept relative to the ends of their pipe, so that a route follows its junctions wherever they move (in the
  // schematic, in a 3D view or in elevation). Each coordinate of a bend follows the start (a) or the end (b) of the
  // route, plus an offset in du; all the points of a run of equal coordinates follow the same end, so a route along
  // the axes stays along them. bends: [{ ref: 'aab', d: [dx, dy, dz] }], in route order, without the ends.
  function anchorBends(pts, eps = 1e-9) {
    const n = pts.length - 1, a = pts[0], b = pts[n];
    const out = pts.slice(1, -1).map(() => ({ ref: ['a', 'a', 'a'], d: [0, 0, 0] }));
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i <= n;) {
        let j = i;
        while (j < n && Math.abs(pts[j + 1][k] - pts[i][k]) <= eps) j++;
        const ref = i === 0 ? 'a' : j === n ? 'b' : i + j < n ? 'a' : 'b';
        for (let q = Math.max(i, 1); q <= Math.min(j, n - 1); q++) {
          out[q - 1].ref[k] = ref;
          out[q - 1].d[k] = pts[q][k] - (ref === 'a' ? a[k] : b[k]);
        }
        i = j + 1;
      }
    }
    return out.map((o) => ({ ref: o.ref.join(''), d: o.d }));
  }
  // the points of anchored bends for the ends a and b
  const resolveBends = (bends, a, b) => bends.map(({ ref, d }) => [0, 1, 2].map((k) => (ref[k] === 'a' ? a[k] : b[k]) + d[k]));

  // the route with every leg along one axis: a leg that changes several coordinates (because its ends moved) is split,
  // X first, then Y, the vertical last
  function orthogonalize(pts, eps = 1e-9) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = out[out.length - 1], q = pts[i];
      const axes = [0, 1, 2].filter((k) => Math.abs(q[k] - p[k]) > eps);
      let cur = p;
      for (const k of axes.slice(0, -1)) { cur = [...cur]; cur[k] = q[k]; out.push(cur); }
      out.push(q);
    }
    // a route that folds back onto itself (both ends at one point) can leave a repeated point after simplify
    const s = simplify(out, eps);
    return s.filter((p, i) => i === 0 || !pointsEqual(p, s[i - 1], eps));
  }

  Object.assign(PumpIt.view3d, {
    pointsEqual, axisOf, simplify, drawnLength, routeCandidatesScreen, routeCandidatesTo, moveSegment,
    autoRoute, anchorBends, resolveBends, orthogonalize,
  });
})(typeof window !== 'undefined' ? window : globalThis);
