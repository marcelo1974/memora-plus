import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAiFailure, aiFailureDiagnostics } from '../server/aiFailure';
import { StudyOutputError } from '../server/studyOutput';
test('AI failures distinguish interrupted calls, quota, access and invalid output', () => {
  assert.equal(classifyAiFailure(new DOMException('private payload', 'AbortError')).code, 'AI_INTERRUPTED');
  assert.equal(classifyAiFailure({ status: 429 }).code, 'AI_QUOTA');
  assert.equal(classifyAiFailure({ status: 403 }).code, 'AI_ACCESS');
  assert.equal(classifyAiFailure({ status: 404 }).code, 'AI_MODEL');
  assert.equal(classifyAiFailure(new SyntaxError()).code, 'AI_INVALID_OUTPUT');
  assert.equal(classifyAiFailure(new StudyOutputError('invalid')).code, 'AI_INVALID_OUTPUT');
});
test('AI failure responses never echo provider payload or credentials', () => {
  const result = classifyAiFailure({ message: 'secret-key and document', status: 500 });
  assert.equal(result.code, 'AI_SERVICE');
  assert.ok(!JSON.stringify(result).includes('secret-key'));
});

test('network diagnostics retain only allowlisted labels and numeric upstream status', () => {
  const err = { name: 'TypeError', message: 'fetch failed secret-key text', cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } };
  assert.equal(classifyAiFailure(err).code, 'AI_NETWORK');
  assert.equal(aiFailureDiagnostics(err).causeCode, 'UND_ERR_CONNECT_TIMEOUT');
  assert.equal(aiFailureDiagnostics({status: 503}).upstreamStatus, 503);
  assert.ok(!JSON.stringify(aiFailureDiagnostics(err)).includes('secret-key'));
  assert.ok(!JSON.stringify(aiFailureDiagnostics({name: 'secret-key', cause: {code: 'private text'}})).includes('private text'));
});
