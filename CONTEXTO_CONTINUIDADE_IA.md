# MEMORA+ — CONTEXTO DE CONTINUIDADE NO CHATGPT

Checkpoint atual: abertura animada de 02/10/2026, sobre o checkpoint de interface e as correções 4B/4C. Consulte `CHECKPOINT_MEMORA_CHATGPT_ANIMACAO_2026-10-02.md`, `CHECKPOINT_MEMORA_CHATGPT_LOGO_2026-10-02.md`, `CHECKPOINT_MEMORA_CHATGPT_UI_2026-10-02.md`, `README.md` e `evidence/ui-2026-10-02/`. O checkpoint 4B/4C anterior permanece histórico.
O relatório mestre de transferência registra o ambiente anterior e não é a certificação do estado atual.

## Escopo

26 testes de regressão aprovados, TypeScript/lint/build e smoke test do servidor aprovados. Instalação limpa via npm ci aprovada.
Chromium real e celular emulado: operação offline, persistência após reinício, tema manual e cabeçalho responsivo validados. Android físico/modo avião real e integrações remotas continuam pendentes. Não declarar 4B/4C integralmente homologadas e não iniciar 4D antes de validar esses pontos.
ZIP original preservado e hash documentado. Não substituir a baseline nem reaplicar o código de origem sobre a cópia corrigida.

## Arquitetura

React 19, TypeScript 7, Vite 8, Tailwind 4, Express, Firebase e Gemini. Node 24; npm 11.9.0; `package-lock.json` é o lockfile oficial.
Versões diretas fixadas. Esbuild 0.28.2 resolve o conflito de peer dependency encontrado na transferência.
`bun.lock` da origem é preservado apenas dentro do ZIP original: não misturar gerenciadores ou reinstalar com um lockfile antigo.

IndexedDB nativo `memora_plus_db` v1: questions, history, sessions, settings, goals, metadata.
`StorageService` mantém caches síncronos em RAM e uma fila serial de escritas; não chamar mutadores antes de `initializeStorage()` retornar sucesso.
Inicialização compartilha uma promessa, é idempotente e valida o snapshot antes de liberar o app. A tela de abertura aguarda essa confirmação.

## Segurança dos dados

- Não escrever, remover ou limpar chaves de localStorage legado. Getters e diagnósticos são somente leitura. Não reativar dual-write.
- JSON ilegível, formatos inválidos, IDs duplicados e conflitos no destino rejeitam a migração. O conteúdo anterior e os metadados ficam preservados.
- Migração copia, compara todos os campos e grava COMPLETED na mesma transação multi-store. Uma aba que encontra marcador concluído dentro da transação não refaz a cópia.
- Preserve `selectedOption === undefined` em questões em branco. Nunca fabricar A ou string vazia.
- Exceções síncronas, inclusive DataError/DataCloneError/quota, abortam a transação.
- Falhas de persistência emitem eventos; RAM pode conter alterações ainda não salvas. `flushWrites()` não certifica sucesso após erro.
- Restore/reset são assíncronos: aguarde a promessa e o commit antes de anunciar sucesso ou recarregar a página. Restauram as cinco stores de dados; dailyGoal é incluído.
- Não reintroduzir limites só em RAM que omitam históricos ou sessões de backups.
- Uma coleção vazia restaurada continua vazia após reinício. O acervo inicial é inserido apenas na primeira preparação de um usuário novo.

## Saúde e sincronização

`StorageHealthService.checkIntegrity()` inspeciona todos os registros, inclusive históricos órfãos com zero questões; não apaga anomalias nem altera metadata.
Estado NOT_RUN representa integridade ainda não inspecionada; uma nova escrita invalida a inspeção anterior.
Thresholds de quota usam o percentual sem arredondamento: <70 HEALTHY, >=70 WARNING, >=85 CRITICAL. A estimativa é da origem, incluindo caches.
Sync Firebase no login aguarda bootstrap e adiciona IDs ausentes, preservando a versão local em IDs coincidentes. Não substituir automaticamente o banco local pelo acervo remoto.
Erros de sync manual são propagados; Firestore omite propriedades undefined via configuração do SDK. Integração remota ainda não homologada.

## Comandos

```bash
npm ci
npm run verify
npm run dev
# Produção:
npm run build
npm start
```

Não modificar SM-2 nem implementar streaming, compressão/chunking de backup nesta etapa. Próxima atividade: homologação no Chrome/Android físico (incluindo modo avião real e reinício do aparelho) e integrações remotas autorizadas. Não iniciar 4D.

## Interface — 02/10/2026

A variante dark do Tailwind segue a classe `.dark` aplicada pelo App; não voltar ao padrão automático de prefers-color-scheme. No cabeçalho mobile, marca/menu e ações ocupam duas linhas. Os controles principais são nomeados para acessibilidade e têm áreas de toque de 44 px. As pílulas centrais e o atalho IA aparecem a partir de xl; essas funções continuam acessíveis na navegação.

## Logo personalizada — 02/10/2026

Cabeçalho usa `/branding/memora-logo-marcelo.jpg`, preservando a arte enviada inteira. Opções `imageSize` e `preserveImage` permitem exibição sem máscara circular. Vídeo de abertura integrado: asset de 5 s acelerado 2× sobre o original enviado. Barra abaixo do vídeo e bootstrap seguro permanecem. `tsconfig.json` exclui as evidências da compilação para permitir nova validação após extrair o pacote.

## Abertura animada — 02/10/2026

`/branding/memora-intro.mp4` está no precache. Autoplay é silencioso e inline. Fallback usa a logo personalizada; vídeo indisponível não bloqueia dados já validados nem libera dados com erro. A animação tem limite de cinco segundos, mas o bootstrap pode exigir mais tempo. Movimento reduzido exibe logo estática. Validado em Chromium real/Pixel 7 emulado, inclusive reinício offline; Android físico ainda pendente.
