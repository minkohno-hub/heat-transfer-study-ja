import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEMI_INFINITE_DEFAULTS,semiInfiniteFields,semiInfiniteFieldNames,
  semiInfiniteErfc,calculateSemiInfinite,semiInfiniteTemperatureAt,
  semiInfiniteInwardFluxAt,renderSemiInfiniteFields,renderSemiInfiniteSteps,
  renderSemiInfiniteDiagram,semiInfiniteProfileGraph,semiInfiniteHistoryGraph
} from '../semi-infinite-solid.mjs';

const compute = patch => calculateSemiInfinite({...SEMI_INFINITE_DEFAULTS,...patch});
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);

test('erfc quadrature: known analytic values, tails and monotonicity',()=>{
  for(const [x,expected] of [[0,1],[.1,.8875370839817152],[.5,.4795001221869535],
    [1,.15729920705028513],[2,.004677734981047266],[3,.00002209049699858544],
    [4,1.541725790028002e-8],[5,1.537459794428035e-12]]){
    close(semiInfiniteErfc(x),expected,1e-12);
  }
  close(semiInfiniteErfc(6),2.1519736712498913e-17,1e-14);
  let prev=1;
  for(let i=1;i<=600;i++){const value=semiInfiniteErfc(i/100);assert.ok(value<=prev);prev=value;}
  for(const x of [-1,NaN,Infinity,'1'])assert.throws(()=>semiInfiniteErfc(x),RangeError);
});

test('baseline alpha, similarity variable and half-space boundary temperature',()=>{
  const r=compute({});assert.equal(r.error,undefined);
  close(r.alpha,15/(7800*500));
  close(r.diffusionLength,Math.sqrt(15/(7800*500)*60));
  close(r.eta,.01/(2*Math.sqrt(r.alpha*60)));
  close(semiInfiniteTemperatureAt(r,0),100);
  close(semiInfiniteTemperatureAt(r,.01),r.temperature);
  close(semiInfiniteTemperatureAt(r,100),20);
  assert.ok(r.temperature>20&&r.temperature<100);
  assert.ok(r.approxValid);
});

test('the surface heat flux matches the negative Fourier temperature gradient',()=>{
  const r=compute({}),dx=1e-7;
  const numerical=-r.values.k*(semiInfiniteTemperatureAt(r,dx)-semiInfiniteTemperatureAt(r,0))/dx;
  close(numerical,r.surfaceFluxIn,1e-4);
  close(semiInfiniteInwardFluxAt(r,0),r.surfaceFluxIn);
  for(const x of [0,.002,.01,.03]){
    const exact=r.surfaceFluxIn*Math.exp(-x*x/(4*r.alpha*r.values.time));
    close(semiInfiniteInwardFluxAt(r,x),exact);
  }
});

test('integrated energy gain equals the analytic time-integral of surface flux',()=>{
  const r=compute({});
  close(r.accumulatedJPerArea,2*r.surfaceFluxIn*r.values.time);
  close(r.accumulatedJ,r.accumulatedJPerArea*r.values.area);
  const h=1e-3;
  const before=compute({time:r.values.time-h}),after=compute({time:r.values.time+h});
  close((after.accumulatedJ-before.accumulatedJ)/(2*h),r.surfacePowerIn,1e-7);
});

test('integration across depth of stored energy matches surface total',()=>{
  const r=compute({}),extent=10*r.diffusionLength,N=2000,step=extent/N;
  let sum=0;
  for(let i=0;i<=N;i++){
    const x=step*i;
    sum+=(i===0||i===N?1:i%2===0?2:4)*(semiInfiniteTemperatureAt(r,x)-r.values.initial);
  }
  const integrated=r.values.density*r.values.cp*sum*step/3;
  close(integrated,r.accumulatedJPerArea,1e-8);
});

test('heat equation finite-difference residual is small at interior location',()=>{
  const r=compute({}),x=.012,t=60,dx=1e-4,dt=.02;
  const derivativeT=(semiInfiniteTemperatureAt(r,x,t+dt)-semiInfiniteTemperatureAt(r,x,t-dt))/(2*dt);
  const laplacian=(semiInfiniteTemperatureAt(r,x+dx,t)-2*semiInfiniteTemperatureAt(r,x,t)+semiInfiniteTemperatureAt(r,x-dx,t))/(dx*dx);
  close(derivativeT,r.alpha*laplacian,2e-5);
});

