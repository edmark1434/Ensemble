import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, ShieldCheck } from "lucide-react";

const PageTermsOfService: React.FC = () => {
  const navigate = useNavigate();

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
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 24px", position: "relative" }}>
      
      <style>{`
        .tos-section { margin-bottom: 48px; scroll-margin-top: 100px; }
        .tos-section h2 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .tos-section p { color: #94a3b8; line-height: 1.8; font-size: 15px; margin-bottom: 12px; }
        .tos-list { list-style: none; padding: 0; margin: 16px 0; }
        .tos-list li { color: #cbd5e1; padding: 8px 0; display: flex; gap: 12px; font-size: 14.5px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .nav-link { color: #64748b; font-size: 13px; cursor: pointer; transition: color 0.2s; padding: 6px 0; display: block; text-decoration: none; }
        .nav-link:hover { color: #3b82f6; }
        @media (max-width: 1024px) { .side-nav { display: none; } .content-area { margin-left: 0 !important; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        
        {/* Header Area */}
        <div style={{ marginBottom: 60 }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 32, fontSize: 14, fontWeight: 600 }}
            onMouseEnter={(e: any) => e.currentTarget.style.color = "#fff"}
            onMouseLeave={(e: any) => e.currentTarget.style.color = "#7a8499"}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 12, borderRadius: 16 }}>
              <Scale size={40} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Terms of Service</h1>
              <p style={{ color: "#475569", margin: "8px 0 0 0", fontSize: 14, fontWeight: 600 }}>Last Updated: June 2026 • Version 1.2</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 60 }}>
          
          {/* Quick Nav Sidebar */}
          <aside className="side-nav" style={{ width: 240, position: "sticky", top: 100, height: "fit-content" }}>
            <h4 style={{ fontSize: 12, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>On this page</h4>
            {sections.map(s => (
              <a key={s.id} onClick={() => scrollToSection(s.id)} className="nav-link">{s.title}</a>
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
              <p>You retain ownership of any content you upload, post, or share on the Platform. By submitting content, you grant Ensemble a worldwide, non-exclusive, royalty-free license to host, store, and display your content as necessary to provide the service.</p>
            </section>

            <section id="conduct" className="tos-section">
              <h2>5. Prohibited Conduct</h2>
              <p>You agree not to violate laws, infringe on IP rights, upload malicious code, or harass other users. Unauthorized commercial use or impersonation is strictly prohibited.</p>
            </section>

            <section id="payment" className="tos-section">
              <h2>6. Payment and Credits</h2>
              <p>Certain features may require payment or virtual credits. Credits are non-refundable, have no cash value, and all payments are processed through secure third-party partners.</p>
            </section>

            <section id="termination" className="tos-section">
              <h2>7. Termination</h2>
              <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that violates these terms or is harmful to the Platform.</p>
            </section>

            <section id="warranties" className="tos-section">
              <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.1)", padding: 24, borderRadius: 16 }}>
                <h2>8. Disclaimer of Warranties</h2>
                <p style={{ margin: 0 }}>The Platform is provided "as is" without warranties of any kind. We do not guarantee that the Platform will be uninterrupted, error-free, or free of viruses.</p>
              </div>
            </section>

            <section id="liability" className="tos-section" style={{ marginTop: 48 }}>
              <h2>9. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Ensemble shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the Platform.</p>
            </section>

            <section id="changes" className="tos-section">
              <h2>10. Changes to Terms</h2>
              <p>We may modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the modified terms.</p>
            </section>

            <div style={{ padding: "40px 0", borderTop: "1px solid #1e2130", color: "#475569", fontSize: 13, textAlign: "center" }}>
              © 2026 Ensemble Project • All Rights Reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTermsOfService;