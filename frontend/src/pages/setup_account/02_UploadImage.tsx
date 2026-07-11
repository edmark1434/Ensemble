import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";
import api from "../../lib/axios";

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
  fontBody:  "'Plus Jakarta Sans', sans-serif",
};

interface Preset {
  file_id: number;
  path: string;
  name: string;
}

export default function UploadImage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isCustomFile, setIsCustomFile] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await api.get("/api/files/profile-presets");
        setPresets(response.data.files);
        
        // Set first preset as default
        if (response.data.files && response.data.files.length > 0) {
          const firstPreset = response.data.files[0];
          const fullUrl = `${import.meta.env.VITE_CLOUDFRONT_URL}${firstPreset.path}`;
          setPreviewUrl(fullUrl);
          setSelectedPresetId(firstPreset.file_id);
        }
      } catch (error) {
        console.error("Error fetching presets:", error);
      }
    };
    fetchPresets();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsCustomFile(true);
      setSelectedPresetId(null);
    }
  };

  const handlePresetSelect = (presetId: number, presetUrl: string) => {
    setPreviewUrl(presetUrl);
    setIsCustomFile(false);
    setSelectedPresetId(presetId);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {

  let response = await api.post("/api/files/upload-url", {
    folder: "profile",
    filename: file.name,
    contentType: file.type,
  });

  let { uploadUrl, key } = response.data;

  let uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  // Upload URL expired
  if (uploadResponse.status === 403) {

    response = await api.post("/api/files/upload-url", {
      folder: "profile",
      fileName: file.name,
      contentType: file.type,
    });

    ({ uploadUrl, key } = response.data);

    uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
  }

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image (${uploadResponse.status})`);
  }

  return key;
};
const handleNext = async (e: React.FormEvent) => {

  e.preventDefault();
  setLoading(true);

  try {

    if (isCustomFile) {

      const file = fileInputRef.current?.files?.[0];

      if (!file) {
        throw new Error("Please select an image.");
      }

      const key = await uploadFile(file);

      await api.post("/api/accounts/update-profile", {
          name: file.name,
          path: key,
          mime_type: file.type,
          size_bytes: file.size,
        },
      );

      console.log("✅ Custom avatar uploaded.");

    } else {

      const selectedPreset = presets.find(
        p => p.file_id === selectedPresetId
      );

      await api.put("/api/accounts/update-profile-id", {
        fileId: selectedPreset?.file_id
      });
    }

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
          {/* Progress Bar */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>3 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          {/* Content */}
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

            {/* Avatar Preview */}
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
                  {previewUrl && (
                    <img src={previewUrl} alt="Avatar Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>

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

            {/* File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            {/* Presets */}
            <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 14 }}>
              Profile Presets
            </label>

            <div className="presets-grid">
              {presets.map((preset) => {
                const fullUrl = `${import.meta.env.VITE_CLOUDFRONT_URL}${preset.path}`;
                const isActive = !isCustomFile && selectedPresetId === preset.file_id;
                return (
                  <button
                    key={preset.file_id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.file_id, fullUrl)}
                    className={`preset-circle ${isActive ? "active" : ""}`}
                    title={preset.name}
                  >
                    <img src={fullUrl} alt={preset.name} />
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
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
                disabled={loading || !previewUrl}
                style={{
                  flex: 2, background: loading || !previewUrl ? "#555" : "#fff", color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading || !previewUrl ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading && previewUrl) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading && previewUrl) e.currentTarget.style.background = "#fff"; }}
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