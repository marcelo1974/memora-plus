import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  LogIn,
  UserPlus,
  Sparkles,
  CloudCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { FirebaseService } from "../../services/firebase";
import { MemoraBrandLogo } from "../branding/MnemosyneLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customBrandName?: string;
  customLogoUrl?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customBrandName,
  customLogoUrl,
}) => {
  const [mode, setMode] = useState<"LOGIN" | "SIGNUP" | "FORGOT">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "LOGIN") {
        await FirebaseService.loginWithEmail(email, password);
        onSuccess?.();
        onClose();
      } else if (mode === "SIGNUP") {
        if (!password || password.length < 6) {
          throw new Error("A senha deve conter no mínimo 6 caracteres.");
        }
        await FirebaseService.registerWithEmail(email, password, displayName);
        onSuccess?.();
        onClose();
      } else if (mode === "FORGOT") {
        await FirebaseService.sendPasswordReset(email);
        setSuccessMsg("E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = "Ocorreu um erro ao processar. Tente novamente.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        message = "E-mail ou senha incorretos.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
      } else if (err.code === "auth/weak-password") {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        message = "Formato de e-mail inválido.";
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await FirebaseService.loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMsg("Não foi possível autenticar com o Google. Tente com e-mail e senha.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MemoraBrandLogo
              size={30}
              showSlogan={false}
              customBrandName={customBrandName}
              customLogoUrl={customLogoUrl}
            />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === "LOGIN" && "Entrar na sua Conta MEMORA+"}
              {mode === "SIGNUP" && "Criar Conta & Sincronizar na Nuvem"}
              {mode === "FORGOT" && "Recuperar Senha"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === "LOGIN" && "Acesse suas questões, simulados e revisões de qualquer dispositivo"}
              {mode === "SIGNUP" && "Seus estudos e repetições espaçadas salvos com segurança no Firebase"}
              {mode === "FORGOT" && "Digite seu e-mail para receber as instruções de recuperação"}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          {mode !== "FORGOT" && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com o Google</span>
            </button>
          )}

          {mode !== "FORGOT" && (
            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute bg-white dark:bg-[#111827] px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ou com e-mail
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-3">
            {mode === "SIGNUP" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Seu Nome ou Apelido:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {mode !== "FORGOT" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Senha:
                  </label>
                  {mode === "LOGIN" && (
                    <button
                      type="button"
                      onClick={() => setMode("FORGOT")}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : mode === "LOGIN" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              ) : mode === "SIGNUP" ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Minha Conta</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Enviar E-mail de Recuperação</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Modes */}
          <div className="pt-2 text-center text-xs text-slate-500">
            {mode === "LOGIN" ? (
              <p>
                Não tem uma conta?{" "}
                <button
                  onClick={() => setMode("SIGNUP")}
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Cadastre-se grátis
                </button>
              </p>
            ) : (
              <p>
                Já possui conta?{" "}
                <button
                  onClick={() => setMode("LOGIN")}
                  className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
