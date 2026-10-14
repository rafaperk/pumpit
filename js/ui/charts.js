// Gráficos em SVG: bomba × sistema e perfil ao longo de um caminho contínuo de tubos.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, F = HR.fmt, M = HR.model, H = HR.hyd;
  let app;
  const cache = { key: null, data: null };

  function init(a) { app = a; }

  function niceStep(range, n = 6) {
    const raw = range / n;
    const p = 10 ** Math.floor(Math.log10(raw));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }

  // gráfico de linhas genérico
  function lineChart(o) {
    const W = 880, Hh = 400, L = 70, R = 24, T = 18, B = 52;
    const all = o.series.flatMap((s) => s.pts).concat((o.points || []).map((p) => [p.x, p.y])).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (!all.length) return '<div class="empty">Sem dados para o gráfico.</div>';
    let x0 = o.xMin ?? Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]));
    let y0 = o.yMin ?? Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) { y1 += 1; y0 -= 1; }
    const xs = niceStep(x1 - x0), ys = niceStep(y1 - y0);
    x0 = Math.floor(x0 / xs) * xs; x1 = Math.ceil(x1 / xs) * xs;
    y0 = Math.floor(y0 / ys) * ys; y1 = Math.ceil(y1 / ys) * ys;
    const tick = (v, step) => { const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); return (+v.toFixed(d)).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−'); };
    const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
    const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (Hh - T - B);
    let g = '';
    for (let v = y0; v <= y1 + ys / 2; v += ys) g += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${tick(v, ys)}</text>`;
    for (let v = x0; v <= x1 + xs / 2; v += xs) g += `<line class="gridline" y1="${T}" y2="${Hh - B}" x1="${X(v)}" x2="${X(v)}" opacity=".5"/><text x="${X(v)}" y="${Hh - B + 17}" text-anchor="middle">${tick(v, xs)}</text>`;
    g += `<line class="axis" x1="${L}" x2="${W - R}" y1="${Hh - B}" y2="${Hh - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${Hh - B}"/>`;
    g += `<text class="axis-label" x="${(L + W - R) / 2}" y="${Hh - 10}" text-anchor="middle">${F.esc(o.xLabel)}</text>`;
    g += `<text class="axis-label" transform="translate(16 ${(T + Hh - B) / 2}) rotate(-90)" text-anchor="middle">${F.esc(o.yLabel)}</text>`;
    for (const s of o.series) {
      const pts = s.pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (!pts.length) continue;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
      g += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="${s.width || 2.4}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
      if (s.marker) g += pts.map((p) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.2" style="fill:${s.color}"/>`).join('');
    }
    for (const p of o.points || []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="6" style="fill:var(--panel);stroke:${p.color}" stroke-width="2.6"/>`;
      if (p.label) g += `<text x="${X(p.x) + 10}" y="${Y(p.y) - 10}" style="fill:var(--ink);font-weight:500">${F.esc(p.label)}</text>`;
    }
    const legend = o.series.filter((s) => s.name).map((s) => `<span><i style="background:${s.color}"></i>${F.esc(s.name)}</span>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${F.esc(o.title || 'Gráfico')}">${g}</svg><div class="chart-legend">${legend}</div>`;
  }

  // ------------------------------------------------------------ bomba × sistema
  function pumpChart(box, ctl, notes) {
    const eff = app.eff();
    const pumps = eff.junctions.filter((j) => j.type === 'pump');
    if (!pumps.length) { ctl.innerHTML = ''; box.innerHTML = '<div class="empty">O modelo não tem bombas.</div>'; notes.textContent = ''; return; }
    let pid = app.prefs.chartPump;
    if (!pumps.some((p) => p.id === pid)) pid = pumps[0].id;
    app.prefs.chartPump = pid;
    const qu = app.outUnit('chart.Q', 'volFlow'), hu = app.outUnit('chart.H', 'head');
    ctl.innerHTML = `<label>Bomba<select id="ch-pump">${pumps.map((p) => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>J${p.id} ${F.esc(p.name)}</option>`).join('')}</select></label>
      <label>Vazão<select id="ch-qu" class="unit-sel" data-t="chart" data-c="Q" data-cat="volFlow">${U.list('volFlow').map((u) => `<option${u === qu ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
      <label>Altura<select id="ch-hu" class="unit-sel" data-t="chart" data-c="H" data-cat="head">${U.list('head').map((u) => `<option${u === hu ? ' selected' : ''}>${u}</option>`).join('')}</select></label>`;
    if (!app.validation().ok) { box.innerHTML = '<div class="empty">Complete a lista de verificação para calcular a curva do sistema.</div>'; notes.textContent = ''; return; }
    const key = app.version + '|' + app.scenario().id + '|' + pid;
    if (cache.key !== key) { cache.key = key; cache.data = HR.solver.systemCurve(eff, pid, 20); }
    const d = cache.data;
    if (!d || !d.sys.length) { box.innerHTML = '<div class="empty">Não foi possível calcular a curva do sistema.</div>'; return; }
    const cq = (Q) => U.fromSI(Q, qu, 'volFlow'), ch = (h) => U.fromSI(h, hu, 'head');
    const res = app.currentResults();
    const pr = res && res.ok && res.pumps[pid];
    const op = pr ? [{ x: cq(pr.Q), y: ch(pr.dH), color: 'var(--sel)', label: `Operação: ${F.fmt(cq(pr.Q), 4)} ${qu} · ${F.fmt(ch(pr.dH), 4)} ${hu}` }] : [];
    const j = pumps.find((p) => p.id === pid);
    box.innerHTML = lineChart({
      title: 'Bomba × sistema', xLabel: `Vazão (${qu})`, yLabel: `Altura (${hu})`, xMin: 0, yMin: 0,
      series: (d.pump.length ? [
        { name: `Bomba a ${F.fmt(j.speed, 4)}%${j.nPumps > 1 ? ` (${j.nPumps} em paralelo)` : ''}`, pts: d.pump.map(([q, h]) => [cq(q), ch(h)]), color: 'var(--accent)' },
      ] : []).concat([
        { name: j.mode === 'fixedFlow' ? 'Sistema (altura necessária)' : 'Sistema', pts: d.sys.map(([q, h]) => [cq(q), ch(h)]), color: '#c0612b', dash: '7 5' },
      ]),
      points: op,
    });
    notes.innerHTML = `Curva do sistema obtida rodando o solver com vazão fixa na bomba em ${d.sys.length} pontos (o restante do modelo como está no cenário ${F.esc(app.scenario().name)}).${pr ? '' : ' Execute o modelo para marcar o ponto de operação.'}`;
  }

  // ------------------------------------------------------------ perfil
  function findPath(eff, a, b) {
    if (a === b) return [];
    const adj = new Map();
    for (const p of eff.pipes) {
      if (!adj.has(p.up)) adj.set(p.up, []);
      if (!adj.has(p.down)) adj.set(p.down, []);
      adj.get(p.up).push([p, p.down, true]);
      adj.get(p.down).push([p, p.up, false]);
    }
    const prev = new Map([[a, null]]);
    const queue = [a];
    while (queue.length) {
      const u = queue.shift();
      if (u === b) break;
      for (const [p, v, fwd] of adj.get(u) || []) {
        if (prev.has(v)) continue;
        prev.set(v, [u, p, fwd]);
        queue.push(v);
      }
    }
    if (!prev.has(b)) return null;
    const path = [];
    for (let v = b; prev.get(v); v = prev.get(v)[0]) path.unshift({ pipe: prev.get(v)[1], fwd: prev.get(v)[2] });
    return path;
  }

  function profileChart(box, ctl, notes) {
    const eff = app.eff();
    const js = eff.junctions;
    if (js.length < 2) { ctl.innerHTML = ''; box.innerHTML = '<div class="empty">Desenhe pelo menos duas junções ligadas por tubos.</div>'; return; }
    const pf = app.prefs.profile || {};
    let a = js.some((j) => j.id === pf.a) ? pf.a : js[0].id;
    let b = js.some((j) => j.id === pf.b) ? pf.b : js[js.length - 1].id;
    const what = pf.what || 'heads';
    app.prefs.profile = { a, b, what };
    const opt = (sel) => js.map((j) => `<option value="${j.id}"${j.id === sel ? ' selected' : ''}>J${j.id} ${F.esc(j.name)}</option>`).join('');
    const isHead = what === 'heads';
    const cat = isHead ? 'head' : 'pressure';
    const u = app.outUnit('profile.' + cat, cat);
    ctl.innerHTML = `<label>De<select id="pf-a">${opt(a)}</select></label><label>Até<select id="pf-b">${opt(b)}</select></label>
      <label>Grandeza<select id="pf-what"><option value="heads"${isHead ? ' selected' : ''}>Linhas de carga e cota</option><option value="pressure"${!isHead ? ' selected' : ''}>Pressões estática e de estagnação</option></select></label>
      <label>Unidade<select class="unit-sel" data-t="profile" data-c="${cat}" data-cat="${cat}">${U.list(cat).map((x) => `<option${x === u ? ' selected' : ''}>${x}</option>`).join('')}</select></label>`;
    const res = app.currentResults();
    if (!res || !res.ok) { box.innerHTML = '<div class="empty">Execute o modelo para traçar o perfil.</div>'; notes.textContent = ''; return; }
    const path = findPath(eff, a, b);
    if (!path || !path.length) { box.innerHTML = '<div class="empty">Não há caminho contínuo de tubos entre as duas junções.</div>'; notes.textContent = ''; return; }
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const cv = (v) => U.fromSI(v, u, cat, ctx);
    const lu = app.outUnit('profile.x', 'length');
    const ser = { a: [], b: [], z: [] };
    let s = 0;
    for (const { pipe, fwd } of path) {
      const r = res.pipes[pipe.id];
      const L = r.L;
      const st = fwd ? 'in' : 'out', en = fwd ? 'out' : 'in';
      const x0 = U.fromSI(s, lu, 'length'), x1 = U.fromSI(s + L, lu, 'length');
      if (isHead) {
        ser.a.push([x0, cv(r['HGL' + st])], [x1, cv(r['HGL' + en])]);
        ser.b.push([x0, cv(r['EGL' + st])], [x1, cv(r['EGL' + en])]);
        ser.z.push([x0, cv(r['z' + st])], [x1, cv(r['z' + en])]);
      } else {
        ser.a.push([x0, cv(r['P' + st])], [x1, cv(r['P' + en])]);
        ser.b.push([x0, cv(r['P0' + st])], [x1, cv(r['P0' + en])]);
      }
      s += L;
    }
    const series = isHead
      ? [{ name: 'HGL (piezométrica)', pts: ser.a, color: 'var(--accent)' }, { name: 'EGL (energia)', pts: ser.b, color: '#c0612b', dash: '6 4' }, { name: 'Cota do tubo', pts: ser.z, color: 'var(--ink-3)', width: 1.8 }]
      : [{ name: 'Pressão estática', pts: ser.a, color: 'var(--accent)' }, { name: 'Pressão de estagnação', pts: ser.b, color: '#c0612b', dash: '6 4' }];
    if (!isHead && Number.isFinite(res.fluid.pv)) series.push({ name: 'Pressão de vapor', pts: [[0, cv(res.fluid.pv)], [U.fromSI(s, lu, 'length'), cv(res.fluid.pv)]], color: 'var(--crit)', dash: '2 4', width: 1.6 });
    box.innerHTML = lineChart({ title: 'Perfil', xLabel: `Distância ao longo do caminho (${lu})`, yLabel: `${isHead ? 'Altura' : 'Pressão'} (${u})`, series });
    notes.innerHTML = `Caminho: ${path.map(({ pipe }) => 'P' + pipe.id).join(' → ')} · ${F.fmt(U.fromSI(s, lu, 'length'), 5)} ${lu}. HGL e EGL usam pressão absoluta; degraus verticais são junções com perda ou ganho.`;
  }

  function render(kind, box, ctl, notes) {
    if (kind === 'profile') profileChart(box, ctl, notes);
    else pumpChart(box, ctl, notes);
  }

  HR.charts = { init, render, lineChart, findPath };
})(typeof window !== 'undefined' ? window : globalThis);
