import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PlusCircle,
  Inbox,
  Layers,
  FileText,
  ShieldAlert,
  Search,
  Send,
  Upload,
  Coins,
  FileCheck,
  Wallet
} from "lucide-react";

type WorkTrack = "gigs" | "jobs" | "assets";

const PageHowToWork: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkTrack>("gigs");

  const GIGS_STEPS = [
    { icon: <PlusCircle size={22} />, title: "1. Post a Gig Post / Your Service", desc: "Package your skills into specific offers with fixed pricing tiers, delivery turnarounds, and examples of your best work." },
    { icon: <Inbox size={22} />, title: "2. Receive Requests from Clients", desc: "Get instantly notified when clients buy your preset gig packages or message you for a custom production quote." },
    { icon: <Layers size={22} />, title: "3. Shortlist and Discuss", desc: "Sync directly with the client to align on creative direction, timeline requirements, and project scope landmarks." },
    { icon: <FileText size={22} />, title: "4. Offered a Contract", desc: "Receive an official milestone-backed platform contract offer ensuring your timeline and payment conditions are fully protected." },
    { icon: <ShieldAlert size={22} />, title: "5. Agree to the Terms of Service & Platform Terms", desc: "Formally accept the project terms to lock in escrow protection, allowing you to begin editing with absolute payment security." }
  ];

  const JOBS_STEPS = [
    { icon: <Search size={22} />, title: "1. Look for a Job Post", desc: "Browse open production briefs from creators, studios, and agencies looking for your exact technical skillset." },
    { icon: <Send size={22} />, title: "2. Send a Proposal", desc: "Submit a high-converting bid detailing your relevant editing experience, specific budget quote, and timeline milestones." },
    { icon: <Layers size={22} />, title: "3. Get shortlisted and discuss", desc: "Jump into real-time collaborative workspaces to conduct direct alignment reviews and clarify complex deliverables." },
    { icon: <FileText size={22} />, title: "4. Offer Contract", desc: "Finalize negotiation points to receive your official work order contract designating production parameters." },
    { icon: <ShieldAlert size={22} />, title: "5. Agree to the Terms of Service & Platform Terms", desc: "Sign off on standard platform regulations to start tracking tasks and trigger automated escrow protections." }
  ];

  const ASSETS_STEPS = [
    { icon: <Upload size={22} />, title: "1. Upload your asset", desc: "Upload your high-grade video templates, transition bundles, custom LUTs, sound effects, or premium overlays." },
    { icon: <Coins size={22} />, title: "2. Monetize", desc: "Set your own pricing structure, choose your licensing options, and write optimized product meta-tags to maximize store discovery." },
    { icon: <FileCheck size={22} />, title: "3. Submit and wait for approval", desc: "Our global QA curation board quickly reviews technical compliance metrics to keep assets on our front page premium quality." },
    { icon: <Wallet size={22} />, title: "4. Earn money", desc: "Collect passive income payments directly onto your dashboard wallet balance for every single marketplace download." }
  ];

  // Dynamically switch track contents and colors based on active state selection
  const getTrackDetails = () => {
    switch(activeTab) {
      case "jobs":
        return { steps: JOBS_STEPS, accent: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" }; // Purple Accent
      case "assets":
        return { steps: ASSETS_STEPS, accent: "#10b981", bg: "rgba(16, 185, 129, 0.1)" }; // Emerald Accent
      case "gigs":
      default:
        return { steps: GIGS_STEPS, accent: "#2dd4bf", bg: "rgba(45, 212, 191, 0.1)" }; // Teal Accent
    }
  };

  const { steps, accent, bg } = getTrackDetails();

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 24px", position: "relative", overflowX: "hidden" }}>

      {/* Optimized Micro-Styles */}
      <style>{`
        .segment-btn {
          flex: 1; padding: 14px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; border-radius: 12px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-card {
          background: #0d0f1a; border: 1px solid #1e2130; padding: 28px; border-radius: 18px; display: flex; gap: 24px; align-items: start; position: relative; transition: all 0.25s ease;
        }
        .step-card:hover {
          border-color: var(--dynamic-accent); transform: translateX(4px); background: #111424;
        }
        @media (max-width: 768px) {
          .segment-bar { flex-direction: column; gap: 6px; padding: 10px !important; }
          .step-card { flex-direction: column; gap: 16px; }
        }
      `}</style>

      {/* Hardware-Accelerated Dynamic Ambient Glow Backdrop */}
      <div style={{
        position: "absolute",
        width: "500px",
        height: "500px",
        background: accent,
        opacity: 0.04,
        filter: "blur(140px)",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        transition: "background 0.5s ease"
      }} />

      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* Navigation Head */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 36, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#7a8499"}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 42px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>How to Work on Ensemble</h1>
        <p style={{ color: "#7a8499", fontSize: 17, marginBottom: 44, lineHeight: 1.6 }}>Grow your production career, secure premium contracts, and monetize creative assets on your own terms.</p>

        {/* Premium 3-Way Structural Switcher Bar */}
        <div className="segment-bar" style={{ display: "flex", background: "rgba(255,255,255,0.02)", border: "1px solid #1e2130", padding: 6, borderRadius: 16, marginBottom: 48, gap: 4 }}>
          <button className="segment-btn" style={{ background: activeTab === "gigs" ? "#2dd4bf" : "transparent", color: activeTab === "gigs" ? "#080a12" : "#7a8499" }} onClick={() => setActiveTab("gigs")}>
            A. GIGS (Sell Services)
          </button>
          <button className="segment-btn" style={{ background: activeTab === "jobs" ? "#a855f7" : "transparent", color: activeTab === "jobs" ? "#fff" : "#7a8499" }} onClick={() => setActiveTab("jobs")}>
            B. JOBS (Send Bids)
          </button>
          <button className="segment-btn" style={{ background: activeTab === "assets" ? "#10b981" : "transparent", color: activeTab === "assets" ? "#080a12" : "#7a8499" }} onClick={() => setActiveTab("assets")}>
            C. ASSET CREATION
          </button>
        </div>

        {/* Dynamic Card Feed Loop */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, ["--dynamic-accent" as any]: accent }}>
          {steps.map((step, idx) => (
            <div key={idx} className="step-card">
              <div style={{ background: bg, color: accent, padding: 12, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s ease" }}>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#fff" }}>{step.title}</h3>
                <p style={{ color: "#7a8499", lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageHowToWork;