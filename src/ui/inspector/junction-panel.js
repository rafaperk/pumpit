// Inspector panel of a junction: quick results, identification (name, type, elevation), the type's own form
// and sections (from its junction view) and, for single-node types, the per-pipe loss table.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui, I = UI.inspector;
  const F = UI.format;
  const { el, section, qty, text, readout, hint } = UI.forms;
  const views = UI.junctionTypes;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;

  const TYPE_OPTIONS = () => PumpIt.junctionTypes.list().map((def) => [def.type, def.label]);

  I.panels.junction = (host, id) => {
    const key = 'j:' + id;
    const j = app.effObj(key);
    if (!j) return I.panels.system(host);
    const def = M.JT[j.type];
    const v = views.get(j.type);
    const n = M.pipesAt(app.model, id).length;
    I.head(host, def.label, 'J' + id, t('inspector.junction.meta', { n, accepted: def.pipes[0] === def.pipes[1] ? def.pipes[0] : def.pipes[0] + '–' + def.pipes[1] }));
    I.missingBox(host, key);
    quickResults(host, id, j);

    const s0 = section(t('inspector.identification'));
    s0.appendChild(text(key, 'name', t('inspector.name')));
    const ts = el('select', { id: 'jtype-' + id }, TYPE_OPTIONS().map(([val, l]) => `<option value="${val}"${val === j.type ? ' selected' : ''}>${F.esc(l)}</option>`).join(''));
    ts.addEventListener('change', () => app.changeType(id, ts.value));
    const tf = el('div', { class: 'field' }); tf.innerHTML = `<label for="jtype-${id}">${t('inspector.junction.type')}</label>`;
    const tc = el('div', { class: 'ctl' }); tc.appendChild(ts); tf.appendChild(tc);
    s0.appendChild(tf);
    s0.appendChild(qty(key, 'elevation', v.elevationLabel || t('inspector.junction.elevation'), 'length'));
    host.appendChild(s0);

    const s = section(t('inspector.junction.data'));
    const ctx = { key, j, f: UI.forms, curveEditor: UI.curveEditor.build };
    if (v.form) v.form(s, ctx);
    host.appendChild(s);
    for (const extra of v.sections ? v.sections(ctx) : []) host.appendChild(extra);
    if (def.multi && j.pipeK !== undefined) host.appendChild(UI.pipeLossesTable.build(key, j));
  };

  function quickResults(host, id, j) {
    const res = app.okResults();
    if (!res || !res.junctions[id]) return;
    const r = res.junctions[id];
    const v = views.get(j.type);
    const s = section(t('inspector.result'));
    const row = (label, value) => s.appendChild(readout(label, value));
    if (r.isolated) { s.appendChild(hint(t('inspector.junction.isolated'))); host.appendChild(s); return; }
    if (M.JT[j.type].multi) {
      row(t('inspector.junction.stagnation'), I.out(r.P0in, 'pressure'));
      row(t('inspector.junction.flowThrough'), I.out(r.m / res.fluid.rho, 'volFlow'));
    } else {
      row(t('inspector.junction.flow'), I.out(r.Q, 'volFlow'));
      row(t('inspector.junction.p0InOut'), `${I.out(r.P0in, 'pressure')} / ${F.fmt(F.conv(r.P0out, 'pressure', app.outUnit('insp', 'pressure'), { patm: res.patm }))}`);
      row(v.pressureRise ? t('inspector.junction.pressureRise') : 'ΔP', I.out(v.pressureRise ? -r.dP : r.dP, 'dp'));
    }
    if (v.quickResults) v.quickResults(row, r, { id, j, res, out: I.out });
    const vr = res.valves[id];
    if (vr) row(t('inspector.junction.state'), vr.state);
    host.appendChild(s);
  }
})(typeof window !== 'undefined' ? window : globalThis);
