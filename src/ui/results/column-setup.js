// The result columns the user chose (docs/result-outputs.md): for a liquid and for a gas, the outputs each table shows,
// in order, each with its unit. They are kept in the preferences of this browser, prefs.outputs[regime][table] = a list
// of { k, u }; a table never changed shows the default columns of the catalog in the default units. The column window
// (column-window.js) changes them, and so does the unit list in a column header. The profile also keeps templates
// (prefs.outputTemplates): named sets of the four tables of one regime, which the window saves, applies and deletes,
// and which a profile file carries to another browser with the columns.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const Cat = UI.resultCatalog;
  const F = UI.format;
  const app = PumpIt.app;

  const PROFILE = 'pumpit-profile';

  // the unit of an output: u, when it belongs to its category, otherwise its default one
  const defaultUnit = (e) => (e.c ? e.u || F.DEFAULT_OUT[e.c] || U.list(e.c)[0] : '');
  const unitOf = (e, u) => (e.c ? (u && U.has(e.c, u) ? u : defaultUnit(e)) : '');

  // a list of { k, u } made sound: outputs of the catalog only, each once, the identification first
  function clean(regime, table, list) {
    const out = [{ k: 'id', u: '' }];
    const seen = new Set(['id']);
    for (const it of Array.isArray(list) ? list : []) {
      const e = it && Cat.find(regime, table, it.k);
      if (!e || seen.has(e.k)) continue;
      seen.add(e.k);
      out.push({ k: e.k, u: unitOf(e, it.u) });
    }
    return out;
  }
  const defaults = (regime, table) => clean(regime, table, Cat.defaults(regime, table).map((k) => ({ k })));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x.k === b[i].k && x.u === b[i].u);

  // the list of a table: the saved one, or the default
  function list(regime, table) {
    const o = app.prefs.outputs;
    const saved = o && o[regime] && o[regime][table];
    return saved ? clean(regime, table, saved) : defaults(regime, table);
  }
  // the columns of a table: the outputs of the catalog with their units, and the regime they belong to
  const columns = (regime, table) => list(regime, table).map(({ k, u }) => Object.assign({ regime }, Cat.find(regime, table, k), { u }));

  // keeps the list of a table; a table back to its default is no longer kept
  function store(regime, table, l) {
    const o = app.prefs.outputs || (app.prefs.outputs = {});
    const r = o[regime] || (o[regime] = {});
    const c = clean(regime, table, l);
    if (same(c, defaults(regime, table))) delete r[table]; else r[table] = c;
  }

  // a unit chosen in a column header, kept at once
  function setUnit(regime, table, k, u) {
    store(regime, table, list(regime, table).map((it) => (it.k === k ? { k, u } : it)));
    app.savePrefs();
  }

  // every table of both regimes, for the window to change, and the save of what it changed
  const snapshot = () => Object.fromEntries(Cat.REGIMES.map((rg) => [rg, Object.fromEntries(Cat.TABLES.map((tb) => [tb, list(rg, tb)]))]));
  function saveAll(draft) {
    for (const rg of Cat.REGIMES) for (const tb of Cat.TABLES) if (draft[rg] && draft[rg][tb]) store(rg, tb, draft[rg][tb]);
    app.savePrefs();
  }

  // ------------------------------------------------------------ templates of the profile
  const allTemplates = () => (Array.isArray(app.prefs.outputTemplates) ? app.prefs.outputTemplates : []);
  const templates = (regime) => allTemplates().filter((x) => x.regime === regime).sort((a, b) => a.name.localeCompare(b.name));
  function putTemplate(name, regime, tables) {
    const tp = { name, regime, tables: Object.fromEntries(Cat.TABLES.map((tb) => [tb, clean(regime, tb, tables && tables[tb] ? tables[tb] : Cat.defaults(regime, tb).map((k) => ({ k })))])) };
    app.prefs.outputTemplates = allTemplates().filter((x) => !(x.regime === regime && x.name === name)).concat([tp]);
  }
  // a template saved with a name already in use for the same regime takes its place
  function saveTemplate(name, regime, tables) { putTemplate(name, regime, tables); app.savePrefs(); }
  function deleteTemplate(regime, name) {
    app.prefs.outputTemplates = allTemplates().filter((x) => !(x.regime === regime && x.name === name));
    app.savePrefs();
  }
  // the four tables of a template (a table missing from it: the default)
  function templateTables(regime, name) {
    const tp = templates(regime).find((x) => x.name === name);
    return tp ? Object.fromEntries(Cat.TABLES.map((tb) => [tb, tp.tables && tp.tables[tb] ? clean(regime, tb, tp.tables[tb]) : defaults(regime, tb)])) : null;
  }

  // ------------------------------------------------------------ profile file
  const profile = () => ({ format: PROFILE, version: 1, outputs: app.prefs.outputs || {}, templates: allTemplates() });
  // a profile file: its columns take the place of the saved ones and its templates join those of the profile. Returns
  // the number of templates read, or -1 when the object is not a profile.
  function importProfile(obj) {
    if (!obj || obj.format !== PROFILE) return -1;
    app.prefs.outputs = {};
    for (const rg of Cat.REGIMES) for (const tb of Cat.TABLES) {
      const l = obj.outputs && obj.outputs[rg] && obj.outputs[rg][tb];
      if (Array.isArray(l)) store(rg, tb, l);
    }
    let n = 0;
    for (const tp of Array.isArray(obj.templates) ? obj.templates : []) {
      const name = tp && typeof tp.name === 'string' ? tp.name.trim() : '';
      if (!name || !Cat.REGIMES.includes(tp.regime)) continue;
      putTemplate(name, tp.regime, tp.tables || {});
      n++;
    }
    app.savePrefs();
    return n;
  }

  // Before the columns could be chosen, a unit picked in a column header was kept in prefs.colUnits as
  // '<table>.<field>', for both regimes: it becomes the unit of that column in the columns of each regime.
  function migrate() {
    const cu = app.prefs.colUnits || {};
    const old = Object.keys(cu).filter((key) => Cat.TABLES.includes(key.split('.')[0]));
    if (!old.length) return;
    if (!app.prefs.outputs) {
      for (const rg of Cat.REGIMES) for (const tb of Cat.TABLES) {
        if (old.some((key) => key.startsWith(tb + '.'))) store(rg, tb, defaults(rg, tb).map((it) => ({ k: it.k, u: cu[tb + '.' + it.k] || it.u })));
      }
    }
    for (const key of old) delete cu[key];
  }
  migrate();

  PumpIt.ui.columnSetup = {
    defaultUnit, unitOf, clean, defaults, list, columns, setUnit, snapshot, saveAll,
    templates, saveTemplate, deleteTemplate, templateTables, profile, importProfile, migrate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