test('cooling changes signs but not the normalized similarity profile',()=>{
  const heat=compute({}),cool=compute({surface:20,initial:100});
  close(heat.changeFraction,cool.changeFraction);
  close(heat.surfacePowerIn,-cool.surfacePowerIn);
  close(heat.accumulatedJ,-cool.accumulatedJ);
  close(heat.temperature+cool.temperature,120);
  assert.ok(cool.temperature<100&&cool.temperature>20);
});

test('equal temperatures give zero heat and a spatially uniform result',()=>{
  const r=compute({surface:45,initial:45});
  close(r.surfaceFluxIn,0);close(r.accumulatedJ,0);
  for(const x of [0,.001,.05,100])close(semiInfiniteTemperatureAt(r,x),45);
});

test('depth scale grows with square root of time and supplies a 1% threshold',()=>{
  const r=compute({}),late=compute({time:240});
  close(late.penetration99,2*r.penetration99);
  close(semiInfiniteErfc(r.penetration99/(2*r.diffusionLength)),.01,1e-12);
  close(r.backsideChangeFraction,semiInfiniteErfc(r.values.availableDepth/(2*r.diffusionLength)));
  const tooThin=compute({availableDepth:.001});
  assert.equal(tooThin.approxValid,false);
  assert.match(tooThin.validityNote,/再検討/);
});

test('time zero limiting conditions, even though t=0 is disallowed as a model input',()=>{
  const r=compute({});
  close(semiInfiniteTemperatureAt(r,.01,0),r.values.initial);
  close(semiInfiniteTemperatureAt(r,0,0),r.values.surface);
  assert.throws(()=>semiInfiniteInwardFluxAt(r,0,0),RangeError);
  assert.ok(compute({time:0}).error);
});

test('invalid values, non-decimal injection and absolute-zero temperatures are rejected',()=>{
  for(const patch of [{k:0},{density:Infinity},{cp:'0x10'},{surface:-273.15},
    {initial:-273.15},{depth:-.2},{area:0},{time:1e9},{availableDepth:30},
    {k:'1e9999'},{depth:null},{density:[]},{initial:''}]){
      assert.ok(compute(patch).error,JSON.stringify(patch));
    }
  assert.ok(calculateSemiInfinite(null).error);
  assert.ok(calculateSemiInfinite([]).error);
  const r=compute({});
  assert.throws(()=>semiInfiniteTemperatureAt(r,-1),RangeError);
  assert.throws(()=>semiInfiniteTemperatureAt(r,1,-1),RangeError);
  assert.throws(()=>semiInfiniteInwardFluxAt(r,-1),RangeError);
});

test('accessible SVG/HTML escaping, units and both graph variants render safely',()=>{
  assert.equal(semiInfiniteFieldNames.length,9);
  assert.equal(semiInfiniteFields.length,9);
  const fields=renderSemiInfiniteFields({...SEMI_INFINITE_DEFAULTS,k:'"><img src=x onerror=alert(1)>'});
  assert.ok(!fields.includes('<img'));
  assert.match(fields,/&quot;&gt;&lt;img/);
  const r=compute({});
  assert.match(renderSemiInfiniteSteps(r),/erfc/);
  assert.match(renderSemiInfiniteSteps(r),/W\/m²/);
  assert.match(renderSemiInfiniteSteps(r),/J\/m²/);
  assert.match(renderSemiInfiniteDiagram(r),/role="img"/);
  assert.match(semiInfiniteProfileGraph(r),/深さ x/);
  assert.match(semiInfiniteProfileGraph(r,r),/chart-baseline/);
  assert.match(semiInfiniteHistoryGraph(r),/経過時間 t/);
  assert.equal(semiInfiniteHistoryGraph({error:'bad'}),'');
  assert.equal(semiInfiniteProfileGraph({error:'bad'}),'');
});