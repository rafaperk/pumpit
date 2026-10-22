// Drawing area: the only place where the topology changes. SVG drawing with pan, zoom, grid, snapping,
// multiple selection (Ctrl/Shift+click, Shift+drag on empty space), group dragging and the ends of pipes, dragged
// onto another junction or away from it (docs/pipe-ends.md). The SVG markup itself is produced by drawing.js. In the
// 3D view (src/ui/view3d/) the same SVG element hands its events and its drawing over to that block. The tools explain themselves in their tooltips and in the help: no text is written
// over the drawing (decision D-37 of docs/3D-VIEWS.md).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui, app = PumpIt.app;
  const { $ } = UI.dom;
  const { t } = PumpIt.i18n;

  const GRID = 20;
  const in3d = () => !!UI.scene3d && UI.scene3d.active();

  let svg, wrap;
  const view = { tx: 40, ty: 40, s: 1 };
  // interaction state, also read by the drawing
  const state = {
    tool: 'select',   // 'select' | 'pipe' | 'place:<type>'
    pending: null,    // start junction while drawing a pipe
    drag: null,       // { kind: 'move' | 'pan' | 'box' | 'end', ... }
    mouseW: null,     // last mouse position in world coordinates
  };
  let autoFit = true; // refits on resize until the user pans or zooms
  let area = null;    // the drawing area at the last resize: { w, h, panel } (panel: the properties panel is open)
  const REVEAL = 80;  // px between an object brought into sight and the panel: room for its name and the panel's arrow

  function init(svgEl, wrapEl) {
    svg = svgEl; wrap = wrapEl;
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('contextmenu', onContext);
    svg.addEventListener('dblclick', (e) => { if (in3d()) UI.nav3d.dblclick(hitTarget(e), e); });
    wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drop-ok'); });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-ok'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault(); wrap.classList.remove('drop-ok');
      const type = e.dataTransfer.getData('text/plain');
      if (!PumpIt.junctionTypes.get(type)) return;
      if (in3d()) { UI.edit3d.dropAt(type, e); return; }
      const w = toWorld(e.clientX, e.clientY);
      app.addJunction(type, snap(w.x), snap(w.y));
    });
    new ResizeObserver(resized).observe(wrap);
    bindTools();
  }

  // The drawing area changed size. When only the properties panel opened or closed (it follows the selection), the
  // drawing stays where it was on the screen instead of being framed again: the schematic keeps its left edge, and the
  // 3D camera follows the middle of the area. Any other change frames the schematic again, until the user pans or zooms.
  function resized() {
    const r = wrap.getBoundingClientRect(), panel = !$('#view-net').classList.contains('insp-off');
    const was = area;
    area = { w: r.width, h: r.height, panel };
    if (was && was.panel !== panel && was.w && r.width && was.h === r.height) {
      if (in3d()) UI.nav3d.keepPlace(was.w, r.width);
      reveal(was.w, r.width);
      return;
    }
    if (in3d() || !autoFit) render(); else fitSchematic();
  }

  // The selected object, when the panel that just opened covers it and it was in sight before, comes back into sight:
  // the drawing moves left as little as it can (the 3D camera glides there). The point is a junction, or the middle of
  // a pipe.
  function reveal(w0, w1) {
    const hit = w1 < w0 && app.selSet.size === 1 && app.sel;
    const x = hit ? (in3d() ? UI.nav3d.screenX(hit) : schematicX(hit)) : null;
    const d = x !== null && x > w1 - REVEAL && x <= w0 ? x - (w1 - REVEAL) : 0;
    if (!in3d()) view.tx -= d;
    else if (d) { UI.nav3d.reveal(hit, d); return; }
    render();
  }
  // where an object is across the schematic on the screen (px), or null
  function schematicX(hit) {
    const m = app.model;
    const at = (p, end) => (M.isLoose(p, end) ? p.loose && p.loose[end] : m.junctions.find((j) => j.id === p[end]));
    if (hit.kind === 'junction') {
      const j = m.junctions.find((q) => q.id === hit.id);
      return j ? view.tx + j.x * view.s : null;
    }
    const p = m.pipes.find((q) => q.id === hit.id), a = p && at(p, 'up'), b = p && at(p, 'down');
    return a && b ? view.tx + ((a.x + b.x) / 2) * view.s : null;
  }

  // floating tools over the drawing: results overlay and zoom
  function bindTools() {
    $('#overlay-select').value = app.prefs.overlay;
    $('#overlay-select').addEventListener('change', (e) => {
      app.prefs.overlay = e.target.value; app.savePrefs(); render();
      if (e.target.value !== 'none' && !app.okResults()) app.toast(t('network.overlayNeedsResults'));
    });
    $('#zoom-in').addEventListener('click', () => zoomBy(1.25));
    $('#zoom-out').addEventListener('click', () => zoomBy(0.8));
    $('#zoom-fit').addEventListener('click', () => fit());
  }

  // ---------- coordinates ----------
  function toWorld(cx, cy) {
    const r = svg.getBoundingClientRect();
    return { x: (cx - r.left - view.tx) / view.s, y: (cy - r.top - view.ty) / view.s };
  }
  const snap = (v) => (app.prefs.grid ? Math.round(v / GRID) * GRID : Math.round(v));
  const keyOf = (hit) => (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;

  function setTool(tool) {
    if (UI.edit3d) UI.edit3d.reset();
    state.tool = tool;
    state.pending = null;
    document.querySelectorAll('.palette .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    svg.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    render();
  }

  // ---------- events ----------
  function hitTarget(e) {
    const j = e.target.closest('[data-j]');
    if (j) return { kind: 'junction', id: Number(j.dataset.j) };
    const p = e.target.closest('[data-p]');
    if (p) return { kind: 'pipe', id: Number(p.dataset.p) };
    return null;
  }

  function onDown(e) {
    if (in3d()) { UI.nav3d.down(e, hitTarget(e)); return; }
    if (e.button === 2) return;
    svg.focus({ preventScroll: true });
    const hit = hitTarget(e);
    const w = toWorld(e.clientX, e.clientY);
    app.hideMenus();

    if (e.button === 1 || (state.tool === 'select' && !hit)) {
      if (e.button === 0 && e.shiftKey) {
        state.drag = { kind: 'box', x0: w.x, y0: w.y, x1: w.x, y1: w.y };
      } else {
        state.drag = { kind: 'pan', x0: e.clientX, y0: e.clientY, tx: view.tx, ty: view.ty, moved: false, clickEmpty: !hit && e.button === 0 };
      }
      svg.setPointerCapture(e.pointerId);
      return;
    }

    if (state.tool === 'select') {
      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      // an end of a pipe (the handle of the selected pipe, or a loose end): dragged onto a junction, or away to stay loose
      const endEl = !additive && hit.kind === 'pipe' && e.target.closest('[data-end]');
      if (endEl) {
        if (!(app.selSet.size === 1 && app.selSet.has(keyOf(hit)))) app.select(hit);
        state.drag = { kind: 'end', pid: hit.id, end: endEl.dataset.end, x0: e.clientX, y0: e.clientY, at: w, target: null, refused: null, moved: false };
        svg.setPointerCapture(e.pointerId);
        return;
      }
      if (additive) { app.select(hit, { toggle: true }); return; }
      // clicking an object that is already selected keeps the group (to drag them all)
      if (!(app.selSet.has(keyOf(hit)) && app.selSet.size > 1)) app.select(hit);
      else app.setPrimary(hit);
      if (hit.kind === 'junction') {
        const ids = [...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2)));
        if (!ids.includes(hit.id)) ids.push(hit.id);
        const start = {};
        for (const id of ids) { const j = app.model.junctions.find((x) => x.id === id); if (j) start[id] = { x: j.x, y: j.y }; }
        // the loose ends of the selected pipes go with the group
        const loose = [];
        for (const p of app.model.pipes) if (p.loose && app.selSet.has('p:' + p.id)) for (const s of Object.values(p.loose)) loose.push({ s, x: s.x, y: s.y });
        state.drag = { kind: 'move', id: hit.id, ids, start, loose, w0: w, moved: false };
        svg.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (state.tool === 'pipe') {
      if (hit && hit.kind === 'junction') {
        if (state.pending === null) { state.pending = hit.id; render(); return; }
        if (state.pending !== hit.id) app.addPipe(state.pending, hit.id);
        state.pending = hit.id;
        render();
        return;
      }
      if (!hit) {
        const id = app.addJunction('branch', snap(w.x), snap(w.y), { silent: true });
        if (state.pending !== null) app.addPipe(state.pending, id);
        state.pending = id;
        render();
      }
      return;
    }

    if (state.tool.startsWith('place:')) {
      app.addJunction(state.tool.slice(6), snap(w.x), snap(w.y));
      if (!e.shiftKey) setTool('select');
    }
  }

  function onMove(e) {
    if (in3d()) { UI.nav3d.move(e); return; }
    state.mouseW = toWorld(e.clientX, e.clientY);
    const drag = state.drag, mouseW = state.mouseW;
    if (!drag) { if (state.tool === 'pipe' && state.pending !== null) render(); return; }
    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view.tx = drag.tx + dx; view.ty = drag.ty + dy;
      if (drag.moved) autoFit = false;
      render();
    } else if (drag.kind === 'box') {
      drag.x1 = mouseW.x; drag.y1 = mouseW.y;
      render();
    } else if (drag.kind === 'move') {
      const s0 = drag.start[drag.id];
      const dx = snap(s0.x + mouseW.x - drag.w0.x) - s0.x, dy = snap(s0.y + mouseW.y - drag.w0.y) - s0.y;
      const j0 = app.model.junctions.find((x) => x.id === drag.id);
      if (j0.x === s0.x + dx && j0.y === s0.y + dy) return;
      if (!drag.moved) { app.pushUndo(); drag.moved = true; }
      for (const id of drag.ids) {
        const j = app.model.junctions.find((x) => x.id === id);
        if (j) { j.x = drag.start[id].x + dx; j.y = drag.start[id].y + dy; }
      }
      for (const l of drag.loose) { l.s.x = l.x + dx; l.s.y = l.y + dy; }
      render();
    } else if (drag.kind === 'end') {
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 3) return;
      drag.moved = true;
      // the junction under the cursor takes the end; the junction of the other end of the pipe refuses it
      const j = junctionNear(mouseW);
      const p = app.model.pipes.find((x) => x.id === drag.pid);
      drag.refused = j !== null && p && j === p[M.otherEnd(drag.end)] ? j : null;
      drag.target = drag.refused === null ? j : null;
      drag.at = { x: snap(mouseW.x), y: snap(mouseW.y) };
      render();
    }
  }

  // the junction under the point w: within the disc of its symbol, and never less than 12 px on the screen
  function junctionNear(w) {
    let best = null, bestD = Math.max(UI.drawing.R + 4, 12 / view.s);
    for (const j of app.model.junctions) {
      const d = Math.hypot(j.x - w.x, j.y - w.y);
      if (d <= bestD) { best = j.id; bestD = d; }
    }
    return best;
  }

  // the end of a pipe let go: on a junction it connects there (never on the junction of the other end); elsewhere it
  // stays loose at the grid point, at the height it had (that of the junction it leaves)
  function dropEnd(d) {
    const p = app.model.pipes.find((x) => x.id === d.pid);
    if (!p) return;
    if (d.refused !== null) { app.toast(t('app.edit.sameEnds')); return; }
    if (d.target !== null) { app.connectEnd(d.pid, d.end, d.target); return; }
    if (M.isLoose(p, d.end)) { app.moveLooseEnd(d.pid, d.end, { ...d.at, z: p.loose[d.end].z }); return; }
    const j = M.junctionOf(app.model, p, d.end);
    app.disconnectEnd(d.pid, d.end, { ...d.at, z: UI.scene3d.elevationM(app.effObj('j:' + j.id) || j) });
  }

  function onUp(e) {
    if (in3d()) { UI.nav3d.up(e); return; }
    const drag = state.drag;
    if (!drag) return;
    if (drag.kind === 'pan' && !drag.moved && drag.clickEmpty) app.select(null);
    if (drag.kind === 'move' && drag.moved) { app.save(); app.layoutChanged(); }
    if (drag.kind === 'end') {
      state.drag = null;
      if (drag.moved) dropEnd(drag);
      render();
      return;
    }
    if (drag.kind === 'box') {
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      const inBox = (pt) => !!pt && pt.x >= x0 && pt.x <= x1 && pt.y >= y0 && pt.y <= y1;
      const inside = new Set(app.model.junctions.filter(inBox).map((j) => j.id));
      // a pipe with both ends inside: its junctions, or the spots of its loose ends
      const endIn = (p, end) => (M.isLoose(p, end) ? inBox(p.loose && p.loose[end]) : inside.has(p[end]));
      const keys = [...inside].map((id) => 'j:' + id).concat(app.model.pipes.filter((p) => endIn(p, 'up') && endIn(p, 'down')).map((p) => 'p:' + p.id));
      state.drag = null;
      app.selectKeys(keys);
      return;
    }
    state.drag = null;
  }

  function onWheel(e) {
    e.preventDefault();
    if (in3d()) { UI.nav3d.wheel(e); return; }
    const f = Math.exp(-e.deltaY * 0.0015);
    zoomAt(e.clientX, e.clientY, f);
  }
  function zoomAt(cx, cy, f) {
    const r = svg.getBoundingClientRect();
    const sx = cx - r.left, sy = cy - r.top;
    const s2 = Math.min(4, Math.max(0.15, view.s * f));
    autoFit = false;
    view.tx = sx - (sx - view.tx) * (s2 / view.s);
    view.ty = sy - (sy - view.ty) * (s2 / view.s);
    view.s = s2;
    render();
  }
  function zoomBy(f) {
    if (in3d()) { UI.nav3d.zoomBy(f); return; }
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  }

  // fits the drawing of the active view
  function fit() { if (in3d()) UI.nav3d.fit(); else fitSchematic(); }

  function fitSchematic() {
    const js = app.model.junctions;
    const r = svg.getBoundingClientRect();
    autoFit = true;
    if (!js.length || !r.width) { view.tx = 40; view.ty = 40; view.s = 1; render(); return; }
    const xs = js.map((j) => j.x), ys = js.map((j) => j.y);
    const x0 = Math.min(...xs) - 70, x1 = Math.max(...xs) + 70, y0 = Math.min(...ys) - 70, y1 = Math.max(...ys) + 80;
    const s = Math.min(1.6, Math.max(0.2, Math.min(r.width / (x1 - x0), r.height / (y1 - y0))));
    view.s = s;
    view.tx = (r.width - (x1 - x0) * s) / 2 - x0 * s;
    view.ty = (r.height - (y1 - y0) * s) / 2 - y0 * s;
    render();
  }

  // right click: the object's data card and actions
  function onContext(e) {
    e.preventDefault();
    if (in3d() && UI.nav3d.consumedContext()) return; // the right button moved the 3D view
    const hit = hitTarget(e);
    if (!hit) return;
    if (!app.selSet.has(keyOf(hit))) app.select(hit);
    app.showInfo(hit, e.clientX, e.clientY);
  }

  // Esc: drops the end being dragged or the pipe being drawn, then the current tool
  function cancel() {
    if (in3d() && UI.edit3d.cancel()) return true;
    if (state.drag && state.drag.kind === 'end') { state.drag = null; render(); return true; }
    if (state.pending !== null) { state.pending = null; render(); return true; }
    if (state.tool !== 'select') { setTool('select'); return true; }
    return false;
  }

  // opts.light: a quick 3D frame while the camera moves
  function render(opts) {
    if (!svg) return;
    if (UI.hud3d) UI.hud3d.sync();
    if (UI.cube3d) UI.cube3d.sync();
    if (in3d()) {
      if (!(opts && opts.light)) UI.nav3d.drawn();
      UI.render3d.render(svg, opts);
    }
    else UI.drawing.render(svg, view, state);
  }

  PumpIt.ui.canvas = { init, render, fit, fitSchematic, zoomBy, setTool, cancel, get tool() { return state.tool; }, view, GRID };
})(typeof window !== 'undefined' ? window : globalThis);
