import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import PopupConfirmReturn from "@/pages/user/6_job_market/job_components/job_popups/popup_confirm_return";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { requireVerifiedAccount } from "@/lib/accountVerification";

// Types
import type { GigTier, GigAddOn, Questionnaire } from "../gig_datasets";
import type { ServiceMilestone } from "../gig_components/gig_creation_components/3_gig_milestones";

// Components
import GigCreateHeader from "../gig_components/gig_creation_components/gig_create_header";
import { GigIdentity } from "../gig_components/gig_creation_components/0_gig_identity";
import CreateCoreInfo from "../gig_components/gig_creation_components/1_create_coreinfo";
import { GigTerms } from "../gig_components/gig_creation_components/2_gig_terms";
import { GigMilestones } from "../gig_components/gig_creation_components/3_gig_milestones";
import { CreateTiers } from "../gig_components/gig_creation_components/3_create_tiers";
import CreateReview from "../gig_components/gig_creation_components/6_create_review";
import CreationSuccess from "../gig_components/gig_creation_components/7_creation_success";
import {
  GigPublishProgressModal,
  type GigPublishProgress,
} from "../gig_components/gig_creation_components/gig_publish_progress_modal";

const DEFAULT_MILESTONES: ServiceMilestone[] = [
  {
    id: "ms-1",
    name: "Discovery, Ingest & Narrative Pacing",
    description: "Initial requirements alignment, media asset ingestion, assembly cut, and sequence pacing review.",
    hours: 24,
    revisions: 1,
    percentage: 30,
    tasks: ["Review client raw footage and project brief", "Audio sync & rough assembly", "Initial rough cut review"],
  },
  {
    id: "ms-2",
    name: "Fine Cut, VFX & Audio Mixing",
    description: "Core video edit polishing, sound design, music sync, motion titles, and first complete master draft.",
    hours: 48,
    revisions: 2,
    percentage: 45,
    tasks: ["Dialogue cleanup & SFX layering", "Color grading & LUT application", "Motion graphics integration"],
  },
  {
    id: "ms-3",
    name: "Final Polish, Color Grade & Delivery",
    description: "Incorporating buyer feedback, final mastering, codec exports, and delivery of all agreed project assets.",
    hours: 24,
    revisions: 1,
    percentage: 25,
    tasks: ["Final feedback revisions", "High-res master exports (ProRes / H.264)", "Project archive delivery"],
  },
];

const DEFAULT_TIERS: GigTier[] = [
  {
    tierName: "Basic",
    title: "Essential Cut & Polish",
    description: "Standard quality output perfect for simple social or short-form video projects.",
    daysOfDelivery: 2,
    revisions: 1,
    price: 150,
  },
  {
    tierName: "Standard",
    title: "Pro Cinematic Delivery",
    description: "High-quality output with advanced sound design, color grade, and multi-cam sync.",
    daysOfDelivery: 4,
    revisions: 2,
    price: 350,
  },
  {
    tierName: "Premium",
    title: "Studio Master Production",
    description: "Complete studio package with complex motion graphics, source assets, and expedited priority.",
    daysOfDelivery: 7,
    revisions: 3,
    price: 700,
  },
];

const isMeaningfulDraft = (data: any) => {
  if (!data) return false;
  return Boolean(
    data.title?.trim() ||
    data.description?.trim() ||
    (Array.isArray(data.skills) && data.skills.length > 0) ||
    data.termsOfService?.trim() ||
    (data.currentSlide && Number(data.currentSlide) > 1) ||
    (data.highestStepReached && Number(data.highestStepReached) > 1) ||
    (data.postingAs === "team" && data.actingTeamId) ||
    (Array.isArray(data.addOns) && data.addOns.length > 0)
  );
};

