import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, Image as ImageIcon, Check, AlertTriangle, ZoomIn, ZoomOut } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface Preset {
  file_id: number;
  path: string;
  name: string;
}

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileOrPresetId: File | number, isPreset: boolean) => void;
  currentAvatarName?: string;
  currentAvatarUrl?: string;
  presets?: Preset[];
}

// Helper to create an Image object
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); 
    image.src = url;
  });

// Canvas cropping logic
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string,
  fileType: string = "image/jpeg"
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(new File([file], fileName, { type: fileType }));
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, fileType, 1.0);
  });
}

export default function AvatarEditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentAvatarName,
  currentAvatarUrl,
  presets = [] 
}: AvatarEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCustomFile, setIsCustomFile] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
    }
  }, [isOpen]);

  const sanitizeFileName = (fileName: string): string => {
    const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_\s]/g, '');
    if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
      throw new Error('Invalid file name');
    }
    return sanitized;
  };

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
    return true;
  };

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
    const presetMatch = path.match(/p\d+\.png$/i);
    if (presetMatch) {
      return `/profile_presets/${presetMatch[0]}`;
    }
    const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || 'https://d15a5u50m6q2z2.cloudfront.net';
    if (!cloudfrontUrl) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    if (cleanPath.includes('..')) {
      console.error('Security: Path traversal attempt detected');
      return '';
    }
    return `${cloudfrontUrl}/${cleanPath}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (currentAvatarUrl) {
        const safeUrl = constructAvatarUrl(currentAvatarUrl);
        setPreviewUrl(safeUrl);
        const matchingPreset = presets.find(p => 
          constructAvatarUrl(p.path) === safeUrl || 
          p.path === currentAvatarUrl
        );
        if (matchingPreset) {
          setSelectedPresetId(matchingPreset.file_id);
          setIsCustomFile(false);
        } else {
          setIsCustomFile(false);
          setSelectedPresetId(null);
        }
      } else if (presets.length > 0) {
        const firstPreset = presets[0];
        const fullUrl = constructAvatarUrl(firstPreset.path);
        setPreviewUrl(fullUrl);
        setSelectedPresetId(firstPreset.file_id);
        setIsCustomFile(false);
      }
    }
    
    return () => {
      setFileError("");
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, currentAvatarUrl, presets]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    
    if (!file) return;

    if (!validateImageFile(file)) {
      setSelectedFile(null);
      setIsCustomFile(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const img = new Image();
        img.onload = () => {
          if (img.width > 4000 || img.height > 4000) {
            setFileError('Security: Image dimensions exceed 4000x4000 limit');
            return;
          }
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setSelectedFile(file);
          setIsCustomFile(true);
          setSelectedPresetId(null);
          setFileError("");
          setZoom(1);
          setCrop({ x: 0, y: 0 });
          setIsAdjusting(false);
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

  const handlePresetSelect = (presetId: number, presetPath: string) => {
    const fullUrl = constructAvatarUrl(presetPath);
    if (!fullUrl) {
      setFileError('Security: Invalid preset URL');
      return;
    }
    setPreviewUrl(fullUrl);
    setSelectedFile(null);
    setIsCustomFile(false);
    setSelectedPresetId(presetId);
    setFileError("");
    setIsAdjusting(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveClick = async () => {
    if (isUploading || isSaved) return;
    setIsUploading(true);
    setFileError("");
    
    try {
      let savePromise;
      if ((isCustomFile || isAdjusting) && previewUrl && croppedAreaPixels) {
        // We crop the image exactly how they adjusted it
        const originalName = selectedFile?.name || (previewUrl.toLowerCase().split('?')[0].endsWith('.png') ? "avatar.png" : "avatar.jpg");
        const originalType = selectedFile?.type || (previewUrl.toLowerCase().split('?')[0].endsWith('.png') ? "image/png" : "image/jpeg");
        
        const croppedFile = await getCroppedImg(
          previewUrl,
          croppedAreaPixels,
          originalName,
          originalType
        );
        
        if (!validateImageFile(croppedFile)) {
          setIsUploading(false);
          return;
        }
        savePromise = onSave(croppedFile, false);
      } else if (selectedPresetId !== null) {
        if (selectedPresetId === -1 || (currentAvatarUrl && constructAvatarUrl(previewUrl) === constructAvatarUrl(currentAvatarUrl))) {
          // They selected the exact same image they already have, no need to save
          setIsSaved(true);
          setTimeout(() => onClose(), 300);
          return;
        }
        savePromise = onSave(selectedPresetId, true);
      } else if (presets.length > 0) {
        savePromise = onSave(presets[0].file_id, true);
      } else {
        setFileError('No avatar selected');
        setIsUploading(false);
        return;
      }

      await savePromise;
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 300);
      
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to save avatar. Please try again.';
      setFileError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    if (!isUploading && !isSaved) {
      fileInputRef.current?.click();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-dark-base/95 backdrop-blur-md p-6 lg:p-8 shadow-2xl font-['Plus Jakarta Sans',sans-serif] max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={isUploading}
          className="absolute right-4 top-4 rounded-full bg-gray-100 dark:bg-white/10 p-1.5 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-200 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Avatar Profile</h3>
          </div>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            Upload your custom image and adjust it perfectly, or choose a curated preset.
          </p>
        </div>

        {fileError && (
          <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs text-left leading-relaxed">{fileError}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* LEFT SIDE: Preview & Cropper */}
          <div className="w-full lg:w-1/2 flex flex-col items-center">
            {isCustomFile || isAdjusting ? (
              <div className="w-full">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#13151f] border border-gray-200 dark:border-white/10">
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <div className="mt-4 flex items-center gap-3 px-2">
                  <ZoomOut className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <ZoomIn className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                </div>
                <div className="flex justify-between items-center mt-2 px-2">
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium">
                    Drag image to reposition
                  </p>
                  {!isCustomFile && (
                    <button 
                      onClick={() => {
                        setIsAdjusting(false);
                        setZoom(1);
                        setCrop({x:0, y:0});
                      }}
                      className="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition"
                    >
                      Cancel Adjust
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-dark-base mb-4 shadow-xl">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-[#13151f] flex items-center justify-center">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <span className="text-4xl font-bold text-gray-400 dark:text-white">{currentAvatarName?.charAt(0) || "U"}</span>
                    )}
                  </div>
                </div>
                {currentAvatarUrl && !isCustomFile && selectedPresetId === null && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full mb-3">
                    <Check className="h-4 w-4" />
                    <span>Current avatar selected</span>
                  </div>
                )}
                {previewUrl && (
                  <button 
                    onClick={() => setIsAdjusting(true)}
                    className="mt-2 text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-full transition"
                  >
                    Adjust Image
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Upload & Presets */}
          <div className="w-full lg:w-1/2 flex flex-col justify-start border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/10 pt-6 lg:pt-0 lg:pl-10">
            
            <label className="block text-gray-800 dark:text-white text-sm font-bold mb-3 tracking-wide">
              Custom Upload
            </label>
            <button
              onClick={triggerFileUpload}
              disabled={isUploading || isSaved}
              className="w-full border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 hover:border-blue-500/50 transition-all cursor-pointer mb-8 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-10 h-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                <Upload className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-zinc-200">Click to upload image</span>
              <span className="text-xs text-gray-500 dark:text-zinc-500 mt-1">JPEG, PNG, WEBP (Max 5MB)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
              className="hidden"
              disabled={isUploading || isSaved}
            />

            <label className="block text-gray-800 dark:text-white text-sm font-bold mb-3 tracking-wide">
              System Presets
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {presets.map((preset) => {
                const fullUrl = constructAvatarUrl(preset.path);
                const isActive = !isCustomFile && selectedPresetId === preset.file_id;
                return (
                  <button
                    key={preset.file_id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.file_id, preset.path)}
                    disabled={isUploading || isSaved}
                    className={`relative w-full aspect-square rounded-full overflow-hidden p-0 border-2 transition-all duration-200 hover:scale-105 ${
                      isActive 
                        ? "border-[#4a6fa5] shadow-[0_0_12px_rgba(74,111,165,0.3)] scale-105 bg-white dark:bg-dark-base" 
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-zinc-500 bg-gray-50 dark:bg-[#13151f]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {fullUrl && (
                      <img 
                        src={fullUrl} 
                        alt={preset.name} 
                        className="w-full h-full object-cover scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 text-sm font-semibold text-gray-600 dark:text-zinc-400 transition hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isUploading || isSaved || (!isCustomFile && !selectedPresetId && presets.length === 0)}
                className={`flex-1 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
                  isSaved
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 cursor-default'
                    : isUploading
                    ? 'bg-blue-500 text-white shadow-blue-500/20 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved!
                  </>
                ) : isUploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}