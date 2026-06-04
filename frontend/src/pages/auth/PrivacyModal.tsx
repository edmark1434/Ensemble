import React from "react";
import { X, Shield } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const PrivacyModal: React.FC<ModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Shield size={20} color="#2dd4bf" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Privacy Policy</h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={modalBodyStyle}>
          <p style={textStyle}><strong>1. Information Collection</strong><br />
          We collect information necessary to facilitate video collaboration, including account details and project assets uploaded to our cloud.</p>

          <p style={textStyle}><strong>2. Data Usage</strong><br />
          Your data is used to maintain your workspaces and improve tools. We do not sell your personal project data to third parties.</p>

          <p style={textStyle}><strong>3. Security</strong><br />
          Ensemble uses industry-standard encryption for all video asset transfers and financial transactions.</p>
        </div>

        <div style={modalFooterStyle}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => { onAccept(); onClose(); }} style={primaryBtnColor}>I Understand</button>
        </div>
      </div>
    </div>
  );
};

// Reusing most styles from TermsModal, just changing the accent button
const primaryBtnColor = { background: "#2dd4bf", color: "#080a12", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: 600, cursor: "pointer" };
// (Assumes other styles are identical to the ones defined in TermsModal)

const modalOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { background: "#0d0f1a", border: "1px solid #2a2d3e", borderRadius: "20px", width: "90%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" };
const modalHeaderStyle: React.CSSProperties = { padding: "20px 24px", borderBottom: "1px solid #2a2d3e", display: "flex", justifyContent: "space-between", alignItems: "center" };
const modalBodyStyle: React.CSSProperties = { padding: "24px", overflowY: "auto", flex: 1 };
const modalFooterStyle: React.CSSProperties = { padding: "20px 24px", borderTop: "1px solid #2a2d3e", display: "flex", justifyContent: "flex-end", gap: "12px" };
const textStyle = { color: "#888", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" };
const closeBtnStyle = { background: "none", border: "none", color: "#888", cursor: "pointer" };
const secondaryBtnStyle = { background: "transparent", color: "#888", border: "1px solid #2a2d3e", padding: "10px 20px", borderRadius: "30px", fontWeight: 600, cursor: "pointer" };

export default PrivacyModal;