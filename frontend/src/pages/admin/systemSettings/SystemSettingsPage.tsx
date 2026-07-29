import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Coins,
  Database,
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

const fieldClass =
  'rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-500/40 focus:ring-2 focus:ring-rose-500/15';

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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/10"
    >
      <div className="min-w-0">
        <p className="font-medium text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
      </div>
      <span
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-rose-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={fieldClass}
      />
      {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
  dirty,
  saving,
  onSave,
  onDiscard,
  updatedAt,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  dirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  updatedAt?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#12131a] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
          {updatedAt && (
            <p className="mt-1 text-[11px] text-zinc-600">
              Last saved {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        {dirty && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-200">
            Unsaved changes
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
      {onSave && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save to database
          </button>
          {dirty && onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:text-white"
            >
              Discard
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
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
  const [ipDraft, setIpDraft] = useState('');

  const applyData = (d: SettingsOverview) => {
    setData(d);
    setPlatform({ ...d.sections.platform.value });
    setModeration({ ...d.sections.moderation.value });
    setEconomy(JSON.parse(JSON.stringify(d.sections.economy.value)));
    setNotifications({ ...d.sections.notifications.value });
    setSecurity({
      ...d.sections.security.value,
      allowedAdminIps: [...(d.sections.security.value.allowedAdminIps || [])],
    });
    setIpDraft('');
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/settings-overview');
      if (res.data?.success) applyData(res.data.data);
      else setError('Failed to load system settings from database');
    } catch {
      setError('Failed to load system settings from database');
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

  const dirty = useMemo(() => {
    if (!data || !platform || !moderation || !economy || !notifications || !security) {
      return {
        platform: false,
        moderation: false,
        economy: false,
        notifications: false,
        security: false,
      };
    }
    return {
      platform: stableStringify(platform) !== stableStringify(data.sections.platform.value),
      moderation: stableStringify(moderation) !== stableStringify(data.sections.moderation.value),
      economy: stableStringify(economy) !== stableStringify(data.sections.economy.value),
      notifications:
        stableStringify(notifications) !== stableStringify(data.sections.notifications.value),
      security: stableStringify(security) !== stableStringify(data.sections.security.value),
    };
  }, [data, platform, moderation, economy, notifications, security]);

  const saveSection = async (section: TabId, values: object) => {
    setSaving(true);
    try {
      const res = await api.patch('/api/admin/settings', { section, values });
      if (res.data?.success) {
        applyData(res.data.data);
        showSuccessToast(`${section[0].toUpperCase()}${section.slice(1)} settings saved to database`);
      } else {
        showErrorToast('Failed to save settings');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save settings';
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  };

  const discardSection = (section: TabId) => {
    if (!data) return;
    if (section === 'platform') setPlatform({ ...data.sections.platform.value });
    if (section === 'moderation') setModeration({ ...data.sections.moderation.value });
    if (section === 'economy') setEconomy(JSON.parse(JSON.stringify(data.sections.economy.value)));
    if (section === 'notifications') setNotifications({ ...data.sections.notifications.value });
    if (section === 'security') {
      setSecurity({
        ...data.sections.security.value,
        allowedAdminIps: [...(data.sections.security.value.allowedAdminIps || [])],
      });
      setIpDraft('');
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
          {error || 'Settings unavailable'}
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const addIp = () => {
    const ip = ipDraft.trim();
    if (!ip) return;
    if (security.allowedAdminIps.includes(ip)) {
      showErrorToast('IP already in allowlist');
      return;
    }
    setSecurity({ ...security, allowedAdminIps: [...security.allowedAdminIps, ip] });
    setIpDraft('');
  };

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Configuration</p>
            <h1 className="text-xl font-bold text-white">System settings</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Database className="h-3 w-3 text-emerald-400" />
                Loaded from <code className="text-zinc-400">platform_settings</code>
              </span>
              <span>·</span>
              <span>@{user?.username || 'admin'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh from DB
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
              {dirty[id] && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {data.alerts.length > 0 && (
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
                {a.severity === 'warning' ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {a.message}
              </span>
            ))}
          </div>
        )}

        {tab === 'platform' && (
          <SectionCard
            title="Platform identity & access"
            description="Site branding, uploads, sessions, and registration controls."
            dirty={dirty.platform}
            saving={saving}
            updatedAt={data.sections.platform.updatedAt}
            onSave={() => void saveSection('platform', platform)}
            onDiscard={() => discardSection('platform')}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Site name" value={platform.siteName} onChange={(v) => setPlatform({ ...platform, siteName: v })} />
              <TextField label="Tagline" value={platform.tagline} onChange={(v) => setPlatform({ ...platform, tagline: v })} />
              <TextField label="Support email" value={platform.supportEmail} onChange={(v) => setPlatform({ ...platform, supportEmail: v })} />
              <NumberField label="Default user merit" value={platform.defaultUserMerit} onChange={(v) => setPlatform({ ...platform, defaultUserMerit: v })} min={0} max={100} />
              <NumberField label="Max upload (MB)" value={platform.maxUploadMb} onChange={(v) => setPlatform({ ...platform, maxUploadMb: v })} min={1} max={500} />
              <NumberField label="Session timeout (min)" value={platform.sessionTimeoutMinutes} onChange={(v) => setPlatform({ ...platform, sessionTimeoutMinutes: v })} min={5} max={480} />
            </div>
            <Toggle
              label="Maintenance mode"
              description="Show downtime banner and block non-staff access"
              checked={platform.maintenanceMode}
              onChange={(v) => setPlatform({ ...platform, maintenanceMode: v })}
            />
            <Toggle
              label="Registration enabled"
              description="Allow new user sign-ups"
              checked={platform.registrationEnabled}
              onChange={(v) => setPlatform({ ...platform, registrationEnabled: v })}
            />
          </SectionCard>
        )}

        {tab === 'moderation' && (
          <SectionCard
            title="Automated moderation rules"
            description="Platform-wide auto-mod behavior and dispute routing."
            dirty={dirty.moderation}
            saving={saving}
            updatedAt={data.sections.moderation.updatedAt}
            onSave={() => void saveSection('moderation', moderation)}
            onDiscard={() => discardSection('moderation')}
          >
            <Toggle label="Spam filter" checked={moderation.spamFilterEnabled} onChange={(v) => setModeration({ ...moderation, spamFilterEnabled: v })} />
            <Toggle label="Auto-flag profanity" checked={moderation.autoFlagProfanity} onChange={(v) => setModeration({ ...moderation, autoFlagProfanity: v })} />
            <Toggle label="Hold new accounts for review" checked={moderation.autoHoldNewAccounts} onChange={(v) => setModeration({ ...moderation, autoHoldNewAccounts: v })} />
            <Toggle label="Forum link scanning" checked={moderation.forumLinkScanning} onChange={(v) => setModeration({ ...moderation, forumLinkScanning: v })} />
            <Toggle label="Marketplace listing review" checked={moderation.marketplaceListingReview} onChange={(v) => setModeration({ ...moderation, marketplaceListingReview: v })} />
            <Toggle label="Auto-assign disputes" checked={moderation.disputeAutoAssign} onChange={(v) => setModeration({ ...moderation, disputeAutoAssign: v })} />
            <Toggle label="Auto-escalate high priority" checked={moderation.autoEscalateHighPriority} onChange={(v) => setModeration({ ...moderation, autoEscalateHighPriority: v })} />
            <Toggle label="Auto-create ticket from report" checked={moderation.reportToTicketAutoCreate} onChange={(v) => setModeration({ ...moderation, reportToTicketAutoCreate: v })} />
            <NumberField
              label="Max warnings before suspend"
              value={moderation.maxWarningsBeforeSuspend}
              onChange={(v) => setModeration({ ...moderation, maxWarningsBeforeSuspend: v })}
              min={1}
              max={10}
            />
          </SectionCard>
        )}

        {tab === 'economy' && (
          <div className="space-y-6">
            <SectionCard
              title="Credit packages"
              description="Top-up packages shown to users. Sales counts are stored with each package."
              updatedAt={data.sections.economy.updatedAt}
            >
              <div className="space-y-3">
                {economy.creditPackages.map((p, i) => (
                  <div key={p.id} className="grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <TextField
                      label="Name"
                      value={p.name}
                      onChange={(v) => {
                        const pkgs = [...economy.creditPackages];
                        pkgs[i] = { ...p, name: v };
                        setEconomy({ ...economy, creditPackages: pkgs });
                      }}
                    />
                    <NumberField
                      label="Credits"
                      value={p.credits}
                      onChange={(v) => {
                        const pkgs = [...economy.creditPackages];
                        pkgs[i] = { ...p, credits: v };
                        setEconomy({ ...economy, creditPackages: pkgs });
                      }}
                    />
                    <NumberField
                      label="Price (PHP)"
                      value={p.pricePhp}
                      onChange={(v) => {
                        const pkgs = [...economy.creditPackages];
                        pkgs[i] = { ...p, pricePhp: v };
                        setEconomy({ ...economy, creditPackages: pkgs });
                      }}
                    />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Sales (DB)</span>
                      <div className="rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-sm tabular-nums text-zinc-300">
                        {p.salesCount.toLocaleString()}
                      </div>
                    </div>
                    <Toggle
                      label="Active"
                      checked={p.active}
                      onChange={(v) => {
                        const pkgs = [...economy.creditPackages];
                        pkgs[i] = { ...p, active: v };
                        setEconomy({ ...economy, creditPackages: pkgs });
                      }}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Fee management" description="Platform fee schedule by product area.">
              <div className="space-y-3">
                {economy.feeSettings.map((f, i) => (
                  <div key={f.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="font-medium text-white">{f.label}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <NumberField
                        label="Percent"
                        value={f.percent}
                        onChange={(v) => {
                          const fees = [...economy.feeSettings];
                          fees[i] = { ...f, percent: v };
                          setEconomy({ ...economy, feeSettings: fees });
                        }}
                      />
                      <NumberField
                        label="Flat fee (PHP)"
                        value={f.flatFee}
                        onChange={(v) => {
                          const fees = [...economy.feeSettings];
                          fees[i] = { ...f, flatFee: v };
                          setEconomy({ ...economy, feeSettings: fees });
                        }}
                      />
                      <TextField
                        label="Applies to"
                        value={f.appliesTo}
                        onChange={(v) => {
                          const fees = [...economy.feeSettings];
                          fees[i] = { ...f, appliesTo: v };
                          setEconomy({ ...economy, feeSettings: fees });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Marketplace economy rules"
              description="Listing fees, escrow, payouts, and refunds."
              dirty={dirty.economy}
              saving={saving}
              updatedAt={data.sections.economy.updatedAt}
              onSave={() => void saveSection('economy', economy)}
              onDiscard={() => discardSection('economy')}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Listing fee (credits)"
                  value={economy.marketplaceSettings.listingFeeCredits}
                  onChange={(v) =>
                    setEconomy({
                      ...economy,
                      marketplaceSettings: { ...economy.marketplaceSettings, listingFeeCredits: v },
                    })
                  }
                />
                <NumberField
                  label="Transaction fee (%)"
                  value={economy.marketplaceSettings.transactionFeePercent}
                  onChange={(v) =>
                    setEconomy({
                      ...economy,
                      marketplaceSettings: { ...economy.marketplaceSettings, transactionFeePercent: v },
                    })
                  }
                />
                <NumberField
                  label="Escrow hold (days)"
                  value={economy.marketplaceSettings.escrowHoldDays}
                  onChange={(v) =>
                    setEconomy({
                      ...economy,
                      marketplaceSettings: { ...economy.marketplaceSettings, escrowHoldDays: v },
                    })
                  }
                />
                <NumberField
                  label="Min payout (credits)"
                  value={economy.marketplaceSettings.minPayoutCredits}
                  onChange={(v) =>
                    setEconomy({
                      ...economy,
                      marketplaceSettings: { ...economy.marketplaceSettings, minPayoutCredits: v },
                    })
                  }
                />
                <NumberField
                  label="Refund window (days)"
                  value={economy.marketplaceSettings.refundWindowDays}
                  onChange={(v) =>
                    setEconomy({
                      ...economy,
                      marketplaceSettings: { ...economy.marketplaceSettings, refundWindowDays: v },
                    })
                  }
                />
              </div>
            </SectionCard>
          </div>
        )}

        {tab === 'notifications' && (
          <SectionCard
            title="Email & desk notifications"
            description="Admin and support notification preferences."
            dirty={dirty.notifications}
            saving={saving}
            updatedAt={data.sections.notifications.updatedAt}
            onSave={() => void saveSection('notifications', notifications)}
            onDiscard={() => discardSection('notifications')}
          >
            <Toggle label="Email on new signups" checked={notifications.emailNewSignups} onChange={(v) => setNotifications({ ...notifications, emailNewSignups: v })} />
            <Toggle label="Email on new tickets" checked={notifications.emailNewTickets} onChange={(v) => setNotifications({ ...notifications, emailNewTickets: v })} />
            <Toggle label="Email when dispute opened" checked={notifications.emailDisputeOpened} onChange={(v) => setNotifications({ ...notifications, emailDisputeOpened: v })} />
            <Toggle label="Email on high-priority reports" checked={notifications.emailHighPriorityReports} onChange={(v) => setNotifications({ ...notifications, emailHighPriorityReports: v })} />
            <Toggle label="Weekly admin digest" checked={notifications.emailWeeklyDigest} onChange={(v) => setNotifications({ ...notifications, emailWeeklyDigest: v })} />
            <Toggle label="Notify assignee on ticket" checked={notifications.notifyAssigneeOnTicket} onChange={(v) => setNotifications({ ...notifications, notifyAssigneeOnTicket: v })} />
            <Toggle label="Notify requester on resolution" checked={notifications.notifyRequesterOnResolution} onChange={(v) => setNotifications({ ...notifications, notifyRequesterOnResolution: v })} />
            <Toggle label="Slack webhook enabled" checked={notifications.slackWebhookEnabled} onChange={(v) => setNotifications({ ...notifications, slackWebhookEnabled: v })} />
            <TextField
              label="Slack webhook URL"
              value={notifications.slackWebhookUrl}
              placeholder="https://hooks.slack.com/..."
              onChange={(v) => setNotifications({ ...notifications, slackWebhookUrl: v })}
            />
          </SectionCard>
        )}

        {tab === 'security' && (
          <SectionCard
            title="Security & compliance"
            description="Staff auth, lockouts, HTTPS, and admin IP allowlist."
            dirty={dirty.security}
            saving={saving}
            updatedAt={data.sections.security.updatedAt}
            onSave={() => void saveSection('security', security)}
            onDiscard={() => discardSection('security')}
          >
            <Toggle label="Require staff 2FA" checked={security.requireStaff2fa} onChange={(v) => setSecurity({ ...security, requireStaff2fa: v })} />
            <Toggle label="Force HTTPS" checked={security.forceHttps} onChange={(v) => setSecurity({ ...security, forceHttps: v })} />
            <Toggle
              label="IP allowlist for admin"
              description="When enabled, only listed IPs can access admin routes"
              checked={security.ipAllowlistEnabled}
              onChange={(v) => setSecurity({ ...security, ipAllowlistEnabled: v })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Min password length" value={security.minPasswordLength} onChange={(v) => setSecurity({ ...security, minPasswordLength: v })} min={6} max={32} />
              <NumberField label="Lockout after failed attempts" value={security.lockoutAfterFailedAttempts} onChange={(v) => setSecurity({ ...security, lockoutAfterFailedAttempts: v })} min={3} max={20} />
              <NumberField label="Lockout duration (min)" value={security.lockoutDurationMinutes} onChange={(v) => setSecurity({ ...security, lockoutDurationMinutes: v })} min={5} max={120} />
              <NumberField label="Audit log retention (days)" value={security.auditLogRetentionDays} onChange={(v) => setSecurity({ ...security, auditLogRetentionDays: v })} min={30} max={365} />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white">Allowed admin IPs</p>
              <p className="mt-1 text-xs text-zinc-500">One address per entry. Example: 192.168.1.10</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={ipDraft}
                  onChange={(e) => setIpDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIp();
                    }
                  }}
                  placeholder="Add IP address"
                  className={`min-w-[200px] flex-1 ${fieldClass}`}
                />
                <button
                  type="button"
                  onClick={addIp}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  Add
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {security.allowedAdminIps.length === 0 && (
                  <li className="text-xs text-zinc-600">No IPs configured.</li>
                )}
                {security.allowedAdminIps.map((ip) => (
                  <li
                    key={ip}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-zinc-300"
                  >
                    <code>{ip}</code>
                    <button
                      type="button"
                      onClick={() =>
                        setSecurity({
                          ...security,
                          allowedAdminIps: security.allowedAdminIps.filter((x) => x !== ip),
                        })
                      }
                      className="text-xs text-rose-300 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.07] bg-[#12131a] p-5">
            <h2 className="font-semibold text-white">Change history</h2>
            <p className="mt-1 text-xs text-zinc-500">Recent writes to platform_settings</p>
            <ul className="mt-4 space-y-2">
              {data.changeHistory.length ? (
                data.changeHistory.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm"
                  >
                    <span className="capitalize text-white">{h.section}</span>
                    <span className="shrink-0 text-right text-xs text-zinc-500">
                      {h.updatedBy}
                      <br />
                      {h.updatedAt ? new Date(h.updatedAt).toLocaleString() : '—'}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-zinc-500">No saved changes yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#12131a] p-5">
            <h2 className="font-semibold text-white">Staff editors</h2>
            <p className="mt-1 text-xs text-zinc-500">Accounts that can update these settings</p>
            <ul className="mt-4 space-y-2">
              {data.staffEditors.map((s) => (
                <li
                  key={String(s.staffId)}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm"
                >
                  <span className="text-white">{s.name}</span>
                  <span className="text-xs text-zinc-500">{s.role}</span>
                </li>
              ))}
              {!data.staffEditors.length && (
                <li className="text-sm text-zinc-500">No staff accounts found.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
