// Water velocity in pipes (m/s) — reference bands used by the drawing's colour scale and the velocity labels.
//
// Usual minimum 0.6–0.7 m/s (self-cleansing, avoids sedimentation). Economic velocity in pumped mains:
// 0.62–2.65 m/s in Brazilian studies (Caldas et al., 2016; Perroni et al., 2011); design practice 1–3 m/s
// for discharge lines and 1.2–3.0 m/s for general service (Crane TP-410). Usual upper limit 3 m/s;
// erosion in carbon steel from ~4.6 m/s (15 ft/s). Above 5 m/s the value is off the scale.
// The band names come from the language catalogs (core.data.velocity.<band>).
(function (root) {
  const PumpIt = root.PumpIt;

  const WATER_VELOCITY = {
    stops: [[0, '#2c5fc0'], [0.6, '#3c80df'], [1.0, '#2aa7b5'], [1.5, '#2f9e55'], [2.5, '#2f9e55'], [3.0, '#d4b62a'], [4.0, '#e07a2c'], [5.0, '#cf2d2d']],
    max: 5,
    over: '#000000',
    bands: [
      [0.6, 'belowMin'],
      [1.0, 'low'],
      [2.5, 'economic'],
      [3.0, 'high'],
      [5.0, 'veryHigh'],
      [Infinity, 'aboveScale'],
    ],
  };
  const velocityBand = (v) => PumpIt.i18n.t('core.data.velocity.' + WATER_VELOCITY.bands.find(([lim]) => Math.abs(v) <= lim)[1]);

  PumpIt.data = Object.assign(PumpIt.data || {}, { WATER_VELOCITY, velocityBand });
})(typeof window !== 'undefined' ? window : globalThis);
