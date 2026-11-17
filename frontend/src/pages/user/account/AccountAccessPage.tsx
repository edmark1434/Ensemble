import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ArrowLeft, ChevronDown, ClipboardList, Clock, Gavel, LogOut, ShieldCheck } from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { auth } from '@/pages/firebase';
import { AccountRecordSection } from '@/pages/user/7_profile/Displays/AccountStanding';
import UserLogoutModal from '@/components/nav/user_logout_modal';
import { StandingConditionList, conditionIcon, toneClasses } from '@/components/account/StandingDetails';
import { formatStandingWhen, nextStandingChange, standingConditions } from '@/lib/standing';
import { isAppealLimitedMember } from '@/lib/appealAccess';
import AppealForm from './appeal/AppealForm';
import CaseInbox from './appeal/CaseInbox';
import {
  type CaseSelection,
  type DisputeRow,
  type TicketRow,
  DEFAULT_PENALTY_COPY,
  PENALTY_COPY,
  isAppealTicket,
  isClosedStatus,
} from './appeal/appealShared';

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const STEPS = [
  { title: 'File one appeal', body: 'Explain what happened. You can keep one appeal open at a time.' },
  { title: 'Staff review it', body: 'Support reads your account record and may ask questions on the ticket.' },
  { title: 'You get a decision', body: 'Accepted appeals take effect within 24 hours. A denial starts a 12-month wait.' },
];

function refreshCurrentUser() {
  return api
    .get('api/users/me')
    .then((res) => {
      if (res.data?.user) useGlobalState.getState().setUser(res.data.user);
    })
    .catch(() => undefined);
}

