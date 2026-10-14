// Ficha de dados do clique direito: os números principais do objeto, nas unidades padrão de saída.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, F = HR.fmt, M = HR.model;

  function build(app, hit) {
    const key = (hit.kind === 'pipe' ? 'p:' : 'j:') + hit.id;
    const o = app.effObj(key);
    if (!o) return null;
    const res = app.okResults();
    const ctx = res ? { rho: res.fluid.rho, patm: res.patm } : { patm: U.PATM };
    const unit = (cat) => app.outUnit('info', cat);
    const out = (v, cat, sig = 4) => (Number.isFinite(v) ? `${F.fmt(F.conv(v, cat, unit(cat), ctx), sig)} ${unit(cat)}` : '—');
    const inp = (qt) => (qt && Number.isFinite(qt.value) ? `${F.fmt(qt.value, 5)} ${qt.unit}` : '—');
    const rows = [];
    const add = (label, value, strong) => rows.push({ label, value, strong });
    let title, sub;

    if (hit.kind === 'pipe') {
      title = `P${o.id}`;
      sub = `Tubo · J${o.up} → J${o.down}${o.name ? ' · ' + o.name : ''}`;
      const r = res && res.pipes[o.id];
      add('Comprimento', inp(o.length));
      if (o.material.kind === 'steel') add('Diâmetro nominal', `${o.material.nps}" Sch. ${o.material.sch}`);
      if (o.geometry.kind === 'circular') add('Diâmetro interno', inp(o.geometry.d));
      if (r) {
        add('Elevação inicial / final', `${out(r.zin, 'length')} / ${out(r.zout, 'length')}`);
        if (r.isolated) { add('Situação', 'trecho isolado, vazão zero'); return { title, sub, rows }; }
        add('Vazão', out(Math.abs(r.Q), 'volFlow'), true);
        add('Velocidade', out(Math.abs(r.V), 'velocity'), true);
        add('Faixa de velocidade', HR.data.velocityBand(r.V));
        add('Perda de carga', out(r.hL, 'head'), true);
        add('Queda de pressão total', out(r.dP0, 'dp'));
        add('P estagnação entrada', out(r.P0in, 'pressure'));
        add('P estagnação saída', out(r.P0out, 'pressure'));
        add('P estática entrada / saída', `${out(r.Pin, 'pressure')} / ${F.fmt(F.conv(r.Pout, 'pressure', unit('pressure'), ctx), 4)}`);
        add('Reynolds · f Darcy', `${F.fmt(r.Re, 4)} · ${F.fmt(r.f, 4)} (${r.regime})`);
        add('K acessórios', F.fmt(r.K, 4));
        if (r.m < 0) add('Sentido', 'contrário ao de referência');
      } else {
        add('Acessórios', String((o.fittings || []).reduce((s, f) => s + (f.qty || 0), 0)));
      }
      return { title, sub, rows };
    }

    const t = M.JT[o.type];
    title = `J${o.id}`;
    sub = `${t.label}${o.name ? ' · ' + o.name : ''}`;
    const r = res && res.junctions[o.id];
    add('Elevação', inp(o.elevation));
    switch (o.type) {
      case 'reservoir': add('Nível do líquido', inp(o.liquidElev)); add('Pressão na superfície', inp(o.surfP)); break;
      case 'pressure': add('Pressão imposta', `${inp(o.P)} (${o.ptype === 'static' ? 'estática' : 'estagnação'})`); break;
      case 'flow': add('Vazão imposta', `${inp(o.Q)} ${o.dir === 'in' ? 'entrando' : 'saindo'}`); break;
      case 'exitvalve': add('Pressão residual de saída', inp(o.Pout)); break;
      case 'control': add('Ajuste', o.ctype === 'FCV' ? inp(o.setQ) : o.ctype === 'PDCV' ? inp(o.setDP) : inp(o.setP)); break;
    }
    if (!r) { if (!res) add('Resultados', 'sem cálculo: complete a lista de verificação'); return { title, sub, rows }; }
    if (r.isolated) { add('Situação', 'isolada'); return { title, sub, rows }; }

    const pr = res.pumps[o.id], vr = res.valves[o.id];
    if (pr) {
      add('Vazão', out(Math.abs(pr.Q), 'volFlow'), true);
      add('Altura manométrica', out(pr.dH, 'head'), true);
      add('Ganho de pressão', out(pr.dP, 'dp'));
      add('P sucção (estagnação)', out(r.P0in, 'pressure'));
      add('P descarga (estagnação)', out(r.P0out, 'pressure'));
      if (Number.isFinite(pr.speed)) add('Velocidade', F.fmt(pr.speed, 4) + ' %');
      add('Potência hidráulica', out(pr.Pideal, 'power'));
      if (Number.isFinite(pr.Pshaft) && !pr.etaAssumed) { add('Eficiência', F.fmt(pr.eta * 100, 3) + ' %'); add('Potência no eixo', out(pr.Pshaft, 'power')); }
      if (Number.isFinite(pr.NPSHA)) add('NPSH disponível', out(pr.NPSHA, 'head'));
      if (Number.isFinite(pr.NPSHR)) add('NPSH requerido', out(pr.NPSHR, 'head'));
      return { title, sub, rows };
    }
    if (o.type === 'exitvalve' || o.type === 'spray') {
      add('Vazão descarregada', out(Math.abs(r.Q), 'volFlow'), true);
      add('P estagnação na entrada', out(r.P0in, 'pressure'), true);
      add(o.type === 'exitvalve' ? 'Perda na válvula' : 'ΔP no bocal', out(r.dP, 'dp'));
      if (vr && Number.isFinite(vr.Cv)) add('Cv equivalente', F.fmt(vr.Cv, 4));
      return { title, sub, rows };
    }
    if (t.multi) {
      add('P estagnação', out(r.P0in, 'pressure'), true);
      if (o.type !== 'reservoir') add('P estática', out(r.Pin, 'pressure'));
      add('Vazão através', out(r.m / res.fluid.rho, 'volFlow'), true);
      if (o.type === 'reservoir') add('Vazão líquida para a rede', out(r.net / res.fluid.rho, 'volFlow'));
      add('HGL', out(r.HGL, 'head'));
      return { title, sub, rows };
    }
    add('Vazão', out(Math.abs(r.Q), 'volFlow'), true);
    add('Queda de pressão', out(r.dP, 'dp'), true);
    add('Perda de carga', out(r.dP / (res.fluid.rho * res.g), 'head'));
    add('P estagnação entrada', out(r.P0in, 'pressure'));
    add('P estagnação saída', out(r.P0out, 'pressure'));
    if (Number.isFinite(r.K)) add('K efetivo', F.fmt(r.K, 4));
    if (vr) { add('Estado', vr.state); if (Number.isFinite(vr.Cv)) add('Cv efetivo', F.fmt(vr.Cv, 4)); }
    return { title, sub, rows };
  }

  function html(card) {
    return `<div class="info-head"><b class="num">${F.esc(card.title)}</b><span>${F.esc(card.sub)}</span></div>
      <dl class="info-rows">${card.rows.map((r) => `<dt>${F.esc(r.label)}</dt><dd class="${r.strong ? 'strong' : ''}">${F.esc(r.value)}</dd>`).join('')}</dl>`;
  }

  HR.infocard = { build, html };
})(typeof window !== 'undefined' ? window : globalThis);
