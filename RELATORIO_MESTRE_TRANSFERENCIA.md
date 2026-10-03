> Documento histórico do Google AI Studio. O estado atual, as correções e os limites da validação estão em `CHECKPOINT_MEMORA_CHATGPT_4B_4C.md` e `CONTEXTO_CONTINUIDADE_IA.md`. As declarações de conclusão abaixo não substituem a homologação atual.

# MEMORA+ — RELATÓRIO MESTRE DE TRANSFERÊNCIA DO GOOGLE AI STUDIO

---

## A. IDENTIFICAÇÃO

* **Nome do Projeto:** MEMORA+ (Plataforma Inteligente de Estudos, Questões e Memorização Espaçada)
* **Stack Principal:** React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`), TypeScript (`typescript: ^7.0.2`), Vite (`vite: ^8.3.0`), Tailwind CSS v4 (`@tailwindcss/vite: ^4.3.3`, `tailwindcss: ^4.3.3`), Motion (`motion: ^12.23.24`), Lucide React (`lucide-react: ^0.546.0`), Express (`express: ^4.21.2`), Google GenAI SDK (`@google/genai: ^2.4.0`), Firebase Web SDK (`firebase: ^12.19.0`), Sharp (`sharp: ^0.35.4`), Vite PWA (`vite-plugin-pwa: ^1.3.0`), Tsx (`tsx: ^4.21.0`), Esbuild (`esbuild: ^0.25.0`).
* **Estado Atual Oficial:** 
  * Fase 2 (Fundação / Dados / Offline): **CONCLUÍDA**
  * Fase 3 (Motor Pedagógico / SM-2 / Métricas): **CONCLUÍDA**
  * Fase 4A (Adaptador IndexedDB Nativo): **CONCLUÍDA E VALIDADA**
  * Fase 4B (Migração Transparente localStorage → IndexedDB): **CONCLUÍDA E VALIDADA**
  * Fase 4C (Quota, Integridade, Resiliência e Alertas): **CONCLUÍDA E VALIDADA**
  * Fase 4D (Backup de Grandes Bases): **PAUSADA / NÃO INICIADA**
* **Data e Contexto da Auditoria:** 01/10/2026 — Encerramento formal no ambiente Google AI Studio para transferência externa.

---

## B. ARQUITETURA ATUAL

O MEMORA+ foi concebido segundo o paradigma **Offline-First com Persistência Autoritativa Local e Sincronização em Nuvem Opcional**.

```text
                                    ┌────────────────────────────────────────────────────────┐
                                    │               INTERFACE DO USUÁRIO (React 19)          │
                                    │ (App, Navbar, Sidebar, Dashboard, Treino, Simulado,   │
                                    │  Revisão Espaçada, Banco, Metas, Estatísticas, Config) │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │                  StorageService                        │
                                    │     - Fachada síncrona pública para a UI              │
                                    │     - Cache de dados autoritativo em memória RAM       │
                                    │     - Despachante de eventos de erro (onStorageError)  │
                                    └──────────────┬─────────────────────────┬───────────────┘
                                                   │                         │
                         ┌─────────────────────────┴─────────┐     ┌─────────┴───────────────┐
                         ▼                                   ▼     ▼                         ▼
            ┌──────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
            │   StorageMigrator        │       │  IndexedDbStorage      │       │  StorageHealthService  │
            │   - Leitura do legado    │       │  - Adaptador nativo    │       │  - Quota do navegador  │
            │   - Cópia transacional   │       │  - IndexedDB v1        │       │  - Estimativa e alerta │
            │   - Idempotência         │       │  - Fonte AUTORITATIVA  │       │  - Checagem integridade│
            └────────────┬─────────────┘       └─────────────┬──────────┘       └────────────────────────┘
                         │                                   │
                         ▼                                   ▼
            ┌──────────────────────────┐       ┌────────────────────────┐
            │  localStorage (LEGADO)   │       │ IndexedDB:             │
            │  - Snapshot imutável     │       │ "memora_plus_db" (v1)  │
            │  - Backup de segurança   │       │ 6 Object Stores        │
            └──────────────────────────┘       └────────────────────────┘
