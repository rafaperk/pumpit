// Inspetor (janela de propriedades): sistema, tubo ou junção selecionada, com o que falta para ficar definido.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const U = HR.units, F = HR.fmt, M = HR.model, H = HR.hyd, D = HR.data;
  const Fm = HR.forms;
  const { el, section, qty, num, sel, chk, text, readout, hint } = Fm;
  let app, host;

  function init(a, hostEl) { app = a; host = hostEl; }

  function render() {
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : null;
    const scroll = host.scrollTop;
    host.innerHTML = '';
    const s = app.sel;
    if (app.selSet.size > 1) renderMulti();
    else if (!s) renderSystem();
    else if (s.kind === 'pipe') renderPipe(s.id);
    else renderJunction(s.id);
    host.scrollTop = scroll;
    if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
  }

  function head(title, idTxt, meta) {
    const h = el('div', { class: 'insp-head' });
    h.innerHTML = `<h3>${idTxt ? `<span class="id">${F.esc(idTxt)}</span>` : ''}${F.esc(title)}</h3>${meta ? `<div class="meta">${meta}</div>` : ''}`;
    host.appendChild(h);
    return h;
  }

  function missingBox(key) {
    const miss = app.undefSet().get(key);
    if (!miss) return;
    const sct = section();
    sct.appendChild(el('div', { class: 'missing' }, `<b>Indefinido.</b> Falta: ${F.esc(miss.join('; '))}.`));
    host.appendChild(sct);
  }

  const out = (v, cat) => {
    const res = app.okResults();
    const ctx = res ? { rho: res.fluid.rho, patm: res.patm } : {};
    const u = app.outUnit('insp', cat);
    return `${F.fmt(F.conv(v, cat, u, ctx))} ${u}`;
  };

  // geometria em SI de um tubo efetivo
  function pipeGeom(p) {
    if (!p) return null;
    const si = (q, c) => U.toSI(q.value, q.unit, c);
    const g = p.geometry;
    let A, Dh;
    try {
      if (g.kind === 'circular') { const d = si(g.d, 'length'); A = Math.PI * d * d / 4; Dh = d; }
      else if (g.kind === 'annulus') { const a = si(g.dOuter, 'length'), b = si(g.dInner, 'length'); A = Math.PI * (a * a - b * b) / 4; Dh = a - b; }
      else if (g.kind === 'rectangular') { const w = si(g.width, 'length'), h = si(g.height, 'length'); A = w * h; Dh = 2 * w * h / (w + h); }
      else { A = si(g.area, 'area'); Dh = 4 * A / si(g.perim, 'length'); }
    } catch (e) { return null; }
    const red = 1 - (p.idReduction || 0) / 100;
    return { A: A * red * red * (p.nParallel || 1), Dh: Dh * red };
  }

  // ------------------------------------------------------------ seleção múltipla

  function renderMulti() {
    const keys = [...app.selSet];
    const nj = keys.filter((k) => k[0] === 'j').length, np = keys.length - nj;
    head(`${keys.length} objetos selecionados`, '', `${nj} junção(ões) · ${np} tubo(s)`);
    const s = section('Ações');
    const row = el('div', { class: 'btn-row' });
    const mk = (label, fn) => { const b = el('button', { class: 'btn small', type: 'button' }, F.esc(label)); b.addEventListener('click', fn); row.appendChild(b); };
    mk('Copiar (Ctrl+C)', () => app.copySelection());
    if (app.clipboard) mk('Colar (Ctrl+V)', () => app.paste());
    mk('Excluir (Del)', () => app.deleteSelection());
    s.appendChild(row);
    s.appendChild(hint('Arraste qualquer junção selecionada para mover o grupo. Ctrl+clique adiciona ou remove um objeto; Shift+arrastar no vazio seleciona por área. Clique direito mostra os dados de um objeto.'));
    host.appendChild(s);
    const list = section('Selecionados');
    list.appendChild(el('p', { class: 'hint' }, keys.map((k) => (k[0] === 'p' ? 'P' : 'J') + k.slice(2)).join(', ')));
    host.appendChild(list);
  }

  // ------------------------------------------------------------ sistema

  function renderSystem() {
    const eff = app.eff();
    const scn = app.scenario();
    head('Propriedades do sistema', '', `Cenário <b>${F.esc(scn.name)}</b>${scn.parent ? ' · herda de ' + F.esc(app.scenarioById(scn.parent).name) : ' · base'}`);
    const k = 'sys';
    const s1 = section('Fluido');
    s1.appendChild(sel(k, 'fluid.kind', 'Fluido', [['water', 'Água (correlações públicas)'], ['user', 'Definido pelo usuário']]));
    if (eff.system.fluid.kind === 'water') {
      s1.appendChild(qty(k, 'fluid.T', 'Temperatura', 'temperature'));
    } else {
      s1.appendChild(text(k, 'fluid.name', 'Nome'));
      s1.appendChild(qty(k, 'fluid.rho', 'Densidade', 'density'));
      s1.appendChild(qty(k, 'fluid.mu', 'Viscosidade dinâmica', 'viscosity'));
      s1.appendChild(qty(k, 'fluid.pv', 'Pressão de vapor (opcional)', 'pressure'));
    }
    try {
      const fl = HR.fluids.evaluate(eff.system);
      s1.appendChild(readout('ρ', F.fmt(fl.rho, 6) + ' kg/m³'));
      s1.appendChild(readout('μ', F.fmt(fl.mu * 1e3, 4) + ' cP'));
      s1.appendChild(readout('Pv', Number.isFinite(fl.pv) ? F.fmt(fl.pv / 98066.5, 4) + ' kgf/cm²(a)' : '—'));
      if (eff.system.fluid.kind === 'water') s1.appendChild(hint(HR.fluids.LIBRARY.water.sources + ' Faixa: 0–150 °C.'));
    } catch (e) { s1.appendChild(hint(e.message)); }
    host.appendChild(s1);

    const s2 = section('Ambiente e escoamento');
    s2.appendChild(qty(k, 'patm', 'Pressão ambiente', 'pressure'));
    s2.appendChild(num(k, 'gravity', 'Gravidade', { suffix: '× g₀' }));
    s2.appendChild(num(k, 'reLam', 'Re laminar até', { int: true }));
    s2.appendChild(num(k, 'reTurb', 'Re turbulento a partir de', { int: true }));
    s2.appendChild(sel(k, 'laminarK', 'Correção laminar dos K', [['improvedAtkf', 'ATKF aprimorado'], ['atkf', 'ATKF'], ['none', 'Nenhuma']]));
    s2.appendChild(hint('Entre os dois Reynolds o fator de atrito é interpolado linearmente. A correção laminar multiplica K por f/f<sub>T</sub> abaixo do regime turbulento.'));
    host.appendChild(s2);

    const s3 = section('Controle da solução');
    const ks = 'sol';
    s3.appendChild(num(ks, 'tolRel', 'Tolerância relativa'));
    s3.appendChild(num(ks, 'maxIter', 'Iterações máximas', { int: true }));
    s3.appendChild(num(ks, 'relax', 'Relaxação de vazão'));
    s3.appendChild(chk(ks, 'adaptive', 'Relaxação adaptativa (busca linear)'));
    s3.appendChild(chk(ks, 'checkMass', 'Checar balanço de massa'));
    host.appendChild(s3);

    const s4 = section('Cenário atual');
    const notes = el('textarea', { id: 'scn-notes', rows: '3', style: 'width:100%;resize:vertical', placeholder: 'Notas deste cenário' });
    notes.value = scn.notes || '';
    notes.addEventListener('change', () => { app.pushUndo(); scn.notes = notes.value; app.save(); });
    s4.appendChild(notes);
    const nOv = Object.keys(scn.overrides).length;
    s4.appendChild(readout('Atributos alterados em relação ao pai', scn.parent ? String(nOv) : '— (cenário base)'));
    if (scn.parent && nOv) {
      const b = el('button', { class: 'btn small', type: 'button' }, 'Ver diferenças');
      b.addEventListener('click', () => app.showDiffs());
      s4.appendChild(b);
    }
    s4.appendChild(hint('Selecione um tubo ou junção no desenho para editar suas propriedades. Com nada selecionado, este painel mostra o sistema.'));
    host.appendChild(s4);
  }

  // ------------------------------------------------------------ tubo

  function renderPipe(id) {
    const key = 'p:' + id;
    const p = app.effObj(key);
    if (!p) return renderSystem();
    const h = head('Tubo', 'P' + id, `J${p.up} → J${p.down}`);
    const rev = el('button', { class: 'btn small', type: 'button' }, 'Inverter sentido');
    rev.addEventListener('click', () => app.reversePipe(id));
    h.querySelector('.meta').appendChild(rev);
    missingBox(key);
    quickResultsPipe(id);

    const s0 = section('Identificação');
    s0.appendChild(text(key, 'name', 'Nome'));
    host.appendChild(s0);

    const s1 = section('Geometria');
    s1.appendChild(qty(key, 'length', 'Comprimento', 'length'));
    s1.appendChild(sel(key, 'material.kind', 'Material', [['user', 'Definido pelo usuário'], ['steel', 'Aço carbono — ASME B36.10M']]));
    const steel = p.material.kind === 'steel';
    if (steel) {
      s1.appendChild(sel(key, 'material.nps', 'Tamanho nominal (NPS)', D.STEEL_NPS.map((n) => [n, n + '"'])));
      s1.appendChild(sel(key, 'material.sch', 'Schedule', D.SCHEDULES.map((x) => [x, x])));
    }
    s1.appendChild(sel(key, 'geometry.kind', 'Seção', [['circular', 'Circular'], ['annulus', 'Anel'], ['rectangular', 'Retangular'], ['noncircular', 'Não circular']], { disabled: steel }));
    const g = p.geometry.kind;
    if (g === 'circular') s1.appendChild(qty(key, 'geometry.d', 'Diâmetro interno', 'length', { disabled: steel }));
    if (g === 'annulus') { s1.appendChild(qty(key, 'geometry.dOuter', 'Diâmetro externo', 'length')); s1.appendChild(qty(key, 'geometry.dInner', 'Diâmetro interno', 'length')); }
    if (g === 'rectangular') { s1.appendChild(qty(key, 'geometry.width', 'Largura', 'length')); s1.appendChild(qty(key, 'geometry.height', 'Altura', 'length')); }
    if (g === 'noncircular') { s1.appendChild(qty(key, 'geometry.area', 'Área', 'area')); s1.appendChild(qty(key, 'geometry.perim', 'Perímetro molhado', 'length')); }
    s1.appendChild(num(key, 'idReduction', 'Redução do diâmetro (incrustação)', { suffix: '%' }));
    s1.appendChild(num(key, 'nParallel', 'Tubos idênticos em paralelo', { int: true }));
    const gm = pipeGeom(p);
    if (gm) s1.appendChild(readout('Diâmetro hidráulico efetivo', F.fmt(gm.Dh * 1000, 5) + ' mm'));
    host.appendChild(s1);

    const s2 = section('Atrito');
    s2.appendChild(sel(key, 'friction.model', 'Modelo', [
      ['roughness', 'Rugosidade absoluta'], ['relRoughness', 'Rugosidade relativa'], ['smooth', 'Hidraulicamente liso'],
      ['explicitF', 'Fator de atrito informado'], ['hw', 'Hazen-Williams'], ['frictionless', 'Sem atrito (depuração)'],
    ]));
    const fm = p.friction.model;
    if (fm === 'roughness') {
      const preset = el('select', { class: 'unit', 'aria-label': 'Rugosidade típica', id: 'rough-preset', title: 'Valores típicos' },
        '<option value="">Típica…</option>' + D.ROUGHNESS.map((r, i) => `<option value="${i}">${F.esc(r.name)} — ${F.fmt(r.mm, 2)} mm</option>`).join(''));
      preset.addEventListener('change', () => {
        if (preset.value === '') return;
        app.setVal(key, 'friction.eps', { value: D.ROUGHNESS[+preset.value].mm, unit: 'mm' });
      });
      s2.appendChild(qty(key, 'friction.eps', 'Rugosidade ε', 'length'));
      const f2 = el('div', { class: 'field' });
      f2.innerHTML = '<label for="rough-preset">Valor típico</label>';
      const c = el('div', { class: 'ctl' }); preset.classList.remove('unit'); c.appendChild(preset); f2.appendChild(c);
      s2.appendChild(f2);
    }
    if (fm === 'relRoughness') s2.appendChild(num(key, 'friction.rel', 'ε/D'));
    if (fm === 'explicitF') s2.appendChild(num(key, 'friction.f', 'f de Darcy'));
    if (fm === 'hw') s2.appendChild(num(key, 'friction.C', 'Coeficiente C'));
    if (fm === 'hw') s2.appendChild(hint('V = 0,8487·C·R<sub>h</sub><sup>0,63</sup>·S<sup>0,54</sup> (SI). Independe da viscosidade.'));
    host.appendChild(s2);

    host.appendChild(fittingsEditor(key, p, gm));

    const s4 = section('Condição especial');
    s4.appendChild(chk(key, 'closed', 'Tubo fechado (vazão zero)'));
    host.appendChild(s4);
  }

  function fittingsEditor(key, p, gm) {
    const s = section('Acessórios e perdas distribuídas');
    const fT = gm ? H.craneFT(gm.Dh) : NaN;
    const list = (p.fittings || []).map((x) => Object.assign({}, x));
    const save = () => app.setVal(key, 'fittings', list);
    if (list.length) {
      const t = el('table', { class: 'mini-table' });
      t.innerHTML = '<thead><tr><th>Qtd</th><th>Item</th><th>Valor</th><th></th></tr></thead>';
      const tb = el('tbody');
      list.forEach((it, i) => {
        const tr = el('tr');
        const qn = el('input', { type: 'text', inputmode: 'decimal', id: `fit-q-${key}-${i}`, 'aria-label': 'Quantidade', style: 'width:44px' });
        qn.value = F.inputStr(it.qty);
        qn.addEventListener('change', () => { const n = F.parseNum(qn.value); it.qty = Number.isFinite(n) ? n : 0; save(); });
        const vn = el('input', { type: 'text', inputmode: 'decimal', id: `fit-v-${key}-${i}`, 'aria-label': 'Valor', style: 'width:64px' });
        vn.value = F.inputStr(it.value);
        vn.addEventListener('change', () => { const n = F.parseNum(vn.value); it.value = Number.isFinite(n) ? n : 0; save(); });
        const x = el('button', { class: 'row-btn', type: 'button', 'aria-label': 'Remover acessório' }, '×');
        x.addEventListener('click', () => { list.splice(i, 1); save(); });
        const td1 = el('td'); td1.appendChild(qn);
        const td2 = el('td', {}, `<span style="font-size:12.5px">${F.esc(it.name)}</span>`);
        const td3 = el('td'); td3.appendChild(vn); td3.insertAdjacentHTML('beforeend', ` <span class="muted small">${it.model === 'KfT' ? '·f<sub>T</sub>' : 'K'}</span>`);
        const td4 = el('td', { class: 'x' }); td4.appendChild(x);
        tr.append(td1, td2, td3, td4);
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      s.appendChild(t);
    }
    const add = el('select', { id: 'fit-add-' + key, 'aria-label': 'Adicionar acessório' },
      '<option value="">Adicionar acessório…</option><option value="custom">K informado</option>' +
      D.FITTINGS.map((f, i) => `<option value="${i}">${F.esc(f.name)} (${f.model === 'KfT' ? f.value + '·f_T' : 'K = ' + F.fmt(f.value, 3)})</option>`).join(''));
    add.addEventListener('change', () => {
      if (add.value === '') return;
      list.push(add.value === 'custom' ? { name: 'K informado', model: 'K', value: 1, qty: 1 } : Object.assign({ qty: 1 }, D.FITTINGS[+add.value]));
      save();
    });
    s.appendChild(add);
    let Ksum = 0;
    for (const it of list) Ksum += (it.qty ?? 1) * (it.model === 'KfT' ? it.value * fT : it.value);
    s.appendChild(readout('ΣK (área do tubo)', F.fmt(Ksum, 4)));
    s.appendChild(readout('f_T de Crane neste diâmetro', F.fmt(fT, 3)));
    s.appendChild(hint('K/f<sub>T</sub> segue o Crane TP-410, com f<sub>T</sub> do aço comercial (ε = 0,0018 in) totalmente turbulento no diâmetro interno real. A soma dos K é perda distribuída ao longo do tubo.'));
    return s;
  }

  function quickResultsPipe(id) {
    const res = app.okResults();
    if (!res || !res.pipes[id]) return;
    const r = res.pipes[id];
    const s = section('Resultado');
    if (r.isolated) { s.appendChild(hint('Trecho isolado: vazão zero.')); host.appendChild(s); return; }
    s.appendChild(readout('Vazão', out(r.Q, 'volFlow')));
    s.appendChild(readout('Velocidade', `${out(r.V, 'velocity')} · ${HR.data.velocityBand(r.V)}`));
    s.appendChild(readout('Reynolds · f', `${F.fmt(r.Re, 4)} · ${F.fmt(r.f, 4)}`));
    s.appendChild(readout('P estática entrada / saída', `${out(r.Pin, 'pressure')} / ${F.fmt(F.conv(r.Pout, 'pressure', app.outUnit('insp', 'pressure'), { patm: res.patm }))}`));
    s.appendChild(readout('ΔP total (estagnação)', out(r.dP0, 'dp')));
    host.appendChild(s);
  }

  // ------------------------------------------------------------ junções

  const TYPE_OPTIONS = () => Object.entries(M.JT).map(([k, t]) => [k, t.label]);

  function renderJunction(id) {
    const key = 'j:' + id;
    const j = app.effObj(key);
    if (!j) return renderSystem();
    const t = M.JT[j.type];
    const n = M.pipesAt(app.model, id).length;
    head(t.label, 'J' + id, `${n} tubo(s) · ${t.pipes[0] === t.pipes[1] ? t.pipes[0] : t.pipes[0] + '–' + t.pipes[1]} aceito(s)`);
    missingBox(key);
    quickResultsJunction(id, j);

    const s0 = section('Identificação');
    s0.appendChild(text(key, 'name', 'Nome'));
    const ts = el('select', { id: 'jtype-' + id }, TYPE_OPTIONS().map(([v, l]) => `<option value="${v}"${v === j.type ? ' selected' : ''}>${F.esc(l)}</option>`).join(''));
    ts.addEventListener('change', () => app.changeType(id, ts.value));
    const tf = el('div', { class: 'field' }); tf.innerHTML = `<label for="jtype-${id}">Tipo</label>`;
    const tc = el('div', { class: 'ctl' }); tc.appendChild(ts); tf.appendChild(tc);
    s0.appendChild(tf);
    s0.appendChild(qty(key, 'elevation', j.type === 'reservoir' ? 'Cota do fundo (conexões)' : j.type === 'exitvalve' ? 'Cota da saída' : 'Cota', 'length'));
    host.appendChild(s0);

    const s = section('Dados');
    const T = {
      reservoir() {
        s.appendChild(qty(key, 'liquidElev', 'Cota da superfície do líquido', 'length'));
        s.appendChild(qty(key, 'surfP', 'Pressão na superfície', 'pressure'));
        s.appendChild(hint('Sem K informado não há perda de entrada nem de saída: a pressão de estagnação é contínua entre o tanque e a ponta do tubo.'));
      },
      pressure() {
        s.appendChild(sel(key, 'ptype', 'Tipo de pressão', [['stagnation', 'Estagnação'], ['static', 'Estática (1 tubo)']]));
        s.appendChild(qty(key, 'P', 'Pressão', 'pressure'));
      },
      flow() {
        s.appendChild(qty(key, 'Q', 'Vazão', 'flow'));
        s.appendChild(sel(key, 'dir', 'Sentido', [['in', 'Entra no sistema'], ['out', 'Sai do sistema']]));
      },
      branch() {
        s.appendChild(qty(key, 'source', 'Vazão de fonte', 'flow', { title: 'Positiva entra no sistema; negativa sai (consumo).' }));
        s.appendChild(hint('Positiva entra no sistema; negativa sai (consumo).'));
      },
      spray() {
        s.appendChild(sel(key, 'sprayModel', 'Modelo', [['CdA', 'Coeficiente de descarga (Cd·A)'], ['K', 'Fator K do aspersor']]));
        if (j.sprayModel === 'K') {
          s.appendChild(qty(key, 'Kf', 'Fator K (Q = K·√ΔP)', 'kfactor'));
          s.appendChild(hint('O fator K pressupõe água; para outro fluido usa-se Cd·A = √(ρ<sub>água</sub>/2)·K.'));
        } else {
          s.appendChild(num(key, 'Cd', 'Cd'));
          s.appendChild(qty(key, 'dHole', 'Diâmetro do furo', 'length'));
          s.appendChild(num(key, 'nHoles', 'Número de furos', { int: true }));
        }
        s.appendChild(qty(key, 'Pext', 'Pressão externa', 'pressure'));
      },
      valve() {
        lossModel(s, key, j);
        s.appendChild(chk(key, 'closed', 'Válvula fechada'));
      },
      exitvalve() {
        s.appendChild(qty(key, 'Pout', 'Pressão de saída (residual)', 'pressure'));
        lossModel(s, key, j);
        s.appendChild(hint('Um tubo descarrega pela válvula para a pressão residual informada, na cota da junção. Com K = 0, a pressão de estagnação na ponta do tubo é igual à residual.'));
      },
      control() {
        s.appendChild(sel(key, 'ctype', 'Tipo', [['PRV', 'Redutora de pressão (PRV)'], ['PSV', 'Sustentadora de pressão (PSV)'], ['FCV', 'Controladora de vazão (FCV)'], ['PDCV', 'Controladora de ΔP (PDCV)']]));
        if (j.ctype === 'PRV' || j.ctype === 'PSV') {
          s.appendChild(qty(key, 'setP', j.ctype === 'PRV' ? 'Pressão a jusante' : 'Pressão a montante', 'pressure'));
          s.appendChild(sel(key, 'basis', 'Base do ajuste', [['static', 'Pressão estática'], ['stagnation', 'Pressão de estagnação']]));
        }
        if (j.ctype === 'FCV') {
          s.appendChild(qty(key, 'setQ', 'Vazão de ajuste', 'flow'));
          s.appendChild(sel(key, 'failAction', 'Se não conseguir controlar', [['open', 'Abrir totalmente'], ['closed', 'Fechar']]));
        }
        if (j.ctype === 'PDCV') s.appendChild(qty(key, 'setDP', 'Queda de pressão de ajuste', 'dp'));
        s.appendChild(chk(key, 'alwaysControl', 'Sempre controlar (pode adicionar pressão, com aviso)'));
        s.appendChild(num(key, 'kOpen', 'K totalmente aberta'));
        s.appendChild(sel(key, 'special', 'Condição especial', [['none', 'Normal'], ['closed', 'Fechada'], ['open', 'Totalmente aberta']]));
      },
      orifice() {
        s.appendChild(sel(key, 'orModel', 'Modelo', [['sharp', 'Canto vivo (Idelchik)'], ['rounded', 'Borda arredondada (Idelchik)'], ['Cd', 'Coeficiente de descarga Cd'], ['K', 'K informado']]));
        if (j.orModel !== 'K') s.appendChild(qty(key, 'dO', 'Diâmetro do orifício', 'length'));
        if (j.orModel === 'rounded') s.appendChild(qty(key, 'rEdge', 'Raio da borda', 'length'));
        if (j.orModel === 'Cd') { s.appendChild(num(key, 'Cd', 'Cd')); s.appendChild(hint('K na área do orifício = (1 − β⁴)/Cd².')); }
        if (j.orModel === 'K') s.appendChild(num(key, 'K', 'K (área de montante)'));
      },
      generic() {
        s.appendChild(sel(key, 'genModel', 'Modelo de perda', [['K', 'K constante'], ['curve', 'Curva ΔP × vazão']]));
        if (j.genModel === 'K') s.appendChild(num(key, 'K', 'K (área de montante)'));
      },
      pump() {
        s.appendChild(sel(key, 'state', 'Estado', [['on', 'Ligada'], ['offClosed', 'Desligada, sem fluxo'], ['offOpen', 'Desligada, passagem livre']]));
        s.appendChild(sel(key, 'mode', 'Modo', [['curve', 'Curva, velocidade fixa'], ['fixedFlow', 'Vazão fixa (dimensionamento)'], ['controlFlow', 'Velocidade variável: controlar vazão'], ['controlDischarge', 'Velocidade variável: pressão de descarga'], ['controlSuction', 'Velocidade variável: pressão de sucção']]));
        if (j.mode === 'fixedFlow') {
          s.appendChild(qty(key, 'fixedFlow', 'Vazão fixa', 'flow'));
          s.appendChild(hint('Dimensionamento: a bomba fornece a vazão informada e o cálculo mostra a altura manométrica necessária. Curvas não são usadas neste modo.'));
          return;
        }
        if (j.mode === 'curve') s.appendChild(num(key, 'speed', 'Velocidade', { suffix: '% nominal' }));
        if (j.mode === 'controlFlow') s.appendChild(qty(key, 'setQ', 'Vazão de controle', 'flow'));
        if (j.mode === 'controlDischarge' || j.mode === 'controlSuction') s.appendChild(qty(key, 'setP', 'Pressão estática de controle', 'pressure'));
        s.appendChild(num(key, 'nPumps', 'Bombas iguais em paralelo', { int: true }));
        if (j.mode !== 'curve' && j.mode !== 'fixedFlow') s.appendChild(hint('A velocidade necessária é calculada pelas leis de afinidade, H(Q; s) = s²·H(Q/s).'));
      },
    };
    T[j.type]();
    host.appendChild(s);

    if (j.type === 'pump' && j.mode !== 'fixedFlow') {
      host.appendChild(curveEditor(key, 'curve', 'Curva de altura × vazão (100% da rotação)', { xCat: 'volFlow', yCat: 'head', yName: 'Altura', min: 1 }));
      host.appendChild(curveEditor(key, 'eff', 'Eficiência × vazão (opcional)', { xCat: 'volFlow', yCat: 'pct', yName: 'η (%)', min: 0 }));
      host.appendChild(curveEditor(key, 'npshr', 'NPSH requerido × vazão (opcional)', { xCat: 'volFlow', yCat: 'head', yName: 'NPSHR', min: 0 }));
    }
    if (j.type === 'generic' && j.genModel === 'curve') {
      host.appendChild(curveEditor(key, 'curve', 'Curva de perda ΔP × vazão', { xCat: 'volFlow', yCat: 'dp', yName: 'ΔP', min: 2 }));
    }
    if (M.JT[j.type].multi && j.pipeK !== undefined) host.appendChild(pipeKTable(key, j));
  }

  function lossModel(s, key, j) {
    s.appendChild(sel(key, 'lossModel', 'Perda', [['K', 'K (área de montante)'], ['Cv', 'Cv (EUA)'], ['Kv', 'Kv (métrico)']]));
    if (j.lossModel === 'K') s.appendChild(num(key, 'K', 'K'));
    if (j.lossModel === 'Cv') { s.appendChild(num(key, 'Cv', 'Cv')); s.appendChild(hint('ΔP[psi] = SG·(Q[gpm]/Cv)², SG relativa à água a 60 °F.')); }
    if (j.lossModel === 'Kv') { s.appendChild(num(key, 'Kv', 'Kv')); s.appendChild(hint('ΔP[bar] = SG·(Q[m³/h]/Kv)².')); }
  }

  // K por tubo em junções de vários tubos (dois por tubo) e cota de conexão no reservatório
  function pipeKTable(key, j) {
    const s = section('Perdas por tubo');
    const pipes = M.pipesAt(app.model, j.id);
    if (!pipes.length) { s.appendChild(hint('Ligue tubos a esta junção para informar as perdas de cada um.')); return s; }
    const t = el('table', { class: 'mini-table' });
    const isRes = j.type === 'reservoir';
    t.innerHTML = `<thead><tr><th>Tubo</th><th title="Fluxo saindo da junção para o tubo">K saindo</th><th title="Fluxo chegando do tubo à junção">K chegando</th>${isRes ? '<th>Cota conexão (m)</th>' : ''}</tr></thead>`;
    const tb = el('tbody');
    for (const p of pipes) {
      const cur = (j.pipeK && j.pipeK[p.id]) || {};
      const path = 'pipeK.' + p.id;
      const write = (patch) => app.setVal(key, path, Object.assign({ kOut: 0, kIn: 0 }, cur, patch));
      const tr = el('tr');
      const td0 = el('td', {}, `<span class="num">P${p.id}</span>`);
      const mk = (field, aria) => {
        const i = el('input', { type: 'text', inputmode: 'decimal', id: `pk-${j.id}-${p.id}-${field}`, 'aria-label': aria });
        i.value = F.inputStr(cur[field] ?? 0);
        i.addEventListener('change', () => { const n = F.parseNum(i.value); write({ [field]: Number.isFinite(n) ? n : 0 }); });
        const td = el('td'); td.appendChild(i); return td;
      };
      tr.append(td0, mk('kOut', `K saindo para P${p.id}`), mk('kIn', `K chegando de P${p.id}`));
      if (isRes) {
        const i = el('input', { type: 'text', inputmode: 'decimal', id: `pk-${j.id}-${p.id}-elev`, 'aria-label': `Cota de conexão de P${p.id}`, placeholder: 'fundo' });
        i.value = cur.elev && Number.isFinite(cur.elev.value) ? F.inputStr(cur.elev.value) : '';
        i.addEventListener('change', () => { const n = F.parseNum(i.value); write({ elev: Number.isFinite(n) ? { value: n, unit: 'm' } : null }); });
        const td = el('td'); td.appendChild(i); tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    s.appendChild(t);
    s.appendChild(hint('Cada K é referido à área do próprio tubo. Ex.: entrada de borda viva K saindo = 0,5; saída para o tanque K chegando = 1,0.'));
    return s;
  }

  // ------------------------------------------------------------ editor de curvas

  function curveEditor(key, path, title, o) {
    const s = section(title);
    const c0 = app.getVal(key, path) || { x: [], y: [], xUnit: 'm³/h', yUnit: o.yCat === 'head' ? 'm' : o.yCat === 'dp' ? 'bar' : '', fit: '2' };
    const c = M.clone(c0);
    if (!c.yUnit && o.yCat !== 'pct') c.yUnit = o.yCat === 'head' ? 'm' : 'bar';
    const save = () => app.setVal(key, path, c);
    const t = el('table', { class: 'mini-table' });
    const xu = el('select', { id: `cv-xu-${key}-${path}`, 'aria-label': 'Unidade de vazão', style: 'min-height:24px;padding:1px 3px;font-size:11.5px' }, Fm.unitOptions(o.xCat, c.xUnit));
    xu.addEventListener('change', () => { c.xUnit = xu.value; save(); });
    let yu = null;
    if (o.yCat !== 'pct') {
      yu = el('select', { id: `cv-yu-${key}-${path}`, 'aria-label': 'Unidade', style: 'min-height:24px;padding:1px 3px;font-size:11.5px' }, Fm.unitOptions(o.yCat, c.yUnit));
      yu.addEventListener('change', () => { c.yUnit = yu.value; save(); });
    }
    const thead = el('thead');
    const hr = el('tr');
    const th1 = el('th', {}, 'Vazão '); th1.appendChild(xu);
    const th2 = el('th', {}, F.esc(o.yName) + ' '); if (yu) th2.appendChild(yu);
    hr.append(th1, th2, el('th'));
    thead.appendChild(hr); t.appendChild(thead);
    const tb = el('tbody');
    c.x.forEach((xv, i) => {
      const tr = el('tr');
      const mk = (arr, aria, sfx) => {
        const inp = el('input', { type: 'text', inputmode: 'decimal', id: `cv-${key}-${path}-${sfx}-${i}`, 'aria-label': aria });
        inp.value = F.inputStr(arr[i]);
        inp.addEventListener('change', () => { const n = F.parseNum(inp.value); arr[i] = Number.isFinite(n) ? n : 0; save(); });
        const td = el('td'); td.appendChild(inp); return td;
      };
      const x = el('button', { class: 'row-btn', type: 'button', 'aria-label': 'Remover ponto' }, '×');
      x.addEventListener('click', () => { c.x.splice(i, 1); c.y.splice(i, 1); save(); });
      const tdx = el('td', { class: 'x' }); tdx.appendChild(x);
      tr.append(mk(c.x, 'Vazão do ponto ' + (i + 1), 'x'), mk(c.y, o.yName + ' do ponto ' + (i + 1), 'y'), tdx);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    s.appendChild(t);
    const row = el('div', { class: 'btn-row' });
    const add = el('button', { class: 'btn small', type: 'button' }, 'Adicionar ponto');
    add.addEventListener('click', () => {
      const n = c.x.length;
      c.x.push(n ? +(c.x[n - 1] * 1.25 || 1).toFixed(3) : 0);
      c.y.push(n ? c.y[n - 1] : 0);
      save();
    });
    const fit = el('select', { id: `cv-fit-${key}-${path}`, 'aria-label': 'Tipo de ajuste' },
      [['1', 'Polinômio de ordem 1'], ['2', 'Polinômio de ordem 2'], ['3', 'Polinômio de ordem 3'], ['4', 'Polinômio de ordem 4'], ['xy', 'Interpolação linear']]
        .map(([v, l]) => `<option value="${v}"${v === String(c.fit) ? ' selected' : ''}>${l}</option>`).join(''));
    fit.addEventListener('change', () => { c.fit = fit.value; save(); });
    row.append(add, fit);
    if (c.x.length) {
      const clr = el('button', { class: 'btn small', type: 'button' }, 'Limpar');
      clr.addEventListener('click', () => { c.x = []; c.y = []; save(); });
      row.appendChild(clr);
    }
    s.appendChild(row);
    if (c.x.length >= 1) {
      try {
        const cv = H.makeCurve(c.x, c.y, c.fit);
        s.appendChild(miniPlot(c, cv));
        if (cv.kind === 'poly') {
          const terms = cv.a.map((a, i) => `${i === 0 ? '' : a >= 0 ? ' + ' : ' − '}${F.fmt(i === 0 ? a : Math.abs(a), 4)}${i ? '·Q' + (i > 1 ? '<sup>' + i + '</sup>' : '') : ''}`).join('');
          s.appendChild(hint(`Ajuste (unidades da tabela): y = ${terms}`));
        }
      } catch (e) { s.appendChild(hint(F.esc(e.message))); }
    }
    return s;
  }

  // gráfico pequeno dos pontos contra a curva ajustada
  function miniPlot(c, cv) {
    const W = 300, Hh = 130, pad = 26;
    const xs = c.x, ys = c.y;
    const xmax = Math.max(...xs, 1e-9) * 1.1;
    const samples = Array.from({ length: 41 }, (_, i) => { const x = (xmax * i) / 40; return [x, H.evalCurve(cv, x)]; });
    const allY = ys.concat(samples.map((p) => p[1])).filter(Number.isFinite);
    let ymin = Math.min(0, ...allY), ymax = Math.max(...allY, 1e-9);
    if (ymax === ymin) ymax = ymin + 1;
    const X = (x) => pad + (x / xmax) * (W - pad - 6);
    const Y = (y) => Hh - 16 - ((y - ymin) / (ymax - ymin)) * (Hh - 24);
    const path = samples.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(Math.max(ymin, Math.min(ymax, y))).toFixed(1)}`).join('');
    const pts = xs.map((x, i) => `<circle cx="${X(x)}" cy="${Y(ys[i])}" r="3" style="fill:var(--sel)"/>`).join('');
    const svg = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" class="curve-chart" role="img" aria-label="Pontos e curva ajustada">
      <line x1="${pad}" y1="${Y(0)}" x2="${W - 6}" y2="${Y(0)}" style="stroke:var(--line)"/>
      <line x1="${pad}" y1="6" x2="${pad}" y2="${Hh - 16}" style="stroke:var(--line)"/>
      <path d="${path}" fill="none" style="stroke:var(--accent)" stroke-width="2"/>${pts}
      <text x="${pad - 4}" y="12" text-anchor="end" style="font:10px var(--f-mono);fill:var(--ink-3)">${F.fmt(ymax, 3)}</text>
      <text x="${W - 6}" y="${Hh - 3}" text-anchor="end" style="font:10px var(--f-mono);fill:var(--ink-3)">${F.fmt(xmax, 3)}</text>
    </svg>`;
    return el('div', {}, svg);
  }

  function quickResultsJunction(id, j) {
    const res = app.okResults();
    if (!res || !res.junctions[id]) return;
    const r = res.junctions[id];
    const s = section('Resultado');
    if (r.isolated) { s.appendChild(hint('Junção isolada.')); host.appendChild(s); return; }
    if (M.JT[j.type].multi) {
      s.appendChild(readout('P estagnação', out(r.P0in, 'pressure')));
      s.appendChild(readout('Vazão através', out(r.m / res.fluid.rho, 'volFlow')));
      if (j.type === 'reservoir') s.appendChild(readout('Vazão líquida para a rede', out(r.net / res.fluid.rho, 'volFlow')));
      if (j.type === 'spray' || j.type === 'exitvalve') s.appendChild(readout('Vazão descarregada', out(r.Q, 'volFlow')));
      if (j.type === 'exitvalve') s.appendChild(readout('Perda na válvula', out(r.dP, 'dp')));
    } else {
      s.appendChild(readout('Vazão', out(r.Q, 'volFlow')));
      s.appendChild(readout('P0 entrada / saída', `${out(r.P0in, 'pressure')} / ${F.fmt(F.conv(r.P0out, 'pressure', app.outUnit('insp', 'pressure'), { patm: res.patm }))}`));
      s.appendChild(readout(j.type === 'pump' ? 'Ganho de pressão' : 'ΔP', out(j.type === 'pump' ? -r.dP : r.dP, 'dp')));
    }
    const pr = res.pumps[id];
    if (pr) {
      s.appendChild(readout('Altura', out(pr.dH, 'head')));
      if (Number.isFinite(pr.speed)) s.appendChild(readout('Velocidade', F.fmt(pr.speed, 4) + ' %'));
      if (Number.isFinite(pr.Pshaft)) s.appendChild(readout('Potência no eixo', out(pr.Pshaft, 'power'))); else s.appendChild(readout('Potência hidráulica', out(pr.Pideal, 'power')));
      if (Number.isFinite(pr.NPSHA)) s.appendChild(readout('NPSH disp. / req.', `${F.fmt(pr.NPSHA, 3)} / ${F.fmt(pr.NPSHR, 3)} m`));
    }
    const vr = res.valves[id];
    if (vr) s.appendChild(readout('Estado', vr.state));
    host.appendChild(s);
  }

  HR.inspector = { init, render, pipeGeom };
})(typeof window !== 'undefined' ? window : globalThis);
