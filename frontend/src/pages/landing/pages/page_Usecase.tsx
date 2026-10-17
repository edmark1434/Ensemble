import useGlobalState from "@/lib/global_state";
import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ShieldCheck,
  Layers,
  Video,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
  DollarSign,
  Sliders,
  Users,
  Zap,
  PlayCircle,
  FileCheck,
  Palette,
  ExternalLink,
} from "lucide-react";

type UseCaseKey = "client" | "freelancer" | "asset-creator" | "enthusiast";

interface UseCaseData {
  key: UseCaseKey;
  label: string;
  badge: string;
  tagline: string;
  headline: string;
  subtitle: string;
  accentColor: string;
  badgeBg: string;
  roleOverview: string;
  keyActions: {
    icon: React.ElementType;
    title: string;
    desc: string;
  }[];
  workflow: {
    step: string;
    title: string;
    desc: string;
  }[];
  capabilities: {
    title: string;
    desc: string;
  }[];
  deliverables: string[];
  ctaText: string;
  ctaSub: string;
}

const USE_CASES: Record<UseCaseKey, UseCaseData> = {
  client: {
    key: "client",
    label: "Client",
    badge: "USE CASE: CLIENTS & TEAMS",
    tagline: "Hire & Manage Talent",
    headline: "Produce Exceptional Video with Verified Post-Production Talent",
    subtitle:
      "Whether you're a YouTuber, brand marketer, indie filmmaker, or agency, Ensemble connects you with vetted video editors, motion artists, and sound designers—backed by milestone escrow and direct project collaboration.",
    accentColor: "#3b82f6",
    badgeBg: "rgba(59, 130, 246, 0.1)",
    roleOverview:
      "As a Client on Ensemble, you bring your creative vision to the table. You can post job listings to solicit tailored proposals or instantly purchase pre-packaged gigs. During production, you review watermarked deliverables, leave timecode-based feedback, manage taskboards, and release payments safely only when you are 100% satisfied.",
    keyActions: [
      {
        icon: Briefcase,
        title: "Post Custom Jobs or Buy Gigs",
        desc: "Publish your video project briefs to the creator ecosystem or select from transparent, pre-priced gigs across video editing, motion graphics, color grading, and audio mixing."
      },
      {
        icon: ShieldCheck,
        title: "Escrow-Protected Milestone Payouts",
        desc: "Deposit project budgets safely into verified escrow. Funds remain held securely and are never released to the editor until you inspect the cut and approve the milestone."
      },
      {
        icon: Layers,
        title: "Visual Taskboards & Milestone Tracking",
        desc: "Organize every phase of production from rough draft to final handoff. Track progress, assign subtasks, and communicate revisions cleanly in real-time."
      },
      {
        icon: Video,
        title: "Inspect in the In-Browser Video Editor",
        desc: "Open project files directly in Ensemble's browser-based timeline editor to preview cuts, inspect layers, tweak titles, or quickly export alternate social aspect ratios."
      }
    ],
    workflow: [
      { step: "01", title: "Define Your Project", desc: "Specify deliverable formats, reference links, turnaround deadlines, and target budget." },
      { step: "02", title: "Select & Contract", desc: "Compare proposals or purchase a gig, locking in clear milestones and escrow allocations." },
      { step: "03", title: "Review & Collaborate", desc: "Stream watermarked cuts, annotate revisions, and track progress on the shared taskboard." },
      { step: "04", title: "Approve & Receive Files", desc: "Release escrow funds with one click to immediately receive full-resolution master files." }
    ],
    capabilities: [
      { title: "Direct Real-time Chat", desc: "Message contracted editors, share timestamped references, and jump into voice syncs." },
      { title: "Contract Revision Shield", desc: "All contracts clearly specify revision allowances so expectations stay transparent and friction-free." },
      { title: "Multi-seat Collaboration", desc: "Invite co-producers or review stakeholders to inspect cuts and leave feedback in one central workspace." }
    ],
    deliverables: [
      "YouTube Long-Form & Shorts",
      "Brand Commercials & Ads",
      "TikTok / Reels Viral Edits",
      "Documentaries & Narrative Films",
      "Podcast Multi-Cam Cuts",
      "Color Grading & Audio Mastering"
    ],
    ctaText: "Start Hiring Editors Today",
    ctaSub: "Post your project in minutes and connect with top-tier video talent."
  },

  freelancer: {
    key: "freelancer",
    label: "Freelancer",
    badge: "USE CASE: FREELANCERS & ARTISTS",
    tagline: "Work & Monetize Skills",
    headline: "Turn Creative Skills into High-Paying Video Production Contracts",
    subtitle:
      "Ensemble empowers video editors, motion graphics artists, animators, and sound designers with zero-commission gig packages, guaranteed milestone escrow, and collaborative production tools.",
    accentColor: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.1)",
    roleOverview:
      "As a Freelancer on Ensemble, you are the creative engine of the platform. Build your professional studio profile, set your custom pricing tiers, bid on open client job postings, and deliver world-class cuts with the security of guaranteed escrow funding—knowing your hard work is protected every step of the way.",
    keyActions: [
      {
        icon: Sparkles,
        title: "Publish Gigs & Showcase Work",
        desc: "Build an interactive video portfolio and publish customizable gig packages with transparent turnaround times, clear revision counts, and tiered pricing."
      },
      {
        icon: ShieldCheck,
        title: "Guaranteed Escrow Protection",
        desc: "Never chase unpaid invoices again. Client funds are locked in secure escrow before you start editing, ensuring you get paid as soon as milestones are approved."
      },
      {
        icon: Video,
        title: "Integrated Browser Editor & Handoff",
        desc: "Leverage Ensemble's web editor for rapid assembly cuts, community presets, and cloud delivery, or seamlessly import and export with your favorite desktop NLEs."
      },
      {
        icon: CheckCircle2,
        title: "Watermarked Preview Protection",
        desc: "Submit work-in-progress deliverables protected by automated watermarking. Safeguard your creative assets until the client approves the final milestone."
      }
    ],
    workflow: [
      { step: "01", title: "Build Your Studio Profile", desc: "Upload your best showreels, showcase specialties, and publish your tiered gig offerings." },
      { step: "02", title: "Send Targeted Proposals", desc: "Submit tailored bids to open job postings with customized delivery turnaround and pricing." },
      { step: "03", title: "Produce & Submit Drafts", desc: "Assemble deliverables in your NLE or web editor and submit watermarked preview cuts." },
      { step: "04", title: "Instant Payout Release", desc: "Upon client approval, escrow payments transfer directly to your balance for withdrawal." }
    ],
    capabilities: [
      { title: "Direct Client Invoicing", desc: "Create custom milestone offers on the fly for repeat clients and long-term retainer agreements." },
      { title: "Asset Hub Integration", desc: "Access community LUTs, transition packs, and sound design libraries directly inside your editing workspace." },
      { title: "Reputation & Badging", desc: "Earn verified talent badges, top-rated reviews, and featured spots in the creative marketplace." }
    ],
    deliverables: [
      "Premiere / DaVinci Project Handoff",
      "Motion Graphic Titles & Stingers",
      "VFX & Compositing Sequences",
      "Audio Sweetening & Dialogue Clean",
      "Short-Form Social Repurposing",
      "Full Cinematic Color Grading"
    ],
    ctaText: "Start Freelancing on Ensemble",
    ctaSub: "Create your portfolio profile and begin bidding on open client projects."
  },

  "asset-creator": {
    key: "asset-creator",
    label: "Asset Creator",
    badge: "USE CASE: ASSET CREATORS",
    tagline: "Sell Digital Assets & Presets",
    headline: "Monetize Video Presets, Motion Templates, and Audio Libraries",
    subtitle:
      "Sell your LUTs, transition packs, title cards, sound effects, and editor plugins directly to a global community of video editors, content creators, and post-production studios.",
    accentColor: "#8b5cf6",
    badgeBg: "rgba(139, 92, 246, 0.1)",
    roleOverview:
      "As an Asset Creator on Ensemble, you craft the building blocks that accelerate video workflows worldwide. Publish your motion templates, sound libraries, color grading presets, and visual overlays into the Ensemble Marketplace to generate passive income every time a creator licenses your work.",
    keyActions: [
      {
        icon: ShoppingBag,
        title: "Global Marketplace Distribution",
        desc: "List digital asset packs with video preview reels, audio sample players, documentation, and instant digital fulfillment to thousands of active editors."
      },
      {
        icon: DollarSign,
        title: "Automated Royalties & Tiered Licensing",
        desc: "Maintain complete control over your revenue. Set personal or commercial rates, bundle packs, and enjoy automatic royalty payouts directly to your account."
      },
      {
        icon: Sliders,
        title: "Native Editor Compatibility",
        desc: "Format assets to run natively inside Ensemble's browser video editor as well as industry-standard desktop software like Premiere Pro, After Effects, and DaVinci Resolve."
      },
      {
        icon: Users,
        title: "Community Engagement & Reviews",
        desc: "Connect directly with creators using your tools, gather verified ratings, push version updates, and cultivate a loyal following for your digital brand."
      }
    ],
    workflow: [
      { step: "01", title: "Package Your Assets", desc: "Organize your LUTs, title templates, SFX packs, or transition presets with usage documentation." },
      { step: "02", title: "Upload & Set Pricing", desc: "Attach demo video showcases, set personal or commercial license tiers, and publish." },
      { step: "03", title: "Automated Digital Delivery", desc: "Ensemble handles secure asset hosting, licensing keys, and instant download fulfillment." },
      { step: "04", title: "Collect Passive Revenue", desc: "Track sales performance and withdraw automated royalties as editors license your packs." }
    ],
    capabilities: [
      { title: "In-Browser Asset Previews", desc: "Creators can audition your audio files and preview video effects interactively before buying." },
      { title: "One-Click Editor Import", desc: "Assets can be opened directly into Ensemble's web editor timelines without downloading zip files." },
      { title: "Creator Storefront", desc: "Enjoy a dedicated storefront URL showcasing your complete portfolio of digital packs and presets." }
    ],
    deliverables: [
      "Cinematic Color LUTs (.cube)",
      "Motion Graphics Templates (.mogrt)",
      "Sound Effects & Foley Packs",
      "Glitch & Transition Overlays",
      "Kinetic Typography Presets",
      "Native Web Editor Presets"
    ],
    ctaText: "Sell Assets on Ensemble",
    ctaSub: "Join our creator marketplace and start earning passive royalties on your creative tools."
  },

  enthusiast: {
    key: "enthusiast",
    label: "Enthusiast",
    badge: "USE CASE: ENTHUSIASTS & LEARNERS",
    tagline: "Learn & Create Freely",
    headline: "Explore Video Editing Without Barriers, Licenses, or Heavy Hardware",
    subtitle:
      "Dive into video creation with our lightweight browser-based editor, access free community assets, learn from professional workflows, and bring your creative ideas to life.",
    accentColor: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.1)",
    roleOverview:
      "As an Enthusiast on Ensemble, you don't need a high-end workstation or expensive software subscriptions. Edit videos right in your browser, experiment with free templates and sound effects, share drafts on our forums for constructive feedback, and grow your skills toward becoming a professional editor or creator.",
    keyActions: [
      {
        icon: Video,
        title: "Zero-Install Web Video Editor",
        desc: "Launch a full multi-track timeline directly from Chrome or Edge. Cut clips, adjust audio levels, add text titles, and export video without installing any bulky software."
      },
      {
        icon: Sparkles,
        title: "Free Community Assets & Media",
        desc: "Take advantage of free stock footage, sound effects, music tracks, and graphic overlays shared by generous creators in our community marketplace."
      },
      {
        icon: Users,
        title: "Creative Forum & Peer Feedback",
        desc: "Post your work-in-progress edits to our community discussion boards. Get tips, pacing suggestions, and technical critiques from seasoned video creators."
      },
      {
        icon: Zap,
        title: "Stepstone to Professional Work",
        desc: "When you're ready to take on paid clients or publish your first presets, seamlessly transition to freelancer status on the same platform without losing your profile history."
      }
    ],
    workflow: [
      { step: "01", title: "Import Your Media", desc: "Open the web editor and drag-and-drop phone clips, screen recordings, or gaming highlights." },
      { step: "02", title: "Cut & Add Effects", desc: "Trim timelines, layer music, apply free community transitions, and style auto-captions." },
      { step: "03", title: "Share on the Forums", desc: "Post rough cuts, ask questions, and learn editing tips from an active community of creators." },
      { step: "04", title: "Export & Level Up", desc: "Download high-res renders for YouTube, TikTok, or school, building your personal showreel." }
    ],
    capabilities: [
      { title: "Cloud Project Autosave", desc: "Your timeline saves in the cloud so you can continue editing from any computer or laptop." },
      { title: "Interactive Community Tutorials", desc: "Learn real-world video pacing, sound mixing, and keyframing from fellow community editors." },
      { title: "No Watermark on Free Renders", desc: "Export your personal projects cleanly with full resolution and no forced platform watermark." }
    ],
    deliverables: [
      "Gaming Highlight Montages",
      "TikTok & Instagram Reels",
      "Vlogs & Travel Compilations",
      "School & University Projects",
      "Music Video Edits",
      "Experimental Short Films"
    ],
    ctaText: "Start Creating for Free",
    ctaSub: "Open the editor and jumpstart your video editing journey today—no credit card required."
  }
};

