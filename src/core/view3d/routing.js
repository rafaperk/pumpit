// 3D views: pipe routes (3D views specification §8.7–8.9). A route is the polyline of a pipe in the 3D scene, from
// the position of its start junction to that of its end junction; its inner points are the bends (drawing only).
(function (root) {
  const PumpIt = root.PumpIt;
  const { sub, cross, len } = PumpIt.view3d;

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
    pointsEqual, axisOf, simplify, drawnLength, routeCandidatesTo,
    autoRoute, anchorBends, resolveBends, orthogonalize,
  });
})(typeof window !== 'undefined' ? window : globalThis);
