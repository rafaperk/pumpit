// Start-up: connects every block to the page and opens the last model (or the first example).
// This is the last script in index.html.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { $ } = UI.dom;

  function start() {
    UI.language.init();
    UI.inspector.init($('#inspector'));
    UI.canvas.init($('#canvas'), $('#canvas-wrap'));
    UI.menus.bind();
    UI.checklist.bind();
    UI.files.bind();
    UI.header.bind();
    UI.scenarios.bind();
    UI.layout.bind();
    UI.results.bind();
    UI.charts.bind();
    UI.modelData.bind();
    UI.palette.bind();
    UI.fullScreen.bind();
    UI.hud3d.bind();
    UI.cube3d.bind();
    UI.keyboard.bind();
    UI.dialogs.bind();
    UI.tips.bind();
    UI.language.bind();
    UI.theme.bind();
    let m = app.storedModel();
    try { if (m) UI.files.normalize(m); } catch (e) { m = null; }
    app.loadModel(m || PumpIt.examples.get('pump').build());
    if (!m) app.toast(PumpIt.i18n.t('app.welcome'));
    // the guided tour, offered once
    setTimeout(() => UI.tour.offer(), 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
