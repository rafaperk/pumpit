// Views (tabs: network, model data, results, charts) and the full redraw.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { $, $$ } = UI.dom;

  app.renderAll = () => {
    UI.header.render();
    UI.canvas.render();
    UI.inspector.render();
    app.renderView();
  };

  app.renderView = () => {
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === app.view)));
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + app.view; });
    if (app.view === 'data') UI.modelData.render($('#data-tables'));
    if (app.view === 'out') UI.results.render($('#out-body'), $('#out-tabs'), $('#out-sub'));
    if (app.view === 'charts') UI.charts.renderView();
  };

  app.setView = (v) => {
    app.view = v;
    app.renderView();
    if (v === 'net') requestAnimationFrame(() => UI.canvas.render());
  };

  function bind() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => app.setView(t.dataset.view)));
    // unit chosen per column (result tables and charts)
    document.addEventListener('change', (e) => {
      const s = e.target.closest('.unit-sel');
      if (s) { app.prefs.colUnits[s.dataset.t + '.' + s.dataset.c] = s.value; app.savePrefs(); app.renderView(); }
    });
  }

  PumpIt.ui.layout = { bind };
})(window);
