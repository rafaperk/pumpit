// Branch view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const S = PumpIt.view3d.solid;
  const { fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.branch.' + key, params);
  // the nodes whose demand or inflow the user opened while it was zero, per model (another model starts closed)
  const openedIn = new WeakMap();
  const opened = () => { const m = PumpIt.app.model; if (!openedIn.has(m)) openedIn.set(m, new Set()); return openedIn.get(m); };

  JT.register('branch', {
    symbol: `<circle r="5.5" ${fill}/>`,
    // 3D views: a ball where the pipes meet (D-29)
    solid: { parts: [S.ball([0, 0, 0], 6.5, 'node')], reach: [S.ball([0, 0, 0], 6.5)] },

    // the flow usually only crosses a node: a zero demand or inflow stays hidden behind a link, so the field does not
    // look like something to fill in; a value other than zero (or one set in this scenario) shows the field
    form(s, ctx) {
      const { key, f } = ctx;
      const app = PumpIt.app, v = app.getVal(key, 'source');
      if (opened().has(key) || !v || v.value !== 0 || app.isOv(key, 'source')) {
        s.appendChild(f.qty(key, 'source', tx('form.source'), 'flow', { info: tx('form.sourceHint') }));
        JT.shared.sourceTemperature(s, ctx);
        return;
      }
      const b = PumpIt.ui.dom.el('button', { class: 'link-btn', type: 'button' }, PumpIt.ui.format.esc(tx('form.open')));
      b.addEventListener('click', () => {
        opened().add(key);
        PumpIt.ui.inspector.render();
        const inp = document.getElementById(('f-' + key + '-source').replace(/[^a-zA-Z0-9_-]/g, '_'));
        if (inp) { inp.focus(); inp.select(); }
      });
      s.appendChild(b);
    },

    summary: (j, q) => (j.source && j.source.value ? tx('summary', { flow: q(j.source) }) : ''),

    // listed as a boundary only when it has a source or a demand
    boundaryFlow: (r) => (Math.abs(r.net) > 1e-12 ? r.net : null),
  });
})(typeof window !== 'undefined' ? window : globalThis);
