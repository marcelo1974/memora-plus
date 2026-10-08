import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPdfPages, splitStudyPages } from '../src/services/pdfStudyText';
import { validateStudyQuestions, validateStudySummary } from '../server/studyOutput';

test('PDF page selection validates bounds, range, duplicates and maximum', () => {
  assert.deepEqual(selectPdfPages('3, 1-3, 5', 10), [1, 2, 3, 5]);
  for (const input of ['', '0', '5-1', '21', '1-11', '1,2,3,4,5,6,7,8,9,10,11', 'a', '1.5']) assert.throws(() => selectPdfPages(input, 20));
});
test('PDF chunks retain source pages and all text without truncation', () => {
  const original = 'texto '.repeat(2200).trim();
  const chunks = splitStudyPages([{ page: 2, text: original }, { page: 4, text: 'Outro trecho com informação importante.' }]);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every(chunk => chunk.text.length <= 6000));
  assert.equal(chunks.map(chunk => chunk.text).join(' '), original + ' Outro trecho com informação importante.');
  assert.ok(chunks[0].pages.includes(2));
  assert.ok(chunks.at(-1)?.pages.includes(4));
  const shortTail = splitStudyPages([{ page: 1, text: 'x'.repeat(6001) }]);
  assert.ok(shortTail.every(chunk => chunk.text.length >= 20 && chunk.text.length <= 6000));
});
test('PDF chunks reject empty scans and oversized selection, preserve paragraphs as text', () => {
  assert.throws(() => splitStudyPages([{ page: 1, text: '' }]), /OCR/);
  assert.throws(() => splitStudyPages([{ page: 1, text: 'x'.repeat(18001) }]), /18.000/);
  assert.equal(splitStudyPages([{ page: 1, text: 'Um texto\n com   informação suficiente.' }])[0].text, 'Um texto com informação suficiente.');
});
test('Generated questions reject wrong count, empty options and invalid answer', () => {
  const question = { question: 'Pergunta', optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd', explanation: 'Explicação', correctOption: 'B' };
  assert.equal(validateStudyQuestions([question], 1)[0].correctOption, 'B');
  assert.throws(() => validateStudyQuestions([question], 3));
  assert.throws(() => validateStudyQuestions([{ ...question, correctOption: 'Z' }], 1));
  assert.throws(() => validateStudyQuestions([{ ...question, optionC: '' }], 1));
});
test('Summary requires actual source quotations and bounded structured fields', () => {
  const source = 'O estudo constante contribui para a aprendizagem.';
  const summary = { title: 'Estudo', summary: 'A constância auxilia na aprendizagem.', keyPoints: ['Estudar continuamente'], excerpts: ['O estudo constante'] };
  assert.equal(validateStudySummary(summary, source).excerpts[0], 'O estudo constante');
  assert.throws(() => validateStudySummary({ ...summary, excerpts: ['Uma frase inventada'] }, source));
  assert.throws(() => validateStudySummary({ ...summary, keyPoints: [] }, source));
  assert.throws(() => validateStudySummary({ ...summary, summary: 'x'.repeat(8001) }, source));
});
