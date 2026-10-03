import React, { useState } from "react";
import {
  DailyGoalProgress,
  StudyModeType,
  UserSettings,
} from "../../types";
import {
  Target,
  Clock,
  Calendar,
  Flame,
  CheckCircle2,
  Circle,
  Edit3,
  Play,
  Award,
  Zap,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  FileCheck,
} from "lucide-react";

interface GoalsViewProps {
  dailyGoal: DailyGoalProgress;
  settings: UserSettings;
  onUpdateStudyGoals: (goals: {
    questionsTarget?: number;
    timeMinutesTarget?: number;
    weeklyDaysTarget?: number;
  }) => void;
  onStartStudy: (mode: StudyModeType) => void;
  onNavigate: (view: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  dailyGoal,
  settings,
  onUpdateStudyGoals,
  onStartStudy,
  onNavigate,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal edit states
  const [targetQuestions, setTargetQuestions] = useState<number>(
    dailyGoal.target || 50
  );
  const [customQuestionsInput, setCustomQuestionsInput] = useState<string>(
    String(dailyGoal.target || 50)
  );
  const [targetTimeMinutes, setTargetTimeMinutes] = useState<number>(
    dailyGoal.timeTargetMinutes || 30
  );
  const [customTimeInput, setCustomTimeInput] = useState<string>(
    String(dailyGoal.timeTargetMinutes || 30)
  );
  const [targetWeeklyDays, setTargetWeeklyDays] = useState<number>(
    dailyGoal.weeklyTargetDays || 5
  );

  // Percent calculations (suporta valores acima de 100%, barra visual limitada a 100%)
  const questionsPercentReal = Math.round(
    (dailyGoal.completed / Math.max(1, dailyGoal.target)) * 100
  );
  const questionsBarWidth = Math.min(100, Math.max(0, questionsPercentReal));

  const timePercentReal = Math.round(
    (dailyGoal.timeCompletedMinutes / Math.max(1, dailyGoal.timeTargetMinutes)) * 100
  );
  const timeBarWidth = Math.min(100, Math.max(0, timePercentReal));

  const weeklyPercentReal = Math.round(
    (dailyGoal.weeklyCompletedDays / Math.max(1, dailyGoal.weeklyTargetDays)) * 100
  );
  const weeklyBarWidth = Math.min(100, Math.max(0, weeklyPercentReal));

  // Restantes
  const remainingQuestions = Math.max(0, dailyGoal.target - dailyGoal.completed);
  const remainingMinutes = Math.max(
    0,
    dailyGoal.timeTargetMinutes - dailyGoal.timeCompletedMinutes
  );
  const remainingWeeklyDays = Math.max(
    0,
    dailyGoal.weeklyTargetDays - dailyGoal.weeklyCompletedDays
  );

  const handleSaveModal = () => {
    onUpdateStudyGoals({
      questionsTarget: targetQuestions,
      timeMinutesTarget: targetTimeMinutes,
      weeklyDaysTarget: targetWeeklyDays,
    });
    setIsModalOpen(false);
  };

  const handleSelectQuestionsPreset = (qty: number) => {
    setTargetQuestions(qty);
    setCustomQuestionsInput(String(qty));
  };

  const handleSelectTimePreset = (min: number) => {
    setTargetTimeMinutes(min);
    setCustomTimeInput(String(min));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Metas de Estudo
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Acompanhamento contínuo em 4 dimensões: questões, tempo, frequência e constância.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTargetQuestions(dailyGoal.target);
              setCustomQuestionsInput(String(dailyGoal.target));
              setTargetTimeMinutes(dailyGoal.timeTargetMinutes);
              setCustomTimeInput(String(dailyGoal.timeTargetMinutes));
              setTargetWeeklyDays(dailyGoal.weeklyTargetDays);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            <span>Ajustar Metas</span>
          </button>

          <button
            onClick={() => onStartStudy("TREINO")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all hover:translate-y-[-1px]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Praticar Agora</span>
          </button>
        </div>
      </div>

      {/* 4-Dimension Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dimension 1: Meta Diária de Questões */}
        <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Questões Hoje
              </h2>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-full font-mono ${
                questionsPercentReal >= 100
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {questionsPercentReal}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
                  {dailyGoal.completed}
                </span>
                <span className="text-slate-400 text-lg font-medium">/</span>
                <span className="text-xl font-semibold text-slate-500 dark:text-slate-400 font-mono">
                  {dailyGoal.target} questões
                </span>
              </div>
            </div>

            {/* Progress Bar (Visual limitada a 100%, dados reais mantidos) */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  questionsPercentReal >= 100
                    ? "bg-emerald-500"
                    : "bg-linear-to-r from-teal-500 to-amber-500"
                }`}
                style={{ width: `${questionsBarWidth}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {remainingQuestions === 0
                ? "Meta diária de questões concluída com sucesso!"
                : `Restam ${remainingQuestions} questões para a meta de hoje`}
            </span>
            <button
              onClick={() => onStartStudy("TREINO")}
              className="font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Estudar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dimension 2: Meta Diária de Tempo */}
        <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tempo de Estudo Hoje
              </h2>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-full font-mono ${
                timePercentReal >= 100
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {timePercentReal}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
                  {dailyGoal.timeCompletedMinutes}
                </span>
                <span className="text-slate-400 text-lg font-medium">/</span>
                <span className="text-xl font-semibold text-slate-500 dark:text-slate-400 font-mono">
                  {dailyGoal.timeTargetMinutes} min
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  timePercentReal >= 100
                    ? "bg-emerald-500"
                    : "bg-linear-to-r from-indigo-500 to-teal-500"
                }`}
                style={{ width: `${timeBarWidth}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {remainingMinutes === 0
                ? "Meta diária de tempo atingida!"
                : `Restam ${remainingMinutes} min de estudo ativo`}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Tempo efetivo medido nas questões
            </span>
          </div>
        </div>

        {/* Dimension 3: Meta Semanal (Segunda a Domingo) */}
        <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Frequência Semanal
              </h2>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {dailyGoal.weeklyCompletedDays} / {dailyGoal.weeklyTargetDays} dias
            </span>
          </div>

          {/* Days of Week Tracker (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
              {dailyGoal.weekDaysProgress.map((day) => (
                <div
                  key={day.date}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    day.isToday
                      ? "ring-2 ring-purple-500 dark:ring-purple-400 font-bold bg-purple-500/5"
                      : ""
                  } ${
                    day.studied
                      ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-500"
                  }`}
                  title={`${day.dayLabel} (${day.date}): ${day.questionsCount} questões`}
                >
                  <span className="text-[11px] font-bold uppercase">
                    {day.dayLabel}
                  </span>
                  {day.studied ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="text-[10px] font-mono text-slate-400">
                    {day.questionsCount > 0 ? `${day.questionsCount}q` : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {remainingWeeklyDays === 0
                ? "Meta semanal de frequência completada!"
                : `Faltam ${remainingWeeklyDays} dia(s) para a meta da semana`}
            </span>
            <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-bold">
              {weeklyPercentReal}%
            </span>
          </div>
        </div>

        {/* Dimension 4: Sequência & Constância (Streak) */}
        <div className="rounded-2xl p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ofensiva e Constância
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              Recorde: {dailyGoal.bestStreak}d
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
              {dailyGoal.currentStreak}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {dailyGoal.currentStreak === 1 ? "dia consecutivo" : "dias consecutivos"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 text-xs text-orange-800 dark:text-orange-300 flex items-center justify-between">
            <span className="font-semibold">Status de hoje:</span>
            <span className="font-bold">
              {dailyGoal.completed > 0 ? "✓ Ativo hoje (Streak garantido)" : "○ Pendente hoje"}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {dailyGoal.completed > 0
                ? "Ofensiva protegida para hoje."
                : "Resolva ao menos 1 questão hoje para estender sua ofensiva!"}
            </span>
            <button
              onClick={() => onStartStudy("REVISAO")}
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Revisar →
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Configuração Completa de Metas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Configurar Metas de Estudo
                </h3>
                <p className="text-xs text-slate-500">
                  Personalize suas metas diárias e semanais. O progresso já realizado é mantido.
                </p>
              </div>
            </div>

            {/* 1. Meta Diária de Questões */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Meta Diária de Questões:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[10, 20, 30, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectQuestionsPreset(num)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      targetQuestions === num
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500">Personalizada:</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={customQuestionsInput}
                  onChange={(e) => {
                    setCustomQuestionsInput(e.target.value);
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setTargetQuestions(parsed);
                    }
                  }}
                  className="w-24 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">questões/dia</span>
              </div>
            </div>

            {/* 2. Meta Diária de Tempo */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Meta Diária de Tempo:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[15, 30, 45, 60, 90].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => handleSelectTimePreset(min)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      targetTimeMinutes === min
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500">Personalizado:</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={customTimeInput}
                  onChange={(e) => {
                    setCustomTimeInput(e.target.value);
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setTargetTimeMinutes(parsed);
                    }
                  }}
                  className="w-24 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">minutos/dia</span>
              </div>
            </div>

            {/* 3. Meta Semanal de Dias */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Frequência Semanal (Dias de Estudo):
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTargetWeeklyDays(days)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      targetWeeklyDays === days
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-400"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Meta recomendada para constância: 5 a 6 dias por semana.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                Salvar Metas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
