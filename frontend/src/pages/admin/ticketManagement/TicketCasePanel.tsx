import type { ReactNode } from 'react';
import { AlertTriangle, FileWarning, Gavel, Info, Loader2 } from 'lucide-react';
import { BTN, EmptyNote, Fact, PanelSection, Pill } from '@/pages/moderator/shared/staffCaseUi';
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
  CaseBilling,
  CaseContract,
  CaseForum,
  CaseJobs,
  CaseListing,
  CaseMarketplace,
  CasePosting,
  CaseReportRef,
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

function credits(n: number | null | undefined) {
  return `${Number(n || 0).toLocaleString()} credits`;
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
  return (
    <PanelSection title={title}>
      {account ? (
        <Card>
          <StaffStandingSummary account={account} />
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

/** What is active on the member right now, for the decision sidebar and its confirm dialog. */
export function AppealStandingBrief({ context }: { context: TicketCaseContext | null | undefined }) {
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

  return (
    <>
      <PanelSection title="Appeal">
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact label="Appealing" value={AREA_LABEL[appeal.area]} />
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

      {appeal.decidable && !appeal.decision ? (
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
              ? 'A previous appeal was denied permanently.'
              : `A previous denial blocks new appeals until ${caseDay(hold.blockedUntil)}.`}
          </p>
          <p className="mt-1 text-[11px] text-red-200/70">
            Decided {caseWhen(hold.decidedAt)}. A penalty issued after that decision can still be appealed.
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
                detail={item.w.reason}
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
              detail={w.reason}
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
              title={`${p.number} · ${p.type}`}
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

function ListingCard({ listing }: { listing: CaseListing }) {
  const brokenFiles = listing.asset?.files.filter((f) => f.processingError || /fail|error/i.test(f.processingStatus || '')) || [];
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
        <StatusPill status={listing.status} />
      </div>

      {listing.rejectionReason || listing.moderationNote ? (
        <p className="mt-2 text-xs text-amber-100">
          {listing.rejectionReason ? `Rejected: ${listing.rejectionReason}` : `Staff note: ${listing.moderationNote}`}
          {listing.reviewedBy ? <span className="text-zinc-500"> · {listing.reviewedBy}, {caseDay(listing.reviewedAt)}</span> : null}
        </p>
      ) : null}

      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        <Fact
          label="Seller"
          value={
            <>
              {listing.seller.name}
              {listing.seller.handle ? <span className="text-zinc-500"> @{listing.seller.handle}</span> : null}
            </>
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

function MarketplaceCase({ data }: { data: CaseMarketplace }) {
  return (
    <>
      <PanelSection title="Listing">
        {data.listing ? <ListingCard listing={data.listing} /> : <EmptyNote>No listing or asset could be matched from this ticket.</EmptyNote>}
      </PanelSection>

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

      {data.reportedText ? (
        <MemberSection
          title="Reported seller"
          account={data.reportedSeller}
          empty={`No seller matches “${data.reportedText.slice(0, 60)}”.`}
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
      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        <Fact label="Requester is" value={contract.requesterRole ? caseLabel(contract.requesterRole) : <span className="text-amber-300">Not a party</span>} />
        <Fact label="Started" value={caseDay(contract.startsAt)} />
        <Fact label="Deadline" value={caseDay(contract.deadlineAt)} />
        <Fact
          label="Milestones"
          value={`${contract.milestoneTotals.completed}/${contract.milestoneTotals.count} done · ${credits(contract.milestoneTotals.credits)}`}
        />
      </dl>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] p-3">
          <StaffStandingSummary account={contract.client} label="Client" compact />
        </div>
        <div className="rounded-lg border border-white/[0.06] p-3">
          <StaffStandingSummary account={contract.freelancer} label="Freelancer" compact />
        </div>
      </div>

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
                <StatusPill status={d.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">None. Delivery disagreements may need a dispute opened from the contract.</p>
        )}
      </div>

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
  return (
    <Card tone={posting.reports.some((r) => !/closed|resolved|dismiss/i.test(r.status)) ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {posting.kind === 'gig' ? 'Gig' : 'Job'}: {posting.title}
          </p>
          <p className="text-[11px] text-zinc-500">
            {posting.owner.name}
            {posting.owner.handle ? ` @${posting.owner.handle}` : ''} · posted {caseDay(posting.createdAt)}
          </p>
        </div>
        <StatusPill status={posting.status} />
      </div>
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

function JobsCase({ data }: { data: CaseJobs }) {
  return (
    <>
      <PanelSection title="Contract or order">
        {data.contract ? <ContractCard contract={data.contract} /> : <EmptyNote>No contract or gig order is named on this ticket.</EmptyNote>}
      </PanelSection>
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

function ForumCase({ data }: { data: CaseForum }) {
  return (
    <>
      {data.post ? (
        <PanelSection title="Forum post">
          <Card tone={data.post.status === 'removed' ? 'warn' : 'default'}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{data.post.title}</p>
                <p className="text-[11px] text-zinc-500">
                  {[data.post.author ? `by ${data.post.author}` : null, data.post.groupName ? `in ${data.post.groupName}` : null, caseDay(data.post.createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="flex flex-wrap gap-1.5">
                {data.post.isLocked ? <Pill className="border-white/15 text-zinc-300">Locked</Pill> : null}
                {data.post.isSticky ? <Pill className="border-white/15 text-zinc-300">Pinned</Pill> : null}
                <StatusPill status={data.post.status} />
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              {data.post.commentCount} comments · {data.post.removedComments} removed
              {data.post.removedAt ? ` · post removed ${caseWhen(data.post.removedAt)}` : ''}
            </p>
          </Card>
          <ReportRefs title="Reports on this post" items={data.post.reports} empty="No reports on this post." />
        </PanelSection>
      ) : null}
      {data.group ? (
        <PanelSection title="Forum group">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-white">{data.group.name}</p>
              <StatusPill status={data.group.deletedAt ? 'deleted' : data.group.status} />
            </div>
            <dl className="mt-2 grid gap-2 sm:grid-cols-4">
              <Fact label="Owner" value={data.group.owner || '—'} />
              <Fact label="Members" value={data.group.memberCount} />
              <Fact label="Discussions" value={data.group.discussionCount} />
              <Fact label="Removed" value={data.group.removedDiscussionCount} />
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
                {tx.belongsToRequester ? '' : ' · Not on the requester’s account'}
              </p>
            </Card>
          ) : (
            <Card tone="warn">
              <p className="text-xs text-amber-100">No payment, credit transaction or cashout matches “{tx.query}”.</p>
            </Card>
          )}
        </PanelSection>
      ) : null}
      <p className="text-[11px] text-zinc-500">Recent payments, credits and withdrawals are listed in the Details tab.</p>
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
      {data.team ? (
        <PanelSection title="Team">
          <dl className="grid gap-2 sm:grid-cols-3">
            <Fact label="Team" value={`${data.team.name}${data.team.handle ? ` @${data.team.handle}` : ''}`} />
            <Fact label="Status" value={<StatusPill status={data.team.status} />} />
            <Fact label="Created" value={caseDay(data.team.createdAt)} />
          </dl>
        </PanelSection>
      ) : null}
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
  return (
    <PanelSection title="Project">
      {data.project ? (
        <dl className="grid gap-2 sm:grid-cols-4">
          <Fact label="Project" value={data.project.name} />
          <Fact label="Members" value={data.project.members} />
          <Fact label="Last updated" value={caseWhen(data.project.updatedAt)} />
          <Fact
            label="Requester"
            value={data.project.requesterIsMember ? 'Member' : <span className="text-amber-300">Not a member</span>}
          />
        </dl>
      ) : (
        <EmptyNote>No project is named on this ticket.</EmptyNote>
      )}
    </PanelSection>
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
            <EmptyNote>The links do not point to a marketplace listing. Check them by hand.</EmptyNote>
          )}
        </PanelSection>
      ) : null}
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
      {context.kind === 'general' ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Info className="h-3.5 w-3.5" /> This ticket type has no linked records. The form answers are in the Details tab.
        </p>
      ) : null}

      <TicketRefs title="Requester's other open tickets" items={context.otherOpenTickets} empty="No other open tickets." />
    </div>
  );
}
