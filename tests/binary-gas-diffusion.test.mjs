import test from 'node:test';
import assert from 'node:assert/strict';
import {
 BINARY_GAS_R,BINARY_DIFFUSION_DEFAULTS,binaryDiffusionFields,binaryDiffusionFieldNames,
 binaryDiffusionLogGradient,calculateBinaryDiffusion,binaryDiffusionMoleFractionAt,
 binaryDiffusionFluxComponentsAt,renderBinaryDiffusionFields,renderBinaryDiffusionSteps,
 renderBinaryDiffusionDiagram,binaryDiffusionProfileGraph,binaryDiffusionBoundaryGraph
} from '../binary-gas-diffusion.mjs';

const calc=patch=>calculateBinaryDiffusion({...BINARY_DIFFUSION_DEFAULTS,...patch});
const near=(a,b,rel=1e-9)=>assert.ok(Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),String(a)+' versus '+String(b));

test('ideal-gas total concentration and default fluxes match independent formulae',()=>{
 const r=calc({});
 const v=BINARY_DIFFUSION_DEFAULTS;
 assert.equal(r.error,undefined);
 const c=v.pressure/(BINARY_GAS_R*v.temperature);
 const eq=c*v.diffusivity*(v.yA1-v.yA2)/v.thickness;
 const stat=c*v.diffusivity/v.thickness*Math.log((1-v.yA2)/(1-v.yA1));
 near(r.totalConcentration,c);
 near(r.concentrationA1,c*v.yA1);near(r.concentrationA2,c*v.yA2);
 near(r.equimolarFlux,eq);near(r.stagnantFlux,stat);
 near(r.fluxA,.15602728925547651,1e-12);
 near(r.fluxB,0);near(r.bulkFlux,r.fluxA);
 near(r.molarRateA,r.fluxA*v.area);near(r.massRateA,r.molarRateA*v.molarMassA);
});

test('equimolar case has zero net molar flux and equal opposed component fluxes',()=>{
 const r=calc({regime:'equimolar'});
 near(r.fluxA,r.equimolarFlux);near(r.fluxB,-r.fluxA);
 near(r.bulkFlux,0);
 for(const u of [0,.1,.5,.9,1]){
  const local=binaryDiffusionFluxComponentsAt(r,u);
  near(local.diffusiveFluxA,r.fluxA);
  near(local.diffusiveFluxB,-r.fluxA);
  near(local.convectiveFluxA,0);near(local.convectiveFluxB,0);
  near(local.diffusiveFluxA+local.diffusiveFluxB,0);
 }
});

test('stagnant-B model has zero net B flux but a nonzero diffusive B flux',()=>{
 const r=calc({});
 for(const u of [0,.15,.5,.85,1]){
  const local=binaryDiffusionFluxComponentsAt(r,u);
  near(local.molarFluxB,0);
  near(local.totalMolarFlux,r.fluxA);
  near(local.diffusiveFluxB,-local.convectiveFluxB);
  near(local.diffusiveFluxA+local.convectiveFluxA,r.fluxA);
  near(local.diffusiveFluxA+local.diffusiveFluxB,0);
 }
});

test('equimolar concentration profile is linear at all positions',()=>{
 const r=calc({regime:'equimolar'});
 for(let i=0;i<=20;i++){
  const u=i/20;
  near(binaryDiffusionMoleFractionAt(r,u),r.values.yA1+(r.values.yA2-r.values.yA1)*u);
 }
});

test('stagnant B profile has linear log(1-yA), not linear yA',()=>{
 const r=calc({});
 const y1=r.values.yA1,y2=r.values.yA2;
 for(let i=0;i<=20;i++){
  const u=i/20,y=binaryDiffusionMoleFractionAt(r,u);
  near(Math.log1p(-y),(1-u)*Math.log1p(-y1)+u*Math.log1p(-y2));
 }
 assert.ok(Math.abs(binaryDiffusionMoleFractionAt(r,.5)-(y1+y2)/2)>.001);
});

