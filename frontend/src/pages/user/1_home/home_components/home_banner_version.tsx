// src/pages/user/1_home/home_components/home_banner_version.tsx
import React from "react";
import { APP_VERSION } from "@/version.tsx";

export const HomeBannerVersion: React.FC = () => {
  return (
    <div className="relative flex items-center gap-2 bg-zinc-950/70 px-3 py-1 backdrop-blur-md transition-all duration-300 border-y border-white/15 hover:border-zinc-400/50">
      {/* Neutral Gray Corner Brackets */}
      <div className="absolute -top-[1px] -left-[1px] h-1.5 w-1.5 border-t border-l border-zinc-400/80" />
      <div className="absolute -top-[1px] -right-[1px] h-1.5 w-1.5 border-t border-r border-zinc-400/80" />
      <div className="absolute -bottom-[1px] -left-[1px] h-1.5 w-1.5 border-b border-l border-zinc-400/80" />
      <div className="absolute -bottom-[1px] -right-[1px] h-1.5 w-1.5 border-b border-r border-zinc-400/80" />

      {/* Gray Blinking Live Indicator Dot */}
      <span className="relative flex h-1.5 w-1.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-400" />
      </span>

      {/* Thin Gray Version Text */}
      <span
        className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zinc-300 animate-pulse-glow"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {APP_VERSION}
      </span>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            text-shadow: 0 0 6px rgba(212, 212, 216, 0.5);
          }
          50% {
            opacity: 0.35;
            text-shadow: none;
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};