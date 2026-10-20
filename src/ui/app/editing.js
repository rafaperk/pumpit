// Model editing with undo and redo: field values (following the scenario inheritance rule), adding, deleting,
// reversing and retyping objects. Every edit pushes an undo snapshot and ends in app.changed().
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, D = PumpIt.data, U = PumpIt.units;
  const app = PumpIt.app;
  const { toast } = PumpIt.ui.dialogs;
  const { t } = PumpIt.i18n;

  // ------------------------------------------------------------ undo / redo
  app.pushUndo = () => {
    app.undoStack.push(JSON.stringify(app.model));
    if (app.undoStack.length > 80) app.undoStack.shift();
    app.redoStack = [];
  };
  // the active view and the cameras are view settings: undo and redo leave them as they are (3D views R-61)
  function restore(json) {
    const view = app.model.view3;
    app.model = JSON.parse(json);
    PumpIt.ui.scene3d.carryView(view, app.model);
    app.pruneSelection();
    app.changed();
  }
  app.undo = () => { if (!app.undoStack.length) return toast(t('app.edit.nothingToUndo')); app.redoStack.push(JSON.stringify(app.model)); restore(app.undoStack.pop()); };
  app.redo = () => { if (!app.redoStack.length) return toast(t('app.edit.nothingToRedo')); app.undoStack.push(JSON.stringify(app.model)); restore(app.redoStack.pop()); };

  // ------------------------------------------------------------ fields
  app.setVal = (key, path, value) => {
    app.pushUndo();
    const sid = app.model.scenarios.current;
    const before = key.startsWith('p:') && path.startsWith('material') ? M.getObj(M.effective(app.model, sid), key) : null;
    M.setField(app.model, sid, key, path, value);
    if (before) fitPipe(sid, key, path, before);
    app.changed();
  };
  // A pipe of a catalogue (src/core/data/pipe-library.js): its nominal size and series define the inner diameter. A new
  // material keeps the size when both catalogues mean the same sizes (carbon and stainless steel) and otherwise takes the
  // size whose bore is closest to the pipe's, with the roughness of the material; a series that the size lacks becomes
  // the nearest one (decision P-07 of docs/pipe-library.md).
  function fitPipe(sid, key, path, before) {
    const mat = M.getObj(M.effective(app.model, sid), key).material;
    if (!D.PIPE_KINDS.includes(mat.kind)) return;
    const newKind = path === 'material.kind' && before.material.kind !== mat.kind;
    const g = before.geometry;
    const refId = g.kind === 'circular' && g.d && Number.isFinite(g.d.value) ? U.toSI(g.d.value, g.d.unit, 'length') * 1000 : NaN;
    const fit = D.fitMaterial(mat, { refId, resize: newKind && !D.sameSizes(before.material.kind, mat.kind) });
    for (const f of ['nps', 'sch', 'grade']) if (fit[f] !== undefined && fit[f] !== mat[f]) M.setField(app.model, sid, key, 'material.' + f, fit[f]);
    M.setField(app.model, sid, key, 'geometry.kind', 'circular');
    M.setField(app.model, sid, key, 'geometry.d', { value: +D.pipeDims(fit).id.toFixed(2), unit: 'mm' });
    if (newKind) M.setField(app.model, sid, key, 'friction', { model: 'roughness', eps: { value: D.pipeEps(mat.kind), unit: 'mm' }, rel: 0.0001, f: 0.02, C: 120 });
  }
  // several fields of one object in a single step (one undo snapshot, one recalculation): [[path, value], ...]
  app.setVals = (key, pairs) => {
    app.pushUndo();
    const sid = app.model.scenarios.current;
    for (const [path, value] of pairs) M.setField(app.model, sid, key, path, value);
    app.changed();
  };
  app.clearOv = (key, path) => { app.pushUndo(); M.clearOverride(app.model, app.model.scenarios.current, key, path); app.changed(); };

  // ------------------------------------------------------------ objects
  app.addJunction = (type, x, y, opts = {}) => {
    app.pushUndo();
    const id = app.model.nextId.j++;
    const j = M.newJunction(type, id, x, y);
    if (opts.elevation) j.elevation = opts.elevation; // placed in a 3D view, at a height
    app.model.junctions.push(j);
    if (!opts.silent) { app.selSet = new Set(['j:' + id]); app.sel = { kind: 'junction', id }; }
    app.changed();
    return id;
  };

  // a new pipe copies its data from the reference pipe, as the user sees it in the current scenario: the selected
  // pipe, or else the last one created. The drawn length never counts (R-13 of the 3D views). opts.bends3 and
  // opts.snap3: its route when it was drawn in a 3D view.
  app.addPipe = (up, down, opts = {}) => {
    if (up === down) return null;
    app.pushUndo();
    const id = app.model.nextId.p++;
    const last = app.model.pipes[app.model.pipes.length - 1];
    const ref = (app.sel && app.sel.kind === 'pipe' && app.effObj('p:' + app.sel.id)) || (last && app.effObj('p:' + last.id));
    const p = Object.assign(M.newPipe(id, up, down), M.pipeDefaults(ref));
    if (opts.bends3) p.bends3 = opts.bends3;
    if (opts.snap3 === false) p.snap3 = false;
    app.model.pipes.push(p);
    app.selSet = new Set(['p:' + id]); app.sel = { kind: 'pipe', id };
    app.changed();
    return id;
  };

  // removes the per-pipe losses and the scenario overrides that refer to a deleted pipe
  function dropPipeRefs(pid) {
    for (const j of app.model.junctions) if (j.pipeK) delete j.pipeK[pid];
    for (const s of app.model.scenarios.list) {
      for (const k of Object.keys(s.overrides)) if (/\|pipeK\.(\d+)/.test(k) && Number(k.match(/\|pipeK\.(\d+)/)[1]) === pid) delete s.overrides[k];
    }
    M.removeObjectOverrides(app.model, 'p:' + pid);
  }

  app.deleteSelection = () => {
    if (!app.selSet.size) return;
    app.pushUndo();
    const jIds = new Set([...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2))));
    const pIds = new Set([...app.selSet].filter((k) => k[0] === 'p').map((k) => Number(k.slice(2))));
    for (const p of app.model.pipes) if (jIds.has(p.up) || jIds.has(p.down)) pIds.add(p.id);
    app.model.pipes = app.model.pipes.filter((p) => !pIds.has(p.id));
    pIds.forEach(dropPipeRefs);
    app.model.junctions = app.model.junctions.filter((j) => !jIds.has(j.id));
    jIds.forEach((id) => M.removeObjectOverrides(app.model, 'j:' + id));
    app.selSet.clear(); app.sel = null;
    app.changed();
  };

  app.reversePipe = (id) => {
    const p = app.model.pipes.find((x) => x.id === id);
    if (!p) return;
    app.pushUndo();
    [p.up, p.down] = [p.down, p.up];
    // the bends go from the start to the end of the pipe, and each follows the start (a) or the end (b)
    if (p.bends3) p.bends3 = p.bends3.reverse().map(({ ref, d }) => ({ ref: [...ref].map((c) => (c === 'a' ? 'b' : 'a')).join(''), d }));
    app.changed();
  };

  // changing the type keeps the compatible data
  app.changeType = (id, type) => {
    const old = app.model.junctions.find((j) => j.id === id);
    if (!old || old.type === type) return;
    app.pushUndo();
    const nj = M.newJunction(type, id, old.x, old.y);
    for (const k of ['name', 'elevation']) nj[k] = old[k];
    for (const k of M.LAYOUT_KEYS.junction) if (old[k] !== undefined) nj[k] = old[k]; // the drawing stays
    if (old.pipeK && nj.pipeK) nj.pipeK = old.pipeK;
    if (old.lossModel && nj.lossModel) for (const k of ['lossModel', 'K', 'Cv', 'Kv']) nj[k] = old[k];
    Object.keys(old).forEach((k) => delete old[k]);
    Object.assign(old, nj);
    for (const s of app.model.scenarios.list) {
      for (const k of Object.keys(s.overrides)) {
        const [ok, path] = k.split('|');
        if (ok === 'j:' + id && !/^(name|elevation)$/.test(path)) delete s.overrides[k];
      }
    }
    app.changed();
  };
})(window);
