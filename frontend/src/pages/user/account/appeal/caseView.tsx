import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Eye, FileText, Headphones, MessagesSquare, Scale, Users } from 'lucide-react';
import type { CaseAccess } from '@/lib/cases';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import { formatStandingWhen } from '@/lib/standing';
import {
  Avatar,
  DisputeSettlementCard,
  MentionText,
  type DisputeSettlement,
  type MentionMap,
} from '@/pages/user/disputes/disputeUi';
import {
  CaseProgress,
  ComplaintText,
  FiledEvidencePanel,
  Panel,
  PartyTile,
  StepDot,
  relativeTime,
  type FiledEvidence,
  type StepState,
} from '@/pages/user/disputes/publicDisputeParts';

/**
 * The pieces of a case page in Cases, in the same visual language as the public dispute page:
 * a header card with chips and parties, and a side column of panels. `CaseInbox` owns the data.
 */

export type CaseParty = { accountId: string; name: string; handle: string | null; avatar?: string | null };

/** `details` on a party's dispute read (`loadDisputeCaseDetails`). */
export type DisputeCaseDetails = {
  type?: string;
  title?: string | null;
  complaint?: string | null;
  /** Files filed with the complaint: the filer's own, or (once public) what the disputee answers. */
  evidence?: FiledEvidence | null;
  filedAt?: string | null;
  disputer?: CaseParty | null;
  disputee?: CaseParty | null;
  /** People the filer (or staff) named with the disputee's team. */
  namedMembers?: (CaseParty & { role: string | null; isLeader: boolean; teamName: string | null })[];
  namedScope?: 'leader' | 'selected' | 'all' | null;
  contract?: { id: string; title: string | null; kind: string; status: string | null; rateCredits: number } | null;
  creditsInvolved?: number;
  conductOnly?: boolean;
  outcome?: { key: string | null; label: string; notes: string | null; decidedAt: string | null } | null;
};

export type TicketCaseInfo = {
  number?: string | null;
  subject?: string | null;
  type?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
  autoClosesAt?: string | null;
  people?: number;
  assignee?: { name: string; role?: string | null } | null;
  requester?: { accountId: string; name: string; username?: string | null } | null;
  formValues?: { label: string; value: string }[];
  satisfactionScore?: number | null;
};

/** `notices`: rulings and platform notices on a dispute, support's replies on a ticket. */
export type CaseStats = { replies: number; notices: number; people: number };

