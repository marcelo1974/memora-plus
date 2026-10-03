import {
  CsvInvalidRow,
  CsvValidationResult,
  CsvValidItem,
  OptionLetter,
  Question,
  QuestionDifficulty,
} from "../types";

export const STANDARD_CSV_HEADER =
  "id;disciplina;materia;assunto;enunciado;alternativaA;alternativaB;alternativaC;alternativaD;alternativaE;respostaCorreta;explicacao;dificuldade;tags;origem;observacao";

/**
 * Escapes a cell value according to standard CSV rules:
 * - Encloses in quotes if the string contains delimiter (;), double quotes ("), or newlines (\n, \r)
 * - Escapes internal quotes by doubling them ("")
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(";") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * State-machine CSV parser that supports:
 * - Semicolons inside quoted fields
 * - Escaped quotes ("") within quoted fields
 * - Multiline text fields (newlines inside quotes)
 * - Accents and Unicode preservation
 * - Leading UTF-8 BOM removal (\uFEFF)
 */
export function parseCsvRows(content: string, delimiter = ";"): string[][] {
  if (!content) return [];

  // Remove UTF-8 BOM if present
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes) {
        // Escaped quote: "" -> literal "
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        // Opening quote
        insideQuotes = true;
        i++;
        continue;
      }
    }

    if (!insideQuotes) {
      if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      }

      if (char === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++; // Consume \r\n
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      }

      if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      }
    }

    // Regular character (or newline/semicolon inside quotes)
    currentField += char;
    i++;
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out trailing completely empty rows
  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

/**
 * Normalizes header string to ease comparison (accent-insensitive, lowercase, no spaces/punctuation)
 */
function normalizeHeaderName(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_\-]/g, "");
}

