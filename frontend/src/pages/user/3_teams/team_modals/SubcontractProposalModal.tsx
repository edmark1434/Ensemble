import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  UserPlus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  Check,
  Wrench,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
// Glide-style multi-milestone selector used inline for candidate milestone scope
import useGlobalState from '@/lib/global_state';
import {
  FreelancerPreviewModal,
  type SelectedFreelancerPreview,
} from '@/pages/user/6_job_market/job_components/FreelancerPreviewModal';
import { SubscriptionIcon } from '@/components/ui/SubscriptionIcon';

export interface CandidateDraft {
  candidate_account_id: string;
  display_name: string;
  handle: string;
  avatar_path?: string;
  is_verified?: boolean;
  subscription_type?: string;
  is_following?: boolean;
  is_followed_by?: boolean;
  role_title: string;
  assigned_milestone_id: string;
  assigned_milestone_ids: string[];
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
    contract_milestone_id?: string;
    id?: string;
    milestone_title?: string;
    name?: string;
    order_index?: number;
    index?: number;
  }>;
  existingMemberAccountIds?: string[];
  requiredSkills?: string[];
  onProposalCreated?: () => void;
}

const MAX_NOTE_CHARS = 500;

const CircularMatchRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, size = 32, strokeWidth = 3 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
      title={`${clamped}% skill match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-zinc-200 dark:stroke-white/10"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono text-zinc-900 dark:text-zinc-100">
        {clamped}%
      </span>
    </div>
  );
};

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
  requiredSkills = [],
  onProposalCreated,
}) => {
  const { user: currentUser } = useGlobalState();
  const currentAccountId = currentUser?.account_id || (currentUser as any)?.accountId;

  const [candidates, setCandidates] = useState<CandidateDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredSearchIdx, setHoveredSearchIdx] = useState<number | null>(null);

  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const [hoveredSuggestedIdx, setHoveredSuggestedIdx] = useState<number | null>(null);
  const [openMilestoneIdx, setOpenMilestoneIdx] = useState<number | null>(null);
  const [milestoneMenuRect, setMilestoneMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoveredMilestoneOptIdx, setHoveredMilestoneOptIdx] = useState<number | null>(null);

  const [proposalNotes, setProposalNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFreelancer, setPreviewFreelancer] = useState<SelectedFreelancerPreview | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCandidates([]);
      setSearchQuery('');
      setSearchResults([]);
      setHoveredSearchIdx(null);
      setHoveredSuggestedIdx(null);
      setOpenMilestoneIdx(null);
      setHoveredMilestoneOptIdx(null);
      setProposalNotes('');
      setTermsAccepted(false);
      setPreviewFreelancer(null);
    }
  }, [isOpen]);

  // Fetch skill-matched freelancers (+ following/followers info) when modal opens
  useEffect(() => {
    if (!isOpen || !currentAccountId) {
      setSuggestedUsers([]);
      return;
    }

    let cancelled = false;
    const loadSuggested = async () => {
      setIsLoadingSuggested(true);
      try {
        const [freelancersRes, followingRes, followersRes] = await Promise.all([
          api.get('/api/accounts/search-users', { params: { role: 'Freelancer' } }).catch(() => ({ data: { data: [] } })),
          api.get(`/api/accounts/${currentAccountId}/following`).catch(() => ({ data: { data: [] } })),
          api.get(`/api/accounts/${currentAccountId}/followers`).catch(() => ({ data: { data: [] } })),
        ]);

        if (cancelled) return;

        const followingIds = new Set<string>(
          (followingRes.data?.data || []).map((u: any) => String(u?.account_id || '')).filter(Boolean)
        );
        const followerIds = new Set<string>(
          (followersRes.data?.data || []).map((u: any) => String(u?.account_id || '')).filter(Boolean)
        );

        const wantedSet = new Set(requiredSkills.map((s) => String(s).trim().toLowerCase()).filter(Boolean));

        const merged = new Map<string, any>();
        for (const u of freelancersRes.data?.data || []) {
          if (!u?.account_id) continue;
          if (String(u.status || '').toLowerCase() === 'deactivated') continue;
          const id = String(u.account_id);
          const userSkillNames: string[] = Array.isArray(u.skills)
            ? u.skills.map((s: any) => s?.name).filter(Boolean)
            : [];
          const matchedSkills = userSkillNames.filter((s) => wantedSet.has(s.trim().toLowerCase()));
          const matchPercent =
            wantedSet.size > 0 ? Math.round((matchedSkills.length / wantedSet.size) * 100) : 0;

          merged.set(id, {
            ...u,
            is_following: followingIds.has(id) || Boolean(u.is_following),
            is_followed_by: followerIds.has(id) || Boolean(u.is_followed_by),
            matchedSkills,
            matchPercent,
          });
        }

        const list = Array.from(merged.values()).sort((a, b) => {
          if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
          const aVer = a.verification_status ? 1 : 0;
          const bVer = b.verification_status ? 1 : 0;
          if (bVer !== aVer) return bVer - aVer;
          const aRating = parseFloat(a.overall_rating || '0') || 0;
          const bRating = parseFloat(b.overall_rating || '0') || 0;
          return bRating - aRating;
        });
        setSuggestedUsers(list);
      } finally {
        if (!cancelled) setIsLoadingSuggested(false);
      }
    };

    void loadSuggested();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentAccountId, requiredSkills]);

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
        const wantedSet = new Set(requiredSkills.map((s) => String(s).trim().toLowerCase()).filter(Boolean));

        const filtered = (data.data || [])
          .filter((u: any) => !excludedIds.has(u.account_id))
          .map((u: any) => {
            const userSkillNames: string[] = Array.isArray(u.skills)
              ? u.skills.map((s: any) => s?.name).filter(Boolean)
              : [];
            const matchedSkills = userSkillNames.filter((s) => wantedSet.has(s.trim().toLowerCase()));
            const matchPercent =
              wantedSet.size > 0 ? Math.round((matchedSkills.length / wantedSet.size) * 100) : 0;
            return { ...u, matchedSkills, matchPercent };
          });
        setSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchQuery, isOpen, candidates, existingMemberAccountIds]);

  const isUserVerified = (user: any) =>
    Boolean(user?.verification_status ?? user?.is_verified ?? user?.verified);

  const handleAddCandidate = (user: any) => {
    if (!isUserVerified(user)) {
      return;
    }

    const defaultMilestoneId =
      milestones[0]?.job_milestone_id || milestones[0]?.contract_milestone_id || milestones[0]?.id || '';

    const newCandidate: CandidateDraft = {
      candidate_account_id: user.account_id,
      display_name: user.display_name || user.name || 'Specialist',
      handle: user.handle || 'user',
      avatar_path: user.avatar_preset_url || user.avatar_path || user.avatar_url,
      is_verified: true,
      subscription_type: user.subscriptiontype || user.subscriptionType || 'Free',
      is_following: Boolean(user.is_following),
      is_followed_by: Boolean(user.is_followed_by),
      role_title: 'Video Editor',
      assigned_milestone_id: defaultMilestoneId,
      assigned_milestone_ids: defaultMilestoneId ? [defaultMilestoneId] : [],
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
    setHoveredSearchIdx(null);
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

  const handleToggleCandidateMilestone = (index: number, milestoneId: string) => {
    setCandidates((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (!milestoneId) {
          return { ...c, assigned_milestone_id: '', assigned_milestone_ids: [] };
        }
        const exists = c.assigned_milestone_ids.includes(milestoneId);
        const nextIds = exists
          ? c.assigned_milestone_ids.filter((id) => id !== milestoneId)
          : [...c.assigned_milestone_ids, milestoneId];
        // If all milestones are selected, normalize to Full Contract Scope ([])
        if (normalizedMilestones.length > 0 && nextIds.length >= normalizedMilestones.length) {
          return {
            ...c,
            assigned_milestone_ids: [],
            assigned_milestone_id: '',
          };
        }
        return {
          ...c,
          assigned_milestone_ids: nextIds,
          assigned_milestone_id: nextIds[0] || '',
        };
      })
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
          assigned_milestone_id: c.assigned_milestone_ids[0] || c.assigned_milestone_id || null,
          assigned_milestone_ids: c.assigned_milestone_ids,
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

  const normalizedMilestones = milestones
    .map((m, mIdx) => {
      const id = m.job_milestone_id || m.contract_milestone_id || m.id;
      if (!id) return null;
      const num = mIdx + 1;
      const title = m.milestone_title || m.name || `Milestone ${mIdx + 1}`;
      return { id: String(id), code: `M${num}`, title };
    })
    .filter((m): m is { id: string; code: string; title: string } => m !== null);

  const excludedIds = new Set([
    ...existingMemberAccountIds,
    ...candidates.map((c) => c.candidate_account_id),
    ...(currentAccountId ? [String(currentAccountId)] : []),
  ]);
  const visibleSuggested = suggestedUsers.filter((u) => !excludedIds.has(String(u.account_id)));

  const renderFollowBadge = (isFollowing?: boolean, isFollowedBy?: boolean) => {
    if (isFollowing && isFollowedBy) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
          Mutual
        </span>
      );
    }
    if (isFollowing) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shrink-0">
          Following
        </span>
      );
    }
    if (isFollowedBy) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
          Follows you
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/70 shrink-0">
        Not following
      </span>
    );
  };

  const renderSpecialistList = (
    users: any[],
    _hoveredIdx: number | null,
    _setHoveredIdx: (idx: number | null) => void,
    ariaLabel: string
  ) => {
    const wantedSet = new Set(requiredSkills.map((s) => String(s).trim().toLowerCase()).filter(Boolean));

    return (
      <div
        role="listbox"
        aria-label={ariaLabel}
        className="gs-listbox-scroll grid gap-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1"
      >
        {users.map((user) => {
          const isVerified = isUserVerified(user);
          const rawSkills: { name: string; proficiency?: string; years?: number }[] = Array.isArray(user.skills)
            ? user.skills.filter((s: any) => s?.name)
            : [];
          const sortedSkills = [...rawSkills]
            .map((sk) => ({
              name: String(sk.name),
              proficiency: sk.proficiency || '',
              years: Number(sk.years) || 0,
              isMatched: wantedSet.has(String(sk.name).trim().toLowerCase()),
            }))
            .sort((a, b) => Number(b.isMatched) - Number(a.isMatched));

          return (
            <div
              key={user.account_id}
              role="option"
              aria-selected={false}
              aria-disabled={!isVerified}
              onClick={() =>
                setPreviewFreelancer({
                  id: String(user.account_id),
                  name: user.display_name || user.name || 'Freelancer',
                  username: user.handle || '',
                  avatar: constructAvatarUrl(
                    user.avatar_preset_url || user.avatar_path || user.avatar_url,
                    user.display_name || user.name
                  ),
                  bio: user.bio || '',
                  tagline: user.tagline || '',
                  verified: isVerified,
                  subscriptionType: user.subscriptiontype || 'Free',
                })
              }
              title="Click to preview introduction, portfolio & gallery"
              className={`p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 transition space-y-2 cursor-pointer hover:border-zinc-300 dark:hover:border-white/20 ${
                !isVerified ? 'opacity-65' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={constructAvatarUrl(
                      user.avatar_preset_url || user.avatar_path || user.avatar_url,
                      user.display_name || user.name
                    )}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackAvatarUrl(
                        user.display_name || user.name
                      );
                    }}
                    className={`w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 ${
                      !isVerified ? 'grayscale' : ''
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {user.display_name || user.name}
                      </span>
                      {isVerified && (
                        <img
                          src="/icons/verification/lvl2_verified.png"
                          alt="Verified User"
                          title="Verified on platform"
                          className="w-3.5 h-3.5 shrink-0 object-contain"
                        />
                      )}
                      {(user.subscriptiontype || user.subscriptionType) &&
                        (user.subscriptiontype || user.subscriptionType) !== 'Free' && (
                          <SubscriptionIcon
                            plan={user.subscriptiontype || user.subscriptionType}
                            className="w-3.5 h-3.5 shrink-0"
                          />
                        )}
                      {renderFollowBadge(user.is_following, user.is_followed_by)}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                      @{user.handle || 'user'}
                      {!isVerified && (
                        <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                          · Not verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {user.matchPercent > 0 && (
                    <CircularMatchRing percentage={user.matchPercent} size={32} strokeWidth={3} />
                  )}
                  {isVerified ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddCandidate(user);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/15 transition cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-500/80" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>
              </div>

              {sortedSkills.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 pt-1.5 border-t border-zinc-200/60 dark:border-white/5">
                  <Wrench className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0 mr-0.5" />
                  {sortedSkills.slice(0, 5).map((sk) => {
                    const meta = [
                      sk.proficiency ? sk.proficiency : '',
                      sk.years > 0 ? `${sk.years}y` : '',
                    ].filter(Boolean);
                    return (
                      <span
                        key={sk.name}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                          sk.isMatched
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium'
                            : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                        }`}
                      >
                        <span>{sk.name}</span>
                        {meta.length > 0 && (
                          <span className="text-[9px] opacity-75">· {meta.join(' · ')}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1560px] flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-4 lg:gap-0 my-auto"
      >
        {/* LEFT CONNECTED MODAL (lg:order-1): Freelancer Profile Preview */}
        <AnimatePresence>
          {previewFreelancer && (
            <motion.div
              key={previewFreelancer.id}
              initial={{ opacity: 0, x: 20, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 14, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="lg:order-1 flex flex-col lg:flex-row items-stretch lg:items-center shrink-0"
            >
              <FreelancerPreviewModal
                freelancer={previewFreelancer}
                onClose={() => setPreviewFreelancer(null)}
                onCloseDrawer={onClose}
              />
              {/* Connector: Preview -> Search */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.18, delay: 0.06, ease: 'easeOut' }}
                style={{ transformOrigin: 'right center' }}
                className="hidden lg:flex items-center shrink-0 pointer-events-none"
                aria-hidden="true"
              >
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -ml-1 z-10" />
                <div className="w-5 h-[1.5px] bg-zinc-300 dark:bg-white/25" />
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -mr-1 z-10" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER PANEL (lg:order-2): Search & Add */}
        <div className="lg:order-2 w-full lg:w-[370px] xl:w-[400px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Nominate Team Subcontractors</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  Batch Invitation
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Add specialists to assist on your contract milestones.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contract Scope & Required Skills */}
          {(contractTitle || requiredSkills.length > 0) && (
            <div className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2 text-xs">
              {contractTitle && (
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">Scope:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {contractTitle}
                  </span>
                </div>
              )}
              {requiredSkills.length > 0 && (
                <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/50">
                  <Wrench className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mr-0.5">
                    Required:
                  </span>
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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

            {/* Search Dropdown Results (Glide-style listbox with thin scrollbar) */}
            {searchResults.length > 0 && renderSpecialistList(
              searchResults,
              hoveredSearchIdx,
              setHoveredSearchIdx,
              'Platform specialists search results'
            )}

            {/* Suggested Freelancers (Matched by Job / Gig Skills) when not searching */}
            {!searchQuery.trim() && (isLoadingSuggested || visibleSuggested.length > 0) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span>
                    {requiredSkills.length > 0
                      ? 'Suggested Freelancers (Skill Matched)'
                      : 'Suggested Freelancers'}
                  </span>
                  {visibleSuggested.length > 0 && (
                    <span className="text-[10px] font-normal">
                      {visibleSuggested.length} freelancer(s)
                    </span>
                  )}
                </div>
                {isLoadingSuggested ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finding matching freelancers...</span>
                  </div>
                ) : (
                  renderSpecialistList(
                    visibleSuggested,
                    hoveredSuggestedIdx,
                    setHoveredSuggestedIdx,
                    'Suggested freelancers'
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* SELECTED SPECIALISTS PANEL (lg:order-3, left of Note/Terms modal) */}
        <AnimatePresence>
          {candidates.length > 0 && (
            <motion.div
              key="selected-specialists-panel"
              initial={{ opacity: 0, x: -20, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -14, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="lg:order-3 flex flex-col lg:flex-row items-stretch lg:items-center shrink-0"
            >
              {/* Connector: Search -> Selected */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.18, delay: 0.06, ease: 'easeOut' }}
                style={{ transformOrigin: 'left center' }}
                className="hidden lg:flex items-center shrink-0 pointer-events-none"
                aria-hidden="true"
              >
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -ml-1 z-10" />
                <div className="w-5 h-[1.5px] bg-zinc-300 dark:bg-white/25" />
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -mr-1 z-10" />
              </motion.div>

              <div className="w-full lg:w-[330px] xl:w-[355px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-3">
                <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                      Selected Specialists ({candidates.length})
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Configure role, milestone &amp; permissions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCandidates([])}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                  >
                    Unselect All
                  </button>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scroll-thin">
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
                          <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{cand.display_name}</span>
                            {cand.is_verified && (
                              <img
                                src="/icons/verification/lvl2_verified.png"
                                alt="Verified User"
                                title="Verified on platform"
                                className="w-4 h-4 shrink-0 object-contain"
                              />
                            )}
                            {cand.subscription_type && cand.subscription_type !== 'Free' && (
                              <SubscriptionIcon
                                plan={cand.subscription_type}
                                className="w-3.5 h-3.5 shrink-0"
                              />
                            )}
                            {renderFollowBadge(cand.is_following, cand.is_followed_by)}
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

                    <div className="space-y-3 text-xs">
                      {/* Multi-milestone mapping (full width with M1, M2, M3 badges) */}
                      <div className="relative">
                        <label className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                          <span>Assigned Milestone Scope</span>
                          <span className="text-[10px] font-normal text-zinc-400">
                            {cand.assigned_milestone_ids.length === 0
                              ? 'All milestones'
                              : `${cand.assigned_milestone_ids.length} selected (multi-select)`}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            setHoveredMilestoneOptIdx(null);
                            if (openMilestoneIdx === idx) {
                              setOpenMilestoneIdx(null);
                              setMilestoneMenuRect(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMilestoneMenuRect({
                                top: rect.bottom + 6,
                                left: rect.left,
                                width: rect.width,
                              });
                              setOpenMilestoneIdx(idx);
                            }
                          }}
                          aria-expanded={openMilestoneIdx === idx}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-nowrap overflow-hidden">
                            {cand.assigned_milestone_ids.length === 0 ? (
                              <span className="truncate font-medium">Full Contract Scope (All Milestones)</span>
                            ) : cand.assigned_milestone_ids.length === 1 ? (
                              (() => {
                                const sel = normalizedMilestones.find(
                                  (m) => m.id === cand.assigned_milestone_ids[0]
                                );
                                return sel ? (
                                  <>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] shrink-0">
                                      {sel.code}
                                    </span>
                                    <span className="truncate font-medium">{sel.title}</span>
                                  </>
                                ) : (
                                  <span>1 milestone selected</span>
                                );
                              })()
                            ) : (
                              normalizedMilestones
                                .filter((m) => cand.assigned_milestone_ids.includes(m.id))
                                .map((m) => (
                                  <span
                                    key={m.id}
                                    title={m.title}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] shrink-0"
                                  >
                                    {m.code}
                                  </span>
                                ))
                            )}
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                              openMilestoneIdx === idx ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {openMilestoneIdx === idx &&
                          milestoneMenuRect &&
                          createPortal(
                            <>
                              <div
                                className="fixed inset-0 z-[79]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMilestoneIdx(null);
                                  setMilestoneMenuRect(null);
                                }}
                              />
                              <div
                                role="listbox"
                                aria-multiselectable="true"
                                aria-label="Assigned Milestone Scope"
                                onClick={(e) => e.stopPropagation()}
                                onMouseLeave={() => setHoveredMilestoneOptIdx(null)}
                                style={{
                                  position: 'fixed',
                                  top: milestoneMenuRect.top,
                                  left: milestoneMenuRect.left,
                                  width: milestoneMenuRect.width,
                                }}
                                className="gs-listbox-scroll z-[80] grid gap-0.5 max-h-48 overflow-y-auto overflow-x-hidden p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl"
                              >
                            <span
                              aria-hidden="true"
                              style={{
                                transform: `translateY(${(hoveredMilestoneOptIdx ?? 0) * 38}px)`,
                                opacity: hoveredMilestoneOptIdx !== null ? 1 : 0,
                              }}
                              className="pointer-events-none absolute top-1.5 right-1.5 left-1.5 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                            />
                            <button
                              type="button"
                              role="option"
                              aria-selected={cand.assigned_milestone_ids.length === 0}
                              onClick={() => handleToggleCandidateMilestone(idx, '')}
                              onMouseEnter={() => setHoveredMilestoneOptIdx(0)}
                              className="relative z-[1] h-9 w-full flex items-center justify-between gap-2 px-2.5 rounded-lg text-left text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer"
                            >
                              <span className="font-medium truncate">
                                Full Contract Scope (All Milestones)
                              </span>
                              {cand.assigned_milestone_ids.length === 0 && (
                                <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              )}
                            </button>
                            {normalizedMilestones.map((m, mIdx) => {
                              const isSelected = cand.assigned_milestone_ids.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => handleToggleCandidateMilestone(idx, m.id)}
                                  onMouseEnter={() => setHoveredMilestoneOptIdx(mIdx + 1)}
                                  title={`${m.code}: ${m.title}`}
                                  className="relative z-[1] h-9 w-full flex items-center justify-between gap-2 px-2.5 rounded-lg text-left text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] shrink-0">
                                      {m.code}
                                    </span>
                                    <span className="truncate font-medium">{m.title}</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                            </>,
                            document.body
                          )}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL (lg:order-4, always shown by default): Note, Terms & Submit */}
        <div className="hidden lg:flex lg:order-4 items-center shrink-0 pointer-events-none" aria-hidden="true">
          <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -ml-1 z-10" />
          <div className="w-5 h-[1.5px] bg-zinc-300 dark:bg-white/25" />
          <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-white/40 -mr-1 z-10" />
        </div>

        <div className="lg:order-5 w-full lg:w-[350px] xl:w-[380px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
              {/* Notification Notice */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Selected specialist{candidates.length === 1 ? '' : 's'} will be{' '}
                  <strong className="text-zinc-900 dark:text-white">notified</strong> of your
                  nomination and will join the workspace once the client approves.
                </p>
              </div>

          {/* Proposal Justification Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>Proposal Justification & Note to Client</span>
              <span
                className={`text-[11px] font-normal ${
                  proposalNotes.length >= MAX_NOTE_CHARS
                    ? 'text-rose-500 font-medium'
                    : proposalNotes.length >= MAX_NOTE_CHARS - 50
                      ? 'text-amber-500'
                      : 'text-zinc-400'
                }`}
              >
                Optional · {proposalNotes.length}/{MAX_NOTE_CHARS}
              </span>
            </label>
            <textarea
              rows={3}
              maxLength={MAX_NOTE_CHARS}
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value.slice(0, MAX_NOTE_CHARS))}
              placeholder="Explain to the client why you are bringing in these team members (e.g. 'Bringing in Jordan for specialized audio mixing to meet Friday's cutoff')..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Real Business Standard Terms & Conditions Box */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span>Subcontracting Agreement & Lead Liability Terms</span>
            </div>

            <ul className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-4 leading-relaxed max-h-36 overflow-y-auto pr-1 scroll-thin">
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Lead Contractor Accountability:</strong> You remain 100% accountable to the client for the quality, deadlines, and deliverables produced by all nominated specialists.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Client Confidentiality & NDA:</strong> All nominated team members will be bound by client confidentiality and non-disclosure obligations.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">No Escrow Impact:</strong> Subcontracting does not alter the client's escrow budget. All subcontractor payouts are allocated from your agreed contract earnings upon milestone releases.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Know Your Subcontractors:</strong> Make sure you know and trust the person you are subcontracting to before nominating them.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Owner Confirmation Required:</strong> Note that after inviting, the project owner must confirm the invitation before the specialist gains workspace access.
              </li>
            </ul>

            <label className="flex items-center gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>I acknowledge and accept the subcontracting terms and lead accountability</span>
            </label>
          </div>

              {/* Footer Actions inside Right Panel */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || candidates.length === 0 || !termsAccepted}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Proposal ({candidates.length})</span>
                </button>
              </div>
            </div>
      </form>
    </div>
  );
};
