# MEMORA+ — ajuste de latência da IA — 09/10/2026

Evidência real do Render: generate-questions, ApiError, upstreamStatus 504, 59314 ms. Não é prova de chave inválida ou de falha na extração de PDF.

Mantém gemini-3.8-flash e a mesma chave. Nas três funções, usa thinkingConfig.thinkingLevel LOW (suportado oficialmente), com explicações até 120 palavras e resumo até 400 palavras solicitados no prompt. Não corta o texto de origem nem reduz a quantidade de questões. Esses limites de extensão são instruções, não garantias rígidas. Mantém os validadores, prazo SDK de 60 segundos, autenticação e limites de uso. HTTP 504 externo agora tem código AI_UPSTREAM_TIMEOUT. Não faz novas tentativas automáticas.

Fontes: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash e https://ai.google.dev/gemini-api/docs/generate-content/thinking (consultadas em 09/10/2026). Nível LOW reduz latência esperada; não há evidência de que o nível padrão causou o erro. Indisponibilidade externa pode persistir.

npm run verify passou: TypeScript, lint, 52 testes, build/PWA e smoke HTTP. Aviso de chunk grande permanece. Teste real no Render pendente. Não modifica dependências, dados, armazenamento, baseline ou Fase 4D.

Enviar os quatro arquivos na raiz do GitHub preservando as pastas server/ e tests/. Após Live, testar uma geração de três questões de assunto simples, depois PDF e resumo. Não repetir automaticamente se falhar; consultar o bloco de diagnóstico.
