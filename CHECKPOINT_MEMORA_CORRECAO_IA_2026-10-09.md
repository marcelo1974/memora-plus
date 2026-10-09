# MEMORA+ — correção e diagnóstico da IA — 09/10/2026

Evidência: geração a partir de texto falhou no Render com DOMException AbortError; usuário estimou 18 segundos. Não há evidência suficiente para afirmar que o timeout de 30 segundos era a causa.

Alterações: prazo SDK de 30 para 60 segundos; classificação segura das falhas nas três rotas de IA; HTTP 504 para interrupções, 429 para quota, 502 para acesso/modelo/serviço/resposta inválida. Logs incluem rota, código, duração em milissegundos e status, sem texto de estudo, token, chave nem payload bruto. A validação das questões e resumos continua obrigatória. Não há repetição automática de chamadas.

Validação local: npm run verify passou (TypeScript, lint, 50 testes, build/PWA e smoke HTTP). Aviso de chunk grande permanece. Teste com Gemini real no Render continua pendente; este pacote não garante resolver interrupções externas ao servidor.

Aplicar os cinco arquivos na raiz do repositório, preservando as subpastas server/ e tests/. Não altera dependências, banco, dados, autenticação ou Fase 4D. O ZIP original baseline permanece intacto.
