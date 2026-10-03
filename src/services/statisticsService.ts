import {
  AnswerHistoryRecord,
  GeneralStatsMetrics,
  MemoryDistributionStats,
  ModePerformanceItem,
  PerformanceBreakdownItem,
  Question,
  StatisticsFilterCriteria,
  StatisticsPeriod,
  StudyModeType,
  StudyTimeWindows,
  TemporalEvolutionPoint,
} from "../types";
import { LearningEngine } from "./learningEngine";

/**
 * StatisticsService — Motor de Estatísticas e Análise de Desempenho (Fase 3G)
 *
 * Princípios Arquiteturais:
 * 1. 100% Read-Only: Apenas observa, agrupa, calcula e apresenta.
 * 2. Determinístico e Puro: Sem efeitos colaterais e sem mutações no banco ou histórico.
 * 3. Fonte Canônica Única:
 *    - Métricas de desempenho, tempo, datas e modos: AnswerHistoryRecord[].
 *    - Categorias pedagógicas (disciplina, matéria, assunto, dificuldade, estados de memória): Question[].
 * 4. Respostas em Branco: selectedOption === undefined conta como resposta processada e erro; nunca convertida em fictícia.
 * 5. Datas Locais: Utiliza LearningEngine.formatLocalDayKey para eliminar discrepâncias de fuso horário UTC.
 */
