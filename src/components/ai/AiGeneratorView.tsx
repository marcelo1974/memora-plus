import { auth } from "../../services/firebase";
import { assertCloudAccount } from "../../services/cloudAccountGuard";
import React, { useState, lazy, Suspense } from "react";
import { OptionLetter, Question, QuestionDifficulty } from "../../types";
import {
  Sparkles,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Check,
  RotateCcw,
} from "lucide-react";

const PdfStudyView = lazy(() => import("./PdfStudyView"));

interface AiGeneratorViewProps {
  onBulkAddQuestions: (questions: Partial<Question>[]) => number;
  onFinish: () => void;
}

export const AiGeneratorView: React.FC<AiGeneratorViewProps> = ({
  onBulkAddQuestions,
  onFinish,
}) => {
  const [tab, setTab] = useState<"TOPIC" | "TEXT" | "PDF">("TOPIC");

  // Topic mode inputs
  const [subject, setSubject] = useState("Direito Constitucional");
  const [topic, setTopic] = useState("Direitos e Garantias Fundamentais");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("Médio");
  const [count, setCount] = useState<number>(5);

  // Text mode input
  const [sourceText, setSourceText] = useState("");

  // Loading & results state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Partial<Question>[]>([]);
  const [isSuccessAdded, setIsSuccessAdded] = useState(false);

  const authenticatedHeaders = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Entre com sua conta para utilizar a geração por IA.");
    await assertCloudAccount(user.uid, () => auth.currentUser?.uid ?? null);
    const token = await user.getIdToken();
    if (auth.currentUser?.uid !== user.uid) throw new Error("A conta mudou. Tente novamente.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  // Handle Generate by Topic
  const handleGenerateByTopic = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsSuccessAdded(false);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: await authenticatedHeaders(),
        body: JSON.stringify({
          subject,
          topic,
          difficulty,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar questões com IA.");
      }

      setGeneratedQuestions(data.questions || []);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Erro de conexão ao servidor de Inteligência Artificial."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Generate from Text
  const handleGenerateFromText = async () => {
    if (!sourceText.trim() || sourceText.length < 20) {
      setErrorMessage("Por favor, cole um texto com pelo menos 20 caracteres.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsSuccessAdded(false);
    try {
      const res = await fetch("/api/ai/text-to-questions", {
        method: "POST",
        headers: await authenticatedHeaders(),
        body: JSON.stringify({
          text: sourceText,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao converter texto em questões.");
      }

      setGeneratedQuestions(data.questions || []);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Erro de conexão ao servidor de Inteligência Artificial."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save to Bank
  const handleSaveAll = () => {
    if (generatedQuestions.length === 0) return;
    const added = onBulkAddQuestions(generatedQuestions);
    setIsSuccessAdded(true);
    setTimeout(() => {
      onFinish();
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 sm:p-8 bg-linear-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-800/40 text-white shadow-lg space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>IA Educacional MEMORA+ (Powered by Gemini)</span>
        </div>
        <h1 className="text-2xl font-black">
          Geração Inteligente de Questões
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Crie baterias de estudo de alto nível a partir de qualquer tema ou converta resumos, apostilas e leis em questões de múltipla escolha com comentários detalhados.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setTab("TOPIC")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            tab === "TOPIC"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Gerar por Matéria & Assunto</span>
        </button>

        <button
          onClick={() => setTab("TEXT")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            tab === "TEXT"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Converter Texto / Resumo em Questões</span>
        </button>
        <button onClick={() => setTab("PDF")} className={`pb-3 text-xs font-bold border-b-2 ${tab === "PDF" ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500"}`}>PDF e resumos</button>
      </div>

      {tab === "PDF" && <Suspense fallback={<p>Carregando leitor de PDF…</p>}><PdfStudyView onBulkAddQuestions={onBulkAddQuestions} /></Suspense>}
      {tab !== "PDF" && <>
      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {tab === "TOPIC" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Matéria / Disciplina:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Direito Administrativo, Medicina, Física..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assunto Específico:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Atos Administrativos, Neurotransmissores..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dificuldade:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Fácil", "Médio", "Difícil"] as const).map((diff) => (
                    <button
                      type="button"
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        difficulty === diff
                          ? "bg-teal-600 text-white border-teal-600 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade de Questões:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setCount(num)}
                      className={`py-2 text-xs font-semibold rounded-xl border ${
                        count === num
                          ? "bg-teal-600 text-white border-teal-600 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {num} questões
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={isLoading}
                onClick={handleGenerateByTopic}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando com Inteligência Artificial...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar {count} Questões Inéditas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cole o Artigo, Resumo ou Trecho de Aula:
              </label>
              <textarea
                rows={6}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Cole o conteúdo teórico para que a IA crie questões contextualizadas..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                disabled={isLoading}
                onClick={handleGenerateFromText}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando texto e sintetizando questões...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extrair Questões do Texto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generated Results Preview */}
      {generatedQuestions.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{generatedQuestions.length} Questões Prontas para Adição</span>
            </h3>

            <button
              disabled={isSuccessAdded}
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {isSuccessAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvo com Sucesso!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Todas ao Banco</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {generatedQuestions.map((q, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  #{i + 1}. {q.question}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 dark:text-slate-300">
                  <div className={q.correctOption === "A" ? "font-bold text-emerald-600" : ""}>
                    A) {q.optionA}
                  </div>
                  <div className={q.correctOption === "B" ? "font-bold text-emerald-600" : ""}>
                    B) {q.optionB}
                  </div>
                  <div className={q.correctOption === "C" ? "font-bold text-emerald-600" : ""}>
                    C) {q.optionC}
                  </div>
                  <div className={q.correctOption === "D" ? "font-bold text-emerald-600" : ""}>
                    D) {q.optionD}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-emerald-600">Gabarito: {q.correctOption}</span> — {q.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>}
    </div>
  );
};
