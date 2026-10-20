// 3D views: the junction symbols as small solids (decision D-29 of docs/3D-VIEWS.md). Pure geometry, with no DOM,
// like the rest of the core. A symbol is a list of parts in a frame of its own: x along the flow, z up, in px at the
// size of the schematic symbols. Every part is cut into flat faces once; each drawing turns them into polygons on
// the screen, leaves out the faces turned away, gives every face a shade from a light tied to the camera and paints
// the parts from the farthest to the nearest. The junction views (src/ui/junctions/) describe their symbols with the
// constructors of PumpIt.view3d.solid.
(function (root) {
  const PumpIt = root.PumpIt;
  const { DEG, AX, add, sub, mul, dot, cross, len, norm, clamp, basis, focalPx, nearOf, NEAR, PLAN_PX } = PumpIt.view3d;

  // Symbols and tubes belong to the scene (D-30): they keep the proportions of the schematic, where one du takes
  // PLAN_PX px, so n px of the schematic take n · k / PLAN_PX px on the screen at the local scale k (px per du).
  // Zooming, or coming nearer in perspective, magnifies them like the rest of the network.
  const scenePx = (n, k) => (n * k) / PLAN_PX;

  // ------------------------------------------------------------ parts
  //   rev    solid of revolution from the point a to the point b, radius r0 at a and r1 at b (a cone when one is 0);
  //          flat ends unless cap0 / cap1 is false
  //   box    box with centre c and half sizes h along the axes of the symbol
  //   ball   sphere with centre c and radius r, drawn as a shaded disc
  //   tank   open vertical tank of radius r from z0 to z1 with its liquid at zl; mats = { shell, inside, liquid }
  //   plate  flat polygon pts with the normal n, seen from its front only (a mark painted on a part)
  //   text   a letter at c, always facing the screen, painted last
  // model = { parts, orient ('ports' | 'pipe': along the pipes, as the schematic symbols), reach (shapes standing
  // for the body where the pipes stop: rev, box or ball) }
  const rev = (a, b, r0, r1, mat, o = {}) => ({ kind: 'rev', a, b, r0, r1, mat, ...o });
  const cyl = (a, b, r, mat, o) => rev(a, b, r, r, mat, o);
  const box = (c, h, mat, o = {}) => ({ kind: 'box', c, h, mat, ...o });
  const ball = (c, r, mat, o = {}) => ({ kind: 'ball', c, r, mat, ...o });
  const tank = (r, z0, z1, zl, mats) => ({ kind: 'tank', r, z0, z1, zl, mats });
  const plate = (pts, n, mat) => ({ kind: 'plate', pts, n, mat });
  const text = (c, str) => ({ kind: 'text', c, str });

  // light in the camera frame (screen right, screen up, towards the viewer): from the top left, in front
  const LIGHT = norm([-0.45, 0.5, 0.74]);
  const LEVELS = 16; // shades of a face: 0 (darkest) … 15 (lightest)

  // number of sides of a round part: more for wider ones
  const sidesOf = (r) => clamp(2 * Math.round(3 + r / 1.5), 8, 24);

  // two unit vectors at right angles to each other and to the unit vector d
  function across(d) {
    const e1 = norm(cross(Math.abs(d[2]) < 0.9 ? AX.z : AX.x, d));
    return [e1, cross(d, e1)];
  }
  function ring(c, e1, e2, r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      pts.push(add(c, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))));
    }
    return pts;
  }

  // faces { pts, n, mat } of a solid of revolution
  function revFaces(p) {
    const h = len(sub(p.b, p.a)), d = norm(sub(p.b, p.a));
    const [e1, e2] = across(d);
    const n = p.sides || sidesOf(Math.max(p.r0, p.r1));
    const A = ring(p.a, e1, e2, p.r0, n), B = ring(p.b, e1, e2, p.r1, n);
    const tilt = (p.r0 - p.r1) / h; // the side of a cone leans towards its narrow end
    const faces = [];
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n, t = (2 * Math.PI * (i + 0.5)) / n;
      const radial = add(mul(e1, Math.cos(t)), mul(e2, Math.sin(t)));
      const pts = p.r0 > 0 && p.r1 > 0 ? [A[i], A[k], B[k], B[i]] : p.r0 > 0 ? [A[i], A[k], B[i]] : [A[i], B[k], B[i]];
      faces.push({ pts, n: norm(add(radial, mul(d, tilt))), mat: p.mat });
    }
    if (p.r0 > 0 && p.cap0 !== false) faces.push({ pts: A.slice().reverse(), n: mul(d, -1), mat: p.mat });
    if (p.r1 > 0 && p.cap1 !== false) faces.push({ pts: B, n: d, mat: p.mat });
    return faces;
  }

  function boxFaces(p) {
    const [cx, cy, cz] = p.c, [hx, hy, hz] = p.h;
    const v = (sx, sy, sz) => [cx + sx * hx, cy + sy * hy, cz + sz * hz];
    return [
      { pts: [v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)], n: [1, 0, 0] },
      { pts: [v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)], n: [-1, 0, 0] },
      { pts: [v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)], n: [0, 1, 0] },
      { pts: [v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)], n: [0, -1, 0] },
      { pts: [v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], n: [0, 0, 1] },
      { pts: [v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)], n: [0, 0, -1] },
    ].map((f) => ({ ...f, mat: p.mat }));
  }

  // an open tank, its faces in the order they are painted: the inside of the wall, the liquid, the outside of the
  // wall, the top of the wall and the bottom. Each group hides only what comes before it, from any side.
  function tankFaces(p) {
    const n = sidesOf(p.r), rIn = p.r - 0.9, { shell, inside, liquid } = p.mats;
    const ringAt = (r, z) => ring([0, 0, z], AX.x, AX.y, r, n);
    const O0 = ringAt(p.r, p.z0), O1 = ringAt(p.r, p.z1), I0 = ringAt(rIn, p.z0), I1 = ringAt(rIn, p.z1);
    const radial = (i) => { const t = (2 * Math.PI * (i + 0.5)) / n; return [Math.cos(t), Math.sin(t), 0]; };
    const inner = [], outer = [], top = [];
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      inner.push({ pts: [I0[i], I1[i], I1[k], I0[k]], n: mul(radial(i), -1), mat: inside });
      outer.push({ pts: [O0[i], O0[k], O1[k], O1[i]], n: radial(i), mat: shell });
      top.push({ pts: [O1[i], O1[k], I1[k], I1[i]], n: AX.z, mat: shell });
    }
    const level = { pts: ring([0, 0, p.zl], AX.x, AX.y, rIn, n), n: AX.z, mat: liquid };
    const bottom = { pts: O0.slice().reverse(), n: [0, 0, -1], mat: shell };
    return [...inner, level, ...outer, ...top, bottom];
  }

  const centroid = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);

  // the parts cut into faces, once per model: { kind, faces (each with its centre c), ctr, fixed (faces painted in
  // their order) }
  const cutCache = new WeakMap();
  function cut(model) {
    let parts = cutCache.get(model);
    if (parts) return parts;
    const centred = (faces) => faces.map((f) => ({ ...f, c: centroid(f.pts) }));
    parts = model.parts.map((p) => {
      if (p.kind === 'rev') return { kind: 'faces', faces: centred(revFaces(p)), ctr: mul(add(p.a, p.b), 0.5) };
      if (p.kind === 'box') return { kind: 'faces', faces: centred(boxFaces(p)), ctr: p.c };
      if (p.kind === 'tank') return { kind: 'faces', faces: centred(tankFaces(p)), ctr: [0, 0, (p.z0 + p.z1) / 2], fixed: true };
      if (p.kind === 'plate') return { kind: 'faces', faces: centred([{ pts: p.pts, n: norm(p.n), mat: p.mat }]), ctr: centroid(p.pts) };
      return { ...p, ctr: p.c };
    });
    cutCache.set(model, parts);
    return parts;
  }

  // distance (symbol px) from the centre of a symbol to its farthest point
  const radii = new WeakMap();
  function solidRadius(model) {
    if (!radii.has(model)) {
      let r = 0;
      for (const pt of cut(model)) {
        if (pt.kind === 'faces') for (const f of pt.faces) for (const q of f.pts) r = Math.max(r, len(q));
        else r = Math.max(r, len(pt.c) + (pt.r || 0));
      }
      radii.set(model, r);
    }
    return radii.get(model);
  }

  // ------------------------------------------------------------ orientation and place on the screen
  // Axes of a symbol (world unit vectors of its x, y and z): x along dir (the flow); z up, vertical for a horizontal
  // pipe and the horizontal −Y (towards the front of the plan) for a vertical one; roll turns z about x; y completes
  // a right-handed frame. Without a direction, the world axes. Unlike the schematic symbols (iconAxes), the camera
  // plays no part: a solid keeps its shape while the camera turns.
  function solidAxes(dir, roll = 0) {
    if (!dir || len(dir) < 1e-12) return { ex: AX.x, ey: AX.y, ez: AX.z };
    const ex = norm(dir);
    let ez = Math.abs(ex[2]) < 0.9 ? norm(sub(AX.z, mul(ex, ex[2]))) : norm(add([0, -1, 0], mul(ex, ex[1])));
    const ang = (((roll % 360) + 360) % 360) * DEG;
    ez = add(mul(ez, Math.cos(ang)), mul(cross(ex, ez), Math.sin(ang)));
    return { ex, ey: cross(ez, ex), ez };
  }

  // Where a symbol goes on the screen: c, the projection of the centre p (as project gives it); A, the linear map from
  // symbol px to screen px around c (the derivative of the projection at p, so that a small symbol meets the pipes
  // drawn through the true projection); view and light, unit vectors in the frame of the symbol (view points into
  // the scene); du, drawing units per symbol px; s, screen px per symbol px, which size(k) gives from the local scale
  // k. null behind the near plane.
  // In perspective the reach of the symbol, radius (symbol px, solidRadius), decides two more things (D-31): persp,
  // the camera seen from the symbol, set when the linear map would miss the perspective of the scene by more than
  // EXACT_PX, so that the symbol is drawn through the true projection; and fade, which dims the symbol as its nearest
  // point comes within 2·NEAR du of the camera, from 1 down to 0 (not drawn) at NEAR, before it reaches the near plane.
  const EXACT_PX = 0.25;
  function solidPlacement(cam, vp, p, axes, size = () => 1, radius = 0) {
    const { r, u, w } = basis(cam);
    const d = sub(p, cam.target);
    const xv = dot(d, r), yv = dot(d, u), zv = dot(d, w);
    let c, R0, R1, view, zc = 0, fo = 0;
    if (cam.projection === 'ortho') {
      c = { x: vp.w / 2 + cam.scale * xv, y: vp.h / 2 - cam.scale * yv, depth: -zv, k: cam.scale };
      R0 = r; R1 = mul(u, -1); view = mul(w, -1);
    } else {
      zc = cam.distance - zv;
      if (zc < nearOf(cam)) return null;
      fo = focalPx(cam, vp);
      const k = fo / zc;
      c = { x: vp.w / 2 + k * xv, y: vp.h / 2 - k * yv, depth: zc, k };
      R0 = add(r, mul(w, xv / zc)); R1 = mul(add(u, mul(w, yv / zc)), -1);
      view = norm(add(add(mul(r, xv), mul(u, yv)), mul(w, -zc)));
    }
    const s = size(c.k);
    const { ex, ey, ez } = axes;
    const A = [[dot(R0, ex) * s, dot(R0, ey) * s, dot(R0, ez) * s], [dot(R1, ex) * s, dot(R1, ey) * s, dot(R1, ez) * s]];
    const local = (v) => [dot(v, ex), dot(v, ey), dot(v, ez)];
    const light = add(add(mul(r, LIGHT[0]), mul(u, LIGHT[1])), mul(w, LIGHT[2]));
    const pl = { c, A, s, du: s / c.k, view: local(view), light: local(light), axes, fade: 1, persp: null };
    if (zc) {
      const R = radius * pl.du;
      pl.fade = clamp((zc - R - NEAR) / NEAR, 0, 1);
      // the stretch that the linear map misses at the reach R, at most
      if ((fo * R * R * (1 + Math.hypot(xv, yv) / zc)) / (zc * zc) > EXACT_PX) {
        const M = [ex, ey, ez].map((e) => [dot(e, r) * pl.du, dot(e, u) * pl.du, -dot(e, w) * pl.du]);
        pl.persp = { f: fo, xv, yv, zc, M, eye: local(sub(mul(w, cam.distance), d)).map((v) => v / pl.du) };
      }
    }
    return pl;
  }

  // ------------------------------------------------------------ drawing
  // convex hull of points [x, y] (monotone chain), anticlockwise on the screen
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && turn(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && turn(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    lo.pop(); hi.pop();
    return lo.concat(hi);
  }

  // shade of a face from its normal: a dim light everywhere, the rest from the light
  const shadeOf = (n, light) => clamp(Math.round((LEVELS - 1) * (0.38 + 0.62 * Math.max(0, dot(n, light)))), 0, LEVELS - 1);

  // The symbol on the screen, around the projected centre (0, 0), in units of per screen px: { parts, box } where
  // parts, from the farthest to the nearest, are { kind: 'faces', faces: [{ mat, shade, pts: [[x, y]…] }], hull,
  // fixed }, { kind: 'ball', mat, x, y, rx, ry } and { kind: 'text', str, x, y, size }, and box = { x0, y0, x1, y1 }
  // bounds them. Through the linear map A, or through the true projection when the placement has persp (D-31): then a
  // face shows when it faces the camera itself and the parts go by their distance from it.
  function drawSolid(model, pl, per = 1) {
    const { A, view, light, persp } = pl;
    let P, scaleAt, shows, far;
    if (persp) {
      const { f: fo, xv, yv, zc, M, eye } = persp;
      const off = (q) => [0, 1, 2].map((i) => q[0] * M[0][i] + q[1] * M[1][i] + q[2] * M[2][i]); // camera frame, du
      const x0 = (fo * xv) / zc, y0 = (fo * yv) / zc;
      P = (q) => { const [X, Y, Z] = off(q), z = zc + Z; return [((fo * (xv + X)) / z - x0) / per, (y0 - (fo * (yv + Y)) / z) / per]; };
      scaleAt = (q) => (pl.s * zc) / (zc + off(q)[2]) / per;
      shows = (fc) => { const v = sub(eye, fc.c); return dot(fc.n, v) > 1e-6 * len(v); };
      far = (pt) => len(sub(pt.ctr, eye));
    } else {
      P = (q) => [(A[0][0] * q[0] + A[0][1] * q[1] + A[0][2] * q[2]) / per, (A[1][0] * q[0] + A[1][1] * q[1] + A[1][2] * q[2]) / per];
      scaleAt = () => pl.s / per;
      shows = (fc) => dot(fc.n, view) < -1e-6;
      far = (pt) => dot(pt.ctr, view);
    }
    const parts = cut(model).map((pt, i) => ({ pt, i, d: far(pt) }));
    parts.sort((a, b) => (a.pt.kind === 'text') - (b.pt.kind === 'text') || b.d - a.d || a.i - b.i);
    const out = [];
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x, y) => { box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y); };
    for (const { pt } of parts) {
      if (pt.kind === 'faces') {
        const faces = [], all = [];
        for (const f of pt.faces) {
          if (!shows(f)) continue; // turned away, or seen edge on
          const pts = f.pts.map(P);
          faces.push({ mat: f.mat, shade: shadeOf(f.n, light), pts });
          for (const q of pts) { all.push(q); grow(q[0], q[1]); }
        }
        if (faces.length) out.push({ kind: 'faces', faces, hull: hull(all), fixed: !!pt.fixed });
      } else if (pt.kind === 'ball') {
        // always round, without the slight stretch of a ball far off the axis in perspective, so that a ball keeps
        // its shape while the camera moves
        const [x, y] = P(pt.c);
        const rx = pt.r * scaleAt(pt.c), ry = rx;
        out.push({ kind: 'ball', mat: pt.mat, x, y, rx, ry });
        grow(x - rx, y - ry); grow(x + rx, y + ry);
      } else if (pt.kind === 'text') {
        const [x, y] = P(pt.c);
        out.push({ kind: 'text', str: pt.str, x, y, size: (12 * pl.s) / per });
      }
    }
    if (!Number.isFinite(box.x0)) { box.x0 = box.y0 = (-8 * pl.s) / per; box.x1 = box.y1 = (8 * pl.s) / per; }
    return { parts: out, box };
  }

  // ------------------------------------------------------------ where the pipes stop
  // the range of t ≥ 0 over which the ray t·d (from the centre) lies inside a shape: [lo, hi], or null
  function inside(s, d) {
    let lo = 0, hi = Infinity;
    const slab = (o, v, a, b) => { // a ≤ o + t v ≤ b
      if (Math.abs(v) < 1e-12) return o >= a && o <= b;
      let t1 = (a - o) / v, t2 = (b - o) / v;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1); hi = Math.min(hi, t2);
      return lo <= hi;
    };
    if (s.kind === 'box') return [0, 1, 2].every((i) => slab(-s.c[i], d[i], -s.h[i], s.h[i])) ? [lo, hi] : null;
    if (s.kind === 'ball') {
      const b = dot(d, s.c), disc = b * b - (dot(s.c, s.c) - s.r * s.r);
      if (disc < 0) return null;
      lo = Math.max(lo, b - Math.sqrt(disc)); hi = b + Math.sqrt(disc);
      return lo <= hi ? [lo, hi] : null;
    }
    // rev, taken as a cylinder of its larger radius
    const ax = sub(s.b, s.a), h = len(ax), a = mul(ax, 1 / h), r = Math.max(s.r0, s.r1);
    const w0 = mul(s.a, -1);
    if (!slab(dot(w0, a), dot(d, a), 0, h)) return null;
    const m = sub(w0, mul(a, dot(w0, a))), e = sub(d, mul(a, dot(d, a)));
    const qa = dot(e, e), qb = 2 * dot(m, e), qc = dot(m, m) - r * r;
    if (qa < 1e-12) return qc <= 0 ? [lo, hi] : null;
    const disc = qb * qb - 4 * qa * qc;
    if (disc < 0) return null;
    lo = Math.max(lo, (-qb - Math.sqrt(disc)) / (2 * qa)); hi = Math.min(hi, (-qb + Math.sqrt(disc)) / (2 * qa));
    return lo <= hi ? [lo, hi] : null;
  }
  // distance (symbol px) from the centre of a symbol to the far side of its body along the unit vector d of its frame:
  // where a pipe leaving in that direction starts
  function solidReach(model, d) {
    let best = 0;
    for (const s of model.reach || []) {
      const span = inside(s, d);
      if (span && span[1] > best) best = span[1];
    }
    return best || 6;
  }

  Object.assign(PumpIt.view3d, {
    solid: { rev, cyl, box, ball, tank, plate, text },
    SOLID_LEVELS: LEVELS, scenePx, solidAxes, solidRadius, solidPlacement, drawSolid, solidReach, convexHull: hull,
  });
})(typeof window !== 'undefined' ? window : globalThis);