```

1. **Camada de Apresentação:** SPA React modular com rotas por estado em `App.tsx`, estilizada com Tailwind CSS v4, suporte a modo Escuro/Claro nativo, tipografia com `Plus Jakarta Sans`, `Cinzel` e `JetBrains Mono`.
2. **Motor de Aprendizagem (`LearningEngine` + `SpacedRepetition`):**
   * Algoritmo SM-2 ajustado com 4 classificações: *Não Lembro*, *Difícil*, *Bom* e *Fácil*.
   * Cálculo de fator de facilidade (`easeFactor`), contagem de repetições (`repetitionCount`), intervalo em dias (`intervalDays`) e data da próxima revisão (`nextReviewDate`).
   * Estados de memória: `NOVA`, `APRENDENDO`, `REVISAR` e `DOMINADA`.
3. **Camada de Persistência Híbrida e Resiliente:**
   * **RAM (Cache):** Proporciona respostas instantâneas síncronas sem travamentos na UI.
   * **IndexedDB (`memora_plus_db` v1):** Fonte oficial autoritativa com 6 object stores transacionais.
   * **localStorage:** Mantido exclusivamente como snapshot de segurança pré-migração (sem dual-write ativo).
4. **Backend Server (`server.ts`):** Servidor Node.js Express com proxy para Google Gemini (`gemini-3.8-flash`), gerador de ícones com `sharp`, middlewares estáticos de PWA e controle de Service Worker (`/sw.js`).
5. **Nuvem Opcional (`FirebaseService`):** Firebase Authentication e Cloud Firestore para sincronização manual ou automática ao fazer login.

---

## C. ESTRUTURA DE DIRETÓRIOS

Árvore real confirmada em disco:

```text
MEMORA+ (Raiz do Projeto)
├── .env.example                               # Modelo de variáveis de ambiente
├── firebase-applet-config.json                # Configuração do cliente Firebase Web
├── firebase-blueprint.json                    # Esquema declarativo do Firestore
├── firestore.rules                            # Regras de segurança do Firestore
├── index.html                                 # Ponto de entrada HTML e meta tags PWA
├── metadata.json                              # Metadados do AI Studio
├── package.json                               # Dependências e scripts do projeto
├── bun.lock                                   # Lockfile de dependências
├── tsconfig.json                              # Configurações do compilador TypeScript
├── vite.config.ts                             # Configuração do Vite, Tailwind e VitePWA
├── server.ts                                  # Servidor Express Full-Stack e endpoints de IA
├── RELATORIO_MESTRE_TRANSFERENCIA.md          # Este documento
├── CONTEXTO_CONTINUIDADE_IA.md                # Guia técnico para o próximo modelo de IA
├── public/                                    # Assets estáticos servidos diretamente
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon.svg
│   ├── logo-official.png
│   ├── logo-round.png
│   ├── manifest.json
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-maskable-512x512.png
├── scripts/                                   # Utilitários de build e processamento de imagem
│   ├── generate-icons.js
│   └── process-logo.js
└── src/                                       # Código-fonte da aplicação
    ├── App.tsx                                # Componente raiz e gerenciador de estado mestre
    ├── main.tsx                               # Bootstrap React e registro do Service Worker
    ├── index.css                              # Estilos globais e injeção do Tailwind CSS v4
    ├── assets/                                # Imagens originais da marca
    │   └── images/
    │       ├── memora_gold_medallion_1789862985153.jpg
    │       ├── memora_official_logo_1789861708533.jpg
    │       └── memora_original_harmonized_1789862591839.jpg
    ├── components/
    │   ├── ai/
    │   │   └── AiGeneratorView.tsx            # Interface de geração de questões com IA
    │   ├── auth/
    │   │   └── AuthModal.tsx                  # Modal de autenticação Firebase
    │   ├── bank/
    │   │   └── QuestionBankView.tsx           # Banco completo de questões e filtros
    │   ├── branding/
    │   │   ├── MnemosyneLogo.tsx              # Componentes de logotipo e medalhão
    │   │   └── SplashScreen.tsx               # Tela de abertura, watchdog e diagnóstico
    │   ├── common/
    │   │   └── ErrorBoundary.tsx              # Captura global de erros com diagnóstico
    │   ├── dashboard/
    │   │   └── DashboardView.tsx              # Visão geral de métricas, metas e atalhos
    │   ├── goals/
    │   │   └── GoalsView.tsx                  # Metas diárias, semanais e streak
    │   ├── layout/
    │   │   ├── Navbar.tsx                     # Barra de navegação superior
    │   │   └── Sidebar.tsx                    # Menu lateral de navegação
    │   ├── manual/
    │   │   └── UserManualView.tsx             # Manual do usuário e metodologia
    │   ├── memory/
    │   │   └── MemoryMapView.tsx              # Mapa mental de retenção e disciplinas
    │   ├── pwa/
    │   │   ├── PWAInstallButton.tsx           # Botão de instalação do PWA
    │   │   └── PWAInstallModal.tsx            # Modal explicativo para Android e Desktop
    │   ├── review/
    │   │   └── SpacedReviewSession.tsx        # Sessão de repetição espaçada SM-2 (Flashcards)
    │   ├── settings/
    │   │   └── SettingsView.tsx               # Configurações, backup, integridade e quota
    │   ├── stats/
    │   │   └── StatisticsView.tsx             # Estatísticas detalhadas de desempenho
    │   └── study/
    │       ├── QuizSession.tsx                # Sessão de Quiz (Treino e Desafio)
    │       ├── SimuladoSession.tsx            # Simulado com cronômetro e cartão de respostas
    │       └── StudyModesView.tsx             # Seletor dos 4 modos de estudo
    ├── data/
    │   └── initialQuestions.ts                # Acervo oficial inicial com 13 questões normalizadas
    ├── hooks/
    │   └── usePWAInstall.ts                   # Hook para captura do evento beforeinstallprompt
    ├── services/
    │   ├── csvService.ts                      # Parser e exportador CSV/Excel
    │   ├── firebase.ts                        # Integração com Auth e Firestore
    │   ├── indexedDbStorage.ts                # Adaptador nativo do IndexedDB (memora_plus_db)
    │   ├── learningEngine.ts                  # Motor pedagógico de filtragem e cálculo de metas
    │   ├── pwaService.ts                      # Diagnóstico e registro do Service Worker
    │   ├── spacedRepetition.ts                # Algoritmo matemático SM-2
    │   ├── statisticsService.ts               # Agregação estatística e tempos médios
    │   ├── storageHealthService.ts            # Quota, persistência durável e auditoria de stores
    │   ├── storageMigrator.ts                 # Motor de migração idempotente localStorage -> IDB
    │   └── storageService.ts                  # Fachada mestre de persistência e cache em RAM
    ├── types/
    │   └── index.ts                           # Definições completas de tipos TypeScript
    └── utils/
        └── questionNormalizer.ts              # Normalizador para disciplina e compatibilidade
