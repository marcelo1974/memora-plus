import { assertCloudAccount, claimCloudOwner, getCloudOwner } from '../../services/cloudAccountGuard';
import React, { useState, useEffect } from "react";
import { UserSettings, StorageHealth, IntegrityCheckReport } from "../../types";
import { StorageService } from "../../services/storageService";
import { formatBytes } from "../../services/storageHealthService";
import { FirebaseService } from "../../services/firebase";
import { MemoraBrandLogo } from "../branding/MnemosyneLogo";
import { User as FirebaseUser } from "firebase/auth";
import { PWAInstallButton } from "../pwa/PWAInstallButton";
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Moon,
  Sun,
  Target,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  ShieldCheck,
  Image as ImageIcon,
  Palette,
  Check,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  RefreshCw,
  Terminal,
  ExternalLink,
  HardDrive,
  Activity,
  Shield,
  FileCheck2,
} from "lucide-react";

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onRefreshAllData: () => void;
  questionsCount: number;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
  questionsCount,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Storage Health & Integrity state (Fase 4C)
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [integrityReport, setIntegrityReport] = useState<IntegrityCheckReport | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [isRequestingPersistence, setIsRequestingPersistence] = useState(false);

  useEffect(() => {
    StorageService.getStorageHealthDetails().then(setStorageHealth).catch(() => {});
  }, []);

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    try {
      const report = await StorageService.runIntegrityCheck();
      setIntegrityReport(report);
      const updatedHealth = await StorageService.getStorageHealthDetails();
      setStorageHealth(updatedHealth);

      if (report.overall === "PASS") {
        showFeedback("Integridade verificada com sucesso! Nenhum problema encontrado no banco de dados.");
      } else if (report.overall === "WARNING") {
        showFeedback("Verificação concluída com avisos. Consulte os detalhes na seção de armazenamento.", "error");
      } else {
        showFeedback("Falha na verificação de integridade. Consulte os detalhes na seção de armazenamento.", "error");
      }
    } catch {
      showFeedback("Erro ao executar checagem de integridade.", "error");
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleRequestPersistence = async () => {
    setIsRequestingPersistence(true);
    try {
      const res = await StorageService.requestPersistentStorage();
      const updatedHealth = await StorageService.getStorageHealthDetails();
      setStorageHealth(updatedHealth);

      if (res.status === "GRANTED") {
        showFeedback("Armazenamento persistente concedido com sucesso pelo navegador!");
      } else if (res.status === "DENIED") {
        showFeedback("O navegador não concedeu persistência durável no momento (permanece em quota padrão).", "error");
      } else {
        showFeedback("API de persistência durável não suportada neste navegador.", "error");
      }
    } catch {
      showFeedback("Erro ao solicitar persistência durável.", "error");
    } finally {
      setIsRequestingPersistence(false);
    }
  };

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Sync to Cloud manually
  const handleManualSync = async () => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    setIsSyncing(true);
    try {
      if (!navigator.onLine) throw new Error("Conecte-se à internet para sincronizar.");
      const userId = currentUser.uid;
      await StorageService.flushWrites();
      const owner = await getCloudOwner();
      if (owner === null) {
        const confirmed = window.confirm(`Vincular os dados deste navegador à conta ${currentUser.email || userId}? Confira se estes dados são seus. Depois, outra conta não poderá sincronizar este banco local. Nenhum dado será apagado.`);
        if (!confirmed) return;
        if (FirebaseService.currentUserId() !== userId) throw new Error("A conta mudou. Tente novamente.");
        await claimCloudOwner(userId);
      }
      await assertCloudAccount(userId, FirebaseService.currentUserId);
      const [cloudQuestions, cloudHistory] = await Promise.all([
        FirebaseService.loadUserQuestions(userId), FirebaseService.loadUserHistory(userId),
      ]);
      if (FirebaseService.currentUserId() !== userId) throw new Error("A conta mudou. Tente novamente.");
      await StorageService.mergeCloudStudyData(cloudQuestions, cloudHistory, () => assertCloudAccount(userId, FirebaseService.currentUserId));
      onRefreshAllData();
      const allQs = StorageService.getQuestions();
      const cloudIds = new Set(cloudQuestions.map((q) => q.id));
      await FirebaseService.syncQuestionsBatch(userId, allQs.filter((q) => !cloudIds.has(q.id)));
      await FirebaseService.syncHistoryBatch(userId, StorageService.getAnswerHistory());
      await FirebaseService.saveUserSettings(userId, settings);
      await assertCloudAccount(userId, FirebaseService.currentUserId);
      showFeedback(`Sincronização concluída: ${allQs.length} questões e ${StorageService.getAnswerHistory().length} respostas. Repita no outro dispositivo.`);
    } catch (err) {
      showFeedback(err instanceof Error ? `Sincronização não concluída: ${err.message}` : "Sincronização não concluída. Tente novamente com internet.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    try {
      const backupJson = StorageService.exportFullBackupJson();
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memora_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showFeedback("Backup completo exportado com sucesso!");
    } catch {
      showFeedback("Erro ao exportar dados.", "error");
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await StorageService.importFullBackupJSON(text);
        if (result.success) {
          onRefreshAllData();
          showFeedback("Backup restaurado com sucesso! Dados sincronizados.");
        } else {
          showFeedback(result.message, "error");
        }
      } catch {
        showFeedback("Falha ao processar arquivo de backup.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Reset to Factory Seed
  const handleResetToDefaults = async () => {
    if (
      confirm(
        "Atenção: Deseja redefinir os dados para as questões e configurações iniciais padrão? Seus registros atuais serão substituídos."
      )
    ) {
      try {
        await StorageService.resetToDefaults();
        onRefreshAllData();
        showFeedback("Banco restaurado e salvo com os dados iniciais padrão.");
      } catch {
        showFeedback("Falha ao salvar a restauração. Seus dados anteriores foram preservados.", "error");
      }
    }
  };

  // Volume / Stress Test (1,000 Questions)
  const handleGenerateVolumeTest = () => {
    const count = 1000;
    const added = StorageService.generateStressTestQuestions(count);
    onRefreshAllData();
    showFeedback(
      `Teste de volume concluído: ${added} questões geradas! O sistema continua ultrarrápido com paginação de alto desempenho.`
    );
  };

  // Handle Logo Upload (File to Data URL & Server persistence)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showFeedback("A imagem do logotipo deve ter menos de 8MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateSettings({ customLogoUrl: dataUrl });
      showFeedback("Logo personalizado aplicado às suas configurações.");


    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    onUpdateSettings({
      customLogoUrl: undefined,
      customBrandName: undefined,
      customSlogan: undefined,
    });
    showFeedback("Identidade visual restaurada para o padrão MEMORA+.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>Configurações & Gestão de Dados</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Preferências de estudo, identidade visual, backups locais, teste de desempenho e arquitetura comercial
        </p>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/30 border border-rose-300 text-rose-800 dark:text-rose-200"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 0. Custom Logo & Visual Identity */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Identidade Visual & Logotipo Personalizado
              </h2>
              <p className="text-xs text-slate-500">
                Personalize o MEMORA+ com o logotipo e nome da sua instituição, cursinho ou marca própria
              </p>
            </div>
          </div>

          {(settings.customLogoUrl || settings.customBrandName) && (
            <button
              onClick={handleResetLogo}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>
          )}
        </div>

        {/* Official Brand Asset Card */}
        <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-900 border-2 border-amber-500/50 p-0.5 shrink-0 shadow-md">
              <img
                src="/logo-round.png"
                alt="Medalhão Oficial MEMORA+"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Emblema Oficial MEMORA+</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-700 dark:text-teal-300">
                  Ativo no App & PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mnemosyne com fones, coruja de Atena, sol dourado e tablet com sinapses. Cores calibradas na paleta Teal/Slate do app.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/logo-official.png"
              download="memora-logo-1024.png"
              className="px-3 py-1.5 rounded-lg border border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Baixar em Alta Resolução (1024x1024 PNG)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar HD (1024px)</span>
            </a>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pré-visualização do Topo / Barra de Navegação:
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 inline-flex items-center">
              <MemoraBrandLogo
                size={36}
                showSlogan={true}
                customLogoUrl={settings.customLogoUrl}
                customBrandName={settings.customBrandName}
                customSlogan={settings.customSlogan}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
              <Upload className="w-4 h-4" />
              <span>Fazer Upload do Logotipo (PNG / SVG / JPG)</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Name and Slogan Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Marca / Instituição:
            </label>
            <input
              type="text"
              value={settings.customBrandName || ""}
              onChange={(e) => onUpdateSettings({ customBrandName: e.target.value })}
              placeholder="Padrão: MEMORA+"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Slogan Personalizado:
            </label>
            <input
              type="text"
              value={settings.customSlogan || ""}
              onChange={(e) => onUpdateSettings({ customSlogan: e.target.value })}
              placeholder="Padrão: Aprenda. Revise. Memorize."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Cloud & Multi-User Authentication Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Autenticação & Banco de Dados em Nuvem (Firebase)
            </h2>
          </div>
          {currentUser ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-300/60 dark:border-emerald-500/40">
              <CloudCheck className="w-3.5 h-3.5" />
              Conta conectada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-300/60 dark:border-amber-500/40">
              Modo Local (Offline)
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Sincronize manualmente com a mesma conta nos seus aparelhos. Na primeira sincronização, confirme a conta que ficará vinculada aos dados deste navegador. Sair da conta mantém seus dados locais; use um perfil de navegador separado para outra pessoa.
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {currentUser ? (
              currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "Usuário"}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-teal-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                  {currentUser.displayName ? currentUser.displayName[0] : currentUser.email ? currentUser.email[0] : "U"}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                <LogIn className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentUser ? (currentUser.displayName || "Estudante Conectado") : "Nenhum usuário logado"}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentUser ? currentUser.email : "Crie uma conta gratuita ou faça login para manter seus dados seguros na nuvem."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Sincronizando..." : "Sincronizar Agora"}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar ou Criar Conta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. Study & Interface Preferences (Requirement 23) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Preferências de Estudo & Acessibilidade
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Daily Goal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Meta Diária de Questões
            </label>
            <div className="flex gap-2">
              {[10, 20, 30, 50, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => onUpdateSettings({ dailyGoalTarget: num })}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                    settings.dailyGoalTarget === num
                      ? "bg-amber-500 text-slate-950 border-amber-500"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Aparência do Tema
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ theme: "light" })}
                className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 ${
                  settings.theme === "light"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Modo Claro</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ theme: "dark" })}
                className={`py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 ${
                  settings.theme === "dark"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Modo Escuro</span>
              </button>
            </div>
          </div>

          {/* Default Question Time Limit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tempo Padrão por Questão (Modo Desafio)
            </label>
            <div className="flex gap-2">
              {[30, 45, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onUpdateSettings({ defaultTimeLimitSeconds: sec })}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                    settings.defaultTimeLimitSeconds === sec
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Accessibility */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tamanho do Texto (Legibilidade)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => onUpdateSettings({ fontSize: sz })}
                  className={`py-2 text-xs font-bold rounded-xl border capitalize ${
                    settings.fontSize === sz
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {sz === "small" ? "Padrão" : sz === "medium" ? "Médio" : "Grande"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Backup & Data Management (Requirement 25) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Backup, Restauração & Teste de Volume
        </h2>
        <p className="text-xs text-slate-500">
          Seus dados são 100% offline-first. Você pode salvar uma cópia integral do seu progresso em arquivo JSON ou restaurá-la a qualquer momento em outro dispositivo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Export Backup */}
          <button
            onClick={handleExportBackup}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-left transition-colors bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                <Download className="w-4 h-4 text-teal-600" />
                <span>Exportar Backup (JSON)</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Baixar todas as questões, histórico, favoritos e sessões.
              </div>
            </div>
            <div className="text-[11px] font-semibold text-teal-600 mt-3">
              Exportar Arquivo →
            </div>
          </button>

          {/* Import Backup */}
          <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-colors bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between cursor-pointer">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Restaurar Backup (JSON)</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Subir arquivo .json salvo anteriormente para recuperar seu estado.
              </div>
            </div>
            <div className="text-[11px] font-semibold text-indigo-600 mt-3">
              Selecionar Arquivo →
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          {/* Reset to Factory Defaults */}
          <button
            onClick={handleResetToDefaults}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 text-left transition-colors bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Restaurar Padrão de Fábrica</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Recarregar as questões iniciais originais e zerar histórico.
              </div>
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-3">
              Redefinir Dados →
            </div>
          </button>
        </div>

        {/* Volume & Scale Stress-Test Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Teste de Performance & Volume (1.000 Questões)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Banco atual: {questionsCount} questões. Valide a estabilidade sem travamentos.
            </div>
          </div>

          <button
            onClick={handleGenerateVolumeTest}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400 font-bold text-xs transition-colors shrink-0"
          >
            Gerar 1.000 Questões de Teste
          </button>
        </div>
      </div>

      {/* 2.5 Storage Health, Quota & Integrity Monitoring (Fase 4C) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Armazenamento & Integridade dos Dados
              </h2>
              <p className="text-xs text-slate-500">
                Monitoramento transparente de quota do navegador, persistência IndexedDB durável e diagnóstico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {storageHealth && (
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                  storageHealth.status === "HEALTHY"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : storageHealth.status === "WARNING"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    : storageHealth.status === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                    : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    storageHealth.status === "HEALTHY"
                      ? "bg-emerald-500"
                      : storageHealth.status === "WARNING"
                      ? "bg-amber-500"
                      : storageHealth.status === "CRITICAL"
                      ? "bg-rose-500"
                      : "bg-slate-400"
                  }`}
                />
                <span>
                  {storageHealth.status === "HEALTHY"
                    ? "Saudável"
                    : storageHealth.status === "WARNING"
                    ? "Atenção de Quota"
                    : storageHealth.status === "CRITICAL"
                    ? "Quota Crítica"
                    : "Padrão"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Quota warning/critical banner */}
        {storageHealth && storageHealth.status === "WARNING" && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Aviso preventivo de capacidade:</div>
              <div className="text-[11px] mt-0.5">
                O espaço utilizado pelo MEMORA+ atingiu {storageHealth.usagePercentage?.toFixed(2)}%. Recomendamos gerar e baixar um backup JSON dos seus dados.
              </div>
            </div>
          </div>
        )}

        {storageHealth && storageHealth.status === "CRITICAL" && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Alerta Crítico de Armazenamento:</div>
              <div className="text-[11px] mt-0.5">
                O uso de disco alcançou {storageHealth.usagePercentage?.toFixed(2)}% do limite estimado. Novas gravações podem falhar se o navegador não disponibilizar espaço adicional.
              </div>
            </div>
          </div>
        )}

        {/* Quota Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* 1. Espaço Utilizado */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Espaço Utilizado</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {storageHealth?.usageBytes !== undefined ? formatBytes(storageHealth.usageBytes) : "N/D"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">IndexedDB + recursos locais</div>
          </div>

          {/* 2. Limite Estimado */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Disponível para o Site</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {storageHealth?.quotaBytes !== undefined ? formatBytes(storageHealth.quotaBytes) : "Sob demanda"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Estimado pelo navegador</div>
          </div>

          {/* 3. Percentual */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Percentual de Uso</div>
            <div className="text-base font-bold text-teal-600 dark:text-teal-400 mt-1">
              {storageHealth?.usagePercentage !== undefined ? `${storageHealth.usagePercentage?.toFixed(2)}%` : "Normal"}
            </div>
            {storageHealth?.usagePercentage !== undefined && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageHealth.usagePercentage >= 85
                      ? "bg-rose-500"
                      : storageHealth.usagePercentage >= 70
                      ? "bg-amber-500"
                      : "bg-teal-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, storageHealth.usagePercentage))}%` }}
                />
              </div>
            )}
          </div>

          {/* 4. Persistência Durável */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Persistência Durável</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  {storageHealth?.persistent
                    ? "Ativa (Protegido)"
                    : storageHealth?.persistenceStatus === "DENIED"
                    ? "Padrão (Volátil sob pressão)"
                    : "Padrão"}
                </span>
              </div>
            </div>
            {!storageHealth?.persistent && storageHealth?.persistenceStatus !== "UNSUPPORTED" && (
              <button
                onClick={handleRequestPersistence}
                disabled={isRequestingPersistence}
                className="mt-2 text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 text-left transition-colors cursor-pointer"
              >
                {isRequestingPersistence ? "Solicitando..." : "Solicitar Proteção Durável →"}
              </button>
            )}
          </div>
        </div>

        {/* Informações de Snapshot e Ações de Integridade */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Fonte autoritativa:</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">IndexedDB (memora_plus_db v1)</span>
              <span className="text-slate-400">|</span>
              <span>Snapshot legado no localStorage preservado para recuperação.</span>
            </div>
            {storageHealth?.lastCheck && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                Última inspeção: {new Date(storageHealth.lastCheck).toLocaleTimeString("pt-BR")}
              </div>
            )}
          </div>

          <button
            onClick={handleRunIntegrityCheck}
            disabled={isCheckingIntegrity}
            className="px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-400 font-bold text-xs transition-colors shrink-0 inline-flex items-center gap-2 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{isCheckingIntegrity ? "Inspecionando banco..." : "Verificar Integridade dos Dados"}</span>
          </button>
        </div>

        {/* Relatório detalhado do Integrity Check se executado */}
        {integrityReport && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                {integrityReport.overall === "PASS" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span>Resultado do Diagnóstico: {integrityReport.overall === "PASS" ? "Aprovado nas verificações realizadas" : "Atenção"}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(integrityReport.timestamp).toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500">Questões:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{integrityReport.questionsCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500">Histórico de Respostas:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{integrityReport.historyCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500">Sessões Concluídas:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{integrityReport.sessionsCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500">Integridade Referencial:</span>
                <div className={`font-bold ${integrityReport.orphanHistoryCount === 0 ? "text-emerald-600" : "text-amber-500"}`}>
                  {integrityReport.orphanHistoryCount === 0 ? "100% Válida" : `${integrityReport.orphanHistoryCount} órfão(s)`}
                </div>
              </div>
            </div>

            {integrityReport.anomalies.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-bold">Observações identificadas:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {integrityReport.anomalies.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Mobile Packaging & APK Generation Guide */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-teal-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Como Usar no Celular e Gerar Arquivo APK
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Você pode usar o MEMORA+ fora do computador como um aplicativo de celular comum. Existem 2 formas práticas e profissionais:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Option A: PWA Instant Install */}
          <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-teal-700 dark:text-teal-300">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">A</span>
              <span>Instalação Imediata (PWA - Sem Compilar)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              O MEMORA+ já possui suporte completo a <strong>Progressive Web App (PWA)</strong>. No seu celular Android:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>Abra o link do aplicativo no Google Chrome do celular.</li>
              <li>Toque no menu de 3 pontinhos (<code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">⋮</code>) no topo direito.</li>
              <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
            </ol>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-800 dark:text-teal-200 text-[11px] font-medium">
              ✓ O app abre em tela cheia (sem barra de URL), com ícone na gaveta de aplicativos e funciona mesmo sem internet!
            </div>
            <div className="pt-1">
              <PWAInstallButton variant="compact" />
            </div>
          </div>

          {/* Option B: Native APK via Capacitor */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">B</span>
              <span>Gerar Arquivo APK Nativo (Capacitor / Android Studio)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Para gerar um arquivo instalável <strong>.apk</strong> ou <strong>.aab</strong> para a Google Play Store:
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1 overflow-x-auto">
              <div># 1. Instalar o Capacitor</div>
              <div className="text-teal-400">npm install @capacitor/core @capacitor/cli @capacitor/android</div>
              <div># 2. Inicializar o projeto Android</div>
              <div className="text-teal-400">npx cap init "MEMORA+" "com.memora.app" --web-dir dist</div>
              <div># 3. Compilar e abrir no Android Studio</div>
              <div className="text-teal-400">npm run build && npx cap add android && npx cap open android</div>
            </div>
            <p className="text-[11px] text-slate-500">
              No Android Studio, clique em <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> para gerar seu arquivo <code className="text-indigo-600 font-bold">.apk</code>.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Commercial & Android Readiness Specifications */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Arquitetura Comercial & Prontidão Android (Kotlin / Compose)
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          O MEMORA+ foi concebido de acordo com as melhores práticas de Clean Architecture e Domain-Driven Design (DDD) para viabilizar migração imediata para o ecossistema nativo Android (Kotlin + Jetpack Compose + Room Database):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              1. Entidades & Room DB
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Modelos de dados (Question, MemoryState, AnswerRecord) mapeados 1:1 com @Entity e DAOs do Android Room.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-teal-600 dark:text-teal-400">
              2. Algoritmo SM-2 Puro
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Lógica de repetição espaçada desacoplada de UI, permitindo compilação nativa em Kotlin Multiplatform (KMP).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-amber-600 dark:text-amber-400">
              3. Segurança & IA Server-Side
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Chaves de API protegidas em backend Express com proxy REST / gRPC compatível com Retrofit / Ktor Client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
