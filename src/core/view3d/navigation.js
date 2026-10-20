// 3D views: camera navigation (3D views specification §8.13). Every function returns a new camera.
(function (root) {
  const PumpIt = root.PumpIt;
  const V = PumpIt.view3d;
  const { DEG, add, sub, mul, dot, clamp, basis, focalPx, project, unproject, clipNear } = V;

  // Closest zoom (D-31): one du takes at most MAX_SCALE px in the orthographic projection; in perspective the camera
  // stays CLOSEST du away from its target, and farther when needed for the same limit, so that a symbol at the target
  // never fills the screen and is never much nearer to the camera at one side than at the other.
  const MAX_SCALE = 400, CLOSEST = 5;
  const closestOf = (cam, vp) => Math.max(CLOSEST, focalPx(cam, vp) / MAX_SCALE);
  // v moved to v1 within [lo, hi], but never the other way: a camera beyond a limit stays where it is
  const toward = (v, v1, lo, hi) => (v1 > v ? Math.max(v, Math.min(v1, hi)) : Math.min(v, Math.max(v1, lo)));

  // 0.4° per px; the elevation stays within ±89.9° (the isometric view turns in steps of 90° instead)
  function orbit(cam, dx, dy) {
    return { ...cam, azimuth: cam.azimuth - dx * 0.4, elevation: clamp(cam.elevation + dy * 0.4, -89.9, 89.9) };
  }

  // the content follows the drag
  function pan(cam, vp, dx, dy) {
    const { r, u } = basis(cam);
    const s = cam.projection === 'ortho' ? cam.scale : focalPx(cam, vp) / cam.distance;
    const q = cam.squash || 1;
    return { ...cam, target: add(cam.target, add(mul(r, -dx / s), mul(u, dy / (s * q)))) };
  }

  // zoom that keeps the point under the cursor still (on the plane of the target); the scale stays within
  // 2–MAX_SCALE px/du and the distance within closestOf–5000 du
  function zoomAt(cam, vp, sx, sy, factor) {
    const { r, u } = basis(cam);
    const a = sx - vp.w / 2;
    const b = -(sy - vp.h / 2) / (cam.squash || 1);
    if (cam.projection === 'ortho') {
      const s1 = toward(cam.scale, cam.scale * factor, 2, MAX_SCALE);
      const k = 1 / cam.scale - 1 / s1;
      return { ...cam, scale: s1, target: add(cam.target, add(mul(r, a * k), mul(u, b * k))) };
    }
    const d1 = toward(cam.distance, cam.distance / factor, closestOf(cam, vp), 5000);
    const k = (cam.distance - d1) / focalPx(cam, vp);
    return { ...cam, distance: d1, target: add(cam.target, add(mul(r, a * k), mul(u, b * k))) };
  }

  // The same view with the target moved along the line of sight to the depth D (as project gives it), so that the
  // camera turns about what lies there and, in perspective, zooms towards it (D-31). Only the free 3D grid, which
  // follows the target, changes on the screen.
  function refocus(cam, D) {
    const { w } = basis(cam);
    if (cam.projection === 'ortho') return { ...cam, target: sub(cam.target, mul(w, D)) };
    return { ...cam, target: add(cam.target, mul(w, cam.distance - D)), distance: D };
  }

  // Depth (as project gives it) of what the screen point (sx, sy) shows. pieces: [{ a, b, r }], the segments of the
  // scene (a = b for a point) with their radii in du. The nearest of those drawn within tol px of the point, so that a
  // zoom never runs through a pipe close to the cursor; or else the one drawn closest to it; null when nothing lies in
  // front of the camera.
  function focusDepth(cam, vp, sx, sy, pieces, tol = 24) {
    const ray = unproject(cam, vp, sx, sy);
    let front = Infinity, best = null, bestGap = Infinity;
    for (const pc of pieces) {
      const cl = clipNear(cam, pc.a, pc.b);
      const s = cl && project(cam, vp, V.closestOnSegment(cl[0], cl[1], ray)); // free.js, loaded after this file
      if (!s) continue;
      const gap = Math.max(0, Math.hypot(s.x - sx, s.y - sy) - pc.r * s.k);
      if (gap <= tol) front = Math.min(front, s.depth);
      if (gap < bestGap) { bestGap = gap; best = s.depth; }
    }
    return front < Infinity ? front : best;
  }

  // frames the points (positions of junctions and bends) with a margin of pad px: target and scale in the
  // orthographic projection, target and distance in perspective
  function fit(cam, vp, pts, pad = 48) {
    if (!pts.length) return { ...cam, target: [0, 0, 0] };
    const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])));
    const hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])));
    const c = lo.map((v, i) => (v + hi[i]) / 2);
    const { r, u } = basis(cam);
    if (cam.projection === 'ortho') {
      const xs = pts.map((p) => dot(sub(p, c), r));
      const ys = pts.map((p) => dot(sub(p, c), u));
      const q = cam.squash || 1;
      const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
      const target = add(c, add(mul(r, (xmin + xmax) / 2), mul(u, (ymin + ymax) / 2)));
      const scale = Math.min((vp.w - 2 * pad) / Math.max(xmax - xmin, 1), (vp.h - 2 * pad) / Math.max(q * (ymax - ymin), 1));
      return { ...cam, target, scale: clamp(scale, 2, MAX_SCALE) };
    }
    const R = Math.max(1, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
    const fovV = cam.fov * DEG;
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (vp.w / vp.h));
    return { ...cam, target: c, distance: clamp((R / Math.sin(Math.min(fovV, fovH) / 2)) * 1.05, closestOf(cam, vp), 5000) };
  }

  // the camera at the fraction t of the way from a to b, for the transitions of R-63: the azimuth turns the short way
  // round, the scale and the distance change by equal ratios, the angles and the target in a straight line. The rest
  // (projection, field of view, the squash of the 2:1 style) is b's: those changes are not animated.
  function lerpCamera(a, b, t) {
    if (t >= 1) return { ...b };
    const lin = (x, y) => x + (y - x) * t;
    const geo = (x, y) => (x > 0 && y > 0 ? x * (y / x) ** t : y);
    const turn = ((((b.azimuth - a.azimuth) % 360) + 540) % 360) - 180;
    return {
      ...b,
      azimuth: a.azimuth + turn * t,
      elevation: lin(a.elevation, b.elevation),
      target: [0, 1, 2].map((k) => lin(a.target[k], b.target[k])),
      scale: geo(a.scale, b.scale),
      distance: geo(a.distance, b.distance),
    };
  }

  Object.assign(PumpIt.view3d, { MAX_SCALE, CLOSEST, closestOf, orbit, pan, zoomAt, refocus, focusDepth, fit, lerpCamera });
})(typeof window !== 'undefined' ? window : globalThis);
