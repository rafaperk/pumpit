// 3D views: camera navigation (3D views specification §8.13). Every function returns a new camera.
(function (root) {
  const PumpIt = root.PumpIt;
  const { DEG, add, sub, mul, dot, clamp, basis, focalPx } = PumpIt.view3d;

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
  // 2–400 px/du and the distance within 0.5–5000 du
  function zoomAt(cam, vp, sx, sy, factor) {
    const { r, u } = basis(cam);
    const a = sx - vp.w / 2;
    const b = -(sy - vp.h / 2) / (cam.squash || 1);
    if (cam.projection === 'ortho') {
      const s1 = clamp(cam.scale * factor, 2, 400);
      const k = 1 / cam.scale - 1 / s1;
      return { ...cam, scale: s1, target: add(cam.target, add(mul(r, a * k), mul(u, b * k))) };
    }
    const d1 = clamp(cam.distance / factor, 0.5, 5000);
    const k = (cam.distance - d1) / focalPx(cam, vp);
    return { ...cam, distance: d1, target: add(cam.target, add(mul(r, a * k), mul(u, b * k))) };
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
      return { ...cam, target, scale: clamp(scale, 2, 400) };
    }
    const R = Math.max(1, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
    const fovV = cam.fov * DEG;
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (vp.w / vp.h));
    return { ...cam, target: c, distance: clamp((R / Math.sin(Math.min(fovV, fovH) / 2)) * 1.05, 0.5, 5000) };
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

  Object.assign(PumpIt.view3d, { orbit, pan, zoomAt, fit, lerpCamera });
})(typeof window !== 'undefined' ? window : globalThis);
