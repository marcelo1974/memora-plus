# CHECKPOINT MEMORA+ — CHATGPT — ABERTURA ANIMADA

Data: 02/10/2026. Continuação do checkpoint de logo personalizada. Fase 4D pausada.

## Resultado

O vídeo enviado por Marcelo foi integrado à abertura, com a barra de carregamento imediatamente abaixo. O cabeçalho permanece com a logo personalizada. O vídeo é exibido inteiro, sem recorte, com reprodução automática silenciosa e inline. A entrada só ocorre quando os dados estão prontos e a abertura terminou, foi pulada ou não pôde ser reproduzida.

## Vídeo e preservação

Original `1000442451.mp4`: duração de arquivo 10,005 s, 1280×720, H.264/AAC, 3.215.773 bytes. Uma cópia imutável do original é incluída fora do projeto, em `baseline/1000442451-original.mp4`.

Para respeitar o limite de 5 segundos solicitado, a sequência foi acelerada 2×, reduzida a 854×480, codificada em H.264/yuv420p e otimizada com faststart. O asset do app tem exatamente 5,000 s e 384.064 bytes. Foi retirada a faixa de áudio do asset de abertura para viabilizar autoplay silencioso; o original preserva o áudio.

Original SHA-256: `1d44f572061a321f7087b95672baeab7b1404f81e774f4ea86f1d1c70f410c02`.

Asset SHA-256: `d2c55ecde0761d8c04354c7893aa3c6b68ba0d20bd9c7a48b9a00c1c50fe9b58`.

Conversão reproduzível:

```bash
ffmpeg -i 1000442451.mp4 -an -vf 'setpts=0.5*PTS,scale=854:480' -r 24 -t 5 -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -movflags +faststart memora-intro.mp4
```

## Inicialização segura

- A abertura não acrescenta mais que cinco segundos de espera; a preparação dos dados pode continuar além desse prazo.
- A barra é um indicador visual da abertura. Se os dados ainda não estão prontos, permanece visível com estado de preparação, sem certificar um commit inexistente.
- Watchdog de dados após 6,2 s mostra orientação e mantém a entrada bloqueada.
- “Pular Abertura” exige dados prontos e ausência de erro de inicialização.
- Falha do arquivo, recusa de autoplay ou preferência de movimento reduzido exibem a logo estática. Erro do vídeo nunca contorna a validação dos dados.
- O callback de conclusão é protegido contra chamadas duplicadas.
- O MP4 entrou no precache Workbox para abrir offline após a preparação do cache com rede.

## Validação executada

TypeScript, lint, 26 testes de regressão, build limpo e seis verificações HTTP de produção passaram.

Em Chromium 153.0.8010.0 real, desktop e Pixel 7 emulado:

| Cenário | Resultado |
|---|---|
| Decodificação H.264 real e currentTime avançando | Passou nos dois perfis |
| Duração 5 s, muted e playsInline | Passou |
| Barra posicionada abaixo do vídeo | Passou |
| MP4 presente no cache | Passou |
| Fechar navegador e abrir offline: vídeo reproduz novamente | Passou nos dois perfis |
| Comparação profunda das seis stores antes/depois do reinício offline | Passou |
| Bootstrap não pronto após 6,7 s | Entrada continuou bloqueada; barra visível |
| Bootstrap com erro, mesmo ready=true | Entrada continuou bloqueada |
| Atualização para dados prontos sem erro | Uma única conclusão |
| Autoplay recusado | Logo estática; dados protegidos |
| Arquivo de vídeo indisponível | Logo estática; dados protegidos |
| Preferência de movimento reduzido | Vídeo não exibido |
| Exceções JavaScript não tratadas de página | Zero |

Os cenários normais e offline usam o aplicativo de produção. Bootstrap lento/erro e falhas de mídia foram exercitados em harness com o componente original, sem modificar os serviços de dados. Os dados usados são sintéticos. Os perfis não são distribuídos.

Build: JS 1361,00 kB, CSS 105,75 kB, precache 20 entradas (15 URLs únicas). O aviso de chunk >500 kB permanece.

## Continuidade e limites

Não houve alteração de dependências, lockfile, IndexedDB, migração, SM-2, Firebase ou dados de usuários. Nenhum deploy foi realizado. Chrome/Android físico, modo avião real e integrações remotas ainda precisam de homologação. Emulação Pixel 7 não é Android físico.

Código alterado: SplashScreen e inclusão de MP4 no glob de precache em vite.config.ts; asset em public/branding/memora-intro.mp4; documentação atualizada.

Baseline de transferência original permanece imutável:
`164270e69eb221db97840d39bfb0d4bc033c3b39b8f2e772bef037cc82497bce`.

Próximo passo: testar no Chrome/Android físico com rede, aguardar o cache, fechar/reabrir em modo avião com Wi-Fi desligado e conferir reprodução, barra e dados. Repetir na PWA instalada. Não iniciar Fase 4D a partir apenas destes testes emulados.

Evidências em `evidence/animacao-2026-10-02/`: logs, resultados, capturas, harness e runner. Para reproduzir, copiar os scripts para `browser-validation-animation/` no diretório pai do projeto, compilar o harness via esbuild, configurar PLAYWRIGHT_MODULE/CHROMIUM_EXECUTABLE, executar build e `node browser-validation-animation/video.cjs`. O harness e os perfis devem permanecer fora de dist; o script fornece a página de QA pela automação.
