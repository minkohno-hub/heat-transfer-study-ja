import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SIM_MODEL_CALCULATORS, calculateSimulationModel, validateLearningData, createEmptyState, DATA_FORMAT } from '../study-core.mjs';
import { GUIDE_SECTIONS } from '../guide.mjs';
import { FIN_DEFAULTS } from '../fin-efficiency.mjs';
import { EXCHANGER_DEFAULTS } from '../heat-exchanger.mjs';
import { SLAB_DEFAULTS } from '../transient-slab.mjs';
import { RADIATION_ENCLOSURE_DEFAULTS } from '../radiation-enclosure.mjs';
import { CYLINDER_DEFAULTS } from '../cylindrical-insulation.mjs';
import { SEMI_INFINITE_DEFAULTS } from '../semi-infinite-solid.mjs';
import { FLAT_PLATE_DEFAULTS } from '../forced-convection-flat-plate.mjs';
import { PIPE_DEFAULTS } from '../turbulent-pipe-convection.mjs';
import { CROSSFLOW_DEFAULTS } from '../cylinder-crossflow.mjs';
import { NATURAL_DEFAULTS } from '../natural-convection-vertical.mjs';
import { LAMINAR_PIPE_DEFAULTS } from '../laminar-pipe-convection.mjs';
import { CONDENSATION_DEFAULTS } from '../laminar-film-condensation.mjs';
import { BINARY_DIFFUSION_DEFAULTS } from '../binary-gas-diffusion.mjs';
import { NUCLEATE_DEFAULTS } from '../pool-boiling-nucleate.mjs';
import { CHF_DEFAULTS } from '../pool-boiling-chf.mjs';

const NEW_MODES = {
  fin: FIN_DEFAULTS,
  exchanger: EXCHANGER_DEFAULTS,
  slab: SLAB_DEFAULTS,
  enclosure: RADIATION_ENCLOSURE_DEFAULTS,
  cylinder: CYLINDER_DEFAULTS,
  halfspace: SEMI_INFINITE_DEFAULTS,
  flatplate: FLAT_PLATE_DEFAULTS,
  pipe: PIPE_DEFAULTS,
  crossflow: CROSSFLOW_DEFAULTS,
  natural: NATURAL_DEFAULTS,
  laminarpipe: LAMINAR_PIPE_DEFAULTS,
  condensation: CONDENSATION_DEFAULTS,
  diffusion: BINARY_DIFFUSION_DEFAULTS,
  nucleate: NUCLEATE_DEFAULTS,
  chf: CHF_DEFAULTS
};
const MODEL_FILES = ['fin-efficiency.mjs','heat-exchanger.mjs','transient-slab.mjs','radiation-enclosure.mjs','cylindrical-insulation.mjs','semi-infinite-solid.mjs','forced-convection-flat-plate.mjs','turbulent-pipe-convection.mjs','cylinder-crossflow.mjs','natural-convection-vertical.mjs','laminar-pipe-convection.mjs','laminar-film-condensation.mjs','binary-gas-diffusion.mjs','pool-boiling-nucleate.mjs','pool-boiling-chf.mjs'];
const exportedWith = simComparisons => ({ ...createEmptyState(), format: DATA_FORMAT, simComparisons });

test('all 15 added simulator modes are registered in the shared calculator dispatch', () => {
  assert.deepEqual(Object.keys(SIM_MODEL_CALCULATORS).sort(), Object.keys(NEW_MODES).sort());
  for (const [mode, defaults] of Object.entries(NEW_MODES)) {
    const result = calculateSimulationModel(mode, { ...defaults });
    assert.ok(!result.error, `${mode}: ${result.error || ''}`);
  }
  // The original five modes keep their previous dispatch results.
  assert.equal(calculateSimulationModel('conduction', { k: 15, area: 0.5, thickness: 0.08, hot: 80, cold: 20 }).watts, 5625);
  assert.ok(!calculateSimulationModel('transient', { h: 20, area: 0.1, volume: 0.001, density: 1000, cp: 4000, k: 10, initial: 60, ambient: 20, time: 2000 }).error);
  assert.ok(calculateSimulationModel('no-such-mode', {}).error);
});

test('saved comparisons for added modes validate, old data stays valid, unknown modes stay invalid', () => {
  for (const [mode, defaults] of Object.entries(NEW_MODES)) {
    assert.equal(validateLearningData(exportedWith({ [mode]: { ...defaults } })), '', mode);
    assert.equal(validateLearningData(exportedWith({ [mode]: { ...defaults } }), { stored: true }), '', mode);
  }
  const legacy = exportedWith({
    conduction: { k: 15, area: 0.5, thickness: 0.08, hot: 80, cold: 20 },
    transient: { h: 20, area: 0.1, volume: 0.001, density: 1000, cp: 4000, k: 10, initial: 60, ambient: 20, time: 2000 }
  });
  assert.equal(validateLearningData(legacy), '');
  assert.notEqual(validateLearningData(exportedWith({ 'no-such-mode': { a: 1 } })), '');
  assert.notEqual(validateLearningData(exportedWith({ fin: { k: 'not-a-number' } })), '');
  assert.deepEqual(createEmptyState().simComparisons, {});
});

test('app wiring: metadata, defaults, renderer dispatch and storage keys cover all 20 modes', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const simValuesBlock = app.slice(app.indexOf('simValues: {'), app.indexOf('\n};', app.indexOf('simValues: {')));
  for (const mode of Object.keys(NEW_MODES)) {
    assert.match(app, new RegExp(`\\n  ${mode}:\\{fieldNames:`), `EXTENDED_SIMS ${mode}`);
    assert.ok(simValuesBlock.includes(`\n    ${mode}:{`), `simValues ${mode}`);
    assert.ok(app.includes(`#guide/sim-`), 'guide link pattern');
  }
  for (const title of ['熱抵抗の組み合わせ','熱伝導','対流','非定常冷却（集中熱容量法）','熱放射','フィン効率（断熱先端）','熱交換器（ε–NTU）','非定常平板（両面対流）','二面間の放射熱交換','円筒断熱と臨界半径','半無限固体の応答','平板の層流強制対流','円管内の乱流強制対流','円柱まわりの横流れ','鉛直平板の自然対流','円管内の層流強制対流','鉛直平板の膜状凝縮','二成分気体の拡散','プール核沸騰（Rohsenow）','限界熱流束（Zuber）'])
    assert.ok(app.includes(`title:'${title}'`) || app.includes(`title: '${title}'`), title);
  // Storage keys and format are part of the on-device compatibility contract.
  assert.ok(app.includes("'heat-study-ja:v1'"));
  assert.ok(app.includes("'heat-study-ja:profiles:v1'"));
  assert.ok(app.includes("'heat-study-ja:active-profile:v1'"));
  assert.ok(app.includes('function renderExtendedSimulator(mode)'));
});

test('public build allowlist, service worker shell and guide sections include the added models', async () => {
  const build = await readFile(new URL('../scripts/build-public-site.mjs', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  for (const file of MODEL_FILES) {
    assert.ok(build.includes(`'${file}'`), `build allowlist ${file}`);
    assert.ok(worker.includes(`'./${file}'`), `service worker ${file}`);
  }
  const guideIds = new Set(GUIDE_SECTIONS.map(section => section.id));
  for (const mode of Object.keys(NEW_MODES)) assert.ok(guideIds.has(`sim-${mode}`), `guide sim-${mode}`);
});
