// Copy and paste (Ctrl+C / Ctrl+V). Copies the selected junctions, the end junctions of the selected pipes and
// the pipes between them, with the effective values of the current scenario; a selected pipe with a loose end goes
// with its loose spot (docs/pipe-ends.md). Each paste is shifted a little.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model;
  const app = PumpIt.app;
  const { toast } = PumpIt.ui.dialogs;
  const { t } = PumpIt.i18n;

  app.copySelection = () => {
    if (!app.selSet.size) { toast(t('app.clipboard.selectFirst')); return; }
    const eff = app.eff();
    const jIds = new Set([...app.selSet].filter((k) => k[0] === 'j').map((k) => Number(k.slice(2))));
    const picked = new Set([...app.selSet].filter((k) => k[0] === 'p').map((k) => Number(k.slice(2))));
    for (const p of eff.pipes) if (picked.has(p.id)) for (const end of M.PIPE_ENDS) if (!M.isLoose(p, end)) jIds.add(p[end]);
    const junctions = eff.junctions.filter((j) => jIds.has(j.id));
    const pipes = eff.pipes.filter((p) => M.PIPE_ENDS.every((end) => (M.isLoose(p, end) ? picked.has(p.id) : jIds.has(p[end]))));
    app.clipboard = { junctions: M.clone(junctions), pipes: M.clone(pipes), pastes: 0 };
    try { navigator.clipboard.writeText(JSON.stringify({ pumpit: 1, junctions, pipes })).catch(() => {}); } catch (e) { /* internal clipboard only */ }
    toast(t('app.clipboard.copied', { junctions: junctions.length, pipes: pipes.length }));
  };

  app.paste = () => {
    const cb = app.clipboard;
    if (!cb || !(cb.junctions.length || cb.pipes.length)) { toast(t('app.clipboard.empty')); return; }
    app.pushUndo();
    cb.pastes++;
    const off = 40 * cb.pastes;
    const jMap = new Map(), pMap = new Map();
    for (const j of cb.junctions) jMap.set(j.id, app.model.nextId.j++);
    for (const p of cb.pipes) pMap.set(p.id, app.model.nextId.p++);
    const keys = [];
    for (const j0 of cb.junctions) {
      const j = M.clone(j0);
      j.id = jMap.get(j0.id); j.x += off; j.y += off;
      if (j.pipeK) j.pipeK = Object.fromEntries(Object.entries(j.pipeK).filter(([pid]) => pMap.has(Number(pid))).map(([pid, v]) => [pMap.get(Number(pid)), v]));
      app.model.junctions.push(j);
      keys.push('j:' + j.id);
    }
    for (const p0 of cb.pipes) {
      const p = M.clone(p0);
      p.id = pMap.get(p0.id);
      for (const end of M.PIPE_ENDS) p[end] = M.isLoose(p0, end) ? null : jMap.get(p0[end]); // its route follows the new ends
      if (p.loose) for (const s of Object.values(p.loose)) { s.x += off; s.y += off; }
      app.model.pipes.push(p);
      keys.push('p:' + p.id);
    }
    app.selSet = new Set(keys);
    app.sel = app.hitOf(keys[0]);
    app.changed();
    toast(t('app.clipboard.pasted', { junctions: cb.junctions.length, pipes: cb.pipes.length }));
  };
})(window);
