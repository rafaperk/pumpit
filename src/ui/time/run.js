// The time simulation in the app (docs/time-simulation.md). After the steady state of the current scenario (the first
// step, at once, as before), its run goes on in slices of about 30 ms so that the page keeps answering; any edit cancels
// it and starts it again. The time cursor picks the recorded step that the tables, the drawing and the cards show: the
// results of that step are solved again from its snapshot. The results of a run are not saved with the model.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const U = PumpIt.units;
  const F = UI.format;

  const SLICE_MS = 30;
  app.timeRuns = {}; // scenario id → its run (complete or stopped), for the current version of the model
  let job = null; // the run going on: { sid, version, job, started }
  let cursor = { sid: null, i: 0 }; // the recorded step shown, by its index

  const timeOn = (eff) => !!(eff && eff.solution && eff.solution.time && eff.solution.time.on);
  app.timeOn = () => timeOn(app.eff());
  const current = () => app.model.scenarios.current;

  // ------------------------------------------------------------ the run
  // starts the run of the current scenario (app.recalc calls it after the steady state)
  app.startTime = () => {
    drop();
    const sid = current();
    delete app.timeRuns[sid];
    if (!timeOn(app.eff()) || !app.validation().ok) return;
    job = { sid, version: app.version, job: PumpIt.time.start(app.eff()), started: performance.now() };
    setTimeout(slice, 0);
  };
  function slice() {
    if (!job) return;
    if (job.version !== app.version || job.sid !== current()) { drop(); return; }
    const st = job.job.step(SLICE_MS);
    if (st.done) finish();
    else { UI.timeBar.renderProgress(); setTimeout(slice, 0); }
  }
  function finish() {
    const run = job.job.result();
    run.elapsed = performance.now() - job.started;
    app.timeRuns[job.sid] = run;
    job = null;
    if (cursor.sid !== current() || !run.times || cursor.i >= run.times.length) cursor = { sid: current(), i: 0 };
    app.renderAll();
  }
  // a run dropped without results (a new one replaces it)
  function drop() { if (job) { job.job.cancel(); job = null; } }
  // the user stops the run: what was calculated stays, marked as stopped
  app.cancelTime = () => { if (job) { job.job.cancel(); finish(); } };
  // { k, N } of the run going on in the current scenario, or null
  app.timeProgress = () => (job && job.sid === current() ? { k: job.job.k, N: job.job.N } : null);
  // the run of the current scenario, when it has recorded steps
  app.timeRun = () => { const r = app.timeRuns[current()]; return r && r.ok && r.times && r.times.length ? r : null; };
  app.timeResult = () => app.timeRuns[current()] || null;

  // ------------------------------------------------------------ the cursor
  app.cursorIndex = () => {
    const run = app.timeRun();
    if (!run) return 0;
    if (cursor.sid !== current()) cursor = { sid: current(), i: 0 };
    return Math.min(cursor.i, run.times.length - 1);
  };
  app.setCursor = (i) => {
    const run = app.timeRun();
    if (!run) return;
    cursor = { sid: current(), i: Math.max(0, Math.min(run.times.length - 1, i)) };
    app.renderAll();
  };
  // the time and the step of the cursor
  app.cursorTime = () => { const run = app.timeRun(); return run ? run.times[app.cursorIndex()] : NaN; };

  // the results shown: those of the step of the cursor when there is a run, else the steady state
  app.steadyResults = () => app.results[current()] || null;
  app.currentResults = () => {
    const run = app.timeRun();
    if (run) {
      const t0 = performance.now();
      const s = run.snapshotAt(app.cursorIndex());
      if (s) { if (s.elapsed === undefined) s.elapsed = performance.now() - t0; return s; }
    }
    return app.steadyResults();
  };

  // ------------------------------------------------------------ times on the screen
  // a time of the clock: "hh:mm:ss", with the days in front past a day ("2 d 06:30:00")
  function clock(sec) {
    if (!Number.isFinite(sec)) return '—';
    const neg = sec < 0;
    let s = Math.round(Math.abs(sec));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const two = (x) => String(x).padStart(2, '0');
    const tail = `${two(h)}:${two(m)}:${two(s)}`;
    return (neg ? '−' : '') + (d ? `${d} ${U.label('d')} ${tail}` : tail);
  }
  // a time in a unit of time: up to six significant digits, without trailing zeros ("40", "2,5"), and with its unit
  function num(sec, unit) {
    const v = U.fromSI(sec, unit, 'time');
    if (!Number.isFinite(v) || v === 0) return F.fmt(v);
    const dec = Math.max(0, Math.min(6, 5 - Math.floor(Math.log10(Math.abs(v)))));
    return v.toLocaleString(PumpIt.i18n.numberLocale(), { maximumFractionDigits: dec }).replace('-', '−');
  }
  const inUnit = (sec, unit) => `${num(sec, unit)} ${F.unit(unit)}`;
  // the unit of time that reads best for a span (s, min, h or d)
  const unitFor = (span) => (span >= 4 * 86400 ? 'd' : span >= 3 * 3600 ? 'h' : span >= 180 ? 'min' : 's');

  UI.timeFormat = { clock, num, inUnit, unitFor };
})(window);
