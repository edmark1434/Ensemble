// src/pages/user/1_home/home_components/home_quickact_buttons.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Search,
  PlusCircle,
  Briefcase,
  Wrench,
  Upload,
  Users,
  MessageSquare,
} from "lucide-react";

import { useState } from "react";
import useGlobalState from "@/lib/global_state";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

export const ActionButtonSkeleton: React.FC = () => (
  <div className="h-10 w-10 animate-pulse rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.03]" />
);

export const HomeQuickActButtons: React.FC = () => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const restrictedLabels = ["Start Project", "Post a Job", "Create Service", "Upload Asset", "Join a Team"];

  const handleActionClick = (label: string, path: string) => {
    if (isGuestMode && restrictedLabels.includes(label)) {
      setIsModalOpen(true);
    } else {
      navigate(path);
    }
  };

  const actions = [
    {
      label: "Start Project",
      icon: Play,
      path: "/projects/select",
      color: "blue",
      fill: true,
    },
    {
      label: "Find Services",
      icon: Search,
      path: "/gigs/services",
      color: "emerald",
    },
    {
      label: "Post a Job",
      icon: PlusCircle,
      path: "/jobs/create",
      color: "amber",
    },
    {
      label: "Find a Job",
      icon: Briefcase,
      path: "/jobs/postings",
      color: "purple",
    },
    {
      label: "Create Service",
      icon: Wrench,
      path: "/gigs",
      color: "rose",
    },
    {
      label: "Upload Asset",
      icon: Upload,
      path: "/assets",
      color: "cyan",
    },
    {
      label: "Join a Team",
      icon: Users,
      path: "/teams",
      color: "teal",
    },
    {
      label: "Discussions",
      icon: MessageSquare,
      path: "/forums",
      color: "indigo",
    },
  ];

  const styleMap: Record<
    string,
    {
      borderHover: string;
      bgHover: string;
      glow: string;
      iconBgHover: string;
      textColorHover: string;
    }
  > = {
    blue: {
      borderHover: "hover:border-blue-500/40",
      bgHover: "hover:bg-blue-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      iconBgHover: "group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:group-hover:text-blue-400",
      textColorHover: "group-hover:text-blue-600 dark:group-hover:text-blue-300",
    },
    emerald: {
      borderHover: "hover:border-emerald-500/40",
      bgHover: "hover:bg-emerald-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      iconBgHover: "group-hover:bg-emerald-500/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
      textColorHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-300",
    },
    amber: {
      borderHover: "hover:border-amber-500/40",
      bgHover: "hover:bg-amber-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      iconBgHover: "group-hover:bg-amber-500/20 group-hover:text-amber-600 dark:group-hover:text-amber-400",
      textColorHover: "group-hover:text-amber-600 dark:group-hover:text-amber-300",
    },
    purple: {
      borderHover: "hover:border-purple-500/40",
      bgHover: "hover:bg-purple-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]",
      iconBgHover: "group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400",
      textColorHover: "group-hover:text-purple-600 dark:group-hover:text-purple-300",
    },
    rose: {
      borderHover: "hover:border-rose-500/40",
      bgHover: "hover:bg-rose-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]",
      iconBgHover: "group-hover:bg-rose-500/20 group-hover:text-rose-600 dark:group-hover:text-rose-400",
      textColorHover: "group-hover:text-rose-600 dark:group-hover:text-rose-300",
    },
    cyan: {
      borderHover: "hover:border-cyan-500/40",
      bgHover: "hover:bg-cyan-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      iconBgHover: "group-hover:bg-cyan-500/20 group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
      textColorHover: "group-hover:text-cyan-600 dark:group-hover:text-cyan-300",
    },
    teal: {
      borderHover: "hover:border-teal-500/40",
      bgHover: "hover:bg-teal-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(20,184,166,0.2)]",
      iconBgHover: "group-hover:bg-teal-500/20 group-hover:text-teal-600 dark:group-hover:text-teal-400",
      textColorHover: "group-hover:text-teal-600 dark:group-hover:text-teal-300",
    },
    indigo: {
      borderHover: "hover:border-indigo-500/40",
      bgHover: "hover:bg-indigo-500/[0.12]",
      glow: "hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]",
      iconBgHover: "group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
      textColorHover: "group-hover:text-indigo-600 dark:group-hover:text-indigo-300",
    },
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {actions.map((act) => {
          const Icon = act.icon;
          const style = styleMap[act.color];

          return (
            <button
              key={act.label}
              onClick={() => handleActionClick(act.label, act.path)}
              title={act.label}
            className={`group flex h-10 items-center rounded-xl border border-gray-300 shadow-sm dark:shadow-none dark:border-white/10 bg-white dark:bg-white/[0.04] p-2 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${style.borderHover} ${style.bgHover} ${style.glow}`}
          >
            {/* Icon Container */}
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-zinc-400 transition-all duration-300 group-hover:scale-105 ${style.iconBgHover}`}
            >
              <Icon className={`h-3.5 w-3.5 ${act.fill ? "fill-current" : ""}`} />
            </div>

            {/* Smooth Expanding Text Label */}
            <span
              className={`max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-tight text-gray-700 dark:text-zinc-400 opacity-0 transition-all duration-300 ease-in-out group-hover:ml-2 group-hover:max-w-xs group-hover:opacity-100 ${style.textColorHover}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {act.label}
            </span>
          </button>
        );
      })}
      </div>
      <GuestLoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};