// Tabelas de dados do modelo e de resultados. Cada coluna de saída tem sua própria unidade,
// trocada a qualquer momento sem rodar de novo.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, F = HR.fmt, M = HR.model;
  let app;

  const LEVEL = { critical: 'Crítico', warning: 'Aviso', caution: 'Cautela' };

  // ------------------------------------------------------------ colunas de resultados
  const COLS = {
    pipes: [
      { k: 'id', l: 'Tubo', t: 'id' },
      { k: 'dn', l: 'Diâmetro nominal', t: 'txt' },
      { k: 'schTxt', l: 'Schedule', t: 'txt' },
      { k: 'zin', l: 'Elevação inicial', c: 'length', x: '0.00' },
      { k: 'zout', l: 'Elevação final', c: 'length', x: '0.00' },
      { k: 'Q', l: 'Vazão', c: 'volFlow', x: '0.00' },
      { k: 'V', l: 'Velocidade', c: 'velocity', x: '0.00' },
      { k: 'P0in', l: 'Pressão de estagnação na entrada', c: 'pressure', x: '0.000' },
      { k: 'P0out', l: 'Pressão de estagnação na saída', c: 'pressure', x: '0.000' },
      { k: 'K', l: 'K', x: '0.00' },
    ],
    junctions: [
      { k: 'id', l: 'Junção', t: 'id' }, { k: 'name', l: 'Nome', t: 'txt' }, { k: 'typeLabel', l: 'Tipo', t: 'txt' },
      { k: 'P0in', l: 'P0 entrada', c: 'pressure' }, { k: 'P0out', l: 'P0 saída', c: 'pressure' },
      { k: 'Pin', l: 'P estática entrada', c: 'pressure' }, { k: 'Pout', l: 'P estática saída', c: 'pressure' },
      { k: 'dP', l: 'ΔP0', c: 'dp' }, { k: 'K', l: 'K efetivo' }, { k: 'Qt', l: 'Vazão através', c: 'volFlow' },
      { k: 'HGL', l: 'HGL', c: 'head' }, { k: 'z', l: 'Cota', c: 'length' },
    ],
    pumps: [
      { k: 'id', l: 'Bomba', t: 'id' }, { k: 'name', l: 'Nome', t: 'txt' },
      { k: 'Q', l: 'Vazão', c: 'volFlow' },
      { k: 'dH', l: 'Altura manométrica', c: 'head' }, { k: 'dP', l: 'ΔP', c: 'dp' }, { k: 'speed', l: 'Velocidade (%)' },
      { k: 'etaPct', l: 'Eficiência (%)' }, { k: 'Pideal', l: 'Potência hidráulica', c: 'power' }, { k: 'Pshaft', l: 'Potência no eixo', c: 'power' },
      { k: 'NPSHA', l: 'NPSH disponível', c: 'head' }, { k: 'NPSHR', l: 'NPSH requerido', c: 'head' },
    ],
    valves: [
      { k: 'id', l: 'Válvula', t: 'id' }, { k: 'name', l: 'Nome', t: 'txt' }, { k: 'typeLabel', l: 'Tipo', t: 'txt' },
      { k: 'state', l: 'Estado', t: 'txt' }, { k: 'Q', l: 'Vazão', c: 'volFlow' }, { k: 'dP', l: 'ΔP0', c: 'dp' },
      { k: 'Pin', l: 'P estática entrada', c: 'pressure' }, { k: 'Cv', l: 'Cv efetivo' }, { k: 'K', l: 'K efetivo' },
    ],
  };

  function init(a) { app = a; }

  function unitSelect(table, col) {
    const u = app.outUnit(table + '.' + col.k, col.c);
    const units = U.list(col.c);
    return `<select class="unit-sel" data-t="${table}" data-c="${col.k}" data-cat="${col.c}" aria-label="Unidade de ${F.esc(col.l)}">${units.map((x) => `<option${x === u ? ' selected' : ''}>${F.esc(x)}</option>`).join('')}</select>`;
  }

  function rowsFor(table, res, eff) {
    const name = (k) => (M.getObj(eff, k) || {}).name || '';
    if (table === 'pipes') return eff.pipes.map((p) => {
      const r = res.pipes[p.id] || {};
      const dn = r.nps ? `${r.nps}"` : Number.isFinite(r.Dh) ? `DI ${F.fmt(r.Dh * 1000, 4)} mm` : '—';
      return Object.assign({ id: p.id, name: p.name, key: 'p:' + p.id }, r, { dn, schTxt: r.sch ? `Sch. ${r.sch}` : '—' });
    });
    if (table === 'junctions') return eff.junctions.map((j) => {
      const r = res.junctions[j.id] || {};
      return Object.assign({ id: j.id, name: j.name, key: 'j:' + j.id, typeLabel: M.JT[j.type].label, Qt: r.m / res.fluid.rho }, r);
    });
    if (table === 'pumps') return Object.entries(res.pumps).map(([id, r]) => Object.assign({ id: +id, name: name('j:' + id), key: 'j:' + id, etaPct: r.etaAssumed ? NaN : r.eta * 100 }, r));
    if (table === 'valves') return Object.entries(res.valves).map(([id, r]) => Object.assign({ id: +id, name: name('j:' + id), key: 'j:' + id, typeLabel: r.ctype ? M.JT.control.label + ' ' + r.ctype : M.JT[r.type].label }, r));
    return [];
  }

  function cellValue(col, r, ctx, table) {
    const v = r[col.k];
    if (col.t === 'id') return (table === 'pipes' ? 'P' : 'J') + r.id;
    if (col.t === 'txt') return v ?? '';
    if (v === undefined) return '—';
    const x = col.c ? F.conv(v, col.c, app.outUnit(table + '.' + col.k, col.c), ctx) : v;
    // colunas com formato fixo (as da planilha de tubos) mostram as mesmas casas decimais do Excel
    if (col.x && Number.isFinite(x)) { const d = (col.x.split('.')[1] || '').length; return x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−'); }
    return F.fmt(x, 5);
  }

  function resultTable(table, res, eff) {
    const cols = COLS[table];
    const rows = rowsFor(table, res, eff);
    if (!rows.length) return `<div class="empty">Nenhum item deste tipo no modelo.</div>`;
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const th = cols.map((c) => `<th class="${c.t ? 'txt' : ''}">${F.esc(c.l)}${c.c ? unitSelect(table, c) : ''}</th>`).join('');
    const body = rows.map((r) => `<tr data-key="${r.key}">${cols.map((c) => {
      const txt = cellValue(c, r, ctx, table);
      return `<td class="${c.t ? 'txt' : 'num'}${txt === '—' ? ' na' : ''}">${F.esc(txt)}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="table-scroll"><table class="grid" data-table="${table}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // TSV para colar em planilha
  function tableTSV(table, res, eff) {
    const cols = COLS[table];
    const rows = rowsFor(table, res, eff);
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const head = cols.map((c) => c.c ? `${c.l} (${app.outUnit(table + '.' + c.k, c.c)})` : c.l).join('\t');
    const lines = rows.map((r) => cols.map((c) => {
      if (c.t) return cellValue(c, r, ctx, table);
      const v = r[c.k];
      const x = c.c ? F.conv(v, c.c, app.outUnit(table + '.' + c.k, c.c), ctx) : v;
      const d = c.x ? (c.x.split('.')[1] || '').length : -1;
      return Number.isFinite(x) ? (d >= 0 ? x.toFixed(d) : String(+x.toPrecision(8))).replace('.', ',') : '';
    }).join('\t'));
    return [head].concat(lines).join('\n');
  }

  // planilha de tubos para o Excel: mesmas colunas e ordem da tabela, números reais
  function pipeSheet(res, eff) {
    const cols = COLS.pipes;
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const widths = { id: 8, dn: 16, schTxt: 11, zin: 14, zout: 14, Q: 13, V: 13, P0in: 22, P0out: 22, K: 9 };
    const columns = cols.map((c) => ({
      header: c.c ? `${c.l} (${app.outUnit('pipes.' + c.k, c.c)})` : c.l,
      width: widths[c.k] || 14,
      format: c.t ? 'text' : c.x || '0.00',
    }));
    const rows = rowsFor('pipes', res, eff).map((r) => cols.map((c) => {
      if (c.t === 'id') return 'P' + r.id;
      if (c.t) return r[c.k] ?? '';
      const v = c.c ? F.conv(r[c.k], c.c, app.outUnit('pipes.' + c.k, c.c), ctx) : r[c.k];
      return Number.isFinite(v) ? v : '—';
    }));
    return { columns, rows };
  }

  // ------------------------------------------------------------ resultados
  const OUT_TABS = [['general', 'Geral'], ['pipes', 'Tubos'], ['junctions', 'Junções'], ['pumps', 'Bombas'], ['valves', 'Válvulas'], ['warnings', 'Avisos']];

  function renderOut(container, tabsEl, subEl) {
    const res = app.currentResults();
    const eff = app.eff();
    const tab = app.prefs.outTab || 'general';
    tabsEl.innerHTML = OUT_TABS.map(([k, l]) => {
      let extra = '';
      if (k === 'warnings' && res && res.ok) extra = ` (${res.warnings.length})`;
      return `<button data-out="${k}" class="${k === tab ? 'on' : ''}">${l}${extra}</button>`;
    }).join('');
    const scn = app.scenario();
    if (!res) {
      subEl.textContent = `Cenário ${scn.name}: sem resultados.`;
      container.innerHTML = `<div class="card"><div class="empty">O cálculo é automático. Complete a lista de verificação (no alto, à direita) para ver vazões, pressões e avisos.</div></div>`;
      return;
    }
    if (!res.ok) {
      subEl.textContent = `Cenário ${scn.name}: o cálculo foi recusado.`;
      container.innerHTML = `<div class="card"><div class="card-head"><h3>Não foi possível calcular</h3></div><ul class="warn-list">${res.errors.map((e) => `<li><span class="lvl critical">Erro</span><span>${F.esc(e)}</span></li>`).join('')}</ul></div>`;
      return;
    }
    subEl.innerHTML = `Cenário <b>${F.esc(scn.name)}</b> · ${res.converged ? `convergiu em ${res.iterations} iterações` : '<b style="color:var(--crit)">não convergiu</b>'}${res.passes > 1 ? ` · ${res.passes} passagens por mudança de estado` : ''} · ${res.warnings.length} aviso(s)`;
    if (tab === 'general') container.innerHTML = general(res, eff);
    else if (tab === 'warnings') container.innerHTML = warningsCard(res);
    else {
      const title = OUT_TABS.find((t) => t[0] === tab)[1];
      const xl = tab === 'pipes' ? '<button class="btn small primary" data-xlsx="pipes" type="button">Exportar para Excel</button>' : '';
      container.innerHTML = `<div class="card"><div class="card-head"><h3>${title}</h3><div class="btn-row">${xl}<button class="btn small" data-copy="${tab}" type="button">${tab === 'pipes' ? 'Copiar para Excel' : 'Copiar tabela'}</button></div></div>${resultTable(tab, res, eff)}</div>`;
    }
  }

  function warningsCard(res) {
    if (!res.warnings.length) return `<div class="card"><div class="empty">Nenhum aviso. O modelo convergiu sem violações.</div></div>`;
    return `<div class="card"><div class="card-head"><h3>Avisos</h3><span class="muted small">Clique para localizar o objeto</span></div><ul class="warn-list">${res.warnings.map((w) => `<li data-key="${w.obj || ''}"><span class="lvl ${w.level}">${LEVEL[w.level]}</span><span>${F.esc(w.text)}</span></li>`).join('')}</ul></div>`;
  }

  function general(res, eff) {
    const ctx = { rho: res.fluid.rho, patm: res.patm };
    const o = (v, cat, key) => `${F.fmt(F.conv(v, cat, app.outUnit(key, cat), ctx), 5)} <span class="muted small">${F.esc(app.outUnit(key, cat))}</span>`;
    const crit = res.warnings.filter((w) => w.level === 'critical').length;
    const kv = [
      ['Situação', res.converged ? (crit ? `<span class="pill crit">Convergiu com ${crit} crítico(s)</span>` : '<span class="pill ok">Convergiu</span>') : '<span class="pill crit">Não convergiu</span>'],
      ['Iterações', `${res.iterations}${res.passes > 1 ? ` <span class="muted small">em ${res.passes} passagens</span>` : ''}`],
      ['Fluido', F.esc(res.fluid.name)],
      ['Densidade', o(res.fluid.rho, 'density', 'gen.rho')],
      ['Viscosidade', o(res.fluid.mu, 'viscosity', 'gen.mu')],
      ['Pressão de vapor', Number.isFinite(res.fluid.pv) ? o(res.fluid.pv, 'pressure', 'gen.pv') : '—'],
      ['Pressão ambiente', o(res.patm, 'pressure', 'gen.patm')],
      ['Tubos · junções', `${eff.pipes.length} · ${eff.junctions.length}`],
    ];
    let html = `<div class="card"><div class="card-head"><h3>Resumo</h3></div><div class="kv">${kv.map(([k, v]) => `<div><span class="eyebrow">${k}</span><b>${v}</b></div>`).join('')}</div></div>`;
    // fronteiras: o que entra e sai do sistema
    const bnd = eff.junctions.filter((j) => ['reservoir', 'pressure', 'flow', 'spray', 'branch'].includes(j.type))
      .map((j) => ({ j, r: res.junctions[j.id] }))
      .filter(({ j, r }) => r && (j.type !== 'branch' || Math.abs(r.net) > 1e-12));
    if (bnd.length) {
      html += `<div class="card"><div class="card-head"><h3>Fronteiras do sistema</h3><span class="muted small">Positivo = entra na rede pela junção</span></div><div class="table-scroll"><table class="grid"><thead><tr><th class="txt">Junção</th><th class="txt">Tipo</th><th>Vazão líquida${unitSelect('bnd', { k: 'net', c: 'volFlow', l: 'vazão' })}</th><th>P estagnação${unitSelect('bnd', { k: 'P0', c: 'pressure', l: 'pressão' })}</th></tr></thead><tbody>${bnd.map(({ j, r }) => {
        let net = r.net;
        if (j.type === 'spray') net = -r.m;
        return `<tr data-key="j:${j.id}"><td class="txt">J${j.id} ${F.esc(j.name)}</td><td class="txt">${M.JT[j.type].label}</td><td class="num">${F.fmt(U.fromSI(net / res.fluid.rho, app.outUnit('bnd.net', 'volFlow'), 'volFlow'), 5)}</td><td class="num">${F.fmt(F.conv(r.P0in, 'pressure', app.outUnit('bnd.P0', 'pressure'), ctx), 5)}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
    }
    html += warningsCard(res);
    return html;
  }

  // ------------------------------------------------------------ dados do modelo
  function q(v) { return v && Number.isFinite(v.value) ? `${F.fmt(v.value, 5)} ${v.unit}` : '—'; }

  function pipeSummary(p) {
    const g = p.geometry;
    const geo = g.kind === 'circular' ? `⌀ ${q(g.d)}` : g.kind === 'annulus' ? `anel ${q(g.dOuter)} × ${q(g.dInner)}` : g.kind === 'rectangular' ? `${q(g.width)} × ${q(g.height)}` : `A ${q(g.area)}`;
    const f = p.friction;
    const fr = { roughness: `ε ${q(f.eps)}`, relRoughness: `ε/D ${F.fmt(f.rel, 3)}`, smooth: 'liso', explicitF: `f ${F.fmt(f.f, 4)}`, hw: `HW C ${F.fmt(f.C, 4)}`, frictionless: 'sem atrito' }[f.model];
    return { geo, fr, mat: p.material.kind === 'steel' ? `Aço ${p.material.nps}" sch ${p.material.sch}` : 'Usuário' };
  }

  function junctionSummary(j) {
    switch (j.type) {
      case 'reservoir': return `Nível ${q(j.liquidElev)} · ${q(j.surfP)}`;
      case 'pressure': return `${q(j.P)} (${j.ptype === 'static' ? 'estática' : 'estagnação'})`;
      case 'flow': return `${q(j.Q)} ${j.dir === 'in' ? 'entrando' : 'saindo'}`;
      case 'branch': return j.source && j.source.value ? `Fonte ${q(j.source)}` : '';
      case 'spray': return j.sprayModel === 'K' ? `K ${q(j.Kf)}` : `Cd ${F.fmt(j.Cd, 3)} · ${j.nHoles} × ⌀ ${q(j.dHole)}`;
      case 'pump': return { curve: `Curva a ${F.fmt(j.speed, 4)}%`, fixedFlow: `Vazão fixa ${q(j.fixedFlow)}`, controlFlow: `Controla vazão ${q(j.setQ)}`, controlDischarge: `Controla descarga ${q(j.setP)}`, controlSuction: `Controla sucção ${q(j.setP)}` }[j.mode] + (j.state !== 'on' ? ' · desligada' : '');
      case 'exitvalve': return `Saída a ${q(j.Pout)} · ` + (j.lossModel === 'K' ? `K ${F.fmt(j.K, 4)}` : j.lossModel === 'Cv' ? `Cv ${F.fmt(j.Cv, 4)}` : `Kv ${F.fmt(j.Kv, 4)}`);
      case 'valve': return (j.lossModel === 'K' ? `K ${F.fmt(j.K, 4)}` : j.lossModel === 'Cv' ? `Cv ${F.fmt(j.Cv, 4)}` : `Kv ${F.fmt(j.Kv, 4)}`) + (j.closed ? ' · fechada' : '');
      case 'control': return `${j.ctype} ${j.ctype === 'FCV' ? q(j.setQ) : j.ctype === 'PDCV' ? q(j.setDP) : q(j.setP)}`;
      case 'orifice': return j.orModel === 'K' ? `K ${F.fmt(j.K, 4)}` : `⌀ ${q(j.dO)} · ${j.orModel === 'Cd' ? 'Cd ' + F.fmt(j.Cd, 3) : j.orModel === 'sharp' ? 'canto vivo' : 'arredondado'}`;
      case 'generic': return j.genModel === 'K' ? `K ${F.fmt(j.K, 4)}` : `curva (${j.curve.x.length} pontos)`;
      default: return '';
    }
  }

  function renderData(container) {
    const eff = app.eff();
    const und = app.undefSet();
    const ov = (key, ...paths) => paths.some((p) => app.isOv(key, p)) ? ' ov' : '';
    const pRows = eff.pipes.map((p) => {
      const k = 'p:' + p.id, s = pipeSummary(p);
      return `<tr data-key="${k}"><td class="txt num">P${p.id}${und.has(k) ? ' <span class="pill crit">indefinido</span>' : ''}</td><td class="txt${ov(k, 'name')}">${F.esc(p.name)}</td><td class="txt">J${p.up} → J${p.down}</td>
        <td class="num${ov(k, 'length')}">${q(p.length)}</td><td class="txt${ov(k, 'material')}">${s.mat}</td><td class="txt${ov(k, 'geometry')}">${s.geo}</td><td class="txt${ov(k, 'friction')}">${s.fr}</td>
        <td class="num${ov(k, 'fittings')}">${(p.fittings || []).reduce((a, f) => a + (f.qty || 0), 0)}</td><td class="num${ov(k, 'nParallel')}">${p.nParallel}</td><td class="txt${ov(k, 'closed')}">${p.closed ? 'fechado' : ''}</td></tr>`;
    }).join('');
    const jRows = eff.junctions.map((j) => {
      const k = 'j:' + j.id;
      const scnOv = app.scenario().parent && Object.keys(app.scenario().overrides).some((x) => x.startsWith(k + '|') && !/\|(name|elevation)$/.test(x));
      return `<tr data-key="${k}"><td class="txt num">J${j.id}${und.has(k) ? ' <span class="pill crit">indefinida</span>' : ''}</td><td class="txt${ov(k, 'name')}">${F.esc(j.name)}</td><td class="txt">${M.JT[j.type].label}</td>
        <td class="num${ov(k, 'elevation')}">${q(j.elevation)}</td><td class="txt${scnOv ? ' ov' : ''}">${F.esc(junctionSummary(j))}</td></tr>`;
    }).join('');
    container.innerHTML = `
      <div class="card"><div class="card-head"><h3>Tubos</h3><span class="muted small">${eff.pipes.length} tubo(s)</span></div>
        ${eff.pipes.length ? `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">Tubo</th><th class="txt">Nome</th><th class="txt">Ligação</th><th>Comprimento</th><th class="txt">Material</th><th class="txt">Seção</th><th class="txt">Atrito</th><th>Acessórios</th><th>N paralelo</th><th class="txt">Condição</th></tr></thead><tbody>${pRows}</tbody></table></div>` : '<div class="empty">Nenhum tubo. Use a ferramenta Tubo na aba Rede.</div>'}
      </div>
      <div class="card"><div class="card-head"><h3>Junções</h3><span class="muted small">${eff.junctions.length} junção(ões)</span></div>
        ${eff.junctions.length ? `<div class="table-scroll"><table class="grid"><thead><tr><th class="txt">Junção</th><th class="txt">Nome</th><th class="txt">Tipo</th><th>Cota</th><th class="txt">Dados principais</th></tr></thead><tbody>${jRows}</tbody></table></div>` : '<div class="empty">Nenhuma junção. Arraste um tipo da paleta para o desenho.</div>'}
      </div>`;
  }

  HR.tables = { init, renderOut, renderData, tableTSV, pipeSheet, COLS, LEVEL };
})(typeof window !== 'undefined' ? window : globalThis);
