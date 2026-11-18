import { useState } from 'react';
import { Archive, KeyRound, Lock, MapPin, Network, Plus, ShieldCheck, X } from 'lucide-react';
import type { FieldErrors, SecuritySettings, SettingsRules, SettingsStaffMember } from './settingsTypes';
import { normalizeIp, parseAllowlistEntry, viewerMatchesAllowlist } from './settingsLogic';
import {
  FieldError,
  INPUT_BASE,
  NumberInput,
  SettingRow,
  SettingsCard,
  SwitchControl,
  inputTone,
  useFieldIds,
} from './settingsUi';

type Props = {
  draft: SecuritySettings;
  saved: SecuritySettings;
  defaults?: SecuritySettings;
  rules: SettingsRules['security'];
  errors: FieldErrors;
  staff: SettingsStaffMember[];
  viewerIp: string | null;
  emailDelivery: boolean;
  onChange: (next: SecuritySettings) => void;
};

function StaffSignInList({ staff, required }: { staff: SettingsStaffMember[]; required: boolean }) {
  if (!staff.length) return <p className="mt-3 text-xs text-zinc-600">No staff accounts found.</p>;
  return (
    <ul className="mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
      {staff.map((member) => {
        const method = member.hasAuthenticator ? 'Authenticator app' : required ? 'Email code' : 'Password only';
        const tone = member.hasAuthenticator
          ? 'bg-emerald-500/15 text-emerald-300'
          : required
            ? 'bg-sky-500/15 text-sky-200'
            : 'bg-zinc-500/15 text-zinc-400';
        return (
          <li key={String(member.staffId)} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{member.name}</p>
              <p className="truncate text-[11px] text-zinc-500">
                {member.role}
                {member.role === 'Admin' && ' · can edit these settings'}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{method}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AllowlistEditor({
  entries,
  viewerIp,
  error,
  onChange,
}: {
  entries: string[];
  viewerIp: string | null;
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [inputError, setInputError] = useState('');
  const ids = useFieldIds('allowlist');
  const viewer = viewerIp ? normalizeIp(viewerIp) : null;
  const viewerIncluded = viewer ? viewerMatchesAllowlist(viewer, entries) : null;

  const add = (raw: string) => {
    const values = raw.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
    if (!values.length) return;
    const next = [...entries];
    for (const value of values) {
      const canonical = parseAllowlistEntry(value);
      if (!canonical) {
        setInputError(`"${value}" is not an IP address or CIDR range (for example 203.0.113.7 or 203.0.113.0/24).`);
        return;
      }
      if (!next.includes(canonical)) next.push(canonical);
    }
    onChange(next);
    setText('');
    setInputError('');
  };

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={ids.input}
          type="text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setInputError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(text);
            }
          }}
          placeholder="203.0.113.7 or 203.0.113.0/24"
          aria-label="IP address or CIDR range"
          aria-invalid={Boolean(inputError) || undefined}
          className={`${INPUT_BASE} ${inputTone(Boolean(inputError))} font-mono sm:flex-1`}
        />
        <button
          type="button"
          onClick={() => add(text)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
        {viewer && viewerIncluded !== true && (
          <button
            type="button"
            onClick={() => add(viewer)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/15"
          >
            <MapPin className="h-4 w-4" />
            Add my IP
          </button>
        )}
      </div>
      <FieldError>{inputError}</FieldError>
      <FieldError>{error}</FieldError>
      {viewer && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Your current IP is <code className="text-zinc-300">{viewer}</code>
          {viewerIncluded === true && <span className="text-emerald-300"> · on the list</span>}
          {viewerIncluded === false && entries.length > 0 && <span className="text-amber-200"> · not on the list</span>}
        </p>
      )}
      <ul className="mt-3 flex flex-wrap gap-2">
        {entries.length === 0 && <li className="text-xs text-zinc-600">No addresses yet.</li>}
        {entries.map((entry) => {
          const isViewer = viewer && viewerMatchesAllowlist(viewer, [entry]) === true;
          return (
            <li
              key={entry}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
                isViewer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/[0.08] bg-white/[0.03] text-zinc-200'
              }`}
            >
              <code>{entry}</code>
              {isViewer && <span className="text-[10px] text-emerald-300">you</span>}
              <button
                type="button"
                onClick={() => onChange(entries.filter((e) => e !== entry))}
                className="rounded p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${entry}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SecuritySettingsPanel({
  draft,
  saved,
  defaults,
  rules,
  errors,
  staff,
  viewerIp,
  emailDelivery,
  onChange,
}: Props) {
  const set = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => onChange({ ...draft, [key]: value });
  const numberRow = (key: 'minPasswordLength' | 'lockoutAfterFailedAttempts' | 'lockoutDurationMinutes' | 'auditLogRetentionDays', unit: string) => ({
    modified: draft[key] !== saved[key],
    defaultLabel: defaults && defaults[key] !== draft[key] ? `${defaults[key]} ${unit}` : null,
    onReset: defaults ? () => set(key, defaults[key]) : undefined,
    error: errors[key],
  });

  const twoFa = useFieldIds('staff-2fa');
  const minLength = useFieldIds('min-length');
  const attempts = useFieldIds('attempts');
  const lockout = useFieldIds('lockout');
  const retention = useFieldIds('retention');
  const allowlist = useFieldIds('allowlist-toggle');

  const withApp = staff.filter((s) => s.hasAuthenticator).length;
  const withoutApp = staff.length - withApp;

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Staff sign-in"
        description={`${withApp} of ${staff.length} staff account${staff.length === 1 ? '' : 's'} use an authenticator app.`}
      >
        <SettingRow
          label="Require two-factor sign-in for staff"
          htmlFor={twoFa.input}
          description="Staff with an authenticator app use it. Everyone else gets a 6-digit code by email at each sign-in. Member accounts are not affected."
          modified={draft.requireStaff2fa !== saved.requireStaff2fa}
          error={errors.requireStaff2fa}
          errorId={twoFa.error}
          control={
            <SwitchControl
              id={twoFa.input}
              label="Require two-factor sign-in for staff"
              checked={draft.requireStaff2fa}
              onChange={(v) => set('requireStaff2fa', v)}
              onText="Required"
              offText="Optional"
            />
          }
        >
          {!emailDelivery && withoutApp > 0 && (
            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              This server cannot send email, so the {withoutApp} staff without an authenticator app could not receive codes.
              Configure email delivery or have them set up an authenticator first.
            </p>
          )}
          <StaffSignInList staff={staff} required={draft.requireStaff2fa} />
        </SettingRow>
      </SettingsCard>

      <SettingsCard
        icon={<KeyRound className="h-4 w-4" />}
        title="Passwords & lockouts"
        description="Rules for member and staff passwords and repeated failed sign-ins."
      >
        <SettingRow
          label="Minimum password length"
          htmlFor={minLength.input}
          description="Applies to new accounts and password resets. Passwords also need an uppercase letter, a lowercase letter and a special character. Existing passwords keep working."
          {...numberRow('minPasswordLength', 'characters')}
          errorId={minLength.error}
          control={
            <NumberInput
              id={minLength.input}
              value={draft.minPasswordLength}
              onChange={(v) => set('minPasswordLength', v)}
              rule={rules.minPasswordLength}
              invalid={Boolean(errors.minPasswordLength)}
              suffix="characters"
            />
          }
        />
        <SettingRow
          label="Failed attempts before lockout"
          htmlFor={attempts.input}
          description="Counted per account and IP address."
          {...numberRow('lockoutAfterFailedAttempts', 'attempts')}
          errorId={attempts.error}
          control={
            <NumberInput
              id={attempts.input}
              value={draft.lockoutAfterFailedAttempts}
              onChange={(v) => set('lockoutAfterFailedAttempts', v)}
              rule={rules.lockoutAfterFailedAttempts}
              invalid={Boolean(errors.lockoutAfterFailedAttempts)}
              suffix="attempts"
            />
          }
        />
        <SettingRow
          label="Lockout duration"
          htmlFor={lockout.input}
          description="How long sign-in stays blocked after too many failed attempts."
          {...numberRow('lockoutDurationMinutes', 'minutes')}
          errorId={lockout.error}
          control={
            <NumberInput
              id={lockout.input}
              value={draft.lockoutDurationMinutes}
              onChange={(v) => set('lockoutDurationMinutes', v)}
              rule={rules.lockoutDurationMinutes}
              invalid={Boolean(errors.lockoutDurationMinutes)}
              suffix="minutes"
            />
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={<Network className="h-4 w-4" />}
        title="Admin IP allowlist"
        description="Limit the admin console to known networks. Accepts single addresses and CIDR ranges. Staff and moderator desks are not affected."
      >
        <SettingRow
          label="Restrict admin access"
          htmlFor={allowlist.input}
          description="When on, admin requests from any other address are refused. You cannot save a list that leaves out your own IP."
          modified={draft.ipAllowlistEnabled !== saved.ipAllowlistEnabled}
          error={errors.ipAllowlistEnabled}
          errorId={allowlist.error}
          control={
            <SwitchControl
              id={allowlist.input}
              label="Restrict admin access by IP"
              checked={draft.ipAllowlistEnabled}
              onChange={(v) => set('ipAllowlistEnabled', v)}
              onText="On"
              offText="Off"
              tone="amber"
            />
          }
        />
        <div className="pt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            Allowed addresses
            {JSON.stringify(draft.allowedAdminIps) !== JSON.stringify(saved.allowedAdminIps) && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-200">Edited</span>
            )}
            <span className="text-xs font-normal text-zinc-500">
              {draft.allowedAdminIps.length} / {rules.maxAllowedAdminIps}
            </span>
          </p>
          <AllowlistEditor
            entries={draft.allowedAdminIps}
            viewerIp={viewerIp}
            error={errors.allowedAdminIps}
            onChange={(next) => set('allowedAdminIps', next)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Archive className="h-4 w-4" />}
        title="Audit log"
        description="How long account and staff activity is kept."
      >
        <SettingRow
          label="Keep activity for"
          htmlFor={retention.input}
          description="Entries older than this are deleted once a day, including moderation history and settings changes."
          {...numberRow('auditLogRetentionDays', 'days')}
          errorId={retention.error}
          control={
            <NumberInput
              id={retention.input}
              value={draft.auditLogRetentionDays}
              onChange={(v) => set('auditLogRetentionDays', v)}
              rule={rules.auditLogRetentionDays}
              invalid={Boolean(errors.auditLogRetentionDays)}
              suffix="days"
            />
          }
        />
      </SettingsCard>

      <p className="flex items-center gap-2 px-1 text-[11px] text-zinc-600">
        <Lock className="h-3 w-3" />
        Security changes are logged with your name under Moderation → Activity log.
      </p>
    </div>
  );
}
