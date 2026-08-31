import React from "react";
import { X, Scale } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const TermsModal: React.FC<ModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Scale size={20} color="#4a6fa5" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Terms of Service</h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {/* Scrollable Body */}
        <div style={modalBodyStyle}>
          <p style={textStyle}><strong>1. Acceptance of Terms</strong><br />
          By accessing and using Ensemble ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>

          <p style={textStyle}><strong>2. Description of Service</strong><br />
          Ensemble provides a collaborative video editing platform that allows users to create, edit, share, and collaborate on video projects.</p>

          <p style={textStyle}><strong>3. User Accounts</strong><br />
          You must be at least 13 years old to use the Platform. You are responsible for all content you post or share and must provide accurate information.</p>

          <p style={textStyle}><strong>4. User Content</strong><br />
          You retain ownership of any content you upload. By submitting content, you grant Ensemble a license to host and display it as necessary to provide the service.</p>

          <p style={textStyle}><strong>5. Payment and Credits</strong><br />
          All payments are processed securely. Virtual credits are non-refundable and have no cash value.</p>
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => { onAccept(); onClose(); }} style={primaryBtnStyle}>I Agree</button>
        </div>
      </div>
    </div>
  );
};

// Shared Styles
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  background: "var(--auth-bgPanel, #1e1f22)", border: "1px solid var(--auth-border, #2a2d3e)", borderRadius: "20px",
  width: "90%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column",
  color: "var(--auth-text, #fff)", fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const modalHeaderStyle: React.CSSProperties = {
  padding: "20px 24px", borderBottom: "1px solid var(--auth-border, #2a2d3e)", display: "flex",
  justifyContent: "space-between", alignItems: "center",
};

const modalBodyStyle: React.CSSProperties = {
  padding: "24px", overflowY: "auto", flex: 1,
};

const modalFooterStyle: React.CSSProperties = {
  padding: "20px 24px", borderTop: "1px solid var(--auth-border, #2a2d3e)", display: "flex",
  justifyContent: "flex-end", gap: "12px",
};

const textStyle = { color: "var(--auth-muted, #888)", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" };
const closeBtnStyle = { background: "none", border: "none", color: "var(--auth-muted, #888)", cursor: "pointer" };
const primaryBtnStyle = { background: "var(--auth-text, #fff)", color: "var(--auth-bg, #080a12)", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: 600, cursor: "pointer" };
const secondaryBtnStyle = { background: "transparent", color: "var(--auth-muted, #888)", border: "1px solid var(--auth-border, #2a2d3e)", padding: "10px 20px", borderRadius: "30px", fontWeight: 600, cursor: "pointer" };

export default TermsModal;