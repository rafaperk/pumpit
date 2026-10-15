// Uniqueness check and isolated parts (specification section 7): after removing fixed-flow elements, every
// connected part needs a pressure reference. Parts without a reference and without any flow source are
// isolated (zero flow, undefined pressure); parts with a flow source but no reference are an error.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;

  function analyze(prep) {
    const { nodes, links } = prep;
    const par = nodes.map((_, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const lk of links) if (lk.mode === 'loss' || lk.mode === 'dP') par[find(lk.a)] = find(lk.b);
    const ref = new Set(), active = new Set();
    nodes.forEach((n, i) => {
      if (n.kind !== 'free') ref.add(find(i));
      if (n.demand) active.add(find(i));
    });
    for (const lk of links) {
      if (lk.mode === 'pDown') { ref.add(find(lk.b)); active.add(find(lk.a)); }
      if (lk.mode === 'pUp') { ref.add(find(lk.a)); active.add(find(lk.b)); }
      if (lk.mode === 'fixedFlow' && lk.value) { active.add(find(lk.a)); active.add(find(lk.b)); }
    }
    const errors = [];
    const isoRoots = new Set();
    const comps = new Map();
    nodes.forEach((n, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(n); });
    for (const [r, ns] of comps) {
      if (ref.has(r)) continue;
      if (active.has(r)) {
        const js = [...new Set(ns.map((n) => 'J' + n.jid))].join(', ');
        errors.push(t('core.solver.noReference', { junctions: js }));
      } else isoRoots.add(r);
    }
    nodes.forEach((n, i) => { n.isolated = isoRoots.has(find(i)); });
    for (const lk of links) lk.isolated = (lk.mode === 'loss' || lk.mode === 'dP') && nodes[lk.a].isolated;
    return errors;
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { analyze });
})(typeof window !== 'undefined' ? window : globalThis);
