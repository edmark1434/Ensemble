import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Edit3,
  ChevronDown,
  Check,
  UploadCloud,
  X,
  Image as ImageIcon,
  Video,
  File,
  CheckCircle2,
  Minus,
  Plus,
  Play,
  Volume2,
  ExternalLink,
  Eye,
  ListTodo,
  Upload,
  Lock,
  Sparkles,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTerms } from "@/hooks/useTerms";
import { showErrorToast } from "@/components/utility/toast";
import type { Questionnaire } from "../../gig_datasets";

interface GigTermsProps {
  termsOfService: string;
  setTermsOfService: (val: string) => void;
  selectedTosId: string;
  setSelectedTosId: (val: string) => void;
  workSampleFiles: File[];
  setWorkSampleFiles: React.Dispatch<React.SetStateAction<File[]>>;
  slots: number;
  setSlots: (val: number) => void;
  additionalWorkRate: number;
  setAdditionalWorkRate: React.Dispatch<React.SetStateAction<number>> | ((val: number) => void);
  // Workflow terms props
  askNDA: boolean;
  setAskNDA: (val: boolean) => void;
  askPortfolio: boolean;
  setAskPortfolio: (val: boolean) => void;
  portfolioDuration?: string;
  setPortfolioDuration?: (val: string) => void;
  // Requirements & questionnaires props
  questionnaires: Questionnaire[];
  setQuestionnaires: React.Dispatch<React.SetStateAction<Questionnaire[]>>;
  errors?: Record<string, string>;
  setErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNext: () => void;
  onBack: () => void;
}

const DEFAULT_STANDARD_GIG_TOS = `1. Deliverables & Intellectual Property: All master deliverables and project assets remain the property of the creator/team until final milestone release.
2. Source Files: Final rendered project files and exported masters will be delivered upon order completion.
3. Platform Communication: All client-creator collaboration, asset exchange, and feedback will be conducted via Ensemble platform workspace.
4. Scope of Revisions: Revisions outside the agreed tier quota or phase checklist will be billed at the standard additional revision rate.
5. Content Rights: Client confirms they own or have licensed all source media, music, and assets provided for editing.`;

const QUICK_RATE_PRESETS = [25, 30, 35, 40, 50];

const QUESTION_TYPES = [
  { id: "text", label: "Fill in the blank", icon: FileText },
  { id: "file", label: "Upload a file", icon: Upload },
  { id: "choice", label: "Multiple choice", icon: ListTodo },
];

type SampleFileType = "image" | "video" | "audio" | "pdf" | "other";

