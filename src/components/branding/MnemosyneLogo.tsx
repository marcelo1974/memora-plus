import React from "react";

interface MnemosyneSymbolProps {
  size?: number;
  className?: string;
  animated?: boolean;
  variant?: "full" | "icon" | "monochrome";
}

/**
 * ORIGINAL MNEMOSYNE ICON & SYMBOL FOR MEMORA+
 * Conceptual integration:
 * - Circular loop: continuity & spaced repetition cycle
 * - Abstract female mythological profile: Mnemosyne (Memory & wisdom)
 * - Upper crown curve: subtle capital 'M' contour
 * - Inner synaptic nodes: cerebral connections & retained knowledge
 * - Lower contour: open pages of a book
 * - Amber glowing node (+): evolution, expansion & permanent cognitive mastery
 */
export const MnemosyneSymbol: React.FC<MnemosyneSymbolProps> = ({
  size = 40,
  className = "",
  animated = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className} ${animated ? "animate-pulse" : ""}`}
      role="img"
      aria-label="Símbolo Mnemosyne MEMORA+"
    >
      <defs>
        {/* Primary Deep Indigo Gradient */}
        <linearGradient id="memoraIndigoGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Turquoise / Cyan Secondary Gradient */}
        <linearGradient id="memoraTurquoiseGrad" x1="20" y1="80" x2="80" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="60%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Amber / Gold Accent Gradient */}
        <linearGradient id="memoraGoldGrad" x1="60" y1="20" x2="90" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Outer Repetition & Continuity Ring (incomplete dynamic circle) */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="url(#memoraIndigoGrad)"
        strokeWidth="3.5"
        strokeDasharray="210 65"
        strokeLinecap="round"
        className="opacity-80"
      />
      
      {/* 2. Secondary Turquoise Orbit Arc */}
      <path
        d="M 14 58 A 42 42 0 0 0 54 92"
        stroke="url(#memoraTurquoiseGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-90"
      />

      {/* 3. Base: Open Book Folio Contours */}
      <path
        d="M 28 72 C 38 67, 48 70, 50 74 C 52 70, 62 67, 72 72"
        stroke="url(#memoraTurquoiseGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 77 C 40 73, 48 75, 50 78 C 52 75, 60 73, 68 77"
        stroke="url(#memoraIndigoGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="opacity-70"
      />

      {/* 4. Mnemosyne Silhouette + Letter 'M' Geometry:
          Abstract female profile (forehead, bridge, nose, lips, chin)
          meeting the cerebral arch */}
      <path
        d="M 32 30 
           C 36 22, 45 18, 54 20 
           C 62 22, 69 28, 70 36 
           C 71 43, 67 48, 62 50
           C 60 52, 61 55, 63 58
           C 61 62, 55 64, 49 64
           C 44 64, 40 60, 39 55"
        stroke="url(#memoraIndigoGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5. The Elegant Facial & Frontal 'M' Arch:
          Left apex of M forms hair wave, center dip forms the forehead peak,
          right apex forms the classical crown */}
      <path
        d="M 35 44 
           C 40 33, 44 33, 48 40
           C 51 45, 55 45, 58 36"
        stroke="url(#memoraTurquoiseGrad)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 6. Neural Memory Synapse Connections (Knowledge Being Consolidated) */}
      <line x1="44" y1="28" x2="52" y2="34" stroke="#06B6D4" strokeWidth="1.4" strokeDasharray="1.5 2" />
      <line x1="52" y1="34" x2="60" y2="29" stroke="#06B6D4" strokeWidth="1.4" strokeDasharray="1.5 2" />
      <circle cx="44" cy="28" r="2" fill="#0D9488" />
      <circle cx="52" cy="34" r="2.2" fill="#06B6D4" />
      <circle cx="60" cy="29" r="2" fill="#14B8A6" />

      {/* 7. The Golden Knowledge & Evolution Accent Node (+) */}
      <g filter="url(#goldGlow)">
        {/* Glow background orb */}
        <circle cx="73" cy="25" r="7" fill="url(#memoraGoldGrad)" className="opacity-95" />
        
        {/* The '+' Symbol of MEMORA+ Evolution and Knowledge expansion */}
        <line x1="73" y1="21.5" x2="73" y2="28.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <line x1="69.5" y1="25" x2="76.5" y2="25" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};

interface MemoraBrandLogoProps {
  size?: number;
  imageSize?: number;
  preserveImage?: boolean;
  showSlogan?: boolean;
  className?: string;
  horizontal?: boolean;
  customLogoUrl?: string;
  customBrandName?: string;
  customSlogan?: string;
}

export const MemoraBrandLogo: React.FC<MemoraBrandLogoProps> = ({
  size = 38,
  imageSize = size,
  preserveImage = false,
  showSlogan = false,
  className = "",
  horizontal = true,
  customLogoUrl,
  customBrandName,
  customSlogan,
}) => {
  const logoSrc = customLogoUrl || "/logo-round.png";

  return (
    <div
      className={`flex ${
        horizontal ? "items-center gap-2.5" : "flex-col items-center gap-1.5 text-center"
      } ${className}`}
    >
      <div
        className={preserveImage ? "flex items-center justify-center shrink-0" : "relative group flex items-center justify-center rounded-full bg-slate-900/10 dark:bg-slate-900/60 shadow-xs border border-amber-500/40 dark:border-amber-400/50 overflow-hidden shrink-0"}
        style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
      >
        <img
          src={logoSrc}
          alt={customBrandName || "MEMORA+ Logotipo Oficial"}
          referrerPolicy="no-referrer"
          className={preserveImage ? "w-full h-full object-contain" : "w-full h-full object-cover rounded-full"}
          onError={(e) => {
            // If image fails, hide image and show fallback symbol
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
      </div>
      <div className="flex flex-col justify-center">
        {customBrandName ? (
          <div className="flex items-baseline gap-0.5 leading-none">
            <span
              className="font-extrabold tracking-tight text-slate-900 dark:text-white font-sans"
              style={{ fontSize: `${size * 0.52}px` }}
            >
              {customBrandName}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-0.5 leading-none">
            <span
              className="font-extrabold tracking-tight text-slate-900 dark:text-white font-sans"
              style={{ fontSize: `${size * 0.58}px` }}
            >
              MEMORA
            </span>
            <span
              className="font-black text-amber-500 font-sans"
              style={{ fontSize: `${size * 0.65}px` }}
            >
              +
            </span>
          </div>
        )}
        {showSlogan && (
          <span className="text-[11px] font-medium tracking-wide text-teal-700 dark:text-teal-400 mt-0.5">
            {customSlogan || "Aprenda. Revise. Memorize."}
          </span>
        )}
      </div>
    </div>
  );
};
