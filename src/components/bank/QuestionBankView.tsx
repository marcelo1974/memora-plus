import React, { useState, useMemo, useEffect } from "react";
import {
  CsvValidationResult,
  MemoryState,
  OptionLetter,
  Question,
  QuestionDifficulty,
} from "../../types";
import { CsvService } from "../../services/csvService";
import { StorageService } from "../../services/storageService";
import {
  Database,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  ClipboardPaste,
  Download,
  Trash2,
  Edit2,
  Copy,
  Bookmark,
  CheckCircle2,
  Eye,
  AlertCircle,
  AlertTriangle,
  X,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Tag,
  Check,
  Upload,
  FileUp,
  FileDown,
  CheckSquare,
  Square,
  FileText,
  HardDrive,
  ListFilter,
  HelpCircle,
} from "lucide-react";

interface QuestionBankViewProps {
  questions: Question[];
  onAddQuestion: (q: Partial<Question>) => void;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkAddQuestions: (newQs: Partial<Question>[]) => number;
  onToggleFavorite: (id: string) => void;
}

type SortOption = "recentes" | "antigas" | "mais_erradas" | "alfabetica";

interface FormDataState {
  question: string;
  discipline: string;
  subject: string;
  topic: string;
  numAlternatives: 4 | 5;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctOption: OptionLetter;
  explanation: string;
  difficulty: QuestionDifficulty;
  tagsString: string;
  origin: string;
  observation: string;
  isFavorite: boolean;
  estimatedTime: number;
}

