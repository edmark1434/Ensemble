import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Coins,
  Globe,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type {
  EconomySettings,
  ModerationSettings,
  NotificationSettings,
  PlatformSettings,
  SecuritySettings,
  SettingsOverview,
} from './settingsTypes';

type TabId = 'platform' | 'moderation' | 'economy' | 'notifications' | 'security';

const TABS: { id: TabId; label: string; icon: typeof Settings2 }[] = [
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
  { id: 'economy', label: 'Economy', icon: Coins },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div>
        <p className="font-medium text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-rose-500"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-zinc-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-zinc-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white"
      />
    </label>
  );
}

export default function SystemSettingsPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const valid: TabId[] = ['platform', 'moderation', 'economy', 'notifications', 'security'];
  const initialTab = paramTab && valid.includes(paramTab) ? paramTab : 'platform';

  const [data, setData] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [platform, setPlatform] = useState<PlatformSettings | null>(null);
  const [moderation, setModeration] = useState<ModerationSettings | null>(null);
  const [economy, setEconomy] = useState<EconomySettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  const applyData = (d: SettingsOverview) => {
    setData(d);
    setPlatform({ ...d.sections.platform.value });
    setModeration({ ...d.sections.moderation.value });
    setEconomy(JSON.parse(JSON.stringify(d.sections.economy.value)));
    setNotifications({ ...d.sections.notifications.value });
    setSecurity({ ...d.sections.security.value });
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/settings-overview');
      if (res.data?.success) applyData(res.data.data);
      else setError('Failed to load system settings');
    } catch {
      setError('Failed to load system settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (paramTab && valid.includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'platform' ? {} : { tab: id }, { replace: true });
  };

  const saveSection = async (section: TabId, values: object) => {
    setSaving(true);
    try {
      const res = await api.patch('/api/admin/settings', { section, values });
      if (res.data?.success) {
        applyData(res.data.data);
        showSuccessToast(`${section} settings saved`);
      }
    } catch {
      showErrorToast('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
      </main>
    );
  }

  if (error || !data || !platform || !moderation || !economy || !notifications || !security) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Configuration</p>
            <h1 className="text-xl font-bold text-white">System settings</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Platform-wide rules · persisted in <code className="text-zinc-400">platform_settings</code> · @{user?.username || 'admin'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id ? 'border-rose-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap gap-2">
          {data.alerts.map((a) => (
            <span
              key={a.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                a.severity === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {a.message}
            </span>
          ))}
        </div>

        {tab === 'platform' && (
          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="font-semibold text-white">Platform identity & access</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Site name" value={platform.siteName} onChange={(v) => setPlatform({ ...platform, siteName: v })} />
              <TextField label="Tagline" value={platform.tagline} onChange={(v) => setPlatform({ ...platform, tagline: v })} />
              <TextField label="Support email" value={platform.supportEmail} onChange={(v) => setPlatform({ ...platform, supportEmail: v })} />
              <NumberField label="Default user merit" value={platform.defaultUserMerit} onChange={(v) => setPlatform({ ...platform, defaultUserMerit: v })} min={0} max={100} />
              <NumberField label="Max upload (MB)" value={platform.maxUploadMb} onChange={(v) => setPlatform({ ...platform, maxUploadMb: v })} min={1} max={500} />
              <NumberField label="Session timeout (min)" value={platform.sessionTimeoutMinutes} onChange={(v) => setPlatform({ ...platform, sessionTimeoutMinutes: v })} min={5} max={480} />
            </div>
            <Toggle label="Maintenance mode" description="Show downtime banner and block non-staff logins" checked={platform.maintenanceMode} onChange={(v) => setPlatform({ ...platform, maintenanceMode: v })} />
            <Toggle label="Registration enabled" description="Allow new user sign-ups" checked={platform.registrationEnabled} onChange={(v) => setPlatform({ ...platform, registrationEnabled: v })} />
            <SaveButton saving={saving} onClick={() => void saveSection('platform', platform)} />
          </section>
        )}

        {tab === 'moderation' && (
          <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="font-semibold text-white">Automated moderation rules</h2>
            <p className="text-xs text-zinc-500">Controls platform-wide auto-mod behavior and dispute routing.</p>
            <Toggle label="Spam filter" checked={moderation.spamFilterEnabled} onChange={(v) => setModeration({ ...moderation, spamFilterEnabled: v })} />
            <Toggle label="Auto-flag profanity" checked={moderation.autoFlagProfanity} onChange={(v) => setModeration({ ...moderation, autoFlagProfanity: v })} />
            <Toggle label="Hold new accounts for review" checked={moderation.autoHoldNewAccounts} onChange={(v) => setModeration({ ...moderation, autoHoldNewAccounts: v })} />
            <Toggle label="Forum link scanning" checked={moderation.forumLinkScanning} onChange={(v) => setModeration({ ...moderation, forumLinkScanning: v })} />
            <Toggle label="Marketplace listing review" checked={moderation.marketplaceListingReview} onChange={(v) => setModeration({ ...moderation, marketplaceListingReview: v })} />
            <Toggle label="Auto-assign disputes" checked={moderation.disputeAutoAssign} onChange={(v) => setModeration({ ...moderation, disputeAutoAssign: v })} />
            <Toggle label="Auto-escalate high priority" checked={moderation.autoEscalateHighPriority} onChange={(v) => setModeration({ ...moderation, autoEscalateHighPriority: v })} />
            <Toggle label="Auto-create ticket from report" checked={moderation.reportToTicketAutoCreate} onChange={(v) => setModeration({ ...moderation, reportToTicketAutoCreate: v })} />
            <NumberField label="Max warnings before suspend" value={moderation.maxWarningsBeforeSuspend} onChange={(v) => setModeration({ ...moderation, maxWarningsBeforeSuspend: v })} min={1} max={10} />
            <SaveButton saving={saving} onClick={() => void saveSection('moderation', moderation)} />
          </section>
        )}

        {tab === 'economy' && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
              <h2 className="font-semibold text-white">Credit packages</h2>
              <div className="mt-4 space-y-3">
                {economy.creditPackages.map((p, i) => (
                  <div key={p.id} className="grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-4">
                    <TextField label="Name" value={p.name} onChange={(v) => {
                      const pkgs = [...economy.creditPackages];
                      pkgs[i] = { ...p, name: v };
                      setEconomy({ ...economy, creditPackages: pkgs });
                    }} />
                    <NumberField label="Credits" value={p.credits} onChange={(v) => {
                      const pkgs = [...economy.creditPackages];
                      pkgs[i] = { ...p, credits: v };
                      setEconomy({ ...economy, creditPackages: pkgs });
                    }} />
                    <NumberField label="Price (PHP)" value={p.pricePhp} onChange={(v) => {
                      const pkgs = [...economy.creditPackages];
                      pkgs[i] = { ...p, pricePhp: v };
                      setEconomy({ ...economy, creditPackages: pkgs });
                    }} />
                    <Toggle label="Active" checked={p.active} onChange={(v) => {
                      const pkgs = [...economy.creditPackages];
                      pkgs[i] = { ...p, active: v };
                      setEconomy({ ...economy, creditPackages: pkgs });
                    }} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
              <h2 className="font-semibold text-white">Fee management</h2>
              <div className="mt-4 space-y-3">
                {economy.feeSettings.map((f, i) => (
                  <div key={f.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="font-medium text-white">{f.label}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <NumberField label="Percent" value={f.percent} onChange={(v) => {
                        const fees = [...economy.feeSettings];
                        fees[i] = { ...f, percent: v };
                        setEconomy({ ...economy, feeSettings: fees });
                      }} />
                      <NumberField label="Flat fee (PHP)" value={f.flatFee} onChange={(v) => {
                        const fees = [...economy.feeSettings];
                        fees[i] = { ...f, flatFee: v };
                        setEconomy({ ...economy, feeSettings: fees });
                      }} />
                      <TextField label="Applies to" value={f.appliesTo} onChange={(v) => {
                        const fees = [...economy.feeSettings];
                        fees[i] = { ...f, appliesTo: v };
                        setEconomy({ ...economy, feeSettings: fees });
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
              <h2 className="font-semibold text-white">Marketplace economy rules</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Listing fee (credits)" value={economy.marketplaceSettings.listingFeeCredits} onChange={(v) => setEconomy({ ...economy, marketplaceSettings: { ...economy.marketplaceSettings, listingFeeCredits: v } })} />
                <NumberField label="Transaction fee (%)" value={economy.marketplaceSettings.transactionFeePercent} onChange={(v) => setEconomy({ ...economy, marketplaceSettings: { ...economy.marketplaceSettings, transactionFeePercent: v } })} />
                <NumberField label="Escrow hold (days)" value={economy.marketplaceSettings.escrowHoldDays} onChange={(v) => setEconomy({ ...economy, marketplaceSettings: { ...economy.marketplaceSettings, escrowHoldDays: v } })} />
                <NumberField label="Min payout (credits)" value={economy.marketplaceSettings.minPayoutCredits} onChange={(v) => setEconomy({ ...economy, marketplaceSettings: { ...economy.marketplaceSettings, minPayoutCredits: v } })} />
                <NumberField label="Refund window (days)" value={economy.marketplaceSettings.refundWindowDays} onChange={(v) => setEconomy({ ...economy, marketplaceSettings: { ...economy.marketplaceSettings, refundWindowDays: v } })} />
              </div>
              <SaveButton saving={saving} onClick={() => void saveSection('economy', economy)} />
            </section>
          </div>
        )}

        {tab === 'notifications' && (
          <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="font-semibold text-white">Email & desk notifications</h2>
            <Toggle label="Email on new signups" checked={notifications.emailNewSignups} onChange={(v) => setNotifications({ ...notifications, emailNewSignups: v })} />
            <Toggle label="Email on new tickets" checked={notifications.emailNewTickets} onChange={(v) => setNotifications({ ...notifications, emailNewTickets: v })} />
            <Toggle label="Email when dispute opened" checked={notifications.emailDisputeOpened} onChange={(v) => setNotifications({ ...notifications, emailDisputeOpened: v })} />
            <Toggle label="Email on high-priority reports" checked={notifications.emailHighPriorityReports} onChange={(v) => setNotifications({ ...notifications, emailHighPriorityReports: v })} />
            <Toggle label="Weekly admin digest" checked={notifications.emailWeeklyDigest} onChange={(v) => setNotifications({ ...notifications, emailWeeklyDigest: v })} />
            <Toggle label="Notify assignee on ticket" checked={notifications.notifyAssigneeOnTicket} onChange={(v) => setNotifications({ ...notifications, notifyAssigneeOnTicket: v })} />
            <Toggle label="Notify requester on resolution" checked={notifications.notifyRequesterOnResolution} onChange={(v) => setNotifications({ ...notifications, notifyRequesterOnResolution: v })} />
            <Toggle label="Slack webhook enabled" checked={notifications.slackWebhookEnabled} onChange={(v) => setNotifications({ ...notifications, slackWebhookEnabled: v })} />
            <TextField label="Slack webhook URL" value={notifications.slackWebhookUrl} onChange={(v) => setNotifications({ ...notifications, slackWebhookUrl: v })} />
            <SaveButton saving={saving} onClick={() => void saveSection('notifications', notifications)} />
          </section>
        )}

        {tab === 'security' && (
          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="font-semibold text-white">Security & compliance</h2>
            <Toggle label="Require staff 2FA" checked={security.requireStaff2fa} onChange={(v) => setSecurity({ ...security, requireStaff2fa: v })} />
            <Toggle label="Force HTTPS" checked={security.forceHttps} onChange={(v) => setSecurity({ ...security, forceHttps: v })} />
            <Toggle label="IP allowlist for admin" checked={security.ipAllowlistEnabled} onChange={(v) => setSecurity({ ...security, ipAllowlistEnabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Min password length" value={security.minPasswordLength} onChange={(v) => setSecurity({ ...security, minPasswordLength: v })} min={6} max={32} />
              <NumberField label="Lockout after failed attempts" value={security.lockoutAfterFailedAttempts} onChange={(v) => setSecurity({ ...security, lockoutAfterFailedAttempts: v })} min={3} max={20} />
              <NumberField label="Lockout duration (min)" value={security.lockoutDurationMinutes} onChange={(v) => setSecurity({ ...security, lockoutDurationMinutes: v })} min={5} max={120} />
              <NumberField label="Audit log retention (days)" value={security.auditLogRetentionDays} onChange={(v) => setSecurity({ ...security, auditLogRetentionDays: v })} min={30} max={365} />
            </div>
            <SaveButton saving={saving} onClick={() => void saveSection('security', security)} />
          </section>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h2 className="font-semibold text-white">Change history</h2>
          <ul className="mt-4 space-y-2">
            {data.changeHistory.length ? (
              data.changeHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-2 text-sm">
                  <span className="text-white">{h.section}</span>
                  <span className="text-zinc-500">
                    {h.updatedBy} · {h.updatedAt ? new Date(h.updatedAt).toLocaleString() : '—'}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-zinc-500">No saved changes yet — defaults are in use.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save changes
    </button>
  );
}
