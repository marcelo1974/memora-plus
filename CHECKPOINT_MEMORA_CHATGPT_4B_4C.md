# CHECKPOINT MEMORA+ — CHATGPT — CORREÇÕES 4B/4C

Data: 01/10/2026. Estado: correções implementadas e validação automatizada local aprovada. Homologação em navegador/Android e serviços remotos pendente. Fase 4D pausada.

## Resultado

O próximo passo após a auditoria foi corrigir segurança da migração, resiliência e reprodução das dependências. A baseline original não foi alterada nem substituída.
Este checkpoint contém código atualizado, lockfile npm, testes, documentação e evidências. Não contém dados pessoais do IndexedDB/localStorage do navegador de origem.

Baseline SHA-256: `164270e69eb221db97840d39bfb0d4bc033c3b39b8f2e772bef037cc82497bce`.

## Correções implementadas

| Área | Comportamento corrigido |
| --- | --- |
| Dependências | Versões diretas fixadas; esbuild 0.28.2 compatível com Vite 8.3.2; npm ci aprovado sem force ou legacy-peer-deps |
| Lockfile | package-lock.json oficial; bun.lock antigo preservado dentro do ZIP baseline, removido da cópia corrigida |
| Lint | ESLint independente com regras focadas de correção; TypeScript em comando separado |
| JSON legado | Conteúdo ilegível, tipo inválido, ID duplicado e campos inválidos rejeitam migração; não são tratados como banco vazio |
| Fidelidade | Comparação de todos os registros e campos, incluindo settings, dailyGoal, intervalos, datas, sessões e respostas em branco |
| Atomicidade | Cópia, validação e marcador COMPLETED na mesma transação das seis stores; conflito ou exceção aborta todas as cópias |
| Concorrência | Promessa compartilhada por inicialização e migrador; marcador conferido sob lock transacional para duas instâncias/abas |
| Legado | Getters, diagnóstico e bootstrap não gravam/removem chaves de localStorage; mutações exigem bootstrap concluído |
| Tela inicial | Aguarda confirmação do banco antes de liberar a aplicação; falha fica visível e permite nova tentativa sem modificar o legado |
| Quota/falhas | Transações abortam também em erros síncronos; escritas em fila; erros propagados para listener; flush não confirma uma gravação que falhou |
| Restore/reset | Assíncronos; substituem as cinco stores de dados de forma atômica; RAM é atualizada após commit; dailyGoal restaurado; novas alterações aguardam término |
| Coleção vazia | Restore vazio permanece vazio na reabertura; acervo inicial é inserido apenas na primeira preparação de usuário novo |
| Histórico/sessões | Limites só em RAM removidos para não omitir dados persistidos dos backups; ordem por timestamp/startTime na hidratação |
| Integridade | Inspeção de todos os registros, órfãos com zero questões, referências de sessões, schema zero e counts reais; não apaga nem modifica registros |
| Estado da integridade | NOT_RUN antes de inspeção e após nova escrita; não reutiliza uma certificação antiga como se fosse atual |
| Percentual de quota | Classificação antes do arredondamento; quota da origem inclui caches; limite desconhecido tratado como não suportado |
| Nuvem | Login aguarda bootstrap; acrescenta questões ausentes sem substituir versões locais; sync manual não anuncia sucesso após erro; SDK omite undefined |
| Produção | npm start configura NODE_ENV=production de forma portátil; aviso __dirname removido do Vite |
| PWA | JPG/JPEG incluídos no precache; build gerou 21 entradas, 8.607,60 KiB; funcionamento offline real ainda não certificado |

## Validação do estado entregue

Ambiente: Node.js 24.19.0, npm 11.9.0, TypeScript 7.0.2, Vite 8.3.2, esbuild 0.28.2.

