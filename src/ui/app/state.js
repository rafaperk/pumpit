// Application state: the model being edited, the selection, the results per scenario, the undo stacks and
// the user preferences. The other files in src/ui/app/ add the behaviour (selection, editing, calculation,
// files, layout) to this object; every panel reads and changes the model through PumpIt.app.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, U = PumpIt.units, F = PumpIt.ui.format;
  const KEY = { model: 'pumpit.model', prefs: 'pumpit.prefs' };

  // browser storage (may be unavailable)
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const app = {
    model: null,
    sel: null,              // primary selected object { kind, id }
    selSet: new Set(),      // every selected key ('p:3', 'j:5')
    results: {},
    version: 0,
    undoStack: [],
    redoStack: [],
    clipboard: null,
    view: 'net',
    // outputs and outputTemplates: the result columns and their templates (src/ui/results/column-setup.js)
    prefs: Object.assign({ grid: true, overlay: 'none', colUnits: {}, outTab: 'general', chart: 'pump', chartPump: null, profile: null }, store.get(KEY.prefs) || {}),
  };
  let effCache = { key: null, eff: null, val: null };

  // ------------------------------------------------------------ model access
  app.scenario = () => app.model.scenarios.list.find((s) => s.id === app.model.scenarios.current);
  app.scenarioById = (id) => app.model.scenarios.list.find((s) => s.id === id);
  function cacheKey() { return app.version + '|' + app.model.scenarios.current; }
  // effective model of the current scenario (cached until the next change)
  app.eff = () => {
    if (effCache.key !== cacheKey()) effCache = { key: cacheKey(), eff: M.effective(app.model, app.model.scenarios.current), val: null };
    return effCache.eff;
  };
  app.validation = () => { const e = app.eff(); if (!effCache.val) effCache.val = M.validate(e); return effCache.val; };
  // a drawing-only edit (positions, 3D data): the effective model is copied again, the results stay
  app.layoutChanged = () => { effCache = { key: null, eff: null, val: null }; };
  app.undefSet = () => app.validation().undef;
  app.effObj = (key) => M.getObj(app.eff(), key);
  app.getVal = (key, path) => { const o = app.effObj(key); return o ? M.getPath(o, path) : undefined; };
  app.isOv = (key, path) => M.isOverridden(app.model, app.model.scenarios.current, key, path);
  app.currentResults = () => app.results[app.model.scenarios.current] || null;
  app.okResults = () => { const r = app.currentResults(); return r && r.ok ? r : null; };

  // output unit chosen for a result column (or panel), falling back to the default of its category
  const KEY_DEFAULT = { 'gen.pv': 'kgf/cm²(a)', 'gen.patm': 'kgf/cm²(a)' };
  app.outUnit = (key, cat) => {
    const u = app.prefs.colUnits[key] || KEY_DEFAULT[key];
    return u && U.has(cat, u) ? u : F.DEFAULT_OUT[cat] || U.list(cat)[0];
  };

  // ------------------------------------------------------------ persistence
  app.save = () => { store.set(KEY.model, app.model); };
  app.savePrefs = () => { store.set(KEY.prefs, app.prefs); };
  app.storedModel = () => store.get(KEY.model);

  // messages, used by every block
  app.toast = PumpIt.ui.dialogs.toast;

  PumpIt.app = app;
})(window);
