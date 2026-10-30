import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RADIATION_SIGMA, RADIATION_ENCLOSURE_DEFAULTS, radiationEnclosureFields,
  radiationEnclosureFieldNames, radiationFourthDifference, calculateRadiationEnclosure,
  renderRadiationEnclosureFields, renderRadiationEnclosureSteps,
  renderRadiationEnclosureDiagram, radiationEnclosureHeatGraph
} from '../radiation-enclosure.mjs';

const compute = patch => calculateRadiationEnclosure({...RADIATION_ENCLOSURE_DEFAULTS,...patch});
const near=(a,b,relative=1e-10)=>assert.ok(
  Math.abs(a-b)<=relative*Math.max(1,Math.abs(a),Math.abs(b)),`${a} !== ${b}`);

test('default enclosure: independent fourth-power, resistance and radiosity balances',()=>{
  const x=compute({});assert.equal(x.error,undefined);
  near(x.t1K,473.15);near(x.t2K,298.15);
  near(x.rSurface1,.25);near(x.rSpace,1);near(x.rSurface2,1/6);
  near(x.rTotal,17/12);
  near(x.effectiveEmissivity,12/17);
  near(x.watts,RADIATION_SIGMA*(473.15**4-298.15**4)*12/17);
  near(x.netFrom1,x.watts);near(x.netFrom2,-x.watts);
  near(x.flux1,x.watts/x.values.area1);near(x.flux2,-x.watts/x.values.area2);
  assert.ok(x.watts>0);
});

test('radiation view factors satisfy both row sums and reciprocity',()=>{
  for(const [a,b] of [[1,1],[1,4],[.0001,1000],[900,1000]]){
    const x=compute({area1:a,area2:b});assert.equal(x.error,undefined);
    near(x.f11+x.f12,1);near(x.f21+x.f22,1);
    near(a*x.f12,b*x.f21);
    assert.ok(x.f11===0&&x.f12===1);
    assert.ok(x.f22>=0&&x.f22<=1);
  }
});

test('two gray infinite facing plates with equal areas match the textbook analytical limit',()=>{
  const x=compute({area1:2,area2:2,epsilon1:.5,epsilon2:.2,temp1:126.85,temp2:26.85});
  const expected=RADIATION_SIGMA*2*(400**4-300**4)/(1/.5+1/.2-1);
  near(x.watts,expected);
  near(x.f21,1);near(x.f22,0);
  near(x.effectiveEmissivity,1/6);
});

test('two black surfaces reduce to Stefan-Boltzmann exchange for area1',()=>{
  const x=compute({epsilon1:1,epsilon2:1,area1:3,area2:12});
  near(x.rSurface1,0);near(x.rSurface2,0);
  near(x.rTotal,1/3);
  near(x.effectiveEmissivity,1);
  near(x.watts,RADIATION_SIGMA*3*(x.t1K**4-x.t2K**4));
  near(x.radiosity1,x.black1);near(x.radiosity2,x.black2);
});

test('large enclosing area makes the outer emissivity progressively unimportant',()=>{
  const x=compute({area1:.0001,area2:1000,epsilon1:.7,epsilon2:.1});
  near(x.effectiveEmissivity,1/(1/.7+1e-7*(1/.1-1)));
  near(x.watts,x.blackUpperBound*.7,1e-6);
});

test('radiosity solves the independent two-by-two gray enclosure matrix',()=>{
  for(const patch of [{},{epsilon1:.3,epsilon2:.2,area1:2,area2:2},{epsilon1:1,epsilon2:.25},{epsilon1:.01,epsilon2:.01}]){
    const x=compute(patch),v=x.values;
    const a=1,b=-(1-v.epsilon1),c=-(1-v.epsilon2)*x.f21,d=1-(1-v.epsilon2)*x.f22;
    const det=a*d-b*c;
    const rhs1=v.epsilon1*x.black1,rhs2=v.epsilon2*x.black2;
    const j1=(rhs1*d-b*rhs2)/det,j2=(a*rhs2-c*rhs1)/det;
    near(j1,x.radiosity1);near(j2,x.radiosity2);
    near(v.area1*(j1-j2),x.watts);
    near(v.area2*(j2-(x.f21*j1+x.f22*j2)),-x.watts);
  }
});

