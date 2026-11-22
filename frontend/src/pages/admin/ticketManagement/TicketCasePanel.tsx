import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ExternalLink, FileWarning, Gavel, Info, Loader2, Star } from 'lucide-react';
import { staffPlatformViewHref } from '@/lib/staffRoutes';
import { BTN, EmptyNote, Fact, PanelSection, Pill } from '@/pages/moderator/shared/staffCaseUi';
import GigOrderSummary from '@/pages/moderator/shared/GigOrderSummary';
import { StaffPunishmentChips } from '@/components/account/MeritStatus';
import {
  StaffStandingSummary,
  StatusPill,
  caseDay,
  caseLabel,
  caseWhen,
} from '@/pages/moderator/shared/StaffStandingSummary';
import type {
  CaseAccountSummary,
  CaseAppeal,
  CaseAppealTarget,
  CaseAssetReviews,
  CaseBilling,
  CaseBug,
  CaseContract,
  CaseForum,
  CaseForumPost,
  CaseJobs,
  CaseListing,
  CaseMarketplace,
  CaseNamedPerson,
  CasePenaltyEvidence,
  CasePersonRef,
  CasePosting,
  CaseProposal,
  CaseReportRef,
  CaseTeam,
  CaseTeamMembership,
  CaseTicketRef,
  TicketCaseContext,
} from './ticketTypes';

/* ---------------------------------------------------------------- */
/* Small building blocks                                             */
/* ---------------------------------------------------------------- */

function Card({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'bad' | 'info' }) {
  const toneClass = {
    default: 'border-white/[0.08] bg-white/[0.02]',
    warn: 'border-amber-500/25 bg-amber-500/[0.05]',
    bad: 'border-red-500/25 bg-red-500/[0.05]',
    info: 'border-sky-500/25 bg-sky-500/[0.05]',
  }[tone];
  return <div className={`rounded-xl border p-3.5 ${toneClass}`}>{children}</div>;
}

function Row({ title, meta, right, detail }: { title: ReactNode; meta?: ReactNode; right?: ReactNode; detail?: ReactNode }) {
  return (
    <li className="rounded-lg border border-white/[0.06] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm text-zinc-200">{title}</p>
          {meta ? <p className="mt-0.5 text-[11px] text-zinc-500">{meta}</p> : null}
        </div>
        {right ? <div className="flex shrink-0 items-center gap-1.5">{right}</div> : null}
      </div>
      {detail ? <div className="mt-1.5 text-xs text-zinc-400">{detail}</div> : null}
    </li>
  );
}

function List<T>({ items, empty, render }: { items: T[] | null | undefined; empty: string; render: (item: T) => ReactNode }) {
  if (!items || items.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return <ul className="space-y-1.5">{items.map(render)}</ul>;
}

function Quote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap rounded-lg border-l-2 border-white/15 bg-white/[0.02] px-3 py-2 text-sm text-zinc-200">
        {children}
      </p>
    </div>
  );
}

/**
 * What the member's item said when staff acted on it from platform view. The live item may
 * have been edited, hidden or deleted since, so appeals are judged on this copy.
 */
