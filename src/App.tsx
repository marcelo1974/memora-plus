import { getCloudOwner } from './services/cloudAccountGuard';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AnswerHistoryRecord,
  DailyGoalProgress,
  Question,
  StudyModeType,
  StudySession,
  UserSettings,
} from "./types";
import { StorageService } from "./services/storageService";
import { LearningEngine } from "./services/learningEngine";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { SplashScreen } from "./components/branding/SplashScreen";
import { DashboardView } from "./components/dashboard/DashboardView";
import { GoalsView } from "./components/goals/GoalsView";
import { QuizSession } from "./components/study/QuizSession";
import { SimuladoSession } from "./components/study/SimuladoSession";
import { SpacedReviewSession } from "./components/review/SpacedReviewSession";
import { QuestionBankView } from "./components/bank/QuestionBankView";
import { StatisticsView } from "./components/stats/StatisticsView";
import { MemoryMapView } from "./components/memory/MemoryMapView";
import { AiGeneratorView } from "./components/ai/AiGeneratorView";
import { StudyModesView } from "./components/study/StudyModesView";
import { SettingsView } from "./components/settings/SettingsView";
import { UserManualView } from "./components/manual/UserManualView";
import { AuthModal } from "./components/auth/AuthModal";
import { FirebaseService, testFirestoreConnection } from "./services/firebase";
import { User as FirebaseUser } from "firebase/auth";
import { StudyFilterCriteria } from "./services/learningEngine";
import { Bookmark, AlertCircle, Play, AlertTriangle, X } from "lucide-react";
import { StorageErrorDetail } from "./types";

