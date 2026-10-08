# MEMORA+ — checkpoint 4B/4C + interface validada

Projeto continuado no ChatGPT a partir do ZIP original, preservado no pacote de entrega.
A Fase 4D continua pausada. Leia `CHECKPOINT_MEMORA_CHATGPT_ANIMACAO_2026-10-02.md` para o estado atual e `CHECKPOINT_MEMORA_CHATGPT_4B_4C.md` antes de alterar o armazenamento.

## Executar

Use Node.js 24 e npm 11.9.0. O gerenciador oficial deste checkpoint é npm, com `package-lock.json` e versões diretas fixadas.

```bash
npm ci
npm run dev
```

Para produção:

```bash
npm run build
npm start
```

Acesse `http://localhost:3000`. `npm start` configura `NODE_ENV=production` também no Windows.
A aplicação local não precisa de uma chave Gemini para iniciar. Para geração por IA, configure `GEMINI_API_KEY` em um `.env` baseado no `.env.example`.
Nunca compartilhe esse `.env`. Firebase e Gemini dependem dos serviços externos e das permissões da conta.

## Verificar

```bash
npm run verify
```

Esse comando executa TypeScript, lint independente, 26 testes de regressão, build e seis verificações HTTP do servidor de produção.
Também há comandos individuais: `typecheck`, `lint`, `test`, `build` e `test:server`.
O lint verifica sintaxe e regras focadas de correção; a análise de tipos é feita separadamente pelo TypeScript.

## Dados

- O legado `memora_plus_*_v1` é somente leitura.
- Migração inválida não libera gravações nem entrada no aplicativo.
- IndexedDB é a fonte persistente após inicialização bem-sucedida.
- Escritas comuns mantêm respostas rápidas em RAM e uma fila de persistência. Falhas são visíveis e não significam sucesso em disco; `flushWrites()` permite aguardar confirmação.
- Restauração e reset só anunciam sucesso depois do commit transacional. Dados de navegador não são transferidos pelo ZIP do código.
- Preserve/exporte seus dados no navegador original antes de mudar de domínio ou dispositivo.

## Validação que falta

Os 26 testes unitários usam `fake-indexeddb`. Também foram executados testes separados em Chromium real com IndexedDB nativo, desktop e Pixel 7 emulado: tema manual, sete larguras, service worker, criação offline e persistência após reiniciar o navegador. O teste no Chrome/Android físico, incluindo modo avião real, reinício do aparelho e dados reais, continua pendente. Autenticação e sincronização Firebase precisam de testes com a conta autorizada.
A geração/compressão de backups grandes (4D) não foi implementada.

## Abertura

Animação personalizada de 5 segundos, silenciosa, com barra abaixo e fallback para logo estática. A entrada aguarda dados validados. O vídeo é incluído no cache para funcionar offline após preparação inicial com rede. O original de 10 segundos permanece no pacote, fora do projeto.


## PDF e resumos (2026-10-08)

A aba **IA Memora+ → PDF e resumos** lê PDFs com texto selecionável no dispositivo, permite selecionar páginas e gerar questões/resumos por blocos. PDF até 20 MB/500 páginas; até 10 páginas e 18.000 caracteres por leitura. Geração requer conta vinculada e internet. Resumos são temporários: baixe o arquivo Markdown antes de sair da tela. OCR ainda não está implementado.

O build e o comando de desenvolvimento executam `scripts/copy-pdf-fonts.mjs`; envie esse arquivo junto com os dois manifestos npm. Leia `CHECKPOINT_MEMORA_PDF_RESUMOS_2026-10-08.md` para evidências, limitações e pendências. Fase 4D permanece pausada.
