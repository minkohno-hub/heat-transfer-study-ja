import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {glossaryMatches,renderLinkedQuestion} from '../quiz-glossary.mjs';
const data=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('expanded glossary has distinct, usable academic concepts without claiming expert review',async()=>{
 const terms=await data('data/glossary.json');
 assert.equal(terms.length,84);
 assert.equal(new Set(terms.map(t=>t.id)).size,terms.length);
 for(const id of ['heat-conduction','fourier-law','boundary-condition','specific-heat','error-function',
   'fin-effectiveness','insulated-fin-tip','radiosity','irradiation','gray-surface',
   'fick-law','schmidt-number','sherwood-number']){
   const x=terms.find(t=>t.id===id);
   assert.ok(x,id);
   assert.ok(x.meaning.length>45,id);
   assert.equal(x.source.type,'supplement');
   assert.equal(x.reviewStatus,'needs_review');
 }
});
test('linker prioritizes long terms, honors aliases and does not break math rendering',async()=>{
 const terms=await data('data/glossary.json');
 const input='熱伝導率 k と熱伝導、熱移動率、ビオ数 Bi、フィン効率、フィン有効度と射度 J は？';
 const matches=glossaryMatches(input,terms);
 const ids=matches.map(m=>m.id);
 assert.ok(ids.includes('thermal-conductivity'));
 assert.ok(ids.includes('heat-conduction'));
 assert.ok(ids.includes('heat-rate'));
 assert.ok(ids.includes('biot-number'));
 assert.ok(ids.includes('fin-efficiency'));
 assert.ok(ids.includes('fin-effectiveness'));
 assert.ok(ids.includes('radiosity'));
 assert.equal(matches.filter(m=>m.id==='thermal-conductivity').length,1);
 const rendered=renderLinkedQuestion(input,terms);
 assert.match(rendered,/data-quiz-term="thermal-conductivity"/);
 assert.match(rendered,/data-quiz-term="heat-rate"/);
 assert.match(rendered,/aria-label="熱伝導率の説明を開く"/);
 assert.equal((rendered.match(/data-quiz-term=/g)||[]).length,matches.length);
 assert.ok(!glossaryMatches('熱の移動',terms).some(m=>m.id==='heat'),'single-character links must not clutter questions');
});
test('untrusted question text never creates scripts, fake attributes or unknown glossary links',()=>{
 const terms=[{id:'valid-term',ja:'危険な用語',aliases:['用語'],meaning:'ok'}];
 const source='<img src=x onerror=alert(1)> 用語 <script>窃取</script>';
 const html=renderLinkedQuestion(source,terms);
 assert.ok(!html.includes('<img'));
 assert.ok(!html.includes('<script'));
 assert.ok(html.includes('&lt;img'));
 assert.match(html,/data-quiz-term="valid-term"/);
 const bad=[{id:'"><script>',ja:'用語'}];
 assert.ok(!renderLinkedQuestion('用語',bad).includes('data-quiz-term='));
 assert.equal(renderLinkedQuestion('数式 α²=5、原単位W/m²',[],x=>x),'数式 α²=5、原単位W/m²');
 assert.deepEqual(glossaryMatches('ignored',null),[]);
});
test('real quiz bank contains linked terms in multiple chapters; text format preserves unchanged words',async()=>{
 const [terms,bank]=await Promise.all(['data/glossary.json','data/questions.json'].map(data));
 const linked=bank.filter(q=>glossaryMatches(q.prompt,terms).length>0);
 assert.ok(linked.length>=65,'wide cross-chapter discoverability, not a single example');
 const chapters=new Set(linked.map(x=>x.source?.chapterId||x.source?.section||'generic'));
 assert.ok(chapters.size>=5);
 for(const q of linked){
   const matches=glossaryMatches(q.prompt,terms);
   const original=q.prompt;
   let reconstructed='',i=0;
   for(const m of matches){reconstructed+=original.slice(i,m.start)+m.token;i=m.end;}
   reconstructed+=original.slice(i);
   assert.equal(reconstructed,original,q.id);
   assert.ok(matches.every(m=>terms.some(t=>t.id===m.id)));
 }
});
