// 3D views: the geometry of the view cube (decision D-35 of docs/3D-VIEWS.md). The cube turns with the camera and
// names the sides of the scene: Top (+Z), Front (−Y, the bottom of the schematic) and Right (+X), as the named views
// of camera.js. Each of its 26 regions, a face, an edge or a corner, is a direction to look from, written as its key:
// the signs of X, Y and Z ('1,-1,1' is the corner at the front, the right and the top). Pure geometry, with no DOM:
// the widget is src/ui/view3d/cube.js.
(function (root) {
  const PumpIt = root.PumpIt;
  const V = PumpIt.view3d;
  const { DEG, add, mul, dot, norm, basis, clamp } = V;

  // the faces of the cube [−1, 1]³: the outward normal n, and the across (h) and up directions of the label, with
  // h × up = n, so that a label is never mirrored on a face turned to the camera
  const FACES = [
    { id: 'top', n: [0, 0, 1], h: [1, 0, 0], up: [0, 1, 0] },
    { id: 'bottom', n: [0, 0, -1], h: [1, 0, 0], up: [0, -1, 0] },
    { id: 'front', n: [0, -1, 0], h: [1, 0, 0], up: [0, 0, 1] },
    { id: 'back', n: [0, 1, 0], h: [-1, 0, 0], up: [0, 0, 1] },
    { id: 'right', n: [1, 0, 0], h: [0, 1, 0], up: [0, 0, 1] },
    { id: 'left', n: [-1, 0, 0], h: [0, -1, 0], up: [0, 0, 1] },
  ];
  const EDGE = 0.36; // width of the bands of the edges and the corners on a face, which is 2 wide
  const BANDS = [[-1, -1 + EDGE], [-1 + EDGE, 1 - EDGE], [1 - EDGE, 1]]; // across or up, for the signs −1, 0 and 1
  const FACE_ON = Math.cos(0.5 * DEG); // a face is seen straight on within half a degree
  // the light, from the top left in front, in the frame of the camera (right, up, towards the camera), as the solids
  const LIGHT = norm([-0.4, 0.7, 0.6]);

  const keyOf = (d) => d.map((v) => Math.round(v) || 0).join(',');
  const vecOf = (key) => key.split(',').map(Number);
  // the 26 regions: every direction whose coordinates are −1, 0 or 1, but the null one
  const DIRS = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) DIRS.push({ key: keyOf([x, y, z]), d: norm([x, y, z]) });
  const KEYS = DIRS.map((r) => r.key);

  // The cube as the camera sees it, orthographic, in cube units on the screen (x to the right, y down; the widget
  // scales and centres it). For each face: whether it shows; its shade, from 0.55 in the dark to 1 in full light; its
  // nine regions (the middle, the bands of its edges and its corners, each with the key it stands for and its corners
  // on the screen); its outline; and the matrix of its label, which maps the across direction of the face to x and
  // its up direction to −y, about the centre of the face.
  function cubeFaces(cam) {
    const { r, u, w } = basis(cam);
    const P = (p) => [dot(p, r), -dot(p, u)];
    const light = add(add(mul(r, LIGHT[0]), mul(u, LIGHT[1])), mul(w, LIGHT[2]));
    return FACES.map((f) => {
      const at = (a, b) => P(add(add(f.n, mul(f.h, a)), mul(f.up, b)));
      const regions = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const [a0, a1] = BANDS[i], [b0, b1] = BANDS[j];
          regions.push({ key: keyOf(add(add(f.n, mul(f.h, i - 1)), mul(f.up, j - 1))), pts: [at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)] });
        }
      }
      const [hx, hy] = P(f.h), [ux, uy] = P(f.up), [cx, cy] = P(f.n);
      return {
        id: f.id, key: keyOf(f.n), shows: dot(f.n, w) > 1e-6, shade: 0.55 + 0.45 * Math.max(0, dot(f.n, light)),
        regions, outline: [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)], label: [hx, hy, -ux, -uy, cx, cy],
      };
    });
  }

  const gap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  // The camera angles that look from a region (its key) towards the target: along the direction of the region, so a
  // corner gives the true isometric. Straight from above or below the azimuth is free: the plan keeps the way round
  // that the screen shows now (azimuth), to the nearest quarter turn, and that of the schematic in a tie.
  function cubeView(key, azimuth) {
    const d = norm(vecOf(key));
    if (Math.abs(d[0]) < 1e-9 && Math.abs(d[1]) < 1e-9) {
      const az = [-90, 0, 180, 90].reduce((best, a) => (gap(a, azimuth) < gap(best, azimuth) - 1e-9 ? a : best));
      return { azimuth: az, elevation: d[2] > 0 ? 90 : -90 };
    }
    return { azimuth: Math.atan2(d[1], d[0]) / DEG, elevation: Math.asin(clamp(d[2], -1, 1)) / DEG };
  }

  // the region whose direction is closest to the unit vector w
  function nearestKey(w) {
    let best = null, bestDot = -Infinity;
    for (const r of DIRS) { const c = dot(r.d, w); if (c > bestDot + 1e-9) { best = r.key; bestDot = c; } }
    return best;
  }

  // The face seen straight on, with the screen square to the axes (not the plan turned by a part of a quarter turn),
  // or null. With it, the four faces next to it, each with the direction of its side on the screen (x to the right,
  // y down): the arrows that turn the view to them.
  function cubeFaceOn(cam) {
    const { r, u, w } = basis(cam);
    const f = FACES.find((g) => dot(g.n, w) > FACE_ON);
    if (!f || Math.max(...r.map(Math.abs)) < FACE_ON) return null;
    const next = FACES.filter((g) => Math.abs(dot(g.n, f.n)) < 0.5).map((g) => ({ id: g.id, key: keyOf(g.n), dir: [dot(g.n, r), -dot(g.n, u)] }));
    return { id: f.id, key: keyOf(f.n), next };
  }

  // The view one step (45°) away from the camera, to the nearest region: across (dx 1: the camera goes round the scene
  // to the right, as the arrow at the right of a face) or up and down (dy 1: up, no farther than straight above).
  // Straight from above or below, a step across turns the plan by a quarter turn instead. Returns the angles.
  function cubeStep(cam, dx, dy) {
    if (dx && Math.abs(cam.elevation) > 90 - 1e-6) {
      const v = cubeView(keyOf([0, 0, Math.sign(cam.elevation)]), cam.azimuth);
      return { azimuth: v.azimuth + dx * 90, elevation: v.elevation };
    }
    const { w } = basis({ azimuth: cam.azimuth + dx * 45, elevation: clamp(cam.elevation + dy * 45, -90, 90) });
    return cubeView(nearestKey(w), cam.azimuth);
  }

  // the faces that a region touches, in the order of its name: top or bottom, front or back, right or left
  function cubeParts(key) {
    const [x, y, z] = vecOf(key);
    return [z > 0 ? 'top' : z < 0 ? 'bottom' : '', y < 0 ? 'front' : y > 0 ? 'back' : '', x > 0 ? 'right' : x < 0 ? 'left' : ''].filter(Boolean);
  }

  Object.assign(PumpIt.view3d, { CUBE_FACES: FACES, CUBE_KEYS: KEYS, cubeFaces, cubeView, cubeFaceOn, cubeStep, cubeParts });
})(typeof window !== 'undefined' ? window : globalThis);
