// 3D views: the commands that change the model from the 3D views. The plan position, the routes, grid snapping and the
// roll of a symbol are drawing-only edits: undoable, saved, and never recalculated (R-11, R-12). A change of height is
// a change of elevation, a calculation input, written through the scenario rule like a field of the inspector
// (decision D-20 of docs/3D-VIEWS.md).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, V = PumpIt.view3d, U = PumpIt.units, UI = PumpIt.ui;
  const app = PumpIt.app;
  const S3 = UI.scene3d;

  const findJ = (m, id) => m.junctions.find((j) => j.id === id);
  const findP = (m, id) => m.pipes.find((p) => p.id === id);
  const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

  // One undo step, saved and redrawn, without recalculating or clearing the results (R-12). An edit that changed any
  // calculation data is undone at once (R-11).
  function commitLayout(mutate) {
    const before = JSON.stringify(M.stripLayout(app.model));
    app.pushUndo();
    mutate(app.model);
    if (JSON.stringify(M.stripLayout(app.model)) !== before) {
      console.error('R-11: a drawing edit changed calculation data; undone.');
      app.model = JSON.parse(app.undoStack.pop());
      app.pruneSelection();
    } else app.save();
    app.layoutChanged();
    app.renderAll();
  }

  // elevation of the scene height z (du), in the unit that the junction already uses
  function elevationAt(id, z) {
    const e = app.effObj('j:' + id);
    const unit = (e && e.elevation && e.elevation.unit) || 'm';
    return { value: round(U.fromSI(z / S3.zScale(), unit, 'length'), 6), unit };
  }

  // a new junction at the scene point p: its plan position and its elevation; returns its id
  function addJunctionAt(type, p, opts = {}) {
    const { x, y, elev } = V.fromScene(p, S3.zScale());
    return app.addJunction(type, round(x, 2), round(y, 2), { ...opts, elevation: { value: round(elev, 6), unit: 'm' } });
  }

  const sameRoute = (r1, r2) => r1.length === r2.length && r1.every((p, i) => V.pointsEqual(p, r2[i], 1e-6));

  // inner points of a route: a coordinate within 0.001 du of one of the ends takes its value (a new junction is
  // rounded to the units of the schematic and of the elevation); the others are kept to 0.0001 du
  function tidy(pts) {
    const a = pts[0], b = pts[pts.length - 1];
    const fit = (v, k) => (Math.abs(v - a[k]) <= 1e-3 ? a[k] : Math.abs(v - b[k]) <= 1e-3 ? b[k] : round(v, 4));
    return pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : p.map(fit)));
  }

  // Drawing fields of a route through the scene points pts, from the start to the end junction of a pipe. A route along
  // the axes is kept relative to its ends, and not stored at all when it is the automatic one (D-21). With free, a
  // route of the free 3D view may go in any direction: it keeps its bends as they are, even in the middle of a straight
  // run, and leaves the grid (snap3 false) unless it is along the axes.
  function routeFields(pts, free) {
    const route = V.dedupe(tidy(pts));
    if (!free || V.routeKind(route) === 'axes') {
      const s = V.simplify(route);
      return sameRoute(s, V.autoRoute(s[0], s[s.length - 1])) ? {} : { bends3: V.anchorBends(s) };
    }
    return route.length > 2 ? { bends3: V.anchorBends(route), snap3: false } : { snap3: false };
  }

  // a new pipe along pts (scene points from its start to its end junction)
  function addPipeRoute(up, down, pts, { free = false } = {}) {
    const sc = S3.scene();
    return app.addPipe(up, down, routeFields([sc.pos.get(up), ...pts.slice(1, -1), sc.pos.get(down)], free));
  }

  // moves a junction to the scene point p: the plan position is drawing data, the height is its elevation
  function moveJunction(id, p) {
    const now = S3.scene().pos.get(id);
    const { x, y } = V.fromScene(p, S3.zScale());
    if (Math.abs(p[2] - now[2]) < 1e-9) {
      commitLayout((m) => { const j = findJ(m, id); j.x = round(x, 2); j.y = round(y, 2); });
      return;
    }
    app.pushUndo();
    const j = findJ(app.model, id);
    j.x = round(x, 2); j.y = round(y, 2);
    M.setField(app.model, app.model.scenarios.current, 'j:' + id, 'elevation', elevationAt(id, p[2]));
    app.changed();
  }

  // the route of a pipe through the scene points pts (from its start to its end); free: edited in the free 3D view
  function setRoute(pid, pts, { free = false } = {}) {
    commitLayout((m) => {
      const p = findP(m, pid);
      delete p.bends3;
      delete p.snap3;
      Object.assign(p, routeFields(pts, free));
    });
  }

  // a straight pipe between its ends: "Remove bends" (R-47); along one axis it is back on the grid
  function removeBends(pid) {
    const pts = S3.scene().routes.get(pid);
    if (pts) setRoute(pid, [pts[0], pts[pts.length - 1]], { free: true });
  }

  // the order of the axes of a route along them ('xzy'), or '' for one with jogs or off the axes
  function axesKey(pts) {
    const legs = pts.slice(1).map((q, i) => V.axisOf(pts[i], q));
    return legs.every(Boolean) ? legs.filter((a, i) => a !== legs[i - 1]).join('') : '';
  }

  // next (dir 1) or previous (dir −1) order of the axes for a pipe: "next route" (§8.8)
  function nextRoute(pid, dir) {
    const pts = S3.scene().routes.get(pid);
    if (!pts) return;
    const cands = V.routeCandidatesTo(pts[0], pts[pts.length - 1]);
    if (cands.length < 2) return;
    const i = cands.findIndex((c) => c.key === axesKey(pts));
    setRoute(pid, cands[i < 0 ? 0 : (i + dir + cands.length) % cands.length].pts);
  }

  // grid snapping of a pipe (R-23): off, it is a straight line between its ends
  function setSnap(pid, on) {
    commitLayout((m) => { const p = findP(m, pid); delete p.bends3; if (on) delete p.snap3; else p.snap3 = false; });
  }

  // fit to the grid (R-30): the automatic route along the axes, for the given pipes or for all of them
  function fitToGrid(pids) {
    commitLayout((m) => { for (const p of m.pipes) if (!pids || pids.includes(p.id)) { delete p.bends3; delete p.snap3; } });
  }

  // roll of a symbol about its flow axis, in steps of 90° (R-29); null = automatic
  function roll(id, deg) {
    commitLayout((m) => { const j = findJ(m, id); if (deg === null) delete j.icon3; else j.icon3 = { roll: ((deg % 360) + 360) % 360 }; });
  }

  // settings of the 3D views (grid, working level, vertical scale): saved, outside undo
  function setView(patch) {
    Object.assign(app.model.view3, patch);
    S3.saveSoon();
    app.renderAll();
  }

  PumpIt.ui.commands3d = { commitLayout, addJunctionAt, addPipeRoute, moveJunction, setRoute, removeBends, axesKey, nextRoute, setSnap, fitToGrid, roll, setView };
})(window);
