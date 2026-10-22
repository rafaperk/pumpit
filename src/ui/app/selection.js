// Selection: the primary object (the one shown in the inspector) and the set of selected keys.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const app = PumpIt.app;

  const keyOf = (hit) => (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;
  const hitOf = (key) => ({ kind: key[0] === 'p' ? 'pipe' : 'junction', id: Number(key.slice(2)) });
  // the properties panel follows the selection, and opens again at a click on the object already selected
  function selectionChanged() { UI.inspector.follow(); UI.canvas.render(); UI.inspector.render(); }

  app.select = (hit, opts = {}) => {
    if (!hit) { app.selSet.clear(); app.sel = null; }
    else if (opts.toggle) {
      const k = keyOf(hit);
      if (app.selSet.has(k)) { app.selSet.delete(k); app.sel = app.selSet.size ? hitOf([...app.selSet].pop()) : null; }
      else { app.selSet.add(k); app.sel = hit; }
    } else { app.selSet = new Set([keyOf(hit)]); app.sel = hit; }
    selectionChanged();
  };
  app.setPrimary = (hit) => { app.sel = hit; UI.inspector.follow(); UI.inspector.render(); };
  app.selectKeys = (keys) => {
    app.selSet = new Set(keys);
    app.sel = keys.length ? hitOf(keys.find((k) => k[0] === 'j') || keys[0]) : null;
    selectionChanged();
  };
  app.selectAll = () => app.selectKeys(app.model.junctions.map((j) => 'j:' + j.id).concat(app.model.pipes.map((p) => 'p:' + p.id)));

  // drops selected keys whose objects no longer exist (after undo, redo or a load)
  app.pruneSelection = () => {
    for (const k of [...app.selSet]) if (!M.getObj(app.model, k)) app.selSet.delete(k);
    if (app.sel && !app.selSet.has(keyOf(app.sel))) app.sel = app.selSet.size ? hitOf([...app.selSet][0]) : null;
  };

  // selects an object and shows it on the network view, with the properties panel open (from tables, warnings and the
  // checklist)
  app.gotoKey = (key) => {
    if (!key) return;
    app.selSet = new Set([key]);
    app.sel = hitOf(key);
    app.setView('net');
    UI.inspector.setCollapsed(false);
    UI.inspector.render();
  };

  app.keyOf = keyOf;
  app.hitOf = hitOf;
})(window);
