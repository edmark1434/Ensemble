import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";

// Sub-components & Wizard Steps
import ProposalCreateHeader from "../proposals_components/proposals_creation_components/proposal_create_header";
import ProposalPitchStep from "../proposals_components/proposals_creation_components/1_proposal_pitch";
import ProposalTermsStep, { sampleTosTemplates } from "../proposals_components/proposals_creation_components/2_proposal_terms";
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
  
  const { createProposal, fetchJobs } = useJobs();

  // Step 1: Pitch & Pricing States
  const [bidAmount, setBidAmount] = useState("");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(20);
  const [coverLetter, setCoverLetter] = useState("");

  // Step 2: TOS States
  const [selectedTosId, setSelectedTosId] = useState("default");
  const [tosContent, setTosContent] = useState(sampleTosTemplates[0].content);

  // Step 3: Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "ms-1",
      name: "Phase 1: Initial Draft & Rough Pass",
      description: "Deliver rough cut / core framework for initial feedback.",
      hours: 12,
      revisions: 2,
    },
    {
      id: "ms-2",
      name: "Phase 2: Final Polish & Export",
      description: "Apply color passes, audio sync, and final master deliverables.",
      hours: 8,
      revisions: 1,
    },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadJob = async () => {
      try {
        const fetchedJobs = await fetchJobs();
        const found = fetchedJobs.find((j: any) => j.job_id === id);
        if (found) {
          setJob({
            id: found.job_id,
            title: found.title,
            description: found.description,
            status: found.status,
            category: found.category,
            difficulty: found.experience_level,
            priceRange: `${found.rate_credits_min?.toLocaleString() || 0} ~ ${found.rate_credits_max?.toLocaleString() || 0}`,
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
            thumbnail: found.thumbnail_path ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${found.thumbnail_path}` : "/placeholder.svg",
            skills: found.tags || [],
            isSaved: found.is_saved || false,
            isOwnPost: false // Ignore for proposal creation
          });
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
    setErrors({});
    setCurrentSlide(4);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!id) throw new Error("Job ID is missing.");
      
      const payload = {
        job_id: id,
        rate_credits: parseInt(bidAmount),
        revision_price_credits: additionalWorkRate,
        letter: coverLetter,
        tos_title: sampleTosTemplates.find(t => t.id === selectedTosId)?.name || "Custom Terms",
        tos_content: tosContent,
        terms_id: null,  
        milestones: milestones.map(m => ({
          title: m.name,
          description: m.description,
          est_hrs: m.hours,
          max_rev: m.revisions
        })),
      };

      await createProposal(id, payload);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  errors={errors}
                  setErrors={setErrors}
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
          setIsDiscardOpen(false);
          navigate("/jobs");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  );
};

export default ProposalsCreatePage;