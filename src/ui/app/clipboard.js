// Copy and paste (Ctrl+C / Ctrl+V). Copies the selected junctions, the end junctions of the selected pipes and
// the pipes between them, with the effective values of the current scenario. Each paste is shifted a little.
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
    for (const k of app.selSet) if (k[0] === 'p') { const p = eff.pipes.find((x) => x.id === Number(k.slice(2))); if (p) { jIds.add(p.up); jIds.add(p.down); } }
    const junctions = eff.junctions.filter((j) => jIds.has(j.id));
    const pipes = eff.pipes.filter((p) => jIds.has(p.up) && jIds.has(p.down));
    app.clipboard = { junctions: M.clone(junctions), pipes: M.clone(pipes), pastes: 0 };
    try { navigator.clipboard.writeText(JSON.stringify({ pumpit: 1, junctions, pipes })).catch(() => {}); } catch (e) { /* internal clipboard only */ }
    toast(t('app.clipboard.copied', { junctions: junctions.length, pipes: pipes.length }));
  };

  app.paste = () => {
    const cb = app.clipboard;
    if (!cb || !cb.junctions.length) { toast(t('app.clipboard.empty')); return; }
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
      p.id = pMap.get(p0.id); p.up = jMap.get(p0.up); p.down = jMap.get(p0.down);
      app.model.pipes.push(p);
      keys.push('p:' + p.id);
    }
    app.selSet = new Set(keys);
    app.sel = app.hitOf(keys[0]);
    app.changed();
    toast(t('app.clipboard.pasted', { junctions: cb.junctions.length, pipes: cb.pipes.length }));
  };
})(window);
