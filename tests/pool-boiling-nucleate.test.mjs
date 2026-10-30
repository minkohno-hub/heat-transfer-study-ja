import test from 'node:test';
import assert from 'node:assert/strict';
import {
 NUCLEATE_DEFAULTS,nucleateFields,nucleateFieldNames,rohsenowHeatFlux,
 nucleateZuberLimit,calculateNucleateBoiling,renderNucleateFields,
 renderNucleateSteps,renderNucleateDiagram,nucleateHeatFluxGraph,
 nucleateSurfaceSensitivityGraph
} from '../pool-boiling-nucleate.mjs';

const calc=patch=>calculateNucleateBoiling({...NUCLEATE_DEFAULTS,...patch});
const close=(a,b,rel=1e-9)=>assert.ok(
 Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),
 String(a)+' versus '+String(b));

test('Rohsenow baseline agrees with separate published formula evaluation',()=>{
 const r=calc({}),v=NUCLEATE_DEFAULTS;
 assert.equal(r.error,undefined);
 const pr=v.viscosity*v.cp/v.conductivity;
 const pref=v.viscosity*v.latent*Math.sqrt(9.80665*(v.rhoLiquid-v.rhoVapor)/v.surfaceTension);
 const expected=pref*Math.pow(v.cp*v.superheat/(v.csf*v.latent*Math.pow(pr,v.n)),3);
 close(r.pr,pr);
 close(r.flux,expected);
 close(r.flux,140461.9579848127,1e-10);
 close(r.watts,1404.6195798481272,1e-10);
 close(r.h,r.flux/v.superheat);
});

test('Zuber limit uses independent saturated-liquid and saturated-vapor properties',()=>{
 const r=calc({}),v=r.values;
 const direct=.131*v.latent*Math.sqrt(v.rhoVapor)*
   Math.pow(v.surfaceTension*9.80665*(v.rhoLiquid-v.rhoVapor),.25);
 close(r.criticalFlux,direct);
 close(r.criticalFlux,nucleateZuberLimit(v));
 close(r.criticalFlux,1107944.6408485055,1e-10);
 close(r.chfRatio,r.flux/r.criticalFlux);
});

test('nucleate flux follows the cube of wall superheat',()=>{
 const a=calc({superheat:5}),b=calc({superheat:10});
 close(b.flux/a.flux,8);
 close(b.h/a.h,4);
 close(b.idealVaporMassRate/a.idealVaporMassRate,8);
});

test('Rohsenow Csf surface-compatibility constant changes heat flux cubically',()=>{
 const a=calc({csf:.013}),b=calc({csf:.026});
 close(b.flux/a.flux,1/8);
 close(b.h/a.h,1/8);
 close(b.chfRatio/a.chfRatio,1/8);
 close(b.criticalFlux,a.criticalFlux);
});

test('Prandtl exponent n changes flux and is an empirical not universal setting',()=>{
 const a=calc({n:1}),b=calc({n:1.7});
 close(b.flux/a.flux,Math.pow(a.pr,-2.1));
 assert.ok(b.flux<a.flux);
});

test('wall area changes total power and vapor mass but not heat flux or coefficient',()=>{
 const a=calc({area:.01}),b=calc({area:.1});
 close(b.watts,10*a.watts);
 close(b.idealVaporMassRate,10*a.idealVaporMassRate);
 close(b.flux,a.flux);
 close(b.h,a.h);
});

test('latent-only vapor mass estimate follows heat transfer and latent heat',()=>{
 const r=calc({});
 close(r.idealVaporMassRate,r.watts/r.values.latent);
 assert.ok(r.idealVaporMassRate>0);
});

test('Rohsenow CHF formal intersection is the inverse of the cubic relation',()=>{
 const r=calc({}),v=r.values;
 const q=rohsenowHeatFlux(v,r.formalCrossing);
 close(q,r.criticalFlux,1e-9);
 close(r.formalCrossing,19.906112203797086,1e-10);
});

test('above-Zuber-CHF nuclear boiling must be rejected, not naively extended',()=>{
 const r=calc({superheat:20});
 assert.ok(r.error);
 assert.match(r.error,/CHF/);
 assert.match(r.error,/外挿/);
 const below=calc({superheat:19});
 assert.equal(below.error,undefined);
 assert.ok(below.chfRatio>.8&&below.chfRatio<1);
 assert.match(below.warning,/80%/);
});

test('too small wall superheat is rejected instead of asserting boiling onset',()=>{
 const r=calc({superheat:0});
 assert.ok(r.error);
 assert.ok(calc({superheat:.05}).error);
 const small=calc({superheat:.1});
 assert.equal(small.error,undefined);
 assert.match(small.warning,/開始点/);
});

