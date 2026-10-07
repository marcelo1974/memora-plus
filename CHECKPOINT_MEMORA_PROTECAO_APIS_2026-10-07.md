# CHECKPOINT MEMORA+ — PROTEÇÃO DAS APIs — 2026-10-07

Base: checkpoint de proteção de contas de 2026-10-06, publicado pelo usuário no commit 0a8b58f. Revisão local; sem consulta ou alteração administrativa ao Render.

## Confirmação manual do usuário
Em 2026-10-07, a escolha da segunda conta Google exibiu “Conta incompatível com os dados locais”. Ao voltar à conta original, o usuário confirmou 12 respostas. Isso confirma o bloqueio de troca neste cenário; não constitui isolamento completo dos dados em perfis compartilhados ou teste de todas as contas.

## Alterações
- Rotas de IA exigem Authorization Bearer com ID token Firebase. O servidor verifica projeto/issuer e consulta accounts:lookup do Firebase para validar o token real. Decodificar o token não concede autorização. Falha de rede ou da validação bloqueia o acesso; timeout de 8 segundos. Não há nova chave privada, SDK Admin ou dependência.
- Cliente envia o token atualizado pelo SDK; verifica a conta vinculada ao armazenamento antes de solicitar IA. Se ainda não houver vínculo, sincronizar primeiro em Configurações.
- Até 10 questões por chamada; campos matéria/assunto até 200 caracteres; texto entre 20 e 8.000 caracteres. Corpo JSON até 64 KiB.
- Limites por instância: 60 tentativas de autenticação por minuto, 10 gerações por usuário/hora, 30 totais/hora, uma geração simultânea por usuário e duas totais. Janelas fixas, não móveis. Pedidos aceitos consomem limite mesmo quando a geração falha. Timeout Gemini de 30 segundos.
- Endpoint de upload global retorna 403 antes de interpretar o corpo e não grava arquivos. Upload personalizado da interface permanece nas configurações do usuário e não altera a marca global.
- Erros de IA não devolvem detalhes internos do SDK ao cliente.

## Validação
npm run verify: sucesso; TypeScript, lint, 43 testes (zero falhas), build e HTTP smoke. O teste HTTP foi ampliado e repetido com sucesso: oito verificações incluindo ambas as rotas sem login e bloqueio de upload.
Novos testes usam respostas Firebase simuladas para rejeição, indisponibilidade, projeto diferente e conta desabilitada; middleware é exercitado por HTTP real para validação, limites, concorrência e recuperação.
Não foram enviados pedidos ao Gemini nem tokens reais ao Firebase. Não foi feita nova instalação de dependências; foram reutilizadas as dependências locais. Avisos existentes: chunk JS acima de 500 KiB e configuração npm http-proxy do ambiente. PWA: 24 entradas, 7323,53 KiB.

## Limitações e pendências
- Limites em RAM reiniciam com o servidor e não são compartilhados entre instâncias. Não garantem teto financeiro; configurar orçamento/quotas do provedor separadamente. Um controle distribuído poderá substituir esta etapa posteriormente.
- Qualquer conta válida do projeto pode usar IA dentro dos limites; não existe autorização de assinantes ou allowlist de usuários.
- Validação depende de acesso HTTPS do servidor ao Firebase. Restrições da chave Web (por exemplo, restrição a referers) podem impedir consulta pelo servidor: nesse caso o acesso falha fechado, e deve-se diagnosticar sem remover restrições indiscriminadamente.
- Verificar geração real no Render após atualização: login original, armazenamento vinculado e GEMINI_API_KEY configurada. Validar modelo disponível e retorno de geração; não foi possível confirmar no ambiente real.
- A marca oficial continua nos arquivos versionados. Arquivos personalizados só são persistidos como configurações do usuário; não são gravados globalmente no servidor.
- Fonte/IndexedDB/baseline original não foram alterados por esta etapa. Fase 4D permanece pausada.

## Publicação manual
Enviar os arquivos deste pacote na raiz do GitHub, preservando caminhos: server.ts, pasta server/, src/components/ai/AiGeneratorView.tsx, src/components/settings/SettingsView.tsx, tests/api-security.test.ts, tests/server-smoke.mjs e este checkpoint. Não excluir pastas existentes. Revisar caminhos e criar um commit. Aguardar Render Live. Nenhuma publicação automática foi realizada aqui.

Referência oficial: https://firebase.google.com/docs/reference/rest/auth#section-get-account-info
