import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CHF_DEFAULTS,CHF_GRAVITY,CHF_COEFFICIENT,chfFields,chfFieldNames,zuberHeatFlux,
 calculateCriticalHeatFlux,renderCriticalHeatFluxFields,renderCriticalHeatFluxSteps,
 renderCriticalHeatFluxDiagram,criticalHeatFluxSensitivityGraph
} from '../pool-boiling-chf.mjs';

const calc=patch=>calculateCriticalHeatFlux({...CHF_DEFAULTS,...patch});
const close=(a,b,rel=1e-10)=>assert.ok(
 Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),
 String(a)+' versus '+String(b));

test('Zuber known baseline is reproduced from independent evaluation',()=>{
 const r=calc({}),v=CHF_DEFAULTS;
 assert.equal(r.error,undefined);
 const q=.131*v.latent*Math.sqrt(v.rhoVapor)*
   Math.pow(v.surfaceTension*9.80665*(v.rhoLiquid-v.rhoVapor),.25);
 close(r.criticalFlux,q);close(q,1107944.6408485055,1e-10);
 close(r.kunFactor,CHF_COEFFICIENT);
 close(CHF_GRAVITY,9.80665);
});

test('heat flux and area give total critical and requested power without conflation',()=>{
 const r=calc({});
 close(r.criticalWatts,r.criticalFlux*r.values.area);
 close(r.requestedWatts,r.values.appliedFlux*r.values.area);
 close(r.ratio,r.values.appliedFlux/r.criticalFlux);
 close(r.remainingFlux,r.criticalFlux-r.values.appliedFlux);
});

test('capillary length is independent of latent heat and vapor flux uses latent conversion',()=>{
 const r=calc({});
 close(r.capillaryLength,Math.sqrt(r.values.surfaceTension/
   (9.80665*(r.values.rhoLiquid-r.values.rhoVapor))));
 close(r.vaporMassFluxIdeal,r.criticalFlux/r.values.latent);
 const second=calc({latent:r.values.latent*1.2});
 close(second.capillaryLength,r.capillaryLength);
 close(second.criticalFlux,1.2*r.criticalFlux);
});

test('surface tension scales critical heat flux with power 1/4',()=>{
 const a=calc({}),b=calc({surfaceTension:.0589*16});
 close(b.criticalFlux/a.criticalFlux,2);
 assert.ok(calc({surfaceTension:.0589*32}).error);
 const c=calc({surfaceTension:.0589*2});
 close(c.criticalFlux/a.criticalFlux,2**.25);
 close(c.capillaryLength/a.capillaryLength,2**.5);
});

test('vapor density and liquid density factors match separate Zuber formula',()=>{
 const x=calc({rhoVapor:1.2,rhoLiquid:940});
 const v=x.values;
 close(x.criticalFlux,.131*v.latent*Math.sqrt(v.rhoVapor)*
  Math.pow(v.surfaceTension*9.80665*(v.rhoLiquid-v.rhoVapor),.25));
 assert.ok(x.criticalFlux>0);
 const lighter=calc({rhoLiquid:800});
 assert.ok(lighter.criticalFlux<calc({}).criticalFlux);
});

test('power scales with area but the flux and CHF ratio do not',()=>{
 const a=calc({area:.01}),b=calc({area:1});
 close(b.criticalWatts,100*a.criticalWatts);
 close(b.requestedWatts,100*a.requestedWatts);
 close(a.criticalFlux,b.criticalFlux);
 close(a.ratio,b.ratio);
});

test('zero imposed heat flux returns finite zero-load values',()=>{
 const r=calc({appliedFlux:0});
 close(r.requestedWatts,0);close(r.ratio,0);
 close(r.remainingFlux,r.criticalFlux);
 assert.equal(r.state,'below-estimate');
});

test('near CHF is marked caution not guaranteed safe operation',()=>{
 const r=calc({appliedFlux:1e6});
 assert.equal(r.state,'near-estimate');
 assert.match(r.warning,/80|近い|安全/);
 assert.ok(r.ratio>=.8&&r.ratio<1);
});