test('temperature reversal flips net flow, retaining positive radiative resistance',()=>{
  const x=compute({}),y=compute({temp1:25,temp2:200});
  near(x.watts,-y.watts);
  near(x.effectiveEmissivity,y.effectiveEmissivity);
  near(x.flux1,-y.flux1);
  assert.ok(y.watts<0&&y.netFrom1<0&&y.netFrom2>0);
});

test('equal temperatures give zero net heat and matching radiosities',()=>{
  for(const temp of [-273.149999,20,1000]){
    const x=compute({temp1:temp,temp2:temp});
    near(x.watts,0);near(x.netFrom1,0);near(x.netFrom2,0);
    near(x.radiosity1,x.radiosity2);
    near(x.black1,x.radiosity1);
  }
});

test('factorized fourth-power difference agrees with direct arithmetic and preserves close differences',()=>{
  near(radiationFourthDifference(400,300),400**4-300**4);
  near(radiationFourthDifference(300,400),-(400**4-300**4));
  const x=compute({temp1:20.000001,temp2:20});
  const k=x.t2K,dt=1e-6;
  near(x.watts,4*RADIATION_SIGMA*k**3*dt/x.rTotal,1e-6);
  assert.ok(x.watts>0&&Number.isFinite(x.watts));
  const low=compute({temp1:-273.149999999,temp2:-273.149999998});
  assert.ok(low.watts<0&&Number.isFinite(low.watts));
});

test('radiation rate is linear in inner area at fixed ratio and bounded by blackbody exchange',()=>{
  const x=compute({}),y=compute({area1:2,area2:8});
  near(y.watts,2*x.watts);
  near(y.effectiveEmissivity,x.effectiveEmissivity);
  assert.ok(x.watts>0&&x.watts<x.blackUpperBound);
  for(const epsilon1 of [.01,.1,.5,1]){
    const z=compute({epsilon1,epsilon2:1});
    near(z.effectiveEmissivity,epsilon1);
  }
});

test('disallow nonphysical two-surface geometry and malformed or unsafe data',()=>{
  for(const patch of [
    {area1:5,area2:4},{area1:0},{area2:-1},{epsilon1:0},{epsilon2:1.01},
    {temp1:-273.15},{temp2:-273.15},{temp1:3001},
    {temp1:''},{temp1:'0x10'},{epsilon1:'NaN'},{area1:Infinity},
    {epsilon2:null},{area1:[]},{area2:'1e5000'},{epsilon1:'   '}
  ])assert.ok(compute(patch).error,'should reject '+JSON.stringify(patch));
  assert.ok(calculateRadiationEnclosure(null).error);
  assert.ok(calculateRadiationEnclosure([]).error);
});

test('original UI output escapes strings and plots multiple conditions with labeled axes',()=>{
  assert.equal(radiationEnclosureFieldNames.length,6);
  assert.equal(radiationEnclosureFields.length,6);
  const form=renderRadiationEnclosureFields({...RADIATION_ENCLOSURE_DEFAULTS,area1:'"><img src=x onerror=alert(1)>'});
  assert.ok(!form.includes('<img'));assert.match(form,/&quot;&gt;&lt;img/);
  const x=compute({});
  assert.match(renderRadiationEnclosureSteps(x),/相反則/);
  assert.match(renderRadiationEnclosureSteps(x),/m⁻²/);
  assert.match(renderRadiationEnclosureDiagram(x),/role="img"/);
  assert.match(radiationEnclosureHeatGraph(x),/内側温度 T₁/);
  assert.match(radiationEnclosureHeatGraph(x,x),/chart-baseline/);
  const back=compute({temp1:-100,temp2:20});
  const svg=radiationEnclosureHeatGraph(back,x);
  assert.ok(!svg.includes('NaN')&&!svg.includes('Infinity'));
  assert.equal(radiationEnclosureHeatGraph({error:'invalid'}),'');
  assert.equal(renderRadiationEnclosureSteps({error:'invalid'}),'');
});