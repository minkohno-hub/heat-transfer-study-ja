import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CYLINDER_DEFAULTS,cylinderFields,cylinderFieldNames,calculateCylindricalInsulation,
 cylinderTemperatureAt,renderCylinderFields,renderCylinderSteps,renderCylinderDiagram,
 cylinderTemperatureGraph,cylinderThicknessGraph
} from '../cylindrical-insulation.mjs';

const calculate=patch=>calculateCylindricalInsulation({...CYLINDER_DEFAULTS,...patch});
const close=(a,b,rel=1e-10)=>assert.ok(Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),`${a} versus ${b}`);

test('independent resistance and heat-rate arithmetic on the baseline case',()=>{
 const x=calculate({});assert.equal(x.error,undefined);
 close(x.outerRadius,.007);close(x.outerArea,2*Math.PI*.007);
 const rCond=Math.log(7/4)/(2*Math.PI*.05),rConv=1/(5*2*Math.PI*.007);
 close(x.radialResistance,rCond);close(x.convectionResistance,rConv);
 close(x.resistance,rCond+rConv);close(x.watts,60/(rCond+rConv));
 close(x.criticalRadius,.01);close(x.criticalThickness,.006);
 assert.ok(x.increasingBeforeCritical);
 assert.ok(x.relativeMagnitude>1);
});

test('both conduction and convection boundary conditions independently reproduce Q',()=>{
 const x=calculate({});
 close(x.values.base-x.outerTemperature,x.watts*x.radialResistance);
 close(x.watts,x.values.h*x.outerArea*(x.outerTemperature-x.values.ambient));
 close(x.outerFlux,x.watts/x.outerArea);
 close(cylinderTemperatureAt(x,x.values.radius),x.values.base);
 close(cylinderTemperatureAt(x,x.outerRadius),x.outerTemperature);
});

test('radial Fourier-law gradient gives equal steady heat flow at all radii',()=>{
 const x=calculate({});
 for (const fraction of [.1,.2,.5,.8,.9]){
  const r=x.values.radius+x.values.thickness*fraction;
  const e=1e-7;
  const derivative=(cylinderTemperatureAt(x,r+e)-cylinderTemperatureAt(x,r-e))/(2*e);
  const q=-x.values.k*2*Math.PI*r*x.values.length*derivative;
  close(q,x.watts,1e-7);
 }
});

test('critical insulation radius is a maximum in heat-flow magnitude',()=>{
 const zero=calculate({thickness:0}),before=calculate({thickness:.003});
 const peak=calculate({thickness:.006}),after=calculate({thickness:.012});
 close(peak.outerRadius,.01);
 assert.ok(Math.abs(before.watts)>Math.abs(zero.watts));
 assert.ok(Math.abs(peak.watts)>Math.abs(before.watts));
 assert.ok(Math.abs(peak.watts)>Math.abs(after.watts));
 const eps=1e-6;
 const left=calculate({thickness:.006-eps}).watts,right=calculate({thickness:.006+eps}).watts;
 close(left,right,1e-6);
});

test('when critical radius lies inside the pipe, added insulation only reduces heat flow',()=>{
 const opts={radius:.02,k:.05,h:5};
 const values=[0,.001,.01,.05,.2].map(thickness=>Math.abs(calculate({...opts,thickness}).watts));
 for(let i=1;i<values.length;i++)assert.ok(values[i]<values[i-1]);
 assert.equal(calculate(opts).increasingBeforeCritical,false);
 close(calculate(opts).criticalThickness,0);
});

test('zero thickness gives a pure external convection boundary without a fictitious wall',()=>{
 const x=calculate({thickness:0});
 close(x.radialResistance,0);close(x.outerTemperature,80);
 close(x.watts,5*2*Math.PI*.004*60);
 close(cylinderTemperatureAt(x,.004),80);
 assert.match(cylinderTemperatureGraph(x),/温度分布/);
});

test('small finite thickness is stable using log1p',()=>{
 const x=calculate({thickness:1e-15});
 const expected=Math.log1p(1e-15/.004)/(2*Math.PI*.05);
 close(x.radialResistance,expected,1e-12);
 assert.ok(x.radialResistance>0);
 assert.ok(Number.isFinite(x.outerTemperature));
});

test('warming fluid reverses signs and preserves resistance and relative magnitude',()=>{
 const a=calculate({}),b=calculate({base:20,ambient:80});
 close(a.resistance,b.resistance);close(a.watts,-b.watts);
 close(a.relativeMagnitude,b.relativeMagnitude);
 assert.ok(b.outerTemperature>20&&b.outerTemperature<80);
 assert.ok(b.outerFlux<0);
});

test('equal temperatures give zero net heat transfer and ratio remains meaningful',()=>{
 const x=calculate({base:20,ambient:20});
 close(x.watts,0);close(x.outerFlux,0);close(x.outerTemperature,20);
 close(x.relativeMagnitude,calculate({}).relativeMagnitude);
 assert.ok(x.relativeMagnitude>0);
});

test('cylinder length doubles heat rate while resistance halves',()=>{
 const a=calculate({}),b=calculate({length:2});
 close(b.watts,2*a.watts);close(b.resistance,a.resistance/2);
 close(b.outerTemperature,a.outerTemperature);
 close(b.criticalRadius,a.criticalRadius);
});

test('input validation rejects unsafe values, invalid temperatures and missing fields',()=>{
 const patches=[{radius:0},{radius:Infinity},{thickness:-.01},{thickness:.51},
  {length:0},{k:0},{h:0},{h:'0x20'},{base:-273.15},{ambient:1501},
  {k:''},{radius:'1e9999'},{h:NaN},{radius:null},{thickness:undefined}];
 for(const p of patches)assert.ok(calculate(p).error,JSON.stringify(p));
 assert.ok(calculateCylindricalInsulation(null).error);
 assert.ok(calculateCylindricalInsulation([]).error);
 assert.throws(()=>cylinderTemperatureAt(calculate({}),.003),RangeError);
 assert.throws(()=>cylinderTemperatureAt(calculate({}),.008),RangeError);
});

test('rendering escapes strings and provides results, accessible diagrams, two plots and comparisons',()=>{
 assert.equal(cylinderFieldNames.length,7);assert.equal(cylinderFields.length,7);
 const malicious=renderCylinderFields({...CYLINDER_DEFAULTS,k:'"><img src=x onerror=alert(1)>'});
 assert.ok(!malicious.includes('<img'));assert.match(malicious,/&quot;&gt;&lt;img/);
 const x=calculate({});
 assert.match(renderCylinderSteps(x),/臨界半径/);
 assert.match(renderCylinderSteps(x),/W/);
 assert.match(renderCylinderDiagram(x),/role="img"/);
 assert.match(cylinderTemperatureGraph(x),/相対位置/);
 assert.match(cylinderTemperatureGraph(x,x),/chart-baseline/);
 assert.match(cylinderThicknessGraph(x),/断熱材の厚さ/);
 assert.match(cylinderThicknessGraph(x,x),/chart-baseline/);
 assert.ok(!cylinderThicknessGraph(x).includes('NaN'));
 assert.equal(renderCylinderSteps({error:'bad'}),'');
 assert.equal(cylinderTemperatureGraph({error:'bad'}),'');
 assert.equal(cylinderThicknessGraph({error:'bad'}),'');
});