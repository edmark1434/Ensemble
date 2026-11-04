import useGlobalState from "@/lib/global_state";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Send,
  CheckCircle2,
  MessageSquareHeart,
  Star,
  MessageSquarePlus,
  Tag,
} from "lucide-react";
import confetti from "canvas-confetti";
import GradientASCII from "@/components/ui/GradientASCII";
import GlideSelect from "@/components/ui/GlideSelect";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const FEATURE_VIDEOS = [
  "/gallery_images/new/vids/vid_asset.mp4",
  "/gallery_images/new/vids/vid_captioning.mp4",
  "/gallery_images/new/vids/vid_collab.mp4",
  "/gallery_images/new/vids/vid_deadair.mp4",
  "/gallery_images/new/vids/vid_track.mp4",
  "/gallery_images/new/vids/vid_videochat.mp4",
] as const;

const constructAvatarUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  if (cloudfrontUrl) {
    return `${cloudfrontUrl}/${cleanPath}`;
  }
  return `/${cleanPath}`;
};

const getFallbackAvatar = (name?: string): string => {
  const cleanName = encodeURIComponent((name || "User").trim());
  return `https://ui-avatars.com/api/?name=${cleanName}&background=71717a&color=fff&size=128`;
};

const getSubscriptionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "premium":
      return "/icons/subscription/premium.png";
    case "business":
      return "/icons/subscription/studio.png";
    default:
      return "/icons/subscription/freemium.png";
  }
};

const CATEGORIES = ["General Insight", "Feature Request", "Bug Report", "UI/UX Suggestion"];

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
      left: left ? -5 : undefined,
      right: right ? -5 : undefined,
      fontFamily: T.fontMono,
      fontSize: 12,
      lineHeight: 1,
      color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: 5,
    }}
  >
    +
  </span>
);

const triggerCelebrationConfetti = () => {
  confetti.reset();
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 99999,
  };

  const fire = (particleRatio: number, opts: confetti.Options) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  };

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

