import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateLumpedCooling} from '../study-core.mjs';
import {transientFields,renderTransientFields,renderTransientSteps,transientGraph} from '../transient-ui.mjs';

const defaults={h:20,area:0.1,volume:0.001,density:1000,cp:4000,k:10,initial:60,ambient:20,time:2000};
const close=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<=epsilon*Math.max(1,Math.abs(b)),`expected ${a} near ${b}`);
test('independent conservation model matches an exact exponential cooling case with units',()=>{
 const v=calculateLumpedCooling(defaults);assert.equal(v.error,undefined);
 close(v.characteristicLength,.01);close(v.biot,.02);close(v.capacity,4000);close(v.conductance,2);
 close(v.tau,2000);close(v.temperature,20+40/Math.E);
 close(v.watts,80/Math.E);close(v.energyJ,160000*(1-1/Math.E));
 close(v.energyJ,v.capacity*(defaults.initial-v.temperature));
 assert.equal(v.validLumpedApproximation,true);
});
test('initial and long-time limits conserve energy and initial conditions',()=>{
 const a=calculateLumpedCooling({...defaults,time:0});
 close(a.temperature,60);close(a.watts,80);close(a.energyJ,0);close(a.fraction,1);
 const b=calculateLumpedCooling({...defaults,time:100000});
 close(b.temperature,20);close(b.watts,0);close(b.energyJ,160000);
});
test('heating reverses flux and gives a negative released-energy sign',()=>{
 const v=calculateLumpedCooling({...defaults,initial:0,ambient:60});
 close(v.temperature,60-60/Math.E);close(v.watts,-120/Math.E);
 close(v.energyJ,-240000*(1-1/Math.E));
 assert.ok(v.watts<0&&v.energyJ<0);
});
test('equal temperature has no fictitious energy transfer',()=>{
 const x=calculateLumpedCooling({...defaults,initial:25,ambient:25});
 close(x.watts,0);close(x.energyJ,0);close(x.temperature,25);
});
test('Biot validity is not confused with successful numerical evaluation',()=>{
 const x=calculateLumpedCooling({...defaults,k:1});
 close(x.biot,.2);assert.equal(x.validLumpedApproximation,false);
 assert.match(x.applicability,/保証できません/);
 assert.equal(typeof x.temperature,'number');
 const border=calculateLumpedCooling({...defaults,k:2});
 close(border.biot,.1);assert.equal(border.validLumpedApproximation,false);
});
test('doubling h halves time constant but doubles Bi at fixed geometry',()=>{
 const a=calculateLumpedCooling(defaults),b=calculateLumpedCooling({...defaults,h:40});
 close(b.tau,a.tau/2);close(b.biot,a.biot*2);assert.ok(b.temperature<a.temperature);
});
test('reject invalid and unsafe temperature, time, parameters and non-finite values',()=>{
 for(const [key,val] of [['time',-1],['area',0],['h',0],['volume',-1],['density',0],['cp',0],['k',0],
   ['initial',-273.15],['ambient',-273.15],['density',Infinity],['time','bad'],['time',''],['area',null]]){
   assert.ok(calculateLumpedCooling({...defaults,[key]:val}).error,`invalid ${key}=${String(val)}`);
 }
 assert.ok(calculateLumpedCooling(null).error);
 assert.ok(calculateLumpedCooling({...defaults,cp:1e308}).error,'overflow must not be shown as a physical result');
});
test('transient input controls, stepwise unit derivation and SVG graph are usable without unsafe markup',()=>{
 assert.equal(new Set(transientFields.map(x=>x[0])).size,9);
 const markup=renderTransientFields(defaults);
 for(const name of transientFields.map(x=>x[0]))assert.ok(markup.includes(`name="${name}"`));
 const result=calculateLumpedCooling(defaults);
 const steps=renderTransientSteps(result);
 assert.match(steps,/ρVcₚ/);assert.match(steps,/J\/K/);assert.match(steps,/Bi/);
 assert.match(steps,/101,139|101,1/);
 const svg=transientGraph(result,null);
 assert.match(svg,/role="img"/);assert.match(svg,/経過時間 t（秒）/);assert.match(svg,/物体温度 T（℃）/);
 assert.match(transientGraph(result,calculateLumpedCooling({...defaults,h:40})),/chart-baseline/);
 assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('Infinity'));
 const injection=renderTransientFields({...defaults,ambient:'"><script>alert(1)</script>'});
 assert.ok(injection.includes('&quot;'));assert.ok(!injection.includes('<script>'));
});
