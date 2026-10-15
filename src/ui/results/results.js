// Results view: summary (general), result tables per object kind and the warnings list.
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model, UI = PumpIt.ui;
  const F = UI.format;
  const { $ } = UI.dom;
  const C = UI.resultColumns;
  const views = UI.junctionTypes;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('results.' + key, params);

  const OUT_TABS = ['general', 'pipes', 'junctions', 'pumps', 'valves', 'warnings'];

  function resultTable(table, res, eff) {
    const cols = C.COLS[table];
    const rows = C.rowsFor(table, res, eff);
    if (!rows.length) return `<div class="empty">${tx('noItems')}</div>`;
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const th = cols.map((c) => `<th class="${c.t ? 'txt' : ''}">${F.esc(C.colLabel(table, c))}${c.c ? C.unitSelect(table, c) : ''}</th>`).join('');
    const body = rows.map((r) => `<tr data-key="${r.key}">${cols.map((c) => {
      const txt = C.cellValue(c, r, ctx, table);
      return `<td class="${c.t ? 'txt' : 'num'}${txt === '—' ? ' na' : ''}">${F.esc(txt)}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="table-scroll"><table class="grid" data-table="${table}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function render(container, tabsEl, subEl) {
    const res = app.currentResults();
    const eff = app.eff();
    const tab = app.prefs.outTab || 'general';
    tabsEl.innerHTML = OUT_TABS.map((k) => {
      let extra = '';
      if (k === 'warnings' && res && res.ok) extra = ` (${res.warnings.length})`;
      return `<button data-out="${k}" class="${k === tab ? 'on' : ''}">${tx('tabs.' + k)}${extra}</button>`;
    }).join('');
    const scn = app.scenario();
    if (!res) {
      subEl.textContent = tx('subNoResults', { name: scn.name });
      container.innerHTML = `<div class="card"><div class="empty">${tx('noResults')}</div></div>`;
      return;
    }
    if (!res.ok) {
      subEl.textContent = tx('subRefused', { name: scn.name });
      container.innerHTML = `<div class="card"><div class="card-head"><h3>${tx('refused')}</h3></div><ul class="warn-list">${res.errors.map((e) => `<li><span class="lvl critical">${tx('error')}</span><span>${F.esc(e)}</span></li>`).join('')}</ul></div>`;
      return;
    }
    subEl.innerHTML = tx('sub', { name: F.esc(scn.name), state: res.converged ? tx('subConverged', { n: res.iterations }) : tx('subNotConverged'), passes: res.passes > 1 ? tx('subPasses', { n: res.passes }) : '', warnings: res.warnings.length });
    if (tab === 'general') container.innerHTML = general(res, eff);
    else if (tab === 'warnings') container.innerHTML = warningsCard(res);
    else {
      const title = tx('tabs.' + tab);
      const xl = tab === 'pipes' ? `<button class="btn small primary" data-xlsx="pipes" type="button">${tx('exportExcel')}</button>` : '';
      container.innerHTML = `<div class="card"><div class="card-head"><h3>${title}</h3><div class="btn-row">${xl}<button class="btn small" data-copy="${tab}" type="button">${tab === 'pipes' ? tx('copyExcel') : tx('copyTable')}</button></div></div>${resultTable(tab, res, eff)}</div>`;
    }
  }

  function warningsCard(res) {
    if (!res.warnings.length) return `<div class="card"><div class="empty">${tx('noWarnings')}</div></div>`;
    return `<div class="card"><div class="card-head"><h3>${tx('tabs.warnings')}</h3><span class="muted small">${tx('warningsHint')}</span></div><ul class="warn-list">${res.warnings.map((w) => `<li data-key="${w.obj || ''}"><span class="lvl ${w.level}">${C.level(w.level)}</span><span>${F.esc(w.text)}</span></li>`).join('')}</ul></div>`;
  }

  function general(res, eff) {
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const o = (v, cat, key) => `${F.fmt(F.conv(v, cat, app.outUnit(key, cat), ctx), 5)} <span class="muted small">${F.esc(F.unit(app.outUnit(key, cat)))}</span>`;
    const crit = res.warnings.filter((w) => w.level === 'critical').length;
    const kv = [
      [tx('general.situation'), res.converged ? (crit ? `<span class="pill crit">${tx('general.convergedCritical', { n: crit })}</span>` : `<span class="pill ok">${tx('general.converged')}</span>`) : `<span class="pill crit">${tx('general.notConverged')}</span>`],
      [tx('general.iterations'), `${res.iterations}${res.passes > 1 ? ` <span class="muted small">${tx('general.passes', { n: res.passes })}</span>` : ''}`],
      [tx('general.fluid'), F.esc(res.fluid.name)],
      [tx('general.density'), o(res.fluid.rho, 'density', 'gen.rho')],
      [tx('general.viscosity'), o(res.fluid.mu, 'viscosity', 'gen.mu')],
      [tx('general.vaporPressure'), Number.isFinite(res.fluid.pv) ? o(res.fluid.pv, 'pressure', 'gen.pv') : '—'],
      [tx('general.ambientPressure'), o(res.patm, 'pressure', 'gen.patm')],
      [tx('general.counts'), `${eff.pipes.length} · ${eff.junctions.length}`],
    ];
    let html = `<div class="card"><div class="card-head"><h3>${tx('general.summary')}</h3></div><div class="kv">${kv.map(([k, v]) => `<div><span class="eyebrow">${k}</span><b>${v}</b></div>`).join('')}</div></div>`;
    // boundaries: what enters and leaves the system (junction views decide which types are listed)
    const bnd = eff.junctions.filter((j) => views.get(j.type).boundaryFlow)
      .map((j) => ({ j, r: res.junctions[j.id] }))
      .filter(({ j, r }) => r && views.get(j.type).boundaryFlow(r) !== null);
    if (bnd.length) {
      html += `<div class="card"><div class="card-head"><h3>${tx('boundaries.title')}</h3><span class="muted small">${tx('boundaries.hint')}</span></div><div class="table-scroll"><table class="grid"><thead><tr><th class="txt">${tx('boundaries.junction')}</th><th class="txt">${tx('boundaries.type')}</th><th>${tx('boundaries.netFlow')}${C.unitSelect('bnd', { k: 'net', c: 'volFlow' }, tx('boundaries.flowUnit'))}</th><th>${tx('boundaries.stagnation')}${C.unitSelect('bnd', { k: 'P0', c: 'pressure' }, tx('boundaries.pressureUnit'))}</th></tr></thead><tbody>${bnd.map(({ j, r }) => {
        const net = views.get(j.type).boundaryFlow(r);
        return `<tr data-key="j:${j.id}"><td class="txt">J${j.id} ${F.esc(j.name)}</td><td class="txt">${M.JT[j.type].label}</td><td class="num">${F.fmt(U.fromSI(net / res.fluid.rho, app.outUnit('bnd.net', 'volFlow'), 'volFlow'), 5)}</td><td class="num">${F.fmt(F.conv(r.P0in, 'pressure', app.outUnit('bnd.P0', 'pressure'), ctx), 5)}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
    }
    html += warningsCard(res);
    return html;
  }

  function bind() {
    $('#out-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-out]');
      if (!b) return;
      app.prefs.outTab = b.dataset.out; app.savePrefs(); app.renderView();
    });
    // table buttons, and a click on a row (or warning) selects its object
    $('#view-out').addEventListener('click', (e) => {
      const x = e.target.closest('[data-xlsx]');
      if (x) { app.exportPipesXlsx(); return; }
      const c = e.target.closest('[data-copy]');
      if (c) { UI.dialogs.copyText(UI.resultExport.tableTSV(c.dataset.copy, app.okResults(), app.eff()), tx('copied')); return; }
      if (e.target.closest('select')) return;
      const r = e.target.closest('[data-key]');
      if (r && r.dataset.key) app.gotoKey(r.dataset.key);
    });
  }

  PumpIt.ui.results = { render, bind, OUT_TABS };
})(typeof window !== 'undefined' ? window : globalThis);
