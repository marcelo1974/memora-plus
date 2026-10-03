import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileCheck,
  RotateCcw,
  Database,
  BarChart3,
  BrainCircuit,
  Settings,
  Sparkles,
  Bookmark,
  AlertCircle,
  X,
  FileQuestion,
  BookMarked,
  Target,
} from "lucide-react";
import { MemoraBrandLogo } from "../branding/MnemosyneLogo";
import { UserSettings } from "../../types";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  reviewCount: number;
  errorCount: number;
  favoritesCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  settings?: UserSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  reviewCount,
  errorCount,
  favoritesCount,
  isMobileOpen,
  onCloseMobile,
  settings,
}) => {
  const menuItems = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "metas", label: "Metas de Estudo", icon: Target },
    { id: "estudar", label: "Estudar", icon: BookOpen, badge: "Modos" },
    { id: "quiz", label: "Quiz Rápido", icon: HelpCircle },
    { id: "simulado", label: "Simulado", icon: FileCheck },
    {
      id: "revisao",
      label: "Revisão",
      icon: RotateCcw,
      count: reviewCount,
      countColor: "bg-amber-500 text-white",
    },
    { id: "banco", label: "Banco de Questões", icon: Database },
    { id: "memoria", label: "Minha Memória", icon: BrainCircuit, badge: "Mapa" },
    { id: "estatisticas", label: "Estatísticas", icon: BarChart3 },
    { id: "ia", label: "IA Memora+", icon: Sparkles, badge: "Gemini" },
    {
      id: "favoritos",
      label: "Favoritos",
      icon: Bookmark,
      count: favoritesCount > 0 ? favoritesCount : undefined,
    },
    {
      id: "erradas",
      label: "Questões Erradas",
      icon: AlertCircle,
      count: errorCount > 0 ? errorCount : undefined,
      countColor: "bg-rose-500 text-white",
    },
    { id: "manual", label: "Manual de Uso", icon: BookMarked, badge: "Guia" },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0E1322] border-r border-slate-200/80 dark:border-slate-800/80 w-64 select-none">
      {/* Mobile Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-800/60 lg:hidden">
        <MemoraBrandLogo
          size={32}
          showSlogan={false}
          customLogoUrl={settings?.customLogoUrl}
          customBrandName={settings?.customBrandName}
        />
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Slogan pill in desktop */}
      <div className="hidden lg:block px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navegação Principal
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge && !isActive && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/25 text-white"
                        : item.countColor || "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Philosophy Card */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Ciclo Mnemosyne
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          Questões → Erros & Acertos → Repetição Espaçada → Retenção.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full shadow-2xl z-50">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
