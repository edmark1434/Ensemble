import type { MenuItem } from './components/RowActionsMenu';
import type { UserTeamCapabilities } from './userTeamCapabilities';

export type StatusActionId =
  | 'ban'
  | 'unban'
  | 'suspend'
  | 'unsuspend'
  | 'lock'
  | 'unlock'
  | 'warn'
  | 'pardon';

/** Normalize account status for comparisons. */
export function normalizeAccountStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function allowAction(id: string, caps?: UserTeamCapabilities) {
  if (!caps) return true;
  if (id === 'warn') return caps.canWarn;
  if (id === 'pardon') return caps.canPardon;
  return caps.statusActions.has(id);
}

/**
 * Status actions depend on current account state.
 * Reverse actions replace Ban/Suspend/Lock when already applied.
 */
export function getManageActionsForStatus(
  status?: string | null,
  options?: { hasViolations?: boolean; capabilities?: UserTeamCapabilities }
): MenuItem[] {
  const s = normalizeAccountStatus(status);
  const caps = options?.capabilities;
  const items: MenuItem[] = [];

  if (s === 'banned') {
    if (allowAction('unban', caps)) items.push({ id: 'unban', label: 'Unban', section: 'manage' });
  } else if (s === 'suspended') {
    if (allowAction('unsuspend', caps)) {
      items.push({ id: 'unsuspend', label: 'Unsuspend', section: 'manage' });
    }
    if (allowAction('lock', caps)) items.push({ id: 'lock', label: 'Lock', section: 'manage' });
    if (allowAction('ban', caps)) items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  } else if (s === 'locked') {
    if (allowAction('unlock', caps)) items.push({ id: 'unlock', label: 'Unlock', section: 'manage' });
    if (allowAction('suspend', caps)) {
      items.push({ id: 'suspend', label: 'Suspend', danger: true, section: 'manage' });
    }
    if (allowAction('ban', caps)) items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  } else {
    if (allowAction('suspend', caps)) {
      items.push({ id: 'suspend', label: 'Suspend', danger: true, section: 'manage' });
    }
    if (allowAction('lock', caps)) items.push({ id: 'lock', label: 'Lock', section: 'manage' });
    if (allowAction('ban', caps)) items.push({ id: 'ban', label: 'Ban', danger: true, section: 'manage' });
  }

  if (allowAction('warn', caps)) items.push({ id: 'warn', label: 'Issue warning', section: 'manage' });

  if (
    allowAction('pardon', caps) &&
    (options?.hasViolations || s === 'banned' || s === 'suspended' || s === 'locked')
  ) {
    items.push({ id: 'pardon', label: 'Pardon & restore', section: 'manage' });
  }

  return items;
}

export function getPrimaryRowActions(capabilities?: UserTeamCapabilities): MenuItem[] {
  const all: MenuItem[] = [
    { id: 'view', label: 'View profile' },
    { id: 'credit', label: 'Credits & wallet' },
    { id: 'verification', label: 'Verification' },
    { id: 'history', label: 'Violations & disputes' },
    { id: 'export', label: 'Export JSON', section: 'tools' },
  ];
  if (!capabilities) return all;
  return all.filter((item) => capabilities.primaryActions.has(item.id));
}

export function buildRowActionItems(
  status?: string | null,
  options?: { hasViolations?: boolean; capabilities?: UserTeamCapabilities }
): MenuItem[] {
  return [
    ...getPrimaryRowActions(options?.capabilities),
    ...getManageActionsForStatus(status, options),
  ];
}

export function exportAccountJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
