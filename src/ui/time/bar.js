// The time simulation at the top of the page: the stamp "Over time" next to the stamp of the regime (with the progress of
// the run and the button that stops it), and the time cursor in the row of the tabs: the step shown, the buttons that go
// through the recorded steps, and play.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const { $ } = UI.dom;
  const F = UI.format;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('time.bar.' + key, params);

  const SPEEDS = [1, 2, 5, 10];
  const STEP_MS = 600; // a step of the playback at ×1
  const ICON = {
    first: '<path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor"/>',
    prev: '<path d="M11 3L4 8l7 5z" fill="currentColor"/>',
    play: '<path d="M5 3l8 5-8 5z" fill="currentColor"/>',
    pause: '<path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/>',
    next: '<path d="M5 3l7 5-7 5z" fill="currentColor"/>',
    last: '<path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor"/>',
    stop: '<path d="M4 4h8v8H4z" fill="currentColor"/>',
  };
  const icon = (k) => `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">${ICON[k]}</svg>`;

  let built = false, playing = null, speed = 1, pendingI = null;

  function ensure() {
    if (built) return;
    built = true;
    const bar = $('#timebar');
    const b = (k) => `<button type="button" class="btn ghost icon" data-tc="${k}">${icon(k)}</button>`;
    bar.innerHTML = `${b('first')}${b('prev')}${b('play')}${b('next')}${b('last')}
      <input type="range" id="tc-range" min="0" max="0" step="1" value="0">
      <span class="tc-time" id="tc-time" aria-live="polite"></span>
      <select id="tc-speed" class="tc-speed">${SPEEDS.map((s) => `<option value="${s}">×${s}</option>`).join('')}</select>`;
    bar.addEventListener('click', (e) => {
      const k = e.target.closest('[data-tc]');
      if (!k) return;
      const run = app.timeRun();
      if (!run) return;
      const i = app.cursorIndex(), n = run.times.length;
      if (k.dataset.tc !== 'play') stop();
      ({ first: () => app.setCursor(0), prev: () => app.setCursor(i - 1), next: () => app.setCursor(i + 1), last: () => app.setCursor(n - 1), play: () => (playing ? stop() : play()) })[k.dataset.tc]();
    });
    // the cursor follows the slider at the pace of the screen
    $('#tc-range').addEventListener('input', (e) => {
      stop();
      const first = pendingI === null;
      pendingI = Number(e.target.value);
      if (first) requestAnimationFrame(() => { const i = pendingI; pendingI = null; app.setCursor(i); });
    });
    $('#tc-speed').addEventListener('change', (e) => { speed = Number(e.target.value) || 1; if (playing) { stop(); play(); } });
    $('#time-stamp').addEventListener('click', () => UI.systemWindow.open());
    $('#time-cancel').addEventListener('click', () => app.cancelTime());
  }

  function play() {
    const run = app.timeRun();
    if (!run) return;
    if (app.cursorIndex() >= run.times.length - 1) app.setCursor(0);
    playing = setInterval(() => {
      const r = app.timeRun();
      if (!r || app.cursorIndex() >= r.times.length - 1) { stop(); return; }
      app.setCursor(app.cursorIndex() + 1);
    }, STEP_MS / speed);
    labels();
  }
  function stop() {
    if (!playing) return;
    clearInterval(playing);
    playing = null;
    labels();
  }

  // the titles of the buttons, in the current language
  function labels() {
    const set = (k, txt) => { const e = $(`#timebar [data-tc="${k}"]`); e.title = txt; e.setAttribute('aria-label', txt); };
    for (const k of ['first', 'prev', 'next', 'last']) set(k, tx(k));
    set('play', tx(playing ? 'pause' : 'play'));
    $('#timebar [data-tc="play"]').innerHTML = icon(playing ? 'pause' : 'play');
    $('#tc-range').setAttribute('aria-label', tx('slider'));
    $('#tc-speed').title = tx('speed');
    $('#tc-speed').setAttribute('aria-label', tx('speed'));
    $('#timebar').setAttribute('aria-label', tx('aria'));
    $('#time-cancel').title = tx('cancel');
    $('#time-cancel').setAttribute('aria-label', tx('cancel'));
  }

  // the stamp: off, running (its progress) or over time
  function renderProgress() {
    ensure();
    const st = $('#time-stamp');
    const on = app.timeOn();
    const p = app.timeProgress();
    st.hidden = !on;
    $('#time-cancel').hidden = !(on && p);
    if (!on) return;
    st.textContent = p ? t('time.stamp.running', { pct: Math.min(99, Math.floor((100 * p.k) / (p.N + 1))) }) : t('time.stamp.label');
    st.title = t('time.stamp.title');
    st.classList.toggle('running', !!p);
  }

  function render() {
    ensure();
    renderProgress();
    labels();
    const run = app.timeRun();
    const bar = $('#timebar');
    bar.hidden = !run || !app.timeOn();
    if (bar.hidden) { stop(); return; }
    const i = app.cursorIndex(), n = run.times.length;
    const range = $('#tc-range');
    range.max = String(n - 1);
    if (pendingI === null) range.value = String(i);
    const tk = run.times[i];
    const TF = UI.timeFormat;
    const span = run.tf - run.t0;
    const stopped = run.stopped ? ` · ${F.esc(t(run.stopped.reason === 'cancel' ? 'time.bar.cancelled' : 'time.bar.stopped', { t: TF.clock(run.stopped.t) }))}` : '';
    const step = run.exact[i] ? tx('stepExact', { k: run.steps[i], k1: run.steps[i] + 1, n: run.N }) : tx('step', { k: run.steps[i], n: run.N });
    $('#tc-time').innerHTML = `<b>${F.esc(TF.clock(tk))}</b> <span class="muted">${F.esc(TF.inUnit(tk, TF.unitFor(span)))} · ${F.esc(step)}</span>${stopped ? `<span class="tc-stop">${stopped}</span>` : ''}`;
    $('#tc-speed').value = String(speed);
    for (const k of ['first', 'prev']) $(`#timebar [data-tc="${k}"]`).disabled = i <= 0;
    for (const k of ['next', 'last']) $(`#timebar [data-tc="${k}"]`).disabled = i >= n - 1;
  }

  PumpIt.ui.timeBar = { render, renderProgress, stop };
})(window);
