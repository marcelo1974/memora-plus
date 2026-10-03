# CHECKPOINT MEMORA+ — CHATGPT — LOGO PERSONALIZADA

Data: 02/10/2026. Continuação do checkpoint de interface de 02/10/2026. Fase 4D pausada.

## Alteração

A arte enviada por Marcelo foi integrada ao cabeçalho como padrão em `public/branding/memora-logo-marcelo.jpg`. A imagem é exibida inteira, com `object-contain`, em 48×48 px e sem máscara circular. O nome do aplicativo permanece legível ao lado da imagem. Logo/identidade definidos pelo usuário em configurações continuam sendo respeitados.

O componente MemoraBrandLogo recebeu opções de tamanho da imagem e preservação do enquadramento. Seus demais usos mantêm os padrões anteriores. A abertura animada será integrada depois do recebimento do vídeo; esta etapa contém somente a troca de logo no cabeçalho.

O anexo `1000435240.png` contém JPEG: 1536×1536 px, 384.933 bytes, fundo claro, sem canal alfa. A extensão do asset acompanha o formato real. Os bytes originais foram preservados, sem recorte, remoção de fundo, recompressão ou geração de outra arte.

SHA-256 do anexo e do asset, iguais:
`e391d53858a5c842be45efc608b10b3b79bab92d0d5bcb3ee7b1deb2089c3b6d`.

## Correção de empacotamento

O checkpoint de interface anterior incluía um harness TypeScript em `evidence/` com caminhos adequados ao ambiente de QA, mas inadequados para compilação como parte da aplicação. Isso fazia uma nova execução de typecheck após extrair o pacote falhar. `tsconfig.json` agora exclui `evidence`, `dist` e `node_modules` da compilação, mantendo código da aplicação e testes no escopo. ESLint já excluía as evidências.

## Verificação

- TypeScript e lint passaram após a correção de empacotamento.
- Os 26 testes de regressão passaram; build limpo e seis verificações HTTP de produção passaram.
- Chromium 153 real: tema manual, criação online/offline, comparação integral das seis stores após recarga e reinício offline, resposta em branco e rollback de lote inválido passaram.
- Desktop e Pixel 7 emulado: a nova logo estava carregada com largura natural 1536 px e `object-fit: contain` após reiniciar offline.
- Cabeçalho sem overflow/interceptação nas larguras 320, 360, 412, 640, 768, 1024 e 1365 px; controles móveis principais com 44 px.
- Nenhuma exceção JavaScript de página não tratada nos cenários executados.
- O precache inclui a logo: Workbox informa 19 entradas, 14 URLs únicas. JS 1360,56 kB e CSS 106,44 kB. O aviso de chunk >500 kB permanece.

Dados sintéticos e perfis isolados foram usados. Chrome/Android físico e modo avião real continuam pendentes; nenhum teste de conta Firebase/Gemini, deploy ou instalação PWA foi realizado. Armazenamento, dependências, lockfile e SM-2 não foram alterados.

## Continuidade

Aguardar o vídeo da animação (até 5 segundos) para integrar a abertura com a barra de carregamento abaixo, preservando a inicialização segura dos dados. O vídeo ainda não foi recebido nem incluído neste pacote. Não iniciar Fase 4D.

Baseline original preservada, SHA-256:
`164270e69eb221db97840d39bfb0d4bc033c3b39b8f2e772bef037cc82497bce`.

Capturas, resultados e scripts desta rodada em `evidence/logo-2026-10-02/`. Reprodução: adaptar os caminhos de Playwright/Chromium pelos parâmetros de ambiente dos runners e usar o procedimento do checkpoint anterior, com a pasta de QA `browser-validation-logo/` no diretório pai do projeto. Os perfis do navegador não são distribuídos.
