import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useCallback } from "react";
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
import ShapeGrid from "@/components/ui/ShapeGrid";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  img: string;
  bio: string;
  skills: string[];
  focus: string;
  socials: { name: string; url: string; type: "github" | "linkedin" | "instagram" }[];
  projects: { name: string; url: string }[];
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "edmark",
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

const PageAboutUs: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const navigate = useNavigate();

  // Track flipped state per member ID
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Sound feedback on user-initiated card flip
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

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
      // Audio suppression fallback
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
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        );
      case "linkedin":
        return (
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      default:
        return <Globe className="w-3.5 h-3.5 flex-shrink-0" />;
    }
  };

  return (
    <div
      className={`page-about-us min-h-screen relative overflow-x-hidden py-10 sm:py-14 px-4 sm:px-8 xl:px-12 font-["Plus_Jakarta_Sans",sans-serif] ${
        theme === "dark" ? "bg-[#090a0f] text-zinc-100" : "bg-[#f8fafc] text-zinc-900"
      }`}
    >
      {/* Background Interactive ShapeGrid Canvas - Single visible grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.25}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.13)"}
          hoverFillColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"}
          hoverTrailAmount={2}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] 2xl:max-w-[1720px] mx-auto">
        {/* Navigation Head */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-sm ${
              theme === "dark"
                ? "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80"
                : "bg-white/90 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300"
            }`}
          >
            <ArrowLeft size={14} /> Back to Ensemble
          </button>
        </div>

        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 block mb-1">
                RavenLabs Development • Core Team
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                About Ensemble
              </h1>
            </div>
            <p className="max-w-xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Ensemble is a structure-first real-time video collaboration application designed to eliminate friction in film production pipelines.
            </p>
          </div>
        </div>

        {/* Studio Identity Strip */}
        <div
          className={`p-4 sm:p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border shadow-sm backdrop-blur-md ${
            theme === "dark"
              ? "bg-zinc-900/80 border-zinc-800"
              : "bg-white/90 border-zinc-300/80"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <img
              src="/logo/ravenlabs.png"
              alt="RavenLabs Logo"
              className="w-11 h-11 object-contain rounded-xl bg-zinc-950 p-1 border border-zinc-700/70 shadow-inner flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 block">
                Engineered By
              </span>
              <h2 className="text-base sm:text-lg font-bold">RavenLabs Development</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Specialized studio architects developing collaborative infrastructure and escrow workspaces.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-start md:justify-end flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80">
              <Users className="inline w-3 h-3 mr-1 text-zinc-600 dark:text-zinc-300" /> 4 Core Architects
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80">
              <Cpu className="inline w-3 h-3 mr-1 text-zinc-600 dark:text-zinc-300" /> Real-Time Pipeline
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80">
              <Briefcase className="inline w-3 h-3 mr-1 text-zinc-600 dark:text-zinc-300" /> Production Escrow
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <span>Core Architects</span>
            <span className="text-xs font-normal normal-case text-zinc-600 dark:text-zinc-300">(Click any card to flip)</span>
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-300 hidden sm:inline-flex items-center gap-1 font-medium">
            <RotateCw size={12} className="text-zinc-600 dark:text-zinc-300" /> Interactive 3D Flip
          </span>
        </div>

        {/* 4 Columns in 1 Row on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 xl:gap-6">
          {TEAM_MEMBERS.map((member) => {
            const isFlipped = Boolean(flippedCards[member.id]);

            return (
              <div
                key={member.id}
                className="flip-card-perspective h-[520px] w-full"
                onClick={() => toggleCardFlip(member.id)}
              >
                <div
                  className={`flip-card-inner relative w-full h-full rounded-2xl cursor-pointer ${
                    isFlipped ? "is-flipped" : ""
                  }`}
                >
                  {/* FRONT FACE - ONLY THE IMAGE */}
                  <div
                    className={`flip-card-face flip-card-front group absolute inset-0 w-full h-full rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                      theme === "dark"
                        ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        : "bg-zinc-100 border-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    <img
                      src={member.img}
                      alt={member.name}
                      className="w-full h-full object-cover object-top filter grayscale contrast-105 hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const p = e.currentTarget.parentElement;
                        if (p) p.style.background = "#18181b";
                      }}
                    />

                    {/* Subtle hover overlay with flip indicator */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors pointer-events-none flex items-end justify-end p-4">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-lg">
                        <RotateCw size={12} /> Flip for details
                      </span>
                    </div>
                  </div>

                  {/* BACK FACE - COMPLETE MEMBER DETAILS */}
                  <div
                    className={`flip-card-face flip-card-back absolute inset-0 w-full h-full rounded-2xl border flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
                      theme === "dark"
                        ? "bg-zinc-900 border-zinc-800"
                        : "bg-white border-zinc-300"
                    }`}
                  >
                    {/* Header */}
                    <div className="p-3.5 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-50 dark:bg-zinc-950/40">
                      <div className="pr-2 min-w-0">
                        <h4 className="text-sm font-bold leading-tight truncate">{member.name}</h4>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold uppercase tracking-wider block mt-0.5 truncate">
                          {member.role}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardFlip(member.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border flex-shrink-0 ${
                          theme === "dark"
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                        }`}
                      >
                        <RotateCcw size={11} /> Front
                      </button>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
                      {/* Focus Strip */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                        <Compass size={12} className="text-zinc-600 dark:text-zinc-300 flex-shrink-0" />
                        <span className="truncate">{member.focus}</span>
                      </div>

                      {/* Biography */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1 flex items-center gap-1">
                          <Layers size={11} /> Biography
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 font-normal">
                          {member.bio}
                        </p>
                      </div>

                      {/* Capabilities & Skills */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                          <Cpu size={11} /> Skills & Focus
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {member.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                theme === "dark"
                                  ? "bg-zinc-800/80 text-zinc-200 border-zinc-700/70"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
                              }`}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Universal Socials */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                          <Globe size={11} /> Universal Socials
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {member.socials.map((social, sIdx) => (
                            <a
                              key={sIdx}
                              href={social.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                theme === "dark"
                                  ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80"
                                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                              }`}
                            >
                              {renderSocialIcon(social.type)}
                              <span>{social.name}</span>
                              <ExternalLink size={9} className="opacity-50 ml-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Projects */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                          <Briefcase size={11} /> Key Deliverables
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {member.projects.map((proj, pIdx) => (
                            <div
                              key={pIdx}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium border ${
                                theme === "dark"
                                  ? "bg-zinc-800/50 text-zinc-300 border-zinc-800"
                                  : "bg-zinc-50 text-zinc-700 border-zinc-200"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate">{proj.name}</span>
                              <ExternalLink size={10} className="text-zinc-600 dark:text-zinc-300 flex-shrink-0 ml-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                        <RotateCcw size={10} /> Click to flip back
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        /* 3D Flip Card Mechanics */
        .flip-card-perspective {
          perspective: 1200px;
        }
        .flip-card-inner {
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .flip-card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-front {
          z-index: 2;
          transform: rotateY(0deg);
        }
        .flip-card-back {
          transform: rotateY(180deg);
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default PageAboutUs;