// Normalizador de texto sem acentos e minúsculo (para busca em português offline)
function normalizeSearchText(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onBulkAddQuestions,
  onToggleFavorite,
}) => {
  // ============================================================
  // ESTADOS DE BUSCA, FILTROS EM CASCATA E ORDENAÇÃO
  // ============================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("TODAS");
  const [filterSubject, setFilterSubject] = useState("TODAS");
  const [filterTopic, setFilterTopic] = useState("TODAS");
  const [filterDifficulty, setFilterDifficulty] = useState("TODAS");
  const [filterMemoryState, setFilterMemoryState] = useState("TODAS");
  const [filterOrigin, setFilterOrigin] = useState("TODAS");
  const [filterOnlyFavorites, setFilterOnlyFavorites] = useState(false);
  const [filterWithErrors, setFilterWithErrors] = useState(false);
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recentes");

  // Paginação: 20 por página após filtros e ordenação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Estados dos Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [previewingAnswerId, setPreviewingAnswerId] = useState<string | null>(null);

  // Notificação Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Estados de Importação CSV e Smart Paste
  const [csvInputMode, setCsvInputMode] = useState<"ARQUIVO" | "TEXTO">("ARQUIVO");
  const [csvRawText, setCsvRawText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvValidation, setCsvValidation] = useState<CsvValidationResult | null>(null);
  const [selectedValidIds, setSelectedValidIds] = useState<Set<string>>(new Set());
  const [csvPreviewPage, setCsvPreviewPage] = useState<number>(1);
  const csvPreviewSize = 10;

  // Estados do Modal de Exportação e Backup
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"CSV" | "JSON">("CSV");
  const [csvExportScope, setCsvExportScope] = useState<
    "TODAS" | "DISCIPLINA" | "MATERIA" | "FAVORITAS" | "ERROS" | "FILTRADAS"
  >("TODAS");
  const [exportDiscipline, setExportDiscipline] = useState<string>("");
  const [exportSubject, setExportSubject] = useState<string>("");
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [jsonImportSuccess, setJsonImportSuccess] = useState<string | null>(null);

  const [pasteRawText, setPasteRawText] = useState("");
  const [smartPasteResult, setSmartPasteResult] = useState<{
    parsed: Partial<Question>[];
    rawBlocksCount: number;
    failedBlocks: string[];
  } | null>(null);

  // ============================================================
  // ESTADO DO FORMULÁRIO (Criação / Edição)
  // ============================================================
  const [formData, setFormData] = useState<FormDataState>({
    question: "",
    discipline: "Geral",
    subject: "Geral",
    topic: "Geral",
    numAlternatives: 4,
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctOption: "A",
    explanation: "",
    difficulty: "Médio",
    tagsString: "",
    origin: "",
    observation: "",
    isFavorite: false,
    estimatedTime: 60,
  });

  // ============================================================
  // 1. HIERARQUIA & FILTROS EM CASCATA BASEADOS NOS DADOS EXISTENTES
  // DISCIPLINA → MATÉRIA → ASSUNTO
  // ============================================================

  // Disciplinas únicas (com fallback de subject para questões antigas)
  const disciplines = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const disc = (q.discipline || q.subject || "Geral").trim();
      if (disc) set.add(disc);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions]);

  // Matérias disponíveis em cascata (dependentes da disciplina selecionada)
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const disc = (q.discipline || q.subject || "Geral").trim();
      if (filterDiscipline === "TODAS" || disc === filterDiscipline) {
        if (q.subject && q.subject.trim()) set.add(q.subject.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions, filterDiscipline]);

  // Assuntos disponíveis em cascata (dependentes da matéria e disciplina selecionadas)
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const disc = (q.discipline || q.subject || "Geral").trim();
      const matchDisc = filterDiscipline === "TODAS" || disc === filterDiscipline;
      const matchSubj = filterSubject === "TODAS" || q.subject === filterSubject;
      if (matchDisc && matchSubj) {
        if (q.topic && q.topic.trim()) set.add(q.topic.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions, filterDiscipline, filterSubject]);

  // Origens cadastradas para filtro
  const availableOrigins = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.origin && q.origin.trim()) {
        set.add(q.origin.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions]);

  // Efeito cascata: ao alterar a disciplina, limpa matéria/assunto se não forem mais válidos
  const handleDisciplineChange = (newDiscipline: string) => {
    setFilterDiscipline(newDiscipline);
    setFilterSubject("TODAS");
    setFilterTopic("TODAS");
    setCurrentPage(1);
  };

  // Efeito cascata: ao alterar a matéria, limpa assunto se não for mais válido
  const handleSubjectChange = (newSubject: string) => {
    setFilterSubject(newSubject);
    setFilterTopic("TODAS");
    setCurrentPage(1);
  };

  // Resetar todos os filtros
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterDiscipline("TODAS");
    setFilterSubject("TODAS");
    setFilterTopic("TODAS");
    setFilterDifficulty("TODAS");
    setFilterMemoryState("TODAS");
    setFilterOrigin("TODAS");
    setFilterOnlyFavorites(false);
    setFilterWithErrors(false);
    setFilterUnanswered(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    filterDiscipline !== "TODAS" ||
    filterSubject !== "TODAS" ||
    filterTopic !== "TODAS" ||
    filterDifficulty !== "TODAS" ||
    filterMemoryState !== "TODAS" ||
    filterOrigin !== "TODAS" ||
    filterOnlyFavorites ||
    filterWithErrors ||
    filterUnanswered;

  // ============================================================
  // FILTRAGEM CUMULATIVA (AND) + BUSCA COM NORMALIZAÇÃO DE ACENTOS
  // ============================================================
  const filteredQuestions = useMemo(() => {
    const term = normalizeSearchText(searchTerm);

    return questions.filter((q) => {
      const disc = (q.discipline || q.subject || "Geral").trim();

      // 1. Busca textual com normalização de acentos e case-insensitive
      if (term) {
        const matchQ = normalizeSearchText(q.question).includes(term);
        const matchDisc = normalizeSearchText(disc).includes(term);
        const matchSub = normalizeSearchText(q.subject).includes(term);
        const matchTop = normalizeSearchText(q.topic).includes(term);
        const matchOrigin = q.origin ? normalizeSearchText(q.origin).includes(term) : false;
        const matchTags = q.tags ? q.tags.some((t) => normalizeSearchText(t).includes(term)) : false;

        if (!matchQ && !matchDisc && !matchSub && !matchTop && !matchOrigin && !matchTags) {
          return false;
        }
      }

      // 2. Filtro em cascata: Disciplina
      if (filterDiscipline !== "TODAS" && disc !== filterDiscipline) {
        return false;
      }

      // 3. Filtro em cascata: Matéria
      if (filterSubject !== "TODAS" && q.subject !== filterSubject) {
        return false;
      }

      // 4. Filtro em cascata: Assunto
      if (filterTopic !== "TODAS" && q.topic !== filterTopic) {
        return false;
      }

      // 5. Dificuldade
      if (filterDifficulty !== "TODAS" && q.difficulty !== filterDifficulty) {
        return false;
      }

      // 6. Estado da Memória SM-2
      if (filterMemoryState !== "TODAS" && q.memoryState !== filterMemoryState) {
        return false;
      }

      // 7. Favoritas
      if (filterOnlyFavorites && !q.isFavorite) {
        return false;
      }

      // 8. Com erros: errorCount > 0 ou lastWasCorrect === false
      if (filterWithErrors) {
        const hasError = (q.errorCount && q.errorCount > 0) || q.lastWasCorrect === false;
        if (!hasError) return false;
      }

      // 9. Não respondidas: correctCount === 0 e errorCount === 0
      if (filterUnanswered) {
        const isUnanswered =
          (!q.correctCount || q.correctCount === 0) && (!q.errorCount || q.errorCount === 0);
        if (!isUnanswered) return false;
      }

      // 10. Origem
      if (filterOrigin !== "TODAS" && q.origin !== filterOrigin) {
        return false;
      }

      return true;
    });
  }, [
    questions,
    searchTerm,
    filterDiscipline,
    filterSubject,
    filterTopic,
    filterDifficulty,
    filterMemoryState,
    filterOnlyFavorites,
    filterWithErrors,
    filterUnanswered,
    filterOrigin,
  ]);

  // ============================================================
  // ORDENAÇÃO LOCAL
  // ============================================================
  const sortedQuestions = useMemo(() => {
    const list = [...filteredQuestions];

    switch (sortBy) {
      case "recentes":
        return list.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      case "antigas":
        return list.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeA - timeB;
        });
      case "mais_erradas":
        return list.sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0));
      case "alfabetica":
        return list.sort((a, b) => a.question.localeCompare(b.question, "pt-BR"));
      default:
        return list;
    }
  }, [filteredQuestions, sortBy]);

  // ============================================================
  // PAGINAÇÃO
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(sortedQuestions.length / pageSize));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedQuestions.slice(start, start + pageSize);
  }, [sortedQuestions, currentPage, pageSize]);

  // Ajusta a página atual se a lista filtrada diminuir
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ============================================================
  // AÇÕES: ABRIR FORMULÁRIO (CRIAÇÃO OU EDIÇÃO)
  // ============================================================
  const openForm = (q?: Question) => {
    setFormValidationError(null);
    if (q) {
      setEditingQuestion(q);
      const hasE = Boolean(q.optionE && q.optionE.trim() !== "");
      setFormData({
        question: q.question,
        discipline: q.discipline || q.subject || "Geral",
        subject: q.subject || "Geral",
        topic: q.topic || "Geral",
        numAlternatives: hasE || q.correctOption === "E" ? 5 : 4,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE || "",
        correctOption: q.correctOption,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tagsString: (q.tags || []).join(", "),
        origin: q.origin || "",
        observation: q.observation || "",
        isFavorite: Boolean(q.isFavorite),
        estimatedTime: q.estimatedTime || 60,
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question: "",
        discipline: disciplines[0] || "Geral",
        subject: availableSubjects[0] || "Geral",
        topic: "Geral",
        numAlternatives: 4,
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        optionE: "",
        correctOption: "A",
        explanation: "",
        difficulty: "Médio",
        tagsString: "",
        origin: "",
        observation: "",
        isFavorite: false,
        estimatedTime: 60,
      });
    }
    setIsFormModalOpen(true);
  };

  // ============================================================
  // SALVAR FORMULÁRIO (COM VALIDAÇÕES DA FASE 2A/2B)
  // ============================================================
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    // Validação de 5 alternativas
    if (formData.numAlternatives === 5) {
      if (!formData.optionE || formData.optionE.trim() === "") {
        setFormValidationError("A alternativa E deve ser preenchida quando o modo de 5 alternativas estiver ativo.");
        return;
      }
    }

    // Validação estrita: Gabarito E exige optionE preenchida
    if (formData.correctOption === "E") {
      if (formData.numAlternatives === 4 || !formData.optionE || formData.optionE.trim() === "") {
        setFormValidationError("O gabarito não pode ser a Letra E enquanto a alternativa E estiver vazia.");
        return;
      }
    }

    const tags = formData.tagsString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) {
      tags.push(formData.discipline, formData.subject);
    }

    const payload: Partial<Question> = {
      question: formData.question.trim(),
      discipline: formData.discipline.trim() || "Geral",
      subject: formData.subject.trim() || "Geral",
      topic: formData.topic.trim() || "Geral",
      optionA: formData.optionA.trim(),
      optionB: formData.optionB.trim(),
      optionC: formData.optionC.trim(),
      optionD: formData.optionD.trim(),
      optionE: formData.numAlternatives === 5 && formData.optionE.trim() ? formData.optionE.trim() : undefined,
      correctOption: formData.correctOption,
      explanation: formData.explanation.trim(),
      difficulty: formData.difficulty,
      tags,
      origin: formData.origin.trim() ? formData.origin.trim() : undefined,
      observation: formData.observation.trim() ? formData.observation.trim() : undefined,
      isFavorite: formData.isFavorite,
      estimatedTime: formData.estimatedTime,
    };

    if (editingQuestion) {
      onUpdateQuestion(editingQuestion.id, payload);
      setToastMessage("Questão atualizada com sucesso!");
    } else {
      onAddQuestion(payload);
      setToastMessage("Nova questão adicionada com sucesso!");
    }

    setTimeout(() => setToastMessage(null), 3000);
    setIsFormModalOpen(false);
  };

  // ============================================================
  // DUPLICAÇÃO SEGURA (REQUISITO 8)
  // ============================================================
  const handleDuplicate = (id: string) => {
    try {
      const duplicated = StorageService.duplicateQuestion(id);
      if (duplicated) {
        // Atualiza a lista na raiz chamando onBulkAddQuestions([])
        onBulkAddQuestions([]);
        setToastMessage("Questão duplicada com sucesso! A nova cópia foi inserida como 'NOVA'.");
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setToastMessage("Não foi possível duplicar a questão.");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Erro ao duplicar:", err);
      setToastMessage("Erro ao duplicar a questão.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // ============================================================
  // EXCLUSÃO SEGURA COM MODAL REACT (REQUISITO 9)
  // ============================================================
  const handleConfirmDelete = () => {
    if (!questionToDelete) return;
    onDeleteQuestion(questionToDelete.id);
    setToastMessage("Questão excluída do banco com sucesso.");
    setTimeout(() => setToastMessage(null), 3000);
    setQuestionToDelete(null);
  };

  // ============================================================
  // CSV IMPORTAÇÃO & PRÉVIA ROBUSTA (FASE 2C)
  // ============================================================
  const handleValidateCsvContent = (text: string) => {
    setCsvRawText(text);
    if (!text.trim()) {
      setCsvValidation(null);
      setSelectedValidIds(new Set());
      return;
    }
    const val = CsvService.parseAndValidateCsv(text, questions);
    setCsvValidation(val);
    // Por padrão, seleciona todas as questões válidas encontradas
    const allIds = new Set(val.validItems.map((item) => item.id));
    setSelectedValidIds(allIds);
    setCsvPreviewPage(1);
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = (evt.target?.result as string) || "";
      handleValidateCsvContent(content);
    };
    reader.readAsText(file, "UTF-8");
    // Limpa o valor para permitir re-selecionar o mesmo arquivo se necessário
    e.target.value = "";
  };

  const handleToggleSelectAllValid = () => {
    if (!csvValidation) return;
    if (selectedValidIds.size === csvValidation.validItems.length) {
      setSelectedValidIds(new Set());
    } else {
      setSelectedValidIds(new Set(csvValidation.validItems.map((i) => i.id)));
    }
  };

  const handleToggleValidItem = (id: string) => {
    setSelectedValidIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyCsvImport = () => {
    if (!csvValidation || selectedValidIds.size === 0) return;

    // Filtra somente as questões válidas explicitamente selecionadas
    const toImport = csvValidation.validItems
      .filter((item) => selectedValidIds.has(item.id))
      .map((item) => item.question);

    if (toImport.length === 0) return;

    // Importação CUMULATIVA segura através de onBulkAddQuestions
    const addedCount = onBulkAddQuestions(toImport);

    setIsCsvModalOpen(false);
    setCsvRawText("");
    setCsvFileName(null);
    setCsvValidation(null);
    setSelectedValidIds(new Set());

    setToastMessage(
      `${addedCount} questão(ões) importada(s) com sucesso para o banco de questões!`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ============================================================
  // EXPORTAÇÃO SELETIVA CSV & BACKUP JSON (FASE 2C)
  // ============================================================
  const exportTargetQuestions = useMemo(() => {
    switch (csvExportScope) {
      case "TODAS":
        return questions;
      case "DISCIPLINA": {
        const targetDisc = (exportDiscipline || disciplines[0] || "").trim();
        return questions.filter(
          (q) => (q.discipline || q.subject || "Geral").trim() === targetDisc
        );
      }
      case "MATERIA": {
        const targetSubj = (exportSubject || availableSubjects[0] || "").trim();
        return questions.filter((q) => q.subject.trim() === targetSubj);
      }
      case "FAVORITAS":
        return questions.filter((q) => q.isFavorite);
      case "ERROS":
        return questions.filter(
          (q) => (q.errorCount || 0) > 0 || q.lastWasCorrect === false
        );
      case "FILTRADAS":
        return sortedQuestions;
      default:
        return questions;
    }
  }, [
    csvExportScope,
    questions,
    exportDiscipline,
    exportSubject,
    disciplines,
    availableSubjects,
    sortedQuestions,
  ]);

  const handleTriggerCsvExport = () => {
    if (exportTargetQuestions.length === 0) {
      setToastMessage("Nenhuma questão encontrada para os critérios selecionados.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    let scopeSlug = "todas";
    if (csvExportScope === "DISCIPLINA") {
      scopeSlug = (exportDiscipline || "disciplina")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/gi, "-");
    } else if (csvExportScope === "MATERIA") {
      scopeSlug = (exportSubject || "materia")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/gi, "-");
    } else if (csvExportScope === "FAVORITAS") {
      scopeSlug = "favoritas";
    } else if (csvExportScope === "ERROS") {
      scopeSlug = "com-erros";
    } else if (csvExportScope === "FILTRADAS") {
      scopeSlug = "filtradas";
    }

    const filename = `memora-plus-questoes-${scopeSlug}-${dateStr}.csv`;
    const csvContent = CsvService.exportQuestionsToCsv(exportTargetQuestions);
    CsvService.downloadCsvFile(csvContent, filename);

    setIsExportModalOpen(false);
    setToastMessage(
      `${exportTargetQuestions.length} questões exportadas com sucesso em "${filename}"!`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportFullBackupJson = () => {
    const json = StorageService.exportFullBackupJSON();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `memora_backup_completo_${dateStr}.json`;
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage("Backup completo JSON baixado com sucesso.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRestoreFullBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = (evt.target?.result as string) || "";
        const result = await StorageService.importFullBackupJSON(content);
        if (result.success) {
          setJsonImportSuccess(result.message);
          setJsonImportError(null);
          // Força recarregamento no App
          onBulkAddQuestions([]);
          setToastMessage("Backup completo restaurado com sucesso!");
          setTimeout(() => setToastMessage(null), 3500);
        } else {
          setJsonImportError(result.message);
          setJsonImportSuccess(null);
        }
      } catch (err: any) {
        setJsonImportError(`Falha ao ler arquivo: ${err?.message || "Arquivo inválido"}`);
        setJsonImportSuccess(null);
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleParseSmartPaste = (text: string) => {
    setPasteRawText(text);
    if (!text.trim()) {
      setSmartPasteResult(null);
      return;
    }
    const result = CsvService.parseSmartPastedQuestions(text);
    setSmartPasteResult(result);
  };

  const handleApplySmartPaste = () => {
    if (!smartPasteResult || smartPasteResult.parsed.length === 0) return;
    onBulkAddQuestions(smartPasteResult.parsed);
    setIsPasteModalOpen(false);
    setPasteRawText("");
    setSmartPasteResult(null);
    setToastMessage(`${smartPasteResult.parsed.length} questões adicionadas pelo texto colado!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-xs shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho e Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            <span>Banco de Questões</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {questions.length} questões cadastradas • Hierarquia Disciplina → Matéria → Assunto • Totalmente offline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Importar CSV */}
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-teal-500 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Importar CSV</span>
          </button>

          {/* Colar Texto */}
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4 text-indigo-600" />
            <span>Colar Texto</span>
          </button>

          {/* Exportar & Backup */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-amber-500 transition-colors"
            title="Exportação seletiva de CSV ou backup completo JSON"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Exportar / Backup</span>
          </button>

          {/* Nova Questão */}
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Questão</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BARRA DE PESQUISA E FILTROS EM CASCATA                       */}
      {/* ============================================================ */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Linha 1: Campo de Busca com suporte a acentos */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por enunciado, disciplina, matéria, assunto, tags ou origem..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              title="Critério de ordenação"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigas">Mais antigas</option>
              <option value="mais_erradas">Mais erradas</option>
              <option value="alfabetica">Ordem alfabética</option>
            </select>
          </div>
        </div>

        {/* Linha 2: FILTROS EM CASCATA: Disciplina ↓ Matéria ↓ Assunto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          {/* 1. Disciplina */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              1. Disciplina
            </label>
            <select
              value={filterDiscipline}
              onChange={(e) => handleDisciplineChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="TODAS">Todas as Disciplinas</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Matéria (Cascata) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              2. Matéria
            </label>
            <select
              value={filterSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="TODAS">Todas as Matérias</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Assunto (Cascata) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              3. Assunto
            </label>
            <select
              value={filterTopic}
              onChange={(e) => {
                setFilterTopic(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="TODAS">Todos os Assuntos</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 3: Filtros Combináveis Cumulativos (Dificuldade, Memória, Origem e Chips) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {/* Dificuldade */}
          <select
            value={filterDifficulty}
            onChange={(e) => {
              setFilterDifficulty(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="TODAS">Dificuldade: Todas</option>
            <option value="Fácil">Fácil</option>
            <option value="Médio">Médio</option>
            <option value="Difícil">Difícil</option>
          </select>

          {/* Memória SM-2 */}
          <select
            value={filterMemoryState}
            onChange={(e) => {
              setFilterMemoryState(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="TODAS">Memória: Todas</option>
            <option value="NOVA">Nova</option>
            <option value="APRENDENDO">Aprendendo</option>
            <option value="REVISAR">Revisar</option>
            <option value="DOMINADA">Dominada</option>
          </select>

          {/* Origem (se houver) */}
          {availableOrigins.length > 0 && (
            <select
              value={filterOrigin}
              onChange={(e) => {
                setFilterOrigin(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="TODAS">Origem: Todas</option>
              {availableOrigins.map((orig) => (
                <option key={orig} value={orig}>
                  {orig}
                </option>
              ))}
            </select>
          )}

          {/* Chip: Favoritas */}
          <button
            type="button"
            onClick={() => {
              setFilterOnlyFavorites(!filterOnlyFavorites);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
              filterOnlyFavorites
                ? "bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-400"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${filterOnlyFavorites ? "fill-current" : ""}`} />
            <span>Favoritas</span>
          </button>

          {/* Chip: Com Erros (errorCount > 0 ou lastWasCorrect === false) */}
          <button
            type="button"
            onClick={() => {
              setFilterWithErrors(!filterWithErrors);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
              filterWithErrors
                ? "bg-rose-500/15 border-rose-400 text-rose-600 dark:text-rose-400"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Com erros</span>
          </button>

          {/* Chip: Não Respondidas (correctCount === 0 e errorCount === 0) */}
          <button
            type="button"
            onClick={() => {
              setFilterUnanswered(!filterUnanswered);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
              filterUnanswered
                ? "bg-indigo-500/15 border-indigo-400 text-indigo-600 dark:text-indigo-400"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Não respondidas</span>
          </button>

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 text-xs rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold flex items-center gap-1 transition-colors ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Barra de Resumo dos Resultados */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <span>
            Exibindo {paginatedQuestions.length} de {sortedQuestions.length} questões encontradas
            {hasActiveFilters && ` (filtrado de ${questions.length})`}
          </span>
          {sortedQuestions.length > pageSize && (
            <span>
              Página {currentPage} de {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* LISTA DE QUESTÕES (ESTADO VAZIO / CARDS)                     */}
      {/* ============================================================ */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          // Banco totalmente vazio
          <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Database className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma questão cadastrada no banco
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Seu banco está vazio. Crie uma questão manual, importe via planilha CSV ou use o conversor inteligente de texto.
            </p>
            <div className="pt-2">
              <button
                onClick={() => openForm()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeira Questão</span>
              </button>
            </div>
          </div>
        ) : sortedQuestions.length === 0 ? (
          // Nenhum resultado para os filtros atuais
          <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Filter className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma questão encontrada para os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tente alterar os termos da busca, limpar os seletores em cascata ou desmarcar os filtros combinados.
            </p>
            <div className="pt-2">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Todos os Filtros</span>
              </button>
            </div>
          </div>
        ) : (
          paginatedQuestions.map((q, idx) => {
            const isPreviewOpen = previewingAnswerId === q.id;
            const globalIndex = (currentPage - 1) * pageSize + idx + 1;
            const hasOptionE = Boolean(q.optionE && q.optionE.trim() !== "");

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
              >
                {/* Linha Superior: HIERARQUIA VISUAL (DISCIPLINA → MATÉRIA → ASSUNTO) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-xs font-mono font-bold text-slate-400 mr-1">
                      #{globalIndex}
                    </span>

                    {/* HIERARQUIA VISUAL COMPLETA */}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      {q.discipline || q.subject || "Geral"}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {q.subject}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400">
                      {q.topic}
                    </span>

                    {/* Dificuldade */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ml-1 ${
                        q.difficulty === "Fácil"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : q.difficulty === "Difícil"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {q.difficulty}
                    </span>

                    {/* Estado SM-2 */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        q.memoryState === "DOMINADA"
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                          : q.memoryState === "APRENDENDO"
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                          : q.memoryState === "REVISAR"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {q.memoryState}
                    </span>

                    {/* Origem (se houver) */}
                    {q.origin && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">
                        {q.origin}
                      </span>
                    )}
                  </div>

                  {/* AÇÕES NO CARD: FAVORITAR, DUPLICAR, EDITAR, EXCLUIR */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    {/* Favoritar */}
                    <button
                      onClick={() => onToggleFavorite(q.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        q.isFavorite
                          ? "bg-amber-500/10 border-amber-400 text-amber-500"
                          : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500"
                      }`}
                      title={q.isFavorite ? "Desfavoritar" : "Favoritar"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${q.isFavorite ? "fill-current" : ""}`} />
                    </button>

                    {/* DUPLICAR (Requisito 8) */}
                    <button
                      onClick={() => handleDuplicate(q.id)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors text-xs font-semibold"
                      title="Duplicar esta questão (gera uma cópia idêntica como NOVA)"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="hidden sm:inline">Duplicar</span>
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => openForm(q)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      title="Editar questão"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Excluir Seguro (Requisito 9) */}
                    <button
                      onClick={() => setQuestionToDelete(q)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      title="Excluir questão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Enunciado */}
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {q.question}
                </div>

                {/* Alternativas (A, B, C, D e E opcional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      isPreviewOpen && q.correctOption === "A"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 font-semibold"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <span className="font-bold text-slate-500">A)</span>
                    <span className="truncate">{q.optionA}</span>
                  </div>
                  <div
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      isPreviewOpen && q.correctOption === "B"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 font-semibold"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <span className="font-bold text-slate-500">B)</span>
                    <span className="truncate">{q.optionB}</span>
                  </div>
                  <div
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      isPreviewOpen && q.correctOption === "C"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 font-semibold"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <span className="font-bold text-slate-500">C)</span>
                    <span className="truncate">{q.optionC}</span>
                  </div>
                  <div
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      isPreviewOpen && q.correctOption === "D"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 font-semibold"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <span className="font-bold text-slate-500">D)</span>
                    <span className="truncate">{q.optionD}</span>
                  </div>

                  {/* 5ª Alternativa (E) quando cadastrada */}
                  {hasOptionE && (
                    <div
                      className={`p-2 rounded-lg border flex items-start gap-2 sm:col-span-2 ${
                        isPreviewOpen && q.correctOption === "E"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 font-semibold"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <span className="font-bold text-slate-500">E)</span>
                      <span className="truncate">{q.optionE}</span>
                    </div>
                  )}
                </div>

                {/* Observação pessoal se presente */}
                {q.observation && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <span className="font-bold">Observação de estudo: </span>
                    <span>{q.observation}</span>
                  </div>
                )}

                {/* Rodapé do Card: Estatísticas & Ver Gabarito */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-[11px] text-slate-400">
                    Acertos: <span className="text-emerald-600 font-bold">{q.correctCount || 0}</span> | Erros:{" "}
                    <span className="text-rose-600 font-bold">{q.errorCount || 0}</span>
                    {q.repetitionCount !== undefined && q.repetitionCount > 0 && (
                      <span className="ml-2 hidden sm:inline text-slate-500">
                        • Repetições: {q.repetitionCount}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setPreviewingAnswerId(isPreviewOpen ? null : q.id)}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPreviewOpen ? "Ocultar Gabarito" : "Ver Gabarito e Explicação"}</span>
                  </button>
                </div>

                {/* Gabarito e Explicação Expandidos */}
                {isPreviewOpen && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Gabarito Oficial: Letra {q.correctOption}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {q.tags.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* PAGINAÇÃO LOCAL                                              */}
      {/* ============================================================ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500 font-semibold px-2">
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Próxima
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CADASTRO / EDIÇÃO MANUAL DE QUESTÕES                */}
      {/* ============================================================ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingQuestion ? "Editar Questão" : "Cadastrar Nova Questão"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formValidationError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formValidationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Enunciado */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enunciado da Pergunta *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Digite a questão com clareza..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* HIERARQUIA NO FORMULÁRIO: Disciplina, Matéria e Assunto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disciplina *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.discipline}
                    onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                    placeholder="Ex: Direito, Português..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Matéria *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: Constitucional, Sintaxe..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assunto / Tópico *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Ex: Mandado de Segurança..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Controle simples: [4 alternativas] [5 alternativas] (Requisito 3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alternativas da Questão *
                  </label>
                  <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          numAlternatives: 4,
                          correctOption: prev.correctOption === "E" ? "A" : prev.correctOption,
                        }));
                      }}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                        formData.numAlternatives === 4
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      4 alternativas (A–D)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, numAlternatives: 5 }));
                      }}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                        formData.numAlternatives === 5
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      5 alternativas (A–E)
                    </button>
                  </div>
                </div>

                {/* Alternativas A, B, C, D */}
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const fieldKey = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
                  return (
                    <div key={letter} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {letter}
                      </span>
                      <input
                        type="text"
                        required
                        value={formData[fieldKey]}
                        onChange={(e) =>
                          setFormData({ ...formData, [fieldKey]: e.target.value })
                        }
                        placeholder={`Alternativa ${letter}...`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  );
                })}

                {/* Alternativa E (visível e obrigatória somente quando numAlternatives === 5) */}
                {formData.numAlternatives === 5 && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                      E
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.optionE}
                      onChange={(e) =>
                        setFormData({ ...formData, optionE: e.target.value })
                      }
                      placeholder="Alternativa E (obrigatória para 5 alternativas)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Seletor de Gabarito */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resposta Correta / Gabarito *
                </label>
                <div
                  className={`grid ${
                    formData.numAlternatives === 5 ? "grid-cols-5" : "grid-cols-4"
                  } gap-2`}
                >
                  {(formData.numAlternatives === 5
                    ? (["A", "B", "C", "D", "E"] as const)
                    : (["A", "B", "C", "D"] as const)
                  ).map((letter) => (
                    <button
                      type="button"
                      key={letter}
                      onClick={() => setFormData({ ...formData, correctOption: letter })}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        formData.correctOption === letter
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Letra {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explicação Pedagógica */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Explicação Pedagógica / Comentário *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explique por que esta alternativa é a correta..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Metadados: Dificuldade, Tempo e Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dificuldade
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as QuestionDifficulty,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tempo estimado (s)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={formData.estimatedTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedTime: parseInt(e.target.value, 10) || 60,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formData.tagsString}
                    onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                    placeholder="Ex: direito, concurso..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Origem e Observação (Campos da Fase 2A) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Origem / Banca / Concurso (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="Ex: FCC 2026 - TJ/SP, Cespe, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observação de estudo (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.observation}
                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                    placeholder="Ex: Atenção ao enunciado na negativa..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Opção de Favoritar no Formulário */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsFavorite"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="formIsFavorite"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span>Marcar como questão favorita</span>
                </label>
              </div>

              {/* Botões do Modal */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {editingQuestion ? "Salvar Alterações" : "Adicionar ao Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EXCLUSÃO SEGURA (REQUISITO 9 - SEM WINDOW.CONFIRM)  */}
      {/* ============================================================ */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Questão
                </h3>
                <p className="text-xs text-slate-500">
                  Ação definitiva e irreversível
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está prestes a excluir esta questão do seu banco local:
            </p>

            {/* Trecho do enunciado */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 italic">
              &quot;{questionToDelete.question.length > 140
                ? questionToDelete.question.slice(0, 140) + "..."
                : questionToDelete.question}&quot;
            </div>

            {/* Histórico pedagógico da questão */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Histórico de Respostas:
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-emerald-600">Acertos: {questionToDelete.correctCount || 0}</span>
                <span className="text-rose-600">Erros: {questionToDelete.errorCount || 0}</span>
                <span className="text-slate-500">Repetições: {questionToDelete.repetitionCount || 0}</span>
              </div>
            </div>

            {/* Alerta caso tenha histórico relevante */}
            {((questionToDelete.correctCount || 0) > 0 || (questionToDelete.errorCount || 0) > 0) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-tight flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  Esta questão possui histórico no algoritmo de repetição espaçada. A exclusão removerá permanentemente esses registros de progresso.
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                EXCLUIR QUESTÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: IMPORTAR CSV COM PRÉVIA E DIAGNÓSTICO (FASE 2C)     */}
      {/* ============================================================ */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-fade-in">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Importar Questões via CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Importação cumulativa • Pré-visualização com diagnóstico • Preservação de integridade
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvValidation(null);
                  setCsvRawText("");
                  setCsvFileName(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho e Regras de Campos */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Formato Padrão Aceito (Delimitador &quot;;&quot; • UTF-8):
                </span>
                <button
                  type="button"
                  onClick={() => CsvService.downloadExampleCsvTemplate()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] shadow-xs transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo CSV Padrão</span>
                </button>
              </div>
              <div className="overflow-x-auto py-1">
                <code className="block font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-teal-700 dark:text-teal-400 whitespace-nowrap">
                  id;disciplina;materia;assunto;enunciado;alternativaA;alternativaB;alternativaC;alternativaD;alternativaE;respostaCorreta;explicacao;dificuldade;tags;origem;observacao
                </code>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-1.5 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Regra de Segurança:</strong> A importação é <strong>cumulativa</strong> (não apaga o banco atual nem sobrescreve questões). Se um ID já existir no banco, ele será ignorado como duplicado. Questões importadas iniciam como <strong>novas</strong> no algoritmo de repetição SM-2.
                </span>
              </div>
            </div>

            {/* Seletor de Modo de Entrada (Arquivo vs Colar Texto) */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCsvInputMode("ARQUIVO")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-center transition-colors ${
                  csvInputMode === "ARQUIVO"
                    ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Selecionar Arquivo CSV
              </button>
              <button
                type="button"
                onClick={() => setCsvInputMode("TEXTO")}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-center transition-colors ${
                  csvInputMode === "TEXTO"
                    ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Colar Conteúdo CSV
              </button>
            </div>

            {/* Painel 1: Selecionar Arquivo CSV */}
            {csvInputMode === "ARQUIVO" && (
              <div className="space-y-3">
                <label
                  htmlFor="csv-file-upload"
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-300 dark:border-teal-800 rounded-2xl hover:border-teal-500 bg-teal-50/30 dark:bg-teal-950/20 cursor-pointer transition-colors group"
                >
                  <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                    SELECIONAR ARQUIVO CSV
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Clique para escolher um arquivo .csv codificado em UTF-8
                  </span>
                  <input
                    id="csv-file-upload"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                  />
                </label>

                {csvFileName && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                    <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 font-semibold truncate">
                      <FileSpreadsheet className="w-4 h-4 shrink-0 text-teal-600" />
                      <span className="truncate">Arquivo selecionado: {csvFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvFileName(null);
                        setCsvRawText("");
                        setCsvValidation(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Painel 2: Colar Texto CSV */}
            {csvInputMode === "TEXTO" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cole o conteúdo CSV:
                  </label>
                  <button
                    type="button"
                    onClick={() => handleValidateCsvContent(CsvService.getSampleCsv())}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Carregar Exemplo de Teste
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={csvRawText}
                  onChange={(e) => handleValidateCsvContent(e.target.value)}
                  placeholder="Cole o CSV com ponto e vírgula (;)..."
                  className="w-full p-3 font-mono text-[11px] rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>
            )}

            {/* DIAGNÓSTICO & PRÉ-VISUALIZAÇÃO ANTES DA IMPORTAÇÃO (REQUISITO 6) */}
            {csvValidation && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                {/* 4 Cards de Resumo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Total de Linhas
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {csvValidation.totalCount}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                      Questões Válidas
                    </div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {csvValidation.validRows.length}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      csvValidation.invalidRows.length > 0
                        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                        : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div
                      className={`text-[10px] uppercase font-bold ${
                        csvValidation.invalidRows.length > 0
                          ? "text-rose-700 dark:text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      Com Incompatibilidade
                    </div>
                    <div
                      className={`text-lg font-black mt-0.5 ${
                        csvValidation.invalidRows.length > 0
                          ? "text-rose-700 dark:text-rose-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {csvValidation.invalidRows.length}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      csvValidation.duplicateCount > 0
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div
                      className={`text-[10px] uppercase font-bold ${
                        csvValidation.duplicateCount > 0
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-slate-500"
                      }`}
                    >
                      IDs Duplicados
                    </div>
                    <div
                      className={`text-lg font-black mt-0.5 ${
                        csvValidation.duplicateCount > 0
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {csvValidation.duplicateCount}
                    </div>
                  </div>
                </div>

                {/* TABELA DE ERROS E INCOMPATIBILIDADES DETECTADOS */}
                {csvValidation.invalidRows.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Incompatibilidades Detectadas ({csvValidation.invalidRows.length} linhas ignoradas):
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {csvValidation.invalidRows.map((err, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200/60 dark:border-rose-800/60 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold text-[10px]">
                              Linha {err.rowNumber}
                            </span>
                            {err.isDuplicateId && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider">
                                ID DUPLICADO — NÃO IMPORTADA
                              </span>
                            )}
                            <span className="text-slate-700 dark:text-slate-300">
                              {err.error}
                            </span>
                          </div>
                          {err.field && (
                            <span className="text-slate-400 font-mono text-[10px] shrink-0">
                              Campo: {err.field}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LISTA / SELEÇÃO DE QUESTÕES VÁLIDAS A IMPORTAR */}
                {csvValidation.validItems.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Questões Válidas:{" "}
                        <span className="text-teal-600 dark:text-teal-400">
                          {selectedValidIds.size} de {csvValidation.validItems.length} selecionadas para importação
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllValid}
                          className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {selectedValidIds.size === csvValidation.validItems.length
                            ? "Desmarcar Todas"
                            : "Selecionar Todas"}
                        </button>
                      </div>
                    </div>

                    {/* Itens Válidos Paginados */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {csvValidation.validItems
                        .slice(
                          (csvPreviewPage - 1) * csvPreviewSize,
                          csvPreviewPage * csvPreviewSize
                        )
                        .map((item) => {
                          const isSelected = selectedValidIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleValidItem(item.id)}
                              className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                                isSelected
                                  ? "bg-teal-50/40 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleValidItem(item.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    Linha {item.rowNumber}
                                  </span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.question.discipline} › {item.question.subject} › {item.question.topic}
                                  </span>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    Gabarito: Letra {item.question.correctOption}
                                  </span>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {item.question.difficulty}
                                  </span>
                                </div>

                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                  {item.question.question}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Paginação da Prévia */}
                    {csvValidation.validItems.length > csvPreviewSize && (
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>
                          Mostrando {(csvPreviewPage - 1) * csvPreviewSize + 1} a{" "}
                          {Math.min(
                            csvPreviewPage * csvPreviewSize,
                            csvValidation.validItems.length
                          )}{" "}
                          de {csvValidation.validItems.length} questões válidas
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={csvPreviewPage === 1}
                            onClick={() => setCsvPreviewPage((p) => Math.max(1, p - 1))}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <span className="font-bold text-slate-700 dark:text-slate-300 px-1">
                            {csvPreviewPage} /{" "}
                            {Math.ceil(csvValidation.validItems.length / csvPreviewSize)}
                          </span>
                          <button
                            type="button"
                            disabled={
                              csvPreviewPage >=
                              Math.ceil(csvValidation.validItems.length / csvPreviewSize)
                            }
                            onClick={() =>
                              setCsvPreviewPage((p) =>
                                Math.min(
                                  Math.ceil(
                                    csvValidation.validItems.length / csvPreviewSize
                                  ),
                                  p + 1
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rodapé com Ações Explícitas */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvValidation(null);
                  setCsvRawText("");
                  setCsvFileName(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={!csvValidation || selectedValidIds.size === 0}
                onClick={handleApplyCsvImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs disabled:opacity-40 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>
                  IMPORTAR QUESTÕES VÁLIDAS{" "}
                  {selectedValidIds.size > 0 ? `(${selectedValidIds.size})` : ""}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3B: EXPORTAÇÃO SELETIVA CSV & BACKUP JSON (FASE 2C)    */}
      {/* ============================================================ */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-fade-in">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Exportar Questões &amp; Backup
                  </h3>
                  <p className="text-xs text-slate-500">
                    Intercâmbio em CSV ou cópia de segurança completa em JSON
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  setJsonImportError(null);
                  setJsonImportSuccess(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternância de Abas: CSV vs Backup JSON */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setExportTab("CSV")}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-2 ${
                  exportTab === "CSV"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar CSV (Intercâmbio)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportTab("JSON")}
                className={`flex-1 py-2 px-3 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-2 ${
                  exportTab === "JSON"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Backup Completo (JSON)</span>
              </button>
            </div>

            {/* ABA 1: EXPORTAÇÃO SELETIVA CSV */}
            {exportTab === "CSV" && (
              <div className="space-y-4">
                {/* Esclarecimento CSV vs JSON */}
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Sobre o Formato CSV:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    O arquivo CSV transporta o conteúdo didático das questões (enunciado, alternativas, gabarito, explicação, disciplina, matéria, assunto, dificuldade, tags, origem e observação) com padrão UTF-8 com BOM e delimitador &quot;;&quot;.
                    <br />
                    <strong>Nota:</strong> O CSV <strong>não transporta</strong> seu histórico individual de repetição espaçada SM-2. Para cópia integral com histórico, utilize a aba <strong>Backup Completo (JSON)</strong>.
                  </p>
                </div>

                {/* Seleção de Subconjunto para Exportação */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Selecione o subconjunto de questões para exportar:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Opção 1: Todas as Questões */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("TODAS")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "TODAS"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>EXPORTAR TODAS</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {questions.length}
                      </span>
                    </button>

                    {/* Opção 2: Por Disciplina */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("DISCIPLINA")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "DISCIPLINA"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>EXPORTAR DISCIPLINA</span>
                      <Layers className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Opção 3: Por Matéria */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("MATERIA")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "MATERIA"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>EXPORTAR MATÉRIA</span>
                      <Layers className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Opção 4: Favoritas */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("FAVORITAS")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "FAVORITAS"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                        <span>EXPORTAR FAVORITAS</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {questions.filter((q) => q.isFavorite).length}
                      </span>
                    </button>

                    {/* Opção 5: Com Erros */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("ERROS")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "ERROS"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>EXPORTAR COM ERROS</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {
                          questions.filter(
                            (q) => (q.errorCount || 0) > 0 || q.lastWasCorrect === false
                          ).length
                        }
                      </span>
                    </button>

                    {/* Opção 6: Filtros Atuais */}
                    <button
                      type="button"
                      onClick={() => setCsvExportScope("FILTRADAS")}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        csvExportScope === "FILTRADAS"
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-indigo-500" />
                        <span>FILTROS ATUAIS DA TELA</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {sortedQuestions.length}
                      </span>
                    </button>
                  </div>

                  {/* Dropdowns condicionais para Disciplina ou Matéria */}
                  {csvExportScope === "DISCIPLINA" && (
                    <div className="pt-2 animate-fade-in">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Escolha a Disciplina:
                      </label>
                      <select
                        value={exportDiscipline || disciplines[0] || ""}
                        onChange={(e) => setExportDiscipline(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {disciplines.map((d) => (
                          <option key={d} value={d}>
                            {d} (
                            {
                              questions.filter(
                                (q) => (q.discipline || q.subject || "Geral").trim() === d
                              ).length
                            }{" "}
                            questões)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {csvExportScope === "MATERIA" && (
                    <div className="pt-2 animate-fade-in">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Escolha a Matéria:
                      </label>
                      <select
                        value={exportSubject || availableSubjects[0] || ""}
                        onChange={(e) => setExportSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {availableSubjects.map((s) => (
                          <option key={s} value={s}>
                            {s} ({questions.filter((q) => q.subject.trim() === s).length}{" "}
                            questões)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Exibição Clara da Quantidade que será exportada */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Resumo do Conjunto Selecionado:
                  </span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                    &gt; {exportTargetQuestions.length} questões serão exportadas.
                  </span>
                </div>

                {/* Ação de Exportar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    disabled={exportTargetQuestions.length === 0}
                    onClick={handleTriggerCsvExport}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs disabled:opacity-40 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>BAIXAR ARQUIVO CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* ABA 2: BACKUP COMPLETO JSON (PRESERVADO INTEGRALMENTE) */}
            {exportTab === "JSON" && (
              <div className="space-y-4">
                {/* Esclarecimento JSON */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Backup Completo do MEMORA+ (Formato JSON):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    O Backup JSON preserva <strong>100% dos dados</strong>: todas as questões, histórico completo de respostas, sessões de estudo, metas diárias, configurações e todos os parâmetros matemáticos do algoritmo de repetição espaçada SM-2.
                    <br />
                    Este continua sendo o formato recomendado para segurança e migração entre dispositivos.
                  </p>
                </div>

                {/* Ações JSON: Exportar & Restaurar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Exportar JSON */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-indigo-600" />
                        <span>Gerar Backup Completo</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cria um arquivo .json com todos os registros e métricas atuais.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFullBackupJson}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>BAIXAR BACKUP (JSON)</span>
                    </button>
                  </div>

                  {/* Restaurar JSON */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>Restaurar Backup Completo</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Carrega um arquivo JSON gerado anteriormente pelo MEMORA+.
                      </p>
                    </div>

                    <label
                      htmlFor="restore-json-upload"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer text-center"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>RESTAURAR BACKUP (JSON)</span>
                      <input
                        id="restore-json-upload"
                        type="file"
                        accept=".json,application/json"
                        onChange={handleRestoreFullBackupJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Mensagens de Sucesso ou Erro da Restauração JSON */}
                {jsonImportSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{jsonImportSuccess}</span>
                  </div>
                )}

                {jsonImportError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{jsonImportError}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportModalOpen(false);
                      setJsonImportError(null);
                      setJsonImportSuccess(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: COLAR TEXTO INTELIGENTE                             */}
      {/* ============================================================ */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Colar Questões (Conversor Inteligente)
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Cole o texto de uma apostila, PDF ou prova. O algoritmo MEMORA+ identifica automaticamente o enunciado, as alternativas (a, b, c, d), o gabarito e os comentários!
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Texto com Questões:
                </label>
                <button
                  onClick={() =>
                    handleParseSmartPaste(`1. O que caracteriza a neuroplasticidade no aprendizado humano?
A) A perda permanente de sinapses após a infância.
B) A capacidade do cérebro de reorganizar conexões neurais diante de novas experiências e repetição.
C) O bloqueio químico de novas lembranças durante o sono.
D) A limitação biológica a apenas 10% do cérebro.
Gabarito: B
Explicação: A neuroplasticidade é a base biológica da aprendizagem e da consolidação de memórias.
Matéria: Neurociência

2. Em Direito Administrativo, o princípio da impessoalidade veda:
A) O concurso público.
B) A promoção pessoal de agentes públicos sobre obras e serviços governamentais.
C) A publicidade de atos oficiais.
D) O processo administrativo disciplinar.
Resposta: Letra B
Comentário: O art. 37 da CF/88 veda a utilização de nomes, símbolos ou imagens que caracterizem promoção pessoal.
Matéria: Direito Administrativo`)
                  }
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Colar Exemplo
                </button>
              </div>

              <textarea
                rows={8}
                value={pasteRawText}
                onChange={(e) => handleParseSmartPaste(e.target.value)}
                placeholder="Cole o texto aqui..."
                className="w-full p-3 font-sans text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {smartPasteResult && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Reconhecimento Automático:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {smartPasteResult.parsed.length} questões identificadas com sucesso
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto text-[11px]">
                  {smartPasteResult.parsed.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        #{idx + 1}. {item.question?.slice(0, 70)}...
                      </div>
                      <div className="text-slate-500 flex items-center gap-3">
                        <span>Gabarito: {item.correctOption}</span>
                        <span>Matéria: {item.subject}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                disabled={!smartPasteResult || smartPasteResult.parsed.length === 0}
                onClick={handleApplySmartPaste}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
              >
                Adicionar {smartPasteResult?.parsed.length || 0} Questões ao Banco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
