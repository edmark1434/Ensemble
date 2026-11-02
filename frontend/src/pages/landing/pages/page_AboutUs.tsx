import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Compass,
  Cpu,
  ExternalLink,
  Globe,
  Layers,
  RotateCcw,
  RotateCw,
  Users,
} from "lucide-react";

interface TeamMember {
  id: string;
  code: string;
  name: string;
  role: string;
  img: string;
  bio: string;
  skills: string[];
  focus: string;
  socials: { name: string; url: string; type: "github" | "linkedin" | "instagram" }[];
  projects: { name: string; url: string }[];
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "edmark",
    code: "ARCH-01",
    name: "Edmark Talingting",
    role: "Dev Ops | Project Manager",
    img: "/team/eds.jpg",
    bio: "Coordinates CI/CD release pipelines, cloud infrastructure, and delivery milestones to keep Ensemble shipping smoothly.",
    skills: ["DevOps & CI/CD", "Milestone Mapping", "Delivery Streams"],
    focus: "DevOps & Project Delivery",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" },
    ],
    projects: [
      { name: "Ensemble Core", url: "#" },
      { name: "CI/CD Pipeline", url: "#" },
      { name: "Release Tracker", url: "#" },
      { name: "Milestone Board", url: "#" },
    ],
  },
  {
    id: "rex",
    code: "ARCH-02",
    name: "John Paul Mahilom",
    role: "UI/UX | Jobs & Marketplace",
    img: "/team/rex.jpg",
    bio: "Designs end-to-end user interfaces, transaction flows, and architecture for the job marketplace, proposals, and gig services.",
    skills: ["UI/UX Design", "Marketplace Systems", "Design Systems"],
    focus: "UI/UX & Marketplace Architecture",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" },
    ],
    projects: [
      { name: "Job Marketplace", url: "#" },
      { name: "Proposal Studio", url: "#" },
      { name: "Gig Services", url: "#" },
      { name: "Design System", url: "#" },
    ],
  },
  {
    id: "joed",
    code: "ARCH-03",
    name: "Jodeci Pacibe",
    role: "Collaborative Video Editing",
    img: "/team/joed.jpg",
    bio: "Engineers the collaborative real-time video editing suite, multi-track timeline canvas, and synchronized media playback.",
    skills: ["Video Editor Engine", "Real-Time Canvas", "Multi-Track Timeline"],
    focus: "Collaborative Video Suite",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" },
    ],
    projects: [
      { name: "Video Editor", url: "#" },
      { name: "Timeline Engine", url: "#" },
      { name: "Playback Sync", url: "#" },
      { name: "Asset Canvas", url: "#" },
    ],
  },
  {
    id: "jojo",
    code: "ARCH-04",
    name: "Joehanes Lauglaug",
    role: "Deployment, Admin and Mods",
    img: "/team/jojo.jpg",
    bio: "Builds automated deployment environments, administrative controls, platform dispute desks, and staff moderation systems.",
    skills: ["Cloud Deployment", "Admin Controls", "Moderation Systems"],
    focus: "Deployment & Governance",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" },
    ],
    projects: [
      { name: "Admin Portal", url: "#" },
      { name: "Moderation Desk", url: "#" },
      { name: "Deploy Cluster", url: "#" },
      { name: "Dispute Console", url: "#" },
    ],
  },
];

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

