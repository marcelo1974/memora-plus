import React, { useState, useMemo } from "react";
import {
  AnswerHistoryRecord,
  Question,
  QuestionDifficulty,
  StatisticsFilterCriteria,
  StatisticsPeriod,
  StudyModeType,
  StudySession,
} from "../../types";
import { LearningEngine } from "../../services/learningEngine";
import { StatisticsService } from "../../services/statisticsService";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  BookOpen,
  FileCheck,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Info,
} from "lucide-react";

interface StatisticsViewProps {
  questions: Question[];
  history: AnswerHistoryRecord[];
  sessions?: StudySession[];
  onStartStudyOnSubject?: (subject: string) => void;
  onNavigate?: (view: string) => void;
}

type BreakdownTab = "disciplina" | "materia" | "assunto" | "modo" | "dificuldade";
type SortColumn = "label" | "totalAnswers" | "totalCorrect" | "totalWrong" | "accuracyPercent" | "avgTimeSeconds";
type SortDirection = "asc" | "desc";
type ChartMetric = "questions" | "accuracy" | "time";

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  questions,
  history,
  onNavigate,
}) => {
  // 1. Contexto Unificado de Filtros
  const [period, setPeriod] = useState<StatisticsPeriod>("30D");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");

  // Tab de detalhamento e controles de busca / ordenação
  const [activeTab, setActiveTab] = useState<BreakdownTab>("disciplina");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("totalAnswers");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("questions");

  // Map de questões para consulta O(1)
  const questionsMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  // Opções disponíveis para filtros a partir do acervo de questões
  const filterOptions = useMemo(() => {
    const disciplines = new Set<string>();
    const subjects = new Set<string>();

    for (const q of questions) {
      if (q.discipline && q.discipline.trim()) {
        disciplines.add(q.discipline.trim());
      } else if (q.subject && q.subject.trim()) {
        disciplines.add(q.subject.trim());
      }
      if (q.subject && q.subject.trim()) {
        subjects.add(q.subject.trim());
      }
    }

    return {
      disciplines: Array.from(disciplines).sort(),
      subjects: Array.from(subjects).sort(),
    };
  }, [questions]);

  // Critérios de filtro consolidados
  const filterCriteria: StatisticsFilterCriteria = useMemo(
    () => ({
      period,
      discipline: selectedDiscipline,
      subject: selectedSubject,
      mode: selectedMode as StudyModeType | "ALL",
      difficulty: selectedDifficulty as QuestionDifficulty | "ALL",
    }),
    [period, selectedDiscipline, selectedSubject, selectedMode, selectedDifficulty]
  );

  const hasActiveFilters =
    period !== "30D" ||
    selectedDiscipline !== "ALL" ||
    selectedSubject !== "ALL" ||
    selectedMode !== "ALL" ||
    selectedDifficulty !== "ALL";

  const handleResetFilters = () => {
    setPeriod("30D");
    setSelectedDiscipline("ALL");
    setSelectedSubject("ALL");
    setSelectedMode("ALL");
    setSelectedDifficulty("ALL");
  };

  // 2. Histórico Filtrado (Contexto único para cards, gráficos e tabelas)
  const filteredHistory = useMemo(
    () => StatisticsService.filterHistory(history, questionsMap, filterCriteria),
    [history, questionsMap, filterCriteria]
  );

  // 3. Bloco 3G.1 — Estatísticas Gerais
  const generalStats = useMemo(
    () => StatisticsService.calculateGeneralStats(filteredHistory),
    [filteredHistory]
  );

  // 4. Bloco 3G.8 — Janelas Temporais de Tempo de Estudo Ativo
  const timeWindows = useMemo(
    () => StatisticsService.calculateTimeWindows(history),
    [history]
  );

  // 5. Bloco 3G.5 — Evolução Temporal
  const temporalEvolution = useMemo(
    () => StatisticsService.calculateTemporalEvolution(filteredHistory, period),
    [filteredHistory, period]
  );

  // 6. Bloco 3G.6 — Estados de Memória do Acervo (SM-2 / Mnemosyne)
  const memoryDistribution = useMemo(
    () => StatisticsService.calculateMemoryDistribution(questions),
    [questions]
  );

  // Métricas de retenção oficiais do Learning Engine
  const retentionMetrics = useMemo(
    () => LearningEngine.getRetentionMetrics(questions, history),
    [questions, history]
  );

  // 7. Agrupamentos Categóricos
  const breakdownDiscipline = useMemo(
    () => StatisticsService.calculateBreakdownByDiscipline(filteredHistory, questionsMap),
    [filteredHistory, questionsMap]
  );

  const breakdownSubject = useMemo(
    () => StatisticsService.calculateBreakdownBySubject(filteredHistory, questionsMap),
    [filteredHistory, questionsMap]
  );

  const breakdownTopic = useMemo(
    () => StatisticsService.calculateBreakdownByTopic(filteredHistory, questionsMap),
    [filteredHistory, questionsMap]
  );

  const breakdownDifficulty = useMemo(
    () => StatisticsService.calculateBreakdownByDifficulty(filteredHistory, questionsMap),
    [filteredHistory, questionsMap]
  );

  const breakdownMode = useMemo(
    () => StatisticsService.calculateBreakdownByMode(filteredHistory),
    [filteredHistory]
  );

  // Seleciona a lista da aba ativa
  const currentTableData = useMemo(() => {
    let list: Array<{
      key: string;
      label: string;
      totalAnswers: number;
      totalCorrect: number;
      totalWrong: number;
      totalBlank: number;
      accuracyPercent: number;
      totalTimeMs: number;
      avgTimeSeconds: number;
    }> = [];

    switch (activeTab) {
      case "disciplina":
        list = breakdownDiscipline;
        break;
      case "materia":
        list = breakdownSubject;
        break;
      case "assunto":
        list = breakdownTopic;
        break;
      case "modo":
        list = breakdownMode;
        break;
      case "dificuldade":
        list = breakdownDifficulty;
        break;
    }

    // Filtro de busca na tabela
    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase();
      list = list.filter((item) => item.label.toLowerCase().includes(term));
    }

    // Ordenação
    return [...list].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (typeof valA === "string") {
        const comp = (valA as string).localeCompare(valB as string);
        return sortDirection === "asc" ? comp : -comp;
      }

      valA = Number(valA);
      valB = Number(valB);
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [
    activeTab,
    breakdownDiscipline,
    breakdownSubject,
    breakdownTopic,
    breakdownMode,
    breakdownDifficulty,
    tableSearch,
    sortColumn,
    sortDirection,
  ]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. Header com Título e Subtítulo */}
      <div className="rounded-2xl p-6 sm:p-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Estatísticas de Desempenho
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Diagnóstico pedagógico objetivo, evolução temporal e análise multidimensional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("metas")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Ver Metas</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Barra de Filtros Unificada (Contexto Compartilhado) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Filtros do Diagnóstico</span>
          </div>
          {hasActiveFilters && (
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              Recorte Ativo
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Período */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Período
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(["7D", "30D", "90D", "ALL"] as StatisticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    period === p
                      ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {p === "7D" ? "7d" : p === "30D" ? "30d" : p === "90D" ? "90d" : "Tudo"}
                </button>
              ))}
            </div>
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Disciplina
            </label>
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Todas as Disciplinas</option>
              {filterOptions.disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Matéria */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Matéria
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Todas as Matérias</option>
              {filterOptions.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Estudo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Modo de Estudo
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Todos os Modos</option>
              <option value="TREINO">Modo Treino</option>
              <option value="SIMULADO">Modo Simulado</option>
              <option value="REVISAO">Revisão Espaçada</option>
              <option value="DESAFIO">Modo Desafio</option>
            </select>
          </div>

          {/* Dificuldade */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Dificuldade
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Todas as Dificuldades</option>
              <option value="Fácil">Fácil</option>
              <option value="Médio">Médio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Bloco 3G.1 — Cards de Estatísticas Gerais (Refletem o Recorte Selecionado) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Respondidas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Total Respondidas
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {generalStats.totalAnswers}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex flex-col gap-0.5">
            <span>{generalStats.uniqueQuestionsAnswered} questões distintas</span>
            {generalStats.totalBlank > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {generalStats.totalBlank} em branco
              </span>
            )}
          </div>
        </div>

        {/* Acurácia Geral */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Acurácia Geral
            </div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 font-mono">
              {generalStats.accuracyPercent}%
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {generalStats.totalCorrect} acertos
            </span>{" "}
            /{" "}
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {generalStats.totalWrong} erros
            </span>
          </div>
        </div>

        {/* Tempo Total de Estudo */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Tempo de Estudo
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {generalStats.totalTimeMinutes >= 60
                ? `${Math.floor(generalStats.totalTimeMinutes / 60)}h ${generalStats.totalTimeMinutes % 60}m`
                : `${generalStats.totalTimeMinutes} min`}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Média de <span className="font-mono font-bold">{generalStats.avgTimeSeconds}s</span> por questão
          </div>
        </div>

        {/* Janelas Temporais de Tempo (Bloco 3G.8) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Dedicação por Janela
            </div>
            <div className="space-y-1 text-xs font-mono font-semibold pt-1">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Hoje:</span>
                <span className="text-teal-600 dark:text-teal-400">{timeWindows.todayTimeMinutes} min</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Últimos 7d:</span>
                <span>{timeWindows.last7DaysTimeMinutes} min</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Últimos 30d:</span>
                <span>{timeWindows.last30DaysTimeMinutes} min</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Total histórico: {timeWindows.allTimeMinutes} min
          </div>
        </div>
      </div>

      {/* 4. Bloco 3G.5 — Evolução Temporal com Continuidade de Dias */}
      <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Evolução Temporal ({period === "7D" ? "7 Dias" : period === "30D" ? "30 Dias" : period === "90D" ? "90 Dias" : "Todo o Período"})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuidade diária baseada em datas locais. Dias sem estudo são preenchidos com 0.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setChartMetric("questions")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                chartMetric === "questions"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Questões
            </button>
            <button
              onClick={() => setChartMetric("accuracy")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                chartMetric === "accuracy"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Acurácia (%)
            </button>
            <button
              onClick={() => setChartMetric("time")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                chartMetric === "time"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Tempo (min)
            </button>
          </div>
        </div>

        {/* Gráfico de Barras Responsivo */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[500px] h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {temporalEvolution.map((point) => {
              let value = 0;
              let maxValue = 1;
              let labelSuffix = "";

              if (chartMetric === "questions") {
                value = point.totalAnswers;
                maxValue = Math.max(1, ...temporalEvolution.map((p) => p.totalAnswers));
                labelSuffix = "q";
              } else if (chartMetric === "accuracy") {
                value = point.accuracyPercent;
                maxValue = 100;
                labelSuffix = "%";
              } else {
                value = point.totalTimeMinutes;
                maxValue = Math.max(1, ...temporalEvolution.map((p) => p.totalTimeMinutes));
                labelSuffix = "m";
              }

              const heightPercent = Math.max(value > 0 ? 12 : 3, Math.round((value / maxValue) * 100));

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 z-20 pointer-events-none p-2 rounded-xl bg-slate-900 text-white text-[10px] shadow-lg whitespace-nowrap">
                    <div className="font-bold">{point.displayDate} ({point.date})</div>
                    <div>Resolvidas: {point.totalAnswers} ({point.totalCorrect} acertos, {point.totalWrong} erros)</div>
                    <div>Acurácia: {point.accuracyPercent}%</div>
                    <div>Tempo: {point.totalTimeMinutes} min</div>
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {value}{labelSuffix}
                  </span>

                  <div
                    className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${
                      value > 0
                        ? chartMetric === "accuracy"
                          ? value >= 70
                            ? "bg-emerald-500"
                            : value >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                          : "bg-linear-to-t from-teal-600 to-teal-400"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  <span className="text-[10px] font-mono text-slate-500 mt-2 truncate max-w-full">
                    {point.displayDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Bloco 3G.6 — Estados de Memória do Acervo (Mnemosyne / SM-2) */}
      <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Distribuição do Acervo por Estado de Memória</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status consolidado das {memoryDistribution.totalQuestions} questões no ciclo Mnemosyne (SM-2)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="text-slate-600 dark:text-slate-400">
              Taxa de Retenção:{" "}
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {retentionMetrics.retentionRate}%
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Facilidade Média (SM-2):{" "}
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {retentionMetrics.averageEaseFactor}
              </span>
            </div>
          </div>
        </div>

        {/* Proportional Memory State Bar */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${memoryDistribution.dominadaPercent}%` }}
            title={`DOMINADA: ${memoryDistribution.dominadaCount} (${memoryDistribution.dominadaPercent}%)`}
          />
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${memoryDistribution.aprendendoPercent}%` }}
            title={`APRENDENDO: ${memoryDistribution.aprendendoCount} (${memoryDistribution.aprendendoPercent}%)`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${memoryDistribution.revisarPercent}%` }}
            title={`REVISAR: ${memoryDistribution.revisarCount} (${memoryDistribution.revisarPercent}%)`}
          />
          <div
            className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-500"
            style={{ width: `${memoryDistribution.novaPercent}%` }}
            title={`NOVA: ${memoryDistribution.novaCount} (${memoryDistribution.novaPercent}%)`}
          />
        </div>

        {/* 4 Official Memory State Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* DOMINADA */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                DOMINADA
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {memoryDistribution.dominadaPercent}%
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono mt-1">
              {memoryDistribution.dominadaCount}
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              Memória de longo prazo consolidada.
            </p>
          </div>

          {/* APRENDENDO */}
          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                APRENDENDO
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {memoryDistribution.aprendendoPercent}%
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 font-mono mt-1">
              {memoryDistribution.aprendendoCount}
            </div>
            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-1">
              Em fixação ativa nos ciclos iniciais.
            </p>
          </div>

          {/* REVISAR */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                REVISAR
              </span>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {memoryDistribution.revisarPercent}%
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100 font-mono mt-1">
              {memoryDistribution.revisarCount}
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              Aguardando revisão ou repetição.
            </p>
          </div>

          {/* NOVA */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                NOVA
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {memoryDistribution.novaPercent}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono mt-1">
              {memoryDistribution.novaCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ainda não estudadas no acervo.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Tabs e Tabelas de Análise Detalhada (Disciplina, Matéria, Assunto, Modo, Dificuldade) */}
      <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Seletor de Tabs */}
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => {
                setActiveTab("disciplina");
                setTableSearch("");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "disciplina"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Por Disciplina
            </button>
            <button
              onClick={() => {
                setActiveTab("materia");
                setTableSearch("");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "materia"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Por Matéria
            </button>
            <button
              onClick={() => {
                setActiveTab("assunto");
                setTableSearch("");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "assunto"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Por Assunto
            </button>
            <button
              onClick={() => {
                setActiveTab("modo");
                setTableSearch("");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "modo"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Por Modo
            </button>
            <button
              onClick={() => {
                setActiveTab("dificuldade");
                setTableSearch("");
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "dificuldade"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Por Dificuldade
            </button>
          </div>

          {/* Busca na tabela */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Filtrar ${
                activeTab === "disciplina"
                  ? "disciplina"
                  : activeTab === "materia"
                  ? "matéria"
                  : activeTab === "assunto"
                  ? "assunto"
                  : "itens"
              }...`}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Tabela de Dados */}
        {currentTableData.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">
              {tableSearch
                ? "Nenhum resultado corresponde à sua pesquisa."
                : "Ainda não há dados suficientes para este período ou filtro selecionado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold select-none">
                  <th
                    onClick={() => handleSort("label")}
                    className="pb-2.5 font-bold uppercase text-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Categoria</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("totalAnswers")}
                    className="pb-2.5 font-bold uppercase text-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Respondidas</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("totalCorrect")}
                    className="pb-2.5 font-bold uppercase text-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Acertos</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("totalWrong")}
                    className="pb-2.5 font-bold uppercase text-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Erros</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("avgTimeSeconds")}
                    className="pb-2.5 font-bold uppercase text-[10px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tempo Médio</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("accuracyPercent")}
                    className="pb-2.5 font-bold uppercase text-[10px] text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Aproveitamento</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentTableData.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 dark:text-slate-200">
                      {item.label}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-mono">
                      {item.totalAnswers}
                    </td>
                    <td className="py-3 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {item.totalCorrect}
                    </td>
                    <td className="py-3 text-rose-600 dark:text-rose-400 font-semibold font-mono">
                      {item.totalWrong}
                      {item.totalBlank > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({item.totalBlank} em branco)
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 font-mono">
                      {item.avgTimeSeconds}s
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.totalAnswers === 1 && (
                          <span className="text-[10px] text-slate-400" title="Amostra de 1 questão">
                            (1q)
                          </span>
                        )}
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.accuracyPercent >= 70
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : item.accuracyPercent >= 50
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {item.accuracyPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
