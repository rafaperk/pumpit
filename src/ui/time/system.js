// The control of the time simulation in the system window (§3 and §10.4 of its specification): on or off, the clock and
// its step, how often a step is recorded, the method of the tank levels (the parameters of the central method only with
// it, the exact time of events only with the forward one), what a table gives after its last point and the tariff of
// the energy cost of the pumps (§9.5). A line tells the steps and the memory of the run. The control is a field of the
// solution, so a child scenario changes it field by field. The events of the model follow, in a section of their own
// (src/ui/time/events-section.js).
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const M = PumpIt.model;
  const app = PumpIt.app;
  const F = UI.format;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.system.' + key, params);

  function section() {
    const { section: sec, qty, num, seg, chk, sel, readout, hint, text } = UI.forms;
    const k = 'sol';
    const tc = app.eff().solution.time;
    const s = sec(tx('title'), { info: tx('hint') });
    s.appendChild(chk(k, 'time.on', tx('on')));
    if (!tc.on) return s;
    s.appendChild(qty(k, 'time.start', tx('start'), 'time'));
    s.appendChild(qty(k, 'time.stop', tx('stop'), 'time'));
    s.appendChild(qty(k, 'time.step', tx('step'), 'time', { info: tx('stepHint') }));
    s.appendChild(num(k, 'time.saveEvery', tx('saveEvery'), { int: true, info: tx('saveEveryHint') }));
    s.appendChild(seg(k, 'time.method', tx('method'), M.TIME_METHODS.map((m) => [m, tx('methods.' + m)]), { info: M.TIME_METHODS.map((m) => `<b>${F.esc(tx('methods.' + m))}</b><br>${tx('methodHint.' + m)}`).join('<br><br>') }));
    if (tc.method === 'central') {
      s.appendChild(num(k, 'time.relTol', tx('relTol')));
      s.appendChild(qty(k, 'time.absTol', tx('absTol'), 'length'));
      s.appendChild(num(k, 'time.relax', tx('relax')));
      s.appendChild(num(k, 'time.maxIter', tx('maxIter'), { int: true }));
    } else s.appendChild(chk(k, 'time.exactEvents', tx('exactEvents'), { info: tx('exactEventsHint') }));
    s.appendChild(sel(k, 'time.dataEnd', tx('dataEnd'), M.DATA_END.map((d) => [d, tx('dataEnds.' + d)])));
    // the energy cost of the pumps: a price per kWh by the time of the day
    s.appendChild(chk(k, 'time.tariff.use', tx('tariff.use'), { info: tx('tariff.hint') }));
    const tf = tc.tariff || {};
    if (tf.use) {
      s.appendChild(text(k, 'time.tariff.currency', tx('tariff.currency')));
      s.appendChild(UI.pointTable.build({
        id: 'tf-table', x: { label: tx('tariff.time'), cat: 'time', unit: tf.tUnit || 'h' }, y: { label: tx('tariff.price'), cat: 'none', unit: '' },
        xs: tf.t || [], ys: tf.v || [], steps: true, xEnd: PumpIt.units.fromSI(86400, tf.tUnit || 'h', 'time'),
        onChange: (x) => app.setVals(k, [['time.tariff.t', x.xs], ['time.tariff.v', x.ys], ['time.tariff.tUnit', x.xUnit]]),
      }));
    }
    // the size of the run: its steps, those recorded, and the memory of their series
    const est = PumpIt.time.estimate(app.eff(), app.steadyResults() && app.steadyResults().ok ? app.steadyResults() : null);
    if (Number.isFinite(est.N)) {
      const mb = Number.isFinite(est.bytes) ? F.fmt(est.bytes / 1e6, 3) : '—';
      s.appendChild(readout(tx('size'), tx('sizeValue', { n: est.N, r: est.recorded, mb })));
      if (est.N > PumpIt.time.MAX_STEPS) s.appendChild(hint(F.esc(tx('tooMany', { max: PumpIt.time.MAX_STEPS }))));
    }
    // the events of the model, in a section after this one
    const frag = document.createDocumentFragment();
    frag.append(s, UI.timeEvents.section());
    return frag;
  }

  // the line of the summary in the inspector with nothing selected
  function summary(host) {
    const tc = app.eff().solution.time;
    if (!tc || !tc.on) return;
    const q = (x) => (x && Number.isFinite(x.value) ? `${F.inputStr(x.value)} ${F.unit(x.unit)}` : '—');
    host.appendChild(UI.forms.readout(tx('title'), tx('summary', { start: q(tc.start), stop: q(tc.stop), step: q(tc.step) })));
  }

  UI.timeSystem = { section, summary };
})(window);
