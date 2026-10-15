// Automatic calculation (there is no Run button). Any input change clears every result and recalculates the
// current scenario at once, so outputs of an outdated model are never shown.
(function (root) {
  const PumpIt = root.PumpIt;
  const app = PumpIt.app;

  // calculates the current scenario when its checklist is complete
  app.recalc = () => {
    const sid = app.model.scenarios.current;
    if (!app.validation().ok) { delete app.results[sid]; return null; }
    const t0 = performance.now();
    const r = PumpIt.solver.run(app.eff());
    r.elapsed = performance.now() - t0;
    app.results[sid] = r;
    return r;
  };

  // input change: clears the results, recalculates and redraws
  app.changed = () => {
    app.version++;
    app.results = {};
    app.save();
    app.recalc();
    app.renderAll();
  };
})(window);
