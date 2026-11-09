import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Heart,
  ArrowUpRight,
  FileText,
  Globe,
  Scale,
  Upload,
  Plus,
  X,
  ExternalLink,
  HelpCircle,
  FolderOpen,
  Film,
  Lock,
  CheckCircle2,
  Clock,
  Scissors,
  Users,
  User,
  Play,
  ArrowLeft,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import api from "@/lib/axios";
import toast from "react-hot-toast";

export interface PortfolioItem {
  id: string | number;
  type: "project" | "document" | "link" | "tos";
  title: string;
  description: string;
  thumbnail?: string;
  videoUrl?: string;
  fileUrl?: string;
  externalUrl?: string;
  views?: number;
  likes?: number;
  createdAt?: string;
  memberName?: string;
  memberAvatar?: string;
  memberRoleLabel?: string;
  projectId?: string;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  maxAllowedSeconds?: number | null;
  projectDurationSeconds?: number;
  isSharedProject?: boolean;
  sharedBy?: string | null;
  contractTitle?: string | null;
}

interface SelectableProject {
  id: string;
  name: string;
  status: string;
  width?: number;
  height?: number;
  duration_seconds: number;
  lastUpdated?: string;
  role: string;
  sharedBy?: string | null;
  isSharedProject: boolean;
  portfolioUseAllowed: boolean;
  portfolioUseDurationSeconds?: number | null;
  contractTitle?: string | null;
  size?: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
}

interface ProfilePortfolioProps {
  portfolioItems?: PortfolioItem[];
  isOwner?: boolean;
  isLoading?: boolean;
  onUploadPDF?: (file: File) => Promise<void>;
  onAddExternalLink?: (data: { name: string; url: string; description: string }) => Promise<void>;
  onAddProject?: (data: {
    projectId: string;
    name: string;
    description: string;
    clipStartSeconds: number;
    clipEndSeconds: number;
  }) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onEditTermsOfService?: () => void;
}

