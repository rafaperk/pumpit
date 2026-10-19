// Models in and out of the editor: normalization of loaded files (missing defaults, ids, migration of removed
// junction types), loading into the editor, saving as .json and the hidden file input.
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
    M.normalizeLayout(m);
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

  function bind() {
    $('#file-input').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { app.pushUndo(); app.loadModel(JSON.parse(rd.result)); toast(t('app.files.opened', { name: f.name })); } catch (err) { toast(t('app.files.cannotOpen', { message: err.message })); }
      };
      rd.readAsText(f);
      e.target.value = '';
    });
  }

  PumpIt.ui.files = { normalize, bind };
})(window);
