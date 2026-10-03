import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { AlertCircle, RefreshCw, ArrowRight, Terminal } from "lucide-react";
import { StorageService } from "../../services/storageService";
import { getPwaDiagnosticInfo, PwaDiagnosticInfo } from "../../services/pwaService";

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
  initializationError?: Error | null;
  initializationReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 5000,
  initializationError = null,
  initializationReady = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);
  const [videoUnavailable, setVideoUnavailable] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [stage, setStage] = useState<number>(0);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [offlineReady, setOfflineReady] = useState<boolean>(false);
  const [pwaInfo, setPwaInfo] = useState<PwaDiagnosticInfo | null>(null);

  // Load PWA diagnostics
  useEffect(() => {
    getPwaDiagnosticInfo().then(setPwaInfo).catch(() => {});
  }, []);

  // Keep a stable ref to onComplete to avoid resetting timeouts on parent re-renders
  const onCompleteRef = useRef(onComplete);
  const readyRef = useRef(initializationReady);
  readyRef.current = initializationReady;
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Primary animation and auto-transition
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 250);
    const t2 = setTimeout(() => setStage(2), 800);
    const t3 = setTimeout(() => {
      setStage(3);
      setOfflineReady(readyRef.current);
    }, 1500);

    // The video never delays entry beyond five seconds; data validation may.
    const tEnd = setTimeout(() => setAnimationFinished(true), Math.min(durationMs, 5000));
    const tWatchdog = setTimeout(() => {
      if (!readyRef.current) setTimedOut(true);
      setOfflineReady(readyRef.current);
    }, Math.min(durationMs, 5000) + 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tEnd);
      clearTimeout(tWatchdog);
    };
  }, [durationMs]);

  useEffect(() => {
    if (videoUnavailable) return;
    void videoRef.current?.play().catch(() => {
      setVideoUnavailable(true);
      setAnimationFinished(true);
    });
  }, [videoUnavailable]);

  useEffect(() => {
    if (animationFinished) videoRef.current?.pause();
    if (initializationReady && animationFinished && !initializationError && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, [initializationReady, animationFinished, initializationError]);

  const handleRetry = () => window.location.reload();
  const handleForceEnter = () => {
    if (initializationReady && !initializationError) setAnimationFinished(true);
  };

  // Diagnostic data for Android debugging
  const storageHealth = StorageService.checkStorageHealth();
  const diagnosticLog = [
    `Status: ${timedOut ? "Tempo limite de carregamento atingido (Watchdog acionado)" : "Inicialização"}${initializationError ? " com erro" : " normal"}`,
    `Conexão: ${typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline / Modo Local Ativo"}`,
    `Service Worker Suportado: ${pwaInfo ? (pwaInfo.supported ? "Sim" : "Não") : "Verificando..."}`,
    `Service Worker Registrado: ${pwaInfo ? (pwaInfo.registered ? "Sim" : "Não") : "Verificando..."}`,
    `Service Worker Ativo: ${pwaInfo ? (pwaInfo.active ? "Sim" : "Não") : "Verificando..."}`,
    `Controlando a Página: ${pwaInfo ? (pwaInfo.controlling ? "Sim" : "Não") : "Verificando..."}`,
    `Escopo do SW: ${pwaInfo ? pwaInfo.scope : "N/A"}`,
    `Cache Storage: ${pwaInfo ? `${pwaInfo.cacheNames.length} caches (${pwaInfo.cachedFilesCount} arquivos no precache)` : "Verificando..."}`,
    `Armazenamento Local: ${storageHealth.type} (${storageHealth.available ? "Operacional" : "Inacessível"})`,
    `Dispositivo: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
    `Hora local: ${new Date().toISOString()}`,
    `Detalhes do erro: ${initializationError ? initializationError.message : "Nenhum erro crítico; dados locais carregados"}`,
  ].join("\n");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center bg-radial from-slate-900 via-[#0B0F19] to-[#06080E] text-white p-6 select-none"
    >
      {/* Subtle classical architectural grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Floating subtle ambient glow */}
      <div className="absolute w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="relative flex flex-col items-center max-w-sm w-full text-center">
        <div className="relative mb-4 w-full aspect-video overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900 shadow-xl">
          {videoUnavailable ? (
            <img src="/branding/memora-logo-marcelo.jpg" alt="Logo personalizada MEMORA+" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              src="/branding/memora-intro.mp4"
              poster="/branding/memora-logo-marcelo.jpg"
              autoPlay
              muted
              playsInline
              preload="auto"
              aria-label="Animação de abertura MEMORA+"
              className="w-full h-full object-contain"
              onEnded={() => setAnimationFinished(true)}
              onError={() => { setVideoUnavailable(true); setAnimationFinished(true); }}
            />
          )}
        </div>

        <div role="progressbar" aria-label="Inicialização do MEMORA+" aria-valuetext={initializationReady ? "Dados prontos; preparando abertura" : "Preparando seus dados"} className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
          <motion.div
            className={`h-full bg-linear-to-r from-indigo-500 via-teal-400 to-amber-400 ${animationFinished && !initializationReady ? "animate-pulse" : ""}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: Math.min(durationMs, 5000) / 1000, ease: "easeInOut" }}
          />
        </div>
        {!initializationReady && <p className="text-xs text-slate-300 mb-3" role="status">Preparando seus dados…</p>}

        {/* Brand Name */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: stage >= 1 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-baseline justify-center gap-1 mb-2"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans">
            MEMORA
          </h1>
          <span className="text-3xl sm:text-4xl font-black text-amber-400 font-sans">
            +
          </span>
        </motion.div>

        {/* Slogan */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: stage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm font-medium tracking-wide text-teal-400/90 mb-5"
        >
          Aprenda. Revise. Memorize.
        </motion.p>

        {/* Friendly Error / Timeout Handling State */}
        {(timedOut || initializationError) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 mb-4 text-left shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Aviso de Inicialização</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {initializationError
                ? "Não foi possível abrir ou validar seus dados. O conteúdo original foi preservado. Consulte os detalhes e tente novamente."
                : "A preparação dos dados está demorando. Aguarde a validação antes de iniciar seus estudos."}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleForceEnter}
                disabled={!initializationReady || !!initializationError}
                className="w-full py-2.5 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <span>{initializationReady ? "Entrar no Dashboard Offline" : "Aguardando validação dos dados"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRetry}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>

            {/* Expandable Technical Diagnostics Log */}
            <div className="mt-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200"
              >
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-slate-400" />
                  Registro técnico do erro
                </span>
                <span className="font-mono text-[10px]">
                  {showDiagnostics ? "Ocultar ▲" : "Ver detalhes ▼"}
                </span>
              </button>

              {showDiagnostics && (
                <pre className="mt-2 p-2 bg-black/60 border border-slate-800/80 rounded text-[10px] font-mono text-slate-400 whitespace-pre-wrap select-all max-h-36 overflow-y-auto">
                  {diagnosticLog}
                </pre>
              )}
            </div>
          </motion.div>
        ) : (
          /* Normal Loading Progress */
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleForceEnter}
                disabled={!initializationReady || !!initializationError}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider py-1 px-3 rounded-full hover:bg-slate-800/60"
              >
                Pular Abertura
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-[11px] text-slate-500 tracking-wider">
        PLATAFORMA INTELIGENTE DE ESTUDOS & MEMORIZAÇÃO
      </div>
    </motion.div>
  );
};
