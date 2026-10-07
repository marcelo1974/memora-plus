import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { AuthFailure, createAiSecurity, verifyFirebaseToken } from '../server/apiSecurity';

const token = 'header.' + Buffer.from(JSON.stringify({ aud: 'project', iss: 'https://securetoken.google.com/project' })).toString('base64url') + '.signature';
test('Firebase validates tokens remotely, rejects project mismatch and disabled accounts', async () => {
  let calls = 0;
  const good = (async (_url, options) => { calls++; assert.equal(JSON.parse(String(options?.body)).idToken, token); return Response.json({ users: [{ localId: 'uid' }] }); }) as typeof fetch;
  assert.equal(await verifyFirebaseToken(token, 'key', 'project', good), 'uid');
  await assert.rejects(verifyFirebaseToken(token, 'key', 'other', good), { status: 401 });
  assert.equal(calls, 1);
  await assert.rejects(verifyFirebaseToken(token, 'key', 'project', (async () => Response.json({ users: [{ localId: 'uid', disabled: true }] })) as typeof fetch), { status: 401 });
});
test('Firebase rejection and outage fail closed', async () => {
  await assert.rejects(verifyFirebaseToken(token, 'key', 'project', (async () => new Response('', { status: 400 })) as typeof fetch), { status: 401 });
  await assert.rejects(verifyFirebaseToken(token, 'key', 'project', (async () => { throw Error('offline'); }) as typeof fetch), { status: 503 });
  await assert.rejects(verifyFirebaseToken('garbage', 'key', 'project'), { status: 401 });
});

test('HTTP authentication, validation, hourly limits, concurrency and recovery', async () => {
  let clock = 3600000;
  let calls = 0;
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/ai', createAiSecurity(async value => {
    calls++;
    if (value === 'bad') throw new AuthFailure(401);
    if (value === 'offline') throw new AuthFailure(503);
    return value;
  }, () => clock));
  let release: (() => void) | undefined;
  app.post('/api/ai/generate-questions', async (req, res) => {
    if (req.body.topic === 'hold') await new Promise<void>(resolve => { release = resolve; });
    res.json({ success: true });
  });
  app.post('/api/ai/text-to-questions', (_req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const post = (uid?: string, body: unknown = {}, route = 'generate-questions') => fetch(`http://127.0.0.1:${address.port}/api/ai/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${uid}` } : {}) }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await post()).status, 401); assert.equal(calls, 0);
    assert.equal((await post('bad')).status, 401);
    assert.equal((await post('offline')).status, 503);
    for (const count of [0, 11, 1.5, '5']) assert.equal((await post('u', { count })).status, 400);
    assert.equal((await post('u', { subject: 'a'.repeat(201) })).status, 400);
    assert.equal((await post('u', { text: 'a'.repeat(8001) }, 'text-to-questions')).status, 400);
    assert.equal((await post('u', { text: 'a'.repeat(20) }, 'text-to-questions')).status, 200);
    for (let i = 0; i < 9; i++) assert.equal((await post('u')).status, 200);
    assert.equal((await post('u')).status, 429);
    clock += 3600000;
    assert.equal((await post('u')).status, 200);
    const held = post('held', { topic: 'hold' });
    while (!release) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal((await post('held')).status, 429);
    release(); assert.equal((await held).status, 200);
    assert.equal((await post('held')).status, 200);
    for (let i = 0; i < 27; i++) assert.equal((await post('other' + i)).status, 200);
    assert.equal((await post('limit')).status, 429);
  } finally { release?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
