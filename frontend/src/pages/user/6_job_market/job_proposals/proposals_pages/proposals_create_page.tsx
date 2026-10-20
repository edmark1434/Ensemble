import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import api from "@/lib/axios";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { requireVerifiedAccount } from "@/lib/accountVerification";

// Sub-components & Wizard Steps
import ProposalCreateHeader from "../proposals_components/proposals_creation_components/proposal_create_header";
import ProposalPitchStep from "../proposals_components/proposals_creation_components/1_proposal_pitch";
import ProposalTermsStep from "../proposals_components/proposals_creation_components/2_proposal_terms";
import ProposalMilestonesStep, { type Milestone } from "../proposals_components/proposals_creation_components/3_proposal_milestones";
import ProposalReviewStep from "../proposals_components/proposals_creation_components/4_proposal_review";
import ProposalCreationSuccess from "../proposals_components/proposals_creation_components/5_proposal_success.tsx";

import PopupConfirmReturn from "../../job_components/job_popups/popup_confirm_return";
import { sampleJobs } from "../../job_datasets";
import type { Job } from "../../job_components/job_lists";

const ProposalsCreatePage: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [job, setJob] = useState<Job | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingTeamId, setActingTeamId] = useState("");
  
  const { createProposal, fetchJobs, uploadAttachment } = useJobs();

  // Step 1: Pitch & Pricing States
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState("");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(20);
  const [coverLetter, setCoverLetter] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [workSampleFiles, setWorkSampleFiles] = useState<File[]>([]);

  // Step 2: TOS States
  const [selectedTosId, setSelectedTosId] = useState("");
  const [tosContent, setTosContent] = useState("");

  // Step 3: Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "ms-1",
      name: "Phase 1: Initial Draft & Rough Pass",
      description: "Deliver rough cut / core framework for initial feedback.",
      hours: 12,
      revisions: 2,
      percentage: 50,
    },
    {
      id: "ms-2",
      name: "Phase 2: Final Polish & Export",
      description: "Apply color passes, audio sync, and final master deliverables.",
      hours: 8,
      revisions: 1,
      percentage: 50,
    },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Restore draft from localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(`ensemble_proposal_draft_${id}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.bidAmount) setBidAmount(data.bidAmount);
        if (data.coverLetter) setCoverLetter(data.coverLetter);
        if (data.additionalWorkRate !== undefined) setAdditionalWorkRate(data.additionalWorkRate);
        if (data.selectedTosId) setSelectedTosId(data.selectedTosId);
        if (data.tosContent) setTosContent(data.tosContent);
        if (Array.isArray(data.milestones) && data.milestones.length > 0) setMilestones(data.milestones);
        if (data.selectedMilestoneId) setSelectedMilestoneId(data.selectedMilestoneId);
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
          coverLetter,
          additionalWorkRate,
          selectedTosId,
          tosContent,
          milestones,
          selectedMilestoneId,
          updatedAt: Date.now(),
        };
        localStorage.setItem(`ensemble_proposal_draft_${id}`, JSON.stringify(draftData));
      } catch (e) {
        console.error("Failed to auto-save proposal draft", e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [id, bidAmount, coverLetter, additionalWorkRate, selectedTosId, tosContent, milestones, selectedMilestoneId]);

  const handleClearDraft = () => {
    if (id) {
      localStorage.removeItem(`ensemble_proposal_draft_${id}`);
    }
    setBidAmount("");
    setCoverLetter("");
    setSelectedTosId("");
    setTosContent("");
    setMilestones([
      {
        id: "ms-1",
        name: "Phase 1: Initial Draft & Rough Pass",
        description: "Deliver rough cut / core framework for initial feedback.",
        hours: 12,
        revisions: 2,
        percentage: 50,
      },
      {
        id: "ms-2",
        name: "Phase 2: Final Polish & Export",
        description: "Apply color passes, audio sync, and final master deliverables.",
        hours: 8,
        revisions: 1,
        percentage: 50,
      },
    ]);
    setIsDraftRestored(false);
  };

  useEffect(() => {
    const loadJob = async () => {
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
          setJob({
            id: found.job_id,
            title: found.title,
            description: found.description,
            status: found.status,
            category: found.category,
            difficulty: found.experience_level,
            priceRange: !found.rate_credits_max
              ? `${found.rate_credits_min?.toLocaleString() || 0}+`
              : (found.rate_credits_min && found.rate_credits_min === found.rate_credits_max)
              ? `${found.rate_credits_min.toLocaleString()}`
              : `${found.rate_credits_min?.toLocaleString() || 0} ~ ${found.rate_credits_max?.toLocaleString() || 0}`,
            minBudget: found.rate_credits_min || 0,
            maxBudget: found.rate_credits_max || 0,
            postedBy: found.client_name || found.client_handle || "Unknown",
            clientAvatar: found.client_avatar_path ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${found.client_avatar_path}` : undefined,
            postedAt: new Date(found.created_at).toLocaleString(),
            timeAgo: "Recently", // Simplified
            clientRating: 5.0,
            ratingCount: 0,
            positionsNeeded: found.no_of_hires || 1,
            applicantsCount: Number(found.applicant_count || 0),
            savesCount: Number(found.saves_count || 0),
            timeline: `${found.timeline_min}-${found.timeline_max} Days`,
            thumbnail: getImageUrl(found.thumbnail_path) || "/placeholder.svg",
            skills: found.tags || [],
            isSaved: found.is_saved || false,
            isOwnPost: Boolean(found.is_own_post || found.isOwnPost),
            isManageablePost: Boolean(found.is_manageable_post || found.isManageablePost),
            hiring_type: found.hiring_type || "single",
            screening_questions: found.screening_questions || [],
            attachments: found.attachments || [],
            milestones: Array.isArray(found.milestones) ? found.milestones : []
          });
          if (found.hiring_type !== "team" && Array.isArray(found.milestones) && found.milestones.length > 0) {
            setMilestones(found.milestones.map((m: any, idx: number) => ({
              id: `pre-ms-${idx}`,
              name: m.title || `Phase ${idx + 1}`,
              description: m.description || "",
              hours: m.duration_hours || 24,
              revisions: 2,
              percentage: Number(m.budget_percentage) || Math.round(100 / found.milestones.length)
            })));
          }
          if (found.milestones && found.milestones.length > 0) {
            setSelectedMilestoneId(found.milestones[0].job_milestone_id);
          }
        }
      } catch (err) {
        console.error("Failed to load job for proposal", err);
      }
    };
    if (id) {
      loadJob();
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

    const currentMs = job?.milestones?.find((m: any) => m.job_milestone_id === selectedMilestoneId) || job?.milestones?.[0];
    const minBound = currentMs && job ? Math.round(((job.minBudget * Number(currentMs.budget_percentage)) / 100) / Math.max(1, currentMs.slots_count || 1)) : (job?.minBudget || 0);
    const maxBound = currentMs && job ? Math.round(((job.maxBudget * Number(currentMs.budget_percentage)) / 100) / Math.max(1, currentMs.slots_count || 1)) : (job?.maxBudget || 0);

    if (!isTeamJob) {
      if (!bidAmount || rawBid < 10) {
        stepErrors.bidAmount = "A minimum bid of at least 10 Credits is required.";
      }
    } else {
      if (!bidAmount || rawBid <= 0) {
        const fallbackBid = maxBound || minBound || 0;
        setBidAmount(fallbackBid.toString());
      }
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
    setCurrentSlide(2);
  };

  const handleTermsAdvance = () => {
    setCurrentSlide(3);
  };

  const handleMilestonesAdvance = () => {
    if (isTeamJob) {
      if (!selectedMilestoneId || milestones.length === 0) {
        setErrors({ milestones: "Please select a milestone role to propose for." });
        return;
      }
      setErrors({});
      setCurrentSlide(4);
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
    setCurrentSlide(4);
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
        job_milestone_id: (selectedMilestoneId && UUID_REGEX.test(selectedMilestoneId)) ? selectedMilestoneId : null,
        screening_answers: screeningAnswers,
        attachment_file_ids: attachmentFileIds,
        milestones: milestones.map(m => ({
          title: m.name,
          description: m.description,
          est_hrs: m.hours,
          max_rev: m.revisions
        })),
      };

      await createProposal(id, payload);
      if (id) {
        localStorage.removeItem(`ensemble_proposal_draft_${id}`);
      }
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || "Failed to submit proposal.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Creating Proposal Application</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Applying for Job ID <span className="font-mono text-blue-400">{id}</span>:{" "}
            <strong className="text-gray-900 dark:text-white">{job?.title || "Job Listing"}</strong>
          </p>
        </div>

        <ProposalCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />

        {isDraftRestored && (
          <div className="p-3 rounded-2xl border border-blue-500/20 bg-blue-50/70 dark:bg-blue-950/20 flex items-center justify-between text-xs transition">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Draft restored from your last session. Progress is saved automatically.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] font-bold text-gray-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition"
            >
              Clear Draft
            </button>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
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
                  errors={errors}
                  setErrors={setErrors}
                  screeningAnswers={screeningAnswers}
                  setScreeningAnswers={setScreeningAnswers}
                  workSampleFiles={workSampleFiles}
                  setWorkSampleFiles={setWorkSampleFiles}
                  onNext={handlePitchAdvance}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalTermsStep
                  selectedTosId={selectedTosId}
                  setSelectedTosId={setSelectedTosId}
                  tosContent={tosContent}
                  setTosContent={setTosContent}
                  onBack={() => setCurrentSlide(1)}
                  onAdvance={handleTermsAdvance}
                />
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
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
                  onBack={() => setCurrentSlide(2)}
                  onAdvance={handleMilestonesAdvance}
                  jobTimeline={job?.timeline || ""}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div key="step-4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <ProposalReviewStep
                  job={job}
                  bidAmount={bidAmount}
                  additionalWorkRate={additionalWorkRate}
                  coverLetter={coverLetter}
                  tosContent={tosContent}
                  milestones={milestones}
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(3)}
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