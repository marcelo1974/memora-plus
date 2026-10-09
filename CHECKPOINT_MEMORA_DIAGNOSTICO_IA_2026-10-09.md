# Diagnóstico IA — complemento de 09/10/2026

Render reportou AI_SERVICE em 34633 ms. O HTTP 502 era local e não identifica a causa original. Este complemento registra errorName, upstreamStatus, causeName, causeCode e category com listas permitidas, sem mensagens brutas, documentos, chaves ou tokens. Falhas de rede ganham AI_NETWORK. Mantém prazo SDK de 60 segundos e validação de respostas. Não altera dados, dependências ou Fase 4D.

npm run verify passou: TypeScript, lint, 51 testes, build e smoke HTTP. Gemini real e causa da interrupção ainda pendentes. Este pacote é diagnóstico e não comprova resolver a geração. Aplicar quatro arquivos preservando server/ e tests/.
