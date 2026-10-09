export function classifyAiFailure(error: unknown) {
  const item = error as { name?: string; status?: number; code?: unknown; cause?: { name?: string } } | null;
  if (aiFailureDiagnostics(error).category === 'NETWORK') return { status: 502, code: 'AI_NETWORK', error: 'O servidor não conseguiu concluir a conexão com a IA. Consulte o diagnóstico de rede nos logs.' };
  if (item?.name === 'AbortError' || item?.name === 'TimeoutError' || item?.cause?.name === 'AbortError') return { status: 504, code: 'AI_INTERRUPTED', error: 'A chamada à IA foi interrompida ou excedeu o prazo. Aguarde um momento e tente um trecho menor.' };
  if (item?.status === 429) return { status: 429, code: 'AI_QUOTA', error: 'O serviço de IA atingiu o limite de uso. Aguarde antes de tentar novamente.' };
  if (item?.status === 401 || item?.status === 403) return { status: 502, code: 'AI_ACCESS', error: 'O serviço de IA recusou o acesso. Verifique a chave e as permissões do servidor.' };
  if (item?.status === 404) return { status: 502, code: 'AI_MODEL', error: 'O modelo de IA não está disponível para esta configuração do servidor.' };
  if (item?.name === 'SyntaxError' || item?.name === 'StudyOutputError') return { status: 502, code: 'AI_INVALID_OUTPUT', error: 'A IA devolveu uma resposta incompleta ou incompatível com o texto. Nenhum resultado inválido foi salvo.' };
  return { status: 502, code: 'AI_SERVICE', error: 'O serviço de IA falhou. Consulte o código de diagnóstico nos logs do servidor.' };
}

// Only fixed labels and numeric status codes may reach logs; never raw messages.
export function aiFailureDiagnostics(error: unknown) {
  const item = error as { name?: unknown; status?: unknown; code?: unknown; message?: unknown; cause?: { name?: unknown; code?: unknown } } | null;
  const names = ['Error', 'TypeError', 'ApiError', 'AbortError', 'TimeoutError', 'SyntaxError', 'StudyOutputError'];
  const codes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'];
  const message = typeof item?.message === 'string' ? item.message.toLowerCase() : '';
  const causeCode = codes.includes(String(item?.cause?.code)) ? String(item?.cause?.code) : codes.includes(String(item?.code)) ? String(item?.code) : 'UNKNOWN';
  return {
    errorName: names.includes(String(item?.name)) ? String(item?.name) : 'UNKNOWN',
    upstreamStatus: typeof item?.status === 'number' && Number.isInteger(item.status) && item.status >= 100 && item.status <= 599 ? item.status : null,
    causeName: names.includes(String(item?.cause?.name)) ? String(item?.cause?.name) : 'UNKNOWN',
    causeCode,
    category: causeCode !== 'UNKNOWN' || message.includes('fetch failed') ? 'NETWORK' : message.includes('timeout') || message.includes('timed out') ? 'TIMEOUT' : message.includes('aborted') ? 'INTERRUPTED' : 'UNCLASSIFIED',
  };
}
