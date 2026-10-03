import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AnswerHistoryRecord,
  OptionLetter,
  Question,
  StudySession,
} from "../../types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FileCheck,
  AlertTriangle,
  Award,
  Filter,
  Check,
  Flag,
  HelpCircle,
  Shuffle,
  ListOrdered,
  Layers,
} from "lucide-react";

interface SimuladoSessionProps {
  allQuestions: Question[];
  onFinishSimulado: () => void;
  onRecordAnswer: (record: AnswerHistoryRecord) => void;
  onBatchRecordAnswers?: (records: AnswerHistoryRecord[]) => void;
  onSaveSession: (session: StudySession) => void;
}

type SimuladoPhase = "SETUP" | "EXAM" | "RESULT";
type ResultFilterTab = "TODAS" | "ERRADAS" | "CORRETAS";

export const SimuladoSession: React.FC<SimuladoSessionProps> = ({
  allQuestions,
  onFinishSimulado,
  onRecordAnswer,
  onBatchRecordAnswers,
  onSaveSession,
}) => {
  // Phase 1: Setup, Phase 2: Active Exam, Phase 3: Results
  const [phase, setPhase] = useState<SimuladoPhase>("SETUP");

  // Setup options
  const [selectedCount, setSelectedCount] = useState<10 | 20 | 30 | 50 | 100>(10);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("TODAS");
  const [selectedSubject, setSelectedSubject] = useState<string>("TODAS");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("TODAS");
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);

  // Exam state
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionLetter>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Timestamp exam timer
  const examStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [totalTimeLimitSeconds, setTotalTimeLimitSeconds] = useState(0);

  // Result state
  const [examResult, setExamResult] = useState<{
    total: number;
    correct: number;
    wrong: number;
    unanswered: number;
    scorePercent: number;
    totalTimeSeconds: number;
    wrongQuestions: Question[];
    subjectBreakdown: Record<string, { total: number; correct: number }>;
  } | null>(null);

  const [resultFilterTab, setResultFilterTab] = useState<ResultFilterTab>("TODAS");

  // Extract unique disciplines and subjects from question bank
  const availableDisciplines = useMemo(() => {
    const discSet = new Set<string>();
    allQuestions.forEach((q) => {
      if (q.discipline && q.discipline.trim()) discSet.add(q.discipline.trim());
      else if (q.subject && q.subject.trim()) discSet.add(q.subject.trim());
    });
    return Array.from(discSet).sort();
  }, [allQuestions]);

  const availableSubjects = useMemo(() => {
    const subSet = new Set<string>();
    allQuestions.forEach((q) => {
      if (
        selectedDiscipline === "TODAS" ||
        q.discipline === selectedDiscipline ||
        q.subject === selectedDiscipline
      ) {
        if (q.subject && q.subject.trim()) subSet.add(q.subject.trim());
      }
    });
    return Array.from(subSet).sort();
  }, [allQuestions, selectedDiscipline]);

  // Real-time matching questions based on setup filters
  const matchingQuestions = useMemo(() => {
    let list = [...allQuestions];

    if (selectedDiscipline !== "TODAS") {
      list = list.filter(
        (q) => q.discipline === selectedDiscipline || q.subject === selectedDiscipline
      );
    }

    if (selectedSubject !== "TODAS") {
      list = list.filter((q) => q.subject === selectedSubject);
    }

    if (selectedDifficulty !== "TODAS") {
      list = list.filter((q) => q.difficulty === selectedDifficulty);
    }

    return list;
  }, [allQuestions, selectedDiscipline, selectedSubject, selectedDifficulty]);

  const matchingCount = matchingQuestions.length;

  // Effective count to be used for the exam
  const effectiveCount = Math.min(selectedCount, matchingCount);

  // Start Simulado
  const handleStartExam = () => {
    if (matchingCount === 0) return;

    let finalQuestions = [...matchingQuestions];

    if (shuffleQuestions) {
      finalQuestions.sort(() => Math.random() - 0.5);
    }

    // Strictly limit to available matching questions
    finalQuestions = finalQuestions.slice(0, selectedCount);

    setExamQuestions(finalQuestions);
    setAnswers({});
    setMarkedForReview({});
    setTimeSpentPerQuestion({});
    setCurrentIndex(0);
    setIsConfirmModalOpen(false);

    // 2 minutes per question standard for exam simulation
    const limitSec = finalQuestions.length * 120;
    setTotalTimeLimitSeconds(limitSec);

    examStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    setTotalElapsedSeconds(0);
    setPhase("EXAM");
  };

  // Exam Timer based on real timestamps
  useEffect(() => {
    if (phase !== "EXAM") return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.floor((now - examStartTimeRef.current) / 1000);
      setTotalElapsedSeconds(diffSec);

      // Auto-submit on time expiration
      if (diffSec >= totalTimeLimitSeconds && totalTimeLimitSeconds > 0) {
        executeFinalSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, totalTimeLimitSeconds]);

  // Track time per question on index switch
  const handleNavigateQuestion = (newIndex: number) => {
    if (examQuestions[currentIndex]) {
      const qId = examQuestions[currentIndex].id;
      const spentNow = Date.now() - questionStartTimeRef.current;
      setTimeSpentPerQuestion((prev) => ({
        ...prev,
        [qId]: (prev[qId] || 0) + spentNow,
      }));
    }
    questionStartTimeRef.current = Date.now();
    setCurrentIndex(newIndex);
  };

  const handleSelectOption = (letter: OptionLetter) => {
    const currentQ = examQuestions[currentIndex];
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: letter }));
  };

  const handleToggleMarkReview = () => {
    const currentQ = examQuestions[currentIndex];
    if (!currentQ) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Execute Final Submit (Consolidated Batch Processing)
  const executeFinalSubmit = () => {
    setIsConfirmModalOpen(false);
    const now = Date.now();
    const finalElapsed = Math.floor((now - examStartTimeRef.current) / 1000);

    // Flush pending time on active question
    const activeQ = examQuestions[currentIndex];
    const pendingTime = activeQ ? Date.now() - questionStartTimeRef.current : 0;
    const finalTimes: Record<string, number> = { ...timeSpentPerQuestion };
    if (activeQ) {
      finalTimes[activeQ.id] = (finalTimes[activeQ.id] || 0) + pendingTime;
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const wrongQs: Question[] = [];
    const resultsMap: Record<string, boolean> = {};
    const subjectMap: Record<string, { total: number; correct: number }> = {};

    const batchRecords: AnswerHistoryRecord[] = [];

    examQuestions.forEach((q) => {
      const sub = q.subject || "Geral";
      if (!subjectMap[sub]) {
        subjectMap[sub] = { total: 0, correct: 0 };
      }
      subjectMap[sub].total += 1;

      const userAns = answers[q.id];
      const isAnsweredByUser = Boolean(userAns);
      const isRight = isAnsweredByUser && userAns === q.correctOption;
      resultsMap[q.id] = isRight;

      if (isRight) {
        correctCount++;
        subjectMap[sub].correct += 1;
      } else {
        wrongCount++;
        wrongQs.push(q);
        if (!isAnsweredByUser) {
          unansweredCount++;
        }
      }

      batchRecords.push({
        id: `sim-rec-${now}-${q.id}`,
        questionId: q.id,
        selectedOption: userAns, // OptionLetter | undefined (sem fallback artificial)
        isCorrect: isRight,
        timeSpentMs: Math.max(1000, finalTimes[q.id] || 30000),
        timestamp: new Date().toISOString(),
        mode: "SIMULADO",
      });
    });

    // Send batch to central Learning Engine (Single atomic write pass)
    if (onBatchRecordAnswers) {
      onBatchRecordAnswers(batchRecords);
    } else {
      batchRecords.forEach((rec) => onRecordAnswer(rec));
    }

    const scorePercent = Math.round(
      (correctCount / Math.max(1, examQuestions.length)) * 100
    );

    const studySession: StudySession = {
      id: `session-sim-${now}`,
      mode: "SIMULADO",
      title: `Simulado (${examQuestions.length} questões)`,
      startTime: examStartTimeRef.current,
      endTime: now,
      questionIds: examQuestions.map((q) => q.id),
      currentIndex,
      answers,
      results: resultsMap,
      timeSpentPerQuestion: finalTimes,
      completed: true,
      scorePercent,
      totalCorrect: correctCount,
      totalWrong: wrongCount,
    };

    onSaveSession(studySession);

    setExamResult({
      total: examQuestions.length,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      scorePercent,
      totalTimeSeconds: finalElapsed,
      wrongQuestions: wrongQs,
      subjectBreakdown: subjectMap,
    });

    setPhase("RESULT");
  };

  // ==========================================
  // PHASE 1: SETUP
  // ==========================================
  if (phase === "SETUP") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Simulado de Prova MEMORA+
              </h2>
              <p className="text-xs text-slate-500">
                Reproduza a situação real de concurso/vestibular com tempo cronometrado e análise final consolidada.
              </p>
            </div>
          </div>

          {/* Number of Questions (10, 20, 30, 50, 100) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Quantidade de Questões:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {([10, 20, 30, 50, 100] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedCount(num)}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                    selectedCount === num
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Tempo recomendado: {selectedCount * 2} minutos (2 minutos por questão).
            </p>
          </div>

          {/* Discipline / Subject Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Disciplina:
              </label>
              <select
                value={selectedDiscipline}
                onChange={(e) => {
                  setSelectedDiscipline(e.target.value);
                  setSelectedSubject("TODAS");
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="TODAS">Todas as Disciplinas</option>
                {availableDisciplines.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Matéria / Assunto:
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="TODAS">Todas as Matérias</option>
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Dificuldade:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["TODAS", "Fácil", "Médio", "Difícil"].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    selectedDifficulty === diff
                      ? "bg-teal-600 text-white border-teal-600 font-bold"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {diff === "TODAS" ? "Mista" : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Shuffle Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Ordem das Questões:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShuffleQuestions(true)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                  shuffleQuestions
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Aleatória (Embaralhar)</span>
              </button>
              <button
                type="button"
                onClick={() => setShuffleQuestions(false)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                  !shuffleQuestions
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Sequencial (Banco)</span>
              </button>
            </div>
          </div>

          {/* Available Count and Warnings */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Questões disponíveis para estes filtros:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {matchingCount}
              </span>
            </div>

            {matchingCount > 0 && matchingCount < selectedCount && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  O acervo possui {matchingCount} questões para esta seleção. O simulado será iniciado com as {matchingCount} disponíveis.
                </span>
              </div>
            )}

            {matchingCount === 0 && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Nenhuma questão encontrada com estes filtros. Altere a matéria ou a dificuldade para iniciar.
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={onFinishSimulado}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Voltar ao Início
            </button>

            <button
              disabled={matchingCount === 0}
              onClick={handleStartExam}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 ${
                matchingCount === 0
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>INICIAR SIMULADO ({effectiveCount})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PHASE 2: ACTIVE EXAM
  // ==========================================
  if (phase === "EXAM") {
    const currentQ = examQuestions[currentIndex];
    const remainingSeconds = Math.max(0, totalTimeLimitSeconds - totalElapsedSeconds);
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    const timeFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const answeredCount = Object.keys(answers).length;
    const unansweredCount = examQuestions.length - answeredCount;
    const reviewCount = Object.values(markedForReview).filter(Boolean).length;
    const isCurrentMarked = Boolean(currentQ && markedForReview[currentQ.id]);

    const optionsList: { letter: OptionLetter; text: string }[] = currentQ
      ? [
          { letter: "A", text: currentQ.optionA },
          { letter: "B", text: currentQ.optionB },
          { letter: "C", text: currentQ.optionC },
          { letter: "D", text: currentQ.optionD },
          ...(currentQ.optionE ? [{ letter: "E" as OptionLetter, text: currentQ.optionE }] : []),
        ]
      : [];

    return (
      <div className="max-w-4xl mx-auto space-y-5 pb-12">
        {/* Exam Header: Time & Global Progress */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              SIMULADO MEMORA+
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-medium text-slate-500">
              {answeredCount} de {examQuestions.length} respondidas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-xs font-bold">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>{timeFormatted}</span>
            </div>
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
            >
              Entregar Prova
            </button>
          </div>
        </div>

        {/* Question Navigator Grid (1..N) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Grade de Questões</span>
            <div className="flex items-center gap-3 text-[10px] font-normal lowercase">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>respondida ({answeredCount})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>revisar ({reviewCount})</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>em branco ({unansweredCount})</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {examQuestions.map((q, idx) => {
              const isAns = Boolean(answers[q.id]);
              const isMarked = Boolean(markedForReview[q.id]);
              const isCur = idx === currentIndex;

              let btnClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
              if (isAns) {
                btnClass = "bg-indigo-600 text-white font-bold";
              }
              if (isMarked) {
                btnClass = "bg-amber-500 text-slate-950 font-bold";
              }
              if (isCur) {
                btnClass += " ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#111827]";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => handleNavigateQuestion(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Question Statement & Options */}
        {currentQ && (
          <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  Questão {currentIndex + 1} de {examQuestions.length}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentQ.discipline || currentQ.subject}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {currentQ.topic}
                </span>
              </div>

              <button
                onClick={handleToggleMarkReview}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  isCurrentMarked
                    ? "bg-amber-500/10 text-amber-600 border-amber-400 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500"
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isCurrentMarked ? "fill-current" : ""}`} />
                <span>{isCurrentMarked ? "Marcada para Revisão" : "Marcar p/ Revisar"}</span>
              </button>
            </div>

            <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              {currentQ.question}
            </div>

            {/* Alternatives (A, B, C, D, E) */}
            <div className="space-y-3 pt-2">
              {optionsList.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.letter;
                return (
                  <button
                    key={opt.letter}
                    onClick={() => handleSelectOption(opt.letter)}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-xs font-medium"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {opt.letter}
                    </div>
                    <div className="text-xs sm:text-sm leading-relaxed pt-0.5 flex-1 text-slate-800 dark:text-slate-200">
                      {opt.text}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                disabled={currentIndex === 0}
                onClick={() => handleNavigateQuestion(currentIndex - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {currentIndex < examQuestions.length - 1 ? (
                <button
                  onClick={() => handleNavigateQuestion(currentIndex + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <span>Próxima</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar Prova</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal before Finalizing (Requirement 12) */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirmar Entrega do Simulado
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verifique o status antes de enviar para correção.
                  </p>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Questões Respondidas:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {answeredCount} de {examQuestions.length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Questões em Branco (Não Respondidas):</span>
                  <span
                    className={`font-bold font-mono ${
                      unansweredCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                    }`}
                  >
                    {unansweredCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Marcadas para Revisão:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {reviewCount}
                  </span>
                </div>

                {unansweredCount > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Atenção: Questões deixadas em branco serão computadas como incorretas.
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Continuar Revisando
                </button>
                <button
                  onClick={executeFinalSubmit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                >
                  Confirmar e Entregar Prova
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // PHASE 3: RESULTS & CONSOLIDATED ANALYSIS
  // ==========================================
  if (phase === "RESULT" && examResult) {
    const min = Math.floor(examResult.totalTimeSeconds / 60);
    const sec = examResult.totalTimeSeconds % 60;

    // Filter questions in the review list
    const displayedReviewQuestions = examQuestions.filter((q) => {
      const isCorrect = answers[q.id] === q.correctOption;
      if (resultFilterTab === "ERRADAS") return !isCorrect;
      if (resultFilterTab === "CORRETAS") return isCorrect;
      return true;
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-1">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Resultado do Simulado
            </h2>
            <p className="text-xs text-slate-500">
              Desempenho consolidado e processado pelo Learning Engine MEMORA+
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {examResult.total}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                Total de Questões
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {examResult.correct}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">
                Acertos
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {examResult.wrong}
              </div>
              <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase mt-0.5">
                Erros {examResult.unanswered > 0 && `(${examResult.unanswered} em branco)`}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {examResult.scorePercent}%
              </div>
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase mt-0.5">
                Aproveitamento
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 font-mono">
            Tempo total decorrido: {min}m {sec}s (média de{" "}
            {Math.round(examResult.totalTimeSeconds / Math.max(1, examResult.total))}s por questão)
          </div>

          {/* Breakdown by Subject */}
          {Object.keys(examResult.subjectBreakdown).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Aproveitamento por Matéria:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(examResult.subjectBreakdown).map(([subject, stats]) => {
                  const pct = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
                  return (
                    <div
                      key={subject}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                        {subject}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="text-slate-500">
                          {stats.correct}/{stats.total}
                        </span>
                        <span
                          className={`font-bold ${
                            pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Question Review List */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Gabarito e Revisão das Questões
              </h3>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setResultFilterTab("TODAS")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    resultFilterTab === "TODAS"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Todas ({examQuestions.length})
                </button>
                <button
                  onClick={() => setResultFilterTab("ERRADAS")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    resultFilterTab === "ERRADAS"
                      ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Erradas ({examResult.wrong})
                </button>
                <button
                  onClick={() => setResultFilterTab("CORRETAS")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    resultFilterTab === "CORRETAS"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Acertos ({examResult.correct})
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {displayedReviewQuestions.map((q, idx) => {
                const userAns = answers[q.id];
                const isRight = Boolean(userAns) && userAns === q.correctOption;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      isRight
                        ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40"
                        : "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {q.discipline || q.subject}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed pt-1">
                          {q.question}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                          isRight
                            ? "bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : "bg-rose-200/60 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                        }`}
                      >
                        Sua: {userAns || "Em branco"} | Gabarito: {q.correctOption}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Explicação:</span>{" "}
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setPhase("SETUP")}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Novo Simulado
            </button>

            <button
              onClick={onFinishSimulado}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
