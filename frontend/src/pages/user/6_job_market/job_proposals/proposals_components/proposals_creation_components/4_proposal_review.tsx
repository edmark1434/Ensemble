import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios.ts";
import { Check, Layers, FileText, Percent, RefreshCcw, Send, Edit2, Clock, HelpCircle } from "lucide-react";
import { JobRichText } from "../../../job_components/JobRichText";
import type { Job } from "../../../job_components/job_lists";
import type { Milestone } from "./3_proposal_milestones";
import { CreditIcon } from "@/components/ui/credit-icon";

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
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [agreedToFee, setAgreedToFee] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then(res => {
        if (mounted) {
          setWalletBalance(res.data?.wallet?.balance_credits || 0);
        }
      })
      .catch(err => console.error(err));
    return () => { mounted = false; };
  }, []);

  const totalBid = parseInt(bidAmount || "0");
  const count = milestones.length || 1;
  
  const totalHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Review Proposal Application</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Review all proposed terms and milestone schedules before submitting.</p>
      </div>

      {job && (
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-gray-900 dark:text-white text-sm">Target: {job.title}</span>
            <span className="font-mono text-gray-600 dark:text-zinc-400 font-semibold">{job.postedBy}</span>
          </div>
          <div className="flex justify-between items-center text-gray-500 dark:text-zinc-500 text-[10.5px] uppercase tracking-wider font-bold">
             <span>Budget: {job.priceRange} Credits</span>
             <span>Timeline: {job.timeline}</span>
          </div>
        </div>
      )}

      <div className="space-y-3.5 text-xs">
        {/* 01. Cover Pitch & Financials */}
        <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
            <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">01. Cover Pitch & Pricing</span>
            <button type="button" onClick={() => onEditStep(1)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition p-1">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <span className="text-gray-500 dark:text-zinc-500 block text-[10px] mb-1">Proposed Bid</span>
              <span className="text-sm font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                <CreditIcon className="h-4 w-4" /> {totalBid.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 block">
                You earn <strong className="text-gray-600 dark:text-zinc-400">{(Math.floor(totalBid * 0.9)).toLocaleString()}</strong> (-10% platform fee)
              </span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-500 dark:text-zinc-500 block text-[10px]">Additional Work Rate</span>
                <div className="relative group/tooltip flex items-center">
                  <HelpCircle className="h-3 w-3 text-gray-400 dark:text-zinc-500 cursor-help" />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block w-40 p-2 bg-white dark:bg-black text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 text-[9px] rounded-lg shadow-xl z-10 text-center leading-relaxed">
                    The standard 10% platform fee applies to all extra funds charged through the platform.
                  </div>
                </div>
              </div>
              <span className="text-sm font-extrabold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                +{additionalWorkRate}% / Extra Pass
              </span>
              <div className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 space-y-0.5">
                <div>Charge <strong className="text-amber-500 dark:text-amber-400">+{overageRateBonus.toLocaleString()}</strong> / extra pass</div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-600 dark:text-zinc-400 font-bold">Earn {(Math.floor(overageRateBonus * 0.9)).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <span className="text-gray-500 dark:text-zinc-500 block text-[10px] mb-1">Total Estimated Hours</span>
              <span className="text-sm font-extrabold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {totalHours} hrs
              </span>
              <span className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 block">
                Within client timeline max ({job?.timeline || "N/A"})
              </span>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-white/5">
            <JobRichText content={coverLetter} />
          </div>
        </div>

        <hr className="border-gray-200 dark:border-white/10" />

        {/* 02. Terms of Service */}
        <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/[0.01] space-y-2">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
            <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <FileText className="h-3 w-3" /> 02. Terms of Service
            </span>
            <button type="button" onClick={() => onEditStep(2)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition p-1">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="font-mono text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-white/5">
            {tosContent}
          </p>
        </div>

        <hr className="border-gray-200 dark:border-white/10" />

        {/* 03. Milestone Delivery Roadmap */}
        <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
            <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Layers className="h-3 w-3" /> 03. Milestone Roadmap ({milestones.length} Steps)
            </span>
            <button type="button" onClick={() => onEditStep(3)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition p-1">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {milestones.map((m, idx) => {
              const milestonePayout = Math.floor(totalBid * ((Number(m.percentage) || (100 / count)) / 100));
              const overageRateBonus = Math.floor(milestonePayout * (additionalWorkRate / 100));
              return (
              <div key={m.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-gray-900 dark:text-white">
                  <span className="text-gray-700 dark:text-zinc-300">Milestone {idx + 1}: {m.name}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-700 dark:text-zinc-300 font-mono flex items-center gap-1">
                      <CreditIcon className="h-3 w-3 text-amber-500 dark:text-amber-400" /> {milestonePayout.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-gray-600 dark:text-zinc-400">Net: {(Math.floor(milestonePayout * 0.9)).toLocaleString()}</span>
                  </div>
                </div>
                {m.description && <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-all whitespace-pre-wrap">{m.description}</p>}
                <div className="flex gap-4 text-[10px] text-gray-500 dark:text-zinc-500 pt-1">
                  <span>Hours: <strong className="text-gray-600 dark:text-zinc-300">{m.hours} hrs</strong></span>
                  <span className="flex items-center gap-1">
                    <RefreshCcw className="h-2.5 w-2.5 text-gray-400 dark:text-zinc-500" />
                    Included Revisions: <strong className="text-gray-600 dark:text-zinc-300">{m.revisions}</strong>
                  </span>
                  <span>Overage Price: <strong className="text-gray-700 dark:text-zinc-300">{(milestonePayout + overageRateBonus).toLocaleString()}</strong></span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4">
        {walletBalance !== null && walletBalance < 10 ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex justify-between items-center">
            <div>
              <p>You need 10 Credits to submit a proposal.</p>
              <p className="text-[10px] font-normal opacity-80 mt-1">Your current balance is {walletBalance}.</p>
            </div>
            <Link to="/credits" className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Buy Credits</Link>
          </div>
        ) : walletBalance !== null ? (
          <div className="rounded-2xl border-2 border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-5 flex flex-col gap-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Checkout Summary
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed">
                  To maintain a high-quality marketplace and prevent spam, we require a small fee to submit proposals.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3 shadow-sm">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Your Current Balance</span>
                <span className="font-bold text-gray-900 dark:text-white">{walletBalance.toLocaleString()} Credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-400 font-medium">Platform Fee</span>
                <span className="font-bold text-red-500">-10 Credits</span>
              </div>
              <div className="pt-3 border-t border-dashed border-gray-200 dark:border-white/20 flex justify-between text-sm">
                <span className="text-gray-900 dark:text-white font-bold">Balance After</span>
                <span className="font-black text-blue-500">{(walletBalance - 10).toLocaleString()} Credits</span>
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 dark:text-zinc-300 mt-1 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-blue-500/10">
              <input 
                type="checkbox" 
                checked={agreedToFee} 
                onChange={(e) => setAgreedToFee(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-white/20 dark:bg-dark-surface dark:checked:bg-blue-500 transition cursor-pointer"
              />
              <span className="font-semibold select-none text-gray-900 dark:text-white">I agree to pay <strong className="text-blue-500">10 Credits</strong> to submit this proposal.</span>
            </label>
          </div>
        ) : null}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || (walletBalance !== null && walletBalance < 10) || (walletBalance !== null && !agreedToFee)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition focus:outline-none ${
                isSubmitting || (walletBalance !== null && walletBalance < 10) || (walletBalance !== null && !agreedToFee)
                 ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                 : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              }`}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Submit Proposal'} <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalReviewStep;
