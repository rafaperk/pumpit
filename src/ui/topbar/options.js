// The Options menu of the top bar: how the drawing looks (decision D-36 of docs/3D-VIEWS.md). For now the grid
// density and the projection of the 3D view, which left the menu of the view, and whether the view cube shows. A
// choice for the 3D view made before it was ever opened creates its settings, as the first entry does. The marks
// say which choice is in use; they are brought up to date as the menu opens. The items are in index.html.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;

  function sync(pop) {
    const v = app.model.view3 || PumpIt.model.newView3();
    const mark = (act, on) => { for (const b of pop.querySelectorAll(`[data-act="${act}"]`)) b.setAttribute('aria-pressed', String(on(b))); };
    mark('grid-step', (b) => Number(b.dataset.value) === v.step);
    mark('projection', (b) => b.dataset.value === v.free.projection);
    mark('view-cube', () => app.prefs.viewCube !== false);
  }

  Object.assign(UI.menus.ACTIONS, {
    'grid-step': (b) => { UI.scene3d.ensure(); UI.commands3d.setView({ step: Number(b.dataset.value) }); },
    projection: (b) => { UI.scene3d.ensure(); UI.nav3d.setProjection(b.dataset.value); },
    'view-cube': () => { app.prefs.viewCube = app.prefs.viewCube === false; app.savePrefs(); UI.canvas.render(); },
  });
  UI.menus.ON_OPEN.options = sync;
})(window);
