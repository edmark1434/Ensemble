import useGlobalState from "@/lib/global_state";
import React, { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, UserCheck } from "lucide-react";

const PagePrivacyPolicy: React.FC = () => {
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
    { id: "collection", title: "1. Information Collection" },
    { id: "usage", title: "2. Use of Information" },
    { id: "sharing", title: "3. Information Sharing" },
    { id: "security", title: "4. Data Security" },
    { id: "rights", title: "5. Your Privacy Rights" },
    { id: "cookies", title: "6. Cookies and Tracking" },
    { id: "retention", title: "7. Data Retention" },
    { id: "contact", title: "8. Contact Us" },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ background: theme === 'dark' ? "#121214" : "#f9fafb", minHeight: "100vh", color: theme === 'dark' ? '#ffffff' : '#111827', padding: "80px 24px", position: "relative" }}>

      <style>{`
        .policy-section { margin-bottom: 56px; scroll-margin-top: 100px; }
        .policy-section h2 { color: ${theme === 'dark' ? "#ffffff" : "#111827"}; font-size: 22px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; gap: 12px; }
        .policy-section p { color: #94a3b8; line-height: 1.8; font-size: 15px; margin-bottom: 16px; }
        .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; }
        .data-card { background: rgba(255,255,255,0.03); border: 1px solid ${theme === 'dark' ? "#27272a" : "#e5e7eb"}; padding: 20px; border-radius: 12px; }
        .data-card h4 { font-size: 14px; color: #2dd4bf; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
        .data-card p { font-size: 13px; margin: 0; color: #64748b; }
        .nav-link { color: #64748b; font-size: 13px; cursor: pointer; transition: color 0.2s; padding: 8px 0; display: block; text-decoration: none; }
        .nav-link:hover { color: #2dd4bf; }
        @media (max-width: 1024px) { .side-nav { display: none; } .content-area { margin-left: 0 !important; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>

        {/* Header Area */}
        <div style={{ marginBottom: 64 }}>
          <button
            onClick={() => { playSoftClick(); navigate(-1); }}
            style={{ background: "none", border: "none", color: theme === 'dark' ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 32, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
            onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#111827'; }}
            onMouseLeave={(e: any) => e.currentTarget.style.color = theme === 'dark' ? "#7a8499" : "#6b7280"}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ background: "rgba(45, 212, 191, 0.1)", padding: 16, borderRadius: 20 }}>
              <Shield size={44} color="#2dd4bf" />
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Privacy Policy</h1>
              <p style={{ color: "#475569", margin: "12px 0 0 0", fontSize: 15, fontWeight: 600 }}>Last Updated: March 15, 2024</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 64 }}>

          {/* Quick Nav Sidebar */}
          <aside className="side-nav" style={{ width: 260, position: "sticky", top: 100, height: "fit-content" }}>
            <h4 style={{ fontSize: 12, color: "#2dd4bf", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>Contents</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
            </div>
          </aside>

          {/* Policy Content */}
          <div className="content-area" style={{ flex: 1, maxWidth: 720 }}>

            <section id="collection" className="policy-section">
              <h2><Eye size={24} color="#2dd4bf" /> 1. Information Collection</h2>
              <p>We collect information you provide directly to us when you create an account, update your profile, use our collaborative features, or communicate with us. This includes your name, email address, profile picture, and any content you upload.</p>
              <p>We also automatically collect certain information when you access our Platform, including device information, log data, and usage statistics to improve our services.</p>
              
              <div className="data-grid">
                <div className="data-card">
                  <h4>Account Data</h4>
                  <p>Name, email, password (hashed), avatar, role.</p>
                </div>
                <div className="data-card">
                  <h4>Project Data</h4>
                  <p>Video files, timelines, comments, metadata.</p>
                </div>
                <div className="data-card">
                  <h4>Technical Data</h4>
                  <p>IP address, browser type, operating system.</p>
                </div>
              </div>
            </section>

            <section id="usage" className="policy-section">
              <h2><Database size={24} color="#2dd4bf" /> 2. Use of Information</h2>
              <p>We use the information we collect to provide, maintain, and improve our services, including:</p>
              <ul style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>
                <li>Facilitating real-time collaboration and video rendering.</li>
                <li>Processing transactions and managing your credits.</li>
                <li>Sending technical notices, updates, and security alerts.</li>
                <li>Responding to your comments, questions, and customer service requests.</li>
                <li>Analyzing usage trends to optimize platform performance.</li>
              </ul>
            </section>

            <section id="sharing" className="policy-section">
              <h2><Globe size={24} color="#2dd4bf" /> 3. Information Sharing</h2>
              <p>We do not sell your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>
                <li>With other users on projects you explicitly collaborate on.</li>
                <li>With vendors and service providers who need access to such information to carry out work on our behalf (e.g., cloud storage, payment processing).</li>
                <li>In response to a request for information if we believe disclosure is in accordance with any applicable law or legal process.</li>
              </ul>
            </section>

            <section id="security" className="policy-section">
              <h2><Lock size={24} color="#2dd4bf" /> 4. Data Security</h2>
              <p>We implement industry-standard security measures designed to protect your personal information from unauthorized access, use, or disclosure. This includes encryption of data in transit and at rest, regular security audits, and strict access controls.</p>
              <p>However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee its absolute security.</p>
            </section>

            <section id="rights" className="policy-section">
              <h2><UserCheck size={24} color="#2dd4bf" /> 5. Your Privacy Rights</h2>
              <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>
                <li>The right to access the personal information we hold about you.</li>
                <li>The right to request correction of inaccurate data.</li>
                <li>The right to request deletion of your personal data (Right to be Forgotten).</li>
                <li>The right to opt-out of marketing communications.</li>
              </ul>
            </section>

            <section id="cookies" className="policy-section">
              <h2>6. Cookies and Tracking</h2>
              <p>We use cookies and similar tracking technologies to track activity on our Platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
            </section>

            <section id="retention" className="policy-section">
              <h2>7. Data Retention</h2>
              <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Once an account is deleted, we securely purge associated user data within 30 days.</p>
            </section>

            <section id="contact" className="policy-section">
              <h2>8. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at:</p>
              <p style={{ color: "#2dd4bf", fontWeight: 600 }}>privacy@ensemble.app</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PagePrivacyPolicy;
