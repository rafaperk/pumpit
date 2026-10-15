// Carbon steel pipe — nominal dimensions from ASME B36.10M (outside diameter and wall thickness, inches).
(function (root) {
  const PumpIt = root.PumpIt;

  // [NPS, OD, wall Sch 40, wall Sch 80, wall STD, wall XS]
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

  // inside diameter in mm
  function steelID(nps, sch) {
    const row = B3610.find((r) => r[0] === nps);
    const k = SCHEDULES.indexOf(sch);
    if (!row || k < 0) return NaN;
    return (row[1] - 2 * row[2 + k]) * 25.4;
  }

  PumpIt.data = Object.assign(PumpIt.data || {}, { B3610, SCHEDULES, STEEL_NPS, steelID });
})(typeof window !== 'undefined' ? window : globalThis);