function PenaltyEvidence({ evidence }: { evidence?: CasePenaltyEvidence | null }) {
  if (!evidence) return null;
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Evidence saved from platform view{evidence.capturedAt ? ` · ${caseWhen(evidence.capturedAt)}` : ''}
      </p>
      <p className="mt-1 text-xs text-zinc-200">
        {evidence.kind ? <span className="text-zinc-400">{evidence.kind}: </span> : null}
        {evidence.title}
        {evidence.stateWhenActed ? <span className="text-zinc-500"> · was {evidence.stateWhenActed.toLowerCase()}</span> : null}
      </p>
      {evidence.excerpt ? (
        <p className="mt-1 whitespace-pre-wrap border-l-2 border-white/15 pl-2 text-xs text-zinc-300">{evidence.excerpt}</p>
      ) : null}
      {evidence.pairedAction || evidence.relatedReports || evidence.page ? (
        <p className="mt-1 text-[11px] text-zinc-500">
          {[
            evidence.pairedAction ? `Taken with: ${evidence.pairedAction}` : null,
            evidence.relatedReports ? `Open reports then: ${evidence.relatedReports}` : null,
            evidence.page ? `Page: ${evidence.page}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

function credits(n: number | null | undefined) {
  return `${Number(n || 0).toLocaleString()} credits`;
}

/**
 * Opens a member page in this console's platform view, in a new tab so the ticket stays open.
 * The main site has no staff session, so it is never linked directly.
 */
export function CaseOpenLink({ path, label = 'Open', title }: { path: string | null | undefined; label?: string; title?: string }) {
  const { pathname } = useLocation();
  if (!path) return null;
  return (
    <Link
      to={staffPlatformViewHref(pathname, path)}
      target="_blank"
      rel="noreferrer"
      title={title || 'See this page the way members do (opens platform view)'}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:border-white/20 hover:text-white"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </Link>
  );
}

/** Member pages platform view can show; contracts and projects are members-only. */
export function staffViewablePath(path: string | null | undefined) {
  return path && /^\/(?:assets|jobs|gigs|teams|forums|profile|disputes)\//.test(path) ? path : null;
}

/** A person by name and @handle, linked to their profile in platform view. */
function PersonLink({ person }: { person: CasePersonRef | null | undefined }) {
  const { pathname } = useLocation();
  if (!person) return <>—</>;
  const text = (
    <>
      {person.name || 'Unknown'}
      {person.handle ? <span className="text-zinc-500"> @{person.handle}</span> : null}
    </>
  );
  if (!person.accountId) return text;
  return (
    <Link
      to={staffPlatformViewHref(pathname, `/profile/${person.accountId}`)}
      target="_blank"
      rel="noreferrer"
      title="Open their profile in platform view (new tab)"
      className="hover:underline"
    >
      {text}
    </Link>
  );
}

function profilePath(account: { accountId: string; type?: string | null } | null | undefined) {
  // Team accounts have a team page, not a profile; their id here is the account, not the team.
  if (!account?.accountId || String(account.type || '').toLowerCase() === 'team') return null;
  return `/profile/${account.accountId}`;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-300" aria-label={`${value} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < value ? 'fill-current' : 'opacity-30'}`} />
      ))}
    </span>
  );
}

function membershipLine(m: CaseTeamMembership | null | undefined) {
  if (!m) return 'Never on this team';
  return [
    `${m.role} · ${m.status}`,
    m.joinedAt ? `joined ${caseDay(m.joinedAt)}` : null,
    m.status === 'Removed' && m.changedAt ? `removed ${caseDay(m.changedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function TicketRefs({ title, items, empty }: { title: string; items: CaseTicketRef[]; empty: string }) {
  return (
    <PanelSection title={title} count={items.length}>
      <List
        items={items}
        empty={empty}
        render={(t) => (
          <Row
            key={t.id}
            title={`${t.number} · ${t.type}`}
            meta={[t.requester, caseWhen(t.createdAt)].filter(Boolean).join(' · ')}
            right={<StatusPill status={t.status} />}
          />
        )}
      />
    </PanelSection>
  );
}

function ReportRefs({ title, items, empty }: { title: string; items: CaseReportRef[] | null | undefined; empty: string }) {
  return (
    <PanelSection title={title} count={items?.length || 0}>
      <List
        items={items}
        empty={empty}
        render={(r) => (
          <Row
            key={r.id}
            title={`${r.number} · ${caseLabel(r.type)}`}
            meta={[r.targetType ? caseLabel(r.targetType) : null, r.reporter ? `by ${r.reporter}` : null, caseWhen(r.createdAt)]
              .filter(Boolean)
              .join(' · ')}
            right={<StatusPill status={r.status} />}
          />
        )}
      />
    </PanelSection>
  );
}

function MemberSection({ title, account, empty }: { title: string; account: CaseAccountSummary | null | undefined; empty: string }) {
  const profile = profilePath(account);
  return (
    <PanelSection title={title}>
      {account ? (
        <Card>
          <StaffStandingSummary account={account} />
          {profile ? (
            <div className="mt-2.5 flex justify-end">
              <CaseOpenLink path={profile} label="Profile" />
            </div>
          ) : null}
        </Card>
      ) : (
        <EmptyNote>{empty}</EmptyNote>
      )}
    </PanelSection>
  );
}

/* ---------------------------------------------------------------- */
/* Appeals                                                           */
/* ---------------------------------------------------------------- */

const AREA_LABEL: Record<CaseAppeal['area'], string> = {
  account: 'Account penalty',
  forum: 'Forum action',
  marketplace: 'Marketplace action',
  jobs: 'Jobs & Gigs action',
};

function acceptEffects(requester: CaseAccountSummary | null): string[] {
  if (!requester) return [];
  const effects: string[] = [];
  const status = requester.status.toLowerCase();
  if (/ban|lock|suspend/.test(status)) {
    effects.push(
      requester.statusEndsAt
        ? `${requester.status} ends within 24 hours (it is set to end ${caseWhen(requester.statusEndsAt)}).`
        : `${requester.status} ends within 24 hours (it has no end date now).`
    );
  }
  if (requester.forumTimeout) effects.push('The forum timeout ends within 24 hours.');
  if (requester.creditsFrozen) effects.push(`${credits(requester.frozenCredits)} on hold return within 24 hours.`);
  return effects;
}

const TARGET_STATE_LABEL: Record<CaseAppealTarget['state'], string> = {
  active: 'Still active',
  ended: 'Already ended',
  changed: 'Replaced by a newer penalty',
};

const APPEAL_STATE_LABEL: Record<string, string> = {
  available: 'Can appeal',
  open: 'Appeal open',
  legacy_open: 'Account-wide appeal open',
  accepted: 'Appeal accepted',
  denied: 'Denied (12-month wait)',
  denied_permanent: 'Denied permanently',
  window_closed: 'Appeal window closed',
};

/** The one penalty a per-penalty appeal is about, and what each decision does to it. */
function AppealTargetBrief({ target }: { target: CaseAppealTarget }) {
  return (
    <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-300">
      <p className="font-medium text-zinc-200">
        Appealing: {target.label}
        {target.current?.number ? ` · ${target.current.number}` : ''}
      </p>
      <p className={target.state === 'active' ? 'text-zinc-400' : 'text-amber-200'}>
        {TARGET_STATE_LABEL[target.state]}
        {target.current?.endsAt ? ` · ends ${caseWhen(target.current.endsAt)}` : target.state === 'active' ? ' · no end date' : ''}
      </p>
      <p>Accept → {target.acceptEffect}</p>
      <p className="text-zinc-400">Deny → {target.denyEffect}</p>
      {target.otherPenalties.length ? (
        <p className="text-zinc-500">
          {target.otherPenalties.length} other penalt{target.otherPenalties.length === 1 ? 'y is' : 'ies are'} not part of this appeal.
        </p>
      ) : null}
    </div>
  );
}

/** What is active on the member right now, for the decision sidebar and its confirm dialog. */
export function AppealStandingBrief({ context }: { context: TicketCaseContext | null | undefined }) {
  const target = context?.appeal?.target;
  if (target) return <AppealTargetBrief target={target} />;
  const requester = context?.requester;
  if (!requester) return null;
  const effects = acceptEffects(requester);
  const activeWarnings = requester.counts.activeWarnings;
  const hold = context?.appeal?.appeals?.hold;
  return (
    <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-300">
      <p className="font-medium text-zinc-200">
        Now: {requester.status} · Merit {requester.merit ?? '—'}
      </p>
      <StaffPunishmentChips penalties={requester.meritPenalties} />
      {effects.length ? (
        effects.map((e) => <p key={e}>Accept → {e}</p>)
      ) : (
        <p className="text-zinc-500">No ban, lock, suspension, timeout or credit hold to lift.</p>
      )}
      {activeWarnings ? (
        <p className="text-amber-200">{activeWarnings} active warning(s) stay unless rescinded.</p>
      ) : null}
      {hold?.active ? (
        <p className="text-red-200">
          {hold.permanentlyDenied ? 'Previously denied permanently.' : `Under a denial hold until ${caseDay(hold.blockedUntil)}.`}
        </p>
      ) : null}
    </div>
  );
}

function AppealCase({ appeal, requester }: { appeal: CaseAppeal; requester: CaseAccountSummary | null }) {
  const record = appeal.record;
  const activeWarnings = record?.warnings.filter((w) => w.active) || [];
  const pastWarnings = record?.warnings.filter((w) => !w.active) || [];
  const activeRestrictions = record?.restrictions.filter((r) => r.active) || [];
  const effects = acceptEffects(requester);
  const hold = appeal.appeals?.hold;
  const ref = appeal.referencedCase;
  const target = appeal.target || null;

  return (
    <>
      {target ? (
        <PanelSection title="Penalty under appeal">
          <Card tone={target.state === 'active' ? 'info' : 'warn'}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {target.label}
                  {target.current?.number ? <span className="font-normal text-zinc-400"> · {target.current.number}</span> : null}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {[
                    target.startedAt ? `Since ${caseWhen(target.startedAt)}` : null,
                    target.current ? (target.current.endsAt ? `ends ${caseWhen(target.current.endsAt)}` : 'no end date') : null,
                    target.current?.detail,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Pill
                className={
                  target.state === 'active'
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                }
              >
                {TARGET_STATE_LABEL[target.state]}
              </Pill>
            </div>
            {target.current?.reason ? <p className="mt-2 text-xs text-zinc-300">Reason on record: {target.current.reason}</p> : null}
            {target.note ? <p className="mt-2 text-xs text-amber-100">{target.note}</p> : null}
            <p className="mt-2 text-[11px] text-zinc-500">
              This appeal is about this penalty only. A decision does not change any other penalty on the account.
            </p>
          </Card>
        </PanelSection>
      ) : null}

      <PanelSection title="Appeal">
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact label="Appealing" value={target ? target.label : `${AREA_LABEL[appeal.area]} (whole account)`} />
          <Fact
            label="Decision"
            value={
              appeal.decision ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <StatusPill status={appeal.decision} />
                  <span className="text-[11px] text-zinc-500">{caseWhen(appeal.decidedAt)}</span>
                </span>
              ) : appeal.decidable ? (
                'Not decided'
              ) : (
                'Resolve by acting on the item'
              )
            }
          />
          <Fact label="Merit now" value={requester?.merit ?? '—'} />
          {appeal.actionTaken ? <Fact label="What happened (member)" value={appeal.actionTaken} /> : null}
        </dl>

        {appeal.reasonGiven ? <Quote label="Why the member says it should be reversed">{appeal.reasonGiven}</Quote> : null}
        {appeal.evidence ? <Quote label="Supporting evidence">{appeal.evidence}</Quote> : null}

        {ref ? (
          ref.found ? (
            <Card tone={ref.belongsToRequester ? 'info' : 'warn'}>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Case ID the member gave</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white">
                {caseLabel(ref.kind)} {ref.number || ref.id.slice(0, 8)}
                {ref.title ? <span className="text-zinc-400">· {caseLabel(ref.title)}</span> : null}
                <StatusPill status={ref.status} />
              </p>
              {ref.detail ? <p className="mt-1 text-xs text-zinc-400">{ref.detail}</p> : null}
              <p className="mt-1 text-[11px] text-zinc-500">
                {caseWhen(ref.createdAt)}
                {ref.belongsToRequester ? '' : ' · This record is not on the requester’s account.'}
              </p>
            </Card>
          ) : (
            <Card tone="warn">
              <p className="text-xs text-amber-100">
                The Case ID “{ref.query}” does not match any warning, dispute, report, ticket or listing.
              </p>
            </Card>
          )
        ) : null}
      </PanelSection>

      {appeal.listing ? (
        <PanelSection title="Listing the member picked">
          <ListingCard listing={appeal.listing} />
        </PanelSection>
      ) : null}
      {appeal.posting ? (
        <PanelSection title="Job or gig the member picked">
          <PostingCard posting={appeal.posting} />
        </PanelSection>
      ) : null}
      {appeal.relatedTickets ? (
        <TicketRefs title="Other tickets about this item" items={appeal.relatedTickets} empty="No other tickets name this item." />
      ) : null}

      {appeal.decidable && !appeal.decision && target ? (
        <PanelSection title="What each decision does">
          <Card tone="info">
            <ul className="space-y-1.5 text-sm text-zinc-200">
              <li>
                <span className="font-semibold text-emerald-200">Accept:</span> {target.acceptEffect}
                {target.remedies.includes('lift_now') ? (
                  <span className="text-zinc-400"> You can also lift it right away or pick an earlier end date.</span>
                ) : null}
              </li>
              <li>
                <span className="font-semibold text-amber-200">Deny:</span> {target.denyEffect}
              </li>
              <li>
                <span className="font-semibold text-red-200">Deny permanently:</span> {target.denyPermanentEffect}
              </li>
            </ul>
            <p className="mt-2 text-xs text-zinc-400">
              When denying, you can also suspend or ban the account in the same step (for example after appeal abuse).
            </p>
          </Card>
        </PanelSection>
      ) : null}

      {target ? (
        <PanelSection title="Earlier appeals on this penalty" count={target.history.length}>
          <List
            items={target.history}
            empty="This is the first appeal on this penalty."
            render={(h) => (
              <Row
                key={h.id}
                title={h.number ? `#${h.number}` : 'Appeal'}
                meta={`Filed ${caseDay(h.createdAt)}${h.decidedAt ? ` · decided ${caseDay(h.decidedAt)}` : ''}`}
                right={<StatusPill status={h.decision || h.status} />}
              />
            )}
          />
        </PanelSection>
      ) : null}

      {target ? (
        <PanelSection title="Other penalties on the account" count={target.otherPenalties.length}>
          <List
            items={target.otherPenalties}
            empty="No other active penalties."
            render={(p) => (
              <Row
                key={`${p.type}-${p.id}`}
                title={`${p.label}${p.number ? ` · ${p.number}` : ''}`}
                meta={p.endsAt ? `Ends ${caseWhen(p.endsAt)}` : 'No end date'}
                right={
                  <Pill className="border-white/15 text-zinc-300">
                    {APPEAL_STATE_LABEL[p.appealState] || caseLabel(p.appealState)}
                    {p.appealTicketNumber ? ` · #${p.appealTicketNumber}` : ''}
                  </Pill>
                }
              />
            )}
          />
        </PanelSection>
      ) : null}

      {appeal.decidable && !appeal.decision && !target ? (
        <PanelSection title="If you accept">
          <Card tone="info">
            {effects.length ? (
              <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-200">
                {effects.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-300">No ban, lock, suspension, timeout or credit hold is active right now.</p>
            )}
            {activeWarnings.length ? (
              <p className="mt-2 text-xs text-zinc-400">
                Accepting does not lift the {activeWarnings.length} active warning(s). Rescind a warning from User &amp; Team if it was
                issued by mistake.
              </p>
            ) : null}
          </Card>
        </PanelSection>
      ) : null}

      {hold?.active ? (
        <Card tone="bad">
          <p className="flex items-center gap-2 text-sm text-red-100">
            <Gavel className="h-4 w-4" />
            {hold.permanentlyDenied
              ? 'An earlier account-wide appeal was denied permanently.'
              : `An earlier account-wide denial holds back appeals until ${caseDay(hold.blockedUntil)}.`}
          </p>
          <p className="mt-1 text-[11px] text-red-200/70">
            Decided {caseWhen(hold.decidedAt)}, before appeals were per penalty. It covers only penalties that already existed then;
            anything issued after can still be appealed.
          </p>
        </Card>
      ) : null}

      <PanelSection title="Active punishments" count={activeWarnings.length + activeRestrictions.length}>
        <List
          items={[...activeRestrictions.map((r) => ({ kind: 'restriction' as const, r })), ...activeWarnings.map((w) => ({ kind: 'warning' as const, w }))]}
          empty="No active warnings or restrictions."
          render={(item) =>
            item.kind === 'restriction' ? (
              <Row
                key={`r-${item.r.id}`}
                title={`${caseLabel(item.r.type)}${item.r.module ? ` · ${caseLabel(item.r.module)}` : ''}`}
                meta={`By ${item.r.issuedBy} · ${caseWhen(item.r.startsAt)} → ${item.r.endsAt ? caseWhen(item.r.endsAt) : 'no end date'}`}
                right={<Pill className="border-red-500/30 bg-red-500/10 text-red-200">Restriction</Pill>}
              />
            ) : (
              <Row
                key={`w-${item.w.id}`}
                title={`${item.w.number || 'Warning'} · ${caseLabel(item.w.type)}`}
                meta={`${item.w.points} pt · by ${item.w.issuedBy} · ${caseWhen(item.w.createdAt)} · expires ${item.w.expiresAt ? caseDay(item.w.expiresAt) : 'never'}`}
                detail={
                  item.w.reason || item.w.evidence ? (
                    <>
                      {item.w.reason}
                      <PenaltyEvidence evidence={item.w.evidence} />
                    </>
                  ) : null
                }
                right={<Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">Warning</Pill>}
              />
            )
          }
        />
      </PanelSection>

      <PanelSection title="Standing history" count={record?.history.length || 0}>
        {record?.history.length ? (
          <ol>
            {record.history.map((h) => (
              <li key={h.id} className="relative border-l border-white/10 pb-3 pl-4 last:pb-0">
                <span className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-500" />
                <p className="text-sm text-zinc-200">
                  {h.status ? (
                    <>
                      {h.previousStatus ? `${caseLabel(h.previousStatus)} → ` : ''}
                      <span className="font-medium">{caseLabel(h.status)}</span>
                    </>
                  ) : (
                    caseLabel(h.eventCode.toLowerCase())
                  )}
                  {h.endsAt ? <span className="text-zinc-500"> · until {caseWhen(h.endsAt)}</span> : null}
                  {h.disputeNumber ? <span className="text-zinc-500"> · dispute {h.disputeNumber}</span> : null}
                </p>
                {h.reason ? <p className="text-xs text-zinc-400">{h.reason}</p> : null}
                <PenaltyEvidence evidence={h.evidence} />
                <p className="text-[11px] text-zinc-500">
                  {h.actor ? `${h.actor.name} · ${h.actor.role}` : 'System'} · {caseWhen(h.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyNote>No bans, suspensions, locks, pardons or appeal decisions on record.</EmptyNote>
        )}
      </PanelSection>

      {appeal.areaActions ? (
        <PanelSection title={`${AREA_LABEL[appeal.area]}s on record`} count={appeal.areaActions.length}>
          <List
            items={appeal.areaActions}
            empty="No actions recorded in this area."
            render={(a) => (
              <Row
                key={`${a.id}-${a.at}`}
                title={`${a.label}${a.number ? ` · ${a.number}` : ''}`}
                meta={caseWhen(a.at)}
                detail={a.reason}
                right={<StatusPill status={a.status} />}
              />
            )}
          />
        </PanelSection>
      ) : null}

      <PanelSection title="Past warnings" count={pastWarnings.length}>
        <List
          items={pastWarnings}
          empty="No expired or rescinded warnings."
          render={(w) => (
            <Row
              key={w.id}
              title={`${w.number || 'Warning'} · ${caseLabel(w.type)}`}
              meta={`${w.points} pt · by ${w.issuedBy} · ${caseDay(w.createdAt)}`}
              detail={
                w.reason || w.evidence ? (
                  <>
                    {w.reason}
                    <PenaltyEvidence evidence={w.evidence} />
                  </>
                ) : null
              }
              right={<StatusPill status={w.status} />}
            />
          )}
        />
      </PanelSection>

      <PanelSection title="Previous appeals" count={appeal.appeals?.previous.length || 0}>
        <List
          items={appeal.appeals?.previous}
          empty="This is the member’s first appeal."
          render={(p) => (
            <Row
              key={p.id}
              title={`${p.number} · ${p.targetLabel || (p.type === 'Appeal an account penalty' ? 'Whole account' : p.type)}`}
              meta={`Filed ${caseDay(p.createdAt)}${p.decidedAt ? ` · decided ${caseDay(p.decidedAt)}` : ''}`}
              right={<StatusPill status={p.decision || p.status} />}
            />
          )}
        />
      </PanelSection>

      <ReportRefs title="Reports against the member" items={appeal.reportsAgainst} empty="No reports name this member." />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Marketplace                                                       */
/* ---------------------------------------------------------------- */

const THREAD_KIND_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  resubmitted: 'Resubmitted',
  reply: 'Reply',
  approved: 'Approved',
  scheduled: 'Approved for later',
  published: 'Went live',
  rejected: 'Rejected',
  rejected_final: 'Rejected permanently',
  delisted: 'Delisted',
  rereview: 'Sent back for review',
};

function ListingThread({ thread }: { thread: NonNullable<CaseListing['thread']> }) {
  if (!thread.total) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
        Review conversation ({thread.total}){thread.total > thread.items.length ? ` · latest ${thread.items.length}` : ''}
      </p>
      <ul className="mt-1 space-y-1.5">
        {thread.items.map((entry) => (
          <li
            key={entry.id}
            className={`rounded-lg border px-2.5 py-1.5 text-xs ${
              entry.authorType === 'seller' ? 'border-sky-500/20 bg-sky-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <p className="text-[11px] text-zinc-400">
              <span className="font-medium text-zinc-200">{THREAD_KIND_LABEL[entry.kind] || caseLabel(entry.kind)}</span>
              {' · '}
              {entry.authorType === 'seller' ? 'Seller' : entry.authorType === 'system' ? 'System' : entry.authorName || 'Staff'}
              {entry.authorRole ? ` (${entry.authorRole})` : ''} · {caseWhen(entry.createdAt)}
              {entry.publishAt && (entry.kind === 'scheduled' || entry.kind === 'published') ? ` · go-live ${caseWhen(entry.publishAt)}` : ''}
            </p>
            {entry.body ? <p className="mt-0.5 whitespace-pre-wrap break-words text-zinc-300">{entry.body}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListingCard({ listing }: { listing: CaseListing }) {
  const brokenFiles = listing.asset?.files.filter((f) => f.processingError || /fail|error/i.test(f.processingStatus || '')) || [];
  const sellerStatus = listing.seller.status && !/^active$/i.test(listing.seller.status) ? listing.seller.status : null;
  const assetPath = listing.marketAssetId ? `/assets/${listing.marketAssetId}` : null;
  return (
    <Card tone={/reject|delist/i.test(listing.status) ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{listing.title}</p>
          <p className="text-[11px] text-zinc-500">
            {[listing.number, caseLabel(listing.assetType || listing.category), credits(listing.priceCredits), `listed ${caseDay(listing.createdAt)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {listing.permanentlyRejected ? (
            <Pill className="border-red-500/30 bg-red-500/10 text-red-200">Permanently rejected</Pill>
          ) : null}
          <StatusPill status={listing.status} />
          <CaseOpenLink path={assetPath} label="Asset page" title="Open the asset page in platform view (new tab). Assets not live yet may not show to members." />
        </span>
      </div>

      {listing.status === 'scheduled' && listing.publishAt ? (
        <p className="mt-2 text-xs text-sky-200">Approved · goes live {caseWhen(listing.publishAt)}</p>
      ) : null}
      {listing.status === 'approved' && listing.publishAt ? (
        <p className="mt-2 text-xs text-zinc-400">Went live {caseWhen(listing.publishAt)}</p>
      ) : null}
      {listing.rejectionReason || listing.moderationNote ? (
        <p className="mt-2 text-xs text-amber-100">
          {listing.rejectionReason ? `Rejected: ${listing.rejectionReason}` : `Staff note: ${listing.moderationNote}`}
          {listing.reviewedBy ? <span className="text-zinc-500"> · {listing.reviewedBy}, {caseDay(listing.reviewedAt)}</span> : null}
        </p>
      ) : null}
      {listing.permanentlyRejected ? (
        <p className="mt-1 text-[11px] text-red-200/80">
          The seller cannot resubmit it{listing.permanentlyRejectedAt ? ` (since ${caseDay(listing.permanentlyRejectedAt)})` : ''}. Lift it from
          Marketplace Control with “Allow resubmission”.
        </p>
      ) : null}

      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        <Fact
          label="Seller"
          value={
            <span className="flex flex-wrap items-center gap-1.5">
              <PersonLink person={listing.seller} />
              {sellerStatus ? <StatusPill status={sellerStatus} /> : null}
            </span>
          }
        />
        <Fact label="Seller merit" value={listing.seller.merit ?? '—'} />
        <Fact
          label="Seller listings"
          value={
            listing.seller.listings
              ? `${listing.seller.listings.approved} live · ${listing.seller.listings.rejected + listing.seller.listings.delisted} pulled`
              : '—'
          }
        />
        <Fact
          label="Reports"
          value={
            <span className={listing.reports.open ? 'text-amber-300' : ''}>
              {listing.reports.open} open / {listing.reports.total}
            </span>
          }
        />
        {listing.asset?.stats ? (
          <>
            <Fact label="Licenses sold" value={listing.asset.stats.activeLicenses} />
            <Fact label="Refunded" value={listing.asset.stats.refundedLicenses} />
            <Fact
              label="Reviews"
              value={`${listing.asset.stats.reviews}${listing.asset.stats.averageRating != null ? ` · ${listing.asset.stats.averageRating.toFixed(1)}★` : ''}`}
            />
            <Fact
              label="Copyright signals"
              value={<span className={listing.duplicateSignals ? 'text-amber-300' : ''}>{listing.duplicateSignals || 'None'}</span>}
            />
          </>
        ) : null}
      </dl>

      {listing.asset?.files.length ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Files ({listing.asset.files.length}){brokenFiles.length ? ` · ${brokenFiles.length} failed processing` : ''}
          </p>
          <ul className="mt-1 space-y-1">
            {listing.asset.files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                <span className="min-w-0 truncate">
                  {f.name}
                  {f.sizeBytes ? <span className="text-zinc-500"> · {(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</span> : null}
                </span>
                <span className="flex items-center gap-1.5">
                  {f.processingError ? <span className="text-red-300">{f.processingError}</span> : null}
                  <StatusPill status={f.processingStatus} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {listing.asset?.tags?.length ? (
        <p className="mt-3 flex flex-wrap gap-1">
          {listing.asset.tags.map((tag) => (
            <span key={tag} className="rounded-md border border-white/10 px-1.5 py-px text-[10px] text-zinc-400">
              #{tag}
            </span>
          ))}
        </p>
      ) : null}

      {listing.thread ? <ListingThread thread={listing.thread} /> : null}

      {listing.history.length ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Review history</p>
          <ul className="mt-1 space-y-1">
            {listing.history.map((h) => (
              <li key={h.id} className="text-xs text-zinc-400">
                <span className="text-zinc-200">{h.action}</span>
                {h.reason ? ` — ${h.reason}` : ''}
                <span className="text-zinc-600">
                  {' '}
                  · {h.actorName || 'Staff'} · {caseDay(h.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function AssetReviewsSection({ reviews }: { reviews: CaseAssetReviews }) {
  return (
    <PanelSection title="Reviews on this asset" count={reviews.total}>
      {reviews.items.length ? (
        <>
          {reviews.averageRating != null ? (
            <p className="text-[11px] text-zinc-500">
              Average {reviews.averageRating.toFixed(1)} of 5 across {reviews.total} live review{reviews.total === 1 ? '' : 's'}
              {reviews.items.length < reviews.total ? ` · latest ${reviews.items.length} shown` : ''}
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {reviews.items.map((r) => (
              <li
                key={r.id}
                className={`rounded-lg border px-3 py-2.5 ${
                  r.byNamedReviewer ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-white/[0.06]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    <Stars value={r.rating} />
                    <PersonLink person={r.author} />
                  </p>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {r.byNamedReviewer ? <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">Named in ticket</Pill> : null}
                    {r.removed ? <Pill className="border-red-500/30 bg-red-500/10 text-red-200">Removed</Pill> : null}
                    {r.edited ? <Pill className="border-white/15 text-zinc-400">Edited</Pill> : null}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-300">{r.text}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{caseWhen(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyNote>This asset has no reviews.</EmptyNote>
      )}
    </PanelSection>
  );
}

const SELLING_BLOCK_LABEL: Record<string, string> = {
  ASSET_VERIFICATION_REQUIRED: 'Identity not verified: they cannot list until it is.',
  ASSET_POST_LIMIT_REACHED: 'Listing limit reached for their plan.',
  ASSET_POSTING_UNAVAILABLE: 'Their plan does not include marketplace listings.',
};

function SellingEligibilitySection({ data }: { data: NonNullable<CaseMarketplace['sellingEligibility']> }) {
  const identity = data.identity;
  return (
    <PanelSection title="Selling eligibility">
      <Card tone={data.allowed ? 'default' : 'warn'}>
        <p className={`text-sm ${data.allowed ? 'text-emerald-200' : 'text-amber-100'}`}>
          {data.allowed ? 'Can list on the marketplace now.' : SELLING_BLOCK_LABEL[data.code || ''] || 'Cannot list right now.'}
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-4">
          <Fact label="Identity" value={<StatusPill status={data.isVerified ? 'verified' : identity?.status || 'not verified'} />} />
          <Fact label="Provider status" value={caseLabel(identity?.kycStatus)} />
          <Fact label="Plan" value={data.planName} />
          <Fact
            label="Listings used"
            value={data.unlimited ? `${data.used} · no limit` : `${data.used} of ${data.limit ?? '—'}${data.remaining != null ? ` · ${data.remaining} left` : ''}`}
          />
        </dl>
        {identity?.submittedAt ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            Check started {caseDay(identity.submittedAt)}
            {identity.updatedAt ? ` · last update ${caseWhen(identity.updatedAt)}` : ''}
            {identity.verifiedAt ? ` · verified ${caseDay(identity.verifiedAt)}` : ''}
          </p>
        ) : null}
      </Card>
    </PanelSection>
  );
}

function MarketplaceCase({ data }: { data: CaseMarketplace }) {
  return (
    <>
      {data.sellingEligibility ? <SellingEligibilitySection data={data.sellingEligibility} /> : null}

      {data.listing || (data.asksListing !== false && !data.reportedText) ? (
        <PanelSection title="Listing">
          {data.listing ? <ListingCard listing={data.listing} /> : <EmptyNote>No listing or asset could be matched from this ticket.</EmptyNote>}
        </PanelSection>
      ) : null}

      {data.reviews ? <AssetReviewsSection reviews={data.reviews} /> : null}

      {data.purchase ? (
        <PanelSection title={`Requester's purchases${data.purchase.assetName ? ` of ${data.purchase.assetName}` : ''}`} count={data.purchase.licenses.length}>
          <List
            items={data.purchase.licenses}
            empty="The requester has no license for this asset. Check the order before refunding."
            render={(l) => (
              <Row
                key={l.id}
                title={`${credits(l.priceCredits)} · bought ${caseWhen(l.purchasedAt)}`}
                meta={[
                  l.assignedProject ? `Used in “${l.assignedProject}”` : 'Not used in a project yet',
                  l.transactionStatus ? `payment ${caseLabel(l.transactionStatus)}` : 'no payment record linked',
                ].join(' · ')}
                right={<StatusPill status={l.status} />}
              />
            )}
          />
        </PanelSection>
      ) : null}

      {data.buyer ? (
        <PanelSection title="Requester as a buyer">
          <dl className="grid gap-2 sm:grid-cols-3">
            <Fact label="Purchases" value={data.buyer.purchases} />
            <Fact label="Refunded" value={<span className={data.buyer.refunded ? 'text-amber-300' : ''}>{data.buyer.refunded}</span>} />
            <Fact label="Spent" value={credits(data.buyer.spentCredits)} />
          </dl>
        </PanelSection>
      ) : null}

      {data.sellerListings ? (
        <PanelSection title="Requester's listings" count={data.sellerListings.length}>
          <List
            items={data.sellerListings}
            empty="The requester has not listed anything."
            render={(l) => (
              <Row
                key={l.id}
                title={l.title}
                meta={[l.number, credits(l.priceCredits), caseDay(l.createdAt)].filter(Boolean).join(' · ')}
                detail={l.rejectionReason ? `Rejected: ${l.rejectionReason}` : null}
                right={<StatusPill status={l.status} />}
              />
            )}
          />
        </PanelSection>
      ) : null}

      {data.reportedText || data.reportedSeller ? (
        <MemberSection
          title="Reported seller"
          account={data.reportedSeller}
          empty={`No seller matches “${(data.reportedText || '').slice(0, 60)}”.`}
        />
      ) : null}

      <TicketRefs title="Other tickets about this item" items={data.relatedTickets} empty="No other tickets name this listing or asset." />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Jobs & Gigs                                                       */
/* ---------------------------------------------------------------- */

function ContractCard({ contract }: { contract: CaseContract }) {
  const openDispute = contract.disputes.find((d) => !/closed|resolved/i.test(d.status));
  return (
    <Card tone={openDispute ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{contract.title}</p>
          <p className="text-[11px] text-zinc-500">
            {[caseLabel(contract.type), caseLabel(contract.paymentType), credits(contract.rateCredits)].filter((v) => v && v !== '—').join(' · ')}
          </p>
        </div>
        <StatusPill status={contract.status} />
      </div>
      {contract.disputeHoldSince ? (
        <p className="mt-2 text-xs text-amber-200">
          On dispute hold since {caseWhen(contract.disputeHoldSince)}: escrow and deadlines are frozen.
        </p>
      ) : null}

      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        <Fact
          label="Requester is"
          value={
            contract.requesterRole ? (
              `${caseLabel(contract.requesterRole)}${contract.requesterViaTeam ? ' (via their team)' : ''}`
            ) : (
              <span className="text-amber-300">Not a party</span>
            )
          }
        />
        <Fact label="Started" value={caseDay(contract.startsAt)} />
        <Fact label={contract.endedAt ? 'Ended' : 'Deadline'} value={caseDay(contract.endedAt || contract.deadlineAt)} />
        <Fact
          label="Milestones"
          value={`${contract.milestoneTotals.completed}/${contract.milestoneTotals.count} done · ${credits(contract.milestoneTotals.credits)}`}
        />
      </dl>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {([
          ['Client', contract.client],
          ['Freelancer', contract.freelancer],
        ] as const).map(([label, party]) => (
          <div key={label} className="rounded-lg border border-white/[0.06] p-3">
            <StaffStandingSummary account={party} label={label} compact />
            {profilePath(party) ? (
              <div className="mt-2 flex justify-end">
                <CaseOpenLink path={profilePath(party)} label="Profile" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {contract.gigOrder ? (
        <div className="mt-3">
          <GigOrderSummary order={contract.gigOrder} rateCredits={contract.rateCredits} />
        </div>
      ) : null}

      {contract.milestones.length ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Milestones</p>
          <ul className="mt-1 space-y-1">
            {contract.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                <span className="min-w-0 truncate">
                  {m.index + 1}. {m.name} <span className="text-zinc-500">· {credits(m.credits)}</span>
                  {m.deadlineAt ? <span className="text-zinc-500"> · due {caseDay(m.deadlineAt)}</span> : null}
                </span>
                <StatusPill status={m.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">Disputes on this contract</p>
        {contract.disputes.length ? (
          <ul className="mt-1 space-y-1">
            {contract.disputes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                <span>
                  {d.number} · {d.title}
                  <span className="text-zinc-500">
                    {' '}
                    · {d.filedByRequester ? 'filed by the requester' : 'filed by the other party'} · {d.public ? 'public' : 'private'} ·{' '}
                    {caseDay(d.openedAt)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <StatusPill status={d.status} />
                  <CaseOpenLink path={d.publicPath} label="Case page" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">None. Delivery disagreements may need a dispute opened from the contract.</p>
        )}
      </div>

      {contract.ratings?.length ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Reviews left on this contract</p>
          <ul className="mt-1 space-y-1.5">
            {contract.ratings.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs">
                <p className="flex flex-wrap items-center gap-2 text-zinc-300">
                  <Stars value={r.stars} />
                  <span>
                    {r.authorRole ? `${caseLabel(r.authorRole)}: ` : ''}
                    <PersonLink person={r.author} />
                  </span>
                  {r.byRequester ? <Pill className="border-sky-500/30 bg-sky-500/10 text-sky-200">Requester</Pill> : null}
                  {r.removed ? <Pill className="border-red-500/30 bg-red-500/10 text-red-200">Removed</Pill> : null}
                  <span className="text-zinc-500">{caseDay(r.createdAt)}</span>
                </p>
                {r.feedback ? <p className="mt-0.5 whitespace-pre-wrap break-words text-zinc-300">{r.feedback}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {contract.transactions.length ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Escrow and payments</p>
          <ul className="mt-1 space-y-1">
            {contract.transactions.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                <span>
                  {t.type} · <span className="tabular-nums">{credits(t.credits)}</span>
                  <span className="text-zinc-500"> · {caseWhen(t.createdAt)}</span>
                </span>
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function PostingCard({ posting }: { posting: CasePosting }) {
  const page = posting.deletedAt
    ? null
    : posting.kind === 'gig'
      ? `/gigs/services/${posting.id}/page`
      : `/jobs/${posting.id}/page`;
  return (
    <Card tone={posting.staffHoldAt || posting.reports.some((r) => !/closed|resolved|dismiss/i.test(r.status)) ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {posting.kind === 'gig' ? 'Gig' : 'Job'}: {posting.title}
          </p>
          <p className="text-[11px] text-zinc-500">
            <PersonLink person={posting.owner} /> · posted {caseDay(posting.createdAt)}
            {posting.deletedAt ? ` · archived ${caseDay(posting.deletedAt)}` : ''}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {posting.staffHoldAt ? <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">Staff hold</Pill> : null}
          <StatusPill status={posting.status} />
          <CaseOpenLink path={page} label="Posting" />
        </span>
      </div>
      {posting.staffHoldAt ? (
        <p className="mt-2 text-xs text-amber-100">
          On staff hold since {caseWhen(posting.staffHoldAt)}. The owner cannot reopen it themselves; staff reopening it lifts the hold.
        </p>
      ) : null}
      {posting.history.length ? (
        <ul className="mt-2 space-y-1">
          {posting.history.map((h) => (
            <li key={h.id} className="text-xs text-zinc-400">
              <span className="text-zinc-200">
                {h.previousStatus ? `${caseLabel(h.previousStatus)} → ` : ''}
                {caseLabel(h.status)}
              </span>
              {h.reason ? ` — ${h.reason}` : ''}
              <span className="text-zinc-600">
                {' '}
                · {h.actor} · {caseDay(h.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {posting.reports.length ? (
        <p className="mt-2 text-xs text-amber-200">
          {posting.reports.length} report(s): {posting.reports.slice(0, 3).map((r) => `${r.number} (${caseLabel(r.status)})`).join(', ')}
        </p>
      ) : null}
    </Card>
  );
}

function ProposalRow({ proposal }: { proposal: CaseProposal }) {
  return (
    <Row
      title={
        <>
          <PersonLink person={proposal.freelancer} /> · {credits(proposal.rateCredits)}
        </>
      }
      meta={[
        `Sent ${caseWhen(proposal.createdAt)}`,
        proposal.byRequester ? 'by the requester' : null,
        proposal.onThisJob ? null : 'on a different job',
      ]
        .filter(Boolean)
        .join(' · ')}
      detail={proposal.rejectReason ? `Declined: ${proposal.rejectReason}` : null}
      right={<StatusPill status={proposal.status} />}
    />
  );
}

function ProposalsSection({ proposals }: { proposals: NonNullable<CaseJobs['proposals']> }) {
  const counts = Object.entries(proposals.byStatus);
  return (
    <PanelSection title="Proposals on this job" count={proposals.total}>
      {counts.length ? (
        <p className="flex flex-wrap gap-1.5">
          {counts.map(([status, count]) => (
            <Pill key={status} className="border-white/15 text-zinc-300">
              {caseLabel(status)} · {count}
            </Pill>
          ))}
        </p>
      ) : null}
      {proposals.named ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Proposal named in the ticket</p>
          <ul>
            <ProposalRow proposal={proposals.named} />
          </ul>
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
          {proposals.requesterOwnsJob ? 'The requester posted this job' : "Requester's proposals"}
        </p>
        <List
          items={proposals.requesterOwnsJob ? proposals.latest : proposals.mine}
          empty={proposals.requesterOwnsJob ? 'No proposals yet.' : 'The requester has not sent a proposal on this job.'}
          render={(p) => <ProposalRow key={p.id} proposal={p} />}
        />
      </div>
    </PanelSection>
  );
}

function JobsCase({ data }: { data: CaseJobs }) {
  return (
    <>
      {data.contract || data.asksContract !== false ? (
        <PanelSection title="Contract or order">
          {data.contract ? <ContractCard contract={data.contract} /> : <EmptyNote>No contract or gig order is named on this ticket.</EmptyNote>}
        </PanelSection>
      ) : null}
      {data.desiredOutcome || data.proposalId ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {data.desiredOutcome ? <Fact label="Member wants" value={data.desiredOutcome} /> : null}
          {data.proposalId ? <Fact label="Proposal ID" value={data.proposalId} mono /> : null}
        </dl>
      ) : null}
      {data.posting ? (
        <PanelSection title="Posting">
          <PostingCard posting={data.posting} />
        </PanelSection>
      ) : null}
      {data.proposals ? <ProposalsSection proposals={data.proposals} /> : null}
      {data.reportedMember ? <MemberSection title="Reported member" account={data.reportedMember} empty="" /> : null}
      {data.activity ? (
        <PanelSection title="Requester on Jobs & Gigs">
          <dl className="grid gap-2 sm:grid-cols-3">
            <Fact label="Jobs posted" value={data.activity.jobs} />
            <Fact label="Gigs offered" value={data.activity.gigs} />
            <Fact label="Contracts" value={data.activity.contracts} />
          </dl>
        </PanelSection>
      ) : null}
      <TicketRefs title="Other tickets about this contract" items={data.relatedTickets} empty="No other tickets name this contract or posting." />
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Forum, billing, account, editor, safety                           */
/* ---------------------------------------------------------------- */

function ForumPostCard({ post }: { post: CaseForumPost }) {
  const removed = post.status === 'removed';
  return (
    <Card tone={removed ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{post.title}</p>
          <p className="text-[11px] text-zinc-500">
            {post.author ? (
              <>
                by <PersonLink person={{ accountId: post.authorAccountId || null, name: post.author, handle: post.authorHandle || null }} />
                {' · '}
              </>
            ) : null}
            {[post.groupName ? `in ${post.groupName}` : null, caseDay(post.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {post.isLocked ? <Pill className="border-white/15 text-zinc-300">Locked</Pill> : null}
          {post.isSticky ? <Pill className="border-white/15 text-zinc-300">Pinned</Pill> : null}
          <StatusPill status={post.status} />
          <CaseOpenLink
            path={`/forums/discussion/${post.id}`}
            label="Discussion"
            title={removed ? 'Removed: members cannot open it, but platform view shows what is left.' : undefined}
          />
        </span>
      </div>
      {post.excerpt ? (
        <p className="mt-2 line-clamp-6 whitespace-pre-wrap break-words border-l-2 border-white/15 pl-2 text-xs text-zinc-300">{post.excerpt}</p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-400">
        {post.commentCount} comments · {post.removedComments} removed
        {post.imageCount ? ` · ${post.imageCount} image${post.imageCount === 1 ? '' : 's'}` : ''}
        {post.removedAt
          ? ` · post removed ${caseWhen(post.removedAt)}${
              post.removedByName
                ? ` by ${post.removedByName}${post.removedBy ? ` (${post.removedBy.replace(/_/g, ' ')})` : ''}`
                : post.removedBy
                  ? ` by ${post.removedBy.replace(/_/g, ' ')}`
                  : ''
            }`
          : ''}
        {post.isLocked && post.lockedByName ? ` · locked by ${post.lockedByName}` : ''}
      </p>
      {post.removalReason ? <p className="mt-1 text-xs text-amber-100">Removal reason: {post.removalReason}</p> : null}
    </Card>
  );
}

function ForumCase({ data }: { data: CaseForum }) {
  const membership = data.group?.requesterMembership;
  return (
    <>
      {data.post ? (
        <PanelSection title="Forum post">
          <ForumPostCard post={data.post} />
          <ReportRefs title="Reports on this post" items={data.post.reports} empty="No reports on this post." />
        </PanelSection>
      ) : null}
      {data.group ? (
        <PanelSection title="Forum group">
          <Card tone={data.group.deletedAt || data.group.status !== 'active' ? 'warn' : 'default'}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-white">{data.group.name}</p>
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={data.group.deletedAt ? 'archived' : data.group.status} />
                <CaseOpenLink path={`/forums/group/${data.group.id}`} label="Group" />
              </span>
            </div>
            {data.group.archiveReason || data.group.archivedBy ? (
              <p className="mt-1 text-xs text-amber-100">
                Archived
                {data.group.archivedByName
                  ? ` by ${data.group.archivedByName}${data.group.archivedBy ? ` (${data.group.archivedBy})` : ''}`
                  : data.group.archivedBy
                    ? ` by the ${data.group.archivedBy}`
                    : ''}
                {data.group.archiveReason ? `: ${data.group.archiveReason}` : ''}
              </p>
            ) : null}
            <dl className="mt-2 grid gap-2 sm:grid-cols-4">
              <Fact
                label="Owner"
                value={
                  data.group.owner ? (
                    <PersonLink person={{ accountId: data.group.ownerAccountId || null, name: data.group.owner, handle: data.group.ownerHandle || null }} />
                  ) : (
                    '—'
                  )
                }
              />
              <Fact
                label="Members"
                value={`${data.group.memberCount}${data.group.bannedMemberCount ? ` · ${data.group.bannedMemberCount} banned` : ''}`}
              />
              <Fact label="Discussions" value={data.group.discussionCount} />
              <Fact label="Removed" value={data.group.removedDiscussionCount} />
              {membership ? (
                <Fact
                  label="Requester in this group"
                  value={
                    membership.banned ? (
                      <span className="text-red-300">Banned{membership.bannedAt ? ` ${caseDay(membership.bannedAt)}` : ''}</span>
                    ) : membership.role ? (
                      `${membership.role}${membership.joinedAt ? ` · joined ${caseDay(membership.joinedAt)}` : ''}`
                    ) : (
                      <span className="text-amber-300">Not a member</span>
                    )
                  }
                />
              ) : null}
            </dl>
          </Card>
        </PanelSection>
      ) : null}
      {data.reportedMember ? <MemberSection title="Reported member" account={data.reportedMember} empty="" /> : null}
      <PanelSection title="Requester's forum restrictions" count={data.restrictions?.length || 0}>
        <List
          items={data.restrictions}
          empty="No forum timeouts or restrictions."
          render={(r) => (
            <Row
              key={r.id}
              title={caseLabel(r.type)}
              meta={`${caseWhen(r.startsAt)} → ${r.endsAt ? caseWhen(r.endsAt) : 'no end date'}`}
              right={<StatusPill status={r.active ? 'active' : 'ended'} />}
            />
          )}
        />
      </PanelSection>
    </>
  );
}

function BillingCase({ data }: { data: CaseBilling }) {
  if (data.restricted) {
    return <EmptyNote>Billing records are visible to Admin and Support for this ticket type.</EmptyNote>;
  }
  const tx = data.referencedTransaction;
  return (
    <>
      <PanelSection title="Wallet and plan">
        <dl className="grid gap-2 sm:grid-cols-4">
          <Fact label="Balance" value={data.wallet ? credits(data.wallet.balanceCredits) : '—'} />
          <Fact label="On hold" value={data.wallet ? credits(data.wallet.frozenCredits) : '—'} />
          <Fact label="Plan" value={data.subscription ? `${data.subscription.plan}${data.subscription.recurring ? ' · recurring' : ''}` : 'Free'} />
          <Fact label="Plan status" value={data.subscription ? <StatusPill status={data.subscription.status} /> : '—'} />
        </dl>
      </PanelSection>
      {tx ? (
        <PanelSection title="Transaction the member quoted">
          {tx.found ? (
            <Card tone={tx.belongsToRequester ? 'info' : 'bad'}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white">
                  {caseLabel(tx.kind)} · {tx.type || '—'}
                  {tx.amount != null ? ` · ₱${tx.amount.toLocaleString()}` : ''}
                  {tx.credits != null ? ` · ${credits(tx.credits)}` : ''}
                </p>
                <StatusPill status={tx.status} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                {caseWhen(tx.createdAt)}
                {tx.reference && tx.reference !== tx.query ? ` · reference ${tx.reference}` : ''}
                {tx.settledAt ? ` · ${tx.kind === 'cashout' ? 'credits returned' : 'settled'} ${caseWhen(tx.settledAt)}` : ''}
                {tx.belongsToRequester ? '' : ' · Not on the requester’s account'}
              </p>
              {tx.failureCode ? <p className="mt-1 text-xs text-red-200">Provider failure: {tx.failureCode}</p> : null}
            </Card>
          ) : (
            <Card tone="warn">
              <p className="text-xs text-amber-100">No payment, credit transaction, cashout or invoice matches “{tx.query}”.</p>
            </Card>
          )}
        </PanelSection>
      ) : null}
      {data.team ? (
        <TeamSections
          team={data.team}
          extra={
            <>
              <Fact label="Team balance" value={data.team.wallet ? credits(data.team.wallet.balanceCredits) : '—'} />
              <Fact label="Team on hold" value={data.team.wallet ? credits(data.team.wallet.frozenCredits) : '—'} />
            </>
          }
        />
      ) : null}
      <p className="text-[11px] text-zinc-500">Recent payments, credits and withdrawals are listed in the Details tab.</p>
    </>
  );
}

/** The team a ticket names (Teams, Business verification, Team funds) and the member it is about. */
function TeamSections({ team, extra }: { team: CaseTeam; extra?: ReactNode }) {
  return (
    <>
      <PanelSection title="Team">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              {team.name}
              {team.handle ? <span className="font-normal text-zinc-500"> @{team.handle}</span> : null}
            </p>
            <span className="flex flex-wrap items-center gap-1.5">
              {team.contractWorkspace ? <Pill className="border-white/15 text-zinc-300">Contract workspace</Pill> : null}
              {team.visibility ? <Pill className="border-white/15 text-zinc-300">{team.visibility}</Pill> : null}
              <StatusPill status={team.status} />
              <CaseOpenLink path={`/teams/${team.id}`} label="Team page" />
            </span>
          </div>
          <dl className="mt-3 grid gap-2 sm:grid-cols-4">
            <Fact label="Owner" value={<PersonLink person={team.owner} />} />
            <Fact
              label="Members"
              value={`${team.activeMembers ?? '—'} active${team.otherMembers ? ` · ${team.otherMembers} invited or suspended` : ''}`}
            />
            <Fact label="Created" value={caseDay(team.createdAt)} />
            <Fact
              label="Requester on this team"
              value={
                <span className={team.requesterMembership?.status === 'Active' ? '' : 'text-amber-300'}>
                  {membershipLine(team.requesterMembership)}
                </span>
              }
            />
            {extra}
          </dl>
        </Card>
      </PanelSection>
      {team.affectedMember ? (
        <PanelSection title="Member the ticket is about">
          <Card>
            <StaffStandingSummary account={team.affectedMember} />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-300">On this team: {membershipLine(team.affectedMember.membership)}</p>
              <CaseOpenLink path={profilePath(team.affectedMember)} label="Profile" />
            </div>
          </Card>
        </PanelSection>
      ) : null}
    </>
  );
}

function AccountCase({ data }: { data: NonNullable<TicketCaseContext['account']> }) {
  const v = data.verification;
  return (
    <>
      <PanelSection title="Identity verification">
        {v ? (
          <dl className="grid gap-2 sm:grid-cols-4">
            <Fact label="Verified" value={<StatusPill status={v.verified ? 'verified' : v.status || 'not verified'} />} />
            <Fact label="Provider status" value={caseLabel(v.kycStatus)} />
            <Fact label="Submitted" value={caseDay(v.submittedAt)} />
            <Fact label="Expires" value={caseDay(v.expiresAt)} />
          </dl>
        ) : (
          <EmptyNote>No verification record.</EmptyNote>
        )}
      </PanelSection>
      {data.team ? <TeamSections team={data.team} /> : null}
      {data.recentChanges ? (
        <PanelSection title="Recent sign-in and account changes" count={data.recentChanges.length}>
          <List
            items={data.recentChanges}
            empty="No sign-in, password, email or payout changes recorded."
            render={(c) => <Row key={c.id} title={c.action} meta={`${caseLabel(c.eventCode.toLowerCase())} · ${caseWhen(c.createdAt)}`} />}
          />
        </PanelSection>
      ) : null}
    </>
  );
}

function EditorCase({ data }: { data: NonNullable<TicketCaseContext['editor']> }) {
  const project = data.project;
  const collaborator = project?.collaborator;
  if (data.asksProject === false) {
    return (
      <PanelSection title="Recent uploads" count={data.recentUploads?.length || 0}>
        <List
          items={data.recentUploads}
          empty="The member has not started an upload lately."
          render={(u) => (
            <Row
              key={u.id}
              title={
                <>
                  {u.name}
                  {u.matchesTicket ? <span className="text-amber-300"> · the file in this ticket</span> : null}
                </>
              }
              meta={[
                u.mimeType,
                u.maxSizeBytes ? `up to ${(u.maxSizeBytes / 1024 / 1024).toFixed(1)} MB` : null,
                `started ${caseWhen(u.createdAt)}`,
                u.finishedAt ? `finished ${caseWhen(u.finishedAt)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              right={<StatusPill status={u.status === 'expired' ? 'failed · never finished' : u.status} />}
            />
          )}
        />
      </PanelSection>
    );
  }
  return (
    <>
      <PanelSection title="Project">
        {project ? (
          <>
            {project.deleted || project.trashedAt || project.frozenAt ? (
              <p className="flex flex-wrap gap-1.5">
                {project.deleted ? <Pill className="border-red-500/30 bg-red-500/10 text-red-200">Deleted</Pill> : null}
                {!project.deleted && project.trashedAt ? (
                  <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">In trash since {caseDay(project.trashedAt)}</Pill>
                ) : null}
                {project.frozenAt ? (
                  <Pill className="border-sky-500/30 bg-sky-500/10 text-sky-200">Frozen by staff {caseDay(project.frozenAt)}</Pill>
                ) : null}
              </p>
            ) : null}
            <dl className="grid gap-2 sm:grid-cols-4">
              <Fact label="Project" value={project.name} />
              <Fact label="Members" value={project.members} />
              <Fact label="Last updated" value={caseWhen(project.updatedAt)} />
              <Fact
                label="Requester"
                value={project.requesterIsMember ? 'Member' : <span className="text-amber-300">Not a member</span>}
              />
              {collaborator ? (
                <Fact
                  label={`Collaborator “${collaborator.query}”`}
                  value={
                    collaborator.member ? (
                      collaborator.onProject ? (
                        `${collaborator.member.role} since ${caseDay(collaborator.member.joinedAt)}`
                      ) : (
                        <span className="text-amber-300">Removed {caseDay(collaborator.member.removedAt)}</span>
                      )
                    ) : (
                      <span className="text-amber-300">Never on this project</span>
                    )
                  }
                />
              ) : null}
            </dl>
          </>
        ) : (
          <EmptyNote>No project is named on this ticket.</EmptyNote>
        )}
      </PanelSection>
      {project?.roster?.length ? (
        <PanelSection title="People on the project" count={project.roster.filter((m) => !m.removedAt).length}>
          <List
            items={project.roster}
            empty=""
            render={(m) => (
              <Row
                key={`${m.accountId}-${m.joinedAt}`}
                title={
                  <>
                    <PersonLink person={m} />
                    {m.isRequester ? <span className="text-sky-300"> · requester</span> : null}
                  </>
                }
                meta={[
                  m.joinedAt ? `joined ${caseDay(m.joinedAt)}` : null,
                  m.removedAt ? `removed ${caseDay(m.removedAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={<StatusPill status={m.removedAt ? 'removed' : m.role} />}
              />
            )}
          />
        </PanelSection>
      ) : null}
    </>
  );
}

function SafetyCase({ data }: { data: NonNullable<TicketCaseContext['safety']> }) {
  return (
    <>
      {data.reportedMember !== null || data.reportsAgainst ? (
        <>
          <MemberSection title="Reported member" account={data.reportedMember} empty="No member matches the username given." />
          {data.reportedMember ? (
            <ReportRefs title="Other reports against them" items={data.reportsAgainst} empty="No other reports name this member." />
          ) : null}
        </>
      ) : null}
      {data.infringingListings ? (
        <PanelSection title="Listings named in the claim" count={data.infringingListings.length}>
          {data.infringingListings.length ? (
            <div className="space-y-2">
              {data.infringingListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <EmptyNote>The links do not point to a marketplace listing.</EmptyNote>
          )}
        </PanelSection>
      ) : null}
      {data.infringingPostings?.length ? (
        <PanelSection title="Jobs and gigs named in the claim" count={data.infringingPostings.length}>
          <div className="space-y-2">
            {data.infringingPostings.map((p) => (
              <PostingCard key={p.id} posting={p} />
            ))}
          </div>
        </PanelSection>
      ) : null}
      {data.infringingPosts?.length ? (
        <PanelSection title="Forum posts named in the claim" count={data.infringingPosts.length}>
          <div className="space-y-2">
            {data.infringingPosts.map((p) => (
              <ForumPostCard key={p.id} post={p} />
            ))}
          </div>
        </PanelSection>
      ) : null}
    </>
  );
}

/** Bug reports (every category): the member's description and other open reports of this bug type. */
function BugCase({ data }: { data: CaseBug }) {
  const otherAreas = data.similarTotal - data.sameAreaTotal;
  return (
    <>
      <PanelSection title="Bug report">
        {data.blocksMember ? (
          <div className="mb-2">
            <Card tone="bad">
              <p className="flex items-start gap-2 text-xs text-red-100">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The member cannot finish what they were doing, so this was filed as High priority.
              </p>
            </Card>
          </div>
        ) : null}
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact label="Where it happened" value={data.area || '—'} />
          <Fact label="How often" value={data.frequency || '—'} />
          <Fact label="Still usable?" value={data.blocking || '—'} />
        </dl>
        {data.pageLink || data.errorMessage ? (
          <dl className="mt-2 grid gap-2">
            {data.pageLink ? <Fact label="Page" value={data.pageLink} mono /> : null}
            {data.errorMessage ? <Fact label="Error shown" value={data.errorMessage} mono /> : null}
          </dl>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-500">
          Steps, expected result and the member’s browser and device are in the Details tab.
        </p>
      </PanelSection>
      <PanelSection title="Other open reports of this bug type" count={data.similarTotal}>
        {data.similar.length ? (
          <>
            <p className="text-[11px] text-zinc-500">
              Last 60 days. {data.sameAreaTotal} in the same area
              {otherAreas > 0 ? `, ${otherAreas} elsewhere` : ''}. Several in one area often mean one bug.
            </p>
            <List
              items={data.similar}
              empty=""
              render={(t) => (
                <Row
                  key={t.id}
                  title={t.number}
                  meta={[t.area || 'No area given', t.requester, caseWhen(t.createdAt)].filter(Boolean).join(' · ')}
                  right={
                    <>
                      {t.sameArea ? <Pill className="border-sky-500/30 text-sky-200">Same area</Pill> : null}
                      <StatusPill status={t.status} />
                    </>
                  }
                />
              )}
            />
          </>
        ) : (
          <EmptyNote>No other open reports of this bug type in the last 60 days.</EmptyNote>
        )}
      </PanelSection>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Panel                                                             */
/* ---------------------------------------------------------------- */

export const CASE_TAB_LABEL: Record<TicketCaseContext['kind'], string> = {
  appeal: 'Appeal case',
  marketplace: 'Marketplace',
  jobs: 'Contract',
  forum: 'Forum',
  billing: 'Billing',
  account: 'Account',
  editor: 'Project',
  safety: 'Safety',
  bug: 'Bug report',
  general: 'Member',
};

export default function TicketCasePanel({
  context,
  loading,
  onRetry,
}: {
  /** undefined: not loaded yet; null: the server could not build it. */
  context: TicketCaseContext | null | undefined;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading && context === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!context) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <FileWarning className="h-7 w-7 text-zinc-600" />
        <p className="text-sm text-zinc-400">The case file could not be loaded.</p>
        <button type="button" onClick={onRetry} className={BTN.neutral}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
      {context.notes.length ? (
        <div className="space-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3">
          {context.notes.map((note) => (
            <p key={note} className="flex items-start gap-2 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <MemberSection title="Requester standing" account={context.requester} empty="This ticket has no member account attached." />

      {context.kind === 'appeal' && context.appeal ? <AppealCase appeal={context.appeal} requester={context.requester} /> : null}
      {context.kind === 'marketplace' && context.marketplace ? <MarketplaceCase data={context.marketplace} /> : null}
      {context.kind === 'jobs' && context.jobs ? <JobsCase data={context.jobs} /> : null}
      {context.kind === 'forum' && context.forum ? <ForumCase data={context.forum} /> : null}
      {context.kind === 'billing' && context.billing ? <BillingCase data={context.billing} /> : null}
      {context.kind === 'account' && context.account ? <AccountCase data={context.account} /> : null}
      {context.kind === 'editor' && context.editor ? <EditorCase data={context.editor} /> : null}
      {context.kind === 'safety' && context.safety ? <SafetyCase data={context.safety} /> : null}
      {context.kind === 'bug' && context.bug ? <BugCase data={context.bug} /> : null}
      {context.namedPeople?.map((person: CaseNamedPerson) => (
        <MemberSection
          key={person.key}
          title={person.label}
          account={person.account}
          empty={`No member matches “${person.query}”.`}
        />
      ))}

      {context.kind === 'general' && !context.namedPeople?.length ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Info className="h-3.5 w-3.5" /> This ticket type has no linked records. The form answers are in the Details tab.
        </p>
      ) : null}

      {context.relatedTickets ? (
        <TicketRefs title="Other tickets about the same item" items={context.relatedTickets} empty="No other tickets name this item." />
      ) : null}

      <TicketRefs title="Requester's other open tickets" items={context.otherOpenTickets} empty="No other open tickets." />
    </div>
  );
}
