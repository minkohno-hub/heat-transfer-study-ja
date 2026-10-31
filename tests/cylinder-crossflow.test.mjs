import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CROSSFLOW_DEFAULTS,crossflowFields,crossflowFieldNames,churchillBernsteinNu,
  calculateCylinderCrossflow,renderCrossflowFields,renderCrossflowSteps,
  renderCrossflowDiagram,crossflowVelocityGraph,crossflowDiameterGraph
} from '../cylinder-crossflow.mjs';

const calc = patch => calculateCylinderCrossflow({...CROSSFLOW_DEFAULTS,...patch});
const near=(x,y,rel=1e-9)=>assert.ok(Math.abs(x-y)<=rel*Math.max(1,Math.abs(x),Math.abs(y)),`${x} !== ${y}`);
const standaloneNu=(re,pr)=>0.3+(.62*Math.sqrt(re)*Math.pow(pr,1/3)) / Math.pow(1+Math.pow(.4/pr,2/3),.25) * Math.pow(1+Math.pow(re/282000,.625),.8);

test('dimensionless groups and independent Churchill–Bernstein result',()=>{
 const x=calc({});assert.equal(x.error,undefined);
 near(x.reynolds,1.184*3*.05/1.849e-5);
 near(x.prandtl,1.849e-5*1007/.0263);
 near(x.peclet,x.reynolds*x.prandtl);
 near(x.nu,CROSSFLOW_DEFAULTS.viscosity/CROSSFLOW_DEFAULTS.density);
 near(x.diffusivity,CROSSFLOW_DEFAULTS.conductivity/(CROSSFLOW_DEFAULTS.density*CROSSFLOW_DEFAULTS.cp));
 near(x.nusselt,standaloneNu(x.reynolds,x.prandtl));
 near(x.h,x.nusselt*.0263/.05);
 near(x.filmTemperature,52.5);
});

test('lateral surface area, flux and heat rate have consistent units',()=>{
 const x=calc({});
 near(x.lateralArea,Math.PI*.05*1);
 near(x.heatFlux,x.h*(80-25));
 near(x.watts,x.h*Math.PI*.05*1*55);
 near(x.capacityEquivalent,x.watts/x.values.length);
 assert.ok(x.nusselt>0&&x.h>0&&x.watts>0);
});

test('changing cylinder length scales total heat but not Nu or h',()=>{
 const a=calc({}),b=calc({length:2});
 near(a.reynolds,b.reynolds);near(a.prandtl,b.prandtl);
 near(a.nusselt,b.nusselt);near(a.h,b.h);near(b.watts,2*a.watts);
 near(a.heatFlux,b.heatFlux);
});

test('surface-temperature difference sign is reversible with same film-property inputs',()=>{
 const a=calc({surface:80,ambient:20}),b=calc({surface:20,ambient:80});
 near(a.watts,-b.watts);near(a.heatFlux,-b.heatFlux);
 near(a.h,b.h);near(a.filmTemperature,b.filmTemperature);
 assert.ok(b.watts<0);
});

test('equal temperatures give zero heat transfer while Nu stays positive',()=>{
 const x=calc({surface:25,ambient:25});
 near(x.watts,0);near(x.heatFlux,0);
 assert.ok(x.h>0);assert.ok(x.nusselt>.3);
});

test('velocity increase raises Reynolds, Nu, h and absolute heat transfer',()=>{
 const slow=calc({velocity:1}),fast=calc({velocity:5});
 assert.ok(fast.reynolds>slow.reynolds);
 assert.ok(fast.nusselt>slow.nusselt);
 assert.ok(fast.h>slow.h);
 assert.ok(fast.watts>slow.watts);
});

test('diameter changes both heat area and local coefficient, with consistent recalculation',()=>{
 const narrow=calc({diameter:.025}),wide=calc({diameter:.1});
 assert.ok(wide.reynolds>narrow.reynolds);
 assert.ok(wide.nusselt>narrow.nusselt);
 assert.ok(wide.lateralArea>narrow.lateralArea);
 for(const x of [narrow,wide]){
  near(x.watts,Math.PI*x.values.diameter*x.values.length*x.h*x.delta);
  near(x.nusselt,x.h*x.values.diameter/x.values.conductivity);
 }
});

