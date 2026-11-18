import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Award, Coins, Globe, RefreshCw, Shield, type LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { prefetchStaffRoute, prefetchStaffTab } from '@/lib/staffPrefetch';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import ConsolePageSkeleton from '@/pages/staff/ConsolePageSkeleton';
import { AdminSubscriptionsTab } from '../creditEconomy/components/AdminSubscriptionsTab';
import { formatRelative } from '../creditEconomy/economyUi';
import { AdminBadgesPanel, type BadgesSection } from '../badges/AdminBadgesPage';
import type { FieldErrors, SettingsDrafts, SettingsOverview, SettingsTabId } from './settingsTypes';
import {
  SECTION_LABELS,
  countChanges,
  draftsFrom,
  feeUsageOf,
  rulesOf,
  saveRisks,
  validateSection,
  type SaveRisk,
} from './settingsLogic';
import { ConfirmDialog, SaveBar, useUnsavedChangesGuard } from './settingsUi';
import { AlertList, ChangeHistoryPanel, LiveStatusStrip } from './SettingsOverviewParts';
import PlatformSettingsPanel from './PlatformSettingsPanel';
import EconomySettingsPanel from './EconomySettingsPanel';
import SecuritySettingsPanel from './SecuritySettingsPanel';

type TabId = SettingsTabId | 'badges';

const SECTIONS: SettingsTabId[] = ['platform', 'economy', 'security'];
const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'economy', label: 'Economy', icon: Coins },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'badges', label: 'Badges', icon: Award },
];
const VALID_TABS = TABS.map((t) => t.id);
const BADGE_SECTIONS: BadgesSection[] = ['catalog', 'grant'];
const SETTINGS_URL = '/api/admin/settings-overview';

type PerSection<T> = Record<SettingsTabId, T>;
const perSection = <T,>(make: (section: SettingsTabId) => T): PerSection<T> =>
  ({ platform: make('platform'), economy: make('economy'), security: make('security') });

type ApiError = { response?: { status?: number; data?: { message?: string; code?: string; errors?: FieldErrors } } };

function cachedOverview(): SettingsOverview | null {
  const cached = peekStaffGet(SETTINGS_URL);
  return cached?.data?.success ? (cached.data.data as SettingsOverview) : null;
}

function versionsOf(data: SettingsOverview | null): PerSection<string | null> {
  return perSection((s) => data?.sections[s]?.version ?? null);
}