test('rhoLiquid and rhoVapor influence both CHF and nucleate transport differently',()=>{
 const base=calc({});
 const other=calc({rhoLiquid:900,rhoVapor:.8});
 close(other.flux/base.flux,Math.sqrt((900-.8)/(958.4-.597)));
 close(other.criticalFlux/base.criticalFlux,
  Math.sqrt(.8/.597)*Math.pow((900-.8)/(958.4-.597),.25));
});

test('viscosity and thermal conductivity enter through liquid Prandtl number',()=>{
 const a=calc({}),b=calc({viscosity:.000282*2});
 close(b.pr/a.pr,2);
 close(b.flux/a.flux,.25,1e-9);
 const doubled={...NUCLEATE_DEFAULTS,conductivity:.679*2};
 close((doubled.viscosity*doubled.cp/doubled.conductivity)/a.pr,.5);
 close(rohsenowHeatFlux(doubled,doubled.superheat)/a.flux,8);
 // Raw correlation predicts beyond CHF, so the public calculator must reject the case.
 assert.match(calc({conductivity:.679*2}).error,/CHF/);
});

test('fluid inputs with unsupported Pr or invalid density relationship are rejected',()=>{
 assert.ok(calc({viscosity:9,conductivity:.001}).error);
 assert.ok(calc({rhoLiquid:.597}).error);
 assert.ok(calc({rhoVapor:958.4}).error);
 assert.throws(()=>rohsenowHeatFlux({...NUCLEATE_DEFAULTS,csf:0},10),RangeError);
 assert.throws(()=>nucleateZuberLimit({...NUCLEATE_DEFAULTS,rhoVapor:0}),RangeError);
});

test('strict decimal and physical ranges reject unsafe or nonnumeric values',()=>{
 for(const patch of [{n:0},{csf:0},{latent:Infinity},{surfaceTension:-.1},
  {area:null},{superheat:'0x10'},{cp:NaN},{conductivity:''},
  {viscosity:-1},{superheat:1000},{rhoLiquid:'1_000'}]){
  assert.ok(calc(patch).error,JSON.stringify(patch));
 }
 assert.ok(calculateNucleateBoiling(null).error);
 assert.ok(calculateNucleateBoiling([]).error);
 assert.ok(calculateNucleateBoiling({}).error);
});

test('input UI sanitizes values and includes Csf, n, and SI units',()=>{
 assert.equal(nucleateFields.length,11);
 assert.equal(nucleateFieldNames.length,11);
 const html=renderNucleateFields({...NUCLEATE_DEFAULTS,csf:'"><svg onload=alert(1)>'});
 assert.ok(!html.includes('<svg'));
 assert.match(html,/&quot;&gt;&lt;svg/);
 assert.match(html,/Csf/);
 assert.match(html,/J\/kg/);
});

test('steps and diagram distinguish CHF from nucleate correlation',()=>{
 const r=calc({});
 assert.match(renderNucleateSteps(r),/Rohsenow/);
 assert.match(renderNucleateSteps(r),/Zuber/);
 assert.match(renderNucleateSteps(r),/開始/);
 assert.match(renderNucleateDiagram(r),/role="img"/);
 assert.match(renderNucleateDiagram(r),/模式図/);
 assert.equal(renderNucleateSteps({error:'bad'}),'');
 assert.equal(renderNucleateDiagram({error:'bad'}),'');
});

test('superheat graph never plots Rohsenow values beyond its own CHF',()=>{
 const r=calc({}),svg=nucleateHeatFluxGraph(r,calc({superheat:12}));
 assert.match(svg,/CHF/);
 assert.match(svg,/chart-current/);
 assert.match(svg,/chart-baseline/);
 assert.match(svg,/過熱度/);
 assert.match(svg,/W\/m²/);
 assert.ok(!/NaN|Infinity|undefined/.test(svg));
 assert.equal(nucleateHeatFluxGraph({error:'bad'}),'');
});

test('surface coefficient sensitivity graph has physical axis and finite path',()=>{
 const r=calc({});
 const svg=nucleateSurfaceSensitivityGraph(r);
 assert.match(svg,/role="img"/);
 assert.match(svg,/Csf/);
 assert.match(svg,/W\/m²/);
 assert.match(svg,/chart-current/);
 assert.ok(!/NaN|Infinity|undefined/.test(svg));
 assert.equal(nucleateSurfaceSensitivityGraph({error:'bad'}),'');
});

test('deterministic property and superheat variation preserves guard conditions',()=>{
 let valid=0,invalid=0;
 for(let i=0;i<180;i++){
  const delta=1+20*(i%30)/29,csf=.008+.009*Math.floor(i/30)/5;
  const r=calc({superheat:delta,csf});
  if(r.error){invalid++;continue;}
  valid++;
  assert.ok(r.flux>0&&r.flux<r.criticalFlux);
  assert.ok(r.chfRatio<1);
  const graph=nucleateHeatFluxGraph(r);
  assert.ok(!/NaN|Infinity|undefined/.test(graph));
 }
 assert.ok(valid>0&&invalid>0);
});
