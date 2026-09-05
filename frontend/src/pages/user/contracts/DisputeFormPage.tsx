import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, ChevronDown, ArrowLeft } from "lucide-react";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { CreditIcon } from "@/components/ui/credit-icon";

// Same interface as in contracts.tsx
interface DetailedContract {
  id: string;
  title: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  clientName: string;
  freelancerName: string;
  clientAvatar?: string;
  freelancerAvatar?: string;
  totalValueCredits: number;
}

export const DisputeFormPage: React.FC = () => {
  const { user, theme } = useGlobalState();
  const navigate = useNavigate();
  const [activeContracts, setActiveContracts] = useState<DetailedContract[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedContractId, setSelectedContractId] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get('/api/contracts');
        if (res.data.success) {
          const mappedContracts = res.data.data.map((c: any) => {
            const mappedMilestones = (c.milestones || []).filter(Boolean).map((m: any, idx: number, arr: any[]) => ({
              id: m.id,
              name: m.name,
              revisions: parseInt(m.revisions, 10) || 0,
              deadline: m.hours ? `${m.hours} Hours` : m.deadline ? new Date(m.deadline).toLocaleDateString() : 'N/A',
              credits: m.credits || Math.floor((parseFloat(c.rate_credits) || 0) / (arr.length || 1)),
              status: m.status === 'completed' || m.status === 'approved' ? "Claimed" : m.status === 'active' || m.status === 'submitted_for_review' ? "In Progress" : "Locked"
            }));

            const isCompleted = mappedMilestones.length > 0 && mappedMilestones.every((m: any) => m.status === 'Claimed');
            const derivedStatus = isCompleted ? 'Closed' : (c.status === 'Done' ? 'Closed' : c.status);

            return {
              id: c.contract_id,
              title: c.job_title || c.contract_type,
              clientAccountId: c.client_account_id,
              freelancerAccountId: c.freelancer_account_id,
              clientName: c.client_name || c.client_handle,
              freelancerName: c.freelancer_name || c.freelancer_handle,
              clientAvatar: c.client_avatar 
                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${c.client_avatar.startsWith('/') ? '' : '/'}${c.client_avatar}` 
                : undefined,
              freelancerAvatar: c.freelancer_avatar
                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${c.freelancer_avatar.startsWith('/') ? '' : '/'}${c.freelancer_avatar}` 
                : undefined,
              status: derivedStatus,
              totalValueCredits: parseFloat(c.rate_credits) || 0,
            };
          });
          
          const validStatuses = ["Active", "Waiting"];
          const filteredContracts = mappedContracts.filter((c: any) => validStatuses.includes(c.status));
          setActiveContracts(filteredContracts);
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const selectedContract = activeContracts.find(c => c.id === selectedContractId);
  
  let opponentName = "Unknown";
  let opponentAvatar = "";
  let myName = "Me";
  let myAvatar = "";
  
  if (selectedContract) {
    if (user?.account_id === selectedContract.clientAccountId) {
      opponentName = selectedContract.freelancerName || "Freelancer";
      opponentAvatar = selectedContract.freelancerAvatar || "";
      myName = selectedContract.clientName || "Me";
      myAvatar = selectedContract.clientAvatar || "";
    } else {
      opponentName = selectedContract.clientName || "Client";
      opponentAvatar = selectedContract.clientAvatar || "";
      myName = selectedContract.freelancerName || "Me";
      myAvatar = selectedContract.freelancerAvatar || "";
    }
  }

  const handleSubmit = () => {
    if (!selectedContractId || !reason || !details) return;
    setIsSubmitting(true);
    
    // Simulate dummy submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Dispute submitted to Moderators for review.");
      navigate("/contracts");
    }, 1500);
  };

  return (
    <div className="relative min-h-screen w-full bg-gray-50 dark:bg-dark-base py-12 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      {/* Background Grid Animation */}
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

      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/contracts")}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-white/10"
        >
          <div className="border-b border-gray-100 dark:border-white/5 px-6 py-5 bg-red-50/50 dark:bg-red-500/5">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report a Dispute</h2>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              Submit a formal dispute. Our moderation team will review the contract and details provided.
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Select Contract</label>
                  <div className="relative">
                    <select
                      value={selectedContractId}
                      onChange={(e) => setSelectedContractId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                    >
                      <option className="bg-white dark:bg-[#1E1E24]" value="" disabled>Choose an active contract...</option>
                      {activeContracts.map(c => (
                        <option className="bg-white dark:bg-[#1E1E24]" key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {selectedContract && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-gray-50 dark:bg-white/5 p-5 border border-gray-200 dark:border-white/10 space-y-4"
                    >
                      <div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-semibold uppercase tracking-wider">Dispute Title</div>
                        <div className="font-bold text-red-600 dark:text-red-400 text-base">Dispute of {myName} vs {opponentName}</div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          {/* Current User */}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5 font-semibold uppercase tracking-wider">Reporting Party (You)</div>
                            <div className="flex items-center gap-2.5">
                              <img src={myAvatar || "https://i.pravatar.cc/150?u=" + myName} alt={myName} className="h-6 w-6 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold text-gray-900 dark:text-white text-sm">{myName}</div>
                                <img src="/icons/verification/lvl2_verified.png" alt="Verified" className="h-3.5 w-3.5 object-contain" title="Verified Level 2" />
                                <img src="/icons/subscription/premium.png" alt="Premium" className="h-3.5 w-3.5 object-contain" title="Premium Subscription" />
                              </div>
                            </div>
                          </div>

                          <div className="hidden sm:block text-gray-300 dark:text-zinc-600 font-black italic text-sm opacity-50">VS</div>

                          {/* Opponent */}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5 font-semibold uppercase tracking-wider">Disputing With</div>
                            <div className="flex items-center gap-2.5">
                              <img src={opponentAvatar || "https://i.pravatar.cc/150?u=" + opponentName} alt={opponentName} className="h-6 w-6 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold text-gray-900 dark:text-white text-sm">{opponentName}</div>
                                <img src="/icons/verification/lvl1_verified.png" alt="Verified" className="h-3.5 w-3.5 object-contain" title="Verified Level 1" />
                                <img src="/icons/subscription/freemium.png" alt="Freemium" className="h-3.5 w-3.5 object-contain" title="Basic Subscription" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-semibold uppercase tracking-wider">Amount Involved</div>
                          <div className="font-bold text-yellow-500 text-sm flex items-center md:justify-end gap-1.5">
                            <CreditIcon className="h-4 w-4 text-yellow-500" />
                            <span>{selectedContract.totalValueCredits?.toLocaleString() || 0} Credits</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Reason for Dispute</label>
                  <div className="relative">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                    >
                      <option className="bg-white dark:bg-[#1E1E24]" value="" disabled>Select a reason...</option>
                      <option className="bg-white dark:bg-[#1E1E24]" value="Non-delivery of work">Non-delivery of work</option>
                      <option className="bg-white dark:bg-[#1E1E24]" value="Unresponsive">Unresponsive / Poor Communication</option>
                      <option className="bg-white dark:bg-[#1E1E24]" value="Quality below expectations">Quality below expectations</option>
                      <option className="bg-white dark:bg-[#1E1E24]" value="Scope creep / Demanding extra work">Scope creep / Demanding extra work</option>
                      <option className="bg-white dark:bg-[#1E1E24]" value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Details</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Please explain the situation in detail..."
                    className="w-full min-h-[120px] resize-none rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-white/10 px-6 py-5 flex justify-end gap-3 bg-transparent">
            <button
              onClick={() => navigate("/contracts")}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedContractId || !reason || !details || isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-8 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Dispute"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
