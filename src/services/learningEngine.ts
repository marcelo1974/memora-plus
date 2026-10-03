import {
  AnswerHistoryRecord,
  DailyGoalProgress,
  MemoryState,
  OptionLetter,
  Question,
  SpacedReviewRating,
  StudyModeType,
  UserSettings,
  WeekDayStudyStatus,
} from "../types";
import { calculateSpacedReview, getReviewQueue } from "./spacedRepetition";
import { StorageService } from "./storageService";

export interface PedagogicalEvaluationResult {
  memoryState: MemoryState;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastReviewDate?: string;
  correctCount: number;
  errorCount: number;
  lastAnsweredAt: string;
  lastWasCorrect: boolean;
  averageTimeSpentMs: number;
}

export interface ReviewQueueDetails {
  queue: Question[];
  overdue: Question[];
  dueToday: Question[];
  totalCount: number;
  overdueCount: number;
  dueTodayCount: number;
}

export interface RetentionMetrics {
  totalQuestions: number;
  novaCount: number;
  aprendendoCount: number;
  revisarCount: number;
  dominadaCount: number;
  dueTodayCount: number;
  overdueCount: number;
  retentionRate: number; // % de questões estudadas que estão DOMINADA
  overallAccuracy: number; // % geral de acerto
  averageEaseFactor: number;
}

export interface StudyFilterCriteria {
  discipline?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  memoryState?: MemoryState | "TODOS";
  performanceFilter?: "TODAS" | "ERRADAS" | "RECENTES_ERRADAS" | "NUNCA_RESPONDIDAS" | "FAVORITAS";
  onlyFavorites?: boolean;
  onlyErrors?: boolean;
  onlyRecentErrors?: boolean;
  onlyUnanswered?: boolean;
  limit?: number;
  shuffle?: boolean;
}

export interface StudyStreakDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Dom", "Seg", etc.
  count: number;
  active: boolean;
}

export interface StudyStreakInfo {
  currentStreak: number;
  bestStreak: number;
  todayCount: number;
  weeklyActiveDays: number;
  last7Days: StudyStreakDay[];
}

/**
 * MEMORA+ LEARNING ENGINE (MOTOR CENTRAL DE APRENDIZAGEM)
 *
 * Centraliza toda a inteligência pedagógica do aplicativo:
 * - Avaliação de respostas (Treino, Simulado, Revisão);
 * - Curva de esquecimento e repetição espaçada (SM-2 adaptativo);
 * - Gestão de estados de memória (NOVA -> APRENDENDO -> REVISAR -> DOMINADA);
 * - Atualização transacional e atômica para evitar escritas em disco repetitivas;
 * - Cálculo de métricas de retenção e seleção de questões para estudo.
 */
