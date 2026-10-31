import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyState,validateLearningData,mergeLearningData,normalizeLearningData,questionFingerprint,quizDraftOK,quizResumeIssue,splitStudyInterval,recordStudyActivity,fieldProgress,studyDuration,DATA_FORMAT} from '../study-core.mjs';
const question={id:'q1',prompt:'保存と改訂を確認するための問題',choices:['甲','乙','丙','丁'],answer:1,revision:'r1'};
const draft=()=>({id:'run-1',ids:['q1'],index:0,startedAt:100000,updatedAt:'2026-10-20T00:00:00Z',selected:2,confidence:'unsure',hintCount:2,answers:[],signatures:{q1:questionFingerprint(question)}});
const exported=()=>({...createEmptyState(),format:DATA_FORMAT});

test('suspended quiz round-trips choice, confidence, hints, and signatures',()=>{
  const data=exported();data.quizDraft=draft();const round=JSON.parse(JSON.stringify(data));assert.equal(validateLearningData(round),'');assert.equal(quizDraftOK(round.quizDraft),true);assert.equal(quizResumeIssue(round.quizDraft,[question]),'');assert.deepEqual(normalizeLearningData(round).quizDraft,draft());
});
test('a missing or revised question cannot silently resume with a different answer',()=>{
  assert.match(quizResumeIssue(draft(),[]),/教材にありません/);assert.match(quizResumeIssue(draft(),[{...question,answer:0}]),/更新/);assert.match(quizResumeIssue(draft(),[{...question,choices:['甲','乙','丙','別']}]),/更新/);
  assert.match(quizResumeIssue(draft(),[{...question,figure:{src:'changed.png',alt:'変更された条件'}}]),/更新/);
});
test('reordered imported history is normalized before latest-answer and session decisions',()=>{
  const data=exported();data.attempts=[{questionId:'q1',correct:false,at:'2026-10-21T00:00:00Z'},{questionId:'q1',correct:true,at:'2026-10-20T00:00:00Z'}];
  data.sessions=[{id:'later',date:'2026-10-21',total:1,correct:0,startedAt:Date.parse('2026-10-21T00:00:00Z')},{id:'earlier',date:'2026-10-20',total:1,correct:1,startedAt:Date.parse('2026-10-20T00:00:00Z')}];
  const normalized=normalizeLearningData(data);assert.equal(normalized.attempts.at(-1).correct,false);assert.equal(normalized.sessions.at(-1).id,'later');
  assert.equal(mergeLearningData(exported(),data).sessions.at(-1).id,'later');assert.equal(data.sessions[0].id,'later');
});
test('restore rejects invalid suspended selections, unknown past answers, and malformed time logs',()=>{
  for(const q of [{...draft(),selected:4},{...draft(),ids:['q1','q1']},{...draft(),index:1},{...draft(),signatures:{}},{...draft(),answers:[{questionId:'other',correct:true,at:1}]}])assert.notEqual(validateLearningData({...exported(),quizDraft:q}),'');
  for(const activities of [null,[{id:'t',date:'2026-02-30',seconds:5,kind:'reading',updatedAt:1}],[{id:'t',date:'2026-10-20',seconds:-1,kind:'reading',updatedAt:1}]])assert.notEqual(validateLearningData({...exported(),activities}),'');
});
test('merge keeps the newer suspended set, combines time once, and never resurrects a completed set',()=>{
  const a=exported(),b=exported();a.quizDraft=draft();b.quizDraft={...draft(),selected:1,updatedAt:'2026-10-20T01:00:00Z'};
  a.activities=recordStudyActivity([],{kind:'reading',sectionId:'1.1'},1000,5000,'page1');b.activities=structuredClone(a.activities);
  const merged=mergeLearningData(a,b);assert.equal(merged.quizDraft.selected,1);assert.equal(merged.activities.length,1);assert.equal(merged.activities[0].seconds,4);
  b.sessions=[{id:'run-1',date:'2026-10-20',total:1,correct:1,startedAt:1}];assert.equal(mergeLearningData(a,b).quizDraft,null);
});
test('restore merges timestamps by actual time rather than the spelling of their time zones',()=>{
  const a=exported(),b=exported();
  a.mistakeNotes.q1={reason:'later',updatedAt:'2026-10-20T01:00:00Z'};b.mistakeNotes.q1={reason:'earlier',updatedAt:'2026-10-20T09:00:00+09:00'};
  a.completedReviews.q1='2026-10-20T01:00:00Z';b.completedReviews.q1='2026-10-20T09:00:00+09:00';
  const merged=mergeLearningData(a,b);assert.equal(merged.mistakeNotes.q1.reason,'later');assert.equal(merged.completedReviews.q1,a.completedReviews.q1);
});
test('learning time splits at the browser-local midnight and excludes suspended-PC gaps',()=>{
  const from=new Date(2026,9,20,23,59,58).getTime(),to=new Date(2026,9,21,0,0,3).getTime();
  assert.deepEqual(splitStudyInterval(from,to),[{date:'2026-10-20',seconds:2},{date:'2026-10-21',seconds:3}]);assert.deepEqual(splitStudyInterval(from,to+60000),[]);
  const first=recordStudyActivity([],{kind:'reading',sectionId:'1.1'},from,to,'page1');const second=recordStudyActivity(first,{kind:'reading',sectionId:'1.1'},to,to+5000,'page1');assert.equal(second.reduce((n,a)=>n+a.seconds,0),10);assert.equal(first.reduce((n,a)=>n+a.seconds,0),5);
});
test('repeating a single question cannot make a whole field look mastered',()=>{
  const qs=Array.from({length:4},(_,i)=>({...question,id:`q${i}`})),rows=Array.from({length:8},(_,i)=>({questionId:'q0',correct:true,questionRevision:'r1',at:new Date(i*1000).toISOString()}));
  assert.deepEqual(fieldProgress(qs,rows),{answered:1,correct:1,enough:false,ratio:1,total:4,outdated:0});
  rows.push({questionId:'q1',correct:false,questionRevision:'r1',at:new Date(9000).toISOString()},{questionId:'q2',correct:true,questionRevision:'r1',at:new Date(9000).toISOString()});assert.equal(fieldProgress(qs,rows).enough,true);assert.equal(fieldProgress(qs,rows).ratio,2/3);
});
test('duration labels preserve short sessions rather than rounding them to zero minutes',()=>{
  assert.equal(studyDuration(45),'45秒');assert.equal(studyDuration(65),'1分5秒');assert.equal(studyDuration(120),'2分');
  assert.equal(studyDuration(Infinity),'0秒');
  assert.notEqual(validateLearningData({...exported(),sessions:[{date:'2026-10-20',total:1,correct:1,startedAt:1,activeSeconds:-1}]}),'');
});
