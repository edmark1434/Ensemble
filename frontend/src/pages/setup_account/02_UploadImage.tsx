import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Image, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";

const T = {
  bg:        "#080a12",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:     "#888",
  dim:       "#555",
  error:     "#e05252",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
};

export default function UploadImage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("/profile_presets/p1.png");
  const [isCustomFile, setIsCustomFile] = useState(false);

  // Generate presets array dynamically from p1.png to p12.png
  const presets = Array.from({ length: 12 }, (_, i) => `/profile_presets/p13_UploadImage_preset_${i + 1}.png`.replace('p13_UploadImage_preset_', 'p'));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsCustomFile(true);
    }
  };

  const handlePresetSelect = (presetPath: string) => {
    setPreviewUrl(presetPath);
    setIsCustomFile(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      navigate("/setup/profile-setup");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .setup-page-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 100vh;
          background: ${T.bg};
          padding: 80px 20px;
          overflow-x: hidden;
        }

        .canvas-bg-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: auto;
        }

        .setup-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          font-family: ${T.fontBody};
          background: rgba(8, 10, 18, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid rgba(42, 45, 62, 0.4);
        }

        .animated-content {
          opacity: 0;
          transform: translateY(10px);
          animation: smooth-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }

        .preset-circle {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background: ${T.bgInput};
          border: 2px solid transparent;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s ease;
          padding: 0;
        }

        .preset-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.15);
          transition: transform 0.2s ease;
        }

        .preset-circle:hover img {
          transform: scale(1.25);
        }

        .preset-circle:hover {
          transform: scale(1.08);
          border-color: ${T.dim};
        }

        .preset-circle.active {
          border-color: ${T.accent};
          transform: scale(1.08);
          box-shadow: 0 0 12px rgba(74, 111, 165, 0.3);
        }

        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="setup-page-wrapper">
        {/* Dynamic Canvas Background Module Integration */}
        <div className="canvas-bg-container">
          <ShapeGrid
            direction="diagonal"
            speed={0.3}
            borderColor="rgba(42, 45, 62, 0.3)"
            squareSize={45}
            hoverFillColor="rgba(74, 111, 165, 0.15)"
            hoverTrailAmount={4}
            shape="square"
          />
        </div>

        <div className="setup-card">

          {/* Static Progress Bar Tracker — Stage 3 / 5 (60%) */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>3 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          {/* Core Layout Content */}
          <div className="animated-content">
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <Image className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              Choose avatar profile
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Upload a customized system media asset file or select one of our curated design profile presets.
            </p>

            {/* Main Interactive Avatar Preview Ring */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div
                style={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `2px dashed ${isCustomFile ? T.accent : T.border}`,
                  padding: 4,
                  background: T.bg,
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: T.bgInput }}>
                  <img src={previewUrl} alt="Avatar Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>

                {/* Upload Trigger Floating Circle Button */}
                <button
                  onClick={triggerFileUpload}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#fff",
                    color: "#080a12",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.4)"
                  }}
                  title="Upload Custom Image"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Hidden Input Component Node */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            {/* Selection Title */}
            <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 14 }}>
              Profile Presets
            </label>

            {/* 12-Item Circle Vector Grid Module */}
            <div className="presets-grid">
              {presets.map((presetPath, idx) => {
                const isActive = !isCustomFile && previewUrl === presetPath;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(presetPath)}
                    className={`preset-circle ${isActive ? "active" : ""}`}
                  >
                    <img src={presetPath} alt={`Preset ${idx + 1}`} />
                  </button>
                );
              })}
            </div>

            {/* Flow Actions Navigation Rack */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/setup/personal-details")}
                style={{
                  flex: 1, background: "none", border: `1px solid ${T.border}`, color: T.text, padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                style={{
                  flex: 2, background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
              >
                {loading ? "Processing..." : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}