import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollVelocity from "@/components/ui/ScrollVelocity";
import FadeInScroll from "@/components/ui/FadeInScroll";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

interface ScrollTextProps {
  isMuted?: boolean;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

type AvatarData = { type: "image"; url: string } | { type: "initial"; letter: string };

let avatarRequest: Promise<AvatarData[]> | null = null;
let avatarCache: AvatarData[] | null = null;

function loadRecentAvatars() {
  if (avatarCache) return Promise.resolve(avatarCache);
  if (!avatarRequest) {
    avatarRequest = api
      .get("/api/accounts/recent-avatars")
      .then((response) => {
        const rows =
          response.data?.success && Array.isArray(response.data.data)
            ? response.data.data
            : [];
        avatarCache = rows.map(
          (item: {
            avatar_path?: string | null;
            handle?: string;
            display_name?: string;
            first_name?: string;
          }) => {
            if (item.avatar_path && item.avatar_path.trim() !== "") {
              return {
                type: "image",
                url: `${import.meta.env.VITE_CLOUDFRONT_URL}${
                  item.avatar_path.startsWith("/") ? "" : "/"
                }${item.avatar_path}`,
              };
            } else {
              const nameToUse =
                item.display_name || item.first_name || item.handle || "?";
              return { type: "initial", letter: nameToUse.charAt(0).toUpperCase() };
            }
          }
        );
        return avatarCache;
      })
      .finally(() => {
        avatarRequest = null;
      });
  }
  return avatarRequest;
}

const AnimatedCounter: React.FC<{ targetValue: string; duration?: number }> = ({
  targetValue,
  duration = 2000,
}) => {
  const [count, setCount] = useState<string>("0");

  useEffect(() => {
    const numericPart = parseFloat(targetValue.replace(/[^0-9.]/g, ""));
    const suffix = targetValue.replace(/[0-9.,]/g, "");
    const hasComma = targetValue.includes(",");

    if (isNaN(numericPart)) {
      setCount(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentCount = progress * numericPart;

      let formattedCount = "";
      if (targetValue.includes(".")) {
        formattedCount = currentCount.toFixed(1);
      } else {
        formattedCount = Math.floor(currentCount).toString();
      }

      if (hasComma) {
        formattedCount = Math.floor(currentCount).toLocaleString();
      }

      setCount(`${formattedCount}${suffix}`);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  return <>{count}</>;
};

const AvatarGroup: React.FC = () => {
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    let active = true;
    loadRecentAvatars()
      .then((fetched) => {
        if (active) setAvatars(fetched);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const defaultAvatars: AvatarData[] = [
    { type: "initial", letter: "A" },
    { type: "initial", letter: "M" },
    { type: "initial", letter: "K" },
    { type: "initial", letter: "J" },
    { type: "initial", letter: "R" },
  ];

  const displayAvatars = avatars.length > 0 ? avatars : defaultAvatars;
  const borderColor = isDark ? "#121214" : "#ffffff";
  const initialBg = isDark ? "#27272a" : "#f4f4f5";
  const initialText = isDark ? "#ffffff" : "#111827";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {displayAvatars.slice(0, 5).map((item, i) => (
        <div
          key={i}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `2px solid ${borderColor}`,
            marginLeft: i === 0 ? 0 : -11,
            background:
              item.type === "image"
                ? `url('${item.url}') center/cover`
                : initialBg,
            color: initialText,
            zIndex: 10 - i,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {item.type === "initial" ? item.letter : null}
        </div>
      ))}
    </div>
  );
};

const WHATS_INSIDE_FEATURES = [
  {
    id: "01",
    category: "REAL-TIME WORKSPACE",
    title: "Seamless Collaboration",
    desc: "Collaborate without friction through real-time team editing. No more wasting time on rendering or sending over large files.",
    img: "/gallery_images/new/collab.png",
    video: "/gallery_images/new/vids/vid_collab.mp4",
  },
  {
    id: "02",
    category: "SMART TIMELINE",
    title: "AI Auto Captioning",
    desc: "Type any word or phrase and our AI will pinpoint the clip. Instantly navigate to exactly where it was spoken in your video.",
    img: "/gallery_images/new/captioning.png",
    video: "/gallery_images/new/vids/vid_captioning.mp4",
  },
  {
    id: "03",
    category: "ASSETS & TALENT",
    title: "Creative Marketplace",
    desc: "Buy or sell premium audio, templates, and assets to fuel any production. Browse our job board to hire top talent.",
    img: "/gallery_images/new/asset.png",
    video: "/gallery_images/new/vids/vid_asset.mp4",
  },
  {
    id: "04",
    category: "AUTOMATED ROUGH CUT",
    title: "Auto Dead-Air Cleanup",
    desc: "Remove silence with a single click to streamline your edit. Keep your viewers engaged and get your content ready for export.",
    img: "/gallery_images/new/deadair.png",
    video: "/gallery_images/new/vids/vid_deadair.mp4",
  },
  {
    id: "05",
    category: "LIVE MILESTONES",
    title: "Dynamic Progress Tracking",
    desc: "Monitor every milestone with an intuitive, live visual dashboard. Track task completion and ensure your content is ready.",
    img: "/gallery_images/new/track.png",
    video: "/gallery_images/new/vids/vid_track.mp4",
  },
  {
    id: "06",
    category: "DIRECT SYNC",
    title: "Integrated Chat and Embedded Video Call",
    desc: "Conduct interviews or team meetings with high-quality video. Streamline your hiring and feedback without leaving the app.",
    img: "/gallery_images/new/videochat.png",
    video: "/gallery_images/new/vids/vid_videochat.mp4",
  },
];

const FeatureCellCard: React.FC<{
  item: (typeof WHATS_INSIDE_FEATURES)[number];
  isDark: boolean;
  borderLine: string;
  textPrimary: string;
  textSecondary: string;
  textMeta: string;
  onHoverSound: () => void;
}> = ({
  item,
  isDark,
  borderLine,
  textPrimary,
  textSecondary,
  textMeta,
  onHoverSound,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Auto-play & loop the video the moment the user scrolls to this card
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isInView && !isHovered) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isInView, isHovered]);

  const handleMouseEnter = () => {
    onHoverSound();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className="whats-inside-cell"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cell Top Micro-Bar (Category Left | Number Right) */}
      <div
        className="whats-inside-cell-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 22px",
          borderBottom: `1px solid ${borderLine}`,
        }}
      >
        <span
          className="whats-inside-cell-cat"
          style={{
            fontFamily: T.fontMono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: textMeta,
          }}
        >
          {item.category}
        </span>
        <span
          className="whats-inside-cell-num"
          style={{
            fontFamily: T.fontMono,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: textMeta,
          }}
        >
          {item.id}
        </span>
      </div>

      {/* Full-Bleed Auto-Looping Video (Turns into Static Picture on Hover) */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9.5",
          overflow: "hidden",
          borderBottom: `1px solid ${borderLine}`,
          background: isDark ? "#18181b" : "#f4f4f5",
          position: "relative",
        }}
      >
        <video
          ref={videoRef}
          src={item.video}
          poster={item.img}
          muted
          loop
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: isHovered ? 0 : 1,
            transition: "opacity 0.22s ease",
            pointerEvents: "none",
          }}
        />
        <img
          src={item.img}
          alt={item.title}
          className="whats-inside-cell-img"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.22s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Bottom Copy Block (Compact & Crisp) */}
      <div
        className="whats-inside-cell-body"
        style={{
          padding: "18px 22px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        <h3
          className="whats-inside-cell-title"
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: textPrimary,
            marginBottom: 6,
            lineHeight: 1.25,
          }}
        >
          {item.title}
        </h3>
        <p
          className="whats-inside-cell-desc"
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 13.5,
            lineHeight: 1.5,
            fontWeight: 500,
            color: textSecondary,
            margin: 0,
          }}
        >
          {item.desc}
        </p>
      </div>
    </div>
  );
};

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

const SectionScrollText: React.FC<ScrollTextProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const blissHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    blissHoverAudioRef.current = new Audio("/sounds/blisshover.mp3");
    blissHoverAudioRef.current.volume = 0.25;

    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    minimalHoverAudioRef.current.volume = 0.2;

    clickAudioRef.current = new Audio("/sounds/popclick.mp3");
    clickAudioRef.current.volume = 0.3;
  }, []);

  const playBlissHover = () => {
    if (isMuted || !blissHoverAudioRef.current) return;
    blissHoverAudioRef.current.currentTime = 0;
    blissHoverAudioRef.current.play().catch(() => {});
  };

  const playMinimalHover = () => {
    if (isMuted || !minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const playClickSound = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";
  const bgSurface = isDark ? "#121214" : "#ffffff";
  const bgCellHover = isDark ? "#18181b" : "#f9fafb";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <section
      id="features"
      style={{
        background: isDark ? "#121214" : "#ffffff",
        borderTop: `1px solid ${borderLine}`,
        width: "100%",
        position: "relative",
        transition: "background 0.3s ease, border-color 0.3s ease",
        fontFamily: T.fontDisplay,
      }}
    >
      <style>{`
        @keyframes morphColors {
          0% {
            color: #3b82f6;
            text-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
          }
          33% {
            color: #a855f7;
            text-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
          }
          66% {
            color: #ec4899;
            text-shadow: 0 0 25px rgba(236, 72, 153, 0.5);
          }
          100% {
            color: #3b82f6;
            text-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
          }
        }

        .hover-marquee .row-wrapper .parallax span {
          color: ${isDark ? "#3f3f46" : "#cbd5e1"};
          opacity: 0.8;
          filter: blur(0.5px);
          transition:
            opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            filter 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            color 0.4s ease;
        }

        .hover-marquee .row-wrapper:hover .parallax span {
          opacity: 1;
          filter: blur(0px);
          animation: morphColors 3s linear infinite;
        }

        .whats-inside-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
        }

        .whats-inside-cell {
          border-right: 1px solid ${borderLine};
          border-bottom: 1px solid ${borderLine};
          transition: background 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          background: ${bgSurface};
        }

        .whats-inside-cell:nth-child(3n) {
          border-right: none;
        }

        .whats-inside-cell:hover {
          background: ${bgCellHover};
        }

        .whats-inside-cell-img {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .whats-inside-cell:hover .whats-inside-cell-img {
          transform: scale(1.03);
        }

        .whats-inside-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
          border-bottom: 1px solid ${borderLine};
        }

        .whats-inside-stat-cell {
          border-right: 1px solid ${borderLine};
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: background 0.2s ease;
        }

        .whats-inside-stat-cell:last-child {
          border-right: none;
        }

        .whats-inside-stat-cell:hover {
          background: ${bgCellHover};
        }

        @media (max-width: 960px) {
          .whats-inside-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .whats-inside-cell:nth-child(2n+1) {
            border-right: 1px solid ${borderLine} !important;
          }
          .whats-inside-cell:nth-child(2n) {
            border-right: none !important;
          }
          .whats-inside-stats-grid {
            grid-template-columns: 1fr;
          }
          .whats-inside-stat-cell {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
            padding: 20px 18px;
          }
          .whats-inside-stat-cell:last-child {
            border-bottom: none;
          }
        }
        @media (max-width: 640px) {
          .whats-inside-cell-bar {
            padding: 6px 10px !important;
          }
          .whats-inside-cell-cat {
            font-size: 7.5px !important;
            letter-spacing: 0.08em !important;
          }
          .whats-inside-cell-num {
            font-size: 8px !important;
          }
          .whats-inside-cell-body {
            padding: 10px 10px 12px !important;
          }
          .whats-inside-cell-title {
            font-size: 12.5px !important;
            margin-bottom: 4px !important;
            line-height: 1.2 !important;
          }
          .whats-inside-cell-desc {
            font-size: 10.5px !important;
            line-height: 1.38 !important;
          }
          .whats-inside-lead-copy {
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
        }
      `}</style>

      {/* ─── Architectural Blueprint Frame: "What's inside." + Marquee Strip ─── */}
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderLeft: `1px solid ${borderLine}`,
          borderRight: `1px solid ${borderLine}`,
          borderBottom: `1px solid ${borderLine}`,
          background: bgSurface,
          position: "relative",
        }}
      >
        {/* Corner Crosshairs */}
        <Crosshair top left color={crosshairColor} />
        <Crosshair top right color={crosshairColor} />
        <Crosshair bottom left color={crosshairColor} />
        <Crosshair bottom right color={crosshairColor} />

        {/* Section Top Telemetry Header Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px clamp(18px, 4vw, 40px)",
            borderBottom: `1px solid ${borderLine}`,
            fontFamily: T.fontDisplay,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: textMeta,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>02 / HIGHLIGHTS</span>
          <span>VIDEO EDITOR &amp; MARKETPLACE</span>
        </div>

        {/* ─── ROW 1: Merged Header & Lead Copy across all 3 columns ─── */}
        <FadeInScroll distance={24} duration={0.7}>
          <div
            style={{
              padding: "clamp(36px, 6vw, 64px) clamp(18px, 4vw, 40px)",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <h2
              style={{
                fontFamily: T.fontDisplay,
                fontSize: "clamp(38px, 5vw, 60px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: textPrimary,
                margin: 0,
              }}
            >
              What&apos;s <span style={{ color: "#3b82f6" }}>inside</span>.
            </h2>

            <p
              className="whats-inside-lead-copy"
              style={{
                fontFamily: T.fontDisplay,
                fontSize: "clamp(16px, 1.6vw, 20px)",
                lineHeight: 1.6,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 880,
                margin: 0,
              }}
            >
              Ensemble is a place where video editors and creators team up easily. Work
              together in real-time, find jobs, hire talent securely, and use AI to speed
              up your editing—all in one place without the usual headaches.
            </p>
          </div>
        </FadeInScroll>

        {/* ─── ROWS 2 & 3: 6 Crisp Feature Cells (01 - 06) with Top Header Bar + Edge-to-Edge Image/Video + Copy ─── */}
        <div className="whats-inside-grid">
          {WHATS_INSIDE_FEATURES.map((item) => (
            <FeatureCellCard
              key={item.id}
              item={item}
              isDark={isDark}
              borderLine={borderLine}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMeta={textMeta}
              onHoverSound={playMinimalHover}
            />
          ))}
        </div>

        {/* ─── ROW 4: 3-Column Stats Row (+N users with Join, Rating, Videos Created) ─── */}
        <div className="whats-inside-stats-grid">
          {/* Stat Col 1: +N Users + Avatars + Join Button */}
          <div className="whats-inside-stat-cell" onMouseEnter={playMinimalHover}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <AvatarGroup />
              <div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 18,
                    fontWeight: 800,
                    color: textPrimary,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  +<AnimatedCounter targetValue="4,824" duration={2000} />{" "}
                  <span style={{ fontWeight: 600, fontSize: 15 }}>users</span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: textMeta,
                    marginTop: 4,
                  }}
                >
                  Active Community
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                navigate("/signup");
              }}
              style={{
                background: isDark ? "#ffffff" : "#0f172a",
                color: isDark ? "#0b0c10" : "#ffffff",
                border: "none",
                borderRadius: 0,
                padding: "9px 18px",
                fontFamily: T.fontDisplay,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                playMinimalHover();
                e.currentTarget.style.background = "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#ffffff" : "#0f172a";
                e.currentTarget.style.color = isDark ? "#0b0c10" : "#ffffff";
              }}
            >
              Join
            </button>
          </div>

          {/* Stat Col 2: Satisfaction / Rating */}
          <div className="whats-inside-stat-cell" onMouseEnter={playMinimalHover}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: `1px solid ${borderLine}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 18,
                    fontWeight: 800,
                    color: textPrimary,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  4.8 Stars{" "}
                  <span
                    style={{
                      fontSize: 13,
                      color: textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    (897)
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: textMeta,
                    marginTop: 4,
                  }}
                >
                  Rating &amp; Satisfaction
                </div>
              </div>
            </div>

            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 600,
                color: textMeta,
              }}
            >
              VERIFIED
            </span>
          </div>

          {/* Stat Col 3: Videos Created */}
          <div className="whats-inside-stat-cell" onMouseEnter={playMinimalHover}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: `1px solid ${borderLine}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 18,
                    fontWeight: 800,
                    color: textPrimary,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  <AnimatedCounter targetValue="1.2k+" duration={2000} />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: textMeta,
                    marginTop: 4,
                  }}
                >
                  Videos Created
                </div>
              </div>
            </div>

            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 600,
                color: textMeta,
              }}
            >
              EXPORTED
            </span>
          </div>
        </div>

        {/* ─── Scrolling Text Marquee Framed Directly Above 03 / WORKFLOW ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 40px",
            borderBottom: `1px solid ${borderLine}`,
            fontFamily: T.fontDisplay,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: textMeta,
          }}
        >
          <span>ECOSYSTEM CAPABILITIES</span>
          <span>REAL-TIME ENGINE</span>
        </div>

        <div
          className="hover-marquee"
          style={{
            padding: "40px 0",
            background: isDark ? "#121214" : "#ffffff",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div className="row-wrapper" onMouseEnter={playBlissHover} style={{ width: "100%" }}>
            <ScrollVelocity
              texts={["COLLABORATIVE EDITING - BUILT FOR VIDEO EDITORS - LESS FRICTION WORKFLOW"]}
              velocity={60}
              numCopies={5}
              scrollerStyle={{
                display: "flex",
                whiteSpace: "nowrap",
                fontFamily: T.fontDisplay,
                fontSize: "clamp(2rem, 2.8vw, 3.6rem)",
                lineHeight: "1",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            />
          </div>

          <div className="row-wrapper" onMouseEnter={playBlissHover} style={{ width: "100%" }}>
            <ScrollVelocity
              texts={["INTEGRATED JOB & GIGS - ASSET MARKETPLACE - INTEGRATED CHAT SYSTEM"]}
              velocity={-60}
              numCopies={5}
              scrollerStyle={{
                display: "flex",
                whiteSpace: "nowrap",
                fontFamily: T.fontDisplay,
                fontSize: "clamp(2rem, 2.8vw, 3.6rem)",
                lineHeight: "1",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionScrollText;
