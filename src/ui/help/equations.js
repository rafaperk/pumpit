// Help: the formulas of the technical reference. They are the same in every language, so they live here once, as
// HTML; a help body writes [[eq:id]] to show one. The few words inside them are written «id» and come from WORDS in
// the language of the help, and English gets the decimal point. Every formula matches the code it documents
// (src/core/solver/, src/core/hydraulics/, src/core/junctions/, src/core/fluids/).
(function (root) {
  const PumpIt = root.PumpIt;

  const v = (s) => `<i>${s}</i>`; // a variable
  const sub = (x, i) => `${x}<sub>${i}</sub>`;
  const sup = (x, e) => `${x}<sup>${e}</sup>`;
  const frac = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
  const sqrt = (x) => `<span class="sq">√<span>${x}</span></span>`;
  const row = (...parts) => `<span class="eq-row">${parts.join('')}</span>`;
  const gap = '<span class="eq-gap"></span>';
  const SP = ' ';

  const rho = v('ρ'), mu = v('μ'), V = v('V'), g = v('g'), m = v('ṁ'), Q = v('Q'), K = v('K'), f = v('f'), L = v('L');
  const Dh = sub(v('D'), 'h'), P0 = sub(v('P'), '0'), Re = v('Re'), A = v('A'), N = v('N'), s = v('s'), z = v('z');
  const dp = (i) => `Δ${i ? sub(v('p'), i) : v('p')}`;
  const half = `½${SP}${rho}${SP}${sup(V, 2)}`;
  const vv = (x) => `${rho}${SP}${x}|${x}|`;

  const BLOCK = {
    // the network
    continuity: row(`Σ ${sub(m, '«in»')} − Σ ${sub(m, '«out»')} − ${sub(m, '«dem»')} = 0`),
    linkLoss: row(`${sub(P0, 'a')} − ${sub(P0, 'b')} + ${rho} ${g} (${sub(z, 'a')} − ${sub(z, 'b')}) − ${dp()}(${m}) = 0`),
    fixedNode: row(`${P0} = ${sub(v('P'), 'fix')}`, gap, '«or»', gap, `${P0} − ${half} = ${sub(v('p'), 'fix')}`),
    newtonStep: row(`${v('J')}(${sub(v('x'), v('k'))}) · Δ${v('x')} = −${v('R')}(${sub(v('x'), v('k'))})`, gap, `${sub(v('x'), v('k') + '+1')} = ${sub(v('x'), v('k'))} + ${v('α')} Δ${v('x')}`),
    jacobian: row(`${frac(`∂${dp()}`, `∂${m}`)} ≈ ${frac(`${dp()}(${m} + ${v('h')}) − ${dp()}(${m} − ${v('h')})`, `2${v('h')}`)}`, gap, `${v('h')} = 10<sup>−6</sup> · max(|${m}|, ${sub(m, 'ref')})`),
    lineSearch: row(`‖${v('R')}(${v('x')} + ${v('α')} Δ${v('x')})‖ ≤ (1 − 10<sup>−4</sup> ${v('α')}) · ‖${v('R')}(${v('x')})‖`),
    convergence: row(`max<sub>${v('i')}</sub> ${frac(`|Δ${sub(v('x'), v('i'))}|`, `max(|${sub(v('x'), v('i'))} + Δ${sub(v('x'), v('i'))}| ; ${sub(v('ε'), v('i'))} / tol)`)} ≤ tol`),
    // pipes
    velocity: row(`${V} = ${frac(m, `${N} ${rho} ${A}`)}`, gap, `${Re} = ${frac(`${rho} |${V}| ${Dh}`, mu)}`),
    darcy: row(`${dp('f')} = ${f} ${frac(L, Dh)} ${frac(vv(V), '2')}`),
    laminar: row(`${dp('f')} = ${frac(`32 ${mu} ${L} ${V}`, sup(Dh, 2))}`, gap, '⇔', gap, `${f} = ${frac('64', Re)}`),
    colebrook: row(`${frac('1', sqrt(f))} = 1,14 − 2 log<sub>10</sub> ( ${frac(v('ε'), Dh)} + ${frac('9,35', `${Re} ${sqrt(f)}`)} )`),
    transition: row(`${f} = (1 − ${v('w')}) ${frac('64', sub(Re, 'lam'))} + ${v('w')} · ${sub(f, 'C')}(${sub(Re, 'turb')})`, gap, `${v('w')} = ${frac(`${Re} − ${sub(Re, 'lam')}`, `${sub(Re, 'turb')} − ${sub(Re, 'lam')}`)}`),
    hazen: row(`${V} = ${v('k')} ${v('C')} ${sup(sub(v('R'), 'h'), '0,63')} ${sup(v('S'), '0,54')}`, gap, `${v('k')} = 0,848684`, gap, `${sub(v('R'), 'h')} = ${Dh} / 4`, gap, `${dp('f')} = ${rho} ${sub(g, '0')} ${v('S')} ${L}`),
    hydraulicDiameter: row(`${Dh} = ${frac(`4 ${A}`, v('P'))}`, gap, `○ ${v('D')}`, gap, `◎ ${sub(v('D'), 'e')} − ${sub(v('D'), 'i')}`, gap, `▭ ${frac(`2 ${v('a')} ${v('b')}`, `${v('a')} + ${v('b')}`)}`),
    fouling: row(`${Dh}′ = ${Dh} (1 − ${v('r')})`, gap, `${A}′ = ${A} (1 − ${v('r')})<sup>2</sup>`),
    minor: row(`${dp('K')} = ${K} ${frac(vv(V), '2')}`),
    fittingsSum: row(`${sub(K, '«pipe»')} = Σ ${sub(v('n'), v('i'))} ${sub(K, v('i'))}`, gap, `${sub(K, v('i'))} = (${K}/${sub(f, 'T')})<sub>${v('i')}</sub> · ${sub(f, 'T')}`),
    craneFT: row(`${sub(f, 'T')} = [ 1,14 − 2 log<sub>10</sub>(${sub(v('ε'), 'c')} / ${Dh}) ]<sup>−2</sup>`, gap, `${sub(v('ε'), 'c')} = 0,0018 in = 0,04572 mm`),
    atkf: row(`${sub(K, 'lam')} = ${K} · max ( 1 ; ${frac(`64 / ${Re}`, sub(f, 'ref'))} )`, gap, `${Re} < ${sub(Re, 'lam')}`),
    atkfTransition: row(`${sub(K, '«eff»')} = ${K} · [ (1 − ${v('w')}) · max ( 1 ; ${frac(`64 / ${sub(Re, 'lam')}`, sub(f, 'ref'))} ) + ${v('w')} ]`, gap, `${sub(Re, 'lam')} ≤ ${Re} < ${sub(Re, 'turb')}`),
    // pumps
    pumpCurve: row(`${v('H')}(${Q}) = ${sup(s, 2)} · ${sub(v('H'), '1')} ( ${frac(Q, `${N} ${s}`)} )`, gap, `${s} = ${frac('«speed»', '«ratedSpeed»')}`),
    pumpLink: row(`${dp()}(${m}) = −${rho} ${g} ${v('H')}(${m} / ${rho})`),
    pumpSpeed: row(`${sup(s, 2)} · ${sub(v('H'), '1')} ( ${frac(Q, `${N} ${s}`)} ) = Δ${v('H')}`, gap, `0,01 ≤ ${s} ≤ 3`),
    pumpPower: row(`Δ${v('H')} = ${frac(`Δ${P0}`, `${rho} ${g}`)}`, gap, `${sub(v('P'), '«hyd»')} = ${Q} · Δ${P0}`, gap, `${sub(v('P'), '«shaft»')} = ${frac(sub(v('P'), '«hyd»'), v('η'))}`),
    npsh: row(`NPSH<sub>«available»</sub> = ${frac(`${sub(P0, '«suction»')} − ${sub(v('p'), 'v')}`, `${rho} ${g}`)}`, gap, `NPSH<sub>«required»</sub>(${Q}) = ${sup(s, 2)} · NPSH<sub>«required»,1</sub> ( ${frac(Q, `${N} ${s}`)} )`),
    polyfit: row(`${v('y')}(${v('x')}) = ${sub(v('a'), '0')} + ${sub(v('a'), '1')} ${v('x')} + … + ${sub(v('a'), v('n'))} ${sup(v('x'), v('n'))}`, gap, `${v('n')} ≤ 4`, gap, `min Σ [ ${sub(v('y'), v('i'))} − ${v('y')}(${sub(v('x'), v('i'))}) ]<sup>2</sup>`),
    // valves and other elements
    valveK: row(`${dp()} = ${K} ${frac(vv(sub(V, '1')), '2')}`, gap, `${sub(V, '1')}: «upstreamVelocity»`),
    cv: row(`${dp()}[psi] = ${frac(rho, '999,0')} ( ${frac(`${Q}[gpm]`, v('Cv'))} )<sup>2</sup>`, gap, `${dp()}[bar] = ${frac(rho, '1000')} ( ${frac(`${Q}[m³/h]`, v('Kv'))} )<sup>2</sup>`),
    cvEquivalent: row(`${sub(v('Cv'), 'eq')} = ${Q}[gpm] · ${sqrt(`${frac(rho, '999,0')} / ${dp()}[psi]`)}`),
    orificeCd: row(`${K} = ${frac(`1 − ${sup('β', 4)}`, sup(sub(v('C'), 'd'), 2))} · ( ${frac(sub(A, '1'), sub(A, 'o'))} )<sup>2</sup>`, gap, `β = ${frac(sub(v('d'), 'o'), sub(v('D'), '1'))}`),
    orificeSharp: row(`${K} = ( ${frac(sub(A, '1'), sub(A, 'o'))} )<sup>2</sup> [ 0,707 ( 1 − ${frac(sub(A, 'o'), sub(A, '1'))} )<sup>0,375</sup> + 1 − ${frac(sub(A, 'o'), sub(A, '2'))} ]<sup>2</sup>`),
    orificeRounded: row(`${K}′ = 0,03 + 0,47 · 10<sup>−7,7 ${v('r')} / ${sub(v('d'), 'o')}</sup>`, gap, `${K} = ( ${frac(sub(A, '1'), sub(A, 'o'))} )<sup>2</sup> [ 1 − ${frac(sub(A, 'o'), sub(A, '1'))} + ${sqrt(`${K}′`)} ( 1 − ${frac(sub(A, 'o'), sub(A, '1'))} )<sup>0,75</sup> ]<sup>2</sup>`),
    spray: row(`${dp()} = ${frac(`${m}|${m}|`, `2 ${rho} (${sub(v('C'), 'd')}${A})<sup>2</sup>`)}`, gap, '⇔', gap, `${Q} = ${sub(v('C'), 'd')}${A} ${sqrt(`2 ${dp()} / ${rho}`)}`),
    sprayArea: row(`${sub(v('C'), 'd')}${A} = ${sub(v('C'), 'd')} · ${v('n')} · ${frac(`π ${sup(v('d'), 2)}`, '4')}`, gap, '«or»', gap, `${sub(v('C'), 'd')}${A} = ${K} ${sqrt(`${sub(rho, '«water»')} / 2`)}`, gap, `${Q} = ${K} ${sqrt(dp())}`),
    exitValve: row(`${sub(P0, '«end»')} = ${sub(v('p'), '«residual»')} + ${dp('«valve»')}`),
    genericCurve: row(`${dp()} = «sign»(${m}) · ${sub(v('F'), '«fit»')}( |${Q}| )`),
    // results
    stagnation: row(`${P0} = ${v('p')} + ${half}`),
    heads: row(`HGL = ${frac(v('p'), `${rho} ${g}`)} + ${z}`, gap, `EGL = ${frac(P0, `${rho} ${g}`)} + ${z}`, gap, `${sub(v('h'), 'L')} = ${frac(dp('«losses»'), `${rho} ${g}`)}`),
    gauge: row(`${sub(v('p'), 'abs')} = ${sub(v('p'), '«gauge»')} + ${sub(v('p'), '«amb»')}`),
    effectiveK: row(`${sub(K, '«eff»')} = ${frac(`Δ${P0}`, `½ ${rho} ${sup(sub(V, '1'), 2)}`)}`),
    // water
    kell: row(`${rho}(${v('t')}) = ${frac(`999,83952 + 16,945176 ${v('t')} − 7,9870401·10<sup>−3</sup> ${sup(v('t'), 2)} − 46,170461·10<sup>−6</sup> ${sup(v('t'), 3)} + 105,56302·10<sup>−9</sup> ${sup(v('t'), 4)} − 280,54253·10<sup>−12</sup> ${sup(v('t'), 5)}`, `1 + 16,879850·10<sup>−3</sup> ${v('t')}`)}`),
    vogel: row(`${mu} [mPa·s] = exp ( −3,7188 + ${frac('578,919', `${v('T')} − 137,546`)} )`),
    iapws: row(`${v('θ')} = ${v('T')} + ${frac(sub(v('n'), '9'), `${v('T')} − ${sub(v('n'), '10')}`)}`, gap, `${sub(v('p'), 's')} = [ ${frac(`2 ${v('C')}`, `−${v('B')} + ${sqrt(`${sup(v('B'), 2)} − 4 ${v('A')} ${v('C')}`)}`)} ]<sup>4</sup> MPa`),
  };

  // words inside the formulas: [pt-BR, en, es]
  const WORDS = {
    in: ['entra', 'in', 'entra'], out: ['sai', 'out', 'sale'], dem: ['dem', 'dem', 'dem'], or: ['ou', 'or', 'o'],
    pipe: ['tubo', 'pipe', 'tubo'], eff: ['ef', 'eff', 'ef'], speed: ['rotação', 'speed', 'velocidad'],
    ratedSpeed: ['rotação nominal', 'rated speed', 'velocidad nominal'], hyd: ['hid', 'hyd', 'hid'], shaft: ['eixo', 'shaft', 'eje'],
    available: ['D', 'A', 'D'], required: ['R', 'R', 'R'], suction: ['suc', 'suc', 'suc'],
    upstreamVelocity: ['velocidade no tubo de montante', 'velocity in the upstream pipe', 'velocidad en el tubo aguas arriba'],
    water: ['água', 'water', 'agua'], end: ['ponta', 'end', 'extremo'], residual: ['residual', 'residual', 'residual'],
    valve: ['válvula', 'valve', 'válvula'], sign: ['sinal', 'sign', 'signo'], fit: ['ajuste', 'fit', 'ajuste'],
    losses: ['perdas', 'losses', 'pérdidas'], gauge: ['man', 'g', 'man'], amb: ['amb', 'amb', 'amb'],
  };
  const LANGS = { 'pt-BR': 0, en: 1, es: 2 };

  // a formula in a language (undefined for an unknown id)
  function formula(id, lang) {
    const html = BLOCK[id];
    if (html === undefined) return undefined;
    const k = LANGS[lang] ?? 0;
    let out = html.replace(/«(\w+)»/g, (w, key) => (WORDS[key] ? WORDS[key][k] : w));
    if (k === 1) out = out.replace(/(\d),(\d)/g, '$1.$2');
    return out;
  }

  PumpIt.ui.helpEquations = { BLOCK, WORDS, formula };
})(typeof window !== 'undefined' ? window : globalThis);