const getStoredGigDraft = () => {
  try {
    const saved = localStorage.getItem("ensemble_gig_create_draft");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!isMeaningfulDraft(parsed)) return null;
    if (parsed.thumbnailUrl && typeof parsed.thumbnailUrl === "string" && parsed.thumbnailUrl.startsWith("blob:")) {
      parsed.thumbnailUrl = null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const GigCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const isVerified = useGlobalState((state) => state.isVerified);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);

  const [isCheckingVerification, setIsCheckingVerification] = useState(!isVerified);
  const [isInitializingStudio, setIsInitializingStudio] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializingStudio(false);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isGuestMode) {
      navigate("/login");
      return;
    }

    if (isGlobalLoading) {
      return;
    }

    if (isVerified || user?.is_verified) {
      if (!isVerified && user?.is_verified) {
        useGlobalState.getState().setIsVerified(true);
      }
      setIsCheckingVerification(false);
      return;
    }

    requireVerifiedAccount()
      .then(() => {
        if (!cancelled) {
          setIsCheckingVerification(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          useGlobalState.getState().setIsVerificationModalOpen(
            true,
            "Account Verification is required to access Gig Creation. Please verify your identity to proceed."
          );
          navigate("/gigs/services");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isGuestMode, isGlobalLoading, isVerified, user?.is_verified, navigate]);

  // Initial draft loaded immediately to avoid flash or reset on page refresh
  const initialDraft = useMemo(() => getStoredGigDraft(), []);

  const [currentSlide, setCurrentSlide] = useState<number>(() => {
    const slide = Number(initialDraft?.currentSlide);
    return slide >= 1 && slide <= 6 ? slide : 1;
  });
  const [highestStepReached, setHighestStepReached] = useState<number>(() => {
    const reached = Number(initialDraft?.highestStepReached || initialDraft?.currentSlide);
    return reached >= 1 && reached <= 6 ? reached : 1;
  });
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // --- STEP 1: IDENTITY ---
  const [postingAs, setPostingAs] = useState<"self" | "team">(() => initialDraft?.postingAs || "self");
  const [actingTeamId, setActingTeamId] = useState<string>(() => initialDraft?.actingTeamId || "");
  const [includedMemberIds, setIncludedMemberIds] = useState<string[]>(
    () => (Array.isArray(initialDraft?.includedMemberIds) ? initialDraft.includedMemberIds : [])
  );

  // --- STEP 2: CORE INFO ---
  const [title, setTitle] = useState<string>(() => initialDraft?.title || "");
  const [description, setDescription] = useState<string>(() => initialDraft?.description || "");
  const [category, setCategory] = useState<string>(() => initialDraft?.category || "Youtube Videos");
  const [skills, setSkills] = useState<string[]>(
    () => (Array.isArray(initialDraft?.skills) ? initialDraft.skills : [])
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => initialDraft?.thumbnailUrl || null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // --- STEP 3: TERMS & DELIVERABLES ---
  const [termsOfService, setTermsOfService] = useState<string>(() => initialDraft?.termsOfService || "");
  const [selectedTosId, setSelectedTosId] = useState<string>(() => initialDraft?.selectedTosId || "standard");
  const [workSampleFiles, setWorkSampleFiles] = useState<File[]>([]);
  const [slots, setSlots] = useState<number>(() => (initialDraft?.slots ? Number(initialDraft.slots) : 3));

  // --- STEP 4: TIERS & MILESTONES ---
  const [tiers, setTiers] = useState<GigTier[]>(
    () => (Array.isArray(initialDraft?.tiers) && initialDraft.tiers.length > 0 ? initialDraft.tiers : DEFAULT_TIERS)
  );
  const [addOns, setAddOns] = useState<GigAddOn[]>(
    () => (Array.isArray(initialDraft?.addOns) ? initialDraft.addOns : [])
  );
  const [milestones, setMilestones] = useState<ServiceMilestone[]>(
    () => (Array.isArray(initialDraft?.milestones) && initialDraft.milestones.length > 0 ? initialDraft.milestones : DEFAULT_MILESTONES)
  );
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(
    () => (initialDraft?.additionalWorkRate !== undefined ? Number(initialDraft.additionalWorkRate) : 25)
  );

  // --- STEP 5: QUESTIONNAIRES ---
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(
    () => (Array.isArray(initialDraft?.questionnaires) ? initialDraft.questionnaires : [])
  );
  const [askNDA, setAskNDA] = useState<boolean>(
    () => (initialDraft?.askNDA !== undefined ? Boolean(initialDraft.askNDA) : true)
  );
  const [askPortfolio, setAskPortfolio] = useState<boolean>(
    () => (initialDraft?.askPortfolio !== undefined ? Boolean(initialDraft.askPortfolio) : true)
  );
  const [portfolioDuration, setPortfolioDuration] = useState<string>(
    () => initialDraft?.portfolioDuration || "30"
  );

  // --- VALIDATION & ERRORS ---
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(() => Boolean(initialDraft));
  const [publishProgress, setPublishProgress] = useState<GigPublishProgress | null>(null);
  const isSubmittedRef = useRef(false);

  // Auto-save draft to localStorage (including stepper progress & addOns)
  useEffect(() => {
    if (isSubmittedRef.current) return;
    const timer = setTimeout(() => {
      try {
        if (isSubmittedRef.current) return;
        const hasContent = Boolean(
          title.trim() ||
          description.trim() ||
          skills.length > 0 ||
          termsOfService.trim() ||
          currentSlide > 1 ||
          highestStepReached > 1 ||
          (postingAs === "team" && actingTeamId) ||
          (addOns && addOns.length > 0)
        );
        if (hasContent) {
          const draftData = {
            currentSlide,
            highestStepReached,
            postingAs,
            actingTeamId,
            includedMemberIds,
            title,
            description,
            category,
            skills,
            thumbnailUrl: thumbnailUrl?.startsWith("blob:") ? null : thumbnailUrl,
            slots,
            termsOfService,
            selectedTosId,
            tiers,
            addOns,
            milestones,
            additionalWorkRate,
            questionnaires,
            askNDA,
            askPortfolio,
            portfolioDuration,
          };
          localStorage.setItem("ensemble_gig_create_draft", JSON.stringify(draftData));
        } else {
          localStorage.removeItem("ensemble_gig_create_draft");
        }
      } catch (e) {
        console.error("Failed to auto-save gig draft", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    currentSlide,
    highestStepReached,
    postingAs,
    actingTeamId,
    includedMemberIds,
    title,
    description,
    category,
    skills,
    thumbnailUrl,
    slots,
    termsOfService,
    selectedTosId,
    tiers,
    addOns,
    milestones,
    additionalWorkRate,
    questionnaires,
    askNDA,
    askPortfolio,
    portfolioDuration,
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem("ensemble_gig_create_draft");
      setCurrentSlide(1);
      setHighestStepReached(1);
      setPostingAs("self");
      setActingTeamId("");
      setIncludedMemberIds([]);
      setTitle("");
      setDescription("");
      setCategory("Youtube Videos");
      setSkills([]);
      setThumbnailUrl(null);
      setThumbnailFile(null);
      setSlots(3);
      setTermsOfService("");
      setSelectedTosId("standard");
      setWorkSampleFiles([]);
      setTiers(DEFAULT_TIERS);
      setAddOns([]);
      setMilestones(DEFAULT_MILESTONES);
      setAdditionalWorkRate(25);
      setQuestionnaires([]);
      setAskNDA(true);
      setAskPortfolio(true);
      setPortfolioDuration("30");
      setErrors({});
      setIsDraftRestored(false);
      toast.success("Gig post draft reset.");
    } catch (e) {
      console.error("Failed to clear gig draft", e);
    }
  };

  const hasUnsavedChanges = Boolean(
    title.trim() ||
    description.trim() ||
    skills.length > 0 ||
    termsOfService.trim() ||
    thumbnailFile !== null ||
    workSampleFiles.length > 0 ||
    (addOns && addOns.length > 0) ||
    currentSlide > 1 ||
    (postingAs === "team" && actingTeamId)
  );

  const handleReturnTrigger = () => {
    if (hasUnsavedChanges) {
      setIsDiscardOpen(true);
    } else {
      navigate("/gigs");
    }
  };

  const handleNext = (targetSlide: number) => {
    // Validation from Step 1 -> Step 2
    if (currentSlide === 1 && targetSlide > 1) {
      if (postingAs === "team" && !actingTeamId) {
        toast.error("Please select a team before proceeding");
        return;
      }
      setErrors({});
    }

    // Validation from Step 2 -> Step 3
    if (currentSlide === 2 && targetSlide > 2) {
      const stepErrors: Record<string, string> = {};
      if (!title.trim()) stepErrors.title = "Service title is required";
      if (!description.trim()) stepErrors.description = "Service description is required";
      if (!category) stepErrors.category = "Category is required";
      if (!thumbnailFile && !thumbnailUrl) stepErrors.thumbnail = "Thumbnail or cover banner is required";
      if (skills.length === 0) stepErrors.skills = "At least 1 applied skill is required";

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        toast.error("Please complete all required fields on this step");
        return;
      }
      setErrors({});
    }

    // Validation from Step 3 -> Step 4 (Terms, Capacity, Workflow & Questionnaires)
    if (currentSlide === 3 && targetSlide > 3) {
      const stepErrors: Record<string, string> = {};
      if (!termsOfService.trim()) stepErrors.termsOfService = "Terms of service contract is required";
      if (slots < 1) stepErrors.slots = "Minimum 1 concurrent slot required";

      questionnaires.forEach((q) => {
        if (!q.question.trim()) stepErrors[`question_${q.id}_question`] = "Question text is required";
        if (q.type === "choice") {
          if (!q.options || q.options.length < 2) {
            stepErrors[`question_${q.id}_options_length`] = "Multiple choice requires at least 2 options";
          } else {
            q.options.forEach((opt, optIdx) => {
              if (!opt.trim()) stepErrors[`question_${q.id}_option_${optIdx}`] = "Option cannot be empty";
            });
          }
        }
      });

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        toast.error("Please complete all required fields on this step");
        return;
      }
      setErrors({});
    }

    // Validation from Step 4 -> Step 5 (Milestones Roadmap Only)
    if (currentSlide === 4 && targetSlide > 4) {
      const stepErrors: Record<string, string> = {};
      if (milestones.length === 0) {
        stepErrors.milestones = "At least one milestone phase is required";
      }
      milestones.forEach((m, index) => {
        if (!m.name.trim()) stepErrors[`milestone_${index}_name`] = "Phase name required";
      });

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        toast.error("Please fill in missing milestone phase details");
        return;
      }
      setErrors({});
    }

    // Validation from Step 5 -> Step 6 (Pricing Tiers Only)
    if (currentSlide === 5 && targetSlide > 5) {
      const stepErrors: Record<string, string> = {};
      if (tiers.length === 0) {
        stepErrors.tiers = "At least one pricing tier is required";
      }
      tiers.forEach((tier, index) => {
        if (!tier.title.trim()) stepErrors[`tier_${index}_title`] = "Title required";
        if (!tier.description.trim()) stepErrors[`tier_${index}_description`] = "Description required";
        if (tier.price <= 0) stepErrors[`tier_${index}_price`] = "Price required";
      });

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        toast.error("Please fill in missing pricing tier details");
        return;
      }
      setErrors({});
    }

    setCurrentSlide(targetSlide);
    const newHighest = Math.max(highestStepReached, targetSlide);
    if (targetSlide > highestStepReached) {
      setHighestStepReached(targetSlide);
    }

    // Synchronously persist current slide & highest step reached so rapid refresh doesn't lose stepper progress
    try {
      const saved = localStorage.getItem("ensemble_gig_create_draft");
      const draftObj = saved ? JSON.parse(saved) : {};
      draftObj.currentSlide = targetSlide;
      draftObj.highestStepReached = newHighest;
      localStorage.setItem("ensemble_gig_create_draft", JSON.stringify(draftObj));
    } catch {}

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const totalFilesCount = (thumbnailFile ? 1 : 0) + workSampleFiles.length;
    const totalBytes =
      (thumbnailFile ? thumbnailFile.size : 0) +
      workSampleFiles.reduce((acc, f) => acc + f.size, 0);

    const fileLoadedMap = new Map<string, number>();

    const updateProgress = (
      stage: GigPublishProgress["stage"],
      currentFileName?: string,
      currentFileIndex?: number,
      customPercent?: number,
      statusTextOverride?: string
    ) => {
      const sumLoaded = Array.from(fileLoadedMap.values()).reduce((a, b) => a + b, 0);
      const uploadRatio = totalBytes > 0 ? sumLoaded / totalBytes : 1;
      const calculatedPercent = totalBytes > 0 ? Math.round(uploadRatio * 82) : 82;
      const finalPercent =
        customPercent !== undefined ? customPercent : Math.min(85, calculatedPercent);

      let text = statusTextOverride;
      if (!text) {
        if (stage === "uploading_media" && currentFileName) {
          text = `Uploading ${currentFileName} (${Math.round(uploadRatio * 100)}%)`;
        } else if (stage === "saving_service") {
          text = "Deducting 50 Credits & broadcasting listing...";
        } else if (stage === "completed") {
          text = "Service published successfully!";
        } else {
          text = "Preparing service assets...";
        }
      }

      setPublishProgress({
        stage,
        percentage: Math.max(5, Math.min(100, finalPercent)),
        currentFileName,
        currentFileIndex,
        totalFiles: totalFilesCount,
        uploadedBytes: sumLoaded,
        totalBytes,
        statusText: text,
      });
    };

    updateProgress("preparing", undefined, undefined, 8, "Preparing service assets and verification...");

    try {
      await requireVerifiedAccount();
      let thumbnailFileId: string | null = null;
      let galleryFileIds: string[] = [];

      let currentFileCounter = 0;

      // 1. Thumbnail upload
      if (thumbnailFile) {
        currentFileCounter++;
        updateProgress(
          "uploading_media",
          thumbnailFile.name,
          currentFileCounter,
          undefined,
          `Uploading Cover Thumbnail: ${thumbnailFile.name}`
        );
        const res = await uploadFileWithIntent(thumbnailFile, "gig_thumbnails", (loaded) => {
          fileLoadedMap.set("thumbnail", loaded);
          updateProgress("uploading_media", thumbnailFile.name, currentFileCounter);
        });
        thumbnailFileId = res.fileId;
        fileLoadedMap.set("thumbnail", thumbnailFile.size);
      }

      // 2. Work sample attachments upload (sequential for accurate progress & bandwidth focus)
      for (let i = 0; i < workSampleFiles.length; i++) {
        const file = workSampleFiles[i];
        currentFileCounter++;
        const fileKey = `sample_${i}`;
        updateProgress(
          "uploading_media",
          file.name,
          currentFileCounter,
          undefined,
          `Uploading Video / Sample (${i + 1}/${workSampleFiles.length}): ${file.name}`
        );
        const res = await uploadFileWithIntent(file, "gig_galleries", (loaded) => {
          fileLoadedMap.set(fileKey, loaded);
          updateProgress("uploading_media", file.name, currentFileCounter);
        });
        galleryFileIds[i] = res.fileId;
        fileLoadedMap.set(fileKey, file.size);
      }

      updateProgress(
        "saving_service",
        undefined,
        undefined,
        90,
        "Deducting 50 Credits & registering service on marketplace..."
      );

      const finalQuestionnaires = [...questionnaires];
      if (askNDA) {
        finalQuestionnaires.push({
          id: "req-nda-" + Date.now(),
          type: "choice",
          question: "Do you require confidentiality (NDA) for this project?",
          isRequired: true,
          multipleAnswer: false,
          options: ["Yes, I require an NDA", "No, standard confidentiality is fine"],
        });
      }
      if (askPortfolio) {
        finalQuestionnaires.push({
          id: "req-port-" + Date.now(),
          type: "choice",
          question: `Do you allow us to display the final work in our Freelancer/Studio Portfolio after completion (up to ${portfolioDuration || "30"}s showcase)?`,
          isRequired: true,
          multipleAnswer: false,
          options: ["Yes, you can use it", "No, please keep it private"],
        });
      }

      const firstDraft = tiers.length > 0
        ? tiers[0].daysOfDelivery === 1
          ? "1 Day"
          : `${tiers[0].daysOfDelivery} Days`
        : "2 Days";

      const gigPayload = {
        title,
        description,
        category,
        slots,
        termsOfService,
        firstDraftDelivery: firstDraft,
        additionalWorkRate,
        portfolioDuration: askPortfolio && portfolioDuration ? Number(portfolioDuration) : null,
        portfolio_use_duration_seconds: askPortfolio && portfolioDuration ? Number(portfolioDuration) : null,
        tiers,
        addOns,
        milestones: milestones.map((m, idx) => ({
          name: m.name,
          description: m.description,
          index: idx,
          hours: m.hours,
          revisions: m.revisions,
          percentage: m.percentage,
          tasks: m.tasks,
        })),
        questionnaires: finalQuestionnaires,
        skills,
        thumbnailFileId,
        galleryFileIds: galleryFileIds.filter(Boolean),
        acting_team_id: postingAs === "team" && actingTeamId ? actingTeamId : null,
      };

      await api.post("/api/gigs", gigPayload);

      isSubmittedRef.current = true;
      try {
        localStorage.removeItem("ensemble_gig_create_draft");
      } catch (_) {}

      // Reset all form state so a new gig post starts with a fresh blank canvas
      setCurrentSlide(1);
      setHighestStepReached(1);
      setPostingAs("self");
      setActingTeamId("");
      setIncludedMemberIds([]);
      setTitle("");
      setDescription("");
      setCategory("Youtube Videos");
      setSkills([]);
      setThumbnailUrl(null);
      setThumbnailFile(null);
      setSlots(3);
      setTermsOfService("");
      setSelectedTosId("standard");
      setWorkSampleFiles([]);
      setTiers(DEFAULT_TIERS);
      setAddOns([]);
      setMilestones(DEFAULT_MILESTONES);
      setAdditionalWorkRate(25);
      setQuestionnaires([]);
      setAskNDA(true);
      setAskPortfolio(true);
      setPortfolioDuration("30");
      setErrors({});
      setIsDraftRestored(false);

      updateProgress("completed", undefined, undefined, 100, "Service published successfully!");

      // Brief delay to let the user see the 100% completion checkmark
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPublishProgress(null);
      setIsSuccessOpen(true);
      toast.success("Service published successfully!");
    } catch (err: any) {
      console.error("Error creating gig:", err);
      const message = err.response?.data?.message || err.message || "Failed to create gig";
      toast.error(message);
      setPublishProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingVerification || isGlobalLoading || isInitializingStudio) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden">
        {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Preparing Service Posting Studio
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Setting up your service creation workspace and restoring any saved draft...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12 font-inter transition-colors duration-300">
      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <FloatingCreditsPill />

      {/* Main Form Content - Wide Layout matching Job Posting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6"
      >
        {/* Title Heading Display */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Creating a Gig Post
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Fill in the details below to publish a new service offering to the marketplace.
          </p>
        </motion.div>

        {/* Header Stepper & Return Button with Draft Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <GigCreateHeader
            currentSlide={currentSlide}
            onReturn={handleReturnTrigger}
            isDraftRestored={isDraftRestored}
            onClearDraft={handleClearDraft}
            hasReachedReview={highestStepReached >= 6}
            onJumpToReview={() => handleNext(6)}
            maxReachedStep={highestStepReached}
            onStepClick={(stepId) => handleNext(stepId)}
          />
        </motion.div>

        {/* Form Box Wrapper with Slide Transition */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-2xl space-y-6 w-full"
        >
          <AnimatePresence mode="wait">
            {/* STEP 1: IDENTITY */}
            {currentSlide === 1 && (
              <motion.div
                key="slide1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigIdentity
                  postingAs={postingAs}
                  setPostingAs={setPostingAs}
                  actingTeamId={actingTeamId}
                  setActingTeamId={setActingTeamId}
                  includedMemberIds={includedMemberIds}
                  setIncludedMemberIds={setIncludedMemberIds}
                  onNext={() => handleNext(2)}
                />
              </motion.div>
            )}

            {/* STEP 2: CORE SPECIFICATIONS */}
            {currentSlide === 2 && (
              <motion.div
                key="slide2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateCoreInfo
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  category={category}
                  setCategory={setCategory}
                  skills={skills}
                  setSkills={setSkills}
                  previewUrl={thumbnailUrl}
                  setPreviewUrl={setThumbnailUrl}
                  setThumbnailFile={setThumbnailFile}
                  isDragging={false}
                  setIsDragging={() => {}}
                  errors={errors}
                  setErrors={setErrors}
                  postingAs={postingAs}
                  onNext={() => handleNext(3)}
                  onBack={() => handleNext(1)}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {/* STEP 3: TERMS & AGREEMENT */}
            {currentSlide === 3 && (
              <motion.div
                key="slide3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigTerms
                  termsOfService={termsOfService}
                  setTermsOfService={setTermsOfService}
                  selectedTosId={selectedTosId}
                  setSelectedTosId={setSelectedTosId}
                  workSampleFiles={workSampleFiles}
                  setWorkSampleFiles={setWorkSampleFiles}
                  slots={slots}
                  setSlots={setSlots}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  askNDA={askNDA}
                  setAskNDA={setAskNDA}
                  askPortfolio={askPortfolio}
                  setAskPortfolio={setAskPortfolio}
                  portfolioDuration={portfolioDuration}
                  setPortfolioDuration={setPortfolioDuration}
                  questionnaires={questionnaires}
                  setQuestionnaires={setQuestionnaires}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={() => handleNext(4)}
                  onBack={() => handleNext(2)}
                />
              </motion.div>
            )}

            {/* STEP 4: MILESTONES ROADMAP */}
            {currentSlide === 4 && (
              <motion.div
                key="slide4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GigMilestones
                  milestones={milestones}
                  setMilestones={setMilestones}
                  tiers={tiers}
                  setTiers={setTiers}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={() => handleNext(5)}
                  onBack={() => handleNext(3)}
                />
              </motion.div>
            )}

            {/* STEP 5: PRICING TIERS */}
            {currentSlide === 5 && (
              <motion.div
                key="slide5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateTiers
                  tiers={tiers}
                  setTiers={setTiers}
                  addOns={addOns}
                  setAddOns={setAddOns}
                  gigTitle={title}
                  gigDescription={description}
                  gigCategory={category}
                  gigSkills={skills}
                  isTeam={postingAs === "team"}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={() => handleNext(4)}
                  onNext={() => handleNext(6)}
                />
              </motion.div>
            )}

            {/* STEP 6: REVIEW & PUBLISH */}
            {currentSlide === 6 && (
              <motion.div
                key="slide6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateReview
                  title={title}
                  description={description}
                  category={category}
                  thumbnailUrl={thumbnailUrl}
                  slots={slots}
                  termsOfService={termsOfService}
                  skills={skills}
                  firstDraftDelivery={
                    tiers.length > 0
                      ? tiers[0].daysOfDelivery === 1
                        ? "1 Day"
                        : `${tiers[0].daysOfDelivery} Days`
                      : "2 Days"
                  }
                  workSampleFiles={workSampleFiles}
                  tiers={tiers}
                  addOns={addOns}
                  milestones={milestones}
                  additionalWorkRate={additionalWorkRate}
                  questionnaires={questionnaires}
                  askNDA={askNDA}
                  askPortfolio={askPortfolio}
                  portfolioDuration={portfolioDuration}
                  postingAs={postingAs}
                  actingTeamId={actingTeamId}
                  includedMemberIds={includedMemberIds}
                  onBack={() => handleNext(5)}
                  onSubmit={handleSubmit}
                  onEditStep={(step) => handleNext(step)}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <CreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => {
          setIsSuccessOpen(false);
          try {
            localStorage.removeItem("ensemble_gig_create_draft");
          } catch (_) {}
          navigate("/gigs");
        }}
      />

      <GigPublishProgressModal
        isOpen={Boolean(publishProgress)}
        progress={publishProgress}
      />

      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        description="All unsaved inputs and draft details for this service offering will be permanently lost if you return now."
        onConfirm={() => {
          setIsDiscardOpen(false);
          try {
            localStorage.removeItem("ensemble_gig_create_draft");
          } catch (_) {}
          navigate("/gigs");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  );
};

export default GigCreatePage;
