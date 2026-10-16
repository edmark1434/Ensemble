import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Flag,
  Info,
  Mail,
  MessageCircle,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useGlobalState from '@/lib/global_state';

interface MemberItem {
  account_id: string;
  display_name: string;
  handle?: string;
  avatar_path?: string;
  team_role: string;
  milestone_role?: string;
  contract_id?: string;
  contract_status?: string;
  joined_at?: string;
}

interface ProjectMembersTabProps {
  members: MemberItem[];
  currentUserAccountId: string;
  isClient: boolean;
  onOpenReportModal: () => void;
}

export const ProjectMembersTab: React.FC<ProjectMembersTabProps> = ({
  members,
  currentUserAccountId,
  isClient,
  onOpenReportModal,
}) => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const myAccountId = currentUserAccountId || user?.account_id || user?.id || '';

  const handleStartDirectChat = async (targetAccountId: string) => {
    try {
      const res = await api.post('/api/inbox/two-accounts', {
        other_account_id: targetAccountId,
      });
      const convoId = res.data?.data?._id || res.data?.data?.conversation_id;
      navigate('/inbox/direct', {
        state: { conversationId: convoId },
      });
    } catch (err: any) {
      showErrorToast('Failed to start direct conversation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract-Bound Membership Info Notice */}
      <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-bold">Contractual Team Membership Policy</p>
          <p className="leading-relaxed opacity-90">
            Membership in this team project is strictly automated and governed by the job contract. Contributors are added automatically upon offer acceptance and cannot be manually invited.
          </p>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs divide-y divide-slate-100 dark:divide-zinc-800">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Project Contributors Roster ({members.length})
            </h3>
          </div>

          {!isClient && (
            <button
              onClick={onOpenReportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition shadow-xs"
            >
              <Flag className="w-3.5 h-3.5" />
              Report Team Project
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {members.map((member) => {
            const isOwner = member.team_role === 'Owner';
            const isMe = Boolean(
              (myAccountId && String(member.account_id) === String(myAccountId)) ||
              (user?.handle && member.handle && String(member.handle).toLowerCase() === String(user.handle).toLowerCase()) ||
              (user?.name && member.display_name && String(member.display_name).toLowerCase() === String(user.name).toLowerCase()) ||
              (user?.display_name && member.display_name && String(member.display_name).toLowerCase() === String(user.display_name).toLowerCase())
            );

            return (
              <div
                key={member.account_id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={constructAvatarUrl(member.avatar_path, member.display_name)}
                    alt={member.display_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(member.display_name);
                    }}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-blue-500 transition"
                    onClick={() => {
                      if (member.account_id) navigate(`/profile/${member.account_id}`);
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 
                        onClick={() => {
                          if (member.account_id) navigate(`/profile/${member.account_id}`);
                        }}
                        className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {member.display_name}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                          You
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          isOwner
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {isOwner ? 'Client Owner' : 'Contributor'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      {member.handle && <span>@{member.handle}</span>}
                      {member.milestone_role && (
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          Role: {member.milestone_role}
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
                      onClick={() => handleStartDirectChat(member.account_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Direct Message
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
