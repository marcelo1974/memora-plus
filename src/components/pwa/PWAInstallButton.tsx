import React, { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";
import { PWAInstallModal } from "./PWAInstallModal";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "header" | "compact" | "banner";
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = "",
  variant = "header",
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running standalone inside mobile or desktop, hide or show minimal installed badge
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleClick}
          title="Instalar MEMORA+ no Celular (PWA)"
          className={`px-2.5 py-1.5 rounded-lg border border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-600" />
          <span>Instalar App</span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === "banner") {
    return (
      <>
        <div
          className={`p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Instalar MEMORA+ no Celular</span>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-black uppercase">
                  PWA
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                Acesse instantaneamente sem precisar passar por lojas de aplicativos. Funciona offline!
              </p>
            </div>
          </div>

          <button
            onClick={handleClick}
            className="px-4 py-2.5 rounded-xl bg-white text-teal-800 hover:bg-teal-50 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Instalar no Celular</span>
          </button>
        </div>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Default Header variant
  return (
    <>
      <button
        onClick={handleClick}
        title="Instalar MEMORA+ no Celular (PWA)"
        className={`px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
