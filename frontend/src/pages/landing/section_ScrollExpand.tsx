import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";
import {
  Megaphone,
  Play,
  Smartphone,
  PenTool,
  Briefcase,
  Gamepad2,
  Plane,
  Music,
  Heart,
  Calendar,
  Lightbulb,
  Film,
  Clapperboard,
  Popcorn,
  Mic,
  Trophy,
  Scissors,
  Tv,
  Theater,
  BookOpen,
  Eye,
  Zap,
  Presentation,
  Camera,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface ScrollExpandSectionProps {
  isMuted?: boolean;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const USE_CASE_TRACKS = [
  {
    id: "01",
    tag: "CLIENT & FREELANCERS",
    title: "Hire a Freelancer or Team in 2 Ways",
    desc: "Post a Job to review proposals, shortlist & approve an individual or team proposal, and offer a contract—or browse Discovery and Gigs / Services, order a service, and once the freelancer accepts your order, offer the contract to hire them.",
    route: "/landing/usecase/client",
    cta: "EXPLORE CLIENT USE CASE",
    bgVideo: "/gallery_images/new/vids/vid_track.mp4",
  },
  {
    id: "02",
    tag: "FREELANCERS & ARTISTS",
    title: "Monetize Your Editing, Color & VFX Skills",
    desc: "Submit individual or team proposals to open Job posts, or publish your own Gigs / Services—once you accept a client's service order or get approved on a proposal, sign the contract and get paid in credits.",
    route: "/landing/usecase/freelancer",
    cta: "EXPLORE FREELANCER USE CASE",
    bgVideo: "/gallery_images/new/vids/vid_collab.mp4",
  },
  {
    id: "03",
    tag: "ASSET CREATORS",
    title: "Sell Template Videos, Bundles, Images, Videos & Audios",
    desc: "Upload and monetize template videos, asset bundles, images, videos, and audio packs on the Asset Marketplace / Asset Library, and earn credits on every download.",
    route: "/landing/usecase/asset-creator",
    cta: "EXPLORE ASSET CREATOR USE CASE",
    bgVideo: "/gallery_images/new/vids/vid_asset.mp4",
  },
  {
    id: "04",
    tag: "CREATORS & ENTHUSIASTS",
    title: "Edit in the Browser with AI & Team Sync",
    desc: "Use AI auto-captioning, single-click dead-air cleanup, and multi-user timeline sync to cut YouTube, TikTok, and short-form content faster.",
    route: "/landing/usecase/enthusiast",
    cta: "EXPLORE STUDIO USE CASE",
    bgVideo: "/gallery_images/new/vids/vid_captioning.mp4",
  },
];

const CATEGORIES = [
  { label: "Ads & Social", icon: Megaphone },
  { label: "Youtube Videos", icon: Play },
  { label: "Tiktoks", icon: Smartphone },
  { label: "Design", icon: PenTool },
  { label: "Corporate Videos", icon: Briefcase },
  { label: "Gaming Videos", icon: Gamepad2 },
  { label: "Family & Travel", icon: Plane },
  { label: "Music Videos", icon: Music },
  { label: "Wedding", icon: Heart },
  { label: "Events", icon: Calendar },
  { label: "Explainer Videos", icon: Lightbulb },
  { label: "Showreels", icon: Film },
  { label: "Fiction Films", icon: Clapperboard },
  { label: "Movie Trailers", icon: Popcorn },
  { label: "Podcast", icon: Mic },
  { label: "Sports Video", icon: Trophy },
  { label: "Montages", icon: Scissors },
  { label: "Anime Edits", icon: Tv },
  { label: "Short Drama", icon: Theater },
  { label: "Tutorial Videos", icon: BookOpen },
  { label: "Teaser Videos", icon: Eye },
  { label: "Animation", icon: Zap },
  { label: "Presentation", icon: Presentation },
  { label: "Cinematic", icon: Camera },
  { label: "Others", icon: Sparkles },
];

const ROW_1 = CATEGORIES.slice(0, 8);
const ROW_2 = CATEGORIES.slice(8, 17);
const ROW_3 = CATEGORIES.slice(17, 25);

const Crosshair: React.FC<{
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  color: string;
}> = ({ top, bottom, left, right, color }) => (
  <span
    aria-hidden="true"
    style={{
      position: "absolute",
      top: top ? -6 : undefined,
      bottom: bottom ? -6 : undefined,
      left: left ? -6 : undefined,
      right: right ? -6 : undefined,
      width: 11,
      height: 11,
      pointerEvents: "none",
      zIndex: 4,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 5,
        left: 0,
        width: 11,
        height: 1,
        background: color,
      }}
    />
    <span
      style={{
        position: "absolute",
        top: 0,
        left: 5,
        width: 1,
        height: 11,
        background: color,
      }}
    />
  </span>
);

const TickerRow = ({
  items,
  direction = "left",
  isDark = true,
  borderLine,
  onSelectCategory,
  onHover,
}: {
  items: typeof CATEGORIES;
  direction?: "left" | "right";
  isDark?: boolean;
  borderLine: string;
  onSelectCategory: (label: string) => void;
  onHover: () => void;
}) => {
  const duplicatedItems = [...items, ...items, ...items];
  const animationClass =
    direction === "left" ? "usecase-marquee-left" : "usecase-marquee-right";

  const bg = isDark ? "#18181b" : "#f9fafb";
  const color = isDark ? "#e4e4e7" : "#111827";
  const hoverBg = isDark ? "rgba(59, 130, 246, 0.14)" : "rgba(59, 130, 246, 0.08)";

  return (
    <div className="usecase-marquee-container">
      <div className={animationClass}>
        {duplicatedItems.map(({ label, icon: Icon }, i) => (
          <button
            key={`${label}-${i}`}
            className="usecase-ticker-btn"
            onClick={() => onSelectCategory(label)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: bg,
              border: `1px solid ${borderLine}`,
              borderRadius: 0,
              color: color,
              fontFamily: T.fontDisplay,
              fontSize: 13.5,
              fontWeight: 700,
              padding: "12px 20px",
              cursor: "pointer",
              transition: "all 0.18s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              onHover();
              e.currentTarget.style.background = hoverBg;
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.color = isDark ? "#ffffff" : "#1d4ed8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = bg;
              e.currentTarget.style.borderColor = borderLine;
              e.currentTarget.style.color = color;
            }}
          >
            <Icon size={15} style={{ color: "#3b82f6" }} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const SectionScrollExpand: React.FC<ScrollExpandSectionProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const setIsGuestMode = useGlobalState((state) => state.setIsGuestMode);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    hoverAudioRef.current.volume = 0.2;

    clickAudioRef.current = new Audio("/sounds/softclick.mp3");
    clickAudioRef.current.volume = 0.35;
  }, []);

  const playHover = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playClick = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const handleCategoryClick = (categoryLabel: string) => {
    playClick();
    setIsGuestMode(true);
    navigate("/gigs/services", { state: { category: categoryLabel } });
  };

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";
  const bgSection = isDark ? "#121214" : "#ffffff";
  const bgFrame = isDark ? "#121214" : "#ffffff";
  const bgCellHover = isDark ? "#18181b" : "#f9fafb";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <section
      id="scroll-expand-showcase"
      style={{
        position: "relative",
        background: bgSection,
        borderTop: `1px solid ${borderLine}`,
        marginTop: -1,
        transition: "background 0.3s ease",
        fontFamily: T.fontDisplay,
      }}
    >
      <style>{`
        @keyframes usecase-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes usecase-scroll-right {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .usecase-marquee-container {
          display: flex;
          overflow: hidden;
          width: 100%;
        }
        .usecase-marquee-left {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: usecase-scroll-left 38s linear infinite;
        }
        .usecase-marquee-right {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: usecase-scroll-right 38s linear infinite;
        }
        .usecase-marquee-left:hover,
        .usecase-marquee-right:hover {
          animation-play-state: paused;
        }
        .usecase-tracks-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: 100%;
          border-bottom: 1px solid ${borderLine};
        }
        .usecase-track-cell {
          border-right: 1px solid ${borderLine};
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
          cursor: pointer;
          transition: background 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .usecase-track-cell:last-child {
          border-right: none;
        }
        .usecase-track-cell:hover {
          background: ${bgCellHover};
        }
        .usecase-cell-bg-vid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: ${isDark ? 0.22 : 0.14};
          transition: opacity 0.3s ease, transform 0.5s ease;
          pointer-events: none;
          z-index: 0;
        }
        .usecase-track-cell:hover .usecase-cell-bg-vid {
          opacity: ${isDark ? 0.34 : 0.22};
          transform: scale(1.04);
        }
        @media (max-width: 1080px) {
          .usecase-tracks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .usecase-track-cell:nth-child(2n+1) {
            border-right: 1px solid ${borderLine} !important;
          }
          .usecase-track-cell:nth-child(2n) {
            border-right: none !important;
          }
          .usecase-track-cell:nth-child(1),
          .usecase-track-cell:nth-child(2) {
            border-bottom: 1px solid ${borderLine};
          }
        }
        @media (max-width: 640px) {
          .usecase-tracks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .usecase-track-cell {
            padding: 14px 12px !important;
            gap: 14px !important;
          }
          .usecase-lead-copy {
            font-size: 12.5px !important;
            line-height: 1.45 !important;
          }
          .usecase-cell-top {
            margin-bottom: 8px !important;
          }
          .usecase-cell-tag {
            font-size: 7.5px !important;
            letter-spacing: 0.08em !important;
          }
          .usecase-cell-id {
            font-size: 8px !important;
          }
          .usecase-cell-title {
            font-size: 12.5px !important;
            margin-bottom: 5px !important;
            line-height: 1.22 !important;
          }
          .usecase-cell-desc {
            font-size: 10.5px !important;
            line-height: 1.38 !important;
          }
          .usecase-cell-cta {
            font-size: 8px !important;
            padding-top: 10px !important;
            letter-spacing: 0.06em !important;
          }
          .usecase-ticker-btn {
            padding: 8px 12px !important;
            font-size: 11px !important;
            gap: 6px !important;
          }
          .usecase-ticker-meta {
            font-size: 9px !important;
            letter-spacing: 0.1em !important;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderLeft: `1px solid ${borderLine}`,
          borderRight: `1px solid ${borderLine}`,
          borderBottom: `1px solid ${borderLine}`,
          background: bgFrame,
          position: "relative",
        }}
      >
        <Crosshair bottom left color={crosshairColor} />
        <Crosshair bottom right color={crosshairColor} />

        {/* Telemetry Header Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px clamp(18px, 4vw, 40px)",
            borderBottom: `1px solid ${borderLine}`,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: textMeta,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>04 / USE CASES</span>
          <span>SPECIALIZED PRODUCTION CATEGORIES</span>
        </div>

        <FadeInScroll distance={24} duration={0.7}>
          {/* Section Header Row */}
          <div
            style={{
              padding: "clamp(36px, 5vw, 56px) clamp(18px, 4vw, 40px)",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(34px, 4.5vw, 54px)",
                fontWeight: 800,
                color: textPrimary,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                margin: 0,
              }}
            >
              Built for every <span style={{ color: "#3b82f6" }}>creative</span> use case.
            </h2>
            <p
              className="usecase-lead-copy"
              style={{
                fontSize: "clamp(15px, 1.5vw, 18px)",
                lineHeight: 1.6,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 780,
                margin: 0,
              }}
            >
              Discover the right workflow for your next production. Explore role-based tracks
              or pick a video category below to browse verified editors, creators, and assets.
            </p>
          </div>

          {/* 4-Column Role Use Case Grid (Matching Reference Image 2 "THE FAMILY" Cells) */}
          <div className="usecase-tracks-grid">
            {USE_CASE_TRACKS.map((track) => (
              <div
                key={track.id}
                className="usecase-track-cell group"
                onClick={() => {
                  playClick();
                  navigate(track.route);
                }}
                onMouseEnter={playHover}
              >
                <video
                  src={track.bgVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="usecase-cell-bg-vid"
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: isDark
                      ? "linear-gradient(180deg, rgba(18,18,20,0.84) 0%, rgba(18,18,20,0.68) 55%, rgba(18,18,20,0.88) 100%)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.75) 55%, rgba(255,255,255,0.92) 100%)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div
                    className="usecase-cell-top"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <span
                      className="usecase-cell-tag"
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        color: "#3b82f6",
                      }}
                    >
                      {track.tag}
                    </span>
                    <span
                      className="usecase-cell-id"
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 11,
                        fontWeight: 600,
                        color: textMeta,
                      }}
                    >
                      {track.id}
                    </span>
                  </div>

                  <h3
                    className="usecase-cell-title"
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: textPrimary,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.3,
                      marginBottom: 12,
                    }}
                  >
                    {track.title}
                  </h3>

                  <p
                    className="usecase-cell-desc"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: textSecondary,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {track.desc}
                  </p>
                </div>

                <div
                  className="usecase-cell-cta"
                  style={{
                    position: "relative",
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: T.fontMono,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: textPrimary,
                    paddingTop: 16,
                    borderTop: `1px solid ${borderLine}`,
                  }}
                >
                  <span>{track.cta}</span>
                  <ArrowUpRight size={13} style={{ color: "#3b82f6", flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Instant 3-Row Categories Ticker Strip Framed Inside Blueprint */}
          <div
            style={{
              padding: "28px 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflow: "hidden",
              background: isDark ? "#121214" : "#ffffff",
            }}
          >
            <div
              className="usecase-ticker-meta"
              style={{
                padding: "0 clamp(18px, 4vw, 40px) 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              <span>POPULAR PRODUCTION CATEGORIES (25)</span>
              <span>CLICK ANY CATEGORY TO EXPLORE MARKETPLACE</span>
            </div>

            <TickerRow
              items={ROW_1}
              direction="left"
              isDark={isDark}
              borderLine={borderLine}
              onSelectCategory={handleCategoryClick}
              onHover={playHover}
            />
            <TickerRow
              items={ROW_2}
              direction="right"
              isDark={isDark}
              borderLine={borderLine}
              onSelectCategory={handleCategoryClick}
              onHover={playHover}
            />
            <TickerRow
              items={ROW_3}
              direction="left"
              isDark={isDark}
              borderLine={borderLine}
              onSelectCategory={handleCategoryClick}
              onHover={playHover}
            />
          </div>
        </FadeInScroll>
      </div>
    </section>
  );
};

export default SectionScrollExpand;