const getSampleFileType = (file: File): SampleFileType => {
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

export const GigTerms: React.FC<GigTermsProps> = ({
  termsOfService,
  setTermsOfService,
  selectedTosId,
  setSelectedTosId,
  workSampleFiles,
  setWorkSampleFiles,
  slots,
  setSlots,
  additionalWorkRate = 25,
  setAdditionalWorkRate,
  askNDA,
  setAskNDA,
  askPortfolio,
  setAskPortfolio,
  portfolioDuration: externalPortfolioDuration,
  setPortfolioDuration: externalSetPortfolioDuration,
  questionnaires,
  setQuestionnaires,
  errors = {},
  setErrors,
  onNext,
  onBack,
}) => {
  const [internalPortfolioDuration, setInternalPortfolioDuration] = useState<string>("30");
  const portfolioDuration = externalPortfolioDuration !== undefined ? externalPortfolioDuration : internalPortfolioDuration;
  const setPortfolioDuration = externalSetPortfolioDuration || setInternalPortfolioDuration;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { terms, fetchTerms } = useTerms();

  // Object URLs for previewing uploaded files
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());
  const [previewModalItem, setPreviewModalItem] = useState<{
    file: File;
    url: string;
    type: SampleFileType;
    name: string;
    size: string;
  } | null>(null);

  // Manage object URLs lifecycle
  useEffect(() => {
    setPreviewUrls((prevMap) => {
      const nextMap = new Map<File, string>();
      workSampleFiles.forEach((file) => {
        if (prevMap.has(file)) {
          nextMap.set(file, prevMap.get(file)!);
        } else {
          nextMap.set(file, URL.createObjectURL(file));
        }
      });
      prevMap.forEach((url, file) => {
        if (!workSampleFiles.includes(file)) {
          URL.revokeObjectURL(url);
        }
      });
      return nextMap;
    });
  }, [workSampleFiles]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Load standard TOS by default if empty
  useEffect(() => {
    if (!termsOfService) {
      setTermsOfService(DEFAULT_STANDARD_GIG_TOS);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const presetList = [
    { terms_id: "default-standard", terms_title: "Standard Platform Terms of Service", terms_description: DEFAULT_STANDARD_GIG_TOS },
    ...(terms || []).filter((t: any) => t.terms_type === "gigs" || t.terms_type === "standard"),
  ];

  const handleSelectPreset = (preset: any) => {
    setSelectedTosId(preset.terms_id);
    setTermsOfService(preset.terms_description || "");
    setIsDropdownOpen(false);
  };

  const handleDecrementRate = () => {
    setAdditionalWorkRate((prev: number) => Math.max(25, (Number(prev) || 25) - 5));
  };

  const handleIncrementRate = () => {
    setAdditionalWorkRate((prev: number) => Math.min(100, (Number(prev) || 25) + 5));
  };

  const handleFileProcess = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = Array.from(files);

    if (workSampleFiles.length + allowed.length > 6) {
      showErrorToast("Maximum 6 work samples allowed.");
      return;
    }

    const validFiles: File[] = [];
    for (const file of allowed) {
      if (file.size > 50 * 1024 * 1024) {
        showErrorToast(`File ${file.name} exceeds the 50MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    setWorkSampleFiles((prev) => [...prev, ...validFiles]);
  };

  const removeWorkSample = (index: number) => {
    setWorkSampleFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Questionnaire Handlers (limit 3)
  const handleAddQuestion = () => {
    if (questionnaires.length >= 3) {
      showErrorToast("Maximum 3 buyer requirements allowed.");
      return;
    }
    setQuestionnaires((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "text",
        question: "",
        isRequired: true,
        options: [],
        multipleAnswer: false,
      },
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestionnaires((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Questionnaire, value: any) => {
    setQuestionnaires((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
    if (setErrors) {
      setErrors((prev) => {
        const { [`question_${id}_${field}`]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const addOption = (qId: string) => {
    setQuestionnaires((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          return { ...q, options: [...(q.options || []), ""] };
        }
        return q;
      })
    );
  };

  const updateOption = (qId: string, optIndex: number, val: string) => {
    setQuestionnaires((prev) =>
      prev.map((q) => {
        if (q.id === qId && q.options) {
          const newOpts = [...q.options];
          newOpts[optIndex] = val;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestionnaires((prev) =>
      prev.map((q) => {
        if (q.id === qId && q.options) {
          return { ...q, options: q.options.filter((_, i) => i !== optIndex) };
        }
        return q;
      })
    );
  };

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Order Policies & Deliverables
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Configure service contract terms, revision rates, order capacity, workflow rules, buyer requirements, and work samples.
        </p>
      </div>

      {/* 1. SELECT TERMS OF SERVICE (Top Full-Width Card) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
            1
          </span>
          <label className="text-[11px] font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
            Select Terms of Service
          </label>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="space-y-1.5 relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium truncate">
                {presetList.find((p) => p.terms_id === selectedTosId)?.terms_title || "Standard Platform TOS"}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl p-1 z-30 space-y-0.5">
              {presetList.map((p) => (
                <button
                  key={p.terms_id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                    selectedTosId === p.terms_id
                      ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-bold"
                      : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="truncate">{p.terms_title}</span>
                  {selectedTosId === p.terms_id && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Terms Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-gray-400" />
              <span>Active Contract Terms (Customizable)</span>
            </label>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
              Included in order contract binding
            </span>
          </div>

          <textarea
            rows={7}
            value={termsOfService}
            onChange={(e) => setTermsOfService(e.target.value)}
            placeholder="1. All deliverables remain property of the creator until final milestone payout..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-4 text-xs font-mono text-gray-900 dark:text-zinc-200 outline-none focus:border-zinc-900 dark:focus:border-white transition-all leading-relaxed resize-none"
          />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: 2. Additional Work Rate, 3. Set Order Capacity, 4. Set Workflow Terms */}
        <div className="space-y-6">
          {/* Card 2: Additional Work Rate */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                2
              </span>
              <label className="text-[11px] font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                Additional Work Rate <span className="text-red-500">*</span>
              </label>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
              Rate applied per extra revision pass beyond included milestone allowances.
            </p>

            {/* Stepper Controls: [-] value [+] */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/40">
              <button
                type="button"
                onClick={handleDecrementRate}
                disabled={additionalWorkRate <= 25}
                className="h-9 w-9 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Decrease revision rate (-5%, min 25%)"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="text-center min-w-[130px]">
                <div className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  +{Math.max(25, additionalWorkRate)}%
                </div>
                <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                  per extra pass (min 25%)
                </div>
              </div>

              <button
                type="button"
                onClick={handleIncrementRate}
                disabled={additionalWorkRate >= 100}
                className="h-9 w-9 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Increase revision rate (+5%)"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-gray-400 uppercase font-semibold mr-1">Presets:</span>
              {QUICK_RATE_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAdditionalWorkRate(pct)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    additionalWorkRate === pct
                      ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Set Order Capacity */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                3
              </span>
              <h3 className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Set Order Capacity
              </h3>
            </div>

            {/* Concurrent Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 dark:text-zinc-300">
                  Simultaneous Order Slots
                </span>
                <span className="font-bold text-zinc-900 dark:text-white px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  {slots} {slots === 1 ? "Order" : "Orders"} Max
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={slots}
                onChange={(e) => setSlots(Number(e.target.value))}
                className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-relaxed">
                Limits how many clients can have active orders in parallel to prevent overbooking and protect delivery timelines.
              </p>
            </div>

            {/* Platform Guarantees */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-zinc-300">
                  <strong className="text-gray-800 dark:text-zinc-200">Escrow Protected:</strong> Client funds secured in platform escrow before work commences.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-zinc-300">
                  <strong className="text-gray-800 dark:text-zinc-200">Double-Blind Reviews:</strong> Mutual ratings unseal simultaneously after both parties submit feedback.
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Set Workflow Terms */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                4
              </span>
              <h3 className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Set Workflow Terms
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Direct indicators for project confidentiality and public portfolio showcase permissions.
            </p>

            <div className="space-y-3">
              {/* Direct Indicator 1: NDA Acceptance */}
              <label className={`p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                askNDA
                  ? "border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-2xs"
                  : "border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-zinc-700"
              }`}>
                <input
                  type="checkbox"
                  checked={askNDA}
                  onChange={(e) => setAskNDA(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-white bg-transparent cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                      <Lock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                      <span>I am okay with working under an NDA</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      askNDA
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {askNDA ? "✓ NDA Accepted" : "No NDA Required"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    By checking this, I agree to sign and strictly comply with client Non-Disclosure Agreements (NDA). All client footage, internal briefs, and project files will be kept strictly confidential.
                  </p>
                </div>
              </label>

              {/* Direct Indicator 2: Portfolio Use */}
              <div className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                askPortfolio
                  ? "border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-2xs"
                  : "border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-zinc-700"
              }`}>
                <input
                  type="checkbox"
                  id="portfolio-indicator-checkbox"
                  checked={askPortfolio}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAskPortfolio(checked);
                    if (checked && !portfolioDuration) {
                      setPortfolioDuration("30");
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-white bg-transparent cursor-pointer"
                />
                <div className="flex-1">
                  <div
                    onClick={() => {
                      const next = !askPortfolio;
                      setAskPortfolio(next);
                      if (next && !portfolioDuration) {
                        setPortfolioDuration("30");
                      }
                    }}
                    className="flex items-center justify-between gap-2 flex-wrap cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                      <span>I want to use your output as my portfolio</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      askPortfolio
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {askPortfolio ? `✓ Portfolio Allowed (${portfolioDuration || "30"}s)` : "Private / Restricted"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    By checking this, I reserve the right to feature the completed project output in my public creator portfolio and work reels to showcase my skills to future clients.
                  </p>

                  {/* Specify duration in seconds (just like on job posting) */}
                  {askPortfolio && (
                    <div className="mt-3.5 pt-3 border-t border-gray-200/80 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                          Allowed Showcase Duration <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                          Selected: <strong className="text-gray-900 dark:text-white font-mono">{portfolioDuration || "30"} secs</strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {["5", "10", "15", "20", "30", "45", "60"].map((secs) => (
                          <button
                            key={secs}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPortfolioDuration(secs);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                              (portfolioDuration || "30") === secs
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                                : "bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {secs} secs
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5. Provide Requirements & Questionnaires (limit 3) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                  5
                </span>
                <label className="text-[11px] font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                  Provide Requirements & Questionnaires
                </label>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {questionnaires.length}/3 Limit
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Specify up to 3 essential requirements or questions for buyers to provide upon placing an order (e.g. cloud footage links, project brief, aspect ratios).
            </p>

            {/* Question Items List */}
            <div className="space-y-3.5">
              <AnimatePresence>
                {questionnaires.map((q, index) => (
                  <motion.div
                    key={q.id || index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-3"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          Q{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate">
                          {q.question.trim() ? q.question : "Untitled Requirement"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold uppercase text-gray-500 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            checked={q.isRequired ?? true}
                            onChange={(e) => updateQuestion(q.id || "", "isRequired", e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 cursor-pointer"
                          />
                          <span>Required</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id || "")}
                          className="p-1 rounded text-gray-400 hover:text-red-500 transition cursor-pointer"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Input */}
                    <input
                      type="text"
                      placeholder="e.g. Please provide your raw footage cloud link and edit brief..."
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id || "", "question", e.target.value)}
                      className={`w-full rounded-xl border bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none transition ${
                        errors[`question_${q.id}_question`]
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-gray-200 dark:border-white/10 focus:border-zinc-900 dark:focus:border-white"
                      }`}
                    />

                    {/* Type Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {QUESTION_TYPES.map((t) => {
                        const Icon = t.icon;
                        const isSelected = (q.type || "text") === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => updateQuestion(q.id || "", "type", t.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Choice Options (if choice type) */}
                    {q.type === "choice" && (
                      <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                          <span>Choices (min 2 required)</span>
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id || "", "multipleAnswer", !q.multipleAnswer)}
                            className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                              q.multipleAnswer
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {q.multipleAnswer ? "Multiple Choice: Allowed" : "Single Choice"}
                          </button>
                        </div>

                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-400">#{optIdx + 1}</span>
                            <input
                              type="text"
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(q.id || "", optIdx, e.target.value)}
                              className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(q.id || "", optIdx)}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addOption(q.id || "")}
                          className="flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer pt-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Choice Option
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add New Requirement Button (limit 3) */}
              {questionnaires.length < 3 ? (
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-zinc-900 dark:hover:border-white hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Requirement ({questionnaires.length}/3)
                </button>
              ) : (
                <div className="text-center text-[11px] text-gray-400 dark:text-zinc-500 py-1 font-medium bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                  Maximum 3 requirements reached
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. UPLOAD WORK SAMPLES (Below Both Columns - Full Width) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/50 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
              6
            </span>
            <label className="text-[11px] font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
              Upload Work Samples
            </label>
          </div>
          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 font-semibold">
            {workSampleFiles.length} of 6 files
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
          Showcase relevant showreels, audio snippets, pitch decks, or past project exports for this service (Click sample to preview in full resolution).
        </p>

        {/* Dropzone (shown when under limit of 6) */}
        {workSampleFiles.length < 6 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileProcess(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-zinc-900 bg-zinc-100/50 dark:border-white dark:bg-zinc-800/50"
                : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/60 dark:bg-white/[0.02]"
            }`}
          >
            <UploadCloud className="w-7 h-7 text-gray-400 dark:text-zinc-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">
              Click to upload or drag & drop files
            </p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
              Images, MP4 video, MP3 audio, PDF (Max 6 files • 50MB each)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFileProcess(e.target.files)}
        />

        {/* Uploaded File Previews List / Grid with Square Cards */}
        {workSampleFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
            {workSampleFiles.map((file, idx) => {
              const url = previewUrls.get(file);
              const fType = getSampleFileType(file);
              const ext = file.name.split(".").pop()?.toLowerCase() || "";
              const formattedSize = formatFileSize(file.size);

              return (
                <div
                  key={idx}
                  onClick={() =>
                    url &&
                    setPreviewModalItem({
                      file,
                      url,
                      type: fType,
                      name: file.name,
                      size: formattedSize,
                    })
                  }
                  className="group relative aspect-square rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs hover:shadow-md hover:border-zinc-900 dark:hover:border-white transition-all flex flex-col justify-between cursor-pointer select-none"
                >
                  {/* Media Visual Area */}
                  <div className="relative w-full flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-850 overflow-hidden flex items-center justify-center">
                    {fType === "image" && (
                      url ? (
                        <img
                          src={url}
                          alt={file.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-zinc-400" />
                      )
                    )}

                    {fType === "video" && (
                      <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center">
                        {url ? (
                          <video
                            src={url}
                            preload="metadata"
                            className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <Video className="h-6 w-6 text-zinc-400" />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none group-hover:bg-black/40 transition-colors">
                          <span className="w-8 h-8 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </span>
                        </div>
                      </div>
                    )}

                    {fType === "audio" && (
                      <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center p-2 text-zinc-700 dark:text-zinc-300">
                        <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-1 shadow-2xs">
                          <Volume2 className="h-5 w-5" />
                        </div>
                      </div>
                    )}

                    {fType === "pdf" && (
                      <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center p-2 text-zinc-700 dark:text-zinc-300">
                        <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-1 shadow-2xs">
                          <FileText className="h-5 w-5" />
                        </div>
                      </div>
                    )}

                    {fType === "other" && (
                      <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center p-2 text-zinc-700 dark:text-zinc-300">
                        <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-1 shadow-2xs">
                          <File className="h-5 w-5" />
                        </div>
                      </div>
                    )}

                    {/* File Extension Tag (Top Left) */}
                    <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono font-bold uppercase text-white shadow-xs">
                      {ext || fType}
                    </span>

                    {/* Remove Button (Top Right) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeWorkSample(idx);
                      }}
                      className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md backdrop-blur-xs"
                      title="Remove sample"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Hover Action Overlay */}
                    {url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[10px] font-bold pointer-events-none">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta Bar */}
                  <div className="p-2 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900/90 text-left">
                    <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                      {formattedSize}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Actions */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none cursor-pointer"
        >
          Go Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Continue to Milestones</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lightbox / Full Preview Modal */}
      {createPortal(
        <AnimatePresence>
          {previewModalItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <div
                className="fixed inset-0"
                onClick={() => setPreviewModalItem(null)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-left"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/90 text-white">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <span className="font-bold text-sm truncate">
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
                    <div className="w-full h-[65vh] flex flex-col">
                      <iframe
                        src={previewModalItem.url}
                        title={previewModalItem.name}
                        className="w-full flex-1 rounded-lg border border-zinc-800 bg-white"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default GigTerms;
