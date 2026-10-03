import React, { useState, useMemo, useRef } from "react";
import {
  AnswerHistoryRecord,
  OptionLetter,
  Question,
  SpacedReviewRating,
} from "../../types";
import {
  calculateSpacedReview,
  formatIntervalPreview,
} from "../../services/spacedRepetition";
import { LearningEngine } from "../../services/learningEngine";
import {
  RotateCcw,
  CheckCircle2,
  Eye,
  Award,
  Bookmark,
  Calendar,
  Layers,
  Clock,
  AlertTriangle,
  Search,
  Play,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface SpacedReviewSessionProps {
  queue?: Question[];
  allQuestions?: Question[];
  onUpdateQuestion?: (id: string, updates: Partial<Question>) => void;
  onRecordAnswer: (record: AnswerHistoryRecord) => void;
  onFinish: () => void;
  onToggleFavorite: (id: string) => void;
}

type ReviewViewMode = "LOBBY" | "ACTIVE" | "COMPLETED";
type LobbyFilterTab = "TODAS" | "ATRASADAS" | "HOJE";

export const SpacedReviewSession: React.FC<SpacedReviewSessionProps> = ({
  queue = [],
  allQuestions = [],
  onRecordAnswer,
  onFinish,
  onToggleFavorite,
}) => {
  // Determine full pool of questions for analysis
  const pool = useMemo(() => {
    if (allQuestions && allQuestions.length > 0) return allQuestions;
    return queue;
  }, [allQuestions, queue]);

  // Use the Learning Engine's queue classification (preserves SM-2 logic & priority)
  const queueDetails = useMemo(() => {
    return LearningEngine.getReviewQueueDetails(pool);
  }, [pool]);

  // Session state
  const [viewMode, setViewMode] = useState<ReviewViewMode>("LOBBY");
  const [lobbyFilter, setLobbyFilter] = useState<LobbyFilterTab>("TODAS");
  const [lobbySearch, setLobbySearch] = useState("");

  // Active flashcard queue
  const [activeQueue, setActiveQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<OptionLetter | null>(null);

  // Stats for session completion summary
  const [sessionStats, setSessionStats] = useState({
    totalReviewed: 0,
    ratingCounts: {
      NAO_LEMBRO: 0,
      DIFICIL: 0,
      BOM: 0,
      FACIL: 0,
    },
    promotedToDominada: 0,
  });

  const questionStartTimeRef = useRef<number>(Date.now());

  // Filtered queue in Lobby
  const filteredLobbyList = useMemo(() => {
    let list: Question[] = [];
    if (lobbyFilter === "ATRASADAS") {
      list = queueDetails.overdue;
    } else if (lobbyFilter === "HOJE") {
      list = queueDetails.dueToday;
    } else {
      list = queueDetails.queue;
    }

    if (!lobbySearch.trim()) return list;
    const term = lobbySearch.toLowerCase();
    return list.filter(
      (q) =>
        q.question.toLowerCase().includes(term) ||
        q.subject.toLowerCase().includes(term) ||
        q.topic.toLowerCase().includes(term) ||
        (q.discipline && q.discipline.toLowerCase().includes(term))
    );
  }, [queueDetails, lobbyFilter, lobbySearch]);

  // Upcoming scheduled questions (for empty state or future planning)
  const upcomingSchedule = useMemo(() => {
    const now = Date.now();
    return pool
      .filter((q) => {
        if (!q.nextReviewDate) return false;
        const t = new Date(q.nextReviewDate).getTime();
        return t > now && q.memoryState !== "REVISAR";
      })
      .sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
      )
      .slice(0, 5);
  }, [pool]);

  // Start review with a chosen subset
  const handleStartReview = (selectedItems?: Question[]) => {
    const targetQueue = selectedItems && selectedItems.length > 0 ? selectedItems : queueDetails.queue;
    if (targetQueue.length === 0) return;

    setActiveQueue(targetQueue);
    setCurrentIndex(0);
    setIsRevealed(false);
    setSelectedOption(null);
    questionStartTimeRef.current = Date.now();
    setViewMode("ACTIVE");
  };

  // Helper to format days overdue or scheduled date
  const formatOverdueBadge = (q: Question) => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    if (q.memoryState === "REVISAR") {
      return {
        label: "Atenção Prioritária (Erro Prévio)",
        isOverdue: true,
        urgencyColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900/50",
      };
    }

    if (!q.nextReviewDate) {
      return {
        label: "Pendente",
        isOverdue: true,
        urgencyColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
      };
    }

    const reviewTime = new Date(q.nextReviewDate).getTime();
    if (reviewTime < startOfToday) {
      const days = Math.max(1, Math.round((startOfToday - reviewTime) / 86400000));
      return {
        label: `Atrasada há ${days} ${days === 1 ? "dia" : "dias"}`,
        isOverdue: true,
        urgencyColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900/50",
      };
    }

    return {
      label: "Programada para hoje",
      isOverdue: false,
      urgencyColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-900/50",
    };
  };

  // Active question in flashcard mode
  const currentQ = activeQueue[currentIndex];

  // Handle rating click in active flashcard
  const handleRating = (rating: SpacedReviewRating) => {
    if (!currentQ) return;
    const timeSpentMs = Math.max(1000, Date.now() - questionStartTimeRef.current);

    // Calculate prediction before dispatch
    const preview = calculateSpacedReview(currentQ, rating);

    // Single atomic write pass via LearningEngine
    onRecordAnswer({
      id: `review-${Date.now()}-${currentQ.id}`,
      questionId: currentQ.id,
      selectedOption: selectedOption || undefined,
      isCorrect: rating !== "NAO_LEMBRO",
      timeSpentMs,
      timestamp: new Date().toISOString(),
      mode: "REVISAO",
      reviewRating: rating,
    });

    // Update session summary statistics
    setSessionStats((prev) => ({
      totalReviewed: prev.totalReviewed + 1,
      ratingCounts: {
        ...prev.ratingCounts,
        [rating]: prev.ratingCounts[rating] + 1,
      },
      promotedToDominada:
        preview.memoryState === "DOMINADA"
          ? prev.promotedToDominada + 1
          : prev.promotedToDominada,
    }));

    // Advance to next question or complete
    if (currentIndex + 1 < activeQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setSelectedOption(null);
      questionStartTimeRef.current = Date.now();
    } else {
      setViewMode("COMPLETED");
    }
  };

  // ==========================================
  // VIEW 1: LOBBY / FILA DE REVISÃO
  // ==========================================
  if (viewMode === "LOBBY") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Repetição Espaçada — Algoritmo SM-2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Fila de Revisão Ativa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Intervenha exatamente antes da perda de memória para consolidar retenção de longo prazo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onFinish}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Voltar ao Painel
            </button>
            {queueDetails.totalCount > 0 && (
              <button
                onClick={() => handleStartReview()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Revisar Todas ({queueDetails.totalCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Cards for Queue Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Disponíveis */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Disponíveis para Revisão</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {queueDetails.totalCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Questões aguardando intervenção no ciclo
            </p>
          </div>

          {/* Card 2: Atrasadas (Overdue) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Atrasadas (Prioritárias)</span>
              </span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {queueDetails.overdueCount}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-slate-500">
                {queueDetails.overdueCount > 0
                  ? "Vencidas antes de hoje ou com erro"
                  : "Nenhuma questão em atraso!"}
              </p>
              {queueDetails.overdueCount > 0 && (
                <button
                  onClick={() => handleStartReview(queueDetails.overdue)}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Revisar só atrasadas →
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Para Hoje */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Para Revisar Hoje</span>
              <Calendar className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
              {queueDetails.dueTodayCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Ciclo programado pelo SM-2 para hoje
            </p>
          </div>
        </div>

        {/* Fila Vazia ou Em Dia */}
        {queueDetails.totalCount === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Fila de Revisão em Dia!
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Você não possui questões atrasadas ou agendadas para hoje. O algoritmo SM-2 protegeu sua retenção contra a curva do esquecimento.
              </p>
            </div>

            {/* Próximas programadas */}
            {upcomingSchedule.length > 0 && (
              <div className="max-w-lg mx-auto pt-4 text-left border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Próximas revisões programadas no acervo:
                </div>
                {upcomingSchedule.map((q) => {
                  const dateStr = q.nextReviewDate
                    ? new Date(q.nextReviewDate).toLocaleDateString("pt-BR")
                    : "Em breve";
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {q.subject}:
                        </span>{" "}
                        <span className="text-slate-500">{q.topic}</span>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                        {dateStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Question Queue List with Filters and Search */
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Filter Tabs and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setLobbyFilter("TODAS")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    lobbyFilter === "TODAS"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todas ({queueDetails.totalCount})
                </button>
                <button
                  onClick={() => setLobbyFilter("ATRASADAS")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    lobbyFilter === "ATRASADAS"
                      ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Atrasadas ({queueDetails.overdueCount})
                </button>
                <button
                  onClick={() => setLobbyFilter("HOJE")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    lobbyFilter === "HOJE"
                      ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Para Hoje ({queueDetails.dueTodayCount})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar na fila..."
                  value={lobbySearch}
                  onChange={(e) => setLobbySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* List of items */}
            {filteredLobbyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma questão encontrada para este filtro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLobbyList.map((q, idx) => {
                  const badgeInfo = formatOverdueBadge(q);
                  return (
                    <div
                      key={q.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {q.subject}
                          </span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {q.topic}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeInfo.urgencyColor}`}
                          >
                            {badgeInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span>Estado: {q.memoryState}</span>
                          <span>EF: {(q.easeFactor || 2.5).toFixed(2)}</span>
                          <span>Repetições: {q.repetitionCount || 0}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleStartReview([q])}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Revisar esta</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: COMPLETED SESSION SUMMARY
  // ==========================================
  if (viewMode === "COMPLETED") {
    const total = sessionStats.totalReviewed;
    const recalledCount =
      sessionStats.ratingCounts.BOM + sessionStats.ratingCounts.FACIL;
    const accuracy = total > 0 ? Math.round((recalledCount / total) * 100) : 0;

    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Sessão de Revisão Concluída!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            As respostas foram processadas pelo algoritmo SM-2 e salvas com sucesso.
          </p>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {total}
            </div>
            <div className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">
              Revisadas
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {sessionStats.ratingCounts.FACIL}
            </div>
            <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Fácil
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40">
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono">
              {sessionStats.ratingCounts.BOM}
            </div>
            <div className="text-[10px] uppercase font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
              Bom
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {sessionStats.ratingCounts.NAO_LEMBRO}
            </div>
            <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              Não Lembro
            </div>
          </div>
        </div>

        {sessionStats.promotedToDominada > 0 && (
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>
              {sessionStats.promotedToDominada}{" "}
              {sessionStats.promotedToDominada === 1
                ? "questão foi promovida para DOMINADA!"
                : "questões foram promovidas para DOMINADA!"}
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setViewMode("LOBBY")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Ver Fila de Revisão
          </button>
          <button
            onClick={onFinish}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE FLASHCARD REVIEW SESSION
  // ==========================================
  if (!currentQ) {
    return (
      <div className="max-w-md mx-auto text-center p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Sessão finalizada
        </h3>
        <button
          onClick={() => setViewMode("LOBBY")}
          className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs"
        >
          Voltar à Fila
        </button>
      </div>
    );
  }

  // Previews of intervals for the 4 ratings on current question
  const previewNo = calculateSpacedReview(currentQ, "NAO_LEMBRO");
  const previewHard = calculateSpacedReview(currentQ, "DIFICIL");
  const previewGood = calculateSpacedReview(currentQ, "BOM");
  const previewEasy = calculateSpacedReview(currentQ, "FACIL");

  const badgeInfo = formatOverdueBadge(currentQ);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Top Session Progress Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Revisão SM-2
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-semibold text-slate-500">
              Questão {currentIndex + 1} de {activeQueue.length}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeInfo.urgencyColor}`}
            >
              {badgeInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(currentQ.id)}
              className={`p-2 rounded-lg border transition-colors ${
                currentQ.isFavorite
                  ? "bg-amber-500/10 border-amber-400 text-amber-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500"
              }`}
              title="Favoritar questão"
            >
              <Bookmark className={`w-4 h-4 ${currentQ.isFavorite ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={() => setViewMode("LOBBY")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-md"
            >
              Pausar
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-teal-500 to-indigo-500 transition-all duration-300"
            style={{
              width: `${Math.round(((currentIndex + 1) / Math.max(1, activeQueue.length)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Review Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            {currentQ.subject}
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {currentQ.topic}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500">
            Estado atual: {currentQ.memoryState}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400">
            EF: {(currentQ.easeFactor || 2.5).toFixed(2)}
          </span>
        </div>

        {/* Statement */}
        <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          {currentQ.question}
        </div>

        {/* Alternatives */}
        <div className="space-y-2.5 pt-1">
          {[
            { letter: "A" as OptionLetter, text: currentQ.optionA },
            { letter: "B" as OptionLetter, text: currentQ.optionB },
            { letter: "C" as OptionLetter, text: currentQ.optionC },
            { letter: "D" as OptionLetter, text: currentQ.optionD },
            ...(currentQ.optionE ? [{ letter: "E" as OptionLetter, text: currentQ.optionE }] : []),
          ].map((opt) => {
            const isCorrect = opt.letter === currentQ.correctOption;
            let style = "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80";

            if (isRevealed) {
              if (isCorrect) {
                style =
                  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-semibold";
              } else if (selectedOption === opt.letter) {
                style =
                  "bg-rose-50 dark:bg-rose-950/20 border-rose-400 text-rose-800 dark:text-rose-200";
              }
            } else if (selectedOption === opt.letter) {
              style =
                "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-400 text-indigo-900 dark:text-indigo-100";
            }

            return (
              <button
                key={opt.letter}
                onClick={() => {
                  if (!isRevealed) {
                    setSelectedOption(opt.letter);
                  }
                }}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-colors ${style}`}
              >
                <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
                  {opt.letter}
                </span>
                <span className="pt-0.5 flex-1">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Reveal Button if not revealed */}
        {!isRevealed ? (
          <button
            onClick={() => setIsRevealed(true)}
            className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Revelar Resposta e Gabarito</span>
          </button>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Pedagogical Commentary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span>Gabarito Correto: Letra {currentQ.correctOption}</span>
                {selectedOption && (
                  <span
                    className={
                      selectedOption === currentQ.correctOption
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-rose-600 dark:text-rose-400 font-semibold"
                    }
                  >
                    {selectedOption === currentQ.correctOption
                      ? "Você acertou sua hipótese!"
                      : `Você marcou letra ${selectedOption}`}
                  </span>
                )}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                {currentQ.explanation}
              </p>
            </div>

            {/* Evaluation Section: 4 Ratings with next interval and ease factor predictions */}
            <div className="space-y-2">
              <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Como foi sua recordação desta questão? (SM-2)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. NÃO LEMBRO */}
                <button
                  onClick={() => handleRating("NAO_LEMBRO")}
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="text-xs font-bold">NÃO LEMBRO</div>
                  <div className="mt-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      Próxima: {formatIntervalPreview(previewNo.intervalDays)}
                    </div>
                    <div className="text-[9px] text-rose-500/80 font-mono">
                      EF: {previewNo.easeFactor.toFixed(2)} (reset)
                    </div>
                  </div>
                </button>

                {/* 2. DIFÍCIL */}
                <button
                  onClick={() => handleRating("DIFICIL")}
                  className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="text-xs font-bold">DIFÍCIL</div>
                  <div className="mt-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      Próxima: {formatIntervalPreview(previewHard.intervalDays)}
                    </div>
                    <div className="text-[9px] text-amber-500/80 font-mono">
                      EF: {previewHard.easeFactor.toFixed(2)} (-0.14)
                    </div>
                  </div>
                </button>

                {/* 3. BOM */}
                <button
                  onClick={() => handleRating("BOM")}
                  className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-300 dark:border-teal-900/60 hover:bg-teal-100 dark:hover:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="text-xs font-bold">BOM</div>
                  <div className="mt-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                      Próxima: {formatIntervalPreview(previewGood.intervalDays)}
                    </div>
                    <div className="text-[9px] text-teal-500/80 font-mono">
                      EF: {previewGood.easeFactor.toFixed(2)} (mantido)
                    </div>
                  </div>
                </button>

                {/* 4. FÁCIL */}
                <button
                  onClick={() => handleRating("FACIL")}
                  className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>FÁCIL</span>
                    {previewEasy.memoryState === "DOMINADA" && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                        DOMINADA
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Próxima: {formatIntervalPreview(previewEasy.intervalDays)}
                    </div>
                    <div className="text-[9px] text-emerald-600/80 font-mono">
                      EF: {previewEasy.easeFactor.toFixed(2)} (+0.15)
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
