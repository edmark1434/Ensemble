import React from "react";
import { Check, CircleDollarSign, Layers, FileText, Percent, RefreshCcw, Send } from "lucide-react";
import type { Job } from "../../../job_components/job_lists";
import type { Milestone } from "./3_proposal_milestones";

interface ProposalReviewProps {
  job: Job | null;
  bidAmount: string;
  additionalWorkRate: number;
  coverLetter: string;
  tosContent: string;
  milestones: Milestone[];
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ProposalReviewStep: React.FC<ProposalReviewProps> = ({
  job,
  bidAmount,
  additionalWorkRate,
  coverLetter,
  tosContent,
  milestones,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting
}) => {
  const totalBid = parseInt(bidAmount || "0");
  const count = milestones.length || 1;
  const milestonePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(milestonePayout * (additionalWorkRate / 100));

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-white mb-0.5">Review Proposal Application</h2>
        <p className="text-xs text-zinc-400">Review all proposed terms and milestone schedules before submitting.</p>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* 01. Cover Pitch & Financials */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Cover Pitch & Pricing</span>
            <button type="button" onClick={() => onEditStep(1)} className="text-[10px] text-blue-500 hover:underline font-bold">Edit</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-zinc-500 block text-[10px]">Proposed Bid</span>
              <span className="text-sm font-extrabold text-yellow-500 flex items-center gap-1">
                <CircleDollarSign className="h-4 w-4" /> ₱{totalBid.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-zinc-500 block text-[10px]">Additional Work Rate</span>
              <span className="text-sm font-extrabold text-blue-400 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" /> +{additionalWorkRate}% / Revision Pass
              </span>
            </div>
          </div>

          <p className="text-zinc-300 leading-relaxed italic bg-white/[0.02] p-3 rounded-xl border border-white/5 text-[11px]">
            "{coverLetter}"
          </p>
        </div>

        {/* 02. Terms of Service */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <FileText className="h-3 w-3" /> 02. Terms of Service
            </span>
            <button type="button" onClick={() => onEditStep(2)} className="text-[10px] text-blue-500 hover:underline font-bold">Edit</button>
          </div>
          <p className="font-mono text-[11px] text-zinc-400 leading-relaxed whitespace-pre-line bg-white/[0.02] p-3 rounded-xl border border-white/5">
            {tosContent}
          </p>
        </div>

        {/* 03. Milestone Delivery Roadmap */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Layers className="h-3 w-3" /> 03. Milestone Roadmap ({milestones.length} Steps)
            </span>
            <button type="button" onClick={() => onEditStep(3)} className="text-[10px] text-blue-500 hover:underline font-bold">Edit</button>
          </div>

          <div className="space-y-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Step {idx + 1}: {m.name}</span>
                  <span className="text-emerald-400 font-mono">₱{milestonePayout.toLocaleString()}</span>
                </div>
                {m.description && <p className="text-[11px] text-zinc-400">{m.description}</p>}
                <div className="flex gap-4 text-[10px] text-zinc-500 pt-1">
                  <span>Hours: <strong className="text-zinc-300">{m.hours} hrs</strong></span>
                  <span className="flex items-center gap-1">
                    <RefreshCcw className="h-2.5 w-2.5 text-emerald-400" />
                    Included Revisions: <strong className="text-zinc-300">{m.revisions}</strong>
                  </span>
                  <span>Overage Price: <strong className="text-blue-400">₱{(milestonePayout + overageRateBonus).toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition focus:outline-none shadow-lg ${isSubmitting ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
        >
          {isSubmitting ? 'Submitting...' : 'Confirm & Submit Proposal'} <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ProposalReviewStep;