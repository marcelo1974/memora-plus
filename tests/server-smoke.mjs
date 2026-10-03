import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 4300 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, ['--import', './scripts/production-env.mjs', 'dist/server.cjs'], {
  env: { ...process.env, PORT: String(port), GEMINI_API_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const exited = once(child, 'exit');
let startupTimer;
try {
  await new Promise((resolve, reject) => {
    startupTimer = setTimeout(() => reject(new Error('Servidor não iniciou em 15 segundos.')), 15000);
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error('Servidor encerrou antes dos testes: ' + code)));
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Server running')) { clearTimeout(startupTimer); resolve(); }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  });
  const base = 'http://127.0.0.1:' + port;
  for (const [path, status, contentType] of [
    ['/api/health', 200, 'application/json'], ['/', 200, 'text/html'],
    ['/manifest.webmanifest', 200, 'application/manifest+json'], ['/sw.js', 200, 'application/javascript'],
    ['/assets/missing.js', 404, 'text/plain'],
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, status, path);
    assert.ok(response.headers.get('content-type')?.includes(contentType), path);
    console.log('PASS', path, response.status, response.headers.get('content-type'));
  }
  const response = await fetch(base + '/api/ai/generate-questions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: 'Matemática' }),
  });
  assert.equal(response.status, 503);
  console.log('PASS IA sem chave: 503');
} finally {
  clearTimeout(startupTimer);
  child.kill();
  await exited;
}
