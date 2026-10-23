import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronDown,
  Check,
  FileText,
  Edit3,
  Calendar,
  Clock,
  Briefcase,
  Paperclip,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  Play,
  Volume2,
  ExternalLink,
  UploadCloud,
  Image as ImageIcon,
  Video,
  File
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTerms } from "@/hooks/useTerms";
import { showSuccessToast } from "@/components/utility/toast";
import type { Job } from "../../../job_components/job_lists";

interface ProposalTermsProps {
  job?: Job | null;
  selectedTosId: string;
  setSelectedTosId: (id: string) => void;
  tosContent: string;
  setTosContent: (content: string) => void;
  workSampleFiles?: File[];
  setWorkSampleFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  onBack: () => void;
  onAdvance: () => void;
}

const DEFAULT_STANDARD_TOS = `1. Scope of Work: The freelancer agrees to perform the services and deliver the milestones outlined in this proposal.
2. Escrow & Milestones: Payment is held in secure escrow and released upon milestone completion and client review.
3. Revisions: Revisions will be fulfilled according to the agreed milestone specifications.
4. Ownership & Intellectual Property: Upon final payment, the client receives full rights and ownership of the delivered work.
5. Dispute Resolution: Any disagreements will follow the platform's standard dispute resolution process.`;

const MAX_LIMITS_MB: Record<string, number> = {
  video: 100,
  archive: 50,
  audio: 50,
  default: 25,
};

type FileType = "image" | "video" | "audio" | "pdf" | "other";

