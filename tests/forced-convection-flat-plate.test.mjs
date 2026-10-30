import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAT_PLATE_DEFAULTS,flatPlateFields,flatPlateFieldNames,calculateFlatPlateConvection,
  flatPlateLocalCoefficient,renderFlatPlateFields,renderFlatPlateSteps,
  renderFlatPlateDiagram,flatPlateLocalGraph,flatPlateVelocityGraph
} from '../forced-convection-flat-plate.mjs';
const run=patch=>calculateFlatPlateConvection({...FLAT_PLATE_DEFAULTS,...patch});
const close=(a,b,rel=1e-10)=>assert.ok(Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),`${a} vs ${b}`);

test('baseline has dimensionally consistent Re, Pr, Nu, h and signed Q',()=>{
  const x=run({});assert.equal(x.error,undefined);
  close(x.nu,1.849e-5/1.184);
  close(x.alpha,.0263/(1.184*1007));
  close(x.re,1.184*3*.5/1.849e-5);
  close(x.pr,1.849e-5*1007/.0263);
  close(x.nuAverage,.664*Math.sqrt(x.re)*Math.cbrt(x.pr));
  close(x.hAverage,x.nuAverage*.0263/.5);
  close(x.watts,x.hAverage*.5*.2*(80-25));
  close(x.hAverage,2*x.hLocalEnd);
  assert.ok(x.re>=1000&&x.re<500000&&x.pr>=.6&&x.pr<=50);
});

test('independent local heat-transfer relation matches average coefficient',()=>{
  const x=run({});
  close(flatPlateLocalCoefficient(x,x.values.length),x.hLocalEnd);
  close(flatPlateLocalCoefficient(x,x.values.length/4),2*x.hLocalEnd);
  const N=1024,L=x.values.length;
  // Substitute x=L*s^2 so dx=2Ls ds and the leading-edge singularity disappears.
  const integral=Array.from({length:N},(_,i)=>{
    const s=(i+.5)/N,position=L*s*s;
    return flatPlateLocalCoefficient(x,position)*2*L*s/N;
  }).reduce((a,b)=>a+b,0);
  close(integral/L,x.hAverage,1e-10);
});

test('velocity sensitivity scales as sqrt(u) in the laminar domain',()=>{
  const a=run({}),b=run({velocity:12});
  assert.equal(b.error,undefined);
  close(b.re/a.re,4);
  close(b.hAverage/a.hAverage,2);
  close(b.watts/a.watts,2);
  close(b.delta99/a.delta99,.5);
});

test('length and width have physically different effects',()=>{
  const x=run({}),width=run({width:.4}),length=run({length:1});
  close(width.re,x.re);
  close(width.hAverage,x.hAverage);
  close(width.watts,2*x.watts);
  close(length.re,2*x.re);
  close(length.hAverage/x.hAverage,1/Math.sqrt(2));
  close(length.watts/x.watts,Math.sqrt(2));
  close(length.delta99/x.delta99,Math.sqrt(2));
});

test('Re and Pr are dimensionless and equivalent in independent fluid-property forms',()=>{
  const x=run({});
  close(x.re,x.values.velocity*x.values.length/x.nu);
  close(x.pr,x.nu/x.alpha);
  close(x.nuLocalEnd,.5*x.nuAverage);
  close(x.thermalLayerEstimate,x.delta99/Math.cbrt(x.pr));
});

test('heating and zero temperature difference preserve the hydrodynamic results',()=>{
  const a=run({}),b=run({surface:25,fluid:80}),same=run({surface:25,fluid:25});
  close(a.re,b.re);close(a.hAverage,b.hAverage);
  close(b.watts,-a.watts);
  close(same.watts,0);close(same.qAverage,0);
  assert.ok(b.watts<0&&a.watts>0);
});

test('reject the low-Re, transition, and turbulent regions without extrapolation',()=>{
  assert.ok(run({velocity:.001}).error);
  assert.ok(run({velocity:30}).error);
  const exactly500k=500000*FLAT_PLATE_DEFAULTS.viscosity/(FLAT_PLATE_DEFAULTS.density*FLAT_PLATE_DEFAULTS.length);
  assert.ok(run({velocity:exactly500k*(1+1e-9)}).error);
  const valid=run({velocity:exactly500k*.9});assert.equal(valid.error,undefined);
});

test('reject Pr outside the documented range',()=>{
  assert.ok(run({cp:100,viscosity:1e-6}).error);
  assert.ok(run({cp:10000,viscosity:.001}).error);
  assert.ok(run({cp:1007,viscosity:1.849e-5}).error===undefined);
});

test('strict validation excludes invalid and unsafe numbers',()=>{
  for(const p of [{density:0},{density:null},{velocity:''},{viscosity:Infinity},
    {viscosity:'1e9999'},{cp:'0x10'},{conductivity:-1},{length:0},{width:-1},
    {surface:-273.15},{fluid:-273.15},{surface:2001},{cp:[]},
    {density:'true'},{width:'  '}])assert.ok(run(p).error,JSON.stringify(p));
  assert.ok(calculateFlatPlateConvection(null).error);
  assert.ok(calculateFlatPlateConvection([]).error);
});

test('local coefficient refuses singular leading edge and out-of-bounds locations',()=>{
  const x=run({});
  assert.throws(()=>flatPlateLocalCoefficient(x,0),RangeError);
  assert.throws(()=>flatPlateLocalCoefficient(x,-.1),RangeError);
  assert.throws(()=>flatPlateLocalCoefficient(x,.6),RangeError);
  assert.throws(()=>flatPlateLocalCoefficient(x,Infinity),RangeError);
});

test('accessible figures and calculations describe direction, units, and assumptions',()=>{
  assert.equal(flatPlateFieldNames.length,9);assert.equal(flatPlateFields.length,9);
  const x=run({});
  assert.match(renderFlatPlateSteps(x),/1000≤ReL<500000/);
  assert.match(renderFlatPlateSteps(x),/Nu/);
  assert.match(renderFlatPlateSteps(x),/先端x=0/);
  assert.match(renderFlatPlateDiagram(x),/role="img"/);
  assert.match(flatPlateLocalGraph(x),/相対位置/);
  assert.match(flatPlateVelocityGraph(x),/乱流域には外挿しません/);
  assert.match(flatPlateLocalGraph(x,x),/chart-baseline/);
  assert.equal(flatPlateLocalGraph({error:'bad'}),'');
  assert.equal(flatPlateVelocityGraph({error:'bad'}),'');
});

test('HTML numeric-field values are safely escaped',()=>{
  const html=renderFlatPlateFields({...FLAT_PLATE_DEFAULTS,velocity:'"><img src=x onerror=alert(1)>'});
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&quot;&gt;&lt;img'));
});