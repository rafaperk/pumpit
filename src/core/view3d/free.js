// 3D views: geometry of editing in the free 3D view (3D views specification §8.9, §8.10, R-44 to R-47). Where the
// cursor puts a junction, a bend or the tip of a pipe being drawn, and what kind of route a pipe has. Pure functions,
// like the rest of the view3d core, tested in tests/view3d.test.cjs.
(function (root) {
  const PumpIt = root.PumpIt;
  const { add, sub, mul, dot, norm, basis, rayPlaneZ, closestOnVertical, axisOf, simplify, pointsEqual } = PumpIt.view3d;

  const EPS = 1e-9;
  // a camera that looks at the horizontal plane almost edge on (less than 10° above or below it, as in the Front and
  // Side views) works on the vertical plane facing it instead, so those views can still place, move and draw
  const GRAZING = Math.sin(10 * PumpIt.view3d.DEG);

  // p with the coordinates ks rounded to the step g (unchanged without a step)
  function snapTo(p, g, ks = [0, 1, 2]) {
    if (!(g > 0)) return p;
    return p.map((v, k) => (ks.includes(k) ? Math.round(Math.round(v / g) * g * 1e9) / 1e9 : v));
  }

  // p brought onto the line through p0 along the axis closest to the direction p − p0 (Ctrl)
  function lockAxis(p0, p) {
    const d = sub(p, p0);
    const k = [0, 1, 2].reduce((best, i) => (Math.abs(d[i]) > Math.abs(d[best]) ? i : best), 0);
    const q = [...p0];
    q[k] = p[k];
    return q;
  }

  // intersection of the ray with the vertical plane through p that faces the camera (null with the camera overhead)
  function facingPlaneHit(ray, p, cam) {
    const w = basis(cam).w;
    if (Math.hypot(w[0], w[1]) < EPS) return null;
    const n = norm([w[0], w[1], 0]);
    const den = dot(ray.d, n);
    if (Math.abs(den) < EPS) return null;
    const t = dot(sub(p, ray.o), n) / den;
    return t > 0 ? add(ray.o, mul(ray.d, t)) : null;
  }

  // the plane that the cursor works on: horizontal ('h'), or vertical and facing the camera ('f') when the camera looks
  // at the horizontal plane almost edge on
  const planeKind = (cam) => (Math.abs(basis(cam).w[2]) >= GRAZING ? 'h' : 'f');

  // the point under the cursor on the working plane through p0; a given kind keeps the plane of a drag that began
  function planeHit(ray, p0, cam, kind = planeKind(cam)) {
    const h = kind === 'h' ? rayPlaneZ(ray, p0[2]) : facingPlaneHit(ray, p0, cam);
    if (!h) return null;
    // exactly on the plane, free of rounding: at its height, or at its depth when it faces along X or Y
    if (kind === 'h') return { p: [h[0], h[1], p0[2]], kind };
    const w = basis(cam).w;
    return { p: h.map((v, k) => (k < 2 && Math.abs(w[k]) > 1 - 1e-9 ? p0[k] : v)), kind };
  }
  // the coordinates that snapping rounds on a plane, so that the point stays on it: X and Y on the horizontal plane;
  // on the vertical plane facing the camera, Z and the horizontal axis that lies in it (Front: X, Side: Y)
  function planeAxes(kind, cam) {
    if (kind === 'h') return [0, 1];
    const w = basis(cam).w;
    return [2, ...[0, 1].filter((k) => Math.abs(w[k]) < 1e-6)];
  }

  // The pipe being drawn (§8.10, R-45): the points that the cursor adds after the last fixed point `last`.
  // - Normal: the tip on the horizontal plane of the last point, X and Y on the step g; with lock (Ctrl) it comes
  //   onto the axis closest to its direction.
  // - vertical (Shift): the tip goes up or down the vertical line through the last horizontal tip (anchor), Z on the
  //   step; when the anchor is away from the last point the pipe turns there, so it runs across and then up (an L).
  // Returns { pts, anchor } (the anchor to keep for the next vertical move), or null when the ray misses the plane.
  function drawTip(ray, cam, last, { anchor = null, vertical = false, lock = false, g = 0 } = {}) {
    if (vertical) {
      const a = anchor || last;
      const z = closestOnVertical(ray, a[0], a[1]);
      if (z === null) return null;
      const tip = snapTo([a[0], a[1], z], g, [2]);
      const corner = [a[0], a[1], last[2]];
      const turns = !pointsEqual(corner, last, EPS) && !pointsEqual(corner, tip, EPS);
      return { pts: turns ? [corner, tip] : [tip], anchor: a };
    }
    const hit = planeHit(ray, last, cam);
    if (!hit) return null;
    let tip = snapTo(hit.p, g, planeAxes(hit.kind, cam));
    if (lock) tip = lockAxis(last, tip);
    return { pts: [tip], anchor: tip };
  }

  // A junction or a bend dragged from p0 (§8.9, R-46): it keeps its offset from the cursor on its horizontal plane
  // (or on the vertical plane facing the camera, when the horizontal one is seen edge on), or it goes up and down its
  // vertical line (Shift); then snapped to the step g. ray0 is the cursor ray when the drag began. Null when the
  // cursor misses the plane.
  function dragPoint(cam, ray0, ray, p0, { vertical = false, g = 0 } = {}) {
    if (vertical) {
      const z0 = closestOnVertical(ray0, p0[0], p0[1]);
      const z = closestOnVertical(ray, p0[0], p0[1]);
      if (z0 === null || z === null) return null;
      return snapTo([p0[0], p0[1], p0[2] + z - z0], g, [2]);
    }
    const h0 = planeHit(ray0, p0, cam);
    const h = h0 && planeHit(ray, p0, cam, h0.kind);
    if (!h) return null;
    return snapTo(add(p0, sub(h.p, h0.p)), g, planeAxes(h.kind, cam));
  }

  // the point of the segment a–b closest to the cursor ray: where a double click inserts a bend (R-47)
  function closestOnSegment(a, b, ray) {
    const u = sub(b, a);
    const w0 = sub(a, ray.o);
    const A = dot(u, u), B = dot(u, ray.d), C = dot(ray.d, ray.d), D = dot(u, w0), E = dot(ray.d, w0);
    const den = A * C - B * B;
    const s = A < EPS ? 0 : den < EPS * A * C ? 0.5 : Math.min(1, Math.max(0, (B * E - C * D) / den));
    return add(a, mul(u, s));
  }

  // the route without repeated consecutive points
  const dedupe = (pts) => pts.filter((p, i) => i === 0 || !pointsEqual(p, pts[i - 1], EPS));

  // 'axes' when every leg runs along one axis and every inner point is a corner (the route of a pipe on the grid);
  // 'free' otherwise: a leg in any direction, or a bend placed in the middle of a straight run (free 3D view)
  function routeKind(pts) {
    const r = dedupe(pts);
    const onAxes = r.slice(1).every((q, i) => axisOf(r[i], q));
    return onAxes && simplify(r).length === r.length ? 'axes' : 'free';
  }

  Object.assign(PumpIt.view3d, { GRAZING, snapTo, lockAxis, facingPlaneHit, planeKind, planeHit, planeAxes, drawTip, dragPoint, closestOnSegment, dedupe, routeKind });
})(typeof window !== 'undefined' ? window : globalThis);
