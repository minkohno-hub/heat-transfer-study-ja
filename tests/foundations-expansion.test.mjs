import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateDeepLessons,deepLessonForSection} from '../original-deep-lessons.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';

const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));
const close=(actual,want,tol=1e-9)=>assert.ok(Math.abs(actual-want)<=tol*Math.max(1,Math.abs(want)),String(actual)+' vs '+want);
const sectionIds=['1.2','1.3','2.2','2.3','3.3','5.3','6.1','9.1'];
test('eight additional original lessons are complete enough for independent internal audit, without false translation or expert-review claims',async()=>{
  const [book,deep]=await Promise.all(['data/book.json','data/original-deep-lessons.json'].map(read));
  assert.deepEqual(validateDeepLessons(book,deep),[]);
  assert.equal(deep.translation,false);
  assert.equal(deep.expertReviewed,false);
  assert.ok(deep.lessons.length>=26);
  for(const id of sectionIds){
    const lesson=deepLessonForSection(deep,id);
    assert.ok(lesson,id);
    assert.ok(lesson.blocks.length>=6,id);
    assert.ok(lesson.blocks.reduce((n,b)=>n+b.text.length,0)>=750,id);
    assert.ok(lesson.equations.length>=3,id);
    assert.ok(lesson.workedExample.steps.length>=4,id);
    assert.ok(lesson.pitfalls.length>=4,id);
    assert.ok(lesson.reviewStatus.includes('外部学術専門家校閲前'),id);
  }
});
test('32 added exercises refer to a real section/guide and retain four explained options and no length cue',async()=>{
  const [book,questions,glossary,originalNotes,deepLessons]=await Promise.all(
    ['data/book.json','data/questions.json','data/glossary.json','data/original-notes.json','data/original-deep-lessons.json'].map(read)
  );
  assert.ok(questions.length>=312);
  const newQuestions=questions.filter(q=>q.id.startsWith('supp-found-'));
  assert.equal(newQuestions.length,32);
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  const gids=new Set(GUIDE_SECTIONS.map(x=>x.id));
  const bookIds=new Set(book.chapters.flatMap(ch=>ch.sections.map(s=>s.id)));
  for(const q of newQuestions){
    assert.ok(sectionIds.includes(q.source?.focusSectionId),q.id);
    assert.ok(bookIds.has(q.source.focusSectionId),q.id);
    assert.ok(gids.has(q.source.guideId),q.id);
    assert.equal(q.source.chapterId,'ch'+q.source.focusSectionId.split('.')[0]);
    assert.equal(q.choices.length,4);
    assert.equal(q.distractors.length,4);
    assert.ok(q.hints.length>=2&&q.solutionSteps.length>=3);
    assert.equal(q.expertReviewed,false);
    assert.ok(q.reviewStatus.includes('外部専門家校閲前'));
    assert.ok(q.answer>=0&&q.answer<=3&&Number.isInteger(q.answer));
    const correct=q.choices[q.answer].length,others=q.choices.filter((_,i)=>i!==q.answer).map(x=>x.length);
    assert.ok(correct<=Math.max(...others),'length cue '+q.id);
    assert.ok(correct>=Math.min(...others),'shortest cue '+q.id);
  }
  for(const chapter of book.chapters)for(const section of chapter.sections){
    if(section.translationStatus==='translated')section.translationStatus='private_only';
    delete section.blocks;delete section.blocksEn;delete section.figures;delete section.sourceReview;
  }
  for(const q of questions)if(q.figure?.kind==='book')delete q.figure.src;
  assert.deepEqual(checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS,originalNotes,deepLessons}),[]);
});
test('worked examples close independent SI-unit balances and physical limits',async()=>{
  const lessons=(await read('data/original-deep-lessons.json')).lessons;
  const find=id=>lessons.find(x=>x.sectionId===id).workedExample;
  const E=2*500*10,net=200-50;
  assert.equal(E,10000);close(E/net,66.66666666666667);
  assert.ok(find('1.2').answer.includes('66.7'));
  const k=2,A=.5,dT=20,L=.1;
  assert.equal(k*A*dT/L,200);
  assert.equal(10*A*dT,100);
  const sigma=5.670374419e-8;
  close(.8*sigma*A*(320**4-300**4),54.11260989549,1e-7);
  assert.ok(find('1.3').answer.includes('54.11'));
  const R=.2/(4*2);
  close(R,.025);close(40/R,1600);
  assert.ok(find('2.2').answer.includes('1600'));
  close(60/(.1+.2),200);
  close(60/.1+60/.2,900);
  assert.ok(find('2.3').answer.includes('900'));
  const ntu=300/300,eps=1-Math.exp(-ntu),q=eps*300*(60-20);
  close(eps,.6321205588285577);close(q,7585.44670594,1e-8);
  assert.ok(find('3.3').answer.includes('7.585'));
  close(50*.02/5,.2);close(1e-6*100/.02**2,.25);
  assert.ok(find('5.3').answer.includes('0.25'));
  close(2*.5/1.5e-5,66666.66666666667);
  close(1.5e-5/2e-5,.75);
  close(20*.5/.025,400);
  assert.ok(find('6.1').answer.includes('400'));
  close(200/.01,20000);
  close((200/.01)/(120-100),1000);
  assert.ok(find('9.1').answer.includes('1000'));
});
