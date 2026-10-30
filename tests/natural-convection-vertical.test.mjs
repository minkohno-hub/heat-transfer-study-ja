import test from 'node:test';
import assert from 'node:assert/strict';
import {NATURAL_GRAVITY,NATURAL_DEFAULTS,naturalFields,naturalFieldNames,churchillChuVertical,
  calculateNaturalConvection,renderNaturalFields,renderNaturalSteps,renderNaturalDiagram,
  naturalTemperatureGraph,naturalHeightGraph} from '../natural-convection-vertical.mjs';
const run = patch=>calculateNaturalConvection({...NATURAL_DEFAULTS,...patch});
const close = (a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} vs ${b}`);

test('base dimensionless values, Churchill-Chu equation and the reported heat flow',()=>{
  const r=run({}); assert.equal(r.error,undefined);
  close(r.kinematicViscosity,r.values.viscosity/r.values.density);
  close(r.thermalDiffusivity,r.values.conductivity/(r.values.density*r.values.cp));
  close(r.prandtl,r.values.viscosity*r.values.cp/r.values.conductivity);
  close(r.grashof,NATURAL_GRAVITY*r.values.beta*r.delta*r.values.height**3/(r.kinematicViscosity**2));
  close(r.rayleigh,r.grashof*r.prandtl);
  const expected=(.825+.387*Math.pow(r.rayleigh,1/6)/Math.pow(1+Math.pow(.492/r.prandtl,9/16),8/27))**2;
  close(r.nusselt,expected);close(r.h,expected*r.values.conductivity/r.values.height);
  close(r.watts,r.h*r.area*r.delta);close(r.heatFlux,r.h*r.delta);
  close(r.watts,40.55598661007852,1e-10);
});

test('independent known Churchill-Chu values and correlation boundary',()=>{
  for(const [ra,pr] of [[.1,.7],[1e4,.7],[1e8,1],[1e12,.7]]){
    const nusselt=churchillChuVertical(ra,pr);
    const denominator=Math.pow(1+Math.pow(.492/pr,9/16),8/27);
    close(Math.sqrt(nusselt),.825+.387*Math.pow(ra,1/6)/denominator);
    assert.ok(Number.isFinite(nusselt)&&nusselt>0);
  }
  assert.ok(Number.isNaN(churchillChuVertical(.0999,.7)));
  assert.ok(Number.isNaN(churchillChuVertical(1e12+1,.7)));
  assert.ok(Number.isNaN(churchillChuVertical(100,.0999)));
  assert.ok(Number.isNaN(churchillChuVertical(100,1000.001)));
});

test('warmer and colder surfaces reverse heat sign with equal magnitudes',()=>{
  const a=run({surface:60,ambient:20}),b=run({surface:20,ambient:60});
  close(a.rayleigh,b.rayleigh);close(a.grashof,b.grashof);
  close(a.nusselt,b.nusselt);close(a.h,b.h);
  close(a.watts,-b.watts);close(a.heatFlux,-b.heatFlux);
  assert.ok(a.watts>0&&b.watts<0);
  assert.match(renderNaturalDiagram(a),/上昇流/);
  assert.match(renderNaturalDiagram(b),/下降流/);
});

test('surface and fluid at equal temperatures return zero without an out-of-range correlation',()=>{
  const r=run({surface:25,ambient:25});
  assert.equal(r.error,undefined);
  assert.equal(r.hasGradient,false);
  assert.equal(r.rayleigh,0); assert.equal(r.grashof,0);
  assert.equal(r.nusselt,null);assert.equal(r.h,null);
  assert.equal(r.watts,0);assert.equal(r.heatFlux,0);
  assert.match(renderNaturalSteps(r),/未適用/);
  assert.doesNotMatch(renderNaturalDiagram(r),/class="diagram-arrow"/);
});

test('area and face count scale heat rate, while Nusselt and h remain unchanged',()=>{
  const a=run({}),b=run({width:.8}),c=run({faces:2});
  close(b.watts,2*a.watts);close(c.watts,2*a.watts);
  close(b.h,a.h);close(c.nusselt,a.nusselt);
  assert.equal(c.values.faces,2);
  assert.ok(run({faces:1.2}).error);
});

test('height changes Rayleigh cubically; Nu and h have distinct scaling',()=>{
  const a=run({}),b=run({height:1});
  close(b.rayleigh,8*a.rayleigh);
  close(b.grashof,8*a.grashof);
  assert.ok(b.nusselt>a.nusselt);
  assert.ok(b.h>0&&b.watts>0);
  close(b.h,b.nusselt*b.values.conductivity/b.values.height);
});

test('temperature difference increases Ra and the absolute heat transfer',()=>{
  const a=run({surface:35}),b=run({surface:65});
  assert.ok(b.rayleigh>a.rayleigh);
  assert.ok(b.h>a.h);
  assert.ok(b.watts>a.watts);
});

test('changing beta only changes the buoyancy driving and Nusselt correlation',()=>{
  const a=run({}),b=run({beta:.00638});
  close(b.grashof,2*a.grashof);close(b.rayleigh,2*a.rayleigh);
  close(b.prandtl,a.prandtl);close(b.kinematicViscosity,a.kinematicViscosity);
  assert.ok(b.nusselt>a.nusselt);
});

test('input precision, film Kelvin and buoyancy sign are distinct',()=>{
  const x=run({});
  close(x.filmKelvin,313.15);
  close(x.delta,40);
  const y=run({surface:10,ambient:60});
  close(y.filmKelvin,308.15);close(y.delta,-50);
  assert.ok(y.grashof>0&&y.rayleigh>0);
});

test('reject too-low Rayleigh and very-high Rayleigh',()=>{
  assert.ok(run({beta:1e-7,surface:20.0001,ambient:20,height:.01}).error);
  assert.ok(run({beta:.5,surface:1000,ambient:20,height:20}).error);
  const short=run({surface:20.001,ambient:20,height:.5});
  assert.equal(short.error,undefined);
});

test('reject unsupported Pr, non-decimal, non-finite and absolute-zero temperatures',()=>{
  for(const patch of [
    {density:''},{density:null},{density:[]},{viscosity:Infinity},{cp:'NaN'},
    {viscosity:'0x3'}, {conductivity:0},{beta:-1},{height:0},{width:0},
    {faces:0},{faces:3},{faces:1.5}, {surface:-273.15},{ambient:-273.15},
    {surface:1001},{cp:10001,conductivity:.001,viscosity:.1},
    {conductivity:500,cp:10,viscosity:1e-7}, {height:100}
  ]) assert.ok(run(patch).error,JSON.stringify(patch));
  assert.ok(calculateNaturalConvection(null).error);
  assert.ok(calculateNaturalConvection([]).error);
});

test('formatting, input escaping and numerical unit explanations',()=>{
  assert.equal(naturalFields.length,10);assert.equal(naturalFieldNames.length,10);
  const field=renderNaturalFields({...NATURAL_DEFAULTS,conductivity:'"><img src=x onerror=alert(1)>'});
  assert.ok(!field.includes('<img'));
  assert.match(field,/&quot;&gt;&lt;img/);
  const r=run({});
  assert.match(renderNaturalSteps(r),/W\/m²/);
  assert.match(renderNaturalSteps(r),/0.1≤Ra/);
  assert.match(renderNaturalSteps(r),/W\/\(m²·K\)/);
  assert.match(renderNaturalDiagram(r),/role="img"/);
  assert.equal(renderNaturalSteps({error:'bad'}),'');
});

test('temperature-difference sensitivity graph stays finite and supports saved comparison',()=>{
  const r=run({});
  const graph=naturalTemperatureGraph(r);
  assert.match(graph,/Ts−T∞/);
  assert.match(graph,/chart-current/);
  assert.match(naturalTemperatureGraph(r,r),/chart-baseline/);
  assert.doesNotMatch(graph,/NaN|Infinity|undefined/);
  assert.equal(naturalTemperatureGraph({error:'bad'}),'');
});

test('height sensitivity graph respects Rayleigh range and malformed models',()=>{
  const r=run({}),g=naturalHeightGraph(r);
  assert.match(g,/鉛直高さ L \(m\)/);
  assert.match(g,/chart-current/);
  assert.doesNotMatch(g,/NaN|Infinity|undefined/);
  assert.match(naturalHeightGraph(r,r),/chart-baseline/);
  assert.equal(naturalHeightGraph({error:'bad'}),'');
});

test('bounded deterministic parameter matrix yields finite outputs and graphs',()=>{
  let accepted=0,rejected=0;
  for(const density of [.5,1.184,10,1000])for(const viscosity of [1e-6,1.85e-5,.001,.01])
  for(const cp of [300,1007,4100])for(const h of [.03,.5,2])for(const delta of [-50,0,5,60]){
    const raw={...NATURAL_DEFAULTS,density,viscosity,cp,height:h,surface:20+delta,ambient:20};
    const result=calculateNaturalConvection(raw);
    if(result.error){rejected++;continue;}accepted++;
    for(const key of ['kinematicViscosity','thermalDiffusivity','prandtl','grashof','rayleigh','watts'])assert.ok(Number.isFinite(result[key]));
    assert.doesNotMatch(renderNaturalDiagram(result),/NaN|Infinity|undefined/);
    assert.doesNotMatch(naturalHeightGraph(result),/NaN|Infinity|undefined/);
  }
  assert.ok(accepted>0&&rejected>0);
});