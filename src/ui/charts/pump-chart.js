// Pump × system chart: pump curve at the current speed against the system curve, which is obtained by
// running the solver with a fixed flow in the pump; the operating point comes from the current results.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, UI = PumpIt.ui;
  const F = UI.format;
  const { lineChart } = UI.lineChart;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('charts.pump.' + key, params);
  const cache = { key: null, data: null };

  function pumpChart(box, ctl, notes) {
    const eff = app.eff();
    const pumps = eff.junctions.filter((j) => j.type === 'pump');
    if (!pumps.length) { ctl.innerHTML = ''; box.innerHTML = `<div class="empty">${tx('noPumps')}</div>`; notes.textContent = ''; return; }
    // a head curve against a liquid system: not drawn for a gas
    if (PumpIt.model.isCompressible(eff)) { ctl.innerHTML = ''; box.innerHTML = `<div class="empty">${tx('gasMode')}</div>`; notes.textContent = ''; return; }
    let pid = app.prefs.chartPump;
    if (!pumps.some((p) => p.id === pid)) pid = pumps[0].id;
    app.prefs.chartPump = pid;
    const qu = app.outUnit('chart.Q', 'volFlow'), hu = app.outUnit('chart.H', 'head');
    ctl.innerHTML = `<label>${tx('pump')}<select id="ch-pump">${pumps.map((p) => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>J${p.id} ${F.esc(p.name)}</option>`).join('')}</select></label>
      <label>${tx('flow')}<select id="ch-qu" class="unit-sel" data-t="chart" data-c="Q" data-cat="volFlow">${U.list('volFlow').map((u) => F.option(u, F.unit(u), u === qu)).join('')}</select></label>
      <label>${tx('head')}<select id="ch-hu" class="unit-sel" data-t="chart" data-c="H" data-cat="head">${U.list('head').map((u) => F.option(u, F.unit(u), u === hu)).join('')}</select></label>`;
    if (!app.validation().ok) { box.innerHTML = `<div class="empty">${tx('needsChecklist')}</div>`; notes.textContent = ''; return; }
    const key = app.version + '|' + app.scenario().id + '|' + pid;
    if (cache.key !== key) { cache.key = key; cache.data = PumpIt.solver.systemCurve(eff, pid, 20); }
    const d = cache.data;
    if (!d || !d.sys.length) { box.innerHTML = `<div class="empty">${tx('failed')}</div>`; return; }
    const cq = (Q) => U.fromSI(Q, qu, 'volFlow'), ch = (h) => U.fromSI(h, hu, 'head');
    const res = app.currentResults();
    const pr = res && res.ok && res.pumps[pid];
    const op = pr ? [{ x: cq(pr.Q), y: ch(pr.dH), color: 'var(--sel)', label: tx('operation', { q: F.fmt(cq(pr.Q), 4), qu: F.unit(qu), h: F.fmt(ch(pr.dH), 4), hu: F.unit(hu) }) }] : [];
    const j = pumps.find((p) => p.id === pid);
    box.innerHTML = lineChart({
      title: tx('title'), xLabel: tx('xLabel', { u: F.unit(qu) }), yLabel: tx('yLabel', { u: F.unit(hu) }), xMin: 0, yMin: 0,
      series: (d.pump.length ? [
        { name: tx('pumpSeries', { speed: F.fmt(j.speed, 4) }) + (j.nPumps > 1 ? tx('parallel', { n: j.nPumps }) : ''), pts: d.pump.map(([q, h]) => [cq(q), ch(h)]), color: 'var(--accent)' },
      ] : []).concat([
        { name: j.mode === 'fixedFlow' ? tx('systemRequired') : tx('system'), pts: d.sys.map(([q, h]) => [cq(q), ch(h)]), color: '#c0612b', dash: '7 5' },
      ]),
      points: op,
    });
    notes.innerHTML = tx('notes', { n: d.sys.length, name: F.esc(app.scenario().name) }) + (pr ? '' : tx('notesNoPoint'));
  }

  PumpIt.ui.pumpChart = { render: pumpChart };
})(typeof window !== 'undefined' ? window : globalThis);
