// Models in and out of the editor: normalization of loaded files (missing defaults, ids, migration of removed
// junction types), loading into the editor, saving as .json, and opening a file — .json, or another format through the
// importer of its extension (PumpIt.importers: .fth, .aro) — from the hidden file input or dropped on the page.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const app = PumpIt.app;
  const { $ } = UI.dom;
  const { toast } = UI.dialogs;
  const { t } = PumpIt.i18n;

  function normalize(m) {
    if (!m || !Array.isArray(m.pipes) || !Array.isArray(m.junctions)) throw new Error(t('app.files.notAModel'));
    const base = M.newModel();
    m.system = Object.assign(base.system, m.system || {});
    m.solution = Object.assign(base.solution, m.solution || {});
    if (!m.scenarios || !m.scenarios.list || !m.scenarios.list.length) m.scenarios = base.scenarios;
    if (!m.scenarios.list.some((s) => s.id === m.scenarios.current)) m.scenarios.current = m.scenarios.list[0].id;
    m.nextId = m.nextId || {};
    m.nextId.p = Math.max(m.nextId.p || 1, 1 + Math.max(0, ...m.pipes.map((p) => p.id)));
    m.nextId.j = Math.max(m.nextId.j || 1, 1 + Math.max(0, ...m.junctions.map((j) => j.id)));
    m._notes = M.migrate(m);
    M.normalizeRegime(m);
    M.normalizeLayout(m);
    M.normalizeEnds(m);
    return m;
  }

  app.loadModel = (m, { fit = true } = {}) => {
    app.model = normalize(m);
    const notes = app.model._notes;
    delete app.model._notes;
    app.selSet.clear(); app.sel = null;
    app.version++;
    app.results = {};
    app.save();
    app.recalc();
    app.renderAll();
    // the schematic is framed; the cameras of the 3D views were saved with the model (3D views R-02), and are framed
    // again only when the scene is out of their sight
    if (fit) requestAnimationFrame(() => { UI.scene3d.ensureVisible(); UI.canvas.fitSchematic(); });
    if (notes && notes.length) toast(t('app.files.converted', { notes: notes.join('; ') }));
  };

  app.downloadModel = () => UI.download.saveFile(`${UI.download.safeName(app.model.title)}.pumpit.json`, new Blob([JSON.stringify(app.model, null, 1)], { type: 'application/json' }));

  // the importers by extension (src/core/import/): each reads the text of its files, in their encoding, into a model
  const importers = () => PumpIt.importers || {};
  function importerOf(name) {
    const m = /\.(\w+)$/.exec(name);
    const ext = m && m[1].toLowerCase();
    return ext && Object.prototype.hasOwnProperty.call(importers(), ext) ? importers()[ext] : null;
  }

  // a file of another format becomes a model, and the import report tells what was read; a file with several scenarios
  // first asks which one to import
  function importFile(f, imp) {
    const rd = new FileReader();
    rd.onload = () => {
      const text = new TextDecoder(imp.encoding || 'utf-8').decode(rd.result);
      const load = (opts) => {
        let res;
        try { res = imp.read(text, Object.assign({ name: f.name }, opts)); }
        catch (err) { toast(t('app.importReport.cannotRead', { message: err.message })); return; }
        app.pushUndo();
        app.loadModel(res.model);
        UI.importReport.show(f.name, res, app.results[app.model.scenarios.current] || null, imp);
      };
      let list = [];
      try { list = imp.scenarios ? imp.scenarios(text) : []; } catch (err) { list = []; }
      if (list.length > 1) UI.importReport.pickScenario(f.name, list, (n) => load({ scenario: n }));
      else load({});
    };
    rd.readAsArrayBuffer(f);
  }

  function openFile(f) {
    if (!f) return;
    const imp = importerOf(f.name);
    if (imp) { importFile(f, imp); return; }
    const rd = new FileReader();
    rd.onload = () => {
      try { app.pushUndo(); app.loadModel(JSON.parse(rd.result)); toast(t('app.files.opened', { name: f.name })); } catch (err) { toast(t('app.files.cannotOpen', { message: err.message })); }
    };
    rd.readAsText(f);
  }

  function bind() {
    $('#file-input').accept = ['.json', ...Object.keys(importers()).map((ext) => '.' + ext), 'application/json'].join(',');
    $('#file-input').addEventListener('change', (e) => {
      openFile(e.target.files[0]);
      e.target.value = '';
    });
    // a file dragged onto the page opens like File → Open (the drawing lets file drops through to here)
    const hasFiles = (e) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    document.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      openFile(e.dataTransfer.files[0]);
    });
  }

  PumpIt.ui.files = { normalize, bind, openFile };
})(window);
