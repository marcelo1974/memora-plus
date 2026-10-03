import React, { useState } from "react";
import {
  Smartphone,
  Download,
  Share2,
  MoreVertical,
  CheckCircle2,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"ANDROID" | "IOS" | "DESKTOP">(
    isIOS ? "IOS" : "ANDROID"
  );

  if (!isOpen) return null;

  // The actual URL of the published/accessible app
  const appUrl = window.location.href.split("?")[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Instalar MEMORA+ no Celular
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-700 dark:text-teal-300">
                  PWA 1-Min
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sem passar pela Play Store • Abre em tela cheia • Funciona offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 text-xs">
          {/* Quick Install Action if Chrome Native prompt is ready */}
          {isInstallable && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-teal-900 dark:text-teal-200 text-sm">
                  Pronto para instalação direta!
                </div>
                <div className="text-[11px] text-teal-700 dark:text-teal-400">
                  Seu navegador suporta instalação com apenas 1 toque.
                </div>
              </div>
              <button
                onClick={handleTriggerInstall}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora</span>
              </button>
            </div>
          )}

          {/* Already installed banner */}
          {isInstalled && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>O MEMORA+ já está instalado neste dispositivo!</span>
            </div>
          )}

          {/* Platform Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedPlatform("ANDROID")}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                selectedPlatform === "ANDROID"
                  ? "bg-white dark:bg-[#111827] text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>Android (Chrome)</span>
            </button>
            <button
              onClick={() => setSelectedPlatform("IOS")}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                selectedPlatform === "IOS"
                  ? "bg-white dark:bg-[#111827] text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>iPhone / iPad (Safari)</span>
            </button>
            <button
              onClick={() => setSelectedPlatform("DESKTOP")}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                selectedPlatform === "DESKTOP"
                  ? "bg-white dark:bg-[#111827] text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>Computador (Chrome/Edge)</span>
            </button>
          </div>

          {/* Step-by-Step for selected platform */}
          {selectedPlatform === "ANDROID" && (
            <div className="space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Passo a passo no Android (Google Chrome):</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Abra no Chrome do Celular</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Copie o link abaixo e cole na barra de navegação do Chrome no celular.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      Toque nos 3 Pontinhos (<MoreVertical className="w-3.5 h-3.5 inline text-slate-600 dark:text-slate-300" />)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fica no canto superior direito do navegador Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      O ícone do <strong>MEMORA+</strong> será adicionado à sua gaveta de aplicativos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedPlatform === "IOS" && (
            <div className="space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Passo a passo no iOS (Apple Safari):</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Abra no Safari</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No iPhone ou iPad, abra o link no navegador nativo <strong>Safari</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Toque no Botão de Compartilhar (<Share2 className="w-3.5 h-3.5 inline text-blue-500" />)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Localizado na barra de ferramentas inferior do Safari no iPhone.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Selecione "Adicionar à Tela de Início"
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Confirme o nome <strong>MEMORA+</strong> e toque em "Adicionar" no topo direito.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedPlatform === "DESKTOP" && (
            <div className="space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Instalar como App no Computador (Windows / Mac / Linux):</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Ícone de Instalação na Barra de Endereço</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No Google Chrome ou Microsoft Edge, localize o ícone de computador com uma seta (<Download className="w-3.5 h-3.5 inline text-teal-600" />) na barra de URL (à direita).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Clique em "Instalar"</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      O MEMORA+ abrirá como uma janela de aplicativo dedicada e terá atalho na sua Área de Trabalho e menu Iniciar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Link copy section */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Link do App para Abrir no Celular:
              </span>
              <button
                onClick={handleCopyLink}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar Link"}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all">
              {appUrl}
            </div>
          </div>

          {/* Advantages of PWA */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Sem downloads pesados</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Atualização automática</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
