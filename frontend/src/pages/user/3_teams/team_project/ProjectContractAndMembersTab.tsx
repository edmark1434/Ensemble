import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Users,
  Info,
  Flag,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useChatState from '@/components/ui/chat_bubble/chat_state';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { SubcontractProposalModal } from '../team_modals/SubcontractProposalModal';
import { SubcontractRequestsReview, type SubcontractProposal } from './SubcontractRequestsReview';

export interface MilestoneItem {
  id: string;
  index: number;
  name: string;
  description?: string;
  status: string;
  credits: number;
  revisions_max: number;
  deadline_at?: string;
  submissions?: any[];
}

export interface ContractItem {
  contract_id: string;
  contract_type: string;
  contract_status: string;
  rate_credits: number;
  starts_at: string;
  deadline_at?: string;
  milestone_title?: string;
  milestone_order?: number;
  freelancer_account_id: string;
  freelancer_name: string;
  freelancer_handle?: string;
  freelancer_avatar_path?: string;
  milestones?: MilestoneItem[];
}

export interface MemberItem {
  account_id: string;
  display_name: string;
  handle?: string;
  avatar_path?: string;
  team_role: string;
  milestone_role?: string;
  milestone_order?: number;
  contract_id?: string;
  contract_status?: string;
  joined_at?: string;
  is_subcontractor?: boolean;
  parent_contractor_account_id?: string;
  parent_contractor_name?: string;
  parent_contractor_handle?: string;
  parent_contractor_avatar_path?: string;
  assigned_milestone_id?: string;
  assigned_milestone_title?: string;
  subcontractor_permissions?: {
    can_view_tasks?: boolean;
    can_update_task_status?: boolean;
    can_upload_drafts?: boolean;
    can_create_subtasks?: boolean;
  };
}

interface ProjectContractAndMembersTabProps {
  teamId: string;
  contracts: ContractItem[];
  members: MemberItem[];
  currentUserAccountId: string;
  isClient: boolean;
  milestones?: any[];
  defaultSubTab?: 'contracts' | 'members';
  onContractsUpdated?: () => void;
  onOpenRateModal?: (contractId: string, targetName: string) => void;
  onOpenReportModal?: () => void;
}