| Checagem | Resultado |
| --- | --- |
| npm install padrão | Aprovado, sem ignorar peers |
| npm ci em diretório limpo | Aprovado, exit 0 |
| npm run typecheck | Aprovado, zero erros |
| npm run lint | Aprovado, zero erros/avisos |
| npm test | 26 testes aprovados, zero falhas |
| npm run build | Aprovado, cliente + servidor + Service Worker |
| npm run test:server | Seis verificações HTTP aprovadas |
| npm run verify | Toda a sequência aprovada, exit 0 |
| npm ls --depth=0 | Aprovado, exit 0 |
| ZIP original | Hash novamente conferido; baseline preservada |

Build final: JS 1.359,79 kB (370,51 kB gzip), CSS 100,74 kB. Permanece aviso de chunk acima de 500 kB. Esse aviso não impede o build.

O teste de produção cobre health, HTML, manifest, Service Worker, resposta 404 para asset ausente e resposta 503 de IA sem chave. Nenhuma chamada Gemini real foi feita.
O teste inicia e encerra seu próprio processo; não publica nem implanta o aplicativo.

## Cobertura de regressão

Os 26 testes exercitam código real usando fake-indexeddb: migração fiel e idempotente; cinco chaves com JSON inválido; formatos/IDs inválidos; acesso bloqueado; comparação além da amostra anterior; conflito de destino; rollback por DataError/DataCloneError; quota simulada; bootstrap simultâneo e sem escrita no legado; falha visível; restore completo e vazio; reset; falha de restore com banco/cache preservados; sequência de edição/favorito/exclusão; históricos acima de 5.000 e sessões acima de 500; thresholds; órfãos; schema zero; nova tentativa após indisponibilidade; concorrência entre migradores; gabarito inválido; bloqueio de alterações durante restore; erro assíncrono e exportação das alterações em RAM; invalidação de diagnóstico; dados corrompidos com marcador COMPLETED.

Esses testes não substituem IndexedDB nativo em navegador nem testes no aparelho do usuário.

## Limites e pendências

1. Navegador real indisponível: Playwright estava instalado, mas o executável Chromium não. A tentativa de download retornou arquivo inválido e falhou. Não há aprovação de UI, IndexedDB nativo, modo avião, instalação Android ou atualização de Service Worker nesta entrega.
2. Autenticação, regras implantadas, sync real do Firebase, conta/isolamento entre usuários e modelo Gemini precisam de validação remota. Código local e smoke test não certificam esses serviços.
3. Escritas ordinárias continuam otimistas em RAM. Em falha, o banner informa o problema e a exportação preserva o estado em memória; isso não significa que a alteração esteja salva no disco. Restore/reset só retornam sucesso após commit.
4. Atualizações pedagógicas de questões, histórico e metas ainda são operações distintas na fila; não há uma transação única de sessão de estudo inteira. Não foi redesenhado o motor SM-2 nesta etapa.
5. Sincronização ao login usa precedência local em IDs coincidentes, não resolve conflitos de múltiplos dispositivos por edição/timestamp. Sem listeners contínuos ou sincronização completa de sessões/metas.
6. Endpoints de IA/upload, logotipo em container efêmero, comportamento public/dist e custo de bundle permanecem no backlog. Não publicar sem revisar as condições de operação.
7. A instalação emite deprecações de dependências transitivas e do ESLint 9 usado com o parser Babel 7 compatível com a sintaxe TS. Não foi realizada certificação de vulnerabilidades. O lockfile registra a combinação testada, sem exceções de peer dependency.
8. O ZIP original não contém o banco pessoal do navegador. Preservar/exportar dados no ambiente de origem antes de mudar domínio/dispositivo.

## Próximo passo

Homologar este checkpoint em Chrome/Android com dados de teste: migração válida/inválida, dados em branco, reabertura, restore/reset, duas abas, falhas/quota e modo avião. Depois reauditar 4B/4C e registrar os resultados. A Fase 4D permanece pausada até essa homologação.

Os documentos históricos estão preservados no ZIP original; o guia de continuidade atualizado e este checkpoint descrevem a implementação entregue.
