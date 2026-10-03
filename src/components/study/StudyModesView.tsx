import React from "react";
import { Question, StudyModeType } from "../../types";
import {
  Play,
  Clock,
  RotateCcw,
  FileCheck,
  AlertCircle,
  Bookmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";

interface StudyModesViewProps {
  questions: Question[];
  onStartMode: (mode: StudyModeType) => void;
  onNavigate: (view: string) => void;
}

export const StudyModesView: React.FC<StudyModesViewProps> = ({
  questions,
  onStartMode,
  onNavigate,
}) => {
  const errorQuestions = questions.filter((q) => q.errorCount > 0);
  const favoriteQuestions = questions.filter((q) => q.isFavorite);
  const overdueQuestions = questions.filter((q) => {
    if (q.memoryState === "REVISAR") return true;
    if (!q.nextReviewDate) return false;
    return new Date(q.nextReviewDate).getTime() <= Date.now();
  });

  const modes = [
    {
      id: "TREINO",
      title: "Modo Treino",
      description: "Sem limite de tempo. Foque em compreender cada conceito, analisar a fundamentação pedagógica e aprender sem pressão.",
      badge: "Aprendizado Livre",
      badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300",
      icon: Play,
      action: () => onStartMode("TREINO"),
      btnLabel: "Iniciar Treino",
      countText: `${questions.length} questões disponíveis`,
    },
    {
      id: "DESAFIO",
      title: "Modo Desafio",
      description: "Cronômetro real baseado em timestamps. Desenvolva agilidade mental e raciocínio rápido para provas competitivas.",
      badge: "Com Cronômetro",
      badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300",
      icon: Clock,
      action: () => onStartMode("DESAFIO"),
      btnLabel: "Iniciar Desafio",
      countText: `${questions.length} questões com tempo limite`,
    },
    {
      id: "REVISAO",
      title: "Repetição Espaçada",
      description: "Fila diária calibrada pelo algoritmo SM-2. Intervenha exatamente antes da perda de memória para consolidar retenção definitiva.",
      badge: "Algoritmo SM-2",
      badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300",
      icon: RotateCcw,
      action: () => onStartMode("REVISAO"),
      btnLabel: "Praticar Revisão",
      countText: `${overdueQuestions.length} questões pendentes hoje`,
    },
    {
      id: "SIMULADO",
      title: "Simulado Completo",
      description: "Monte baterias de 10, 20, 30, 50 ou 100 questões com gabarito no final, tempo total de prova e diagnóstico de acertos.",
      badge: "Configurável",
      badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300",
      icon: FileCheck,
      action: () => onNavigate("simulado"),
      btnLabel: "Configurar Prova",
      countText: "Filtros por matéria e nível",
    },
    {
      id: "ERRADAS",
      title: "Treinar Questões Erradas",
      description: "Foque exclusivamente nos itens onde você falhou anteriormente até atingir 100% de precisão e sanar dúvidas.",
      badge: "Recuperação",
      badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300",
      icon: AlertCircle,
      action: () => onNavigate("erradas"),
      btnLabel: "Treinar Erradas",
      countText: `${errorQuestions.length} questões no banco de erros`,
    },
    {
      id: "FAVORITOS",
      title: "Treinar Favoritos",
      description: "Revise apenas as questões marcadas com estrela que você considerou cruciais para o seu exame.",
      badge: "Destaques",
      badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300",
      icon: Bookmark,
      action: () => onNavigate("favoritos"),
      btnLabel: "Treinar Favoritos",
      countText: `${favoriteQuestions.length} questões salvas`,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-6 h-6 text-teal-600" />
          <span>Modos de Estudo MEMORA+</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Selecione a modalidade ideal para a sua rotina de hoje
        </p>
      </div>

      {/* Grid of Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${m.badgeColor}`}
                  >
                    {m.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {m.countText}
                </span>
                <button
                  onClick={m.action}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 text-xs font-bold transition-colors"
                >
                  <span>{m.btnLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
