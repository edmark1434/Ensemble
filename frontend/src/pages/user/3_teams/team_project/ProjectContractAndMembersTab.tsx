import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Users,
  Info,
  Flag,
  MessageCircle,
  UserPlus,
  UserMinus,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import socket from '@/lib/socket';
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
  is_team_gig_member?: boolean;
  is_team_contract?: boolean;
  can_manage_team_contributors?: boolean;
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

interface AvailableTeamMember {
  account_id: string;
  display_name: string;
  handle?: string;
  avatar_path?: string;
  team_role?: string;
  team_name?: string;
  team_handle?: string;
  already_in_workspace?: boolean;
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
  is_team_leader?: boolean;
  hired_team_role?: string | null;
  hired_team_name?: string | null;
  hired_team_handle?: string | null;
  can_remove?: boolean;
}

interface ProjectContractAndMembersTabProps {
  teamId: string;
  contracts: ContractItem[];
  members: MemberItem[];
  currentUserAccountId: string;
  isClient: boolean;
  milestones?: any[];
  requiredSkills?: string[];
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
  requiredSkills = [],
  defaultSubTab = 'members',
  onContractsUpdated,
  onOpenRateModal,
  onOpenReportModal,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useGlobalState();
  const [subTab, setSubTab] = useState<'contracts' | 'members'>(defaultSubTab);

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab === 'members') {
      setSubTab('members');
    } else if (paramTab === 'contracts') {
      setSubTab('contracts');
    } else if (defaultSubTab) {
      setSubTab(defaultSubTab);
    }
  }, [defaultSubTab, searchParams]);

  const [proposals, setProposals] = useState<SubcontractProposal[]>([]);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [selectedContractForNomination, setSelectedContractForNomination] = useState<ContractItem | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isAddTeamMemberOpen, setIsAddTeamMemberOpen] = useState(false);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<AvailableTeamMember[]>([]);
  const [loadingAvailableTeamMembers, setLoadingAvailableTeamMembers] = useState(false);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [isAddingTeamMembers, setIsAddingTeamMembers] = useState(false);

  const openAddTeamMemberModal = async () => {
    setIsAddTeamMemberOpen(true);
    setSelectedTeamMemberIds([]);
    setLoadingAvailableTeamMembers(true);
    try {
      const res = await api.get(`/api/team-projects/${teamId}/available-team-members`);
      setAvailableTeamMembers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Unable to load team members.');
    } finally {
      setLoadingAvailableTeamMembers(false);
    }
  };

  const toggleSelectTeamMember = (accountId: string) => {
    setSelectedTeamMemberIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  const handleConfirmAddTeamMembers = async () => {
    if (selectedTeamMemberIds.length === 0 || isAddingTeamMembers) return;
    setIsAddingTeamMembers(true);
    try {
      await api.post(`/api/team-projects/${teamId}/members`, {
        account_ids: selectedTeamMemberIds,
      });
      showSuccessToast(
        `Added ${selectedTeamMemberIds.length} team member${selectedTeamMemberIds.length === 1 ? '' : 's'} as contributor${selectedTeamMemberIds.length === 1 ? '' : 's'}.`
      );
      setIsAddTeamMemberOpen(false);
      setSelectedTeamMemberIds([]);
      onContractsUpdated?.();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Unable to add team member(s) to workspace.');
    } finally {
      setIsAddingTeamMembers(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || isRemovingMember) return;
    setIsRemovingMember(true);
    try {
      await api.delete(`/api/team-projects/${teamId}/members/${memberToRemove.account_id}`);
      showSuccessToast(`Removed ${memberToRemove.display_name} from the workspace.`);
      setMemberToRemove(null);
      onContractsUpdated?.();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Unable to remove contributor from workspace.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const resolvedAccountId = String(
    currentUserAccountId || user?.account_id || user?.id || ''
  ).trim();

  // If client: sees all contracts for all members in this workspace
  // If freelancer/contributor: sees their own contract or team gig contracts they belong to
  const visibleContracts = isClient
    ? contracts
    : contracts.filter((c) => {
        if (!resolvedAccountId) return true;
        return (
          String(c.freelancer_account_id).trim() === resolvedAccountId ||
          Boolean(c.is_team_gig_member)
        );
      });

  const myContract = contracts.find(
    (c) =>
      String(c.freelancer_account_id).trim() === resolvedAccountId ||
      Boolean(c.is_team_gig_member)
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

  // Real-time synchronization for subcontract nominations, approvals, declines, and withdrawals
  useEffect(() => {
    if (!teamId) return;
    if (!socket.connected) {
      socket.connect();
    }

    const handleSubcontractUpdate = (eventData?: any) => {
      const eventTeamId = eventData?.team_id || eventData?.teamId;
      if (eventTeamId && String(eventTeamId) !== String(teamId)) return;
      void fetchProposals();
      onContractsUpdated?.();
    };

    const handleReconnect = () => {
      void fetchProposals();
    };

    socket.on('subcontractProposalsUpdated', handleSubcontractUpdate);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('subcontractProposalsUpdated', handleSubcontractUpdate);
      socket.off('connect', handleReconnect);
    };
  }, [teamId, fetchProposals, onContractsUpdated]);

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
      {/* Subcontract Proposals & Client Review Queue */}
      <SubcontractRequestsReview
        teamId={teamId}
        proposals={proposals}
        isClient={isClient}
        currentUserAccountId={resolvedAccountId}
        onRefreshProposals={fetchProposals}
        onMembersUpdated={onContractsUpdated}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sub-tabs, Action Buttons, and Neutral Policy Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-3">
          {/* Sub-tab Switcher: Members | Contracts */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setSubTab('members');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', 'members');
                  return next;
                });
              }}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'members'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubTab('contracts');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', 'contracts');
                  return next;
                });
              }}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'contracts'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Contracts ({visibleContracts.length})</span>
            </button>
          </div>

          {/* Action Buttons below Members / Contracts */}
          <div className="flex items-center gap-2">
            {/* Team contract -> Add Team Member as Contributor (Team Leader/Managers only); Solo contract -> Add Subcontractor */}
            {!isClient && myContract && (
              myContract.is_team_contract || Boolean(myContract.is_team_gig_member) ? (
                myContract.can_manage_team_contributors && (
                  <button
                    type="button"
                    onClick={() => void openAddTeamMemberModal()}
                    className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/70 dark:hover:border-blue-700 dark:hover:text-blue-300 transition shadow-2xs cursor-pointer truncate"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Add Team Member as Contributor</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => openNominationForContract(myContract)}
                  className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/70 dark:hover:border-blue-700 dark:hover:text-blue-300 transition shadow-2xs cursor-pointer truncate"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Add Subcontractor under My Contract</span>
                </button>
              )
            )}

            {subTab === 'contracts' ? (
              <button
                type="button"
                onClick={() => window.open('/contracts', '_blank', 'noopener,noreferrer')}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-2xs cursor-pointer"
              >
                <span>All Contracts</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>
            ) : (
              !isClient &&
              onOpenReportModal && (
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  title="Report a Member / Team"
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 dark:hover:border-rose-700 transition shadow-2xs cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>Report</span>
                </button>
              )
            )}
          </div>

          {/* Neutral Gray Policy Card */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                Contractual Team Membership & Subcontracting Policy
              </p>
              <p className="leading-relaxed">
                Membership in this team project is strictly automated and governed by the job contract. Primary contractors can nominate specialists under their contract milestone with client authorization.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Contracts or Members Content */}
        <div className="lg:col-span-8 min-w-0">

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
                    className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/70 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/80 hover:shadow-md transition-all duration-200 cursor-pointer group space-y-4"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenContract(contract.contract_id);
                      }
                    }}
                  >
                    {/* Header: Member Avatar & Details + Total Escrow, Status & Click Indicator */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-3.5 min-w-0">
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
                          className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 group-hover:border-blue-400 transition"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={(e) => {
                                if (contract.freelancer_account_id) {
                                  e.stopPropagation();
                                  navigate(`/profile/${contract.freelancer_account_id}`);
                                }
                              }}
                              className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate"
                            >
                              {contract.freelancer_name}
                            </h4>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                              @{contract.freelancer_handle || 'member'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                            Role:{' '}
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {contract.milestone_title || 'Milestone Contributor'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                        <div className="sm:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Total Contract Escrow
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tabular-nums">
                            {Number(contract.rate_credits || 0).toLocaleString()} Credits
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            {status}
                          </span>
                          <span
                            title="Open contract in new tab"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4 Metadata Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80 px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Payment Type
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {contract.contract_type === 'hourly'
                            ? 'Hourly Rate'
                            : 'Fixed Milestone Escrow'}
                        </span>
                      </div>

                      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80 px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Started Date
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {contract.starts_at
                            ? new Date(contract.starts_at).toLocaleDateString()
                            : 'Active'}
                        </span>
                      </div>

                      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80 px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Sequential Position
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          Milestone {milestoneOrder}
                        </span>
                      </div>

                      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80 px-3 py-2.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Security & Escrow
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>100% Protected</span>
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

                      <div className="flex items-center gap-2.5">
                        {!isClient && isMyContractCard && (
                          contract.is_team_contract || Boolean(contract.is_team_gig_member) ? (
                            contract.can_manage_team_contributors && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void openAddTeamMemberModal();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/70 dark:hover:border-blue-700 dark:hover:text-blue-300 transition shadow-2xs cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add Team Member as Contributor</span>
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNominationForContract(contract);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/70 dark:hover:border-blue-700 dark:hover:text-blue-300 transition shadow-2xs cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Subcontractor</span>
                            </button>
                          )
                        )}

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 font-semibold text-xs text-zinc-700 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300 dark:group-hover:border-blue-500/50 transition">
                          <span>View Contract</span>
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
                const isTeamLeader = Boolean(member.is_team_leader);

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
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              isOwner
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
                                : isTeamLeader
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                                : isSubcontractor
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800'
                                : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {isTeamLeader && <ShieldCheck className="w-3 h-3" />}
                            <span>
                              {isOwner
                                ? 'Client Owner'
                                : isTeamLeader
                                ? 'Team Leader'
                                : isSubcontractor
                                ? 'Subcontractor'
                                : member.hired_team_role && member.hired_team_role !== 'Member'
                                ? `Team ${member.hired_team_role}`
                                : 'Contributor'}
                            </span>
                          </span>

                          {/* Team affiliation badge when hired as a Team */}
                          {!isOwner && !isSubcontractor && (member.hired_team_handle || member.hired_team_name) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              <span>
                                Team {member.hired_team_handle ? `@${member.hired_team_handle}` : member.hired_team_name}
                              </span>
                            </span>
                          )}

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

                    <div className="flex items-center gap-2">
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => handleStartDirectChat(member)}
                          title={`Direct Message ${member.display_name}`}
                          aria-label={`Direct Message ${member.display_name}`}
                          className="p-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer shrink-0"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      {!isMe && member.can_remove && (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
                          title="Remove contributor from this project workspace"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}
        </div>
      </div>

      {/* Remove Contributor Confirmation Modal */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isRemovingMember && setMemberToRemove(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                <UserMinus className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  Remove Contributor from Workspace?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {memberToRemove.display_name}
                  </span>
                  {memberToRemove.handle ? ` (@${memberToRemove.handle})` : ''} from this project
                  workspace? They will lose access to the workspace taskboard and unassigned from its
                  tasks.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isRemovingMember}
                onClick={() => setMemberToRemove(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemovingMember}
                onClick={handleConfirmRemoveMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {isRemovingMember ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Remove Contributor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member as Contributor Modal */}
      {isAddTeamMemberOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isAddingTeamMembers && setIsAddTeamMemberOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                    Add Team Member as Contributor
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select active members from your team to add to this project workspace.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isAddingTeamMembers}
                onClick={() => setIsAddTeamMemberOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {loadingAvailableTeamMembers ? (
                <div className="p-8 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading your team members...</span>
                </div>
              ) : availableTeamMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No active team members found.
                </div>
              ) : (
                availableTeamMembers.map((tm) => {
                  const inWorkspace = Boolean(tm.already_in_workspace);
                  const isSelected = selectedTeamMemberIds.includes(tm.account_id);
                  return (
                    <label
                      key={tm.account_id}
                      onClick={() => {
                        if (!inWorkspace) toggleSelectTeamMember(tm.account_id);
                      }}
                      className={`p-3.5 flex items-center justify-between gap-3 transition ${
                        inWorkspace
                          ? 'opacity-60 bg-zinc-50/60 dark:bg-zinc-900/40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 cursor-pointer'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={constructAvatarUrl(tm.avatar_path, tm.display_name)}
                          alt={tm.display_name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackAvatarUrl(tm.display_name);
                          }}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {tm.display_name}
                            </span>
                            {tm.team_role && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {tm.team_role === 'Owner' ? 'Team Leader' : tm.team_role}
                              </span>
                            )}
                          </div>
                          {tm.handle && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              @{tm.handle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {inWorkspace ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Workspace</span>
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isAddingTeamMembers}
                onClick={() => setIsAddTeamMemberOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAddingTeamMembers || selectedTeamMemberIds.length === 0}
                onClick={handleConfirmAddTeamMembers}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isAddingTeamMembers ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      Add as Contributor
                      {selectedTeamMemberIds.length > 0 ? ` (${selectedTeamMemberIds.length})` : ''}
                    </span>
                  </>
                )}
              </button>
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
          requiredSkills={requiredSkills}
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
