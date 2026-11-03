// Charts view: chart tabs (pump × system, profile, and over time with a run of the time simulation) and their controls.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const { $, $$ } = UI.dom;
  const app = PumpIt.app;

  const CHARTS = { pump: () => UI.pumpChart.render, profile: () => UI.profileChart.render, time: () => UI.timeChart.render };

  function render(kind, box, ctl, notes) {
    (CHARTS[kind] || CHARTS.pump)()(box, ctl, notes);
  }

  // marks the chosen tab and draws its chart
  function renderView() {
    // the chart over time is there with the time simulation on
    const timeTab = $('#chart-tabs [data-chart="time"]');
    timeTab.hidden = !app.timeOn();
    const kind = app.prefs.chart === 'time' && timeTab.hidden ? 'pump' : app.prefs.chart;
    $$('#chart-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.chart === kind));
    render(kind, $('#chart-box'), $('#chart-controls'), $('#chart-notes'));
  }

  function bind() {
    UI.timeChart.bind();
    $('#chart-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-chart]');
      if (!b) return;
      app.prefs.chart = b.dataset.chart; app.savePrefs(); app.renderView();
    });
    // chart controls (the unit selectors are handled with the other .unit-sel in layout.js)
    document.addEventListener('change', (e) => {
      if (e.target.id === 'ch-pump') { app.prefs.chartPump = Number(e.target.value); app.savePrefs(); app.renderView(); }
      if (e.target.id === 'pf-a' || e.target.id === 'pf-b' || e.target.id === 'pf-what') {
        app.prefs.profile = { a: Number($('#pf-a').value), b: Number($('#pf-b').value), what: $('#pf-what').value };
        app.savePrefs(); app.renderView();
      }
    });
  }

  PumpIt.ui.charts = { render, renderView, bind };
})(typeof window !== 'undefined' ? window : globalThis);
