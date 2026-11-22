import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Download, ExternalLink, X } from 'lucide-react';
import api from '@/lib/axios';
import { useStaffLive } from '@/lib/staffLive';
import { showErrorToast } from '@/components/utility/toast';
import {
  freezeAccountCredits,
  getAccountMeritPenalties,
  handleAccountActionError,
  rescindWarning,
  setAccountVerification,
  transferTeamOwnership,
  unfreezeAccount,
  warnAccount,
  type MeritPenaltyRow,
} from '../accountActions';
import type {
  CreditActivityItem,
  AdminVerificationDetails,
  PlatformTeam,
  PlatformUserAccount,
  TeamLeader,
  TeamMember,
  TeamWalletSummary,
  VerificationDetail,
} from '../userTeamTypes';
import { getBusinessDocumentLabel } from '@/pages/user/9_verification/businessVerificationConfig';
import { CreditHoldFields, useCreditHoldForm } from '../../creditEconomy/CreditHoldFields';
import { SanctionScheduleFields, type SanctionTiming } from './SanctionSchedule';
import { DEFAULT_MERIT, isActiveWarning, meritBandLabel, meritFromWarnings } from '@/lib/merit';
import { WarningPresetFields } from './WarningPresetFields';
import { LiftWarningPointsPanel } from './LiftWarningPointsPanel';
import { MeritPenaltiesPanel } from './MeritPenaltiesPanel';
import { StaffPunishmentChips, type MeritPenaltyLike } from '@/components/account/MeritStatus';
import { PunishmentPresetFields } from './PunishmentPresetFields';
import {
  TeamMemberScopeFields,
  defaultTeamScope,
  teamScopeReady,
  teamScopeRequest,
  type TeamMemberScope,
  type TeamScopeMember,
  type TeamScopeValue,
} from '@/components/staff/TeamMemberScopeFields';
import { punishmentDurationLabel, type PunishmentKind, type PunishmentPreset } from '@/lib/punishmentCatalog';
import {
  CommunitySection,
  CreditTotalsSection,
  ProfileDetailsState,
  PublicProfileLink,
  StandingSection,
  TeamRosterSection,
  useAccountProfile,
  WorkSection,
} from './AccountProfileSections';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return null;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
}

function ProfileAvatar({
  path,
  name,
  size = 'lg',
}: {
  path: string | null | undefined;
  name: string;
  size?: 'lg' | 'xl';
}) {
  const [failed, setFailed] = useState(false);
  const url = buildAvatarUrl(path);
  const dims = size === 'xl' ? 'h-24 w-24 text-3xl' : 'h-16 w-16 text-2xl';

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={`${name} avatar`}
        onError={() => setFailed(true)}
        className={`${dims} shrink-0 rounded-2xl border border-white/[0.1] object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-rose-500/20 font-bold text-rose-100`}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[90dvh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90dvh-140px)] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/[0.08] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Unfreeze (Admin / Support): end the automatic merit punishments running on a member now,
 * before their clocks run out. Every running band and mute is ticked by default; an automatic
 * suspension is listed but ended with Remove suspension instead. Merit is not changed.
 */
