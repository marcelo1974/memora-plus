import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Database, Terminal, ShieldAlert } from "lucide-react";
import { StorageService } from "../../services/storageService";
import { getPwaDiagnosticInfo, PwaDiagnosticInfo } from "../../services/pwaService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showTechnicalDetails: boolean;
  pwaInfo: PwaDiagnosticInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showTechnicalDetails: false,
    pwaInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showTechnicalDetails: false,
      pwaInfo: null,
    };
  }

  public componentDidMount() {
    getPwaDiagnosticInfo()
      .then((info) => this.setState({ pwaInfo: info }))
      .catch(() => {});
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MEMORA+ ErrorBoundary] Erro capturado:", error, errorInfo);
    this.setState({ errorInfo });
    getPwaDiagnosticInfo()
      .then((info) => this.setState({ pwaInfo: info }))
      .catch(() => {});
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleResetLocal = async () => {
    if (window.confirm("Deseja restaurar as questões padrão do MEMORA+? Suas estatísticas locais serão reiniciadas.")) {
      try {
        const result = await StorageService.initializeStorage();
        if (!result.success) throw new Error(result.message);
        await StorageService.resetToDefaults();
        window.location.reload();
      } catch {
        window.alert("Não foi possível salvar a restauração. Os dados anteriores foram preservados.");
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      const storageHealth = StorageService.checkStorageHealth();
      const pwa = this.state.pwaInfo;
      const technicalDetails = [
        `Erro: ${this.state.error?.name || "Error"}: ${this.state.error?.message || "Erro desconhecido"}`,
        `Data/Hora: ${new Date().toISOString()}`,
        `Plataforma: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
        `Conexão: ${typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline"}`,
        `Service Worker: ${pwa ? `Suportado: ${pwa.supported} | Registrado: ${pwa.registered} | Ativo: ${pwa.active} | Controlando: ${pwa.controlling}` : "Inspecionando..."}`,
        `Cache Storage: ${pwa ? `${pwa.cacheNames.length} caches (${pwa.cachedFilesCount} arquivos no precache)` : "N/A"}`,
        `Armazenamento: ${storageHealth.type} (${storageHealth.available ? "Disponível" : "Inacessível"})`,
        `Component Stack: ${this.state.errorInfo?.componentStack || "N/A"}`,
      ].join("\n");

      return (
        <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Recuperação do MEMORA+
                </h1>
                <p className="text-xs text-amber-300/80">
                  Proteção de inicialização ativa
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Ocorreu uma instabilidade na interface ao carregar no seu dispositivo. Seus dados de estudo estão preservados e protegidos.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar novamente</span>
              </button>

              <button
                onClick={this.handleResetLocal}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Restaurar banco local padrão</span>
              </button>
            </div>

            {/* Expandable Technical Diagnostics */}
            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => this.setState({ showTechnicalDetails: !this.state.showTechnicalDetails })}
                className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  Registro técnico para diagnóstico
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {this.state.showTechnicalDetails ? "Ocultar ▲" : "Exibir ▼"}
                </span>
              </button>

              {this.state.showTechnicalDetails && (
                <div className="mt-2 p-3 bg-black/60 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 overflow-x-auto max-h-48 whitespace-pre-wrap select-all">
                  {technicalDetails}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
