import React from "react";
import { MemoraBrandLogo } from "../branding/MnemosyneLogo";
import { DailyGoalProgress, UserSettings } from "../../types";
import {
  Sun,
  Moon,
  Flame,
  Clock,
  Sparkles,
  RotateCcw,
  PlusCircle,
  Menu,
  Cloud,
  CloudCheck,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { PWAInstallButton } from "../pwa/PWAInstallButton";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  dailyGoal: DailyGoalProgress;
  reviewCount: number;
  settings: UserSettings;
  onToggleTheme: () => void;
  onOpenAddQuestion: () => void;
  onToggleMobileMenu: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  dailyGoal,
  reviewCount,
  settings,
  onToggleTheme,
  onOpenAddQuestion,
  onToggleMobileMenu,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const goalPercent = Math.min(
    100,
    Math.round((dailyGoal.completed / Math.max(1, dailyGoal.target)) * 100)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="size-[44px] shrink-0 flex items-center justify-center -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate("dashboard")}
            className="min-w-0 overflow-hidden flex items-center text-left focus:outline-hidden"
            aria-label="Ir para o início"
          >
            <MemoraBrandLogo
              size={34}
              imageSize={48}
              preserveImage={!settings.customLogoUrl}
              showSlogan={false}
              customLogoUrl={settings.customLogoUrl || "/branding/memora-logo-marcelo.jpg"}
              customBrandName={settings.customBrandName}
            />
          </button>
        </div>

        {/* Center: Daily Goal Pill & Spaced Review notification */}
        <div className="hidden xl:flex shrink-0 items-center gap-3">
          {/* Daily Goal Mini Pill */}
          <button
            onClick={() => onNavigate("metas")}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-teal-500/40 transition-colors"
            title="Sua Meta Diária de Hoje"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <div className="flex items-baseline gap-1 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {dailyGoal.completed}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">
                {dailyGoal.target}
              </span>
            </div>
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-teal-500 to-amber-500 transition-all duration-300"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              {goalPercent}%
            </span>
          </button>

          {/* Pending Reviews Pill */}
          {reviewCount > 0 && (
            <button
              onClick={() => onNavigate("revisao")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/40 hover:bg-amber-500/20 transition-colors text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{reviewCount} revisões hoje</span>
            </button>
          )}
        </div>

        {/* Right Actions: AI Generate, Add Question, Theme Toggle */}
        <div className="flex w-full sm:w-auto shrink-0 items-center justify-end gap-2 [&>button]:shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton className="h-[44px] min-w-[44px] justify-center sm:h-auto" />

          {/* Quick AI Question Generator */}
          <button
            onClick={() => onNavigate("ia")}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 border border-teal-300/60 dark:border-teal-500/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Criar com IA</span>
          </button>

          {/* Add Question Button */}
          <button
            onClick={onOpenAddQuestion}
            aria-label="Nova Questão"
            className="h-[44px] min-w-[44px] sm:h-auto justify-center flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Questão</span>
          </button>

          {/* Cloud Sync & Auth Profile */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/30 text-[11px] font-semibold"
                title="Sincronização com Cloud Firestore Ativa"
              >
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Nuvem Ativa</span>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "Usuário"}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold uppercase">
                    {currentUser.displayName ? currentUser.displayName[0] : currentUser.email ? currentUser.email[0] : "U"}
                  </div>
                )}
                <span className="hidden xl:inline text-xs font-medium text-slate-700 dark:text-slate-300 pr-1 truncate max-w-[90px]">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              aria-label="Entrar / Cadastrar"
              className="h-[44px] min-w-[44px] sm:h-auto justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-300/60 dark:border-teal-700/60 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden md:inline whitespace-nowrap">Entrar / Cadastrar</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="size-[44px] sm:size-auto flex items-center justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Alternar Tema"
          >
            {settings.theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