export const ProjectContractAndMembersTab: React.FC<ProjectContractAndMembersTabProps> = ({
  teamId,
  contracts,
  members,
  currentUserAccountId,
  isClient,
  milestones = [],
  defaultSubTab = 'contracts',
  onContractsUpdated,
  onOpenRateModal,
  onOpenReportModal,
}) => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const [subTab, setSubTab] = useState<'contracts' | 'members'>(defaultSubTab);

  const [proposals, setProposals] = useState<SubcontractProposal[]>([]);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [selectedContractForNomination, setSelectedContractForNomination] = useState<ContractItem | null>(null);

  const resolvedAccountId = String(
    currentUserAccountId || user?.account_id || user?.id || ''
  ).trim();

  // If client: sees all contracts for all members in this workspace
  // If freelancer/contributor: sees only their own contract
  const visibleContracts = isClient
    ? contracts
    : contracts.filter((c) => {
        if (!resolvedAccountId) return true;
        return String(c.freelancer_account_id).trim() === resolvedAccountId;
      });

  const myContract = contracts.find(
    (c) => String(c.freelancer_account_id).trim() === resolvedAccountId
  );

  const fetchProposals = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await api.get(`/api/team-projects/${teamId}/subcontracts/proposals`);
      setProposals(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load subcontract proposals:', err);
    }
  }, [teamId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleOpenContract = (contractId?: string) => {
    const targetUrl = contractId ? `/contracts/${contractId}` : '/contracts';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStartDirectChat = async (targetMember: MemberItem) => {
    try {
      await useChatState.getState().openDirectChat({
        account_id: targetMember.account_id,
        name: targetMember.display_name,
        avatarUrl: targetMember.avatar_path,
      });
      showSuccessToast(`Opened chat with ${targetMember.display_name}`);
    } catch {
      navigate('/inbox/direct', {
        state: { other_account_id: targetMember.account_id },
      });
    }
  };

  const openNominationForContract = (contract: ContractItem) => {
    setSelectedContractForNomination(contract);
    setIsNominateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher: Contracts | Members */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit border border-zinc-200/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSubTab('contracts')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'contracts'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Contracts ({visibleContracts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('members')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'members'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Subcontractor nomination trigger in header if freelancer has contract */}
          {!isClient && myContract && (
            <button
              type="button"
              onClick={() => openNominationForContract(myContract)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Subcontractor under My Contract</span>
            </button>
          )}

          {subTab === 'contracts' ? (
            <button
              type="button"
              onClick={() => window.open('/contracts', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>All Contracts</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          ) : (
            !isClient &&
            onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Team Project</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Subcontract Proposals & Client Review Queue */}
      <SubcontractRequestsReview
        teamId={teamId}
        proposals={proposals}
        isClient={isClient}
        currentUserAccountId={resolvedAccountId}
        onRefreshProposals={fetchProposals}
        onMembersUpdated={onContractsUpdated}
      />

      {/* ===================== SUBTAB 1: CONTRACTS ===================== */}
      {subTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span>
                  {isClient
                    ? `Workspace Member Contracts (${visibleContracts.length})`
                    : 'My Contract Details'}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isClient
                  ? 'All member contracts linked to this workspace. Click any card to open the contract in a new tab.'
                  : 'Your active contract agreement and escrow security. Click the card to open in a new tab.'}
              </p>
            </div>
          </div>

          {/* Empty State */}
          {visibleContracts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-12 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center shadow-xs">
              <Briefcase className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                {isClient ? 'No Contracts Found' : 'No Contract Assigned'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto mb-4">
                {isClient
                  ? 'There are currently no active member contracts linked to this team project workspace.'
                  : 'You do not have a contract assigned in this team project workspace yet.'}
              </p>
              <button
                type="button"
                onClick={() => window.open('/contracts', '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs cursor-pointer"
              >
                <span>Open /contracts</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleContracts.map((contract) => {
                const status = (contract.contract_status || 'Active').trim();
                const statusLower = status.toLowerCase();
                const isCompleted = statusLower === 'done' || statusLower === 'completed';
                const isActive = statusLower === 'active';

                const milestoneOrder =
                  contract.milestone_order !== undefined
                    ? contract.milestone_order + 1
                    : 1;

                const isMyContractCard =
                  String(contract.freelancer_account_id).trim() === resolvedAccountId;

                return (
                  <div
                    key={contract.contract_id}
                    onClick={() => handleOpenContract(contract.contract_id)}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer group space-y-4"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenContract(contract.contract_id);
                      }
                    }}
                  >
                    {/* Header: Member Avatar & Details + Total Escrow & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-3">
                        <img
                          src={constructAvatarUrl(
                            contract.freelancer_avatar_path,
                            contract.freelancer_name
                          )}
                          alt={contract.freelancer_name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                              contract.freelancer_name
                            );
                          }}
                          onClick={(e) => {
                            if (contract.freelancer_account_id) {
                              e.stopPropagation();
                              navigate(`/profile/${contract.freelancer_account_id}`);
                            }
                          }}
                          className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 group-hover:border-blue-400 transition"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              onClick={(e) => {
                                if (contract.freelancer_account_id) {
                                  e.stopPropagation();
                                  navigate(`/profile/${contract.freelancer_account_id}`);
                                }
                              }}
                              className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                            >
                              {contract.freelancer_name}
                            </h4>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              @{contract.freelancer_handle || 'member'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                            Role:{' '}
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {contract.milestone_title || 'Milestone Contributor'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Total Contract Escrow
                          </span>
                          <span className="text-xl font-bold text-zinc-900 dark:text-white">
                            {Number(contract.rate_credits || 0).toLocaleString()} Credits
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              : isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>

                    {/* 4 Metadata Columns */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">
                          Payment Type
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {contract.contract_type === 'hourly'
                            ? 'Hourly Rate'
                            : 'Fixed Milestone Escrow'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">
                          Started Date
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {contract.starts_at
                            ? new Date(contract.starts_at).toLocaleDateString()
                            : 'Active'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">
                          Sequential Position
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          Milestone {milestoneOrder}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400 block mb-0.5">
                          Security & Escrow
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% Protected
                        </span>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {Array.isArray(contract.milestones) && contract.milestones.length > 0
                            ? `${contract.milestones.length} milestone deliverable(s) attached`
                            : 'Contract agreement active'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isClient && isMyContractCard && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNominationForContract(contract);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Subcontractor</span>
                          </button>
                        )}

                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-blue-600 dark:text-blue-400 group-hover:underline">
                          <span>Open in /contracts</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== SUBTAB 2: MEMBERS ===================== */}
      {subTab === 'members' && (
        <div className="space-y-6">
          {/* Contract-Bound Membership Info Notice */}
          <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-bold">Contractual Team Membership & Subcontracting Policy</p>
              <p className="leading-relaxed opacity-90">
                Membership in this team project is strictly automated and governed by the job contract. Primary contractors can nominate specialists under their contract milestone with client authorization.
              </p>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Project Contributors Roster ({members.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((member) => {
                const isOwner = member.team_role === 'Owner';
                const isSubcontractor =
                  member.is_subcontractor || member.team_role === 'Subcontractor';

                const isMe = Boolean(
                  (resolvedAccountId && String(member.account_id) === String(resolvedAccountId)) ||
                  (user?.handle && member.handle && String(member.handle).toLowerCase() === String(user.handle).toLowerCase()) ||
                  (user?.name && member.display_name && String(member.display_name).toLowerCase() === String(user.name).toLowerCase()) ||
                  (user?.display_name && member.display_name && String(member.display_name).toLowerCase() === String(user.display_name).toLowerCase())
                );

                return (
                  <div
                    key={member.account_id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={constructAvatarUrl(member.avatar_path, member.display_name)}
                        alt={member.display_name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackAvatarUrl(member.display_name);
                        }}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-blue-500 transition"
                        onClick={() => {
                          if (member.account_id) navigate(`/profile/${member.account_id}`);
                        }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            onClick={() => {
                              if (member.account_id) navigate(`/profile/${member.account_id}`);
                            }}
                            className="text-sm font-bold text-zinc-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                          >
                            {member.display_name}
                          </h4>

                          {isMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              You
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              isOwner
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
                                : isSubcontractor
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800'
                                : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {isOwner
                              ? 'Client Owner'
                              : isSubcontractor
                              ? 'Subcontractor'
                              : 'Contributor'}
                          </span>

                          {/* Distinct Badge showing who they are under */}
                          {isSubcontractor && member.parent_contractor_handle && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              <span>Under @{member.parent_contractor_handle}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {member.handle && <span>@{member.handle}</span>}
                          {member.milestone_role && (
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              Role: {member.milestone_role}
                            </span>
                          )}
                          {member.assigned_milestone_title && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Scope: {member.assigned_milestone_title}
                            </span>
                          )}
                          {member.joined_at && (
                            <span>Joined: {new Date(member.joined_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isMe && (
                        <button
                          onClick={() => handleStartDirectChat(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Direct Message</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subcontract Proposal Nomination Modal */}
      {selectedContractForNomination && (
        <SubcontractProposalModal
          isOpen={isNominateModalOpen}
          onClose={() => {
            setIsNominateModalOpen(false);
            setSelectedContractForNomination(null);
          }}
          teamId={teamId}
          contractId={selectedContractForNomination.contract_id}
          contractTitle={selectedContractForNomination.milestone_title || 'Contract Agreement'}
          milestones={milestones.length > 0 ? milestones : (selectedContractForNomination.milestones || [])}
          existingMemberAccountIds={members.map((m) => m.account_id)}
          onProposalCreated={() => {
            fetchProposals();
            onContractsUpdated?.();
          }}
        />
      )}
    </div>
  );
};
