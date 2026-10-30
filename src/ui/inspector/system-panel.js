// The properties of the system: the regime of the model (incompressible liquid or compressible gas), the fluid of that
// regime, the environment, the solution control and the current scenario. They are edited in the system window
// (system-window.js, which draws them with build); with nothing selected, the inspector (collapsed then, until its
// arrow opens it) shows a summary of them and the button that opens the window.
(function (root) {
  const PumpIt = root.PumpIt;
  const M = PumpIt.model, UI = PumpIt.ui, I = UI.inspector;
  const F = UI.format;
  const { el, section, qty, num, sel, seg, chk, text, readout, hint, wrap } = UI.forms;
  const app = PumpIt.app;
  const LIBRARY = PumpIt.fluids.LIBRARY;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.system.' + key, params);

  // the scenario the properties belong to (the line under the title)
  function meta() {
    const scn = app.scenario();
    return scn.parent ? tx('metaChild', { name: F.esc(scn.name), parent: F.esc(app.scenarioById(scn.parent).name) }) : tx('metaBase', { name: F.esc(scn.name) });
  }

  // what the system still needs (the checklist items of the fluid and of the solution control), in the red box
  function missing(host) {
    const items = app.validation().items.filter((i) => (i.key === 'sys' || i.key === 'sol') && !i.ok);
    if (!items.length) return;
    const sct = section();
    sct.appendChild(el('div', { class: 'missing' }, t('inspector.missing', { items: F.esc(items.map((i) => i.detail || i.label).join('; ')) })));
    host.appendChild(sct);
  }

  // a quantity as typed
  const typed = (v) => (v && Number.isFinite(v.value) ? `${F.inputStr(v.value)} ${F.unit(v.unit)}` : '—');
  // the note of a choice: each option in bold, then what it means
  const choices = (options) => options.map(([name, text]) => `<b>${F.esc(name)}</b><br>${text}`).join('<br><br>');

  // ------------------------------------------------------------ the inspector with nothing selected

  I.panels.system = (host) => {
    I.head(host, tx('title'), '', meta());
    missing(host);
    const eff = app.eff(), sys = eff.system;
    const s = section(tx('summary'), { info: tx('hint') });
    s.appendChild(readout(tx('regime'), tx('regimes.' + sys.regime)));
    try {
      if (M.isCompressible(eff)) {
        const fl = PumpIt.fluids.evaluateGas(sys);
        s.appendChild(readout(tx('gasKind'), fl.name));
        s.appendChild(readout(tx('gasMode'), tx('gasModes.' + sys.gasMode)));
        s.appendChild(readout(tx('gasTemperature.' + sys.gasMode), typed(sys.fluidGas.T)));
      } else {
        const fl = PumpIt.fluids.evaluate(sys);
        s.appendChild(readout(tx('fluidKind'), fl.name));
        if (LIBRARY[sys.fluid.kind]) s.appendChild(readout(tx('temperature'), typed(sys.fluid.T)));
        s.appendChild(readout('ρ · μ', `${F.fmt(fl.rho, 5)} kg/m³ · ${F.fmt(fl.mu * 1e3, 4)} cP`));
      }
    } catch (e) { s.appendChild(hint(F.esc(e.message))); }
    s.appendChild(readout(tx('patm'), typed(sys.patm)));
    const b = el('button', { class: 'btn primary sys-open', type: 'button' }, F.esc(tx('open')));
    b.addEventListener('click', () => UI.systemWindow.open());
    s.appendChild(b);
    host.appendChild(s);
  };

  // ------------------------------------------------------------ the system window

  // on the left the regime and its fluid; on the right the environment, the solution control and the scenario
  function build(host) {
    const eff = app.eff();
    const scn = app.scenario();
    const k = 'sys';
    const gas = M.isCompressible(eff);
    missing(host);
    const left = el('div', { class: 'sys-col' }), right = el('div', { class: 'sys-col' });
    const cols = el('div', { class: 'sys-cols' });
    cols.append(left, right);
    host.appendChild(cols);

    // the regime chooses the calculation (R-01); each one keeps its own fluid (R-03)
    const s0 = section(tx('regime'), { info: choices(M.REGIMES.map((r) => [tx('regimes.' + r), tx(r === 'compressible' ? 'regimeHintGas' : 'regimeHintLiquid')])) });
    s0.appendChild(seg(k, 'regime', tx('regime'), M.REGIMES.map((r) => [r, tx('regimes.' + r)]), { bare: true }));
    left.appendChild(s0);

    if (gas) gasSections(left, eff); else left.appendChild(liquidSection(eff));

    const s2 = section(tx('environment'), { info: tx('flowHint') });
    s2.appendChild(qty(k, 'patm', tx('patm'), 'pressure'));
    s2.appendChild(num(k, 'gravity', tx('gravity'), { suffix: '× g₀' }));
    s2.appendChild(num(k, 'reLam', tx('reLam'), { int: true }));
    s2.appendChild(num(k, 'reTurb', tx('reTurb'), { int: true }));
    s2.appendChild(sel(k, 'laminarK', tx('laminarK'), [['craneFt', tx('craneFt')], ['pipeFt', tx('pipeFt')], ['none', tx('noCorrection')]]));
    right.appendChild(s2);

    const s3 = section(tx('solution'));
    const ks = 'sol';
    s3.appendChild(num(ks, 'tolRel', tx('tolRel')));
    s3.appendChild(num(ks, 'maxIter', tx('maxIter'), { int: true }));
    s3.appendChild(num(ks, 'relax', tx('relax')));
    s3.appendChild(chk(ks, 'adaptive', tx('adaptive')));
    s3.appendChild(chk(ks, 'checkMass', tx('checkMass')));
    right.appendChild(s3);

    const s4 = section(tx('scenario'));
    const notes = el('textarea', { id: 'scn-notes', rows: '3', style: 'width:100%;resize:vertical', placeholder: tx('notes'), 'aria-label': tx('notes') });
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
    right.appendChild(s4);
  }

  // the liquid: a library fluid by its temperature, or a user-defined one
  function liquidSection(eff) {
    const k = 'sys';
    const s1 = section(tx('fluid'));
    const lib = LIBRARY[eff.system.fluid.kind];
    // a library fluid: where its properties come from, and the range of the correlations
    const sources = lib ? tx('fluidSources', { sources: lib.sources, min: lib.range[0], max: lib.range[1] }) : null;
    s1.appendChild(sel(k, 'fluid.kind', tx('fluidKind'), Object.entries(LIBRARY).map(([kind, l]) => [kind, l.label]).concat([['user', tx('userDefined')]]), { info: sources }));
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
    } catch (e) { s1.appendChild(hint(F.esc(e.message))); }
    return s1;
  }

  // the gas: thermal model (R-04), a library gas or a custom one (R-10, R-11), and the design limits (R-41)
  function gasSections(host, eff) {
    const k = 'sys', sys = eff.system, g = sys.fluidGas;
    let fl = null, error = null;
    try { fl = PumpIt.fluids.evaluateGas(sys); } catch (e) { error = e; }
    const lib = PumpIt.fluids.gasById(g.gas);
    const s1 = section(tx('gas'));
    s1.appendChild(seg(k, 'gasMode', tx('gasMode'), M.GAS_MODES.map((m) => [m, tx('gasModes.' + m)]), { info: choices(M.GAS_MODES.map((m) => [tx('gasModes.' + m), tx('gasModeHint.' + m)])) }));
    // a library gas: where its data come from, its viscosity at the given temperature and the range
    const sources = lib && fl ? tx('gasSources', { mu: F.fmt(fl.mu * 1e3, 4) + ' cP', min: PumpIt.fluids.GAS_RANGE[0], max: PumpIt.fluids.GAS_RANGE[1] }) : null;
    s1.appendChild(gasKindField(g, sources));
    if (!lib) {
      s1.appendChild(text(k, 'fluidGas.name', tx('gasName')));
      s1.appendChild(num(k, 'fluidGas.MW', tx('molarMass'), { suffix: 'kg/kmol' }));
      s1.appendChild(num(k, 'fluidGas.k', tx('kRatio')));
      s1.appendChild(qty(k, 'fluidGas.mu', tx('gasViscosity'), 'viscosity'));
    }
    s1.appendChild(num(k, 'fluidGas.Z', tx('Z')));
    s1.appendChild(qty(k, 'fluidGas.T', tx('gasTemperature.' + sys.gasMode), 'temperature'));
    if (fl) {
      const a = Math.sqrt(fl.Z * fl.k * fl.R * fl.T);
      s1.appendChild(readout(tx('gasConstant'), F.fmt(fl.R, 5) + ' J/(kg·K)'));
      s1.appendChild(readout(tx('soundSpeed'), F.fmt(a, 4) + ' m/s'));
      s1.appendChild(readout(tx('normalDensity'), F.fmt(PumpIt.fluids.normalDensity(fl.MW), 5) + ' kg/m³'));
      if (lib) s1.appendChild(readout('MW · k', `${F.fmt(fl.MW, 6)} kg/kmol · ${F.fmt(fl.k, 4)}`));
    } else s1.appendChild(hint(F.esc(error.message)));
    host.appendChild(s1);

    const s2 = section(tx('gasLimits'), { info: tx('gasLimitsHint') });
    s2.appendChild(num(k, 'machLimit', tx('machLimit')));
    s2.appendChild(qty(k, 'gasVelLimit', tx('velLimit'), 'velocity'));
    host.appendChild(s2);
  }

  // which gas: a library gas, or a custom one that starts from the values of the gas chosen before
  function gasKindField(g, info) {
    const id = UI.forms.idOf('sys', 'fluidGas.gas');
    const opts = PumpIt.fluids.GASES.map((x) => [x.id, x.label]).concat([['custom', tx('customGas')]]);
    const s = el('select', { id }, opts.map(([v, l]) => F.option(v, l, v === g.gas)).join(''));
    s.addEventListener('change', () => {
      const lib = PumpIt.fluids.gasById(g.gas);
      if (s.value === 'custom' && lib) {
        let mu = g.mu;
        try { mu = { value: +(PumpIt.fluids.evaluateGas(app.eff().system).mu * 1e3).toPrecision(5), unit: 'cP' }; } catch (e) { /* keep the stored one */ }
        app.setVals('sys', [['fluidGas.gas', 'custom'], ['fluidGas.name', lib.label], ['fluidGas.MW', lib.MW], ['fluidGas.k', lib.k], ['fluidGas.mu', mu]]);
      } else app.setVal('sys', 'fluidGas.gas', s.value);
    });
    return wrap('sys', 'fluidGas.gas', tx('gasKind'), s, { info });
  }

  UI.systemForm = { build, meta };
})(typeof window !== 'undefined' ? window : globalThis);
