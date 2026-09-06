import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowLeft, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Is it free to post a project listing?",
    a: "Yes, posting structural job requests in the creative marketplace is completely free. You only fund contract milestones when you select a freelancer."
  },
  {
    q: "How do parallel real-time editing workflows work?",
    a: "Ensemble routes asset configurations instantly. Multiple team members can apply caption markers or configure edit structures concurrently without rendering large source video chunks locally."
  },
  {
    q: "What fee percentage does the marketplace process?",
    a: "Ensemble maintains a competitive platform commission structure designed to optimize payouts for freelance creators while guaranteeing reliable escrow protection infrastructure for corporate clients."
  },
  {
    q: "How does the contract escrow system protect my funds?",
    a: "When a client signs a project agreement, the milestone budget is securely deposited into an independent platform escrow hold. Funds are only transferred to the creative professional once the client explicitly reviews and approves the completed deliverable."
  },
  {
    q: "Are my high-resolution raw video assets stored securely?",
    a: "Absolutely. All media content is completely isolated within encrypted, secure cloud containers using enterprise-grade AES-256 protocols at rest. Your creative intellectual property belongs entirely to you and remains safe from unauthorized access."
  },
  {
    q: "Will the AI caption tool train its models using my private footage?",
    a: "No. Your security is fundamental to our architecture. Ensemble strictly processes your project audio strings locally and dynamically to power timeline scrubbing and clip searching — we never use your video assets for public data model training."
  },
  {
    q: "What video formats and resolution export tiers are supported?",
    a: "The ecosystem handles all professional standards natively. Free users can execute 720p outputs, while upgrading to Premium opens up high-bitrate 1080p, and Business accounts unlock absolute 2K to 4K ProRes deliverables."
  },
  {
    q: "How do payouts work for creative asset sales and custom gigs?",
    a: "Whenever another user downloads an active marketplace preset or completes a milestone payout, the capital routes directly onto your dashboard wallet balance. You can pull earnings to your verified external banking accounts reliably at any time."
  }
];

const PageFAQ: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
      hoverAudioRef.current.volume = 0.15;
    }
    if (!softClickAudioRef.current) {
      softClickAudioRef.current = new Audio("/sounds/softclick.mp3");
      softClickAudioRef.current.volume = 0.4;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playSoftClick = useCallback(() => {
    initAudio();
    if (softClickAudioRef.current) {
      softClickAudioRef.current.currentTime = 0;
      softClickAudioRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div style={{ background: theme === 'dark' ? "#121214" : "#f9fafb", minHeight: "100vh", color: theme === 'dark' ? '#ffffff' : '#111827', padding: "80px 24px", position: "relative", overflowX: "hidden" }}>

      {/* Component Micro-Styles */}
      <style>{`
        .faq-card {
          background: ${theme === 'dark' ? "#18181b" : "#ffffff"};
          border: 1px solid ${theme === 'dark' ? "#27272a" : "#e5e7eb"};
          borderRadius: 16px;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .faq-card.active {
          border-color: #3b82f6;
          background: ${theme === 'dark' ? 'rgba(24, 24, 27, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.1);
        }
        @keyframes faqSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .faq-answer {
          padding: 0 32px 24px 32px;
          color: ${theme === 'dark' ? "#7a8499" : "#6b7280"};
          font-size: 15px;
          line-height: 1.6;
          animation: faqSlideIn 0.2s ease forwards;
        }
      `}</style>

      {/* Decorative Ambient Background Blur */}
      <div style={{ position: "absolute", width: "500px", height: "500px", background: "rgba(59, 130, 246, 0.03)", filter: "blur(140px)", top: "15%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* Navigation Action */}
        <button
          onClick={() => { playSoftClick(); navigate(-1); }}
          style={{ background: "none", border: "none", color: theme === 'dark' ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 36, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { playHover(); e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#111827'; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = theme === 'dark' ? "#7a8499" : "#6b7280"; }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Section Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 10, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HelpCircle size={32} color="#3b82f6" />
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Frequently Asked Questions</h1>
            <p style={{ color: "#475569", margin: "6px 0 0 0", fontSize: 14, fontWeight: 600 }}>Everything you need to know about the Ensemble ecosystem</p>
          </div>
        </div>

        {/* Accordion List Content Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className={`faq-card ${isOpen ? "active" : ""}`}>
                <button
                  onClick={() => { playSoftClick(); setOpenIdx(isOpen ? null : idx); }}
                  onMouseEnter={playHover}
                  style={{ width: "100%", background: "none", border: "none", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: isOpen ? theme === 'dark' ? '#ffffff' : '#111827' : theme === 'dark' ? "#cbd5e1" : "#4b5563", transition: "color 0.2s", paddingRight: 16 }}>
                    {item.q}
                  </span>
                  <ChevronDown size={18} color={isOpen ? "#3b82f6" : theme === 'dark' ? "#7a8499" : "#6b7280"} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }} />
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default PageFAQ;
