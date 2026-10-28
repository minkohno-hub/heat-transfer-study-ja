import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('published practice must not reveal the correct answer through unique length or punctuation',async()=>{
  const all=JSON.parse(await readFile(new URL('../data/questions.json',import.meta.url),'utf8'));
  const questions=all.filter(q=>q.questionGroup==='original_independent_section_review_v1');
  assert.equal(questions.length,76);
  const longest=all.filter(q=>{
    const correct=q.choices[q.answer].length;
    return correct>Math.max(...q.choices.filter((_,i)=>i!==q.answer).map(choice=>choice.length));
  });
  // This is only one anti-cue heuristic, NOT a scientific approval of wording.
  assert.equal(longest.length,0,
    'Correct answer is a uniquely longest choice in '+longest.length+'/'+all.length+' questions; rewrite choices before release');
  const shortest=all.filter(q=>{
    const correct=q.choices[q.answer].length;
    return correct<Math.min(...q.choices.filter((_,i)=>i!==q.answer).map(choice=>choice.length));
  });
  assert.equal(shortest.length,0,
    'Correct answer is a uniquely shortest choice in '+shortest.length+'/'+all.length+' questions; rewrite choices before release');
  const punctuationCue=all.filter(q=>{
    const correct=/[。．.!?！？]$/.test(q.choices[q.answer]);
    return q.choices.every((choice,i)=>i===q.answer||/[。．.!?！？]$/.test(choice)!==correct);
  });
  assert.equal(punctuationCue.length,0,'Correct answer must not be the only choice with different terminal punctuation');
  assert.equal(questions.filter(q=>q.revision!=='v1').length,55);
});
