import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SLAB_DEFAULTS, SLAB_MIN_FO, SLAB_TERMS, slabFields, slabFieldNames,
 slabEigenModes, calculateSlabTransient, slabDimensionlessAt, slabTemperatureAt,
 renderSlabFields, renderSlabSteps, renderSlabDiagram, slabProfileGraph, slabHistoryGraph
} from '../transient-slab.mjs';

const calc = changes => calculateSlabTransient({...SLAB_DEFAULTS,...changes});
const close=(a,b,relative=1e-8)=>assert.ok(
 Math.abs(a-b)<=relative*Math.max(1,Math.abs(a),Math.abs(b)),
 String(a)+' versus '+String(b)
);

test('dimensionless groups use half thickness and baseline values',()=>{
 const r=calc({});
 assert.equal(r.error,undefined);
 close(r.halfThickness,.04);
 close(r.alpha,2/(2000*900));
 close(r.bi,1.6);
 close(r.fo,(2/(2000*900))*400/(.04*.04));
 assert.equal(r.modes.length,SLAB_TERMS);
 assert.ok(r.centerTemperature>r.surfaceTemperature);
 assert.ok(r.surfaceTemperature>r.values.ambient);
 assert.ok(r.centerTemperature<r.values.initial);
});

test('eigenvalues satisfy the Robin boundary equation',()=>{
 for(const bi of [1e-6,.01,.1,1,10,100]){
  const modes=slabEigenModes(bi,SLAB_TERMS);
  for(const [i,{mu,coeff,avgCoeff}] of modes.entries()){
   assert.ok(mu>i*Math.PI&&mu<(i+.5)*Math.PI,'root bracket '+bi+' '+i);
   close((i%2?-1:1)*(mu*Math.sin(mu)-bi*Math.cos(mu)),0,1e-8);
   close(avgCoeff,coeff*Math.sin(mu)/mu,1e-9);
  }
 }
 close(slabEigenModes(1,1)[0].mu,.860333589019,1e-10);
});

test('center symmetry and surface convection boundary match',()=>{
 const r=calc({time:700}),f=r.fo,bi=r.bi,modes=r.modes;
 const derivative=xi=>modes.reduce((sum,m)=>sum-m.coeff*m.mu*Math.sin(m.mu*xi)*Math.exp(-m.mu*m.mu*f),0);
 close(derivative(0),0,1e-10);
 close(derivative(1),-bi*slabDimensionlessAt(r,1),1e-10);
});

test('loss of stored energy per second equals outward heat transfer',()=>{
 const dt=.01;
 const before=calc({time:400-dt}),after=calc({time:400+dt}),now=calc({});
 close((after.transferredJ-before.transferredJ)/(2*dt),now.watts,1e-6);
 assert.ok(now.transferredJ>0);
 close(now.watts,2*now.values.faceArea*now.values.h*(now.surfaceTemperature-now.values.ambient));
});

test('heating reverses the signs and preserves the normalized solution',()=>{
 const cold=calc({}),hot=calc({initial:20,ambient:80});
 close(cold.bi,hot.bi);close(cold.fo,hot.fo);
 close(cold.centerRatio,hot.centerRatio);
 close(cold.surfaceRatio,hot.surfaceRatio);
 close(cold.watts,-hot.watts);
 close(cold.transferredJ,-hot.transferredJ);
 assert.ok(hot.surfaceTemperature>hot.centerTemperature);
 assert.ok(hot.centerTemperature>20);
});

test('time zero and equal temperatures have the correct limits',()=>{
 const x=calc({time:0});
 close(x.centerTemperature,80);
 close(x.surfaceTemperature,80);
 close(x.averageTemperature,80);
 close(x.transferredJ,0);
 close(slabTemperatureAt(x,0),80);
 close(slabTemperatureAt(x,1),80);
 const same=calc({initial:20,ambient:20});
 close(same.centerTemperature,20);close(same.surfaceTemperature,20);
 close(same.watts,0);close(same.transferredJ,0);
});

test('small Bi agrees with the lumped approximation; larger Bi has a gradient',()=>{
 const small=calc({h:.5,time:1440});
 assert.ok(small.bi<.1);
 close(small.centerTemperature,small.lumpedTemperature,.02);
 close(small.surfaceTemperature,small.lumpedTemperature,.02);
 const large=calc({h:400});
 assert.ok(large.bi>1);
 assert.ok(large.centerTemperature-large.surfaceTemperature>10);
});

test('long exposure approaches ambient and remains finite',()=>{
 const x=calc({time:1e7});
 for(const n of [x.centerTemperature,x.surfaceTemperature,x.averageTemperature,
  x.lumpedTemperature,x.watts,x.transferredJ])assert.ok(Number.isFinite(n));
 close(x.centerTemperature,x.values.ambient);
 close(x.surfaceTemperature,x.values.ambient);
 close(x.watts,0);
});

test('128 modes converge at the minimum positive Fourier number',()=>{
 const bi=100,fo=SLAB_MIN_FO;
 const a=slabEigenModes(bi,128),b=slabEigenModes(bi,192);
 const phi=(m,x)=>m.reduce((s,{mu,coeff})=>s+coeff*Math.cos(mu*x)*Math.exp(-mu*mu*fo),0);
 close(phi(a,0),phi(b,0),1e-8);
 close(phi(a,1),phi(b,1),1e-8);
});

test('reject invalid inputs and the early-time accuracy region',()=>{
 for(const patch of [{h:0},{k:''},{thickness:0},{faceArea:-1},{density:Infinity},
  {cp:'0x10'},{initial:-273.15},{ambient:1501},{time:-1},{time:1e8},
  {h:2000,k:.05,thickness:1},{time:1e-9},{cp:null}]){
  assert.ok(calc(patch).error,JSON.stringify(patch));
 }
 assert.ok(calculateSlabTransient(null).error);
 assert.ok(calculateSlabTransient([]).error);
 const ok=calc({});
 assert.throws(()=>slabTemperatureAt(ok,-.1),RangeError);
 assert.throws(()=>slabDimensionlessAt(ok,1.01),RangeError);
 assert.throws(()=>slabDimensionlessAt(ok,.5,SLAB_MIN_FO/2),RangeError);
});

test('UI escapes inputs and provides readable models and graphs',()=>{
 assert.equal(slabFieldNames.length,9);assert.equal(slabFields.length,9);
 const injected=renderSlabFields({...SLAB_DEFAULTS,k:'"><img src=x onerror=alert(1)>'});
 assert.ok(!injected.includes('<img'));
 assert.match(injected,/&quot;&gt;&lt;img/);
 const r=calc({});
 assert.match(renderSlabSteps(r),/Bi/);
 assert.match(renderSlabSteps(r),/Fo/);
 assert.match(renderSlabSteps(r),/J/);
 assert.match(renderSlabDiagram(r),/role="img"/);
 assert.match(slabProfileGraph(r),/相対位置 x\/L/);
 assert.match(slabHistoryGraph(r),/Fo/);
 assert.match(slabProfileGraph(r,r),/chart-baseline/);
 assert.equal(slabProfileGraph({error:'bad'}),'');
 assert.equal(slabHistoryGraph({error:'bad'}),'');
});
