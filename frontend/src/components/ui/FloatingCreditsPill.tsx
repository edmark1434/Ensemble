import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import socket from "@/lib/socket";

interface FloatingCreditsPillProps {
  className?: string;
}

export const FloatingCreditsPill: React.FC<FloatingCreditsPillProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  
  // Initial credits from global state
  const rawGlobalCredits = user?.wallet?.balance_credits;
  const initialCredits = rawGlobalCredits !== undefined && rawGlobalCredits !== null
    ? Number(rawGlobalCredits)
    : null;

  const [currentCredits, setCurrentCredits] = useState<number | null>(initialCredits);
  const [displayCredits, setDisplayCredits] = useState<number | null>(initialCredits);
  const [isHovered, setIsHovered] = useState(false);
  const [pillAnimState, setPillAnimState] = useState<"idle" | "added" | "deducted">("idle");
  const [creditDeltas, setCreditDeltas] = useState<
    Array<{ id: number; amount: number; type: "added" | "deducted" }>
  >([]);

  const prevCreditsRef = useRef<number | null>(null);

  // Sync with global state user wallet
  useEffect(() => {
    if (user?.wallet?.balance_credits !== undefined && user?.wallet?.balance_credits !== null) {
      const val = Number(user.wallet.balance_credits);
      if (!isNaN(val)) {
        setCurrentCredits(val);
      }
    }
  }, [user?.wallet?.balance_credits]);

  // Fetch fresh wallet balance on mount if missing
  useEffect(() => {
    if (currentCredits === null) {
      api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
        .then((res) => {
          const raw = res.data?.wallet?.balance_credits;
          if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            const val = Number(raw);
            setCurrentCredits(val);
            if (user) {
              useGlobalState.getState().setUser({
                ...user,
                wallet: { ...(user.wallet || {}), balance_credits: val },
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [currentCredits, user]);

  // Re-sync wallet balance whenever user refocuses window (e.g. returns from top-up tab)
  useEffect(() => {
    const handleWindowFocus = () => {
      api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
        .then((res) => {
          const raw = res.data?.wallet?.balance_credits;
          if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            const val = Number(raw);
            setCurrentCredits(val);
            if (user) {
              useGlobalState.getState().setUser({
                ...user,
                wallet: { ...(user.wallet || {}), balance_credits: val },
              });
            }
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user]);

  // Real-time socket updates
  useEffect(() => {
    const handleWalletBalanceUpdated = ({ balance_credits }: { balance_credits: number }) => {
      const nextBalance = Number(balance_credits);
      if (Number.isFinite(nextBalance)) {
        setCurrentCredits(nextBalance);
        if (user) {
          useGlobalState.getState().setUser({
            ...user,
            wallet: { ...(user.wallet || {}), balance_credits: nextBalance },
          });
        }
      }
    };

    socket.on("walletBalanceUpdated", handleWalletBalanceUpdated);
    return () => {
      socket.off("walletBalanceUpdated", handleWalletBalanceUpdated);
    };
  }, [user]);

  // Custom animation events
  useEffect(() => {
    const handleCustomCreditAnimate = (e: any) => {
      const { amount, newBalance } = e.detail || {};
      if (typeof newBalance === "number") {
        setCurrentCredits(newBalance);
      } else if (typeof amount === "number" && currentCredits !== null) {
        setCurrentCredits(currentCredits + amount);
      }
    };

    window.addEventListener("ensemble:animate-credits" as any, handleCustomCreditAnimate);
    return () => {
      window.removeEventListener("ensemble:animate-credits" as any, handleCustomCreditAnimate);
    };
  }, [currentCredits]);

  // Smooth number rolling counter & Delta bubble trigger
  useEffect(() => {
    if (currentCredits === null) return;

    if (prevCreditsRef.current === null) {
      prevCreditsRef.current = currentCredits;
      setDisplayCredits(currentCredits);
      return;
    }

    if (currentCredits !== prevCreditsRef.current) {
      const diff = currentCredits - prevCreditsRef.current;
      const type: "added" | "deducted" = diff > 0 ? "added" : "deducted";
      const deltaId = Date.now() + Math.random();

      setCreditDeltas((prev) => [...prev, { id: deltaId, amount: diff, type }]);
      setPillAnimState(type);

      const timerDelta = setTimeout(() => {
        setCreditDeltas((prev) => prev.filter((d) => d.id !== deltaId));
      }, 2400);

      const timerPill = setTimeout(() => {
        setPillAnimState("idle");
      }, 900);

      const startValue = displayCredits ?? prevCreditsRef.current;
      const targetValue = currentCredits;
      const startTime = performance.now();
      const duration = 650;

      let animFrameId: number;
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(startValue + (targetValue - startValue) * ease);
        setDisplayCredits(val);

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          setDisplayCredits(targetValue);
        }
      };

      animFrameId = requestAnimationFrame(step);
      prevCreditsRef.current = currentCredits;

      return () => {
        clearTimeout(timerDelta);
        clearTimeout(timerPill);
        cancelAnimationFrame(animFrameId);
      };
    }
  }, [currentCredits]);

  const handleTopUp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Always open Credits top-up in a new tab so user never loses their active form or draft progress
    window.open("/credits", "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`fixed top-5 right-5 sm:top-6 sm:right-8 z-40 select-none ${className}`}>
      <div className="relative">
        {/* Floating Delta Badge */}
        <AnimatePresence>
          {creditDeltas.map((delta) => (
            <motion.div
              key={delta.id}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -24, scale: 1 }}
              exit={{ opacity: 0, y: -36, scale: 0.85 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black shadow-lg z-50 ${
                delta.type === "added"
                  ? "bg-emerald-500 text-white shadow-emerald-500/30 ring-1 ring-emerald-400"
                  : "bg-rose-500 text-white shadow-rose-500/30 ring-1 ring-rose-400"
              }`}
            >
              <span>{delta.type === "added" ? `+${delta.amount.toLocaleString()}` : delta.amount.toLocaleString()}</span>
              <CreditIcon className="h-3 w-3 text-white fill-current shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating Pill Button */}
        <motion.button
          type="button"
          onClick={handleTopUp}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          animate={
            pillAnimState === "added"
              ? { scale: [1, 1.12, 0.96, 1.05, 1] }
              : pillAnimState === "deducted"
              ? { x: [0, -3, 3, -3, 3, 0], scale: [1, 0.94, 1] }
              : { scale: 1, x: 0 }
          }
          transition={{ duration: 0.6, ease: "easeOut" }}
          aria-label={`Credits balance: ${currentCredits !== null ? currentCredits.toLocaleString() : "loading"}. Click to top up.`}
          className={`group relative flex items-center h-9 pl-2.5 pr-1.5 py-1 rounded-full border transition-all duration-300 select-none overflow-hidden cursor-pointer shadow-md backdrop-blur-md ${
            pillAnimState === "added"
              ? "border-emerald-400 bg-emerald-50/95 dark:bg-emerald-950/60 ring-2 ring-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
              : pillAnimState === "deducted"
              ? "border-rose-400 bg-rose-50/95 dark:bg-rose-950/60 ring-2 ring-rose-400/60 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
              : "border-amber-300/90 bg-white/95 hover:bg-amber-50/90 hover:border-amber-400 dark:border-amber-500/30 dark:bg-zinc-900/90 dark:hover:bg-zinc-800/90 dark:hover:border-amber-400/60 dark:shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {/* Contained Hover Shine */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent" />
          </div>

          {/* Animated Coin Icon */}
          <motion.div
            animate={
              pillAnimState === "added"
                ? { rotate: [0, 360], scale: [1, 1.35, 1] }
                : pillAnimState === "deducted"
                ? { rotate: [-12, 12, -8, 8, 0], scale: [1, 0.85, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="shrink-0 flex items-center justify-center"
          >
            <CreditIcon className={`h-4 w-4 text-amber-500 shrink-0 transition-transform duration-300 group-hover:scale-110 ${currentCredits === null ? "animate-pulse" : ""}`} />
          </motion.div>

          {/* Rolling Number Display */}
          <span
            className={`text-xs sm:text-sm font-black tracking-tight overflow-hidden whitespace-nowrap transition-colors duration-300 ${
              pillAnimState === "added"
                ? "text-emerald-700 dark:text-emerald-300"
                : pillAnimState === "deducted"
                ? "text-rose-700 dark:text-rose-300"
                : "text-amber-950 dark:text-amber-200"
            } ${
              currentCredits === null ? "max-w-0 opacity-0 ml-0" : "max-w-[130px] opacity-100 ml-1.5 sm:ml-2"
            }`}
          >
            {displayCredits !== null ? displayCredits.toLocaleString() : (currentCredits !== null ? currentCredits.toLocaleString() : "")}
          </span>

          {/* Plus Button */}
          <span
            className={`ml-2 flex items-center justify-center h-5 w-5 rounded-full transition-all duration-200 shrink-0 ${
              pillAnimState === "added"
                ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-300"
                : pillAnimState === "deducted"
                ? "bg-rose-200 text-rose-900 dark:bg-rose-400/20 dark:text-rose-300"
                : "bg-amber-200/70 text-amber-900 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-400/15 dark:text-amber-300 dark:group-hover:bg-amber-400 dark:group-hover:text-zinc-950"
            }`}
            title="Add Credits"
          >
            <Plus className="h-3 w-3 stroke-[2.75]" />
          </span>
        </motion.button>

        {/* Tooltip positioned BELOW the pill */}
        {isHovered && (
          <div className="absolute top-full mt-2 right-0 whitespace-nowrap rounded-md bg-gray-900 dark:bg-zinc-800 border border-gray-700/50 dark:border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl pointer-events-none z-50">
            Top up Credits (new tab)
            <span className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-zinc-800 border-t border-l border-gray-700/50 dark:border-white/10 rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingCreditsPill;
