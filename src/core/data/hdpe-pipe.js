// HDPE (PE 100 and PE 80) pressure pipe — outside diameters and minimum wall thicknesses (mm) of ISO 4427-2 and
// ABNT NBR 15561, by standard dimension ratio (SDR = outside diameter / wall). The walls are those of the universal
// table of ISO 4065: e = d/SDR with the exact S of the R10 series (SDR = 2S + 1), rounded to 0.01 mm and then up to
// 0.1 mm, with a minimum of 2.0 mm, and 3.0 mm for 32 mm SDR 11 as in the PE pipe standards. A series starts at the
// first outside diameter whose d/SDR reaches 1.8 mm (decision P-03 of docs/pipe-library.md). The nominal size of
// these pipes is the outside diameter in millimetres.
(function (root) {
  const PumpIt = root.PumpIt;

  const HDPE_SDRS = ['41', '33', '26', '21', '17', '13.6', '11', '9', '7.4'];
  // [OD, wall for SDR 41, 33, 26, 21, 17, 13.6, 11, 9, 7.4]; null where the series does not exist
  const HDPE = [
    [20, null, null, null, null, null, null, 2.0, 2.3, 2.8],
    [25, null, null, null, null, null, 2.0, 2.3, 2.8, 3.5],
    [32, null, null, null, null, 2.0, 2.4, 3.0, 3.6, 4.4],
    [40, null, null, null, 2.0, 2.4, 3.0, 3.7, 4.5, 5.5],
    [50, null, null, 2.0, 2.4, 3.0, 3.7, 4.6, 5.6, 6.9],
    [63, null, 2.0, 2.5, 3.0, 3.8, 4.7, 5.8, 7.1, 8.6],
    [75, 2.0, 2.3, 2.9, 3.6, 4.5, 5.6, 6.8, 8.4, 10.3],
    [90, 2.2, 2.8, 3.5, 4.3, 5.4, 6.7, 8.2, 10.1, 12.3],
    [110, 2.7, 3.4, 4.2, 5.3, 6.6, 8.1, 10.0, 12.3, 15.1],
    [125, 3.1, 3.9, 4.8, 6.0, 7.4, 9.2, 11.4, 14.0, 17.1],
    [140, 3.5, 4.3, 5.4, 6.7, 8.3, 10.3, 12.7, 15.7, 19.2],
    [160, 4.0, 4.9, 6.2, 7.7, 9.5, 11.8, 14.6, 17.9, 21.9],
    [180, 4.4, 5.5, 6.9, 8.6, 10.7, 13.3, 16.4, 20.1, 24.6],
    [200, 4.9, 6.2, 7.7, 9.6, 11.9, 14.7, 18.2, 22.4, 27.4],
    [225, 5.5, 6.9, 8.6, 10.8, 13.4, 16.6, 20.5, 25.2, 30.8],
    [250, 6.2, 7.7, 9.6, 11.9, 14.8, 18.4, 22.7, 27.9, 34.2],
    [280, 6.9, 8.6, 10.7, 13.4, 16.6, 20.6, 25.4, 31.3, 38.3],
    [315, 7.7, 9.7, 12.1, 15.0, 18.7, 23.2, 28.6, 35.2, 43.1],
    [355, 8.7, 10.9, 13.6, 16.9, 21.1, 26.1, 32.2, 39.7, 48.5],
    [400, 9.8, 12.3, 15.3, 19.1, 23.7, 29.4, 36.3, 44.7, 54.7],
    [450, 11.0, 13.8, 17.2, 21.5, 26.7, 33.1, 40.9, 50.3, 61.5],
    [500, 12.3, 15.3, 19.1, 23.9, 29.7, 36.8, 45.4, 55.8, 68.3],
    [560, 13.7, 17.2, 21.4, 26.7, 33.2, 41.2, 50.8, 62.5, 76.5],
    [630, 15.4, 19.3, 24.1, 30.0, 37.4, 46.3, 57.2, 70.3, 86.1],
    [710, 17.4, 21.8, 27.2, 33.9, 42.1, 52.2, 64.5, 79.3, 97.0],
    [800, 19.6, 24.5, 30.6, 38.1, 47.4, 58.8, 72.6, 89.3, 109.3],
    [900, 22.0, 27.6, 34.4, 42.9, 53.3, 66.1, 81.7, 100.5, 122.9],
    [1000, 24.5, 30.6, 38.2, 47.7, 59.3, 73.5, 90.8, 111.6, 136.6],
    [1200, 29.4, 36.7, 45.9, 57.2, 71.1, 88.2, 108.9, 133.9, 163.9],
    [1400, 34.3, 42.9, 53.5, 66.7, 83.0, 102.8, 127.0, 156.3, 191.2],
    [1600, 39.2, 49.0, 61.2, 76.2, 94.8, 117.5, 145.2, 178.6, 218.5],
  ];

  // nominal pressure (bar) of water at 20 °C, PN = 20·σ/(SDR − 1) with the design stress σ = MRS/1.25 of ISO 4427-1
  // (8.0 MPa for PE 100, 6.3 MPa for PE 80), in the PN series of the pipe standards
  const HDPE_PN = {
    PE100: { 41: 4, 33: 5, 26: 6, 21: 8, 17: 10, 13.6: 12.5, 11: 16, 9: 20, 7.4: 25 },
    PE80: { 41: 3.2, 33: 4, 26: 5, 21: 6, 17: 8, 13.6: 10, 11: 12.5, 9: 16, 7.4: 20 },
  };

  PumpIt.data = Object.assign(PumpIt.data || {}, { HDPE, HDPE_SDRS, HDPE_PN });
  // the roughness of drawn tubing and plastics (Moody 1944; Hydraulic Institute); the compound sets the nominal pressure
  const rows = new Map(HDPE.map((r) => [String(r[0]), r]));
  PumpIt.data.registerPipes('hdpe', {
    sizes: HDPE.map((r) => String(r[0])),
    all: HDPE_SDRS,
    series: (de) => { const r = rows.get(de); return r ? HDPE_SDRS.filter((_, k) => r[1 + k] !== null) : []; },
    dims(de, sdr) {
      const r = rows.get(de), k = HDPE_SDRS.indexOf(sdr);
      if (!r || k < 0 || r[1 + k] === null) return null;
      return { od: r[0], wall: r[1 + k], lining: 0 };
    },
    digits: { od: 0, wall: 1 },
    eps: 0.0015, system: 'od', seriesKind: 'sdr', grades: HDPE_PN, defaults: { nps: '110', sch: '11', grade: 'PE100' },
  });
})(typeof window !== 'undefined' ? window : globalThis);
