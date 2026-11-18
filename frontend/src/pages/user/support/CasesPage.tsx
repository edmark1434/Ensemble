import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Gavel, LifeBuoy, Plus, Scale } from 'lucide-react';
import UserHeader from '@/components/nav/user_header';
import useGlobalState from '@/lib/global_state';
import { useCaseStore } from '@/lib/cases';
import { standingConditions } from '@/lib/standing';
import { APPEAL_PATH } from '@/lib/appealAccess';
import CaseInbox from '@/pages/user/account/appeal/CaseInbox';
import { useCaseLists } from '@/pages/user/account/appeal/useCaseLists';
import type { CaseSelection } from '@/pages/user/account/appeal/appealShared';

function Tile({
  label,
  value,
  hint,
  tone = 'text-gray-900 dark:text-white',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-dark-surface">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{hint}</p>
    </div>
  );
}

/**
 * Cases (`/support/cases`): every support ticket and dispute a member is part of, with the
 * conversation and reply box. Tickets and disputes are not in the chat inbox. Banned and
 * locked members are sent to the appeal page, which shows the same cases with `CaseInbox`.
 *
 * `?ticket=` / `?dispute=` open a case; `?conversation=` (old notification links to a ticket
 * chat) is turned into `?ticket=` once the list has loaded.
 */
export default function CasesPage() {
  const user = useGlobalState((state) => state.user);
  const accountId = String(user?.account_id || '');
  const restriction = user?.restriction;
  const conditions = useMemo(() => standingConditions(restriction), [restriction]);
  const standingKey = `${user?.status || ''}|${restriction?.code || ''}|${conditions.map((c) => c.id).join(',')}`;
  const { tickets, disputes, listsLoading, listsError, loadLists } = useCaseLists(standingKey);
  const summary = useCaseStore((state) => state.summary);
  const refreshSummary = useCaseStore((state) => state.refresh);
  const [searchParams, setSearchParams] = useSearchParams();

  const ticketParam = searchParams.get('ticket');
  const disputeParam = searchParams.get('dispute');
  const conversationParam = searchParams.get('conversation');
  const selection = useMemo<CaseSelection | null>(() => {
    if (ticketParam) return { kind: 'ticket', id: ticketParam };
    if (disputeParam) return { kind: 'dispute', id: disputeParam };
    return null;
  }, [ticketParam, disputeParam]);

  useEffect(() => {
    if (!conversationParam || listsLoading) return;
    const ticket = tickets.find((row) => row.chatId && String(row.chatId) === conversationParam);
    setSearchParams(ticket ? { ticket: ticket.id } : {}, { replace: true });
  }, [conversationParam, listsLoading, tickets, setSearchParams]);

  // The badge and the case bar read the summary; keep it in step with what this page shows.
  useEffect(() => {
    if (!listsLoading) void refreshSummary();
  }, [tickets, disputes, listsLoading, refreshSummary]);

  const onSelect = (next: CaseSelection | null) => {
    setSearchParams(next ? { [next.kind]: next.id } : {});
  };

  if (!accountId) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
        <UserHeader pageTitle="Cases" />
        <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
          <LifeBuoy className="mx-auto h-8 w-8 text-gray-300 dark:text-zinc-600" />
          <h1 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">Sign in to see your cases</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Your support tickets and disputes are tied to your account.</p>
          <Link
            to={`/login?redirect=${encodeURIComponent('/support/cases')}`}
            className="mt-5 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-gray-900"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  const openDisputes = summary?.openDisputes ?? disputes.filter((row) => !row.access?.closed).length;
  const openTickets = summary?.openTickets ?? tickets.filter((row) => !row.access?.closed).length;
  const waiting = summary?.needsYou ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans'] dark:bg-dark-base">
      <UserHeader pageTitle="Cases" />
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cases</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-zinc-400">
              Your support tickets and disputes in one place. Staff replies, rulings and status changes show up here as
              they happen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {conditions.length ? (
              <Link
                to={APPEAL_PATH}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-200 dark:hover:bg-white/5"
              >
                <Gavel className="h-3.5 w-3.5" />
                Appeal a penalty
              </Link>
            ) : null}
            <Link
              to="/contracts/dispute-form"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-200 dark:hover:bg-white/5"
            >
              <Scale className="h-3.5 w-3.5" />
              File a dispute
            </Link>
            <Link
              to="/support/ticket"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              New ticket
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Open disputes" value={openDisputes} hint="Credits stay on hold until staff decide." />
          <Tile label="Open tickets" value={openTickets} hint="Support answers here and by notification." />
          <Tile
            label="Waiting for you"
            value={waiting}
            hint={waiting ? 'Staff asked you something, or you have not given your side yet.' : 'Nothing needs you right now.'}
            tone={waiting ? 'text-amber-600 dark:text-amber-300' : 'text-gray-900 dark:text-white'}
          />
        </div>

        {summary?.items?.some((item) => item.access.needsYou) ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Cases marked with an amber dot are waiting for you. Open one to see what staff need.</span>
          </div>
        ) : null}

        <CaseInbox
          tickets={tickets}
          disputes={disputes}
          listsLoading={listsLoading}
          listsError={listsError}
          selection={selection}
          onSelect={onSelect}
          onRefreshLists={loadLists}
          accountId={accountId}
          heading="Conversations"
          description="Pick a case to read it and reply. Tickets and disputes are kept here, not in the chat inbox."
          tall
        />

        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-500">
          <LifeBuoy className="h-3.5 w-3.5" />
          Contract disputes also appear under{' '}
          <Link to="/contracts/disputes" className="font-semibold text-gray-700 hover:underline dark:text-zinc-300">
            My Contracts → Disputes
          </Link>
          , with escrow and payout details.
        </p>
      </main>
    </div>
  );
}
