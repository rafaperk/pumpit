// Inspector panel shown with nothing selected: fluid, environment, solution control and the current scenario.
(function (root) {
  const PumpIt = root.PumpIt;
  const UI = PumpIt.ui, I = UI.inspector;
  const F = UI.format;
  const { el, section, qty, num, sel, chk, text, readout, hint } = UI.forms;
  const app = PumpIt.app;
  const LIBRARY = PumpIt.fluids.LIBRARY;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.system.' + key, params);

  I.panels.system = (host) => {
    const eff = app.eff();
    const scn = app.scenario();
    I.head(host, tx('title'), '', scn.parent ? tx('metaChild', { name: F.esc(scn.name), parent: F.esc(app.scenarioById(scn.parent).name) }) : tx('metaBase', { name: F.esc(scn.name) }));
    const k = 'sys';
    const s1 = section(tx('fluid'));
    // library fluids (by their correlations) or a user-defined fluid
    s1.appendChild(sel(k, 'fluid.kind', tx('fluidKind'), Object.entries(LIBRARY).map(([kind, lib]) => [kind, lib.label]).concat([['user', tx('userDefined')]])));
    const lib = LIBRARY[eff.system.fluid.kind];
    if (lib) {
      s1.appendChild(qty(k, 'fluid.T', tx('temperature'), 'temperature'));
    } else {
      s1.appendChild(text(k, 'fluid.name', tx('name')));
      s1.appendChild(qty(k, 'fluid.rho', tx('density'), 'density'));
      s1.appendChild(qty(k, 'fluid.mu', tx('viscosity'), 'viscosity'));
      s1.appendChild(qty(k, 'fluid.pv', tx('vaporPressure'), 'pressure'));
    }
    try {
      const fl = PumpIt.fluids.evaluate(eff.system);
      s1.appendChild(readout('ρ', F.fmt(fl.rho, 6) + ' kg/m³'));
      s1.appendChild(readout('μ', F.fmt(fl.mu * 1e3, 4) + ' cP'));
      s1.appendChild(readout('Pv', Number.isFinite(fl.pv) ? F.fmt(fl.pv / 98066.5, 4) + ' kgf/cm²(a)' : '—'));
      if (lib) s1.appendChild(hint(tx('fluidSources', { sources: lib.sources, min: lib.range[0], max: lib.range[1] })));
    } catch (e) { s1.appendChild(hint(e.message)); }
    host.appendChild(s1);

    const s2 = section(tx('environment'));
    s2.appendChild(qty(k, 'patm', tx('patm'), 'pressure'));
    s2.appendChild(num(k, 'gravity', tx('gravity'), { suffix: '× g₀' }));
    s2.appendChild(num(k, 'reLam', tx('reLam'), { int: true }));
    s2.appendChild(num(k, 'reTurb', tx('reTurb'), { int: true }));
    s2.appendChild(sel(k, 'laminarK', tx('laminarK'), [['improvedAtkf', tx('improvedAtkf')], ['atkf', 'ATKF'], ['none', tx('noCorrection')]]));
    s2.appendChild(hint(tx('flowHint')));
    host.appendChild(s2);

    const s3 = section(tx('solution'));
    const ks = 'sol';
    s3.appendChild(num(ks, 'tolRel', tx('tolRel')));
    s3.appendChild(num(ks, 'maxIter', tx('maxIter'), { int: true }));
    s3.appendChild(num(ks, 'relax', tx('relax')));
    s3.appendChild(chk(ks, 'adaptive', tx('adaptive')));
    s3.appendChild(chk(ks, 'checkMass', tx('checkMass')));
    host.appendChild(s3);

    const s4 = section(tx('scenario'));
    const notes = el('textarea', { id: 'scn-notes', rows: '3', style: 'width:100%;resize:vertical', placeholder: tx('notes') });
    notes.value = scn.notes || '';
    notes.addEventListener('change', () => { app.pushUndo(); scn.notes = notes.value; app.save(); });
    s4.appendChild(notes);
    const nOv = Object.keys(scn.overrides).length;
    s4.appendChild(readout(tx('overrides'), scn.parent ? String(nOv) : tx('baseScenario')));
    if (scn.parent && nOv) {
      const b = el('button', { class: 'btn small', type: 'button' }, tx('showDiffs'));
      b.addEventListener('click', () => app.showDiffs());
      s4.appendChild(b);
    }
    s4.appendChild(hint(tx('hint')));
    host.appendChild(s4);
  };
})(typeof window !== 'undefined' ? window : globalThis);
