import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Loader2,
  Check,
  X,
  FileText,
  CornerDownRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useChatState from '@/components/ui/chat_bubble/chat_state';

export interface SubcontractProposalMember {
  proposal_member_id: string;
  proposal_id: string;
  contract_id: string;
  candidate_account_id: string;
  role_title: string;
  assigned_milestone_id?: string;
  milestone_title?: string;
  milestone_order?: number;
  agreed_credits?: number;
  permissions?: {
    can_view_tasks?: boolean;
    can_update_task_status?: boolean;
    can_upload_drafts?: boolean;
    can_create_subtasks?: boolean;
  };
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  client_notes?: string;
  decided_at?: string;
  candidate_name?: string;
  candidate_handle?: string;
  candidate_avatar_path?: string;
}

export interface SubcontractProposal {
  proposal_id: string;
  team_id: string;
  contract_id: string;
  lead_account_id: string;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'withdrawn';
  terms_accepted: boolean;
  terms_accepted_at: string;
  proposal_notes?: string;
  client_feedback?: string;
  reviewed_by_account_id?: string;
  reviewed_at?: string;
  created_at: string;
  lead_name?: string;
  lead_handle?: string;
  lead_avatar_path?: string;
  reviewer_name?: string;
  reviewer_handle?: string;
  members: SubcontractProposalMember[];
}

interface SubcontractRequestsReviewProps {
  teamId: string;
  proposals: SubcontractProposal[];
  isClient: boolean;
  currentUserAccountId: string;
  onRefreshProposals: () => void;
  onMembersUpdated?: () => void;
}