function Card({
  children,
  className = '',
  borderClass = 'border-gray-200 dark:border-white/10',
}: {
  children: ReactNode;
  className?: string;
  borderClass?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-white dark:bg-dark-surface ${borderClass} ${className}`}>
      {children}
    </section>
  );
}

export default function AccountAccessPage() {
  const user = useGlobalState((state) => state.user);
  const clearUser = useGlobalState((state) => state.clearUser);
  const navigate = useNavigate();
  const restriction = user?.restriction;
  const accountId = String(user?.account_id || '');

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState(false);
  const [selection, setSelection] = useState<CaseSelection | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const inboxRef = useRef<HTMLDivElement>(null);
  const decidedRef = useRef(new Set<string>());
  const listsLoadedRef = useRef(false);

  const conditions = useMemo(() => standingConditions(restriction), [restriction]);
  const primary = conditions[0] || null;

  // Banned and locked members live on this page; suspended and timed-out members come here
  // from their banner to appeal and can go back to the site.
  const appealOnly =
    isAppealLimitedMember(user) || conditions.some((c) => c.id === 'banned' || c.id === 'locked');
  const canLeave = !appealOnly;
  // Matches `appealTicketsOnly` on the backend: these members reply only on the appeal ticket.
  const replyLimited = appealOnly || conditions.some((c) => c.id === 'suspended');
  const hasPenalty = conditions.length > 0 || appealOnly;
  const copy = primary ? PENALTY_COPY[primary.id] : DEFAULT_PENALTY_COPY;

  const loadLists = useCallback(async () => {
    const [ticketResult, disputeResult] = await Promise.allSettled([
      api.get('/api/users/tickets'),
      api.get('/api/users/disputes'),
    ]);
    if (ticketResult.status === 'fulfilled') setTickets(ticketResult.value.data?.data || []);
    if (disputeResult.status === 'fulfilled') setDisputes(disputeResult.value.data?.data || []);
    const failed = ticketResult.status === 'rejected' && disputeResult.status === 'rejected';
    // A failed background refresh keeps what is already shown.
    if (!failed) listsLoadedRef.current = true;
    setListsError(failed && !listsLoadedRef.current);
    setListsLoading(false);
    if (failed) throw ticketResult.reason;
  }, []);

  useEffect(() => {
    void loadLists().catch(() => undefined);
  }, [loadLists]);

  // When a penalty's clock runs out, re-read the standing so the page reflects it.
  const nextChange = nextStandingChange(conditions);
  useEffect(() => {
    if (!nextChange) return;
    const delay = Math.max(0, nextChange - Date.now()) + 5000;
    if (delay > 2147483000) return; // setTimeout overflows past ~24.8 days.
    const timer = window.setTimeout(() => void refreshCurrentUser(), delay);
    return () => window.clearTimeout(timer);
  }, [nextChange]);

  const handleAppealDecision = useCallback((ticketId: string) => {
    if (decidedRef.current.has(ticketId)) return;
    decidedRef.current.add(ticketId);
    void refreshCurrentUser();
  }, []);

  const openAppeal = tickets.find((ticket) => isAppealTicket(ticket) && !isClosedStatus(ticket.status)) || null;

  function openCase(next: CaseSelection) {
    setSelection(next);
    window.requestAnimationFrame(() => inboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function handleSubmitted(ticketId: string | null) {
    await loadLists().catch(() => undefined);
    if (ticketId) openCase({ kind: 'ticket', id: ticketId });
  }

  async function confirmSignOut() {
    setConfirmLogout(false);
    try {
      await api.post('/api/users/logout');
    } catch {
      // The local session still has to close.
    }
    try {
      await signOut(auth);
    } catch {
      // Firebase may already be signed out.
    }
    clearUser();
    navigate('/login', { replace: true });
  }

  const tone = toneClasses(primary?.tone || 'rose');
  const HeroIcon = primary ? conditionIcon(primary.id) : ShieldCheck;
  const heroTitle = primary?.title || (hasPenalty ? 'Your account has a penalty' : 'Your account is in good standing');
  const heroBody =
    restriction?.message ||
    primary?.summary ||
    (hasPenalty
      ? 'You can sign in only to file an appeal and view your tickets and disputes.'
      : 'There is nothing on your account to appeal right now.');
  const heroEnds = primary ? (primary.endsAt ? `Ends ${formatStandingWhen(primary.endsAt)}` : primary.openEnded) : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-white" style={FONT}>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-dark-base/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Ensemble</span>
            <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-white/10" />
            <span className="hidden truncate text-sm text-gray-500 sm:block dark:text-zinc-400">Account standing & appeals</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canLeave ? (
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Ensemble</span>
                <span className="sm:hidden">Back</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <UserLogoutModal isOpen={confirmLogout} onClose={() => setConfirmLogout(false)} onConfirm={() => void confirmSignOut()} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Status summary */}
        <Card borderClass={hasPenalty ? tone.border : undefined}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                hasPenalty ? tone.icon : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <HeroIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    hasPenalty ? tone.chip : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                  }`}
                >
                  {primary?.label || (hasPenalty ? 'Penalty' : 'Good standing')}
                </span>
                {conditions.length > 1 ? (
                  <span className="text-xs text-gray-500 dark:text-zinc-400">+{conditions.length - 1} more on your account</span>
                ) : null}
              </div>
              <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">{heroTitle}</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-zinc-300">{heroBody}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {heroEnds ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 dark:border-white/10 dark:text-zinc-300">
                    <Clock className="h-3.5 w-3.5" /> {heroEnds}
                  </span>
                ) : null}
                {openAppeal ? (
                  <button
                    type="button"
                    onClick={() => openCase({ kind: 'ticket', id: openAppeal.id })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 font-medium text-blue-700 transition hover:bg-blue-500/15 dark:text-blue-300"
                  >
                    <Gavel className="h-3.5 w-3.5" /> Appeal {openAppeal.number || ''} · {openAppeal.status || 'Open'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          {/* What is on the account, and the record */}
          <div className="flex min-w-0 flex-col gap-6">
            {conditions.length ? (
              <section aria-labelledby="appeal-conditions">
                <h2 id="appeal-conditions" className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                  What is on your account
                </h2>
                <StandingConditionList conditions={conditions} />
              </section>
            ) : null}

            <Card>
              <button
                type="button"
                onClick={() => setShowRecord((open) => !open)}
                aria-expanded={showRecord}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-300">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">Account record</span>
                  <span className="block text-xs text-gray-500 dark:text-zinc-400">
                    Warnings, penalties and Platform Merit. Case IDs for your appeal are listed here.
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${showRecord ? 'rotate-180' : ''}`} />
              </button>
              {showRecord ? (
                <div className="border-t border-gray-200 px-5 py-5 dark:border-white/10">
                  <AccountRecordSection />
                </div>
              ) : null}
            </Card>
          </div>

          {/* Appeal panel */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <Card className="p-5">
              {listsLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
                </div>
              ) : openAppeal ? (
                <div className="flex flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                    <Gavel className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your appeal is with staff</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                      {openAppeal.number ? `${openAppeal.number} · ` : ''}
                      {openAppeal.status || 'Open'}
                      {openAppeal.updatedAt ? ` · updated ${formatStandingWhen(openAppeal.updatedAt)}` : ''}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-300">
                    You can have one open appeal at a time. Add anything new as a reply on that ticket.
                  </p>
                  <button
                    type="button"
                    onClick={() => openCase({ kind: 'ticket', id: openAppeal.id })}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Open the conversation
                  </button>
                </div>
              ) : hasPenalty ? (
                <AppealForm
                  title={copy.formTitle}
                  subjectPlaceholder={copy.subjectPlaceholder}
                  outcome={copy.outcome}
                  onSubmitted={handleSubmitted}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nothing to appeal</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Appeals are for active penalties. Your past tickets and disputes are still below.
                  </p>
                </div>
              )}
            </Card>

            {hasPenalty ? (
              <Card className="p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">How appeals work</h2>
                <ol className="mt-3 space-y-3">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/5 dark:text-zinc-300">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">{step.title}</span>
                        <span className="block text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{step.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}
          </aside>
        </div>

        <div ref={inboxRef} className="scroll-mt-24">
          <CaseInbox
            tickets={tickets}
            disputes={disputes}
            listsLoading={listsLoading}
            listsError={listsError}
            selection={selection}
            onSelect={setSelection}
            onRefreshLists={loadLists}
            accountId={accountId}
            replyLimited={replyLimited}
            onAppealDecision={handleAppealDecision}
          />
        </div>
      </main>
    </div>
  );
}
