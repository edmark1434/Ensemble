import React, { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  onConfirm: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  title = "Successfully Posted!",
  message,
  buttonText = "Okay, got it!",
  onConfirm,
}) => {
  const [status, setStatus] = useState<"loading" | "success">("loading");

  useEffect(() => {
    if (isOpen) {
      setStatus("loading");
      const timer = setTimeout(() => {
        setStatus("success");
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Adjusted layout bounds to shift modal center offset precisely into the main right-hand panel view context */
    <div className="fixed top-0 bottom-0 right-0 left-0 md:left-64 z- flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-hidden">

      {/* --- VIBRANT BACKGROUND BLUR GLOW BLOBS --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-72 h-72 rounded-full bg-yellow-500/10 blur-[80px] animate-pulse duration-[4s]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-[90px] animate-pulse duration-[6s]" />
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 rounded-full bg-purple-500/15 blur-[80px] animate-pulse duration-[5s]" />
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL LOCALIZED CONFETTI CANVAS                                          */}
      {/* ========================================================================= */}
      {status === "success" && (
        <div className="absolute inset-0 pointer-events-none w-full h-full z-30">
          {[...Array(30)].map((_, i) => {
            const colors = ["bg-yellow-400", "bg-cyan-400", "bg-purple-400", "bg-green-400", "bg-pink-400"];
            const randomColor = colors[i % colors.length];
            const inlineStyles = {
              "--left": `${15 + Math.random() * 70}%`,
              "--tx": `${(Math.random() - 0.5) * 450}px`,
              "--ty": `${-180 - Math.random() * 250}px`,
              "--rot": `${Math.random() * 720}deg`,
              animationDelay: `${Math.random() * 0.2}s`,
            } as React.CSSProperties;

            return (
              <span
                key={i}
                style={inlineStyles}
                className={`absolute bottom-1/2 w-2.5 h-2.5 rounded-sm opacity-0 animate-confetti-blast ${randomColor}`}
              />
            );
          })}
        </div>
      )}

      {/* --- MAIN MODAL CARD CONTAINER --- */}
      <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/90 p-8 text-center shadow-2xl min-h-[320px] flex flex-col justify-center items-center backdrop-blur-xl z-10 overflow-hidden">

        {status === "loading" ? (
          <div className="space-y-4 animate-fade-in flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin stroke-[2.5]" />
              <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-md animate-ping" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-zinc-200 tracking-wide">Syncing with Marketplace...</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Deploying platform structural data parameters</p>
            </div>
          </div>
        ) : (
          <div className="animate-scale-up flex flex-col items-center w-full relative">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-green-400 shadow-[0_0_25px_rgba(34,197,94,0.15)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-[#0d0f1a] shadow-lg shadow-green-500/30">
                <Check className="h-5 w-5 stroke-" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-[280px] mx-auto">
              {message}
            </p>

            <button
              onClick={onConfirm}
              className="w-full rounded-full bg-green-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0d0f1a] transition-all hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20"
            >
              {buttonText}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes confetti-blast {
          0% {
            transform: translate(-50%, 50%) scale(0.3) rotate(0deg);
            opacity: 1;
            left: var(--left);
            bottom: 50%;
          }
          65% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(1.1) rotate(var(--rot));
            opacity: 0;
            left: var(--left);
            bottom: 50%;
          }
        }
        .animate-confetti-blast {
          animation: confetti-blast 1.5s cubic-bezier(0.1, 0.85, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;