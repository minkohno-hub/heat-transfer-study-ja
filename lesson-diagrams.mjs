// Original app-created lesson diagrams (assets/lesson-diagrams/).
// Each SVG is an independent, self-contained teaching figure created for this
// app; it is not a reproduction of the textbook's figures. This module is the
// single registry that ties a book section id to its diagram asset, so the
// reader UI, the public-site build and the service worker all use the same
// section -> asset correspondence.
export const LESSON_DIAGRAMS = Object.freeze({
  '1.1': 'section-1-1-heat-rate-flux-integrals.svg',
  '1.2': 'section-1-2-energy-balance-vs-heat-equation.svg',
  '2.3': 'section-2-3-series-parallel-thermal-resistance.svg',
  '2.4': 'section-2-4-cylindrical-wall-resistance.svg',
  '3.2': 'section-3-2-counterflow-lmtd.svg',
  '3.3': 'section-3-3-ntu-isothermal-heat-exchanger.svg',
  '3.4': 'section-3-4-required-heat-transfer-area.svg',
  '4.2': 'section-4-2-uniform-generation-plane-wall.svg',
  '4.3': 'section-4-3-bi-fo-similarity-scaling.svg',
  '4.5': 'section-4-5-adiabatic-fin-efficiency-effectiveness.svg',
  '5.2': 'section-5-2-lumped-capacitance-exponential-cooling.svg',
  '5.3': 'section-5-3-transient-slab-cooling.svg',
  '5.6': 'section-5-6-semi-infinite-error-function.svg',
  '6.1': 'section-6-1-velocity-thermal-boundary-layers.svg',
  '7.2': 'section-7-2-laminar-pipe-entrance-lengths.svg',
  '8.4': 'section-8-4-natural-convection-orientation.svg',
  '8.5': 'section-8-5-film-condensation-liquid-film.svg',
  '9.1': 'section-9-1-pool-boiling-curve-regimes.svg',
  '9.2': 'section-9-2-spherical-bubble-laplace-pressure.svg',
  '9.3': 'section-9-3-critical-heat-flux-liquid-vapor-counterflow.svg',
  '9.4': 'section-9-4-film-boiling-vapor-layer-resistance.svg',
  '10.1': 'section-10-1-radiosity-irradiation-balance.svg',
  '10.2': 'section-10-2-kirchhoff-spectral-bands.svg',
  '10.3': 'section-10-3-view-factor-reciprocity.svg',
  '10.4': 'section-10-4-gray-surface-radiation-network.svg',
  '10.5': 'section-10-5-gas-radiation-beer-hottel.svg',
  '10.6': 'section-10-6-solar-roof-balance.svg',
  '11.3': 'section-11-3-fick-molar-diffusion-comparison.svg',
});

// Repository-relative paths of every diagram asset, in section order.
export const LESSON_DIAGRAM_PATHS = Object.freeze(
  Object.values(LESSON_DIAGRAMS).map(file => `assets/lesson-diagrams/${file}`),
);

// './'-prefixed path for a section's diagram, or null when the section has none.
export function lessonDiagramPath(sectionId) {
  const file = LESSON_DIAGRAMS[sectionId];
  return file ? `./assets/lesson-diagrams/${file}` : null;
}
