import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STEFAN_BOLTZMANN_VALUE as sigma} from '../study-core.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<.0001,a+' vs '+b);
test('radiative exchange conserves energy and all four original question keys agree with calculations',async()=>{
 const Eb=sigma*400**4,G=sigma*300**4,eps=.8,A=.5;
 const J=eps*Eb+(1-eps)*G,flux=J-G,Q=A*flux;
 close(Eb,1451.61585);close(G,459.30033);close(J,1253.15275);
 close(flux,793.85242);close(Q,396.92621);
 close(flux,eps*sigma*(400**4-300**4));
 close(sigma*600**4/(sigma*300**4),16);
 close(eps*sigma*(400**4-400**4),0);
 const [source,bank,deep]=await Promise.all(['data/deep-physics-practice.json','data/questions.json','data/original-deep-lessons.json'].map(read));
 const items=source.questions.filter(q=>q.source.focusSectionId==='10.1');
 assert.equal(items.length,4);
 for(const item of items){
   assert.equal(item.source.guideId,'chapter10-view-factors');
   assert.deepEqual(bank.find(x=>x.id===item.id),item);
   const lengths=item.choices.map(x=>x.length);
   assert.ok(lengths[item.answer]<Math.max(...lengths));
 }
 const answers=new Map(items.map(q=>[q.id,q.choices[q.answer]]));
 assert.match(answers.get('supp-deep-rad-temperature-fourth-v1'),/16.0倍/);
 assert.match(answers.get('supp-deep-rad-radiosity-v1'),/1253.153/);
 assert.match(answers.get('supp-deep-rad-netflux-v1'),/7.939×10²/);
 assert.match(answers.get('supp-deep-rad-totalpower-v1'),/396.926/);
 const lesson=deep.lessons.find(x=>x.sectionId==='10.1');
 assert.ok(lesson);
 assert.ok(lesson.reviewStatus.includes('外部学術専門家校閲前'));
 assert.ok(lesson.references.some(x=>x.url.includes('physics.nist.gov')));
});
