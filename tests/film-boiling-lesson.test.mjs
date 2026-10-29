import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deepLessonForSection} from '../original-deep-lessons.mjs';

test('§9.4 separates a fixed vapor-layer teaching model from actual film boiling design',async()=>{
 const deep=JSON.parse(await readFile(new URL('../data/original-deep-lessons.json',import.meta.url)));
 const lesson=deepLessonForSection(deep,'9.4');
 assert.ok(lesson);
 assert.ok(lesson.blocks.length>=7);
 assert.ok(lesson.blocks.reduce((n,b)=>n+b.text.length,0)>=1200);
 assert.ok(lesson.equations.length>=4&&lesson.pitfalls.length>=5);
 const body=lesson.blocks.map(b=>b.text).join(' ');
 assert.match(body,/実際の膜厚や膜沸騰熱伝達率を予測する相関式ではない/);
 assert.match(body,/単に足して実機の総伝熱を保証することはできない/);
 assert.match(lesson.reviewStatus,/外部学術専門家校閲前/);
 assert.equal(deep.translation,false);
 assert.equal(deep.expertReviewed,false);
});

test('fixed-layer film boiling illustration independently closes thermal resistance and energy units',()=>{
 const k=.030,delta=.25e-3,dT=180-100,area=.10;
 const rArea=delta/k;
 const qFlux=dT/rArea;
 const heat=area*qFlux;
 assert.ok(Math.abs(rArea-1/120)<1e-12);
 assert.equal(qFlux,9600);
 assert.equal(heat,960);
 assert.equal(dT,80); // Celsius temperature difference has the same numerical value in kelvin.
 assert.equal((k*dT/(2*delta))/qFlux,.5);
 assert.equal(area*k*dT/(2*delta),480);
});
