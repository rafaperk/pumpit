// Header state: model title, scenario list, checklist indicator, status line and the warnings badge of the
// results tab.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui;
  const app = PumpIt.app;
  const F = UI.format;
  const { $ } = UI.dom;
  const { t } = PumpIt.i18n;

  // the stamp of the regime (R-01, §12.4): liquid and its fluid, or gas, its thermal model and the gas
  function renderStamp() {
    const sys = app.eff().system;
    const st = $('#regime-stamp');
    const gas = PumpIt.model.isCompressible({ system: sys });
    let name = '—';
    try { name = gas ? PumpIt.fluids.evaluateGas(sys).name : PumpIt.fluids.evaluate(sys).name; } catch (e) { /* incomplete fluid: a dash */ }
    st.textContent = gas ? t('app.stamp.gas', { mode: t('app.stamp.modes.' + sys.gasMode), gas: name }) : t('app.stamp.liquid', { fluid: name });
    st.className = 'stamp' + (gas ? ' gas' : '');
  }

  function render() {
    $('#model-title').value = app.model.title || '';
    renderStamp();
    const list = app.model.scenarios.list;
    const depth = (s) => { let d = 0; for (let c = s; c.parent; c = app.scenarioById(c.parent)) d++; return d; };
    const ordered = [];
    const walk = (pid) => list.filter((s) => s.parent === pid).forEach((s) => { ordered.push(s); walk(s.id); });
    walk(null);
    // children are indented with em spaces (U+2003) under their parent
    $('#scenario-select').innerHTML = ordered.map((s) => `<option value="${s.id}"${s.id === app.model.scenarios.current ? ' selected' : ''}>${'\u2003'.repeat(depth(s))}${depth(s) ? '└ ' : ''}${F.esc(s.name)}</option>`).join('');
    $('#btn-scn-del').disabled = !app.scenario().parent;
    // checklist and calculation state
    const v = app.validation();
    const r = app.currentResults();
    const bad = v.items.filter((i) => !i.ok).length;
    let cls = 'bad', txt = t('app.status.pending', { n: bad });
    if (v.ok && r && r.ok && r.converged) { cls = 'ok'; txt = t('app.status.calculated'); }
    else if (v.ok && r && r.ok) { cls = 'warn'; txt = t('app.status.notConverged'); }
    else if (v.ok && r && !r.ok) { cls = 'bad'; txt = t('app.status.refused'); }
    $('#check-dot').className = 'dot ' + cls;
    $('#check-text').textContent = txt;
    if (!$('#checklist-pop').hidden) UI.checklist.fill();
    const st = $('#status-line');
    if (!v.ok) st.textContent = t('app.status.completeChecklist');
    else if (!r) st.textContent = '';
    else if (!r.ok) st.textContent = r.errors[0];
    else st.textContent = t(r.converged ? 'app.status.lineConverged' : 'app.status.lineNotConverged', { n: r.iterations, ms: r.elapsed.toFixed(0) });
    // the badge counts what needs attention (information alone does not)
    const badge = $('#out-badge');
    const shown = r && r.ok ? r.warnings.filter((w) => w.level !== 'info') : [];
    if (shown.length) {
      badge.hidden = false;
      badge.textContent = shown.length;
      badge.className = 'badge' + (shown.some((w) => w.level === 'critical') ? ' crit' : '');
    } else badge.hidden = true;
  }

  function bind() {
    $('#model-title').addEventListener('change', (e) => { app.pushUndo(); app.model.title = e.target.value.trim() || t('core.model.untitled'); app.save(); });
    // the stamp opens the system window, where the regime and the fluid are chosen
    $('#regime-stamp').addEventListener('click', () => UI.systemWindow.open());
  }

  PumpIt.ui.header = { render, bind };
})(window);
