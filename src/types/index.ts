export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export type MemoryState = "NOVA" | "APRENDENDO" | "REVISAR" | "DOMINADA";

export type SpacedReviewRating = "NAO_LEMBRO" | "DIFICIL" | "BOM" | "FACIL";

export type QuestionDifficulty = "Fácil" | "Médio" | "Difícil";

export type StudyModeType = "TREINO" | "DESAFIO" | "SIMULADO" | "REVISAO";

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctOption: OptionLetter;
  explanation: string;
  discipline?: string;
  subject: string;
  topic: string;
  difficulty: QuestionDifficulty;
  estimatedTime: number; // in seconds
  tags: string[];
  isFavorite: boolean;
  origin?: string;
  observation?: string;
  
  // Spaced Repetition & Retention
  memoryState: MemoryState;
  repetitionCount: number;
  easeFactor: number; // SM-2 default 2.5
  intervalDays: number; // Next interval in days
  nextReviewDate: string; // ISO string
  lastReviewDate?: string;
  
  // Performance history
  errorCount: number;
  correctCount: number;
  lastAnsweredAt?: string;
  lastWasCorrect?: boolean;
  averageTimeSpentMs: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface AnswerHistoryRecord {
  id: string;
  questionId: string;
  selectedOption?: OptionLetter;
  isCorrect: boolean;
  timeSpentMs: number;
  timestamp: string; // ISO
  mode: StudyModeType;
  reviewRating?: SpacedReviewRating;
}

export interface StudySession {
  id: string;
  mode: StudyModeType;
  title: string;
  startTime: number; // timestamp
  endTime?: number;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, OptionLetter>;
  results: Record<string, boolean>;
  timeSpentPerQuestion: Record<string, number>; // in ms
  completed: boolean;
  scorePercent: number;
  totalCorrect: number;
  totalWrong: number;
}

export interface SimuladoFilterOptions {
  count: 10 | 20 | 30 | 50 | 100;
  subject?: string;
  topic?: string;
  difficulty?: string;
  timeLimitMinutes?: number;
}

export interface KnowledgeNode {
  subject: string;
  topics: {
    name: string;
    totalQuestions: number;
    dominatedCount: number;
    learningCount: number;
    needsReviewCount: number;
    unstudiedCount: number;
    accuracyRate: number;
    status: "DOMINADO" | "PRECISA_REVISAO" | "NAO_ESTUDADO";
  }[];
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  dailyGoalTarget: number;
  dailyTimeGoalMinutes?: number;
  weeklyDaysGoalTarget?: number;
  fontSize: "normal" | "large" | "extra-large" | "small" | "medium";
  highContrast: boolean;
  soundEffects: boolean;
  autoAdvanceDelayMs: number;
  timerEnabled: boolean;
  defaultTimeLimitSeconds?: number;
  customLogoUrl?: string;
  customBrandName?: string;
  customSlogan?: string;
}

export interface WeekDayStudyStatus {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  dayIndex: number; // 0=Segunda, ..., 6=Domingo
  studied: boolean;
  questionsCount: number;
  timeSpentMs: number;
  isToday: boolean;
}

export interface DailyGoalProgress {
  date: string; // YYYY-MM-DD
  target: number;
  completed: number;
  timeTargetMinutes: number;
  timeCompletedMinutes: number;
  timeCompletedMs: number;
  weeklyTargetDays: number;
  weeklyCompletedDays: number;
  currentStreak: number;
  bestStreak: number;
  weekDaysProgress: WeekDayStudyStatus[];
}

export interface CsvInvalidRow {
  rowNumber: number;
  raw: string;
  error: string;
  field?: string;
  isDuplicateId?: boolean;
}

export interface CsvValidItem {
  id: string;
  rowNumber: number;
  question: Partial<Question>;
  isCustomId: boolean;
}

export interface CsvValidationResult {
  validRows: Partial<Question>[];
  validItems: CsvValidItem[];
  invalidRows: CsvInvalidRow[];
  duplicateCount: number;
  totalCount: number;
}

// ----------------------------------------------------
// FASE 3G — ESTATÍSTICAS E ANÁLISE DE DESEMPENHO
// ----------------------------------------------------
export type StatisticsPeriod = "7D" | "30D" | "90D" | "ALL";