const PageSendAFeedback: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const user = useGlobalState((state) => state.user);
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const isVerified = useGlobalState((state) => state.isVerified) || user?.is_verified || false;

  const navigate = useNavigate();

  // UI State
  const [activeTab, setActiveTab] = useState<"rating" | "suggestion">("rating");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeVideoIdx, setActiveVideoIdx] = useState(() =>
    Math.floor(Math.random() * FEATURE_VIDEOS.length)
  );

  // Rating State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [initialRating, setInitialRating] = useState<number | null>(null);

  // Suggestion State
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  // Subtle Landing Audio
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
      hoverAudioRef.current.volume = 0.15;
    }
    if (!softClickAudioRef.current) {
      softClickAudioRef.current = new Audio("/sounds/softclick.mp3");
      softClickAudioRef.current.volume = 0.35;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playClick = useCallback(() => {
    initAudio();
    if (softClickAudioRef.current) {
      softClickAudioRef.current.currentTime = 0;
      softClickAudioRef.current.play().catch(() => {});
    }
  }, []);

  const pickRandomNextVideo = useCallback(() => {
    setActiveVideoIdx((prev) => {
      if (FEATURE_VIDEOS.length <= 1) return prev;
      let next = prev;
      while (next === prev) {
        next = Math.floor(Math.random() * FEATURE_VIDEOS.length);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      pickRandomNextVideo();
    }, 8000);
    return () => {
      window.clearInterval(interval);
      confetti.reset();
    };
  }, [pickRandomNextVideo]);

  const name = user?.display_name || user?.displayName || user?.username || "Ensemble User";
  const email = user?.email || "";
  const userSubscriptionPlan = user?.subscription_plan || "Free";

  const rawAvatar =
    user?.avatar_preset_url ||
    user?.avatar_url ||
    user?.avatar ||
    user?.photoURL ||
    user?.profile_picture ||
    user?.profilePicture;
  const avatar = constructAvatarUrl(rawAvatar) || getFallbackAvatar(name);

  // Fetch initial rating on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchRating = async () => {
      try {
        const res = await api.get("/api/feedbacks/rating");
        if (res.data?.rating) {
          setRating(res.data.rating);
          setInitialRating(res.data.rating);
        }
      } catch (err) {
        console.error("Failed to fetch rating:", err);
      }
    };
    fetchRating();
  }, [isAuthenticated]);

  const handleSubmitRating = async () => {
    if (!rating) return;
    setIsSubmitting(true);
    try {
      await api.put("/api/feedbacks/rating", { rating });
      setInitialRating(rating);
      triggerCelebrationConfetti();
      showSuccessToast("Your global rating has been updated!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      showErrorToast("Failed to update rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post("/api/feedbacks", {
        category,
        message: feedback.trim(),
      });
      setFeedback("");
      triggerCelebrationConfetti();
      showSuccessToast("Feedback received! Thank you.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      showErrorToast("Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageBg = isDark ? "#121214" : "#ffffff";
  const panelBg = isDark ? "rgba(18, 18, 20, 0.74)" : "rgba(255, 255, 255, 0.78)";
  const subSurfaceBg = isDark ? "rgba(24, 24, 28, 0.68)" : "rgba(248, 250, 252, 0.78)";
  const inputBg = isDark ? "rgba(12, 13, 18, 0.85)" : "rgba(255, 255, 255, 0.92)";
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.14)";
  const textPrimary = isDark ? "#ffffff" : "#09090b";
  const textSecondary = isDark ? "#d4d4d8" : "#27272a";
  const textMeta = isDark ? "#a1a1aa" : "#52525b";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.48)" : "rgba(0, 0, 0, 0.45)";
  const accentColor = "#3b82f6";

  return (
    <main
      style={{
        background: pageBg,
        minHeight: "100vh",
        color: textPrimary,
        fontFamily: T.fontDisplay,
        padding: "48px 0 96px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* GradientASCII Ambient Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
        }}
      >
        <GradientASCII
          lightMode={!isDark}
          scale={1.45}
          density={0.9}
          glyphOpacity={0.95}
          glow={0.35}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
        .bp-fb-shell {
          max-width: 980px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 2;
        }
        .bp-fb-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${panelBg};
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .bp-fb-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid ${borderLine};
        }
        .bp-fb-tab {
          appearance: none;
          border: none;
          border-right: 1px solid ${borderLine};
          background: transparent;
          padding: 18px 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: left;
          transition: background 0.18s ease;
        }
        .bp-fb-tab:last-child {
          border-right: none;
        }
        .bp-fb-tab:hover {
          background: ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)"};
        }
        .bp-fb-input {
          width: 100%;
          border: 1px solid ${borderLine};
          border-radius: 0;
          background: ${inputBg};
          color: ${textPrimary};
          font-family: ${T.fontDisplay};
          font-size: 14px;
          padding: 14px 16px;
          outline: none;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .bp-fb-input:focus {
          border-color: ${accentColor};
        }
        .bp-fb-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .bp-fb-submit {
          width: 100%;
          border: none;
          border-radius: 0;
          padding: 16px 28px;
          background: ${isDark ? "#ffffff" : "#09090b"};
          color: ${isDark ? "#09090b" : "#ffffff"};
          font-family: ${T.fontMono};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
        }
        .bp-fb-submit:hover:not(:disabled) {
          background: ${accentColor};
          color: #ffffff;
        }
        .bp-fb-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .bp-fb-shell {
            padding: 0 14px;
          }
          .bp-fb-tabs {
            grid-template-columns: 1fr;
          }
          .bp-fb-tab {
            border-right: none;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-fb-tab:last-child {
            border-bottom: none;
          }
        }
      `}</style>

      <div className="bp-fb-shell animate-fade-in">
        <div className="bp-fb-frame">
          <Crosshair top left color={crosshairColor} />
          <Crosshair top right color={crosshairColor} />
          <Crosshair bottom left color={crosshairColor} />
          <Crosshair bottom right color={crosshairColor} />

          {/* Top Blueprint Navigation Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 24px",
              borderBottom: `1px solid ${borderLine}`,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              onClick={() => {
                playClick();
                navigate(-1);
              }}
              onMouseEnter={playHover}
              style={{
                background: "transparent",
                border: "none",
                color: textPrimary,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: 0,
              }}
            >
              <ArrowLeft size={14} /> BACK TO ENSEMBLE
            </button>

            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              COMMUNITY // FEEDBACK CENTER
            </span>
          </div>

          {/* Architectural Hero Header Banner with Looping Video Accent */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "clamp(28px, 4.5vw, 44px) clamp(22px, 4vw, 40px)",
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <video
              key={`banner-${FEATURE_VIDEOS[activeVideoIdx]}`}
              src={FEATURE_VIDEOS[activeVideoIdx]}
              autoPlay
              muted
              playsInline
              onEnded={pickRandomNextVideo}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isDark ? 0.85 : 0.82,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: isDark
                  ? "linear-gradient(90deg, rgba(18, 18, 20, 0.88) 0%, rgba(18, 18, 20, 0.56) 48%, rgba(18, 18, 20, 0.12) 100%)"
                  : "linear-gradient(90deg, rgba(255, 255, 255, 0.90) 0%, rgba(255, 255, 255, 0.60) 48%, rgba(255, 255, 255, 0.10) 100%)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />

            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  border: `1px solid ${accentColor}`,
                  background: isDark ? "rgba(18, 18, 20, 0.7)" : "rgba(255, 255, 255, 0.8)",
                  color: accentColor,
                  fontFamily: T.fontMono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                <MessageSquareHeart size={13} />
                <span>FEEDBACK TELEMETRY • GLOBAL RATING & SUGGESTIONS</span>
              </div>

              <h1
                style={{
                  fontSize: "clamp(28px, 4vw, 42px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  margin: "0 0 10px",
                  color: textPrimary,
                }}
              >
                Feedback Center
              </h1>
              <p
                style={{
                  color: textSecondary,
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  maxWidth: 600,
                  margin: 0,
                }}
              >
                Help us shape the future of Ensemble. Update your global rating or submit actionable suggestions to our engineering team.
              </p>
            </div>
          </div>

          {/* User Identity Bar */}
          {isAuthenticated ? (
            <div
              style={{
                padding: "14px clamp(20px, 3.5vw, 32px)",
                background: subSurfaceBg,
                borderBottom: `1px solid ${borderLine}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  style={{
                    height: 38,
                    width: 38,
                    objectFit: "cover",
                    border: `1px solid ${borderLine}`,
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes("ui-avatars.com")) {
                      target.src = getFallbackAvatar(name);
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    height: 38,
                    width: 38,
                    border: `1px solid ${borderLine}`,
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={17} color={textMeta} />
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: textPrimary,
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  {name}
                </p>
                <p
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 11,
                    color: textMeta,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    margin: "3px 0 0",
                  }}
                >
                  <Mail size={10} /> {email || "No email linked"}
                </p>
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  border: `1px solid ${borderLine}`,
                  background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                }}
              >
                <img
                  src={
                    isVerified
                      ? "/icons/verification/lvl2_verified.png"
                      : "/icons/verification/lvl1_verified.png"
                  }
                  alt={isVerified ? "Verified User" : "Unverified User"}
                  style={{ width: 16, height: 16, objectFit: "contain" }}
                  title={isVerified ? "Verified" : "Unverified"}
                />
                <img
                  src={getSubscriptionIcon(userSubscriptionPlan)}
                  alt={`${userSubscriptionPlan} Tier`}
                  style={{
                    width: 16,
                    height: 16,
                    objectFit: "contain",
                    filter: "drop-shadow(0 0 8px rgba(255,255,255,0.15))",
                  }}
                />
                <span
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: textMeta,
                  }}
                >
                  {userSubscriptionPlan}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "14px clamp(20px, 3.5vw, 32px)",
                background: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
                borderBottom: `1px solid ${borderLine}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: isDark ? "#f87171" : "#dc2626",
              }}
            >
              <User size={15} />
              <span>
                You must be logged in to submit feedback or rate the platform.{" "}
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "inherit",
                    fontWeight: 700,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Log in here
                </button>
                .
              </span>
            </div>
          )}

          {/* Blueprint Tab Navigation */}
          <div className="bp-fb-tabs">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab("rating");
              }}
              onMouseEnter={playHover}
              className="bp-fb-tab"
              style={{
                background:
                  activeTab === "rating"
                    ? isDark
                      ? "rgba(59, 130, 246, 0.08)"
                      : "rgba(59, 130, 246, 0.05)"
                    : undefined,
                borderBottom: activeTab === "rating" ? `2px solid ${accentColor}` : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: activeTab === "rating" ? accentColor : textMeta,
                    marginBottom: 4,
                  }}
                >
                  MODULE 01 // SATISFACTION
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: activeTab === "rating" ? textPrimary : textSecondary,
                  }}
                >
                  <Star size={15} />
                  <span>Rate Platform</span>
                </div>
              </div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: activeTab === "rating" ? accentColor : "transparent",
                  border: `1px solid ${activeTab === "rating" ? accentColor : borderLine}`,
                  flexShrink: 0,
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab("suggestion");
              }}
              onMouseEnter={playHover}
              className="bp-fb-tab"
              style={{
                background:
                  activeTab === "suggestion"
                    ? isDark
                      ? "rgba(59, 130, 246, 0.08)"
                      : "rgba(59, 130, 246, 0.05)"
                    : undefined,
                borderBottom: activeTab === "suggestion" ? `2px solid ${accentColor}` : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: activeTab === "suggestion" ? accentColor : textMeta,
                    marginBottom: 4,
                  }}
                >
                  MODULE 02 // ENGINEERING INPUT
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: activeTab === "suggestion" ? textPrimary : textSecondary,
                  }}
                >
                  <MessageSquarePlus size={15} />
                  <span>Submit Feedback</span>
                </div>
              </div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: activeTab === "suggestion" ? accentColor : "transparent",
                  border: `1px solid ${activeTab === "suggestion" ? accentColor : borderLine}`,
                  flexShrink: 0,
                }}
              />
            </button>
          </div>

          {/* Active Module Body */}
          <div style={{ padding: "clamp(28px, 4.5vw, 44px) clamp(22px, 4vw, 40px)" }}>
            {activeTab === "rating" ? (
              <div className="space-y-8 animate-fade-in">
                <div style={{ textAlign: "center", padding: "18px 0" }}>
                  <div
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: textMeta,
                      marginBottom: 8,
                    }}
                  >
                    GLOBAL PLATFORM SCORE
                  </div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      color: textPrimary,
                      margin: "0 0 8px",
                    }}
                  >
                    {initialRating ? "Update your global rating" : "How would you rate Ensemble?"}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: textSecondary,
                      maxWidth: 420,
                      margin: "0 auto 28px",
                      lineHeight: 1.6,
                    }}
                  >
                    Your rating helps us gauge overall platform satisfaction. You can update this at any time!
                  </p>

                  {/* Unchanged Star Selector Design */}
                  <div className="flex justify-center items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setRating(num)}
                        onMouseEnter={() => setHoverRating(num)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={!isAuthenticated || isSubmitting}
                        className="p-2 transition-transform duration-200 focus:outline-none hover:scale-110 disabled:hover:scale-100 disabled:opacity-50"
                      >
                        <Star
                          size={48}
                          className={
                            (hoverRating ? num <= hoverRating : num <= rating)
                              ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                              : "text-gray-300 dark:text-zinc-700 hover:text-yellow-500/50 transition-colors"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <span
                      style={{
                        display: "inline-block",
                        fontFamily: T.fontMono,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: textPrimary,
                        padding: "6px 14px",
                        border: `1px solid ${borderLine}`,
                        background: subSurfaceBg,
                      }}
                      className="animate-fade-in"
                    >
                      {rating}.0 OUT OF 5
                    </span>
                  )}
                </div>

                <div>
                  <button
                    onClick={handleSubmitRating}
                    onMouseEnter={playHover}
                    disabled={
                      !isAuthenticated || rating === 0 || isSubmitting || rating === initialRating
                    }
                    className="bp-fb-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : rating === initialRating ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Rating is Up to Date</span>
                      </>
                    ) : (
                      <>
                        <Star size={16} />
                        <span>{initialRating ? "Update Rating" : "Submit Rating"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Category Dropdown (Unchanged Category List) */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: T.fontMono,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: textPrimary,
                      marginBottom: 10,
                    }}
                  >
                    <Tag size={14} color={accentColor} />
                    <span>Feedback Category</span>
                  </label>
                  <GlideSelect
                    options={CATEGORIES}
                    value={category}
                    onChange={(val) => setCategory(val)}
                    disabled={!isAuthenticated || isSubmitting}
                    fullWidth
                    size="lg"
                    radius={0}
                    ariaLabel="Feedback Category"
                  />
                </div>

                {/* Textarea */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontFamily: T.fontMono,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: textPrimary,
                      marginBottom: 10,
                    }}
                  >
                    <span>What could we do better?</span>
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 11,
                        fontWeight: 600,
                        color: feedback.length >= 1500 ? "#ef4444" : textMeta,
                      }}
                    >
                      {feedback.length} / 1500
                    </span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.substring(0, 1500))}
                    maxLength={1500}
                    rows={6}
                    disabled={!isAuthenticated || isSubmitting}
                    placeholder="Share your workflows, feature requests, or any bugs you've encountered..."
                    className="bp-fb-input"
                    style={{ resize: "none", lineHeight: 1.6 }}
                  />
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    onClick={handleSubmitFeedback}
                    onMouseEnter={playHover}
                    disabled={!isAuthenticated || !feedback.trim() || isSubmitting}
                    className="bp-fb-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Footer Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 24px",
              borderTop: `1px solid ${borderLine}`,
              fontFamily: T.fontMono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: textMeta,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>ENSEMBLE // CONTINUOUS PRODUCT FEEDBACK LOOP</span>
            <span>STATUS: {isAuthenticated ? "AUTHENTICATED SESSION" : "GUEST VIEW"}</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PageSendAFeedback;
