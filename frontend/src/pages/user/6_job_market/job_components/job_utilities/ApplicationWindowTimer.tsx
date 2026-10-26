import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ApplicationWindowTimerProps {
  deadline?: string | null;
  status?: string | null;
  variant?: "badge" | "bar";
  className?: string;
  actionButton?: React.ReactNode;
}

export const ApplicationWindowTimer: React.FC<ApplicationWindowTimerProps> = ({
  deadline,
  status,
  variant = "badge",
  className = "",
  actionButton,
}) => {
  const [countdown, setCountdown] = useState<string>("");
  const isStatusClosed =
    status?.toLowerCase() === "closed" || status?.toLowerCase() === "expired";

  useEffect(() => {
    if (!deadline || isStatusClosed) {
      setCountdown("");
      return;
    }

    const calcTime = () => {
      const targetTime = new Date(deadline).getTime();
      const diffMs = targetTime - Date.now();

      if (diffMs <= 0) {
        setCountdown("00h 00m 00s");
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n: number) => String(n).padStart(2, "0");
      if (days > 0) {
        setCountdown(`${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      } else {
        setCountdown(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, isStatusClosed]);

  if (!deadline) return null;

  const isExpired =
    isStatusClosed || new Date(deadline).getTime() <= Date.now();

  if (variant === "badge") {
    if (isExpired) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25 text-[10px] font-bold shrink-0 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>Intake Closed</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25 text-[10px] font-bold shrink-0 shadow-2xs ${className}`}
      >
        <Clock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
        <span className="font-mono tracking-tight font-bold">
          {countdown || "Calculating..."}
        </span>
        <span className="font-medium opacity-75 hidden sm:inline">left</span>
      </span>
    );
  }

  // variant === "bar"
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/70 dark:bg-zinc-900/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
        <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm tracking-tight whitespace-nowrap">
          Application Window Status
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isExpired
              ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isExpired ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
            }`}
          />
          {isExpired ? "Intake Closed" : "Open for Applications"}
        </span>
        {!isExpired && countdown && (
          <span
            className="px-2.5 py-0.5 rounded-md bg-gray-200/90 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-bold tracking-tight whitespace-nowrap font-mono"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {countdown}
          </span>
        )}
        <span className="text-[11px] text-gray-500 dark:text-zinc-400">
          {isExpired
            ? "No new proposals accepted"
            : "Remaining until auto-expiration"}
        </span>
      </div>

      {actionButton && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default ApplicationWindowTimer;
