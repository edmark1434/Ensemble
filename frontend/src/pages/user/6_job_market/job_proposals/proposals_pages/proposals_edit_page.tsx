import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";

// Reused Creation Step Components & Header
import ProposalEditHeader from "../proposals_components/proposals_edit_components/proposal_edit_header";
import ProposalPitchStep from "../proposals_components/proposals_creation_components/1_proposal_pitch";
import ProposalTermsStep, {
  sampleTosTemplates,
} from "../proposals_components/proposals_creation_components/2_proposal_terms";
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

export const ProposalsEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { proposalId } = useParams<{ proposalId: string }>();

  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [job, setJob] = useState<Job | null>(null);
  const [proposal, setProposal] = useState<ProposalItemData | null>(null);

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  // Step 1: Pitch & Pricing States
  const [bidAmount, setBidAmount] = useState("");
  const [additionalWorkRate, setAdditionalWorkRate] = useState<number>(20);
  const [coverLetter, setCoverLetter] = useState("");

  // Step 2: TOS States
  const [selectedTosId, setSelectedTosId] = useState("default");
  const [tosContent, setTosContent] = useState(sampleTosTemplates[0].content);

  // Step 3: Milestones State
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch Existing Proposal & Associated Job Data
  useEffect(() => {
    if (proposalId) {
      const foundProposal = sampleSentProposals.find((p) => p.id === proposalId);
      if (foundProposal) {
        setProposal(foundProposal);
        setBidAmount(foundProposal.bidAmount.toString());
        setAdditionalWorkRate(foundProposal.additionalWorkRate);
        setCoverLetter(foundProposal.coverLetter);
        setTosContent(foundProposal.tosContent);
        setMilestones(foundProposal.milestones || []);

        const foundJob = sampleJobs.find((j) => j.id === foundProposal.jobId);
        if (foundJob) {
          setJob(foundJob);
        }
      }
    }
  }, [proposalId]);

  const handleReturnTrigger = () => {
    setIsDiscardOpen(true);
  };

  const handlePitchAdvance = () => {
    const stepErrors: { [key: string]: string } = {};
    const rawBid = parseInt(bidAmount) || 0;

    if (!bidAmount || rawBid <= 0) {
      stepErrors.bidAmount = "A valid bid amount is required.";
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

  const handleSaveUpdate = () => {
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

    console.log("Updated Proposal Saved:", updatedPayload);
    setIsSuccessOpen(true);
  };

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-white flex items-center justify-center p-6">
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

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-[#080a12] text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12">
      {/* Background Animated Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(59, 130, 246, 0.15)"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editing Proposal Application</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Updating proposal for Job ID <span className="font-mono text-blue-400">{proposal.jobId}</span>:{" "}
            <strong className="text-gray-900 dark:text-white">{proposal.jobTitle}</strong>
          </p>
        </div>

        {/* Wizard Header Progress */}
        <ProposalEditHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />

        {/* Wizard Slide Container */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
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
                  bidAmount={bidAmount}
                  additionalWorkRate={additionalWorkRate}
                  coverLetter={coverLetter}
                  tosContent={tosContent}
                  milestones={milestones}
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(3)}
                  onSubmit={handleSaveUpdate}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Success Modal */}
      <ProposalCreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => navigate("/jobs/proposals/sent")}
      />

      {/* Confirmation Modal for Discarding */}
      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate("/jobs/proposals/sent");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  );
};

export default ProposalsEditPage;