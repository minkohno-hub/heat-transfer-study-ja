import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_SECTIONS} from '../guide.mjs';
import {learningCoverage} from '../learning-coverage.mjs';
const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));

test('coverage report separates original problems from verified book citation and public Japanese lessons',async()=>{
  const [book,questions,glossary,contentManifest]=await Promise.all(['data/book.json','data/questions.json','data/glossary.json','data/content-manifest.json'].map(read));
  const coverage=learningCoverage({book,questions,glossary,guides:GUIDE_SECTIONS,contentManifest});
  assert.equal(coverage.pdfPages,810);
  assert.equal(coverage.textbookSections,76);
  assert.equal(coverage.chapterCount,11);
  assert.equal(coverage.oldPcDraftOrPrivateRecordSections,46);
  assert.equal(coverage.oldPcDraftOnlyRecordSections,44);
  assert.equal(coverage.protectedPriorSections,2);
  assert.equal(coverage.publicJapaneseSections,0);
  assert.equal(coverage.totalQuestions,39);
  assert.equal(coverage.appCreatedQuestions,32);
  assert.equal(coverage.bookCitedQuestions,7);
  assert.equal(coverage.sectionsWithBookCitedQuestions,2);
  assert.equal(coverage.guideEntries,21);
  assert.equal(coverage.glossaryTerms,31);
  assert.equal(Object.values(coverage.practiceByField).reduce((a,b)=>a+b,0),39);
  assert.equal(coverage.chapters.reduce((a,b)=>a+b.sectionCount,0),76);
  assert.equal(coverage.chapters.reduce((a,b)=>a+b.citedPracticeQuestions,0),7);
});
test('coverage never assigns public Japanese-translation progress from an unexamined manifest',async()=>{
  const [book,questions,glossary]=await Promise.all(['data/book.json','data/questions.json','data/glossary.json'].map(read));
  const input={book,questions,glossary,guides:GUIDE_SECTIONS};
  assert.equal(learningCoverage({...input,contentManifest:{files:[]}}).publicJapaneseSections,0);
  assert.equal(learningCoverage({...input,contentManifest:{files:['data/sections/pending.json']}}).publicJapaneseSections,null);
});
