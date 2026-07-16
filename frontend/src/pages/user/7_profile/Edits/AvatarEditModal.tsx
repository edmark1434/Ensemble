import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Check, AlertTriangle } from "lucide-react";

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

  // Reset saved state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
    }
  }, [isOpen]);

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

  // Set initial preview when modal opens
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
          setIsCustomFile(true);
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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveClick = async () => {
    // Prevent multiple submissions
    if (isUploading || isSaved) return;
    
    setIsUploading(true);
    setFileError("");
    
    try {
      let savePromise;
      
      if (isCustomFile && selectedFile) {
        if (!validateImageFile(selectedFile)) {
          setIsUploading(false);
          return;
        }
        savePromise = onSave(selectedFile, false);
      } else if (selectedPresetId !== null) {
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
      
      // Close modal after successful save with a small delay
      setTimeout(() => {
        onClose();
      }, 300);
      
    } catch (error) {
      console.error('Error saving avatar:', error);
      setFileError('Failed to save avatar. Please try again.');
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
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#080a12]/95 backdrop-blur-md p-6 shadow-2xl font-['Plus Jakarta Sans',sans-serif] max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={isUploading}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-zinc-400 transition hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-4">
            <ImageIcon className="h-5 w-5" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Update Avatar Profile</h3>
          <p className="text-zinc-400 text-xs mb-6 max-w-xs leading-relaxed">
            Upload a customized image asset or select one of our curated design system profile presets.
          </p>

          {currentAvatarUrl && !isCustomFile && (
            <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs">
              <Check className="h-3 w-3" />
              <span>Current avatar selected</span>
            </div>
          )}

          <div className="relative w-28 h-28 rounded-full border-2 border-dashed p-1 bg-[#080a12] mb-6 transition-all duration-300"
               style={{ borderColor: isCustomFile ? '#4a6fa5' : selectedPresetId ? '#4a6fa5' : '#2a2d3e' }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#13151f] flex items-center justify-center">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-white">{currentAvatarName?.charAt(0) || "U"}</span>
              )}
            </div>

            <button
              onClick={triggerFileUpload}
              disabled={isUploading || isSaved}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-[#080a12] flex items-center justify-center cursor-pointer shadow-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload Custom Image"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
            className="hidden"
            disabled={isUploading || isSaved}
          />

          {fileError && (
            <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs text-left leading-relaxed">{fileError}</p>
            </div>
          )}

          {isCustomFile && selectedFile && !fileError && (
            <div className="flex items-center gap-2 mb-4 text-blue-400 text-xs bg-blue-500/10 px-3 py-1.5 rounded-full">
              <Check className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{selectedFile.name}</span>
              <span className="text-zinc-500 whitespace-nowrap">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <div className="w-full text-left">
            <label className="block text-zinc-500 text-xs font-semibold mb-3 tracking-wider uppercase">
              System Presets
            </label>

            <div className="grid grid-cols-6 gap-2 mb-6">
              {presets.map((preset) => {
                const fullUrl = constructAvatarUrl(preset.path);
                const isActive = !isCustomFile && selectedPresetId === preset.file_id;
                return (
                  <button
                    key={preset.file_id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.file_id, preset.path)}
                    disabled={isUploading || isSaved}
                    className={`relative w-full aspect-square rounded-full bg-[#13151f] overflow-hidden p-0 border-2 transition-all duration-200 hover:scale-105 ${
                      isActive 
                        ? "border-[#4a6fa5] shadow-[0_0_12px_rgba(74,111,165,0.3)] scale-105" 
                        : "border-transparent hover:border-zinc-500"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {fullUrl && (
                      <img 
                        src={fullUrl} 
                        alt={preset.name} 
                        className="w-full h-full object-cover scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full flex gap-3 mt-2">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 rounded-full border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={isUploading || isSaved || (!isCustomFile && !selectedPresetId && presets.length === 0)}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                isSaved
                  ? 'bg-emerald-500 text-white cursor-default'
                  : isUploading
                  ? 'bg-blue-500 text-white cursor-wait'
                  : 'bg-white text-[#080a12] hover:bg-zinc-200 active:scale-95 hover:shadow-lg hover:shadow-white/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved!
                </>
              ) : isUploading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}