import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFinEfficiency,finTemperatureAt,FIN_DEFAULTS,finFieldNames,renderFinFields,renderFinSteps,renderFinDiagram,finTemperatureGraph} from '../fin-efficiency.mjs';
const almost=(a,b,relative=1e-10)=>assert.ok(Math.abs(a-b)<=relative*Math.max(1,Math.abs(a),Math.abs(b)),`${a} !== ${b}`);
const compute=patch=>calculateFinEfficiency({...FIN_DEFAULTS,...patch});

test('physical dimensions and independent base heat flux match efficiency-derived heat rate',()=>{
  const x=compute();assert.equal(x.error,undefined);
  almost(x.crossArea,Math.PI*1e-4);almost(x.perimeter,2*Math.PI*.01);
  almost(x.sideArea,2*Math.PI*.01*.1);
  almost(x.z,Math.sqrt(.4));
  almost(x.efficiency,Math.tanh(Math.sqrt(.4))/Math.sqrt(.4));
  almost(x.watts,x.baseWatts);
  almost(x.watts/x.idealWatts,x.efficiency);
  assert.ok(x.efficiency>0&&x.efficiency<1);
});

test('temperature boundaries, insulation at tip, monotonic profile and physical bounds',()=>{
  const x=compute();almost(finTemperatureAt(x,0),80);almost(finTemperatureAt(x,.1),x.tipTemperature);
  assert.ok(x.tipTemperature>20&&x.tipTemperature<80);
  const temps=Array.from({length:101},(_,i)=>finTemperatureAt(x,x.values.length*i/100));
  for(let i=1;i<temps.length;i++)assert.ok(temps[i]<=temps[i-1]);
  const dx=1e-6, tipSlope=(finTemperatureAt(x,.1)-finTemperatureAt(x,.1-dx))/dx;
  assert.ok(Math.abs(tipSlope)<.02,`tip slope ${tipSlope}`);
  assert.throws(()=>finTemperatureAt(x,-1),RangeError);
  assert.throws(()=>finTemperatureAt(x,.11),RangeError);
});

test('surface convection integral closes the steady energy balance',()=>{
  const x=compute();const N=1000,step=x.values.length/N;
  let sum=0;for(let i=0;i<=N;i++)sum+=(i===0||i===N?1:i%2?4:2)*(finTemperatureAt(x,i*step)-x.values.ambient);
  const integrated=x.values.h*x.perimeter*sum*step/3;
  almost(integrated,x.watts,1e-9);
});

test('opposite temperature difference changes sign, equal temperatures give zero heat transfer',()=>{
  const a=compute(),b=compute({base:20,ambient:80}),c=compute({base:20,ambient:20});
  almost(a.watts,-b.watts);almost(a.efficiency,b.efficiency);
  assert.ok(b.tipTemperature>20&&b.tipTemperature<80);
  assert.equal(c.watts,0);assert.equal(c.idealWatts,0);
  for(const frac of [0,.1,.5,1])almost(finTemperatureAt(c,c.values.length*frac),20);
});

test('expected limiting behavior for short, highly conductive and long thin fins',()=>{
  const small=compute({k:1000,h:.01,length:.00001,radius:.5});
  assert.ok(small.z<1e-5);almost(small.efficiency,1-small.z*small.z/3,1e-12);
  const large=compute({k:.01,h:100000,length:2,radius:.00001});
  assert.ok(large.z>1000);almost(large.efficiency,1/large.z,1e-12);
  assert.ok(large.tipRatio>=0&&large.tipRatio<1e-20);
  for(const fraction of [0,.5,1])assert.ok(Number.isFinite(finTemperatureAt(large,large.values.length*fraction)));
});

test('strict validation: missing/non-finite/unsafe inputs and educational bounds',()=>{
  for(const patch of [{k:''},{h:'0x10'},{radius:0},{length:-1},{base:-273.15},{ambient:-273.15},{k:Infinity},{h:'1e9999'},{radius:null},{length:3},{base:3001}]){
    assert.ok(compute(patch).error,JSON.stringify(patch));
  }
  assert.ok(calculateFinEfficiency(null).error);
});

test('UI output escapes user strings and returns readable steps, axes, and mode labels',()=>{
  assert.equal(finFieldNames.length,6);
  const html=renderFinFields({...FIN_DEFAULTS,k:'"><img src=x onerror=alert(1)>'});
  assert.ok(!html.includes('<img'));assert.ok(html.includes('&quot;&gt;&lt;img'));
  const x=compute();
  assert.match(renderFinSteps(x),/断熱先端/);assert.match(renderFinSteps(x),/W/);
  assert.match(renderFinDiagram(x),/role="img"/);
  assert.match(finTemperatureGraph(x),/相対位置 x\/L/);
  assert.match(finTemperatureGraph(x,x),/chart-baseline/);
  assert.equal(finTemperatureGraph({error:'invalid'}),'');
});