import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHeatTransfer,calculateLumpedCooling} from '../study-core.mjs';
import {renderSimulationVisual} from '../sim-visuals.mjs';
const conditions={
 conduction:{k:15,area:.5,thickness:.08,hot:80,cold:20},
 convection:{h:25,area:1,surface:80,fluid:20},
 radiation:{emissivity:.85,area:1,surface:150,surrounding:25},
 resistance:{area:1,hot:80,cold:20,hHot:10,hCold:20,k1:.5,k2:.1,L1:.1,L2:.05},
 transient:{h:20,area:.1,volume:.001,density:1000,cp:4000,k:10,initial:60,ambient:20,time:2000}
};
const calc=(mode,v)=>mode==='transient'?calculateLumpedCooling(v):calculateHeatTransfer(mode,v);
test('all five visual educational models provide responsive inline SVG and accessible physical context',()=>{
 for(const [mode,data] of Object.entries(conditions)){
   const result=calc(mode,data);
   assert.equal(result.error,undefined,mode);
   const svg=renderSimulationVisual(mode,result);
   assert.match(svg,/<figure class="sim-physical-figure">/,mode);
   assert.match(svg,/<svg[^>]+viewBox="0 0 580 214"[^>]+role="img"/,mode);
   assert.match(svg,/<title>/,mode);
   assert.match(svg,/<desc>/,mode);
   assert.match(svg,/<figcaption>/,mode);
   assert.match(svg,/<line |<path /,mode);
   assert.ok(!/<script|<image\b|foreignObject/.test(svg),mode);
 }
});
test('conduction, convection and radiation arrows reverse with the temperature direction and vanish when equal',()=>{
 for(const mode of ['conduction','convection','radiation']){
   const standard=conditions[mode];
   const keys=mode==='conduction'?['hot','cold']:mode==='convection'?['surface','fluid']:['surface','surrounding'];
   const a=renderSimulationVisual(mode,calc(mode,standard));
   const reversed={...standard,[keys[0]]:standard[keys[1]],[keys[1]]:standard[keys[0]]};
   const b=renderSimulationVisual(mode,calc(mode,reversed));
   assert.notEqual(a,b,mode);
   const flow=html=>{const m=html.match(/<line x1="([0-9]+)" y1="[^"]+" x2="([0-9]+)" y2="[^"]+" class="diagram-heat diagram-flow-line"/);assert.ok(m,mode);return [Number(m[1]),Number(m[2])];};
   const forward=flow(a),backward=flow(b);
   assert.ok(forward[0]<forward[1],'forward arrow must point right: '+mode);
   assert.ok(backward[0]>backward[1],'backward arrow must point left: '+mode);
   const equal={...standard,[keys[1]]:standard[keys[0]]};
   const c=renderSimulationVisual(mode,calc(mode,equal));
   assert.match(c,/熱移動なし/,mode);
   assert.ok(!c.includes('diagram-flow-line'),mode);
 }
});
test('radiation emissivity zero is correctly shown as no flow despite different temperatures',()=>{
 const data={...conditions.radiation,emissivity:0};
 const result=calc('radiation',data);
 assert.equal(result.watts,0);
 const svg=renderSimulationVisual('radiation',result);
 assert.ok(svg.includes('熱移動なし'));
 assert.match(svg,/ε = 0/);
});
test('a resistance diagram reports calculated boundary temperatures and direction',()=>{
 const v=conditions.resistance;
 const result=calc('resistance',v);
 assert.equal(result.temperatures.length,5);
 const svg=renderSimulationVisual('resistance',result);
 for(const temp of result.temperatures){
   const formatted=Number(temp).toLocaleString('ja-JP',{maximumFractionDigits:2});
   assert.ok(svg.includes(formatted+'℃'),formatted);
 }
 const rev=renderSimulationVisual('resistance',calc('resistance',{...v,hot:20,cold:80}));
 assert.match(rev,/points="140,126 154,119 154,133"/);
});
test('transient diagrams update temperature and direction as time and ambient conditions change',()=>{
 const a=calc('transient',conditions.transient);
 const b=calc('transient',{...conditions.transient,time:4000});
 assert.ok(b.temperature<a.temperature);
 const first=renderSimulationVisual('transient',a),later=renderSimulationVisual('transient',b);
 assert.notEqual(first,later);
 assert.ok(first.includes('t = 2,000 s'));
 assert.ok(later.includes('t = 4,000 s'));
 const heating=renderSimulationVisual('transient',calc('transient',{...conditions.transient,initial:0,ambient:20}));
 assert.match(heating,/<line x1="369" y1="123" x2="221" y2="123" class="diagram-heat diagram-flow-line"/);
});
test('invalid or nonfinite inputs never render a misleading physical diagram',()=>{
 for(const mode of Object.keys(conditions)){
   assert.equal(renderSimulationVisual(mode,{error:'invalid'}),'');
   assert.equal(renderSimulationVisual(mode,{watts:Infinity,values:conditions[mode]}),'');
   assert.equal(renderSimulationVisual(mode,null),'');
 }
});
