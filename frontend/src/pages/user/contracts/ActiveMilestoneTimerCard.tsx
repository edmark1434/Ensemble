import React, { useState, useEffect } from "react";
import { Clock, Calendar, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { MilestoneItem, ContractStatus } from "./contracts";

interface ActiveMilestoneTimerCardProps {
  milestones: MilestoneItem[];
  contractStatus: ContractStatus | string;
  contractDateStarted?: string;
  contractDueDate?: string;
  isClient?: boolean;
  isFreelancer?: boolean;
  className?: string;
}

export const ActiveMilestoneTimerCard: React.FC<ActiveMilestoneTimerCardProps> = ({
  milestones,
  contractStatus,
  contractDateStarted,
  contractDueDate,
  isClient = false,
  isFreelancer = false,
  className = "",
}) => {
  if (!milestones || milestones.length === 0) return null;

  // Milestone 1 or the currently active milestone
  const milestone1 = milestones[0];
  const activeMilestone =
    milestones.find(
      (m) =>
        m.status === "In Progress" ||
        (m.rawStatus || "").toLowerCase() === "active"
    ) || milestone1;

  const milestoneIndex = milestones.indexOf(activeMilestone) + 1 || 1;
  const isCompleted = activeMilestone.status === "Claimed";
  const isWaiting =
    contractStatus === "Waiting" || contractStatus === "Pending Signature";
  const isActive = contractStatus === "Active";

  // Calculate target deadline timestamp
  const getTargetDate = (): Date | null => {
    if (activeMilestone.deadline_at) {
      const d = new Date(activeMilestone.deadline_at);
      if (!isNaN(d.getTime())) return d;
    }

    const hrs = parseFloat(
      String(activeMilestone.deadline || "").replace(/[^0-9.]/g, "")
    );

    if (activeMilestone.started_at && !isNaN(hrs) && hrs > 0) {
      const d = new Date(activeMilestone.started_at);
      if (!isNaN(d.getTime())) {
        return new Date(d.getTime() + hrs * 3600000);
      }
    }

    if (contractDateStarted && !isNaN(hrs) && hrs > 0) {
      const d = new Date(contractDateStarted);
      if (!isNaN(d.getTime())) {
        return new Date(d.getTime() + hrs * 3600000);
      }
    }

    if (contractDueDate) {
      const d = new Date(contractDueDate);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  const targetDate = getTargetDate();

  // Real-time countdown calculation
  const [timeLeft, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    isExpired: boolean;
    progressPercent: number;
  }>({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    isExpired: false,
    progressPercent: 0,
  });

  useEffect(() => {
    if (!targetDate || isCompleted || isWaiting) {
      setTimeLeft({
        days: "00",
        hours: "00",
        minutes: "00",
        seconds: "00",
        isExpired: false,
        progressPercent: 0,
      });
      return;
    }

    const calcTime = () => {
      const diffMs = targetDate.getTime() - Date.now();

      if (diffMs <= 0) {
        setTimeLeft({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
          isExpired: true,
          progressPercent: 100,
        });
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n: number) => String(n).padStart(2, "0");

      setTimeLeft({
        days: pad(days),
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        isExpired: false,
        progressPercent: isCompleted ? 100 : 0,
      });
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [
    targetDate?.getTime(),
    isCompleted,
    isWaiting,
    activeMilestone.started_at,
    contractDateStarted,
  ]);

  const formattedTargetDeadline = targetDate
    ? targetDate.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : activeMilestone.deadline || "Flexible";

  return (
    <div
      className={`rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-sm space-y-4 ${className}`}
    >
      {/* 1. Card Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Milestone {milestoneIndex} Countdown
          </h3>
        </div>

        {isCompleted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Completed</span>
          </span>
        ) : isWaiting ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-950 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800">
            <span>Awaiting Signature</span>
          </span>
        ) : timeLeft.isExpired ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span>Deadline Passed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{activeMilestone.status || "In Progress"}</span>
          </span>
        )}
      </div>

      {/* 2. Milestone Overview */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
            {activeMilestone.name || `Phase ${milestoneIndex}`}
          </p>
          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white shrink-0">
            {activeMilestone.credits?.toLocaleString()} Cr
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Phase {milestoneIndex} of {milestones.length} • {activeMilestone.revisions || 0} Revisions Included
        </p>
      </div>

      {/* 3. Timer Display Section */}
      {isCompleted ? (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            Milestone Successfully Delivered & Approved
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Escrow allocation of {activeMilestone.credits?.toLocaleString()} Credits was released.
          </p>
        </div>
      ) : isWaiting ? (
        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/40 bg-sky-50/50 dark:bg-sky-950/20 text-center space-y-1.5">
          <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400 mx-auto" />
          <p className="text-xs font-bold text-sky-950 dark:text-sky-200">
            Timer Starts Upon Candidate Signature
          </p>
          <p className="text-[11px] text-sky-700 dark:text-sky-300 leading-relaxed">
            Allocated delivery window:{" "}
            <strong>{activeMilestone.deadline || "Standard"}</strong>. Clock initiates as soon as terms are accepted.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Segmented Clock Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] p-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block tracking-tight">
                {timeLeft.days}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mt-0.5">
                Days
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] p-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block tracking-tight">
                {timeLeft.hours}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mt-0.5">
                Hours
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] p-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-zinc-900 dark:text-white block tracking-tight">
                {timeLeft.minutes}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mt-0.5">
                Mins
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] p-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 block tracking-tight">
                {timeLeft.seconds}
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mt-0.5">
                Secs
              </span>
            </div>
          </div>

          {/* Progress Track */}
          <div className="space-y-1">
            <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${isCompleted ? 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400">
              <span>Phase Progress</span>
              <span className="font-mono font-semibold">{isCompleted ? "100%" : "0%"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer Meta */}
      <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 dark:text-zinc-500 text-[11px] inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Target Deadline:
          </span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
            {formattedTargetDeadline}
          </span>
        </div>

        {isActive && !isCompleted && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal pt-1">
            {isFreelancer
              ? "Submit milestone files before this timer elapses to maintain an optimal Delivery Reliability score."
              : "Freelancer is actively producing deliverables under platform escrow protection."}
          </p>
        )}
      </div>
    </div>
  );
};

export default ActiveMilestoneTimerCard;
