// Modelos de exemplo, montados do zero (não vêm de arquivos de terceiros).
(function (root) {
  const HR = (root.HR = root.HR || {});
  const M = HR.model, D = HR.data;
  const q = M.q;

  function mk(title, js, ps, extra) {
    const m = M.newModel();
    m.title = title;
    for (const [id, type, x, y, props] of js) {
      const j = M.newJunction(type, id, x, y);
      Object.assign(j, props || {});
      m.junctions.push(j);
    }
    for (const [id, up, down, set] of ps) {
      const p = M.newPipe(id, up, down);
      if (set) set(p);
      m.pipes.push(p);
    }
    m.nextId = { p: Math.max(0, ...m.pipes.map((p) => p.id)) + 1, j: Math.max(0, ...m.junctions.map((j) => j.id)) + 1 };
    if (extra) extra(m);
    return m;
  }

  // tubo de aço ASME B36.10M
  const steel = (nps, L, sch = '40', fittings = []) => (p) => {
    p.material = { kind: 'steel', nps, sch };
    p.geometry.kind = 'circular';
    p.geometry.d = q(+D.steelID(nps, sch).toFixed(2), 'mm');
    p.friction = { model: 'roughness', eps: q(0.046, 'mm'), rel: 0.0001, f: 0.02, C: 120 };
    p.length = q(L, 'm');
    p.fittings = fittings;
  };
  // tubo de diâmetro interno informado (material do usuário)
  const plain = (dmm, L, frictionSet) => (p) => {
    p.material = { kind: 'user', nps: '4', sch: '40' };
    p.geometry.d = q(dmm, 'mm');
    p.length = q(L, 'm');
    if (frictionSet) frictionSet(p.friction);
  };
  const fit = (name, qty) => Object.assign({ qty }, D.FITTINGS.find((f) => f.name === name));

  const EXAMPLES = [
    {
      id: 'pump',
      name: 'Bombeamento entre tanques',
      build: () => mk('Bombeamento entre tanques', [
        [1, 'reservoir', 100, 300, { name: 'Tanque de sucção', elevation: q(0, 'm'), liquidElev: q(3, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
        [2, 'pump', 300, 300, {
          name: 'Bomba B-101', elevation: q(0, 'm'),
          curve: { x: [0, 40, 80, 120], y: [48, 46.5, 42, 34.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
          eff: { x: [0, 40, 80, 120], y: [0, 58, 76, 70], xUnit: 'm³/h', fit: '2' },
          npshr: { x: [0, 40, 80, 120], y: [1.5, 2.0, 3.2, 5.0], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
        }],
        [3, 'valve', 520, 180, { name: 'Gaveta de recalque', elevation: q(1, 'm'), lossModel: 'K', K: 0.14 }],
        [4, 'reservoir', 800, 100, { name: 'Caixa elevada', elevation: q(22, 'm'), liquidElev: q(25, 'm'), pipeK: { 3: { kOut: 0.5, kIn: 1 } } }],
      ], [
        [1, 1, 2, steel('6', 15, '40', [fit('Cotovelo 90° padrão', 2), fit('Válvula gaveta aberta', 1)])],
        [2, 2, 3, steel('5', 8, '40', [fit('Retenção tipo portinhola', 1)])],
        [3, 3, 4, steel('5', 300, '40', [fit('Cotovelo 90° padrão', 6), fit('Curva 90° flangeada r/D = 1,5', 2)])],
      ], (m) => {
        const s = M.addScenario(m, 'base', 'Rotação 90%');
        s.overrides['j:2|speed'] = 90;
        s.notes = 'Mesma instalação com o inversor a 90% da rotação nominal.';
      }),
    },
    {
      id: 'exit',
      name: 'Recalque com pressão residual',
      build: () => mk('Recalque com pressão residual', [
        [1, 'reservoir', 100, 320, { name: 'Poço de sucção', elevation: q(0, 'm'), liquidElev: q(2, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
        [2, 'pump', 320, 320, {
          name: 'Bomba de recalque', elevation: q(0, 'm'),
          curve: { x: [0, 30, 60, 90], y: [45, 43.5, 39, 31.5], xUnit: 'm³/h', yUnit: 'm', fit: '2' },
          eff: { x: [0, 30, 60, 90], y: [0, 55, 72, 66], xUnit: 'm³/h', fit: '2' },
        }],
        [3, 'exitvalve', 700, 140, { name: 'Ponto de entrega', elevation: q(18, 'm'), Pout: q(1.5, 'kgf/cm²(g)'), lossModel: 'K', K: 0 }],
      ], [
        [1, 1, 2, steel('4', 10, '40', [fit('Válvula de pé com crivo', 1)])],
        [2, 2, 3, steel('3', 200, '40', [fit('Cotovelo 90° padrão', 4), fit('Retenção tipo portinhola', 1), fit('Válvula gaveta aberta', 1)])],
      ]),
    },
    {
      id: 'gravity',
      name: 'Gravidade entre tanques',
      build: () => mk('Gravidade entre tanques', [
        [1, 'reservoir', 120, 140, { name: 'Represa', elevation: q(45, 'm'), liquidElev: q(50, 'm'), pipeK: { 1: { kOut: 0.5, kIn: 1 } } }],
        [2, 'valve', 420, 260, { name: 'Válvula', elevation: q(25, 'm'), lossModel: 'K', K: 0.15 }],
        [3, 'reservoir', 720, 360, { name: 'Tanque', elevation: q(18, 'm'), liquidElev: q(20, 'm'), pipeK: { 2: { kOut: 0.5, kIn: 1 } } }],
      ], [
        [1, 1, 2, steel('4', 300, '40', [fit('Cotovelo 90° padrão', 2)])],
        [2, 2, 3, steel('4', 200, '40', [fit('Cotovelo 90° padrão', 2)])],
      ]),
    },
    {
      id: 'threeRes',
      name: 'Três reservatórios',
      build: () => mk('Três reservatórios', [
        [1, 'reservoir', 100, 120, { name: 'R-A', elevation: q(95, 'm'), liquidElev: q(100, 'm') }],
        [2, 'reservoir', 700, 120, { name: 'R-B', elevation: q(75, 'm'), liquidElev: q(80, 'm') }],
        [3, 'reservoir', 700, 420, { name: 'R-C', elevation: q(35, 'm'), liquidElev: q(40, 'm') }],
        [4, 'branch', 400, 270, { name: 'Junção', elevation: q(60, 'm') }],
      ], [
        [1, 1, 4, plain(300, 1000, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
        [2, 4, 2, plain(250, 800, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
        [3, 4, 3, plain(200, 1200, (f) => { f.model = 'roughness'; f.eps = q(0.26, 'mm'); })],
      ]),
    },
    {
      id: 'loop',
      name: 'Rede malhada (Hazen-Williams)',
      build: () => {
        const hw = (f) => { f.model = 'hw'; f.C = 130; };
        const src = (v) => ({ source: q(-v, 'm³/h') });
        return mk('Rede malhada', [
          [1, 'reservoir', 80, 120, { name: 'Reservatório', elevation: q(55, 'm'), liquidElev: q(60, 'm') }],
          [2, 'branch', 260, 220, Object.assign({ name: 'N2', elevation: q(20, 'm') }, src(0))],
          [3, 'branch', 460, 220, Object.assign({ name: 'N3', elevation: q(18, 'm') }, src(40))],
          [4, 'branch', 660, 220, Object.assign({ name: 'N4', elevation: q(15, 'm') }, src(30))],
          [5, 'branch', 260, 400, Object.assign({ name: 'N5', elevation: q(20, 'm') }, src(25))],
          [6, 'branch', 460, 400, Object.assign({ name: 'N6', elevation: q(17, 'm') }, src(45))],
          [7, 'branch', 660, 400, Object.assign({ name: 'N7', elevation: q(14, 'm') }, src(35))],
        ], [
          [1, 1, 2, plain(250, 300, hw)],
          [2, 2, 3, plain(200, 400, hw)],
          [3, 3, 4, plain(150, 400, hw)],
          [4, 2, 5, plain(200, 300, hw)],
          [5, 5, 6, plain(150, 400, hw)],
          [6, 6, 7, plain(100, 400, hw)],
          [7, 3, 6, plain(100, 300, hw)],
          [8, 4, 7, plain(100, 300, hw)],
        ]);
      },
    },
    {
      id: 'prv',
      name: 'Redutora de pressão',
      build: () => mk('Redutora de pressão', [
        [1, 'reservoir', 100, 140, { name: 'Reservatório alto', elevation: q(115, 'm'), liquidElev: q(120, 'm') }],
        [2, 'control', 420, 260, { name: 'VRP', elevation: q(0, 'm'), ctype: 'PRV', setP: q(3, 'kgf/cm²(g)'), basis: 'static', alwaysControl: false, kOpen: 0.5 }],
        [3, 'flow', 720, 260, { name: 'Consumo', elevation: q(0, 'm'), Q: q(80, 'm³/h'), dir: 'out' }],
      ], [
        [1, 1, 2, steel('6', 1000)],
        [2, 2, 3, steel('6', 200)],
      ], (m) => {
        const s = M.addScenario(m, 'base', 'Demanda de pico');
        s.overrides['j:3|Q'] = q(300, 'm³/h');
        s.notes = 'Consumo de pico: a pressão de montante não basta e a VRP abre totalmente.';
      }),
    },
    {
      id: 'sprinkler',
      name: 'Ramal de aspersores',
      build: () => mk('Ramal de aspersores', [
        [1, 'pressure', 80, 260, { name: 'Alimentação', elevation: q(0, 'm'), P: q(5, 'kgf/cm²(g)') }],
        [2, 'branch', 300, 260, { name: 'Derivação', elevation: q(3, 'm') }],
        [3, 'spray', 300, 90, { name: 'Aspersor 1', elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
        [4, 'branch', 520, 260, { name: 'Derivação 2', elevation: q(3, 'm') }],
        [5, 'spray', 520, 90, { name: 'Aspersor 2', elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
        [6, 'spray', 740, 260, { name: 'Aspersor 3', elevation: q(3, 'm'), sprayModel: 'K', Kf: q(80, 'L/min/bar½') }],
      ], [
        [1, 1, 2, steel('2', 30, '40', [fit('Cotovelo 90° padrão', 3)])],
        [2, 2, 3, steel('1', 2, '40', [fit('Tê — pela derivação', 1)])],
        [3, 2, 4, steel('1 1/2', 4, '40', [fit('Tê — passagem direta', 1)])],
        [4, 4, 5, steel('1', 2, '40', [fit('Tê — pela derivação', 1)])],
        [5, 4, 6, steel('1', 4)],
      ]),
    },
  ];

  HR.examples = { EXAMPLES, get: (id) => EXAMPLES.find((e) => e.id === id) };
})(typeof window !== 'undefined' ? window : globalThis);