export const StatisticsService = {
  /**
   * Helper para formatar data local "YYYY-MM-DD"
   */
  formatDayKey(date: Date): string {
    return LearningEngine.formatLocalDayKey(date);
  },

  /**
   * Formata exibição amigável de data "DD/MM"
   */
  formatDisplayDate(dStr: string): string {
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dStr;
  },

  /**
   * Filtra o histórico de respostas segundo critérios combinados e contextuais.
   */
  filterHistory(
    history: AnswerHistoryRecord[],
    questionsMap: Map<string, Question>,
    filters: StatisticsFilterCriteria,
    referenceDate: Date = new Date()
  ): AnswerHistoryRecord[] {
    const todayStr = this.formatDayKey(referenceDate);

    // Calcular data limite para período contínuo
    let cutoffStr: string | null = null;
    if (filters.period === "7D") {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - 6);
      cutoffStr = this.formatDayKey(d);
    } else if (filters.period === "30D") {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - 29);
      cutoffStr = this.formatDayKey(d);
    } else if (filters.period === "90D") {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - 89);
      cutoffStr = this.formatDayKey(d);
    }

    return history.filter((h) => {
      if (!h.timestamp) return false;

      // 1. Filtro Temporal (Período)
      if (cutoffStr) {
        const hDate = new Date(h.timestamp);
        if (isNaN(hDate.getTime())) return false;
        const hDay = this.formatDayKey(hDate);
        if (hDay < cutoffStr || hDay > todayStr) return false;
      }

      // 2. Filtro de Modo
      if (filters.mode && filters.mode !== "ALL") {
        if (h.mode !== filters.mode) return false;
      }

      const q = questionsMap.get(h.questionId);

      // 3. Filtro de Disciplina
      if (filters.discipline && filters.discipline !== "ALL") {
        const disc = q?.discipline || q?.subject || "Geral";
        if (disc !== filters.discipline) return false;
      }

      // 4. Filtro de Matéria
      if (filters.subject && filters.subject !== "ALL") {
        const subj = q?.subject || "Geral";
        if (subj !== filters.subject) return false;
      }

      // 5. Filtro de Assunto
      if (filters.topic && filters.topic !== "ALL") {
        const top = q?.topic || "Sem assunto";
        if (top !== filters.topic) return false;
      }

      // 6. Filtro de Dificuldade
      if (filters.difficulty && filters.difficulty !== "ALL") {
        const diff = q?.difficulty;
        if (diff !== filters.difficulty) return false;
      }

      return true;
    });
  },

  /**
   * Bloco 3G.1 — Calcula as Estatísticas Gerais sobre o conjunto filtrado.
   */
  calculateGeneralStats(filteredHistory: AnswerHistoryRecord[]): GeneralStatsMetrics {
    const totalAnswers = filteredHistory.length;
    if (totalAnswers === 0) {
      return {
        totalAnswers: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalBlank: 0,
        accuracyPercent: 0,
        totalTimeMs: 0,
        totalTimeMinutes: 0,
        avgTimeSeconds: 0,
        uniqueQuestionsAnswered: 0,
      };
    }

    let totalCorrect = 0;
    let totalBlank = 0;
    let totalTimeMs = 0;
    const uniqueIds = new Set<string>();

    for (const h of filteredHistory) {
      if (h.isCorrect) {
        totalCorrect++;
      }
      if (h.selectedOption === undefined) {
        totalBlank++;
      }
      totalTimeMs += Math.max(0, h.timeSpentMs || 0);
      if (h.questionId) {
        uniqueIds.add(h.questionId);
      }
    }

    const totalWrong = totalAnswers - totalCorrect;
    const accuracyPercent = Number(((totalCorrect / totalAnswers) * 100).toFixed(1));
    const totalTimeMinutes = Math.round(totalTimeMs / 60000);
    const avgTimeSeconds = Math.round(totalTimeMs / totalAnswers / 1000);

    return {
      totalAnswers,
      totalCorrect,
      totalWrong,
      totalBlank,
      accuracyPercent,
      totalTimeMs,
      totalTimeMinutes,
      avgTimeSeconds,
      uniqueQuestionsAnswered: uniqueIds.size,
    };
  },

  /**
   * Helper genérico para agregação por chave categórica.
   */
  aggregateByExtractor(
    filteredHistory: AnswerHistoryRecord[],
    keyExtractor: (h: AnswerHistoryRecord) => { key: string; label: string }
  ): PerformanceBreakdownItem[] {
    const map = new Map<
      string,
      { label: string; total: number; correct: number; wrong: number; blank: number; timeMs: number }
    >();

    for (const h of filteredHistory) {
      const { key, label } = keyExtractor(h);
      let entry = map.get(key);
      if (!entry) {
        entry = { label, total: 0, correct: 0, wrong: 0, blank: 0, timeMs: 0 };
        map.set(key, entry);
      }

      entry.total++;
      if (h.isCorrect) {
        entry.correct++;
      } else {
        entry.wrong++;
      }
      if (h.selectedOption === undefined) {
        entry.blank++;
      }
      entry.timeMs += Math.max(0, h.timeSpentMs || 0);
    }

    const result: PerformanceBreakdownItem[] = [];
    for (const [key, data] of map.entries()) {
      const acc = data.total > 0 ? Number(((data.correct / data.total) * 100).toFixed(1)) : 0;
      const avgSec = data.total > 0 ? Math.round(data.timeMs / data.total / 1000) : 0;
      result.push({
        key,
        label: data.label,
        totalAnswers: data.total,
        totalCorrect: data.correct,
        totalWrong: data.wrong,
        totalBlank: data.blank,
        accuracyPercent: acc,
        totalTimeMs: data.timeMs,
        avgTimeSeconds: avgSec,
      });
    }

    return result;
  },

  /**
   * Bloco 3G.2 — Agrupamento por Disciplina
   */
  calculateBreakdownByDiscipline(
    filteredHistory: AnswerHistoryRecord[],
    questionsMap: Map<string, Question>
  ): PerformanceBreakdownItem[] {
    return this.aggregateByExtractor(filteredHistory, (h) => {
      const q = questionsMap.get(h.questionId);
      const disc = q?.discipline || q?.subject || "Geral";
      return { key: disc, label: disc };
    });
  },

  /**
   * Bloco 3G.3 — Agrupamento por Matéria (Subject)
   */
  calculateBreakdownBySubject(
    filteredHistory: AnswerHistoryRecord[],
    questionsMap: Map<string, Question>
  ): PerformanceBreakdownItem[] {
    return this.aggregateByExtractor(filteredHistory, (h) => {
      const q = questionsMap.get(h.questionId);
      const subj = q?.subject || "Geral";
      return { key: subj, label: subj };
    });
  },

  /**
   * Bloco 3G.4 — Agrupamento por Assunto (Topic)
   */
  calculateBreakdownByTopic(
    filteredHistory: AnswerHistoryRecord[],
    questionsMap: Map<string, Question>
  ): PerformanceBreakdownItem[] {
    return this.aggregateByExtractor(filteredHistory, (h) => {
      const q = questionsMap.get(h.questionId);
      const top = q?.topic && q.topic.trim().length > 0 ? q.topic.trim() : "Sem assunto";
      return { key: top, label: top };
    });
  },

  /**
   * Bloco 3G.9 — Agrupamento por Dificuldade
   */
  calculateBreakdownByDifficulty(
    filteredHistory: AnswerHistoryRecord[],
    questionsMap: Map<string, Question>
  ): PerformanceBreakdownItem[] {
    const items = this.aggregateByExtractor(filteredHistory, (h) => {
      const q = questionsMap.get(h.questionId);
      const diff = q?.difficulty || "Não informada";
      return { key: diff, label: diff };
    });

    // Ordenação canônica pedagógica: Fácil -> Médio -> Difícil
    const order: Record<string, number> = { Fácil: 1, Médio: 2, Difícil: 3 };
    return items.sort((a, b) => (order[a.key] || 99) - (order[b.key] || 99));
  },

  /**
   * Bloco 3G.7 — Agrupamento por Modo de Estudo
   */
  calculateBreakdownByMode(filteredHistory: AnswerHistoryRecord[]): ModePerformanceItem[] {
    const rawBreakdown = this.aggregateByExtractor(filteredHistory, (h) => {
      const m = h.mode || "TREINO";
      return { key: m, label: m };
    });

    const labelsMap: Record<StudyModeType, string> = {
      TREINO: "Modo Treino",
      SIMULADO: "Modo Simulado",
      REVISAO: "Revisão Espaçada",
      DESAFIO: "Modo Desafio",
    };

    return rawBreakdown.map((item) => ({
      key: item.key,
      mode: item.key as StudyModeType,
      label: labelsMap[item.key as StudyModeType] || item.key,
      totalAnswers: item.totalAnswers,
      totalCorrect: item.totalCorrect,
      totalWrong: item.totalWrong,
      totalBlank: item.totalBlank,
      accuracyPercent: item.accuracyPercent,
      totalTimeMs: item.totalTimeMs,
      avgTimeSeconds: item.avgTimeSeconds,
    }));
  },

  /**
   * Bloco 3G.5 — Evolução Temporal com Continuidade de Dias
   * Para períodos fixos (7D, 30D, 90D), todos os dias do calendário são gerados.
   * Dias sem estudo são explicitamente preenchidos com 0 respostas e 0 tempo.
   */
  calculateTemporalEvolution(
    filteredHistory: AnswerHistoryRecord[],
    period: StatisticsPeriod,
    referenceDate: Date = new Date()
  ): TemporalEvolutionPoint[] {
    // 1. Agrupar histórico existente por chave de dia local "YYYY-MM-DD"
    const dayStats = new Map<
      string,
      { total: number; correct: number; wrong: number; blank: number; timeMs: number }
    >();

    for (const h of filteredHistory) {
      if (!h.timestamp) continue;
      const hDate = new Date(h.timestamp);
      if (isNaN(hDate.getTime())) continue;
      const dKey = this.formatDayKey(hDate);

      let entry = dayStats.get(dKey);
      if (!entry) {
        entry = { total: 0, correct: 0, wrong: 0, blank: 0, timeMs: 0 };
        dayStats.set(dKey, entry);
      }
      entry.total++;
      if (h.isCorrect) entry.correct++;
      else entry.wrong++;
      if (h.selectedOption === undefined) entry.blank++;
      entry.timeMs += Math.max(0, h.timeSpentMs || 0);
    }

    // 2. Determinar a janela de datas contínuas
    let daysCount = 7;
    if (period === "7D") daysCount = 7;
    else if (period === "30D") daysCount = 30;
    else if (period === "90D") daysCount = 90;
    else {
      // "ALL" — Determinar o menor dia do histórico ou os últimos 30 dias se vazio
      if (dayStats.size === 0) {
        daysCount = 14;
      } else {
        const sortedKeys = Array.from(dayStats.keys()).sort();
        const firstDateParts = sortedKeys[0].split("-").map(Number);
        const firstDate = new Date(firstDateParts[0], firstDateParts[1] - 1, firstDateParts[2]);
        const diffDays = Math.max(
          1,
          Math.round((referenceDate.getTime() - firstDate.getTime()) / 86400000) + 1
        );
        daysCount = Math.min(365, Math.max(7, diffDays));
      }
    }

    const timeline: TemporalEvolutionPoint[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      const dStr = this.formatDayKey(d);
      const data = dayStats.get(dStr);

      const total = data?.total || 0;
      const correct = data?.correct || 0;
      const wrong = data?.wrong || 0;
      const blank = data?.blank || 0;
      const timeMs = data?.timeMs || 0;
      const accuracyPercent = total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 0;
      const totalTimeMinutes = Math.round(timeMs / 60000);

      timeline.push({
        date: dStr,
        displayDate: this.formatDisplayDate(dStr),
        totalAnswers: total,
        totalCorrect: correct,
        totalWrong: wrong,
        totalBlank: blank,
        accuracyPercent,
        totalTimeMinutes,
        totalTimeMs: timeMs,
      });
    }

    return timeline;
  },

  /**
   * Bloco 3G.6 — Distribuição do Acervo por Estados Oficiais de Memória
   * Estados permitidos: NOVA | APRENDENDO | REVISAR | DOMINADA
   */
  calculateMemoryDistribution(questions: Question[]): MemoryDistributionStats {
    const totalQuestions = questions.length;
    let novaCount = 0;
    let aprendendoCount = 0;
    let revisarCount = 0;
    let dominadaCount = 0;

    for (const q of questions) {
      const state = q.memoryState || "NOVA";
      if (state === "DOMINADA") dominadaCount++;
      else if (state === "APRENDENDO") aprendendoCount++;
      else if (state === "REVISAR") revisarCount++;
      else novaCount++;
    }

    const novaPercent =
      totalQuestions > 0 ? Number(((novaCount / totalQuestions) * 100).toFixed(1)) : 0;
    const aprendendoPercent =
      totalQuestions > 0 ? Number(((aprendendoCount / totalQuestions) * 100).toFixed(1)) : 0;
    const revisarPercent =
      totalQuestions > 0 ? Number(((revisarCount / totalQuestions) * 100).toFixed(1)) : 0;
    const dominadaPercent =
      totalQuestions > 0 ? Number(((dominadaCount / totalQuestions) * 100).toFixed(1)) : 0;

    return {
      totalQuestions,
      novaCount,
      aprendendoCount,
      revisarCount,
      dominadaCount,
      novaPercent,
      aprendendoPercent,
      revisarPercent,
      dominadaPercent,
    };
  },

  /**
   * Bloco 3G.8 — Cálculo de Janelas Temporais de Tempo de Estudo Ativo
   * Fonte Canônica: AnswerHistoryRecord[] (sem dupla contagem com StudySession)
   */
  calculateTimeWindows(
    history: AnswerHistoryRecord[],
    referenceDate: Date = new Date()
  ): StudyTimeWindows {
    const todayStr = this.formatDayKey(referenceDate);

    const d7 = new Date(referenceDate);
    d7.setDate(d7.getDate() - 6);
    const d7Str = this.formatDayKey(d7);

    const d30 = new Date(referenceDate);
    d30.setDate(d30.getDate() - 29);
    const d30Str = this.formatDayKey(d30);

    let todayMs = 0;
    let last7DaysMs = 0;
    let last30DaysMs = 0;
    let allTimeMs = 0;

    for (const h of history) {
      if (!h.timestamp) continue;
      const hDate = new Date(h.timestamp);
      if (isNaN(hDate.getTime())) continue;
      const hDay = this.formatDayKey(hDate);
      const timeMs = Math.max(0, h.timeSpentMs || 0);

      allTimeMs += timeMs;
      if (hDay === todayStr) {
        todayMs += timeMs;
      }
      if (hDay >= d7Str && hDay <= todayStr) {
        last7DaysMs += timeMs;
      }
      if (hDay >= d30Str && hDay <= todayStr) {
        last30DaysMs += timeMs;
      }
    }

    const avgSec = history.length > 0 ? Math.round(allTimeMs / history.length / 1000) : 0;

    return {
      todayTimeMinutes: Math.round(todayMs / 60000),
      last7DaysTimeMinutes: Math.round(last7DaysMs / 60000),
      last30DaysTimeMinutes: Math.round(last30DaysMs / 60000),
      allTimeMinutes: Math.round(allTimeMs / 60000),
      avgTimeSecondsPerQuestion: avgSec,
    };
  },
};
