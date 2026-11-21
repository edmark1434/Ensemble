import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, X } from "lucide-react";
import { WarningPresetFields } from "@/pages/admin/userTeam/components/WarningPresetFields";
import { PunishmentPresetFields } from "@/pages/admin/userTeam/components/PunishmentPresetFields";
import { SanctionScheduleFields, type SanctionTiming } from "@/pages/admin/userTeam/components/SanctionSchedule";
import { punishmentDurationLabel, type PunishmentPreset } from "@/lib/punishmentCatalog";
import { caseWhen } from "@/pages/moderator/shared/StaffStandingSummary";
import {
  ACCOUNT_ACTION_LABELS,
  ModerationActionError,
  submitModerationAction,
  type AccountActionId,
  type ContentActionId,
  type ModerationActionResult,
  type ModerationContext,
  type ModerationRecentAction,
} from "./platformModerationApi";

const FIELD =
  "mt-1 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none";

const ACCOUNT_ACTION_ORDER: AccountActionId[] = ["warn", "timeout", "suspend", "lock", "ban"];

const ACTION_EFFECT: Record<AccountActionId, string> = {
  warn: "Adds the named warning's points; Platform Merit drops and any automatic punishment it crosses starts.",
  timeout: "Forum writes stop for the chosen time. The rest of Ensemble stays open.",
  suspend: "Read-only across Ensemble for the chosen time. Live contract work can continue.",
  lock: "Investigation hold: sign-in is for appeals, tickets and disputes only until staff lift it.",
  ban: "Sign-in is for appeals only. Open jobs, gigs and listings close; pending proposals and orders are withdrawn.",
};

export type ActionDialogStart = {
  accountId?: string | null;
  accountAction?: AccountActionId | null;
  contentAction?: ContentActionId | null;
};

/**
 * One quick action from platform view: something on the item, something on the account, or
 * both in one step. The dialog works from the context it was opened with, so moving the frame
 * to another page while it is open never changes what it acts on; the server re-reads the item
 * anyway and refuses if it changed.
 */