export function UnfreezeAccountModal({
  entityName,
  accountId,
  onClose,
  onChanged,
}: {
  entityName: string;
  accountId: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<MeritPenaltyRow[] | null>(null);
  const [ready, setReady] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAccountMeritPenalties(accountId)
      .then((data) => {
        if (cancelled) return;
        setReady(data.ready);
        setRows(data.active);
        setPicked(new Set(data.active.filter((row) => row.effect !== 'auto_suspend').map((row) => row.id)));
      })
      .catch((err) => {
        if (!cancelled) {
          handleAccountActionError(err);
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Live: penalties that end elsewhere leave the list (and the picks); the rest stay as picked.
  useStaffLive(
    ['accounts', 'moderation'],
    () =>
      getAccountMeritPenalties(accountId)
        .then((data) => {
          setReady(data.ready);
          setRows(data.active);
          const live = new Set(data.active.map((row) => row.id));
          setPicked((current) => new Set([...current].filter((id) => live.has(id))));
        })
        .catch(() => {}),
    { enabled: rows !== null && !saving, delayMs: 1000 },
  );

  const endable = (rows || []).filter((row) => row.effect !== 'auto_suspend');
  const suspension = (rows || []).find((row) => row.effect === 'auto_suspend') || null;
  const canSubmit = picked.size > 0 && reason.trim().length >= 5 && !saving;

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    setSaving(true);
    try {
      await unfreezeAccount(accountId, { reason: reason.trim(), penaltyIds: [...picked] });
      await onChanged?.();
      onClose();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Unfreeze ${entityName}`}
      subtitle="End automatic merit punishments now. Merit and the warnings stay as they are."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Ending…' : picked.size ? `End ${picked.size} now` : 'End now'}
          </button>
        </div>
      }
    >
      {rows === null ? (
        <p className="text-sm text-zinc-400">Loading automatic punishments…</p>
      ) : !ready ? (
        <p className="text-sm text-zinc-400">Timed automatic punishments start once the latest database migration has run.</p>
      ) : endable.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Nothing automatic is running on this account{suspension ? ' except a suspension' : ''}.
        </p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {endable.map((row) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={picked.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      {row.label}
                      {row.ruleLabel && row.ruleLabel !== row.label ? (
                        <span className="font-normal text-zinc-500"> · {row.ruleLabel}</span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Ends {formatDateTime(row.endsAt)} · started at merit {row.meritAtStart} (rule at {row.triggerMerit})
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {suspension ? (
            <p className="text-xs text-zinc-500">
              The automatic suspension (ends {formatDateTime(suspension.endsAt)}) is ended with Remove suspension.
            </p>
          ) : null}
          <label className="block text-xs text-zinc-400">
            Why (staff only, the member does not see this)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="e.g. Warning was a misunderstanding; reviewed on ticket TCK-1234."
              className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-400/50"
            />
          </label>
          <p className="text-xs text-zinc-500">The member is told what ended and what is still running.</p>
        </div>
      )}
    </ModalShell>
  );
}

const SANCTION_RESULT: Record<string, 'banned' | 'suspended' | 'locked'> = { ban: 'banned', suspend: 'suspended', lock: 'locked' };
const LIFT_ACTIONS = new Set(['unban', 'unsuspend', 'unlock', 'restore']);

/** Whether a team action reaches members (apply / lift), or null (timeouts go to the leader). */
function teamScopeMode(action: string): 'apply' | 'lift' | null {
  if (SANCTION_RESULT[action]) return 'apply';
  if (LIFT_ACTIONS.has(action)) return 'lift';
  return null;
}

function teamScopeMembers(members: TeamMember[] | undefined): TeamScopeMember[] {
  return (members || [])
    .filter((member) => member.accountId)
    .map((member) => ({
      accountId: String(member.accountId),
      name: member.name,
      handle: member.username || null,
      role: member.role || null,
      status: member.accountStatus || 'Active',
    }));
}

export function ConfirmStatusModal({
  entityName,
  action,
  onClose,
  onConfirm,
  team,
  desk = 'admin',
  openEndedAllowed = true,
}: {
  /** Desk whose punishment rows to list (the server also clamps specialists to their own). */
  desk?: 'admin' | 'support' | 'forum' | 'marketplace' | 'jobs';
  /** False for specialist desks: suspensions and timeouts need an end date (the server refuses open-ended ones). */
  openEndedAllowed?: boolean;
  entityName: string;
  action: 'ban' | 'suspend' | 'restore' | 'lock' | 'unban' | 'unsuspend' | 'unlock' | 'timeout' | 'clear_timeout';
  onClose: () => void;
  onConfirm: (options?: {
    duration?: 'temporary' | 'permanent';
    endsAt?: string | null;
    reason: string;
    punishmentId?: string;
    customDuration?: boolean;
    /** Team targets: who else gets it (or has a team-linked penalty lifted). */
    memberScope?: TeamMemberScope;
    memberAccountIds?: string[];
  }) => Promise<void>;
  /** Team targets: the team acts as one account; staff pick which members share the penalty. */
  team?: { leader: TeamLeader | null; members?: TeamMember[] };
}) {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const isTeam = Boolean(team);
  const leader = team?.leader ?? null;
  const scopeMode = isTeam ? teamScopeMode(action) : null;
  const scopeMembers = teamScopeMembers(team?.members);
  const [memberScope, setMemberScope] = useState<TeamScopeValue>(() => defaultTeamScope(scopeMode || 'apply', leader));
  const teamTimeoutWithoutLeader = isTeam && (action === 'timeout' || action === 'clear_timeout') && !leader;
  const choosesCatalog = action === 'ban' || action === 'suspend' || action === 'timeout';
  const choosesDuration = choosesCatalog || action === 'lock';
  const [punishmentId, setPunishmentId] = useState('');
  const [preset, setPreset] = useState<PunishmentPreset | null>(null);
  const [customDuration, setCustomDuration] = useState(false);
  const [punishmentError, setPunishmentError] = useState('');
  const catalogKind: PunishmentKind | undefined = choosesCatalog ? action : undefined;
  const [timing, setTiming] = useState<SanctionTiming>({
    duration: action === 'ban' || action === 'lock' ? 'permanent' : 'temporary',
    endsAt: null,
    summary: '',
  });
  const labels = {
    ban: { title: 'Ban account', verb: 'ban', result: 'Banned', tone: 'bg-rose-500/90 hover:bg-rose-500' },
    suspend: {
      title: 'Suspend account',
      verb: 'suspend',
      result: 'Suspended',
      tone: 'bg-amber-500/90 hover:bg-amber-500',
    },
    restore: {
      title: 'Restore account',
      verb: 'restore',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    unban: {
      title: 'Remove ban',
      verb: 'remove the ban from',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    unsuspend: {
      title: 'Remove suspension',
      verb: 'remove the suspension from',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    unlock: {
      title: 'Remove lock',
      verb: 'remove the lock from',
      result: 'Active',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
    lock: {
      title: 'Lock account',
      verb: 'lock',
      result: 'Locked',
      tone: 'bg-zinc-200 text-zinc-900 hover:bg-white',
    },
    timeout: {
      title: 'Timeout',
      verb: 'time out',
      result: 'timed out',
      tone: 'bg-amber-500/90 hover:bg-amber-500',
    },
    clear_timeout: {
      title: 'Remove timeout',
      verb: 'remove the timeout from',
      result: 'able to use the forums',
      tone: 'bg-emerald-500/90 hover:bg-emerald-500',
    },
  }[action];
  const teamTitles: Record<typeof action, string> = {
    ban: 'Ban team',
    suspend: 'Suspend team',
    restore: 'Restore team',
    unban: 'Remove team ban',
    unsuspend: 'Remove team suspension',
    unlock: 'Remove team lock',
    lock: 'Lock team',
    timeout: 'Timeout team leader',
    clear_timeout: 'Remove leader timeout',
  };
  const teamDescriptions: Record<typeof action, string> = {
    ban: 'The team cannot take new work, move team credits, change its roster or edit itself. Its open jobs, gigs and listings close and pending proposals are withdrawn. Live contracts and the team wallet stay for staff to resolve. Members can still leave.',
    suspend: 'While suspended the team cannot take new work, move team credits, change its roster or settings, or transfer ownership. Live contract work (tasks, video projects) can continue so clients are not stranded.',
    lock: 'Investigation hold: every team action stops until staff lift it. Members can still read the team, leave it and report.',
    timeout: 'Teams never post in the forums, so the timeout goes on the leader’s personal account and is listed on the team’s record. Other products stay open.',
    clear_timeout: 'Ends the forum timeout on the leader’s account.',
    restore: 'The team gets its normal features back.',
    unban: 'The team gets its normal features back. Closed jobs, gigs and listings stay closed; the team reposts them.',
    unsuspend: 'The team gets its normal features back.',
    unlock: 'The team gets its normal features back.',
  };
  const isLeaderTimeout = isTeam && (action === 'timeout' || action === 'clear_timeout');
  const title = isTeam ? teamTitles[action] : labels.title;
  const subtitle = isLeaderTimeout
    ? leader
      ? `${leader.name} (leader of ${entityName}) will be ${labels.result}`
      : `${entityName} has no active leader`
    : `${entityName} will be set to ${labels.result}`;

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              saving
              || teamTimeoutWithoutLeader
              || (scopeMode !== null && !teamScopeReady(memberScope))
              || !reason.trim()
              || (choosesCatalog && !punishmentId)
              || (choosesDuration && customDuration && timing.duration === 'temporary' && !timing.endsAt)
            }
            onClick={async () => {
              if (choosesCatalog && !punishmentId) {
                setPunishmentError('Pick a predefined punishment.');
                return;
              }
              if (!reason.trim()) {
                setReasonError('A reason is required.');
                return;
              }
              setSaving(true);
              try {
                await onConfirm({
                  duration: choosesDuration && (customDuration || action === 'lock') ? timing.duration : undefined,
                  endsAt: choosesDuration && (customDuration || action === 'lock') ? timing.endsAt : undefined,
                  reason: reason.trim(),
                  punishmentId: choosesCatalog ? punishmentId : undefined,
                  customDuration: choosesCatalog ? customDuration : undefined,
                  ...(scopeMode ? teamScopeRequest(memberScope) : {}),
                });
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${labels.tone}`}
          >
            {saving ? 'Saving…' : `Confirm ${labels.verb}`}
          </button>
        </div>
      }
    >
      {isTeam ? (
        <p className="text-sm text-zinc-300">{teamDescriptions[action]}</p>
      ) : null}
      {scopeMode ? (
        <div className="mt-4">
          <TeamMemberScopeFields
            mode={scopeMode}
            verb={labels.verb}
            targetStatus={SANCTION_RESULT[action]}
            leader={leader}
            members={scopeMembers}
            value={memberScope}
            onChange={setMemberScope}
          />
        </div>
      ) : null}
      {teamTimeoutWithoutLeader ? (
        <p className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200">
          This team has no active leader to time out. Lock the team or assign an owner first.
        </p>
      ) : null}
      <p className={`text-sm text-zinc-300 ${isTeam ? 'hidden' : ''}`}>
        {action === 'ban'
          ? 'They can sign in only to file an appeal and view their tickets and disputes. Their open jobs, gigs and marketplace listings close, their pending proposals, orders and unsigned offers are withdrawn, and fees and offer escrow are refunded. Live contracts stay for staff to resolve.'
          : action === 'suspend'
            ? 'They stay signed in and can read the whole platform. Every other action stays off.'
            : action === 'timeout'
              ? 'They can keep using Ensemble. Posts, comments, reactions, and other forum changes stay off.'
              : action === 'lock'
                ? 'They can sign in only to file an appeal and view their tickets and disputes. This is for a compromised or held account.'
                : action === 'clear_timeout'
                  ? 'They can post, comment, and react in the forums again.'
                  : 'The account will regain normal platform access.'}
      </p>
      {choosesCatalog && (
        <div className="mt-4">
          <PunishmentPresetFields
            desk={desk}
            kind={catalogKind}
            punishmentId={punishmentId}
            onPunishmentId={(id) => {
              setPunishmentId(id);
              if (id) setPunishmentError('');
            }}
            onPreset={(next) => {
              setPreset(next);
              setCustomDuration(false);
            }}
          />
          {punishmentError ? <p className="mt-1 text-xs text-red-300">{punishmentError}</p> : null}
          {preset ? (
            <p className="mt-2 text-xs text-zinc-400">
              Catalog default: {punishmentDurationLabel(preset)}.
            </p>
          ) : null}
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={customDuration}
              onChange={(event) => setCustomDuration(event.target.checked)}
              className="rounded border-white/20 bg-transparent"
            />
            Set a custom duration
          </label>
        </div>
      )}
      {choosesDuration && (action === 'lock' || customDuration) && (
        <SanctionScheduleFields
          key={`${action}-${punishmentId}-${customDuration ? 'custom' : 'catalog'}`}
          allowPermanent={openEndedAllowed || (action !== 'suspend' && action !== 'timeout')}
          defaultDuration={
            action === 'lock'
              ? 'permanent'
              : preset?.durationDays == null
                ? 'permanent'
                : 'temporary'
          }
          defaultDays={preset?.durationDays || 7}
          onChange={setTiming}
        />
      )}
      <label className="mt-4 block text-sm text-zinc-300">
        Reason
        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim()) setReasonError('');
          }}
          rows={3}
          required
          placeholder="Why this is being applied or removed"
          className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
        />
        {reasonError ? <span className="mt-1 block text-xs text-red-300">{reasonError}</span> : null}
      </label>
    </ModalShell>
  );
}

export function BulkConfirmModal({
  count,
  actionLabel,
  resultLabel,
  tone = 'bg-rose-500/90 hover:bg-rose-500',
  onClose,
  onConfirm,
  requireReason = false,
  memberScopeOption,
}: {
  count: number;
  actionLabel: string;
  resultLabel: string;
  tone?: string;
  onClose: () => void;
  onConfirm: (reason?: string, options?: { memberScope?: Exclude<TeamMemberScope, 'selected'> }) => Promise<void>;
  requireReason?: boolean;
  /** Team bulk actions: who in each team also gets the action (or has a team-linked penalty lifted). */
  memberScopeOption?: { mode: 'apply' | 'lift'; verb: string };
}) {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [bulkScope, setBulkScope] = useState<Exclude<TeamMemberScope, 'selected'>>(
    memberScopeOption?.mode === 'lift' ? 'all' : 'leader'
  );
  const bulkScopeChoices: { id: Exclude<TeamMemberScope, 'selected'>; label: string; hint: string }[] = memberScopeOption
    ? memberScopeOption.mode === 'apply'
      ? [
          { id: 'none', label: 'Teams only', hint: 'Member accounts stay as they are.' },
          { id: 'leader', label: `Also ${memberScopeOption.verb} each team's leader`, hint: 'Teams with no leader change alone.' },
          { id: 'all', label: `Also ${memberScopeOption.verb} every member of each team`, hint: 'The leader included. Accounts you may not act on are skipped.' },
        ]
      : [
          { id: 'none', label: 'Teams only', hint: 'Member penalties stay as they are.' },
          { id: 'leader', label: 'Also lift leaders’ team penalties', hint: 'Only a penalty set together with the team is lifted.' },
          { id: 'all', label: 'Also lift every member’s team penalty', hint: 'Only penalties set together with the team are lifted; others stay.' },
        ]
    : [];

  return (
    <ModalShell
      title={actionLabel}
      subtitle={`${count} selected account${count === 1 ? '' : 's'} → ${resultLabel}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || (requireReason && !reason.trim())}
            onClick={async () => {
              if (requireReason && !reason.trim()) return;
              setSaving(true);
              try {
                await onConfirm(requireReason ? reason.trim() : undefined, {
                  memberScope: memberScopeOption ? bulkScope : undefined,
                });
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${tone}`}
          >
            {saving ? 'Applying…' : `Apply to ${count}`}
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-300">
        This runs the same action on every highlighted row. Accounts that fail individually will be
        reported without blocking the rest.
      </p>
      {bulkScopeChoices.length ? (
        <div className="mt-4 space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          {bulkScopeChoices.map((choice) => (
            <label key={choice.id} className="flex cursor-pointer items-start gap-3 text-sm text-zinc-200">
              <input
                type="radio"
                name="bulk-team-member-scope"
                checked={bulkScope === choice.id}
                onChange={() => setBulkScope(choice.id)}
                className="mt-0.5 h-4 w-4 border-white/20 bg-transparent accent-rose-500"
              />
              <span>
                <span className="font-medium text-white">{choice.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{choice.hint}</span>
              </span>
            </label>
          ))}
          <p className="pt-1 text-xs text-zinc-500">
            Members already at the same or a stricter standing are left as they are. To pick specific members, act on one team at a time.
          </p>
        </div>
      ) : null}
      {requireReason ? (
        <label className="mt-4 block text-sm text-zinc-300">
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            placeholder="Why this is being applied or removed"
            className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
      ) : null}
    </ModalShell>
  );
}