export function credits(amount?: number) {
  const value = Number(amount || 0);
  return `${value.toLocaleString()} credit${value === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function HeaderChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'blue' | 'violet' | 'gray' }) {
  const tones = {
    neutral: 'border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300',
    amber: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    blue: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    violet: 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
    gray: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300',
  } as const;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Stage chip: amber when the case waits on the member, gray once closed. */
export function StageChip({ access }: { access?: CaseAccess | null }) {
  if (!access?.stageLabel) return null;
  return (
    <HeaderChip tone={access.closed ? 'gray' : access.needsYou ? 'amber' : 'blue'}>{access.stageLabel}</HeaderChip>
  );
}

/** Disputer vs disputee, from the case details, with the people named with the disputee's team. */
export function DisputeParties({
  details,
  viewerRole,
  viewerAccountId,
  namedMember = false,
}: {
  details: DisputeCaseDetails;
  viewerRole?: string | null;
  viewerAccountId?: string | null;
  /** The viewer is named with the team rather than being the disputee account. */
  namedMember?: boolean;
}) {
  const person = (party?: CaseParty | null) =>
    party ? { accountId: party.accountId, name: party.name, handle: party.handle, avatar: party.avatar || null } : undefined;
  const named = details.namedMembers || [];
  const teamName = named.find((member) => member.teamName)?.teamName || details.disputee?.name || 'their team';
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <PartyTile role="disputer" person={person(details.disputer)} isYou={viewerRole === 'disputer'} />
        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-black tracking-widest text-gray-400 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-500">
          VS
        </span>
        <PartyTile
          role="disputee"
          person={person(details.disputee)}
          isYou={viewerRole === 'disputee' && !namedMember}
          align="right"
        />
      </div>
      {named.length ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 py-2 dark:border-cyan-500/20 dark:bg-cyan-500/[0.06]">
          <span className="mr-auto text-[11px] font-semibold text-cyan-800 dark:text-cyan-200">
            <Users className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {details.namedScope === 'all' ? `Everyone on ${teamName}` : `Named with ${teamName}`}
          </span>
          {named.slice(0, 8).map((member) => {
            const you = Boolean(viewerAccountId && member.accountId === viewerAccountId);
            return (
              <span
                key={member.accountId}
                className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-semibold ${
                  you
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                    : 'border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
                }`}
              >
                <img
                  src={constructAvatarUrl(member.avatar || null, member.name)}
                  alt=""
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = getFallbackAvatarUrl(member.name);
                  }}
                  className="h-5 w-5 rounded-full object-cover"
                />
                {member.handle ? `@${member.handle}` : member.name}
                {member.isLeader ? <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300">Leader</span> : null}
                {you ? <span className="text-[9px] font-bold uppercase tracking-wide">You</span> : null}
              </span>
            );
          })}
          {named.length > 8 ? (
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">+{named.length - 8} more</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const TILE =
  'flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02]';

/** Who opened the ticket, and who at support has it. */
export function TicketParties({ ticket, accountId }: { ticket: TicketCaseInfo; accountId: string }) {
  const requester = ticket.requester;
  const isYou = Boolean(requester && requester.accountId === accountId);
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
      <div className={TILE}>
        <Avatar name={requester?.name || 'You'} size="md" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{requester?.name || 'Member'}</span>
            {isYou ? (
              <span className="shrink-0 rounded-full bg-gray-900 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-gray-900">
                You
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-zinc-400">
            Opened the ticket{requester?.username ? ` · @${requester.username}` : ''}
          </span>
        </span>
      </div>
      <div className={TILE}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Headphones className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
            {ticket.assignee?.name || 'Support team'}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-zinc-400">
            {ticket.assignee ? ticket.assignee.role || 'Support' : 'Waiting for a staff member'}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Side panels                                                         */
/* ------------------------------------------------------------------ */

function InfoRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="space-y-2 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3">
          <dt className="shrink-0 text-gray-500 dark:text-zinc-500">{row.label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-gray-800 dark:text-zinc-200">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TicketProgress({ ticket, access }: { ticket: TicketCaseInfo; access?: CaseAccess | null }) {
  const closed = Boolean(access?.closed);
  const steps: { label: string; detail: string; state: StepState }[] = [
    { label: 'Opened', detail: ticket.createdAt ? formatStandingWhen(ticket.createdAt) : 'Received', state: 'done' },
    {
      label: access?.needsYou ? 'Waiting for you' : 'With support',
      detail: closed ? 'Handled' : access?.needsYou ? 'Support asked you something' : 'Support is looking into it',
      state: closed ? 'done' : 'current',
    },
    {
      label: 'Closed',
      detail: closed ? (ticket.closedAt ? formatStandingWhen(ticket.closedAt) : 'Done') : 'Not yet',
      state: closed ? 'done' : 'upcoming',
    },
  ];
  return (
    <ol>
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 ? (
            <span
              className={`absolute left-[9px] top-6 h-[calc(100%-1.25rem)] w-0.5 rounded ${
                step.state === 'done' ? 'bg-emerald-400/70' : 'bg-gray-200 dark:bg-white/10'
              }`}
            />
          ) : null}
          <StepDot state={step.state} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${step.state === 'upcoming' ? 'text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-white'}`}>
              {step.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function yourPart(access?: CaseAccess | null) {
  const role = access?.viewerRole;
  const title =
    role === 'disputer'
      ? access?.viaTeam
        ? 'Your team filed this dispute'
        : 'You filed this dispute'
      : role === 'disputee'
        ? access?.namedMember
          ? 'You’re named with your team'
          : access?.viaTeam
            ? 'Your team is named in this dispute'
            : 'You’re named in this dispute'
        : role === 'participant'
          ? 'You were added to this ticket'
          : 'You opened this ticket';
  return { title, detail: access?.canReply ? access.replyHint : access?.readOnlyReason };
}

function YourPartPanel({ access, children }: { access?: CaseAccess | null; children?: ReactNode }) {
  const part = yourPart(access);
  return (
    <Panel title="Your part" icon={<Eye className="h-3 w-3" />}>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{part.title}</p>
      {part.detail ? <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{part.detail}</p> : null}
      {access?.attention && !access.closed ? (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          {access.attention}
        </p>
      ) : null}
      {children}
    </Panel>
  );
}

function ActivityPanel({
  stats,
  openedLabel,
  openedAt,
  lastAt,
  noticeLabel,
}: {
  stats: CaseStats;
  openedLabel: string;
  openedAt?: string | null;
  lastAt?: string | null;
  noticeLabel: string;
}) {
  return (
    <Panel title="Activity" icon={<MessagesSquare className="h-3 w-3" />}>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Replies', value: stats.replies },
          { label: noticeLabel, value: stats.notices },
          { label: 'People', value: stats.people },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-gray-50 px-2 py-2.5 dark:bg-white/[0.03]">
            <p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <InfoRows
          rows={[
            { label: openedLabel, value: openedAt ? formatStandingWhen(openedAt) : '—' },
            { label: 'Last activity', value: relativeTime(lastAt) || '—' },
          ]}
        />
      </div>
    </Panel>
  );
}

function TipsPanel({ tips }: { tips: string[] }) {
  return (
    <Panel title="Good to know" icon={<BookOpen className="h-3 w-3" />}>
      <ul className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-zinc-500" />
            {tip}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The side column of a dispute: progress, your part, payout, case file, complaint, activity. */
export function DisputeSidePanels({
  details,
  access,
  settlement,
  mentions,
  stats,
  lastAt,
  reopened,
  onPreview,
}: {
  details: DisputeCaseDetails | null;
  access?: CaseAccess | null;
  settlement?: DisputeSettlement | null;
  mentions?: MentionMap;
  stats: CaseStats;
  lastAt?: string | null;
  reopened: boolean;
  /** Opens an image from the filed evidence. */
  onPreview?: (url: string) => void;
}) {
  const closed = Boolean(access?.closed);
  const escrowLine = details?.conductOnly
    ? 'The contract had ended, so its payments are final. Staff decide on conduct only.'
    : closed
      ? 'Decided. Any payout is listed with the ruling.'
      : details?.creditsInvolved
        ? 'On hold until staff decide.'
        : null;
  return (
    <>
      <Panel title="Case progress" icon={<Scale className="h-3 w-3" />}>
        <CaseProgress
          discussion={{
            id: access?.id || '',
            status: access?.status,
            createdAt: details?.filedAt || null,
            resolvedAt: details?.outcome?.decidedAt || null,
            messages: [],
          }}
          reopened={reopened}
          layout="column"
        />
      </Panel>
      <YourPartPanel access={access} />
      <DisputeSettlementCard settlement={settlement} />
      {details ? (
        <Panel title="Case details" icon={<ClipboardList className="h-3 w-3" />}>
          <InfoRows
            rows={[
              ...(details.contract
                ? [
                    {
                      label: 'Order',
                      value: (
                        <>
                          {details.contract.kind}
                          {details.contract.title ? <span className="block font-normal text-gray-500 dark:text-zinc-400">“{details.contract.title}”</span> : null}
                        </>
                      ),
                    },
                  ]
                : []),
              ...(details.contract?.status ? [{ label: 'Contract', value: details.contract.status }] : []),
              ...(details.contract?.rateCredits ? [{ label: 'Contract value', value: credits(details.contract.rateCredits) }] : []),
              ...(details.creditsInvolved || escrowLine
                ? [
                    {
                      label: 'Credits involved',
                      value: (
                        <>
                          {details.creditsInvolved ? credits(details.creditsInvolved) : '—'}
                          {escrowLine ? <span className="block font-normal text-gray-500 dark:text-zinc-400">{escrowLine}</span> : null}
                        </>
                      ),
                    },
                  ]
                : []),
              {
                label: 'Visibility',
                value: access?.visibility ? 'Public' : 'Private (you and staff)',
              },
              ...(details.outcome
                ? [
                    {
                      label: 'Decision',
                      value: (
                        <>
                          {details.outcome.label}
                          {details.outcome.decidedAt ? (
                            <span className="block font-normal text-gray-500 dark:text-zinc-400">{formatStandingWhen(details.outcome.decidedAt)}</span>
                          ) : null}
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {details.outcome?.notes ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-600 dark:bg-white/[0.03] dark:text-zinc-400">
              <MentionText text={details.outcome.notes} mentions={mentions} />
            </p>
          ) : null}
        </Panel>
      ) : null}
      {details?.complaint ? (
        <Panel title="Original complaint" icon={<FileText className="h-3 w-3" />}>
          {details.title ? <p className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">{details.title}</p> : null}
          <ComplaintText text={details.complaint} mentions={mentions} />
        </Panel>
      ) : null}
      <FiledEvidencePanel
        evidence={details?.evidence}
        viewerRole={access?.viewerRole}
        isPublic={Boolean(access?.visibility)}
        onPreview={onPreview}
      />
      <ActivityPanel stats={stats} openedLabel="Filed" openedAt={details?.filedAt} lastAt={lastAt} noticeLabel="Notices" />
      <TipsPanel
        tips={[
          'Stick to facts: dates, deliveries, messages. Staff decide on evidence.',
          'Attach screenshots or files that back up your side.',
          access?.visibility
            ? 'Your replies go to staff first. They decide who else reads them.'
            : 'While the case is private, only you and staff can read it.',
        ]}
      />
    </>
  );
}

function ReportedText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320;
  return (
    <div>
      <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300 ${long && !open ? 'line-clamp-6' : ''}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-2 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
        >
          {open ? 'Show less' : 'Read all of it'}
        </button>
      ) : null}
    </div>
  );
}

/** The side column of a ticket: progress, your part, ticket details, what was reported, activity. */
export function TicketSidePanels({
  ticket,
  access,
  reported,
  stats,
  lastAt,
  children,
}: {
  ticket: TicketCaseInfo;
  access?: CaseAccess | null;
  /** The first message: what the member wrote when they opened the ticket. */
  reported?: string | null;
  stats: CaseStats;
  lastAt?: string | null;
  /** Rating, when the ticket can be rated. */
  children?: ReactNode;
}) {
  const answers = (ticket.formValues || []).filter((answer) => answer.value);
  return (
    <>
      <Panel title="Progress" icon={<Scale className="h-3 w-3" />}>
        <TicketProgress ticket={ticket} access={access} />
      </Panel>
      <YourPartPanel access={access}>{children}</YourPartPanel>
      <Panel title="Ticket details" icon={<ClipboardList className="h-3 w-3" />}>
        <InfoRows
          rows={[
            { label: 'Ticket', value: ticket.number ? `#${ticket.number}` : '—' },
            { label: 'Category', value: ticket.type || '—' },
            { label: 'Priority', value: ticket.priority || '—' },
            { label: 'Handled by', value: ticket.assignee?.name || 'Not assigned yet' },
            ...(ticket.people && ticket.people > 1 ? [{ label: 'People on it', value: String(ticket.people) }] : []),
            ...(!access?.closed && ticket.autoClosesAt
              ? [{ label: 'Closes if quiet', value: formatStandingWhen(ticket.autoClosesAt) }]
              : []),
            ...(ticket.satisfactionScore ? [{ label: 'Your rating', value: `${ticket.satisfactionScore} / 5` }] : []),
          ]}
        />
      </Panel>
      {reported || answers.length ? (
        <Panel title="What you reported" icon={<FileText className="h-3 w-3" />}>
          {ticket.subject ? <p className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">{ticket.subject}</p> : null}
          {reported ? <ReportedText text={reported} /> : null}
          {answers.length ? (
            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/5">
              <InfoRows rows={answers.map((answer) => ({ label: answer.label, value: answer.value }))} />
            </div>
          ) : null}
        </Panel>
      ) : null}
      <ActivityPanel stats={stats} openedLabel="Opened" openedAt={ticket.createdAt} lastAt={lastAt} noticeLabel="Support" />
      <TipsPanel
        tips={[
          'Reply here to add details; support sees it straight away.',
          'Screenshots help: up to 4 images, PDFs or videos per message.',
          'A ticket closes by itself after 7 days without a reply. You can still read it.',
        ]}
      />
      <p className="px-1 text-[11px] text-gray-500 dark:text-zinc-500">
        Need something else?{' '}
        <Link to="/support/ticket" className="font-semibold text-gray-700 hover:underline dark:text-zinc-300">
          Open a new ticket
        </Link>
      </p>
    </>
  );
}
