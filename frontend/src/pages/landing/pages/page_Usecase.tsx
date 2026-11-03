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
  FileCheck,
} from "lucide-react";

type UseCaseKey = "client" | "freelancer" | "asset-creator" | "enthusiast";

interface UseCaseData {
  key: UseCaseKey;
  indexCode: string;
  label: string;
  badge: string;
  tagline: string;
  headline: string;
  subtitle: string;
  accentColor: string;
  bgVideo: string;
  roleOverview: string;
  keyActions: {
    id: string;
    category: string;
    icon: React.ElementType;
    title: string;
    desc: string;
  }[];
  workflow: {
    step: string;
    tag: string;
    title: string;
    desc: string;
  }[];
  capabilities: {
    code: string;
    title: string;
    desc: string;
  }[];
  deliverables: string[];
  ctaText: string;
  ctaSub: string;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const USE_CASES: Record<UseCaseKey, UseCaseData> = {
  client: {
    key: "client",
    indexCode: "01",
    label: "Client & Freelancers",
    badge: "01 / USE CASE • CLIENT & FREELANCERS",
    tagline: "2-WAY HIRING & ESCROW CONTRACTS",
    headline: "Hire a Freelancer in Two Ways with Escrow-Backed Contracts.",
    subtitle:
      "Every verified Ensemble account can hire as a Client or work as a Freelancer. Hire an individual or a team by posting a job and approving proposals, or find a Freelancer on the Discovery page / Gigs & Services to order a service and offer a contract.",
    accentColor: "#3b82f6",
    bgVideo: "/gallery_images/new/vids/vid_track.mp4",
    roleOverview:
      "After completing one-time Identity Verification (KYC), you can hire a Freelancer in 2 ways: (1) Post a Job on the platform—Freelancers submit their proposals, and you can shortlist and approve an individual or team proposal, then offer them a contract to hire them; or (2) Find a Freelancer on the Discovery page or Gigs / Services, select a service that matches your work, and order a service—once the Freelancer accepts your order, you offer the contract and they are hired.",
    keyActions: [
      {
        id: "01",
        category: "WAY 01 • JOB BOARD & PROPOSALS",
        icon: Briefcase,
        title: "Post a Job, Shortlist & Approve Individual or Team Proposals",
        desc: "Publish your production job on the platform. Freelancers submit tailored individual or team proposals—shortlist and approve the best match, then offer them a contract to hire them.",
      },
      {
        id: "02",
        category: "WAY 02 • DISCOVERY & GIGS / SERVICES",
        icon: FileCheck,
        title: "Order a Service on Discovery or Gigs / Services & Offer Contract",
        desc: "Browse the Discovery page or Gigs / Services to see Freelancer services. Select one that matches your work and order a service—once the Freelancer accepts your order, offer the contract to hire them.",
      },
      {
        id: "03",
        category: "ESCROW PROTECTION",
        icon: ShieldCheck,
        title: "Escrow-Protected Milestone Payouts",
        desc: "Fund contract milestones safely in platform escrow. Credits remain locked until you inspect the submitted deliverables and approve the milestone.",
      },
      {
        id: "04",
        category: "LIVE WORKSPACE",
        icon: Layers,
        title: "Dynamic Progress Tracking, Chat & Embedded Video Call",
        desc: "Monitor every milestone on a live visual taskboard, conduct interviews or review sessions via integrated chat and video call, and collaborate in real time.",
      },
    ],
    workflow: [
      {
        step: "01",
        tag: "PREREQUISITE",
        title: "Verify Identity (KYC)",
        desc: "Complete your one-time KYC verification so your unified account can fund escrow and sign binding contracts.",
      },
      {
        step: "02",
        tag: "CHOOSE PATH",
        title: "Post a Job OR Order a Service",
        desc: "Post a job to receive proposals, or browse Discovery / Gigs & Services and order a service that matches your work.",
      },
      {
        step: "03",
        tag: "CONTRACT & ESCROW",
        title: "Approve / Accept & Offer Contract",
        desc: "Approve an individual/team proposal or wait for the Freelancer to accept your service order, then offer the contract to hire them.",
      },
      {
        step: "04",
        tag: "DELIVERY",
        title: "Review Milestones & Release Payout",
        desc: "Track progress on the live dashboard, review deliverables, and approve milestones to release escrow funds.",
      },
    ],
    capabilities: [
      {
        code: "SYS-01",
        title: "Integrated Chat & Video Call",
        desc: "Conduct interviews, align on briefs, and review edits directly inside the platform without third-party apps.",
      },
      {
        code: "SYS-02",
        title: "Individual & Team Hiring",
        desc: "Hire a solo specialist or approve a full multi-member team proposal under a single structured contract.",
      },
      {
        code: "SYS-03",
        title: "Transparent Revision Terms",
        desc: "Every offered contract locks in clear milestone deliverables, deadlines, and revision allowances upfront.",
      },
    ],
    deliverables: [
      "YouTube Long-Form & Shorts",
      "Brand Commercials & Ads",
      "TikTok / Reels Viral Edits",
      "Documentaries & Narrative Films",
      "Podcast Multi-Cam Cuts",
      "Color Grading & Audio Mixing",
    ],
    ctaText: "Start Hiring on Ensemble",
    ctaSub: "Post a job or browse Discovery / Gigs & Services to hire verified creative talent.",
  },

  freelancer: {
    key: "freelancer",
    indexCode: "02",
    label: "Freelancers & Artists",
    badge: "02 / USE CASE • FREELANCERS & ARTISTS",
    tagline: "MONETIZE EDITING, COLOR & VFX SKILLS",
    headline: "Monetize Your Editing, Color & VFX Skills with Guaranteed Escrow.",
    subtitle:
      "Submit individual or team proposals on open Client Job Posts, or publish your Gigs / Services on the Discovery page so Clients can order your services directly.",
    accentColor: "#10b981",
    bgVideo: "/gallery_images/new/vids/vid_collab.mp4",
    roleOverview:
      "As a Freelancer on Ensemble, you can get hired in two ways after completing Identity Verification (KYC): submit proposals (solo or as a team) to Client Job Posts so Clients can shortlist, approve, and offer you a contract—or list your Gigs / Services on the Discovery page, accept incoming Client service orders, and sign the offered contract with escrow-backed milestones.",
    keyActions: [
      {
        id: "01",
        category: "GIGS & DISCOVERY",
        icon: Sparkles,
        title: "Publish Gigs / Services on Discovery & Accept Orders",
        desc: "List service packages with clear pricing, turnaround times, and portfolio samples. When a Client orders your service and you accept, they offer the contract to hire you.",
      },
      {
        id: "02",
        category: "JOB PROPOSALS",
        icon: Briefcase,
        title: "Submit Individual or Team Proposals on Job Posts",
        desc: "Browse open Client jobs, send tailored solo or team proposals, get shortlisted and approved, and receive an official contract offer.",
      },
      {
        id: "03",
        category: "PAYMENT SECURITY",
        icon: ShieldCheck,
        title: "Guaranteed Escrow Milestone Protection",
        desc: "Client funds are locked in platform escrow before work begins, ensuring instant credit release when your milestones are approved.",
      },
      {
        id: "04",
        category: "COLLABORATIVE STUDIO",
        icon: CheckCircle2,
        title: "Watermarked Previews & Real-Time Editor Sync",
        desc: "Collaborate in the browser video editor with AI auto-captioning and dead-air cleanup, and submit watermarked review cuts safely.",
      },
    ],
    workflow: [
      {
        step: "01",
        tag: "PREREQUISITE",
        title: "Complete KYC & Studio Profile",
        desc: "Verify your identity once, showcase your showreel, and publish your Gigs / Services on Discovery.",
      },
      {
        step: "02",
        tag: "OPPORTUNITY",
        title: "Submit Proposals or Accept Service Orders",
        desc: "Bid on open Client jobs (solo or team) or accept service orders placed on your Gigs / Services.",
      },
      {
        step: "03",
        tag: "CONTRACT",
        title: "Sign the Offered Contract",
        desc: "Review the Client's offered contract with locked escrow milestones and accept the terms to start production.",
      },
      {
        step: "04",
        tag: "PAYOUT",
        title: "Deliver Milestones & Withdraw Earnings",
        desc: "Submit deliverables on the live progress tracker and receive instant escrow credit payouts upon approval.",
      },
    ],
    capabilities: [
      {
        code: "SYS-01",
        title: "Solo & Team Proposals",
        desc: "Pitch alone or team up with fellow editors, colorists, and sound designers on larger production briefs.",
      },
      {
        code: "SYS-02",
        title: "Asset Library Integration",
        desc: "Use purchased or community Template Videos, Bundles, Images, Videos, and Audios directly inside the editor.",
      },
      {
        code: "SYS-03",
        title: "Merit & Verified Badges",
        desc: "Maintain high platform merit, earn verified badges, and rank higher across Discovery and Gigs / Services.",
      },
    ],
    deliverables: [
      "Long-Form & Short-Form Video Edits",
      "Motion Graphics & Title Sequences",
      "VFX & Compositing Shots",
      "Audio Cleanup & Sound Design",
      "Multi-Member Team Productions",
      "Color Grading & Final Masters",
    ],
    ctaText: "Start Working on Ensemble",
    ctaSub: "Publish your Gigs / Services or submit proposals on open jobs today.",
  },

  "asset-creator": {
    key: "asset-creator",
    indexCode: "03",
    label: "Asset Creators",
    badge: "03 / USE CASE • ASSET MARKETPLACE & LIBRARY",
    tagline: "SELL TEMPLATE VIDEOS, BUNDLES, IMAGES, VIDEOS & AUDIOS",
    headline: "Sell Template Videos, Bundles, Images, Videos & Audios on the Asset Marketplace.",
    subtitle:
      "Upload digital production assets to the Ensemble Asset Marketplace / Asset Library, set your pricing and licensing terms, and earn passive credit revenue on every purchase.",
    accentColor: "#8b5cf6",
    bgVideo: "/gallery_images/new/vids/vid_asset.mp4",
    roleOverview:
      "As an Asset Creator on Ensemble, you supply the creative media that powers productions across the platform. Upload Template Videos, multi-asset Bundles, Images, Videos, or Audios to the Asset Marketplace / Asset Library so editors and clients can license your work and import it straight into their projects.",
    keyActions: [
      {
        id: "01",
        category: "ASSET MARKETPLACE",
        icon: ShoppingBag,
        title: "Sell Template Videos, Bundles, Images, Videos & Audios",
        desc: "List single media items or curated multi-asset Bundles on the Asset Marketplace with interactive video and audio previews.",
      },
      {
        id: "02",
        category: "PASSIVE REVENUE",
        icon: DollarSign,
        title: "Automated Credit Royalties & Licensing",
        desc: "Set your pricing in platform credits, choose licensing terms, and collect instant payouts into your wallet on every download.",
      },
      {
        id: "03",
        category: "ASSET LIBRARY SYNC",
        icon: Sliders,
        title: "Direct Asset Library & Web Editor Integration",
        desc: "Purchased assets appear immediately in the buyer's Asset Library so they can drag Template Videos, Images, Videos, and Audios straight onto their timeline.",
      },
      {
        id: "04",
        category: "CREATOR STOREFRONT",
        icon: Users,
        title: "Verified Storefront & Community Ratings",
        desc: "Build a dedicated catalog of production bundles and media packs backed by verified buyer reviews and ratings.",
      },
    ],
    workflow: [
      {
        step: "01",
        tag: "PREPARE",
        title: "Package Your Media or Bundle",
        desc: "Organize your Template Videos, Bundles, Images, Videos, or Audios with clean preview samples and tags.",
      },
      {
        step: "02",
        tag: "PUBLISH",
        title: "List on Asset Marketplace",
        desc: "Upload your files, configure credit pricing and license terms, and publish to the Asset Marketplace.",
      },
      {
        step: "03",
        tag: "FULFILLMENT",
        title: "Instant Asset Library Delivery",
        desc: "Ensemble handles hosting and automatically adds licensed items to the buyer's Asset Library.",
      },
      {
        step: "04",
        tag: "EARNINGS",
        title: "Earn Passive Credit Payouts",
        desc: "Track downloads and withdraw earned credits from your wallet balance at any time.",
      },
    ],
    capabilities: [
      {
        code: "SYS-01",
        title: "Interactive Media Previews",
        desc: "Buyers can preview Template Videos, Videos, Images, and Audios directly in the browser before purchasing.",
      },
      {
        code: "SYS-02",
        title: "Multi-Format Bundles",
        desc: "Combine Template Videos, Images, Videos, and Audios into all-in-one production Bundles.",
      },
      {
        code: "SYS-03",
        title: "One-Click Timeline Import",
        desc: "Creators pull your licensed assets from their Asset Library straight into the collaborative video editor.",
      },
    ],
    deliverables: [
      "Template Videos",
      "Multi-Asset Production Bundles",
      "High-Resolution Images & Overlays",
      "Stock & Production Videos",
      "Music Tracks, SFX & Audios",
      "Ready-to-Edit Timeline Media",
    ],
    ctaText: "Sell on the Asset Marketplace",
    ctaSub: "Upload Template Videos, Bundles, Images, Videos, or Audios and start earning.",
  },

  enthusiast: {
    key: "enthusiast",
    indexCode: "04",
    label: "Creators & Enthusiasts",
    badge: "04 / USE CASE • CREATORS & ENTHUSIASTS",
    tagline: "BROWSER VIDEO EDITOR & AI TOOLS",
    headline: "Edit in the Browser with AI Auto-Captioning, Dead-Air Cleanup & Team Sync.",
    subtitle:
      "Launch Ensemble's collaborative web video editor without heavy hardware or installs. Cut clips, remove silence in one click, search spoken words with AI captions, and pull media from the Asset Library.",
    accentColor: "#f59e0b",
    bgVideo: "/gallery_images/new/vids/vid_captioning.mp4",
    roleOverview:
      "As a Creator or Enthusiast on Ensemble, you can jump straight into the browser-based collaborative video editor to cut content solo or with friends, use AI Auto Captioning and Auto Dead-Air Cleanup to speed up rough cuts, and switch to hiring as a Client or working as a Freelancer whenever you are ready.",
    keyActions: [
      {
        id: "01",
        category: "BROWSER STUDIO",
        icon: Video,
        title: "Real-Time Collaborative Web Video Editor",
        desc: "Edit multi-track timelines directly in your browser with live team presence—no bulky software installation or rendering bottlenecks.",
      },
      {
        id: "02",
        category: "AI WORKFLOW",
        icon: Zap,
        title: "AI Auto Captioning & Auto Dead-Air Cleanup",
        desc: "Pinpoint spoken words across your footage with AI Auto Captioning and strip out awkward pauses in a single click with Auto Dead-Air Cleanup.",
      },
      {
        id: "03",
        category: "ASSET LIBRARY",
        icon: Sparkles,
        title: "Access Template Videos, Images, Videos & Audios",
        desc: "Pull Template Videos, Bundles, Images, Videos, and Audios from the Asset Marketplace / Asset Library straight into your project.",
      },
      {
        id: "04",
        category: "UNIFIED ACCOUNT",
        icon: Users,
        title: "Ready to Hire or Monetize Anytime",
        desc: "Your single Ensemble account lets you transition seamlessly into hiring editors as a Client or selling services as a Freelancer.",
      },
    ],
    workflow: [
      {
        step: "01",
        tag: "LAUNCH",
        title: "Open the Browser Video Editor",
        desc: "Create a project in seconds and import your video clips, images, and audio tracks.",
      },
      {
        step: "02",
        tag: "AI ASSIST",
        title: "Clean Dead-Air & Generate Captions",
        desc: "Run one-click Auto Dead-Air Cleanup and AI Auto Captioning to assemble tight cuts fast.",
      },
      {
        step: "03",
        tag: "COLLABORATE",
        title: "Sync Live with Your Team",
        desc: "Invite collaborators to edit the same timeline together and chat via embedded video call.",
      },
      {
        step: "04",
        tag: "EXPORT",
        title: "Export & Share Anywhere",
        desc: "Render crisp video exports ready for YouTube, TikTok, Reels, or portfolio showcase.",
      },
    ],
    capabilities: [
      {
        code: "SYS-01",
        title: "Cloud Project Sync",
        desc: "Every timeline edit is synced in real time so you and your team can pick up from any browser.",
      },
      {
        code: "SYS-02",
        title: "Asset Library Ready",
        desc: "Drop Template Videos, Bundles, Images, Videos, and Audios directly into your active sequence.",
      },
      {
        code: "SYS-03",
        title: "Zero-Friction Role Switching",
        desc: "Upgrade your workflow anytime by verifying KYC to post jobs, offer contracts, or sell services.",
      },
    ],
    deliverables: [
      "YouTube & Gaming Montages",
      "TikTok & Instagram Reels",
      "Vlogs & Creator Content",
      "Podcast & Interview Cuts",
      "Team Collaborative Projects",
      "Short-Form Social Videos",
    ],
    ctaText: "Launch Ensemble Studio",
    ctaSub: "Create your free account and start editing with AI and real-time team sync.",
  },
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

const PageUsecase: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { usertype } = useParams<{ usertype?: string }>();

  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [usertype]);

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

