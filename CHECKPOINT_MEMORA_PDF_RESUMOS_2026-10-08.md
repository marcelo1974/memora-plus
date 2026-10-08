# CHECKPOINT MEMORA+ — PDF E RESUMOS — 2026-10-08

## Base e limites de escopo
Continuidade da proteção das APIs publicada no commit d80c69b, com confirmação do usuário de geração por assunto e texto e bloqueio de geração sem login. O Render ficou Live após configuração de GEMINI_API_KEY em 2026-10-08. A chave não foi recebida ou utilizada neste ambiente. Fase 4D permanece pausada. Baseline original não foi alterado.

## Recursos implementados
- Nova aba “PDF e resumos” dentro de IA Memora+.
- PDF.js 6.4.299 com versão fixa no package.json e package-lock.json. Worker local carregado em módulo separado; fontes padrão copiadas pelo script de build/desenvolvimento. Sem CDN para leitura do PDF.
- Arquivos PDF de até 20 MB e 500 páginas; assinatura verificada antes da abertura. PDFs com senha mostram orientação de desbloqueio, sem tentar quebrar senha.
- Seleção de páginas como 1-3, 5, com até 10 páginas por leitura. Numeração corresponde às páginas físicas do arquivo, não necessariamente aos números impressos na apostila.
- Extração e prévia no navegador. Limite explícito de 18.000 caracteres extraídos por seleção. Seleções maiores são rejeitadas, sem truncamento silencioso ou envio parcial automático.
- Divisão em blocos de até 6.000 caracteres com referências às páginas. Cada bloco gera uma chamada; usuário visualiza quantidade antes de solicitar. Geração sequencial, progresso e cancelamento.
- Questões por bloco: 3, 5 ou 10. Prévia com alternativas, gabarito, explicação e origem do PDF. Seleção individual ou de todas antes de adicionar ao banco existente. Confirmação de persistência aguarda flushWrites(). Origem usa campos origin/observation existentes, sem mudança de schema ou stores.
- Resumos por bloco com título, parágrafos, pontos-chave e até três trechos literais verificados como presentes no material enviado. Não equivale a resumo integrado de um livro inteiro.
- Download dos resumos em Markdown (.md), incluindo arquivo e páginas de origem, para guardar offline. A biblioteca persistente de resumos no aplicativo ainda não existe; é necessário baixar antes de sair da tela.
- PDFs ou páginas sem texto mostram aviso de OCR pendente. Em seleção mista, as páginas vazias são explicitamente indicadas e excluídas.
- Nova rota /api/ai/summarize-text usa autenticação Firebase, limites de corpo/texto e orçamento de chamadas já existentes. Não aceita PDF binário no servidor; recebe apenas trecho de texto sob ação explícita.
- Questões retornadas por todas as rotas são validadas quanto a quantidade, alternativas não vazias e gabarito A-D. Resumos têm formato e tamanho validados, com rejeição de citações inventadas.
- Worker .mjs e fontes .ttf/.pfb entram no precache da PWA. Marca, abertura animada, histórico e migração não foram modificados.

## Evidências de validação
npm install --save-exact pdfjs-dist@6.4.299 --ignore-scripts --no-audit --no-fund executado com sucesso em cópia isolada. npm run verify passou: TypeScript, lint, 48 testes (zero falhas), build e nove verificações HTTP de produção, incluindo resumo sem login 401. PWA: 40 entradas, aproximadamente 9748,85 KiB.
Avisos de dependências na instalação: node-domexception/glob/eslint deprecated. Não foram atualizados pacotes alheios ao recurso. Aviso de chunk principal maior que 500 KiB e configuração npm http-proxy do ambiente permanecem.

Chromium 153 real, desktop e Pixel 7 emulado: leitura de PDF de duas páginas, prévia, geração simulada com verificação de cabeçalho Bearer, gravação no IndexedDB nativo de três questões com origem, download do resumo e aviso em PDF sem texto. Sem overflow horizontal ou exceções de página. Testes de UI usam conta e respostas sintéticas em harness de desenvolvimento exclusivo de teste (não incluído no pacote). Um aviso Firebase durante o mock refere-se ao objeto sintético, não a uma sessão Google real.

Build de produção: navegação até a aba, extração de PDF real, presença de worker e fontes no cache, recarga offline e nova extração local sem rede confirmadas. Pedido de geração sem conta foi bloqueado. Não representa modo avião em Android físico.

Os testes não gastaram quota Gemini. A nova geração real de resumos precisa de teste no Render com a conta original. O teste de PDFs reais do usuário, com layouts de colunas e fórmulas, também fica pendente. Download .md pode exigir editor ou aplicativo de texto no celular.

## Privacidade e limites operacionais
O PDF completo fica na memória do dispositivo durante a leitura, não é salvo no servidor. Somente o texto extraído selecionado é enviado para geração por ação do usuário. Trechos podem conter dados pessoais: o usuário deve escolher material apropriado para enviar ao provedor.
Leitura local funciona offline após o cache inicial; geração exige internet. IA pode produzir erros; revisar conteúdo, gabaritos e fonte antes de salvar. Extração de colunas, tabelas, fórmulas e leitura visual pode perder ordem ou estrutura.
Cancelamento interrompe a sequência e descarta respostas tardias da interface, mas uma chamada já enviada ao provedor pode continuar e consumir quota. Blocos já concluídos permanecem disponíveis; uma nova geração recomeça no primeiro bloco. Limites de dez gerações por usuário/hora e trinta por instância/hora continuam compartilhados entre todas as funções de IA; erros também consomem tentativas aceitas.
Resumos temporários não são sincronizados ou incluídos no backup do app; baixar o Markdown. Questões salvas continuam usando o fluxo de backup/sincronização existente.

## Pendências para etapas futuras
OCR e PDFs digitalizados; biblioteca de resumos no app; resumo integrado entre múltiplos blocos; busca e estudo entre vários documentos; visualização da página original; edição assistida de questões; limites distribuídos e medição real de tokens. Não foram declarados como implementados.

## Atualização no GitHub/Render
Extrair o ZIP e enviar seus itens internos à raiz do repositório, preservando caminhos. O pacote contém somente os arquivos alterados, não a pasta do projeto inteira. Não excluir pastas ou substituir por arquivos de baseline. package.json e package-lock.json devem ser enviados juntos. scripts/copy-pdf-fonts.mjs é obrigatório: o build copia as fontes de node_modules para public/pdf-fonts e o Vite as inclui em dist. Essa pasta gerada não precisa ser enviada.
Aguardar Render Live. Abrir IA Memora+ > PDF e resumos, testar PDF com texto, selecionar páginas, gerar três questões por bloco e resumos. Conferir 12 respostas anteriores antes de adicionar material ao banco. Fazer backup atualizado antes de testes com dados reais. Sem publicação automática a partir deste ambiente.
