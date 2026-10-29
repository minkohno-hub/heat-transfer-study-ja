import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_SECTIONS,searchGuide} from '../guide.mjs';
import {validateQuestion} from '../study-core.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';

const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));
const answerLabels={
  'ch1-flux':'2,000 W/m²','ch1-energy':'21,600 J','ch1-storage':'10,000 J',
  'ch2-cylinder-resistance':'0.0552 K/W','ch2-cylinder-watts':'200 W','ch2-series':'20 W',
  'ch3-qmax':'24,000 W','ch3-epsilon':'0.50','ch3-outlet':'50 ℃',
  'ch4-fin-m':'3.16 m⁻¹','ch4-fin-eta':'0.762','ch4-fin-concept':'効率は下がり得る一方、総放熱量は増え得る',
  'ch5-penetration':'0.020 m','ch5-time':'2倍','ch5-surface':'T_s',
  'ch6-nuavg':'66.4','ch6-have':'3.32','ch6-local':'h̄=2h_L',
  'ch7-dh':'13.3 mm','ch7-nu-boundary':'3.66','ch7-h':'109.8',
  'ch8-ra':'1.5×10⁶','ch8-length':'8倍','ch8-gr-pr':'1.4×10⁶',
  'ch9-latent':'44 kW','ch9-qflux':'50,000 W/m²','ch9-chf':'伝熱悪化と壁温上昇の危険に関わる',
  'ch10-reciprocity':'0.30','ch10-enclosure':'0.40','ch10-concept':'凹面では自己へ届く割合が正になり得る',
  'ch11-fick':'+2.0×10⁻⁷ mol/(m²·s)','ch11-sc':'500','ch11-sh':'1,000'
};
const numericChecks={
  'ch1-flux':{value:120/.060,expected:2000},
  'ch1-energy':{value:120*180,expected:21600},
  'ch1-storage':{value:2*500*10,expected:10000},
  'ch2-cylinder-resistance':{value:Math.log(.020/.010)/(2*Math.PI*2*1),expected:.0551589},
  'ch2-cylinder-watts':{value:10/.050,expected:200},
  'ch2-series':{value:12/(.1+.2+.3),expected:20},
  'ch3-qmax':{value:Math.min(400,600)*60,expected:24000},
  'ch3-epsilon':{value:12000/24000,expected:.5},
  'ch3-outlet':{value:80-12000/400,expected:50},
  'ch4-fin-m':{value:Math.sqrt(20*.04/(200*.0004)),expected:Math.sqrt(10)},
  'ch4-fin-eta':{value:Math.tanh(1),expected:.761594},
  'ch5-penetration':{value:2*Math.sqrt(1e-6*100),expected:.02},
  'ch5-time':{value:Math.sqrt(4),expected:2},
  'ch6-nuavg':{value:.664*Math.sqrt(10000)*Math.cbrt(1),expected:66.4},
  'ch6-have':{value:66.4*.025/.5,expected:3.32},
  'ch6-local':{value:.664/.332,expected:2},
  'ch7-dh':{value:2*20*10/(20+10),expected:13.3333333},
  'ch7-h':{value:3.66*.60/.020,expected:109.8},
  'ch8-ra':{value:10*.003*10*.1**3/(1e-5*2e-5),expected:1.5e6},
  'ch8-length':{value:2**3,expected:8},
  'ch8-gr-pr':{value:2e6*.70,expected:1.4e6},
  'ch9-latent':{value:.020*2.2e6,expected:44000},
  'ch9-qflux':{value:500/.010,expected:50000},
  'ch10-reciprocity':{value:2*.6/4,expected:.3},
  'ch10-enclosure':{value:1-0-.6,expected:.4},
  'ch11-fick':{value:-2e-9*(-100),expected:2e-7},
  'ch11-sc':{value:1e-6/2e-9,expected:500},
  'ch11-sh':{value:1e-4*.02/2e-9,expected:1000}
};
test('eleven chapter-aligned original guides map to actual book chapter sections without copying source material',async()=>{
  const book=await read('data/book.json');
  const known=new Map(book.chapters.map(c=>[c.id,new Set(c.sections.map(s=>s.id))]));
  const guides=GUIDE_SECTIONS.filter(g=>g.id.startsWith('chapter'));
  assert.equal(guides.length,11);
  assert.equal(new Set(guides.map(g=>g.bookChapter)).size,11);
  for(const guide of guides){
    assert.ok(known.has(guide.bookChapter),guide.id);
    assert.ok(guide.relatedSectionIds.length>=2,guide.id);
    assert.ok(guide.relatedSectionIds.every(id=>known.get(guide.bookChapter).has(id)),guide.id);
    assert.ok(guide.html.length>=300,guide.id);
    assert.ok((guide.html.match(/<p>/g)||[]).length>=4,guide.id);
    assert.ok(guide.html.includes('<p>'),guide.id);
    assert.ok(searchGuide(guide.title).some(x=>x.id===guide.id),guide.id);
  }
  assert.match(GUIDE_SECTIONS.find(x=>x.id==='chapter8-buoyancy').html,/Ra=1.5×10⁶/);
});
test('all 33 chapter exercises have correct single-choice keys and independent arithmetic checks',async()=>{
  const qs=await read('data/questions.json');
  const chapter=qs.filter(q=>q.id.startsWith('supp-chapter-'));
  assert.ok(qs.length>=265);
  assert.equal(chapter.length,33);
  assert.equal(new Set(chapter.map(q=>q.id)).size,33);
  assert.equal(Object.keys(answerLabels).length,33);
  const guideIds=new Set(GUIDE_SECTIONS.map(g=>g.id));
  for(let c=1;c<=11;c++){
    const id='ch'+c;
    assert.equal(chapter.filter(q=>q.source.chapterId===id).length,3,id);
  }
  for(const q of chapter){
    const suffix=q.id.replace('supp-chapter-','');
    assert.equal(validateQuestion(q),'',q.id);
    assert.ok(guideIds.has(q.source.guideId),q.id);
    assert.equal(q.source.type,'supplement',q.id);
    assert.equal(q.expertReviewed,false,q.id);
    assert.match(q.reviewStatus,/専門家校閲なし/,q.id);
    assert.equal(q.choices.length,4,q.id);
    assert.equal(new Set(q.choices).size,4,q.id);
    assert.equal(q.choices[q.answer],answerLabels[suffix],q.id);
    assert.equal(q.distractors.length,4,q.id);
    assert.equal(q.distractors.filter(x=>x.startsWith('正解。')).length,1,q.id);
    assert.ok(q.distractors[q.answer].startsWith('正解。'),q.id);
    assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3,q.id);
  }
  for(const [suffix,check] of Object.entries(numericChecks)){
    assert.ok(answerLabels[suffix],suffix);
    const relativeError=Math.abs(check.value-check.expected)/Math.max(1,Math.abs(check.expected));
    assert.ok(relativeError<1e-5,suffix+': '+check.value);
  }
});
test('new glossary links target valid chapter practice and public contract remains valid',async()=>{
  const [book,questions,glossary]=await Promise.all(['data/book.json','data/questions.json','data/glossary.json'].map(read));
  assert.equal(glossary.length,133);
  const chTerms=glossary.filter(t=>t.source?.guideId?.startsWith('chapter')&&t.relatedQuestions?.length);
  assert.equal(chTerms.length,35);
  assert.equal(chTerms.filter(t=>t.relatedQuestions.length>=2).length,11,'Original chapter practice links must remain intact');
  for(const term of chTerms){
    assert.ok(term.relatedQuestions.length>=1,term.id);
    for(const r of term.relatedQuestions){
      const q=questions.find(q=>q.id===r.id);
      assert.ok(q,term.id+' '+r.id);
      assert.equal(q.source.guideId,term.source.guideId,term.id);
    }
  }
  for(const chapter of book.chapters)for(const section of chapter.sections){
    if(section.translationStatus==='translated')section.translationStatus='private_only';
    delete section.blocks;delete section.blocksEn;delete section.figures;delete section.sourceReview;
  }
  for(const q of questions)if(q.figure?.kind==='book')delete q.figure.src;
  assert.deepEqual(checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS}),[]);
});
