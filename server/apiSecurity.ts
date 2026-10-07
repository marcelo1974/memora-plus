import type { RequestHandler } from 'express';

export class AuthFailure extends Error {
  constructor(public status: number) { super('Authentication unavailable or invalid'); }
}

// Google validates the actual ID token; decoding below only checks the target project.
export async function verifyFirebaseToken(token: string, apiKey: string, projectId: string, fetcher: typeof fetch = fetch): Promise<string> {
  let claims: { aud?: unknown; iss?: unknown };
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); }
  catch { throw new AuthFailure(401); }
  if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthFailure(401);
  let response: Response;
  try {
    response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(8000),
    });
  } catch { throw new AuthFailure(503); }
  if (!response.ok) throw new AuthFailure(response.status === 400 || response.status === 401 ? 401 : 503);
  let data: { users?: Array<{ localId?: unknown; disabled?: boolean }> };
  try { data = await response.json(); } catch { throw new AuthFailure(503); }
  const user = data.users?.[0];
  if (!user || user.disabled || typeof user.localId !== 'string' || !user.localId) throw new AuthFailure(401);
  return user.localId;
}

export function createAiSecurity(verify: (token: string) => Promise<string>, now = Date.now): RequestHandler {
  let authWindow = 0, authCount = 0;
  let generationWindow = 0, generationCount = 0, active = 0;
  const users = new Map<string, { window: number; count: number; active: number }>();
  return async (req, res, next) => {
    const token = /^Bearer ([^\s]{1,8192})$/.exec(req.get('Authorization') || '')?.[1];
    if (!token) { res.status(401).json({ error: 'Entre com sua conta para utilizar a geração por IA.' }); return; }
    const minute = Math.floor(now() / 60000);
    if (authWindow !== minute) { authWindow = minute; authCount = 0; }
    if (++authCount > 60) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto.' }); return; }
    let uid: string;
    try { uid = await verify(token); }
    catch (error) {
      const status = error instanceof AuthFailure ? error.status : 503;
      res.status(status).json({ error: status === 401 ? 'Sessão inválida. Entre novamente.' : 'Não foi possível validar sua sessão. Tente novamente mais tarde.' }); return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) { res.status(400).json({ error: 'Dados inválidos.' }); return; }
    const count = body.count ?? (req.path.endsWith('text-to-questions') ? 3 : 5);
    const shortFields = ['subject', 'topic'];
    if (!Number.isInteger(count) || count < 1 || count > 10 || shortFields.some(key => body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 200)) ||
      (body.difficulty !== undefined && !['Fácil', 'Médio', 'Difícil'].includes(body.difficulty)) ||
      (req.path.endsWith('text-to-questions') && (typeof body.text !== 'string' || body.text.trim().length < 20 || body.text.length > 8000))) {
      res.status(400).json({ error: 'Use de 1 a 10 questões, matéria e assunto com até 200 caracteres e texto entre 20 e 8.000 caracteres.' }); return;
    }
    const hour = Math.floor(now() / 3600000);
    if (generationWindow !== hour) { generationWindow = hour; generationCount = 0; }
    for (const [key, value] of users) if (value.window !== hour && value.active === 0) users.delete(key);
    let user = users.get(uid);
    if (!user) { user = { window: hour, count: 0, active: 0 }; users.set(uid, user); }
    if (user.window !== hour) { user.window = hour; user.count = 0; }
    if (user.count >= 10 || generationCount >= 30 || active >= 2 || user.active >= 1) {
      res.setHeader('Retry-After', String(user.active || active >= 2 ? 30 : 3600));
      res.status(429).json({ error: 'Limite de geração atingido ou geração em andamento. Aguarde antes de tentar novamente.' }); return;
    }
    user.count++; generationCount++; user.active++; active++;
    let released = false;
    const release = () => { if (!released) { released = true; user.active--; active--; } };
    res.locals.releaseAiSlot = release;
    res.once('finish', release);
    // A disconnected client does not free the slot while the upstream request is running.
    next();
  };
}
