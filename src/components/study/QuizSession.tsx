import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AnswerHistoryRecord,
  OptionLetter,
  Question,
  StudyModeType,
} from "../../types";
import { LearningEngine, StudyFilterCriteria } from "../../services/learningEngine";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Bookmark,
  Award,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Play,
  Filter,
  Sliders,
  Sparkles,
  ChevronRight,
  Shuffle,
  ListOrdered,
  Layers,
  ArrowLeft,
} from "lucide-react";

interface QuizSessionProps {
  questions: Question[];
  mode: StudyModeType; // "TREINO" or "DESAFIO"
  initialCriteria?: Partial<StudyFilterCriteria>;
  onFinishSession: () => void;
  onRecordAnswer: (record: AnswerHistoryRecord) => void;
  onToggleFavorite: (id: string) => void;
}

type QuizPhase = "SETUP" | "ACTIVE" | "RESULT";
type PerformanceFilterType = "TODAS" | "RECENTES_ERRADAS" | "NUNCA_RESPONDIDAS" | "FAVORITAS";

export const QuizSession: React.FC<QuizSessionProps> = ({
  questions,
  mode,
  initialCriteria,
  onFinishSession,
  onRecordAnswer,
  onToggleFavorite,
}) => {
  // Phase state
  const [phase, setPhase] = useState<QuizPhase>("SETUP");

  // Setup form states
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(
    initialCriteria?.discipline || "TODOS"
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialCriteria?.subject || "TODOS"
  );
  const [selectedTopic, setSelectedTopic] = useState<string>(
    initialCriteria?.topic || "TODOS"
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(
    initialCriteria?.difficulty || "TODOS"
  );
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilterType>(
    initialCriteria?.onlyFavorites
      ? "FAVORITAS"
      : initialCriteria?.onlyErrors
      ? "RECENTES_ERRADAS"
      : (initialCriteria?.performanceFilter as PerformanceFilterType) || "TODAS"
  );
  const [selectedQuantity, setSelectedQuantity] = useState<number>(
    initialCriteria?.limit || 20
  );
  const [customQuantity, setCustomQuantity] = useState<string>("");
  const [isCustomQty, setIsCustomQty] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);

  // Active quiz session states
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionLetter | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const sessionTotalTimeMsRef = useRef<number>(0);

  // Timer states
  const questionStartTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Extract unique subjects and disciplines from questions
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    questions.forEach((q) => {
      if (q.subject && q.subject.trim()) subs.add(q.subject.trim());
      if (q.discipline && q.discipline.trim()) subs.add(q.discipline.trim());
    });
    return Array.from(subs).sort();
  }, [questions]);

  // Extract unique topics based on selected subject
  const availableTopics = useMemo(() => {
    const tops = new Set<string>();
    questions.forEach((q) => {
      if (
        selectedSubject === "TODOS" ||
        q.subject === selectedSubject ||
        q.discipline === selectedSubject
      ) {
        if (q.topic && q.topic.trim()) tops.add(q.topic.trim());
      }
    });
    return Array.from(tops).sort();
  }, [questions, selectedSubject]);

  // Filter matching questions in real-time for configuration preview
  const matchingQuestions = useMemo(() => {
    const criteria: StudyFilterCriteria = {
      subject: selectedSubject !== "TODOS" ? selectedSubject : undefined,
      topic: selectedTopic !== "TODOS" ? selectedTopic : undefined,
      difficulty: selectedDifficulty !== "TODOS" ? selectedDifficulty : undefined,
      performanceFilter,
      shuffle: false, // Don't shuffle while counting
    };
    return LearningEngine.getQuestionsForStudy(questions, criteria);
  }, [
    questions,
    selectedSubject,
    selectedTopic,
    selectedDifficulty,
    performanceFilter,
  ]);

  // Total available matching
  const matchingCount = matchingQuestions.length;

  // Effective quantity requested
  const effectiveQty = useMemo(() => {
    if (isCustomQty) {
      const parsed = parseInt(customQuantity, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.min(parsed, matchingCount);
      }
      return Math.min(10, matchingCount);
    }
    if (selectedQuantity === -1) {
      return matchingCount;
    }
    return Math.min(selectedQuantity, matchingCount);
  }, [isCustomQty, customQuantity, selectedQuantity, matchingCount]);

  // Start study session
  const handleStartSession = () => {
    if (matchingCount === 0) return;

    let targetQuestions = [...matchingQuestions];
    if (shuffleQuestions) {
      targetQuestions = targetQuestions.sort(() => Math.random() - 0.5);
    }
    if (effectiveQty > 0) {
      targetQuestions = targetQuestions.slice(0, effectiveQty);
    }

    setSessionQuestions(targetQuestions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeOut(false);
    setScore({ correct: 0, wrong: 0 });
    sessionTotalTimeMsRef.current = 0;
    questionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setPhase("ACTIVE");
  };

  // Active question references
  const currentQ = sessionQuestions[currentIndex];
  const totalQuestions = sessionQuestions.length;
  const timeLimitSeconds = currentQ ? currentQ.estimatedTime || 60 : 60;
  const isChallenge = mode === "DESAFIO";

  // Reset timer on question change in ACTIVE mode
  useEffect(() => {
    if (phase !== "ACTIVE") return;
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeOut(false);
    questionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);
  }, [currentIndex, phase]);

  // Real timestamp interval tracking during ACTIVE mode
  useEffect(() => {
    if (phase !== "ACTIVE" || isAnswered || !currentQ) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.floor((now - questionStartTimeRef.current) / 1000);
      setElapsedSeconds(diffSec);

      // In DESAFIO mode: enforce exact timestamp timeout
      if (isChallenge && diffSec >= timeLimitSeconds) {
        setIsTimeOut(true);
        setIsAnswered(true);
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        onRecordAnswer({
          id: `rec-${Date.now()}-${currentQ.id}`,
          questionId: currentQ.id,
          selectedOption: undefined,
          isCorrect: false,
          timeSpentMs: timeLimitSeconds * 1000,
          timestamp: new Date().toISOString(),
          mode,
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [phase, isAnswered, isChallenge, timeLimitSeconds, currentQ, mode, onRecordAnswer]);

  // Keyboard shortcut listener (A, B, C, D, E, 1, 2, 3, 4, 5, Enter)
  useEffect(() => {
    if (phase !== "ACTIVE") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      const key = e.key.toUpperCase();
      if (key === "A" || key === "1") handleSelect("A");
      if (key === "B" || key === "2") handleSelect("B");
      if (key === "C" || key === "3") handleSelect("C");
      if (key === "D" || key === "4") handleSelect("D");
      if (key === "E" || key === "5") handleSelect("E");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isAnswered, selectedOption, currentIndex]);

  // Handle option selection
  const handleSelect = (option: OptionLetter) => {
    if (isAnswered || !currentQ) return;

    // Verify option exists on question
    if (option === "E" && !currentQ.optionE) return;

    const timeSpentMs = Math.max(1000, Date.now() - questionStartTimeRef.current);
    sessionTotalTimeMsRef.current += timeSpentMs;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQ.correctOption;
    if (isCorrect) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    // Normal answer dispatch to central Learning Engine
    // NOTE: Does NOT send reviewRating so SM-2 is not triggered for regular treino
    onRecordAnswer({
      id: `rec-${Date.now()}-${currentQ.id}`,
      questionId: currentQ.id,
      selectedOption: option,
      isCorrect,
      timeSpentMs,
      timestamp: new Date().toISOString(),
      mode,
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPhase("RESULT");
    }
  };

  const handleRestartSameConfig = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeOut(false);
    setScore({ correct: 0, wrong: 0 });
    sessionTotalTimeMsRef.current = 0;
    questionStartTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setPhase("ACTIVE");
  };

  // ==========================================
  // PHASE 1: CONFIGURAÇÃO DO TREINO (SETUP)
  // ==========================================
  if (phase === "SETUP") {
    const isDesafio = mode === "DESAFIO";

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`p-1.5 rounded-lg ${
                  isDesafio
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                }`}
              >
                {isDesafio ? <Clock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDesafio
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-teal-600 dark:text-teal-400"
                }`}
              >
                {isDesafio ? "Configuração do Desafio" : "Configuração do Treino"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {isDesafio ? "Prática com Tempo Cronometrado" : "Prática Pedagógica com Feedback Imediato"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Filtre matérias, quantidade e histórico para direcionar seus estudos de forma precisa.
            </p>
          </div>

          <button
            onClick={onFinishSession}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar ao Painel
          </button>
        </div>

        {/* Configuration Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* 1. Quantidade de Questões */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>1. Quantidade de Questões</span>
              <span className="text-[11px] font-normal text-slate-500">
                Disponíveis: {matchingCount}
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {[10, 20, 30, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => {
                    setIsCustomQty(false);
                    setSelectedQuantity(qty);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    !isCustomQty && selectedQuantity === qty
                      ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {qty} questões
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setIsCustomQty(false);
                  setSelectedQuantity(-1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  !isCustomQty && selectedQuantity === -1
                    ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                Todas ({matchingCount})
              </button>

              <button
                type="button"
                onClick={() => setIsCustomQty(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isCustomQty
                    ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                Personalizado...
              </button>
            </div>

            {isCustomQty && (
              <div className="pt-1 flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max={matchingCount || 100}
                  placeholder={`Digite até ${matchingCount}`}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  className="w-48 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-mono"
                />
                <span className="text-[11px] text-slate-500">
                  (Máximo disponível: {matchingCount})
                </span>
              </div>
            )}
          </div>

          {/* 2. Filtro por Desempenho e Histórico */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Filtro por Desempenho
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  id: "TODAS" as PerformanceFilterType,
                  label: "Todas as Questões",
                  desc: "Acervo completo",
                },
                {
                  id: "RECENTES_ERRADAS" as PerformanceFilterType,
                  label: "Errei Recentemente",
                  desc: "Última resposta incorreta",
                },
                {
                  id: "NUNCA_RESPONDIDAS" as PerformanceFilterType,
                  label: "Nunca Respondi",
                  desc: "Itens novos e não estudados",
                },
                {
                  id: "FAVORITAS" as PerformanceFilterType,
                  label: "Favoritas",
                  desc: "Marcadas com estrela",
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPerformanceFilter(f.id)}
                  className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                    performanceFilter === f.id
                      ? "bg-teal-50/80 dark:bg-teal-950/30 border-teal-500 text-teal-900 dark:text-teal-200"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold">{f.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Disciplina / Matéria & Tópico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                3. Matéria / Disciplina
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTopic("TODOS");
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="TODOS">Todas as Matérias ({questions.length})</option>
                {availableSubjects.map((sub) => {
                  const count = questions.filter(
                    (q) => q.subject === sub || q.discipline === sub
                  ).length;
                  return (
                    <option key={sub} value={sub}>
                      {sub} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                4. Assunto / Tópico
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="TODOS">Todos os Assuntos</option>
                {availableTopics.map((top) => {
                  const count = questions.filter((q) => {
                    const matchSub =
                      selectedSubject === "TODOS" ||
                      q.subject === selectedSubject ||
                      q.discipline === selectedSubject;
                    return matchSub && q.topic === top;
                  }).length;
                  return (
                    <option key={top} value={top}>
                      {top} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 4. Dificuldade & Ordem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                5. Nível de Dificuldade
              </label>
              <div className="flex items-center gap-1.5">
                {["TODOS", "Fácil", "Médio", "Difícil"].map((dif) => (
                  <button
                    key={dif}
                    type="button"
                    onClick={() => setSelectedDifficulty(dif)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      selectedDifficulty === dif
                        ? "bg-teal-600 border-teal-600 text-white font-bold"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {dif === "TODOS" ? "Todos" : dif}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                6. Sequência das Questões
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShuffleQuestions(true)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    shuffleQuestions
                      ? "bg-teal-600 border-teal-600 text-white font-bold"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Embaralhada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShuffleQuestions(false)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    !shuffleQuestions
                      ? "bg-teal-600 border-teal-600 text-white font-bold"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Ordem Original</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Summary & Start Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">
                {effectiveQty} {effectiveQty === 1 ? "questão selecionada" : "questões selecionadas"}
              </span>{" "}
              (de {matchingCount} compatíveis no banco)
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onFinishSession}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={matchingCount === 0}
                onClick={handleStartSession}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors ${
                  matchingCount === 0
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-500 text-white"
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Treino ({effectiveQty})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PHASE 3: RESULTADO DA SESSÃO (RESULT)
  // ==========================================
  if (phase === "RESULT") {
    const totalAnswered = score.correct + score.wrong;
    const accuracy = totalAnswered > 0 ? Math.round((score.correct / totalAnswered) * 100) : 0;
    const totalSec = Math.round(sessionTotalTimeMsRef.current / 1000);
    const avgSec = totalAnswered > 0 ? Math.round(totalSec / totalAnswered) : 0;

    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {mode === "DESAFIO" ? "Desafio Concluído!" : "Treino Concluído!"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {accuracy >= 70
              ? "Excelente desempenho! Sua retenção está avançando solidamente."
              : "Bom esforço! A repetição constante é o segredo da consolidação da memória."}
          </p>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {totalAnswered}
            </div>
            <div className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">
              Respondidas
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {score.correct}
            </div>
            <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Acertos
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {score.wrong}
            </div>
            <div className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              Erros
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {accuracy}%
            </div>
            <div className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              Aproveitamento
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Tempo total: {totalSec}s (média de {avgSec}s por questão)
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRestartSameConfig}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Treinar Novamente
          </button>
          <button
            onClick={() => setPhase("SETUP")}
            className="px-4 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700/60 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
          >
            Nova Configuração
          </button>
          <button
            onClick={onFinishSession}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PHASE 2: EXPERIÊNCIA DA QUESTÃO (ACTIVE)
  // ==========================================
  if (!currentQ || totalQuestions === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Nenhuma questão disponível para este modo
        </h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Adicione questões ao seu banco ou modifique os filtros selecionados.
        </p>
        <button
          onClick={() => setPhase("SETUP")}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white"
        >
          Ajustar Filtros
        </button>
      </div>
    );
  }

  const isCorrect = selectedOption === currentQ.correctOption;
  const remainingTime = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const timeProgressPercent = Math.min(100, (elapsedSeconds / timeLimitSeconds) * 100);

  const optionsList: { letter: OptionLetter; text: string }[] = [
    { letter: "A", text: currentQ.optionA },
    { letter: "B", text: currentQ.optionB },
    { letter: "C", text: currentQ.optionC },
    { letter: "D", text: currentQ.optionD },
    ...(currentQ.optionE ? [{ letter: "E" as OptionLetter, text: currentQ.optionE }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Top Session Progress Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {mode === "DESAFIO" ? "Modo Desafio" : "Modo Treino"}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-semibold text-slate-500">
              Questão {currentIndex + 1} de {totalQuestions}
            </span>
          </div>

          {/* Timer Display */}
          {isChallenge ? (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  remainingTime <= 10
                    ? "bg-rose-500/10 text-rose-600 border-rose-400 animate-pulse"
                    : "bg-amber-500/10 text-amber-600 border-amber-400"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono">{remainingTime}s</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedSeconds}s decorridos</span>
            </div>
          )}

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
              onClick={() => setPhase("SETUP")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-md"
            >
              Encerrar
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-teal-500 to-indigo-500 transition-all duration-300"
            style={{
              width: `${Math.round(((currentIndex + (isAnswered ? 1 : 0)) / Math.max(1, totalQuestions)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Badges: Discipline, Subject, Topic, Difficulty */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            {currentQ.discipline || currentQ.subject}
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {currentQ.topic}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentQ.difficulty === "Fácil"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-300/40"
                : currentQ.difficulty === "Difícil"
                ? "bg-rose-500/10 text-rose-600 border border-rose-300/40"
                : "bg-amber-500/10 text-amber-600 border border-amber-300/40"
            }`}
          >
            {currentQ.difficulty}
          </span>
        </div>

        {/* Question Statement */}
        <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          {currentQ.question}
        </div>

        {/* Alternatives (A, B, C, D, E) */}
        <div className="space-y-3 pt-2">
          {optionsList.map((opt) => {
            const isChosen = selectedOption === opt.letter;
            const isThisCorrect = opt.letter === currentQ.correctOption;

            let btnStyle =
              "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-teal-500/50 hover:bg-teal-50/20";
            let badgeStyle =
              "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600";

            if (isAnswered) {
              if (isThisCorrect) {
                btnStyle =
                  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs";
                badgeStyle = "bg-emerald-600 text-white border-emerald-600";
              } else if (isChosen && !isThisCorrect) {
                btnStyle =
                  "bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-950 dark:text-rose-100";
                badgeStyle = "bg-rose-600 text-white border-rose-600";
              } else {
                btnStyle =
                  "opacity-50 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500";
              }
            }

            return (
              <button
                key={opt.letter}
                disabled={isAnswered}
                onClick={() => handleSelect(opt.letter)}
                className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-150 relative ${btnStyle}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs border ${badgeStyle}`}
                >
                  {opt.letter}
                </div>
                <div className="text-xs sm:text-sm leading-relaxed pt-0.5 flex-1 text-slate-800 dark:text-slate-200">
                  {opt.text}
                </div>

                {isAnswered && isThisCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
                {isAnswered && isChosen && !isThisCorrect && (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Timeout Banner if time exceeded */}
        {isTimeOut && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-400/60 text-rose-700 dark:text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <div>
              <div className="text-xs font-bold uppercase">TEMPO ESGOTADO</div>
              <div className="text-xs">
                O limite de {timeLimitSeconds}s desta questão foi atingido. Veja a resolução abaixo:
              </div>
            </div>
          </div>
        )}

        {/* Immediate Pedagogical Feedback & Commentary */}
        {isAnswered && (
          <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Comentário & Resolução Mnemosyne
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isCorrect
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                }`}
              >
                {isCorrect ? "Resposta Correta (+1)" : `Incorreta (Gabarito: Letra ${currentQ.correctOption})`}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentQ.explanation}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>Tempo gasto:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {elapsedSeconds} segundos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 hidden sm:inline">Pressione Enter ou clique em</span>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>{currentIndex < totalQuestions - 1 ? "Próxima Questão" : "Ver Resultado"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Session Summary Stats */}
      <div className="flex items-center justify-between px-4 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{score.correct} acertos</span>
          </span>
          <span className="flex items-center gap-1 text-rose-600 font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>{score.wrong} erros</span>
          </span>
        </div>
        <span>Atalhos: Teclas A, B, C, D, E ou 1, 2, 3, 4, 5</span>
      </div>
    </div>
  );
};
