// 3D view: editing (3D views specification §5.4, §8.9, §8.10, Phase 3). Placing junctions on the working plane;
// drawing pipes in any direction (across, on the plane of the last point; Shift up and down; Ctrl along an axis;
// Alt+click or D for a bend); moving a junction across or, with Shift, up and down, which changes its elevation; the
// bends of the selected pipe: drag them, insert one with a double click, delete the marked one with Delete; and the
// ends of pipes, dragged onto another junction or away to stay loose (docs/pipe-ends.md). Grid snapping is optional
// (Snap, in the menu of the view).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui, V = PumpIt.view3d;
  const app = PumpIt.app;
  const F = UI.format;
  const { t } = PumpIt.i18n;
  const S3 = UI.scene3d, C3 = UI.commands3d, E3 = UI.edit3d;
  const { f1, round } = E3;

  const DRAG_PX = 5; // a press on a junction or a bend moves it after 5 px; less is a click

  let draw = null;    // pipe being drawn: { startId, pts (fixed so far, from the start junction), anchor, tail, toJ, cands, idx }
  let drag = null;    // { kind: 'move' | 'bend' | 'end', ... }
  let at = null;      // last cursor position: { sx, sy, vp }
  let mods = { shift: false, lock: false }; // Shift (vertical) and Ctrl (along an axis), from the last pointer or key event
  let preview = null; // { pos, routes } while a drag goes on
  let bendSel = null; // the marked bend of the selected pipe: { pid, i } (index in its route)

  const step = () => (app.model.view3.free.snap ? E3.v3().step : 0);
  const cam = () => S3.camera();
  const setMods = (e) => { mods = { shift: e.shiftKey, lock: e.ctrlKey || e.metaKey }; };

  // the point of the working plane under the cursor (R-44): the horizontal plane at the working level or, when the
  // camera looks at it edge on (Front, Side), the vertical plane through the target that faces the camera
  function planePoint() {
    const c = cam();
    const h = V.planeHit(E3.rayOf(at), [c.target[0], c.target[1], E3.levelZ()], c);
    return h && V.snapTo(h.p, step(), V.planeAxes(h.kind, c));
  }

  // ------------------------------------------------------------ drawing a pipe (R-45, §8.10)
  function startPipe(id) {
    draw = { startId: id, pts: [S3.scene().pos.get(id)], anchor: null, tail: [], toJ: null, cands: [], idx: 0 };
  }
  const lastPt = () => draw.pts[draw.pts.length - 1];

  // the points that the cursor adds after the last fixed point: up to the junction under the cursor (straight, or along
  // the axes in each order, chosen with ← →), or else the tip of §8.10
  function track() {
    if (!draw || !at) return;
    const sc = S3.scene(), last = lastPt();
    const j = E3.nearJunction(at, sc, draw.startId);
    if (j !== null) {
      if (draw.toJ !== j) {
        const p = sc.pos.get(j);
        const orders = V.axisOf(last, p) || V.pointsEqual(last, p) ? [] : V.routeCandidatesTo(last, p).map((c) => c.pts);
        draw.cands = [[last, p], ...orders];
        draw.idx = 0;
        draw.toJ = j;
      }
      draw.tail = draw.cands[draw.idx].slice(1);
      return;
    }
    draw.toJ = null; draw.cands = []; draw.idx = 0;
    const tip = V.drawTip(E3.rayOf(at), cam(), last, { anchor: draw.anchor, vertical: mods.shift, lock: mods.lock, g: step() });
    if (!tip) return; // the cursor ray misses the plane: the tip stays where it was
    draw.tail = tip.pts;
    if (!mods.shift) draw.anchor = tip.anchor;
  }

  // the tip becomes a bend and the same pipe goes on from it (Alt+click or D)
  function bend() {
    if (!draw || draw.toJ !== null || !draw.tail.length) return;
    draw.pts = V.dedupe([...draw.pts, ...draw.tail]);
    draw.anchor = null;
    track();
    E3.redraw('edit');
  }

  // ends the pipe at the junction under the cursor, at one already at the tip or at a new node there; as in the
  // schematic, the next pipe starts from its end
  function finish() {
    if (!draw.tail.length) return;
    const end = draw.tail[draw.tail.length - 1];
    let endId = draw.toJ !== null ? draw.toJ : S3.junctionAt(end, null);
    if (endId === draw.startId) return;
    if (endId === null) endId = C3.addJunctionAt('branch', end, { silent: true });
    C3.addPipeRoute(draw.startId, endId, V.simplify([...draw.pts, ...draw.tail]), { free: true });
    startPipe(endId);
    track();
    E3.redraw('edit');
  }

  // a junction of the palette on the working plane (R-44); Shift keeps the tool, as in the schematic
  function place(type, keep) {
    const p = at && planePoint();
    if (!p) return;
    C3.addJunctionAt(type, E3.freePoint(p, S3.scene()));
    if (!keep) UI.canvas.setTool('select');
  }

  // ------------------------------------------------------------ moving a junction or a bend (R-46, R-47)
  function dragUpdate() {
    if (!drag.moved) {
      if (Math.hypot(at.sx - drag.at0.sx, at.sy - drag.at0.sy) < DRAG_PX) return;
      drag.moved = true;
      if (drag.kind === 'move' && drag.toggle) app.select(drag.hit); // Shift+drag moves it; a Shift+click toggles it
    }
    // Shift pressed or released on the way: the drag goes on from where the point is, in the other direction
    if (mods.shift !== drag.vertical) {
      if (drag.P) drag.p0 = drag.P;
      drag.ray0 = E3.rayOf(at);
      drag.vertical = mods.shift;
    }
    const P = V.dragPoint(cam(), drag.ray0, E3.rayOf(at), drag.p0, { vertical: drag.vertical, g: step() });
    if (!P) return;
    if (drag.kind === 'move') {
      if (S3.junctionAt(P, drag.id) === null) drag.P = P; // never onto another junction: the last valid point stays
      preview = drag.P ? { pos: new Map([[drag.id, drag.P]]) } : null;
    } else if (drag.kind === 'end') {
      // the end goes to the junction near the cursor, or else follows the point; the junction of the other end of the
      // pipe refuses it
      const sc = S3.scene(), p = app.model.pipes.find((x) => x.id === drag.pid);
      const near = E3.nearJunction(at, sc, null);
      drag.P = P;
      drag.refused = near !== null && near === p[M.otherEnd(drag.end)] ? near : null;
      drag.target = drag.refused === null ? near : null;
      const tip = drag.target !== null ? sc.pos.get(drag.target) : P;
      const a = drag.end === 'up' ? tip : S3.endPoint(sc, p, 'up'), b = drag.end === 'down' ? tip : S3.endPoint(sc, p, 'down');
      preview = a && b ? { routes: new Map([[drag.pid, S3.routeFor(p, a, b)]]) } : null;
    } else {
      drag.P = P;
      preview = { routes: new Map([[drag.pid, drag.pts0.map((q, k) => (k === drag.i ? P : q))]]) };
    }
  }

  // a bend inserted under the cursor, on segment i of the selected pipe (double click, R-47)
  function insertBend(pid, i, e) {
    const pts = S3.scene().routes.get(pid);
    if (!pts || !(i >= 0 && i < pts.length - 1)) return;
    const P = V.closestOnSegment(pts[i], pts[i + 1], E3.rayOf(E3.pointer(e)));
    if (V.pointsEqual(P, pts[i], 1e-6) || V.pointsEqual(P, pts[i + 1], 1e-6)) return; // on a corner already
    bendSel = { pid, i: i + 1 };
    C3.setRoute(pid, [...pts.slice(0, i + 1), P, ...pts.slice(i + 1)], { free: true });
  }

  // the marked bend removed (Delete)
  function deleteBend() {
    const { pid, i } = bendSel;
    bendSel = null;
    const pts = S3.scene().routes.get(pid);
    if (pts && i > 0 && i < pts.length - 1) C3.setRoute(pid, pts.filter((_, k) => k !== i), { free: true });
    else E3.redraw('edit');
  }

  // ------------------------------------------------------------ events (through src/ui/view3d/edit.js)
  function down(e, hit) {
    if (e.button !== 0) return false;
    at = E3.pointer(e);
    setMods(e);
    const tl = E3.tool();
    if (tl === 'pipe') {
      if (!draw) {
        let id = hit && hit.kind === 'junction' ? hit.id : null;
        if (id === null) {
          const p = planePoint();
          if (!p) return true;
          id = S3.junctionAt(p, null);
          if (id === null) id = C3.addJunctionAt('branch', p, { silent: true });
        }
        startPipe(id);
        track();
        E3.redraw('edit');
      } else {
        track();
        if (e.altKey) bend(); else finish();
      }
      return true;
    }
    if (tl.startsWith('place:')) { place(tl.slice(6), e.shiftKey); return true; }
    // an end of a pipe: the ring of a loose end, or the handle of an end of the selected pipe; Shift moves it up and down
    const endEl = e.target.closest && e.target.closest('[data-end]');
    if (endEl && !(e.ctrlKey || e.metaKey)) {
      const pid = Number(endEl.dataset.p), end = endEl.dataset.end;
      const p = app.model.pipes.find((x) => x.id === pid);
      const p0 = p && S3.endPoint(S3.scene(), p, end);
      if (p0) {
        if (!(app.selSet.size === 1 && app.selSet.has('p:' + pid))) app.select({ kind: 'pipe', id: pid });
        drag = { kind: 'end', pid, end, at0: at, ray0: E3.rayOf(at), p0, vertical: mods.shift, P: null, target: null, refused: null, moved: false };
        return true;
      }
    }
    // a bend of the selected pipe: marked at once, moved by dragging
    const handle = e.target.closest && e.target.closest('[data-bend]');
    if (handle) {
      const pid = Number(handle.dataset.pipe), i = Number(handle.dataset.bend);
      const pts = S3.scene().routes.get(pid);
      if (pts && i > 0 && i < pts.length - 1) {
        bendSel = { pid, i };
        drag = { kind: 'bend', pid, i, pts0: pts, at0: at, ray0: E3.rayOf(at), p0: pts[i], vertical: mods.shift, P: null, moved: false };
        E3.redraw('edit');
        return true;
      }
    }
    // a junction: selected at once and moved by dragging; with Shift it goes up and down (a Shift+click still toggles it
    // in the selection, as everywhere)
    if (hit && hit.kind === 'junction' && !(e.ctrlKey || e.metaKey)) {
      if (!e.shiftKey) { if (!(app.selSet.has('j:' + hit.id) && app.selSet.size > 1)) app.select(hit); else app.setPrimary(hit); }
      drag = { kind: 'move', id: hit.id, hit, toggle: e.shiftKey, at0: at, ray0: E3.rayOf(at), p0: S3.scene().pos.get(hit.id), vertical: mods.shift, P: null, moved: false };
      return true;
    }
    return false;
  }

  function move(e) {
    at = E3.pointer(e);
    setMods(e);
    if (drag) {
      dragUpdate();
      if (drag.moved) E3.redraw(true);
      return true;
    }
    if (draw) { track(); E3.redraw('edit'); }
    else if (E3.tool().startsWith('place:')) E3.redraw('edit');
    return false;
  }

  function up() {
    if (!drag) return false;
    const d = drag;
    drag = null;
    preview = null;
    if (d.kind === 'end') { dropEnd(d); return true; }
    if (!d.moved) {
      if (d.kind === 'move' && d.toggle) app.select(d.hit, { toggle: true });
      else E3.redraw(false);
    } else if (d.kind === 'move' && d.P && !V.pointsEqual(d.P, S3.scene().pos.get(d.id))) C3.moveJunction(d.id, d.P);
    else if (d.kind === 'bend' && d.P && !V.pointsEqual(d.P, d.pts0[d.i])) C3.setRoute(d.pid, d.pts0.map((q, k) => (k === d.i ? d.P : q)), { free: true });
    else E3.redraw(false);
    return true;
  }

  // An end let go: on a junction it connects there; elsewhere it stays loose at the point of the drag, at that height. A
  // click without a drag only selects the pipe.
  function dropEnd(d) {
    const p = app.model.pipes.find((x) => x.id === d.pid);
    if (!d.moved || !p || (d.target === null && !d.P)) { E3.redraw(false); return; }
    if (d.refused !== null) { app.toast(t('app.edit.sameEnds')); E3.redraw(false); return; }
    if (d.target !== null) { if (!app.connectEnd(d.pid, d.end, d.target)) E3.redraw(false); return; }
    const { x, y, elev } = V.fromScene(d.P, S3.zScale());
    if (M.isLoose(p, d.end)) app.moveLooseEnd(d.pid, d.end, { x, y, z: elev });
    else app.disconnectEnd(d.pid, d.end, { x, y, z: elev });
    E3.redraw(false);
  }

  // keys of the 3D view (§6.4): D makes a bend while drawing; ← → choose the route to the junction under the
  // cursor (elsewhere they turn the camera); Delete removes the marked bend
  function key(e) {
    const k = e.key;
    if (draw) {
      if (k.toLowerCase() === 'd') { bend(); return true; }
      const arrow = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0;
      if (arrow && !e.shiftKey && draw.toJ !== null && draw.cands.length > 1) {
        draw.idx = (draw.idx + arrow + draw.cands.length) % draw.cands.length;
        draw.tail = draw.cands[draw.idx].slice(1);
        E3.redraw('edit');
        return true;
      }
      return false;
    }
    if ((k === 'Delete' || k === 'Backspace') && bendSel && E3.selPipe() === bendSel.pid) { deleteBend(); return true; }
    return false;
  }

  // Shift and Ctrl pressed or released without moving the pointer: the tip or the dragged point follow at once
  function modKey(e) {
    if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Meta') return;
    setMods(e);
    if (!app.model.view3 || S3.mode() !== '3d' || !at) return;
    if (draw) { track(); E3.redraw('edit'); }
    else if (drag && drag.moved) { dragUpdate(); E3.redraw(true); }
  }
  document.addEventListener('keydown', modKey);
  document.addEventListener('keyup', modKey);

  // a double click on a segment of the pipe that was already selected inserts a bend there; the drawing tools ignore
  // double clicks. False leaves it to the camera (centre on the object).
  function dblclick(hit, e) {
    if (E3.tool() !== 'select') return true;
    if (!hit || hit.kind !== 'pipe' || !E3.wasSelected(hit)) return false;
    const g = e.target.closest && e.target.closest('[data-i]');
    if (!g) return false;
    insertBend(hit.id, Number(g.dataset.i), e);
    return true;
  }

  // Esc: drops the drag or the pipe being drawn, then the marked bend
  function cancel() {
    if (drag || draw) { drag = null; draw = null; preview = null; E3.redraw(false); return true; }
    if (bendSel) { bendSel = null; E3.redraw('edit'); return true; }
    return false;
  }
  function reset() { drag = null; draw = null; preview = null; bendSel = null; }

  function dropAt(type, e) { at = E3.pointer(e); place(type, true); }

  // the camera moved (wheel, keys): the tip follows the cursor again, and a drag goes on from where its point is
  function cameraMoved() {
    if (!at) return;
    if (draw) track();
    if (drag && drag.moved) { if (drag.P) drag.p0 = drag.P; drag.ray0 = E3.rayOf(at); }
  }

  // ------------------------------------------------------------ markup over the drawing
  // label of the tip: its offset from the last fixed point, the route among those to a junction, and its elevation
  function label() {
    const last = lastPt(), tip = draw.tail[draw.tail.length - 1];
    const d = V.sub(tip, last);
    const parts = [0, 1, 2].filter((k) => Math.abs(d[k]) > 1e-9).map((k) => E3.offset(d[k], 'xyz'[k]));
    if (draw.cands.length > 1) parts.push(`${draw.idx + 1}/${draw.cands.length}`);
    parts.push(t('network.view3.tipElevation', { value: F.inputStr(round(tip[2] / E3.v3().zScale, 2)).replace('-', '−') }));
    return parts.join(' · ');
  }

  function overlay({ cam, vp, sc, floorZ }) {
    let o = '';
    const endDrag = drag && drag.kind === 'end' && drag.moved ? drag : null;
    // the loose ends (docs/pipe-ends.md): a ring at each, which takes the pointer to drag it onto a junction
    for (const [pid, ends] of sc.loose) {
      for (const end of M.PIPE_ENDS) {
        const s = ends[end] && !(endDrag && endDrag.pid === pid && endDrag.end === end) && V.project(cam, vp, ends[end]);
        if (s) o += `<circle class="loose3${app.selSet.has('p:' + pid) ? ' sel' : ''}" data-p="${pid}" data-end="${end}" cx="${f1(s.x)}" cy="${f1(s.y)}" r="6"><title>${F.esc(t('network.ends.looseTitle'))}</title></circle>`;
      }
    }
    // the bends of the selected pipe (R-47): a handle on each; the marked one is filled
    const pid = E3.selPipe();
    if (E3.tool() === 'select' && !draw && pid !== null && sc.routes.has(pid)) {
      const pts = sc.routes.get(pid);
      for (let i = 1; i < pts.length - 1; i++) {
        const s = V.project(cam, vp, pts[i]);
        const on = !!bendSel && bendSel.pid === pid && bendSel.i === i;
        if (s) o += `<circle class="handle bend${on ? ' on' : ''}" data-pipe="${pid}" data-bend="${i}" cx="${f1(s.x)}" cy="${f1(s.y)}" r="${on ? 6 : 5}"/>`;
      }
      // its ends on junctions: a handle just off the symbol, along the pipe, to drag that end elsewhere
      const p = app.model.pipes.find((x) => x.id === pid);
      for (const [end, i, k] of [['up', 0, 1], ['down', pts.length - 1, pts.length - 2]]) {
        if (!p || M.isLoose(p, end) || endDrag) continue;
        const a = V.project(cam, vp, pts[i]), b = V.project(cam, vp, pts[k]);
        const L = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
        if (L < 1) continue;
        const r = Math.min(UI.render3d.symbolRadius(a.k) + 7, L * 0.45) / L;
        o += `<circle class="handle end" data-p="${pid}" data-end="${end}" cx="${f1(a.x + (b.x - a.x) * r)}" cy="${f1(a.y + (b.y - a.y) * r)}" r="5"><title>${F.esc(t('network.ends.handleTitle'))}</title></circle>`;
      }
    }
    // an end being dragged: a ring around the junction it would connect to, or around the one that refuses it
    const ringed = endDrag ? (endDrag.target !== null ? endDrag.target : endDrag.refused) : null;
    if (ringed !== null) {
      const q = sc.pos.get(ringed), s = q && V.project(cam, vp, q);
      if (s) o += `<circle class="${endDrag.target !== null ? 'target3' : 'refused3'}" cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(UI.render3d.symbolRadius(s.k) + 5)}"/>`;
    }
    // a junction, a bend or a loose end being moved: its height down to the floor
    if (drag && drag.moved && drag.P && !(endDrag && endDrag.target !== null)) o += E3.marker(cam, vp, drag.P, floorZ);
    // the pipe being drawn: the dashed route, the tip with its height, and the label
    if (draw) {
      o += E3.polyline(cam, vp, [...draw.pts, ...draw.tail], 'rubber3');
      if (draw.tail.length && at) o += E3.marker(cam, vp, draw.tail[draw.tail.length - 1], floorZ) + E3.tipBox(label(), at);
    }
    // placing a junction: the point of the working plane under the cursor
    if (!draw && E3.tool().startsWith('place:') && at) {
      const p = planePoint();
      if (p) o += E3.marker(cam, vp, E3.freePoint(p, sc), floorZ);
    }
    return o;
  }

  PumpIt.ui.freeEdit3d = { down, move, up, key, cancel, reset, dropAt, dblclick, cameraMoved, overlay, preview: () => preview };
})(window);
