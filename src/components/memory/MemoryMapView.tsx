import React, { useState } from "react";
import { MemoryState, Question } from "../../types";
import {
  BrainCircuit,
  Award,
  RotateCcw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Layers,
  Search,
} from "lucide-react";
import { MnemosyneSymbol } from "../branding/MnemosyneLogo";

interface MemoryMapViewProps {
  questions: Question[];
  onStartReview: () => void;
  onFilterSubjectInBank: (subject: string) => void;
}

export const MemoryMapView: React.FC<MemoryMapViewProps> = ({
  questions,
  onStartReview,
  onFilterSubjectInBank,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Status breakdown
  const total = questions.length;
  const dominated = questions.filter((q) => q.memoryState === "DOMINADA");
  const review = questions.filter((q) => q.memoryState === "REVISAR");
  const learning = questions.filter((q) => q.memoryState === "APRENDENDO");
  const novas = questions.filter((q) => q.memoryState === "NOVA");

  const dominatedPercent = total > 0 ? Math.round((dominated.length / total) * 100) : 0;
  const reviewPercent = total > 0 ? Math.round((review.length / total) * 100) : 0;
  const learningPercent = total > 0 ? Math.round((learning.length / total) * 100) : 0;
  const novasPercent = total > 0 ? Math.round((novas.length / total) * 100) : 0;

  // Group by Subject and Topic for Knowledge Tree
  const subjectTree = React.useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        dominated: number;
        learning: number;
        review: number;
        novas: number;
        topics: Record<string, number>;
      }
    > = {};

    questions.forEach((q) => {
      const sub = q.subject || "Geral";
      const top = q.topic || "Diversos";
      if (!map[sub]) {
        map[sub] = {
          total: 0,
          dominated: 0,
          learning: 0,
          review: 0,
          novas: 0,
          topics: {},
        };
      }
      map[sub].total++;
      if (q.memoryState === "DOMINADA") map[sub].dominated++;
      else if (q.memoryState === "APRENDENDO") map[sub].learning++;
      else if (q.memoryState === "REVISAR") map[sub].review++;
      else map[sub].novas++;

      map[sub].topics[top] = (map[sub].topics[top] || 0) + 1;
    });

    return Object.entries(map).map(([subject, data]) => ({
      subject,
      ...data,
      retentionRate: Math.round((data.dominated / Math.max(1, data.total)) * 100),
    }));
  }, [questions]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-4 -bottom-6 opacity-20 pointer-events-none">
          <MnemosyneSymbol size={180} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Engrama Cognitivo & Retenção</span>
          </div>
          <h1 className="text-2xl font-black mb-1">
            Minha Memória & Árvore de Conhecimento
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Acompanhe o estado de consolidação neurológica de cada questão cadastrada. O objetivo do MEMORA+ é transformar todas as questões em &quot;Dominadas&quot; através da repetição espaçada.
          </p>
        </div>
      </div>

      {/* 2. Status Breakdown (Requirement 27) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total de Questões
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {total}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">100% do acervo</div>
        </div>

        {/* Dominadas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-teal-200 dark:border-teal-900/60 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            Dominadas
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {dominated.length}
          </div>
          <div className="text-[10px] text-teal-700 dark:text-teal-500 mt-1">
            {dominatedPercent}% retidas
          </div>
        </div>

        {/* Em Revisão */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            Em Revisão
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {review.length}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-500 mt-1">
            {reviewPercent}% pendentes
          </div>
        </div>

        {/* Aprendendo */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            Aprendendo
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {learning.length}
          </div>
          <div className="text-[10px] text-indigo-700 dark:text-indigo-500 mt-1">
            {learningPercent}% em consolidação
          </div>
        </div>

        {/* Novas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Novas
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
            {novas.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{novasPercent}% não vistas</div>
        </div>
      </div>

      {/* 3. Memory Consolidation Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Espectro da Memória de Longo Prazo
          </span>
          <span className="text-teal-600 dark:text-teal-400 font-bold">
            {dominatedPercent}% consolidado
          </span>
        </div>

        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${dominatedPercent}%` }}
            title={`Dominadas: ${dominatedPercent}%`}
          />
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${learningPercent}%` }}
            title={`Aprendendo: ${learningPercent}%`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${reviewPercent}%` }}
            title={`Revisar: ${reviewPercent}%`}
          />
          <div
            className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
            style={{ width: `${novasPercent}%` }}
            title={`Novas: ${novasPercent}%`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>Dominadas</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Aprendendo</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Revisar</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Novas</span>
            </span>
          </div>

          {review.length > 0 && (
            <button
              onClick={onStartReview}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              Revisar {review.length} questões agora →
            </button>
          )}
        </div>
      </div>

      {/* 4. Knowledge Tree / Mapa da Memória (Requirement 28) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Árvore de Conhecimento & Retenção por Matéria</span>
            </h2>
            <p className="text-xs text-slate-500">
              Conexões e taxa de fixação em cada ramo do seu plano de estudo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectTree.map((item) => {
            const isSelected = selectedSubject === item.subject;
            return (
              <div
                key={item.subject}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.subject}
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      {item.total} questões cadastradas • {item.dominated} dominadas
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      item.retentionRate >= 50
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {item.retentionRate}% retido
                  </span>
                </div>

                {/* Progress Mini Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 to-teal-500"
                    style={{ width: `${item.retentionRate}%` }}
                  />
                </div>

                {/* Topics Tag Cloud */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Assuntos / Conexões:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(item.topics).map(([top, count]) => (
                      <span
                        key={top}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <span>{top}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({count})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {item.review > 0 ? `${item.review} aguardando revisão` : "Em dia"}
                  </span>
                  <button
                    onClick={() => onFilterSubjectInBank(item.subject)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Ver no banco</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