```

---

## D. FUNCIONALIDADES CONFIRMADAS

1. **Quatro Modos de Estudo:** Treino (feedback instantâneo), Desafio (tempo limite regressivo), Simulado (cartão de respostas e sem gabarito prévio) e Revisão Espaçada SM-2 (Flashcards com autoavaliação).
2. **Banco de Questões Completo:** Filtros combinados, paginação, suporte a alternativas A–E, edição, exclusão e importação/exportação CSV.
3. **Persistência IndexedDB e Migração Não-Destrutiva:** Banco `memora_plus_db` versão 1 com 6 stores, cache em RAM autoritativo e migração idempotente do localStorage antigo.
4. **Monitoramento de Quota e Integridade:** Estimativa de disco via Storage Manager API, classificação de thresholds (Healthy, Warning, Critical), persistência durável e diagnóstico de integridade de 6 stores sem apagar anomalias.
5. **Dashboard, Metas e Estatísticas:** Metas diárias, cálculo de streaks, tempos médios, distribuição por memória e acurácia por matéria.
6. **PWA Completo:** Manifest, ícones maskable, Service Worker gerado via Workbox com precache de 5 MB e suporte offline no celular/desktop.
7. **IA Integrada:** Geração de questões por matéria e conversão de textos de estudo em simulados com `gemini-3.8-flash`.
8. **Autenticação e Nuvem:** Login com Firebase Auth e sincronização sob demanda com Cloud Firestore.

---

## E. FUNCIONALIDADES PARCIAIS

1. **Upload de Logotipo em Ambientes Serverless:** Em containers com sistema de arquivos efêmero (Cloud Run), arquivos criados em `public/` desaparecem após reinício do container.
2. **Sincronização em Tempo Real (Live Listeners):** Opera sob demanda manual ou no login, sem listener `onSnapshot` contínuo sincronizando aparelhos concorrentes simultâneos.

---

## F. PENDÊNCIAS (BACKLOG)

1. **Fase 4D — Backup de Grandes Bases:** Chunking e compressão gzip/zip para bases com mais de 5.000 questões.
2. **Múltiplos Decks Isolados de Flashcards:** Atualmente unificado por matérias e assuntos.
3. **Exportação de Relatórios em PDF:** Disponível apenas em CSV e JSON.

---

## G. HISTÓRICO DAS FASES

| Fase | Descrição | Estado |
| :--- | :--- | :--- |
| Fase 1 | Protótipo e Estrutura Inicial | CONCLUÍDA |
| Fase 2 | Fundação, Normalização de Dados e PWA Offline | CONCLUÍDA |
| Fase 3A–3H | Motor de Aprendizagem, SM-2, Metas e Estatísticas | CONCLUÍDA |
| Fase 4A | Adaptador IndexedDB Nativo (`indexedDbStorage.ts`) | CONCLUÍDA |
| Fase 4B | Migração Segura localStorage → IndexedDB | CONCLUÍDA |
| Fase 4C | Quota, Integridade, Resiliência e Alertas | CONCLUÍDA |
| Fase 4D | Backup de Grandes Bases e Compressão | PENDENTE / NÃO INICIADA |

---

## H. FASE 4B (MIGRAÇÃO LOCALSTORAGE → INDEXEDDB)

* **Adaptador:** Nativo em `indexedDbStorage.ts`.
* **Migrador:** `storageMigrator.ts`.
* **Stores:** `questions`, `history`, `sessions`, `settings`, `goals`, `metadata`.
* **Idempotência:** Validação via `app_storage_metadata`. Se `COMPLETED`, ignora re-migração.
* **Segurança:** O `localStorage` original NÃO foi apagado, permanecendo como snapshot de recuperação.

---

## I. INDEXEDDB

* **Database:** `memora_plus_db` (v1)
* **Stores:** 6 stores estruturadas com índices por disciplina, data e modo de estudo.
* **Transações:** Gravações em lote atômicas (`batchPut`) com rollback automático em caso de exceção.

---

## J. PWA / OFFLINE

* **Manifesto:** `public/manifest.json` e `dist/manifest.webmanifest`.
* **Service Worker:** Gerado via Workbox com precache de 18 arquivos (5 MB) e CacheFirst para fontes do Google.
* **Resiliência:** Watchdog de 3,8 segundos na SplashScreen para redes lentas.

---

## K. FIREBASE / FIRESTORE

* **Config:** `firebase-applet-config.json`
* **Rules:** `firestore.rules` com isolamento estrito `isOwner(userId)`.

---

## L. BUILD

* **TypeScript (`npx tsc --noEmit`):** 0 erros.
* **Linter (`npm run lint`):** 0 erros.
* **Produção (`npm run build`):** Sucesso absoluto (bundle cliente + bundle backend server.cjs).

---

## M. BUGS CONHECIDOS

* [BAIXO] Aviso de `__dirname` no `vite.config.ts` (deprecado no futuro Vite 9 em favor de `import.meta.dirname`).
* [MÉDIO] Persistência em disco do logo personalizado no container serverless efêmero.

---

## N. DÉBITOS TÉCNICOS

* Code-splitting / dynamic `import()` para visões menos acessadas visando diminuir chunk de 1.7 MB.
* Streaming para backups de bases massivas (Fase 4D).

---

## O. SEGURANÇA

* Arquivo `.env` contém `GEMINI_API_KEY` e não deve ser compartilhado publicamente.
* Configurações públicas residem em `.env.example` e `firebase-applet-config.json`.

---

## P. ARQUIVOS NECESSÁRIOS PARA TRANSFERÊNCIA

* Todos os arquivos em `src/`, `public/`, `scripts/`, `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `server.ts`, `index.html`, `metadata.json`, `firestore.rules`, `firebase-blueprint.json`, `firebase-applet-config.json`, `.env.example`.

---

## Q. PRÓXIMA FASE RECOMENDADA

**FASE 4D — BACKUP E EXPORTAÇÃO DE GRANDES BASES** (Streaming, compressão gzip e chunking com cursores IDB).