export interface StatisticsFilterCriteria {
  period: StatisticsPeriod;
  discipline?: string;
  subject?: string;
  topic?: string;
  mode?: StudyModeType | "ALL";
  difficulty?: QuestionDifficulty | "ALL";
}

export interface GeneralStatsMetrics {
  totalAnswers: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  accuracyPercent: number;
  totalTimeMs: number;
  totalTimeMinutes: number;
  avgTimeSeconds: number;
  uniqueQuestionsAnswered: number;
}

export interface PerformanceBreakdownItem {
  key: string;
  label: string;
  totalAnswers: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  accuracyPercent: number;
  totalTimeMs: number;
  avgTimeSeconds: number;
}

export interface TemporalEvolutionPoint {
  date: string; // YYYY-MM-DD local
  displayDate: string; // DD/MM
  totalAnswers: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  accuracyPercent: number;
  totalTimeMinutes: number;
  totalTimeMs: number;
}

export interface ModePerformanceItem extends PerformanceBreakdownItem {
  mode: StudyModeType;
}

export interface MemoryDistributionStats {
  totalQuestions: number;
  novaCount: number;
  aprendendoCount: number;
  revisarCount: number;
  dominadaCount: number;
  novaPercent: number;
  aprendendoPercent: number;
  revisarPercent: number;
  dominadaPercent: number;
}

export interface StudyTimeWindows {
  todayTimeMinutes: number;
  last7DaysTimeMinutes: number;
  last30DaysTimeMinutes: number;
  allTimeMinutes: number;
  avgTimeSecondsPerQuestion: number;
}

// ----------------------------------------------------
// FASE 4A — PERSISTÊNCIA ROBUSTA & INDEXEDDB
// ----------------------------------------------------
export interface AppStorageMetadata {
  schemaVersion: number;
  migrationVersion: number;
  migrationStatus: "NOT_STARTED" | "IN_PROGRESS" | "VALIDATING" | "COMPLETED" | "FAILED" | "PENDING" | "SKIPPED";
  migrationStartedAt?: string;
  migrationCompletedAt?: string;
  source?: string;
  target?: string;
  validationStatus?: "PASSED" | "FAILED" | "NOT_RUN";
  lastIntegrityCheck: string;
  createdAt: string;
  updatedAt: string;
}

export type StorageErrorType =
  | "OPEN_FAILED"
  | "TRANSACTION_FAILED"
  | "QUOTA_EXCEEDED"
  | "INVALID_DATA"
  | "VERSION_ERROR"
  | "ABORTED"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "CORRUPTED_DATA"
  | "UNKNOWN";

export interface StorageErrorDetail {
  type: StorageErrorType;
  message: string;
  storeName?: string;
  originalError?: any;
}

// ----------------------------------------------------
// FASE 4C — QUOTA, INTEGRIDADE E SAÚDE DO STORAGE
// ----------------------------------------------------
export type StorageHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "ERROR" | "UNSUPPORTED";
export type PersistenceStatus = "SUPPORTED" | "GRANTED" | "DENIED" | "UNSUPPORTED" | "UNKNOWN";
export type IntegrityOverallStatus = "PASS" | "WARNING" | "FAIL";

export interface StorageHealth {
  status: StorageHealthStatus;
  storageManagerSupported: boolean;
  usageBytes?: number;
  quotaBytes?: number;
  usagePercentage?: number;
  persistenceStatus: PersistenceStatus;
  persistent: boolean;
  integrityStatus: IntegrityOverallStatus | "NOT_RUN";
  lastCheck: string;
  statusMessage?: string;
}

export interface StoreIntegrityItem {
  name: string;
  count: number;
  status: "OK" | "WARNING" | "ERROR";
  message?: string;
}

export interface IntegrityCheckReport {
  overall: IntegrityOverallStatus;
  timestamp: string;
  schemaVersion: number;
  migrationStatus: string;
  stores: StoreIntegrityItem[];
  questionsCount: number;
  historyCount: number;
  sessionsCount: number;
  hasSettings: boolean;
  hasGoals: boolean;
  orphanHistoryCount: number;
  anomalies: string[];
}