function formatSeconds(secs: number): string {
  const safe = Math.max(0, Math.round(Number(secs) || 0));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

const PortfolioCardSkeleton = () => (
  <div className="flex flex-col aspect-square justify-between bg-white dark:bg-dark-surface/30 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden animate-pulse">
    <div className="relative flex-1 w-full bg-gray-200 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-white/5 flex items-center justify-center">
      <div className="h-14 w-14 rounded-2xl bg-gray-300 dark:bg-zinc-700/50" />
    </div>
    <div className="p-3.5 space-y-2 bg-white dark:bg-dark-base/20">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-14 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-2.5 w-6 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-3 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded" />
      <div className="h-2.5 w-full bg-gray-200 dark:bg-zinc-800 rounded" />
      <div className="h-2 w-1/3 bg-gray-100 dark:bg-zinc-800/60 rounded pt-0.5" />
    </div>
  </div>
);

export const Profile_Portfolio: React.FC<ProfilePortfolioProps> = ({
  portfolioItems = [],
  isOwner = false,
  isLoading = false,
  onUploadPDF,
  onAddExternalLink,
  onAddProject,
  onDeleteItem,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const configVideoRef = useRef<HTMLVideoElement>(null);

  const [activeViewItem, setActiveViewItem] = useState<PortfolioItem | null>(null);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Website Link state
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Select Existing Project state
  const [projects, setProjects] = useState<SelectableProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"all" | "mine" | "shared">("all");
  const [selectedProject, setSelectedProject] = useState<SelectableProject | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [clipStart, setClipStart] = useState<number>(0);
  const [clipEnd, setClipEnd] = useState<number>(30);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUserProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await api.get("/api/projects");
      if (response.data?.success && Array.isArray(response.data.projects)) {
        setProjects(response.data.projects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      toast.error("Unable to load your projects.");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleOpenProjectPicker = () => {
    setShowAddMaterialModal(false);
    setSelectedProject(null);
    setShowProjectModal(true);
    void loadUserProjects();
  };

  const handleSelectProjectCard = (proj: SelectableProject) => {
    if (!proj.portfolioUseAllowed) {
      toast.error("Client did not allow portfolio use for this project.");
      return;
    }
    const totalDuration = Math.max(1, Number(proj.duration_seconds) || 60);
    const maxAllowed = proj.portfolioUseDurationSeconds
      ? Math.min(Number(proj.portfolioUseDurationSeconds), totalDuration)
      : totalDuration;

    setSelectedProject(proj);
    setProjectTitle(proj.name);
    setProjectDescription(
      proj.contractTitle
        ? `Portfolio showcase from "${proj.contractTitle}"${proj.sharedBy ? ` for ${proj.sharedBy}` : ""}`
        : proj.isSharedProject && proj.sharedBy
        ? `Shared project collaboration with ${proj.sharedBy}`
        : "Created in Ensemble Studio"
    );
    setClipStart(0);
    setClipEnd(maxAllowed);
  };

  const maxAllowedForSelected = selectedProject
    ? selectedProject.portfolioUseDurationSeconds
      ? Math.min(
          Number(selectedProject.portfolioUseDurationSeconds),
          Math.max(1, Number(selectedProject.duration_seconds) || 60)
        )
      : Math.max(1, Number(selectedProject.duration_seconds) || 60)
    : 60;

  const totalProjectDuration = selectedProject
    ? Math.max(1, Number(selectedProject.duration_seconds) || 60)
    : 60;

  const handleClipStartChange = (nextStartRaw: number) => {
    const nextStart = Math.max(0, Math.min(nextStartRaw, totalProjectDuration - 1));
    setClipStart(nextStart);

    // Ensure clipEnd is > nextStart and within maxAllowedForSelected
    let nextEnd = clipEnd;
    if (nextEnd <= nextStart) {
      nextEnd = Math.min(totalProjectDuration, nextStart + Math.min(5, maxAllowedForSelected));
    }
    if (nextEnd - nextStart > maxAllowedForSelected) {
      nextEnd = Math.min(totalProjectDuration, nextStart + maxAllowedForSelected);
    }
    setClipEnd(nextEnd);

    if (configVideoRef.current) {
      configVideoRef.current.currentTime = nextStart;
    }
  };

  const handleClipEndChange = (nextEndRaw: number) => {
    const nextEnd = Math.max(clipStart + 1, Math.min(nextEndRaw, totalProjectDuration));
    if (nextEnd - clipStart > maxAllowedForSelected) {
      // Shift clipStart forward so the window stays within maxAllowedForSelected
      const adjustedStart = Math.max(0, nextEnd - maxAllowedForSelected);
      setClipStart(adjustedStart);
    }
    setClipEnd(nextEnd);
  };

  const submitProjectAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !onAddProject || isSubmittingProject) return;

    const duration = clipEnd - clipStart;
    if (duration <= 0) {
      toast.error("End time must be after start time.");
      return;
    }
    if (selectedProject.portfolioUseDurationSeconds && duration > selectedProject.portfolioUseDurationSeconds) {
      toast.error(`Client only allowed up to ${selectedProject.portfolioUseDurationSeconds} seconds for portfolio use.`);
      return;
    }

    setIsSubmittingProject(true);
    try {
      await onAddProject({
        projectId: selectedProject.id,
        name: projectTitle.trim() || selectedProject.name,
        description: projectDescription.trim(),
        clipStartSeconds: clipStart,
        clipEndSeconds: clipEnd,
      });
      setShowProjectModal(false);
      setSelectedProject(null);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadPDF) {
      void onUploadPDF(e.target.files[0]);
      e.target.value = "";
    }
  };

  const submitLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onAddExternalLink || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddExternalLink({
        name: linkName.trim(),
        url: linkUrl.trim(),
        description: linkDescription.trim(),
      });
      setLinkName("");
      setLinkUrl("");
      setLinkDescription("");
      setShowLinkModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (projectFilter === "mine") return !p.isSharedProject;
    if (projectFilter === "shared") return p.isSharedProject;
    return true;
  });

  const typeConfig = {
    project: {
      label: "Project",
      icon: Film,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/10",
    },
    document: {
      label: "CV / Resume",
      icon: FileText,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/10",
    },
    link: {
      label: "Website",
      icon: Globe,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/10",
    },
    tos: {
      label: "Terms of Service",
      icon: Scale,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/10",
    },
    fallback: {
      label: "Unknown",
      icon: HelpCircle,
      color: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/10",
    },
  };

  return (
    <div className="space-y-4 flex-1 TrulyRawFixUnsetOverflow">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        id="profile-portfolio-pdf-input"
        accept=".pdf"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Portfolio" : "Portfolio"}
          {isLoading ? (
            <span className="inline-block h-3 w-5 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
          ) : (
            <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 lowercase">
              ({portfolioItems.length})
            </span>
          )}
        </h4>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              disabled={isLoading}
              data-tour="profile-portfolio-upload-btn"
              onClick={() => setShowAddMaterialModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.04] text-[11px] font-bold text-gray-800 dark:text-zinc-200 hover:text-gray-950 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area with Crossfade */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading-skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-5 grid-cols-2 md:grid-cols-3 content-start"
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <PortfolioCardSkeleton key={idx} />
            ))}
          </motion.div>
        ) : portfolioItems.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="py-2"
          >
            <EmptyState
              title="No portfolio items"
              description={
                isOwner
                  ? "Showcase your professional background! Add a CV/Resume, select an existing project, or embed a website link."
                  : "This user hasn't added any portfolio items yet."
              }
              actionLabel={isOwner ? "+ Add Material" : undefined}
              onAction={isOwner ? () => setShowAddMaterialModal(true) : undefined}
              className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
            />
          </motion.div>
        ) : (
          <motion.div
            key="portfolio-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid gap-5 grid-cols-2 md:grid-cols-3 content-start"
          >
            {portfolioItems.map((item) => {
              const cfg = typeConfig[item.type] || typeConfig.fallback;
              const CardIcon = cfg.icon;
              const clipStartSec = Number(item.clipStartSeconds ?? 0);
              const clipEndSec = Number(item.clipEndSeconds ?? 0);
              const hasClipWindow = item.type === "project" && clipEndSec > clipStartSec;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveViewItem(item)}
                  className="group relative flex flex-col aspect-square justify-between bg-white dark:bg-dark-surface/30 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-dark-surface/50 cursor-pointer shadow-lg"
                >
                  {isOwner && onDeleteItem && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onDeleteItem(String(item.id));
                      }}
                      className="absolute right-2 top-2 z-20 rounded-lg border border-red-200 dark:border-red-500/20 bg-white/90 dark:bg-black/60 p-1.5 text-red-500 dark:text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/20"
                      title="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className="relative flex-1 w-full bg-gray-100 dark:bg-zinc-900/40 border-b border-gray-200 dark:border-white/5 flex items-center justify-center overflow-hidden">
                    {item.type === "project" && (item.thumbnail || item.videoUrl) ? (
                      <div className="relative h-full w-full">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <video
                            src={`${item.videoUrl}#t=${clipStartSec},${clipEndSec || 30}`}
                            className="h-full w-full object-cover"
                            preload="metadata"
                            muted
                          />
                        )}
                        <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1">
                          {hasClipWindow && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white border border-white/10">
                              <Scissors className="h-2.5 w-2.5 text-blue-400" />
                              {formatSeconds(clipStartSec)} – {formatSeconds(clipEndSec)} ({Math.round(clipEndSec - clipStartSec)}s)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : item.type === "document" && item.fileUrl ? (
                      <>
                        <iframe
                          src={`${item.fileUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          title={`${item.title} PDF preview`}
                          className="pointer-events-none h-full w-full border-0 bg-white"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 z-10" />
                      </>
                    ) : item.type === "link" && item.externalUrl ? (
                      <div className="relative h-full w-full bg-gray-100 dark:bg-zinc-950">
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className={`p-4 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            <CardIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <iframe
                          src={item.externalUrl}
                          title={`${item.title} website preview`}
                          className="pointer-events-none relative h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-forms"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 z-10" />
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl ${cfg.bg} ${cfg.color} border ${cfg.border} transition-transform duration-300 group-hover:scale-110 shadow-inner z-10`}>
                        <CardIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1 text-[11px] font-bold text-white backdrop-blur-[2px] z-20">
                      <span>Expand Item</span>
                      <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1 bg-white dark:bg-dark-base/20 relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${cfg.color}`}>
                        {item.type === "project" && item.isSharedProject ? "Client Project" : cfg.label}
                      </span>
                      {item.type === "project" && item.maxAllowedSeconds ? (
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Max {item.maxAllowedSeconds}s
                        </span>
                      ) : item.type === "project" && item.likes !== undefined ? (
                        <span className="text-[9px] text-gray-500 dark:text-zinc-500 font-bold flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5 text-red-400/70" /> {item.likes || 0}
                        </span>
                      ) : null}
                      {item.memberName && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[9px] font-bold text-gray-700 dark:text-zinc-200 truncate max-w-[120px]">
                          {item.memberAvatar && (
                            <img
                              src={item.memberAvatar}
                              alt={item.memberName}
                              className="h-3 w-3 rounded-full object-cover shrink-0"
                            />
                          )}
                          <span className="truncate">{item.memberName}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wide truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium leading-normal line-clamp-1 opacity-70">
                      {item.description}
                    </p>
                    {item.createdAt && (
                      <p className="text-[9px] text-gray-400 dark:text-zinc-600">
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals via Portal */}
      {mounted &&
        document.body &&
        createPortal(
          <AnimatePresence>
            {/* 1. Unified "+ Add Material" Chooser Modal */}
            {showAddMaterialModal && (
              <div
                key="add-material-modal"
                className="fixed inset-0 z-[200001] flex items-center justify-center p-4 font-['Plus Jakarta Sans',sans-serif]"
              >
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddMaterialModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  aria-label="Close Add Material modal"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12141f] p-6 shadow-2xl space-y-5 z-10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                        Add Portfolio Material
                      </h3>
                      <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-zinc-300">
                        Choose what type of material you want to showcase on your profile.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMaterialModal(false)}
                      className="rounded-lg p-1.5 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Upload Resume / CV (PDF) */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMaterialModal(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-300/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] hover:border-gray-900 dark:hover:border-white/30 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-all text-left group cursor-pointer"
                    >
                      <div className="p-3 rounded-xl bg-white dark:bg-white/5 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            Upload Resume / CV (PDF)
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-800 dark:text-zinc-200">
                            PDF
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300 leading-relaxed">
                          Upload your curriculum vitae or resume document (up to 25 MB) with live PDF preview.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Select Existing Project */}
                    <button
                      type="button"
                      onClick={handleOpenProjectPicker}
                      className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-300/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] hover:border-gray-900 dark:hover:border-white/30 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-all text-left group cursor-pointer"
                    >
                      <div className="p-3 rounded-xl bg-white dark:bg-white/5 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Film className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            Select Existing Project
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-800 dark:text-zinc-200">
                            Own or Shared
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300 leading-relaxed">
                          Feature one of your studio projects or a client-approved shared project with custom clip timestamps.
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Embed Website Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMaterialModal(false);
                        setShowLinkModal(true);
                      }}
                      className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-300/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] hover:border-gray-900 dark:hover:border-white/30 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] transition-all text-left group cursor-pointer"
                    >
                      <div className="p-3 rounded-xl bg-white dark:bg-white/5 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            Embed Website Link
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-800 dark:text-zinc-200">
                            URL
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-700 dark:text-zinc-300 leading-relaxed">
                          Embed an interactive preview of your personal website, showreel page, or external portfolio.
                        </p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 2. Select Existing Project Modal */}
            {showProjectModal && (
              <div
                key="select-project-modal"
                className="fixed inset-0 z-[200001] flex items-center justify-center p-4 font-['Plus Jakarta Sans',sans-serif]"
              >
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setShowProjectModal(false);
                    setSelectedProject(null);
                  }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  aria-label="Close project selector"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12141f] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      {selectedProject && (
                        <button
                          type="button"
                          onClick={() => setSelectedProject(null)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                          title="Back to projects"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {selectedProject ? "Configure Portfolio Clip" : "Select Existing Project"}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                          {selectedProject
                            ? selectedProject.portfolioUseDurationSeconds
                              ? `Client allowed up to ${selectedProject.portfolioUseDurationSeconds} seconds for portfolio showcase.`
                              : "Select the timestamp window to showcase on your profile."
                            : "Select one of your projects or a shared project where the client permitted portfolio use."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectModal(false);
                        setSelectedProject(null);
                      }}
                      className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {!selectedProject ? (
                    <>
                      {/* Filter Tabs */}
                      <div className="flex items-center gap-2 pt-4 pb-2">
                        {[
                          { key: "all", label: "All Projects" },
                          { key: "mine", label: "Your Projects" },
                          { key: "shared", label: "Shared / Client Projects" },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setProjectFilter(tab.key as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              projectFilter === tab.key
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Project List */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1 [scrollbar-width:thin]">
                        {isLoadingProjects ? (
                          Array.from({ length: 3 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="h-20 w-full rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"
                            />
                          ))
                        ) : filteredProjects.length === 0 ? (
                          <div className="py-12 text-center space-y-2">
                            <Film className="h-8 w-8 text-gray-400 dark:text-zinc-600 mx-auto" />
                            <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">
                              No projects found
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                              {projectFilter === "shared"
                                ? "You don't have any shared or client projects yet."
                                : "Create a project in the Projects workspace first."}
                            </p>
                          </div>
                        ) : (
                          filteredProjects.map((proj) => {
                            const isLocked = !proj.portfolioUseAllowed;
                            return (
                              <div
                                key={proj.id}
                                onClick={() => handleSelectProjectCard(proj)}
                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                                  isLocked
                                    ? "border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] opacity-60 cursor-not-allowed"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-blue-500/40 hover:bg-blue-500/5 cursor-pointer"
                                }`}
                              >
                                {/* Thumbnail */}
                                <div className="relative h-16 w-28 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                                  {proj.thumbnailUrl ? (
                                    <img
                                      src={proj.thumbnailUrl}
                                      alt={proj.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Film className="h-6 w-6 text-gray-400 dark:text-zinc-600" />
                                  )}
                                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                                    {formatSeconds(proj.duration_seconds || 60)}
                                  </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                      {proj.name}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                        proj.isSharedProject
                                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                          : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300"
                                      }`}
                                    >
                                      {proj.isSharedProject ? (
                                        <>
                                          <Users className="h-2.5 w-2.5" />
                                          {proj.sharedBy ? `Shared by ${proj.sharedBy}` : "Shared Project"}
                                        </>
                                      ) : (
                                        <>
                                          <User className="h-2.5 w-2.5" />
                                          Your Project
                                        </>
                                      )}
                                    </span>
                                  </div>

                                  {proj.contractTitle && (
                                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                                      Contract: {proj.contractTitle}
                                    </p>
                                  )}

                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {isLocked ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                        <Lock className="h-3 w-3" />
                                        Not Allowed by Client
                                      </span>
                                    ) : proj.portfolioUseDurationSeconds ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Client Allowed: Up to {proj.portfolioUseDurationSeconds}s
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Full Duration Allowed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    /* Step 2: Configure Timestamp Range & Details */
                    <form
                      onSubmit={submitProjectAttachment}
                      className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 [scrollbar-width:thin]"
                    >
                      {/* Video / Thumbnail Preview */}
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black relative">
                        {selectedProject.videoUrl ? (
                          <video
                            ref={configVideoRef}
                            src={selectedProject.videoUrl}
                            controls
                            className="w-full max-h-56 object-contain mx-auto"
                            onLoadedMetadata={(e) => {
                              e.currentTarget.currentTime = clipStart;
                            }}
                            onTimeUpdate={(e) => {
                              if (e.currentTarget.currentTime < clipStart) {
                                e.currentTarget.currentTime = clipStart;
                              } else if (e.currentTarget.currentTime >= clipEnd) {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = clipStart;
                              }
                            }}
                          />
                        ) : selectedProject.thumbnailUrl ? (
                          <img
                            src={selectedProject.thumbnailUrl}
                            alt={selectedProject.name}
                            className="w-full max-h-52 object-contain mx-auto"
                          />
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                            <Film className="h-8 w-8" />
                            <span className="text-xs">{selectedProject.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Timestamp Range Selector */}
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                            <Scissors className="h-3.5 w-3.5 text-blue-500" />
                            <span>Showcase Timestamp Window</span>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
                            {formatSeconds(clipStart)} – {formatSeconds(clipEnd)} ({Math.round(clipEnd - clipStart)}s
                            {selectedProject.portfolioUseDurationSeconds
                              ? ` / Max ${selectedProject.portfolioUseDurationSeconds}s`
                              : ""}
                            )
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 dark:text-zinc-300 mb-1">
                              <span>Start Time ({formatSeconds(clipStart)})</span>
                              <span className="font-mono">{clipStart}s</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, totalProjectDuration - 1)}
                              step={1}
                              value={clipStart}
                              onChange={(e) => handleClipStartChange(Number(e.target.value))}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 dark:text-zinc-300 mb-1">
                              <span>End Time ({formatSeconds(clipEnd)})</span>
                              <span className="font-mono">{clipEnd}s</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={totalProjectDuration}
                              step={1}
                              value={clipEnd}
                              onChange={(e) => handleClipEndChange(Number(e.target.value))}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>

                        {selectedProject.portfolioUseDurationSeconds && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-300">
                            Client permission restricts portfolio playback to a maximum of{" "}
                            <strong>{selectedProject.portfolioUseDurationSeconds} seconds</strong>. Adjusting the sliders automatically keeps your clip within this limit.
                          </p>
                        )}
                      </div>

                      <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Portfolio Title <span className="text-red-500">*</span>
                        <input
                          required
                          maxLength={255}
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                          placeholder="Project title"
                        />
                      </label>

                      <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Description & Role Notes
                        <textarea
                          maxLength={2000}
                          rows={2}
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                          placeholder="Describe your editing contribution or role..."
                        />
                      </label>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProject(null)}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          disabled={isSubmittingProject}
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/20"
                        >
                          {isSubmittingProject ? "Adding Project..." : "Add Project to Portfolio"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            )}

            {/* 3. Embed Website Link Modal */}
            {showLinkModal && (
              <div
                key="link-modal"
                className="fixed inset-0 z-[200001] flex items-center justify-center p-4 font-['Plus Jakarta Sans',sans-serif]"
              >
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLinkModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  aria-label="Close website link form"
                />
                <motion.form
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onSubmit={submitLink}
                  className="relative w-full max-w-md space-y-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12141f] p-5 shadow-2xl z-10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Embed Website Link
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                        Add a public portfolio or professional website.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400">
                    Display name <span className="text-red-500 dark:text-red-400">*</span>
                    <input
                      required
                      maxLength={255}
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      placeholder="My portfolio website"
                    />
                  </label>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400">
                    Website URL <span className="text-red-500 dark:text-red-400">*</span>
                    <input
                      required
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </label>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400">
                    Description
                    <textarea
                      maxLength={2000}
                      rows={3}
                      value={linkDescription}
                      onChange={(e) => setLinkDescription(e.target.value)}
                      className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-dark-base px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      placeholder="Describe what visitors will find."
                    />
                  </label>
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? "Adding..." : "Add Website"}
                  </button>
                </motion.form>
              </div>
            )}

            {/* 4. Expanded View Item Modal */}
            {activeViewItem && (
              <div
                key="view-modal"
                className="fixed inset-0 flex items-center justify-center z-[200000] p-4 md:p-6"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveViewItem(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="relative w-full max-w-4xl bg-white/95 dark:bg-dark-base/95 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 font-['Plus Jakarta Sans',sans-serif]"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01]">
                    <div className="min-w-0">
                      <span
                        className={`text-[9px] font-mono font-black uppercase tracking-widest ${
                          (typeConfig[activeViewItem.type] || typeConfig.fallback).color
                        }`}
                      >
                        {(typeConfig[activeViewItem.type] || typeConfig.fallback).label}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white truncate tracking-wide">
                        {activeViewItem.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => setActiveViewItem(null)}
                      className="p-1.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-zinc-950/20 [scrollbar-width:thin]">
                    {activeViewItem.type === "project" && (
                      <div className="space-y-3">
                        {activeViewItem.videoUrl ? (
                          <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black">
                            <video
                              ref={previewVideoRef}
                              src={activeViewItem.videoUrl}
                              controls
                              autoPlay
                              className="w-full max-h-[460px] object-contain mx-auto"
                              onLoadedMetadata={(e) => {
                                const start = Number(activeViewItem.clipStartSeconds || 0);
                                if (start > 0) e.currentTarget.currentTime = start;
                              }}
                              onTimeUpdate={(e) => {
                                const start = Number(activeViewItem.clipStartSeconds || 0);
                                const end = Number(activeViewItem.clipEndSeconds || 0);
                                if (e.currentTarget.currentTime < start) {
                                  e.currentTarget.currentTime = start;
                                } else if (end > start && e.currentTarget.currentTime >= end) {
                                  e.currentTarget.currentTime = start;
                                }
                              }}
                            />
                          </div>
                        ) : activeViewItem.thumbnail ? (
                          <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-zinc-900/40">
                            <img
                              src={activeViewItem.thumbnail}
                              alt={activeViewItem.title}
                              className="w-full h-auto max-h-[450px] object-contain mx-auto"
                            />
                          </div>
                        ) : null}

                        {Number(activeViewItem.clipEndSeconds || 0) >
                          Number(activeViewItem.clipStartSeconds || 0) && (
                          <div className="flex items-center justify-between flex-wrap gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                              <Scissors className="h-3.5 w-3.5" />
                              <span>
                                Showcase Clip:{" "}
                                {formatSeconds(Number(activeViewItem.clipStartSeconds || 0))} –{" "}
                                {formatSeconds(Number(activeViewItem.clipEndSeconds || 0))} (
                                {Math.round(
                                  Number(activeViewItem.clipEndSeconds || 0) -
                                    Number(activeViewItem.clipStartSeconds || 0)
                                )}
                                s)
                              </span>
                            </div>
                            {activeViewItem.maxAllowedSeconds && (
                              <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                                Client Portfolio Limit: {activeViewItem.maxAllowedSeconds}s max
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeViewItem.type === "document" && activeViewItem.fileUrl && (
                      <div className="w-full h-[65vh] md:h-[70vh] rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-dark-surface/30">
                        <iframe
                          src={`${activeViewItem.fileUrl}#toolbar=0&view=FitH`}
                          className="w-full h-full border-none"
                          title={activeViewItem.title}
                        />
                      </div>
                    )}

                    {activeViewItem.type === "link" && activeViewItem.externalUrl && (
                      <div className="space-y-3">
                        <div className="h-[65vh] md:h-[70vh] w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-white">
                          <iframe
                            src={activeViewItem.externalUrl}
                            title={`${activeViewItem.title} website preview`}
                            className="h-full w-full border-0"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] p-3">
                          <p className="min-w-0 truncate text-xs text-gray-500 dark:text-zinc-400">
                            If the website blocks embedded previews, open it in a new tab.
                          </p>
                          <a
                            href={activeViewItem.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500"
                          >
                            <span>Open Website</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {activeViewItem.type === "tos" && (
                      <div className="p-5 md:p-6 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-dark-surface/50 font-sans text-xs text-gray-800 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                        {activeViewItem.description}
                      </div>
                    )}

                    {activeViewItem.type !== "tos" && (
                      <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-white/5">
                        <h5 className="text-[11px] font-black uppercase text-gray-500 dark:text-zinc-500 tracking-wider">
                          Item Documentation Logs
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {activeViewItem.description}
                        </p>
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