test('Fick diffusion plus Stefan convection matches derivative of stagnant profile',()=>{
 const r=calc({}),v=r.values;
 const eps=1e-5,u=.42;
 const derivative=(binaryDiffusionMoleFractionAt(r,u+eps)-binaryDiffusionMoleFractionAt(r,u-eps))/(2*eps*v.thickness);
 const jA=-r.totalConcentration*v.diffusivity*derivative;
 const local=binaryDiffusionFluxComponentsAt(r,u);
 near(jA,local.diffusiveFluxA,1e-8);
 near(local.diffusiveFluxA+local.convectiveFluxA,r.fluxA,1e-8);
});

test('log-mean inert fraction equals flux enhancement identity',()=>{
 const r=calc({}),v=r.values;
 near(r.bLogMean,(v.yA1-v.yA2)/Math.log((1-v.yA2)/(1-v.yA1)));
 near(r.enhancement,1/r.bLogMean);
 near(r.stagnantFlux/r.equimolarFlux,r.enhancement);
 assert.ok(r.enhancement>1);
});

test('reverse composition gradient reverses both fluxes, preserving signs',()=>{
 const r=calc({yA1:.05,yA2:.3});
 assert.ok(r.fluxA<0);assert.ok(r.stagnantFlux<0);assert.ok(r.equimolarFlux<0);
 const eq=calc({yA1:.05,yA2:.3,regime:'equimolar'});
 near(eq.fluxA,-calc({regime:'equimolar'}).fluxA);
 near(r.stagnantFlux,-calc({}).stagnantFlux);
 assert.ok(binaryDiffusionMoleFractionAt(r,.5)>.05);
});

test('same boundary concentration yields zero net flux and constant profile',()=>{
 for(const regime of ['equimolar','stagnant']){
  const r=calc({regime,yA1:.3,yA2:.3});
  near(r.fluxA,0);near(r.fluxB,0);near(r.molarRateA,0);near(r.massRateA,0);
  assert.equal(r.enhancement,null);
  near(r.bLogMean,.7);
  for(const u of [0,.2,.5,.8,1])near(binaryDiffusionMoleFractionAt(r,u),.3);
 }
});

test('flux scales with diffusivity, pressure, thickness, temperature and area',()=>{
 const base=calc({});
 near(calc({diffusivity:5e-5}).fluxA,2*base.fluxA);
 near(calc({pressure:202650}).fluxA,2*base.fluxA);
 near(calc({thickness:.004}).fluxA,.5*base.fluxA);
 near(calc({temperature:596.3}).fluxA,.5*base.fluxA);
 near(calc({area:.03}).molarRateA,3*base.molarRateA);
 near(calc({molarMassA:.036}).massRateA,2*base.massRateA);
 near(calc({molarMassA:.036}).fluxA,base.fluxA);
});

test('near-equal fractions and low concentrations do not cause cancellation',()=>{
 const dilute=calc({yA1:1e-8,yA2:0});
 near(dilute.enhancement,1,1e-7);
 near(dilute.fluxA,dilute.equimolarFlux,1e-7);
 const tiny=calc({yA1:.50000001,yA2:.5});
 assert.ok(tiny.fluxA>0);near(tiny.enhancement,2,1e-6);
 const high=calc({yA1:.95,yA2:.90});
 assert.ok(high.enhancement>10);
 assert.ok(Number.isFinite(high.fluxA));
});

test('boundary values, alternate regime and invalid position are validated',()=>{
 const r=calc({});
 for(const regime of ['equimolar','stagnant']){
  near(binaryDiffusionMoleFractionAt(r,0,regime),.3);
  near(binaryDiffusionMoleFractionAt(r,1,regime),.05);
 }
 assert.throws(()=>binaryDiffusionMoleFractionAt(r,-.1),RangeError);
 assert.throws(()=>binaryDiffusionMoleFractionAt(r,1.1),RangeError);
 assert.throws(()=>binaryDiffusionMoleFractionAt(r,.5,'bad'),RangeError);
 assert.throws(()=>binaryDiffusionLogGradient(-.1,.2),RangeError);
 assert.throws(()=>binaryDiffusionLogGradient(.2,1),RangeError);
});

