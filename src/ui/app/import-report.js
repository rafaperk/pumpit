// Report of an imported model (File → Open with a file of another format, such as .fth): what was read, how the first
// calculation compares with the results stored in the file, and the notes of the importer — what needs the user, what
// was assumed and what was left out.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, F = UI.format;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('app.importReport.' + key, params);

  // a relative difference as a percentage; differences below 0.001 % read as such
  const pct = (x) => (x < 1e-5 ? '< ' + F.fmt(0.001, 1) + ' %' : F.fmt(x * 100, 2) + ' %');
  // the results agree when flows and pressures differ by less than 0.1 % of their scales
  const MATCH = 1e-3;

  // name: the file name; res: what the importer imp (one of PumpIt.importers) read; r: the calculation of the imported
  // model (null while its checklist is incomplete)
  function show(name, res, r, imp) {
    const box = document.createElement('div');
    box.className = 'import-report';
    const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; box.appendChild(e); return e; };
    add('p', '', tx('summary', res.counts));
    if (!r) add('p', 'warn', tx('incomplete'));
    else if (!r.ok) add('p', 'warn', tx('refused', { message: (r.errors || [])[0] || '' }));
    else if (res.stored) {
      const c = imp.compare(r, res.stored);
      const match = c.flow < MATCH && c.pressure < MATCH;
      if (match) add('p', 'ok', tx('match'));
      add('p', match ? 'muted' : 'warn', tx('compared', {
        n: c.n, flow: pct(c.flow), pressure: pct(c.pressure),
        flowPipe: c.flowPipe ? 'P' + c.flowPipe : '—', pressurePipe: c.pressurePipe ? 'P' + c.pressurePipe : '—',
      }));
    } else add('p', 'muted', tx('noStored'));
    if (!res.notes.length) add('p', 'muted', tx('clean'));
    for (const level of imp.LEVELS) {
      const notes = res.notes.filter((n) => n.level === level);
      if (!notes.length) continue;
      add('h4', 'level-' + level, tx('levels.' + level));
      const ul = add('ul', '', '');
      for (const n of notes) { const li = document.createElement('li'); li.textContent = imp.noteText(n); ul.appendChild(li); }
    }
    UI.dialogs.modal({ title: tx('title', { name }), body: box, actions: [{ label: t('app.dialog.close'), primary: true }] });
  }

  PumpIt.ui.importReport = { show };
})(typeof window !== 'undefined' ? window : globalThis);
