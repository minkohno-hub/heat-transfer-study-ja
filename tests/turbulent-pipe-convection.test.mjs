import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PIPE_DEFAULTS, PIPE_RE_MIN, PIPE_RE_MAX, PIPE_PR_MIN, PIPE_PR_MAX,
 pipeFields, pipeFieldNames, gnielinskiPipe, calculatePipeConvection,
 pipeBulkTemperatureAt, renderPipeFields, renderPipeSteps, renderPipeDiagram,
 pipeBulkGraph, pipeVelocityGraph
} from '../turbulent-pipe-convection.mjs';
const calc=patch=>calculatePipeConvection({...PIPE_DEFAULTS,...patch});
const close=(a,b,rel=1e-10)=>assert.ok(Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),`${a} is not ${b}`);

test('basic dimensions, independent Nu and friction calculations',()=>{
 const r=calc({});assert.equal(r.error,undefined);
 close(r.re,996*1.2*.025/.000797);
 close(r.pr,.000797*4180/.613);
 const darcy=Math.pow(.79*Math.log(r.re)-1.64,-2);
 close(r.darcy,darcy);
 const nu=(darcy/8)*(r.re-1000)*r.pr/(1+12.7*Math.sqrt(darcy/8)*(Math.pow(r.pr,2/3)-1));
 close(r.nu,nu);close(r.h,r.nu*r.values.conductivity/r.values.diameter);
 close(r.sectionArea,Math.PI*.025*.025/4);
 close(r.heatArea,Math.PI*.025*3);
 close(r.massFlow,996*1.2*r.sectionArea);
 assert.ok(r.nu>100&&r.h>1000);
});

test('outlet temperature, LMTD and heat balance are equivalent',()=>{
 const r=calc({});
 close(r.ntu,r.h*r.heatArea/r.capacityRate);
 close(r.outlet,r.values.wall-(r.values.wall-r.values.inlet)*Math.exp(-r.ntu));
 close(r.watts,r.massFlow*r.values.cp*(r.outlet-r.values.inlet));
 close(r.watts,r.h*r.heatArea*r.lmtd);
 assert.ok(r.outlet>r.values.inlet&&r.outlet<r.values.wall);
});

test('spatial heat flux integral closes with whole-pipe energy balance',()=>{
 const r=calc({}),count=400,dx=r.values.length/count;
 let sum=0;
 for(let i=0;i<=count;i++){
  const at=pipeBulkTemperatureAt(r,i*dx);
  sum+=(i===0||i===count?1:i%2===0?2:4)*(r.values.wall-at);
 }
 const integrated=r.h*Math.PI*r.values.diameter*sum*dx/3;
 close(integrated,r.watts,1e-8);
});

test('flowing bulk temperature moves monotonically toward a fixed wall',()=>{
 const r=calc({});
 close(pipeBulkTemperatureAt(r,0),r.values.inlet);
 close(pipeBulkTemperatureAt(r,r.values.length),r.outlet);
 let prior=r.values.inlet;
 for(let i=1;i<=80;i++){
  const t=pipeBulkTemperatureAt(r,r.values.length*i/80);
  assert.ok(t>=prior&&t<=r.values.wall);prior=t;
 }
 assert.throws(()=>pipeBulkTemperatureAt(r,-1),RangeError);
 assert.throws(()=>pipeBulkTemperatureAt(r,r.values.length*1.01),RangeError);
});

test('temperature reversal and equal-temperature limit preserve h and pressure loss',()=>{
 const h=calc({}),c=calc({inlet:60,wall:25}),z=calc({inlet:25,wall:25});
 close(h.watts,-c.watts);close(h.ntu,c.ntu);
 close(h.h,c.h);close(h.pressureDrop,c.pressureDrop);
 close(c.outlet,60-(h.outlet-25));
 close(z.watts,0);close(z.lmtd,0);close(z.outlet,25);
});

test('higher velocity raises h and friction pressure loss, but is not a constant flow rate',()=>{
 const a=calc({velocity:.6}),b=calc({velocity:1.2}),c=calc({velocity:2.4});
 for(const r of [a,b,c])assert.equal(r.error,undefined);
 assert.ok(a.h<b.h&&b.h<c.h);
 assert.ok(a.pressureDrop<b.pressureDrop&&b.pressureDrop<c.pressureDrop);
 assert.ok(a.massFlow<b.massFlow&&b.massFlow<c.massFlow);
});

