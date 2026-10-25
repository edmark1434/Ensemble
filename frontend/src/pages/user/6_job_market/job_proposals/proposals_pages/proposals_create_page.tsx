import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import api from "@/lib/axios";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { requireVerifiedAccount } from "@/lib/accountVerification";

// Sub-components & Wizard Steps
import ProposalCreateHeader from "../proposals_components/proposals_creation_components/proposal_create_header";
import ProposalIdentityStep from "../proposals_components/proposals_creation_components/0_proposal_identity";
import ProposalPitchStep from "../proposals_components/proposals_creation_components/1_proposal_pitch";
import ProposalTermsStep from "../proposals_components/proposals_creation_components/2_proposal_terms";
import ProposalMilestonesStep, { type Milestone, getTwoPhasePreset } from "../proposals_components/proposals_creation_components/3_proposal_milestones";
import ProposalReviewStep from "../proposals_components/proposals_creation_components/4_proposal_review";
import ProposalCreationSuccess from "../proposals_components/proposals_creation_components/5_proposal_success.tsx";

import PopupConfirmReturn from "../../job_components/job_popups/popup_confirm_return";
import { sampleJobs } from "../../job_datasets";
import type { Job } from "../../job_components/job_lists";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";

const getImageUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/profile_presets/")) return path;
  if (path.startsWith("/public/")) return path.replace(/^\/public/, "");
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) return `/profile_presets/${presetMatch[0]}`;
  const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return cloudfrontUrl ? `${cloudfrontUrl}/${path.replace(/^\//, "")}` : (path.startsWith("/") ? path : `/${path}`);
};

