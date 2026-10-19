// Inspector panel of a pipe: quick results, identification, geometry, friction, fittings and closed state.
(function (root) {
  const PumpIt = root.PumpIt;
  const D = PumpIt.data, UI = PumpIt.ui, I = UI.inspector;
  const F = UI.format;
  const { el, section, qty, num, sel, chk, text, readout, hint } = UI.forms;
  const app = PumpIt.app;
  const { t } = PumpIt.i18n;
  const tx = (key, params) => t('inspector.pipe.' + key, params);

  I.panels.pipe = (host, id) => {
    const key = 'p:' + id;
    const p = app.effObj(key);
    if (!p) return I.panels.system(host);
    const h = I.head(host, tx('title'), 'P' + id, `J${p.up} → J${p.down}`);
    const rev = el('button', { class: 'btn small', type: 'button' }, tx('reverse'));
    rev.addEventListener('click', () => app.reversePipe(id));
    h.querySelector('.meta').appendChild(rev);
    I.missingBox(host, key);
    quickResults(host, id);

    const s0 = section(t('inspector.identification'));
    s0.appendChild(text(key, 'name', t('inspector.name')));
    host.appendChild(s0);

    const s1 = section(tx('geometry'));
    s1.appendChild(qty(key, 'length', tx('length'), 'length'));
    s1.appendChild(sel(key, 'material.kind', tx('material'), [['user', tx('userDefined')], ['steel', tx('steel')]]));
    const steel = p.material.kind === 'steel';
    if (steel) {
      s1.appendChild(sel(key, 'material.nps', tx('nps'), D.STEEL_NPS.map((n) => [n, n + '"'])));
      s1.appendChild(sel(key, 'material.sch', tx('schedule'), D.SCHEDULES.map((x) => [x, x])));
    }
    s1.appendChild(sel(key, 'geometry.kind', tx('section'), ['circular', 'annulus', 'rectangular', 'noncircular'].map((g) => [g, tx('sections.' + g)]), { disabled: steel }));
    const g = p.geometry.kind;
    if (g === 'circular') s1.appendChild(qty(key, 'geometry.d', tx('innerDiameter'), 'length', { disabled: steel }));
    if (g === 'annulus') { s1.appendChild(qty(key, 'geometry.dOuter', tx('outerDiameter'), 'length')); s1.appendChild(qty(key, 'geometry.dInner', tx('innerDiameter'), 'length')); }
    if (g === 'rectangular') { s1.appendChild(qty(key, 'geometry.width', tx('width'), 'length')); s1.appendChild(qty(key, 'geometry.height', tx('height'), 'length')); }
    if (g === 'noncircular') { s1.appendChild(qty(key, 'geometry.area', tx('area'), 'area')); s1.appendChild(qty(key, 'geometry.perim', tx('perimeter'), 'length')); }
    s1.appendChild(num(key, 'idReduction', tx('idReduction'), { suffix: '%' }));
    s1.appendChild(num(key, 'nParallel', tx('nParallel'), { int: true }));
    const gm = I.pipeGeom(p);
    if (gm) s1.appendChild(readout(tx('hydraulicDiameter'), F.fmt(gm.Dh * 1000, 5) + ' mm'));
    host.appendChild(s1);

    const s2 = section(tx('friction'));
    s2.appendChild(sel(key, 'friction.model', tx('model'), ['roughness', 'relRoughness', 'smooth', 'explicitF', 'hw', 'frictionless'].map((m) => [m, tx('models.' + m)])));
    const fm = p.friction.model;
    if (fm === 'roughness') {
      const preset = el('select', { class: 'unit', 'aria-label': tx('typicalRoughness'), id: 'rough-preset', title: tx('typicalValues') },
        `<option value="">${tx('typical')}</option>` + D.ROUGHNESS.map((r, i) => `<option value="${i}">${F.esc(r.name)} — ${F.fmt(r.mm, 2)} mm</option>`).join(''));
      preset.addEventListener('change', () => {
        if (preset.value === '') return;
        app.setVal(key, 'friction.eps', { value: D.ROUGHNESS[+preset.value].mm, unit: 'mm' });
      });
      s2.appendChild(qty(key, 'friction.eps', tx('roughness'), 'length'));
      const f2 = el('div', { class: 'field' });
      f2.innerHTML = `<label for="rough-preset">${tx('typicalValue')}</label>`;
      const c = el('div', { class: 'ctl' }); preset.classList.remove('unit'); c.appendChild(preset); f2.appendChild(c);
      s2.appendChild(f2);
    }
    if (fm === 'relRoughness') s2.appendChild(num(key, 'friction.rel', 'ε/D'));
    if (fm === 'explicitF') s2.appendChild(num(key, 'friction.f', tx('darcyF')));
    if (fm === 'hw') s2.appendChild(num(key, 'friction.C', tx('hwC'), { info: tx('hwHint') }));
    host.appendChild(s2);

    host.appendChild(UI.fittingsEditor.build(key, p, gm));

    const s4 = section(tx('special'));
    s4.appendChild(chk(key, 'closed', tx('closed')));
    host.appendChild(s4);
  };

  function quickResults(host, id) {
    const res = app.okResults();
    if (!res || !res.pipes[id]) return;
    const r = res.pipes[id];
    const s = section(t('inspector.result'));
    if (r.isolated) { s.appendChild(hint(tx('isolated'))); host.appendChild(s); return; }
    if (res.regime === 'compressivel') { gasQuickResults(s, r, res); host.appendChild(s); return; }
    s.appendChild(readout(tx('quick.flow'), I.out(r.Q, 'volFlow')));
    s.appendChild(readout(tx('quick.velocity'), `${I.out(r.V, 'velocity')} · ${D.velocityBand(r.V)}`));
    s.appendChild(readout(tx('quick.reynolds'), `${F.fmt(r.Re, 4)} · ${F.fmt(r.f, 4)}`));
    s.appendChild(readout(tx('quick.staticInOut'), `${I.out(r.Pin, 'pressure')} / ${F.fmt(F.conv(r.Pout, 'pressure', app.outUnit('insp', 'pressure'), { patm: res.patm }))}`));
    s.appendChild(readout(tx('quick.dP0'), I.out(r.dP0, 'dp')));
    host.appendChild(s);
  }

  // a gas (R-25): mass and volume flows, and at both ends velocity, Mach number, static and stagnation pressures and the
  // temperature; the choking, when there is one
  function gasQuickResults(s, r, res) {
    const both = (a, b, cat) => `${I.out(a, cat)} / ${F.fmt(F.conv(b, cat, app.outUnit('insp', cat), { patm: res.patm }))}`;
    if (r.choked) s.appendChild(el('div', { class: 'missing' }, F.esc(tx('quick.choked'))));
    s.appendChild(readout(tx('quick.massFlow'), I.out(r.m, 'massFlow')));
    s.appendChild(readout(tx('quick.gasFlow'), `${I.out(r.Q, 'volFlow')} · ${I.out(r.QN, 'normFlow')}`));
    s.appendChild(readout(tx('quick.velocityInOut'), both(Math.abs(r.Vin), Math.abs(r.Vout), 'velocity')));
    s.appendChild(readout(tx('quick.machInOut'), `${F.fmt(r.Min, 4)} / ${F.fmt(r.Mout, 4)}`));
    s.appendChild(readout(tx('quick.staticInOut'), both(r.Pin, r.Pout, 'pressure')));
    s.appendChild(readout(tx('quick.stagnationInOut'), both(r.P0in, r.P0out, 'pressure')));
    s.appendChild(readout(tx('quick.temperatureInOut'), both(r.Tin, r.Tout, 'temperature')));
    s.appendChild(readout(tx('quick.reynolds'), `${F.fmt(r.Re, 4)} · ${F.fmt(r.f, 4)}`));
  }
})(typeof window !== 'undefined' ? window : globalThis);