export default function SystemSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const paramSection = searchParams.get('section');

  const [data, setData] = useState<SettingsOverview | null>(cachedOverview);
  const [drafts, setDrafts] = useState<SettingsDrafts | null>(() => (data ? draftsFrom(data) : null));
  /** Version each draft was started from; a save sends it so the server can refuse stale edits. */
  const [baseVersions, setBaseVersions] = useState<PerSection<string | null>>(() => versionsOf(data));
  const [loading, setLoading] = useState(() => !data);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<SettingsTabId | null>(null);
  const [serverErrors, setServerErrors] = useState<PerSection<FieldErrors>>(() => perSection(() => ({})));
  const [pendingSave, setPendingSave] = useState<{ section: SettingsTabId; risks: SaveRisk[] } | null>(null);
  const [conflict, setConflict] = useState<{ section: SettingsTabId; message: string } | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);

  const [tab, setTab] = useState<TabId>(paramTab && VALID_TABS.includes(paramTab) ? paramTab : 'platform');
  const [badgeSection, setBadgeSection] = useState<BadgesSection>(
    paramSection && BADGE_SECTIONS.includes(paramSection as BadgesSection) ? (paramSection as BadgesSection) : 'catalog'
  );

  const saved = useMemo(() => (data ? draftsFrom(data) : null), [data]);

  const changeCounts = useMemo<PerSection<number>>(
    () => perSection((s) => (saved && drafts ? countChanges(saved[s], drafts[s]) : 0)),
    [saved, drafts]
  );
  const changeCountsRef = useRef(changeCounts);
  const dataRef = useRef(data);
  useEffect(() => {
    changeCountsRef.current = changeCounts;
    dataRef.current = data;
  }, [changeCounts, data]);

  const errors = useMemo<PerSection<FieldErrors>>(
    () => perSection((s) => (data && drafts ? { ...validateSection(s, drafts, data), ...serverErrors[s] } : {})),
    [data, drafts, serverErrors]
  );

  const anyDirty = SECTIONS.some((s) => changeCounts[s] > 0);
  useUnsavedChangesGuard(anyDirty);

  /** Take new server data. Sections with unsaved edits keep their draft and base version unless `discard`. */
  const applyData = useCallback((next: SettingsOverview, { discard = [] as SettingsTabId[] } = {}) => {
    const fresh = draftsFrom(next);
    const freshVersions = versionsOf(next);
    const keep = (s: SettingsTabId) => changeCountsRef.current[s] > 0 && !discard.includes(s);
    setData(next);
    setDrafts((prev) => (prev ? perSection((s) => (keep(s) ? prev[s] : fresh[s])) as SettingsDrafts : fresh));
    setBaseVersions((prev) => perSection((s) => (keep(s) ? prev[s] : freshVersions[s])));
  }, []);

  const load = useCallback(
    async ({ discardAll = false } = {}) => {
      const hasData = Boolean(cachedOverview()) || Boolean(dataRef.current);
      if (hasData) setRefreshing(true);
      else setLoading(true);
      setLoadError('');
      try {
        const res = await staffGet(SETTINGS_URL);
        if (res.data?.success) {
          applyData(res.data.data, { discard: discardAll ? SECTIONS : [] });
          if (discardAll) setServerErrors(perSection(() => ({})));
        } else {
          setLoadError('System settings could not be loaded.');
        }
      } catch {
        setLoadError('System settings could not be loaded.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyData]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (paramTab && VALID_TABS.includes(paramTab)) setTab(paramTab);
    if (paramTab === 'badges') {
      if (paramSection && BADGE_SECTIONS.includes(paramSection as BadgesSection)) {
        setBadgeSection(paramSection as BadgesSection);
      }
      prefetchStaffRoute('/admin/badges');
    }
  }, [paramTab, paramSection]);

  const switchTab = (id: TabId) => {
    setTab(id);
    if (id === 'badges') {
      prefetchStaffRoute('/admin/badges');
      setSearchParams(badgeSection === 'catalog' ? { tab: id } : { tab: id, section: badgeSection }, { replace: true });
      return;
    }
    setSearchParams(id === 'platform' ? {} : { tab: id }, { replace: true });
  };

  const switchBadgeSection = (section: BadgesSection) => {
    setBadgeSection(section);
    setSearchParams(section === 'catalog' ? { tab: 'badges' } : { tab: 'badges', section }, { replace: true });
  };

  const updateDraft = <S extends SettingsTabId>(section: S, value: SettingsDrafts[S]) => {
    setDrafts((prev) => (prev ? { ...prev, [section]: value } : prev));
    if (Object.keys(serverErrors[section]).length) {
      setServerErrors((prev) => ({ ...prev, [section]: {} }));
    }
  };

  const discard = (section: SettingsTabId) => {
    if (!saved) return;
    setDrafts((prev) => (prev ? { ...prev, [section]: saved[section] } : prev));
    setBaseVersions((prev) => ({ ...prev, [section]: data?.sections[section]?.version ?? null }));
    setServerErrors((prev) => ({ ...prev, [section]: {} }));
  };

  const doSave = async (section: SettingsTabId) => {
    if (!drafts) return;
    setSaving(section);
    try {
      const res = await api.patch('/api/admin/settings', {
        section,
        values: drafts[section],
        baseVersion: baseVersions[section] ?? undefined,
      });
      if (res.data?.success) {
        applyData(res.data.data, { discard: [section] });
        setServerErrors((prev) => ({ ...prev, [section]: {} }));
        showSuccessToast(res.data.changed === false ? 'No changes to save' : `${SECTION_LABELS[section]} settings saved`);
      } else {
        showErrorToast('Settings could not be saved');
      }
    } catch (err: unknown) {
      const response = (err as ApiError).response;
      const body = response?.data;
      if (response?.status === 400 && body?.errors) {
        setServerErrors((prev) => ({ ...prev, [section]: body.errors || {} }));
        showErrorToast(body.message || 'Some settings need attention');
      } else if (response?.status === 409) {
        setConflict({ section, message: body?.message || 'These settings were changed by someone else.' });
      } else if (response?.status === 403 && body?.code === 'ADMIN_IP_NOT_ALLOWED') {
        showErrorToast('Your network is not on the admin IP allowlist.');
      } else {
        showErrorToast(body?.message || 'Settings could not be saved');
      }
    } finally {
      setSaving(null);
      setPendingSave(null);
    }
  };

  const requestSave = (section: SettingsTabId) => {
    if (!saved || !drafts || !data) return;
    const risks = saveRisks(section, saved, drafts, data);
    if (risks.length) setPendingSave({ section, risks });
    else void doSave(section);
  };

  const requestRefresh = () => {
    if (anyDirty) setConfirmReload(true);
    else void load();
  };

  if (loading && !data) return <ConsolePageSkeleton />;

  if (!data || !drafts || !saved) {
    return (
      <main className="relative min-h-screen p-6 md:pl-[260px] md:pr-8 md:pt-8">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {loadError || 'System settings are unavailable.'}
          </p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl border border-red-400/30 px-4 py-2 text-xs hover:bg-red-500/10">
            Try again
          </button>
        </div>
      </main>
    );
  }

  const rules = rulesOf(data);
  const section = tab === 'badges' ? null : tab;
  const tabAlerts = section ? data.alerts.filter((a) => !a.tab || a.tab === section) : [];
  const lastSaved = SECTIONS.map((s) => data.sections[s]?.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <main className="relative min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Configuration</p>
            <h1 className="text-xl font-bold text-white">System settings</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Platform-wide rules for members, money and staff access.
              {data.propagationSeconds ? ` Saved changes reach every server within about ${data.propagationSeconds} seconds.` : ''}
            </p>
          </div>
          {section && (
            <div className="flex items-center gap-3">
              {lastSaved && <span className="hidden text-[11px] text-zinc-500 sm:inline">Last change {formatRelative(lastSaved)}</span>}
              <button
                type="button"
                onClick={requestRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 transition hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Reload
              </button>
            </div>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 sm:px-4 md:px-6" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => {
            const dirty = id !== 'badges' && changeCounts[id] > 0;
            const warnings = id !== 'badges' ? data.alerts.filter((a) => a.tab === id && a.severity === 'warning').length : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                onMouseEnter={() => id === 'economy' && prefetchStaffTab('systemSettings', 'economy')}
                aria-current={tab === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${
                  tab === id ? 'border-rose-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
                {!dirty && warnings > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-200" title={`${warnings} warning${warnings === 1 ? '' : 's'}`}>
                    {warnings}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {section ? (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <LiveStatusStrip data={data} onOpen={switchTab} />
          <AlertList alerts={tabAlerts} />

          {section === 'platform' && (
            <PlatformSettingsPanel
              draft={drafts.platform}
              saved={saved.platform}
              defaults={data.defaults?.platform}
              rules={rules.platform}
              errors={errors.platform}
              onChange={(next) => updateDraft('platform', next)}
            />
          )}

          {section === 'economy' && (
            <div className="space-y-6">
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
                Wallet balances, holds and the ledger live in{' '}
                <Link to="/admin/credit-economy" className="font-medium text-rose-300 hover:underline">
                  Credits &amp; Economy
                </Link>
                .
              </p>
              <EconomySettingsPanel
                draft={drafts.economy}
                saved={saved.economy}
                defaults={data.defaults?.economy}
                rules={rules.economy}
                feeUsage={feeUsageOf(data)}
                errors={errors.economy}
                onChange={(next) => updateDraft('economy', next)}
              />
            </div>
          )}

          {section === 'security' && (
            <SecuritySettingsPanel
              draft={drafts.security}
              saved={saved.security}
              defaults={data.defaults?.security}
              rules={rules.security}
              errors={errors.security}
              staff={data.staff || []}
              viewerIp={data.viewer?.ip ?? null}
              emailDelivery={data.delivery?.email !== false}
              onChange={(next) => updateDraft('security', next)}
            />
          )}

          {section === 'economy' && (
            <div className="space-y-3 border-t border-white/[0.06] pt-6">
              <p className="text-xs text-zinc-500">Subscription plans save on their own, from each plan&apos;s editor.</p>
              <AdminSubscriptionsTab />
            </div>
          )}

          <ChangeHistoryPanel entries={data.changeHistory || []} section={section} />

          <SaveBar
            sectionLabel={SECTION_LABELS[section]}
            changeCount={changeCounts[section]}
            errorCount={Object.keys(errors[section]).length}
            saving={saving === section}
            onSave={() => requestSave(section)}
            onDiscard={() => discard(section)}
          />
        </div>
      ) : (
        <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <AdminBadgesPanel section={badgeSection} onSectionChange={switchBadgeSection} />
        </div>
      )}

      {pendingSave && (
        <ConfirmDialog
          title={`Save ${SECTION_LABELS[pendingSave.section]} settings?`}
          confirmLabel="Save changes"
          tone={pendingSave.risks.some((r) => r.tone === 'danger') ? 'danger' : 'default'}
          busy={saving === pendingSave.section}
          onCancel={() => setPendingSave(null)}
          onConfirm={() => void doSave(pendingSave.section)}
        >
          <p className="text-zinc-400">These changes take effect for everyone as soon as you save:</p>
          <ul className="mt-3 space-y-2">
            {pendingSave.risks.map((risk) => (
              <li
                key={risk.id}
                className={`rounded-xl border px-3 py-2.5 ${
                  risk.tone === 'danger' ? 'border-red-500/25 bg-red-500/[0.07]' : 'border-amber-500/20 bg-amber-500/[0.06]'
                }`}
              >
                <p className="font-medium text-white">{risk.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{risk.detail}</p>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}

      {conflict && (
        <ConfirmDialog
          title="Settings changed elsewhere"
          confirmLabel="Reload and discard my edits"
          tone="danger"
          onCancel={() => setConflict(null)}
          onConfirm={() => {
            setConflict(null);
            void load({ discardAll: true });
          }}
        >
          <p>{conflict.message}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Keep editing to copy your values somewhere first. Nothing was saved.
          </p>
        </ConfirmDialog>
      )}

      {confirmReload && (
        <ConfirmDialog
          title="Reload settings?"
          confirmLabel="Discard edits and reload"
          tone="danger"
          onCancel={() => setConfirmReload(false)}
          onConfirm={() => {
            setConfirmReload(false);
            void load({ discardAll: true });
          }}
        >
          <p>
            Unsaved edits in{' '}
            {SECTIONS.filter((s) => changeCounts[s] > 0)
              .map((s) => SECTION_LABELS[s])
              .join(', ')}{' '}
            will be discarded.
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}
