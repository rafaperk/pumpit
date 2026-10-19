// 3D views: editing in the isometric view (3D views specification §5.3 and §8.7–8.9, Phase 2). Placing junctions on
// the grid of the working plane, drawing pipes along the axes with route candidates, moving a junction along one axis
// (up and down changes its elevation) and moving a segment of the selected pipe with its handle.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, V = PumpIt.view3d;
  const app = PumpIt.app;
  const S3 = UI.scene3d, C3 = UI.commands3d, E3 = UI.edit3d;
  const { f1 } = E3;

  const AXIS_PX = 6; // a drag chooses its axis after 6 px, and chooses again when it comes back (§8.9)

  let draw = null;    // pipe being drawn: { startId, pts (fixed so far, from the start junction), prevAxis, cands, idx, key, toJ }
  let drag = null;    // { kind: 'move' | 'seg', ... }
  let at = null;      // last cursor position: { sx, sy, vp }
  let preview = null; // { pos, routes } while a drag goes on

  const step = () => E3.v3().step;

  // grid point of the working plane under the cursor (R-24)
  function planePoint(p) {
    const hit = V.rayPlaneZ(E3.rayOf(p), E3.levelZ());
    if (!hit) return null;
    const g = step();
    return [Math.round(hit[0] / g) * g, Math.round(hit[1] / g) * g, E3.levelZ()];
  }
  const lastAxis = (pts) => (pts.length > 1 ? V.axisOf(pts[pts.length - 2], pts[pts.length - 1]) : null);

  // ------------------------------------------------------------ drawing a pipe (R-25, R-26)
  function startPipe(id) {
    draw = { startId: id, pts: [S3.scene().pos.get(id)], prevAxis: null, cands: [], idx: 0, key: null, toJ: null };
  }
  // candidates from the last fixed point to the cursor, or to the junction under it; the same route stays chosen while
  // it is still a candidate (§8.7)
  function candidates() {
    if (!draw || !at) return;
    const sc = S3.scene(), p0 = draw.pts[draw.pts.length - 1];
    const j = E3.nearJunction(at, sc, draw.startId);
    draw.toJ = j;
    draw.cands = j !== null
      ? V.routeCandidatesTo(p0, sc.pos.get(j), draw.prevAxis).filter((c) => c.pts.length > 1).map((c) => ({ pts: c.pts, key: `J${j}:${c.key}` }))
      : V.routeCandidatesScreen(S3.camera(), at.vp, p0, at.sx, at.sy, step(), draw.prevAxis).map((c) => ({ pts: c.pts, key: c.key }));
    const i = draw.cands.findIndex((c) => c.key === draw.key);
    draw.idx = i >= 0 ? i : 0;
    draw.key = draw.cands.length ? draw.cands[draw.idx].key : null;
  }
  const current = () => (draw && draw.cands.length ? draw.cands[draw.idx] : null);

  // the point under the cursor becomes a bend and the same pipe goes on from it (Alt+click or D)
  function bend() {
    const c = current();
    if (!c || draw.toJ !== null) return;
    draw.pts = V.simplify([...draw.pts, ...c.pts.slice(1)]);
    draw.prevAxis = lastAxis(draw.pts);
    draw.key = null;
    candidates();
    E3.redraw('edit');
  }

  // ends the pipe at the junction under the cursor (or at one already on that point) or at a new node; as in the
  // schematic, the next pipe starts from there
  function finish() {
    const c = current();
    if (!c) return;
    const end = c.pts[c.pts.length - 1];
    let endId = draw.toJ !== null ? draw.toJ : S3.junctionAt(end, null);
    if (endId === draw.startId) return;
    if (endId === null) endId = C3.addJunctionAt('branch', end, { silent: true });
    const route = V.simplify([...draw.pts, ...c.pts.slice(1)]);
    C3.addPipeRoute(draw.startId, endId, route);
    startPipe(endId);
    draw.prevAxis = lastAxis(route);
    candidates();
    E3.redraw('edit');
  }

  // a junction of the palette on the working plane (R-24); Shift keeps the tool, as in the schematic
  function place(type, keep) {
    const p = at && planePoint(at);
    if (!p) return;
    C3.addJunctionAt(type, E3.freePoint(p, S3.scene()));
    if (!keep) UI.canvas.setTool('select');
  }

  // ------------------------------------------------------------ moving a junction or a segment (R-27, R-28)
  // the axis whose screen direction is closest to the drag (largest |cos|)
  function pickAxis(origin, axes, dx, dy) {
    let best = null, bestC = -1;
    for (const ax of axes) {
      const E = V.screenVec(S3.camera(), at.vp, origin, V.AX[ax]);
      const c = Math.abs(dx * E[0] + dy * E[1]) / ((Math.hypot(E[0], E[1]) || 1) * Math.hypot(dx, dy));
      if (c > bestC) { best = ax; bestC = c; }
    }
    return best;
  }
  // distance along an axis (du, on the grid) for a drag of (dx, dy) px
  function along(origin, ax, dx, dy) {
    const E = V.screenVec(S3.camera(), at.vp, origin, V.AX[ax]);
    const g = step();
    return Math.round((dx * E[0] + dy * E[1]) / (E[0] * E[0] + E[1] * E[1] || 1) / g) * g;
  }

  function moveDrag() {
    const dx = at.sx - drag.at0.sx, dy = at.sy - drag.at0.sy;
    if (Math.hypot(dx, dy) < AXIS_PX) { drag.axis = null; drag.P = null; preview = null; return; }
    if (!drag.axis) drag.axis = pickAxis(drag.p0, ['x', 'y', 'z'], dx, dy);
    const P = V.add(drag.p0, V.mul(V.AX[drag.axis], along(drag.p0, drag.axis, dx, dy)));
    // never onto another junction: the last valid point stays
    if (S3.junctionAt(P, drag.id) === null) drag.P = V.pointsEqual(P, drag.p0) ? null : P;
    preview = drag.P ? { pos: new Map([[drag.id, drag.P]]) } : null;
  }

  function segDrag() {
    const dx = at.sx - drag.at0.sx, dy = at.sy - drag.at0.sy;
    if (Math.hypot(dx, dy) < AXIS_PX) { drag.axis = null; drag.pts = null; preview = null; return; }
    if (!drag.axis) drag.axis = pickAxis(drag.mid, drag.axes, dx, dy);
    const t = along(drag.mid, drag.axis, dx, dy);
    drag.pts = t ? V.moveSegment(drag.pts0, drag.i, drag.axis, t) : null;
    preview = drag.pts ? { routes: new Map([[drag.pid, drag.pts]]) } : null;
  }

  // ------------------------------------------------------------ events (through src/ui/view3d/edit.js)
  function down(e, hit) {
    if (e.button !== 0) return false;
    at = E3.pointer(e);
    const tl = E3.tool();
    if (tl === 'pipe') {
      if (!draw) {
        let id = hit && hit.kind === 'junction' ? hit.id : null;
        if (id === null) {
          const p = planePoint(at);
          if (!p) return true;
          id = S3.junctionAt(p, null);
          if (id === null) id = C3.addJunctionAt('branch', p, { silent: true });
        }
        startPipe(id);
        candidates();
        E3.redraw('edit');
      } else if (e.altKey) bend();
      else finish();
      return true;
    }
    if (tl.startsWith('place:')) { place(tl.slice(6), e.shiftKey); return true; }
    const handle = e.target.closest && e.target.closest('[data-seg]');
    if (handle) {
      const pid = Number(handle.dataset.pipe), i = Number(handle.dataset.seg);
      const pts = S3.scene().routes.get(pid);
      const axis = pts && V.axisOf(pts[i], pts[i + 1]);
      if (axis) {
        drag = { kind: 'seg', pid, i, at0: at, pts0: pts, mid: V.mul(V.add(pts[i], pts[i + 1]), 0.5), axes: ['x', 'y', 'z'].filter((a) => a !== axis), axis: null, pts: null };
        return true;
      }
    }
    if (hit && hit.kind === 'junction' && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
      if (!(app.selSet.has('j:' + hit.id) && app.selSet.size > 1)) app.select(hit); else app.setPrimary(hit);
      drag = { kind: 'move', id: hit.id, at0: at, p0: S3.scene().pos.get(hit.id), axis: null, P: null };
      return true;
    }
    return false;
  }

  function move(e) {
    at = E3.pointer(e);
    if (drag) {
      if (drag.kind === 'move') moveDrag(); else segDrag();
      E3.redraw(true);
      return true;
    }
    if (draw) { candidates(); E3.redraw('edit'); }
    else if (E3.tool().startsWith('place:')) E3.redraw('edit');
    return false;
  }

  function up() {
    if (!drag) return false;
    const d = drag;
    drag = null;
    preview = null;
    if (d.kind === 'move' && d.P) C3.moveJunction(d.id, d.P);
    else if (d.kind === 'seg' && d.pts) C3.setRoute(d.pid, d.pts);
    else E3.redraw(false);
    return true;
  }

  // keys of the isometric view (§6.4): ← → choose the route (drawing, or for the selected pipe), D makes a bend
  function key(e) {
    const k = e.key;
    const arrow = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0;
    if (draw) {
      if (arrow && draw.cands.length) {
        draw.idx = (draw.idx + arrow + draw.cands.length) % draw.cands.length;
        draw.key = draw.cands[draw.idx].key;
        E3.redraw('edit');
        return true;
      }
      if (k.toLowerCase() === 'd') { bend(); return true; }
      return !!arrow;
    }
    if (arrow && !e.shiftKey && E3.selPipe() !== null) { C3.nextRoute(E3.selPipe(), arrow); return true; }
    return false;
  }

  // Esc: drops the drag or the pipe being drawn
  function cancel() {
    if (!drag && !draw) return false;
    reset();
    E3.redraw(false);
    return true;
  }
  function reset() { drag = null; draw = null; preview = null; }

  function dropAt(type, e) { at = E3.pointer(e); place(type, true); }

  // the screen moved under the cursor (zoom or pan with the keys): new candidates for the same cursor position
  function cameraMoved() { if (draw) candidates(); }

  // ------------------------------------------------------------ markup over the drawing
  // label of a route candidate: "+2 X · −1 Z · 3/6"
  function label(c) {
    const legs = c.pts.slice(1).map((q, i) => {
      const ax = V.axisOf(c.pts[i], q);
      return ax ? E3.offset(q['xyz'.indexOf(ax)] - c.pts[i]['xyz'.indexOf(ax)], ax) : '';
    }).filter(Boolean);
    return `${legs.join(' · ')} · ${draw.idx + 1}/${draw.cands.length}`;
  }

  function overlay({ cam, vp, sc, floorZ }) {
    const P = (p) => V.project(cam, vp, p);
    let o = '';
    // a handle in the middle of every segment along an axis of the selected pipe (R-28)
    const pid = E3.selPipe();
    const sel = pid !== null ? app.model.pipes.find((p) => p.id === pid) : null;
    if (E3.tool() === 'select' && !draw && sel && sel.snap3 !== false && sc.routes.has(sel.id)) {
      const pts = sc.routes.get(sel.id);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = V.axisOf(pts[i], pts[i + 1]) && P(pts[i]), b = a && P(pts[i + 1]);
        if (a && b && Math.hypot(b.x - a.x, b.y - a.y) >= 24) o += `<circle class="handle" data-pipe="${sel.id}" data-seg="${i}" cx="${f1((a.x + b.x) / 2)}" cy="${f1((a.y + b.y) / 2)}" r="5"/>`;
      }
    }
    // a junction being moved: its height down to the floor
    if (drag && drag.kind === 'move' && drag.P) o += E3.marker(cam, vp, drag.P, floorZ);
    // the pipe being drawn: dashed route, a marker at its end with a dashed line down to the floor, and the label
    if (draw) {
      const c = current();
      o += E3.polyline(cam, vp, c ? [...draw.pts, ...c.pts.slice(1)] : draw.pts, 'rubber3');
      if (c) o += E3.marker(cam, vp, c.pts[c.pts.length - 1], floorZ) + E3.tipBox(label(c), at);
    }
    // placing a junction: the grid point under the cursor
    if (!draw && E3.tool().startsWith('place:') && at) {
      const p = planePoint(at);
      if (p) o += E3.marker(cam, vp, E3.freePoint(p, sc), floorZ);
    }
    return o;
  }

  // hint of the current tool in the isometric view (§6.2)
  const hintKey = () => (E3.tool() === 'pipe' ? 'network.view3.hint.isoPipe' : E3.tool().startsWith('place:') ? 'network.view3.hint.isoPlace' : 'network.view3.hint.iso');

  PumpIt.ui.isoEdit3d = { down, move, up, key, cancel, reset, dropAt, cameraMoved, overlay, hintKey, preview: () => preview };
})(window);
