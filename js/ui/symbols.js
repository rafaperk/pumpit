// Símbolos próprios das junções, no estilo de fluxograma de processo (linhas simples, sem ícones de terceiros).
// Cada símbolo cabe num quadrado de 32×32 centrado na origem e usa currentColor.
(function (root) {
  const HR = (root.HR = root.HR || {});
  const s = 'stroke="currentColor" fill="none" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  const fillC = 'fill="currentColor"';

  const SYM = {
    reservoir: `<path d="M-13 -9V11H13V-9" ${s}/><path d="M-13 1h26V11H-13z" style="fill:var(--accent)" opacity=".28"/><path d="M-10 1c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5.5-.5" ${s} style="stroke:var(--accent)"/>`,
    pressure: `<circle r="11" ${s}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="13" ${fillC}>P</text>`,
    flow: `<circle r="11" ${s}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="13" ${fillC}>Q</text>`,
    spray: `<path d="M-8 -10h16l-5 10h-6z" ${s}/><circle cx="-6" cy="6" r="1.6" ${fillC}/><circle cx="0" cy="9" r="1.6" ${fillC}/><circle cx="6" cy="6" r="1.6" ${fillC}/><circle cx="-3" cy="12" r="1.3" ${fillC}/><circle cx="3" cy="12" r="1.3" ${fillC}/>`,
    branch: `<circle r="5.5" ${fillC}/>`,
    pump: `<circle r="11" ${s}/><path d="M-5 -7.5L9 0L-5 7.5z" ${fillC}/>`,
    valve: `<path d="M-12 -7L12 7V-7L-12 7z" ${s}/>`,
    control: `<path d="M-12 -2L12 10V-2L-12 10z" ${s}/><path d="M0 4V-7" ${s}/><path d="M-7 -7a7 6 0 0 1 14 0z" ${s}/>`,
    exitvalve: `<path d="M-14 -6L2 6V-6L-14 6z" ${s}/><path d="M5 0H14M10.5 -3.5L14 0L10.5 3.5" ${s}/>`,
    orifice: `<path d="M-13 0H13" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M0 -12V-4M0 4V12" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
    generic: `<rect x="-10" y="-10" width="20" height="20" rx="2" ${s}/><text y="4.5" text-anchor="middle" style="font-family:var(--f-mono)" font-weight="600" font-size="12" ${fillC}>K</text>`,
  };

  // junções que giram para acompanhar o sentido do escoamento (entrada → saída)
  const ROTATES = new Set(['pump', 'valve', 'control', 'orifice', 'exitvalve']);

  const icon = (type, size = 26) => `<svg viewBox="-16 -16 32 32" width="${size}" height="${size}" aria-hidden="true">${SYM[type]}</svg>`;

  HR.symbols = { SYM, ROTATES, icon };
})(typeof window !== 'undefined' ? window : globalThis);
