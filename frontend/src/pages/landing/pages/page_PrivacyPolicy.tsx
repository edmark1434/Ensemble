import useGlobalState from "@/lib/global_state";
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Lock, Database, Globe, UserCheck } from "lucide-react";

const PagePrivacyPolicy: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);

  const navigate = useNavigate();

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
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", color: theme === 'dark' ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 32, fontSize: 14, fontWeight: 600 }}
            onMouseEnter={(e: any) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#111827'}
            onMouseLeave={(e: any) => e.currentTarget.style.color = theme === 'dark' ? "#7a8499" : "#6b7280"}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ background: "rgba(45, 212, 191, 0.1)", padding: 14, borderRadius: 20 }}>
              <Shield size={44} color="#2dd4bf" />
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Privacy Policy</h1>
              <p style={{ color: "#475569", margin: "8px 0 0 0", fontSize: 14, fontWeight: 600 }}>Effectivity Date: June 2026 • Secure Ecosystem Standard</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 60 }}>

          {/* Side Navigation */}
          <aside className="side-nav" style={{ width: 240, position: "sticky", top: 100, height: "fit-content" }}>
            <h4 style={{ fontSize: 11, color: "#2dd4bf", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>Privacy Index</h4>
            {sections.map(s => (
              <a key={s.id} onClick={() => scrollToSection(s.id)} className="nav-link">{s.title}</a>
            ))}
          </aside>

          {/* Main Policy Content */}
          <div className="content-area" style={{ flex: 1, maxWidth: 740 }}>

            <section id="collection" className="policy-section">
              <h2><Database size={20} color="#2dd4bf" /> 1. Information Collection</h2>
              <p>We collect information that identifies, relates to, or could reasonably be linked to you. This is essential for maintaining your collaborative video pipeline.</p>
              <div className="data-grid">
                <div className="data-card">
                  <h4>Identity</h4>
                  <p>Name, email, and account credentials used for access.</p>
                </div>
                <div className="data-card">
                  <h4>Assets</h4>
                  <p>Video files, metadata, and project timelines uploaded.</p>
                </div>
                <div className="data-card">
                  <h4>Billing</h4>
                  <p>Transaction history and encrypted payment tokens.</p>
                </div>
              </div>
            </section>

            <section id="usage" className="policy-section">
              <h2><Eye size={20} color="#2dd4bf" /> 2. Use of Information</h2>
              <p>Ensemble utilizes your data to power the core collaboration experience. We process data to facilitate real-time team editing, project rendering, and AI-assisted caption navigation.</p>
              <p>We strictly do not use your private video project data to train public AI models without your explicit, separate consent.</p>
            </section>

            <section id="sharing" className="policy-section">
              <h2><Globe size={20} color="#2dd4bf" /> 3. Information Sharing</h2>
              <p>We do not sell your personal information. Sharing only occurs with service providers necessary for our operations (e.g., AWS for cloud storage or Stripe for payments) or when required by law.</p>
            </section>

            <section id="security" className="policy-section">
              <div style={{ background: "rgba(45, 212, 191, 0.05)", border: "1px solid rgba(45, 212, 191, 0.1)", padding: 28, borderRadius: 20 }}>
                <h2><Lock size={20} color="#2dd4bf" /> 4. Data Security</h2>
                <p style={{ margin: 0 }}>Security is paramount. We employ AES-256 encryption at rest and TLS 1.3 for data in transit. Your project assets are isolated within secure cloud containers to prevent unauthorized cross-tenant access.</p>
              </div>
            </section>

            <section id="rights" className="policy-section" style={{ marginTop: 56 }}>
              <h2><UserCheck size={20} color="#2dd4bf" /> 5. Your Privacy Rights</h2>
              <p>Depending on your location, you have the right to access, correct, or delete your personal data. You can manage most of these settings directly via your Ensemble Account Dashboard.</p>
            </section>

            <section id="cookies" className="policy-section">
              <h2>6. Cookies and Tracking</h2>
              <p>We use essential cookies to maintain your login session and functional cookies to remember your workspace preferences (like dark mode and timeline zoom levels).</p>
            </section>

            <section id="retention" className="policy-section">
              <h2>7. Data Retention</h2>
              <p>We retain your project data as long as your account is active. Upon account deletion, we initiate a process to permanently scrub your assets from our active servers within 30 days.</p>
            </section>

            <section id="contact" className="policy-section">
              <h2>8. Contact Us</h2>
              <p>For privacy-related inquiries or to exercise your data rights, please contact our Data Privacy Officer at:</p>
              <div style={{ background: theme === 'dark' ? "#18181b" : theme === 'dark' ? "#ffffff" : "#111827", padding: "20px 24px", borderRadius: 12, border: "1px solid #1e2130", display: "inline-block" }}>
                <span style={{ color: theme === 'dark' ? '#ffffff' : '#111827', fontWeight: 700 }}>privacy@ensemble.dev</span>
              </div>
            </section>

            <div style={{ padding: "40px 0", borderTop: "1px solid #1e2130", color: "#475569", fontSize: 13, textAlign: "center" }}>
              © 2026 Ensemble Project • Privacy & Security Standards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagePrivacyPolicy;