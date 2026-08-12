import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileVideo, Image as ImageIcon, AlertCircle } from "lucide-react";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import toast from "react-hot-toast";

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_DURATION = 10; // 10 seconds

export const GalleryUploadModal: React.FC<GalleryUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  };

  const validateFile = (selectedFile: File): Promise<boolean> => {
    return new Promise((resolve) => {
      setError(null);
      
      const isVideo = selectedFile.type.startsWith('video/');
      const isImage = selectedFile.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        setError("Please select a valid image or video file.");
        return resolve(false);
      }

      if (isImage && selectedFile.size > MAX_IMAGE_SIZE) {
        setError(`Image size exceeds the 20MB limit. (Your file: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
        return resolve(false);
      }

      if (isVideo && selectedFile.size > MAX_VIDEO_SIZE) {
        setError(`Video size exceeds the 25MB limit. (Your file: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
        return resolve(false);
      }

      if (isVideo) {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        
        videoElement.onloadedmetadata = () => {
          window.URL.revokeObjectURL(videoElement.src);
          if (videoElement.duration > MAX_VIDEO_DURATION + 1) { // Adding 1s buffer
            setError(`Video duration exceeds the 10-second limit. (Your video: ${Math.round(videoElement.duration)}s)`);
            resolve(false);
          } else {
            resolve(true);
          }
        };
        
        videoElement.onerror = () => {
          setError("Failed to load video metadata.");
          resolve(false);
        };
        
        videoElement.src = URL.createObjectURL(selectedFile);
      } else {
        resolve(true);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isValid = await validateFile(selectedFile);
    
    if (isValid) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    try {
      const { fileId } = await uploadFileWithIntent(file, "gallery");

      // 4. Create Gallery Item
      await api.post("/api/accounts/galleries", {
        file_id: fileId,
        title: title.trim(),
        description: description.trim()
      });

      toast.success("Added to gallery!");
      onUploadComplete();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to upload to gallery.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-['Plus Jakarta Sans',sans-serif]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#0b0e17] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add to Gallery</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Showcase your best visual work.</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                disabled={isUploading}
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl flex gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <form id="gallery-form" onSubmit={handleSubmit} className="space-y-5">
                {/* File Upload Area */}
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
                    file 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
                      : 'border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 bg-gray-50 dark:bg-white/5'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    className="hidden"
                    disabled={isUploading}
                  />

                  {previewUrl ? (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/5 dark:bg-black/50">
                      {file?.type.startsWith('video/') ? (
                        <video src={previewUrl} className="w-full h-full object-contain" autoPlay muted loop />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                          <Upload className="w-4 h-4" /> Change File
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="flex justify-center gap-4 mb-4 text-gray-400 dark:text-zinc-500">
                        <ImageIcon className="w-10 h-10" />
                        <FileVideo className="w-10 h-10" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-1">
                        Click to upload an image or video
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Images (max 20MB) • Videos (max 10s, 25MB)
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={isUploading}
                    placeholder="e.g. Modern Dashboard UI Design"
                    className="w-full px-4 py-3 bg-white dark:bg-[#0b0e17] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                    placeholder="Tell us a little bit about this piece..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-[#0b0e17] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="gallery-form"
                disabled={!file || !title.trim() || isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white text-sm font-medium rounded-full transition-colors shadow-sm disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Add to Gallery
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