export default function App() {
  // Splash Screen control (shows once on startup)
  const [showSplash, setShowSplash] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Storage Error & Quota Alert (Fase 4C)
  const [activeStorageError, setActiveStorageError] = useState<StorageErrorDetail | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [accountGate, setAccountGate] = useState<"checking" | "allowed" | "blocked">("checking");

  // Application State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<AnswerHistoryRecord[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getUserSettings());
  const [dailyGoal, setDailyGoal] = useState<DailyGoalProgress>(() => StorageService.getDailyGoalProgress());

  // Navigation and UI state
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [activeStudyMode, setActiveStudyMode] = useState<StudyModeType>("TREINO");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick Add Question modal in QuestionBankView triggered from Navbar
  const [bankAddTrigger, setBankAddTrigger] = useState(0);

  // Initial criteria for QuizSession (Treino / Desafio)
  const [quizInitialCriteria, setQuizInitialCriteria] = useState<Partial<StudyFilterCriteria> | undefined>(undefined);

  // Load initial data safely with async storage bootstrap
  const loadData = useCallback(async () => {
    try {
      // Executa o bootstrap do IndexedDB e migração transparente se necessária
      const result = await StorageService.initializeStorage();
      if (!result.success) throw new Error(result.message);
      setInitError(null);
      setStorageReady(true);

      const qs = StorageService.getQuestions();
      const hist = StorageService.getAnswerHistory();
      const sess = StorageService.getStudySessions();
      const st = StorageService.getUserSettings();
      const dg = StorageService.getDailyGoalProgress();

      setQuestions(qs);
      setHistory(hist);
      setSessions(sess);
      setSettings(st);
      setDailyGoal(dg);
    } catch (err: any) {
      console.error("[MEMORA+] Erro na inicialização dos dados:", err);
      setInitError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    if (storageReady) setShowSplash(false);
  }, [storageReady]);

  useEffect(() => {
    // Listener para erros assíncronos de persistência no IndexedDB (Fase 4C)
    const unsubStorage = StorageService.onStorageError((errDetail) => {
      setActiveStorageError(errDetail);
    });

    void loadData();
    void testFirestoreConnection();
    return () => unsubStorage();
  }, [loadData]);

  // Login never merges or uploads the shared local bank automatically.
  // Existing unowned data requires explicit confirmation in Settings.
  useEffect(() => {
    return FirebaseService.onAuthChange((user) => {
      setAccountGate("checking");
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAccountGate("checking");
    if (!authReady) return;
    void getCloudOwner().then((owner) => {
      if (!cancelled) setAccountGate(currentUser && owner && owner !== currentUser.uid ? "blocked" : "allowed");
    }).catch(() => { if (!cancelled) setAccountGate("blocked"); });
    return () => { cancelled = true; };
  }, [currentUser, authReady]);

  // Apply Theme & Font Size to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (settings.fontSize === "large") {
      root.style.fontSize = "17px";
    } else if (settings.fontSize === "medium") {
      root.style.fontSize = "16px";
    } else {
      root.style.fontSize = "15px";
    }
  }, [settings.theme, settings.fontSize]);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = StorageService.updateUserSettings(newSettings);
    setSettings(updated);
    setDailyGoal(StorageService.getDailyGoalProgress());
    if (currentUser) {
      void FirebaseService.saveUserSettings(currentUser.uid, updated).catch((error) => console.error("Falha ao sincronizar configurações:", error));
    }
  };

  // Update Study Goals (Fase 3F)
  const handleUpdateStudyGoals = (goals: {
    questionsTarget?: number;
    timeMinutesTarget?: number;
    weeklyDaysTarget?: number;
  }) => {
    const updatedGoal = StorageService.updateStudyGoals(goals);
    setSettings(StorageService.getUserSettings());
    setDailyGoal(updatedGoal);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === "dark" ? "light" : "dark";
    handleUpdateSettings({ theme: nextTheme });
  };

  // Add Question
  const handleAddQuestion = (q: Partial<Question>) => {
    const created = StorageService.addQuestion(q);
    setQuestions((prev) => [created, ...prev]);
    if (currentUser) {
      void FirebaseService.saveUserQuestion(currentUser.uid, created).catch((error) => console.error("Questão preservada localmente; sincronização pendente:", error));
    }
  };

  // Update Question
  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    const updated = StorageService.updateQuestion(id, updates);
    if (updated) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      if (currentUser) {
        void FirebaseService.saveUserQuestion(currentUser.uid, updated).catch((error) => console.error("Questão preservada localmente; sincronização pendente:", error));
      }
    }
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    StorageService.deleteQuestion(id);
    setQuestions((prev) => prev.filter((item) => item.id !== id));
  };

  // Bulk Add
  const handleBulkAddQuestions = (newQs: Partial<Question>[]): number => {
    const res = StorageService.bulkAddQuestions(newQs);
    const allQs = StorageService.getQuestions();
    setQuestions(allQs);
    if (currentUser) {
      void FirebaseService.syncQuestionsBatch(currentUser.uid, allQs).catch((error) => console.error("Falha ao sincronizar questões:", error));
    }
    return res.added;
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    const updated = StorageService.toggleFavorite(id);
    if (updated) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      if (currentUser) {
        void FirebaseService.saveUserQuestion(currentUser.uid, updated).catch((error) => console.error("Questão preservada localmente; sincronização pendente:", error));
      }
    }
  };

  // Record Answer (Processed through Central Learning Engine)
  const handleRecordAnswer = (record: AnswerHistoryRecord) => {
    const { updatedQuestion } = LearningEngine.processAnswer(record);
    setHistory(StorageService.getAnswerHistory());
    if (updatedQuestion) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === updatedQuestion.id ? updatedQuestion : item))
      );
    } else {
      setQuestions(StorageService.getQuestions());
    }
    setDailyGoal(StorageService.getDailyGoalProgress());
    if (currentUser) {
      FirebaseService.saveHistoryItem(currentUser.uid, {
        ...record,
        id: record.id || `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      }).catch((error) => console.error("Resposta preservada localmente; sincronização pendente:", error));
      if (updatedQuestion) {
        void FirebaseService.saveUserQuestion(currentUser.uid, updatedQuestion).catch((error) => console.error("Questão preservada localmente; sincronização pendente:", error));
      }
    }
  };

  // Batch Record Answers (Simulados - Processed through Central Learning Engine)
  const handleBatchRecordAnswers = (records: AnswerHistoryRecord[]) => {
    LearningEngine.processBatchAnswers(records);
    setHistory(StorageService.getAnswerHistory());
    setQuestions(StorageService.getQuestions());
    setDailyGoal(StorageService.getDailyGoalProgress());
    if (currentUser) {
      records.forEach((rec) => {
        FirebaseService.saveHistoryItem(currentUser.uid, {
          ...rec,
          id: rec.id || `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        }).catch((error) => console.error("Resposta preservada localmente; sincronização pendente:", error));
      });
    }
  };

  // Save Session
  const handleSaveSession = (session: StudySession) => {
    StorageService.saveStudySession(session);
    setSessions(StorageService.getStudySessions());
  };

  // Logout handler
  const handleLogout = async () => {
    await FirebaseService.logout();
    loadData();
  };

  // Start study session handler
  const handleStartStudy = (
    mode: "TREINO" | "DESAFIO" | "SIMULADO" | "REVISAO",
    criteria?: Partial<StudyFilterCriteria>
  ) => {
    setQuizInitialCriteria(criteria);
    if (mode === "SIMULADO") {
      setCurrentView("simulado");
    } else if (mode === "REVISAO") {
      setCurrentView("revisao");
    } else {
      setActiveStudyMode(mode);
      setCurrentView("quiz");
    }
  };

  // Computed counts for badges
  const pendingReviews = useMemo(
    () => LearningEngine.getDueReviews(questions),
    [questions]
  );
  const errorQuestions = questions.filter((q) => q.errorCount > 0);
  const favoriteQuestions = questions.filter((q) => q.isFavorite);

  // Render Splash Screen
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={handleSplashComplete}
        initializationError={initError}
        initializationReady={storageReady}
      />
    );
  }

  if (accountGate !== "allowed") {
    return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
        <h1 className="text-xl font-bold">{accountGate === "checking" ? "Verificando conta…" : "Conta incompatível com os dados locais"}</h1>
        {accountGate === "blocked" && <>
          <p>Estes dados pertencem à conta vinculada neste navegador, ou a identificação não pôde ser validada. Nenhum dado foi apagado. Saia e entre na conta original; para outra pessoa, use um perfil separado do navegador.</p>
          {currentUser && <button className="px-4 py-2 rounded bg-teal-600 text-white" onClick={handleLogout}>Sair desta conta</button>}
        </>}
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#080C14] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        dailyGoal={dailyGoal}
        reviewCount={pendingReviews.length}
        settings={settings}
        onToggleTheme={handleToggleTheme}
        onOpenAddQuestion={() => {
          setCurrentView("banco");
          setBankAddTrigger((t) => t + 1);
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Body with Sidebar + Main Content Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          reviewCount={pendingReviews.length}
          errorCount={errorQuestions.length}
          favoritesCount={favoriteQuestions.length}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          settings={settings}
        />

        {/* View Port Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {/* Storage Alert Banner (Fase 4C) */}
          {activeStorageError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Aviso de Armazenamento no Dispositivo
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    {activeStorageError.message}
                  </p>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-300/80 mt-1">
                    Seus dados anteriores permanecem preservados. Recomendamos ir em Configurações e exportar um backup JSON antes de encerrar sua sessão.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveStorageError(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. DASHBOARD */}
          {currentView === "dashboard" && (
            <DashboardView
              questions={questions}
              dailyGoal={dailyGoal}
              sessions={sessions}
              history={history}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onStartStudy={handleStartStudy}
              onNavigate={setCurrentView}
              onUpdateDailyGoalTarget={(target) =>
                handleUpdateSettings({ dailyGoalTarget: target })
              }
            />
          )}

          {/* 1.1 METAS DE ESTUDO (Fase 3F) */}
          {currentView === "metas" && (
            <GoalsView
              dailyGoal={dailyGoal}
              settings={settings}
              onUpdateStudyGoals={handleUpdateStudyGoals}
              onStartStudy={handleStartStudy}
              onNavigate={setCurrentView}
            />
          )}

          {/* 2. ESTUDAR (Study Modes Selector) */}
          {currentView === "estudar" && (
            <StudyModesView
              questions={questions}
              onStartMode={(m) => handleStartStudy(m)}
              onNavigate={setCurrentView}
            />
          )}

          {/* 3. QUIZ SESSION (Treino / Desafio) */}
          {currentView === "quiz" && (
            <QuizSession
              questions={questions}
              mode={activeStudyMode}
              initialCriteria={quizInitialCriteria}
              onFinishSession={() => setCurrentView("dashboard")}
              onRecordAnswer={handleRecordAnswer}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* 4. SIMULADO */}
          {currentView === "simulado" && (
            <SimuladoSession
              allQuestions={questions}
              onFinishSimulado={() => setCurrentView("dashboard")}
              onRecordAnswer={handleRecordAnswer}
              onBatchRecordAnswers={handleBatchRecordAnswers}
              onSaveSession={handleSaveSession}
            />
          )}

          {/* 5. REVISÃO ESPAÇADA (SM-2) */}
          {currentView === "revisao" && (
            <SpacedReviewSession
              queue={pendingReviews}
              allQuestions={questions}
              onUpdateQuestion={handleUpdateQuestion}
              onRecordAnswer={handleRecordAnswer}
              onFinish={() => setCurrentView("dashboard")}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* 6. BANCO DE QUESTÕES */}
          {currentView === "banco" && (
            <QuestionBankView
              questions={questions}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onBulkAddQuestions={handleBulkAddQuestions}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* 7. MINHA MEMÓRIA & ÁRVORE DE CONHECIMENTO */}
          {currentView === "memoria" && (
            <MemoryMapView
              questions={questions}
              onStartReview={() => handleStartStudy("REVISAO")}
              onFilterSubjectInBank={() => setCurrentView("banco")}
            />
          )}

          {/* 8. ESTATÍSTICAS */}
          {currentView === "estatisticas" && (
            <StatisticsView
              questions={questions}
              history={history}
              sessions={sessions}
              onNavigate={setCurrentView}
            />
          )}

          {/* 9. IA MEMORA+ (GEMINI) */}
          {currentView === "ia" && (
            <AiGeneratorView
              onBulkAddQuestions={handleBulkAddQuestions}
              onFinish={() => setCurrentView("banco")}
            />
          )}

          {/* 10. FAVORITOS */}
          {currentView === "favoritos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                    <span>Questões Favoritas</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {favoriteQuestions.length} questões selecionadas como prioridade
                  </p>
                </div>
                {favoriteQuestions.length > 0 && (
                  <button
                    onClick={() =>
                      handleStartStudy("TREINO", { performanceFilter: "FAVORITAS" })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Treinar Favoritas</span>
                  </button>
                )}
              </div>

              {favoriteQuestions.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Bookmark className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma questão favoritada ainda
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ao responder ou explorar o banco, clique no ícone de marcador para salvar questões aqui.
                  </p>
                </div>
              ) : (
                <QuestionBankView
                  questions={favoriteQuestions}
                  onAddQuestion={handleAddQuestion}
                  onUpdateQuestion={handleUpdateQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onBulkAddQuestions={handleBulkAddQuestions}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </div>
          )}

          {/* 11. QUESTÕES ERRADAS */}
          {currentView === "erradas" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span>Banco de Questões com Erros</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {errorQuestions.length} questões com registros de falha para recuperação
                  </p>
                </div>
                {errorQuestions.length > 0 && (
                  <button
                    onClick={() =>
                      handleStartStudy("TREINO", { performanceFilter: "RECENTES_ERRADAS" })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Treinar Apenas as Erradas</span>
                  </button>
                )}
              </div>

              {errorQuestions.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                  <AlertCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhum erro registrado!
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Você acertou todas as questões praticadas até agora. Continue assim!
                  </p>
                </div>
              ) : (
                <QuestionBankView
                  questions={errorQuestions}
                  onAddQuestion={handleAddQuestion}
                  onUpdateQuestion={handleUpdateQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onBulkAddQuestions={handleBulkAddQuestions}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </div>
          )}

          {/* 12. MANUAL DE USO */}
          {currentView === "manual" && (
            <UserManualView onNavigate={setCurrentView} />
          )}

          {/* 13. CONFIGURAÇÕES & DADOS */}
          {currentView === "configuracoes" && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onRefreshAllData={loadData}
              questionsCount={questions.length}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Cloud Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        customBrandName={settings.customBrandName}
        customLogoUrl={settings.customLogoUrl}
        onSuccess={loadData}
      />
    </div>
  );
}
