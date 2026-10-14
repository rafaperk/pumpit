// Unidades: o núcleo trabalha em SI; conversão só na entrada e na saída.
// Cada grandeza de entrada é guardada como { value, unit } exatamente como digitada.
(function (root) {
  const HR = (root.HR = root.HR || {});

  const G0 = 9.80665;          // m/s², gravidade padrão
  const PATM = 101325;         // Pa, 1 atm
  const PSI = 6894.757293168;  // Pa
  const LBM = 0.45359237;      // kg
  const FT = 0.3048;           // m
  const GAL = 3.785411784e-3;  // m³ (galão americano)

  // f = fator para SI; g = 1 marca pressão manométrica (soma a pressão ambiente)
  const CATS = {
    length: { m: 1, mm: 1e-3, cm: 1e-2, km: 1e3, in: 0.0254, ft: FT, mi: 1609.344 },
    area: { 'm²': 1, 'cm²': 1e-4, 'mm²': 1e-6, 'in²': 6.4516e-4, 'ft²': FT * FT },
    pressure: {
      'kPa(a)': 1e3, 'kPa(g)': { f: 1e3, g: 1 },
      'bar(a)': 1e5, 'bar(g)': { f: 1e5, g: 1 },
      'MPa(a)': 1e6, 'MPa(g)': { f: 1e6, g: 1 },
      'Pa(a)': 1, 'Pa(g)': { f: 1, g: 1 },
      psia: PSI, psig: { f: PSI, g: 1 },
      atm: PATM,
      'kgf/cm²(a)': 98066.5, 'kgf/cm²(g)': { f: 98066.5, g: 1 },
      'mca(g)': { f: 9806.65, g: 1 },
      'mmHg(a)': 133.322387415,
    },
    dp: { Pa: 1, kPa: 1e3, MPa: 1e6, bar: 1e5, psi: PSI, 'kgf/cm²': 98066.5, mca: 9806.65, mmHg: 133.322387415 },
    head: { m: 1, ft: FT },
    massFlow: { 'kg/s': 1, 'kg/h': 1 / 3600, 't/h': 1000 / 3600, 'lbm/s': LBM, 'lbm/h': LBM / 3600 },
    volFlow: {
      'm³/s': 1, 'm³/h': 1 / 3600, 'L/s': 1e-3, 'L/min': 1e-3 / 60,
      gpm: GAL / 60, 'ft³/s': FT ** 3, 'bbl/d': 0.158987294928 / 86400,
    },
    velocity: { 'm/s': 1, 'ft/s': FT },
    density: { 'kg/m³': 1, 'g/cm³': 1000, 'lbm/ft³': LBM / FT ** 3 },
    viscosity: { 'Pa·s': 1, cP: 1e-3, 'mPa·s': 1e-3, 'lbm/(ft·s)': LBM / FT },
    power: { W: 1, kW: 1e3, MW: 1e6, hp: 745.699872 },
    kfactor: { 'gpm/psi½': GAL / 60 / Math.sqrt(PSI), 'L/min/bar½': 1e-3 / 60 / Math.sqrt(1e5), 'm³/h/bar½': 1 / 3600 / Math.sqrt(1e5) },
    temperature: { '°C': 0, K: 0, '°F': 0, '°R': 0 }, // tratadas à parte
    none: { '': 1 },
  };
  // vazão: mássica ou volumétrica (a volumétrica precisa da densidade)
  CATS.flow = Object.assign({}, CATS.massFlow, CATS.volFlow);

  function spec(cat, unit) {
    const c = CATS[cat];
    if (!c) throw new Error('Categoria de unidade desconhecida: ' + cat);
    const s = c[unit];
    if (s === undefined) throw new Error(`Unidade "${unit}" não pertence a ${cat}`);
    return typeof s === 'number' ? { f: s, g: 0 } : s;
  }

  function tempToK(v, unit) {
    switch (unit) {
      case '°C': return v + 273.15;
      case 'K': return v;
      case '°F': return (v - 32) * 5 / 9 + 273.15;
      case '°R': return v * 5 / 9;
    }
    throw new Error('Unidade de temperatura desconhecida: ' + unit);
  }
  function tempFromK(k, unit) {
    switch (unit) {
      case '°C': return k - 273.15;
      case 'K': return k;
      case '°F': return (k - 273.15) * 9 / 5 + 32;
      case '°R': return k * 9 / 5;
    }
    throw new Error('Unidade de temperatura desconhecida: ' + unit);
  }

  // ctx: { rho (kg/m³), patm (Pa) }
  function toSI(v, unit, cat, ctx = {}) {
    if (cat === 'temperature') return tempToK(v, unit);
    if (cat === 'flow' && unit in CATS.volFlow) {
      if (!(ctx.rho > 0)) throw new Error('Conversão de vazão volumétrica exige a densidade');
      return v * CATS.volFlow[unit] * ctx.rho;
    }
    const s = spec(cat, unit);
    return v * s.f + (s.g ? (ctx.patm ?? PATM) : 0);
  }
  function fromSI(v, unit, cat, ctx = {}) {
    if (cat === 'temperature') return tempFromK(v, unit);
    if (cat === 'flow' && unit in CATS.volFlow) {
      if (!(ctx.rho > 0)) throw new Error('Conversão de vazão volumétrica exige a densidade');
      return v / ctx.rho / CATS.volFlow[unit];
    }
    const s = spec(cat, unit);
    return (v - (s.g ? (ctx.patm ?? PATM) : 0)) / s.f;
  }

  const list = (cat) => Object.keys(CATS[cat] || {});
  const has = (cat, unit) => !!CATS[cat] && unit in CATS[cat];
  const isVolumetric = (unit) => unit in CATS.volFlow;

  HR.units = { CATS, G0, PATM, PSI, toSI, fromSI, list, has, isVolumetric, q: (value, unit) => ({ value, unit }) };
})(typeof window !== 'undefined' ? window : globalThis);
