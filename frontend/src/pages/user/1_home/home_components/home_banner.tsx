// src/pages/user/1_home/home_components/home_banner.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronUp, ChevronDown, HelpCircle } from "lucide-react";
import { HomeQuickActButtons } from "./home_quickact_buttons";
import { HomeBannerVersion } from "./home_banner_version";
import { HomeBannerInfo } from "./home_banner_info";
import useGlobalState from "@/lib/global_state";

export const WelcomeCardSkeleton: React.FC = () => (
  <div className="mb-12 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-8">
    <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="mt-2 h-12 w-96 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    <div className="mt-6 h-px w-32 animate-pulse bg-gray-200 dark:bg-white/10" />
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
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const user = useGlobalState((state) => state.user);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedHome");
    if (!hasVisited) {
      setIsFirstVisit(true);
      sessionStorage.setItem("hasVisitedHome", "true");
    }
  }, []);

  const getRandomGreeting = useCallback(() => {
    const fullUserName = user?.display_name || user?.name || user?.username || "Editor";
    const firstName = fullUserName.split(' ')[0];
    const hour = new Date().getHours();
    
    const greetings = [
      `Welcome back, ${firstName}!`,
      `Hey ${firstName}, good to see you!`,
      `Look who’s back, ${firstName}!`,
      `Back in action, ${firstName}!`,
      `Hey ${firstName}, let’s get to it!`,
      `Good to have you here, ${firstName}.`,
      `Ready when you are, ${firstName}!`,
      `Hey ${firstName}, glad you dropped in!`,
      `Ah, ${firstName}! Welcome back.`,
      `Right on time, ${firstName}!`,
      `Timeline’s waiting, ${firstName}!`,
      `Ready to render, ${firstName}?`,
      `Back to the cuts, ${firstName}!`,
      `What are we editing today, ${firstName}?`,
      `What’s up, ${firstName}?`
    ];

    if (hour >= 5 && hour < 12) greetings.push(`Good morning, ${firstName}.`);
    else if (hour >= 18 || hour < 5) greetings.push(`Good evening, ${firstName}.`);
    else if (hour >= 12 && hour < 18) greetings.push(`Good afternoon, ${firstName}.`);

    return greetings[Math.floor(Math.random() * greetings.length)];
  }, [user]);

  // Initial greeting
  useEffect(() => {
    setGreeting(getRandomGreeting());
  }, [getRandomGreeting]);

  // Typewriter effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isTyping) {
      if (displayedText.length < greeting.length) {
        timeout = setTimeout(() => {
          setDisplayedText(greeting.slice(0, displayedText.length + 1));
        }, 50); // Typing speed
      } else {
        setIsTyping(false); // Finished typing
      }
    } else {
      // 3 seconds later, change randomly
      timeout = setTimeout(() => {
        setGreeting(getRandomGreeting());
        setDisplayedText(""); // Reset text
        setIsTyping(true); // Start typing again
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, greeting, getRandomGreeting]);

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
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/15 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all duration-500 md:p-10">
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
      <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-zinc-950 via-white/70 dark:via-zinc-950/70 to-transparent/10 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-zinc-950/80 via-transparent to-white/20 dark:to-zinc-950/20" />

      {/* Controls Container - Upper Right Corner */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {/* Modular Custom HUD Version Badge */}
        <HomeBannerVersion />

        {/* Circular Question Mark "What's New?" Trigger Button */}
        <button
          onClick={() => setIsInfoOpen(!isInfoOpen)}
          className={`group relative flex h-7 w-7 items-center justify-center rounded-full border bg-white/70 dark:bg-zinc-950/70 text-gray-500 dark:text-zinc-400 backdrop-blur-md transition-all duration-300 hover:scale-105 ${
            isInfoOpen
              ? "border-gray-400 dark:border-zinc-300 bg-gray-100 dark:bg-white/15 text-gray-900 dark:text-white shadow-lg shadow-black/5 dark:shadow-white/5"
              : "border-gray-200 dark:border-white/15 hover:border-gray-400 dark:hover:border-zinc-300/80 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-zinc-200"
          }`}
          title="What's New in this update?"
        >
          <HelpCircle className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
        </button>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 dark:border-white/15 bg-white/70 dark:bg-zinc-950/70 text-gray-500 dark:text-zinc-400 backdrop-blur-md transition hover:border-gray-400 dark:hover:border-white/30 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
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
          className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-4xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {displayedText}
          <span className="animate-pulse inline-block ml-1 opacity-70">|</span>
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
              className="mt-3 text-base font-medium leading-relaxed text-gray-800 dark:text-zinc-200 md:text-lg"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              The premier platform for high-end video production and creative talent.
            </p>

            <p
              className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-zinc-400"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Streamline your pipeline—find top clients, access studio-grade assets, and scale your craft.
            </p>

            {/* Embedded Search Bar */}
            <div className="mt-6 mb-2">
              <div className="relative flex items-center rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/10 p-1.5 shadow-xl dark:shadow-2xl backdrop-blur-xl transition duration-300 focus-within:border-blue-500/50 dark:focus-within:border-cyan-500/50 focus-within:bg-gray-100 dark:focus-within:bg-white/15 focus-within:shadow-blue-500/10 dark:focus-within:shadow-cyan-500/10">
                <div className="flex items-center justify-center pl-3 pr-2 text-gray-400 dark:text-zinc-400">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets, libraries, effects, or templates across the ecosystem..."
                  className="w-full bg-transparent px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mr-1 rounded-lg p-2 text-gray-400 dark:text-zinc-400 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
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