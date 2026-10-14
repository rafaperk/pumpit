// Dados de engenharia montados a partir das fontes primárias públicas citadas em cada tabela.
(function (root) {
  const HR = (root.HR = root.HR || {});

  // Tubo de aço carbono — dimensões nominais da ASME B36.10M (diâmetro externo e espessura, em polegadas).
  // [NPS, DE, parede Sch 40, parede Sch 80, parede STD, parede XS]
  const B3610 = [
    ['1/2', 0.840, 0.109, 0.147, 0.109, 0.147],
    ['3/4', 1.050, 0.113, 0.154, 0.113, 0.154],
    ['1', 1.315, 0.133, 0.179, 0.133, 0.179],
    ['1 1/4', 1.660, 0.140, 0.191, 0.140, 0.191],
    ['1 1/2', 1.900, 0.145, 0.200, 0.145, 0.200],
    ['2', 2.375, 0.154, 0.218, 0.154, 0.218],
    ['2 1/2', 2.875, 0.203, 0.276, 0.203, 0.276],
    ['3', 3.500, 0.216, 0.300, 0.216, 0.300],
    ['4', 4.500, 0.237, 0.337, 0.237, 0.337],
    ['5', 5.563, 0.258, 0.375, 0.258, 0.375],
    ['6', 6.625, 0.280, 0.432, 0.280, 0.432],
    ['8', 8.625, 0.322, 0.500, 0.322, 0.500],
    ['10', 10.750, 0.365, 0.594, 0.365, 0.500],
    ['12', 12.750, 0.406, 0.688, 0.375, 0.500],
    ['14', 14.000, 0.438, 0.750, 0.375, 0.500],
    ['16', 16.000, 0.500, 0.844, 0.375, 0.500],
    ['18', 18.000, 0.562, 0.938, 0.375, 0.500],
    ['20', 20.000, 0.594, 1.031, 0.375, 0.500],
    ['24', 24.000, 0.688, 1.219, 0.375, 0.500],
  ];
  const SCHEDULES = ['40', '80', 'STD', 'XS'];
  const STEEL_NPS = B3610.map((r) => r[0]);

  // diâmetro interno em mm
  function steelID(nps, sch) {
    const row = B3610.find((r) => r[0] === nps);
    const k = SCHEDULES.indexOf(sch);
    if (!row || k < 0) return NaN;
    return (row[1] - 2 * row[2 + k]) * 25.4;
  }

  // Rugosidade absoluta típica (mm) — valores de tabela de livro-texto (Moody 1944; White, Fluid Mechanics, tab. 6.1).
  const ROUGHNESS = [
    { name: 'Aço comercial', mm: 0.046 },
    { name: 'Ferro galvanizado', mm: 0.15 },
    { name: 'Ferro fundido', mm: 0.26 },
    { name: 'Ferro fundido asfaltado', mm: 0.12 },
    { name: 'Concreto (médio)', mm: 1.2 },
    { name: 'Aço rebitado (médio)', mm: 3.0 },
    { name: 'Tubo trefilado (cobre, latão, inox)', mm: 0.0015 },
    { name: 'Plástico (PVC, PEAD)', mm: 0.0015 },
  ];

  // Acessórios — Crane TP-410: K = n·f_T (n = K/f_T) ou K constante.
  const FITTINGS = [
    { name: 'Cotovelo 90° padrão', model: 'KfT', value: 30 },
    { name: 'Cotovelo 45° padrão', model: 'KfT', value: 16 },
    { name: 'Curva de retorno 180°', model: 'KfT', value: 50 },
    { name: 'Curva 90° flangeada r/D = 1,5', model: 'KfT', value: 14 },
    { name: 'Tê — passagem direta', model: 'KfT', value: 20 },
    { name: 'Tê — pela derivação', model: 'KfT', value: 60 },
    { name: 'Válvula gaveta aberta', model: 'KfT', value: 8 },
    { name: 'Válvula globo aberta', model: 'KfT', value: 340 },
    { name: 'Válvula angular 90° aberta', model: 'KfT', value: 150 },
    { name: 'Válvula esfera, passagem plena', model: 'KfT', value: 3 },
    { name: 'Válvula borboleta (2"–8")', model: 'KfT', value: 45 },
    { name: 'Válvula macho, passagem reta', model: 'KfT', value: 18 },
    { name: 'Retenção tipo portinhola', model: 'KfT', value: 100 },
    { name: 'Válvula de pé com crivo', model: 'KfT', value: 75 },
    { name: 'Entrada de borda viva', model: 'K', value: 0.5 },
    { name: 'Entrada reentrante', model: 'K', value: 0.78 },
    { name: 'Entrada arredondada', model: 'K', value: 0.04 },
    { name: 'Saída de tubo', model: 'K', value: 1.0 },
  ];

  // Velocidade de água em tubulação (m/s) — faixas de referência da escala de cores do desenho.
  // Mínimo usual 0,6–0,7 m/s (autolimpeza, evita sedimentação). Velocidade econômica em adutoras de
  // recalque: 0,62–2,65 m/s em estudos brasileiros (Caldas et al., 2016; Perroni et al., 2011); prática
  // de projeto 1–3 m/s em recalque e 1,2–3,0 m/s em serviço geral (Crane TP-410). Limite superior usual
  // 3 m/s; erosão em aço carbono a partir de ~4,6 m/s (15 ft/s). Acima de 5 m/s fica fora da escala.
  const WATER_VELOCITY = {
    stops: [[0, '#2c5fc0'], [0.6, '#3c80df'], [1.0, '#2aa7b5'], [1.5, '#2f9e55'], [2.5, '#2f9e55'], [3.0, '#d4b62a'], [4.0, '#e07a2c'], [5.0, '#cf2d2d']],
    max: 5,
    over: '#000000',
    bands: [
      [0.6, 'abaixo do mínimo usual'],
      [1.0, 'baixa'],
      [2.5, 'faixa econômica'],
      [3.0, 'alta'],
      [5.0, 'muito alta: risco de erosão e golpe'],
      [Infinity, 'acima de 5 m/s'],
    ],
  };
  const velocityBand = (v) => WATER_VELOCITY.bands.find(([lim]) => Math.abs(v) <= lim)[1];

  HR.data = { B3610, SCHEDULES, STEEL_NPS, steelID, ROUGHNESS, FITTINGS, WATER_VELOCITY, velocityBand };
})(typeof window !== 'undefined' ? window : globalThis);
