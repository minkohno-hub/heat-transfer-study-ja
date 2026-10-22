import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_SECTIONS,searchGuide} from '../guide.mjs';
import {calculateHeatTransfer,STEFAN_BOLTZMANN_VALUE} from '../study-core.mjs';

test('the in-app guide covers every screen and all four implemented models, including Japanese partial search',()=>{
  const ids=new Set(GUIDE_SECTIONS.map(section=>section.id));
  for(const id of ['start','reader','quiz','progress','review','plan','notes','search','data','offline','accessibility','simulator','sim-conduction','sim-convection','sim-radiation','sim-resistance','faq'])assert.ok(ids.has(id),id);
  assert.equal(ids.size,GUIDE_SECTIONS.length);
  assert.ok(searchGuide('放射率').some(section=>section.id==='sim-radiation'));
  assert.ok(searchGuide('復元').some(section=>section.id==='data'));
  assert.equal(searchGuide('見つからない語句xyz').length,0);
});

test('the four guide examples agree with independently calculated hand values',()=>{
  const conduction=calculateHeatTransfer('conduction',{k:15,area:.5,thickness:.08,hot:80,cold:20});
  assert.equal(conduction.watts,5625);
  assert.equal(calculateHeatTransfer('conduction',{k:15,area:.5,thickness:.16,hot:80,cold:20}).watts,2812.5);
  const convection=calculateHeatTransfer('convection',{h:25,area:1,surface:80,fluid:20});
  assert.equal(convection.watts,1500);
  const radiation=calculateHeatTransfer('radiation',{emissivity:1,area:1,surface:26.85,surrounding:-73.15});
  assert.ok(Math.abs(radiation.watts-STEFAN_BOLTZMANN_VALUE*6.5e9)<1e-6);
  assert.ok(Math.abs(radiation.watts-368.574337235)<1e-5);
  const resistance=calculateHeatTransfer('resistance',{area:1,hot:80,cold:20,hHot:10,hCold:20,k1:.5,k2:.1,L1:.1,L2:.05});
  assert.ok(Math.abs(resistance.totalResistance-.85)<1e-12);
  assert.ok(Math.abs(resistance.watts-70.5882352941)<1e-9);
  assert.ok(Math.abs(resistance.overallU-1/.85)<1e-12);
  assert.ok(Math.abs(resistance.temperatures.at(-1)-20)<1e-10);
});
