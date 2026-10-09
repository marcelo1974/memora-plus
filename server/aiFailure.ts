export function classifyAiFailure(error: unknown) {
  const item = error as { name?: string; status?: number; code?: unknown; cause?: { name?: string } } | null;
  if (item?.name === 'AbortError' || item?.name === 'TimeoutError' || item?.cause?.name === 'AbortError') return { status: 504, code: 'AI_INTERRUPTED', error: 'A chamada à IA foi interrompida ou excedeu o prazo. Aguarde um momento e tente um trecho menor.' };
  if (item?.status === 429) return { status: 429, code: 'AI_QUOTA', error: 'O serviço de IA atingiu o limite de uso. Aguarde antes de tentar novamente.' };
  if (item?.status === 401 || item?.status === 403) return { status: 502, code: 'AI_ACCESS', error: 'O serviço de IA recusou o acesso. Verifique a chave e as permissões do servidor.' };
  if (item?.status === 404) return { status: 502, code: 'AI_MODEL', error: 'O modelo de IA não está disponível para esta configuração do servidor.' };
  if (item?.name === 'SyntaxError' || item?.name === 'StudyOutputError') return { status: 502, code: 'AI_INVALID_OUTPUT', error: 'A IA devolveu uma resposta incompleta ou incompatível com o texto. Nenhum resultado inválido foi salvo.' };
  return { status: 502, code: 'AI_SERVICE', error: 'O serviço de IA falhou. Consulte o código de diagnóstico nos logs do servidor.' };
}
