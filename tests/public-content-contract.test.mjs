import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDE_SECTIONS} from '../guide.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const fixtures=async()=>{
  const [book,questions,glossary]=await Promise.all([
    read('data/book.json'),read('data/questions.json'),read('data/glossary.json')
  ]);
  // Match exactly the pre-publish sanitizer, not the local private source structures.
  for(const chapter of book.chapters)for(const section of chapter.sections){
    if(section.translationStatus==='translated')section.translationStatus='private_only';
    delete section.blocks;delete section.blocksEn;delete section.figures;delete section.sourceReview;
  }
  for(const question of questions)if(question.figure?.kind==='book')delete question.figure.src;
  return {book,questions,glossary,guides:structuredClone(GUIDE_SECTIONS)};
};
const find=errors=>errors.join(' / ');
test('public contract accepts actual sanitized teaching content',async()=>{
  assert.deepEqual(checkPublicContent(await fixtures()),[]);
});
test('public build rejects broken answer keys, duplicate IDs and orphaned guide references',async()=>{
  const baseline=await fixtures();
  const a=structuredClone(baseline);
  a.questions[0].answer=7;
  assert.match(find(checkPublicContent(a)),/形式/);
  const b=structuredClone(baseline);
  b.questions[1].id=b.questions[0].id;
  assert.match(find(checkPublicContent(b)),/重複/);
  const c=structuredClone(baseline);
  c.questions.find(q=>q.source.type==='supplement').source.guideId='missing-guide';
  assert.match(find(checkPublicContent(c)),/存在しないガイド/);
});
test('public build rejects glossary links with missing practice or lesson targets',async()=>{
  const a=await fixtures();
  a.glossary[0].relatedQuestions=[{id:'missing-question',label:'不明な問題'}];
  assert.match(find(checkPublicContent(a)),/関連問題へのリンク/);
  const b=await fixtures();
  b.glossary.find(t=>t.source.type==='supplement').source.guideId='missing-guide';
  assert.match(find(checkPublicContent(b)),/補足の参照ガイド/);
  const c=await fixtures();
  c.guides.push({...c.guides[0]});
  assert.match(find(checkPublicContent(c)),/ガイドIDが重複/);
});
test('public build rejects incorrect book-page mapping and accidentally exported paragraph or figure data',async()=>{
  const a=await fixtures();
  a.questions.find(q=>q.source.type==='book').source.pdfPages='999';
  assert.match(find(checkPublicContent(a)),/ページ対応/);
  const b=await fixtures();
  b.book.chapters[0].sections[0].blocks=[{type:'paragraph',text:'should not ship'}];
  assert.match(find(checkPublicContent(b)),/非配布の節データ/);
  const c=await fixtures();
  c.questions.find(q=>q.figure?.kind==='book').figure.src='./data/figures/figure.png';
  assert.match(find(checkPublicContent(c)),/原図の単独ファイル/);
});

test('public contract rejects mismatched chapter metadata for guides and independently authored practice',async()=>{
  const a=await fixtures();
  a.guides.find(g=>g.id==='chapter2-cylindrical-conduction').relatedSectionIds=['1.1'];
  assert.match(find(checkPublicContent(a)),/章別独立講座の章ID・関連節/);
  const b=await fixtures();
  b.questions.find(q=>q.id==='supp-chapter-ch2-series').source.chapterId='ch11';
  assert.match(find(checkPublicContent(b)),/章別問題の章ID/);
  const c=await fixtures();
  c.guides.find(g=>g.id==='chapter3-effectiveness-ntu').bookChapter='unknown';
  assert.match(find(checkPublicContent(c)),/章別独立講座の章ID・関連節/);
});

test('public contract rejects malformed revision markers that would corrupt retest status',async()=>{
  const a=await fixtures();
  a.questions[0].revision={version:2};
  assert.match(find(checkPublicContent(a)),/問題改訂番号の形式/);
  const b=await fixtures();
  b.questions[0].revision='  ';
  assert.match(find(checkPublicContent(b)),/問題改訂番号の形式/);
  const c=await fixtures();
  c.questions[0].revision='v2-heatflow';
  assert.deepEqual(checkPublicContent(c),[]);
});