  const pageBg = isDark ? "#121214" : "#ffffff";
  const cellHoverBg = isDark ? "#18181b" : "#f8fafc";
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.14)";
  const textPrimary = isDark ? "#ffffff" : "#09090b";
  const textSecondary = isDark ? "#d4d4d8" : "#27272a";
  const textMeta = isDark ? "#a1a1aa" : "#52525b";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";

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
        .bp-usecase-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-usecase-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-usecase-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-usecase-tab-btn {
          appearance: none;
          border: none;
          border-right: 1px solid ${borderLine};
          background: transparent;
          padding: 16px 20px;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .bp-usecase-tab-btn:last-child {
          border-right: none;
        }
        .bp-usecase-tab-btn:hover {
          background: ${cellHoverBg};
        }
        .bp-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-action-cell {
          border-right: 1px solid ${borderLine};
          border-bottom: 1px solid ${borderLine};
          background: ${pageBg};
          transition: background 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .bp-action-cell:nth-child(2n) {
          border-right: none;
        }
        .bp-action-cell:nth-last-child(-n+2) {
          border-bottom: none;
        }
        .bp-action-cell:hover {
          background: ${cellHoverBg};
        }
        .bp-workflow-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-workflow-cell {
          border-right: 1px solid ${borderLine};
          padding: 24px 22px;
          background: ${pageBg};
          transition: background 0.2s ease;
        }
        .bp-workflow-cell:last-child {
          border-right: none;
        }
        .bp-workflow-cell:hover {
          background: ${cellHoverBg};
        }
        .bp-cap-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-cap-cell {
          border-right: 1px solid ${borderLine};
          padding: 22px 24px;
          background: ${pageBg};
          transition: background 0.2s ease;
        }
        .bp-cap-cell:last-child {
          border-right: none;
        }
        .bp-cap-cell:hover {
          background: ${cellHoverBg};
        }
        @media (max-width: 1024px) {
          .bp-usecase-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .bp-usecase-tab-btn:nth-child(2) {
            border-right: none;
          }
          .bp-usecase-tab-btn:nth-child(1),
          .bp-usecase-tab-btn:nth-child(2) {
            border-bottom: 1px solid ${borderLine};
          }
          .bp-workflow-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .bp-workflow-cell:nth-child(2) {
            border-right: none;
          }
          .bp-workflow-cell:nth-child(1),
          .bp-workflow-cell:nth-child(2) {
            border-bottom: 1px solid ${borderLine};
          }
          .bp-cap-grid {
            grid-template-columns: 1fr;
          }
          .bp-cap-cell {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-cap-cell:last-child {
            border-bottom: none;
          }
        }
        @media (max-width: 720px) {
          .bp-usecase-tabs,
          .bp-actions-grid,
          .bp-workflow-grid {
            grid-template-columns: 1fr;
          }
          .bp-usecase-tab-btn,
          .bp-action-cell,
          .bp-workflow-cell {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine} !important;
          }
          .bp-usecase-tab-btn:last-child,
          .bp-action-cell:last-child,
          .bp-workflow-cell:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>

      <div className="bp-usecase-shell">
        <div className="bp-usecase-frame">
          <Crosshair top left color={crosshairColor} />
          <Crosshair top right color={crosshairColor} />
          <Crosshair bottom left color={crosshairColor} />
          <Crosshair bottom right color={crosshairColor} />

          {/* Top Blueprint Navigation & Telemetry Bar */}
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
              onClick={handleBack}
              onMouseEnter={playMinimalHover}
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
              {currentData.badge}
            </span>

            <button
              onClick={handleSignup}
              onMouseEnter={playMinimalHover}
              style={{
                background: currentData.accentColor,
                color: "#ffffff",
                border: "none",
                padding: "7px 14px",
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              GET STARTED <ArrowRight size={13} />
            </button>
          </div>

          {/* 4-Role Architectural Switcher Row */}
          <div className="bp-usecase-tabs">
            {keys.map((k) => {
              const data = USE_CASES[k];
              const isActive = k === currentKey;
              return (
                <button
                  key={k}
                  className="bp-usecase-tab-btn"
                  onClick={() => handleTabSwitch(k)}
                  onMouseEnter={playMinimalHover}
                  style={{
                    background: isActive
                      ? isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)"
                      : undefined,
                    borderBottom: isActive ? `2px solid ${data.accentColor}` : undefined,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        color: isActive ? data.accentColor : textMeta,
                        marginBottom: 4,
                      }}
                    >
                      USE CASE {data.indexCode}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontDisplay,
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: isActive ? textPrimary : textSecondary,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {data.label}
                    </div>
                  </div>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: isActive ? data.accentColor : "transparent",
                      border: `1px solid ${isActive ? data.accentColor : borderLine}`,
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Hero Header Block with Animated Feature Video Background */}
          <div
            style={{
              padding: "clamp(36px, 5.5vw, 64px) clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background Animated Feature Video */}
            <video
              key={currentData.bgVideo}
              src={currentData.bgVideo}
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isDark ? 0.34 : 0.22,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            {/* Crisp Readability Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: isDark
                  ? "linear-gradient(90deg, rgba(18, 18, 20, 0.90) 0%, rgba(18, 18, 20, 0.72) 55%, rgba(18, 18, 20, 0.45) 100%)"
                  : "linear-gradient(90deg, rgba(255, 255, 255, 0.93) 0%, rgba(255, 255, 255, 0.80) 55%, rgba(255, 255, 255, 0.55) 100%)",
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
                  padding: "5px 12px",
                  border: `1px solid ${currentData.accentColor}`,
                  background: isDark ? "rgba(18,18,20,0.65)" : "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(6px)",
                  color: currentData.accentColor,
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                <span>{currentData.badge}</span>
                <span>•</span>
                <span>{currentData.tagline}</span>
              </div>

              <h1
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(28px, 4.2vw, 46px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: textPrimary,
                  marginBottom: 16,
                  maxWidth: 960,
                }}
              >
                {currentData.headline}
              </h1>

              <p
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(15px, 1.4vw, 17.5px)",
                  lineHeight: 1.65,
                  fontWeight: 500,
                  color: textSecondary,
                  maxWidth: 880,
                  margin: 0,
                }}
              >
                {currentData.subtitle}
              </p>
            </div>
          </div>

          {/* Role Overview Callout Row */}
          <div
            style={{
              padding: "24px clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              borderLeft: `4px solid ${currentData.accentColor}`,
              background: isDark ? "#151518" : "#f8fafc",
            }}
          >
            <div
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: currentData.accentColor,
                marginBottom: 8,
              }}
            >
              ROLE OVERVIEW // {currentData.label.toUpperCase()}
            </div>
            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 15,
                lineHeight: 1.7,
                fontWeight: 500,
                color: textPrimary,
                margin: 0,
              }}
            >
              {currentData.roleOverview}
            </p>
          </div>

          {/* Section Subbar: Key Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 24px",
              borderBottom: `1px solid ${borderLine}`,
              background: isDark ? "#151518" : "#f4f4f5",
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
              01 // CORE PLATFORM CAPABILITIES
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              4 PILLARS
            </span>
          </div>

          {/* 2x2 Blueprint Grid for Key Actions */}
          <div className="bp-actions-grid">
            {currentData.keyActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <div
                  key={action.id}
                  className="bp-action-cell"
                  onMouseEnter={playMinimalHover}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 22px",
                      borderBottom: `1px solid ${borderLine}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: currentData.accentColor,
                      }}
                    >
                      {action.category}
                    </span>
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: textMeta,
                      }}
                    >
                      {action.id}
                    </span>
                  </div>
                  <div style={{ padding: "22px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        border: `1px solid ${borderLine}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: currentData.accentColor,
                        flexShrink: 0,
                      }}
                    >
                      <ActionIcon size={19} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontFamily: T.fontDisplay,
                          fontSize: 17.5,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          color: textPrimary,
                          marginBottom: 8,
                          lineHeight: 1.3,
                        }}
                      >
                        {action.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: T.fontDisplay,
                          fontSize: 14,
                          lineHeight: 1.6,
                          fontWeight: 500,
                          color: textSecondary,
                          margin: 0,
                        }}
                      >
                        {action.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section Subbar: Step-by-Step Workflow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 24px",
              borderBottom: `1px solid ${borderLine}`,
              background: isDark ? "#151518" : "#f4f4f5",
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
              02 // STEP-BY-STEP WORKFLOW ON ENSEMBLE
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              END-TO-END FLOW
            </span>
          </div>

          {/* 4-Column Workflow Row */}
          <div className="bp-workflow-grid">
            {currentData.workflow.map((item) => (
              <div
                key={item.step}
                className="bp-workflow-cell"
                onMouseEnter={playMinimalHover}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: currentData.accentColor,
                    }}
                  >
                    {item.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 11,
                      fontWeight: 700,
                      color: textMeta,
                    }}
                  >
                    STEP {item.step}
                  </span>
                </div>
                <h4
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 16.5,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    color: textPrimary,
                    marginBottom: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontWeight: 500,
                    color: textSecondary,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Section Subbar: Built-in Platform Tools */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 24px",
              borderBottom: `1px solid ${borderLine}`,
              background: isDark ? "#151518" : "#f4f4f5",
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
              03 // BUILT-IN STUDIO & MARKETPLACE TOOLS
            </span>
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              INCLUDED
            </span>
          </div>

          <div className="bp-cap-grid">
            {currentData.capabilities.map((cap) => (
              <div key={cap.code} className="bp-cap-cell" onMouseEnter={playMinimalHover}>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: currentData.accentColor,
                    marginBottom: 8,
                  }}
                >
                  {cap.code}
                </div>
                <h4
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 16,
                    fontWeight: 800,
                    color: textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {cap.title}
                </h4>
                <p
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontWeight: 500,
                    color: textSecondary,
                    margin: 0,
                  }}
                >
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Deliverables & Output Formats */}
          <div
            style={{
              padding: "22px 24px",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              SUPPORTED FORMATS & DELIVERABLES:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {currentData.deliverables.map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    border: `1px solid ${borderLine}`,
                    background: isDark ? "#18181b" : "#f4f4f5",
                    padding: "6px 12px",
                    fontFamily: T.fontMono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: textPrimary,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Call-to-Action Block */}
          <div
            style={{
              padding: "36px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
              background: isDark ? "#151518" : "#f8fafc",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(20px, 2.5vw, 26px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: textPrimary,
                  marginBottom: 6,
                }}
              >
                Ready to Get Started with {currentData.label}?
              </h3>
              <p
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: textSecondary,
                  margin: 0,
                }}
              >
                {currentData.ctaSub}
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleSignup}
                onMouseEnter={playMinimalHover}
                style={{
                  background: currentData.accentColor,
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 24px",
                  fontFamily: T.fontMono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {currentData.ctaText} <ArrowRight size={15} />
              </button>

              <button
                onClick={handleBack}
                onMouseEnter={playMinimalHover}
                style={{
                  background: "transparent",
                  color: textPrimary,
                  border: `1px solid ${borderLine}`,
                  padding: "12px 20px",
                  fontFamily: T.fontMono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageUsecase;