const getFileType = (file: File): FileType => {
  const mime = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) {
    return "audio";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  return "other";
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ProposalTermsStep: React.FC<ProposalTermsProps> = ({
  job,
  selectedTosId,
  setSelectedTosId,
  tosContent,
  setTosContent,
  workSampleFiles = [],
  setWorkSampleFiles,
  onBack,
  onAdvance,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { terms, fetchTerms } = useTerms();
  const [isFetchingTerms, setIsFetchingTerms] = useState(true);

  // Object URL previews state & memory leak cleanup
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());
  const [previewModalItem, setPreviewModalItem] = useState<{
    file: File;
    url: string;
    type: FileType;
    name: string;
    size: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsFetchingTerms(true);
    fetchTerms()
      .catch((err) => {
        console.error("Failed to load agreement terms", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsFetchingTerms(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [fetchTerms]);

  // Close preview modal on Escape key
  useEffect(() => {
    if (!previewModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModalItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalItem]);

  // Manage object URLs safely
  useEffect(() => {
    setPreviewUrls((prevMap) => {
      const nextMap = new Map<File, string>();

      // Keep existing URL if already created, else create new
      workSampleFiles.forEach((file) => {
        if (prevMap.has(file)) {
          nextMap.set(file, prevMap.get(file)!);
        } else {
          nextMap.set(file, URL.createObjectURL(file));
        }
      });

      // Revoke any removed file URLs
      prevMap.forEach((url, file) => {
        if (!workSampleFiles.includes(file)) {
          URL.revokeObjectURL(url);
        }
      });

      return nextMap;
    });
  }, [workSampleFiles]);

  // Revoke all created URLs when unmounting
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Only show Job terms
  const jobTerms = terms.filter((t) => t.terms_type === "jobs");
  const effectiveTerms = jobTerms.length > 0 ? jobTerms : [
    {
      id: "default-standard",
      terms_title: "Standard Platform Terms of Service",
      terms_content: DEFAULT_STANDARD_TOS,
      terms_type: "jobs",
      is_default: true,
    },
  ];

  // Set default if none selected, if placeholder is active, or if tosContent is empty
  useEffect(() => {
    if (jobTerms.length > 0) {
      const currentValid = jobTerms.some((t) => t.id === selectedTosId);
      if (!selectedTosId || !currentValid || selectedTosId === "default-standard") {
        const defaultTerm = jobTerms.find((t) => t.is_default) || jobTerms[0];
        setSelectedTosId(defaultTerm.id);
        if (!tosContent || tosContent === DEFAULT_STANDARD_TOS) {
          setTosContent(defaultTerm.terms_content);
        }
      }
    } else if (!selectedTosId && effectiveTerms.length > 0) {
      const defaultTerm = effectiveTerms.find((t) => t.is_default) || effectiveTerms[0];
      setSelectedTosId(defaultTerm.id);
      if (!tosContent) {
        setTosContent(defaultTerm.terms_content);
      }
    } else if (!tosContent && selectedTosId) {
      const found = effectiveTerms.find((t) => t.id === selectedTosId);
      if (found) {
        setTosContent(found.terms_content);
      }
    }
  }, [selectedTosId, effectiveTerms, jobTerms, setSelectedTosId, tosContent, setTosContent]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTosId(id);
    const found = effectiveTerms.find((t) => t.id === id);
    if (found) {
      setTosContent(found.terms_content);
    }
  };

  const handleIncomingFiles = (incoming: File[]) => {
    const valid: File[] = [];

    for (const f of incoming) {
      const fType = getFileType(f);
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isArchive = ["zip", "rar", "7z"].includes(ext) || f.type.includes("zip");
      const limit = fType === "video"
        ? MAX_LIMITS_MB.video
        : isArchive
        ? MAX_LIMITS_MB.archive
        : fType === "audio"
        ? MAX_LIMITS_MB.audio
        : MAX_LIMITS_MB.default;

      if (f.size > limit * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the ${limit}MB limit for ${fType} files.`);
        continue;
      }
      valid.push(f);
    }

    if (setWorkSampleFiles && valid.length > 0) {
      setWorkSampleFiles((prev) => {
        if (prev.length >= 3) {
          toast.error("Maximum 3 work samples allowed.");
          return prev;
        }
        const combined = [...prev, ...valid].slice(0, 3);
        const addedCount = combined.length - prev.length;
        if (addedCount > 0) {
          showSuccessToast(`Attached ${addedCount} work sample${addedCount === 1 ? "" : "s"}`);
        } else {
          toast.error("Maximum 3 work samples allowed.");
        }
        return combined;
      });
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    handleIncomingFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const selectedName =
    effectiveTerms.find((t) => t.id === selectedTosId)?.terms_title || "Standard Platform Terms of Service";

  const timelineDisplay = job?.timeline || (job?.minTimeline && job?.maxTimeline ? `${job.minTimeline} - ${job.maxTimeline} Days` : "Standard Delivery");
  const deadlineDisplay = job?.deadline || "Flexible Delivery";
  const ndaRequired = Boolean(job?.requireNDA || (job as any)?.require_nda);
  const portfolioAllowed = job?.portfolioUseAllowed !== undefined ? job.portfolioUseAllowed : (job as any)?.portfolio_use_allowed !== false;
  const portfolioDuration = (job as any)?.portfolioDuration || (job as any)?.portfolio_duration;

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Terms & Agreement (TOS)</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Select or author your service agreement terms, attach work samples, and verify client workflow rules.
        </p>
      </div>

      {/* Split Layout: Left (Select TOS & Contract Terms) vs Right (Work Samples & Client Specs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Select TOS & Active Contract Terms (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {isFetchingTerms ? (
            <div className="space-y-4 animate-pulse select-none" aria-busy="true">
              {/* Dropdown Skeleton */}
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-11 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-zinc-300 dark:bg-zinc-700" />
                    <div className="h-3.5 w-48 rounded bg-zinc-300 dark:bg-zinc-700" />
                  </div>
                  <div className="h-3.5 w-3.5 rounded bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </div>

              {/* Textarea Skeleton */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-52 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-2.5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="w-full h-[320px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-3">
                  <div className="h-3.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Template Selector Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                  Select Agreement Preset
                </label>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 px-4 py-3 text-xs text-left transition hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer shadow-2xs"
                >
                  <span className="text-zinc-900 dark:text-white font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    {selectedName}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-zinc-600 dark:text-zinc-300" : ""}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 4 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute left-0 right-0 z-30 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-2xl space-y-0.5"
                      >
                        {effectiveTerms.map((tmpl) => {
                          const isSelected = selectedTosId === tmpl.id;
                          return (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => {
                                handleSelectTemplate(tmpl.id);
                                setIsOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {tmpl.terms_title}
                                {tmpl.is_default && (
                                  <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 dark:text-zinc-300">
                                    DEFAULT
                                  </span>
                                )}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Editable TOS Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Active Contract Terms (Customizable)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Included in proposal contract binding
                  </span>
                </div>
                <textarea
                  rows={15}
                  value={tosContent}
                  onChange={(e) => setTosContent(e.target.value)}
                  className="w-full min-h-[320px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-4 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition resize-y leading-relaxed font-mono shadow-2xs"
                  placeholder="Specify your terms of service, revisions limits, delivery formats, and milestone conditions..."
                />
              </div>
            </>
          )}
        </div>

        {/* Right Column: Work Samples & Client Specifications (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          {/* 01. Work Samples & References Card with Rich Previews */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                <span>Work Samples & References</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {workSampleFiles.length} of 3 files
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Showcase relevant showreels, audio snippets, pitch documents, or past project exports for this application.
            </p>

            {/* Upload Dropzone (if fewer than 3 files attached) */}
            {workSampleFiles.length < 3 && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) {
                    handleIncomingFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
                    : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Click to upload or drag & drop files
                  </p>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Images (PNG, JPG, GIF), Video (MP4), Audio (MP3), Documents (PDF)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[9.5px] font-mono text-zinc-400">
                  <span>Max 3 files</span>
                  <span>•</span>
                  <span>Video 100MB</span>
                  <span>•</span>
                  <span>Audio 50MB</span>
                  <span>•</span>
                  <span>PDF/Images 25MB</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,application/pdf,.zip"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>
            )}

            {/* Uploaded File Previews List */}
            {workSampleFiles.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {workSampleFiles.map((file, idx) => {
                  const url = previewUrls.get(file);
                  const fType = getFileType(file);
                  const ext = file.name.split(".").pop()?.toLowerCase() || "";
                  const formattedSize = formatFileSize(file.size);

                  // 1. Image Preview Card (PNG, JPG, GIF, WebP)
                  if (fType === "image") {
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center gap-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div
                          onClick={() =>
                            url &&
                            setPreviewModalItem({
                              file,
                              url,
                              type: "image",
                              name: file.name,
                              size: formattedSize,
                            })
                          }
                          className="h-14 w-14 rounded-lg bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 relative cursor-pointer group"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={file.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-zinc-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[9px]">
                              {ext.toUpperCase()} IMAGE
                            </span>
                            <span>{formattedSize}</span>
                            {url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalItem({
                                    file,
                                    url,
                                    type: "image",
                                    name: file.name,
                                    size: formattedSize,
                                  })
                                }
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer ml-auto sm:ml-0"
                              >
                                <Eye className="h-3 w-3" /> Preview
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setWorkSampleFiles &&
                            setWorkSampleFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }

                  // 2. Video Preview Card (MP4, WebM, MOV)
                  if (fType === "video") {
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center gap-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div
                          onClick={() =>
                            url &&
                            setPreviewModalItem({
                              file,
                              url,
                              type: "video",
                              name: file.name,
                              size: formattedSize,
                            })
                          }
                          className="h-14 w-14 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 cursor-pointer relative group overflow-hidden"
                        >
                          {url ? (
                            <video
                              src={url}
                              className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
                              preload="metadata"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                            <Play className="h-4 w-4 fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono text-[9px]">
                              {ext.toUpperCase()} VIDEO
                            </span>
                            <span>{formattedSize}</span>
                            {url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalItem({
                                    file,
                                    url,
                                    type: "video",
                                    name: file.name,
                                    size: formattedSize,
                                  })
                                }
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer ml-auto sm:ml-0"
                              >
                                <Play className="h-3 w-3" /> Watch
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setWorkSampleFiles &&
                            setWorkSampleFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }

                  // 3. Audio Preview Card (MP3, WAV, etc. with playable inline audio)
                  if (fType === "audio") {
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-2.5 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Volume2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-mono text-[9px]">
                                  {ext.toUpperCase()} AUDIO
                                </span>
                                <span>{formattedSize}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setWorkSampleFiles &&
                              setWorkSampleFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {url && (
                          <div className="pt-0.5">
                            <audio
                              controls
                              src={url}
                              className="w-full h-8 rounded-lg bg-transparent"
                              preload="metadata"
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 4. PDF Preview Card
                  if (fType === "pdf") {
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center gap-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div
                          onClick={() =>
                            url &&
                            setPreviewModalItem({
                              file,
                              url,
                              type: "pdf",
                              name: file.name,
                              size: formattedSize,
                            })
                          }
                          className="h-14 w-14 rounded-lg bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer group"
                        >
                          <FileText className="h-5 w-5 mb-0.5 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-mono font-bold">PDF</span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-mono text-[9px]">
                              PDF DOCUMENT
                            </span>
                            <span>{formattedSize}</span>
                            {url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalItem({
                                    file,
                                    url,
                                    type: "pdf",
                                    name: file.name,
                                    size: formattedSize,
                                  })
                                }
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer ml-auto sm:ml-0"
                              >
                                <Eye className="h-3 w-3" /> View
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setWorkSampleFiles &&
                            setWorkSampleFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }

                  // 5. Other / Archive Card
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center gap-3"
                    >
                      <div className="h-11 w-11 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                        <File className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          <span className="uppercase font-mono">{ext}</span>
                          <span>•</span>
                          <span>{formattedSize}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkSampleFiles &&
                          setWorkSampleFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Additional Attach Button if under 3 files */}
                {workSampleFiles.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Attach Another Sample ({3 - workSampleFiles.length} slots left)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 02. Client's Job Specifications & Terms (Displayed like on job post) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-zinc-500" />
                <span>Client's Job Specifications & Terms</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">Poster Rules</span>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-4">
              {/* Confidentiality / NDA */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {ndaRequired ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Require Confidentiality (NDA)?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {ndaRequired
                      ? "Yes, freelancers cannot share details about this project during development."
                      : "No, a strict confidentiality agreement is not required."}
                  </p>
                </div>
              </div>

              {/* Portfolio Use */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {portfolioAllowed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Allow Portfolio Use?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {portfolioAllowed
                      ? `Yes, allowed to use output for portfolio (Up to ${portfolioDuration || 90} secs).`
                      : "No, not allowed to use final output for personal portfolio."}
                  </p>
                </div>
              </div>

              {/* Project Timeline */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-zinc-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Project Timeline
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {timelineDisplay}
                  </p>
                </div>
              </div>

              {/* Final Hard Deadline */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-zinc-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Hard Deadline
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {deadlineDisplay}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Lightbox Modal (Portal to document.body) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {previewModalItem && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm"
              onClick={() => setPreviewModalItem(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900">
                  <div className="flex items-center gap-2.5 min-w-0 pr-4">
                    {previewModalItem.type === "image" && <ImageIcon className="h-4 w-4 text-blue-400" />}
                    {previewModalItem.type === "video" && <Video className="h-4 w-4 text-purple-400" />}
                    {previewModalItem.type === "audio" && <Volume2 className="h-4 w-4 text-emerald-400" />}
                    {previewModalItem.type === "pdf" && <FileText className="h-4 w-4 text-rose-400" />}
                    <span className="text-xs font-bold text-white truncate" title={previewModalItem.name}>
                      {previewModalItem.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      ({previewModalItem.size})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={previewModalItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewModalItem(null)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-950/80 min-h-[300px]">
                  {previewModalItem.type === "image" && (
                    <img
                      src={previewModalItem.url}
                      alt={previewModalItem.name}
                      className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                    />
                  )}
                  {previewModalItem.type === "video" && (
                    <video
                      controls
                      autoPlay
                      src={previewModalItem.url}
                      className="max-h-[65vh] w-full rounded-lg shadow-2xl bg-black"
                    />
                  )}
                  {previewModalItem.type === "audio" && (
                    <div className="p-8 w-full max-w-lg flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Volume2 className="h-10 w-10" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{previewModalItem.name}</h4>
                        <p className="text-xs text-zinc-400">Audio playback preview</p>
                      </div>
                      <audio controls autoPlay src={previewModalItem.url} className="w-full" />
                    </div>
                  )}
                  {previewModalItem.type === "pdf" && (
                    <iframe
                      src={previewModalItem.url}
                      title={previewModalItem.name}
                      className="w-full h-[65vh] rounded-lg border border-zinc-800 bg-white"
                    />
                  )}
                  {previewModalItem.type === "other" && (
                    <div className="p-8 text-center space-y-3">
                      <Paperclip className="h-12 w-12 text-zinc-400 mx-auto" />
                      <p className="text-sm font-semibold text-zinc-200">{previewModalItem.name}</p>
                      <a
                        href={previewModalItem.url}
                        download={previewModalItem.name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-900 text-xs font-bold"
                      >
                        Download File
                      </a>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewModalItem(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Step Navigation Actions */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          disabled={isFetchingTerms}
          onClick={() => {
            if (isFetchingTerms) return;
            onAdvance();
          }}
          className="flex-1 max-w-sm flex items-center justify-center gap-2 py-3 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          {isFetchingTerms ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Loading Agreement Terms...</span>
            </span>
          ) : (
            <>
              <span>Confirm Terms & Proceed to Milestones</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProposalTermsStep;
