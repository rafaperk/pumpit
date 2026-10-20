// 3D view: the scene of the model, the camera and the view switch. A junction stands at its schematic position (the
// plan) and at the height of its elevation in the current scenario, so the schematic and the 3D view always show one
// geometry: moving a junction in one moves it in the other (decision D-20 of docs/3D-VIEWS.md). A pipe follows its
// junctions: an automatic route along the axes, a route kept relative to its ends (bends3) or a straight line
// (snap3 false).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, V = PumpIt.view3d, U = PumpIt.units, UI = PumpIt.ui;
  const app = PumpIt.app;

  const FIT_PAD = 64; // framing margin (px): a little more than the specification's 48, clear of the controls on top

  const mode = () => (app.model.view3 ? app.model.view3.mode : '2d');
  const active = () => mode() !== '2d';
  const zScale = () => (app.model.view3 ? app.model.view3.zScale : 1);
  function viewport() {
    const r = document.getElementById('canvas').getBoundingClientRect();
    return { w: r.width || 800, h: r.height || 600 };
  }

  // elevation in metres of an effective junction (0 while it is undefined)
  function elevationM(j) {
    try {
      const z = U.toSI(Number(j.elevation.value), j.elevation.unit, 'length');
      return Number.isFinite(z) ? z : 0;
    } catch (e) { return 0; }
  }

  // route of a pipe between the scene points a and b
  function routeFor(p, a, b) {
    const bends = p.bends3 ? V.resolveBends(p.bends3, a, b) : [];
    if (p.snap3 === false) return [a, ...bends, b];
    return bends.length ? V.orthogonalize([a, ...bends, b]) : V.autoRoute(a, b);
  }

  // positions and routes of the whole model; preview = { pos, routes } replaces some of them while a drag goes on
  function scene(preview) {
    const s = zScale();
    const effJ = new Map(app.eff().junctions.map((j) => [j.id, j]));
    const pos = new Map();
    for (const j of app.model.junctions) pos.set(j.id, V.toScene(j.x, j.y, elevationM(effJ.get(j.id) || j), s));
    if (preview && preview.pos) for (const [id, p] of preview.pos) pos.set(id, p);
    const routes = new Map();
    for (const p of app.model.pipes) {
      const a = pos.get(p.up), b = pos.get(p.down);
      if (!a || !b) continue;
      routes.set(p.id, (preview && preview.routes && preview.routes.get(p.id)) || routeFor(p, a, b));
    }
    return { pos, routes };
  }
  const points = (sc = scene()) => [...sc.pos.values()].concat(...[...sc.routes.values()]);

  // a junction already at the point p (other than exceptId)
  function junctionAt(p, exceptId, sc = scene()) {
    for (const [id, q] of sc.pos) if (id !== exceptId && V.pointsEqual(p, q, 1e-6)) return id;
    return null;
  }

  // point to centre the camera on: a junction, or the middle of the drawn route of a pipe
  function anchorOf(hit) {
    const sc = scene();
    if (hit.kind === 'junction') return sc.pos.get(hit.id) || null;
    const pts = sc.routes.get(hit.id);
    if (!pts) return null;
    const half = V.drawnLength(pts) / 2;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = V.len(V.sub(pts[i], pts[i - 1]));
      if (acc + d >= half) return V.add(pts[i - 1], V.mul(V.sub(pts[i], pts[i - 1]), d ? (half - acc) / d : 0));
      acc += d;
    }
    return pts[0];
  }

  // ------------------------------------------------------------ the camera (§8.2)
  const camera = () => ({ ...app.model.view3.free });
  let saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(app.save, 400); }
  // the camera: saved with the model, outside undo (R-61)
  function setCamera(c) {
    Object.assign(app.model.view3.free, { projection: c.projection, target: c.target, azimuth: c.azimuth, elevation: c.elevation, distance: c.distance, scale: c.scale });
    saveSoon();
  }
  // frames the camera on the whole scene, with both its distance and its orthographic scale
  function frameAll() {
    const pts = points(), vp = viewport(), v = app.model.view3;
    const cp = V.fit({ ...v.free, projection: 'persp' }, vp, pts, FIT_PAD);
    const co = V.fit({ ...v.free, projection: 'ortho' }, vp, pts, FIT_PAD);
    Object.assign(v.free, { target: v.free.projection === 'ortho' ? co.target : cp.target, distance: cp.distance, scale: co.scale });
  }

  // frames the camera again when the whole scene is out of sight (a camera saved for another scene)
  function ensureVisible() {
    if (!active() || !app.model.junctions.length) return;
    const vp = viewport(), cam = camera();
    const seen = points().some((p) => { const s = V.project(cam, vp, p); return s && s.x >= 0 && s.x <= vp.w && s.y >= 0 && s.y <= vp.h; });
    if (!seen) { frameAll(); saveSoon(); }
  }

  // view3 holds view settings only (the active view, the scales, the camera): undo and redo leave them as they are
  function carryView(prev, m) { if (prev) m.view3 = M.clone(prev); }

  // ------------------------------------------------------------ view switch (R-01)
  // The settings of the 3D view, created when they are first needed (the first entry into the view, or a choice of the
  // Options menu): a vertical scale that suits the model, a working level at the lowest elevation and the camera
  // framing the network. Settings are not undoable; switching views never moves anything.
  function ensure() {
    if (app.model.view3) return app.model.view3;
    const pts = app.eff().junctions.map((j) => ({ x: j.x, y: j.y, elev: elevationM(j) }));
    const v = M.newView3();
    v.zScale = V.autoZScale(pts);
    v.level = pts.length ? Math.min(...pts.map((p) => p.elev)) : 0;
    app.model.view3 = v;
    frameAll();
    saveSoon();
    return v;
  }
  // next: '2d' (the schematic) or '3d'
  function setMode(next) {
    if (next === mode()) return;
    if (next !== '2d') ensure();
    if (app.model.view3) {
      app.model.view3.mode = next;
      saveSoon();
    }
    ensureVisible();
    UI.canvas.setTool(UI.canvas.tool); // a tool the new view does not take falls back to selection
    app.renderAll();
  }

  PumpIt.ui.scene3d = {
    FIT_PAD, mode, active, viewport, zScale, elevationM, scene, routeFor, points, junctionAt, anchorOf,
    camera, setCamera, saveSoon, frameAll, ensureVisible, carryView, ensure, setMode,
  };
})(window);
