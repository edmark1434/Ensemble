// src/pages/user/1_home/home_components/home_banner.tsx
import React, { useState, useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown, HelpCircle } from "lucide-react";
import { HomeQuickActButtons } from "./home_quickact_buttons";
import { HomeBannerVersion } from "./home_banner_version";
import { HomeBannerInfo } from "./home_banner_info";

export const WelcomeCardSkeleton: React.FC = () => (
  <div className="mb-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8">
    <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-2 h-12 w-96 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-lg bg-white/5" />
    <div className="mt-6 h-px w-32 animate-pulse bg-white/10" />
  </div>
);

// Video playlist queue in /clip
const BANNER_CLIPS = [
  "/clip/banner_vid.mp4",
  "/clip/hero_vid.mp4",
  "/clip/side_video.mp4",
  "/clip/login_bg_vid.mp4",
  "/clip/signup_bg_vid.mp4",
];

interface HomeBannerProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const HomeBanner: React.FC<HomeBannerProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Dual-Layer Video Cross-Fade Management
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [nextClipIndex, setNextClipIndex] = useState(1);
  const [isCrossFading, setIsCrossFading] = useState(false);

  const activeVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 4-Second Rotation Timer
    const interval = setInterval(() => {
      // 1. Calculate next clip
      const nextIndex = (activeClipIndex + 1) % BANNER_CLIPS.length;
      setNextClipIndex(nextIndex);

      // 2. Play next video in background layer
      if (nextVideoRef.current) {
        nextVideoRef.current.currentTime = 0;
        nextVideoRef.current.play().catch(() => {});
      }

      // 3. Trigger cross-fade overlay
      setIsCrossFading(true);

      // 4. Swap active clips smoothly after cross-fade completes
      setTimeout(() => {
        setActiveClipIndex(nextIndex);
        setIsCrossFading(false);
      }, 1000); // 1-second ultra-smooth transition duration
    }, 4000);

    return () => clearInterval(interval);
  }, [activeClipIndex]);

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl transition-all duration-500 md:p-10">
      {/* BASE VIDEO LAYER (Currently Active) */}
      <video
        ref={activeVideoRef}
        src={BANNER_CLIPS[activeClipIndex]}
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-50 md:opacity-70"
      />

      {/* OVERLAY VIDEO LAYER (Cross-fades in during transitions) */}
      <video
        ref={nextVideoRef}
        src={BANNER_CLIPS[nextClipIndex]}
        autoPlay
        loop
        muted
        playsInline
        className={`pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-1000 ease-in-out ${
          isCrossFading ? "opacity-50 md:opacity-70" : "opacity-0"
        }`}
      />

      {/* Gradients tailored to reveal video on the right & protect text on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent/10 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/20" />

      {/* Controls Container - Upper Right Corner */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {/* Modular Custom HUD Version Badge */}
        <HomeBannerVersion />

        {/* Circular Question Mark "What's New?" Trigger Button */}
        <button
          onClick={() => setIsInfoOpen(!isInfoOpen)}
          className={`group relative flex h-7 w-7 items-center justify-center rounded-full border bg-zinc-950/70 text-zinc-400 backdrop-blur-md transition-all duration-300 hover:scale-105 ${
            isInfoOpen
              ? "border-zinc-300 bg-white/15 text-white shadow-lg shadow-white/5"
              : "border-white/15 hover:border-zinc-300/80 hover:bg-white/10 hover:text-zinc-200"
          }`}
          title="What's New in this update?"
        >
          <HelpCircle className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
        </button>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-zinc-950/70 text-zinc-400 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          title={isCollapsed ? "Expand banner" : "Collapse banner"}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Render What's New Info Popup Modal */}
      <HomeBannerInfo
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      {/* Content Layer */}
      <div className="relative z-10 max-w-3xl">
        {/* Always Visible Header */}
        <h1
          className="text-2xl font-extrabold tracking-tight text-white md:text-4xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Welcome back, Editor
        </h1>

        {/* Smooth CSS Grid Transition for Collapsible Paragraphs & Search Bar */}
        <div
          className={`grid transition-all duration-500 ease-in-out ${
            isCollapsed
              ? "grid-rows-[0fr] opacity-0"
              : "grid-rows-[1fr] opacity-100"
          }`}
        >
          <div className="overflow-hidden">
            <p
              className="mt-3 text-base font-medium leading-relaxed text-zinc-200 md:text-lg"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              The premier platform for high-end video production and creative talent.
            </p>

            <p
              className="mt-1 text-sm leading-relaxed text-zinc-400"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Streamline your pipeline—find top clients, access studio-grade assets, and scale your craft.
            </p>

            {/* Embedded Search Bar */}
            <div className="mt-6 mb-2">
              <div className="relative flex items-center rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-2xl backdrop-blur-xl transition duration-300 focus-within:border-cyan-500/50 focus-within:bg-white/15 focus-within:shadow-cyan-500/10">
                <div className="flex items-center justify-center pl-3 pr-2 text-zinc-400">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets, libraries, effects, or templates across the ecosystem..."
                  className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mr-1 rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons - Always Visible */}
        <div className="mt-4 transition-all duration-300">
          <HomeQuickActButtons />
        </div>
      </div>
    </div>
  );
};