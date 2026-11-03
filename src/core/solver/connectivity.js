// Uniqueness check and isolated parts (specification section 7): after removing fixed-flow elements, every
// connected part needs a pressure reference. Parts without a reference and without any flow source are
// isolated (zero flow, undefined pressure); parts with a flow source but no reference are an error.
// With opts.dropUnsupplied (the time simulation, docs/time-simulation.md) such a part is isolated instead, the links
// that impose a flow or a pressure on it carry no flow, and its imposed flows go to prep.unsupplied: [{ jid, m }]
// (m in kg/s, positive when it leaves the network).
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;

  function analyze(prep, opts = {}) {
    const { nodes, links } = prep;
    // links that tie the pressures of their two nodes (a compressor of fixed ratio of the compressible mode says so with `joins`)
    const ties = (lk) => lk.mode === 'loss' || lk.mode === 'dP' || lk.joins;
    const off = new Set(); // links left without flow beside a part without supply (dropUnsupplied)
    let find, errors, isoRoots, dropRoots;
    // a part without supply takes away the links that gave a reference to another part: again until nothing changes
    for (;;) {
      const par = nodes.map((_, i) => i);
      find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      for (const lk of links) if (ties(lk)) par[find(lk.a)] = find(lk.b);
      const ref = new Set(), active = new Set();
      nodes.forEach((n, i) => {
        if (n.kind !== 'free') ref.add(find(i));
        if (n.demand) active.add(find(i));
      });
      for (const lk of links) {
        if (off.has(lk)) continue;
        if (lk.mode === 'pDown') { ref.add(find(lk.b)); active.add(find(lk.a)); }
        if (lk.mode === 'pUp') { ref.add(find(lk.a)); active.add(find(lk.b)); }
        if (lk.mode === 'fixedFlow' && lk.value) { active.add(find(lk.a)); active.add(find(lk.b)); }
      }
      errors = []; isoRoots = new Set(); dropRoots = new Set();
      const comps = new Map();
      nodes.forEach((n, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(n); });
      for (const [r, ns] of comps) {
        if (ref.has(r)) continue;
        if (active.has(r) && opts.dropUnsupplied) { dropRoots.add(r); isoRoots.add(r); }
        else if (active.has(r)) {
          const js = [...new Set(ns.map((n) => 'J' + n.jid))].join(', ');
          errors.push(t('core.solver.noReference', { junctions: js }));
        } else isoRoots.add(r);
      }
      let more = false;
      for (const lk of links) {
        if (off.has(lk) || ties(lk) || lk.mode === 'closed') continue;
        if (dropRoots.has(find(lk.a)) || dropRoots.has(find(lk.b))) { off.add(lk); more = true; }
      }
      if (!more) break;
    }
    nodes.forEach((n, i) => { n.isolated = isoRoots.has(find(i)); });
    for (const lk of links) lk.isolated = (ties(lk) && nodes[lk.a].isolated) || off.has(lk);
    if (opts.dropUnsupplied) {
      const out = [];
      nodes.forEach((n, i) => { if (n.demand && dropRoots.has(find(i))) out.push({ jid: n.jid, m: n.demand }); });
      for (const lk of off) if (lk.mode === 'fixedFlow' && lk.value && lk.jid !== undefined) out.push({ jid: lk.jid, m: Math.abs(lk.value) });
      prep.unsupplied = out;
    }
    return errors;
  }

  PumpIt.solver = Object.assign(PumpIt.solver || {}, { analyze });
})(typeof window !== 'undefined' ? window : globalThis);
