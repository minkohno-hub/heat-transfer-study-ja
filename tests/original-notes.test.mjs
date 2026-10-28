import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateOriginalNotes,independentNoteForSection} from '../original-notes.mjs';
import {checkPublicContent} from '../public-content-contract.mjs';
import {GUIDE_SECTIONS} from '../guide.mjs';

const read=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));

test('the 76 original Japanese notes cover every section exactly once, without claiming translation or expert review',async()=>{
  const [book,notes]=await Promise.all([read('data/book.json'),read('data/original-notes.json')]);
  assert.deepEqual(validateOriginalNotes(book,notes),[]);
  assert.equal(notes.sectionCount,76);
  assert.equal(notes.notes.length,76);
  assert.equal(book.chapters.length,11);
  assert.equal(new Set(notes.notes.map(n=>n.sectionId)).size,76);
  assert.ok(notes.coveragePolicy.includes('逐文'));
  assert.ok(notes.copyrightNotice.includes('翻訳'));
  for(const chapter of book.chapters){
    const selected=notes.notes.filter(n=>n.chapterId===chapter.id);
    assert.equal(selected.length,chapter.sections.length,chapter.id);
    assert.equal(selected[0].sectionId,chapter.sections[0].id);
  }
  for(const n of notes.notes){
    assert.equal(independentNoteForSection(notes,n.sectionId),n);
    assert.ok(n.explanation.length>=90,n.sectionId);
    assert.ok(n.relation.length>=35,n.sectionId);
    assert.ok(n.example.length>=45,n.sectionId);
    assert.ok(n.limits.length>=35,n.sectionId);
    assert.equal(n.expertReviewed,false);
    assert.equal(n.sourceType,'original_independent_japanese_notes');
  }
  assert.equal(independentNoteForSection(notes,'99.1'),null);
});

test('validator rejects omitted chapters, mistaken page numbers, falsely expert-reviewed or book-text fields',async()=>{
  const [book,original]=await Promise.all([read('data/book.json'),read('data/original-notes.json')]);
  const damaged=structuredClone(original);
  damaged.notes.pop();
  assert.ok(validateOriginalNotes(book,damaged).some(e=>e.includes('76節')));
  const page=structuredClone(original);
  page.notes[0].pdfStart=page.notes[0].pdfStart+1;
  assert.ok(validateOriginalNotes(book,page).some(e=>e.includes('目次の節')));
  const label=structuredClone(original);
  label.notes[1].expertReviewed=true;
  assert.ok(validateOriginalNotes(book,label).some(e=>e.includes('校閲前')));
  const bookExcerpt=structuredClone(original);
  bookExcerpt.notes[0].blocks=[{text:'invalid copy'}];
  assert.ok(validateOriginalNotes(book,bookExcerpt).some(e=>e.includes('非配布項目')));
});

test('public-content validator rejects missing original notes when they are required',async()=>{
  const [book,questions,glossary,originalNotes]=await Promise.all([
    'data/book.json','data/questions.json','data/glossary.json','data/original-notes.json'
  ].map(read));
  for(const ch of book.chapters)for(const section of ch.sections){if(section.translationStatus==='translated')section.translationStatus='private_only';delete section.blocks;delete section.blocksEn;delete section.figures;delete section.sourceReview;}
  for(const q of questions)if(q.figure?.kind==='book')delete q.figure.src;
  const valid=checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS,originalNotes});
  assert.deepEqual(valid,[]);
  const missing=structuredClone(originalNotes);
  missing.notes.splice(12,1);
  assert.ok(checkPublicContent({book,questions,glossary,guides:GUIDE_SECTIONS,originalNotes:missing}).some(x=>x.includes('76節')));
});
