// Reservoir: free liquid surface at a given level and surface pressure (a fixed-pressure node).
// Each pipe connects at the bottom (the junction elevation) or where its row of the per-pipe table says: at an elevation
// (pipeK[pid].elev) or, with connBy 'depth', at a depth below the liquid surface (pipeK[pid].depth), which then follows
// the surface when the level changes. A pipe above the liquid level discharges in free fall.
(function (root) {
  const PumpIt = root.PumpIt;
  const { t } = PumpIt.i18n;
  const q = PumpIt.model.q;

  PumpIt.junctionTypes.register({
    type: 'reservoir', order: 10, group: 'boundary',
    pipes: [1, 25], multi: true, ref: true,

    defaults: () => ({ liquidElev: q(5, 'm'), surfP: q(0, 'kgf/cm²(g)'), connBy: 'elevation', pipeK: {} }),

    validate(j, miss, { fin, gasP }) {
      if (!fin(j.liquidElev)) miss.push(t('junctions.reservoir.check.liquidElev'));
      if (!fin(j.surfP)) miss.push(t('junctions.reservoir.check.surfP'));
      gasP(j.surfP, 'junctions.reservoir.check.gasP');
    },

    // only the field of the reference in use counts (a model without connBy gives elevations)
    pipeEndElevation(j, pk, si) {
      const fin = (x) => x && Number.isFinite(x.value);
      if (j.connBy === 'depth') return fin(pk && pk.depth) && fin(j.liquidElev) ? si(j.liquidElev, 'length') - si(pk.depth, 'length') : undefined;
      return fin(pk && pk.elev) ? si(pk.elev, 'length') : undefined;
    },

    buildNode: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true }),

    // time simulation: an infinite reservoir takes tables of its level and of its surface pressure; a finite tank
    // (j.tank, src/core/time/tanks.js) has its level calculated, and only its surface pressure follows a table; in a closed
    // tank the gas gives that pressure, and a table drives the pressure of its relief. For a gas (ctx.gas), a finite vessel
    // (j.vessel, src/core/time/vessels.js) has its pressure calculated and takes no table
    time: {
      tank: true,
      quantities(j, ctx = {}) {
        const surfP = { what: 'surfP', cat: 'pressure', steady: (x, si) => si(x.surfP, 'pressure'), apply: (jc, v) => { jc.surfP = q(v, 'Pa(a)'); } };
        const level = { what: 'level', cat: 'length', steady: (x, si) => si(x.liquidElev, 'length'), apply: (jc, v) => { jc.liquidElev = q(v, 'm'); } };
        if (ctx.gas) return PumpIt.time.vessels.isFinite(j) ? [] : [level, surfP];
        if (PumpIt.time.tanks.isClosed(j)) {
          const given = (x) => x.tank.gas && x.tank.gas.pMax && Number.isFinite(x.tank.gas.pMax.value);
          return [{ what: 'pMax', cat: 'pressure', min: 0, steady: (x, si) => (given(x) ? si(x.tank.gas.pMax, 'pressure') : NaN), apply: (jc, v) => { jc.tank.gas.pMax = q(v, 'Pa(a)'); } }];
        }
        if (PumpIt.time.tanks.isFinite(j)) return [surfP];
        return [level, surfP];
      },
    },

    // compressible mode: a vessel of gas at rest, its pressure a stagnation pressure at the level of the reference
    // (§10.4), its temperature that of the gas it supplies
    gas: {
      node: (j, net) => net.addNode({ kind: 'fixed', value: net.si(j.surfP, 'pressure'), pk: 'stagnation', z: net.si(j.liquidElev, 'length'), jid: j.id, isRes: true, T0: net.sourceT(j) }),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
