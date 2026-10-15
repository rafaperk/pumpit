// Assigned pressure view.
(function (root) {
  const PumpIt = root.PumpIt;
  const JT = PumpIt.ui.junctionTypes;
  const { stroke, fill } = JT.SVG;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('junctions.pressure.' + key, params);
  const kind = (j) => tx(j.ptype === 'static' ? 'kind.static' : 'kind.stagnation');

  JT.register('pressure', {
    symbol: `<circle r="11" ${stroke}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="13" ${fill}>P</text>`,

    form(s, { key, f }) {
      s.appendChild(f.sel(key, 'ptype', tx('form.ptype'), [['stagnation', tx('form.stagnation')], ['static', tx('form.static')]]));
      s.appendChild(f.qty(key, 'P', tx('form.P'), 'pressure'));
    },

    summary: (j, q) => tx('summary', { pressure: q(j.P), kind: kind(j) }),

    infoInputs(j, add, inp) {
      add(tx('info.P'), tx('summary', { pressure: inp(j.P), kind: kind(j) }));
    },

    boundaryFlow: (r) => r.net,
  });
})(typeof window !== 'undefined' ? window : globalThis);
