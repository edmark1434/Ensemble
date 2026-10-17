import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ExternalLink,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import useGlobalState from '@/lib/global_state';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

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

interface ProjectContractTabProps {
  teamId: string;
  contracts: ContractItem[];
  currentUserAccountId: string;
  isClient: boolean;
  onContractsUpdated?: () => void;
  onOpenRateModal?: (contractId: string, targetName: string) => void;
}

export const ProjectContractTab: React.FC<ProjectContractTabProps> = ({
  teamId,
  contracts,
  currentUserAccountId,
  isClient,
  onContractsUpdated,
  onOpenRateModal,
}) => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
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

  const handleOpenContract = (contractId?: string) => {
    const targetUrl = contractId ? `/contracts/${contractId}` : '/contracts';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <button
          type="button"
          onClick={() => window.open('/contracts', '_blank', 'noopener,noreferrer')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>All Contracts</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </button>
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
        /* Contracts Cards List - Only Cards, Click opens /contracts in new tab */
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

            return (
              <div
                key={contract.contract_id}
                onClick={() => handleOpenContract(contract.contract_id)}
                className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
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
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {Array.isArray(contract.milestones) && contract.milestones.length > 0
                      ? `${contract.milestones.length} milestone deliverable(s) attached`
                      : 'Contract agreement active'}
                  </span>

                  <span className="inline-flex items-center gap-1 font-semibold text-xs text-blue-600 dark:text-blue-400">
                    <span>Open in /contracts</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
