import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_SECTIONS} from '../guide.mjs';
import {questionChapter,questionsForChapter,chapterLearningOverview} from '../chapter-curriculum.mjs';

const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
test('all eleven chapters have distinct independently authored question sets with precise source boundaries',async()=>{
  const [book,questions]=await Promise.all([read('data/book.json'),read('data/questions.json')]);
  const chapters=new Set(book.chapters.map(ch=>ch.id));
  const chapterCounts=Object.fromEntries(book.chapters.map(ch=>[ch.id,ch.sections.length]));
  assert.equal(chapters.size,11);
  const classified=questions.filter(q=>questionChapter(q,GUIDE_SECTIONS));
  assert.equal(classified.length,149); // 33 chapter questions + 76 original section questions + 7 book-cited questions
  for(const chapter of chapters){
    const qs=questionsForChapter(questions,chapter,GUIDE_SECTIONS);
    assert.equal(qs.filter(q=>q.source.type==='supplement').length,6+chapterCounts[chapter],chapter);
    assert.equal(qs.filter(q=>q.source.type==='book').length,chapter==='ch9'?7:0,chapter);
  }
  assert.equal(questionsForChapter(questions,'unknown',GUIDE_SECTIONS).length,0);
  const legacy=questions.find(q=>q.id==='supp-flat-thickness');
  assert.equal(questionChapter(legacy,GUIDE_SECTIONS),null,'Generic supplemental topic must not be mislabeled as a textbook chapter');
  assert.equal(questionChapter({source:{type:'book',section:'9.2'}},GUIDE_SECTIONS),'ch9');
  assert.equal(questionChapter({source:{type:'book',section:'x.y'}},GUIDE_SECTIONS),null);
});
test('chapter overview uses most recent per-question answer and never implies full text translation',async()=>{
  const [book,questions]=await Promise.all([read('data/book.json'),read('data/questions.json')]);
  const attempts=[
    {questionId:'supp-chapter-ch2-series',at:'2026-10-28T09:00:00+09:00',correct:false},
    {questionId:'supp-chapter-ch2-series',at:'2026-10-28T09:30:00+09:00',correct:true},
    {questionId:'supp-chapter-ch3-qmax',at:'2026-10-28T09:30:00+09:00',correct:false},
    {questionId:'supp-chapter-ch2-series',at:'invalid',correct:false},
    {questionId:'wrong-id',at:'2026-10-28T09:30:00+09:00',correct:true}
  ];
  const overview=chapterLearningOverview(book,questions,GUIDE_SECTIONS,attempts,{'2.1':true,'2.2':true});
  assert.equal(overview.length,11);
  const ch2=overview.find(ch=>ch.chapter==='ch2');
  assert.equal(ch2.guideId,'chapter2-cylindrical-conduction');
  assert.equal(ch2.practiceQuestionCount,11);
  assert.equal(ch2.attemptedQuestions,1);
  assert.equal(ch2.latestCorrect,1);
  assert.equal(ch2.sectionsMarkedRead,2);
  const ch3=overview.find(ch=>ch.chapter==='ch3');
  assert.equal(ch3.attemptedQuestions,1);
  assert.equal(ch3.latestCorrect,0);
  const ch9=overview.find(ch=>ch.chapter==='ch9');
  assert.equal(ch9.practiceQuestionCount,24);
  assert.equal(ch9.bookCitedQuestionCount,7);
  assert.equal(overview.reduce((sum,x)=>sum+x.practiceQuestionCount,0),149);
  const numerical=chapterLearningOverview(book,questions,GUIDE_SECTIONS,[
    {questionId:'supp-chapter-ch2-series',at:Date.UTC(2026,9,28,0),correct:true},
    {questionId:'supp-chapter-ch2-series',at:'2026-10-28T10:00:00+09:00',correct:false}
  ]);
  assert.equal(numerical.find(ch=>ch.chapter==='ch2').latestCorrect,0,'Numeric legacy timestamps participate in last-answer ranking');
  assert.deepEqual(chapterLearningOverview(null,[],[]),[]);
});