const ProposalsCreatePage: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isVerified = useGlobalState((state) => state.isVerified);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const user = useGlobalState((state) => state.user);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isCheckingVerification, setIsCheckingVerification] = useState(!isVerified);
  const [isLoadingJob, setIsLoadingJob] = useState(Boolean(id));
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
    if (isGlobalLoading) return;
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
            "Account Verification is required to submit a Job Proposal. Please verify your identity to proceed."
          );
          navigate(id ? `/jobs/postings/${id}` : "/jobs/postings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isGuestMode, isGlobalLoading, isVerified, user?.is_verified, navigate, id]);

  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [hasReachedReview, setHasReachedReview] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingTeamId, setActingTeamId] = useState("");
  const [includedMemberIds, setIncludedMemberIds] = useState<string[]>([]);
  
  const { createProposal, fetchJobs, uploadAttachment } = useJobs();

  // Step 1: Pitch & Pricing States
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState("");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(25);
  const [coverLetter, setCoverLetter] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [workSampleFiles, setWorkSampleFiles] = useState<File[]>([]);

  // Step 2: TOS States
  const [selectedTosId, setSelectedTosId] = useState("");
  const [tosContent, setTosContent] = useState("");

  // Step 3: Milestones State (Defaults to 2-Phase video production roadmap)
  const [milestones, setMilestones] = useState<Milestone[]>(() => getTwoPhasePreset(48));

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);

  // Track if user has reached Review & Send (Step 5)
  useEffect(() => {
    if (currentSlide === 5 && !hasReachedReview) {
      setHasReachedReview(true);
      setMaxReachedStep(5);
    }
  }, [currentSlide, hasReachedReview]);

  // Update maxReachedStep as user advances through steps
  useEffect(() => {
    setMaxReachedStep((prev) => Math.max(prev, currentSlide));
  }, [currentSlide]);

  // Restore draft from localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(`ensemble_proposal_draft_${id}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.bidAmount) setBidAmount(data.bidAmount);
        if (data.actingTeamId !== undefined) setActingTeamId(data.actingTeamId);
        if (Array.isArray(data.includedMemberIds)) setIncludedMemberIds(data.includedMemberIds);
        if (data.coverLetter) setCoverLetter(data.coverLetter);
        if (data.additionalWorkRate !== undefined) {
          setAdditionalWorkRate(Math.max(25, Number(data.additionalWorkRate) || 25));
        }
        if (data.selectedTosId) setSelectedTosId(data.selectedTosId);
        if (data.tosContent) setTosContent(data.tosContent);
        if (data.hasReachedReview) {
          setHasReachedReview(true);
          setMaxReachedStep(5);
        }
        if (data.maxReachedStep) setMaxReachedStep(data.maxReachedStep);
        if (Array.isArray(data.milestones) && data.milestones.length > 0) {
          setMilestones(
            data.milestones.map((m: any) => ({
              ...m,
              name: (m.name || "").replace(/^Phase\s*\d+\s*:\s*/i, "").trim() || m.name,
            }))
          );
        }
        if (data.selectedMilestoneId) setSelectedMilestoneId(data.selectedMilestoneId);
        if (Array.isArray(data.screeningAnswers)) setScreeningAnswers(data.screeningAnswers);
        setIsDraftRestored(true);
      }
    } catch (e) {
      console.error("Failed to restore proposal draft", e);
    }
  }, [id]);

  // Debounced auto-save draft to localStorage
  useEffect(() => {
    if (!id) return;
    if (!bidAmount && !coverLetter) return;
    const timer = setTimeout(() => {
      try {
        const draftData = {
          bidAmount,
          actingTeamId,
          includedMemberIds,
          coverLetter,
          additionalWorkRate,
          selectedTosId,
          tosContent,
          milestones,
          selectedMilestoneId,
          screeningAnswers,
          hasReachedReview,
          maxReachedStep: Math.max(maxReachedStep, currentSlide),
          updatedAt: Date.now(),
        };
        localStorage.setItem(`ensemble_proposal_draft_${id}`, JSON.stringify(draftData));
      } catch (e) {
        console.error("Failed to auto-save proposal draft", e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [id, bidAmount, actingTeamId, includedMemberIds, coverLetter, additionalWorkRate, selectedTosId, tosContent, milestones, selectedMilestoneId, screeningAnswers, hasReachedReview]);

  const handleClearDraft = () => {
    if (id) {
      localStorage.removeItem(`ensemble_proposal_draft_${id}`);
    }
    setBidAmount("");
    setActingTeamId("");
    setIncludedMemberIds([]);
    setCoverLetter("");
    setAdditionalWorkRate(25);
    setSelectedTosId("");
    setTosContent("");
    setMilestones(getTwoPhasePreset(48));
    setSelectedMilestoneId("");
    setScreeningAnswers([]);
    setHasReachedReview(false);
    setMaxReachedStep(1);
    setIsDraftRestored(false);
  };

  useEffect(() => {
    const loadJob = async () => {
      setIsLoadingJob(true);
      try {
        let found: any = null;
        try {
          const singleRes = await api.get(`/api/jobs/${id}`);
          if (singleRes.data?.data) {
            found = singleRes.data.data;
          }
        } catch {
          // fallback to list fetch
        }

        if (!found) {
          const fetchedJobs = await fetchJobs();
          found = fetchedJobs.find((j: any) => j.job_id === id);
        }

        if (found) {
          const rawMin = Number(found.rate_credits_min) || 0;
          const rawMax = Number(found.rate_credits_max) || 0;
          const isJobOpenBid = rawMax <= 0 || found.budget_type === "open";

          setJob({
            id: found.job_id,
            title: found.title,
            description: found.description,
            status: found.status,
            category: found.category,
            difficulty: found.experience_level,
            priceRange: isJobOpenBid
              ? `${rawMin.toLocaleString()}+ Credits (Open Bid)`
              : `${rawMin.toLocaleString()} ~ ${rawMax.toLocaleString()} Credits`,
            minBudget: rawMin,
            maxBudget: isJobOpenBid ? 0 : rawMax,
            budgetType: isJobOpenBid ? "open" : "range",
            requireNDA: Boolean(found.require_nda),
            portfolioUseAllowed: found.portfolio_use_allowed !== undefined ? Boolean(found.portfolio_use_allowed) : true,
            portfolioDuration: found.portfolio_use_duration_seconds || 90,
            postedBy: found.client_name || found.client_handle || "Client",
            clientAvatar: getImageUrl(found.client_avatar_path),
            postedAt: new Date(found.created_at).toLocaleString(),
            timeAgo: "Recently",
            clientRating: Number(found.client_rating) || 5.0,
            ratingCount: Number(found.client_rating_count) || 0,
            positionsNeeded: found.no_of_hires || 1,
            applicantsCount: Number(found.applicant_count || 0),
            savesCount: Number(found.saves_count || 0),
            minTimeline: found.timeline_min || 1,
            maxTimeline: found.timeline_max || 7,
            timeline: found.timeline_min && found.timeline_max ? `${found.timeline_min} - ${found.timeline_max} Days` : "Flexible",
            deadline: found.rough_deadline ? new Date(found.rough_deadline).toLocaleDateString() : undefined,
            thumbnail: getImageUrl(found.thumbnail_path) || "/placeholder.svg",
            skills: found.tags || [],
            isSaved: found.is_saved || false,
            isOwnPost: Boolean(found.is_own_post || found.isOwnPost),
            isManageablePost: Boolean(found.is_manageable_post || found.isManageablePost),
            hiring_type: found.hiring_type || "single",
            screening_questions: found.screening_questions || [],
            attachments: found.attachments || [],
            milestones: []
          });
        }
      } catch (err) {
        console.error("Failed to load job for proposal", err);
      } finally {
        setIsLoadingJob(false);
      }
    };
    if (id) {
      loadJob();
    } else {
      setIsLoadingJob(false);
    }
  }, [id, fetchJobs]);

  const hasUnsavedChanges = Boolean(bidAmount || coverLetter);
  const isTeamJob = Boolean(job?.hiring_type === "team" || job?.is_team || job?.isTeam || job?.posted_as === "Team");

  const handleReturnTrigger = () => {
    if (hasUnsavedChanges) {
      setIsDiscardOpen(true);
    } else {
      navigate("/jobs");
    }
  };

  const handlePitchAdvance = () => {
    const stepErrors: { [key: string]: string } = {};
    const rawBid = parseInt(bidAmount) || 0;

    const rawMax = Number(job?.maxBudget) || 0;
    const isOpenBid = rawMax <= 0 || (job as any)?.budgetType === "open" || (job as any)?.budget_type === "open";

    if (!bidAmount || rawBid < 10) {
      stepErrors.bidAmount = "A minimum bid of at least 10 Credits is required.";
    } else if (!isOpenBid && rawMax > 0 && rawBid > rawMax) {
      stepErrors.bidAmount = `Your bid cannot exceed the client's maximum budget ceiling of ${rawMax.toLocaleString()} Credits.`;
    }
    if (!coverLetter.trim() || coverLetter.length < 50) {
      stepErrors.coverLetter = "Cover pitch must be at least 50 characters long.";
    }

    if (job?.screening_questions && job.screening_questions.length > 0) {
      const hasUnanswered = job.screening_questions.some((q: string) => {
        const foundAns = screeningAnswers.find(sa => sa.question === q)?.answer;
        return !foundAns || !foundAns.trim();
      });
      if (hasUnanswered) {
        stepErrors.screeningAnswers = "Please answer all client screening questions before continuing.";
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCurrentSlide(3);
  };

  const handleTermsAdvance = () => {
    setCurrentSlide(4);
  };

  const handleMilestonesAdvance = () => {
    if (isTeamJob) {
      if (!selectedMilestoneId || milestones.length === 0) {
        setErrors({ milestones: "Please select a milestone role to propose for." });
        return;
      }
      setErrors({});
      setCurrentSlide(5);
      return;
    }

    if (milestones.length === 0) {
      setErrors({ milestones: "You must create at least 1 milestone." });
      return;
    }

    const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
    if (totalPercentage !== 100) {
      setErrors({ milestones: `Total milestone percentage must be exactly 100%. Current total is ${totalPercentage}%.` });
      return;
    }

    // Timeline Max Hours validation
    const maxDaysMatch = job?.timeline?.match(/-(\d+)\s*Days/i);
    const maxDays = maxDaysMatch ? parseInt(maxDaysMatch[1]) || 0 : 0;
    const maxHoursAllowed = maxDays * 24;

    const totalHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);
    
    if (maxHoursAllowed > 0 && totalHours > maxHoursAllowed) {
      setErrors({ milestones: `Total milestone hours (${totalHours}) cannot exceed the job's max timeline of ${maxDays} days (${maxHoursAllowed} hours).` });
      return;
    }

    setErrors({});
    setHasReachedReview(true);
    setCurrentSlide(5);
  };

  const handleJumpToReview = () => {
    setCurrentSlide(5);
  };

  const handleStepClick = (stepId: number) => {
    const reachableLimit = Math.max(currentSlide, maxReachedStep, hasReachedReview ? 5 : 1);
    if (stepId <= reachableLimit) {
      setCurrentSlide(stepId);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!actingTeamId) await requireVerifiedAccount();
      if (!id) throw new Error("Job ID is missing.");
      
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Upload Work Sample Attachments
      const attachmentFileIds: string[] = [];
      if (workSampleFiles.length > 0) {
        for (const f of workSampleFiles) {
          const fId = await uploadAttachment(f, "jobs");
          if (fId) attachmentFileIds.push(fId);
        }
      }
      
      const payload = {
        job_id: id,
        rate_credits: parseInt(bidAmount),
        revision_price_credits: additionalWorkRate,
        letter: coverLetter,
        tos_title: "Custom Terms",
        tos_content: tosContent,
        terms_id: (selectedTosId && UUID_REGEX.test(selectedTosId)) ? selectedTosId : null,  
        acting_team_id: actingTeamId || null,
        actingTeamId: actingTeamId || null,
        included_member_account_ids: actingTeamId ? includedMemberIds : [],
        job_milestone_id: (selectedMilestoneId && UUID_REGEX.test(selectedMilestoneId)) ? selectedMilestoneId : null,
        screening_answers: screeningAnswers,
        attachment_file_ids: attachmentFileIds,
        milestones: milestones.map(m => ({
          title: m.name,
          description: m.description,
          est_hrs: m.hours,
          max_rev: m.revisions,
          tasks: Array.isArray(m.tasks) ? m.tasks : []
        })),
      };

      await createProposal(id, payload);
      if (id) {
        localStorage.removeItem(`ensemble_proposal_draft_${id}`);
      }
      setIsSuccessOpen(true);

      // Decrement global wallet balance by proposal filing fee (10) to trigger animated deduction
      const curUser = useGlobalState.getState().user;
      if (curUser) {
        const curBal = Number(curUser.wallet?.balance_credits ?? 0);
        const nextBal = Math.max(0, curBal - 10);
        useGlobalState.getState().setUser({
          ...curUser,
          wallet: {
            ...(curUser.wallet || {}),
            balance_credits: nextBal,
          },
        });
      }
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || "Failed to submit proposal.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingVerification || isGlobalLoading || isLoadingJob || isInitializingStudio) {
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
              Preparing Proposal Studio
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Loading target job specifications and restoring your proposal draft...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (job?.isOwnPost) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface text-center space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Cannot Apply to Your Own Job</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            You cannot submit a proposal to a job listing posted by your account or an active Team you belong to.
          </p>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => navigate("/jobs/postings")}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
            >
              Back to Job Market
            </button>
            <button
              onClick={() => navigate(`/jobs/postings/${id}/page`)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer"
            >
              View Job Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12">
      {/* Floating Upper Right Credits Pill */}
      <FloatingCreditsPill />

      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Creating Proposal Application</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Applying for: <strong className="text-gray-900 dark:text-white font-semibold">{job?.title || "Job Listing"}</strong>
          </p>
        </div>

        <ProposalCreateHeader
          currentSlide={currentSlide}
          onReturn={handleReturnTrigger}
          hasReachedReview={hasReachedReview}
          onJumpToReview={handleJumpToReview}
          isDraftRestored={isDraftRestored}
          onClearDraft={handleClearDraft}
          maxReachedStep={maxReachedStep}
          onStepClick={handleStepClick}
        />

        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <ProposalIdentityStep
                  job={job}
                  actingTeamId={actingTeamId}
                  setActingTeamId={setActingTeamId}
                  includedMemberIds={includedMemberIds}
                  setIncludedMemberIds={setIncludedMemberIds}
                  onNext={() => setCurrentSlide(2)}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalPitchStep
                  job={job}
                  bidAmount={bidAmount}
                  setBidAmount={setBidAmount}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  coverLetter={coverLetter}
                  setCoverLetter={setCoverLetter}
                  selectedMilestoneId={selectedMilestoneId}
                  setSelectedMilestoneId={setSelectedMilestoneId}
                  actingTeamId={actingTeamId}
                  errors={errors}
                  setErrors={setErrors}
                  screeningAnswers={screeningAnswers}
                  setScreeningAnswers={setScreeningAnswers}
                  onNext={handlePitchAdvance}
                  onBack={() => setCurrentSlide(1)}
                />
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalTermsStep
                  job={job}
                  selectedTosId={selectedTosId}
                  setSelectedTosId={setSelectedTosId}
                  tosContent={tosContent}
                  setTosContent={setTosContent}
                  workSampleFiles={workSampleFiles}
                  setWorkSampleFiles={setWorkSampleFiles}
                  onBack={() => setCurrentSlide(2)}
                  onAdvance={handleTermsAdvance}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div key="step-4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalMilestonesStep
                  job={job}
                  bidAmount={bidAmount}
                  setBidAmount={setBidAmount}
                  additionalWorkRate={additionalWorkRate}
                  milestones={milestones}
                  setMilestones={setMilestones}
                  selectedMilestoneId={selectedMilestoneId}
                  setSelectedMilestoneId={setSelectedMilestoneId}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={() => setCurrentSlide(3)}
                  onAdvance={handleMilestonesAdvance}
                  jobTimeline={job?.timeline || ""}
                  actingTeamId={actingTeamId}
                />
              </motion.div>
            )}

            {currentSlide === 5 && (
              <motion.div key="step-5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalReviewStep
                  job={job}
                  bidAmount={bidAmount}
                  additionalWorkRate={additionalWorkRate}
                  coverLetter={coverLetter}
                  tosContent={tosContent}
                  milestones={milestones}
                  actingTeamId={actingTeamId}
                  includedMemberIds={includedMemberIds}
                  workSampleFiles={workSampleFiles}
                  screeningAnswers={screeningAnswers}
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(4)}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Standalone Proposal Success Modal */}
      <ProposalCreationSuccess isOpen={isSuccessOpen} onConfirm={() => navigate("/jobs/proposals/sent")} />

      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          if (id) {
            localStorage.removeItem(`ensemble_proposal_draft_${id}`);
          }
          setIsDiscardOpen(false);
          navigate("/jobs");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  );
};

export default ProposalsCreatePage;