function standingTone(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();
  if (s === 'banned' || s === 'locked') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (s === 'suspended') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (s === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return 'border-white/10 text-zinc-300';
}

function attentionTone(tone: string) {
  if (tone === 'danger') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

function leaderPenaltyEnd(leader: TeamLeader) {
  const s = String(leader.status || '').toLowerCase();
  const end = s === 'suspended' ? leader.suspensionEndsAt : s === 'banned' ? leader.banEndsAt : s === 'locked' ? leader.lockEndsAt : null;
  if (s === 'active') return null;
  return end ? `until ${formatDateTime(end)}` : s === 'banned' ? 'permanently' : 'until lifted';
}

/** The team's leader: the person who answers for the team and carries its warnings. */
function TeamLeaderCard({ leader, onTransfer }: { leader: TeamLeader | null | undefined; onTransfer?: () => void }) {
  if (!leader) {
    return (
      <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200">
        <p className="font-semibold">No active leader</p>
        <p className="mt-1 text-xs text-rose-200/80">
          Nobody answers for this team, so it cannot take new work or pay out credits. Assign an owner, or lock the team.
        </p>
        {onTransfer && (
          <button
            type="button"
            onClick={onTransfer}
            className="mt-2 rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/[0.05]"
          >
            Assign an owner
          </button>
        )}
      </div>
    );
  }
  const restricted = ['banned', 'locked', 'suspended'].includes(String(leader.status).toLowerCase());
  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar path={leader.avatarPath} name={leader.name} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Team leader (Owner)</p>
            <p className="truncate font-semibold text-white">{leader.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {leader.username ? `@${leader.username}` : '—'}
              {leader.email ? ` · ${leader.email}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded-full border px-2 py-0.5 ${standingTone(leader.status)}`}>
            {leader.status}
            {restricted ? ` ${leaderPenaltyEnd(leader) || ''}` : ''}
          </span>
          {leader.merit != null && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              Merit {leader.merit} · {meritBandLabel(leader.merit)}
            </span>
          )}
          {leader.forumTimeout && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">Forum timeout</span>
          )}
          {leader.penaltyLinkedToTeam && (
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-200">Penalty set with this team</span>
          )}
        </div>
      </div>
      {leader.meritPenalties?.length ? (
        <div className="mt-2">
          <StaffPunishmentChips penalties={leader.meritPenalties} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-zinc-500">
        Warnings and forum timeouts aimed at this team go to the leader. Ban, suspend and lock apply to the team and, by
        default, to the leader too; staff can instead pick the team only, specific members or all members.
      </p>
      {restricted && ['banned', 'locked'].includes(String(leader.status).toLowerCase()) && (
        <p className="mt-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200">
          The leader is {String(leader.status).toLowerCase()}: the team cannot take new work or pay out credits until ownership moves or the penalty ends.
          {onTransfer ? (
            <button type="button" onClick={onTransfer} className="ml-2 underline hover:text-white">
              Transfer ownership
            </button>
          ) : null}
        </p>
      )}
    </div>
  );
}

export function TeamOverviewModal({
  team,
  onClose,
  onOpenCredit,
  onOpenVerification,
  onOpenHistory,
  onOpenTransfer,
}: {
  team: PlatformTeam;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
  /** Admin / Support: move ownership (shown when the leader is restricted or missing). */
  onOpenTransfer?: () => void;
}) {
  const { profile, loading, error, reload } = useAccountProfile(team.accountId);
  const leader = team.leader ?? null;
  const contractual = String(team.teamType || 'standard') === 'contractual';
  const wallet = team.wallet;
  const viaTeam = team.history?.violations?.length ?? 0;

  return (
    <ModalShell
      title={team.name}
      subtitle={`Team ID: ${team.id} · Account ID: ${team.accountId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <PublicProfileLink memberPath={`/teams/${team.id}`} />
          {onOpenCredit && (
            <button
              type="button"
              onClick={onOpenCredit}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Team wallet
            </button>
          )}
          {onOpenVerification && (
            <button
              type="button"
              onClick={onOpenVerification}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Business verification
            </button>
          )}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Warnings & disputes
            </button>
          )}
          {onOpenTransfer && !contractual && (
            <button
              type="button"
              onClick={onOpenTransfer}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              {leader ? 'Transfer ownership' : 'Assign an owner'}
            </button>
          )}
        </div>
      }
    >
      {/* Identity header with team avatar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
        <ProfileAvatar path={team.avatarPath} name={team.name} size="xl" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">{team.name}</p>
          {team.handle && <p className="text-sm text-zinc-400">@{team.handle}</p>}
          {team.tagline && <p className="mt-1 text-sm italic text-zinc-500">“{team.tagline}”</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full border px-2 py-0.5 ${standingTone(team.status)}`}>Team {team.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {contractual ? 'Contract workspace' : 'Business team'}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {team.verificationStatus}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {team.attention?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {team.attention.map((flag) => (
            <span key={flag.id} className={`rounded-full border px-2.5 py-1 text-xs ${attentionTone(flag.tone)}`}>
              {flag.label}
            </span>
          ))}
        </div>
      ) : null}

      {!contractual && <TeamLeaderCard leader={leader} onTransfer={onOpenTransfer} />}

      {team.description && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">About</p>
          <p className="mt-1 whitespace-pre-line text-sm text-zinc-300">{team.description}</p>
        </div>
      )}
      {profile?.introduction && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Introduction</p>
          <p className="mt-1 whitespace-pre-line text-sm text-zinc-300">{profile.introduction}</p>
        </div>
      )}

      {profile && <StandingSection profile={profile} />}

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Account</p>
      <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Date created</dt>
          <dd className="text-zinc-300">{formatDateTime(team.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Last activity</dt>
          <dd className="text-zinc-300">
            {formatDateTime(profile?.lastActivityAt ?? team.lastSeenAt)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Platform Merit</dt>
          <dd className="text-zinc-300">
            None — teams have no merit.
            <span className="ml-1 text-xs text-zinc-500">
              {viaTeam} warning{viaTeam === 1 ? '' : 's'} issued through this team (carried by the leader).
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Verification</dt>
          <dd className="text-white">
            {team.verificationStatus}
            {team.verification?.expiresAt && (
              <span className="ml-2 text-xs text-zinc-500">
                {team.verification.isExpired ? 'expired' : 'expires'} {formatDate(team.verification.expiresAt)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Disputes</dt>
          <dd className="text-zinc-300">
            {team.history?.openDisputes ?? 0} open of {team.history?.totalDisputes ?? 0} dispute(s)
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Team contact</dt>
          <dd className="text-zinc-300">{leader?.email || team.leaderEmail || '—'} <span className="text-xs text-zinc-500">(the leader; teams have no mailbox)</span></dd>
        </div>
      </dl>

      {wallet && (
        <>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Team wallet</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Spendable', wallet.available, 'text-white'],
              ['Held by staff', wallet.held, wallet.held > 0 ? 'text-amber-300' : 'text-zinc-500'],
              ['In escrow', wallet.escrow, 'text-white'],
              ['Owed to members', wallet.contractReserved, 'text-sky-300'],
              ['Free to pay out', wallet.unreserved, 'text-emerald-300'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-lg bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase text-zinc-600">{label}</p>
                <p className={`font-semibold tabular-nums ${tone}`}>{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <ProfileDetailsState loading={loading} error={error} onRetry={() => void reload()} />
      {profile && (
        <>
          <TeamRosterSection
            profile={profile}
            renderAvatar={(m) => <ProfileAvatar path={m.avatarPath} name={m.name} />}
          />
          <WorkSection profile={profile} />
        </>
      )}
      <CreditTotalsSection
        profile={profile}
        walletBalance={team.walletBalance ?? team.stats.totalCredits}
        frozenBalance={team.frozenBalance ?? 0}
      />
    </ModalShell>
  );
}

const PREVIOUS_OWNER_ROLES: { value: 'Member' | 'Admin' | 'Removed'; label: string; hint: string }[] = [
  { value: 'Member', label: 'Member', hint: 'Stays on the team without management rights.' },
  { value: 'Admin', label: 'Team Admin', hint: 'Keeps managing members, but cannot pay out or delete the team.' },
  { value: 'Removed', label: 'Remove from team', hint: 'Leaves the team entirely.' },
];

/**
 * Admin / Support: move a team's ownership. Used when the leader is banned, locked or gone, or
 * the team asks for it. The new owner must be an active member in good standing.
 */
export function TransferTeamOwnershipModal({
  team,
  onClose,
  onChanged,
}: {
  team: PlatformTeam;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const { profile, loading, error, reload } = useAccountProfile(team.accountId);
  const [newOwnerAccountId, setNewOwnerAccountId] = useState('');
  const [previousOwnerRole, setPreviousOwnerRole] = useState<'Member' | 'Admin' | 'Removed'>('Member');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const currentOwnerId = team.leader?.accountId ? String(team.leader.accountId) : null;
  const candidates = (profile?.team?.members || []).filter(
    (m) => String(m.status).toLowerCase() === 'active' && String(m.accountId) !== currentOwnerId
  );
  const picked = candidates.find((m) => String(m.accountId) === newOwnerAccountId) || null;
  const pickedRestricted = picked && picked.accountStatus && picked.accountStatus.toLowerCase() !== 'active';
  const canSubmit = Boolean(picked) && !pickedRestricted && reason.trim().length >= 5 && !saving;

  return (
    <ModalShell
      title={team.leader ? `Transfer ownership of ${team.name}` : `Assign an owner to ${team.name}`}
      subtitle={team.leader ? `Current leader: ${team.leader.name} (${team.leader.status})` : 'This team has no active leader'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              if (!picked) return;
              setSaving(true);
              try {
                await transferTeamOwnership(team.accountId, {
                  newOwnerAccountId: String(picked.accountId),
                  previousOwnerRole,
                  reason: reason.trim(),
                });
                await onChanged?.();
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Transferring…' : 'Make owner'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-300">
        The new owner leads the team from now on: they pay out the team wallet, answer for its warnings and get its
        notices. Both the new and the previous owner are told, with your reason.
      </p>
      <ProfileDetailsState loading={loading} error={error} onRetry={() => void reload()} />
      {profile && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-600">New owner</p>
          {candidates.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
              No other active members. Lock the team instead, or wait for a member to join.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {candidates.map((m) => {
                const restricted = m.accountStatus && m.accountStatus.toLowerCase() !== 'active';
                return (
                  <li key={m.accountId}>
                    <label
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        restricted ? 'cursor-not-allowed border-white/[0.05] opacity-50' : 'cursor-pointer border-white/[0.08] hover:border-white/20'
                      } ${newOwnerAccountId === String(m.accountId) ? 'border-sky-400/50 bg-sky-400/[0.06]' : 'bg-white/[0.02]'}`}
                    >
                      <input
                        type="radio"
                        name="new-owner"
                        disabled={Boolean(restricted)}
                        checked={newOwnerAccountId === String(m.accountId)}
                        onChange={() => setNewOwnerAccountId(String(m.accountId))}
                        className="h-4 w-4 accent-sky-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{m.name}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {m.username ? `@${m.username}` : '—'} · {m.role}
                        </span>
                      </span>
                      {restricted ? (
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
                          Account {m.accountStatus}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {team.leader && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-600">{team.leader.name} becomes</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {PREVIOUS_OWNER_ROLES.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                  previousOwnerRole === option.value ? 'border-sky-400/50 bg-sky-400/[0.06] text-white' : 'border-white/[0.08] text-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="previous-owner-role"
                  checked={previousOwnerRole === option.value}
                  onChange={() => setPreviousOwnerRole(option.value)}
                  className="sr-only"
                />
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-zinc-500">{option.hint}</span>
              </label>
            ))}
          </div>
        </>
      )}
      <label className="mt-5 block text-sm text-zinc-300">
        Reason (both owners see it)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. The previous owner is banned; the team asked for its Admin to take over (ticket TCK-1234)."
          className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-white"
        />
      </label>
    </ModalShell>
  );
}

export function CreditActivityModal({
  title,
  accountId,
  activity,
  totalCredits,
  frozenBalance = 0,
  totalRevenue,
  onClose,
  onChanged,
  teamWallet,
}: {
  title: string;
  accountId: string;
  activity: CreditActivityItem[];
  totalCredits: number;
  frozenBalance?: number;
  totalRevenue?: number;
  onClose: () => void;
  onChanged?: () => void;
  /** Team wallets: escrow and the part of the balance owed to members from contract payouts. */
  teamWallet?: TeamWalletSummary;
}) {
  const isTeamWallet = Boolean(teamWallet);
  const [saving, setSaving] = useState(false);
  const isFrozen = frozenBalance > 0;
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdTouched, setHoldTouched] = useState(false);
  const holdForm = useCreditHoldForm(totalCredits);

  const run = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await fn();
      setHoldOpen(false);
      setHoldTouched(false);
      holdForm.reset();
      onChanged?.();
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isTeamWallet ? `${title} — Team wallet` : `${title} — Credits`}
      subtitle={
        isTeamWallet
          ? 'The team’s own wallet. Members add to it; only the Owner pays out. Holds and adjustments notify the team’s Owners and Admins.'
          : undefined
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {holdOpen ? (
            <button
              type="button"
              disabled={saving || (holdTouched && holdForm.hasError)}
              onClick={() => {
                setHoldTouched(true);
                if (holdForm.hasError) return;
                void run(() => freezeAccountCredits(accountId, true, undefined, holdForm.input()));
              }}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
            >
              {isFrozen ? 'Hold these credits too' : 'Confirm hold'}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => setHoldOpen(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
            >
              {isFrozen ? 'Hold more credits' : 'Freeze credits'}
            </button>
          )}
          {isFrozen && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void run(() => freezeAccountCredits(accountId, false))}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Unfreeze
            </button>
          )}
        </div>
      }
    >
      {holdOpen && (
        <div className="mb-5 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <p className="text-xs text-zinc-400">
            {isTeamWallet
              ? 'Holds all or part of the team’s spendable balance, so it cannot be spent or paid out to members. The team’s Owners and Admins are told this reason and the release time; they contact Support to dispute it.'
              : 'Holds all or part of the available balance. The member is notified with this reason and the release time, and can appeal. An accepted appeal releases the credits within 24 hours.'}
          </p>
          <label className="block text-xs font-medium text-zinc-300">
            {isTeamWallet ? 'Reason the team will see' : 'Reason the member will see'}
            <textarea
              value={holdForm.reason}
              onChange={(e) => holdForm.setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500/20"
              placeholder="e.g. Chargeback under review on a recent purchase"
            />
            {(holdTouched || holdForm.reason.length > 0) && holdForm.reasonError && (
              <span className="mt-1 block text-[11px] text-amber-300">{holdForm.reasonError}.</span>
            )}
          </label>
          <CreditHoldFields form={holdForm} touched={holdTouched} />
          <button
            type="button"
            onClick={() => {
              setHoldOpen(false);
              setHoldTouched(false);
            }}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-8 text-sm">
        <div>
          <p className="text-zinc-500">Total credits</p>
          <p className="text-xl font-bold text-white">{totalCredits.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-zinc-500">Frozen credits</p>
          <p className={`text-xl font-bold ${isFrozen ? 'text-amber-300' : 'text-zinc-500'}`}>
            {frozenBalance.toLocaleString()}
          </p>
        </div>
        {totalRevenue != null && (
          <div>
            <p className="text-zinc-500">{isTeamWallet ? 'Listing value' : 'Total revenue'}</p>
            <p className="text-xl font-bold text-emerald-300">{totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>
      {teamWallet && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">In escrow</p>
            <p className="font-semibold tabular-nums text-white">{teamWallet.escrow.toLocaleString()}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Funding the team’s own jobs</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">Owed to members</p>
            <p className="font-semibold tabular-nums text-sky-300">{teamWallet.contractReserved.toLocaleString()}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Contract payouts not yet distributed</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">Free to pay out</p>
            <p className="font-semibold tabular-nums text-emerald-300">{teamWallet.unreserved.toLocaleString()}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Spendable minus owed</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">Wallet</p>
            <p className={`font-semibold ${teamWallet.inactive ? 'text-rose-300' : 'text-white'}`}>
              {teamWallet.inactive ? 'Inactive' : 'Active'}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{teamWallet.walletId ? `WAL-${teamWallet.walletId.slice(0, 8)}` : 'Not created yet'}</p>
          </div>
        </div>
      )}
      <h3 className="mb-4 text-sm font-semibold text-zinc-400">Credits & economy activity feed</h3>
      <ul className="space-y-3">
        {activity.length === 0 && <li className="text-sm text-zinc-500">No credit transactions yet.</li>}
        {activity.map((item) => {
          const tone = item.tone ?? (item.positive ? 'positive' : 'negative');
          const amountClass =
            tone === 'hold'
              ? 'text-amber-300'
              : tone === 'neutral'
                ? 'text-zinc-300'
                : tone === 'positive'
                  ? 'text-emerald-400'
                  : 'text-red-400';
          return (
            <li key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {item.type}
                  {item.counterparty ? (
                    <span className="font-normal text-zinc-400">
                      {' '}
                      · {item.amount > 0 ? 'from' : 'to'} {item.counterparty.isTeam ? 'Team ' : ''}
                      {item.counterparty.name}
                      {item.counterparty.handle ? ` (@${item.counterparty.handle})` : ''}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {item.label} · {item.timeAgo}
                  {tone === 'hold' && item.amount < 0 && (
                    <> · {item.holdUntil ? `release set for ${formatDateTime(item.holdUntil)}` : 'until reviewed'}</>
                  )}
                </p>
                {item.detail && <p className="mt-0.5 break-words text-xs text-zinc-400">{item.detail}</p>}
              </div>
              <p className={`shrink-0 font-semibold tabular-nums ${amountClass}`}>
                {item.amount > 0 && tone !== 'neutral' ? '+' : ''}
                {item.amount.toLocaleString()}
              </p>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}

const VERIFICATION_VALIDITY_DAYS = 365;

function VerificationStatusBadge({ status }: { status: string | null }) {
  const value = status || 'Unavailable';
  const normalized = value.toLowerCase();
  const tone = normalized.includes('approv') || normalized.includes('complete')
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : normalized.includes('declin') || normalized.includes('reject')
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${tone}`}>{value}</span>;
}

function VerificationImage({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <img
        src={url}
        alt={label}
        referrerPolicy="no-referrer"
        className="h-32 w-full rounded-lg border border-white/[0.08] bg-black/30 object-cover transition group-hover:border-white/20"
      />
    </a>
  );
}

function verificationAttachmentUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || '').replace(/\/$/, '');
  return cloudfront ? `${cloudfront}/${path.replace(/^\/+/, '')}` : path;
}

function DiditVerificationPanel({
  details,
  loading,
  error,
}: {
  details: AdminVerificationDetails | null;
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="rounded-xl border border-white/[0.08] p-4 text-sm text-zinc-400">Loading verification activity...</p>;
  if (error) return <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">{error}</p>;
  if (!details) return null;

  if (details.isTeam) {
    const attachments = details.attachments || [];
    const business = details.businessDetails;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs text-zinc-500">Verification status</p>
            <VerificationStatusBadge status={details.verificationStatus} />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Business account</p>
            <p className={`font-medium ${details.isVerified ? 'text-emerald-300' : 'text-zinc-300'}`}>
              {details.isVerified ? 'Verified' : 'Unverified'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Submitted documents</p>
            <p className="font-medium text-white">{attachments.length}</p>
          </div>
        </div>

        {business && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <h4 className="mb-3 text-sm font-semibold text-white">Business information</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Business type</p>
                <p className="mt-1 text-sm text-white">{business.businessType}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registered business name</p>
                <p className="mt-1 text-sm text-white">{business.registeredBusinessName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registration number</p>
                <p className="mt-1 text-sm text-white">{business.registrationNumber}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Registration country</p>
                <p className="mt-1 text-sm text-white">{business.registrationCountry}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Submitted by</p>
                <p className="mt-1 text-sm text-white">{business.submittedByName}</p>
                {business.submittedByHandle && (
                  <p className="text-xs text-zinc-500">@{business.submittedByHandle}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500">Submitter's role / relationship</p>
                <p className="mt-1 text-sm text-white">{business.relationshipToBusiness}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h4 className="mb-3 text-sm font-semibold text-white">Business verification documents</h4>
          {attachments.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {attachments.map((attachment) => {
                const url = verificationAttachmentUrl(attachment.path);
                const documentLabel = getBusinessDocumentLabel(attachment.documentType);
                const isImage = attachment.mimeType.startsWith('image/');
                const isPdf = attachment.mimeType === 'application/pdf';
                return (
                  <div
                    key={attachment.fileId}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 transition hover:border-blue-400/30"
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={documentLabel}
                        className="h-48 w-full bg-black/30 object-contain"
                      />
                    ) : isPdf ? (
                      <iframe
                        src={`${url}#toolbar=0&navpanes=0`}
                        title={`${documentLabel} preview`}
                        className="h-48 w-full bg-white"
                      />
                    ) : (
                      <div className="grid h-48 place-items-center bg-black/30 text-xs text-zinc-500">
                        Preview unavailable for this file type
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{documentLabel}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${attachment.isRequired ? 'bg-rose-500/15 text-rose-300' : 'bg-white/5 text-zinc-400'}`}>
                          {attachment.isRequired ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-400">{attachment.name}</p>
                      <p className="mt-1 break-all text-[10px] text-zinc-600">{attachment.path}</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Open document
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No business documents submitted.</p>
          )}
        </div>
      </div>
    );
  }

  if (details.activity === 'none') {
    return <p className="rounded-xl border border-dashed border-white/[0.1] p-5 text-center text-sm text-zinc-500">No Verification Activity</p>;
  }

  if (details.activity !== 'details' || !details.decision) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] p-3">
            <p className="text-xs text-zinc-400">Verification status</p>
            <VerificationStatusBadge status={details.verificationStatus} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] p-3">
            <p className="text-xs text-zinc-400">KYC status</p>
            <VerificationStatusBadge status={details.kycStatus} />
          </div>
        </div>
        {details.verificationUrl ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-zinc-400">Didit verification session</span>
            <a
              href={details.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Session Link
            </a>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>No verification URL in session. Approval is disabled.</span>
          </div>
        )}
        {details.activity === 'details_unavailable' && (
          <p className="mt-2 text-xs text-amber-300">Detailed verification results are temporarily unavailable.</p>
        )}
      </div>
    );
  }

  const { idVerification, liveness, faceMatch, ipAnalysis } = details.decision;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 sm:grid-cols-3">
        <div><p className="mb-2 text-xs text-zinc-500">Verification status</p><VerificationStatusBadge status={details.verificationStatus} /></div>
        <div><p className="mb-2 text-xs text-zinc-500">KYC status</p><VerificationStatusBadge status={details.kycStatus} /></div>
        <div><p className="mb-2 text-xs text-zinc-500">Didit decision</p><VerificationStatusBadge status={details.decision.status} /></div>
      </div>

      {details.verificationUrl && (
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5">
          <span className="text-xs text-zinc-400">Didit verification session link</span>
          <a
            href={details.verificationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Didit Session
          </a>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">ID verification</h4>
            {idVerification?.documentType && <p className="text-xs text-zinc-500">{idVerification.documentType}</p>}
          </div>
          <VerificationStatusBadge status={idVerification?.status || null} />
        </div>
        {idVerification ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <VerificationImage label="ID front" url={idVerification.frontImage} />
            <VerificationImage label="ID back" url={idVerification.backImage} />
            <VerificationImage label="ID portrait" url={idVerification.portraitImage} />
          </div>
        ) : <p className="text-xs text-zinc-500">No ID verification result.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h4 className="text-sm font-semibold text-white">Liveness</h4>{liveness?.score != null && <p className="text-xs text-zinc-500">Score: {liveness.score}</p>}</div>
            <VerificationStatusBadge status={liveness?.status || null} />
          </div>
          <VerificationImage label="Liveness image" url={liveness?.referenceImage || null} />
          {liveness?.videoUrl && <a href={liveness.videoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-sky-300 hover:underline">Open liveness video</a>}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h4 className="text-sm font-semibold text-white">Face match</h4>{faceMatch?.score != null && <p className="text-xs text-zinc-500">Score: {faceMatch.score}</p>}</div>
            <VerificationStatusBadge status={faceMatch?.status || null} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <VerificationImage label="Source face" url={faceMatch?.sourceImage || null} />
            <VerificationImage label="Target face" url={faceMatch?.targetImage || null} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Device and IP analysis</h4>
          <VerificationStatusBadge status={ipAnalysis?.status || null} />
        </div>
        {ipAnalysis ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-zinc-500">IP address</dt><dd className="mt-1 text-white">{ipAnalysis.ipAddress || '—'}</dd></div>
            <div><dt className="text-zinc-500">Location</dt><dd className="mt-1 text-white">{[ipAnalysis.city, ipAnalysis.region, ipAnalysis.country].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt className="text-zinc-500">Device</dt><dd className="mt-1 text-white">{[ipAnalysis.deviceBrand, ipAnalysis.deviceModel].filter(Boolean).join(' ') || '—'}</dd></div>
            <div><dt className="text-zinc-500">Browser</dt><dd className="mt-1 text-white">{ipAnalysis.browser || '—'}</dd></div>
            <div><dt className="text-zinc-500">Operating system</dt><dd className="mt-1 text-white">{ipAnalysis.operatingSystem || '—'}</dd></div>
            <div><dt className="text-zinc-500">Network flags</dt><dd className="mt-1 text-white">{ipAnalysis.isVpnOrTor ? 'VPN/Tor detected' : ipAnalysis.isDataCenter ? 'Data center detected' : 'No risk flags'}</dd></div>
          </dl>
        ) : <p className="text-xs text-zinc-500">No device or IP analysis result.</p>}
      </div>
    </div>
  );
}

export function VerificationModal({
  entityName,
  accountId,
  verification,
  onClose,
  onChanged,
  loadDiditDetails = false,
}: {
  entityName: string;
  accountId: string;
  verification: VerificationDetail;
  onClose: () => void;
  onChanged?: () => void;
  loadDiditDetails?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionReasonError, setActionReasonError] = useState('');
  const actionReasonRef = useRef<HTMLTextAreaElement>(null);
  const [reverificationRequirements, setReverificationRequirements] = useState({
    idDocument: false,
    liveness: false,
    faceMatch: false,
    ipAnalysis: false,
  });
  const [showReverificationModal, setShowReverificationModal] = useState(false);
  const [diditDetails, setDiditDetails] = useState<AdminVerificationDetails | null>(null);
  const [diditLoading, setDiditLoading] = useState(loadDiditDetails);
  const [diditError, setDiditError] = useState('');
  const [diditRefreshToken, setDiditRefreshToken] = useState(0);

  // Live: a Didit result (webhook or reconciliation) or another reviewer's decision re-reads
  // the verification activity without blanking it.
  const [diditLiveToken, setDiditLiveToken] = useState(0);
  const diditShown = useRef(false);
  useStaffLive(['accounts', 'teams'], () => setDiditLiveToken((t) => t + 1), {
    enabled: loadDiditDetails,
    delayMs: 1000,
  });

  useEffect(() => {
    diditShown.current = false;
  }, [accountId]);

  useEffect(() => {
    if (!loadDiditDetails) return;
    let cancelled = false;
    const load = async () => {
      const silent = diditShown.current;
      if (!silent) {
        setDiditLoading(true);
        setDiditError('');
      }
      try {
        const response = await api.get(`/api/admin/accounts/${accountId}/verification-details`);
        if (!cancelled) {
          setDiditDetails(response.data?.data || null);
          setDiditError('');
          diditShown.current = true;
        }
      } catch {
        if (!cancelled && !silent) setDiditError('Unable to load verification activity.');
      } finally {
        if (!cancelled) setDiditLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [accountId, diditRefreshToken, diditLiveToken, loadDiditDetails]);

  const storedValidityLabel = (() => {
    const verifiedAt = diditDetails?.verifiedAt;
    const expiresAt = diditDetails?.expiresAt || verification.expiresAt;
    if (!verifiedAt || !expiresAt) return '1 year (default)';

    const days = Math.round(
      (new Date(expiresAt).getTime() - new Date(verifiedAt).getTime()) / 86_400_000
    );
    if (!Number.isFinite(days) || days <= 0) return '—';
    if (Math.abs(days - 365) <= 1 || Math.abs(days - 366) <= 1) return '1 year';
    if (Math.abs(days - 730) <= 2 || Math.abs(days - 731) <= 2) return '2 years';
    if (Math.abs(days - 180) <= 1) return '6 months';
    return `${days} days`;
  })();

  const isAlreadyApproved =
    (diditDetails?.isTeam || String(diditDetails?.kycStatus || '').toLowerCase() === 'approved')
    && ['approved', 'verified'].includes(
      String(diditDetails?.verificationStatus || verification.status || '').toLowerCase()
    )
    && Boolean(diditDetails?.isVerified);

  const requiresActionReason = (action: string) =>
    Boolean(loadDiditDetails)
    && ['approve', 'decline', 'reverify'].includes(action)
    && !(action === 'approve' && isAlreadyApproved);

  // Only personal-account verification is backed by Didit/KYC nodes. Team
  // verification is a separate business-document workflow and must never ask
  // the administrator to select personal identity evidence.
  const isTeam = Boolean(diditDetails?.isTeam ?? verification.isTeam);
  const isUserDiditVerification = Boolean(loadDiditDetails && diditDetails && !diditDetails.isTeam);
  const hasVerificationUrl = Boolean(
    diditDetails
      ? (diditDetails.hasVerificationUrl ?? Boolean(diditDetails.verificationUrl))
      : (verification.hasVerificationUrl ?? Boolean(verification.verificationUrl))
  );
  const canApprove = isTeam || hasVerificationUrl;
  const isPendingSessionLoading = Boolean(loadDiditDetails && diditLoading);
  const approveDisabled =
    saving ||
    isPendingSessionLoading ||
    !canApprove;

  const focusActionReason = () => {
    window.requestAnimationFrame(() => {
      actionReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      actionReasonRef.current?.focus();
    });
  };

  const apply = async (action: string) => {
    if (action === 'approve' && !canApprove) {
      showErrorToast('Cannot approve verification: no verification URL exists in the verification session.');
      return false;
    }
    if (requiresActionReason(action) && !actionReason.trim()) {
      setActionReasonError('A reason is required before submitting this action.');
      focusActionReason();
      return false;
    }
    if (action === 'reverify' && isUserDiditVerification && !Object.values(reverificationRequirements).some(Boolean)) {
      setActionReasonError('Select at least one item that the user must resubmit.');
      return false;
    }
    setActionReasonError('');
    setSaving(true);
    try {
      await setAccountVerification(accountId, action, {
        validityDays: action === 'approve' ? VERIFICATION_VALIDITY_DAYS : undefined,
        diditWorkflow: loadDiditDetails,
        comment: actionReason.trim() || undefined,
        reverificationRequirements:
          action === 'reverify' && isUserDiditVerification
            ? reverificationRequirements
            : undefined,
      });
      // Refresh the parent record first so prop-based modal content (status, expiry,
      // verification logs) is current, then reload the Didit detail panel.
      await onChanged?.();
      if (loadDiditDetails) setDiditRefreshToken((value) => value + 1);
      return true;
    } catch (err) {
      handleAccountActionError(err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ModalShell
      title={`${entityName} verification`}
      subtitle={
        verification.isExpired
          ? 'Status: Reverification required — previous verification has expired'
          : verification.expiresAt
            ? `Status: ${verification.status} · Valid until ${formatDate(verification.expiresAt)}`
            : `Status: ${verification.status}`
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={approveDisabled}
            onClick={() => void apply('approve')}
            title={!canApprove ? 'Cannot approve: no verification URL exists in the verification session' : undefined}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verify
          </button>
          {[
            { label: 'Decline', action: 'decline' },
            { label: 'Require reverification now', action: 'reverify' },
          ].map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={saving}
              onClick={() => {
                if (item.action === 'reverify' && isUserDiditVerification) {
                  if (requiresActionReason(item.action) && !actionReason.trim()) {
                    setActionReasonError('A reason is required before submitting this action.');
                    focusActionReason();
                    return;
                  }
                  setShowReverificationModal(true);
                  return;
                }
                void apply(item.action);
              }}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white hover:bg-white/[0.05] disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    >
      {!isTeam && !hasVerificationUrl && !isPendingSessionLoading && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-300">Approval Unavailable</p>
            <p className="mt-0.5 text-amber-200/90">
              This user haven't initiated an identity verification session yet. Approval is disabled until a verification session is finished.
            </p>
          </div>
        </div>
      )}
      <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <label className="mb-4 block text-xs text-zinc-500">
          Reason for verification action{' '}
          <span className="text-red-400">* (required for Didit status actions)</span>
          <textarea
            ref={actionReasonRef}
            value={actionReason}
            onChange={(event) => {
              setActionReason(event.target.value);
              if (event.target.value.trim()) setActionReasonError('');
            }}
            required={Boolean(loadDiditDetails) && !isAlreadyApproved}
            aria-invalid={Boolean(actionReasonError)}
            aria-describedby={actionReasonError ? 'verification-action-reason-error' : undefined}
            maxLength={1000}
            rows={3}
            placeholder="Explain why this verification is being approved, declined, or sent for reverification"
            className={`mt-1 w-full resize-y rounded-lg border bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-zinc-600 ${
              actionReasonError ? 'border-red-500/70' : 'border-white/[0.1]'
            }`}
          />
          {actionReasonError && (
            <span id="verification-action-reason-error" className="mt-1 block text-red-400">
              {actionReasonError}
            </span>
          )}
        </label>
        {showReverificationModal && isUserDiditVerification && (
          <fieldset className="fixed inset-0 z-[60] m-0 flex items-center justify-center border-0 bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12131a] p-5 shadow-2xl">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Required for reverification
            </legend>
            <p className="mb-3 text-xs text-zinc-500">
              Select only the evidence the user must submit again. This selection is applied when you choose “Require reverification now”.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'idDocument', label: 'ID document (front and back)' },
                { key: 'liveness', label: 'Liveness' },
                { key: 'faceMatch', label: 'Face match' },
                { key: 'ipAnalysis', label: 'IP analysis' },
              ].map(({ key, label }) => {
                const checked = reverificationRequirements[key as keyof typeof reverificationRequirements];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
                        : 'border-white/[0.1] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setReverificationRequirements((current) => ({ ...current, [key]: !current[key as keyof typeof current] }));
                        setActionReasonError('');
                      }}
                      className="h-4 w-4 accent-amber-400"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowReverificationModal(false)}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !Object.values(reverificationRequirements).some(Boolean)}
                onClick={() => void apply('reverify').then((submitted) => { if (submitted !== false) setShowReverificationModal(false); })}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Requesting...' : 'Request reverification'}
              </button>
            </div>
            </div>
          </fieldset>
        )}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {loadDiditDetails && (
            <div>
              <p className="text-xs text-zinc-500">Account status</p>
              <p className={`font-medium ${diditDetails?.isVerified ? 'text-emerald-300' : 'text-zinc-300'}`}>
                {diditLoading ? 'Loading...' : diditDetails?.isVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-500">Current status</p>
            <p className={verification.isExpired ? 'font-medium text-amber-300' : 'font-medium text-white'}>
              {diditDetails?.verificationStatus || verification.status}
            </p>
          </div>
          {loadDiditDetails && (
            !diditDetails?.isTeam && (
            <div>
              <p className="text-xs text-zinc-500">KYC status</p>
              <p className="font-medium text-white">
                {diditLoading ? 'Loading...' : diditDetails?.kycStatus || '—'}
              </p>
            </div>
            )
          )}
          <div>
            <p className="text-xs text-zinc-500">Verification expires</p>
            <p className="font-medium text-white">{formatDate(verification.expiresAt)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Validity period</p>
            <p className="font-medium text-white">{storedValidityLabel}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
            Verification length
          </p>
          <p className="mt-1 text-sm font-medium text-white">1 year</p>
          <p className="mt-1 text-xs text-emerald-100/80">
            Verify sets this account as verified for 1 year from today.
          </p>
        </div>

        {loadDiditDetails ? (
          <DiditVerificationPanel details={diditDetails} loading={diditLoading} error={diditError} />
        ) : verification.document ? (
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-white">{verification.document.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                By: {verification.document.uploadedBy} · Application ID: {verification.applicationId}
              </p>
              <p className="text-xs text-zinc-500">
                {verification.document.pages} pages · {verification.document.sizeMb} MB · Uploaded{' '}
                {formatDateTime(verification.document.uploadedAt)}
              </p>
            </div>
            <button type="button" className="text-zinc-400 hover:text-white">
              <Download className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div>
            <p className="font-medium text-white">No uploaded business document</p>
            <p className="mt-1 text-xs text-zinc-500">Application ID: {verification.applicationId}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Verification is tracked via verifications. Verify sets it for 1 year.
            </p>
          </div>
        )}
      </div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-400">Verification process logs</h3>
      <ul className="space-y-4 border-l border-white/[0.08] pl-4">
        {verification.logs.length === 0 && <li className="text-sm text-zinc-500">No verification logs yet.</li>}
        {verification.logs.map((log) => (
          <li key={log.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
            <p className="text-sm font-medium text-white">{log.title}</p>
            <p className="text-xs text-zinc-500">
              {log.timeAgo} · By: {log.by} · ID: {log.ref}
            </p>
          </li>
        ))}
      </ul>
    </ModalShell>
    </>
  );
}

export function HistoryModal({
  entityName,
  accountId,
  history,
  onClose,
  onChanged,
  canLiftPoints = false,
  showPunishments = false,
  meritPenalties,
  forTeam = false,
  leader = null,
}: {
  entityName: string;
  accountId?: string;
  history: PlatformTeam['history'];
  /** Team record: warnings issued through the team (carried by its leaders), no team merit. */
  forTeam?: boolean;
  leader?: TeamLeader | null;
  /** Running automatic punishments, shown next to merit (members only). */
  meritPenalties?: MeritPenaltyLike[] | null;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
  /** Admin and Support may lift warning points (members only; teams have no merit). */
  canLiftPoints?: boolean;
  /** Members only: list automatic merit punishments (Admin and Support can end one early). */
  showPunishments?: boolean;
}) {
  const [rescindingId, setRescindingId] = useState<string | null>(null);
  const liftableWarnings = history.violations
    .filter((v) => v.violationId && isActiveWarning(v))
    .map((v) => ({ violationId: v.violationId as string, label: `${v.type} (${v.id})`, points: Number(v.points) || 0 }));
  const activeDisputes =
    history.activeDisputes?.length
      ? history.activeDisputes
      : history.activeDispute
        ? [history.activeDispute]
        : [];
  const displayedMerit =
    history.merit != null && Number.isFinite(Number(history.merit))
      ? Number(history.merit)
      : meritFromWarnings(history.violations);
  const activeViaTeam = history.violations.filter((v) => isActiveWarning(v)).length;

  return (
    <ModalShell title={`${entityName} history`} subtitle={history.summaryLabel} onClose={onClose}>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {forTeam ? (
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-zinc-500">Leader merit</p>
            <p className="text-2xl font-bold text-white">{leader?.merit ?? '—'}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
              {leader ? `${leader.name} · ${leader.merit != null ? meritBandLabel(leader.merit) : leader.status}` : 'No active leader'}
            </p>
            <p className="mt-2 text-[11px] text-zinc-500">
              Teams have no merit. {activeViaTeam} active warning{activeViaTeam === 1 ? '' : 's'} issued through this team
              {history.activeWarningPoints ? ` (${history.activeWarningPoints} pts)` : ''}.
            </p>
            {leader?.meritPenalties?.length ? (
              <div className="mt-2">
                <StaffPunishmentChips penalties={leader.meritPenalties} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-xs text-zinc-500">Platform Merit</p>
            <p className="text-2xl font-bold text-white">{displayedMerit}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{meritBandLabel(displayedMerit)}</p>
            {showPunishments ? (
              <div className="mt-2">
                <StaffPunishmentChips penalties={meritPenalties} showNone />
              </div>
            ) : null}
          </div>
        )}
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Total violations</p>
          <p className="text-2xl font-bold text-white">{history.totalViolations}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Total disputes</p>
          <p className="text-2xl font-bold text-white">{history.totalDisputes}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">Active disputes</p>
          <p className="text-2xl font-bold text-amber-300">{activeDisputes.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Active disputes</h3>
          {activeDisputes.length > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Needs attention
            </span>
          )}
        </div>
        {activeDisputes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
            No active disputes for this account.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeDisputes.map((d, index) => (
              <li
                key={d.id || `${d.title}-${index}`}
                className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-amber-100">{d.title}</p>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                    {d.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{d.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Handled by {d.handler || d.by || 'Staff'} · Against {d.against || '—'}
                  {d.id ? ` · ${d.id}` : ''}
                  {d.timeAgo ? ` · ${d.timeAgo}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showPunishments && accountId ? (
        <MeritPenaltiesPanel accountId={accountId} canEnd={canLiftPoints} refreshKey={history} onChanged={onChanged} />
      ) : null}

      {canLiftPoints && accountId && liftableWarnings.length > 0 ? (
        <LiftWarningPointsPanel accountId={accountId} activeWarnings={liftableWarnings} onLifted={onChanged} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">
            {forTeam ? 'Warnings issued through this team' : 'Violation history'}
          </h3>
          <ul className="space-y-3">
            {history.violations.length === 0 && (
              <p className="text-sm text-zinc-500">
                {forTeam ? 'No warnings have been issued through this team.' : 'No violations on record.'}
              </p>
            )}
            {history.violations.map((v) => (
              <li key={v.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p className="font-medium text-white">{v.type}</p>
                {forTeam && v.issuedToName ? (
                  <p className="mt-0.5 text-xs text-sky-300">
                    Issued to leader {v.issuedToName}
                    {v.issuedToHandle ? ` (@${v.issuedToHandle})` : ''}
                    {leader && v.accountId && String(v.accountId) !== String(leader.accountId) ? ' · former leader' : ''}
                  </p>
                ) : !forTeam && v.viaTeamName ? (
                  <p className="mt-0.5 text-xs text-sky-300">As leader of Team {v.viaTeamName}</p>
                ) : null}
                <p className="mt-1 text-zinc-500">{v.reason}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  By: {v.by} · {v.points} warning points
                  {v.originalPoints != null && Number(v.originalPoints) > Number(v.points) && String(v.status || '').toLowerCase() !== 'lifted'
                    ? ` (${Number(v.originalPoints) - Number(v.points)} of ${v.originalPoints} lifted)`
                    : ''}
                  {Number(v.points) > 0
                    ? isActiveWarning(v)
                      ? ` · currently −${v.points} merit`
                      : ' · no longer deducts merit'
                    : ''}
                  {' · '}{v.id} · {v.timeAgo}
                  {v.expiresAt ? ` · expires ${new Date(v.expiresAt).toLocaleDateString()}` : ''}
                  {String(v.status || '').toLowerCase() === 'rescinded'
                    ? ' · rescinded'
                    : String(v.status || '').toLowerCase() === 'lifted'
                      ? ' · points lifted'
                      : v.active === false ? ' · inactive' : ''}
                </p>
                {(v.accountId || accountId) && v.violationId && isActiveWarning(v) ? (
                  <button
                    type="button"
                    disabled={rescindingId === v.violationId}
                    onClick={async () => {
                      setRescindingId(v.violationId || null);
                      try {
                        // A team's warnings sit on the leader's account: rescind them there.
                        await rescindWarning(String(v.accountId || accountId), v.violationId || '');
                        await onChanged?.();
                      } catch (err) {
                        handleAccountActionError(err);
                      } finally {
                        setRescindingId(null);
                      }
                    }}
                    className="mt-2 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200"
                  >
                    {rescindingId === v.violationId ? 'Rescinding…' : 'Rescind warning'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">All disputes</h3>
          <ul className="space-y-3">
            {history.disputes.length === 0 && (
              <p className="text-sm text-zinc-500">No disputes on record.</p>
            )}
            {history.disputes.map((d) => {
              const isActive = !String(d.status)
                .toLowerCase()
                .match(/resolv|closed|dismiss/);
              return (
                <li
                  key={d.id}
                  className={`rounded-lg p-3 text-sm ${
                    isActive
                      ? 'border border-amber-500/20 bg-amber-500/[0.06]'
                      : 'bg-white/[0.03]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{d.title}</p>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-zinc-500">{d.description}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    By: {d.by} · {d.status} · {d.id} · {d.timeAgo}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-white">Account activity</h3>
        <ul className="space-y-3">
          {(!history.activity || history.activity.length === 0) && (
            <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
              No account activity recorded yet.
            </p>
          )}
          {(history.activity || []).map((item) => (
            <li key={item.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-white">{item.action}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {item.eventCode.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {item.actorName || 'System'}
                {item.actorRole ? ` · ${item.actorRole}` : ''}
                {' · '}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'}
                {item.referencePrefix && item.referenceId
                  ? ` · ${item.referencePrefix}-${String(item.referenceId).slice(0, 8)}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  );
}

export function WarnAccountModal({
  entityName,
  accountId,
  onClose,
  onChanged,
  team,
}: {
  entityName: string;
  accountId: string;
  onClose: () => void;
  onChanged?: () => void;
  /** Team targets: teams have no Platform Merit, so the warning lands on the team leader. */
  team?: { leader: TeamLeader | null };
}) {
  const [warningId, setWarningId] = useState('harassment');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const leader = team?.leader ?? null;
  const blocked = Boolean(team) && !leader;

  return (
    <ModalShell
      title={team ? `Warn the leader of ${entityName}` : `Warn ${entityName}`}
      subtitle={team && leader ? `Issued to ${leader.name}${leader.username ? ` (@${leader.username})` : ''}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || blocked || !reason.trim() || !warningId}
            onClick={async () => {
              if (blocked || !reason.trim() || !warningId) return;
              setSaving(true);
              try {
                await warnAccount(accountId, {
                  warningId,
                  reason,
                });
                onChanged?.();
                onClose();
              } catch (err) {
                handleAccountActionError(err);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Issuing…' : team ? 'Warn the leader' : 'Issue warning'}
          </button>
        </div>
      }
    >
      {team ? (
        blocked ? (
          <p className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200">
            This team has no active leader to warn. Lock the team, or assign an owner with Transfer ownership first.
          </p>
        ) : (
          <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-100">
            <p>
              Teams have no Platform Merit, so this warning goes on{' '}
              <span className="font-semibold text-white">{leader?.name}</span>’s personal record
              {leader?.merit != null ? ` (merit ${leader.merit} now)` : ''} and is listed on the team’s record.
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              The leader is told it came with the team. If another member did it, warn that member from the Users tab
              instead. The automatic punishment ladder applies to the leader as usual.
            </p>
          </div>
        )
      ) : null}
      <WarningPresetFields
        desk="admin"
        warningId={warningId}
        reason={reason}
        onWarningId={setWarningId}
        onReason={setReason}
      />
    </ModalShell>
  );
}

export function UserOverviewModal({
  user,
  onClose,
  onOpenCredit,
  onOpenVerification,
  onOpenHistory,
}: {
  user: PlatformUserAccount;
  onClose: () => void;
  onOpenCredit?: () => void;
  onOpenVerification?: () => void;
  onOpenHistory?: () => void;
}) {
  const { profile, loading, error, reload } = useAccountProfile(user.accountId);
  const merit = profile?.standing?.merit ?? user.merit ?? user.history?.merit ?? DEFAULT_MERIT;

  return (
    <ModalShell
      title={user.name}
      subtitle={`ID: ${user.profileId} · Account ID: ${user.accountId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <PublicProfileLink memberPath={`/profile/${user.accountId}`} />
          {onOpenCredit && (
            <button
              type="button"
              onClick={onOpenCredit}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Credits & wallet
            </button>
          )}
          {onOpenVerification && (
            <button
              type="button"
              onClick={onOpenVerification}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Verification
            </button>
          )}
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm text-white hover:bg-white/[0.05]"
            >
              Violations & disputes
            </button>
          )}
        </div>
      }
    >
      {/* Identity header with avatar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
        <ProfileAvatar path={user.avatarPath} name={user.name} size="xl" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">
            {[user.profile?.firstName, user.profile?.middleName, user.profile?.lastName, user.profile?.suffix]
              .filter(Boolean)
              .join(' ') || user.name}
          </p>
          <p className="text-sm text-zinc-400">@{user.username}</p>
          {user.tagline && <p className="mt-1 text-sm italic text-zinc-500">“{user.tagline}”</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
              Merit {merit}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">{user.status}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-300">
              {user.verificationStatus}
            </span>
            {user.forumTimeout && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                Forum timeout
              </span>
            )}
            {user.staffRole && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-200">
                Staff · {user.staffRole}
              </span>
            )}
            {user.profile?.subscriptionPlan && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                {user.profile.subscriptionPlan}
              </span>
            )}
          </div>
        </div>
      </div>

      {user.description && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">About</p>
          <p className="mt-1 whitespace-pre-line text-sm text-zinc-300">{user.description}</p>
        </div>
      )}
      {profile?.introduction && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Introduction</p>
          <p className="mt-1 whitespace-pre-line text-sm text-zinc-300">{profile.introduction}</p>
        </div>
      )}

      {profile && <StandingSection profile={profile} />}

      {/* Account */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Account</p>
      <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Platform Merit</dt>
          <dd className="text-white">
            {merit}
            <span className="ml-2 text-xs text-zinc-500">{meritBandLabel(merit)} · 100 minus active warnings</span>
            <div className="mt-1">
              <StaffPunishmentChips penalties={profile?.standing?.meritPenalties ?? user.meritPenalties} showNone />
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-white">
            {user.email}
            {user.profile?.isEmailVerified ? (
              <span className="ml-2 text-xs text-emerald-300">Verified</span>
            ) : (
              <span className="ml-2 text-xs text-amber-300">Unverified</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Display name</dt>
          <dd className="text-white">{user.displayName || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Joined</dt>
          <dd className="text-zinc-300">{formatDateTime(user.joinedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Last activity</dt>
          <dd className="text-zinc-300">{formatDateTime(profile?.lastActivityAt ?? user.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Verification</dt>
          <dd className="text-white">
            {user.verificationStatus}
            {user.verification?.expiresAt && (
              <span className="ml-2 text-xs text-zinc-500">
                {user.verification.isExpired ? 'expired' : 'expires'} {formatDate(user.verification.expiresAt)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Subscription</dt>
          <dd className="text-zinc-300">{user.profile?.subscriptionPlan || 'No subscription'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Violations / disputes</dt>
          <dd className="text-zinc-300">
            {user.history?.totalViolations ?? 0} violation(s) · {user.history?.openDisputes ?? 0} open of{' '}
            {user.history?.totalDisputes ?? 0} dispute(s)
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Onboarding</dt>
          <dd className="text-zinc-300">{user.profile?.completedOnboarding || 'Not completed'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Payment profile</dt>
          <dd className="text-white">{user.hasPaymentProfile ? 'Linked' : 'Not linked'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Firebase account</dt>
          <dd className="text-white">{user.hasFirebase ? 'Linked' : 'Not linked'}</dd>
        </div>
      </dl>

      {/* Personal details */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-600">Personal details</p>
      <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Birth date</dt>
          <dd className="text-zinc-300">{formatDate(user.profile?.birthDate ?? null)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Country</dt>
          <dd className="text-zinc-300">{user.profile?.country || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Address</dt>
          <dd className="text-zinc-300">{user.profile?.address || '—'}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Zip code</dt>
          <dd className="text-zinc-300">{user.profile?.zipCode ?? '—'}</dd>
        </div>
      </dl>

      {/* Team memberships */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Team memberships
          </p>
          <span className="text-xs text-zinc-500">{user.teams?.length ?? 0} team(s)</span>
        </div>
        {user.teams?.length ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {user.teams.map((team) => (
              <div
                key={team.teamId}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <ProfileAvatar path={team.avatarPath} name={team.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{team.name}</p>
                  {team.handle && <p className="text-xs text-zinc-500">@{team.handle}</p>}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                      {team.role}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-400">
                      Membership: {team.membershipStatus}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-zinc-400">
                      Team: {team.teamStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Joined {formatDate(team.joinedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-500">
            This user is not part of any team.
          </p>
        )}
      </div>

      <ProfileDetailsState loading={loading} error={error} onRetry={() => void reload()} />
      {profile && (
        <>
          <WorkSection profile={profile} />
          <CommunitySection profile={profile} />
        </>
      )}
      <CreditTotalsSection
        profile={profile}
        walletBalance={user.walletBalance ?? user.stats.totalCredits}
        frozenBalance={user.frozenBalance ?? 0}
      />
    </ModalShell>
  );
}