test('longer tube has the same fully developed h but more heating and pressure loss',()=>{
 const short=calc({length:2}),long=calc({length:4});
 close(short.h,long.h);close(short.massFlow,long.massFlow);
 assert.ok(short.outlet<long.outlet);
 close(long.pressureDrop,2*short.pressureDrop);
 close(long.heatArea,2*short.heatArea);
});

test('independent friction-only pressure drop and ideal pumping power',()=>{
 const r=calc({});
 close(r.pressureDrop,r.darcy*(r.values.length/r.values.diameter)*r.values.density*r.values.velocity**2/2);
 close(r.volumetricFlow,r.values.velocity*Math.PI*r.values.diameter**2/4);
 close(r.hydraulicWatts,r.pressureDrop*r.volumetricFlow);
 assert.ok(r.hydraulicWatts>0);
});

test('cross-check against Dittus-Boelter order of magnitude in a representative smooth tube',()=>{
 const r=calc({});
 const db=0.023*Math.pow(r.re,.8)*Math.pow(r.pr,.4);
 assert.ok(Math.abs(db-r.nu)/r.nu<.25,`Nu mismatch: ${db} ${r.nu}`);
});

test('transition and laminar Re are rejected, with conservative turbulent cutoff',()=>{
 for(const vel of [.01,.1,.2]){
  const r=calc({velocity:vel});assert.ok(r.error,'expected rejection for velocity '+vel);
 }
 assert.ok(gnielinskiPipe(PIPE_RE_MIN-1,1).error);
 assert.ok(!gnielinskiPipe(PIPE_RE_MIN,1).error);
 assert.ok(!gnielinskiPipe(PIPE_RE_MAX,1).error);
 assert.ok(gnielinskiPipe(PIPE_RE_MAX+1,1).error);
});

test('Prandtl range and minimum developed length are enforced',()=>{
 assert.ok(gnielinskiPipe(100000,PIPE_PR_MIN-.01).error);
 assert.ok(gnielinskiPipe(100000,PIPE_PR_MAX+1).error);
 assert.ok(!gnielinskiPipe(100000,PIPE_PR_MIN).error);
 assert.ok(!gnielinskiPipe(100000,PIPE_PR_MAX).error);
 assert.ok(calc({length:.5}).error);
 assert.ok(!calc({length:.75}).error); // L/D exactly 30
});

test('strict decimal and scientific values and absolute zero validation',()=>{
 for(const patch of [
  {density:''},{density:'0x10'},{density:Infinity},{velocity:NaN},
  {viscosity:0},{cp:null},{conductivity:0},{diameter:-1},
  {length:101},{inlet:-273.15},{wall:-300},{wall:2100},{velocity:'1e9999'},
  {viscosity:[]},{density:{}},{velocity:51}
 ])assert.ok(calc(patch).error,'Accepted '+JSON.stringify(patch));
 assert.ok(calculatePipeConvection(null).error);
 assert.ok(calculatePipeConvection([]).error);
 assert.ok(!calc({velocity:'1.2e0'}).error);
});

test('SVGs, comparison plots, formulas and user-data escape',()=>{
 const r=calc({});
 assert.equal(pipeFields.length,9);assert.equal(pipeFieldNames.length,9);
 const html=renderPipeFields({...PIPE_DEFAULTS,cp:'"><img src=x onerror=alert(1)>'});
 assert.ok(!html.includes('<img'));
 assert.match(html,/&quot;&gt;&lt;img/);
 assert.match(renderPipeSteps(r),/Gnielinski/);
 assert.match(renderPipeSteps(r),/Darcy/);
 assert.match(renderPipeSteps(r),/Pa/);
 assert.match(renderPipeDiagram(r),/role="img"/);
 assert.match(pipeBulkGraph(r),/流れ方向位置 x\/L/);
 assert.match(pipeBulkGraph(r,r),/chart-baseline/);
 assert.match(pipeVelocityGraph(r),/流速 u/);
 assert.match(pipeVelocityGraph(r,r),/chart-baseline/);
 assert.equal(renderPipeSteps({error:'bad'}),'');
 assert.equal(pipeVelocityGraph({error:'bad'}),'');
});