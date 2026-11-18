import { useState } from 'react';
import { AlertTriangle, ChevronDown, History, Info } from 'lucide-react';
import { formatDateTime, formatRelative } from '../creditEconomy/economyUi';
import type { SettingsAlert, SettingsHistoryEntry, SettingsOverview, SettingsTabId } from './settingsTypes';
import { SECTION_LABELS } from './settingsLogic';

// ---------------------------------------------------------------------------
// Live status
// ---------------------------------------------------------------------------

type Tile = {
  id: string;
  tab: SettingsTabId;
  label: string;
  value: string;
  hint: string;
  tone: 'ok' | 'warn' | 'neutral';
};

const TONE: Record<Tile['tone'], { dot: string; value: string }> = {
  ok: { dot: 'bg-emerald-400', value: 'text-white' },
  warn: { dot: 'bg-amber-400', value: 'text-amber-100' },
  neutral: { dot: 'bg-zinc-500', value: 'text-white' },
};

export function LiveStatusStrip({ data, onOpen }: { data: SettingsOverview; onOpen: (tab: SettingsTabId) => void }) {
  const platform = data.sections.platform.value;
  const security = data.sections.security.value;
  const staff = data.staff || [];
  const withApp = staff.filter((s) => s.hasAuthenticator).length;
  const ips = security.allowedAdminIps || [];

  const tiles: Tile[] = [
    {
      id: 'maintenance',
      tab: 'platform',
      label: 'Member app',
      value: platform.maintenanceMode ? 'Maintenance' : 'Online',
      hint: platform.maintenanceMode ? 'Members are blocked' : 'Members can sign in',
      tone: platform.maintenanceMode ? 'warn' : 'ok',
    },
    {
      id: 'signups',
      tab: 'platform',
      label: 'Sign-ups',
      value: platform.registrationEnabled ? 'Open' : 'Closed',
      hint: platform.registrationEnabled ? 'New members can join' : 'New accounts are refused',
      tone: platform.registrationEnabled ? 'ok' : 'warn',
    },
    {
      id: '2fa',
      tab: 'security',
      label: 'Staff 2FA',
      value: security.requireStaff2fa ? 'Required' : 'Optional',
      hint: staff.length ? `${withApp} of ${staff.length} use an authenticator` : 'No staff found',
      tone: security.requireStaff2fa ? 'ok' : 'neutral',
    },
    {
      id: 'allowlist',
      tab: 'security',
      label: 'Admin IP allowlist',
      value: security.ipAllowlistEnabled ? `On · ${ips.length}` : 'Off',
      hint: security.ipAllowlistEnabled ? `${ips.length} address${ips.length === 1 ? '' : 'es'} allowed` : 'Any network can reach admin',
      tone: security.ipAllowlistEnabled ? (ips.length ? 'ok' : 'warn') : 'neutral',
    },
  ];

  return (
    <div className="console-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Live settings status">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          onClick={() => onOpen(tile.tab)}
          className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-4 text-left transition hover:border-white/20"
        >
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <span className={`h-1.5 w-1.5 rounded-full ${TONE[tile.tone].dot}`} />
            {tile.label}
          </p>
          <p className={`mt-2 text-lg font-bold ${TONE[tile.tone].value}`}>{tile.value}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{tile.hint}</p>
        </button>
      ))}
    </div>
  );
}

export function AlertList({ alerts }: { alerts: SettingsAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const warning = alert.severity === 'warning';
        return (
          <p
            key={alert.id}
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              warning ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : 'border-white/[0.08] bg-white/[0.02] text-zinc-300'
            }`}
          >
            {warning ? <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> : <Info className="mt-px h-3.5 w-3.5 shrink-0" />}
            {alert.message}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change history
// ---------------------------------------------------------------------------

function HistoryItem({ entry }: { entry: SettingsHistoryEntry }) {
  const [open, setOpen] = useState(false);
  const changes = entry.changes || [];
  const total = entry.changeCount || changes.length;
  const preview = open ? changes : changes.slice(0, 3);
  const section = SECTION_LABELS[entry.section as SettingsTabId] || entry.section;

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-white">
          <span className="font-medium">{entry.updatedBy}</span>
          <span className="text-zinc-500"> changed </span>
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-xs text-zinc-200">{section}</span>
        </p>
        <time className="text-[11px] text-zinc-500" dateTime={entry.updatedAt} title={formatDateTime(entry.updatedAt)}>
          {formatRelative(entry.updatedAt)}
        </time>
      </div>
      {preview.length > 0 && (
        <ul className="mt-2 space-y-1">
          {preview.map((change, index) => (
            <li key={`${change.label}-${index}`} className="flex flex-wrap gap-x-1.5 text-xs">
              <span className="text-zinc-400">{change.label}:</span>
              <span className="text-zinc-500 line-through decoration-zinc-600">{change.from}</span>
              <span className="text-zinc-600">→</span>
              <span className="text-zinc-200">{change.to}</span>
            </li>
          ))}
        </ul>
      )}
      {(changes.length > 3 || total > changes.length) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
          aria-expanded={open}
        >
          {open ? 'Show less' : `Show all ${total} changes`}
          <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </li>
  );
}

export function ChangeHistoryPanel({ entries, section }: { entries: SettingsHistoryEntry[]; section: SettingsTabId }) {
  const [showAll, setShowAll] = useState(false);
  const relevant = showAll ? entries : entries.filter((entry) => entry.section === section);
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-300">
            <History className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Change history</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Who saved what, newest first.</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-white/[0.08] p-0.5 text-xs" role="group" aria-label="History scope">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            aria-pressed={!showAll}
            className={`rounded-md px-2.5 py-1 ${!showAll ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {SECTION_LABELS[section]}
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-pressed={showAll}
            className={`rounded-md px-2.5 py-1 ${showAll ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            All sections
          </button>
        </div>
      </div>
      {relevant.length ? (
        <ul className="divide-y divide-white/[0.06]">
          {relevant.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-zinc-500">
          No recorded changes{showAll ? '' : ` to ${SECTION_LABELS[section]} settings`} yet. Every save is logged from now on.
        </p>
      )}
    </section>
  );
}
