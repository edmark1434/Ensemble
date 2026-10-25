import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import useGlobalState from "@/lib/global_state";
import { Info, Lock, FileEdit, CheckCircle2, X } from "lucide-react";

// Reused Creation Step Components & Header
import ProposalEditHeader from "../proposals_components/proposals_edit_components/proposal_edit_header";
import ProposalPitchStep from "../proposals_components/proposals_creation_components/1_proposal_pitch";
import ProposalTermsStep from "../proposals_components/proposals_creation_components/2_proposal_terms";
import ProposalMilestonesStep, {
  type Milestone,
} from "../proposals_components/proposals_creation_components/3_proposal_milestones";
import ProposalReviewStep from "../proposals_components/proposals_creation_components/4_proposal_review";
import ProposalCreationSuccess from "../proposals_components/proposals_creation_components/5_proposal_success";

import PopupConfirmReturn from "../../job_components/job_popups/popup_confirm_return";
import { sampleSentProposals } from "../proposals_datasets";
import { sampleJobs } from "../../job_datasets";
import type { Job } from "../../job_components/job_lists";
import type { ProposalItemData } from "../proposals_components/proposals_list";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";

export const ProposalsEditPage: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const navigate = useNavigate();
  const location = useLocation();
  const { proposalId } = useParams<{ proposalId: string }>();

  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(4);
  const [hasReachedReview, setHasReachedReview] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [proposal, setProposal] = useState<ProposalItemData | null>(null);

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Pitch & Pricing States
  const [actingTeamId, setActingTeamId] = useState<string | undefined>(undefined);
  const [bidAmount, setBidAmount] = useState("");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(25);
  const [coverLetter, setCoverLetter] = useState("");

  // Step 2: TOS States
  const [selectedTosId, setSelectedTosId] = useState("");
  const [tosContent, setTosContent] = useState("");

  // Step 3: Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const normalizeProposalMilestones = (rawMilestones?: any[]): Milestone[] => {
    if (!Array.isArray(rawMilestones) || rawMilestones.length === 0) return [];
    const count = rawMilestones.length;
    const currentTotal = rawMilestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);

    if (currentTotal === 100) {
      return rawMilestones.map((m, idx) => ({
        id: m.id || `m-${idx + 1}`,
        name: m.name || m.title || `Milestone ${idx + 1}`,
        description: m.description || "",
        percentage: Number(m.percentage),
        hours: Number(m.hours || m.duration_hrs || m.est_hrs) || 24,
        revisions: Number(m.revisions ?? m.no_of_revisions_max ?? m.max_rev ?? 1),
        tasks: Array.isArray(m.tasks) ? m.tasks : [],
      }));
    }

    const base = Math.floor(100 / count);
    const rem = 100 - base * count;

    return rawMilestones.map((m, idx) => ({
      id: m.id || `m-${idx + 1}`,
      name: m.name || m.title || `Milestone ${idx + 1}`,
      description: m.description || "",
      percentage: base + (idx === 0 ? rem : 0),
      hours: Number(m.hours || m.duration_hrs || m.est_hrs) || 24,
      revisions: Number(m.revisions ?? m.no_of_revisions_max ?? m.max_rev ?? 1),
      tasks: Array.isArray(m.tasks) ? m.tasks : [],
    }));
  };

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setMaxReachedStep((prev) => Math.max(prev, currentSlide));
  }, [currentSlide]);

  useEffect(() => {
    if (currentSlide === 4 && !hasReachedReview) {
      setHasReachedReview(true);
    }
  }, [currentSlide, hasReachedReview]);

  const { fetchProposalById, fetchJobs } = useJobs();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Existing Proposal & Associated Job Data
  useEffect(() => {
    const loadData = async () => {
      if (!proposalId) return;
      try {
        const p = await fetchProposalById(proposalId);
        const mappedProposal: ProposalItemData = {
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          partyName: p.freelancer_name || p.freelancer_handle || "Unknown",
          partyAvatar: constructAvatarUrl(p.freelancer_avatar_path, p.freelancer_name || p.freelancer_handle),
          bidAmount: parseFloat(p.rate_credits) || 0,
          additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
          status: p.status,
          submittedAt: new Date(p.created_at).toLocaleDateString(),
          coverLetter: p.letter || "",
          tosContent: p.terms || "",
          milestones: p.milestones || [],
          type: "sent",
        };

        setProposal(mappedProposal);
        setActingTeamId(p.freelancer_team_id || p.team_id || (p.freelancer_type === "team" ? p.freelancer_account_id : undefined));
        setBidAmount(mappedProposal.bidAmount.toString());
        setAdditionalWorkRate(mappedProposal.additionalWorkRate);
        setCoverLetter(mappedProposal.coverLetter);
        setTosContent(mappedProposal.tosContent);
        setMilestones(normalizeProposalMilestones(mappedProposal.milestones));

        try {
          const jobs = await fetchJobs();
          const foundJob = jobs.find((j: any) => j.job_id === p.job_id);
          if (foundJob) {
            setJob({
              id: foundJob.job_id,
              title: foundJob.title,
              minBudget: parseFloat(foundJob.rate_credits_min) || 0,
              maxBudget: parseFloat(foundJob.rate_credits_max) || 0,
              priceRange: !foundJob.rate_credits_max
                ? `${(parseFloat(foundJob.rate_credits_min) || 0).toLocaleString()}+`
                : `${(parseFloat(foundJob.rate_credits_min) || 0).toLocaleString()} - ${(parseFloat(foundJob.rate_credits_max) || 0).toLocaleString()}`,
              description: foundJob.description || "",
              createdAt: foundJob.created_at || "",
              status: foundJob.status || "",
              tags: foundJob.tags || [],
            } as Job);
          }
        } catch (jobErr) {
          console.warn("Failed to fetch job info", jobErr);
        }

      } catch (err) {
        // Fallback to sample data for mock UI interactions
        const foundProposal = sampleSentProposals.find((p) => p.id === proposalId);
        if (foundProposal) {
          setProposal(foundProposal);
          setActingTeamId((foundProposal as any).actingTeamId || undefined);
          setBidAmount(foundProposal.bidAmount.toString());
          setAdditionalWorkRate(foundProposal.additionalWorkRate);
          setCoverLetter(foundProposal.coverLetter);
          setTosContent(foundProposal.tosContent);
          setMilestones(normalizeProposalMilestones(foundProposal.milestones));

          const foundJob = sampleJobs.find((j) => j.id === foundProposal.jobId);
          if (foundJob) {
            setJob(foundJob);
          }
        } else {
          setProposal(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const handlePitchAdvance = () => {
    const stepErrors: { [key: string]: string } = {};
    const rawBid = parseInt(bidAmount) || 0;

    if (!bidAmount || rawBid <= 0) {
      stepErrors.bidAmount = "A valid bid amount is required.";
    } else if (job && rawBid < job.minBudget) {
      stepErrors.bidAmount = `Please increase your bid to the minimum budget of ${job.minBudget.toLocaleString()}.`;
    } else if (job && rawBid > job.maxBudget) {
      stepErrors.bidAmount = `Please do not exceed the maximum budget of ${job.maxBudget.toLocaleString()}.`;
    }
    if (!coverLetter.trim() || coverLetter.length < 50) {
      stepErrors.coverLetter = "Cover pitch must be at least 50 characters long.";
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
    if (milestones.length === 0) {
      setErrors({ milestones: "You must create at least 1 milestone." });
      return;
    }
    const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
    if (totalPercentage !== 100) {
      setErrors({ milestones: `Total milestone percentage must be exactly 100%. Current total is ${totalPercentage}%.` });
      return;
    }
    setErrors({});
    setCurrentSlide(4);
  };

  const changes = useMemo(() => {
    if (!proposal) return [];
    const list: { id: string; field: string; label: string; from: string; to: string }[] = [];

    const curBid = parseInt(bidAmount) || 0;
    if (curBid > 0 && curBid !== proposal.bidAmount) {
      list.push({
        id: "bid",
        field: "bidAmount",
        label: "Proposal Bid",
        from: `${proposal.bidAmount.toLocaleString()} Credits`,
        to: `${curBid.toLocaleString()} Credits`,
      });
    }

    if (Number(additionalWorkRate) !== Number(proposal.additionalWorkRate)) {
      list.push({
        id: "rate",
        field: "additionalWorkRate",
        label: "Additional Work Rate",
        from: `+${proposal.additionalWorkRate}%`,
        to: `+${additionalWorkRate}%`,
      });
    }

    if (coverLetter.trim() !== (proposal.coverLetter || "").trim()) {
      const origText = (proposal.coverLetter || "").trim();
      const newText = coverLetter.trim();
      list.push({
        id: "pitch",
        field: "coverLetter",
        label: "Cover Pitch",
        from: origText.length > 70 ? `${origText.slice(0, 70)}...` : origText || "None",
        to: newText.length > 70 ? `${newText.slice(0, 70)}...` : newText || "None",
      });
    }

    if (tosContent.trim() !== (proposal.tosContent || "").trim()) {
      list.push({
        id: "tos",
        field: "tosContent",
        label: "Terms of Service",
        from: "Previous agreement clauses",
        to: "Updated agreement clauses",
      });
    }

    const origMilestones = proposal.milestones || [];
    const milestonesChanged =
      origMilestones.length !== milestones.length ||
      milestones.some((m, i) => {
        const orig = origMilestones[i];
        if (!orig) return true;
        return (
          m.name.trim() !== orig.name.trim() ||
          m.description.trim() !== orig.description.trim() ||
          Number(m.hours) !== Number(orig.hours) ||
          Number(m.revisions) !== Number(orig.revisions) ||
          (m.percentage && orig.percentage && Number(m.percentage) !== Number(orig.percentage))
        );
      });

    if (milestonesChanged) {
      list.push({
        id: "milestones",
        field: "milestones",
        label: "Milestones Roadmap",
        from: `${origMilestones.length} Phase${origMilestones.length === 1 ? "" : "s"}${
          origMilestones.length > 0 ? ` (${origMilestones.map((m) => m.name).join(", ")})` : ""
        }`,
        to: `${milestones.length} Phase${milestones.length === 1 ? "" : "s"} (${milestones.map((m) => m.name).join(", ")})`,
      });
    }

    return list;
  }, [proposal, bidAmount, additionalWorkRate, coverLetter, tosContent, milestones]);

  const hasChanges = changes.length > 0;

  const handleReturn = () => {
    const returnTo = (location.state as any)?.returnTo;
    if (returnTo) {
      navigate(returnTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(proposal ? `/jobs/proposals/sent/${proposal.id}` : "/jobs/proposals/sent");
    }
  };

  const handleReturnTrigger = () => {
    if (!hasChanges) {
      handleReturn();
      return;
    }
    setIsDiscardOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const updatedPayload: ProposalItemData = {
        ...proposal!,
        bidAmount: parseInt(bidAmount),
        additionalWorkRate,
        coverLetter,
        tosContent,
        milestones,
        updatedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        updatedAgo: "Just now",
      };

      setProposal(updatedPayload);
      setIsConfirmSaveOpen(false);
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Failed to save proposal updates:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
              Loading Proposal Draft
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Preparing your proposal terms and milestones for editing...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Proposal application not found.</p>
          <button
            onClick={() => navigate("/jobs/proposals/sent")}
            className="px-4 py-2 rounded-xl bg-blue-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-blue-600 transition"
          >
            Return to My Proposals
          </button>
        </div>
      </div>
    );
  }

  if (proposal.status && proposal.status !== "Pending") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Proposal Cannot Be Edited</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              This proposal is currently marked as <strong>{proposal.status}</strong>. Proposals can only be modified while in <strong>Pending</strong> review status. Once shortlisted or accepted by the client, proposal terms are locked.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-sm cursor-pointer"
            >
              View Proposal Details
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

      {/* Background Animated Grid */}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editing Proposal Application</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Updating proposal for:{" "}
            <strong className="text-gray-900 dark:text-white font-semibold">{job?.title || proposal.jobTitle}</strong>
          </p>
        </div>

        {/* Editing Policy Notice */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Editing Policy:</strong> Proposals can only be modified while in <strong>Pending</strong> review status. Once your proposal is <strong>Shortlisted</strong> or <strong>Accepted</strong> by the client, it cannot be changed.
          </span>
        </div>

        {/* Wizard Header Progress */}
        <ProposalEditHeader 
          currentSlide={currentSlide} 
          onReturn={handleReturnTrigger} 
          hasReachedReview={hasReachedReview} 
          onJumpToReview={() => setCurrentSlide(4)}
          maxReachedStep={maxReachedStep}
          onStepClick={(stepId) => {
            if (stepId <= Math.max(currentSlide, maxReachedStep, hasReachedReview ? 4 : 1)) {
              setCurrentSlide(stepId);
            }
          }}
        />

        {/* Wizard Slide Container */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <ProposalPitchStep
                  job={job}
                  actingTeamId={actingTeamId}
                  bidAmount={bidAmount}
                  setBidAmount={setBidAmount}
                  additionalWorkRate={additionalWorkRate}
                  setAdditionalWorkRate={setAdditionalWorkRate}
                  coverLetter={coverLetter}
                  setCoverLetter={setCoverLetter}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={handlePitchAdvance}
                  onBack={handleReturnTrigger}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
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
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <ProposalMilestonesStep
                  job={job}
                  actingTeamId={actingTeamId}
                  bidAmount={bidAmount}
                  additionalWorkRate={additionalWorkRate}
                  milestones={milestones}
                  setMilestones={setMilestones}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={() => setCurrentSlide(2)}
                  onAdvance={handleMilestonesAdvance}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <ProposalReviewStep
                  job={job}
                  actingTeamId={actingTeamId}
                  bidAmount={bidAmount}
                  additionalWorkRate={additionalWorkRate}
                  coverLetter={coverLetter}
                  tosContent={tosContent}
                  milestones={milestones}
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(3)}
                  onSubmit={() => setIsConfirmSaveOpen(true)}
                  isEditMode={true}
                  hasChanges={hasChanges}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Changes Confirmation Modal */}
      <AnimatePresence>
        {isConfirmSaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSaving) setIsConfirmSaveOpen(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-dark-surface p-6 sm:p-7 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Confirm Proposal Updates
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      Review your modified terms before saving
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmSaveOpen(false)}
                  disabled={isSaving}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Changes List */}
              <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1 py-1">
                {changes.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {ch.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                        Modified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-1">
                          Previous
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 line-through text-[11px] block break-words">
                          {ch.from}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                        <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">
                          Updated
                        </span>
                        <span className="text-blue-700 dark:text-blue-300 font-semibold text-[11px] block break-words">
                          {ch.to}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Editing Policy Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs text-left">
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Proposals can only be modified while in <strong>Pending</strong> status. Once shortlisted or accepted by the client, proposal terms are locked.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSaveOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSaving ? "Saving..." : "Confirm & Save"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <ProposalCreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={handleReturn}
      />

      {/* Confirmation Modal for Discarding */}
      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        title="Discard Proposal Edits?"
        subtitle="You have unsaved changes"
        description="All modified terms and pitch edits will be lost. Your proposal will keep its original submitted terms."
        confirmText="Discard & Return"
        cancelText="Continue Editing"
        onConfirm={() => {
          setIsDiscardOpen(false);
          handleReturn();
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  );
};

export default ProposalsEditPage;