export const LearningEngine = {
  /**
   * Avalia uma resposta e calcula a progressão pedagógica da questão.
   * Função pura e determinística: preserva todos os campos existentes e atualiza os 11 parâmetros de retenção.
   */
  evaluatePedagogicalProgress(
    question: Question,
    isCorrect: boolean,
    timeSpentMs: number,
    mode: StudyModeType,
    explicitRating?: SpacedReviewRating
  ): PedagogicalEvaluationResult {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // 1. Contadores acumulados
    const prevCorrect = question.correctCount || 0;
    const prevError = question.errorCount || 0;
    const newCorrect = isCorrect ? prevCorrect + 1 : prevCorrect;
    const newError = !isCorrect ? prevError + 1 : prevError;
    const totalAnswers = newCorrect + newError;

    // 2. Média ponderada de tempo
    const currentAvgTime = question.averageTimeSpentMs || 0;
    const newAvgTime =
      totalAnswers > 0
        ? Math.round(
            (currentAvgTime * (totalAnswers - 1) + Math.max(0, timeSpentMs)) /
              totalAnswers
          )
        : timeSpentMs;

    // 3. Avaliação Cognitiva e Curva de Retenção
    let memoryState: MemoryState = question.memoryState || "NOVA";
    let repetitionCount = question.repetitionCount || 0;
    let easeFactor = question.easeFactor || 2.5;
    let intervalDays = question.intervalDays || 1;
    let nextReviewDate = question.nextReviewDate || nowIso;
    let lastReviewDate = question.lastReviewDate;

    // CONTEXTO A: Avaliação explícita de flashcard (Revisão Espaçada SM-2)
    // Executa calculateSpacedReview() exclusivamente quando há rating explícito
    if (explicitRating) {
      const sm2Result = calculateSpacedReview(question, explicitRating);
      memoryState = sm2Result.memoryState;
      repetitionCount = sm2Result.repetitionCount;
      easeFactor = sm2Result.easeFactor;
      intervalDays = sm2Result.intervalDays;
      nextReviewDate = sm2Result.nextReviewDate;
      lastReviewDate = sm2Result.lastReviewDate;
    }
    // CONTEXTO B: Respostas comuns (Treino, Simulado, Desafio)
    // Preserva os campos SM-2 e o memoryState original da questão sem inventar novas regras.

    return {
      memoryState,
      repetitionCount,
      easeFactor,
      intervalDays,
      nextReviewDate,
      lastReviewDate,
      correctCount: newCorrect,
      errorCount: newError,
      lastAnsweredAt: nowIso,
      lastWasCorrect: isCorrect,
      averageTimeSpentMs: newAvgTime,
    };
  },

  /**
   * Processa uma única resposta dada pelo usuário em qualquer tela (Treino, Simulado, Revisão).
   * Atualiza a questão com o motor pedagógico, registra o histórico e incrementa a meta diária.
   */
  processAnswer(record: AnswerHistoryRecord): {
    updatedQuestion: Question | null;
    record: AnswerHistoryRecord;
  } {
    const questions = StorageService.getQuestions();
    const qIndex = questions.findIndex((q) => q.id === record.questionId);

    let updatedQuestion: Question | null = null;

    if (qIndex >= 0) {
      const currentQ = questions[qIndex];
      const evaluation = this.evaluatePedagogicalProgress(
        currentQ,
        record.isCorrect,
        record.timeSpentMs,
        record.mode,
        record.reviewRating
      );

      updatedQuestion = {
        ...currentQ,
        ...evaluation,
        updatedAt: new Date().toISOString(),
      };

      questions[qIndex] = updatedQuestion;
      StorageService.saveQuestions(questions);
    }

    // Salva histórico de resposta
    const history = StorageService.getAnswerHistory();
    history.unshift(record);
    if (history.length > 5000) history.length = 5000;
    try {
      StorageService.saveAnswerHistoryBatch([record]);
    } catch {
      // Fallback para persistência regular
      StorageService.recordAnswer(record);
    }

    // Incrementa meta diária
    StorageService.incrementDailyGoalCount(1);

    return { updatedQuestion, record };
  },

  /**
   * Processa em lote as respostas de um Simulado completo ou sessão em bloco.
   * OTIMIZAÇÃO CRÍTICA: Realiza uma única leitura e uma única escrita de questões e histórico no storage,
   * eliminando o travamento de UI identificado no Bloco 3A.
   */
  processBatchAnswers(records: AnswerHistoryRecord[]): {
    updatedQuestions: Question[];
    totalProcessed: number;
  } {
    if (!records || records.length === 0) {
      return { updatedQuestions: [], totalProcessed: 0 };
    }

    const allQuestions = StorageService.getQuestions();
    const questionsMap = new Map<string, Question>();
    allQuestions.forEach((q) => questionsMap.set(q.id, q));

    const updatedQuestionsList: Question[] = [];

    // Processa cada resposta na memória
    for (const record of records) {
      const q = questionsMap.get(record.questionId);
      if (q) {
        const evaluation = this.evaluatePedagogicalProgress(
          q,
          record.isCorrect,
          record.timeSpentMs,
          record.mode,
          record.reviewRating
        );

        const updated: Question = {
          ...q,
          ...evaluation,
          updatedAt: new Date().toISOString(),
        };

        questionsMap.set(q.id, updated);
        updatedQuestionsList.push(updated);
      }
    }

    // Salva todas as questões atualizadas de uma só vez
    const finalQuestionsArray = Array.from(questionsMap.values());
    StorageService.saveQuestions(finalQuestionsArray);

    // Salva todo o lote de histórico de uma só vez
    StorageService.saveAnswerHistoryBatch(records);

    // Incrementa a meta diária com a quantidade total de questões respondidas
    StorageService.incrementDailyGoalCount(records.length);

    return {
      updatedQuestions: updatedQuestionsList,
      totalProcessed: records.length,
    };
  },

  /**
   * Retorna as questões que necessitam de revisão imediata delegando para a fila oficial do SM-2:
   * 1. Questões marcadas com estado 'REVISAR'
   * 2. Questões cuja data programada de revisão já venceu (nextReviewDate <= agora)
   * Ordena das mais atrasadas / urgentes para as menos urgentes.
   */
  getDueReviews(questions: Question[]): Question[] {
    return getReviewQueue(questions);
  },

  /**
   * Classifica a fila oficial do SM-2 distinguindo questões atrasadas, para hoje e total disponível.
   * Utiliza a função getReviewQueue/getDueReviews sem alterar a prioridade oficial do SM-2.
   */
  getReviewQueueDetails(questions: Question[]): ReviewQueueDetails {
    const queue = this.getDueReviews(questions);
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    const overdue: Question[] = [];
    const dueToday: Question[] = [];

    queue.forEach((q) => {
      const reviewTime = q.nextReviewDate ? new Date(q.nextReviewDate).getTime() : 0;
      if (q.memoryState === "REVISAR" || reviewTime < startOfToday) {
        overdue.push(q);
      } else {
        dueToday.push(q);
      }
    });

    return {
      queue,
      overdue,
      dueToday,
      totalCount: queue.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
    };
  },

  /**
   * Calcula o panorama consolidado de retenção e curva de aprendizagem do banco de questões.
   */
  getRetentionMetrics(
    questions: Question[],
    history: AnswerHistoryRecord[] = []
  ): RetentionMetrics {
    const totalQuestions = questions.length;
    let novaCount = 0;
    let aprendendoCount = 0;
    let revisarCount = 0;
    let dominadaCount = 0;
    let totalEase = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;

    const now = Date.now();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayTime = endOfToday.getTime();

    for (const q of questions) {
      const state = q.memoryState || "NOVA";
      if (state === "DOMINADA") dominadaCount++;
      else if (state === "APRENDENDO") aprendendoCount++;
      else if (state === "REVISAR") revisarCount++;
      else novaCount++;

      totalEase += q.easeFactor || 2.5;

      if (q.nextReviewDate) {
        const reviewTime = new Date(q.nextReviewDate).getTime();
        if (reviewTime <= now || state === "REVISAR") {
          overdueCount++;
          dueTodayCount++;
        } else if (reviewTime <= endOfTodayTime) {
          dueTodayCount++;
        }
      }
    }

    const studiedCount = aprendendoCount + revisarCount + dominadaCount;
    const retentionRate =
      studiedCount > 0 ? Math.round((dominadaCount / studiedCount) * 100) : 0;

    const averageEaseFactor =
      totalQuestions > 0 ? Number((totalEase / totalQuestions).toFixed(2)) : 2.5;

    // Acurácia geral baseada no histórico ou nos contadores das questões
    let overallAccuracy = 0;
    if (history.length > 0) {
      const correct = history.filter((h) => h.isCorrect).length;
      overallAccuracy = Math.round((correct / history.length) * 100);
    } else {
      let totalC = 0;
      let totalE = 0;
      for (const q of questions) {
        totalC += q.correctCount || 0;
        totalE += q.errorCount || 0;
      }
      const sum = totalC + totalE;
      overallAccuracy = sum > 0 ? Math.round((totalC / sum) * 100) : 0;
    }

    return {
      totalQuestions,
      novaCount,
      aprendendoCount,
      revisarCount,
      dominadaCount,
      dueTodayCount,
      overdueCount,
      retentionRate,
      overallAccuracy,
      averageEaseFactor,
    };
  },

  /**
   * Filtra e seleciona questões para uma sessão de estudo conforme critérios pedagógicos.
   */
  getQuestionsForStudy(
    questions: Question[],
    criteria: StudyFilterCriteria
  ): Question[] {
    let filtered = [...questions];

    if (criteria.discipline) {
      filtered = filtered.filter(
        (q) =>
          q.discipline === criteria.discipline || q.subject === criteria.discipline
      );
    }

    if (criteria.subject) {
      filtered = filtered.filter(
        (q) => q.subject === criteria.subject || q.discipline === criteria.subject
      );
    }

    if (criteria.topic) {
      filtered = filtered.filter((q) => q.topic === criteria.topic);
    }

    if (criteria.difficulty && criteria.difficulty !== "TODOS") {
      filtered = filtered.filter((q) => q.difficulty === criteria.difficulty);
    }

    if (criteria.memoryState && criteria.memoryState !== "TODOS") {
      filtered = filtered.filter((q) => q.memoryState === criteria.memoryState);
    }

    if (criteria.onlyFavorites || criteria.performanceFilter === "FAVORITAS") {
      filtered = filtered.filter((q) => q.isFavorite === true);
    }

    if (criteria.onlyErrors || criteria.performanceFilter === "ERRADAS") {
      filtered = filtered.filter((q) => (q.errorCount || 0) > 0);
    }

    if (criteria.onlyRecentErrors || criteria.performanceFilter === "RECENTES_ERRADAS") {
      filtered = filtered.filter((q) => q.lastWasCorrect === false);
    }

    if (criteria.onlyUnanswered || criteria.performanceFilter === "NUNCA_RESPONDIDAS") {
      filtered = filtered.filter(
        (q) => !q.lastAnsweredAt && (q.correctCount || 0) === 0 && (q.errorCount || 0) === 0
      );
    }

    if (criteria.shuffle) {
      filtered = filtered.sort(() => Math.random() - 0.5);
    }

    if (criteria.limit && criteria.limit > 0) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  },

  /**
   * Calcula o streak de estudo e constância a partir do histórico de respostas.
   * Função pura e determinística.
   */
  calculateStudyStreak(history: AnswerHistoryRecord[] = []): StudyStreakInfo {
    const dayCounts = new Map<string, number>();

    for (const h of history) {
      if (!h.timestamp) continue;
      const dateStr = h.timestamp.substring(0, 10);
      dayCounts.set(dateStr, (dayCounts.get(dateStr) || 0) + 1);
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayCount = dayCounts.get(todayStr) || 0;

    // Calcular dias consecutivos (Streak Atual)
    let currentStreak = 0;
    const checkDate = new Date(now);

    // Se hoje ainda não teve questões respondidas, verificar a partir de ontem para preservar a ofensiva
    if (todayCount === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if ((dayCounts.get(dStr) || 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calcular Maior Sequência Histórica (Best Streak)
    const sortedUniqueDates = Array.from(dayCounts.keys()).sort();
    let bestStreak = 0;
    let runningStreak = 0;
    let prevDateTime: number | null = null;

    for (const dStr of sortedUniqueDates) {
      const parts = dStr.split("-").map(Number);
      if (parts.length !== 3) continue;
      const curDateTime = new Date(parts[0], parts[1] - 1, parts[2]).getTime();

      if (prevDateTime === null) {
        runningStreak = 1;
      } else {
        const diffDays = Math.round((curDateTime - prevDateTime) / 86400000);
        if (diffDays === 1) {
          runningStreak++;
        } else if (diffDays > 1) {
          runningStreak = 1;
        }
      }
      prevDateTime = curDateTime;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    }
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    // Últimos 7 dias
    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const last7Days: StudyStreakDay[] = [];
    let weeklyActiveDays = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = dayCounts.get(dStr) || 0;
      const active = count > 0;
      if (active) weeklyActiveDays++;

      last7Days.push({
        date: dStr,
        dayLabel: dayLabels[d.getDay()],
        count,
        active,
      });
    }

    return {
      currentStreak,
      bestStreak,
      todayCount,
      weeklyActiveDays,
      last7Days,
    };
  },

  /**
   * Converte qualquer objeto Date na chave local "YYYY-MM-DD" sem desvios de UTC.
   */
  formatLocalDayKey(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /**
   * Calcula o progresso completo e determinístico das Metas de Estudo (Fase 3F).
   * Consolida as 4 dimensões:
   * 1. Meta Diária de Questões
   * 2. Meta Diária de Tempo Efetivo (baseada no timeSpentMs de cada resposta do histórico)
   * 3. Meta Semanal de Dias Estudados (Segunda-feira a Domingo)
   * 4. Streak e Maior Sequência Histórica
   */
  calculateGoalsProgress(
    history: AnswerHistoryRecord[] = [],
    settings: UserSettings,
    referenceDate: Date = new Date(),
    legacyProgress?: Partial<DailyGoalProgress>
  ): DailyGoalProgress {
    const todayStr = this.formatLocalDayKey(referenceDate);

    // Agrega histórico por chave local de dia ("YYYY-MM-DD")
    const dayStats = new Map<
      string,
      { questionsCount: number; timeSpentMs: number; modes: Record<string, number> }
    >();

    for (const h of history) {
      if (!h.timestamp) continue;
      const hDate = new Date(h.timestamp);
      if (isNaN(hDate.getTime())) continue;
      const dayKey = this.formatLocalDayKey(hDate);

      const existing = dayStats.get(dayKey) || {
        questionsCount: 0,
        timeSpentMs: 0,
        modes: {},
      };
      existing.questionsCount += 1;
      existing.timeSpentMs += Math.max(0, h.timeSpentMs || 0);
      existing.modes[h.mode] = (existing.modes[h.mode] || 0) + 1;
      dayStats.set(dayKey, existing);
    }

    const todayStats = dayStats.get(todayStr) || {
      questionsCount: 0,
      timeSpentMs: 0,
      modes: {},
    };

    // 1. Meta Diária de Questões
    const completedQuestions = Math.max(
      todayStats.questionsCount,
      legacyProgress?.completed && legacyProgress.date === todayStr ? legacyProgress.completed : 0
    );
    const questionsTarget = settings.dailyGoalTarget || legacyProgress?.target || 50;

    // 2. Meta Diária de Tempo Efetivo (tempo acumulado das respostas)
    const timeCompletedMs = todayStats.timeSpentMs;
    const timeCompletedMinutes = Math.round(timeCompletedMs / 60000);
    const timeTargetMinutes = settings.dailyTimeGoalMinutes || 30;

    // 3. Meta Semanal (Segunda-feira a Domingo)
    const weeklyTargetDays = settings.weeklyDaysGoalTarget || 5;

    // Encontra a segunda-feira da semana de referência
    const currentDayOfWeek = referenceDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const weekDaysProgress: WeekDayStudyStatus[] = [];
    let weeklyCompletedDays = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dStr = this.formatLocalDayKey(dayDate);
      const stats = dayStats.get(dStr);
      const qCount = stats?.questionsCount || 0;
      const studied = qCount > 0;
      if (studied) {
        weeklyCompletedDays++;
      }

      weekDaysProgress.push({
        date: dStr,
        dayLabel: weekLabels[i],
        dayIndex: i,
        studied,
        questionsCount: qCount,
        timeSpentMs: stats?.timeSpentMs || 0,
        isToday: dStr === todayStr,
      });
    }

    // 4. Streak Atual e Melhor Sequência Histórica
    let currentStreak = 0;
    const checkDate = new Date(referenceDate);

    // Se hoje ainda não teve questões respondidas, não quebrar prematuramente:
    // verificar a partir de ontem para preservar a sequência válida até o fim do dia
    if (todayStats.questionsCount === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = this.formatLocalDayKey(checkDate);
      const count = dayStats.get(dStr)?.questionsCount || 0;
      if (count > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Maior sequência histórica de dias consecutivos estudados
    const sortedUniqueDates = Array.from(dayStats.keys())
      .filter((dKey) => (dayStats.get(dKey)?.questionsCount || 0) > 0)
      .sort();

    let bestStreak = 0;
    let runningStreak = 0;
    let prevDateTime: number | null = null;

    for (const dStr of sortedUniqueDates) {
      const parts = dStr.split("-").map(Number);
      if (parts.length !== 3) continue;
      const curDateTime = new Date(parts[0], parts[1] - 1, parts[2]).getTime();

      if (prevDateTime === null) {
        runningStreak = 1;
      } else {
        const diffDays = Math.round((curDateTime - prevDateTime) / 86400000);
        if (diffDays === 1) {
          runningStreak++;
        } else if (diffDays > 1) {
          runningStreak = 1;
        }
      }
      prevDateTime = curDateTime;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    }

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    return {
      date: todayStr,
      target: questionsTarget,
      completed: completedQuestions,
      timeTargetMinutes,
      timeCompletedMinutes,
      timeCompletedMs,
      weeklyTargetDays,
      weeklyCompletedDays,
      currentStreak,
      bestStreak,
      weekDaysProgress,
    };
  },
};
