// Regression tests for audit phase B-11 (round-2 own-check findings
// A2-R2-01..04: question-bank badge, reader note form labels, glossary
// toolbar overflow, quiz answer focus). Source-structure assertions pin the
// shipped markup/CSS/JS; the rendered behaviour (badge layout, label
// adjacency, 768px overflow, post-answer focus target) is verified with a
// real Chromium render in the batch log (audit2-fix-b11-log.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readText=async file=>await readFile(new URL('../'+file,import.meta.url),'utf8');
const readJson=async file=>JSON.parse(await readText(file));
const [appJs,stylesCss,questions]=await Promise.all([
  readText('app.js'),readText('styles.css'),readJson('data/questions.json')]);

// ---------- A2-R2-01: question-bank badge shows a sequential number ----------
test('A2-R2-01: bank badge renders the sequential position, not the internal id',()=>{
  assert.ok(appJs.includes('<span class="bank-item-index">${bankIndex + 1}</span>'),
    'badge must render bankIndex + 1');
  assert.equal(appJs.includes("q.id.replace('q-','')"),false,
    'the internal id must no longer be rendered as the badge text');
  assert.equal(questions.length,751,'numbering basis: badges run 1..751');
});
test('A2-R2-01: starting a question from the bank still keys off the question id',()=>{
  assert.ok(appJs.includes('data-start-question="${escapeHTML(q.id)}"'),
    'data-start-question must keep carrying the real question id');
});

// ---------- A2-R2-02: reader note form labels sit above their fields ----------
test('A2-R2-02: reader note form labels use the grid label layout',()=>{
  assert.match(stylesCss,/\.reader-personal-note \.form-two label \{ display: grid; gap: 5px; \}/,
    'labels must be grid (caption above control), like the other forms');
  assert.match(stylesCss,/\.reader-personal-note \.form-two input, \.reader-personal-note \.form-two textarea \{ width: 100%; \}/,
    'controls must stretch to the column width');
});

// ---------- A2-R2-03: glossary toolbar must not bleed past the viewport ----------
test('A2-R2-03: glossary language toolbar has zero side margins',()=>{
  assert.match(stylesCss,/\.reader-toolbar\.glossary-language-toolbar \{ margin: 0 0 18px; \}/,
    'the negative .reader-toolbar margins must not apply to the glossary toolbar');
  assert.ok(appJs.includes('class="reader-toolbar glossary-language-toolbar"'),
    'glossary toolbar keeps both classes (reader styling + the override hook)');
});

// ---------- A2-R2-04: focus moves to the answer feedback after submitting ----------
test('A2-R2-04: feedback region is a focus target and submit focuses it',()=>{
  assert.ok(appJs.includes('id="answer-feedback" tabindex="-1"'),
    'the answer feedback section must be programmatically focusable');
  const start=appJs.indexOf('function submitQuizAnswer');
  const end=appJs.indexOf('function moveToNextQuestion');
  assert.ok(start>=0&&end>start,'submitQuizAnswer must exist');
  const body=appJs.slice(start,end);
  assert.ok(body.includes("document.querySelector('#answer-feedback')?.focus({ preventScroll: true })"),
    'submitQuizAnswer must move focus to the feedback after render');
});
