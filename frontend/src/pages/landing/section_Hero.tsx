import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, FC } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeroProps {
  onStart: () => void;
  isMuted?: boolean;
}

import TrueFocus from "@/components/ui/TrueFocus";
import GradientBlinds from "@/components/ui/GradientBlinds";
import TechText from "@/components/ui/TechText";
import StarBorder from "@/components/ui/StarBorder";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

const INTENT_INDEX = { edit: 0, hire: 1, work: 2 } as const;

const HERO_VIDEOS = [
  "/clip/hero_vid.mp4",
  "/gallery_images/new/vids/herovid_1.mp4",
  "/gallery_images/new/vids/herovid_2.mp4",
] as const;

const SectionHero: FC<HeroProps> = ({ onStart: _onStart, isMuted = false }) => {
  const navigate = useNavigate();
  const setIsGuestMode = useGlobalState((state) => state.setIsGuestMode);
  const theme = useGlobalState((state) => state.theme);

  const [mounted, setMounted] = useState<boolean>(false);
  const [activeVideoIdx, setActiveVideoIdx] = useState<number>(0);
  const heroVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );
  const [intent, setIntent] = useState<"hire" | "work" | "edit">("edit");
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [searchVal, setSearchVal] = useState("");
  const [topJobCategories, setTopJobCategories] = useState<string[]>([]);
  const [topGigCategories, setTopGigCategories] = useState<string[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const updateMobile = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    updateMobile(mq);
    mq.addEventListener("change", updateMobile);
    return () => mq.removeEventListener("change", updateMobile);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveVideoIdx((prev) => (prev + 1) % HERO_VIDEOS.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const activeVideo = heroVideoRefs.current[activeVideoIdx];
    if (activeVideo) {
      activeVideo.currentTime = 0;
      activeVideo.play().catch(() => {});
    }
  }, [activeVideoIdx]);

  useEffect(() => {
    const fetchTopCategories = async () => {
      try {
        const [jobsRes, gigsRes] = await Promise.all([
          api.get("/api/jobs"),
          api.get("/api/gigs"),
        ]);

        const jobCounts: Record<string, number> = {};
        jobsRes.data?.data?.forEach((job: any) => {
          if (job.category) jobCounts[job.category] = (jobCounts[job.category] || 0) + 1;
        });
        const sortedJobs = Object.entries(jobCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map((e) => e[0]);

        const gigCounts: Record<string, number> = {};
        gigsRes.data?.data?.forEach((gig: any) => {
          if (gig.category) gigCounts[gig.category] = (gigCounts[gig.category] || 0) + 1;
        });
        const sortedGigs = Object.entries(gigCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map((e) => e[0]);

        setTopJobCategories(
          sortedJobs.length > 0
            ? sortedJobs
            : ["Short Form Reels", "Logo Animation", "Cinematic Grading", "Vlog Editing"]
        );
        setTopGigCategories(
          sortedGigs.length > 0
            ? sortedGigs
            : ["Wedding Video", "AI Development", "YouTube Intro", "Color Grading"]
        );
      } catch (err) {
        console.error("Failed to fetch top categories", err);
        setTopJobCategories([
          "Short Form Reels",
          "Logo Animation",
          "Cinematic Grading",
          "Vlog Editing",
        ]);
        setTopGigCategories([
          "Wedding Video",
          "AI Development",
          "YouTube Intro",
          "Color Grading",
        ]);
      }
    };
    fetchTopCategories();
  }, []);

  // Sound references
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);

    hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");

    hoverAudioRef.current.volume = 0.25;
    clickAudioRef.current.volume = 0.4;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes slideInFromRight {
        from { opacity: 0; transform: translateX(30px); filter: blur(4px); }
        to { opacity: 1; transform: translateX(0); filter: blur(0); }
      }
      @keyframes slideInFromLeft {
        from { opacity: 0; transform: translateX(-30px); filter: blur(4px); }
        to { opacity: 1; transform: translateX(0); filter: blur(0); }
      }
      @keyframes simpleFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .slide-from-right { animation: slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .slide-from-left { animation: slideInFromLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .fade-only { animation: simpleFade 0.4s ease forwards; }

      /* Bulletproof Light/Dark Mode injected CSS */
      .hero-overlay { background: linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 50%, rgba(255,255,255,0.65) 100%); }
      .dark .hero-overlay { background: linear-gradient(90deg, rgba(18,18,20,0.96) 0%, rgba(18,18,20,0.88) 50%, rgba(18,18,20,0.65) 100%); }

      .hero-bottom-fade { background: linear-gradient(to top, #ffffff, transparent); }
      .dark .hero-bottom-fade { background: linear-gradient(to top, #121214, transparent); }

      .hero-section-shell {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 120px 60px 68px;
        position: relative;
        overflow: hidden;
      }

      .hero-intent-bar {
        display: flex;
        gap: 4px;
        padding: 4px;
        border-radius: 12px;
        width: fit-content;
        max-width: 100%;
        margin-bottom: 24px;
        backdrop-filter: blur(12px);
        border-width: 1px;
        border-style: solid;
      }

      .hero-btn {
        background: transparent;
        color: #4b5563;
        padding: 8px 20px;
        border-radius: 8px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        text-align: center;
      }
      .dark .hero-btn { color: #7a8499; }
      .hero-btn:hover { background: rgba(0,0,0,0.05); color: #111827; }
      .dark .hero-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
      .hero-btn.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .dark .hero-btn.active { background: rgba(255,255,255,0.1); color: #fff; box-shadow: none; }

      .hero-search { background: rgba(255,255,255,0.8); border-color: #e5e7eb; }
      .dark .hero-search { background: rgba(18,20,22,0.75); border-color: rgba(255,255,255,0.15); }

      .hero-search-btn { background: #111827; color: #fff; }
      .hero-search-btn:hover { background: #1f2937; }
      .dark .hero-search-btn { background: #fff; color: #000; }
      .dark .hero-search-btn:hover { background: #dde3ed; }

      .hero-action-btn { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); }
      .hero-action-btn:hover { transform: scale(1.02); }
      .dark .hero-action-btn { box-shadow: 0 10px 25px -5px rgba(255,255,255,0.15); }
      .dark .hero-action-btn:hover { transform: scale(1.02); }

      .hero-tag { background: #fff; border-color: #e5e7eb; color: #4b5563; }
      .hero-tag:hover { background: #f3f4f6; border-color: #d1d5db; color: #111827; }
      .dark .hero-tag { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); }
      .dark .hero-tag:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: #fff; }
      .hero-tag:disabled { background: #f3f4f6; border-color: #e5e7eb; color: #9ca3af; cursor: default; }
      .dark .hero-tag:disabled { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); cursor: default; }

      @media (max-width: 960px) {
        .hero-section-shell {
          padding: 100px 32px 76px;
        }
      }

      @media (max-width: 640px) {
        .hero-section-shell {
          min-height: 100svh;
          padding: 76px 20px 76px;
          align-items: center !important;
          justify-content: center !important;
        }
        .hero-content-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin: 0 auto;
          width: 100%;
        }
        .hero-eyebrow-pill {
          padding: 5px 11px !important;
          margin: 0 auto 12px !important;
          max-width: 100%;
        }
        .hero-eyebrow-text {
          font-size: 9px !important;
          letter-spacing: 0.03em !important;
        }
        .hero-headline-text {
          margin-bottom: 18px !important;
          text-align: center;
        }
        .hero-desc-text {
          display: none !important;
        }
        .hero-tags-label {
          display: none !important;
        }
        .hero-intent-bar {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 18px !important;
        }
        .hero-btn {
          padding: 9px 6px !important;
          font-size: 12px !important;
        }
        .hero-search-wrap {
          width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .hero-search {
          padding: 5px 5px 5px 14px !important;
        }
        .hero-search input {
          font-size: 13px !important;
          padding-right: 8px !important;
        }
        .hero-search-btn {
          padding: 9px 18px !important;
          font-size: 12.5px !important;
          flex-shrink: 0;
        }
        .hero-action-btn {
          width: 100%;
          justify-content: center;
          padding: 15px 28px !important;
          font-size: 15px !important;
        }
        .hero-tags-row {
          justify-content: center !important;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const playHoverSound = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playClickSound = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const handleIntentTransition = (targetMode: "hire" | "work" | "edit") => {
    if (targetMode === intent) return;
    playClickSound();

    const currentIdx = INTENT_INDEX[intent];
    const targetIdx = INTENT_INDEX[targetMode];
    setSlideDirection(targetIdx > currentIdx ? "right" : "left");

    setIsSwitching(true);
    setTimeout(() => {
      setIntent(targetMode);
      setIsSwitching(false);
    }, 40);
  };

  const handleSearchAction = () => {
    playClickSound();
    if (intent === "edit") {
      navigate("/signup");
    } else if (intent === "work") {
      setIsGuestMode(true);
      navigate("/jobs/postings", { state: { searchQuery: searchVal.trim() } });
    } else if (intent === "hire") {
      setIsGuestMode(true);
      navigate("/gigs/services", { state: { searchQuery: searchVal.trim() } });
    }
  };

  const dynamicTags = useMemo(() => {
    if (intent === "hire") return { title: "Popular Services:", items: topGigCategories };
    if (intent === "work") return { title: "Popular Jobs:", items: topJobCategories };
    return {
      title: "Video Editing Features:",
      items: ["Real-time Sync", "Auto Dead-Air Clean", "AI Caption Nav", "Multi-cam Edit"],
    };
  }, [intent, topJobCategories, topGigCategories]);

  const animLoad = (delay = 0): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all .8s ${delay}s cubic-bezier(.16,1,.3,1)`,
  });

  return (
    <section id="hero" className="hero-section-shell bg-white dark:bg-[#121214]">
      {/* Background Layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {/* Looping Background Videos (original -> herovid_1 -> herovid_2 -> original every 4s) */}
        {HERO_VIDEOS.map((src, idx) => (
          <video
            key={src}
            ref={(el) => {
              heroVideoRefs.current[idx] = el;
            }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              opacity: activeVideoIdx === idx ? 1 : 0,
              transition: "opacity 0.9s ease-in-out",
            }}
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}

        {/* Theme Overlay */}
        <div
          className="hero-overlay"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
          }}
        />

        {/* Light Mode: Interactive Gradient Blinds */}
        <div
          className="block dark:hidden"
          style={{ position: "absolute", inset: 0, zIndex: 3, opacity: 0.35 }}
        >
          <GradientBlinds
            gradientColors={["#60a5fa", "#fde047", "#d8b4fe", "#60a5fa"]}
            angle={45}
            noise={0.3}
            blindCount={12}
            blindMinWidth={50}
            spotlightRadius={0.5}
            spotlightSoftness={1}
            spotlightOpacity={1}
            mouseDampening={0.15}
            distortAmount={0}
            shineDirection="left"
            mixBlendMode="screen"
          />
        </div>

        {/* Bottom Fade to blend seamlessly with SectionScrollText below */}
        <div
          className="hero-bottom-fade"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "160px",
            zIndex: 4,
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          position: "relative",
          zIndex: 3,
        }}
      >
        <div className="hero-content-col" style={{ maxWidth: "800px" }}>
          {/* 1. EYEBROW BADGE */}
          <div
            className="hero-eyebrow-pill bg-white/50 border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.08]"
            style={{
              ...animLoad(0),
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "100px",
              marginBottom: "20px",
              backdropFilter: "blur(8px)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <div
              className="hero-eyebrow-text text-gray-500 dark:text-[#a1a1aa]"
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              <TrueFocus
                sentence="COLLABORATIVE VIDEO EDITING|& CREATIVE MARKETPLACE"
                separator="|"
                manualMode={false}
                blurAmount={2}
                borderColor="#a1a1aa"
                glowColor="rgba(150, 150, 150, 0.2)"
                animationDuration={0.8}
                pauseBetweenAnimations={2}
              />
            </div>
          </div>

          {/* 2. INTERACTIVE TECH TEXT BRAND TITLE */}
          <div
            role="heading"
            aria-level={1}
            style={{
              ...animLoad(0.06),
              marginBottom: "12px",
              marginLeft: isMobile ? 0 : "-5%",
              position: "relative",
              zIndex: 10,
            }}
            className={`${
              isMobile ? "w-full" : "w-[105%]"
            } max-w-[850px] h-[82px] sm:h-[125px] md:h-[150px] text-gray-900 dark:text-white`}
          >
            <TechText
              text="Ensemble"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight={900}
              fontSize={130}
              letterSpacing={-0.04}
              align={isMobile ? "center" : "left"}
              color={theme === "dark" ? "#ffffff" : "#000000"}
              accentColor={theme === "dark" ? "#ffffff" : "#000000"}
              draggable={true}
              clickKick={true}
              sweep={true}
              labels={true}
              specks={16}
              selection={true}
              guides={false}
              bleed={{ top: 350, bottom: 650, left: 250, right: 900 }}
              intro="none"
            />
          </div>

          {/* 3. DYNAMIC INTENT TAGLINE & DESCRIPTION */}
          <div
            key={`text-${intent}`}
            className={
              isSwitching
                ? "opacity-0"
                : slideDirection === "right"
                ? "slide-from-right"
                : "slide-from-left"
            }
          >
            <h2
              className="hero-headline-text text-gray-900 dark:text-white"
              style={{
                fontSize: "clamp(22px, 3vw, 36px)",
                fontWeight: 700,
                lineHeight: 1.22,
                letterSpacing: "-0.025em",
                marginBottom: "10px",
              }}
            >
              {intent === "hire" && "Work at the speed of your ambition"}
              {intent === "work" && "Find the freedom to secure top tier gigs"}
              {intent === "edit" && "Create high-impact edits in real-time"}
            </h2>

            <p
              className="hero-desc-text text-gray-600 dark:text-[#a1a1aa]"
              style={{
                fontSize: "clamp(14.5px, 1.6vw, 16px)",
                marginBottom: "22px",
                lineHeight: 1.6,
                maxWidth: "580px",
              }}
            >
              {intent === "hire" &&
                "Hire specialized filmmakers and editors who use cutting-edge AI pipelines to transform complex production workflows into high impact outcomes."}
              {intent === "work" &&
                "Gain access to premium global project creators, scale your remote freelance career, and automate empty dead-air cleanups synchronously."}
              {intent === "edit" &&
                "Edit directly in your browser with zero rendering delay. Leverage automated caption markers and audio-syncing with team members simultaneously."}
            </p>
          </div>

          {/* FADING BUTTONS */}
          <div className="hero-intent-bar bg-white/50 border-gray-200 dark:bg-white/[0.03] dark:border-white/10">
            {(["edit", "hire", "work"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleIntentTransition(mode)}
                onMouseEnter={playHoverSound}
                className={`hero-btn ${intent === mode ? "active" : ""} ${
                  !isSwitching && intent === mode ? "fade-only" : ""
                }`}
              >
                I want to {mode}
              </button>
            ))}
          </div>

          {/* SLIDING SEARCH / ACTION AREA */}
          <div
            key={`action-${intent}`}
            className={`hero-search-wrap ${
              isSwitching
                ? "opacity-0"
                : slideDirection === "right"
                ? "slide-from-right"
                : "slide-from-left"
            }`}
            style={{ maxWidth: "580px", marginBottom: "22px" }}
          >
            {intent !== "edit" ? (
              <div
                className="hero-search"
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "100px",
                  padding: "6px 6px 6px 18px",
                  backdropFilter: "blur(16px)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                <Search
                  className="text-gray-400 dark:text-white/40"
                  style={{ width: 18, height: 18, marginRight: 10, flexShrink: 0 }}
                />
                <input
                  type="text"
                  placeholder={
                    intent === "hire"
                      ? "Describe what you need to hire for..."
                      : "Search for available asset listings or jobs..."
                  }
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchAction();
                  }}
                  className="text-gray-900 placeholder-gray-500 dark:text-white dark:placeholder-gray-400"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    paddingRight: 12,
                  }}
                />
                <button
                  onClick={handleSearchAction}
                  onMouseEnter={playHoverSound}
                  className="hero-search-btn"
                  style={{
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "10px 24px",
                    borderRadius: "100px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Search
                </button>
              </div>
            ) : (
              <StarBorder
                as="button"
                onClick={handleSearchAction}
                onMouseEnter={playHoverSound}
                className="hero-action-btn"
                theme="dark"
                backgroundColor={theme === "dark" ? "#0c0c0f" : "#111827"}
                textColor="#ffffff"
                borderColor={theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)"}
                color={theme === "dark" ? "#60a5fa" : "#ffffff"}
                trailColor={theme === "dark" ? "#818cf8" : "#93c5fd"}
                duration={3.5}
                radius={14}
                thickness={1.5}
                stars={2}
                glow={0.8}
                sparkle={true}
                hover="lap"
                clickPulse={true}
                style={{
                  border: "none",
                  padding: "18px 42px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Get Started
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </StarBorder>
            )}
          </div>

          {/* SLIDING TAGS */}
          <div
            key={`tags-${intent}`}
            className={`hero-tags-row ${
              isSwitching
                ? "opacity-0"
                : slideDirection === "right"
                ? "slide-from-right"
                : "slide-from-left"
            }`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              className="hero-tags-label text-gray-500 dark:text-white/40"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {dynamicTags.title}
            </span>
            {dynamicTags.items.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (intent === "work") {
                    playClickSound();
                    setIsGuestMode(true);
                    navigate("/jobs/postings", { state: { category: tag } });
                  } else if (intent === "hire") {
                    playClickSound();
                    setIsGuestMode(true);
                    navigate("/gigs/services", { state: { category: tag } });
                  }
                }}
                disabled={intent === "edit"}
                onMouseEnter={() => {
                  if (intent !== "edit") playHoverSound();
                }}
                className="hero-tag"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: "100px",
                  cursor: intent === "edit" ? "default" : "pointer",
                  transition: "all 0.15s",
                  backdropFilter: "blur(4px)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionHero;
