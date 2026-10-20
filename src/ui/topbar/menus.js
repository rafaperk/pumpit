// Top bar menus (File, Options, Edit, Help), their commands and the list of examples. Other blocks add their own
// commands to ACTIONS and, for a menu that shows a state, a function to ON_OPEN (src/ui/topbar/options.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $, $$ } = UI.dom;
  const { toast, modal, confirmBox, copyText } = UI.dialogs;
  const { t } = PumpIt.i18n;

  app.hideMenus = () => {
    $$('.menu-pop').forEach((m) => { m.hidden = true; });
    $('#ctxmenu').hidden = true;
  };

  // menu items, by their data-act attribute; each receives the item clicked
  const ACTIONS = {
    new: () => confirmBox(t('app.newModel.title'), t('app.newModel.text'), t('app.newModel.ok'), () => { app.pushUndo(); app.loadModel(M.newModel()); }),
    open: () => $('#file-input').click(),
    save: () => app.downloadModel(),
    'copy-json': () => copyText(JSON.stringify(app.model), t('app.files.modelCopied')),
    'paste-json': () => {
      const ta = document.createElement('textarea');
      ta.id = 'paste-area';
      ta.placeholder = t('app.pasteModel.placeholder');
      modal({ title: t('app.pasteModel.title'), body: ta, actions: [{ label: t('app.dialog.cancel') }, { label: t('app.pasteModel.ok'), primary: true, onClick: () => {
        try { app.pushUndo(); app.loadModel(JSON.parse(ta.value)); toast(t('app.pasteModel.opened')); } catch (e) { toast(t('app.pasteModel.cannotRead', { message: e.message })); return false; }
      } }] });
    },
    'export-xlsx': () => app.exportPipesXlsx(),
    undo: () => app.undo(),
    redo: () => app.redo(),
    copy: () => app.copySelection(),
    paste: () => app.paste(),
    'select-all': () => { app.setView('net'); app.selectAll(); },
    reverse: () => { if (app.sel && app.sel.kind === 'pipe') app.reversePipe(app.sel.id); else toast(t('app.edit.selectPipe')); },
    delete: () => (app.selSet.size ? app.deleteSelection() : toast(t('app.edit.nothingSelected'))),
    fit: () => { app.setView('net'); requestAnimationFrame(() => UI.canvas.fit()); },
    'toggle-grid': () => {
      if (UI.scene3d.active()) { UI.hud3d.toggle('grid'); return; } // the grid of the 3D view on the screen
      app.prefs.grid = !app.prefs.grid; app.savePrefs(); UI.canvas.render(); toast(app.prefs.grid ? t('app.edit.gridOn') : t('app.edit.gridOff'));
    },
    system: () => UI.systemWindow.open(),
    help: () => UI.help.open(),
    'help-tour': () => UI.tour.start(),
    'help-start': () => UI.help.open('start.welcome'),
    'help-tech': () => UI.help.open('tech.overview'),
    'help-about': () => UI.help.open('about.about'),
    shortcuts: () => UI.shortcuts.show(),
  };

  // what a menu brings up to date as it opens, by the name of the menu (data-menu): fn(pop)
  const ON_OPEN = {};

  // opens an example in place of the current model (undo brings the model back)
  function openExample(id) {
    const ex = PumpIt.examples.get(id);
    if (!ex) return;
    app.pushUndo();
    app.loadModel(ex.build());
    toast(t('app.exampleLoaded', { name: ex.name }));
  }

  // the examples list of the File menu (names in the current language)
  function renderExamples() {
    $('#menu-examples').innerHTML = PumpIt.examples.EXAMPLES.map((ex) => `<button type="button" data-ex="${ex.id}">${F.esc(ex.name)}</button>`).join('');
  }

  function bind() {
    $$('[data-menu]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#menu-' + b.dataset.menu);
      const was = pop.hidden;
      app.hideMenus();
      pop.hidden = !was;
      if (!pop.hidden && ON_OPEN[b.dataset.menu]) ON_OPEN[b.dataset.menu](pop);
    }));
    $$('.menu-pop [data-act]').forEach((b) => b.addEventListener('click', () => { app.hideMenus(); ACTIONS[b.dataset.act](b); }));
    renderExamples();
    $('#menu-examples').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ex]');
      if (!b) return;
      app.hideMenus();
      openExample(b.dataset.ex);
    });
    // a click anywhere else closes the menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu') && !e.target.closest('.run') && !e.target.closest('.ctxmenu')) app.hideMenus();
    });
  }

  PumpIt.ui.menus = { ACTIONS, ON_OPEN, bind, renderExamples, openExample };
})(window);
