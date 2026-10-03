import React, { useState } from "react";
import {
  BookMarked,
  PlusCircle,
  FileSpreadsheet,
  ClipboardPaste,
  Sparkles,
  Database,
  Palette,
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  ExternalLink,
  Code2,
  BrainCircuit,
  ArrowRight,
  Smartphone,
  Cloud,
} from "lucide-react";
import { CsvService } from "../../services/csvService";
import { PWAInstallButton } from "../pwa/PWAInstallButton";

interface UserManualViewProps {
  onNavigate: (view: string) => void;
  onOpenAddQuestion?: () => void;
}

export const UserManualView: React.FC<UserManualViewProps> = ({
  onNavigate,
  onOpenAddQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<
    "INSERIR_QUESTOES" | "LOGOTIPO" | "MODOS_ESTUDO" | "APP_MOBILE"
  >("INSERIR_QUESTOES");

  const handleDownloadCsvTemplate = () => {
    CsvService.downloadExampleCsvTemplate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 sm:p-8 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-lg space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
          <BookMarked className="w-3.5 h-3.5" />
          <span>Manual Oficial do Usuário • Guia Operacional</span>
        </div>
        <h1 className="text-2xl font-black">
          Como Usar o MEMORA+: Inserção de Dados & Identidade Visual
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          Instruções práticas e passo a passo sobre onde e como cadastrar questões, importar planilhas, colar apostilas, usar a Inteligência Artificial e personalizar o logotipo e a identidade da sua marca.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-3">
        <button
          onClick={() => setActiveTab("INSERIR_QUESTOES")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "INSERIR_QUESTOES"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Como e Onde Inserir Questões (5 Métodos)</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGOTIPO")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "LOGOTIPO"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Inserir Logotipo & Identidade Visual</span>
        </button>

        <button
          onClick={() => setActiveTab("MODOS_ESTUDO")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "MODOS_ESTUDO"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Mecanismo SM-2</span>
        </button>

        <button
          onClick={() => setActiveTab("APP_MOBILE")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "APP_MOBILE"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Celular & Formato APK</span>
        </button>
      </div>

      {/* TAB 1: COMO E ONDE INSERIR DADOS OU QUESTÕES */}
      {activeTab === "INSERIR_QUESTOES" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dica de Produtividade:</span> O MEMORA+ conta com 5 formas flexíveis de alimentação de dados para você nunca perder tempo digitando questão por questão se já possuir materiais prévios.
            </div>
          </div>

          {/* Método 1: Manual */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Inserção Manual Individual (Direto na Plataforma)
                </h2>
              </div>
              <button
                onClick={() => onNavigate("banco")}
                className="text-xs font-bold text-teal-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Ir para o Banco</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ideal para cadastrar questões pontuais de simulados, provas de concurso ou anotações próprias com formatação refinada.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Onde clicar:
              </div>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li>
                  No topo direito da tela (em qualquer página), clique no botão verde <strong>&quot;+ Nova Questão&quot;</strong>.
                </li>
                <li>
                  Ou navegue no menu lateral até <strong>&quot;Banco de Questões&quot;</strong> e clique no botão <strong>&quot;+ Nova Questão&quot;</strong>.
                </li>
              </ul>
              <div className="font-bold text-slate-800 dark:text-slate-200 pt-1">
                Campos a preencher:
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Enunciado, 4 Alternativas (A, B, C, D), Seleção do Gabarito Correto (botão de rádio), Comentário Pedagógico (explicação do porquê está certo ou errado), Matéria/Disciplina (ex: Direito Penal), Assunto e Nível (Fácil, Médio ou Difícil).
              </p>
            </div>
          </div>

          {/* Método 2: Importação Planilha CSV */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Importação em Lote via Planilha CSV (Excel / Google Planilhas)
                </h2>
              </div>
              <button
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Planilha Modelo (.CSV)</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Suba centenas ou milhares de questões instantaneamente a partir de um arquivo <code>.csv</code>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Onde clicar:
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Acesse o <strong>&quot;Banco de Questões&quot;</strong> e clique no botão <strong>&quot;Importar Planilha CSV&quot;</strong>.
              </p>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Nomes exatos das colunas da planilha (cabeçalho):
              </div>
              <div className="p-2 rounded-lg bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto select-all">
                question,optionA,optionB,optionC,optionD,correctOption,explanation,subject,topic,difficulty
              </div>
              <p className="text-slate-500 text-[11px]">
                * O sistema aceita tanto delimitador de vírgula (<code>,</code>) quanto ponto-e-vírgula (<code>;</code>), com proteção contra aspas e quebras de linha no enunciado.
              </p>
            </div>
          </div>

          {/* Método 3: Colar Texto Inteligente */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Colar Texto Inteligente (Copiar de PDFs, Apostilas e Provas)
              </h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Não precisa formatar planilha nem preencher campo por campo! Se você tem uma lista de questões em PDF, Word ou site, copie o bloco inteiro e o MEMORA+ faz o reconhecimento automático.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Onde clicar:
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                No <strong>&quot;Banco de Questões&quot;</strong>, clique no botão <strong>&quot;Colar Texto / Bloco&quot;</strong>.
              </p>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Exemplo de texto aceito:
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`1. Qual princípio constitucional garante o sigilo de correspondência?
a) Legalidade
b) Inviolabilidade do domicílio e correspondência
c) Publicidade
d) Impessoalidade
Gabarito: B
Comentário: Previsto no artigo 5º da CF/88.`}
              </pre>
            </div>
          </div>

          {/* Método 4: IA Educacional */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-black text-xs flex items-center justify-center">
                  4
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Geração com Inteligência Artificial (Gemini)
                </h2>
              </div>
              <button
                onClick={() => onNavigate("ia")}
                className="text-xs font-bold text-teal-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Abrir IA Memora+</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Crie questões inéditas de qualquer matéria com 1 clique ou cole resumos teóricos para a IA extrair questões de concurso comentadas.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Onde clicar:
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                No menu lateral, clique em <strong>&quot;IA Memora+&quot;</strong>.
              </p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                <li>
                  <strong>Aba 1 (Gerar por Tema):</strong> Digite a matéria (ex: Farmacologia), o assunto (ex: Antibióticos), selecione a quantidade (3, 5 ou 10) e a dificuldade.
                </li>
                <li>
                  <strong>Aba 2 (Converter Texto/Apostila):</strong> Cole qualquer texto de lei, apostila ou resumo de aula e clique em &quot;Extrair Questões&quot;.
                </li>
              </ul>
              <p className="text-emerald-600 font-semibold pt-1">
                Ao final, clique no botão &quot;Adicionar Todas ao Banco&quot; para integrá-las ao seu ciclo de estudos.
              </p>
            </div>
          </div>

          {/* Método 5: Backup JSON */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center justify-center">
                  5
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Backup e Restauração Integral em JSON (Migração entre Aparelhos)
                </h2>
              </div>
              <button
                onClick={() => onNavigate("configuracoes")}
                className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Ir para Configurações</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Transfira seu banco completo de questões, histórico de acertos, erros e agendamento da repetição espaçada de um computador para outro, ou do celular para o desktop.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="text-slate-600 dark:text-slate-300">
                Acesse <strong>&quot;Configurações&quot;</strong> &gt; Clique em <strong>&quot;Exportar Backup (JSON)&quot;</strong> para baixar o arquivo. No outro dispositivo, clique em <strong>&quot;Restaurar Backup (JSON)&quot;</strong> e selecione o arquivo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTIDADE VISUAL E LOGOTIPO */}
      {activeTab === "LOGOTIPO" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-teal-600" />
              <span>Como Inserir Seu Próprio Logotipo e Marca (White-Label)</span>
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Sim, você pode personalizar 100% da identidade visual!</strong> O MEMORA+ suporta tanto a marca clássica da deusa Mnemosyne quanto a inserção da sua marca institucional, curso preparatório, escola, faculdade ou projeto pessoal.
            </p>

            <div className="space-y-4 pt-2">
              {/* Opção A: Pela interface */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Opção 1: Diretamente pela Interface (Sem Código)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 pl-1">
                  <li>
                    Clique na aba <strong>&quot;Configurações&quot;</strong> no menu lateral.
                  </li>
                  <li>
                    Localize o primeiro card: <strong>&quot;Identidade Visual &amp; Logotipo Personalizado&quot;</strong>.
                  </li>
                  <li>
                    Clique no botão verde <strong>&quot;Fazer Upload do Logotipo (PNG / SVG / JPG)&quot;</strong> e escolha o arquivo da sua logomarca.
                  </li>
                  <li>
                    No campo <strong>&quot;Nome da Marca / Instituição&quot;</strong>, digite o nome desejado (ex: &quot;Meu Cursinho&quot; ou &quot;Alfa Concursos&quot;).
                  </li>
                  <li>
                    No campo <strong>&quot;Slogan Personalizado&quot;</strong>, personalize a frase de efeito se desejar.
                  </li>
                  <li>
                    <strong>Pronto!</strong> O novo logotipo e nome aparecerão imediatamente no topo da aplicação, na barra de navegação e em todas as telas.
                  </li>
                </ol>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate("configuracoes")}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <span>Ir para Configurações e Inserir Logo Agora</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Opção B: No Código-Fonte */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="font-bold text-teal-600 dark:text-teal-400 text-sm flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  <span>Opção 2: Fixar no Código-Fonte (Para Builds de Produção / Android)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Para desenvolvedores ou compilação definitiva em aplicativo móvel nativo:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
                  <li>
                    <strong>Símbolo SVG:</strong> O arquivo <code>/src/components/branding/MnemosyneLogo.tsx</code> contém os componentes <code>MnemosyneSymbol</code> e <code>MemoraBrandLogo</code>, onde qualquer vetor SVG pode ser substituído.
                  </li>
                  <li>
                    <strong>Favicon e Splash:</strong> É possível colocar um arquivo <code>icon.png</code> ou <code>logo.svg</code> na pasta <code>/public/</code> e referenciá-lo em <code>index.html</code>.
                  </li>
                  <li>
                    <strong>Paleta de Cores:</strong> As cores institucionais (Azul Profundo <code>#080C14</code>, Turquesa <code>#0D9488</code> e Âmbar <code>#F59E0B</code>) são configuráveis via classes Tailwind em <code>/src/index.css</code>.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODOS DE ESTUDO & SM-2 */}
      {activeTab === "MODOS_ESTUDO" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-teal-600" />
              <span>Como Funciona o Mecanismo Científico de Repetição Espaçada</span>
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              O MEMORA+ implementa uma versão matematicamente fiel do algoritmo <strong>SuperMemo (SM-2)</strong> para combater a Curva do Esquecimento de Ebbinghaus.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-rose-600">Não Lembro (Reset)</div>
                <p className="text-[11px] text-slate-500">
                  Zera as repetições consecutivas e agenda o retorno da questão para amanhã (1 dia).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-amber-500">Difícil</div>
                <p className="text-[11px] text-slate-500">
                  Mantém intervalo curto (+2 dias) e reduz o Fator de Facilidade da questão.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-teal-600 dark:text-teal-400">Bom</div>
                <p className="text-[11px] text-slate-500">
                  Progresso normal (+4 a 6 dias), consolidando a retenção na memória de médio prazo.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-emerald-600">Fácil (Dominada)</div>
                <p className="text-[11px] text-slate-500">
                  Intervalo ampliado (+10 a 21 dias), transferindo a questão para a Memória de Longo Prazo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMO USAR NO CELULAR E GERAR APK */}
      {activeTab === "APP_MOBILE" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">App Nativo fora do Computador:</span> O MEMORA+ foi projetado com arquitetura Mobile-First, com suporte a <strong>PWA (instalação direta sem loja)</strong> e compilação para <strong>APK nativo do Android</strong> via Capacitor.
            </div>
          </div>

          {/* Método A: PWA */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-black text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Como Instalar no Celular Agora (Modo PWA - 1 Minuto)
              </h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você não precisa esperar aprovação da Google Play para ter o MEMORA+ no celular. O aplicativo já conta com manifesto PWA e ícones configurados:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Passo 1</div>
                <p className="text-[11px] text-slate-500">
                  Abra o link do MEMORA+ no navegador <strong>Google Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone/iPad).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Passo 2</div>
                <p className="text-[11px] text-slate-500">
                  No Chrome, toque nos 3 pontinhos (<code className="px-1 rounded bg-slate-200 dark:bg-slate-700">⋮</code>) no topo. No Safari, toque no botão de Compartilhar (<code className="px-1 rounded bg-slate-200 dark:bg-slate-700">⎋</code>).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Passo 3</div>
                <p className="text-[11px] text-slate-500">
                  Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                ✓ Pronto! O ícone oficial do MEMORA+ aparecerá na gaveta de aplicativos do seu celular e abrirá em modo <strong>Standalone</strong> (sem barra de URL, exatamente como um app nativo).
              </div>
              <div className="shrink-0">
                <PWAInstallButton variant="compact" />
              </div>
            </div>
          </div>

          {/* Método B: Gerar APK */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Como Compilar e Gerar o Arquivo APK Nativo (Android Studio)
              </h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Caso você deseje distribuir um arquivo executável <strong>.APK</strong> para instalar diretamente em aparelhos ou publicar na <strong>Google Play Store</strong>:
            </p>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                1. Baixe o código fonte (botão Export no menu de configurações do AI Studio)
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. No terminal do seu computador, execute os seguintes comandos:
              </div>
              <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs space-y-1.5 overflow-x-auto">
                <div className="text-slate-500"># Instalar ferramentas do Capacitor Android</div>
                <div className="text-teal-400">npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                <div className="text-slate-500"># Inicializar configuração do app</div>
                <div className="text-teal-400">npx cap init "MEMORA+" "com.memora.app" --web-dir dist</div>
                <div className="text-slate-500"># Gerar build web e criar pasta do Android</div>
                <div className="text-teal-400">npm run build</div>
                <div className="text-teal-400">npx cap add android</div>
                <div className="text-slate-500"># Abrir no Android Studio para gerar o APK</div>
                <div className="text-teal-400">npx cap open android</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">No Android Studio:</div>
              <p className="text-[11px]">
                Vá no menu superior <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. O Android Studio gerará o arquivo <code className="font-bold text-indigo-600">app-debug.apk</code> ou <code className="font-bold text-indigo-600">app-release.apk</code> pronto para ser instalado em qualquer celular Android via cabo USB, WhatsApp ou Drive!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
