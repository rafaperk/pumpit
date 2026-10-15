// Assigned flow view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.flow.' + key, params);
  const dir = (j) => tx(j.dir === 'in' ? 'dir.in' : 'dir.out');

  JT.register('flow', {
    symbol: `<circle r="11" ${stroke}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="13" ${fill}>Q</text>`,

    form(s, { key, f }) {
      s.appendChild(f.qty(key, 'Q', tx('form.Q'), 'flow'));
      s.appendChild(f.sel(key, 'dir', tx('form.dir'), [['in', tx('form.in')], ['out', tx('form.out')]]));
    },

    summary: (j, q) => tx('summary', { flow: q(j.Q), dir: dir(j) }),

    infoInputs(j, add, inp) {
      add(tx('info.Q'), tx('summary', { flow: inp(j.Q), dir: dir(j) }));
    },

    boundaryFlow: (r) => r.net,
  });
})(typeof window !== 'undefined' ? window : globalThis);