const PageAboutUs: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const initAudio = () => {
    if (!flipAudioRef.current) {
      flipAudioRef.current = new Audio("/sounds/softclick.mp3");
      flipAudioRef.current.volume = 0.2;
    }
  };

  const playFlipSound = useCallback(() => {
    try {
      initAudio();
      if (flipAudioRef.current) {
        flipAudioRef.current.currentTime = 0;
        flipAudioRef.current.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCardFlip = (id: string) => {
    playFlipSound();
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderSocialIcon = (type: string) => {
    switch (type) {
      case "github":
        return (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        );
      case "linkedin":
        return (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
      case "instagram":
        return (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      default:
        return <Globe size={13} />;
    }
  };

  const pageBg = isDark ? "#121214" : "#ffffff";
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.14)";
  const textPrimary = isDark ? "#ffffff" : "#09090b";
  const textSecondary = isDark ? "#d4d4d8" : "#27272a";
  const textMeta = isDark ? "#a1a1aa" : "#52525b";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";
  const accentColor = "#3b82f6";

  return (
    <div
      style={{
        background: pageBg,
        minHeight: "100vh",
        color: textPrimary,
        fontFamily: T.fontDisplay,
        padding: "48px 0 96px",
        position: "relative",
      }}
    >
      <style>{`
        .bp-about-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-about-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-team-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .bp-team-cell {
          border-right: 1px solid ${borderLine};
          display: flex;
          flex-direction: column;
          background: ${pageBg};
        }
        .bp-team-cell:last-child {
          border-right: none;
        }
        .flip-card-perspective {
          perspective: 1200px;
          height: 510px;
          width: 100%;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.23, 1, 0.32, 1);
          cursor: pointer;
        }
        .flip-card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          overflow: hidden;
        }
        .flip-card-front {
          z-index: 2;
          transform: rotateY(0deg);
        }
        .flip-card-back {
          transform: rotateY(180deg);
          z-index: 1;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 1100px) {
          .bp-team-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .bp-team-cell:nth-child(2) {
            border-right: none;
          }
          .bp-team-cell:nth-child(1),
          .bp-team-cell:nth-child(2) {
            border-bottom: 1px solid ${borderLine};
          }
        }
        @media (max-width: 640px) {
          .bp-team-grid {
            grid-template-columns: 1fr;
          }
          .bp-team-cell {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-team-cell:last-child {
            border-bottom: none;
          }
        }
      `}</style>

      <div className="bp-about-shell">
        <div className="bp-about-frame">
          <Crosshair top left color={crosshairColor} />
          <Crosshair top right color={crosshairColor} />
          <Crosshair bottom left color={crosshairColor} />
          <Crosshair bottom right color={crosshairColor} />

          {/* Top Blueprint Navigation Bar */}
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
              onClick={() => navigate("/")}
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
              <ArrowLeft size={14} /> BACK TO LANDING
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
              ABOUT // RAVENLABS DEVELOPMENT • CORE ARCHITECTS
            </span>
          </div>

          {/* Hero Block */}
          <div
            style={{
              padding: "clamp(32px, 5vw, 52px) clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ maxWidth: 680 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                RAVENLABS DEVELOPMENT • CORE TEAM
              </div>
              <h1
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(32px, 4.5vw, 52px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                About <span style={{ color: accentColor }}>Ensemble</span>.
              </h1>
            </div>

            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 15.5,
                lineHeight: 1.65,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 480,
                margin: 0,
              }}
            >
              Ensemble is a real-time collaborative video production and creative marketplace platform engineered to eliminate friction between Clients, Freelancers, and Asset Creators.
            </p>
          </div>

          {/* Studio Identity Strip */}
          <div
            style={{
              padding: "20px clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              background: isDark ? "#151518" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src="/logo/ravenlabs.png"
                alt="RavenLabs Logo"
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "contain",
                  background: "#09090b",
                  padding: 5,
                  border: `1px solid ${borderLine}`,
                  flexShrink: 0,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: accentColor,
                    marginBottom: 2,
                  }}
                >
                  ENGINEERED BY
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 17,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  RavenLabs Development
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: textSecondary,
                  }}
                >
                  Specialized studio architects building real-time video editing, dual-role hiring, and escrow infrastructure.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span
                style={{
                  border: `1px solid ${borderLine}`,
                  background: pageBg,
                  padding: "6px 12px",
                  fontFamily: T.fontMono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: textPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Users size={13} color={accentColor} /> 4 CORE ARCHITECTS
              </span>
              <span
                style={{
                  border: `1px solid ${borderLine}`,
                  background: pageBg,
                  padding: "6px 12px",
                  fontFamily: T.fontMono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: textPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Cpu size={13} color={accentColor} /> REAL-TIME PIPELINE
              </span>
              <span
                style={{
                  border: `1px solid ${borderLine}`,
                  background: pageBg,
                  padding: "6px 12px",
                  fontFamily: T.fontMono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: textPrimary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Briefcase size={13} color={accentColor} /> PRODUCTION ESCROW
              </span>
            </div>
          </div>

          {/* Subbar above 4-Column Team Grid */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 24px",
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: textPrimary,
              }}
            >
              CORE ARCHITECTS // CLICK ANY CARD TO FLIP
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMeta,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCw size={12} /> INTERACTIVE 3D FLIP
            </span>
          </div>

          {/* 4-Column Blueprint Team Grid */}
          <div className="bp-team-grid">
            {TEAM_MEMBERS.map((member) => {
              const isFlipped = Boolean(flippedCards[member.id]);

              return (
                <div key={member.id} className="bp-team-cell">
                  {/* Cell Top Micro-Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 18px",
                      borderBottom: `1px solid ${borderLine}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        color: accentColor,
                      }}
                    >
                      {member.role.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 700,
                        color: textMeta,
                      }}
                    >
                      {member.code}
                    </span>
                  </div>

                  {/* Flip Card Area */}
                  <div
                    className="flip-card-perspective"
                    onClick={() => toggleCardFlip(member.id)}
                  >
                    <div className={`flip-card-inner ${isFlipped ? "is-flipped" : ""}`}>
                      {/* FRONT FACE */}
                      <div
                        className="flip-card-face flip-card-front group"
                        style={{
                          background: isDark ? "#18181b" : "#f4f4f5",
                        }}
                      >
                        <img
                          src={member.img}
                          alt={member.name}
                          className="w-full h-full object-cover object-top filter grayscale contrast-105 hover:grayscale-0 transition-all duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />

                        {/* Bottom Name & Flip Readout Overlay */}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            padding: "14px 18px",
                            background: isDark ? "rgba(18, 18, 20, 0.92)" : "rgba(255, 255, 255, 0.94)",
                            borderTop: `1px solid ${borderLine}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: T.fontDisplay,
                                fontSize: 15.5,
                                fontWeight: 800,
                                color: textPrimary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {member.name}
                            </div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                color: textSecondary,
                              }}
                            >
                              {member.focus}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: "5px 9px",
                              border: `1px solid ${borderLine}`,
                              fontFamily: T.fontMono,
                              fontSize: 10,
                              fontWeight: 700,
                              color: textPrimary,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              flexShrink: 0,
                            }}
                          >
                            <RotateCw size={11} /> FLIP
                          </span>
                        </div>
                      </div>

                      {/* BACK FACE */}
                      <div
                        className="flip-card-face flip-card-back"
                        style={{
                          background: pageBg,
                        }}
                      >
                        {/* Back Header */}
                        <div
                          style={{
                            padding: "12px 18px",
                            borderBottom: `1px solid ${borderLine}`,
                            background: isDark ? "#151518" : "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: T.fontDisplay,
                                fontSize: 15,
                                fontWeight: 800,
                                color: textPrimary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {member.name}
                            </div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                color: accentColor,
                                textTransform: "uppercase",
                              }}
                            >
                              {member.role}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCardFlip(member.id);
                            }}
                            style={{
                              background: "transparent",
                              border: `1px solid ${borderLine}`,
                              color: textPrimary,
                              padding: "4px 9px",
                              fontFamily: T.fontMono,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              flexShrink: 0,
                            }}
                          >
                            <RotateCcw size={10} /> FRONT
                          </button>
                        </div>

                        {/* Back Body */}
                        <div
                          style={{
                            padding: "16px 18px",
                            flex: 1,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontFamily: T.fontMono,
                              fontSize: 11,
                              fontWeight: 600,
                              color: textPrimary,
                            }}
                          >
                            <Compass size={12} color={accentColor} />
                            <span>{member.focus}</span>
                          </div>

                          <div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: textMeta,
                                marginBottom: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Layers size={11} /> BIOGRAPHY
                            </div>
                            <p
                              style={{
                                fontFamily: T.fontDisplay,
                                fontSize: 12.5,
                                lineHeight: 1.55,
                                fontWeight: 500,
                                color: textSecondary,
                                margin: 0,
                              }}
                            >
                              {member.bio}
                            </p>
                          </div>

                          <div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: textMeta,
                                marginBottom: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Cpu size={11} /> SKILLS & FOCUS
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {member.skills.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  style={{
                                    border: `1px solid ${borderLine}`,
                                    background: isDark ? "#18181b" : "#f4f4f5",
                                    padding: "3px 8px",
                                    fontFamily: T.fontMono,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: textPrimary,
                                  }}
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: textMeta,
                                marginBottom: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Globe size={11} /> SOCIALS
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {member.socials.map((social, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={social.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    border: `1px solid ${borderLine}`,
                                    background: isDark ? "#18181b" : "#f4f4f5",
                                    padding: "4px 9px",
                                    fontFamily: T.fontMono,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: textPrimary,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  {renderSocialIcon(social.type)}
                                  <span>{social.name}</span>
                                  <ExternalLink size={9} />
                                </a>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontFamily: T.fontMono,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: textMeta,
                                marginBottom: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <Briefcase size={11} /> KEY DELIVERABLES
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                gap: 6,
                              }}
                            >
                              {member.projects.map((proj, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    border: `1px solid ${borderLine}`,
                                    background: isDark ? "#18181b" : "#f4f4f5",
                                    padding: "5px 8px",
                                    fontFamily: T.fontMono,
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: textPrimary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 4,
                                  }}
                                >
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {proj.name}
                                  </span>
                                  <ExternalLink size={9} color={textMeta} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Back Footer */}
                        <div
                          style={{
                            padding: "8px 18px",
                            borderTop: `1px solid ${borderLine}`,
                            background: isDark ? "#151518" : "#f8fafc",
                            textAlign: "center",
                            fontFamily: T.fontMono,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            color: textMeta,
                          }}
                        >
                          CLICK TO FLIP BACK
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageAboutUs;
