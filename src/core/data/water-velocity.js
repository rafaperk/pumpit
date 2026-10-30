// Water velocity in pipes (m/s) — reference bands used by the drawing's colour scale and the velocity labels.
//
// The economic velocity is the one of the diameter with the lowest total cost over the life of the installation: a
// larger pipe costs more to buy and lay, a smaller one more in pumping energy (the head loss grows with about V²).
//   - minimum against deposits 0.30–0.60 m/s by the quality of the water (Martins 1976, in Tsutiya 2006); 0.40 m/s
//     in distribution networks (ABNT NBR 12218:2017). The scale keeps 0.6 m/s, the safe side;
//   - economic 0.9–1.5 m/s: Bresse's formula D = K·√Q with K = 0.9–1.2 for continuous pumping (Azevedo Netto, Manual
//     de Hidráulica) gives 0.9–1.6 m/s; 0.92–1.54 m/s computed by Zocoler et al. (2006); optimum 0.9–1.2 m/s and
//     water industry rule 0.9–1.5 m/s (Pumps & Systems, 2025); 1.5 m/s for carbon steel (Chemical Engineering, 2018);
//   - 1.5–2.0 m/s still economic when the pump runs a few hours a day or the pipe is dear: the economic velocity rises
//     as the operating time falls (Caldas et al., 2016, up to ~2.6 m/s); Bresse with K = 0.8 gives 2.0 m/s;
//   - 3.0 m/s is the usual technical and economic maximum of water mains (Tsutiya, 2006). Above 5 m/s the value is
//     off the scale.
// Sources with links in the README (Velocity colour scale). The band names come from the language catalogs
// (core.data.velocity.<band>).
(function (root) {
  const PumpIt = root.PumpIt;

  const WATER_VELOCITY = {
    stops: [[0, '#2c5fc0'], [0.6, '#3c80df'], [0.9, '#2f9e55'], [1.5, '#2f9e55'], [2.0, '#9cb43a'], [3.0, '#d4b62a'], [4.0, '#e07a2c'], [5.0, '#cf2d2d']],
    max: 5,
    over: '#000000',
    bands: [
      [0.6, 'belowMin'],
      [0.9, 'low'],
      [1.5, 'economic'],
      [2.0, 'acceptable'],
      [3.0, 'high'],
      [5.0, 'veryHigh'],
      [Infinity, 'aboveScale'],
    ],
  };
  const velocityBand = (v) => PumpIt.i18n.t('core.data.velocity.' + WATER_VELOCITY.bands.find(([lim]) => Math.abs(v) <= lim)[1]);

  PumpIt.data = Object.assign(PumpIt.data || {}, { WATER_VELOCITY, velocityBand });
})(typeof window !== 'undefined' ? window : globalThis);
