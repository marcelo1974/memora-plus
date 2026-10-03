# CHECKPOINT MEMORA+ — CHATGPT — INTERFACE VALIDADA

Data: 02/10/2026. Continuação das correções 4B/4C. Fase 4D pausada.

## Resultado

Corrigidos os dois problemas registrados na validação de 01/10/2026:

- O tema manual escuro/claro agora controla a variante `dark` do Tailwind por classe. A aparência independe do esquema de cores do sistema e acompanha a configuração persistida após reinício offline.
- No celular, o cabeçalho organiza marca/menu e ações em duas linhas. Login e nova questão usam ícones com nomes acessíveis em telas estreitas; as funções mantêm seus handlers. Controles principais móveis têm área de toque de 44 px. O botão de tema recebe o toque sem interferência do login.

Alterações de aplicação: somente `src/index.css` e `src/components/layout/Navbar.tsx`. Nenhuma mudança no armazenamento, SM-2, migração, Firebase, dependências ou lockfile. README e contexto de continuidade atualizados; checkpoint 4B/4C anterior preservado como registro histórico.

## Verificação

| Verificação | Resultado |
|---|---|
| TypeScript | Passou |
| ESLint, zero warnings permitidos | Passou |
| Regressão de armazenamento | 26 testes passaram |
| Build limpo de produção | Passou; JS 1360,36 kB, CSS 106,41 kB |
| Smoke HTTP de produção | 6 verificações passaram |
| Tema manual versus sistema claro/escuro | Passou em desktop e Pixel 7 emulado |
| Cabeçalho e controles sem interceptação/overflow | Passou em 320, 360, 412, 640, 768, 1024 e 1365 px |
| Criação de questão online e offline pela interface | Passou nos dois perfis |
| Recarga offline e reinício do navegador offline | Passou; comparação integral das seis stores |
| Preferência escura aplicada após reinício offline | Passou nos dois perfis |
| Abort de lote inválido em IndexedDB nativo | Passou; nenhum registro parcial |
| Resposta em branco preservada | Passou |
| Exceções JavaScript não tratadas de página | Zero nos cenários executados |

O build mantém o aviso de chunk JavaScript acima de 500 kB; não foram feitas otimizações fora do escopo. O Workbox informou 18 entradas de precache; o navegador observou 13 URLs únicas, pois há entradas repetidas de ícones no manifesto de precache. O pacote de QA não foi incluído no precache de produção.

Ambiente: Chromium 153.0.8010.0 em Linux, IndexedDB e service worker nativos; desktop 1365×900 e Pixel 7 emulado com viewport 412×839, toque e escala 2,625. O user-agent mobile corresponde ao perfil Android 14/Chrome 151; isso não muda o motor Linux executado nem equivale a Android físico.

Offline foi bloqueio de rede no navegador, confirmado por `navigator.onLine === false`, inclusive antes de reabrir o perfil persistente. Em cada perfil, o acervo foi de 13 para 15 questões e ambas as questões criadas pela interface sobreviveram ao reinício. Histórico/sessões desses perfis estavam vazios; dados não vazios foram homologados nos testes nativos do relatório anterior, e os serviços de armazenamento permaneceram inalterados nesta correção.

## Integridade e limites

A baseline original continua imutável, SHA-256:
`164270e69eb221db97840d39bfb0d4bc033c3b39b8f2e772bef037cc82497bce`.

A comparação com o ZIP corrigido de 01/10/2026 registra os arquivos alterados em `evidence/ui-2026-10-02/source-differences.json`. Arquivos de QA são externos ao código da aplicação; os perfis do navegador não são distribuídos.

Não houve deploy, teste em aparelho Android físico, instalação PWA no Android, acionamento de modo avião do sistema nem teste remoto de login/Firestore/Gemini. Não declarar homologação Android completa. Não iniciar a Fase 4D com base apenas na emulação.

## Próximo passo

Homologar esta versão publicada em HTTPS no Chrome/Android físico. Após exportar backup dos dados de teste: carregar com rede, criar questão, mudar configuração, ativar modo avião com Wi-Fi desligado, criar/responder outra questão, fechar/reabrir Chrome e reiniciar o aparelho ainda offline. Conferir banco, histórico, sessões, metas e configuração; repetir na PWA instalada e após retorno da rede. Integrações remotas exigem uma conta de teste autorizada.

## Reprodução e evidências

Executar o projeto com Node 24 e `npm ci`; `npm run verify` valida tipos, lint, regressões, build e HTTP. O pacote contém capturas, snapshots sintéticos, resultados JSON e scripts de browser em `evidence/ui-2026-10-02/`. Os scripts usam Playwright e Chromium externo ao projeto, com caminhos da máquina de execução; consultar `REPRODUCAO.md` antes de reproduzir. A execução foi feita com build limpo e perfis novos.
