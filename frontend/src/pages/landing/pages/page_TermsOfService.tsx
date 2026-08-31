import useGlobalState from "@/lib/global_state";
import React, { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, ShieldCheck } from "lucide-react";

const PageTermsOfService: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const navigate = useNavigate();

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

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "description", title: "2. Description of Service" },
    { id: "accounts", title: "3. User Accounts" },
    { id: "content", title: "4. User Content" },
    { id: "conduct", title: "5. Prohibited Conduct" },
    { id: "payment", title: "6. Payment and Credits" },
    { id: "termination", title: "7. Termination" },
    { id: "warranties", title: "8. Disclaimer of Warranties" },
    { id: "liability", title: "9. Limitation of Liability" },
    { id: "changes", title: "10. Changes to Terms" },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ background: theme === 'dark' ? "#121214" : "#f9fafb", minHeight: "100vh", color: theme === 'dark' ? '#ffffff' : '#111827', padding: "80px 24px", position: "relative" }}>
      
      <style>{`
        .tos-section { margin-bottom: 48px; scroll-margin-top: 100px; }
        .tos-section h2 { color: ${theme === 'dark' ? "#ffffff" : "#111827"}; font-size: 22px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .tos-section p { color: #94a3b8; line-height: 1.8; font-size: 15px; margin-bottom: 12px; }
        .tos-list { list-style: none; padding: 0; margin: 16px 0; }
        .tos-list li { color: ${theme === 'dark' ? "#cbd5e1" : "#4b5563"}; padding: 8px 0; display: flex; gap: 12px; font-size: 14.5px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .nav-link { color: #64748b; font-size: 13px; cursor: pointer; transition: color 0.2s; padding: 6px 0; display: block; text-decoration: none; }
        .nav-link:hover { color: #3b82f6; }
        @media (max-width: 1024px) { .side-nav { display: none; } .content-area { margin-left: 0 !important; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        
        {/* Header Area */}
        <div style={{ marginBottom: 60 }}>
          <button 
            onClick={() => { playSoftClick(); navigate(-1); }} 
            style={{ background: "none", border: "none", color: theme === 'dark' ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 32, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
            onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#111827'; }}
            onMouseLeave={(e: any) => e.currentTarget.style.color = theme === 'dark' ? "#7a8499" : "#6b7280"}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 12, borderRadius: 16 }}>
              <Scale size={40} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Terms of Service</h1>
              <p style={{ color: "#475569", margin: "8px 0 0 0", fontSize: 14, fontWeight: 600 }}>Last Updated: March 15, 2024</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 60 }}>
          
          {/* Quick Nav Sidebar */}
          <aside className="side-nav" style={{ width: 240, position: "sticky", top: 100, height: "fit-content" }}>
            <h4 style={{ fontSize: 12, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>On this page</h4>
            {sections.map(s => (
              <a 
                key={s.id} 
                onClick={() => { playSoftClick(); scrollToSection(s.id); }} 
                onMouseEnter={playHover}
                className="nav-link"
              >
                {s.title}
              </a>
            ))}
          </aside>

          {/* Terms Content */}
          <div className="content-area" style={{ flex: 1, maxWidth: 700 }}>
            
            <section id="acceptance" className="tos-section">
              <h2>1. Acceptance of Terms</h2>
              <p>By accessing and using Ensemble ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
            </section>

            <section id="description" className="tos-section">
              <h2>2. Description of Service</h2>
              <p>Ensemble provides a collaborative video editing platform that allows users to create, edit, share, and collaborate on video projects. The Platform includes features such as project management, team collaboration, asset marketplace, and job posting services.</p>
            </section>

            <section id="accounts" className="tos-section">
              <h2>3. User Accounts</h2>
              <p>To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
              <ul className="tos-list">
                <li><ShieldCheck size={16} color="#3b82f6" /> You must be at least 13 years old to use the Platform.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> You agree to provide accurate and complete information.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> You are responsible for all content you post or share.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> You may not share your account credentials with others.</li>
              </ul>
            </section>

            <section id="content" className="tos-section">
              <h2>4. User Content</h2>
              <p>You retain all rights to any content you upload, post, or display on or through the Platform. By uploading content, you grant Ensemble a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content solely for the purpose of providing the Service.</p>
            </section>

            <section id="conduct" className="tos-section">
              <h2>5. Prohibited Conduct</h2>
              <p>You agree not to engage in any of the following activities:</p>
              <ul className="tos-list">
                <li><ShieldCheck size={16} color="#3b82f6" /> Violating any laws or third-party rights.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> Distributing malware, viruses, or harmful code.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> Attempting to gain unauthorized access to the Platform.</li>
                <li><ShieldCheck size={16} color="#3b82f6" /> Interfering with or disrupting the Service.</li>
              </ul>
            </section>

            <section id="payment" className="tos-section">
              <h2>6. Payment and Credits</h2>
              <p>Certain features may require payment. All fees are stated in US Dollars and are non-refundable unless otherwise specified. Ensemble Credits purchased on the Platform have no cash value and cannot be exchanged for fiat currency.</p>
            </section>

            <section id="termination" className="tos-section">
              <h2>7. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the Platform.</p>
            </section>

            <section id="warranties" className="tos-section">
              <h2>8. Disclaimer of Warranties</h2>
              <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE.</p>
            </section>

            <section id="liability" className="tos-section">
              <h2>9. Limitation of Liability</h2>
              <p>IN NO EVENT SHALL ENSEMBLE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
            </section>

            <section id="changes" className="tos-section">
              <h2>10. Changes to Terms</h2>
              <p>We may modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Platform after any such changes constitutes your acceptance of the new Terms.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTermsOfService;
