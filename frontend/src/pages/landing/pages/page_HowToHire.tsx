import useGlobalState from "@/lib/global_state";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Send,
  CheckSquare,
  FileText,
  ShieldAlert,
  PlusCircle,
  Inbox,
  Layers,
  ArrowRight
} from "lucide-react";

const PageHowToHire: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"gigs" | "jobs">("gigs");

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

  const handleBack = () => {
    playClick();
    navigate("/");
  };

  const handleTab = (tab: "gigs" | "jobs") => {
    playClick();
    setActiveTab(tab);
  };

  const GIGS_STEPS = [
    { icon: <Search size={22} />, title: "1. Look for gigs / services", desc: "Browse our global creative marketplace to discover pre-packaged services from top video editors, sound engineers, and creators." },
    { icon: <Send size={22} />, title: "2. Send a Request", desc: "Submit your project brief directly to the creator detailing your specific creative requirements and timeline metrics." },
    { icon: <CheckSquare size={22} />, title: "3. Get Shortlisted and Discuss", desc: "Connect via integrated tools to realign goals, refine project requirements, and outline essential milestones." },
    { icon: <FileText size={22} />, title: "4. Offer Contract", desc: "Send a formalized contract offer locking in the project scope, pricing milestones, and concrete delivery expectations." },
    { icon: <ShieldAlert size={22} />, title: "5. Agree to the Terms of Service & Platform Terms", desc: "Finalize compliance through secure digital agreements to safeguard your project funds under escrow protection." }
  ];

  const JOBS_STEPS = [
    { icon: <PlusCircle size={22} />, title: "1. Post a Job post", desc: "Publish an open call to our ecosystem outlining budget ranges, skill benchmarks, and asset delivery goals for free." },
    { icon: <Inbox size={22} />, title: "2. Receive proposals from freelancers", desc: "Review customized cover letters, live studio portfolio samples, and transparent bids directly inside your dashboard workspace." },
    { icon: <Layers size={22} />, title: "3. Shortlist and Discuss", desc: "Isolate high-tier talent pools to run high-fidelity interviews and refine deliverable roadmaps collaboratively." },
    { icon: <FileText size={22} />, title: "4. Offer Contract", desc: "Extend an official production work order detailing the project scope and protected payout release triggers." },
    { icon: <ShieldAlert size={22} />, title: "5. Agree to the Terms of Service & Platform Terms", desc: "Confirm structural platform alignments and initiate secure escrow configurations before tracking your milestones." }
  ];

  const activeSteps = activeTab === "gigs" ? GIGS_STEPS : JOBS_STEPS;
  const accentColor = "#3b82f6"; // Blue theme for hiring
  const badgeColor = "rgba(59, 130, 246, 0.1)";

  return (
    <div className="page-enter" style={{ background: theme === 'dark' ? "#121214" : "#f9fafb", minHeight: "100vh", color: theme === 'dark' ? '#ffffff' : '#111827', padding: "80px 24px", position: "relative" }}>
      <style>{`
        @keyframes swipeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .page-enter {
          animation: swipeInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toggle-btn {
          flex: 1; padding: 14px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; border-radius: 12px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-card {
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"}; border: 1px solid ${theme === 'dark' ? "#27272a" : "#e5e7eb"}; padding: 28px; border-radius: 18px; display: flex; gap: 24px; alignItems: start; position: relative; transition: all 0.25s ease;
        }
        .step-card:hover {
          border-color: ${accentColor}; transform: translateX(4px); background: ${theme === 'dark' ? '#111424' : '#eff6ff'};
        }
        @media (max-width: 640px) {
          .step-card { flex-direction: column; gap: 16px; }
        }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 10 }}>
        {/* Navigation Head */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", color: theme === 'dark' ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, transition: "color 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.color = theme === 'dark' ? "#fff" : "#111827"; playMinimalHover(); }} onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? "#7a8499" : "#6b7280"}>
            <ArrowLeft size={16} /> Back
          </button>
          
          <button onClick={() => { playClick(); navigate("/landing/HowToWork"); }} style={{ background: "none", border: "none", color: accentColor, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, transition: "opacity 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; playMinimalHover(); }} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
            How to Work <ArrowRight size={16} />
          </button>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 5vw, 42px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>How to Hire on Ensemble</h1>
        <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", fontSize: 17, marginBottom: 44, lineHeight: 1.6 }}>Find world-class creative assets and post-production specialists to scale up your studio workflows.</p>

        {/* Dynamic Navigation Toggle Switch */}
        <div style={{ display: "flex", background: theme === 'dark' ? "rgba(255,255,255,0.02)" : "#f3f4f6", border: theme === 'dark' ? "1px solid #1e2130" : "1px solid #e5e7eb", padding: 6, borderRadius: 16, marginBottom: 48 }}>
          <button className="toggle-btn" style={{ background: activeTab === "gigs" ? accentColor : "transparent", color: activeTab === "gigs" ? '#ffffff' : theme === 'dark' ? "#7a8499" : "#6b7280" }} onClick={() => handleTab("gigs")} onMouseEnter={playMinimalHover}>
            A. GIGS (Buy Services)
          </button>
          <button className="toggle-btn" style={{ background: activeTab === "jobs" ? accentColor : "transparent", color: activeTab === "jobs" ? '#ffffff' : theme === 'dark' ? "#7a8499" : "#6b7280" }} onClick={() => handleTab("jobs")} onMouseEnter={playMinimalHover}>
            B. JOBS (Post Requirements)
          </button>
        </div>

        {/* Dynamic Card Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {activeSteps.map((step, idx) => (
            <div key={idx} className="step-card" onMouseEnter={playMinimalHover}>
              <div style={{ background: badgeColor, color: accentColor, padding: 12, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: theme === 'dark' ? '#ffffff' : '#111827' }}>{step.title}</h3>
                <p style={{ color: theme === 'dark' ? "#7a8499" : "#6b7280", lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageHowToHire;