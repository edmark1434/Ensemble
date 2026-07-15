import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Image, ArrowRight, ArrowLeft, Upload, Check, AlertTriangle } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";
import api from "../../lib/axios";
import toast from "react-hot-toast";

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
  const [fileError, setFileError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // ✅ ADDED: Store file in state
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const response = await api.get("/api/users/session");
        if (response.data.steps) {
          navigate("/*");
        }
    }
    checkOnboardingStatus();
  }, []);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif'
  ];


  // Security: Sanitize file name
  const sanitizeFileName = (fileName: string): string => {
    const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_\s]/g, '');
    if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
      throw new Error('Invalid file name');
    }
    return sanitized;
  };

  // Security: Validate file
  const validateImageFile = (file: File): boolean => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError(`Security: File type "${file.type}" is not allowed. Please use JPEG, PNG, GIF, WebP, SVG, or AVIF.`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(`Security: File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }

    if (file.size === 0) {
      setFileError('Security: File is empty');
      return false;
    }

    try {
      sanitizeFileName(file.name);
    } catch {
      setFileError('Security: Invalid file name detected');
      return false;
    }

    const executableExtensions = ['exe', 'bat', 'cmd', 'sh', 'js', 'jar', 'war', 'ear'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && executableExtensions.includes(fileExtension)) {
      setFileError('Security: Executable files are not allowed');
      return false;
    }

    const xssPatterns = /<|>|script|onload|onerror|javascript:/i;
    if (xssPatterns.test(file.name)) {
      setFileError('Security: Invalid characters in file name');
      return false;
    }

    setFileError('');
    return true;
  };

  // Security: Construct URL safely
  const constructAvatarUrl = (path: string): string => {
    if (!path) return '';
    
    if (path.startsWith('http')) {
      const trustedDomains = [
        import.meta.env.VITE_CLOUDFRONT_URL,
        import.meta.env.VITE_CDN_URL,
        window.location.origin
      ].filter(Boolean);
      
      try {
        const url = new URL(path);
        const isTrusted = trustedDomains.some(domain => 
          url.origin === domain || url.origin === domain.replace(/\/$/, '')
        );
        
        if (!isTrusted) {
          console.error('Security: Untrusted URL detected');
          return '';
        }
        return path;
      } catch {
        return '';
      }
    }
    
    const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
    if (!cloudfrontUrl) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    if (cleanPath.includes('..')) {
      console.error('Security: Path traversal attempt detected');
      return '';
    }
    
    return `${cloudfrontUrl}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await api.get("/api/files/profile-presets");
        const presetFiles = response.data.files || [];
        setPresets(presetFiles);
        
        if (presetFiles.length > 0) {
          const firstPreset = presetFiles[0];
          const fullUrl = constructAvatarUrl(firstPreset.path);
          setPreviewUrl(fullUrl);
          setSelectedPresetId(firstPreset.file_id);
          setIsCustomFile(false);
        }
      } catch (error) {
        console.error("Error fetching presets:", error);
      }
    };
    fetchPresets();
  }, []);

  useEffect(() => {
    setIsSaved(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    
    if (!file) return;

    if (!validateImageFile(file)) {
      setIsCustomFile(false);
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const img = new window.Image();
        img.onload = () => {
          if (img.width > 4000 || img.height > 4000) {
            setFileError('Security: Image dimensions exceed 4000x4000 limit');
            return;
          }
          
          const pixelCount = img.width * img.height;
          if (file.size < (pixelCount / 100) && pixelCount > 1000000) {
            setFileError('Security: Invalid image content detected (potential image bomb)');
            return;
          }
          
          // ✅ Store file in state
          setSelectedFile(file);
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setIsCustomFile(true);
          setSelectedPresetId(null);
          setFileError("");
          setIsSaved(false);
        };
        img.onerror = () => {
          setFileError('Security: Invalid image file');
        };
        img.src = event.target?.result as string;
      } catch {
        setFileError('Security: Failed to validate image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (presetId: number, presetUrl: string) => {
    setPreviewUrl(presetUrl);
    setIsCustomFile(false);
    setSelectedPresetId(presetId);
    setSelectedFile(null);
    setFileError("");
    setIsSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    if (!isUploading && !isSaved) {
      fileInputRef.current?.click();
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      const response = await api.post("/api/files/upload-url", {
        folder: "profile",
        filename: file.name,
        contentType: file.type,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get upload URL');
      }

      let { uploadUrl, key, expiresIn, maxFileSize } = response.data;
      
      console.log('📤 Upload URL received:', {
        key,
        expiresIn: `${expiresIn} seconds`,
        maxFileSize: `${maxFileSize / 1024 / 1024}MB`
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (uploadResponse.status === 403) {
        console.log("⚠️ Upload URL expired, requesting new one...");
        
        const newResponse = await api.post("/api/files/upload-url", {
          folder: "profile",
          filename: file.name,
          contentType: file.type,
        });

        if (!newResponse.data.success) {
          throw new Error(newResponse.data.message || 'Failed to get new upload URL');
        }

        const { uploadUrl: newUploadUrl, key: newKey } = newResponse.data;

        uploadResponse = await fetch(newUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "x-amz-server-side-encryption": "AES256",
          },
          body: file,
        });

        key = newKey;
      }

      if (!uploadResponse.ok) {
        if (uploadResponse.status === 403) {
          throw new Error('Permission denied. Please check your S3 bucket permissions.');
        }
        if (uploadResponse.status === 413) {
          throw new Error('File is too large. Maximum size is 5MB.');
        }
        if (uploadResponse.status === 415) {
          throw new Error('File type not supported.');
        }
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      console.log('✅ File uploaded successfully:', key);
      return key;

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.response?.status === 401) {
        throw new Error('Please log in to upload files.');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many upload attempts. Please try again later.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid file or folder.');
      }
      
      throw new Error(error.message || 'Failed to upload image. Please try again.');
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUploading || isSaved || loading) return;
    
    setIsUploading(true);
    setLoading(true);
    setFileError("");

    try {
      if (isCustomFile) {
        // ✅ Use selectedFile from state instead of ref
        const file = selectedFile;
        
        if (!file) {
          setFileError('Please select an image file to upload.');
          setIsUploading(false);
          setLoading(false);
          return;
        }

        // Re-validate file before upload
        if (!validateImageFile(file)) {
          setIsUploading(false);
          setLoading(false);
          return;
        }

        const toastId = toast.loading('Uploading avatar...');

        try {
          const key = await uploadFile(file);

          const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
          const fullUrl = `${cloudfrontUrl}/${key}`;

          await api.post("/api/accounts/update-profile", {
            name: file.name,
            path: key,
            mime_type: file.type,
            size_bytes: file.size,
          });

          console.log("✅ Custom avatar uploaded.");
          toast.success("Avatar uploaded successfully!", { id: toastId });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to upload avatar.", { id: toastId });
          throw error;
        }
      } else {
        const selectedPreset = presets.find(
          p => p.file_id === selectedPresetId
        );

        if (!selectedPreset) {
          throw new Error("No preset selected");
        }

        await api.put("/api/accounts/update-profile-id", {
          fileId: selectedPreset.file_id
        });
        console.log("✅ Preset avatar selected.");
      }

      // Update onboarding status
      try {
        const response = await api.get("/api/users/session");
        if (!response.data.steps) {
          if (!response.data.steps) {
            await api.put("/api/accounts/update-profile-onboarding", {
              completed_onboarding: 'profile'
            });
          }
        }
      } catch (error) {
        console.error("Error updating onboarding:", error);
      }

      setIsSaved(true);
      
      setTimeout(() => {
        navigate("/setup/survey");
      }, 500);

    } catch (err) {
      console.error(err);
      setFileError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
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
          position: relative;
        }

        .preset-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.15);
          transition: transform 0.2s ease;
        }

        .preset-circle:hover:not(.disabled) img {
          transform: scale(1.25);
        }

        .preset-circle:hover:not(.disabled) {
          transform: scale(1.08);
          border-color: ${T.dim};
        }

        .preset-circle.active {
          border-color: ${T.accent};
          transform: scale(1.08);
          box-shadow: 0 0 12px rgba(74, 111, 165, 0.3);
        }

        .preset-circle.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preset-circle .check-mark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 50%;
        }

        .preset-circle .check-mark svg {
          color: white;
          width: 16px;
          height: 16px;
        }

        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 0.8s linear infinite;
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
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>3 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

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

            {fileError && (
              <div style={{
                width: "100%",
                marginBottom: 16,
                padding: "12px 14px",
                background: "rgba(224, 82, 82, 0.1)",
                border: "1px solid rgba(224, 82, 82, 0.2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "flex-start",
                gap: 8
              }}>
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p style={{ color: "#e05252", fontSize: 12, textAlign: "left", lineHeight: 1.4 }}>{fileError}</p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <div
                style={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `2px dashed ${isCustomFile ? T.accent : selectedPresetId ? T.accent : T.border}`,
                  padding: 4,
                  background: T.bg,
                  transition: "border-color 0.3s ease"
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: T.bgInput }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>
                      <Image className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <button
                  onClick={triggerFileUpload}
                  disabled={isUploading || isSaved}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: isUploading || isSaved ? "#555" : "#fff",
                    color: isUploading || isSaved ? "#888" : "#080a12",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isUploading || isSaved ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
                    transition: "all 0.2s ease"
                  }}
                  title="Upload Custom Image"
                  onMouseEnter={(e) => {
                    if (!isUploading && !isSaved) {
                      e.currentTarget.style.transform = "scale(1.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
              style={{ display: "none" }}
              disabled={isUploading || isSaved}
            />

            {isCustomFile && previewUrl && !fileError && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                padding: "6px 14px",
                background: "rgba(74, 111, 165, 0.1)",
                borderRadius: 20,
                justifyContent: "center"
              }}>
                <Check className="h-3.5 w-3.5" style={{ color: T.accent }} />
                <span style={{ color: T.accent, fontSize: 11, fontWeight: 500 }}>
                  Custom image selected
                </span>
              </div>
            )}

            <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 14 }}>
              Profile Presets
            </label>

            <div className="presets-grid">
              {presets.map((preset) => {
                const fullUrl = constructAvatarUrl(preset.path);
                const isActive = !isCustomFile && selectedPresetId === preset.file_id;
                const isDisabled = isUploading || isSaved;
                return (
                  <button
                    key={preset.file_id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.file_id, fullUrl)}
                    disabled={isDisabled}
                    className={`preset-circle ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    title={preset.name}
                  >
                    <img src={fullUrl} alt={preset.name} />
                    {isActive && (
                      <div className="check-mark">
                        <Check />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/setup/personal-details")}
                disabled={isUploading}
                style={{
                  flex: 1,
                  background: "none",
                  border: `1px solid ${T.border}`,
                  color: isUploading ? T.dim : T.text,
                  padding: "12px 20px",
                  borderRadius: 30,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isUploading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: isUploading ? 0.5 : 1,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.borderColor = T.borderFoc;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isUploading || isSaved || loading || !previewUrl}
                style={{
                  flex: 2,
                  background: (isUploading || isSaved || loading || !previewUrl) ? "#555" : "#fff",
                  color: (isUploading || isSaved || loading || !previewUrl) ? "#888" : "#080a12",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 30,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: (isUploading || isSaved || loading || !previewUrl) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                  transform: isUploading || isSaved || loading || !previewUrl ? "none" : "scale(1)",
                  boxShadow: isUploading || isSaved || loading || !previewUrl ? "none" : "0 4px 15px rgba(255,255,255,0.1)"
                }}
                onMouseEnter={(e) => {
                  if (!isUploading && !isSaved && !loading && previewUrl) {
                    e.currentTarget.style.background = "#e8e8e8";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUploading && !isSaved && !loading && previewUrl) {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
                onMouseDown={(e) => {
                  if (!isUploading && !isSaved && !loading && previewUrl) {
                    e.currentTarget.style.transform = "scale(0.95)";
                  }
                }}
                onMouseUp={(e) => {
                  if (!isUploading && !isSaved && !loading && previewUrl) {
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : (isUploading || loading) ? (
                  <>
                    <div className="spin" style={{
                      width: 16,
                      height: 16,
                      border: "2px solid #888",
                      borderTopColor: "#080a12",
                      borderRadius: "50%"
                    }} />
                    Processing...
                  </>
                ) : (
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