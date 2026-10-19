// 3D views: camera, projection and cursor rays (3D views specification §8.1–8.4). Pure geometry, with no DOM and
// no state, so it runs in the browser and in the Node tests like the rest of the core.
// World: right-handed, Z up, in drawing units (du), unrelated to the metres of the calculation.
// Screen: px, origin at the top left of the <svg>, y down; vp = { w, h } is the size of the <svg>.
// cam = { projection: 'ortho' | 'persp', target: [x, y, z], azimuth, elevation (degrees), scale (px/du, orthographic),
//         distance (du, perspective), fov (degrees, vertical, perspective), squash (2:1 isometric style only) }
(function (root) {
  const PumpIt = root.PumpIt;
  const DEG = Math.PI / 180;
  const ISO_ELEVATION = Math.atan(1 / Math.SQRT2) / DEG; // 35.264°: true isometric
  const SQUASH_2_1 = Math.sqrt(3) / 2; // vertical compression that turns the isometric into the 2:1 style
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => mul(a, 1 / (len(a) || 1));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // camera basis: w points from the target to the camera, r is the screen right and u the screen up (= w × r).
  // r depends on the azimuth only, so the basis stays valid with the camera straight overhead (elevation 90°).
  function basis(cam) {
    const t = cam.azimuth * DEG;
    const f = cam.elevation * DEG;
    const w = [Math.cos(f) * Math.cos(t), Math.cos(f) * Math.sin(t), Math.sin(f)];
    const r = [-Math.sin(t), Math.cos(t), 0];
    const u = [-Math.sin(f) * Math.cos(t), -Math.sin(f) * Math.sin(t), Math.cos(f)];
    return { r, u, w };
  }
  const focalPx = (cam, vp) => (vp.h / 2) / Math.tan((cam.fov * DEG) / 2);
  const nearOf = (cam) => cam.distance * 0.02;

  // screen position { x, y, depth, k } of the world point p, or null behind the near plane. depth grows away from
  // the camera; k is the local scale in px per du (it sizes the symbols in perspective).
  function project(cam, vp, p) {
    const { r, u, w } = basis(cam);
    const d = sub(p, cam.target);
    const xv = dot(d, r);
    const yv = dot(d, u);
    const zv = dot(d, w);
    const q = cam.squash || 1;
    if (cam.projection === 'ortho') return { x: vp.w / 2 + cam.scale * xv, y: vp.h / 2 - q * cam.scale * yv, depth: -zv, k: cam.scale };
    const zc = cam.distance - zv;
    if (zc < nearOf(cam)) return null;
    const f = focalPx(cam, vp);
    return { x: vp.w / 2 + (f * xv) / zc, y: vp.h / 2 - (f * yv) / zc, depth: zc, k: f / zc };
  }

  // ray under the cursor: { o, d }, with d a unit vector pointing into the scene
  function unproject(cam, vp, sx, sy) {
    const { r, u, w } = basis(cam);
    const a = sx - vp.w / 2;
    const b = -(sy - vp.h / 2) / (cam.squash || 1);
    if (cam.projection === 'ortho') {
      const o = add(add(add(cam.target, mul(r, a / cam.scale)), mul(u, b / cam.scale)), mul(w, 1e5));
      return { o, d: mul(w, -1) };
    }
    const f = focalPx(cam, vp);
    return { o: add(cam.target, mul(w, cam.distance)), d: norm(sub(add(mul(r, a / f), mul(u, b / f)), w)) };
  }

  // intersection of the ray with the horizontal plane Z = z (null when the ray is parallel to it or points away)
  function rayPlaneZ(ray, z) {
    if (Math.abs(ray.d[2]) < 1e-9) return null;
    const t = (z - ray.o[2]) / ray.d[2];
    return t > 0 ? add(ray.o, mul(ray.d, t)) : null;
  }

  // height Z of the point of the vertical line through (x, y) closest to the ray (null for a vertical ray)
  function closestOnVertical(ray, x, y) {
    const w0 = sub([x, y, 0], ray.o);
    const b = ray.d[2];
    const c = dot(ray.d, ray.d);
    const d = w0[2];
    const e = dot(ray.d, w0);
    const den = c - b * b;
    if (den < 1e-9) return null;
    return (b * e - c * d) / den;
  }

  // screen vector (px) of the world vector v applied at the point p
  function screenVec(cam, vp, p, v) {
    const eps = cam.projection === 'ortho' ? 1 : nearOf(cam);
    const a = project(cam, vp, p);
    const b = project(cam, vp, add(p, mul(v, eps)));
    if (!a || !b) return [0, 0];
    return [(b.x - a.x) / eps, (b.y - a.y) / eps];
  }

  // the segment a–b cut at the near plane (perspective only): [a', b'], or null when it lies wholly behind it
  function clipNear(cam, a, b) {
    if (cam.projection === 'ortho') return [a, b];
    const { w } = basis(cam);
    const near = nearOf(cam) * 1.001;
    const za = cam.distance - dot(sub(a, cam.target), w);
    const zb = cam.distance - dot(sub(b, cam.target), w);
    if (za < near && zb < near) return null;
    if (za >= near && zb >= near) return [a, b];
    const p = add(a, mul(sub(b, a), (near - za) / (zb - za)));
    return za < near ? [p, b] : [a, p];
  }

  // ready-made views: the angles only; the target and the scale (or distance) come from the current camera
  const PRESETS = {
    top: { azimuth: -90, elevation: 90 },
    front: { azimuth: -90, elevation: 0 },
    side: { azimuth: 0, elevation: 0 },
    iso: { azimuth: -45, elevation: ISO_ELEVATION },
  };
  // camera of the isometric view: azimuth in {-45, 45, 135, -135}; style 'true' or '2:1'
  function isoCamera(iso) {
    return { projection: 'ortho', target: iso.target, scale: iso.scale, azimuth: iso.azimuth, elevation: ISO_ELEVATION, squash: iso.style === '2:1' ? SQUASH_2_1 : 1 };
  }

  PumpIt.view3d = Object.assign(PumpIt.view3d || {}, {
    DEG, ISO_ELEVATION, SQUASH_2_1, AX, add, sub, mul, dot, cross, len, norm, clamp,
    basis, focalPx, nearOf, project, unproject, rayPlaneZ, closestOnVertical, screenVec, clipNear, PRESETS, isoCamera,
  });
})(typeof window !== 'undefined' ? window : globalThis);