export const CsvService = {
  /**
   * Generates a sample CSV adhering strictly to standard specification
   */
  getSampleCsv(): string {
    const rows = [
      STANDARD_CSV_HEADER,
      'q-101;Direito Constitucional;Direito Constitucional;Direitos Fundamentais;"No tocante aos direitos e garantias fundamentais previstos na Constituição Federal de 1988, é correto afirmar que:";"Homens e mulheres são desiguais em direitos e obrigações nos termos da lei ordinária";"Ninguém será submetido a tortura nem a tratamento desumano ou degradante";"É assegurado o livre exercício de qualquer trabalho, independentemente de qualificações profissionais";"A criação de associações independe de lei, sendo permitida a interferência estatal em seu funcionamento";"A casa é asilo inviolável do indivíduo, podendo nela penetrar a qualquer momento sem consentimento";B;"Conforme o art. 5º, inciso III da CF/88: ninguém será submetido a tortura nem a tratamento desumano ou degradante.";Fácil;Constituição, Direitos Fundamentais, Artigo 5;FCC 2024 - TJ/SP;Atenção à literalidade do art. 5º, III',
      'q-102;Língua Portuguesa;Língua Portuguesa;Crase;"Assinale a alternativa em que o uso do acento indicativo de crase está inteiramente CORRETO:";"O aluno dedicou-se à estudar com afinco para a prova.";"Entregou o relatório à uma comissão parlamentar mista.";"Ficou cara à cara com o examinador da banca.";"Referiu-se às propostas apresentadas na sessão anterior.";"Dirigiu-se à ela com todo o respeito devido.";D;"Ocorre crase diante de substantivo feminino determinado pelo artigo definido (as propostas). Nas demais opções, não há crase antes de verbo, artigo indefinido, palavras repetidas ou pronome pessoal.";Médio;Gramática, Crase, Regência;Cespe 2025 - Auditor;Não ocorre crase antes de verbos ou pronomes pessoais',
      ';Direito Administrativo;Direito Administrativo;Princípios Fundamentais;"O princípio administrativo que veda a promoção pessoal de agentes públicos sobre obras, serviços e campanhas de órgãos públicos é o:";"Princípio da Legalidade";"Princípio da Impessoalidade";"Princípio da Moralidade";"Princípio da Eficiência";;B;"O art. 37, § 1º da CF/88 consagra o princípio da impessoalidade, vedando que constem nomes, símbolos ou imagens que caracterizem promoção pessoal.";Fácil;Direito Administrativo, Princípios, CF88;Vunesp 2024;Exemplo sem alternativa E e sem ID prévio (ID será gerado automaticamente)',
      ';Neurociência & Cognição;Neurociência;Memória de Trabalho;"Em neurociência cognitiva, a memória operacional (memória de trabalho) é conceituada como:";"O mecanismo de armazenamento permanente e inalterável de dados semânticos";"O sistema de capacidade limitada responsável pela retenção temporária e manipulação ativa de informações durante o raciocínio";"A amnésia retrógrada temporária decorrente de sobrecarga sensorial";"A resposta reflexa motora mediada exclusivamente pela medula espinhal";;B;"A memória de trabalho (working memory) permite manipular dados ativos em tempo real para a tomada de decisões e aprendizado.";Médio;Neurociência, Aprendizagem, SM-2;MEMORA+ Pesquisa;Conceito basilar para o algoritmo de repetição espaçada',
    ];
    return rows.join("\n");
  },

  /**
   * Triggers download of sample CSV template with UTF-8 BOM
   */
  downloadExampleCsvTemplate(filename = "memora_modelo_questoes.csv"): void {
    const csv = this.getSampleCsv();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Parses CSV string into structured validation result with deep error diagnostics,
   * duplicate ID prevention, and Spaced Repetition (SM-2) immunization.
   */
  parseAndValidateCsv(
    csvContent: string,
    existingQuestions: Question[]
  ): CsvValidationResult {
    if (!csvContent || csvContent.trim().length === 0) {
      return {
        validRows: [],
        validItems: [],
        invalidRows: [
          {
            rowNumber: 1,
            raw: "",
            error: "O arquivo CSV está vazio.",
          },
        ],
        duplicateCount: 0,
        totalCount: 0,
      };
    }

    // Determine delimiter (default to ';', fallback to ',' if ';' not present)
    const firstLineSnippet = csvContent.split(/\r?\n/)[0] || "";
    const delimiter = firstLineSnippet.includes(";") ? ";" : ",";

    const rows = parseCsvRows(csvContent, delimiter);

    if (rows.length === 0) {
      return {
        validRows: [],
        validItems: [],
        invalidRows: [
          {
            rowNumber: 1,
            raw: "",
            error: "Nenhuma linha legível encontrada no arquivo CSV.",
          },
        ],
        duplicateCount: 0,
        totalCount: 0,
      };
    }

    // Existing IDs in database (Requirement 8: strict duplicate ID prevention)
    const existingIdSet = new Set<string>();
    existingQuestions.forEach((q) => {
      if (q.id) existingIdSet.add(q.id.trim());
    });

    // Track IDs already seen within this CSV to prevent intra-file duplicates
    const seenCsvIds = new Set<string>();

    // Analyze Header Row (Row 1)
    const headerRow = rows[0];
    const headerMap = new Map<string, number>();

    headerRow.forEach((colName, index) => {
      const norm = normalizeHeaderName(colName);
      if (norm) {
        headerMap.set(norm, index);
      }
    });

    // Helper to find column index from recognized aliases
    const findCol = (aliases: string[]): number => {
      for (const a of aliases) {
        const norm = normalizeHeaderName(a);
        if (headerMap.has(norm)) {
          return headerMap.get(norm)!;
        }
      }
      return -1;
    };

    const colId = findCol(["id", "codigo"]);
    const colDiscipline = findCol(["disciplina", "discipline"]);
    const colSubject = findCol(["materia", "subject", "disciplinamateria"]);
    const colTopic = findCol(["assunto", "topic", "topico"]);
    const colQuestion = findCol([
      "enunciado",
      "pergunta",
      "question",
      "questao",
      "texto",
    ]);
    const colOptA = findCol(["alternativaa", "optiona", "opcaoa", "a"]);
    const colOptB = findCol(["alternativab", "optionb", "opcaob", "b"]);
    const colOptC = findCol(["alternativac", "optionc", "opcaoc", "c"]);
    const colOptD = findCol(["alternativad", "optiond", "opcaod", "d"]);
    const colOptE = findCol(["alternativae", "optione", "opcaoe", "e"]);
    const colCorrect = findCol([
      "respostacorreta",
      "resposta",
      "gabarito",
      "correta",
      "correctoption",
      "answer",
    ]);
    const colExplanation = findCol([
      "explicacao",
      "comentario",
      "justificativa",
      "explanation",
    ]);
    const colDifficulty = findCol(["dificuldade", "difficulty", "nivel"]);
    const colTags = findCol(["tags", "tag", "etiquetas"]);
    const colOrigin = findCol(["origem", "origin", "banca", "concurso", "fonte"]);
    const colObservation = findCol([
      "observacao",
      "observacoes",
      "observation",
      "obs",
      "nota",
    ]);

    // Check mandatory header columns
    const missingHeaders: string[] = [];
    if (colQuestion === -1) missingHeaders.push("enunciado");
    if (colOptA === -1) missingHeaders.push("alternativaA");
    if (colOptB === -1) missingHeaders.push("alternativaB");
    if (colOptC === -1) missingHeaders.push("alternativaC");
    if (colOptD === -1) missingHeaders.push("alternativaD");
    if (colCorrect === -1) missingHeaders.push("respostaCorreta");

    if (missingHeaders.length > 0) {
      return {
        validRows: [],
        validItems: [],
        invalidRows: [
          {
            rowNumber: 1,
            raw: headerRow.join(delimiter),
            error: `Cabeçalho inválido ou incompatível. Coluna(s) obrigatória(s) ausente(s): ${missingHeaders.join(
              ", "
            )}. Esperado cabeçalho: ${STANDARD_CSV_HEADER}`,
            field: missingHeaders[0],
          },
        ],
        duplicateCount: 0,
        totalCount: rows.length > 1 ? rows.length - 1 : 0,
      };
    }

    const validRows: Partial<Question>[] = [];
    const validItems: CsvValidItem[] = [];
    const invalidRows: CsvInvalidRow[] = [];
    let duplicateCount = 0;

    const totalDataRows = rows.length - 1;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rowNumber = r + 1; // 1-indexed line number
      const rawText = row.join(delimiter);

      // Safe column extractor
      const getVal = (idx: number): string => (idx >= 0 && idx < row.length ? row[idx].trim() : "");

      const rawId = getVal(colId);
      const rawDiscipline = getVal(colDiscipline);
      const rawSubject = getVal(colSubject);
      const rawTopic = getVal(colTopic);
      const rawQuestion = getVal(colQuestion);
      const rawOptA = getVal(colOptA);
      const rawOptB = getVal(colOptB);
      const rawOptC = getVal(colOptC);
      const rawOptD = getVal(colOptD);
      const rawOptE = getVal(colOptE);
      const rawCorrect = getVal(colCorrect).toUpperCase();
      const rawExplanation = getVal(colExplanation);
      const rawDifficulty = getVal(colDifficulty);
      const rawTags = getVal(colTags);
      const rawOrigin = getVal(colOrigin);
      const rawObservation = getVal(colObservation);

      // 1. Mandatory: Enunciado
      if (!rawQuestion || rawQuestion.length === 0) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Enunciado é obrigatório e não pode ser vazio.",
          field: "enunciado",
        });
        continue;
      }

      // 2. Mandatory: Alternativas A, B, C, D
      if (!rawOptA) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Alternativa A é obrigatória e está vazia.",
          field: "alternativaA",
        });
        continue;
      }
      if (!rawOptB) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Alternativa B é obrigatória e está vazia.",
          field: "alternativaB",
        });
        continue;
      }
      if (!rawOptC) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Alternativa C é obrigatória e está vazia.",
          field: "alternativaC",
        });
        continue;
      }
      if (!rawOptD) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Alternativa D é obrigatória e está vazia.",
          field: "alternativaD",
        });
        continue;
      }

      // 3. Mandatory: Resposta Correta (A, B, C, D, E)
      const validLetters: OptionLetter[] = ["A", "B", "C", "D", "E"];
      let cleanAnswer: OptionLetter | null = null;
      for (const l of validLetters) {
        if (rawCorrect === l || rawCorrect.startsWith(`LETRA ${l}`) || rawCorrect.startsWith(`${l})`)) {
          cleanAnswer = l;
          break;
        }
      }

      if (!cleanAnswer) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: `Gabarito inválido ('${rawCorrect}'). O valor deve ser A, B, C, D ou E.`,
          field: "respostaCorreta",
        });
        continue;
      }

      // 4. Se a resposta for E: alternativaE obrigatoriamente deve existir e não estar vazia
      if (cleanAnswer === "E" && (!rawOptE || rawOptE.length === 0)) {
        invalidRows.push({
          rowNumber,
          raw: rawText,
          error: "Resposta E exige alternativa E preenchida.",
          field: "alternativaE",
        });
        continue;
      }

      // 5. Dificuldade (opcional, mas se fornecida deve ser válida)
      let cleanDifficulty: QuestionDifficulty = "Médio";
      if (rawDifficulty) {
        const normDiff = normalizeHeaderName(rawDifficulty);
        if (normDiff.includes("fac")) {
          cleanDifficulty = "Fácil";
        } else if (normDiff.includes("med")) {
          cleanDifficulty = "Médio";
        } else if (normDiff.includes("dif")) {
          cleanDifficulty = "Difícil";
        } else {
          invalidRows.push({
            rowNumber,
            raw: rawText,
            error: `Dificuldade inválida ('${rawDifficulty}'). Valores permitidos: Fácil, Médio ou Difícil.`,
            field: "dificuldade",
          });
          continue;
        }
      }

      // 6. ID Duplicado (Requirement 8 - CRÍTICO)
      let effectiveId: string;
      let isCustomId = false;

      if (rawId && rawId.length > 0) {
        // ID fornecido no CSV
        if (existingIdSet.has(rawId)) {
          duplicateCount++;
          invalidRows.push({
            rowNumber,
            raw: rawText,
            error: `ID DUPLICADO — NÃO IMPORTADA (O ID "${rawId}" já existe no banco de dados local).`,
            field: "id",
            isDuplicateId: true,
          });
          continue;
        }

        if (seenCsvIds.has(rawId)) {
          duplicateCount++;
          invalidRows.push({
            rowNumber,
            raw: rawText,
            error: `ID DUPLICADO — NÃO IMPORTADA (O ID "${rawId}" está repetido neste mesmo arquivo CSV).`,
            field: "id",
            isDuplicateId: true,
          });
          continue;
        }

        seenCsvIds.add(rawId);
        effectiveId = rawId;
        isCustomId = true;
      } else {
        // Gerar novo ID seguro sem reutilizar IDs existentes
        effectiveId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${r}`;
      }

      // 7. Disciplina / Matéria / Assunto (Requirement 10)
      // Se disciplina estiver vazia, usar a matéria como fallback
      const subject = rawSubject || rawDiscipline || "Geral";
      const discipline = rawDiscipline || subject;
      const topic = rawTopic || "Geral";

      // 8. Tags (Requirement 12: separadas por vírgula)
      let tags: string[] = [];
      if (rawTags) {
        tags = rawTags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }
      if (tags.length === 0) {
        tags = [discipline, subject];
      }

      // 9. Construção da Questão (Requirement 9: Isolamento absoluto do SM-2)
      // Preservar somente os dados pedagógicos. Inicializar SM-2 como questão NOVA.
      const now = new Date().toISOString();
      const newQuestion: Partial<Question> = {
        id: effectiveId,
        question: rawQuestion,
        optionA: rawOptA,
        optionB: rawOptB,
        optionC: rawOptC,
        optionD: rawOptD,
        optionE: rawOptE ? rawOptE : undefined,
        correctOption: cleanAnswer,
        explanation: rawExplanation || "Sem comentário adicional cadastrado.",
        discipline,
        subject,
        topic,
        difficulty: cleanDifficulty,
        estimatedTime: 60,
        tags,
        isFavorite: false,
        origin: rawOrigin || undefined,
        observation: rawObservation || undefined,

        // SM-2 e Histórico estritamente inicializados como nova questão:
        memoryState: "NOVA",
        repetitionCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewDate: now,
        lastReviewDate: undefined,
        errorCount: 0,
        correctCount: 0,
        lastAnsweredAt: undefined,
        lastWasCorrect: undefined,
        averageTimeSpentMs: 0,
        createdAt: now,
        updatedAt: now,
      };

      validRows.push(newQuestion);
      validItems.push({
        id: effectiveId,
        rowNumber,
        question: newQuestion,
        isCustomId,
      });
    }

    return {
      validRows,
      validItems,
      invalidRows,
      duplicateCount,
      totalCount: totalDataRows,
    };
  },

  /**
   * Converts question array to official Standard CSV format with UTF-8 BOM
   */
  exportQuestionsToCsv(questions: Question[]): string {
    const rows = questions.map((q) => {
      const discipline = q.discipline || q.subject || "Geral";
      const subject = q.subject || discipline;
      const topic = q.topic || "Geral";
      const optE = q.optionE || "";
      const tagsStr = Array.isArray(q.tags) ? q.tags.join(", ") : "";

      return [
        escapeCsvCell(q.id),
        escapeCsvCell(discipline),
        escapeCsvCell(subject),
        escapeCsvCell(topic),
        escapeCsvCell(q.question),
        escapeCsvCell(q.optionA),
        escapeCsvCell(q.optionB),
        escapeCsvCell(q.optionC),
        escapeCsvCell(q.optionD),
        escapeCsvCell(optE),
        escapeCsvCell(q.correctOption),
        escapeCsvCell(q.explanation || ""),
        escapeCsvCell(q.difficulty || "Médio"),
        escapeCsvCell(tagsStr),
        escapeCsvCell(q.origin || ""),
        escapeCsvCell(q.observation || ""),
      ].join(";");
    });

    // Include UTF-8 BOM (\uFEFF) at the start for optimal Excel compatibility
    return "\uFEFF" + [STANDARD_CSV_HEADER, ...rows].join("\n");
  },

  /**
   * Triggers file download in the browser
   */
  downloadCsvFile(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * REQUIREMENT 17: Smart Paste parser
   * Preserved for text pasted from PDFs and books
   */
  parseSmartPastedQuestions(text: string): {
    parsed: Partial<Question>[];
    rawBlocksCount: number;
    failedBlocks: string[];
  } {
    if (!text || text.trim().length === 0) {
      return { parsed: [], rawBlocksCount: 0, failedBlocks: [] };
    }

    const blocks: string[] = [];
    const rawLines = text.split(/\r?\n/);
    let currentBlock: string[] = [];

    const isQuestionStart = (line: string) => {
      const trimmed = line.trim();
      return (
        /^(?:Quest[ãa]o\s*\d+|\d+[\.\)\-]|Q\d+[\.\)\-])\s+/i.test(trimmed)
      );
    };

    for (const line of rawLines) {
      if (isQuestionStart(line) && currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n").trim());
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n").trim());
    }

    const effectiveBlocks =
      blocks.length > 1
        ? blocks
        : text
            .split(/\n\s*\n\s*\n/)
            .map((b) => b.trim())
            .filter((b) => b.length > 20);

    const parsed: Partial<Question>[] = [];
    const failedBlocks: string[] = [];

    for (let i = 0; i < effectiveBlocks.length; i++) {
      const block = effectiveBlocks[i];
      if (!block || block.length < 25) continue;

      try {
        const item = this.extractQuestionFromBlock(block, i + 1);
        if (item) {
          parsed.push(item);
        } else {
          failedBlocks.push(block.slice(0, 100) + "...");
        }
      } catch {
        failedBlocks.push(block.slice(0, 100) + "...");
      }
    }

    return {
      parsed,
      rawBlocksCount: effectiveBlocks.length,
      failedBlocks,
    };
  },

  extractQuestionFromBlock(block: string, index: number): Partial<Question> | null {
    const optAPattern = /(?:^|\n)\s*(?:[Aa][\)\.\-]|[Aa]\s*[:\-])\s*([\s\S]*?)(?=(?:\n\s*[Bb][\)\.\-:]|\n\s*Gabarito|\n\s*Resposta|$))/i;
    const optBPattern = /(?:^|\n)\s*(?:[Bb][\)\.\-]|[Bb]\s*[:\-])\s*([\s\S]*?)(?=(?:\n\s*[Cc][\)\.\-:]|\n\s*Gabarito|\n\s*Resposta|$))/i;
    const optCPattern = /(?:^|\n)\s*(?:[Cc][\)\.\-]|[Cc]\s*[:\-])\s*([\s\S]*?)(?=(?:\n\s*[Dd][\)\.\-:]|\n\s*Gabarito|\n\s*Resposta|$))/i;
    const optDPattern = /(?:^|\n)\s*(?:[Dd][\)\.\-]|[Dd]\s*[:\-])\s*([\s\S]*?)(?=(?:\n\s*[Ee][\)\.\-:]|\n\s*Gabarito|\n\s*Resposta|\n\s*Explica|$))/i;

    const optAMatch = block.match(optAPattern);
    const optBMatch = block.match(optBPattern);
    const optCMatch = block.match(optCPattern);
    const optDMatch = block.match(optDPattern);

    if (!optAMatch || !optBMatch || !optCMatch || !optDMatch) {
      return null;
    }

    const optAIndex = optAMatch.index || 0;
    let questionText = block.substring(0, optAIndex).trim();
    questionText = questionText.replace(/^(?:Quest[ãa]o\s*\d+[\.\:\-]?|\d+[\.\)\-]\s*)/i, "").trim();

    if (!questionText || questionText.length < 5) {
      return null;
    }

    const gabaritoPattern = /(?:Gabarito|Resposta|Resp|Correta)\s*[:\-]?\s*(?:Letra\s*)?([A-Ea-e])/i;
    const gabaritoMatch = block.match(gabaritoPattern);
    const correctLetter: OptionLetter = gabaritoMatch
      ? (gabaritoMatch[1].toUpperCase() as OptionLetter)
      : "A";

    const explanationPattern = /(?:Explica[çc][ãa]o|Coment[áa]rio|Justificativa)\s*[:\-]?\s*([\s\S]*)$/i;
    const expMatch = block.match(explanationPattern);
    const explanation = expMatch ? expMatch[1].trim() : "Explicação adicionada via importação inteligente.";

    let subject = "Geral";
    let topic = "Importado";
    const materiaMatch = block.match(/(?:Mat[ée]ria|Disciplina)\s*[:\-]?\s*([^\n]+)/i);
    if (materiaMatch) subject = materiaMatch[1].trim();

    const assuntoMatch = block.match(/(?:Assunto|T[eé]pico)\s*[:\-]?\s*([^\n]+)/i);
    if (assuntoMatch) topic = assuntoMatch[1].trim();

    const now = new Date().toISOString();

    return {
      id: `paste-${Date.now()}-${index}`,
      question: questionText,
      optionA: optAMatch[1].trim(),
      optionB: optBMatch[1].trim(),
      optionC: optCMatch[1].trim(),
      optionD: optDMatch[1].trim(),
      correctOption: correctLetter,
      explanation: explanation,
      discipline: subject,
      subject: subject,
      topic: topic,
      difficulty: "Médio",
      estimatedTime: 60,
      tags: [subject, topic],
      isFavorite: false,
      memoryState: "NOVA",
      repetitionCount: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: now,
      errorCount: 0,
      correctCount: 0,
      averageTimeSpentMs: 0,
      createdAt: now,
      updatedAt: now,
    };
  },
};
