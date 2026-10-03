import React, { useState, useMemo } from "react";
import {
  AnswerHistoryRecord,
  DailyGoalProgress,
  Question,
  StudySession,
  UserSettings,
} from "../../types";
import { LearningEngine } from "../../services/learningEngine";
import { StatisticsService } from "../../services/statisticsService";
import {
  Flame,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Play,
  FileCheck,
  Target,
  Edit3,
  Bookmark,
  AlertCircle,
  Database,
  Calendar,
  CheckCircle2,
  BarChart3,
  Award,
  Layers,
  HelpCircle,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { PWAInstallButton } from "../pwa/PWAInstallButton";

interface DashboardViewProps {
  questions: Question[];
  dailyGoal: DailyGoalProgress;
  sessions?: StudySession[];
  history?: AnswerHistoryRecord[];
  settings?: UserSettings;
  onUpdateSettings?: (newSettings: Partial<UserSettings>) => void;
  onStartStudy: (mode: "TREINO" | "DESAFIO" | "SIMULADO" | "REVISAO") => void;
  onNavigate: (view: string) => void;
  onUpdateDailyGoalTarget: (target: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  questions,
  dailyGoal,
  history = [],
  onStartStudy,
  onNavigate,
  onUpdateDailyGoalTarget,
}) => {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState(String(dailyGoal.target));

  // 1. FILA DE REVISÕES OFICIAL DO SM-2 (Fase 3C / Learning Engine)
  const reviewQueueDetails = useMemo(
    () => LearningEngine.getReviewQueueDetails(questions),
    [questions]
  );

  // 2. RETENÇÃO E MÉTRICAS CONSOLIDADAS (Fase 3C / Learning Engine)
  const retention = useMemo(
    () => LearningEngine.getRetentionMetrics(questions, history),
    [questions, history]
  );

  // 3. ESTATÍSTICAS GERAIS E MEMÓRIA DERIVADAS DO SERVIÇO CANÔNICO DA FASE 3G
  const generalStats = useMemo(
    () => StatisticsService.calculateGeneralStats(history),
    [history]
  );

  const memoryDistribution = useMemo(
    () => StatisticsService.calculateMemoryDistribution(questions),
    [questions]
  );

  // Questões com erro e favoritas para atalhos secundários
  const errorQuestions = useMemo(
    () => questions.filter((q) => (q.errorCount || 0) > 0),
    [questions]
  );

  const favoriteQuestions = useMemo(
    () => questions.filter((q) => q.isFavorite),
    [questions]
  );

  // Metas do dia (Fase 3F)
  const questionsTarget = Math.max(1, dailyGoal.target || 30);
  const questionsCompleted = dailyGoal.completed || 0;
  const questionsPercent = Math.round((questionsCompleted / questionsTarget) * 100);
  const questionsBarWidth = Math.min(100, Math.max(0, questionsPercent));

  const timeTarget = Math.max(1, dailyGoal.timeTargetMinutes || 30);
  const timeCompleted = dailyGoal.timeCompletedMinutes || 0;
  const timePercent = Math.round((timeCompleted / timeTarget) * 100);
  const timeBarWidth = Math.min(100, Math.max(0, timePercent));

  // Streak (Fase 3F)
  const currentStreak = dailyGoal.currentStreak || 0;
  const bestStreak = dailyGoal.bestStreak || 0;

  // Estado vazio do banco
  const isBankEmpty = questions.length === 0;
  const isNewUser = questions.length > 0 && history.length === 0;

  const handleSetGoal = (target: number) => {
    onUpdateDailyGoalTarget(target);
    setIsGoalModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-14 max-w-7xl mx-auto">
      {/* 1. Header Banner MEMORA+ com Identidade Visual */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-950 via-slate-900 to-[#0F172A] border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900/90 border-2 border-amber-500/50 shadow-2xl p-0.5 shrink-0 flex items-center justify-center ring-4 ring-amber-500/15">
            <img
              src="/branding/memora-header-logo.png"
              alt="Logo MEMORA+"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="max-w-2xl flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Sistema Mnemosyne Ativo</span>
              </div>
              {currentStreak > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
                  <span>
                    {currentStreak} {currentStreak === 1 ? "dia" : "dias"} de ofensiva
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
              <span>MEMORA+</span>
              <span className="font-light text-slate-300 text-lg sm:text-xl">| Bom estudo!</span>
            </h1>
            <p className="text-sm text-teal-300/90 leading-relaxed mb-5 font-semibold tracking-wide">
              Aprenda. Revise. Memorize.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onStartStudy("TREINO")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all hover:translate-y-[-1px] focus:outline-hidden focus:ring-2 focus:ring-teal-400"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>CONTINUAR ESTUDANDO</span>
              </button>

              {reviewQueueDetails.totalCount > 0 ? (
                <button
                  onClick={() => onStartStudy("REVISAO")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-sm border border-amber-500/40 transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Revisar Pendentes ({reviewQueueDetails.totalCount})</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("estatisticas")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700/80 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-teal-400" />
                  <span>Ver Desempenho</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PWA Mobile Quick Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* ESTADO VAZIO: BANCO DE QUESTÕES VAZIO */}
      {isBankEmpty && (
        <div className="rounded-2xl p-8 bg-white dark:bg-[#111827] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Database className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Seu banco de questões está vazio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Adicione questões manualmente ou importe um arquivo CSV/JSON para iniciar seus treinos e revisões espaçadas.
            </p>
          </div>
          <button
            onClick={() => onNavigate("banco")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ir para o Banco de Questões</span>
          </button>
        </div>
      )}

      {/* ORIENTAÇÃO PARA USUÁRIO NOVO (Banco existe, mas sem respostas ainda) */}
      {isNewUser && (
        <div className="rounded-2xl p-5 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-teal-950 dark:text-teal-200 uppercase tracking-wider">
                Bem-vindo ao MEMORA+!
              </h3>
              <p className="text-xs text-teal-800/80 dark:text-teal-400/90 mt-0.5">
                Comece seu primeiro treino ou simulado para gerar suas estatísticas de estudo e alimentar o ciclo de repetição espaçada.
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartStudy("TREINO")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shrink-0"
          >
            <span>Iniciar Primeiro Treino</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. BLOCO "HOJE" & REVISÕES & OFENSIVA (Consumo oficial da Fase 3F e 3C) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Meta de Questões de Hoje */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Questões Hoje
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate("metas")}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                title="Abrir Central de Metas"
              >
                Metas
              </button>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                title="Ajustar Meta Rápida"
                aria-label="Ajustar Meta Rápida"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {questionsCompleted}
                </span>
                <span className="text-slate-400 text-lg font-medium">/</span>
                <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                  {questionsTarget}
                </span>
              </div>
              <span className={`text-lg font-bold font-mono ${questionsPercent >= 100 ? "text-emerald-500" : "text-amber-500"}`}>
                {questionsPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  questionsPercent >= 100
                    ? "bg-emerald-500"
                    : "bg-linear-to-r from-teal-500 to-amber-500"
                }`}
                style={{ width: `${questionsBarWidth}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              {questionsCompleted >= questionsTarget ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Meta batida! ({questionsCompleted - questionsTarget} extras)
                </span>
              ) : (
                <span>Restam {questionsTarget - questionsCompleted} questões hoje</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
            <span className="text-slate-400 font-mono">Diário</span>
            <button
              onClick={() => onStartStudy("TREINO")}
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Avançar →
            </button>
          </div>
        </div>

        {/* Card 2: Tempo de Estudo Ativo de Hoje */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tempo Hoje
              </h2>
            </div>
            <button
              onClick={() => onNavigate("metas")}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Ajustar
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {timeCompleted}
                </span>
                <span className="text-slate-400 text-lg font-medium">/</span>
                <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                  {timeTarget}m
                </span>
              </div>
              <span className={`text-lg font-bold font-mono ${timePercent >= 100 ? "text-emerald-500" : "text-indigo-500"}`}>
                {timePercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  timePercent >= 100
                    ? "bg-emerald-500"
                    : "bg-linear-to-r from-teal-500 to-indigo-500"
                }`}
                style={{ width: `${timeBarWidth}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              {timeCompleted >= timeTarget ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tempo concluído!
                </span>
              ) : (
                <span>Restam {Math.max(0, timeTarget - timeCompleted)} min</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
            <span className="text-slate-400">Estudo ativo</span>
            <span className="font-mono text-slate-500">{generalStats.avgTimeSeconds}s / questão</span>
          </div>
        </div>

        {/* Card 3: Ofensiva e Consistência (Streak - Fase 3F) */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ofensiva
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 font-mono">
              Recorde: {bestStreak}d
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {currentStreak}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {currentStreak === 1 ? "dia consecutivo" : "dias consecutivos"}
              </span>
            </div>

            {/* Mini barra semanal (Fase 3F) */}
            <div className="flex items-center justify-between gap-1 mt-3 pt-2">
              {(dailyGoal.weekDaysProgress || []).map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full h-3 rounded-xs transition-colors ${
                      d.studied
                        ? "bg-amber-500 dark:bg-amber-400"
                        : d.isToday
                        ? "border border-dashed border-amber-500/60 bg-amber-500/10"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                    title={`${d.dayLabel} (${d.date}): ${d.questionsCount}q`}
                  />
                  <span className={`text-[9px] font-medium ${d.isToday ? "font-bold text-amber-500" : "text-slate-400"}`}>
                    {d.dayLabel.charAt(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{dailyGoal.weeklyCompletedDays || 0} de {dailyGoal.weeklyTargetDays || 5}d na semana</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {questionsCompleted > 0 ? "Ativo hoje" : "Pendente hoje"}
            </span>
          </div>
        </div>

        {/* Card 4: Revisões Espaçadas Oficiais do SM-2 (Fase 3C) */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Revisões (SM-2)
              </h2>
            </div>
            {reviewQueueDetails.overdueCount > 0 && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {reviewQueueDetails.overdueCount} vencidas
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {reviewQueueDetails.totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {reviewQueueDetails.totalCount === 1 ? "questão na fila" : "questões na fila"}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
              {reviewQueueDetails.totalCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nenhuma revisão pendente!
                </span>
              ) : (
                <span>
                  {reviewQueueDetails.overdueCount} atrasadas • {reviewQueueDetails.dueTodayCount} para hoje
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
            <span className="text-slate-500">
              {reviewQueueDetails.totalCount > 0 ? "Aguardando ciclo" : "Em dia"}
            </span>
            <button
              onClick={() => onStartStudy("REVISAO")}
              className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Revisar agora →
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODOS DE ESTUDO PRINCIPAIS (Treino, Simulado, Revisão, Desafio) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Atividades de Estudo
          </h2>
          <button
            onClick={() => onNavigate("estudar")}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Ver Modos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Treino (Fase 3D - Abre SETUP) */}
          <button
            onClick={() => onStartStudy("TREINO")}
            className="group rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:shadow-md transition-all text-left flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Modo Treino
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pratique questões com feedback imediato e explicações pedagógicas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center justify-between">
              <span>Iniciar Treino</span>
              <span>→</span>
            </div>
          </button>

          {/* Card Simulado (Fase 3E - Abre CONFIGURAR) */}
          <button
            onClick={() => onNavigate("simulado")}
            className="group rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-md transition-all text-left flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Simulado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Teste seu desempenho em condições reais de prova com gabarito no final.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>Criar Simulado</span>
              <span>→</span>
            </div>
          </button>

          {/* Card Revisão Espaçada (Fase 3C - SM-2) */}
          <button
            onClick={() => onStartStudy("REVISAO")}
            className="group rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-md transition-all text-left flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Revisão Espaçada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {reviewQueueDetails.totalCount > 0
                  ? `${reviewQueueDetails.totalCount} questões aguardando revisão pelo SM-2.`
                  : "Fila em dia. O algoritmo calculará as próximas datas."}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span>Revisar Agora</span>
              <span>→</span>
            </div>
          </button>

          {/* Card Desafio (Contra o Relógio) */}
          <button
            onClick={() => onStartStudy("DESAFIO")}
            className="group rounded-2xl p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:shadow-md transition-all text-left flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Modo Desafio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Cronômetro ativo baseado em timestamps para treinar agilidade e rapidez.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center justify-between">
              <span>Iniciar Desafio</span>
              <span>→</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. RESUMO ESTATÍSTICO & PROGRESSO (Consumo Canônico da Fase 3G) */}
      <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Resumo de Aprendizagem & Desempenho</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas consolidadas do histórico real e estados de fixação no ciclo Mnemosyne.
            </p>
          </div>
          <button
            onClick={() => onNavigate("estatisticas")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-teal-600 dark:text-teal-400 hover:border-teal-500 transition-colors"
          >
            <span>Ver Estatísticas Completas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Key Indicators (Mesmas fontes e fórmulas da Fase 3G) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Acurácia Geral */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Acurácia Geral</span>
            <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
              {generalStats.accuracyPercent}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {generalStats.totalCorrect} acertos / {generalStats.totalWrong} erros
            </p>
          </div>

          {/* Questões Respondidas */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Respondidas</span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {generalStats.totalAnswers}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {generalStats.uniqueQuestionsAnswered} questões distintas
            </p>
          </div>

          {/* Tempo Total de Estudo */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Tempo de Estudo</span>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {generalStats.totalTimeMinutes >= 60
                ? `${Math.floor(generalStats.totalTimeMinutes / 60)}h ${generalStats.totalTimeMinutes % 60}m`
                : `${generalStats.totalTimeMinutes} min`}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Média de {generalStats.avgTimeSeconds}s / questão
            </p>
          </div>

          {/* Questões Dominadas */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Dominadas</span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {memoryDistribution.dominadaCount}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {memoryDistribution.dominadaPercent}% do acervo total
            </p>
          </div>
        </div>

        {/* Distribuição de Estados de Memória (SM-2 / Mnemosyne) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Ciclo de Memória ({memoryDistribution.totalQuestions} questões)
            </span>
            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">
              Retenção: {retention.retentionRate}%
            </span>
          </div>

          {/* Barra de Proporção Oficial (Fase 3G) */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
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

          {/* Legenda dos 4 Estados Oficiais */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">DOMINADA:</span>
              <span className="font-mono text-slate-500">{memoryDistribution.dominadaCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">APRENDENDO:</span>
              <span className="font-mono text-slate-500">{memoryDistribution.aprendendoCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">REVISAR:</span>
              <span className="font-mono text-slate-500">{memoryDistribution.revisarCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">NOVA:</span>
              <span className="font-mono text-slate-500">{memoryDistribution.novaCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ATALHOS SECUNDÁRIOS: Erradas, Favoritos & Banco */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Questões Erradas */}
        <button
          onClick={() => onNavigate("erradas")}
          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition-colors text-left focus:outline-hidden focus:ring-2 focus:ring-rose-500"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Minhas Questões Erradas
              </div>
              <div className="text-[11px] text-slate-500">
                {errorQuestions.length} questões com erros registrados
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Favoritos */}
        <button
          onClick={() => onNavigate("favoritos")}
          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-colors text-left focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Bookmark className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Meus Favoritos
              </div>
              <div className="text-[11px] text-slate-500">
                {favoriteQuestions.length} questões destacadas
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Banco de Questões */}
        <button
          onClick={() => onNavigate("banco")}
          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition-colors text-left focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Banco de Questões
              </div>
              <div className="text-[11px] text-slate-500">
                {questions.length} questões disponíveis
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* MODAL DE AJUSTE RÁPIDO DA META DIÁRIA (Preservado e integrado) */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Definir Meta Diária
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha quantas questões você deseja resolver diariamente para manter o ritmo de estudo e memorização:
            </p>

            <div className="grid grid-cols-5 gap-2">
              {[10, 20, 30, 50, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => handleSetGoal(num)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                    dailyGoal.target === num
                      ? "bg-amber-500 text-slate-950 border-amber-500"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Ou digite uma meta personalizada:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                />
                <button
                  onClick={() => {
                    const parsed = parseInt(customGoalInput, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      handleSetGoal(parsed);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Salvar
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