export function PlatformModerationActionDialog({
  context,
  pick,
  start,
  onClose,
  onDone,
}: {
  context: ModerationContext;
  pick: string | null;
  start: ActionDialogStart;
  onClose: () => void;
  onDone: (result: ModerationActionResult) => void;
}) {
  const subject = context.subject!;
  const viewer = context.viewer;
  const actionableAccounts = context.accounts.filter((account) =>
    ACCOUNT_ACTION_ORDER.some((id) => account.actions[id]?.allowed),
  );

  const [contentAction, setContentAction] = useState<ContentActionId | null>(start.contentAction ?? null);
  const [accountId, setAccountId] = useState<string | null>(
    start.accountId ?? (start.accountAction ? actionableAccounts[0]?.accountId ?? null : null),
  );
  const account = context.accounts.find((row) => row.accountId === accountId) || null;
  const [accountAction, setAccountAction] = useState<AccountActionId | null>(start.accountAction ?? null);
  const [warningId, setWarningId] = useState("");
  const [punishmentId, setPunishmentId] = useState("");
  const [preset, setPreset] = useState<PunishmentPreset | null>(null);
  const [customDuration, setCustomDuration] = useState(false);
  const [timing, setTiming] = useState<SanctionTiming>({ duration: "temporary", endsAt: null, summary: "" });
  const [includeLeader, setIncludeLeader] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<ModerationRecentAction[] | null>(null);

  const rule = account && accountAction ? account.actions[accountAction] : null;
  const usesCatalog = accountAction === "timeout" || accountAction === "suspend" || accountAction === "ban";
  const usesSchedule = accountAction === "lock" || (usesCatalog && customDuration);
  const openEndedAllowed = viewer.fullRole || accountAction === "ban" || accountAction === "lock";
  const leader = account?.team?.leader ?? null;
  const offersLeader = Boolean(account?.isTeam && leader && (accountAction === "suspend" || accountAction === "lock" || accountAction === "ban"));
  const trimmed = reason.replace(/\s+/g, " ").trim();
  const reasonOk = trimmed.length >= context.limits.reasonMin && trimmed.length <= context.limits.reasonMax;

  // Changing the action starts its fields fresh, so a ban never inherits a suspension's clock.
  useEffect(() => {
    setPunishmentId("");
    setPreset(null);
    setCustomDuration(false);
    setRecent(null);
    setError(null);
  }, [accountAction, accountId]);

  const accountReady =
    !accountAction
    || (Boolean(account) && Boolean(rule?.allowed)
      && (accountAction !== "warn" || Boolean(warningId))
      && (!usesCatalog || Boolean(punishmentId))
      && (!usesSchedule || timing.duration === "permanent" || Boolean(timing.endsAt)));
  const canSubmit = !saving && reasonOk && (Boolean(contentAction) || Boolean(accountAction)) && accountReady;

  const onTiming = useCallback((next: SanctionTiming) => setTiming(next), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    const content = context.contentActions.find((row) => row.id === contentAction);
    if (content) parts.push(`${content.label.toLowerCase()}`);
    if (account && accountAction) {
      const who = accountAction === "warn" || accountAction === "timeout"
        ? account.isTeam && leader ? `${leader.name} (leader of ${account.name})` : account.name
        : account.name;
      const what = accountAction === "warn" ? "warn" : ACCOUNT_ACTION_LABELS[accountAction].toLowerCase();
      parts.push(`${what} ${who}${offersLeader && includeLeader && leader ? ` and the team leader, ${leader.name}` : ""}`);
    }
    if (!parts.length) return null;
    const text = parts.join(", then ");
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }, [account, accountAction, contentAction, context.contentActions, includeLeader, leader, offersLeader]);

  const submit = async (confirmRecent = false) => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const result = await submitModerationAction({
        path: context.path,
        pick,
        subjectKey: subject.key,
        reason: trimmed,
        contentAction,
        confirmRecent,
        ...(account && accountAction
          ? {
              accountId: account.accountId,
              accountAction: {
                type: accountAction,
                ...(accountAction === "warn" ? { warningId } : {}),
                ...(usesCatalog ? { punishmentId, customDuration } : {}),
                ...(usesSchedule ? { duration: timing.duration, endsAt: timing.endsAt } : {}),
                ...(offersLeader ? { includeLeader } : {}),
              },
            }
          : {}),
      });
      onDone(result);
    } catch (err) {
      if (err instanceof ModerationActionError && err.code === "RECENT_ACTION") {
        setRecent(err.recent);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "The action could not be applied.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-moderation-dialog-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131b] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">Platform view · {viewer.deskLabel}</p>
            <h2 id="platform-moderation-dialog-title" className="mt-0.5 text-base font-semibold text-white">
              Take action
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{subject.kindLabel}: {subject.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Saved as evidence with this action</p>
            <p className="mt-1 text-sm text-zinc-100">{subject.title}</p>
            {subject.excerpt ? (
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap border-l-2 border-white/15 pl-2 text-xs text-zinc-300">{subject.excerpt}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">No text to quote. The item, its state and the page are still saved.</p>
            )}
            <p className="mt-1.5 text-[11px] text-zinc-500">
              State now: {subject.statusLabel} · {context.path}
            </p>
          </section>

          {context.contentActions.length ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">On the item</h3>
              <div className="mt-2 space-y-1.5">
                <ChoiceRow
                  checked={contentAction === null}
                  onSelect={() => setContentAction(null)}
                  label="Leave the item as it is"
                />
                {context.contentActions.map((action) => (
                  <ChoiceRow
                    key={action.id}
                    checked={contentAction === action.id}
                    disabled={!action.allowed}
                    onSelect={() => setContentAction(action.id)}
                    label={action.label}
                    hint={action.allowed ? action.hint : action.reason || undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">On the account</h3>
            {context.accounts.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">No account is tied to this item.</p>
            ) : (
              <>
                {context.accounts.length > 1 ? (
                  <label className="mt-2 block text-xs text-zinc-500">
                    Account
                    <select
                      value={accountId ?? ""}
                      onChange={(event) => setAccountId(event.target.value || null)}
                      className={FIELD}
                    >
                      <option value="">No account action</option>
                      {context.accounts.map((row) => (
                        <option key={row.accountId} value={row.accountId}>
                          {row.relation}: {row.name}
                          {row.handle ? ` (@${row.handle})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Account action">
                  <SegmentButton
                    checked={!accountAction}
                    onSelect={() => setAccountAction(null)}
                    label="None"
                  />
                  {ACCOUNT_ACTION_ORDER.map((id) => {
                    const target = account || (context.accounts.length === 1 ? context.accounts[0] : null);
                    const actionRule = target?.actions[id];
                    return (
                      <SegmentButton
                        key={id}
                        checked={accountAction === id}
                        disabled={!actionRule?.allowed}
                        title={actionRule?.allowed ? ACTION_EFFECT[id] : actionRule?.reason || undefined}
                        onSelect={() => {
                          if (!account && target) setAccountId(target.accountId);
                          setAccountAction(id);
                        }}
                        label={ACCOUNT_ACTION_LABELS[id]}
                        danger={id === "ban" || id === "suspend"}
                      />
                    );
                  })}
                </div>

                {account && accountAction ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-zinc-400">{ACTION_EFFECT[accountAction]}</p>
                    {rule?.note ? <p className="text-xs text-sky-200">{rule.note}</p> : null}
                    {!rule?.allowed && rule?.reason ? <p className="text-xs text-amber-200">{rule.reason}</p> : null}

                    {accountAction === "warn" ? (
                      <WarningPresetFields
                        desk={viewer.desk ?? "admin"}
                        warningId={warningId}
                        reason={reason}
                        onWarningId={setWarningId}
                        onReason={setReason}
                        fieldClass={FIELD}
                      />
                    ) : null}

                    {usesCatalog ? (
                      <div>
                        <PunishmentPresetFields
                          desk={viewer.desk ?? "admin"}
                          kind={accountAction as "timeout" | "suspend" | "ban"}
                          punishmentId={punishmentId}
                          onPunishmentId={setPunishmentId}
                          onPreset={(next) => {
                            setPreset(next);
                            setCustomDuration(false);
                          }}
                          fieldClass={FIELD}
                        />
                        {preset ? (
                          <p className="mt-1 text-[11px] text-zinc-500">Catalog default: {punishmentDurationLabel(preset)}.</p>
                        ) : null}
                        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={customDuration}
                            onChange={(event) => setCustomDuration(event.target.checked)}
                            className="rounded border-white/20 bg-transparent"
                          />
                          Set a custom duration
                        </label>
                      </div>
                    ) : null}

                    {usesSchedule ? (
                      <SanctionScheduleFields
                        key={`${accountAction}-${punishmentId}-${customDuration ? "custom" : "default"}`}
                        allowPermanent={openEndedAllowed}
                        defaultDuration={
                          accountAction === "lock" || (openEndedAllowed && preset?.durationDays == null && usesCatalog)
                            ? "permanent"
                            : "temporary"
                        }
                        defaultDays={preset?.durationDays || 7}
                        onChange={onTiming}
                      />
                    ) : null}
                    {usesSchedule && !openEndedAllowed ? (
                      <p className="text-[11px] text-zinc-500">
                        Specialist desks set an end date (up to 365 days). For an open-ended hold, lock the account.
                      </p>
                    ) : null}

                    {offersLeader && leader ? (
                      <label className="flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-xs text-zinc-200">
                        <input
                          type="checkbox"
                          checked={includeLeader}
                          onChange={(event) => setIncludeLeader(event.target.checked)}
                          className="mt-0.5 rounded border-white/20 bg-transparent"
                        />
                        <span>
                          Also apply it to the team leader, {leader.name}
                          <span className="mt-0.5 block text-[11px] text-zinc-500">
                            The leader answers for the team. Skipped if their account is already as strict or stricter.
                          </span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </section>

          {accountAction !== "warn" ? (
            <label className="block text-xs text-zinc-500">
              Case notes
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={context.limits.reasonMax + 50}
                placeholder="What happened and why this action fits. The member sees this as the reason."
                className={FIELD}
              />
            </label>
          ) : null}
          <p className={`-mt-3 text-[11px] ${reasonOk || !trimmed ? "text-zinc-500" : "text-amber-300"}`}>
            {trimmed.length < context.limits.reasonMin
              ? `At least ${context.limits.reasonMin} characters (${trimmed.length} so far).`
              : `${trimmed.length}/${context.limits.reasonMax}`}
            {" "}The case notes go to the member with the penalty and into the audit log.
          </p>

          {recent ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Someone already acted on this account
              </p>
              <ul className="mt-2 space-y-1.5">
                {recent.map((row) => (
                  <li key={row.id} className="text-xs text-amber-50/90">
                    <span className="font-medium">{row.label}</span> · {row.actor.name} ({row.actor.role}) · {caseWhen(row.at)}
                    {row.sameSubject ? " · for this item" : ""}
                    {row.reason ? <span className="block text-amber-100/70">“{row.reason}”</span> : null}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-100/70">
                Check this is not the same incident before adding another penalty.
              </p>
            </div>
          ) : error ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
          <p className="min-w-0 flex-1 text-xs text-zinc-400">{summary || "Choose what to do."}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.06] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit(Boolean(recent))}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-500/90 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              {recent ? "Act anyway" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({
  checked,
  disabled = false,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
        checked ? "border-rose-400/40 bg-rose-400/[0.08] text-white" : "border-white/[0.08] text-zinc-300 hover:bg-white/[0.03]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1 accent-rose-500"
      />
      <span className="min-w-0">
        {label}
        {hint ? <span className="mt-0.5 block text-[11px] text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function SegmentButton({
  checked,
  disabled = false,
  onSelect,
  label,
  title,
  danger = false,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={onSelect}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
        checked
          ? danger
            ? "border-rose-400/50 bg-rose-400/15 text-rose-50"
            : "border-white/30 bg-white/10 text-white"
          : "border-white/10 text-zinc-300 hover:bg-white/[0.05]"
      }`}
    >
      {label}
    </button>
  );
}
