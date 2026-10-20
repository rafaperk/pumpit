// Stainless steel pipe — nominal dimensions from ASME B36.19M-2018 (outside diameter and wall thickness, inches), as
// tabulated by the Hydraulic Institute (HI Data Tool, table 4.B.1). The outside diameters are those of ASME B36.10M.
(function (root) {
  const PumpIt = root.PumpIt;

  // [NPS, OD, wall Sch 5S, 10S, 40S, 80S]; null where the standard has no such schedule
  const B3619 = [
    ['1/8', 0.405, null, 0.049, 0.068, 0.095],
    ['1/4', 0.540, null, 0.065, 0.088, 0.119],
    ['3/8', 0.675, null, 0.065, 0.091, 0.126],
    ['1/2', 0.840, 0.065, 0.083, 0.109, 0.147],
    ['3/4', 1.050, 0.065, 0.083, 0.113, 0.154],
    ['1', 1.315, 0.065, 0.109, 0.133, 0.179],
    ['1 1/4', 1.660, 0.065, 0.109, 0.140, 0.191],
    ['1 1/2', 1.900, 0.065, 0.109, 0.145, 0.200],
    ['2', 2.375, 0.065, 0.109, 0.154, 0.218],
    ['2 1/2', 2.875, 0.083, 0.120, 0.203, 0.276],
    ['3', 3.500, 0.083, 0.120, 0.216, 0.300],
    ['3 1/2', 4.000, 0.083, 0.120, 0.226, 0.318],
    ['4', 4.500, 0.083, 0.120, 0.237, 0.337],
    ['5', 5.563, 0.109, 0.134, 0.258, 0.375],
    ['6', 6.625, 0.109, 0.134, 0.280, 0.432],
    ['8', 8.625, 0.109, 0.148, 0.322, 0.500],
    ['10', 10.750, 0.134, 0.165, 0.365, 0.500],
    ['12', 12.750, 0.156, 0.180, 0.375, 0.500],
    ['14', 14.000, 0.156, 0.188, 0.375, 0.500],
    ['16', 16.000, 0.165, 0.188, 0.375, 0.500],
    ['18', 18.000, 0.165, 0.188, 0.375, 0.500],
    ['20', 20.000, 0.188, 0.218, 0.375, 0.500],
    ['22', 22.000, 0.188, 0.218, null, null],
    ['24', 24.000, 0.218, 0.250, 0.375, 0.500],
    ['30', 30.000, 0.250, 0.312, null, null],
  ];
  const STAINLESS_SCHEDULES = ['5S', '10S', '40S', '80S'];

  PumpIt.data = Object.assign(PumpIt.data || {}, { B3619, STAINLESS_SCHEDULES });
  // the roughness the Hydraulic Institute gives for these pipes (Engineering Data Book; decision P-06)
  PumpIt.data.registerPipes('stainless', Object.assign(PumpIt.data.inchCatalog(B3619, STAINLESS_SCHEDULES), {
    eps: 0.015, system: 'nps', seriesKind: 'schedule', defaults: { nps: '4', sch: '10S' },
  }));
})(typeof window !== 'undefined' ? window : globalThis);