test('correlation known independent values across its range',()=>{
 for(const [re,pr] of [[1,.7],[100,.7],[1000,1],[1e4,7],[2e5,.7],[1e6,10]]){
  near(churchillBernsteinNu(re,pr),standaloneNu(re,pr),5e-13);
 }
 assert.throws(()=>churchillBernsteinNu(0,.7),RangeError);
 assert.throws(()=>churchillBernsteinNu(.1,1),RangeError);
 assert.throws(()=>churchillBernsteinNu(Infinity,1),RangeError);
});

test('Re Pr boundary is checked rather than blindly extrapolated',()=>{
 const x=calc({density:.01,velocity:.001,diameter:.001,viscosity:.1,cp:100,conductivity:1,length:.1});
 assert.ok(x.error,/invalid flow accepted/);
 assert.match(x.error,/ReD·Pr/);
});

test('additional teaching-domain Re Pr and length/diameter guards',()=>{
 assert.match(calc({length:.2,diameter:.05}).error,/L\/D/);
 assert.match(calc({velocity:100,density:2000,diameter:2,viscosity:1e-7,length:30}).error,/ReD/);
 assert.match(calc({cp:10000,viscosity:1,conductivity:.001}).error,/Pr/);
 assert.match(calc({cp:50,viscosity:1e-7,conductivity:10}).error,/ReD·Pr|Pr/);
});

test('non-numeric, out-of-bounds and unphysical temperatures are rejected',()=>{
 for(const patch of [{velocity:0},{diameter:0},{length:-1},{density:Infinity},{viscosity:'0x10'},{cp:''},{conductivity:null},{surface:-273.15},{ambient:-273.15},{surface:2001},{diameter:3},{velocity:'1e999'}]){
  assert.ok(calc(patch).error,JSON.stringify(patch));
 }
 assert.ok(calculateCylinderCrossflow(null).error);
 assert.ok(calculateCylinderCrossflow([]).error);
});

test('untrusted form data is escaped and input units appear',()=>{
 const injected=renderCrossflowFields({...CROSSFLOW_DEFAULTS,velocity:'"><img src=x onerror=alert(1)>'});
 assert.ok(!injected.includes('<img'));
 assert.match(injected,/&quot;&gt;&lt;img/);
 assert.match(injected,/Pa·s/);
 assert.equal(crossflowFieldNames.length,9);
 assert.equal(crossflowFields.length,9);
});

test('figure descriptions and both graphs present physical units and signed results',()=>{
 const x=calc({});
 assert.match(renderCrossflowSteps(x),/膜温度/);
 assert.match(renderCrossflowSteps(x),/NuD/);
 assert.match(renderCrossflowDiagram(x),/role="img"/);
 const v=crossflowVelocityGraph(x,x);
 const d=crossflowDiameterGraph(x,x);
 assert.match(v,/流速 u∞（m\/s）/);
 assert.match(d,/円柱外径 D（m）/);
 assert.match(v,/chart-baseline/);
 assert.match(d,/chart-baseline/);
 for(const chart of [v,d]){
  assert.ok(!/NaN|Infinity/.test(chart),chart.slice(0,250));
  assert.match(chart,/aria-label/);
 }
 assert.equal(crossflowVelocityGraph({error:'bad'}),'');
 assert.equal(crossflowDiameterGraph({error:'bad'}),'');
});

test('correlation-range clipping avoids invalid plotted coordinates near edge cases',()=>{
 const high=calc({velocity:100,density:2000,diameter:.05,viscosity:.001,length:1});
 // Re=1e7 exactly. Do not extrapolate plotted samples beyond allowed Re.
 assert.equal(high.error,undefined);
 const g=crossflowVelocityGraph(high);
 assert.ok(!/NaN|Infinity/.test(g),'unexpected NaN or Infinity in high-end graph');
 const shortest=calc({length:.5,diameter:.05});
 assert.equal(shortest.error,undefined);
 const diameterGraph=crossflowDiameterGraph(shortest);
 assert.ok(!/NaN|Infinity/.test(diameterGraph),'unexpected NaN or Infinity in diameter graph');
});
