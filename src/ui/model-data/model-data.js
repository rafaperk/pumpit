// Model data view: the inputs of the current scenario as tables of pipes and junctions. Cells that
// differ from the parent scenario are highlighted; clicking a row selects the object.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui;
  const F = UI.format;
  const { $ } = UI.dom;
  const views = UI.junctionTypes;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('modelData.' + key, params);

  // an input quantity as typed
  function q(v) { return v && Number.isFinite(v.value) ? `${F.fmt(v.value, 5)} ${F.unit(v.unit)}` : '—'; }

  function pipeSummary(p) {
    const g = p.geometry;
    const geo = g.kind === 'circular' ? `⌀ ${q(g.d)}` : g.kind === 'annulus' ? tx('annulus', { outer: q(g.dOuter), inner: q(g.dInner) }) : g.kind === 'rectangular' ? `${q(g.width)} × ${q(g.height)}` : `A ${q(g.area)}`;
    const f = p.friction;
    const fr = { roughness: `ε ${q(f.eps)}`, relRoughness: `ε/D ${F.fmt(f.rel, 3)}`, smooth: tx('smooth'), explicitF: `f ${F.fmt(f.f, 4)}`, hw: `HW C ${F.fmt(f.C, 4)}`, frictionless: tx('frictionless') }[f.model];
    return { geo, fr, mat: p.material.kind === 'steel' ? tx('steel', { nps: p.material.nps, sch: p.material.sch }) : tx('userMaterial') };
  }

  // one-line summary of a junction's own data, from its junction view
  function junctionSummary(j) {
    const v = views.get(j.type);
    return v.summary ? v.summary(j, q) : '';
  }

  function render(container) {
    const eff = app.eff();
    const und = app.undefSet();
    const ov = (key, ...paths) => paths.some((p) => app.isOv(key, p)) ? ' ov' : '';
    const pRows = eff.pipes.map((p) => {
      const k = 'p:' + p.id, s = pipeSummary(p);
      return `<tr data-key="${k}"><td class="txt num">P${p.id}${und.has(k) ? ` <span class="pill crit">${tx('undefinedPipe')}</span>` : ''}</td><td class="txt${ov(k, 'name')}">${F.esc(p.name)}</td><td class="txt">J${p.up} → J${p.down}</td>
        <td class="num${ov(k, 'length')}">${q(p.length)}</td><td class="txt${ov(k, 'material')}">${s.mat}</td><td class="txt${ov(k, 'geometry')}">${s.geo}</td><td class="txt${ov(k, 'friction')}">${s.fr}</td>
        <td class="num${ov(k, 'fittings')}">${(p.fittings || []).reduce((a, f) => a + (f.qty || 0), 0)}</td><td class="num${ov(k, 'nParallel')}">${p.nParallel}</td><td class="txt${ov(k, 'closed')}">${p.closed ? tx('closed') : ''}</td></tr>`;
    }).join('');
    const jRows = eff.junctions.map((j) => {
      const k = 'j:' + j.id;
      const scnOv = app.scenario().parent && Object.keys(app.scenario().overrides).some((x) => x.startsWith(k + '|') && !/\|(name|elevation)$/.test(x));
      return `<tr data-key="${k}"><td class="txt num">J${j.id}${und.has(k) ? ` <span class="pill crit">${tx('undefinedJunction')}</span>` : ''}</td><td class="txt${ov(k, 'name')}">${F.esc(j.name)}</td><td class="txt">${M.JT[j.type].label}</td>
        <td class="num${ov(k, 'elevation')}">${q(j.elevation)}</td><td class="txt${scnOv ? ' ov' : ''}">${F.esc(junctionSummary(j))}</td></tr>`;
    }).join('');
    container.innerHTML = `
      <div class="card"><div class="card-head"><h3>${tx('pipes')}</h3><span class="muted small">${tx('pipeCount', { n: eff.pipes.length })}</span></div>
        ${eff.pipes.length ? `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">${tx('col.pipe')}</th><th class="txt">${tx('col.name')}</th><th class="txt">${tx('col.link')}</th><th>${tx('col.length')}</th><th class="txt">${tx('col.material')}</th><th class="txt">${tx('col.section')}</th><th class="txt">${tx('col.friction')}</th><th>${tx('col.fittings')}</th><th>${tx('col.nParallel')}</th><th class="txt">${tx('col.condition')}</th></tr></thead><tbody>${pRows}</tbody></table></div>` : `<div class="empty">${tx('noPipes')}</div>`}
      </div>
      <div class="card"><div class="card-head"><h3>${tx('junctions')}</h3><span class="muted small">${tx('junctionCount', { n: eff.junctions.length })}</span></div>
        ${eff.junctions.length ? `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">${tx('col.junction')}</th><th class="txt">${tx('col.name')}</th><th class="txt">${tx('col.type')}</th><th>${tx('col.elevation')}</th><th class="txt">${tx('col.mainData')}</th></tr></thead><tbody>${jRows}</tbody></table></div>` : `<div class="empty">${tx('noJunctions')}</div>`}
      </div>`;
  }

  function bind() {
    $('#view-data').addEventListener('click', (e) => {
      const r = e.target.closest('[data-key]');
      if (r) app.gotoKey(r.dataset.key);
    });
  }

  PumpIt.ui.modelData = { render, bind, pipeSummary, junctionSummary };
})(typeof window !== 'undefined' ? window : globalThis);