export const SubcontractRequestsReview: React.FC<SubcontractRequestsReviewProps> = ({
  teamId,
  proposals,
  isClient,
  currentUserAccountId,
  onRefreshProposals,
  onMembersUpdated,
}) => {
  const navigate = useNavigate();
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [showDeclineModal, setShowDeclineModal] = useState<{
    proposalId: string;
    memberId?: string;
    targetName: string;
  } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const pastProposals = proposals.filter((p) => p.status !== 'pending');

  const handleOpenDirectChat = async (targetAccountId: string, name: string, avatarUrl?: string) => {
    try {
      await useChatState.getState().openDirectChat({
        account_id: targetAccountId,
        name,
        avatarUrl,
      });
      showSuccessToast(`Opened chat with ${name}`);
    } catch {
      navigate('/inbox/direct', {
        state: { other_account_id: targetAccountId },
      });
    }
  };

  const handleDecideProposal = async (
    proposalId: string,
    decision: 'approved' | 'rejected',
    clientFeedback?: string,
    memberDecisions?: Array<{ proposal_member_id: string; status: 'approved' | 'rejected'; client_notes?: string }>
  ) => {
    setDecidingId(proposalId);
    try {
      await api.post(`/api/team-projects/${teamId}/subcontracts/proposals/${proposalId}/decision`, {
        decision,
        client_feedback: clientFeedback || undefined,
        member_decisions: memberDecisions,
      });

      showSuccessToast(
        decision === 'approved'
          ? 'Subcontract proposal approved. Specialists admitted to project workspace.'
          : 'Subcontract request declined.'
      );
      setShowDeclineModal(null);
      setDeclineReason('');
      onRefreshProposals();
      onMembersUpdated?.();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to submit decision');
    } finally {
      setDecidingId(null);
    }
  };

  const handleWithdraw = async (proposalId: string) => {
    setDecidingId(proposalId);
    try {
      await api.delete(`/api/team-projects/${teamId}/subcontracts/proposals/${proposalId}`);
      showSuccessToast('Subcontract proposal withdrawn');
      onRefreshProposals();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to withdraw proposal');
    } finally {
      setDecidingId(null);
    }
  };

  if (proposals.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Pending Proposals Section */}
      {pendingProposals.length > 0 && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Pending Subcontract Proposals</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                    {pendingProposals.length} awaiting review
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isClient
                    ? 'Review and decide on specialists proposed by the lead contractor under their milestone scope.'
                    : 'Your submitted proposals awaiting client review. Candidates cannot access the workspace until approved.'}
                </p>
              </div>
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {pendingProposals.map((proposal) => {
              const isLeadProposer =
                String(currentUserAccountId).trim() === String(proposal.lead_account_id).trim();

              return (
                <div
                  key={proposal.proposal_id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-xs"
                >
                  {/* Proposer Info & Pitch */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <img
                        src={constructAvatarUrl(proposal.lead_avatar_path, proposal.lead_name)}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                            proposal.lead_name
                          );
                        }}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {proposal.lead_name || 'Freelancer'}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            @{proposal.lead_handle || 'lead'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                            Lead Contractor
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          Submitted on {new Date(proposal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Bilateral Discussion action */}
                      {isClient && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDirectChat(
                              proposal.lead_account_id,
                              proposal.lead_name || 'Lead Freelancer',
                              proposal.lead_avatar_path
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                          title="Discuss proposal with freelancer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                          <span>Discuss with Freelancer</span>
                        </button>
                      )}

                      {/* Freelancer Withdraw option */}
                      {isLeadProposer && (
                        <button
                          type="button"
                          disabled={decidingId === proposal.proposal_id}
                          onClick={() => handleWithdraw(proposal.proposal_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition cursor-pointer"
                        >
                          {decidingId === proposal.proposal_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>Withdraw Request</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proposal Pitch / Notes */}
                  {proposal.proposal_notes && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-bold block mb-1 text-[11px] uppercase tracking-wider text-zinc-400">
                        Lead's Proposal Context:
                      </span>
                      <p className="italic">"{proposal.proposal_notes}"</p>
                    </div>
                  )}

                  {/* Candidates Roster */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Proposed Team Specialists ({proposal.members.length}):
                    </span>

                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      {proposal.members.map((member) => (
                        <div
                          key={member.proposal_member_id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={constructAvatarUrl(
                                member.candidate_avatar_path,
                                member.candidate_name
                              )}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                                  member.candidate_name
                                );
                              }}
                              className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                  {member.candidate_name}
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  @{member.candidate_handle}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `/profile/${member.candidate_account_id}`,
                                      '_blank'
                                    )
                                  }
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                >
                                  <span>Portfolio</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {member.role_title}
                                </span>
                                <span>•</span>
                                <span>
                                  Scope:{' '}
                                  <strong className="text-zinc-800 dark:text-zinc-200">
                                    {member.milestone_title || 'Full Contract Scope'}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Client Individual Actions */}
                          {isClient && member.status === 'pending' && (
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                disabled={decidingId === proposal.proposal_id}
                                onClick={() =>
                                  handleDecideProposal(proposal.proposal_id, 'approved', undefined, [
                                    { proposal_member_id: member.proposal_member_id, status: 'approved' },
                                  ])
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Member</span>
                              </button>

                              <button
                                type="button"
                                disabled={decidingId === proposal.proposal_id}
                                onClick={() =>
                                  setShowDeclineModal({
                                    proposalId: proposal.proposal_id,
                                    memberId: member.proposal_member_id,
                                    targetName: member.candidate_name || 'Specialist',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Batch Action Footer for Client */}
                  {isClient && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Terms accepted: Lead retains 100% accountability & NDA compliance.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={decidingId === proposal.proposal_id}
                          onClick={() =>
                            setShowDeclineModal({
                              proposalId: proposal.proposal_id,
                              targetName: 'Entire Proposal',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          Decline All
                        </button>

                        <button
                          type="button"
                          disabled={decidingId === proposal.proposal_id}
                          onClick={() => handleDecideProposal(proposal.proposal_id, 'approved')}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          {decidingId === proposal.proposal_id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          <span>Approve All Specialists ({proposal.members.length})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Proposals Collapsible */}
      {pastProposals.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          >
            <span>Subcontract Proposals History ({pastProposals.length})</span>
            {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isHistoryOpen && (
            <div className="space-y-3 pt-1">
              {pastProposals.map((proposal) => {
                const isApproved =
                  proposal.status === 'approved' || proposal.status === 'partially_approved';

                return (
                  <div
                    key={proposal.proposal_id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          Proposal by @{proposal.lead_handle}
                        </span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500">
                          {proposal.members.length} specialist(s)
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : proposal.status === 'withdrawn'
                            ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {proposal.status.replace('_', ' ')}
                      </span>
                    </div>

                    {proposal.client_feedback && (
                      <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <strong>Client Feedback:</strong> {proposal.client_feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Decline Feedback Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Decline Subcontract ({showDeclineModal.targetName})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowDeclineModal(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Provide an optional note to the lead freelancer explaining why this specialist or proposal is declined (e.g., preference for internal review, milestone timeline alignment).
            </p>

            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowDeclineModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={decidingId !== null}
                onClick={() => {
                  if (showDeclineModal.memberId) {
                    handleDecideProposal(
                      showDeclineModal.proposalId,
                      'rejected',
                      undefined,
                      [
                        {
                          proposal_member_id: showDeclineModal.memberId,
                          status: 'rejected',
                          client_notes: declineReason.trim() || undefined,
                        },
                      ]
                    );
                  } else {
                    handleDecideProposal(
                      showDeclineModal.proposalId,
                      'rejected',
                      declineReason.trim() || undefined
                    );
                  }
                }}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                <span>Confirm Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
