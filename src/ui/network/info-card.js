// Right-click data card: the main numbers of an object, in the default output units. Junction-type specific
// rows come from the junction views (infoInputs, infoResults).
(function (root) {
  const PumpIt = root.PumpIt;
  const U = PumpIt.units, M = PumpIt.model, UI = PumpIt.ui;
  const F = UI.format;
  const views = UI.junctionTypes;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('network.info.' + key, params);

  function build(app, hit) {
    const key = (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;
    const o = app.effObj(key);
    if (!o) return null;
    const res = app.okResults();
    const ctx = res ? { rho: res.fluid.rho, patm: res.patm } : { patm: U.PATM };
    const unit = (cat) => app.outUnit('info', cat);
    const out = (v, cat, sig = 4) => (Number.isFinite(v) ? `${F.fmt(F.conv(v, cat, unit(cat), ctx), sig)} ${F.unit(unit(cat))}` : '—');
    const inp = (qt) => (qt && Number.isFinite(qt.value) ? `${F.fmt(qt.value, 5)} ${F.unit(qt.unit)}` : '—');
    const rows = [];
    const add = (label, value, strong) => rows.push({ label, value, strong });
    let title, sub;

    if (hit.kind === 'pipe') {
      title = `P${o.id}`;
      sub = tx('pipeSub', { up: o.up, down: o.down }) + (o.name ? ' · ' + o.name : '');
      const r = res && res.pipes[o.id];
      add(tx('length'), inp(o.length));
      if (o.material.kind === 'steel') add(tx('nominalSize'), `${o.material.nps}" Sch. ${o.material.sch}`);
      if (o.geometry.kind === 'circular') add(tx('innerDiameter'), inp(o.geometry.d));
      if (r) {
        add(tx('elevations'), `${out(r.zin, 'length')} / ${out(r.zout, 'length')}`);
        if (r.isolated) { add(tx('situation'), tx('isolatedPipe')); return { title, sub, rows }; }
        add(tx('flow'), out(Math.abs(r.Q), 'volFlow'), true);
        add(tx('velocity'), out(Math.abs(r.V), 'velocity'), true);
        add(tx('velocityBand'), PumpIt.data.velocityBand(r.V));
        add(tx('headLoss'), out(r.hL, 'head'), true);
        add(tx('totalDrop'), out(r.dP0, 'dp'));
        add(tx('stagnationIn'), out(r.P0in, 'pressure'));
        add(tx('stagnationOut'), out(r.P0out, 'pressure'));
        add(tx('staticInOut'), `${out(r.Pin, 'pressure')} / ${F.fmt(F.conv(r.Pout, 'pressure', unit('pressure'), ctx), 4)}`);
        add(tx('reynolds'), `${F.fmt(r.Re, 4)} · ${F.fmt(r.f, 4)} (${r.regime})`);
        add(tx('fittingsK'), F.fmt(r.K, 4));
        if (r.m < 0) add(tx('direction'), tx('reversed'));
      } else {
        add(tx('fittings'), String((o.fittings || []).reduce((s, f) => s + (f.qty || 0), 0)));
      }
      return { title, sub, rows };
    }

    const def = M.JT[o.type];
    const v = views.get(o.type);
    title = `J${o.id}`;
    sub = `${def.label}${o.name ? ' · ' + o.name : ''}`;
    const r = res && res.junctions[o.id];
    add(tx('elevation'), inp(o.elevation));
    if (v.infoInputs) v.infoInputs(o, add, inp);
    if (!r) { if (!res) add(tx('results'), tx('noResults')); return { title, sub, rows }; }
    if (r.isolated) { add(tx('situation'), tx('isolatedJunction')); return { title, sub, rows }; }

    const vr = res.valves[o.id];
    // type-specific result rows; returning false falls back to the common rows below
    if (v.infoResults && v.infoResults(add, r, { id: o.id, j: o, res, vr, out }) !== false) return { title, sub, rows };
    if (def.multi) {
      add(tx('stagnation'), out(r.P0in, 'pressure'), true);
      add(tx('static'), out(r.Pin, 'pressure'));
      add(tx('flowThrough'), out(r.m / res.fluid.rho, 'volFlow'), true);
      add(tx('hgl'), out(r.HGL, 'head'));
      return { title, sub, rows };
    }
    add(tx('flow'), out(Math.abs(r.Q), 'volFlow'), true);
    add(tx('pressureDrop'), out(r.dP, 'dp'), true);
    add(tx('headLoss'), out(r.dP / (res.fluid.rho * res.g), 'head'));
    add(tx('stagnationIn'), out(r.P0in, 'pressure'));
    add(tx('stagnationOut'), out(r.P0out, 'pressure'));
    if (Number.isFinite(r.K)) add(tx('effectiveK'), F.fmt(r.K, 4));
    if (vr) { add(tx('state'), vr.state); if (Number.isFinite(vr.Cv)) add(tx('effectiveCv'), F.fmt(vr.Cv, 4)); }
    return { title, sub, rows };
  }

  function html(card) {
    return `<div class="info-head"><b class="num">${F.esc(card.title)}</b><span>${F.esc(card.sub)}</span></div>
      <dl class="info-rows">${card.rows.map((r) => `<dt>${F.esc(r.label)}</dt><dd class="${r.strong ? 'strong' : ''}">${F.esc(r.value)}</dd>`).join('')}</dl>`;
  }

  PumpIt.ui.infoCard = { build, html };
})(typeof window !== 'undefined' ? window : globalThis);