test('untrusted malformed and nonphysical inputs are rejected',()=>{
 for(const patch of [
  {regime:'unknown'},{pressure:0},{pressure:'0xff'},{temperature:0},
  {thickness:0},{diffusivity:Infinity},{area:null},{yA1:-.1},{yA1:1},
  {yA2:.951},{yA2:NaN},{molarMassA:''},{pressure:5.1e6}
 ]) assert.ok(calc(patch).error,JSON.stringify(patch));
 assert.ok(calculateBinaryDiffusion(null).error);
 assert.ok(calculateBinaryDiffusion([]).error);
 assert.ok(calculateBinaryDiffusion({}).error);
});

test('form escapes malicious text, includes a valid regime select and all units',()=>{
 assert.equal(binaryDiffusionFields.length,8);assert.equal(binaryDiffusionFieldNames.length,8);
 const html=renderBinaryDiffusionFields({...BINARY_DIFFUSION_DEFAULTS,pressure:'"><img src=x onerror=alert(1)>'});
 assert.ok(!html.includes('<img'));
 assert.match(html,/&quot;&gt;&lt;img/);
 assert.match(html,/name="regime"/);
 assert.match(html,/mol/);
 assert.match(html,/m²\/s/);
});

test('diagram and explanatory steps distinguish fluxes and satisfy accessibility',()=>{
 const r=calc({});
 const diagram=renderBinaryDiffusionDiagram(r),steps=renderBinaryDiffusionSteps(r);
 assert.match(diagram,/role="img"/);
 assert.match(diagram,/正味/);
 assert.match(steps,/Fick/);
 assert.match(steps,/B静止/);
 assert.match(steps,/mol\/s/);
 assert.equal(renderBinaryDiffusionSteps({error:'bad'}),'');
 assert.equal(renderBinaryDiffusionDiagram({error:'bad'}),'');
});

test('two SVG graphs provide physical axes, regime comparison and numerical safety',()=>{
 for(const regime of ['equimolar','stagnant']){
  const r=calc({regime});
  const a=binaryDiffusionProfileGraph(r),b=binaryDiffusionBoundaryGraph(r);
  assert.match(a,/role="img"/);assert.match(b,/role="img"/);
  assert.match(a,/位置 z\/L/);assert.match(b,/入口モル分率/);
  assert.match(b,/mol\/\(m²·s\)/);
  assert.match(a,/chart-current/);assert.match(a,/chart-baseline/);
  assert.match(b,/chart-current/);assert.match(b,/chart-baseline/);
  for(const output of [a,b]) assert.ok(!/NaN|Infinity|undefined/.test(output));
 }
 assert.equal(binaryDiffusionProfileGraph({error:'bad'}),'');
 assert.equal(binaryDiffusionBoundaryGraph({error:'bad'}),'');
});

test('deterministic boundary sweep checks finite profiles and no SVG invalid tokens',()=>{
 for(let i=0;i<80;i++){
  const y1=(i%20)/20*.95,y2=(Math.floor(i/20)/4)*.95;
  const r=calc({yA1:y1,yA2:y2,regime:i%2?'stagnant':'equimolar'});
  assert.equal(r.error,undefined);
  for(let j=0;j<=10;j++){
   const y=binaryDiffusionMoleFractionAt(r,j/10);
   assert.ok(Number.isFinite(y)&&y>=0&&y<=.95);
  }
  for(const svg of [binaryDiffusionProfileGraph(r),binaryDiffusionBoundaryGraph(r)])
   assert.ok(!/NaN|Infinity|undefined/.test(svg));
 }
});