const PageUsecase: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const navigate = useNavigate();
  const { usertype } = useParams<{ usertype?: string }>();

  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    minimalHoverAudioRef.current.volume = 0.25;
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");
    clickAudioRef.current.volume = 0.4;
  }, []);

  const playMinimalHover = () => {
    if (!minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const playClick = () => {
    if (!clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  // Normalize slug
  const normalizedKey = (usertype?.toLowerCase().replace(/_/g, "-") || "client") as UseCaseKey;
  const currentKey: UseCaseKey = USE_CASES[normalizedKey] ? normalizedKey : "client";
  const currentData = USE_CASES[currentKey];

  const handleTabSwitch = (key: UseCaseKey) => {
    playClick();
    navigate(`/landing/usecase/${key}`);
  };

  const handleBack = () => {
    playClick();
    navigate("/");
  };

  const handleSignup = () => {
    playClick();
    navigate("/signup");
  };

  const keys: UseCaseKey[] = ["client", "freelancer", "asset-creator", "enthusiast"];

  return (
    <div
      className="page-enter"
      style={{
        background: theme === "dark" ? "#121214" : "#f9fafb",
        minHeight: "100vh",
        color: theme === "dark" ? "#ffffff" : "#111827",
        padding: "80px 24px",
        position: "relative"
      }}
    >
      <style>{`
        @keyframes swipeInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .page-enter {
          animation: swipeInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .usecase-tab {
          flex: 1;
          padding: 12px 16px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
          white-space: nowrap;
        }
        .action-card {
          background: ${theme === "dark" ? "#18181b" : "#ffffff"};
          border: 1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"};
          padding: 24px;
          border-radius: 16px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          transition: all 0.22s ease;
        }
        .action-card:hover {
          border-color: ${currentData.accentColor};
          transform: translateY(-2px);
          box-shadow: ${theme === "dark" ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.06)"};
        }
        .workflow-step {
          background: ${theme === "dark" ? "#18181b" : "#ffffff"};
          border: 1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"};
          padding: 20px 22px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.2s ease;
        }
        .workflow-step:hover {
          border-color: ${currentData.accentColor};
        }
        .capability-pill {
          background: ${theme === "dark" ? "#18181b" : "#ffffff"};
          border: 1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"};
          padding: 16px 20px;
          border-radius: 14px;
          flex: 1;
        }
        @media (max-width: 768px) {
          .usecase-tab-bar {
            overflow-x: auto;
            display: flex;
            gap: 6px;
          }
          .usecase-tab {
            flex: none;
            padding: 10px 18px;
          }
          .action-card {
            flex-direction: column;
            gap: 14px;
          }
        }
      `}</style>

      <div style={{ maxWidth: 940, margin: "0 auto", position: "relative", zIndex: 10 }}>
        {/* Navigation Head */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button
            onClick={handleBack}
            style={{
              background: "none",
              border: "none",
              color: theme === "dark" ? "#7a8499" : "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
              transition: "color 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === "dark" ? "#fff" : "#111827";
              playMinimalHover();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === "dark" ? "#7a8499" : "#6b7280";
            }}
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          <button
            onClick={handleSignup}
            style={{
              background: "none",
              border: "none",
              color: currentData.accentColor,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              padding: 0,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
              playMinimalHover();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Get Started <ArrowRight size={16} />
          </button>
        </div>

        {/* 4-Persona Switcher Tabs */}
        <div
          className="usecase-tab-bar"
          style={{
            display: "flex",
            background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#f3f4f6",
            border: theme === "dark" ? "1px solid #1e2130" : "1px solid #e5e7eb",
            padding: 6,
            borderRadius: 16,
            marginBottom: 44
          }}
        >
          {keys.map((k) => {
            const data = USE_CASES[k];
            const isActive = k === currentKey;
            return (
              <button
                key={k}
                className="usecase-tab"
                style={{
                  background: isActive ? data.accentColor : "transparent",
                  color: isActive ? "#ffffff" : theme === "dark" ? "#7a8499" : "#6b7280"
                }}
                onClick={() => handleTabSwitch(k)}
                onMouseEnter={playMinimalHover}
              >
                {data.label}
              </button>
            );
          })}
        </div>

        {/* Header Hero for Current Persona */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: currentData.badgeBg,
              color: currentData.accentColor,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 20,
              border: `1px solid ${currentData.accentColor}33`
            }}
          >
            <span>{currentData.badge}</span>
            <span>•</span>
            <span>{currentData.tagline}</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 4.5vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              marginBottom: 16
            }}
          >
            {currentData.headline}
          </h1>

          <p
            style={{
              color: theme === "dark" ? "#a1a1aa" : "#4b5563",
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: 820,
              margin: 0
            }}
          >
            {currentData.subtitle}
          </p>
        </div>

        {/* What They Do Overview Banner */}
        <div
          style={{
            background: theme === "dark" ? "#18181b" : "#ffffff",
            border: `1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"}`,
            borderLeft: `4px solid ${currentData.accentColor}`,
            padding: "26px 28px",
            borderRadius: 16,
            marginBottom: 44
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 10,
              color: theme === "dark" ? "#ffffff" : "#111827",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <PlayCircle size={20} color={currentData.accentColor} />
            What {currentData.label}s Do on Ensemble
          </h2>
          <p
            style={{
              color: theme === "dark" ? "#9ca3af" : "#4b5563",
              fontSize: 15,
              lineHeight: 1.65,
              margin: 0
            }}
          >
            {currentData.roleOverview}
          </p>
        </div>

        {/* Core Pillars / Actions */}
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginBottom: 20,
              color: theme === "dark" ? "#ffffff" : "#111827"
            }}
          >
            Key Platform Capabilities for {currentData.label}s
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {currentData.keyActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <div key={idx} className="action-card" onMouseEnter={playMinimalHover}>
                  <div
                    style={{
                      background: currentData.badgeBg,
                      color: currentData.accentColor,
                      padding: 12,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <ActionIcon size={22} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        marginBottom: 6,
                        color: theme === "dark" ? "#ffffff" : "#111827"
                      }}
                    >
                      {action.title}
                    </h3>
                    <p
                      style={{
                        color: theme === "dark" ? "#9ca3af" : "#6b7280",
                        lineHeight: 1.6,
                        fontSize: 14.5,
                        margin: 0
                      }}
                    >
                      {action.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step-by-Step Workflow */}
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginBottom: 20,
              color: theme === "dark" ? "#ffffff" : "#111827"
            }}
          >
            Typical Workflow on the Platform
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16
            }}
          >
            {currentData.workflow.map((item, idx) => (
              <div key={idx} className="workflow-step" onMouseEnter={playMinimalHover}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: currentData.accentColor
                  }}
                >
                  STEP {item.step}
                </span>
                <h4
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: theme === "dark" ? "#ffffff" : "#111827",
                    margin: 0
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    color: theme === "dark" ? "#9ca3af" : "#6b7280",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    margin: 0
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Highlights / Features Grid */}
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginBottom: 20,
              color: theme === "dark" ? "#ffffff" : "#111827"
            }}
          >
            Built-In Tools You'll Love
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16
            }}
          >
            {currentData.capabilities.map((cap, idx) => (
              <div key={idx} className="capability-pill" onMouseEnter={playMinimalHover}>
                <h4
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: theme === "dark" ? "#ffffff" : "#111827"
                  }}
                >
                  {cap.title}
                </h4>
                <p
                  style={{
                    color: theme === "dark" ? "#9ca3af" : "#6b7280",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    margin: 0
                  }}
                >
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Deliverables / Output Tags */}
        <div style={{ marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginBottom: 16,
              color: theme === "dark" ? "#ffffff" : "#111827"
            }}
          >
            Common Project Types & Formats
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {currentData.deliverables.map((item, idx) => (
              <span
                key={idx}
                style={{
                  background: theme === "dark" ? "#18181b" : "#ffffff",
                  border: `1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"}`,
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: theme === "dark" ? "#d4d4d8" : "#374151"
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Call to Action Card */}
        <div
          style={{
            background: theme === "dark" ? "#18181b" : "#ffffff",
            border: `1px solid ${theme === "dark" ? "#27272a" : "#e5e7eb"}`,
            borderRadius: 20,
            padding: "40px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16
          }}
        >
          <h3
            style={{
              fontSize: "clamp(24px, 3.5vw, 30px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0
            }}
          >
            Ready to Join Ensemble as a {currentData.label}?
          </h3>

          <p
            style={{
              color: theme === "dark" ? "#9ca3af" : "#6b7280",
              fontSize: 16,
              maxWidth: 600,
              margin: 0
            }}
          >
            {currentData.ctaSub}
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={handleSignup}
              onMouseEnter={playMinimalHover}
              style={{
                background: currentData.accentColor,
                color: "#ffffff",
                border: "none",
                padding: "12px 28px",
                borderRadius: 24,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "opacity 0.2s"
              }}
            >
              {currentData.ctaText} <ArrowRight size={16} />
            </button>

            <button
              onClick={handleBack}
              onMouseEnter={playMinimalHover}
              style={{
                background: theme === "dark" ? "rgba(255,255,255,0.06)" : "#f3f4f6",
                color: theme === "dark" ? "#ffffff" : "#111827",
                border: "none",
                padding: "12px 24px",
                borderRadius: 24,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              Explore Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageUsecase;