test('above CHF remains a computed comparison but does not predict stable film boiling',()=>{
 const r=calc({appliedFlux:1.2e6});
 assert.equal(r.state,'above-estimate');
 assert.ok(r.ratio>1&&r.remainingFlux<0);
 assert.match(r.warning,/安定/);
 assert.ok(r.criticalFlux<r.values.appliedFlux);
});

test('computation is independent of applied heat flux',()=>{
 const a=calc({appliedFlux:0}),b=calc({appliedFlux:8e6});
 close(a.criticalFlux,b.criticalFlux);
 close(a.criticalWatts,b.criticalWatts);
 close(a.capillaryLength,b.capillaryLength);
});

test('impossible vapor and liquid densities are rejected',()=>{
 for(const changes of [{rhoVapor:0},{rhoLiquid:.597},{rhoVapor:958.4},
  {rhoLiquid:100,rhoVapor:120},{rhoLiquid:-1}]){
  assert.ok(calc(changes).error,JSON.stringify(changes));
 }
 assert.throws(()=>zuberHeatFlux(950,951,2e6,.07),RangeError);
});

test('strict decimal validation rejects malformed and nonphysical input',()=>{
 for(const changes of [{latent:Infinity},{surfaceTension:0},
  {rhoVapor:'0xff'},{area:0},{appliedFlux:-1},{latent:null},
  {area:'   '},{rhoLiquid:'1_000'},{appliedFlux:NaN}]){
  assert.ok(calc(changes).error,JSON.stringify(changes));
 }
 assert.ok(calculateCriticalHeatFlux(null).error);
 assert.ok(calculateCriticalHeatFlux([]).error);
 assert.ok(calculateCriticalHeatFlux({}).error);
});

test('low-vapor-density model is finite but it is only a saturated-property estimate',()=>{
 const r=calc({rhoVapor:1e-6});
 assert.ok(!r.error);assert.ok(r.criticalFlux>0);
 assert.ok(Number.isFinite(r.capillaryLength));
});

test('input fields escape untrusted values and show SI units',()=>{
 assert.equal(chfFields.length,6);
 assert.equal(chfFieldNames.length,6);
 const fields=renderCriticalHeatFluxFields({...CHF_DEFAULTS,latent:'"><img src=x onerror=alert(1)>'});
 assert.ok(!fields.includes('<img'));
 assert.match(fields,/&quot;&gt;&lt;img/);
 assert.match(fields,/W\/m²/);
});

test('explanation and diagram state assumptions and warn near limits',()=>{
 const r=calc({appliedFlux:1e6});
 const steps=renderCriticalHeatFluxSteps(r),diagram=renderCriticalHeatFluxDiagram(r);
 assert.match(steps,/Zuber/);
 assert.match(steps,/安全/);
 assert.match(steps,/W\/m²/);
 assert.match(diagram,/role="img"/);
 assert.match(diagram,/模式図/);
 assert.equal(renderCriticalHeatFluxSteps({error:'bad'}),'');
 assert.equal(renderCriticalHeatFluxDiagram({error:'bad'}),'');
});

test('sensitivity SVG distinguishes baseline and uses physical axes',()=>{
 const r=calc({}),prev=calc({surfaceTension:.08});
 const svg=criticalHeatFluxSensitivityGraph(r,prev);
 assert.match(svg,/role="img"/);
 assert.match(svg,/chart-current/);
 assert.match(svg,/chart-baseline/);
 assert.match(svg,/表面張力/);
 assert.match(svg,/W\/m²/);
 assert.ok(!/NaN|Infinity|undefined/.test(svg));
 assert.equal(criticalHeatFluxSensitivityGraph({error:'bad'}),'');
});

test('deterministic property parameter sweep remains finite and safe to render',()=>{
 for(let i=0;i<90;i++){
  const liquid=500+(i%10)*100,vapor=.05+Math.floor(i/10)*.15;
  const v=calc({rhoLiquid:liquid,rhoVapor:vapor,surfaceTension:.015+.005*(i%7)});
  assert.equal(v.error,undefined);
  assert.ok(v.criticalFlux>0&&Number.isFinite(v.criticalFlux));
  const s=criticalHeatFluxSensitivityGraph(v);
  assert.ok(!/NaN|Infinity|undefined/.test(s));
 }
});
