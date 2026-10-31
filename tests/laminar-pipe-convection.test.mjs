import test from 'node:test';
import assert from 'node:assert/strict';
import {LAMINAR_PIPE_DEFAULTS,LAMINAR_PIPE_RE_MIN,LAMINAR_PIPE_RE_MAX,LAMINAR_PIPE_PE_MIN,
 laminarPipeFieldNames,hausenLaminarNu,laminarPipeLocalNu,calculateLaminarPipe,laminarPipeTemperatureAt,
 renderLaminarPipeFields,renderLaminarPipeSteps,renderLaminarPipeDiagram,laminarPipeBulkGraph,laminarPipeNusseltGraph
} from '../laminar-pipe-convection.mjs';
const calc=(patch={})=>calculateLaminarPipe({...LAMINAR_PIPE_DEFAULTS,...patch});
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} not close to ${b}`);

test('default dimensionless groups and physically consistent heat transfer',()=>{
 const r=calc();assert.equal(r.error,undefined);
 near(r.re,998*.04*.02/.001);near(r.pr,.001*4180/.6);near(r.pe,r.re*r.pr);
 near(r.nu,3.66+.0668*r.gz/(1+.04*r.gz**(2/3)));
 near(r.h,r.nu*r.values.conductivity/r.values.diameter);
 near(r.heatArea,Math.PI*r.values.diameter*r.values.length);
 near(r.massFlow,998*.04*Math.PI*.02**2/4);
 assert.ok(r.outlet>r.values.inlet&&r.outlet<r.values.wall);
 near(r.watts,r.capacityRate*(r.outlet-r.values.inlet));
 near(r.watts,r.ua*r.lmtd);
});
test('Hausen limiting value at fully developed temperature, positivity, entrance enhancement',()=>{
 const re=800,pr=7,d=.02;
 const short=hausenLaminarNu(re,pr,d,.2),long=hausenLaminarNu(re,pr,d,1e8);
 assert.ok(short>long);near(long,3.66,1e-5);
 assert.ok(short>3.66);
 assert.ok(Number.isNaN(hausenLaminarNu(re,pr,d,0)));
 assert.ok(Number.isNaN(laminarPipeLocalNu(re,pr,d,0)));
});
test('local coefficient integral recovers mean coefficient',()=>{
 const r=calc(),d=r.values.diameter,L=r.values.length;
 // x Nu_bar(x) = integral_0^x Nu_local(s) ds. Numerical integral avoids singular x=0.
 const x1=L*.5,x2=L;
 for(const x of [x1,x2]){
  const increment=1e-5;
  const derivative=((x+increment)*hausenLaminarNu(r.re,r.pr,d,x+increment)-(x-increment)*hausenLaminarNu(r.re,r.pr,d,x-increment))/(2*increment);
  near(derivative,laminarPipeLocalNu(r.re,r.pr,d,x),1e-8);
  // x=t³ removes the integrable entrance singularity from the quadrature.
  const N=10000,step=1/N;let integral=0;
  for(let i=0;i<=N;i++){
   const t=i*step, xx=x*t*t*t;
   const value=i===0?0:laminarPipeLocalNu(r.re,r.pr,d,xx)*3*x*t*t;
   integral+=(i===0||i===N?1:i%2?4:2)*value;
  }
  integral*=step/3;
  near(integral,x*hausenLaminarNu(r.re,r.pr,d,x),2e-8);
 }
});
test('pointwise energy balance matches local convective heat flux',()=>{
 const r=calc(),v=r.values,dx=1e-4,x=.4;
 const tPlus=laminarPipeTemperatureAt(r,x+dx),tMinus=laminarPipeTemperatureAt(r,x-dx);
 const qFromBulk=r.capacityRate*(tPlus-tMinus)/(2*dx);
 const hLocal=laminarPipeLocalNu(r.re,r.pr,v.diameter,x)*v.conductivity/v.diameter;
 const qFromWall=hLocal*Math.PI*v.diameter*(v.wall-laminarPipeTemperatureAt(r,x));
 near(qFromBulk,qFromWall,1e-6);
 near(laminarPipeTemperatureAt(r,0),v.inlet);
 near(laminarPipeTemperatureAt(r,v.length),r.outlet);
});
test('cooling reverses heat flow sign and preserves normalized temperature',()=>{
 const h=calc(),c=calc({wall:20,inlet:60});
 near(h.watts,-c.watts);near(h.nu,c.nu);
 near(h.outlet+c.outlet,80);
 assert.ok(c.watts<0&&c.outlet<60&&c.outlet>20);
 near(h.lmtd,-c.lmtd);
});
test('equal temperature means exactly zero heat transfer',()=>{
 const r=calc({inlet:50,wall:50});
 near(r.watts,0);near(r.lmtd,0);near(r.outlet,50);
 for(const x of [0,.1,1])near(laminarPipeTemperatureAt(r,x),50);
});
test('increasing length increases heat exchanged and reduces exit wall difference',()=>{
 const small=calc({length:.2}),long=calc({length:2});
 assert.ok(long.watts>small.watts);
 assert.ok(long.nu<small.nu);
 assert.ok(long.ntu>small.ntu);
 assert.ok(long.pressureDrop>small.pressureDrop);
});
test('speed variation in laminar regime increases Re and pressure drop',()=>{
 const low=calc({velocity:.02}),high=calc({velocity:.06});
 assert.ok(high.re>low.re);assert.ok(high.pressureDrop>low.pressureDrop);
 assert.ok(high.massFlow>low.massFlow);
});
test('fully developed Darcy friction and ideal hydraulic power independent',()=>{
 const r=calc(),v=r.values;
 near(r.darcy,64/r.re);near(r.pressureDrop,r.darcy*(v.length/v.diameter)*v.density*v.velocity**2/2);
 near(r.hydraulicPower,r.pressureDrop*r.volumeFlow);
 near(r.volumeFlow,v.velocity*Math.PI*v.diameter*v.diameter/4);
});
test('Re validity, Pe cutoff, and Pr bounds reject inappropriate use',()=>{
 assert.equal(LAMINAR_PIPE_RE_MIN,50);assert.equal(LAMINAR_PIPE_RE_MAX,2300);
 assert.equal(LAMINAR_PIPE_PE_MIN,50);
 for(const p of [{velocity:.0001},{velocity:1},{viscosity:.00001},{cp:100,conductivity:10},{cp:10000,viscosity:.1,conductivity:.001}]) assert.ok(calc(p).error,JSON.stringify(p));
});
test('invalid values rejected strictly including physical temperatures',()=>{
 for(const p of [{diameter:0},{length:-1},{inlet:-273.15},{wall:-300},{density:Infinity},{viscosity:null},{cp:'0x10'},{velocity:'  '},{conductivity:'1e9999'},{diameter:{}}]) assert.ok(calc(p).error,JSON.stringify(p));
 assert.ok(calculateLaminarPipe(null).error);assert.ok(calculateLaminarPipe([]).error);
 const r=calc();assert.throws(()=>laminarPipeTemperatureAt(r,-.01),RangeError);
 assert.throws(()=>laminarPipeTemperatureAt(r,2),RangeError);
});
test('SVG/HTML fields escape strings, axes and teaching steps are accessible',()=>{
 assert.equal(laminarPipeFieldNames.length,9);
 const fields=renderLaminarPipeFields({...LAMINAR_PIPE_DEFAULTS,inlet:'"><img src=x onerror=alert(1)>'});
 assert.ok(!fields.includes('<img'));assert.match(fields,/&quot;&gt;&lt;img/);
 const r=calc();
 assert.match(renderLaminarPipeSteps(r),/Hausen/);
 assert.match(renderLaminarPipeSteps(r),/圧力損失/);
 assert.match(renderLaminarPipeDiagram(r),/role="img"/);
 assert.match(laminarPipeBulkGraph(r),/相対位置 x\/L/);
 assert.match(laminarPipeNusseltGraph(r),/Nu/);
 assert.match(laminarPipeNusseltGraph(r,r),/chart-baseline/);
 assert.equal(laminarPipeBulkGraph({error:'bad'}),'');
 assert.equal(laminarPipeNusseltGraph({error:'bad'}),'');
});
test('extreme valid inputs and sample charts stay finite',()=>{
 const samples=[];
 for(const d of [.005,.02,.08])for(const k of [.08,.6])for(const u of [.01,.04,.08])for(const L of [.2,1,4]){
  const r=calc({diameter:d,conductivity:k,velocity:u,length:L});
  if(r.error)continue;
  for(const n of [r.nu,r.h,r.ntu,r.outlet,r.watts,r.pressureDrop])assert.ok(Number.isFinite(n));
  const graphs=laminarPipeBulkGraph(r)+laminarPipeNusseltGraph(r);
  assert.ok(!graphs.includes('NaN')&&!graphs.includes('Infinity')&&!graphs.includes('undefined'));
  samples.push(r);
 }
 assert.ok(samples.length>10);
});