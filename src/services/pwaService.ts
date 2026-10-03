export interface PwaDiagnosticInfo {
  supported: boolean;
  secureContext: boolean;
  registered: boolean;
  active: boolean;
  controlling: boolean;
  scope: string;
  cacheNames: string[];
  cachedFilesCount: number;
  online: boolean;
  registrationState: "installing" | "waiting" | "active" | "none";
  error?: string;
}

let registrationInstance: ServiceWorkerRegistration | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let lastRegistrationError: string | null = null;

export function isSecureContextSafe(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    window.location.protocol === "https:"
  );
}

/**
 * Registers the Service Worker securely and safely without duplicates.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[MEMORA+ PWA] Service Worker não é suportado neste navegador.");
    return null;
  }

  if (!isSecureContextSafe()) {
    console.warn("[MEMORA+ PWA] Service Worker requer contexto seguro (HTTPS ou localhost).");
    lastRegistrationError = "Contexto inseguro (requer HTTPS ou localhost)";
    return null;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      // Check existing registrations to prevent duplicate registration
      const existing = await navigator.serviceWorker.getRegistration("/");
      if (existing && existing.active) {
        registrationInstance = existing;
        console.log("[MEMORA+ PWA] Service Worker existente reutilizado no escopo:", existing.scope);
      }

      // Register /sw.js with explicit scope '/'
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registrationInstance = reg;
      console.log("[MEMORA+ PWA] Service Worker registrado com sucesso:", reg.scope);

      // Check if already active
      if (reg.active) {
        console.log("[MEMORA+ PWA] Service Worker já está ativo.");
      }

      // Listen for updates and state changes
      reg.addEventListener("updatefound", () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.addEventListener("statechange", () => {
            console.log("[MEMORA+ PWA] Mudança de estado do SW:", installingWorker.state);
            if (installingWorker.state === "activated") {
              console.log("[MEMORA+ PWA] Service Worker foi ativado com sucesso!");
            }
          });
        }
      });

      return reg;
    } catch (err: any) {
      lastRegistrationError = err?.message || String(err);
      console.warn("[MEMORA+ PWA] Falha ao registrar Service Worker:", err);
      return null;
    }
  })();

  return registrationPromise;
}

/**
 * Gathers complete diagnostic information about PWA readiness and Cache Storage.
 */
export async function getPwaDiagnosticInfo(): Promise<PwaDiagnosticInfo> {
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator;
  const secure = isSecureContextSafe();
  const online = typeof navigator !== "undefined" ? navigator.onLine : false;

  let registered = false;
  let active = false;
  let controlling = false;
  let scope = "N/A";
  let registrationState: "installing" | "waiting" | "active" | "none" = "none";
  let cacheNames: string[] = [];
  let cachedFilesCount = 0;

  if (supported) {
    try {
      controlling = Boolean(navigator.serviceWorker.controller);
      const reg = registrationInstance || (await navigator.serviceWorker.getRegistration("/"));
      if (reg) {
        registered = true;
        scope = reg.scope;
        if (reg.active) {
          registrationState = "active";
          active = true;
        } else if (reg.installing) {
          registrationState = "installing";
        } else if (reg.waiting) {
          registrationState = "waiting";
        }
      }
    } catch (e: any) {
      console.error("[MEMORA+ PWA Diagnostic] Erro ao inspecionar registration:", e);
    }

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        cacheNames = await window.caches.keys();
        for (const name of cacheNames) {
          const cache = await window.caches.open(name);
          const keys = await cache.keys();
          cachedFilesCount += keys.length;
        }
      } catch (e: any) {
        console.error("[MEMORA+ PWA Diagnostic] Erro ao inspecionar caches:", e);
      }
    }
  }

  return {
    supported,
    secureContext: secure,
    registered,
    active,
    controlling,
    scope,
    cacheNames,
    cachedFilesCount,
    online,
    registrationState,
    error: lastRegistrationError || undefined,
  };
}
