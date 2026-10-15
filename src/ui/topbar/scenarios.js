// Scenario controls in the top bar: switching (which calculates the chosen scenario), adding a child,
// renaming, deleting, and the table of differences from the parent.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $ } = UI.dom;
  const { toast, modal, askText, confirmBox } = UI.dialogs;
  const { t } = PumpIt.i18n;

  app.showDiffs = () => {
    const s = app.scenario();
    const parent = s.parent;
    const rows = Object.entries(s.overrides).map(([k, v]) => {
      const [ok, path] = k.split('|');
      const label = ok === 'sys' ? t('app.diffs.system') : ok === 'sol' ? t('app.diffs.solution') : (ok[0] === 'p' ? 'P' : 'J') + ok.slice(2);
      const pv = M.effValue(app.model, parent, ok, path);
      const show = (x) => (x && typeof x === 'object' && 'value' in x ? `${F.fmt(x.value, 5)} ${F.unit(x.unit)}` : typeof x === 'object' ? t('app.diffs.table') : String(x));
      return `<tr><td class="txt">${label}</td><td class="txt">${F.esc(path)}</td><td class="num">${F.esc(show(v))}</td><td class="num muted">${F.esc(show(pv))}</td></tr>`;
    }).join('');
    modal({
      title: t('app.diffs.title', { name: s.name, parent: app.scenarioById(parent).name }),
      body: `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">${t('app.diffs.object')}</th><th class="txt">${t('app.diffs.attribute')}</th><th>${t('app.diffs.here')}</th><th>${t('app.diffs.parent')}</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      actions: [{ label: t('app.dialog.close'), primary: true }],
    });
  };

  function bind() {
    $('#scenario-select').addEventListener('change', (e) => {
      app.model.scenarios.current = e.target.value;
      app.save();
      if (!app.currentResults()) app.recalc();
      app.renderAll();
    });
    $('#btn-scn-add').addEventListener('click', () => askText(t('app.scenario.newTitle'), t('app.scenario.newLabel', { parent: app.scenario().name }), '', (name) => {
      app.pushUndo();
      const s = M.addScenario(app.model, app.model.scenarios.current, name);
      app.model.scenarios.current = s.id;
      app.changed();
      toast(t('app.scenario.created', { name }));
    }));
    $('#btn-scn-rename').addEventListener('click', () => askText(t('app.scenario.renameTitle'), t('app.scenario.renameLabel'), app.scenario().name, (name) => {
      app.pushUndo(); app.scenario().name = name; app.save(); app.renderAll();
    }));
    $('#btn-scn-del').addEventListener('click', () => {
      const s = app.scenario();
      if (!s.parent) return;
      const n = M.descendants(app.model, s.id).length;
      confirmBox(t('app.scenario.deleteTitle'), t(n ? 'app.scenario.deleteWithChildren' : 'app.scenario.deleteText', { name: s.name, n }), t('app.scenario.deleteOk'), () => {
        app.pushUndo(); M.deleteScenario(app.model, s.id); app.changed();
      });
    });
  }

  PumpIt.ui.scenarios = { bind };
})(window);
