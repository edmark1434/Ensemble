import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  UserPlus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

export interface CandidateDraft {
  candidate_account_id: string;
  display_name: string;
  handle: string;
  avatar_path?: string;
  role_title: string;
  assigned_milestone_id: string;
  agreed_credits?: number;
  permissions: {
    can_view_tasks: boolean;
    can_update_task_status: boolean;
    can_upload_drafts: boolean;
    can_create_subtasks: boolean;
  };
}

interface SubcontractProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  contractId: string;
  contractTitle?: string;
  milestones?: Array<{
    job_milestone_id?: string;
    id?: string;
    milestone_title?: string;
    name?: string;
    order_index?: number;
    index?: number;
  }>;
  existingMemberAccountIds?: string[];
  onProposalCreated?: () => void;
}

const COMMON_ROLES = [
  'Video Editor',
  'Colorist',
  'Sound Designer',
  'Motion Graphics / VFX',
  'Assistant Editor',
  'Thumbnail Designer',
];

export const SubcontractProposalModal: React.FC<SubcontractProposalModalProps> = ({
  isOpen,
  onClose,
  teamId,
  contractId,
  contractTitle,
  milestones = [],
  existingMemberAccountIds = [],
  onProposalCreated,
}) => {
  const [candidates, setCandidates] = useState<CandidateDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [proposalNotes, setProposalNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCandidates([]);
      setSearchQuery('');
      setSearchResults([]);
      setProposalNotes('');
      setTermsAccepted(false);
    }
  }, [isOpen]);

  // Debounced search for platform editors
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get('/api/accounts/search-users', {
          params: { handle: searchQuery.trim() },
        });

        const selectedIds = new Set(candidates.map((c) => c.candidate_account_id));
        const excludedIds = new Set([...existingMemberAccountIds, ...selectedIds]);

        const filtered = (data.data || []).filter(
          (u: any) => !excludedIds.has(u.account_id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchQuery, isOpen, candidates, existingMemberAccountIds]);

  const handleAddCandidate = (user: any) => {
    const defaultMilestoneId =
      milestones[0]?.job_milestone_id || milestones[0]?.id || '';

    const newCandidate: CandidateDraft = {
      candidate_account_id: user.account_id,
      display_name: user.display_name || user.name || 'Specialist',
      handle: user.handle || 'user',
      avatar_path: user.avatar_path || user.avatar_url,
      role_title: 'Video Editor',
      assigned_milestone_id: defaultMilestoneId,
      agreed_credits: undefined,
      permissions: {
        can_view_tasks: true,
        can_update_task_status: true,
        can_upload_drafts: true,
        can_create_subtasks: false,
      },
    };

    setCandidates((prev) => [...prev, newCandidate]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCandidate = (
    index: number,
    field: keyof CandidateDraft | 'permissions',
    value: any
  ) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleUpdatePermission = (
    index: number,
    permKey: keyof CandidateDraft['permissions'],
    value: boolean
  ) => {
    setCandidates((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        return {
          ...c,
          permissions: {
            ...c.permissions,
            [permKey]: value,
          },
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (candidates.length === 0) {
      showErrorToast('Please nominate at least one specialist.');
      return;
    }
    if (!termsAccepted) {
      showErrorToast('Please review and accept the Subcontracting Terms.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/team-projects/${teamId}/subcontracts/proposals`, {
        contract_id: contractId,
        terms_accepted: termsAccepted,
        proposal_notes: proposalNotes.trim() || undefined,
        members: candidates.map((c) => ({
          candidate_account_id: c.candidate_account_id,
          role_title: c.role_title.trim(),
          assigned_milestone_id: c.assigned_milestone_id || null,
          agreed_credits: c.agreed_credits || null,
          permissions: c.permissions,
        })),
      });

      showSuccessToast(
        `Subcontract proposal submitted for ${candidates.length} specialist(s). Awaiting client approval.`
      );
      onProposalCreated?.();
      onClose();
    } catch (err: any) {
      showErrorToast(
        err?.response?.data?.message || 'Failed to submit subcontract proposal'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Nominate Team Subcontractors</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  Batch Invitation
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Add specialists to assist on your contract milestones. The client must review and approve them before they gain workspace access.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Scope Badge */}
        {contractTitle && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs">
            <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-zinc-500 dark:text-zinc-400">Contract Scope:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {contractTitle}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member Search & Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>Search Platform Specialists</span>
              <span className="text-[11px] font-normal text-zinc-500">
                {candidates.length} specialist(s) selected
              </span>
            </label>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username (@handle) or name..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin absolute right-3 top-3" />
              )}
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl divide-y divide-zinc-100 dark:divide-zinc-800">
                {searchResults.map((user) => (
                  <button
                    key={user.account_id}
                    type="button"
                    onClick={() => handleAddCandidate(user)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={constructAvatarUrl(
                          user.avatar_path || user.avatar_url,
                          user.display_name || user.name
                        )}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                            user.display_name || user.name
                          );
                        }}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white">
                          {user.display_name || user.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          @{user.handle || 'user'}
                        </div>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Candidates List */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Configuring Candidates ({candidates.length})
              </h3>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {candidates.map((cand, idx) => (
                  <div
                    key={cand.candidate_account_id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/30 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={constructAvatarUrl(cand.avatar_path, cand.display_name)}
                          alt=""
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                              cand.display_name
                            );
                          }}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">
                            {cand.display_name}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            @{cand.handle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(idx)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Remove candidate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Role selection */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                          Specialist Role
                        </label>
                        <input
                          type="text"
                          value={cand.role_title}
                          onChange={(e) =>
                            handleUpdateCandidate(idx, 'role_title', e.target.value)
                          }
                          placeholder="e.g. Colorist, Sound Designer"
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Milestone mapping */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                          Assigned Milestone Scope
                        </label>
                        <select
                          value={cand.assigned_milestone_id}
                          onChange={(e) =>
                            handleUpdateCandidate(
                              idx,
                              'assigned_milestone_id',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Full Contract Scope (All Milestones)</option>
                          {milestones.map((m, mIdx) => {
                            const mId = m.job_milestone_id || m.id || String(mIdx);
                            const mName =
                              m.milestone_title || m.name || `Milestone ${mIdx + 1}`;
                            return (
                              <option key={mId} value={mId}>
                                {mName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Permissions Toggles */}
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Scoped Task Permissions:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cand.permissions.can_update_task_status}
                            onChange={(e) =>
                              handleUpdatePermission(
                                idx,
                                'can_update_task_status',
                                e.target.checked
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Update task progress & checklists</span>
                        </label>

                        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cand.permissions.can_upload_drafts}
                            onChange={(e) =>
                              handleUpdatePermission(
                                idx,
                                'can_upload_drafts',
                                e.target.checked
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Upload task deliverables & drafts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposal Justification Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>Proposal Justification & Note to Client</span>
              <span className="text-[11px] text-zinc-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={2}
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
              placeholder="Explain to the client why you are bringing in these team members (e.g. 'Bringing in Jordan for specialized audio mixing to meet Friday's cutoff')..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Real Business Standard Terms & Conditions Box */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Subcontracting Agreement & Lead Liability Terms</span>
            </div>

            <ul className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Lead Contractor Accountability:</strong> You remain 100% accountable to the client for the quality, deadlines, and deliverables produced by all nominated specialists.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Client Confidentiality & NDA:</strong> All nominated team members will be bound by client confidentiality and non-disclosure obligations.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">No Escrow Impact:</strong> Subcontracting does not alter the client's escrow budget. All subcontractor payouts are allocated from your agreed contract earnings upon milestone releases.
              </li>
            </ul>

            <label className="flex items-center gap-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>I acknowledge and accept the subcontracting terms and lead accountability</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || candidates.length === 0 || !termsAccepted}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Proposal for Client Approval ({candidates.length})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
